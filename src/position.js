/**
 * Position tracking using Pedestrian Dead Reckoning (PDR)
 * Estimates position based on step count and heading
 */

export class PositionTracker {
  constructor(options = {}) {
    this.x = 0; // meters
    this.y = 0; // meters
    this.stepLength = options.stepLength || 0.7; // meters per step (configurable)
    this.heading = 0; // current heading in degrees
    this.stepCount = 0;
  }

  /**
   * Reset position to specific coordinates (e.g., after QR scan)
   * @param {number} x - X coordinate in meters
   * @param {number} y - Y coordinate in meters
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Update current heading
   * @param {number} heading - Heading in degrees (0 = North, clockwise)
   */
  updateHeading(heading) {
    this.heading = heading;
  }

  /**
   * Update step length (allows user calibration)
   * @param {number} length - Step length in meters
   */
  setStepLength(length) {
    this.stepLength = length;
  }

  /**
   * Process a new step
   * Updates position based on current heading and step length
   */
  onStep() {
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
   * @returns {{x: number, y: number, heading: number, stepCount: number}}
   */
  getPosition() {
    return {
      x: this.x,
      y: this.y,
      heading: this.heading,
      stepCount: this.stepCount
    };
  }

  /**
   * Calculate distance to a target point
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @returns {number} Distance in meters
   */
  distanceTo(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate bearing (direction) to a target point
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @returns {number} Bearing in degrees (0 = North, clockwise)
   */
  bearingTo(targetX, targetY) {
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
  reset() {
    this.x = 0;
    this.y = 0;
    this.stepCount = 0;
    this.heading = 0;
  }
}
