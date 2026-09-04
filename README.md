# SillyBunny Workspace

A lightweight, opt-in UI extension for [SillyBunny](https://github.com/SillyBunnyTeam/SillyBunny) that does two things:

1. **Overflow rails** — turns whitelisted dense action/tab rows into a single scrollable row with conditional `‹` / `›` arrows, no wrapping, no clipped controls.
2. **Dockable workspace** — lets you tile, move, resize, maximize, hide, and reorder the major panels (Chat, AI Settings, Characters/World Info) and switch between layout presets.

Everything is reversible: closing the workspace (or disabling the extension) restores the original DOM exactly.

## How it's built

- Plain JavaScript/CSS using host primitives only — no framework, no polling, no runtime dependency.
- `src/layout.js` — pure layout tree (split containers holding panes), unit-tested.
- `src/rail.js` — whitelisted overflow-rail controller.
- `src/workspace.js` — pane registry, docking, resizing, and exact restoration.
- `index.js` — the only SillyTavern-aware file (settings, pane registry, lifecycle hooks).

## Install

Install in **SillyBunny only** from the canonical Git repository:

`https://github.com/cspiritsong/sillybunny-workspace`

Do not install or test this extension in SillyTavern. Installed copies are deployment targets; make every change in this repository, commit and push it, then update the SillyBunny installation.

## Test

```
npm test           # pure layout + syntax checks
npm run test:browser  # headless harness (Playwright on the host)
```

## Status

Canonical public repository live at `https://github.com/cspiritsong/sillybunny-workspace`, version `0.1.3`. Windows SillyBunny Canary and stock are verified: each passed 7/7 live-load checks, 13/13 interaction checks, and full-width visual review. Next: physical-phone touch and mobile-layout verification.
