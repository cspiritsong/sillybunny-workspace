/**
 * Pure persisted layout model for the Workspace extension.
 * No DOM, no SillyTavern knowledge: a tree of split containers holding pane ids.
 *
 * Tree node shapes:
 *   { type: 'pane', id }                          — a leaf holding one pane
 *   { type: 'split', dir: 'row'|'column', ratio: number[], children: node[] }
 *     ratio[i] is the flex proportion of children[i]; length must equal children.
 */

export const DIRECTIONS = {
    ROW: 'row',
    COLUMN: 'column',
};

export const PANE_IDS = ['chat', 'settings', 'characters'];

const split = (dir, ratio, children) => ({
    type: 'split',
    dir,
    ratio,
    children,
});

const leaf = (id) => ({ type: 'pane', id });

export const PRESETS = {
    columns: () => split(DIRECTIONS.ROW, [1, 1, 1], PANE_IDS.map(leaf)),
    stack: () => split(DIRECTIONS.COLUMN, [1, 1, 1], PANE_IDS.map(leaf)),
    abOverC: () => split(DIRECTIONS.COLUMN, [1, 1], [
        split(DIRECTIONS.ROW, [1, 1], [leaf('settings'), leaf('characters')]),
        leaf('chat'),
    ]),
};

export function isValidLayout(node) {
    if (!node || typeof node !== 'object') {
        return false;
    }
    if (node.type === 'pane') {
        return typeof node.id === 'string' && node.id.length > 0;
    }
    if (node.type === 'split') {
        if (node.dir !== DIRECTIONS.ROW && node.dir !== DIRECTIONS.COLUMN) {
            return false;
        }
        if (!Array.isArray(node.children) || node.children.length === 0) {
            return false;
        }
        const ratios = node.ratio;
        if (!Array.isArray(ratios) || ratios.length !== node.children.length) {
            return false;
        }
        for (const r of ratios) {
            if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0) {
                return false;
            }
        }
        return node.children.every(isValidLayout);
    }
    return false;
}

function collectIds(node, out) {
    if (node.type === 'pane') {
        out.push(node.id);
    } else {
        for (const c of node.children) {
            collectIds(c, out);
        }
    }
}

/**
 * Normalize a persisted layout against the known pane set. Unknown pane ids are
 * dropped; missing known panes are appended so nothing is unreachable.
 */
export function normalizeLayout(layout, knownIds = PANE_IDS) {
    if (!isValidLayout(layout)) {
        return PRESETS.columns();
    }
    const present = new Set();
    const toDrop = new Set();
    const visit = (node) => {
        if (node.type === 'pane') {
            if (!knownIds.includes(node.id)) {
                toDrop.add(node.id);
            } else {
                present.add(node.id);
            }
        } else {
            node.children.forEach(visit);
        }
    };
    visit(layout);
    let cleaned = prune(layout, toDrop);
    const missing = knownIds.filter((id) => !present.has(id) && !toDrop.has(id));
    for (const id of missing) {
        cleaned = appendLeaf(cleaned, id);
    }
    // A drop may have emptied the tree; rebuild columns.
    if (!isValidLayout(cleaned)) {
        cleaned = PRESETS.columns();
    }
    return cleaned;
}

function prune(node, drop) {
    if (node.type === 'pane') {
        return drop.has(node.id) ? null : node;
    }
    const kept = node.children.map((c) => prune(c, drop)).filter(Boolean);
    if (kept.length === 0) {
        return null;
    }
    if (kept.length === 1) {
        return kept[0];
    }
    // Map kept children back to their original indices so ratios stay aligned.
    const keptRatio = kept.map((child) => {
        const idx = node.children.indexOf(child);
        return idx >= 0 ? node.ratio[idx] : 1;
    });
    return split(node.dir, keptRatio, kept);
}

function appendLeaf(node, id) {
    if (node.type === 'pane') {
        return split(DIRECTIONS.COLUMN, [1, 1], [node, leaf(id)]);
    }
    const dir = node.dir === DIRECTIONS.ROW ? DIRECTIONS.COLUMN : DIRECTIONS.ROW;
    return split(dir, [node.ratio.reduce((a, b) => a + b, 0), 1], [node, leaf(id)]);
}

