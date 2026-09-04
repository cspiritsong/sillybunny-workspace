# PLAN.md — SillyBunny Workspace

## Current status

**Verified — canonical repository is live.** Public repository `https://github.com/cspiritsong/sillybunny-workspace` was read back with default branch `main`, cspiritsong commit authorship, and live `manifest.json` version `0.1.0`. Next gate: install this exact Git source into SillyBunny Canary on Windows.

## Delivery loop

```text
repo change → local tests/lint → commit → push/read-back → install/update in SillyBunny Canary
→ Canary test → install/update in SillyBunny stock → stock test → phone test
→ failures return to repo as the next refinement
```

Installed copies are never edited directly. SillyTavern is never used as an install or test target.

## Completed evidence

- [x] Standalone extension scaffolded at `/home/badi/projects/sillybunny-workspace`.
- [x] Git repository initialized with `cspiritsong` commit identity.
- [x] 14/14 unit and syntax tests passed.
- [x] 7/7 headless browser harness checks passed.
- [x] Host-style ESLint passed with 0 errors and 0 warnings.
- [x] Git-first and SillyBunny-only operating contract recorded.

## Active stage

### Stage 1 — Canonical repository — VERIFIED

- [x] Re-run tests and lint after documentation/scope edits.
- [x] Rename local default branch to `main`.
- [x] Create public `cspiritsong/sillybunny-workspace` as the canonical GitHub repository.
- [x] Push `main` through the verified cspiritsong credential lane.
- [x] Read back repository visibility, default branch, tip SHA, cspiritsong authorship, and raw `manifest.json` v0.1.0.

### Stage 2 — Windows Canary (port 4445)

- [x] Locate the live SillyBunny Canary user extension directory; do not assume its path.
- [x] First Windows clone exposed case-colliding lowercase documentation symlinks; no plugin load attempted.
- [x] Publish v0.1.1 packaging fix; remote tree verified to contain only canonical uppercase contract files.
- [x] Replace the failed fresh Canary clone with v0.1.1 and verify a clean checkout.
- [x] Start Canary headlessly (Task Scheduler, survives SSH), confirm extension registers: discover endpoint lists `third-party/sillybunny-workspace`; activate hook completes.
- [x] Fix activate-vs-enable mount bug as v0.1.2; pull on Canary; 7/7 live-load checks green (boot, settings key/block, global API, stylesheet, rails mounted, zero workspace errors).
- [x] Install/update from the same verified Git revision — exact tip ee5a400f6a720264c339028ab5cd4022551e95f1.
- [ ] Exercise the interactive acceptance matrix: open Workspace, all three layout presets, drag/dock, splitter resize, maximize, hide/reopen, reset, close restoration, disable restoration, and restart persistence.
- [ ] Record failures with exact steps and browser console evidence.

### Stage 3 — Windows stock (port 4444)

- [ ] Install/update from the same verified Git revision.
- [ ] Repeat the Canary acceptance matrix without editing the installed copy.

### Stage 4 — Physical phone

- [ ] Select a phone that can reach the SillyBunny instance.
- [ ] Verify horizontal rail swipe, conditional arrows, vertical-stack default, touch arrangement, maximize, reset, orientation changes, and restart persistence.

## Approval gates

- Routine pushes to `cspiritsong/sillybunny-workspace` and Badi-owned SillyBunny testing are authorized.
- Ask before a GitHub Release, public announcement, maintainer contact, or upstream issue/PR.
