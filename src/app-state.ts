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
} as const;

export type AppState = (typeof AppStates)[keyof typeof AppStates];

export type StateChangeListener = (newState: AppState, oldState: AppState) => void;

export class AppStateMachine {
  private currentState: AppState = AppStates.START;
  private readonly listeners: StateChangeListener[] = [];

  /**
   * Add state change listener
   * @param listener - Called with (newState, oldState)
   */
  onChange(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Set new state
   * @param newState - New state from AppStates
   */
  setState(newState: AppState): void {
    const oldState = this.currentState;
    this.currentState = newState;

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(newState, oldState);
    });
  }

  /**
   * Get current state
   */
  getState(): AppState {
    return this.currentState;
  }

  /**
   * Check if in specific state
   * @param state - State to check
   */
  is(state: AppState): boolean {
    return this.currentState === state;
  }
}
