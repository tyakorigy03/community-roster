import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const sourceLogo = 'public/logo.png';
const iconsDir = 'icons';
const assetsDir = 'assets';

const sizes = [48, 72, 96, 128, 192, 256, 512];

async function generateIcons() {
  try {
    // Ensure directories exist
    await fs.mkdir(iconsDir, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });

    console.log('Generating web icons...');
    for (const size of sizes) {
      const targetPath = path.join(iconsDir, `icon-${size}.webp`);
      await sharp(sourceLogo)
        .resize(size, size)
        .toFormat('webp')
        .toFile(targetPath);
      console.log(`Generated: ${targetPath}`);
    }

    console.log('Generating Capacitor source icon...');
    // Capacitor assets source icon (1024x1024 with white background as per common requirements)
    await sharp(sourceLogo)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(assetsDir, 'icon.png'));
    
    // Also generate splash icon source if needed (optional but good practice)
    await sharp(sourceLogo)
      .resize(2732, 2732, {
        fit: 'contain',
        background: { r: 25, g: 118, b: 210, alpha: 1 } // Using your theme color for splash
      })
      .toFile(path.join(assetsDir, 'splash.png'));

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
