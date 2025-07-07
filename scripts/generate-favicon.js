const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(frontendDir, 'public');
const lightSvgPath = path.join(publicDir, 'favicon_light.svg');
const darkSvgPath = path.join(publicDir, 'favicon_dark.svg');

// Sizes for different favicon formats
const sizes = [16, 32, 48, 64, 96, 128, 180, 192, 256];

async function generateFavicons() {
  try {
    console.log('🎨 Generating favicons from SVG files...');
    
    // Check if SVG files exist
    if (!fs.existsSync(lightSvgPath)) {
      console.error('❌ Light favicon SVG not found:', lightSvgPath);
      return;
    }
    if (!fs.existsSync(darkSvgPath)) {
      console.error('❌ Dark favicon SVG not found:', darkSvgPath);
      return;
    }
    
    // Generate PNGs for each size (light mode)
    for (const size of sizes) {
      const outputPath = path.join(publicDir, `icon-${size}.png`);
      await sharp(lightSvgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated ${outputPath}`);
    }
    
    // Generate PNGs for each size (dark mode)
    for (const size of sizes) {
      const outputPath = path.join(publicDir, `icon-${size}-dark.png`);
      await sharp(darkSvgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated ${outputPath}`);
    }
    
    // Generate apple-touch-icon (180x180)
    await sharp(lightSvgPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');
    
    // Generate favicon.ico (multi-resolution) - using light mode
    await sharp(lightSvgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
      
    await sharp(lightSvgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16.png'));
      
    console.log('✅ Generated favicon components (use an ICO converter for final favicon.ico)');
    
    // Generate manifest.json
    const manifest = {
      name: 'RISE Vibe Kit',
      short_name: 'RISE',
      description: 'Ultra-fast blockchain interactions with RISE',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icon-256.png',
          sizes: '256x256',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/'
    };
    
    fs.writeFileSync(
      path.join(publicDir, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('✅ Generated site.webmanifest');
    
    console.log('🎉 Favicon generation complete!');
    console.log('\nNote: For the best results, manually create favicon.ico from the PNG files using an ICO converter.');
    
  } catch (error) {
    console.error('❌ Error generating favicons:', error);
  }
}

// Main execution
if (require.main === module) {
  // Check if sharp is installed
  try {
    require('sharp');
    generateFavicons();
  } catch (e) {
    console.log('📦 Installing sharp...');
    const { execSync } = require('child_process');
    try {
      execSync('cd frontend && npm install sharp --save-dev', { stdio: 'inherit' });
      console.log('✅ Sharp installed successfully');
      // Re-require after installation
      delete require.cache[require.resolve('sharp')];
      generateFavicons();
    } catch (installError) {
      console.error('❌ Failed to install sharp:', installError.message);
      console.log('\nPlease install sharp manually:');
      console.log('  cd frontend && npm install sharp --save-dev');
    }
  }
}