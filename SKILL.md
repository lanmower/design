# SKILL — authoring rules for AI agents working in this repo

Referenced from `README.md`, the homepage's "Skill" link, and
`CONTRIBUTING.md` (which points agents here instead of at the human setup
guide) but didn't exist until now — every one of those links 404'd. This is
a first real version, synthesized from the voice/content conventions this
repo's own kits, previews, and copy already follow (not invented from
scratch); expand it as real inconsistencies get caught, the same way
`colors_and_type.css`'s own contrast comments accumulate.

## Voice

- **Confident and technical, never jokey in shipped UI copy.** The system's
  own README used to open with "we fart in its general direction" as its
  second line — removed (see `PRD-remediation-2026-08-20.md` #62) precisely
  because it undercut everything else. Kit captions, empty states, and error
  copy read like `preview/dropzone.html`'s: "dropzone is a tonal panel that
  swaps to `--panel-select` on dragover. **preventDefault must run on
  document, not just the zone** or the browser will navigate to the dropped
  file." — a real technical fact, stated plainly, bold only for the load-
  bearing constraint.
- **State the real number, not a vibe.** "5.84:1 against --paper", "24 kits",
  "36 tokens retuned" — not "great contrast" or "a handful of tokens". If you
  don't have the real number, don't write a specific-sounding claim; say what
  you actually verified.
- **Dateline labels are the one deliberate all-caps convention.** e.g.
  `247420 · FILE-BROWSER · DROPZONE` / `TONAL TARGET · NO DASHED BORDERS` in
  `.dateline` strips — short, mono, uppercase, `·`-separated. Everything else
  (headings, body copy, button labels) is sentence case.
- **No mascot-cutesy language in product copy.** `--mascot` and the "colors
  lore"/"stamps lore" preview pages are real, working parts of the token
  system and the design-history archive respectively — reference them
  plainly by name; don't write around them performatively.

## Content patterns

- **Capitalisation**: sentence case for headings and body text; Title Case
  only for proper nouns and component names (`Btn`, `WorkspaceShell`);
  UPPERCASE only inside a `.dateline`/mono label per above.
- **Numbers in claims must be traceable to a generator or a hand-verified
  measurement**, not hand-guessed. `home.yaml`'s kit/component counts, the
  a11y report's violation count, and every contrast ratio in
  `colors_and_type.css` follow this; a stale number left behind after a
  change is a bug (see PRD #55 for the drift this produced before).
- **Primitive selection, layout composition, form/error/empty-state
  patterns**: see `docs/usage-guidelines.md`.
- **Stamp vs badge vs rail**: see `THEME.md`'s "Stamp vs badge vs rail"
  section — do not re-derive this; it is already documented there.

## What this file is not

Not a legal/brand style guide, not a replacement for `CONTRIBUTING.md`'s
setup steps, and not a place for identity/restyle history — that belongs in
`TOKENS-CHANGELOG.md`'s "Design history" section.
