/**
 * Application state machine
 * Manages UI states: start -> qr-scan -> room-select -> navigation
 */

export const AppStates = {
  START: 'start',
  QR_SCAN: 'qr-scan',
  ROOM_SELECT: 'room-select',
  NAVIGATION: 'navigation',
  DESTINATION_REACHED: 'destination-reached'
};

export class AppStateMachine {
  constructor() {
    this.currentState = AppStates.START;
    this.listeners = [];
  }

  /**
   * Add state change listener
   * @param {Function} listener - Called with (newState, oldState)
   */
  onChange(listener) {
    this.listeners.push(listener);
  }

  /**
   * Set new state
   * @param {string} newState - New state from AppStates
   */
  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(newState, oldState);
    });
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Check if in specific state
   * @param {string} state - State to check
   * @returns {boolean}
   */
  is(state) {
    return this.currentState === state;
  }
}
