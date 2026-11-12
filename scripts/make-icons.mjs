// 임시 앱 아이콘 생성기: 초록 바탕 + 흰 체크 표시
// 실행: node scripts/make-icons.mjs  → public/icons/*.png
// 나중에 원하는 아이콘 이미지가 생기면 이 파일 대신 그 이미지로 교체하면 됩니다.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const BG = [0x2f, 0x7d, 0x5b];
const FG = [0xff, 0xff, 0xff];

// CRC32 (PNG 청크용)
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * @param size 픽셀 크기
 * @param rounded true면 모서리를 둥글게(바깥은 투명), false면 꽉 찬 사각형(아이폰·maskable용)
 * @param checkScale 체크 표시 크기 (maskable은 가운데 안전 영역에 들어가도록 작게)
 */
function drawIcon(size, rounded, checkScale) {
  const SS = 4; // 안티앨리어싱용 서브샘플
  const rgba = Buffer.alloc(size * size * 4);
  const r = rounded ? size * 0.22 : 0;
  // 체크 표시: 0~1 좌표계 (가운데 기준)
  const pts = [
    [0.27, 0.53],
    [0.43, 0.68],
    [0.74, 0.35],
  ].map(([x, y]) => [0.5 + (x - 0.5) * checkScale, 0.5 + (y - 0.5) * checkScale]);
  const stroke = 0.085 * checkScale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inShape = 0, inCheck = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
          // 둥근 사각형 안인지
          let inside = true;
          if (r > 0) {
            const cx = Math.min(Math.max(px, r), size - r);
            const cy = Math.min(Math.max(py, r), size - r);
            inside = Math.hypot(px - cx, py - cy) <= r;
          }
          if (!inside) continue;
          inShape++;
          const u = px / size, v = py / size;
          const d = Math.min(
            distToSegment(u, v, ...pts[0], ...pts[1]),
            distToSegment(u, v, ...pts[1], ...pts[2]),
          );
          if (d <= stroke / 2) inCheck++;
        }
      }
      const n = SS * SS;
      const a = inShape / n;
      const f = inShape ? inCheck / inShape : 0;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BG[c] * (1 - f) + FG[c] * f);
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePNG(size, rgba);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': drawIcon(192, true, 1),
  'icon-512.png': drawIcon(512, true, 1),
  'maskable-512.png': drawIcon(512, false, 0.8),
  'apple-touch-icon-180.png': drawIcon(180, false, 0.9),
  'favicon-32.png': drawIcon(32, true, 1),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(OUT, name), buf);
  console.log(`${name}  ${buf.length} bytes`);
}
