/**
 * Routing module with Dijkstra algorithm and waypoint navigation
 */

/**
 * Load map data from JSON
 * @returns {Promise<Object>} Map data with nodes and edges
 */
export async function loadMap() {
  const response = await fetch('/src/map.json');
  return await response.json();
}

/**
 * Find shortest path using Dijkstra's algorithm
 * @param {Object} map - Map data with nodes and edges
 * @param {string} startId - Start node ID
 * @param {string} endId - End node ID
 * @returns {Array<Object>|null} Array of nodes representing the path, or null if no path found
 */
export function findPath(map, startId, endId) {
  if (startId === endId) {
    const node = map.nodes.find(n => n.id === startId);
    return node ? [node] : null;
  }

  // Build adjacency list with distances
  const graph = new Map();
  map.nodes.forEach(node => {
    graph.set(node.id, []);
  });

  map.edges.forEach(edge => {
    const fromNode = map.nodes.find(n => n.id === edge.from);
    const toNode = map.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      const distance = calculateDistance(fromNode, toNode);

      // Undirected graph (bidirectional edges)
      graph.get(edge.from).push({ id: edge.to, distance });
      graph.get(edge.to).push({ id: edge.from, distance });
    }
  });

  // Dijkstra's algorithm
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  map.nodes.forEach(node => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId = null;
    let minDistance = Infinity;
    unvisited.forEach(id => {
      if (distances.get(id) < minDistance) {
        minDistance = distances.get(id);
        currentId = id;
      }
    });

    if (currentId === null || minDistance === Infinity) {
      break; // No path exists
    }

    unvisited.delete(currentId);

    // If we reached the end, we can stop
    if (currentId === endId) {
      break;
    }

    // Update distances to neighbors
    const neighbors = graph.get(currentId) || [];
    neighbors.forEach(neighbor => {
      if (unvisited.has(neighbor.id)) {
        const altDistance = distances.get(currentId) + neighbor.distance;
        if (altDistance < distances.get(neighbor.id)) {
          distances.set(neighbor.id, altDistance);
          previous.set(neighbor.id, currentId);
        }
      }
    });
  }

  // Reconstruct path
  const path = [];
  let currentId = endId;

  while (currentId !== null) {
    const node = map.nodes.find(n => n.id === currentId);
    if (!node) break;
    path.unshift(node);
    currentId = previous.get(currentId);
  }

  // Check if path is valid (starts at startId)
  if (path.length === 0 || path[0].id !== startId) {
    return null;
  }

  return path;
}

/**
 * Calculate Euclidean distance between two nodes
 * @param {Object} node1 - First node with x, y coordinates
 * @param {Object} node2 - Second node with x, y coordinates
 * @returns {number} Distance in meters
 */
function calculateDistance(node1, node2) {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Waypoint navigator
 * Tracks progress along a path and determines when waypoints are reached
 */
export class WaypointNavigator {
  constructor(path, options = {}) {
    this.path = path || [];
    this.currentWaypointIndex = 0;
    this.reachedThreshold = options.reachedThreshold || 1.5; // meters
  }

  /**
   * Set a new path
   * @param {Array<Object>} path - Array of nodes
   */
  setPath(path) {
    this.path = path;
    this.currentWaypointIndex = 0;
  }

  /**
   * Get current target waypoint
   * @returns {Object|null} Current waypoint node
   */
  getCurrentWaypoint() {
    if (this.currentWaypointIndex >= this.path.length) {
      return null;
    }
    return this.path[this.currentWaypointIndex];
  }

  /**
   * Get next waypoint (for preview)
   * @returns {Object|null} Next waypoint node
   */
  getNextWaypoint() {
    if (this.currentWaypointIndex + 1 >= this.path.length) {
      return null;
    }
    return this.path[this.currentWaypointIndex + 1];
  }

  /**
   * Check if destination is reached
   * @returns {boolean} True if at final destination
   */
  isDestinationReached() {
    return this.currentWaypointIndex >= this.path.length;
  }

  /**
   * Update navigation based on current position
   * @param {number} currentX - Current X position
   * @param {number} currentY - Current Y position
   * @returns {Object} Navigation state
   */
  update(currentX, currentY) {
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
      waypoint: waypoint,
      distance: distance,
      progress: this.currentWaypointIndex,
      total: this.path.length
    };
  }

  /**
   * Reset to start of path
   */
  reset() {
    this.currentWaypointIndex = 0;
  }

  /**
   * Get full path
   * @returns {Array<Object>} Full path
   */
  getPath() {
    return this.path;
  }
}

/**
 * Get all rooms from map (for destination selection)
 * @param {Object} map - Map data
 * @returns {Array<Object>} Array of room nodes
 */
export function getRooms(map) {
  return map.nodes.filter(node => node.room === true);
}

/**
 * Find node by ID
 * @param {Object} map - Map data
 * @param {string} nodeId - Node ID
 * @returns {Object|null} Node or null if not found
 */
export function getNode(map, nodeId) {
  return map.nodes.find(n => n.id === nodeId) || null;
}
