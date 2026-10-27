/**
 * Sensor module for device orientation and step counting
 * Handles iOS permission requests and cross-platform sensor access
 */

import type { StopFn } from './types';

export interface OrientationData {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  heading: number;
  absolute: boolean;
}

export type OrientationCallback = (data: OrientationData) => void;
export type StepCallback = (stepCount: number) => void;

type PermissionResult = 'granted' | 'denied';

/** iOS 13+ adds a static requestPermission() to the sensor event constructors */
interface IOSPermissionConstructor {
  requestPermission?: () => Promise<PermissionResult>;
}

/** iOS Safari provides a compass heading on orientation events */
interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/**
 * Request sensor permissions (required on iOS 13+)
 * Must be called from a user gesture (button click)
 * @returns true if granted or not needed, false if denied
 */
export async function requestSensorPermission(): Promise<boolean> {
  const OrientationEvt =
    typeof DeviceOrientationEvent !== 'undefined'
      ? (DeviceOrientationEvent as unknown as IOSPermissionConstructor)
      : undefined;
  const MotionEvt =
    typeof DeviceMotionEvent !== 'undefined'
      ? (DeviceMotionEvent as unknown as IOSPermissionConstructor)
      : undefined;

  // Check if we're on iOS (has requestPermission method)
  const requestOrientation = OrientationEvt?.requestPermission;
  const requestMotion = MotionEvt?.requestPermission;

  try {
    // Request both permissions in parallel on iOS
    if (typeof requestOrientation === 'function' || typeof requestMotion === 'function') {
      const results = await Promise.all([
        typeof requestOrientation === 'function'
          ? requestOrientation.call(OrientationEvt)
          : Promise.resolve<PermissionResult>('granted'),
        typeof requestMotion === 'function'
          ? requestMotion.call(MotionEvt)
          : Promise.resolve<PermissionResult>('granted')
      ]);

      return results.every(result => result === 'granted');
    }

    // On Android and desktop, permission is granted by default
    return true;
  } catch (error) {
    console.error('Sensor permission error:', error);
    return false;
  }
}

/**
 * Calculate compass heading from device orientation
 * Works correctly when phone is held upright (camera facing forward)
 * @param alpha - Device rotation around Z axis (0-360)
 * @param beta - Device rotation around X axis (-180 to 180)
 * @param gamma - Device rotation around Y axis (-90 to 90)
 * @param webkitHeading - Webkit compass heading (iOS)
 * @returns Heading in degrees (0 = North, clockwise)
 */
function calculateHeading(
  alpha: number | null,
  beta: number | null,
  gamma: number | null,
  webkitHeading: number | null | undefined
): number {
  // On iOS, use webkitCompassHeading if available
  if (webkitHeading !== null && webkitHeading !== undefined) {
    return webkitHeading;
  }

  // For devices held upright (portrait mode, camera forward)
  // we need to account for the device orientation
  if (alpha === null) {
    return 0;
  }

  // When phone is held upright (beta ≈ 0-45°), use alpha directly
  // Alpha is 0-360, where 0 is North
  // For landscape orientation, we'd need to adjust based on gamma
  let heading = alpha;

  // Adjust for device tilt if held at an angle
  if (beta !== null && gamma !== null) {
    // If phone is held upright (portrait), gamma affects the heading
    // If tilted significantly, adjust heading
    const tiltThreshold = 45;
    if (Math.abs(beta) < tiltThreshold) {
      // Portrait mode - alpha is our heading
      heading = alpha;
    } else {
      // Landscape mode - adjust based on tilt direction
      if (gamma > 0) {
        heading = (alpha + 90) % 360;
      } else {
        heading = (alpha - 90 + 360) % 360;
      }
    }
  }

  return heading;
}

/**
 * Start listening to device orientation
 * @param callback - Called with {alpha, beta, gamma, heading, absolute}
 * @returns Stop function to remove listener
 */
export function startOrientation(callback: OrientationCallback): StopFn {
  let useAbsolute = false;

  const handleOrientation = (event: Event): void => {
    const e = event as IOSDeviceOrientationEvent;
    const alpha = e.alpha; // 0-360
    const beta = e.beta;   // -180 to 180
    const gamma = e.gamma; // -90 to 90

    // iOS provides webkitCompassHeading
    const webkitHeading = e.webkitCompassHeading;

    const heading = calculateHeading(alpha, beta, gamma, webkitHeading);

    callback({
      alpha,
      beta,
      gamma,
      heading,
      absolute: useAbsolute
    });
  };

  // Try deviceorientationabsolute first (provides true north)
  // (cast avoids TS narrowing `window` to `never` in the else branch,
  // since lib.dom always declares this property)
  if ('ondeviceorientationabsolute' in (window as object)) {
    useAbsolute = true;
    window.addEventListener('deviceorientationabsolute', handleOrientation);
  } else {
    // Fallback to regular deviceorientation
    window.addEventListener('deviceorientation', handleOrientation);
  }

  // Return stop function
  return () => {
    if (useAbsolute) {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
    }
  };
}

/**
 * Simple step counter using acceleration magnitude
 * Detects steps based on acceleration spikes
 * @param callback - Called with step count on each new step
 * @returns Stop function to remove listener
 */
export function startStepCounter(callback: StepCallback): StopFn {
  let stepCount = 0;
  let lastStepTime = 0;
  let lastAccelMagnitude = 0;

  // Tuning parameters
  const STEP_THRESHOLD = 1.3;     // Acceleration magnitude threshold (m/s²)
  const MIN_STEP_INTERVAL = 250;  // Minimum ms between steps (prevents double-counting)
  const SMOOTHING = 0.8;          // Low-pass filter for acceleration

  const handleMotion = (event: DeviceMotionEvent): void => {
    // Use accelerationIncludingGravity (more widely supported)
    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) {
      return;
    }

    // Calculate magnitude of acceleration vector
    const magnitude = Math.sqrt(
      accel.x * accel.x +
      accel.y * accel.y +
      accel.z * accel.z
    );

    // Apply smoothing filter
    const smoothedMagnitude = SMOOTHING * lastAccelMagnitude + (1 - SMOOTHING) * magnitude;
    lastAccelMagnitude = smoothedMagnitude;

    // Detect step: look for peaks in acceleration
    const now = Date.now();
    const timeSinceLastStep = now - lastStepTime;

    // Remove gravity (≈9.81) to get movement component
    const movement = Math.abs(smoothedMagnitude - 9.81);

    if (movement > STEP_THRESHOLD && timeSinceLastStep > MIN_STEP_INTERVAL) {
      stepCount++;
      lastStepTime = now;
      callback(stepCount);
    }
  };

  window.addEventListener('devicemotion', handleMotion);

  // Return stop function
  return () => {
    window.removeEventListener('devicemotion', handleMotion);
  };
}
