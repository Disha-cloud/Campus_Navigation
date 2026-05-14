
import React, { useState } from 'react';
import { POI, NavigationStep } from '../types';

interface ControlsPanelProps {
  onFileUpload: (file: File) => void;
  pois: POI[];
  onSelectStart: (poi: POI) => void;
  onSelectDestination: (poi: POI) => void;
  onUseMyLocation: () => void;
  startLocationName: string;
  destinationName: string;
  isNavigating: boolean;
  onToggleNavigation: () => void;
  instructions: NavigationStep[];
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  onFileUpload, pois, onSelectStart, onSelectDestination, onUseMyLocation,
  startLocationName, destinationName, isNavigating, onToggleNavigation, instructions
}) => {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<'start' | 'dest'>('dest');

  const filteredPois = pois.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white/95 dark:bg-slate-900/95">
      {/* CONDENSED TOP SECTION */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">CAMPUS NAV</h1>
          <div className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">v1.2</div>
        </div>

        <div className="p-2 bg-gray-50 dark:bg-slate-800/30 rounded-xl border border-gray-200/50 dark:border-slate-700/50 mb-2">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-1 ml-1">Map Data</p>
          <input
            type="file" accept=".geojson,.json"
            onChange={(e) => e.target.files && onFileUpload(e.target.files[0])}
            className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
            title="Upload a new GeoJSON file to replace the current map"
          />
        </div>

        <button
          onClick={onUseMyLocation}
          className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/30 hover:border-blue-500 text-blue-600 dark:text-blue-400 rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
        >
          📍 Use GPS Location
        </button>

        <div className="p-2 bg-slate-900 rounded-xl text-white space-y-1 shadow-inner border border-slate-800">
          <div className="flex justify-between items-center gap-2">
            <span className="text-[9px] font-black uppercase opacity-40 shrink-0">Start</span>
            <span className="text-[11px] font-bold truncate text-right">{startLocationName || 'Click Map'}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-[9px] font-black uppercase opacity-40 shrink-0">End</span>
            <span className="text-[11px] font-bold truncate text-right">{destinationName || 'Pick POI'}</span>
          </div>
        </div>

        {startLocationName && destinationName && (
          <button
            onClick={onToggleNavigation}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm text-white transition-all transform active:scale-95 shadow-lg ${isNavigating ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
          >
            {isNavigating ? 'STOP NAVIGATION' : 'START NAVIGATION'}
          </button>
        )}
      </div>

      {/* SEARCH AND LIST SECTION - TAKES UP REMAINING HALF */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-slate-900/20">
        {!isNavigating ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* STATIC SEARCH CONTROLS */}
            <div className="p-4 pb-2 space-y-3 bg-white dark:bg-slate-900">
              <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  onClick={() => setMode('start')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${mode === 'start' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-300' : 'text-gray-400'}`}
                >
                  SET START
                </button>
                <button
                  onClick={() => setMode('dest')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${mode === 'dest' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-300' : 'text-gray-400'}`}
                >
                  SET DEST
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${mode === 'start' ? 'start point' : 'destination'}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white"
                />
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 custom-scrollbar">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {filteredPois.length} Results
              </p>
              {filteredPois.length > 0 ? filteredPois.map(poi => (
                <button
                  key={poi.id}
                  onClick={() => mode === 'start' ? onSelectStart(poi) : onSelectDestination(poi)}
                  className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl border border-transparent hover:border-blue-100 dark:hover:border-blue-800/30 transition-all group bg-white dark:bg-slate-800/40 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-gray-800 dark:text-slate-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                        {poi.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">
                        {poi.description || 'Campus building'}
                      </p>
                    </div>
                    <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-xs text-gray-400 font-bold">No locations found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SCROLLABLE NAVIGATION STEPS */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 pb-2 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Itinerary</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {instructions.map((step, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${step.triggered ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30' : 'opacity-40 grayscale'}`}>
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${step.triggered ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300 dark:bg-slate-700'}`} />
                  <div className="flex-1">
                    <p className={`text-[11px] leading-snug ${step.triggered ? 'text-emerald-900 dark:text-emerald-300 font-black' : 'text-gray-500 dark:text-slate-500 font-bold'}`}>
                      {step.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlsPanel;
