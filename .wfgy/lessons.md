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
