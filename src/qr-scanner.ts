/**
 * QR Code scanner module using html5-qrcode
 * Scans QR codes to set position in the building
 */

import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  type Html5QrcodeCameraScanConfig,
  type QrcodeErrorCallback,
  type QrcodeSuccessCallback
} from 'html5-qrcode';
import type {QRCodeData} from './types';

export type QRScanCallback = (data: QRCodeData) => void;

let scanner: Html5Qrcode | null = null;

/** Type guard: checks that parsed QR content has a string `node` field */
function isQRCodeData(value: unknown): value is QRCodeData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).node === 'string' &&
    (value as Record<string, unknown>).node !== ''
  );
}

/**
 * Start QR code scanner
 * @param elementId - ID of the HTML element for the scanner
 * @param onScan - Callback when QR code is scanned, receives parsed JSON data
 * @returns Stop function to stop scanning
 */
export async function startQRScanner(
  elementId: string,
  onScan: QRScanCallback
): Promise<() => Promise<void>> {
  if (scanner) {
    await stopQRScanner();
  }

  const instance = new Html5Qrcode(elementId);
  scanner = instance;

  const config: Html5QrcodeCameraScanConfig = {
    fps: 10,
    qrbox: {width: 250, height: 250},
    aspectRatio: 1.0
  };

  const onScanSuccess: QrcodeSuccessCallback = (decodedText) => {
    try {
      // Parse QR code content as JSON
      const data: unknown = JSON.parse(decodedText);

      // Validate that it has a node field
      if (isQRCodeData(data)) {
        onScan(data);
      } else {
        console.warn('QR code does not contain a valid node field:', data);
      }
    } catch (error) {
      console.error('QR code parse error:', error);
      console.log('QR content:', decodedText);
    }
  };

  const onScanFailure: QrcodeErrorCallback = () => {
    // Silent - scanning failures are normal when no QR code is visible
  };

  try {
    await instance.start(
      {facingMode: 'environment'},
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
 */
export async function stopQRScanner(): Promise<void> {
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
 */
export function isScannerRunning(): boolean {
  return scanner !== null && scanner.getState() === Html5QrcodeScannerState.SCANNING;
}
