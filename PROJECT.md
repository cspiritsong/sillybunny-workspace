# SillyBunny Workspace — project contract

## Mission
Deliver a lightweight extension that turns approved dense menus into single-row swipeable rails and lets users tile, move, and resize registered SillyBunny panes.

## Map
- Host reference: `/home/badi/projects/sillybunny-dev/repo`
- Windows stock: `C:\Users\badiy\SillyBunny` on port 4444
- Windows Canary: `C:\Users\badiy\SillyBunny-Canary` on port 4445
- First registered panes: chat (`#sheld`), AI settings (`#left-nav-panel`), Characters/World Info (`#right-nav-panel`).
- First rails: SillyBunny shell tabs, character editor subtabs, panel action rows, World Info action rows, and selected dense preset/action rows.

## Rules
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
Local work and Badi-owned device testing are authorized. No public push, issue, PR, or maintainer contact without Badi's explicit approval.
