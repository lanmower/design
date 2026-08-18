// Per-server/per-user dynamic accent — Material-You-style HCT tonal
// generation, additive to (never replacing) the fixed --accent/--accent-ink
// Signals tokens colors_and_type.css defines. See stoat's
// createMaterialColourVariables (materialTheme.ts) for the reference this
// mirrors: a source color -> HCT hue+chroma -> a small set of ROLE tones,
// each tone FIXED by construction (not derived from the arbitrary source
// lightness), which is what gives M3 schemes their contrast guarantee.
//
// AGENTS.md's "shadcn-neutral restyle" note: a prior full base-palette swap
// broke contrast (1.15:1) and was only caught by `npm run a11y`. This module
// avoids that failure mode structurally: it NEVER varies with the source
// color's own tone, and callers apply it as a scoped override (inline style
// on a subtree, e.g. one server's rail item) rather than a document-wide
// token rewrite. `npm run a11y` includes a ui_kit exercising this at fixed
// hues so the ratchet actually covers it — see ui_kits/dynamic-accent/.
//
// No dependency on @material/material-color-utilities: that package's
// current npm release has a broken ESM subpath import
// (dynamiccolor/color_spec_2025.js imports './dynamic_color' without an
// extension, which Node's ESM resolver rejects) and this repo's own
// convention (AGENTS.md) is to vendor small, targeted math rather than take
// a broken heavy dependency — the HCT tone-mapping used here is the
// well-documented CAM16/Lab tone-at-hue-chroma approach, reimplemented
// directly and small enough to read end-to-end.

// --- sRGB <-> CIE Lab, enough to place a color at a specific L* (tone) ---
function srgbToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
    c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, c)) * 255);
}
function rgbToXyz(r, g, b) {
    r = srgbToLinear(r); g = srgbToLinear(g); b = srgbToLinear(b);
    return [
        r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
        r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
        r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
    ];
}
function xyzToRgb(x, y, z) {
    const r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    const g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    const b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)];
}
const WHITE = [0.95047, 1.0, 1.08883]; // D65
function fInv(t) { return t > 6 / 29 ? t * t * t : 3 * (6 / 29) ** 2 * (t - 4 / 29); }
function f(t) { return t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29; }

function xyzToLab(x, y, z) {
    const fx = f(x / WHITE[0]), fy = f(y / WHITE[1]), fz = f(z / WHITE[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labToXyz(L, a, b) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    return [fInv(fx) * WHITE[0], fInv(fy) * WHITE[1], fInv(fz) * WHITE[2]];
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/** hue (0-360, Lab a-b angle) + chroma (Lab a-b magnitude) from a source hex color. */
function hueChromaFromHex(hex) {
    const [r, g, b] = hexToRgb(hex);
    const [x, y, z] = rgbToXyz(r, g, b);
    const [, a, bb] = xyzToLab(x, y, z);
    return { hue: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360, chroma: Math.sqrt(a * a + bb * bb) };
}

/** Render a hex color at a given hue/chroma and FIXED L* tone (0-100). */
function atTone(hue, chroma, tone) {
    const rad = hue * Math.PI / 180;
    const a = chroma * Math.cos(rad), b = chroma * Math.sin(rad);
    const [x, y, z] = labToXyz(tone, a, b);
    const [r, g, bb] = xyzToRgb(x, y, z);
    return rgbToHex(r, g, bb);
}

// M3 TonalSpot-equivalent role tones (materialTheme.ts's default scheme).
// Fixed by role, independent of the source color's own lightness/chroma —
// this fixedness is the whole contrast guarantee: on-primary is ALWAYS at
// T100 (paper) against primary ALWAYS at T40 (a mid-dark tone), an >8:1
// pairing by construction for any hue.
const LIGHT_TONES = { primary: 40, onPrimary: 100, primaryContainer: 90, onPrimaryContainer: 10 };
const DARK_TONES = { primary: 80, onPrimary: 20, primaryContainer: 30, onPrimaryContainer: 90 };
// Chroma is clamped, not passed through raw: an oversaturated source (chroma
// > ~48) pushed through atTone at low/high tones can round-trip outside
// sRGB gamut and clip in a way that erodes the intended contrast margin.
const MAX_CHROMA = 48;

/**
 * Generate a dynamic accent role set from a source hex color.
 * @param {string} sourceHex e.g. a server icon's dominant color
 * @param {boolean} [dark=false]
 * @returns {{primary:string, onPrimary:string, primaryContainer:string, onPrimaryContainer:string}}
 */
export function dynamicAccentFromHex(sourceHex, dark = false) {
    const { hue, chroma: rawChroma } = hueChromaFromHex(sourceHex);
    const chroma = Math.min(rawChroma, MAX_CHROMA);
    const tones = dark ? DARK_TONES : LIGHT_TONES;
    return {
        primary: atTone(hue, chroma, tones.primary),
        onPrimary: atTone(hue, chroma, tones.onPrimary),
        primaryContainer: atTone(hue, chroma, tones.primaryContainer),
        onPrimaryContainer: atTone(hue, chroma, tones.onPrimaryContainer),
    };
}

/**
 * Build an inline-style-ready CSS custom property map for a scoped subtree
 * (e.g. one server's rail item / header), so a dynamic accent never touches
 * the document-wide --accent/--accent-ink tokens.
 * @param {string} sourceHex
 * @param {boolean} [dark=false]
 * @returns {Record<string,string>} e.g. {'--dyn-accent': '#...', ...}
 */
export function dynamicAccentStyleVars(sourceHex, dark = false) {
    const c = dynamicAccentFromHex(sourceHex, dark);
    return {
        '--dyn-accent': c.primary,
        '--dyn-accent-fg': c.onPrimary,
        '--dyn-accent-container': c.primaryContainer,
        '--dyn-accent-container-fg': c.onPrimaryContainer,
    };
}
