
import { Coordinate, CampusGraph, Route, NavigationStep, TurnDirection } from '../types';
import { getDistance, getBearing, getAngleDiff } from './geoUtils';

/**
 * Generates turn-by-turn instructions for a path.
 * Junctions are nodes with degree > 2 or nodes where bearing changes significantly.
 */
export const generateInstructions = (
  graph: CampusGraph,
  nodeIds: string[]
): NavigationStep[] => {
  const steps: NavigationStep[] = [];
  if (nodeIds.length < 2) return steps;

  const getNodeCoord = (id: string): Coordinate => {
    const [lat, lng] = id.split(',').map(Number);
    return { lat, lng };
  };

  // Initial Step
  steps.push({
    coordinate: getNodeCoord(nodeIds[0]),
    instruction: "Start your journey.",
    distanceFromPrevious: 0
  });

  let distanceSinceLastInstruction = 0;

  for (let i = 1; i < nodeIds.length - 1; i++) {
    const prevId = nodeIds[i - 1];
    const currId = nodeIds[i];
    const nextId = nodeIds[i + 1];

    const prevCoord = getNodeCoord(prevId);
    const currCoord = getNodeCoord(currId);
    const nextCoord = getNodeCoord(nextId);

    const dist = getDistance(prevCoord, currCoord);
    distanceSinceLastInstruction += dist;

    // A junction is where we have more than 2 choices OR a sharp turn
    const degree = (graph.adjacencyList[currId] || []).length;
    
    const bearingIn = getBearing(prevCoord, currCoord);
    const bearingOut = getBearing(currCoord, nextCoord);
    const angleDiff = getAngleDiff(bearingIn, bearingOut);

    // Thresholds: degree > 2 is a physical junction. 
    // Significant bearing change > 30 degrees is a turn.
    const isJunction = degree > 2;
    const isSignificantTurn = Math.abs(angleDiff) > 30;

    if (isJunction || isSignificantTurn) {
      let turnStr = TurnDirection.STRAIGHT;
      if (angleDiff < -30) turnStr = TurnDirection.LEFT;
      else if (angleDiff > 30) turnStr = TurnDirection.RIGHT;

      steps.push({
        coordinate: currCoord,
        instruction: `In ${Math.round(distanceSinceLastInstruction)} meters, ${turnStr}.`,
        distanceFromPrevious: distanceSinceLastInstruction
      });
      distanceSinceLastInstruction = 0;
    }
  }

  // Final stretch
  const lastSegmentDist = getDistance(
    getNodeCoord(nodeIds[nodeIds.length - 2]),
    getNodeCoord(nodeIds[nodeIds.length - 1])
  );
  distanceSinceLastInstruction += lastSegmentDist;

  steps.push({
    coordinate: getNodeCoord(nodeIds[nodeIds.length - 1]),
    instruction: `Arrive at destination in ${Math.round(distanceSinceLastInstruction)} meters.`,
    distanceFromPrevious: distanceSinceLastInstruction
  });

  return steps;
};
