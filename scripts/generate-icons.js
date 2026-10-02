import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons...');

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('✓ Created public/pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('✓ Created public/pwa-512x512.png');

  // apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✓ Created public/apple-touch-icon.png');

  // Maskable 512x512 (with safe zone: 80% content size, full background)
  const maskableSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#fef3c7" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg-grad)" />
      <g transform="translate(130, 130) scale(0.85)">
        <circle cx="56" cy="256" r="44" fill="url(#wave-grad)" />
        <path d="M 12 144 A 168 168 0 0 1 180 312" fill="none" stroke="url(#wave-grad)" stroke-width="44" stroke-linecap="round" />
        <path d="M 12 40 A 272 272 0 0 1 284 312" fill="none" stroke="url(#wave-grad)" stroke-width="44" stroke-linecap="round" />
      </g>
    </svg>
  `;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('✓ Created public/pwa-maskable-512x512.png');

  // Favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.ico');
  console.log('✓ Created public/favicon.ico');

  console.log('All PWA icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
