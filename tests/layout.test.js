import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DIRECTIONS,
    PANE_IDS,
    PRESETS,
    dockPane,
    movePane,
    normalizeLayout,
    paneOrder,
    setChildRatio,
} from '../src/layout.js';
import { removeFromTree, addToTree } from '../src/workspace.js';

function leafIds(node) {
    return paneOrder(node);
}

test('presets produce valid layouts with all panes', () => {
    for (const [name, maker] of Object.entries(PRESETS)) {
        const layout = maker();
        assert.ok(layout, `${name} returns a layout`);
        assert.deepEqual(paneOrder(layout).sort(), [...PANE_IDS].sort(), `${name} contains all panes`);
    }
});

test('columns preset is a single row split', () => {
    const layout = PRESETS.columns();
    assert.equal(layout.type, 'split');
    assert.equal(layout.dir, DIRECTIONS.ROW);
    assert.equal(layout.children.length, 3);
});

test('abOverC preset: settings+characters in a row above chat', () => {
    const layout = PRESETS.abOverC();
    assert.equal(layout.dir, DIRECTIONS.COLUMN);
    const [top, bottom] = layout.children;
    assert.equal(top.dir, DIRECTIONS.ROW);
    assert.deepEqual(leafIds(top).sort(), ['characters', 'settings']);
    assert.deepEqual(leafIds(bottom), ['chat']);
});

test('normalizeLayout drops unknown panes and re-adds missing known ones', () => {
    const bad = {
        type: 'split',
        dir: DIRECTIONS.ROW,
        ratio: [1, 1],
        children: [
            { type: 'pane', id: 'chat' },
            { type: 'pane', id: 'bogus' },
        ],
    };
    const fixed = normalizeLayout(bad, PANE_IDS);
    const ids = paneOrder(fixed);
    assert.ok(!ids.includes('bogus'), 'unknown pane dropped');
    for (const id of PANE_IDS) {
        assert.ok(ids.includes(id), `missing pane ${id} re-added`);
    }
});

test('normalizeLayout rejects non-layout and falls back to columns', () => {
    const fixed = normalizeLayout({ not: 'a layout' }, PANE_IDS);
    assert.deepEqual(leafIds(fixed).sort(), [...PANE_IDS].sort());
});

test('dockPane places incoming beside target in the requested direction', () => {
    const base = PRESETS.columns();
    // Dock a 4th pane right of chat.
    const docked = dockPane(base, 'chat', 'extra', DIRECTIONS.ROW, false);
    const order = paneOrder(docked);
    const chatIdx = order.indexOf('chat');
    assert.equal(order[chatIdx + 1], 'extra', 'extra is immediately right of chat');
});

test('dockPane before places incoming before target', () => {
    const base = PRESETS.columns();
    const docked = dockPane(base, 'chat', 'extra', DIRECTIONS.ROW, true);
    const order = paneOrder(docked);
    assert.equal(order[order.indexOf('chat') - 1], 'extra');
});

test('movePane replaces the target cell with the moving pane and removes source', () => {
    const base = PRESETS.columns();
    const moved = movePane(base, 'settings', 'chat');
    const order = paneOrder(moved);
    assert.equal(order.filter((id) => id === 'settings').length, 1, 'source present exactly once');
    assert.ok(!order.includes('chat'), 'target cell contents removed');
    assert.equal(order.length, 2, 'no duplicates after replace');
    assert.equal(order[0], 'settings', 'settings now occupies chat\'s former position');
});

test('setChildRatio renormalizes siblings to preserve total', () => {
    const base = PRESETS.columns();
    const changed = setChildRatio(base, 'chat', 2);
    const row = changed; // columns preset root is the split
    const total = row.ratio.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 3) < 1e-6, 'total ratio preserved (3)');
    assert.ok(Math.abs(row.ratio[0] - 2) < 1e-6, 'chat ratio clamped to requested 2');
    assert.ok(row.ratio[1] > 0 && row.ratio[2] > 0, 'siblings share the remainder');
});

test('removeFromTree removes a leaf and collapses single-child splits', () => {
    const base = PRESETS.columns();
    const removed = removeFromTree(base, 'characters');
    const order = paneOrder(removed);
    assert.deepEqual(order.sort(), ['chat', 'settings']);
});

test('addToTree appends a missing pane', () => {
    const base = PRESETS.columns();
    const added = addToTree(base, 'extra');
    const order = paneOrder(added);
    assert.ok(order.includes('extra'));
});
