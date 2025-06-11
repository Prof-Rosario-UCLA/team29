const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Generate icons
async function generateIcons() {
    const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));
    
    // Generate 192x192 icon
    await sharp(iconSvg)
        .resize(192, 192)
        .png()
        .toFile(path.join(publicDir, 'logo192.png'));
    
    // Generate 512x512 icon
    await sharp(iconSvg)
        .resize(512, 512)
        .png()
        .toFile(path.join(publicDir, 'logo512.png'));
    
    // Generate favicon
    await sharp(iconSvg)
        .resize(32, 32)
        .toFile(path.join(publicDir, 'favicon.ico'));
}

// Generate screenshot
async function generateScreenshot() {
    const screenshotSvg = fs.readFileSync(path.join(publicDir, 'screenshot.svg'));
    
    await sharp(screenshotSvg)
        .resize(1280, 720)
        .png()
        .toFile(path.join(publicDir, 'screenshot1.png'));
}

// Run the generation
async function generateAssets() {
    try {
        await generateIcons();
        await generateScreenshot();
        console.log('PWA assets generated successfully!');
    } catch (error) {
        console.error('Error generating PWA assets:', error);
    }
}

generateAssets(); 