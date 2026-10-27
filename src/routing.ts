/**
 * Routing module with Dijkstra algorithm and waypoint navigation
 */

import type { MapData, MapNode } from './types';

interface Neighbor {
  id: string;
  distance: number;
}

/**
 * Load map data from JSON
 * @returns Map data with nodes and edges
 */
export async function loadMap(): Promise<MapData> {
  const response = await fetch('/src/map.json');
  return (await response.json()) as MapData;
}

/**
 * Find shortest path using Dijkstra's algorithm
 * @param map - Map data with nodes and edges
 * @param startId - Start node ID
 * @param endId - End node ID
 * @returns Array of nodes representing the path, or null if no path found
 */
export function findPath(map: MapData, startId: string, endId: string): MapNode[] | null {
  if (startId === endId) {
    const node = map.nodes.find(n => n.id === startId);
    return node ? [node] : null;
  }

  // Build adjacency list with distances
  const graph = new Map<string, Neighbor[]>();
  map.nodes.forEach(node => {
    graph.set(node.id, []);
  });

  map.edges.forEach(edge => {
    const fromNode = map.nodes.find(n => n.id === edge.from);
    const toNode = map.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      const distance = calculateDistance(fromNode, toNode);

      // Undirected graph (bidirectional edges)
      graph.get(edge.from)?.push({ id: edge.to, distance });
      graph.get(edge.to)?.push({ id: edge.from, distance });
    }
  });

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  map.nodes.forEach(node => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  });

  distances.set(startId, 0);

  const distanceOf = (id: string): number => distances.get(id) ?? Infinity;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDistance = Infinity;
    for (const id of unvisited) {
      const d = distanceOf(id);
      if (d < minDistance) {
        minDistance = d;
        currentId = id;
      }
    }

    if (currentId === null || minDistance === Infinity) {
      break; // No path exists
    }

    unvisited.delete(currentId);

    // If we reached the end, we can stop
    if (currentId === endId) {
      break;
    }

    // Update distances to neighbors
    const neighbors = graph.get(currentId) ?? [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.id)) {
        const altDistance = distanceOf(currentId) + neighbor.distance;
        if (altDistance < distanceOf(neighbor.id)) {
          distances.set(neighbor.id, altDistance);
          previous.set(neighbor.id, currentId);
        }
      }
    }
  }

  // Reconstruct path
  const path: MapNode[] = [];
  let currentId: string | null = endId;

  while (currentId !== null) {
    const id: string = currentId;
    const node = map.nodes.find(n => n.id === id);
    if (!node) break;
    path.unshift(node);
    currentId = previous.get(id) ?? null;
  }

  // Check if path is valid (starts at startId)
  if (path.length === 0 || path[0].id !== startId) {
    return null;
  }

  return path;
}

/**
 * Calculate Euclidean distance between two nodes
 * @returns Distance in meters
 */
function calculateDistance(
  node1: Pick<MapNode, 'x' | 'y'>,
  node2: Pick<MapNode, 'x' | 'y'>
): number {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface WaypointNavigatorOptions {
  /** Distance in meters at which a waypoint counts as reached (default 1.5) */
  reachedThreshold?: number;
}

export interface NavigationState {
  reached: boolean;
  waypoint: MapNode | null;
  distance: number;
  progress: number;
  total: number;
}

/**
 * Waypoint navigator
 * Tracks progress along a path and determines when waypoints are reached
 */
export class WaypointNavigator {
  private path: MapNode[];
  private currentWaypointIndex = 0;
  private readonly reachedThreshold: number;

  constructor(path: MapNode[] | null | undefined, options: WaypointNavigatorOptions = {}) {
    this.path = path || [];
    this.reachedThreshold = options.reachedThreshold || 1.5; // meters
  }

  /**
   * Set a new path
   * @param path - Array of nodes
   */
  setPath(path: MapNode[]): void {
    this.path = path;
    this.currentWaypointIndex = 0;
  }

  /**
   * Get current target waypoint
   */
  getCurrentWaypoint(): MapNode | null {
    if (this.currentWaypointIndex >= this.path.length) {
      return null;
    }
    return this.path[this.currentWaypointIndex];
  }

  /**
   * Get next waypoint (for preview)
   */
  getNextWaypoint(): MapNode | null {
    if (this.currentWaypointIndex + 1 >= this.path.length) {
      return null;
    }
    return this.path[this.currentWaypointIndex + 1];
  }

  /**
   * Check if destination is reached
   */
  isDestinationReached(): boolean {
    return this.currentWaypointIndex >= this.path.length;
  }

  /**
   * Update navigation based on current position
   * @param currentX - Current X position
   * @param currentY - Current Y position
   */
  update(currentX: number, currentY: number): NavigationState {
    const waypoint = this.getCurrentWaypoint();

    if (!waypoint) {
      return {
        reached: true,
        waypoint: null,
        distance: 0,
        progress: this.currentWaypointIndex,
        total: this.path.length
      };
    }

    // Calculate distance to current waypoint
    const dx = waypoint.x - currentX;
    const dy = waypoint.y - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if waypoint is reached
    if (distance < this.reachedThreshold) {
      this.currentWaypointIndex++;

      // Return next waypoint immediately
      return this.update(currentX, currentY);
    }

    return {
      reached: false,
      waypoint,
      distance,
      progress: this.currentWaypointIndex,
      total: this.path.length
    };
  }

  /**
   * Reset to start of path
   */
  reset(): void {
    this.currentWaypointIndex = 0;
  }

  /**
   * Get full path
   */
  getPath(): MapNode[] {
    return this.path;
  }
}

/**
 * Get all rooms from map (for destination selection)
 */
export function getRooms(map: MapData): MapNode[] {
  return map.nodes.filter(node => node.room === true);
}

/**
 * Find node by ID
 * @returns Node or null if not found
 */
export function getNode(map: MapData, nodeId: string): MapNode | null {
  return map.nodes.find(n => n.id === nodeId) || null;
}
