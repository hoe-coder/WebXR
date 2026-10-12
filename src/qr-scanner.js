/**
 * QR Code scanner module using html5-qrcode
 * Scans QR codes to set position in the building
 */

import { Html5Qrcode } from 'html5-qrcode';

let scanner = null;

/**
 * Start QR code scanner
 * @param {string} elementId - ID of the HTML element for the scanner
 * @param {Function} onScan - Callback when QR code is scanned, receives parsed JSON data
 * @returns {Promise<Function>} Stop function to stop scanning
 */
export async function startQRScanner(elementId, onScan) {
  if (scanner) {
    await stopQRScanner();
  }

  scanner = new Html5Qrcode(elementId);

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  };

  const onScanSuccess = (decodedText) => {
    try {
      // Parse QR code content as JSON
      const data = JSON.parse(decodedText);

      // Validate that it has a node field
      if (data.node) {
        onScan(data);
      } else {
        console.warn('QR code does not contain a valid node field:', data);
      }
    } catch (error) {
      console.error('QR code parse error:', error);
      console.log('QR content:', decodedText);
    }
  };

  const onScanFailure = (error) => {
    // Silent - scanning failures are normal when no QR code is visible
  };

  try {
    await scanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );

    // Return stop function
    return stopQRScanner;
  } catch (error) {
    console.error('Failed to start QR scanner:', error);
    throw error;
  }
}

/**
 * Stop QR code scanner
 * @returns {Promise<void>}
 */
export async function stopQRScanner() {
  if (scanner) {
    try {
      await scanner.stop();
      scanner.clear();
      scanner = null;
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }
}

/**
 * Check if scanner is currently running
 * @returns {boolean}
 */
export function isScannerRunning() {
  return scanner !== null && scanner.getState() === Html5Qrcode.STATE_SCANNING;
}
