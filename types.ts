
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface POI {
  id: string;
  name: string;
  description: string;
  coordinate: Coordinate;
}

export interface GraphNode {
  id: string; // "lat,lng" string
  coordinate: Coordinate;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number; // meters
  bearing: number; // 0-360
}

export interface AdjacencyList {
  [nodeId: string]: GraphEdge[];
}

export interface CampusGraph {
  adjacencyList: AdjacencyList;
  nodes: Map<string, GraphNode>;
}

export enum TurnDirection {
  STRAIGHT = "continue straight",
  LEFT = "turn left",
  RIGHT = "turn right",
  START = "start your journey",
  ARRIVE = "you have arrived"
}

export interface NavigationStep {
  coordinate: Coordinate;
  instruction: string;
  distanceFromPrevious: number;
  triggered?: boolean;
}

export interface Route {
  path: Coordinate[];
  steps: NavigationStep[];
  totalDistance: number;
}
