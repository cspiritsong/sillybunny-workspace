/**
 * SillyBunny Workspace — SillyTavern/SillyBunny extension entry point.
 * All SillyTavern knowledge is confined to this file: settings persistence,
 * the pane registry, whitelisted rail selectors, and lifecycle hooks. The
 * workspace and rail engines are context-free.
 */

import { startRailController } from './src/rail.js';
import { Workspace } from './src/workspace.js';

const SETTINGS_KEY = 'sbWorkspace';

const DEFAULT_SETTINGS = {
    enabled: false,
    editMode: false,
    layout: null,          // null → columns preset via normalizeLayout
    mobileLayout: null,
    rails: true,
};

const RAIL_SELECTORS = [
    // SillyBunny shell tab rows (Characters / Groups / Editor / World Info / Persona / Import)
    '#sb_character_editor_subtabs',
    '.sb-character-editor-subtabs',
    // Character editor subtab row (Information / Definitions / Greetings / Metadata)
    '.sb-shell-nav',
    // Dense action rows inside World Info
    '#world_popup_primary_actions',
    '#world_popup_toolbar',
    // Panel tab row of small right_menu buttons
    '#right-nav-panel-tabs',
];

const PANE_DEFS = [
    { id: 'chat', label: 'Chat', selector: '#sheld' },
    { id: 'settings', label: 'AI Settings', selector: '#left-nav-panel' },
    { id: 'characters', label: 'Characters', selector: '#right-nav-panel' },
];

let workspace = null;
let stopRails = null;

function getContext() {
    const ctx = globalThis.SillyTavern?.getContext?.();
    if (!ctx) {
        throw new Error('SillyTavern context not ready.');
    }
    return ctx;
}

function settings() {
    const ctx = getContext();
    let merged = ctx.extensionSettings[SETTINGS_KEY];
    if (!merged || typeof merged !== 'object') {
        merged = { ...DEFAULT_SETTINGS };
    }
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(k in merged)) {
            merged[k] = v;
        }
    }
    merged.enabled = merged.enabled === true;
    merged.editMode = merged.editMode === true;
    merged.rails = merged.rails !== false;
    ctx.extensionSettings[SETTINGS_KEY] = merged;
    return merged;
}

function persist() {
    getContext().saveSettingsDebounced();
}

function toast(msg) {
    globalThis.toastr?.info?.(msg);
}

function currentLayout() {
    const s = settings();
    const isMobile = getContext().isMobile?.();
    return isMobile ? s.mobileLayout : s.layout;
}

function saveLayout(layout) {
    const s = settings();
    const isMobile = getContext().isMobile?.();
    if (isMobile) {
        s.mobileLayout = layout;
    } else {
        s.layout = layout;
    }
    persist();
}

function createWorkspace() {
    if (workspace) {
        return workspace;
    }
    workspace = new Workspace({
        panes: PANE_DEFS,
        onChange: saveLayout,
        onToast: toast,
    });
    return workspace;
}

function openWorkspace() {
    const ws = createWorkspace();
    ws.open(currentLayout());
    ws.setEditMode(settings().editMode);
}

function closeWorkspace() {
    workspace?.close();
}

function renderSettings() {
    const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
    if (!host) {
        setTimeout(renderSettings, 1000);
        return;
    }
    if (document.getElementById('sws-settings')) {
        return;
    }
    const block = document.createElement('div');
    block.id = 'sws-settings';
    block.className = 'inline-drawer sws-settings-block';

    const header = document.createElement('div');
    header.className = 'inline-drawer-toggle inline-drawer-header';
    const b = document.createElement('b');
    b.textContent = 'Workspace';
    const icon = document.createElement('div');
    icon.className = 'inline-drawer-icon fa-solid fa-circle-chevron-down down';
    header.append(b, icon);

    const content = document.createElement('div');
    content.className = 'inline-drawer-content';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'menu_button sws-open-button';
    openBtn.textContent = 'Open Workspace';
    openBtn.addEventListener('click', () => {
        settings().enabled = true;
        persist();
        openWorkspace();
    });

    const railsRow = document.createElement('div');
    railsRow.className = 'flex-container alignitemscenter gap5p';
    const railsLabel = document.createElement('label');
    railsLabel.className = 'checkbox_label flex1';
    const railsInput = document.createElement('input');
    railsInput.type = 'checkbox';
    railsInput.checked = settings().rails;
    const railsSpan = document.createElement('span');
    railsSpan.textContent = 'Enable scrollable action rails';
    railsLabel.append(railsInput, railsSpan);
    railsInput.addEventListener('change', () => {
        settings().rails = railsInput.checked;
        persist();
        if (railsInput.checked) {
            startRails();
        } else {
            stopRails?.();
            stopRails = null;
        }
    });
    railsRow.append(railsLabel);

    content.append(openBtn, railsRow);
    block.append(header, content);
    host.append(block);

    header.addEventListener('click', () => {
        content.classList.toggle('open');
        icon.classList.toggle('up');
    });
}

function startRails() {
    if (stopRails || !settings().rails) {
        return;
    }
    stopRails = startRailController(RAIL_SELECTORS);
}

function stopAllRails() {
    stopRails?.();
    stopRails = null;
}

export function activate() {
    settings();
}

export function enable() {
    settings();
    renderSettings();
    startRails();
    if (settings().enabled) {
        openWorkspace();
    }
}

export function disable() {
    closeWorkspace();
    stopAllRails();
    document.getElementById('sws-settings')?.remove();
}

// Expose for other extensions / debugging.
globalThis.SillyBunnyWorkspace = {
    open: openWorkspace,
    close: closeWorkspace,
    toggle: () => (workspace?.isOpen ? closeWorkspace() : openWorkspace()),
};
