/**
 * Temporary script to generate placeholder icon PNGs
 * Run with: node generate-icons.js
 * Then delete this file if desired
 */

const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = 'assets';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Creating placeholder icon files...');

// Create minimal valid PNG files (1x1 transparent PNG encoded as base64)
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Write same minimal PNG for all sizes (they're placeholders)
fs.writeFileSync(path.join(assetsDir, 'icon16.png'), minimalPNG);
fs.writeFileSync(path.join(assetsDir, 'icon48.png'), minimalPNG);
fs.writeFileSync(path.join(assetsDir, 'icon128.png'), minimalPNG);

console.log('Placeholder icons created!');
console.log('Note: These are minimal 1x1 transparent PNGs. Replace with proper colored square icons.');

