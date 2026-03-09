import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

async function createMasterAsset(filename, size, logoScale) {
    console.log(`Generating ${filename} (${size}x${size})...`);
    
    const logoPath = path.join(__dirname, 'public', 'sadhana-logo.svg');
    
    if (!fs.existsSync(logoPath)) {
        console.error(`❌ Logo not found at ${logoPath}`);
        return;
    }

    try {
        const targetWidth = Math.round(size * logoScale);
        
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 245, g: 158, b: 11, alpha: 1 } // #f59e0b Saffron
            }
        })
        .composite([
            {
                input: logoPath,
                density: 300, // High density for SVG scaling
            }
        ])
        .png()
        .toFile(path.join(assetsDir, filename));
        
        // Use another sharp instance to correctly scale the inner SVG
        // Sharp composite doesn't auto scale great, so we scale the SVG first, then composite.
        const resizedLogo = await sharp(logoPath, { density: 300 })
            .resize(targetWidth)
            .toBuffer();
            
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 245, g: 158, b: 11, alpha: 1 } // #f59e0b Saffron
            }
        })
        .composite([{ input: resizedLogo, gravity: 'center' }])
        .png()
        .toFile(path.join(assetsDir, filename));

        console.log(`✅ Successfully generated ${filename}`);
        
    } catch (err) {
        console.error(`❌ Failed to generate ${filename}`);
        console.error(err);
    }
}

async function generateAll() {
    await createMasterAsset('icon.png', 1024, 0.7);
    await createMasterAsset('splash.png', 2732, 0.3);
}

generateAll();
