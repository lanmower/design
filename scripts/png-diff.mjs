#!/usr/bin/env node
// Minimal PNG decode + pixel diff with ZERO image dependencies.
//
// AGENTS.md bans browser-automation packages; the same no-new-dependency spirit
// applies here, so rather than pull in `pngjs`/`pixelmatch` this decodes the
// PNG itself. Node's built-in `node:zlib` does the inflate (the only genuinely
// hard part); everything else is IHDR parsing, the five PNG scanline filters,
// and a per-channel comparison.
//
// Scope: 8-bit non-interlaced truecolour (colour type 2 RGB / 6 RGBA), which is
// exactly what `Page.captureScreenshot` emits and what the committed baselines
// under visual-baselines/ are. Anything else throws loudly rather than
// silently mis-decoding — a diff over garbage bytes is worse than no diff.
import zlib from 'node:zlib';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decode a PNG buffer to `{ width, height, channels, data }` (raw samples). */
export function decodePng(buf) {
    if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG (bad signature)');

    let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
    const idat = [];
    let off = 8;
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const dataStart = off + 8;
        if (type === 'IHDR') {
            width = buf.readUInt32BE(dataStart);
            height = buf.readUInt32BE(dataStart + 4);
            bitDepth = buf[dataStart + 8];
            colorType = buf[dataStart + 9];
            interlace = buf[dataStart + 12];
        } else if (type === 'IDAT') {
            idat.push(buf.subarray(dataStart, dataStart + len));
        } else if (type === 'IEND') {
            break;
        }
        off = dataStart + len + 4; // + CRC
    }

    if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth} (need 8)`);
    if (colorType !== 2 && colorType !== 6) throw new Error(`unsupported PNG colour type ${colorType} (need 2 or 6)`);
    if (interlace !== 0) throw new Error('unsupported interlaced PNG');

    const channels = colorType === 6 ? 4 : 3;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const out = Buffer.alloc(height * stride);

    // Undo the per-scanline filter. Each scanline is prefixed with one filter
    // byte; `a` = left pixel, `b` = above, `c` = upper-left, per the PNG spec.
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos++];
        const rowStart = y * stride;
        const prevStart = rowStart - stride;
        for (let x = 0; x < stride; x++) {
            const cur = raw[pos + x];
            const a = x >= channels ? out[rowStart + x - channels] : 0;
            const b = y > 0 ? out[prevStart + x] : 0;
            const c = (x >= channels && y > 0) ? out[prevStart + x - channels] : 0;
            let val;
            switch (filter) {
                case 0: val = cur; break;
                case 1: val = cur + a; break;
                case 2: val = cur + b; break;
                case 3: val = cur + ((a + b) >> 1); break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    val = cur + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
                    break;
                }
                default: throw new Error(`unknown PNG filter type ${filter} on row ${y}`);
            }
            out[rowStart + x] = val & 0xff;
        }
        pos += stride;
    }
    return { width, height, channels, data: out };
}

/**
 * Compare two decoded PNGs.
 *
 * Two-level tolerance, both needed for a stable gate:
 *  - `channelTolerance`: a pixel only counts as different if some channel
 *    differs by more than this. Sub-pixel font antialiasing shifts a channel by
 *    a few units run to run on identical content; a 0 tolerance flags that as a
 *    regression.
 *  - the caller's ratio threshold: how many such pixels are allowed overall,
 *    since antialiasing noise is spread across every glyph edge on the page.
 */
export function diffImages(a, b, { channelTolerance = 24 } = {}) {
    if (a.width !== b.width || a.height !== b.height) {
        return {
            sizeMismatch: true, diffCount: a.width * a.height, totalPixels: a.width * a.height, diffRatio: 1,
            detail: `${a.width}x${a.height} vs ${b.width}x${b.height}`,
        };
    }
    const total = a.width * a.height;
    let diffCount = 0;
    let maxDelta = 0;
    for (let i = 0; i < total; i++) {
        const ai = i * a.channels;
        const bi = i * b.channels;
        const dr = Math.abs(a.data[ai] - b.data[bi]);
        const dg = Math.abs(a.data[ai + 1] - b.data[bi + 1]);
        const db = Math.abs(a.data[ai + 2] - b.data[bi + 2]);
        const d = Math.max(dr, dg, db);
        if (d > maxDelta) maxDelta = d;
        if (d > channelTolerance) diffCount++;
    }
    return { sizeMismatch: false, diffCount, totalPixels: total, diffRatio: diffCount / total, maxDelta };
}

/** Convenience: decode both buffers and diff. */
export function diffPngBuffers(bufA, bufB, opts) {
    return diffImages(decodePng(bufA), decodePng(bufB), opts);
}
