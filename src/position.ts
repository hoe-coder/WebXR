/**
 * Position tracking using Pedestrian Dead Reckoning (PDR)
 * Estimates position based on step count and heading
 */

export interface PositionTrackerOptions {
  /** Step length in meters (default 0.7) */
  stepLength?: number;
}

export interface PositionState {
  x: number;
  y: number;
  heading: number;
  stepCount: number;
}

export class PositionTracker {
  private x = 0; // meters
  private y = 0; // meters
  private stepLength: number; // meters per step (configurable)
  private heading = 0; // current heading in degrees
  private stepCount = 0;

  constructor(options: PositionTrackerOptions = {}) {
    this.stepLength = options.stepLength || 0.7;
  }

  /**
   * Reset position to specific coordinates (e.g., after QR scan)
   * @param x - X coordinate in meters
   * @param y - Y coordinate in meters
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Update current heading
   * @param heading - Heading in degrees (0 = North, clockwise)
   */
  updateHeading(heading: number): void {
    this.heading = heading;
  }

  /**
   * Update step length (allows user calibration)
   * @param length - Step length in meters
   */
  setStepLength(length: number): void {
    this.stepLength = length;
  }

  /**
   * Process a new step
   * Updates position based on current heading and step length
   */
  onStep(): void {
    this.stepCount++;

    // Convert heading to radians
    // heading: 0° = North (up/+Y), 90° = East (right/+X)
    const headingRad = (this.heading * Math.PI) / 180;

    // Calculate displacement
    // X increases to the East, Y increases to the North
    const dx = this.stepLength * Math.sin(headingRad);
    const dy = this.stepLength * Math.cos(headingRad);

    // Update position
    this.x += dx;
    this.y += dy;
  }

  /**
   * Get current position
   */
  getPosition(): PositionState {
    return {
      x: this.x,
      y: this.y,
      heading: this.heading,
      stepCount: this.stepCount
    };
  }

  /**
   * Calculate distance to a target point
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @returns Distance in meters
   */
  distanceTo(targetX: number, targetY: number): number {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate bearing (direction) to a target point
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @returns Bearing in degrees (0 = North, clockwise)
   */
  bearingTo(targetX: number, targetY: number): number {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // atan2(dx, dy) gives angle from north (0°)
    const angleRad = Math.atan2(dx, dy);
    let bearing = (angleRad * 180) / Math.PI;

    // Normalize to 0-360
    if (bearing < 0) {
      bearing += 360;
    }

    return bearing;
  }

  /**
   * Reset position and step count
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.stepCount = 0;
    this.heading = 0;
  }
}
