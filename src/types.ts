/**
 * Shared type definitions for the indoor navigation app
 */

/** A node in the building graph (corridor point or room) */
export interface MapNode {
  id: string;
  name: string;
  /** X coordinate in meters (East = +X) */
  x: number;
  /** Y coordinate in meters (North = +Y) */
  y: number;
  /** true if the node is a selectable destination */
  room: boolean;
  description?: string;
}

/** An undirected connection between two nodes */
export interface MapEdge {
  from: string;
  to: string;
}

/** Structure of map.json */
export interface MapData {
  comment?: string;
  floor: string;
  origin: string;
  nodes: MapNode[];
  edges: MapEdge[];
}

/** Payload encoded in each QR code: {"node":"<node-id>"} */
export interface QRCodeData {
  node: string;
}

/** Function returned by start* helpers to stop listening */
export type StopFn = () => void;
