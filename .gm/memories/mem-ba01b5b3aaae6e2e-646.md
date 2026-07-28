---
key: mem-ba01b5b3aaae6e2e-646
ns: default
created: 1785245721674
updated: 1785245721674
---

A ratchet baseline with slack silently absorbs the next regression. Witnessed in AnEntrypoint/design: with the real font-size count at 55 and the baseline frozen at 56, an injected raw font-size:17px still PASSED. Re-freezing to 55 made it FAIL correctly. So every ratchet gate must be re-frozen DOWNWARD whenever the count drops, and every gate must be proven to FAIL by injecting a violation -- a gate only ever seen green is unverified. Corollary: verify the injection through the same entry point CI uses; a gate wired into lint-css.mjs CHECKS but not into lint-tokens.mjs's own CLI passed a test dispatched at the CLI while genuinely broken.
