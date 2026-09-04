# AGENTS.md — SillyBunny Workspace extension

## Purpose
Standalone **SillyBunny-only** third-party extension providing two opt-in UI primitives:
1. overflow rails for approved dense action/tab rows;
2. a reversible dock/resize workspace for registered major panes.

## Canonical delivery loop

The GitHub repository is the only development source. Every change follows this loop:

1. Change and verify in this repository.
2. Commit and push the exact tested revision to `cspiritsong/sillybunny-workspace`.
3. Install or update that Git revision in Badi's **SillyBunny** test deployment.
4. Test aggressively on Windows Canary, Windows stock, and then a physical phone.
5. Record failures in `PLAN.md`; refine in this repository; repeat from step 1.

Installed extension folders are deployment targets, never editing sources. Never make an uncommitted hot-fix inside an installed copy.

## Source of truth
- `PROJECT.md` — mission, architecture, gates, and current phase.
- `manifest.json` — extension packaging and lifecycle hooks.
- `src/layout.js` — pure persisted layout model.
- `src/rail.js` — approved rail enhancement and cleanup.
- `src/workspace.js` — pane registry, docking, resizing, and exact DOM restoration.
- `index.js` — only SillyTavern context/settings seam.
- `tests/` — unit and browser behavior evidence.
- Kanban: `sillybunny-workspace-plugin:t_67fc497b`.

## Rules
- SillyBunny only: never install, test, or operate this extension in SillyTavern.
- Extension only: never edit the host SillyBunny tree to make this work.
- Git-first: install/update only from a committed revision that exists in the canonical GitHub repository; never develop inside the installed extension folder.
- Preserve host event listeners and state by reparenting live nodes, never cloning them.
- Every moved node gets an exact home marker and original class/style/attributes are restored on close/disable.
- Explicit layout-edit mode. Normal scrolling/clicking must never move a pane.
- Whitelist rails; never mutate every flex container heuristically.
- Native CSS Flex/Grid, Pointer Events, ResizeObserver, and MutationObserver only. No framework, polling loop, canvas renderer, or runtime dependency.
- Persist only after completed drops/resizes. Keep desktop and mobile layouts separate.
- Use SillyBunny theme variables with neutral fallbacks. Desktop and mobile parity; WebKit 16.4+.
- Routine commits and pushes to the canonical `cspiritsong/sillybunny-workspace` repository are authorized as part of the development loop. Ask before creating releases, publishing announcements, contacting maintainers, or opening upstream issues/PRs.

## Verification
- `npm test`: pure layout and docking tests.
- Browser harness: lifecycle, rail overflow/arrows, preset arrangement, resize, move, close/disable restoration, and idle activity.
- `node --check` for every JS file; host-style ESLint with zero errors.
- Real devices: Windows stock 4444, Windows Canary 4445, then physical phone.

## Status vocabulary
Prepared = artifact exists. Observed = it ran. Verified = named acceptance gate passed.
