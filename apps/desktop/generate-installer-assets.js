#!/usr/bin/env node
/**
 * Tavon Installer Asset Generator
 * Generates dark-themed BMP images for the NSIS installer wizard.
 * No external dependencies — pure Node.js.
 *
 * Outputs:
 *   build/installer/sidebar.bmp   164 × 314  (Welcome / Finish pages, left panel)
 *   build/installer/header.bmp    150 × 57   (Progress / Directory pages, top-right)
 */

const fs = require("fs");
const path = require("path");

// ── Tavon colour palette ────────────────────────────────────────────────────
const BG       = [14, 14, 16];        // #0e0e10
const BG2      = [22, 24, 27];        // #16181b
const GOLD     = [185, 167, 132];     // #b9a784
const CREAM    = [234, 230, 223];     // #eae6df
const LINE     = [38, 40, 44];        // #26282c
const TRANS    = [14, 14, 16];        // same as BG (transparent effect)

// ── BMP writer (24-bit, bottom-up rows) ────────────────────────────────────
function writeBMP(filepath, width, height, getPixel) {
  const rowPad  = (4 - (width * 3) % 4) % 4;
  const rowSize = width * 3 + rowPad;
  const pixSz   = rowSize * height;
  const buf     = Buffer.alloc(54 + pixSz, 0);

  // File header
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(54 + pixSz, 2);
  buf.writeUInt32LE(54, 10);

  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40,     14);
  buf.writeInt32LE( width,  18);
  buf.writeInt32LE( height, 22);   // positive = bottom-up
  buf.writeUInt16LE(1,      26);
  buf.writeUInt16LE(24,     28);   // 24 bpp
  buf.writeUInt32LE(0,      30);
  buf.writeUInt32LE(pixSz,  34);
  buf.writeInt32LE( 2835,   38);
  buf.writeInt32LE( 2835,   42);

  for (let y = 0; y < height; y++) {
    const bmpY = height - 1 - y;       // BMP stores rows bottom-up
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y);
      const off = 54 + bmpY * rowSize + x * 3;
      buf[off]     = b;                 // BMP channel order: BGR
      buf[off + 1] = g;
      buf[off + 2] = r;
    }
  }

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buf);
  console.log(`  ✓  ${path.relative(process.cwd(), filepath)}  (${width}×${height})`);
}

