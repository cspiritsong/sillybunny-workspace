# PLAN.md — SillyBunny Workspace

## Current status

**Prepared for canonical Git publication.** Local implementation commit `d968ac7` was verified before this Git-first workflow decision. Documentation and scope corrections are currently uncommitted until the next verification gate.

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

### Stage 1 — Canonical repository

- [ ] Re-run tests and lint after documentation/scope edits.
- [ ] Rename local default branch to `main`.
- [ ] Create `cspiritsong/sillybunny-workspace` as the canonical GitHub repository.
- [ ] Push `main` through the cspiritsong credential lane.
- [ ] Read back repository visibility, default branch, tip SHA, and raw `manifest.json`.

### Stage 2 — Windows Canary (port 4445)

- [ ] Locate the live SillyBunny Canary user extension directory; do not assume its path.
- [ ] Install by cloning the canonical GitHub repository.
- [ ] Start/verify Canary and confirm the extension loads without console errors.
- [ ] Exercise overflow rails, all three layout presets, drag/dock, splitter resize, maximize, hide/reopen, reset, close restoration, disable restoration, and restart persistence.
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
