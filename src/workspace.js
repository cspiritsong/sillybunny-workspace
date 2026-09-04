/**
 * Workspace engine: reversible dock/resize/move layer over registered host
 * panes. DOM-only; index.js supplies the pane registry and settings.
 *
 * The engine reparents LIVE host nodes (never clones), records an exact home
 * marker (parent, nextSibling, class, style, and a whitelist of attributes),
 * and restores them on close/disable. Layout state is the pure tree from
 * layout.js; rendering is plain flex, and interaction is Pointer Events.
 */

import {
    DIRECTIONS,
    PANE_IDS,
    PRESETS,
    dockPane,
    equalizeSplit,
    movePane,
    normalizeLayout,
    paneOrder,
    setChildRatio,
} from './layout.js';

const OVERLAY_ID = 'sws-overlay';
const TREE_ID = 'sws-tree';
const TOOLBAR_ID = 'sws-toolbar';

export class Workspace {
    /**
     * @param {object} opts
     * @param {Array<{id: string, label: string, selector: string}>} opts.panes
     * @param {(layout: object) => void} opts.onChange   persist callback (post-commit)
     * @param {(msg: string) => void} [opts.onToast]
     */
    constructor(opts) {
        this.paneDefs = opts.panes;
        this.onChange = opts.onChange;
        this.onToast = opts.onToast || (() => {});
        this.layout = null;
        this.overlay = null;
        this.treeEl = null;
        this.cells = new Map();       // paneId -> cell element
        this.homes = new Map();       // paneId -> restore record
        this.hosts = new Map();       // paneId -> live host element
        this.editMode = false;
        this.maximizedId = null;
        this.drag = null;
        this.boundGlobal = null;
    }

    get isOpen() {
        return this.overlay !== null;
    }

    open(savedLayout) {
        if (this.isOpen) {
            return;
        }
        this.layout = normalizeLayout(savedLayout, this.paneDefs.map((p) => p.id));
        this.buildOverlay();
        this.render();
    }

    close() {
        if (!this.isOpen) {
            return;
        }
        this.restoreAll();
        this.overlay.remove();
        this.overlay = null;
        this.treeEl = null;
        this.cells.clear();
        this.hosts.clear();
        this.maximizedId = null;
        this.editMode = false;
        this.detachGlobal();
    }

    setEditMode(on) {
        this.editMode = !!on;
        if (this.overlay) {
            this.overlay.classList.toggle('sws-editing', this.editMode);
        }
    }

    applyPreset(name) {
        const maker = PRESETS[name];
        if (!maker || !this.isOpen) {
            return;
        }
        this.layout = maker();
        this.maximizedId = null;
        this.render();
        this.commit();
    }

    maximize(paneId) {
        if (!this.isOpen) {
            return;
        }
        this.maximizedId = this.maximizedId === paneId ? null : paneId;
        this.render();
    }

    togglePane(paneId) {
        if (!this.isOpen) {
            return;
        }
        const known = this.paneDefs.map((p) => p.id);
        const order = paneOrder(this.layout);
        if (order.includes(paneId)) {
            const without = this.layoutRemovePane(paneId);
            this.layout = without || normalizeLayout(null, known);
        } else {
            this.layout = this.layoutAddPane(paneId);
        }
        this.render();
        this.commit();
    }

    reset() {
        this.applyPreset('columns');
    }

    // ---- tree mutation helpers (thin wrappers so tests can stay DOM-free) ----

    layoutRemovePane(id) {
        const mod = this.layout;
        const next = removeFromTree(mod, id);
        return next;
    }

    layoutAddPane(id) {
        const mod = this.layout;
        return addToTree(mod, id);
    }

    // ---- DOM build ----

    buildOverlay() {
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'sws-overlay';

        const toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        toolbar.className = 'sws-toolbar';
        toolbar.append(
            this.toolbarButton('Close', 'sws-close', () => this.close()),
            this.toolbarButton('Columns', 'sws-preset', () => this.applyPreset('columns')),
            this.toolbarButton('Stack', 'sws-preset', () => this.applyPreset('stack')),
            this.toolbarButton('A+B / C', 'sws-preset', () => this.applyPreset('abOverC')),
            this.toolbarButton('Arrange', 'sws-edit', () => this.setEditMode(!this.editMode), (b) => b.classList.toggle('sws-active', this.editMode)),
            this.toolbarButton('Reset', 'sws-reset', () => this.reset()),
        );

        const tree = document.createElement('div');
        tree.id = TREE_ID;
        tree.className = 'sws-tree';

        overlay.append(toolbar, tree);
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.treeEl = tree;
    }

