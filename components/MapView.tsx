
import React, { useEffect, useRef } from 'react';
import { Coordinate, POI, CampusGraph } from '../types';

interface MapViewProps {
  center?: Coordinate;
  pois: POI[];
  graph: CampusGraph | null;
  bounds: [number, number, number, number] | null;
  routePath: Coordinate[] | null;
  userLocation: Coordinate | null;
  startLocation: Coordinate | null;
  destination: POI | null;
  onMapClick: (coord: Coordinate) => void;
  onPOIClick: (poi: POI) => void;
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  center, pois, graph, bounds, routePath, userLocation, startLocation, destination, onMapClick, onPOIClick, theme, isSidebarOpen
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<any>(null);
  const layersRef = useRef<{
    pois: any[];
    graph: any[];
    route: any | null;
    user: any | null;
    start: any | null;
  }>({ pois: [], graph: [], route: null, user: null, start: null });

  const TILE_URLS = {
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    const initialCenter = center || { lat: 12.924, lng: 77.499 };
    mapRef.current = L.map(containerRef.current, { 
      zoomControl: false,
      trackResize: true 
    }).setView([initialCenter.lat, initialCenter.lng], 18);

    tileLayerRef.current = L.tileLayer(TILE_URLS[theme], { attribution: '&copy; OSM' }).addTo(mapRef.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    const handleZoom = () => {
      if (!containerRef.current || !mapRef.current) return;
      const zoom = mapRef.current.getZoom();
      
      // Hide labels if zoomed out
      if (zoom < 17) {
        containerRef.current.classList.add('hide-poi-labels');
      } else {
        containerRef.current.classList.remove('hide-poi-labels');
      }

      // Shrink markers if very zoomed out
      if (zoom < 15) {
        containerRef.current.classList.add('hide-all-markers');
      } else {
        containerRef.current.classList.remove('hide-all-markers');
      }
    };

    mapRef.current.on('zoomend', handleZoom);
    handleZoom(); // Initial check

    mapRef.current.on('click', (e: any) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => { if (tileLayerRef.current) tileLayerRef.current.setUrl(TILE_URLS[theme]); }, [theme]);

  // Map locking logic and initial fit
  useEffect(() => {
    if (!mapRef.current || !bounds) return;
    const L = (window as any).L;
    
    const southWest = L.latLng(bounds[0], bounds[1]);
    const northEast = L.latLng(bounds[2], bounds[3]);
    const mapBounds = L.latLngBounds(southWest, northEast);
    const paddedBounds = mapBounds.pad(0.3);
    
    mapRef.current.setMaxBounds(paddedBounds);
    mapRef.current.fitBounds(mapBounds, { padding: [50, 50] });
  }, [bounds]);

  // Sidebar toggle resize logic
  useEffect(() => {
    if (!mapRef.current) return;
    setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize();
      if (bounds) {
        const L = (window as any).L;
        const southWest = L.latLng(bounds[0], bounds[1]);
        const northEast = L.latLng(bounds[2], bounds[3]);
        const mapBounds = L.latLngBounds(southWest, northEast);
        mapRef.current.fitBounds(mapBounds, { padding: [50, 50], animate: true });
      } else if (center) {
        mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), { animate: true });
      }
    }, 350);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!mapRef.current || !graph) return;
    const L = (window as any).L;
    layersRef.current.graph.forEach(l => l.remove());
    layersRef.current.graph = [];

    const edgeColor = theme === 'dark' ? '#334155' : '#94a3b8';
    const addedEdges = new Set<string>();

    graph.nodes.forEach((node, id) => {
      const neighbors = graph.adjacencyList[id] || [];
      neighbors.forEach(edge => {
        const edgeId = [id, edge.to].sort().join('-');
        if (!addedEdges.has(edgeId)) {
          const toNode = graph.nodes.get(edge.to);
          if (toNode) {
            const polyline = L.polyline([
              [node.coordinate.lat, node.coordinate.lng],
              [toNode.coordinate.lat, toNode.coordinate.lng]
            ], { color: edgeColor, weight: 3, opacity: 0.4, dashArray: '5, 5' }).addTo(mapRef.current);
            layersRef.current.graph.push(polyline);
            addedEdges.add(edgeId);
          }
        }
      });
    });
  }, [graph, theme]);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    layersRef.current.pois.forEach(l => l.remove());
    layersRef.current.pois = [];

    pois.forEach(poi => {
      // Create a unified HTML marker using DivIcon
      const icon = L.divIcon({
        className: 'campus-marker-wrapper',
        html: `
          <div class="campus-marker-container">
            <div class="campus-marker-dot"></div>
            <div class="campus-marker-text">${poi.name}</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([poi.coordinate.lat, poi.coordinate.lng], { icon }).addTo(mapRef.current);
      
      marker.on('click', (e: any) => { 
        onPOIClick(poi); 
        L.DomEvent.stopPropagation(e); 
      });
      
      layersRef.current.pois.push(marker);
    });
  }, [pois, theme]);

  useEffect(() => {
    if (!mapRef.current || !routePath || routePath.length < 2) return;
    const L = (window as any).L;
    if (layersRef.current.route) layersRef.current.route.remove();
    layersRef.current.route = L.polyline(routePath.map(p => [p.lat, p.lng]), {
      color: '#10b981', weight: 8, opacity: 1, lineJoin: 'round'
    }).addTo(mapRef.current);
    mapRef.current.fitBounds(layersRef.current.route.getBounds(), { padding: [100, 100] });
  }, [routePath]);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (layersRef.current.user) layersRef.current.user.remove();
    if (layersRef.current.start) layersRef.current.start.remove();

    if (userLocation) {
      layersRef.current.user = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 10, fillColor: '#f43f5e', color: '#fff', weight: 4, opacity: 1, fillOpacity: 1
      }).addTo(mapRef.current);
    }
    if (startLocation) {
      layersRef.current.start = L.circleMarker([startLocation.lat, startLocation.lng], {
        radius: 6, fillColor: '#10b981', color: '#fff', weight: 2, opacity: 0.8, fillOpacity: 0.8
      }).addTo(mapRef.current);
    }
  }, [userLocation, startLocation]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