/** Find the leaf node holding a pane id and its parent path. */
export function findPane(root, id) {
    const walk = (node, path) => {
        if (node.type === 'pane') {
            return node.id === id ? { node, path } : null;
        }
        for (let i = 0; i < node.children.length; i++) {
            const found = walk(node.children[i], [...path, { node, index: i }]);
            if (found) {
                return found;
            }
        }
        return null;
    };
    return walk(root, []);
}

/** Split the cell holding `target` in `dir` and place `incoming` beside it. */
export function dockPane(root, targetId, incomingId, dir, before = false) {
    const found = findPane(root, targetId);
    if (!found) {
        return root;
    }
    const { node, path } = found;
    const incoming = leaf(incomingId);
    const replacement = split(dir, [1, 1], before
        ? [incoming, node]
        : [node, incoming]);
    return splicePath(root, path, replacement);
}

/** Move `movingId` into the cell currently held by `targetId`, replacing it in place. */
export function movePane(root, movingId, targetId) {
    if (movingId === targetId) {
        return root;
    }
    const withRemoved = removePane(root, movingId);
    const target = findPane(withRemoved, targetId);
    if (!target) {
        return withRemoved;
    }
    return splicePath(withRemoved, target.path, leaf(movingId));
}

/** Remove a pane from the tree entirely (used for close and for move source). */
export function removePane(root, id) {
    const found = findPane(root, id);
    if (!found) {
        return root;
    }
    const { path } = found;
    if (path.length === 0) {
        return null;
    }
    const parentEntry = path[path.length - 1];
    const parent = parentEntry.node;
    const idx = parentEntry.index;
    const siblings = parent.children.slice();
    siblings.splice(idx, 1);
    const ratios = parent.ratio.slice();
    ratios.splice(idx, 1);
    let replacement;
    if (siblings.length === 1) {
        replacement = siblings[0];
    } else {
        replacement = split(parent.dir, ratios, siblings);
    }
    return splicePath(root, path.slice(0, -1), replacement);
}

/**
 * Replace the node at `path` within `root`, rebuilding ancestors upward so the
 * original tree shape (and untouched siblings) are preserved. `path` is the
 * walk from root to the replaced node, each entry `{ node, index }` naming the
 * parent and the child index that leads toward the replaced node.
 */
function splicePath(root, path, replacement) {
    if (path.length === 0) {
        return replacement;
    }
    const [head, ...rest] = path;
    const parent = head.node;
    const idx = head.index;
    const children = parent.children.slice();
    children[idx] = splicePath(parent.children[idx], rest, replacement);
    return { type: 'split', dir: parent.dir, ratio: parent.ratio, children };
}

/** Collapse the tree into an ordered list of pane ids (for tab order / restore). */
export function paneOrder(root) {
    const out = [];
    collectIds(root, out);
    return out;
}

/** Equalize the ratios along a split so sibling panes share space again. */
export function equalizeSplit(root, paneId) {
    const found = findPane(root, paneId);
    if (!found || found.path.length === 0) {
        return root;
    }
    const parentEntry = found.path[found.path.length - 1];
    const parent = parentEntry.node;
    if (parent.type !== 'split') {
        return root;
    }
    const replacement = split(parent.dir, parent.children.map(() => 1), parent.children);
    return splicePath(root, found.path.slice(0, -1), replacement);
}

/** Set the ratio for a specific child index inside a split, renormalizing the rest. */
export function setChildRatio(root, paneId, newRatio) {
    const found = findPane(root, paneId);
    if (!found || found.path.length === 0) {
        return root;
    }
    const parentEntry = found.path[found.path.length - 1];
    const parent = parentEntry.node;
    if (parent.type !== 'split' || parent.children.length < 2) {
        return root;
    }
    const idx = parentEntry.index;
    const ratio = parent.ratio.slice();
    const total = ratio.reduce((a, b) => a + b, 0);
    const clamped = Math.min(Math.max(newRatio, 0.05), total - 0.05);
    const othersTotal = total - ratio[idx];
    const scale = (total - clamped) / othersTotal;
    const next = ratio.map((r, i) => (i === idx ? clamped : r * scale));
    const replacement = split(parent.dir, next, parent.children);
    return splicePath(root, found.path.slice(0, -1), replacement);
}
