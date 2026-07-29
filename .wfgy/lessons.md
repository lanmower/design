## 2026-07-28 -- plugkit PRD ledger unbound from project; work itself unaffected

Goal (G): fix outstanding issues and land every reachable professional-craft GUI
improvement on main, with real witnesses.

What drifted / what went wrong: after the shared agentplug daemon restarted
(pid 26852 -> 19728) mid-session, `prd-add` and `prd-resolve` began failing with
"C:/dev/design/.gm/prd.yml does not exist" / "write failed", although the file was
present, valid, 396KB, 2441 lines, 113 pending rows, and readable via fs.statSync
on every path form. `instruction` confirmed the real cause: the watcher reports
`prd_total_count: 0` and reset `phase` from EXECUTE to PLAN with `last_skill: null`
-- it lost its binding to this project's state entirely. Re-running
`bun x gm-plugkit@latest spool` re-registered the project but did not restore the
binding. `.gm/gm.db` (SQLite, appeared same session) does NOT contain the rows either,
so this is not a YAML->SQLite migration.

I burned four dispatches retrying the same denied write before noticing the retry
loop, and a fifth confirming the DB theory.

Fix / resolution: stopped retrying at the BBCR bound. Critically, the PRD file is
BOOKKEEPING -- the engineering work is committed code, unaffected by the ledger's
availability. Verified 1a31eed and 8718339 are intact on main with all gates green,
then continued executing and committing real work, recording witnesses in commit
messages (which are durable) instead of in the unavailable ledger.

Generalizes to: when a gm chain's PRD ledger becomes unwritable, distinguish the
ledger from the work. A tooling outage on the bookkeeping surface is not a reason
to stop delivering; commit messages and git history are the durable witness of
record. Check `instruction`'s prd_total_count against the on-disk row count early --
a 0 against a non-empty file identifies an unbound watcher immediately, in one
dispatch instead of five.

## 2026-07-29 -- a pushed commit is not a shipped change
Goal (G): make every recently-updated AnEntrypoint project actually current
online, with nothing pointing at old design or content.
What drifted / what went wrong: the previous turn treated "committed to main and
CI-observable" as done. It was not. The layout fix sat on main for an hour
without ever reaching users, because tokens.json is a SECOND source of truth for
the same custom properties and lint-tokens-json failed the Build step -- which
failed both ci and the npm publish. Every @latest consumer kept serving the old
fixed cap. Two compounding traps: that gate lives in build.mjs, not lint.mjs, so
`npm run lint` reported a clean 16/16 while the build was broken; and thebird
vendors the kit rather than loading @latest, so even a successful publish could
not reach it. Fixing thebird then exposed two more layers -- a barrel copied
without its companion directory (ERR_MODULE_NOT_FOUND, deploy failed) and an
@import barrel copied without its 21 split sheets (all 404, invisibly, with no
console error and no missing-stylesheet signal).
Fix / resolution: verify at the artifact consumers actually fetch. curl the
published bundle and read the token value back; read the live page's network
trace for 404s rather than trusting a 200 on the barrel; run the real build, not
just lint, before pushing a change to a token that has a second source of truth.
Generalizes to: "pushed" is three steps short of "shipped" -- built, published,
and fetched-by-the-consumer are each separately falsifiable, and each one failed
silently here. When a value is duplicated across a CSS file and a JSON manifest,
changing one is a half-change; find the sync gate before pushing. And when a
consumer vendors instead of resolving @latest, publishing is necessary but never
sufficient.
