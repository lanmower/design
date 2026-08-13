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

## 2026-07-30 -- a rejected config file reported itself as null, not as rejected
Goal (G): execute 22 pending PRD rows (component backfill); the FSM transition was
only the vehicle.
What drifted / what went wrong: gm phase was pinned at PLAN, a state absent from the
active FSM graph, so every `transition {to:"SPECIFY"}` was denied. I wrote the
sanctioned LocalOverride at .gm/instructions/fsm/graph.json adding a PLAN state and a
PLAN->SPECIFY edge. Denial unchanged and the response's `fsm_graph_rejected` field read
null, which I misread as "the file was never read." I then spent an attempt on a wrong
hypothesis (that the runner resolves tiers once at load) and killed/rebooted the runner
to test it -- denial identical, hypothesis disproven, four denials burned and the
stuck-loop escalation firing. The real signal was never in the response body: it was in
.gm/fsm-graph-rejected.json, whose mtime was AFTER my write, reading `state PLAN is
unreachable -- no edge leads to it` and `the built-in default graph is serving; every
customisation in this file is being IGNORED`. My override HAD been read and HAD been
validated; it failed a reachability check because I gave PLAN an outgoing edge but no
incoming one, so the validator discarded the whole file and silently fell back to the
default. An inherited PRD row had also mis-diagnosed this as blockedBy:external
("user-wide config outside this repo"), which was wrong twice over -- the graph is a
file inside this repo, and the fix needed no operator.
Fix / resolution: added a SPECIFY->PLAN incoming edge, then PROVED reachability of all
states from initial_phase with a graph walk before dispatching (zero unreachable),
deleted the stale rejection marker so its reappearance would be a clean signal,
restarted the runner, confirmed the marker stayed ABSENT, and transitioned ok:true to
SPECIFY.
Generalizes to: a null field in a tool response is not evidence a config was ignored --
look for a sibling rejection/diagnostic FILE and compare its mtime to your write before
theorizing about caching or process lifetime. When hand-editing a state graph, run the
validator's own invariant (every state reachable from the initial state) locally before
dispatching, because these validators discard the ENTIRE file on one violation and fall
back silently rather than partially applying it. And treat an inherited blockedBy:external
row as a hypothesis to re-test, not a fact: verify where the file actually lives first.

## 2026-07-30 -- a locally-green pixel baseline can be strictly worse than a stale one
Goal (G): close a PRD row asking for visual baselines to be re-captured after the
token restyle.
What drifted / what went wrong: I followed the row's literal instruction (run
`visual-baseline.mjs update`, commit, push) and verified it the obvious way -- a
local re-check passed 87/87, so the set was self-consistent. It was still a
regression: CI reported ALL 87 pages drifted, versus the ~15 genuinely-stale ones
before. The baselines are platform-specific and I captured on Windows through a
software rasterizer (Page.captureScreenshot times out under --disable-gpu, so
--use-gl=swiftshader is required), while the check runs on ubuntu-latest;
antialiasing and font rasterization differ, so every page mismatches regardless
of palette. The answer was already written in the repo: ci.yml marks the step
continue-on-error with the comment "Committing Linux-captured baselines from a
container is the real fix" -- I read the workflow only after CI contradicted me.
Fix / resolution: reverted the capture, verified the restoration was byte-exact
(`git diff f548203^ HEAD -- visual-baselines` empty, count back to the original
81 -- my run had also silently ADDED 6 PNGs for pages that never had a baseline),
confirmed 81 on origin, and closed the row as an honest negative result rather
than claiming the refresh was done. Filed the real work (Linux-captured baselines
via a container or a CI job that commits its artifacts) as its own row.
Generalizes to: for any artifact compared byte-for-byte in CI (screenshots,
snapshots, lockfiles, generated binaries), "it passes locally" proves only
self-consistency, never agreement with the checking platform -- so read the CI
step's own config and comments BEFORE regenerating it, because a report-only gate
usually carries the reason it is report-only. And a gate expected to fail is a
gate that cannot detect anything: ambient failure hides real regressions, which
is itself a finding worth filing rather than stepping around.

## 2026-08-06 -- gm transition dispatch appeared orphaned but was actually still running server-side
Goal (G): drive gm's phase chain from EMIT to COMPLETE for 51 already-resolved PRD rows (tokens/theming, a11y, responsive, consistency, docs/DX, content-polish) without losing or fabricating work.
What drifted / what went wrong: transition{to:STATE} was dispatched 5 times in a row and each returned dispatch_orphaned ("claimed by a daemon that died before answering") within the normal 15-30s poll window. This looked like a genuine stuck-loop (matching gm's own stuck-loop-escalation pattern) caused by the shared agentplug daemon's self-update reboot cycle (gm.wasm auto-updating every tick, unconditional recompile, version-marker mismatch triggering re-staging).
Fix / resolution: applied wfgy-method's BBCR bounded-retry-then-surface discipline instead of retrying blind forever. Checked daemon.log directly and found dispatch.end entries for transition with ms=481335, ms=480488, ms=240179 -- the dispatches were NOT actually dying, they were taking 4-8 minutes under daemon load while the client-side poll gave up after ~30-60s and a LATER daemon boot generation swept the original claim as "orphaned" and wrote a stale error to the out-file, even though the real dispatch was still running and eventually wrote its own (different, later) result. One more retry (transition-6500) returned "no edge from STATE to STATE", proving an earlier retry had already silently succeeded server-side.
Generalizes to: under this shared daemon's current reboot-loop behavior, a `transition` dispatch that returns dispatch_orphaned should NOT be treated as proof of failure -- check `.watcher.log`/`~/.agentplug/daemon.log` for a `dispatch.end verb=transition` entry near the expected timestamp before concluding the dispatch truly died and needs a clean re-run. A stale orphan error can be written by a LATER daemon generation for a dispatch that is still in flight or already succeeded. When in doubt, re-dispatch `instruction` (cheap, fast) to read the actual current phase directly rather than trusting the orphan error at face value.
