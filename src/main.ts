/**
 * Main application file
 * Integrates all modules and manages UI flow
 */
import {requestSensorPermission, startOrientation, startStepCounter} from './sensors';
import {PositionTracker} from './position';
import {loadMap, findPath, getRooms, getNode, WaypointNavigator} from './routing';
import {startQRScanner, stopQRScanner} from './qr-scanner';
import {AppStateMachine, AppStates} from './app-state';
import type {MapData, StopFn} from './types';

// ============================================================================
// DOM Elements
// ============================================================================

/** Typed getElementById that fails fast if the element is missing */
function getEl<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element #${id} not found in DOM`);
  }
  return el as T;
}

const video = getEl<HTMLVideoElement>('video');
const qrScanner = getEl('qrScanner');
const navigationArrow = getEl('navigationArrow');
const arrowContainer = getEl('arrowContainer');
const navInfo = getEl('navInfo');
const navTarget = getEl('navTarget');
const navDistance = getEl('navDistance');
// Screens
const startScreen = getEl('startScreen');
const qrScreen = getEl('qrScreen');
const roomSelectScreen = getEl('roomSelectScreen');
const destinationScreen = getEl('destinationScreen');
// Buttons
const btnStartSensors = getEl<HTMLButtonElement>('btnStartSensors');
const btnToggleDebug = getEl<HTMLButtonElement>('btnToggleDebug');
const btnNewDestination = getEl<HTMLButtonElement>('btnNewDestination');
const roomList = getEl('roomList');
const destinationName = getEl('destinationName');
// Debug
const debugOverlay = getEl('debugOverlay');
const dbgAlpha = getEl('dbg-alpha');
const dbgBeta = getEl('dbg-beta');
const dbgGamma = getEl('dbg-gamma');
const dbgHeading = getEl('dbg-heading');
const dbgSteps = getEl('dbg-steps');
const dbgX = getEl('dbg-x');
const dbgY = getEl('dbg-y');
const dbgWaypoint = getEl('dbg-waypoint');
const dbgDistance = getEl('dbg-distance');

// ============================================================================
// Application State
// ============================================================================
const appState = new AppStateMachine();
const positionTracker = new PositionTracker();
let waypointNavigator: WaypointNavigator | null = null;
let mapData: MapData | null = null;
let currentNodeId: string | null = null;
let destinationNodeId: string | null = null;
let stopOrientationFn: StopFn | null = null;
let stopStepCounterFn: StopFn | null = null;

// ============================================================================
// State Management
// ============================================================================
appState.onChange((newState, oldState) => {
  console.log(`State: ${oldState} -> ${newState}`);

  // Hide all screens
  startScreen.classList.add('hidden');
  qrScreen.classList.add('hidden');
  roomSelectScreen.classList.add('hidden');
  destinationScreen.classList.add('hidden');
  arrowContainer.classList.add('hidden');
  navInfo.classList.add('hidden');

  // Show appropriate screen
  switch (newState) {
    case AppStates.START:
      startScreen.classList.remove('hidden');
      break;
    case AppStates.QR_SCAN:
      qrScreen.classList.remove('hidden');
      qrScanner.classList.remove('hidden');
      void startQRScanMode();
      break;
    case AppStates.ROOM_SELECT:
      roomSelectScreen.classList.remove('hidden');
      qrScanner.classList.add('hidden');
      void stopQRScanner();
      populateRoomList();
      break;
    case AppStates.NAVIGATION:
      arrowContainer.classList.remove('hidden');
      navInfo.classList.remove('hidden');
      break;
    case AppStates.DESTINATION_REACHED: {
      destinationScreen.classList.remove('hidden');
      const destNode = mapData && destinationNodeId ? getNode(mapData, destinationNodeId) : null;
      if (destNode) {
        destinationName.textContent = destNode.name;
      }
      break;
    }
  }
});

// ============================================================================
// Camera & Sensors
// ============================================================================
async function startCameraAndSensors(): Promise<void> {
  try {
    // Request sensor permissions (iOS)
    const sensorGranted = await requestSensorPermission();
    if (!sensorGranted) {
      alert('Sensor-Berechtigung wurde verweigert. Die App benötigt Zugriff auf Bewegungssensoren.');
      return;
    }

    // Start camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'environment'},
      audio: false
    });
    video.srcObject = stream;

    // Start orientation tracking
    stopOrientationFn = startOrientation((data) => {
      positionTracker.updateHeading(data.heading);

      // Update debug overlay
      if (data.alpha !== null) dbgAlpha.textContent = data.alpha.toFixed(1);
      if (data.beta !== null) dbgBeta.textContent = data.beta.toFixed(1);
      if (data.gamma !== null) dbgGamma.textContent = data.gamma.toFixed(1);
      dbgHeading.textContent = data.heading.toFixed(1);
    });

    // Start step counter
    stopStepCounterFn = startStepCounter((stepCount) => {
      positionTracker.onStep();
      dbgSteps.textContent = stepCount.toString();

      // Update position in debug overlay
      const pos = positionTracker.getPosition();
      dbgX.textContent = pos.x.toFixed(2);
      dbgY.textContent = pos.y.toFixed(2);
    });

    // Load map data
    mapData = await loadMap();
    console.log('Map loaded:', mapData);

    // Move to QR scan state
    appState.setState(AppStates.QR_SCAN);
  } catch (error) {
    console.error('Failed to start camera/sensors:', error);
    alert('Fehler beim Starten der Kamera oder Sensoren: ' + String(error));
  }
}

