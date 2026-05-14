
import { CampusGraph, Coordinate, GraphEdge, GraphNode, AdjacencyList } from '../types';
import { getDistance, getBearing } from './geoUtils';

/**
 * Converts GeoJSON data into a walkable graph.
 * Bridges small gaps in geometry to ensure connectivity.
 */
export const buildGraph = (geoJson: any): { 
  graph: CampusGraph, 
  pois: any[], 
  bounds: [number, number, number, number] | null, // [minLat, minLng, maxLat, maxLng]
  counts: { segments: number, pois: number } 
} => {
  const nodes = new Map<string, GraphNode>();
  const adjacencyList: AdjacencyList = {};
  const pois: any[] = [];
  let segmentsCount = 0;

  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;

  if (!geoJson || !geoJson.features) {
    throw new Error("Invalid GeoJSON: No features found.");
  }

  const updateBounds = (lat: number, lng: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };

  const addNode = (lat: number, lng: number): string => {
    const id = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, coordinate: { lat, lng } });
      updateBounds(lat, lng);
    }
    return id;
  };

  const addEdge = (u: string, v: string) => {
    if (u === v) return;
    const nodeU = nodes.get(u)!;
    const nodeV = nodes.get(v)!;
    const dist = getDistance(nodeU.coordinate, nodeV.coordinate);
    const bearingUV = getBearing(nodeU.coordinate, nodeV.coordinate);
    const bearingVU = getBearing(nodeV.coordinate, nodeU.coordinate);

    if (!adjacencyList[u]) adjacencyList[u] = [];
    if (!adjacencyList[v]) adjacencyList[v] = [];

    if (!adjacencyList[u].find(e => e.to === v)) {
      adjacencyList[u].push({ from: u, to: v, distance: dist, bearing: bearingUV });
    }
    if (!adjacencyList[v].find(e => e.to === u)) {
      adjacencyList[v].push({ from: v, to: u, distance: dist, bearing: bearingVU });
    }
  };

  geoJson.features.forEach((feature: any) => {
    const props = feature.properties || {};
    const geom = feature.geometry;
    if (!geom) return;

    if (geom.type === 'Point') {
      const lat = geom.coordinates[1];
      const lng = geom.coordinates[0];
      const id = addNode(lat, lng);
      const name = props.name || props.label || props.building;
      if (name) {
        pois.push({
          id: props.id || id,
          name: name,
          description: props.description || props.type || 'Campus location',
          coordinate: { lat, lng }
        });
      }
    } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
      const coordsArr = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      coordsArr.forEach((coords: any) => {
        if (coords.length >= 2) {
          segmentsCount++;
          for (let i = 0; i < coords.length - 1; i++) {
            const u = addNode(coords[i][1], coords[i][0]);
            const v = addNode(coords[i+1][1], coords[i+1][0]);
            addEdge(u, v);
          }
        }
      });
    }
  });

  const nodeIds = Array.from(nodes.keys());
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const idA = nodeIds[i];
      const idB = nodeIds[j];
      const nodeA = nodes.get(idA)!;
      const nodeB = nodes.get(idB)!;
      const dist = getDistance(nodeA.coordinate, nodeB.coordinate);
      if (dist > 0 && dist < 2.0) {
        addEdge(idA, idB);
      }
    }
  }

  const bounds: [number, number, number, number] | null = minLat === Infinity ? null : [minLat, minLng, maxLat, maxLng];

  return {
    graph: { nodes, adjacencyList },
    pois,
    bounds,
    counts: { segments: segmentsCount, pois: pois.length }
  };
};

export const findShortestPath = (
  graph: CampusGraph,
  startNodeId: string,
  endNodeId: string
): string[] | null => {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const queue = new Set<string>();

  graph.nodes.forEach((_, id) => {
    distances[id] = Infinity;
    previous[id] = null;
    queue.add(id);
  });

  if (!graph.nodes.has(startNodeId) || !graph.nodes.has(endNodeId)) return null;
  distances[startNodeId] = 0;

  while (queue.size > 0) {
    let u: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of queue) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        u = nodeId;
      }
    }

    if (u === null || u === endNodeId || distances[u] === Infinity) break;
    queue.delete(u);

    const neighbors = graph.adjacencyList[u] || [];
    for (const edge of neighbors) {
      if (!queue.has(edge.to)) continue;
      const alt = distances[u] + edge.distance;
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        previous[edge.to] = u;
      }
    }
  }

  if (previous[endNodeId] === null && startNodeId !== endNodeId) return null;

  const path = [];
  let curr: string | null = endNodeId;
  while (curr) {
    path.push(curr);
    curr = previous[curr];
  }
  return path.reverse();
};
