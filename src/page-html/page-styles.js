// The inline <style> block the SSR document ships ahead of the unpkg CSS
// bundle: page-stage rhythm, body-prose spacing, hero stat strip, and the
// feature-row stack. Kept inline (not in a .css file) because it must apply
// before the bundle loads — several rules carry !important purely to beat the
// bundle on load-order at equal specificity.

export const PAGE_INLINE_STYLES = `
.app-stage { width: 100%; max-width: var(--stage-wide, min(96%, 1600px)); margin-inline: auto; padding: var(--space-6, 48px) var(--space-4, 24px) var(--space-8, 96px); display: grid; gap: var(--space-6, 48px); box-sizing: border-box }
@media (max-width: 768px) { .app-stage { padding: var(--space-4, 24px) var(--space-3, 16px) var(--space-6, 48px); gap: var(--space-5, 32px) } }
/* Tier movements — the stage's uniform gap is deliberately overridden here.
   Panels inside one tier sit tight (--space-3, 16px) because they are peers;
   between tiers that reopens to --space-5 on top of the stage's own --space-6,
   so the three movements read as distinct instead of one repeating slab. */
.app-stage > .ds-tier { display: grid; gap: var(--space-3, 16px) }
.app-stage > .ds-tier + .ds-tier { margin-top: var(--space-5, 32px) }
.ds-tier-head { display: grid; gap: var(--space-2, 8px); margin-bottom: var(--space-1, 4px); justify-items: start }
/* The tier label is an h2 so the three movements are real landmarks in the
   accessibility tree; it keeps the .eyebrow voice, so the UA heading margin
   and size are reset back onto the mono kicker scale. */
.ds-tier-head > h2.eyebrow { margin: 0; font-size: var(--fs-tiny, 11px); line-height: 1.2 }
.ds-tier-lede { margin: 0; max-width: var(--measure, 68ch); color: var(--fg-3); font-size: var(--fs-sm, 15px) }
/* The lead tier carries the accent spine so the primary path is visible at a
   squint; supporting tiers stay unmarked rather than competing. The head div
   is the tier's first child, so the marker is an explicit class rather than a
   positional :first-of-type, which would not match past it. */
.ds-tier-lead { border-radius: 0 var(--r-2, 14px) var(--r-2, 14px) 0; padding-left: calc(var(--space-3, 16px) + var(--bw-chunk, 6px)); position: relative }
.ds-tier-lead::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: var(--bw-chunk, 6px); background: var(--accent); border-radius: var(--bw-chunk, 6px) 0 0 var(--bw-chunk, 6px) }
/* Tertiary tier reads at prose weight: quieter rows, no panel fill competition. */
.ds-tier-read .panel { background: var(--panel-1, var(--bg)) }
.ds-tier-read .row .meta { color: var(--fg-3) }
.page-body > :first-child { margin-top: 0 }
.page-body h1 { margin-top: 0 } .page-body h2 { margin-top: var(--space-5, 32px) } .page-body h3 { margin-top: var(--space-4, 24px) }
.page-body > * + * { margin-top: var(--space-3, 16px) }
.page-body pre { margin: var(--space-3, 16px) 0; background: var(--panel-2); padding: var(--space-3, 16px); border-radius: var(--r-1, 10px); overflow-x: auto }
/* .app-stage owns inter-block rhythm via grid gap; sections/hero must not double it.
   These selectors carry !important because this inline block loads before the
   unpkg CSS bundle, which would otherwise win on load-order for equal specificity. */
.ds-247420 .app-stage > .ds-hero { margin: 0 !important; padding: var(--space-4, 24px) 0 0 !important; max-width: none !important; gap: var(--space-4, 24px) !important }
.ds-247420 .app-stage > .ds-section { margin: 0 !important }
.app-stage .row + .row { margin-top: var(--space-1, 4px) }
.app-stage .ds-section .row { margin-top: var(--space-2, 8px) }
.app-stage .ds-section > p.ds-lede { margin: 0 0 var(--space-3, 16px); max-width: var(--measure, 68ch); color: var(--fg-2) }
.row-benefit { font-style: italic; color: var(--fg-3); font-size: var(--fs-sm); margin-top: var(--space-1, 4px) }
.ds-row-arrow { margin-left: auto; opacity: .5; transition: opacity var(--dur-snap, 80ms) var(--ease) }
a.row:hover .ds-row-arrow { opacity: 1 }
/* hero stat strip — all badges as a wrapping inline rhythm, not one empty panel */
.ds-hero-stats { display: flex; flex-wrap: wrap; gap: var(--space-3, 16px) var(--space-5, 32px); margin-top: var(--space-2, 8px) }
.ds-hero-stat { display: flex; align-items: baseline; gap: var(--space-2, 8px) }
.ds-hero-stat-n { font-family: var(--ff-body); font-weight: 700; font-size: var(--fs-lg, 18px); color: var(--fg) }
.ds-hero-stat-l { font-size: var(--fs-sm, 15px); color: var(--fg-3) }
/* accent sits on its own line, muted, so it reads as a distinct aside instead
   of running on from the hero body sentence. */
.ds-hero-accent { display: block; margin-top: var(--space-2, 8px); color: var(--fg-3) }
/* feature rows — single-column stack (the dashboard .row grid forces a 3-col
   code/title/meta layout that mangles title+desc+benefit) */
/* background uses a theme-neutral panel token (resolves per data-theme) so dark
   mode doesn't flash a literal white card before/independent of the bundle.
   Flat tonal fill only — no border-left rail accent (house style: no bespoke
   tile chrome, no shadows, no borders; see ui_kits/gallery/app.js). */
.ds-feature { padding: var(--space-3, 16px) var(--space-4, 24px); background: var(--panel-1, var(--bg)); border-radius: var(--r-2, 14px); display: grid; gap: var(--space-1, 4px) }
.ds-feature + .ds-feature { margin-top: var(--space-2, 8px) }
.ds-feature-title { font-weight: 600; font-size: var(--fs-lg, 18px); color: var(--fg) }
.ds-feature-desc { font-size: var(--fs-sm, 15px); color: var(--fg-2); line-height: 1.5; overflow-wrap: anywhere }
.ds-feature-benefit { font-style: italic; font-size: var(--fs-sm, 15px); color: var(--fg-3); margin-top: var(--space-1, 4px) }
`.trim();
