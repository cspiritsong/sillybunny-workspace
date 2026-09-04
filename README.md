# SillyBunny Workspace

A lightweight, opt-in UI extension for [SillyBunny](https://github.com/SillyBunnyTeam/SillyBunny) (and compatible with SillyTavern) that does two things:

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

Third-party extension, install from this folder or a git URL in SillyBunny's Extensions panel.

## Test

```
npm test           # pure layout + syntax checks
npm run test:browser  # headless harness (Playwright on the host)
```

## Status

Local engine + harness verified. Pending: Windows stock (4444) + Canary (4445), then a physical phone.