// ============================================================================
// QR Code Scanning
// ============================================================================
async function startQRScanMode(): Promise<void> {
  try {
    await startQRScanner('qrScanner', (data) => {
      console.log('QR scanned:', data);

      if (!mapData) {
        console.error('Map not loaded yet');
        return;
      }

      const nodeId = data.node;
      const node = getNode(mapData, nodeId);

      if (!node) {
        console.error('Unknown node:', nodeId);
        return;
      }

      // Set position to scanned node
      currentNodeId = nodeId;
      positionTracker.setPosition(node.x, node.y);
      console.log(`Position set to: ${node.name} (${node.x}, ${node.y})`);

      // Move to room selection
      appState.setState(AppStates.ROOM_SELECT);
    });
  } catch (error) {
    console.error('QR scanner error:', error);
  }
}

// ============================================================================
// Room Selection
// ============================================================================
function populateRoomList(): void {
  if (!mapData) return;

  roomList.innerHTML = '';
  const rooms = getRooms(mapData);

  rooms.forEach((room) => {
    // Don't show current location as destination
    if (room.id === currentNodeId) return;

    const button = document.createElement('button');
    button.className = `
      w-full bg-blue-500 active:bg-blue-600
      text-white text-left text-lg font-medium
      px-6 py-4 rounded-xl shadow-lg
      touch-manipulation
    `;
    button.textContent = room.name;
    button.onclick = () => selectDestination(room.id);
    roomList.appendChild(button);
  });
}

function selectDestination(roomId: string): void {
  if (!currentNodeId || !mapData) {
    console.error('No current position set');
    return;
  }

  destinationNodeId = roomId;

  // Calculate path
  const path = findPath(mapData, currentNodeId, roomId);
  if (!path) {
    alert('Kein Pfad gefunden!');
    return;
  }

  console.log('Path:', path.map(n => n.name).join(' -> '));

  // Set up waypoint navigator
  waypointNavigator = new WaypointNavigator(path);

  // Update nav target display
  const destNode = getNode(mapData, roomId);
  if (destNode) {
    navTarget.textContent = `Ziel: ${destNode.name}`;
  }

  // Start navigation
  appState.setState(AppStates.NAVIGATION);
  startNavigationLoop();
}

// ============================================================================
// Navigation Loop
// ============================================================================
let navigationLoopId: number | null = null;

function startNavigationLoop(): void {
  if (navigationLoopId !== null) {
    cancelAnimationFrame(navigationLoopId);
  }

  function loop(): void {
    if (!appState.is(AppStates.NAVIGATION) || !waypointNavigator) {
      return;
    }

    const pos = positionTracker.getPosition();
    const navState = waypointNavigator.update(pos.x, pos.y);

    if (navState.reached) {
      // Destination reached
      appState.setState(AppStates.DESTINATION_REACHED);
      return;
    }

    const waypoint = navState.waypoint;
    if (waypoint) {
      // Calculate bearing to waypoint
      const bearing = positionTracker.bearingTo(waypoint.x, waypoint.y);
      const distance = navState.distance;

      // Calculate arrow rotation
      // Arrow points in direction of waypoint relative to current heading
      const arrowAngle = bearing - pos.heading;

      // Rotate arrow
      navigationArrow.style.transform = `rotate(${arrowAngle}deg)`;

      // Update distance display
      navDistance.textContent = `${distance.toFixed(1)} m`;

      // Update debug overlay
      dbgWaypoint.textContent = waypoint.name || waypoint.id;
      dbgDistance.textContent = distance.toFixed(2);
    }

    navigationLoopId = requestAnimationFrame(loop);
  }

  loop();
}

// ============================================================================
// Event Listeners
// ============================================================================
btnStartSensors.addEventListener('click', () => {
  void startCameraAndSensors();
});

btnToggleDebug.addEventListener('click', () => {
  debugOverlay.classList.toggle('hidden');
});

btnNewDestination.addEventListener('click', () => {
  // Return to room selection
  appState.setState(AppStates.ROOM_SELECT);
});

// ============================================================================
// Cleanup helpers (exposed for future use, e.g. when leaving the page)
// ============================================================================
export function stopSensors(): void {
  stopOrientationFn?.();
  stopStepCounterFn?.();
  stopOrientationFn = null;
  stopStepCounterFn = null;
}

// ============================================================================
// Initialize
// ============================================================================
console.log('Indoor Navigation App loaded');
console.log('Click "Sensoren aktivieren" to start');
