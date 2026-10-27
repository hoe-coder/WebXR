/**
 * Main application file
 * Integrates all modules and manages UI flow
 */

import { requestSensorPermission, startOrientation, startStepCounter } from './sensors.js';
import { PositionTracker } from './position.js';
import { loadMap, findPath, getRooms, getNode, WaypointNavigator } from './routing.js';
import { startQRScanner, stopQRScanner } from './qr-scanner.js';
import { AppStateMachine, AppStates } from './app-state.js';

// ============================================================================
// DOM Elements
// ============================================================================

const video = document.getElementById('video') as HTMLVideoElement;
const qrScanner = document.getElementById('qrScanner') as HTMLDivElement;
const navigationArrow = document.getElementById('navigationArrow') as HTMLElement;
const arrowContainer = document.getElementById('arrowContainer') as HTMLDivElement;
const navInfo = document.getElementById('navInfo') as HTMLDivElement;
const navTarget = document.getElementById('navTarget') as HTMLDivElement;
const navDistance = document.getElementById('navDistance') as HTMLDivElement;

// Screens
const startScreen = document.getElementById('startScreen') as HTMLDivElement;
const qrScreen = document.getElementById('qrScreen') as HTMLDivElement;
const roomSelectScreen = document.getElementById('roomSelectScreen') as HTMLDivElement;
const destinationScreen = document.getElementById('destinationScreen') as HTMLDivElement;

// Buttons
const btnStartSensors = document.getElementById('btnStartSensors') as HTMLButtonElement;
const btnToggleDebug = document.getElementById('btnToggleDebug') as HTMLButtonElement;
const btnNewDestination = document.getElementById('btnNewDestination') as HTMLButtonElement;
const roomList = document.getElementById('roomList') as HTMLDivElement;
const destinationName = document.getElementById('destinationName') as HTMLParagraphElement;

// Debug
const debugOverlay = document.getElementById('debugOverlay') as HTMLDivElement;
const dbgAlpha = document.getElementById('dbg-alpha') as HTMLSpanElement;
const dbgBeta = document.getElementById('dbg-beta') as HTMLSpanElement;
const dbgGamma = document.getElementById('dbg-gamma') as HTMLSpanElement;
const dbgHeading = document.getElementById('dbg-heading') as HTMLSpanElement;
const dbgSteps = document.getElementById('dbg-steps') as HTMLSpanElement;
const dbgX = document.getElementById('dbg-x') as HTMLSpanElement;
const dbgY = document.getElementById('dbg-y') as HTMLSpanElement;
const dbgWaypoint = document.getElementById('dbg-waypoint') as HTMLSpanElement;
const dbgDistance = document.getElementById('dbg-distance') as HTMLSpanElement;

// ============================================================================
// Application State
// ============================================================================

const appState = new AppStateMachine();
const positionTracker = new PositionTracker();
let waypointNavigator: WaypointNavigator | null = null;
let mapData: any = null;
let currentNodeId: string | null = null;
let destinationNodeId: string | null = null;

let stopOrientationFn: Function | null = null;
let stopStepCounterFn: Function | null = null;

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
      startQRScanMode();
      break;

    case AppStates.ROOM_SELECT:
      roomSelectScreen.classList.remove('hidden');
      qrScanner.classList.add('hidden');
      stopQRScanner();
      populateRoomList();
      break;

    case AppStates.NAVIGATION:
      arrowContainer.classList.remove('hidden');
      navInfo.classList.remove('hidden');
      break;

    case AppStates.DESTINATION_REACHED:
      destinationScreen.classList.remove('hidden');
      const destNode = destinationNodeId ? getNode(mapData, destinationNodeId) : null;
      if (destNode) {
        destinationName.textContent = destNode.name;
      }
      break;
  }
});

// ============================================================================
// Camera & Sensors
// ============================================================================

async function startCameraAndSensors() {
  try {
    // Request sensor permissions (iOS)
    const sensorGranted = await requestSensorPermission();
    if (!sensorGranted) {
      alert('Sensor-Berechtigung wurde verweigert. Die App benötigt Zugriff auf Bewegungssensoren.');
      return;
    }

    // Start camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
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
    alert('Fehler beim Starten der Kamera oder Sensoren: ' + error);
  }
}

// ============================================================================
// QR Code Scanning
// ============================================================================

async function startQRScanMode() {
  try {
    await startQRScanner('qrScanner', (data) => {
      console.log('QR scanned:', data);

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

function populateRoomList() {
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

function selectDestination(roomId: string) {
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

function startNavigationLoop() {
  if (navigationLoopId !== null) {
    cancelAnimationFrame(navigationLoopId);
  }

  function loop() {
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
  startCameraAndSensors();
});

btnToggleDebug.addEventListener('click', () => {
  debugOverlay.classList.toggle('hidden');
});

btnNewDestination.addEventListener('click', () => {
  // Return to room selection
  appState.setState(AppStates.ROOM_SELECT);
});

// ============================================================================
// Initialize
// ============================================================================

console.log('Indoor Navigation App loaded');
console.log('Click "Sensoren aktivieren" to start');
