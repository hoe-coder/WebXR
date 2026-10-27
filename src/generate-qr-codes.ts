/**
 * Generate QR codes for all nodes in the map
 * Run with: npx tsx src/generate-qr-codes.ts
 */

import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MapData, QRCodeData } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load map data
const mapData: MapData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'map.json'), 'utf-8')
);

// Create output directory
const outputDir = path.join(__dirname, '../qr-codes');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate QR codes for all nodes
console.log('Generating QR codes...');

const promises = mapData.nodes.map(async (node): Promise<void> => {
  const payload: QRCodeData = { node: node.id };
  const qrData = JSON.stringify(payload);
  const filename = `${node.id}.png`;
  const filepath = path.join(outputDir, filename);

  try {
    await QRCode.toFile(filepath, qrData, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    console.log(`✓ ${filename} - ${node.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${filename} - Error:`, message);
  }
});

await Promise.all(promises);

console.log(`\nDone! QR codes saved to: ${outputDir}`);
console.log('\nPrint these QR codes and place them at the corresponding locations.');
console.log('Each QR code contains: {"node":"<node-id>"}');
