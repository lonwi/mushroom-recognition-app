#!/usr/bin/env node

// Script to convert JPEG mushroom images to WebP format
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MUSHROOMS_DIR = 'assets/mushrooms';
const TEMP_DIR = 'temp_mushroom_conversion';

console.log('=== Converting mushroom images to WebP ===');

// Create temp directory for processing
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

try {
  // Check if ImageMagick is available
  execSync('convert -version', { stdio: 'ignore' });
  console.log('✓ ImageMagick is available');
} catch (error) {
  console.error('✗ ImageMagick not found. Please install ImageMagick to convert images.');
  console.log('Install on Ubuntu/Debian: sudo apt-get install imagemagick');
  console.log('Install on macOS: brew install imagemagick');
  process.exit(1);
}

// Check if mushrooms directory exists
if (!fs.existsSync(MUSHROOMS_DIR)) {
  console.error(`✗ Directory ${MUSHROOMS_DIR} does not exist`);
  process.exit(1);
}

const files = fs.readdirSync(MUSHROOMS_DIR);

let convertedCount = 0;
let failedCount = 0;

console.log(`Processing ${files.length} files in ${MUSHROOMS_DIR}`);

files.forEach(file => {
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    const oldPath = path.join(MUSHROOMS_DIR, file);
    const newFilename = file.replace(/\.(jpe?g)$/i, '.webp');
    const newPath = path.join(MUSHROOMS_DIR, newFilename);
    
    try {
      console.log(`Converting ${file} to WebP...`);
      
      // Convert using ImageMagick
      execSync(`convert "${oldPath}" -define webp:lossless=true "${newPath}"`, { 
        stdio: 'inherit' 
      });
      
      console.log(`✓ Converted ${file} to ${newFilename}`);
      convertedCount++;
      
    } catch (error) {
      console.error(`✗ Failed to convert ${file}:`, error.message);
      failedCount++;
    }
  }
});

console.log(`\n=== Conversion Summary ===`);
console.log(`Successfully converted: ${convertedCount}`);
console.log(`Failed conversions: ${failedCount}`);

if (failedCount > 0) {
  console.warn(`⚠️  ${failedCount} files failed to convert. Please check logs above.`);
}

if (convertedCount > 0) {
  console.log('✅ Conversion completed successfully!');
  console.log('Next steps:');
  console.log('1. Update import paths in src/utils/mushroomImages.ts');
  console.log('2. Test the app with new WebP images');
  console.log('3. Verify image rendering quality');
} else if (failedCount === 0 && convertedCount === 0) {
  console.log('ℹ️ No JPEG files found to convert.');
}