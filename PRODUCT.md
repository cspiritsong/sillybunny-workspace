# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain JavaScript/CSS using host primitives (no new framework), packaged as a standalone SillyTavern/SillyBunny third-party extension.

## Users

SillyBunny/SillyTavern roleplayers who find the built-in UI too cluttered, especially on mobile, and want to arrange their own writing environment.

## Product Purpose

Give users the freedom to reduce and rearrange the interface: collapse dense menus into one-line swipeable rails, and tile, move, resize, and reorder the major panels (chat, settings, characters/world info) so the environment matches how they work instead of the reverse.

## Positioning

A reversible, opt-in layout layer on top of the existing SillyTavern UI, rather than a parallel window manager. It rearranges live host elements without replacing them and restores the original DOM on disable.

## Operating Context

Two form factors: desktop (pointer docking, splitter resizing, side-by-side tiles) and phone (vertical stacking, reordering, maximize, large touch targets). Layouts are device-class-specific and always offer a reset to SillyBunny defaults.

## Capabilities and Constraints

- Capabilities: overflow rails for whitelisted action/tab rows; three named layout presets (side-by-side, vertical stack, A+B over spanning C); pointer drag-to-dock; splitter resize; pane move/maximize/close; per-device layout persistence.
- Constraints: no heavy framework, no polling, no continuous idle animation; host event listeners and state must survive reparenting; unknown third-party panels need an explicit adapter; default mobile layout is one vertical stack with large panes.

## Brand Commitments

No new brand; must sit invisibly inside the host SillyBunny theme using its CSS variables with neutral fallbacks.

## Evidence on Hand

Host reference repository at `/home/badi/projects/sillybunny-dev/repo`. No testimonials, benchmarks, or usage data exist; none should be fabricated.

## Product Principles

1. The user's own arrangement outranks the default one.
2. Lightweight: the resting state costs no more than ordinary CSS layout.
3. Reversible: every transformation can be undone with one action and restores the host exactly.
4. Respect the host: reuse its mechanisms and theme, never replace them.

## Accessibility & Inclusion

Touch targets sized for thumbs on phone; keyboard-focusable controls; layout editing is an explicit mode so scrolling never accidentally rearranges panes.
