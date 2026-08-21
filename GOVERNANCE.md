# Governance

This file didn't exist before; it's a first real pass at the questions an
organisation evaluating this system for adoption actually asks (contribution
model, review process, deprecation policy, support window), not a roadmap or
a marketing page. Expand it as real process questions come up — don't let it
drift into aspiration the way `colors_and_type.css`'s prior identity-history
comments did (see `TOKENS-CHANGELOG.md`).

## Contribution model

Human contributors: see `CONTRIBUTING.md` for the local setup, the lint
gates, and the pre-PR checklist. AI agents working in this repo: see
`SKILL.md` for the voice/authoring contract on top of the same technical
rules.

There is currently no CODEOWNERS file, PR template, or issue template in
`.github/` — a real gap, not a deliberate choice; tracked as backlog.

## Design review / RFC process for new tokens and components

Today: informal. A new token needs a hand-verified contrast measurement and
an entry in `TOKENS-CHANGELOG.md` (format specified there); a new component
needs to pass the existing lint gates (`npm run lint`) plus the a11y and
visual-regression checks (`npm run a11y`, `npm run visual`). There is no
separate written RFC step before a token or component lands — for a design
system this size, that is a real process gap once more than one person is
proposing changes concurrently, since nothing currently forces a second set
of eyes before a token or component ships. Until a real RFC process exists,
treat any non-trivial new token or component as needing an explicit review
comment on its PR from someone who didn't write it, even though nothing
technical currently enforces that.

## Deprecation policy

The closest thing to a stated policy today is `MIGRATION_GUIDE.md`'s phase
table for prop-level deprecations (e.g. `Btn`'s `primary`/`ghost`/`danger`
booleans): a "still works, warns in dev" phase, then a stated future release
where the old form is removed. That pattern is real and should extend to
token renames too (a renamed CSS custom property currently just breaks any
consumer still using the old name — there is no aliasing/warning period for
token renames the way there is for component props). Tracked as backlog.

## Versioning and support window

See `TOKENS-CHANGELOG.md` and `MIGRATION_GUIDE.md` for what's tracked today.
Real semver with a stated deprecation window (not auto-patch-bump on every
push to `main`) is tracked as backlog in
`PRD-remediation-2026-08-20.md` (#65) — this needs a maintainer decision on
the release process itself, not something a single pass through the
codebase can safely change on its own, since it changes what every existing
consumer's version pin means.

## Roadmap

Not published here. The closest thing that exists is the BACKLOG section of
`PRD-remediation-2026-08-20.md`, which is a snapshot from one remediation
pass, not a maintained roadmap. A real roadmap is a maintainer-owned
artifact this file should link to once one exists, not something to
fabricate.
