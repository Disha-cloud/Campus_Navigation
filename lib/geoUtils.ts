
import { Coordinate } from '../types';

/**
 * Calculates the Haversine distance between two points in meters.
 */
export const getDistance = (p1: Coordinate, p2: Coordinate): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculates the bearing from p1 to p2 in degrees (0-360).
 */
export const getBearing = (p1: Coordinate, p2: Coordinate): number => {
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ( (θ * 180) / Math.PI + 360) % 360;
};

/**
 * Normalizes an angle difference to -180 to 180.
 */
export const getAngleDiff = (b1: number, b2: number): number => {
  let diff = b2 - b1;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
};

/**
 * Finds the nearest node in a list to a given coordinate.
 */
export const findNearestNode = (coord: Coordinate, nodeIds: string[]): string | null => {
  if (nodeIds.length === 0) return null;
  let minDistance = Infinity;
  let nearestId = null;

  nodeIds.forEach(id => {
    const parts = id.split(',');
    if (parts.length < 2) return;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const dist = getDistance(coord, { lat, lng });
    if (dist < minDistance) {
      minDistance = dist;
      nearestId = id;
    }
  });

  return nearestId;
};

/**
 * Projects a point onto a line segment and returns the snapped coordinate.
 */
export const snapToSegment = (point: Coordinate, start: Coordinate, end: Coordinate): Coordinate => {
  const x = point.lng;
  const y = point.lat;
  const x1 = start.lng;
  const y1 = start.lat;
  const x2 = end.lng;
  const y2 = end.lat;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return { lat: yy, lng: xx };
};