    toolbarButton(label, extraClass, onClick, decorate) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `sws-toolbar-button ${extraClass}`;
        b.textContent = label;
        b.addEventListener('click', () => {
            onClick();
            decorate?.(b);
        });
        return b;
    }

    render() {
        if (!this.treeEl) {
            return;
        }
        // Clear the tree but keep every live pane host: detach it back to body
        // (a stable, connected holding spot) so it is never orphaned or lost.
        for (const host of this.hosts.values()) {
            if (host.isConnected) {
                this.reparent(host, document.body);
            }
        }
        this.cells.clear();
        this.treeEl.textContent = '';
        const rootNode = this.renderNode(this.layout);
        this.treeEl.appendChild(rootNode);

        // Reparent live pane hosts into their cells.
        for (const [paneId, cell] of this.cells) {
            const def = this.paneDefs.find((p) => p.id === paneId);
            if (!def) {
                continue;
            }
            let host = this.hosts.get(paneId);
            if (!host || !host.isConnected) {
                host = document.querySelector(def.selector);
                if (host) {
                    this.hosts.set(paneId, host);
                }
            }
            if (!host) {
                cell.classList.add('sws-cell-missing');
                continue;
            }
            this.recordHome(paneId, host);
            const body = cell.querySelector('.sws-cell-body');
            if (host.parentElement !== body) {
                body.appendChild(host);
            }
            cell.classList.add('sws-has-host');
            if (this.maximizedId === paneId) {
                cell.classList.add('sws-maximized');
            }
        }
    }

    reparent(host, parent) {
        parent.appendChild(host);
    }

    renderNode(node) {
        if (node.type === 'pane') {
            return this.renderCell(node.id);
        }
        const container = document.createElement('div');
        container.className = `sws-split sws-split-${node.dir}`;
        const dividerDir = node.dir === DIRECTIONS.ROW ? 'col' : 'row';
        node.children.forEach((child, i) => {
            const childEl = this.renderNode(child);
            childEl.style.flexGrow = String(node.ratio[i]);
            childEl.style.flexBasis = '0';
            container.appendChild(childEl);
            if (i < node.children.length - 1) {
                container.appendChild(this.renderDivider(container, node, i, dividerDir));
            }
        });
        return container;
    }

    renderDivider(container, splitNode, index, dir) {
        const d = document.createElement('div');
        d.className = `sws-divider sws-divider-${dir}`;
        d.setAttribute('role', 'separator');
        d.setAttribute('aria-orientation', dir === 'col' ? 'vertical' : 'horizontal');
        let start = 0;
        let startRatios = null;
        const onDown = (e) => {
            e.preventDefault();
            this.overlay.classList.add('sws-resizing');
            start = dir === 'col' ? e.clientX : e.clientY;
            startRatios = splitNode.ratio.slice();
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp, { once: true });
        };
        const onMove = (e) => {
            const delta = (dir === 'col' ? e.clientX : e.clientY) - start;
            const cellRect = container.getBoundingClientRect();
            const size = (dir === 'col' ? cellRect.width : cellRect.height) || 1;
            const leftPaneId = childIdOf(splitNode.children[index]);
            if (!leftPaneId) {
                return;
            }
            const deltaRatio = delta / size;
            const total = startRatios.reduce((a, b) => a + b, 0);
            const a = Math.min(Math.max(startRatios[index] + deltaRatio, 0.05), total - 0.05);
            const b = startRatios[index + 1] + (startRatios[index] - a);
            splitNode.ratio[index] = a;
            splitNode.ratio[index + 1] = Math.max(b, 0.05);
            this.applyRatios(container, splitNode);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            this.overlay.classList.remove('sws-resizing');
            this.layout = normalizeLayout(this.layout, this.paneDefs.map((p) => p.id));
            this.commit();
        };
        d.addEventListener('pointerdown', onDown);
        return d;
    }

    applyRatios(container, node) {
        Array.from(container.querySelectorAll(':scope > .sws-split, :scope > .sws-cell')).forEach((child, i) => {
            if (i < node.ratio.length) {
                child.style.flexGrow = String(node.ratio[i]);
            }
        });
    }

    renderCell(paneId) {
        const cell = document.createElement('div');
        cell.className = 'sws-cell';
        cell.dataset.pane = paneId;

        const def = this.paneDefs.find((p) => p.id === paneId);
        const label = def ? def.label : paneId;

        const header = document.createElement('div');
        header.className = 'sws-cell-header';
        const grip = document.createElement('div');
        grip.className = 'sws-grip';
        grip.textContent = '\u22EE';
        grip.setAttribute('aria-label', `Move ${label}`);
        grip.addEventListener('pointerdown', (e) => this.startDrag(e, paneId));

        const title = document.createElement('span');
        title.className = 'sws-cell-title';
        title.textContent = label;

        const max = document.createElement('button');
        max.type = 'button';
        max.className = 'sws-cell-btn';
        max.textContent = '\u25A1';
        max.title = 'Maximize';
        max.addEventListener('click', () => this.maximize(paneId));

        const hide = document.createElement('button');
        hide.type = 'button';
        hide.className = 'sws-cell-btn';
        hide.textContent = '\u2013';
        hide.title = 'Hide pane';
        hide.addEventListener('click', () => this.togglePane(paneId));

        header.append(grip, title, max, hide);

        const body = document.createElement('div');
        body.className = 'sws-cell-body';

        cell.append(header, body);
        this.cells.set(paneId, cell);
        return cell;
    }

    // ---- drag-to-dock ----

    startDrag(e, paneId) {
        if (!this.editMode) {
            return;
        }
        e.preventDefault();
        this.attachGlobal();
        this.overlay.classList.add('sws-dragging');
        const ghost = document.createElement('div');
        ghost.className = 'sws-ghost';
        ghost.textContent = this.paneDefs.find((p) => p.id === paneId)?.label ?? paneId;
        document.body.appendChild(ghost);
        this.drag = { paneId, ghost, pointerId: e.pointerId };

        const onMove = (ev) => {
            if (ev.pointerId !== this.drag?.pointerId) {
                return;
            }
            ghost.style.left = `${ev.clientX}px`;
            ghost.style.top = `${ev.clientY}px`;
            this.highlightDropTarget(ev.clientX, ev.clientY);
        };
        const onUp = (ev) => {
            if (ev.pointerId !== this.drag?.pointerId) {
                return;
            }
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            this.finishDrag(ev.clientX, ev.clientY);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        this.drag.onMove = onMove;
        this.drag.onUp = onUp;
    }

    highlightDropTarget(x, y) {
        this.cells.forEach((cell) => cell.classList.remove('sws-drop', 'sws-drop-left', 'sws-drop-right', 'sws-drop-top', 'sws-drop-bottom'));
        const target = document.elementFromPoint(x, y)?.closest('.sws-cell');
        if (!target) {
            return;
        }
        const rect = target.getBoundingClientRect();
        const lx = (x - rect.left) / rect.width;
        const ly = (y - rect.top) / rect.height;
        const zone = lx < 0.25 ? 'left' : lx > 0.75 ? 'right' : ly < 0.25 ? 'top' : ly > 0.75 ? 'bottom' : 'center';
        target.classList.add('sws-drop', zone === 'center' ? 'sws-drop' : `sws-drop-${zone}`);
        this.drag.dropTarget = target;
        this.drag.dropZone = zone;
    }

    finishDrag(x, y) {
        this.highlightDropTarget(x, y);
        const { paneId, dropTarget, dropZone } = this.drag || {};
        if (dropTarget) {
            const targetId = dropTarget.dataset.pane;
            const dirMap = {
                left: DIRECTIONS.ROW,
                right: DIRECTIONS.ROW,
                top: DIRECTIONS.COLUMN,
                bottom: DIRECTIONS.COLUMN,
            };
            if (dropZone === 'center') {
                this.layout = movePane(this.layout, paneId, targetId);
            } else if (dirMap[dropZone]) {
                const dir = dirMap[dropZone];
                const before = dropZone === 'left' || dropZone === 'top';
                // Remove the moving pane first so we never duplicate it.
                const without = removeFromTree(this.layout, paneId) ?? PRESETS.columns();
                this.layout = dockPane(without, targetId, paneId, dir, before);
            }
            this.layout = normalizeLayout(this.layout, this.paneDefs.map((p) => p.id));
            this.render();
            this.commit();
        }
        this.drag?.ghost?.remove();
        this.drag = null;
        this.overlay.classList.remove('sws-dragging');
        this.cells.forEach((cell) => cell.classList.remove('sws-drop', 'sws-drop-left', 'sws-drop-right', 'sws-drop-top', 'sws-drop-bottom'));
    }

    // ---- restore / lifecycle ----

    recordHome(paneId, host) {
        if (this.homes.has(paneId)) {
            return;
        }
        this.homes.set(paneId, {
            parent: host.parentElement,
            next: host.nextSibling,
            classAttr: host.getAttribute('class'),
            styleAttr: host.getAttribute('style'),
            attributes: this.captureAttributes(host),
        });
    }

    captureAttributes(host) {
        const out = {};
        for (const attr of Array.from(host.attributes)) {
            out[attr.name] = attr.value;
        }
        return out;
    }

    restoreAll() {
        for (const [paneId, home] of this.homes) {
            const host = this.hosts.get(paneId);
            if (!host) {
                continue;
            }
            if (home.parent && home.parent.isConnected) {
                home.parent.insertBefore(host, home.next);
            } else {
                document.body.appendChild(host);
            }
            // Restore class/style/attributes exactly.
            for (const name of Array.from(host.attributes)) {
                if (!(name in home.attributes)) {
                    host.removeAttribute(name);
                }
            }
            for (const [name, value] of Object.entries(home.attributes)) {
                host.setAttribute(name, value);
            }
        }
        this.homes.clear();
    }

    attachGlobal() {
        if (this.boundGlobal) {
            return;
        }
        this.boundGlobal = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                if (this.maximizedId) {
                    this.maximizedId = null;
                    this.render();
                } else {
                    this.setEditMode(false);
                }
            }
        };
        document.addEventListener('keydown', this.boundGlobal);
    }

    detachGlobal() {
        if (this.boundGlobal) {
            document.removeEventListener('keydown', this.boundGlobal);
            this.boundGlobal = null;
        }
    }

    commit() {
        this.onChange?.(this.layout);
    }
}

