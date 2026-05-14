
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ControlsPanel from './components/ControlsPanel';
import MapView from './components/MapView';
import VoiceControls from './components/VoiceControls';
import { buildGraph, findShortestPath } from './lib/graph';
import { generateInstructions } from './lib/navigation';
import { findNearestNode, getDistance, snapToSegment } from './lib/geoUtils';
import { speak } from './lib/voice';
import { Coordinate, CampusGraph, POI, Route, NavigationStep } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const [graph, setGraph] = useState<CampusGraph | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [startLocation, setStartLocation] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<POI | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [mappedLocation, setMappedLocation] = useState<Coordinate | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mapCenter, setMapCenter] = useState<Coordinate | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const spokenStepsRef = useRef<Set<number>>(new Set());

  const smartSpeak = (text: string) => { if (!isMuted) speak(text); };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setStartLocation(c);
      setUserLocation(c);
      setMapCenter(c);
    });

    const loadDefaultData = async () => {
      try {
        const response = await fetch('/campus_graph.geojson');
        if (response.ok) processGeoJSON(await response.json());
      } catch (e) { console.info("Default GeoJSON not found."); }
    };
    loadDefaultData();
  }, []);

  const processGeoJSON = (json: any) => {
    try {
      const { graph, pois, bounds, counts } = buildGraph(json);
      if (counts.segments === 0 && counts.pois === 0) {
        setErrorMsg("The uploaded file has no paths or locations.");
        return;
      }
      setGraph(graph);
      setPois(pois);
      setBounds(bounds);
      setErrorMsg(null);
      if (pois.length > 0 && !mapCenter) setMapCenter(pois[0].coordinate);
    } catch (e: any) { setErrorMsg("Error parsing campus data."); }
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    try { processGeoJSON(JSON.parse(await file.text())); } 
    catch (e) { setErrorMsg("Invalid file format."); }
  };

  const calculateRoute = useCallback(() => {
    if (!graph || !startLocation || !destination) return;
    const networkNodeIds = Object.keys(graph.adjacencyList);
    if (networkNodeIds.length === 0) return;

    const startNodeId = findNearestNode(startLocation, networkNodeIds);
    const endNodeId = findNearestNode(destination.coordinate, networkNodeIds);

    if (!startNodeId || !endNodeId) {
      setErrorMsg("Could not find nodes on the network near your selection.");
      return;
    }

    const pathIds = findShortestPath(graph, startNodeId, endNodeId);
    if (pathIds) {
      const pathCoords = pathIds.map(id => {
        const [lat, lng] = id.split(',').map(Number);
        return { lat, lng };
      });
      const steps = generateInstructions(graph, pathIds);
      setRoute({ path: pathCoords, steps, totalDistance: steps.reduce((acc, s) => acc + s.distanceFromPrevious, 0) });
      spokenStepsRef.current.clear();
      setErrorMsg(null);
    } else {
      setRoute(null);
      setErrorMsg("No walking path found between points.");
    }
  }, [graph, startLocation, destination]);

  useEffect(() => { calculateRoute(); }, [calculateRoute]);

  const processNavigationUpdate = (coord: Coordinate) => {
    if (!route) return;
    let closestCoord = coord;
    let minSnapDist = Infinity;
    for (let i = 0; i < route.path.length - 1; i++) {
      const snapped = snapToSegment(coord, route.path[i], route.path[i+1]);
      const d = getDistance(coord, snapped);
      if (d < minSnapDist) { minSnapDist = d; closestCoord = snapped; }
    }
    setMappedLocation(closestCoord);

    const nextStepIdx = route.steps.findIndex((_, i) => !spokenStepsRef.current.has(i));
    if (nextStepIdx === -1) return;
    const nextStep = route.steps[nextStepIdx];
    const distToNext = getDistance(coord, nextStep.coordinate);

    if ((nextStepIdx === 0 || distToNext < 15) && !spokenStepsRef.current.has(nextStepIdx)) {
      smartSpeak(nextStep.instruction);
      spokenStepsRef.current.add(nextStepIdx);
      setRoute(prev => prev ? { ...prev, steps: prev.steps.map((s, idx) => idx === nextStepIdx ? { ...s, triggered: true } : s) } : null);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    smartSpeak("Navigation stopped. Returning home.");
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    
    setMappedLocation(null);
    setRoute(null);
    setDestination(null);
    setIsSidebarOpen(true);
    if (userLocation) setMapCenter(userLocation);
  };

  const toggleNavigation = () => {
    if (isNavigating) {
      stopNavigation();
    } else {
      if (!route) {
        smartSpeak("Please wait, calculating route or no path available.");
        return;
      }
      setIsNavigating(true);
      smartSpeak("Starting navigation.");
      setIsSidebarOpen(false);
      
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(c);
        processNavigationUpdate(c);
      }, (err) => setErrorMsg("GPS signal lost."), { enableHighAccuracy: true });
    }
  };

  const handleVoiceCommand = async (command: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `User: "${command}". Locations: ${pois.map(p => p.name).join(', ')}. Intent: NAVIGATE/STOP.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: { intent: { type: Type.STRING }, destination: { type: Type.STRING } },
            required: ['intent']
          }
        }
      });
      const res = JSON.parse(response.text || '{}');
      if (res.intent === 'NAVIGATE' && res.destination) {
        const found = pois.find(p => p.name.toLowerCase().includes(res.destination.toLowerCase()));
        if (found) { setDestination(found); smartSpeak("Navigating to " + found.name); }
        else smartSpeak("Building not found.");
      } else if (res.intent === 'STOP') { if (isNavigating) stopNavigation(); }
    } catch (e) { console.error(e); }
  };

  const activeStep = route?.steps.find((s, idx) => !spokenStepsRef.current.has(idx));

  return (
    <div className={`relative h-screen w-screen flex flex-row overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* SIDEBAR CONTAINER */}
      <div className={`h-full z-20 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-slate-800 ${isSidebarOpen ? 'w-80 md:w-96 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}`}>
        <div className="w-80 md:w-96 h-full p-4">
          <ControlsPanel
            onFileUpload={handleFileUpload} pois={pois}
            onSelectStart={(poi: POI) => setStartLocation(poi.coordinate)}
            onSelectDestination={setDestination}
            onUseMyLocation={() => {
              navigator.geolocation.getCurrentPosition(pos => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(c); setStartLocation(c); setMapCenter(c);
              });
            }}
            startLocationName={startLocation ? (pois.find(p => p.coordinate.lat === startLocation.lat)?.name || "GPS Point") : "Searching..."}
            destinationName={destination?.name || ""}
            isNavigating={isNavigating}
            onToggleNavigation={toggleNavigation}
            instructions={route?.steps || []}
          />
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="flex-1 relative">
        <MapView
          theme={theme} center={mapCenter || undefined} pois={pois} graph={graph} bounds={bounds}
          routePath={route?.path || null} userLocation={mappedLocation || userLocation}
          startLocation={startLocation} destination={destination}
          onMapClick={(c) => !isNavigating && setStartLocation(c)}
          onPOIClick={(p) => !isNavigating && setDestination(p)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Floating Sidebar Toggle Button */}
        {!isNavigating && (
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`absolute top-4 left-4 z-30 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl transition-all active:scale-90 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700`}
          >
            {isSidebarOpen ? '❮' : '❯'}
          </button>
        )}

        {isNavigating && activeStep && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] flex gap-3 z-40 animate-in fade-in slide-in-from-top-4">
            <div className="flex-1 bg-blue-600 dark:bg-blue-700 text-white p-5 rounded-3xl shadow-2xl border border-blue-400/30 flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Next Move</p>
                <p className="text-lg font-black leading-tight">{activeStep.instruction}</p>
              </div>
            </div>
            <button 
              onClick={stopNavigation}
              className="bg-rose-600 text-white px-6 rounded-3xl shadow-2xl border border-rose-400/30 font-black text-xs hover:bg-rose-700 active:scale-95 transition-all"
            >
              STOP
            </button>
          </div>
        )}

        <div className="absolute bottom-8 right-6 z-30 flex flex-col gap-4 items-end">
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 transition-all active:scale-90">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 transition-all active:scale-90 ${isMuted ? 'text-rose-500' : 'text-blue-500'}`}>
            {isMuted ? (
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            ) : (
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            )}
          </button>

          <VoiceControls onCommand={handleVoiceCommand} />
        </div>
      </div>

      {errorMsg && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold z-50 shadow-2xl animate-bounce">
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
};

export default App;
