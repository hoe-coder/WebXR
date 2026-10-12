/**
 * Generate QR codes for all nodes in the map
 * Run with: node src/generate-qr-codes.js
 */

import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load map data
const mapData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'map.json'), 'utf-8')
);

// Create output directory
const outputDir = path.join(__dirname, '../qr-codes');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate QR codes for all nodes
console.log('Generating QR codes...');

const promises = mapData.nodes.map(async (node) => {
  const qrData = JSON.stringify({ node: node.id });
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
    console.error(`✗ ${filename} - Error:`, error.message);
  }
});

await Promise.all(promises);

console.log(`\nDone! QR codes saved to: ${outputDir}`);
console.log('\nPrint these QR codes and place them at the corresponding locations.');
console.log('Each QR code contains: {"node":"<node-id>"}');
