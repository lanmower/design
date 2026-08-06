# AICat UI Kit

AI assistant chat with a cat persona. ASCII portrait that swaps with mood, thinking-dot bubble, deterministic canned replies you can swap for any model.

Components used: `AICat`, `AICatPortrait`, `ChatComposer`, plus the shell primitives (`AppShell`, `Topbar`, `Crumb`, `Side`, `Status`, `Panel`, `Heading`, `Lede`, `Chip`).

Wire `reply(text)` in `app.js` to your model of choice — the surface is unchanged.

## Why a mascot here, and not elsewhere

The rest of the system (dashboard, terminal, file browser, settings) is a
deliberately clinical ops-console aesthetic — mono labels, tonal panels, no
illustration, no personality in the chrome. AICat is the one kit that breaks
that with an animated ASCII cat portrait and a playful mood face.

That is intentional, not drift: AICat is a **persona-fronted assistant
surface**, a product category where a visible, low-fidelity character is a
known, useful affordance — it signals "you are talking to an assistant with a
personality," softens the wait during thinking states, and gives mood/state
feedback (thinking, idle, replying) a legible, glanceable form that a plain
status dot would not.

The rule for when to reach for mascot/personality UI versus the neutral
system: only when the surface's whole purpose is to represent a conversational
agent with a character (a chat assistant, an onboarding guide with a persona,
similar). Anything that is primarily a data or control surface — dashboards,
settings, file management, terminals — stays on the neutral system regardless
of how "friendly" the product wants to feel; personality lives in copy there,
never in mascot chrome. AICat's own chrome (`AppShell`, `Topbar`, `Panel`,
etc.) still uses the same tokens and shell primitives as every other kit —
only the portrait/mood layer is bespoke, so the mascot tone is additive, not
a fork of the design system.