// ── Pixel-font glyphs (5 × 7 bitmaps) ─────────────────────────────────────
const GLYPHS = {
  T: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  A: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  V: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  O: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  N: [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  ".":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,1,1,0,0]],
  "0":[[0,1,1,1,0],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[0,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
  "1":[[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
  " ":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
};

/**
 * Render a string of glyphs into a pixel grid.
 * @param {string} text
 * @param {number} scale   pixel-to-screen scale factor
 * @returns {{ w: number, h: number, draw: (cx, cy, fg, buf) => void }}
 */
function makeText(text, scale = 1) {
  const GW = 5, GH = 7, GAP = 1;
  const charW = GW * scale;
  const charH = GH * scale;
  const gapW  = GAP * scale;
  const chars  = [...text];
  const total  = chars.length * charW + Math.max(0, chars.length - 1) * gapW;

  return {
    w: total,
    h: charH,
    draw(cx, cy, fg, pixels) {   // pixels[y][x] = [r,g,b]
      let x0 = cx;
      for (const ch of chars) {
        const glyph = GLYPHS[ch] || GLYPHS[" "];
        for (let gy = 0; gy < GH; gy++) {
          for (let gx = 0; gx < GW; gx++) {
            if (!glyph[gy][gx]) continue;
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const px = x0 + gx * scale + sx;
                const py = cy  + gy * scale + sy;
                if (pixels[py] && px < pixels[py].length) {
                  pixels[py][px] = fg;
                }
              }
            }
          }
        }
        x0 += charW + gapW;
      }
    }
  };
}

// ── Helper: linear interpolation between two colours ───────────────────────
function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ── SIDEBAR  164 × 314 ─────────────────────────────────────────────────────
function generateSidebar(outPath) {
  const W = 164, H = 314;

  // Build pixel grid
  const pixels = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => [...BG])
  );

  // Background: very subtle top-to-bottom gradient
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const bg = lerp(BG, BG2, t * 0.6);
    for (let x = 0; x < W; x++) pixels[y][x] = [...bg];
  }

  // Right-edge subtle highlight line
  for (let y = 0; y < H; y++) pixels[y][W - 1] = [...LINE];

  // ── Gold top accent band ──────────────────────────────────────────────────
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < W - 1; x++) pixels[y][x] = [...GOLD];
  for (let x = 0; x < W - 1; x++) pixels[3][x] = lerp(GOLD, BG, 0.5);

  // ── "TAVON" big pixel text ─────────────────────────────────────────────────
  const logo = makeText("TAVON", 3);
  const logoX = Math.floor((W - logo.w) / 2);
  const logoY = 28;
  logo.draw(logoX, logoY, GOLD, pixels);

  // Thin gold underline below logo
  const underY = logoY + logo.h + 6;
  const ulW = Math.min(W - 32, logo.w + 20);
  const ulX = Math.floor((W - ulW) / 2);
  for (let x = ulX; x < ulX + ulW; x++) {
    pixels[underY][x] = [...GOLD];
    pixels[underY + 1][x] = lerp(GOLD, BG, 0.7);
  }

  // ── "v 0.1.11" label ───────────────────────────────────────────────────────
  const ver = makeText("V 0.1.11", 1);
  const verX = Math.floor((W - ver.w) / 2);
  const verY = underY + 14;
  ver.draw(verX, verY, lerp(GOLD, BG, 0.35), pixels);

  // ── Decorative dots row ────────────────────────────────────────────────────
  const dotY  = H - 40;
  const dotSp = 9;
  const dotN  = 7;
  const dotX0 = Math.floor((W - (dotN - 1) * dotSp) / 2);
  for (let i = 0; i < dotN; i++) {
    const dx = dotX0 + i * dotSp;
    pixels[dotY][dx]     = [...GOLD];
    pixels[dotY][dx + 1] = [...GOLD];
    pixels[dotY + 1][dx] = [...GOLD];
    pixels[dotY + 1][dx + 1] = [...GOLD];
  }

  // ── Bottom thin gold line ──────────────────────────────────────────────────
  for (let x = 0; x < W - 1; x++) {
    pixels[H - 4][x] = lerp(GOLD, BG, 0.6);
    pixels[H - 3][x] = [...GOLD];
    pixels[H - 2][x] = lerp(GOLD, BG, 0.6);
  }

  writeBMP(outPath, W, H, (x, y) => pixels[y][x]);
}

// ── HEADER  150 × 57 ──────────────────────────────────────────────────────
function generateHeader(outPath) {
  const W = 150, H = 57;

  const pixels = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => [...BG])
  );

  // Subtle gradient
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const bg = lerp(BG, BG2, t * 0.4);
    for (let x = 0; x < W; x++) pixels[y][x] = [...bg];
  }

  // Bottom border line
  for (let x = 0; x < W; x++) pixels[H - 1][x] = [...LINE];

  // Gold left bar (3 px wide)
  for (let y = 6; y < H - 6; y++) {
    pixels[y][0] = [...GOLD];
    pixels[y][1] = lerp(GOLD, BG, 0.4);
    pixels[y][2] = lerp(GOLD, BG, 0.8);
  }

  // "TAVON" small pixel text centred vertically
  const logo = makeText("TAVON", 2);
  const logoX = 14;
  const logoY = Math.floor((H - logo.h) / 2);
  logo.draw(logoX, logoY, CREAM, pixels);

  // Small gold dot after logo
  const dotX = logoX + logo.w + 8;
  const dotY = Math.floor(H / 2);
  pixels[dotY][dotX]     = [...GOLD];
  pixels[dotY][dotX + 1] = [...GOLD];
  pixels[dotY + 1][dotX] = [...GOLD];
  pixels[dotY + 1][dotX + 1] = [...GOLD];

  writeBMP(outPath, W, H, (x, y) => pixels[y][x]);
}

// ── Run ────────────────────────────────────────────────────────────────────
const base = path.join(__dirname, "build", "installer");
console.log("Generating Tavon installer assets...");
generateSidebar(path.join(base, "sidebar.bmp"));
generateHeader( path.join(base, "header.bmp"));
console.log("Done.");
