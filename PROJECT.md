# SillyBunny Workspace — project contract

## Mission
Deliver a lightweight extension that turns approved dense menus into single-row swipeable rails and lets users tile, move, and resize registered SillyBunny panes.

## Map
- Canonical repository: `https://github.com/cspiritsong/sillybunny-workspace`.
- Local source checkout: `/home/badi/projects/sillybunny-workspace`.
- Host reference (read-only): `/home/badi/projects/sillybunny-dev/repo`.
- Windows stock: `C:\Users\badiy\SillyBunny` on port 4444.
- Windows Canary: `C:\Users\badiy\SillyBunny-Canary` on port 4445.
- SillyTavern is explicitly out of scope: never install or test this extension there.
- First registered panes: chat (`#sheld`), AI settings (`#left-nav-panel`), Characters/World Info (`#right-nav-panel`).
- First rails: SillyBunny shell tabs, character editor subtabs, panel action rows, World Info action rows, and selected dense preset/action rows.

## Rules
- SillyBunny-only plugin. Never install or test it in SillyTavern.
- The GitHub repository is canonical. Every installed copy must come from a committed and pushed revision; installed folders are not edited directly.
- Cross-platform packaging: the public repository must not track symlinks or lowercase aliases whose names differ from contract files only by case; those collide on Windows.
- Opt-in workspace; opening it is reversible and disabling restores the original DOM.
- No heavy framework or continuous polling.
- Default layouts: side-by-side three columns; vertical stack; A+B over spanning C.
- Desktop permits pointer docking and splitter resizing. Mobile favors stacking, reorder, maximize, and large touch targets.
- Layout state is device-class-specific.
- Unknown third-party panels require an explicit adapter.

## Finish line
1. Unit and browser harness green.
2. No active interval/polling loop and no continuous idle animation.
3. Extension loads on Windows stock and Canary.
4. Rail, three layouts, move, resize, reset, and exact close/disable restoration are exercised on both.
5. Physical phone verifies swipe, touch arrangement, stacking, maximize, and recovery.

## Approval boundary

Routine commits and pushes to the canonical `cspiritsong/sillybunny-workspace` repository, plus installation/testing on Badi-owned SillyBunny instances, are authorized by Badi. Ask before releases, public announcements, maintainer contact, or upstream issues/PRs.
