import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateNexusPng(size: number, maskable: boolean): Buffer {
  // RGBA pixel buffer with filter byte per scanline
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);

  const cx = size / 2;
  const cy = size / 2;
  const padding = maskable ? size * 0.22 : size * 0.16;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0; // Filter type 0 (None)
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;

      // Smooth blue-indigo Nexus gradient background (#0B57D0 -> #1E40AF)
      const t = (x + y) / (size * 2);
      let r = Math.round(11 + t * 25);
      let g = Math.round(87 - t * 23);
      let b = Math.round(208 - t * 18);
      const a = 255;

      // Draw crisp white "N" monogram in the safe zone center
      const left = padding;
      const right = size - padding;
      const top = padding;
      const bottom = size - padding;
      const stroke = Math.max(4, Math.round(size * 0.11));

      const inVerticalBounds = y >= top && y <= bottom;
      const inLeftBar = inVerticalBounds && x >= left && x <= left + stroke;
      const inRightBar = inVerticalBounds && x >= right - stroke && x <= right;

      // Diagonal bar from (left, top) to (right, bottom)
      const progressY = (y - top) / Math.max(1, bottom - top);
      const diagCenterX = left + stroke / 2 + progressY * (right - left - stroke);
      const inDiagBar =
        inVerticalBounds && Math.abs(x - diagCenterX) <= stroke * 0.58;

      if (inLeftBar || inRightBar || inDiagBar) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Subtle rounded highlight ring for non-maskable icon
      if (!maskable) {
        const distFromCenter = Math.hypot(x - cx, y - cy);
        if (distFromCenter > size * 0.44 && distFromCenter < size * 0.455) {
          r = Math.min(255, r + 45);
          g = Math.min(255, g + 55);
          b = Math.min(255, b + 45);
        }
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateNexusPng(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateNexusPng(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateNexusPng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateNexusPng(180, false));
console.log('Generated PWA PNG icons successfully.');
