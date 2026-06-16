import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "../public/icons");

await mkdir(iconsDir, { recursive: true });

function brandSvg(size) {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.52);
  const cy = Math.round(size * 0.64);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#185FA5"/>
  <text
    x="50%" y="${cy}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="white"
    text-anchor="middle"
  >B</text>
</svg>`;
}

const sizes = [
  { file: "icon-192.png",       size: 192 },
  { file: "icon-512.png",       size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-32.png",        size: 32  },
];

for (const { file, size } of sizes) {
  const dest = path.join(iconsDir, file);
  await sharp(Buffer.from(brandSvg(size))).png().toFile(dest);
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log("\nAll icons generated in public/icons/");