// ---- small pure helpers (also exported for tests) ----

function childIdOf(node) {
    if (!node) {
        return null;
    }
    if (node.type === 'pane') {
        return node.id;
    }
    return node.children[0] ? childIdOf(node.children[0]) : null;
}

export function removeFromTree(root, id) {
    if (!root) {
        return null;
    }
    if (root.type === 'pane') {
        return root.id === id ? null : root;
    }
    const kept = [];
    const ratio = [];
    root.children.forEach((child, i) => {
        const pruned = removeFromTree(child, id);
        if (pruned) {
            kept.push(pruned);
            ratio.push(root.ratio[i]);
        }
    });
    if (kept.length === 0) {
        return null;
    }
    if (kept.length === 1) {
        return kept[0];
    }
    return { type: 'split', dir: root.dir, ratio, children: kept };
}

export function addToTree(root, id) {
    if (!root) {
        return { type: 'pane', id };
    }
    if (root.type === 'pane') {
        return { type: 'split', dir: DIRECTIONS.COLUMN, ratio: [1, 1], children: [root, { type: 'pane', id }] };
    }
    const total = root.ratio.reduce((a, b) => a + b, 0);
    return {
        type: 'split',
        dir: root.dir === DIRECTIONS.ROW ? DIRECTIONS.COLUMN : DIRECTIONS.ROW,
        ratio: [total, 1],
        children: [root, { type: 'pane', id }],
    };
}

// Re-export the pure surface for tests and callers.
export const layoutApi = {
    DIRECTIONS,
    PANE_IDS,
    PRESETS,
    dockPane,
    equalizeSplit,
    movePane,
    normalizeLayout,
    paneOrder,
    setChildRatio,
    removeFromTree,
    addToTree,
};
