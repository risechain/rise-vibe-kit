const fs = require('fs');
const path = require('path');

// Paths
const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(frontendDir, 'public');
const imagesDir = path.join(publicDir, 'images');

// Since we have RISE logo PNGs, let's use those to create a simple favicon setup
async function setupFavicons() {
  try {
    console.log('🎨 Setting up favicons...');
    
    // Check if logo files exist
    const lightLogoPath = path.join(imagesDir, 'rise-logo-light.png');
    const darkLogoPath = path.join(imagesDir, 'rise-logo-black.png');
    
    if (!fs.existsSync(lightLogoPath) || !fs.existsSync(darkLogoPath)) {
      console.error('❌ RISE logo files not found in', imagesDir);
      return;
    }
    
    // Copy the light logo as the main favicon for now
    // (In production, you'd want to properly resize these)
    const faviconPath = path.join(publicDir, 'favicon.ico');
    
    // For now, we'll create a simple web manifest
    const manifest = {
      name: 'RISE Vibe Kit',
      short_name: 'RISE',
      description: 'Ultra-fast blockchain interactions with RISE',
      icons: [
        {
          src: '/images/rise-logo-light.png',
          sizes: 'any',
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
    
    console.log('🎉 Favicon setup complete!');
    console.log('\nNote: For production, you should properly generate multiple favicon sizes.');
    console.log('The SVG files are available at:');
    console.log('  - /public/favicon_light.svg');
    console.log('  - /public/favicon_dark.svg');
    
  } catch (error) {
    console.error('❌ Error setting up favicons:', error);
  }
}

setupFavicons();