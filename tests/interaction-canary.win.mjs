/**
 * End-to-end interaction matrix against Windows SillyBunny Canary.
 * Runs on the laptop against loopback. Mutates only the disposable Canary
 * profile, resets settings at the end, and leaves the extension enabled/closed.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);

const URL = process.env.SWS_TARGET_URL || 'http://127.0.0.1:4445/';
const results = [];
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function waitForBoot(page) {
    for (let i = 0; i < 10; i++) {
        const ready = await page.evaluate(() => !!window.SillyTavern?.getContext?.()
            && !!document.getElementById('chat')
            && !!document.getElementById('sws-settings')).catch(() => false);
        if (ready) return true;
        await page.waitForTimeout(5000);
    }
    return false;
}

function sameAttrs(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

let browser;
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
        args: ['--no-proxy-server'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await page.goto(URL, { waitUntil: 'commit', timeout: 30000 });
    record('app booted with Workspace settings mounted', await waitForBoot(page));

    // Reset to a deterministic starting state, close any workspace left by an
    // interrupted run, dismiss host onboarding dialogs, and snapshot homes.
    await page.evaluate(() => {
        window.SillyBunnyWorkspace?.close();
        const clearHostDialogs = () => {
            document.querySelectorAll('dialog[open], [role="dialog"]').forEach((d) => {
                if (typeof d.close === 'function') {
                    d.close();
                }
                d.remove();
            });
            document.querySelectorAll('.qig-popup-overlay, .popup-overlay').forEach((e) => e.remove());
        };
        clearHostDialogs();
        window.__swsDialogGuard?.disconnect();
        window.__swsDialogGuard = new MutationObserver(clearHostDialogs);
        window.__swsDialogGuard.observe(document.body, { childList: true, subtree: true });
        const ctx = window.SillyTavern.getContext();
        Object.assign(ctx.extensionSettings.sbWorkspace, {
            enabled: false,
            editMode: false,
            layout: null,
            mobileLayout: null,
            rails: true,
        });
        ctx.saveSettingsDebounced();
        window.__swsHomes = {};
        for (const id of ['sheld', 'left-nav-panel', 'right-nav-panel']) {
            const el = document.getElementById(id);
            window.__swsHomes[id] = {
                parent: el.parentElement,
                next: el.nextSibling,
                attrs: Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value])),
            };
        }
    });

    // The extension settings drawer is collapsed on boot. Invoke the real button
    // click handler without forcing open unrelated host settings UI.
    await page.evaluate(() => document.querySelector('.sws-open-button').click());
    await page.waitForSelector('#sws-overlay');
    const opened = await page.evaluate(() => ({
        cells: document.querySelectorAll('.sws-cell').length,
        hosts: ['sheld', 'left-nav-panel', 'right-nav-panel'].filter((id) => document.querySelector(`.sws-cell-body #${id}`)).length,
        rails: document.querySelectorAll('.sws-rail').length,
        enabled: window.SillyTavern.getContext().extensionSettings.sbWorkspace.enabled,
    }));
    record('Open Workspace reparents 3 live panes and persists enabled', opened.cells === 3 && opened.hosts === 3 && opened.enabled, JSON.stringify(opened));

    const buttonByText = (text) => page.locator('.sws-toolbar-button', { hasText: text }).first();

    // Columns preset: cells should be ordered left-to-right.
    await buttonByText('Columns').click();
    await page.waitForTimeout(300);
    const columns = await page.evaluate(() => {
        const cells = [...document.querySelectorAll('.sws-cell')];
        const r = cells.map((e) => e.getBoundingClientRect());
        const root = document.querySelector('#sws-tree > .sws-split-row').getBoundingClientRect();
        const hosts = ['sheld', 'left-nav-panel', 'right-nav-panel'].map((id) => {
            const host = document.getElementById(id);
            const body = host.closest('.sws-cell-body');
            const hr = host.getBoundingClientRect();
            const br = body.getBoundingClientRect();
            const style = getComputedStyle(host);
            return {
                id,
                display: style.display,
                visibility: style.visibility,
                widthDelta: Math.abs(hr.width - br.width),
                heightDelta: Math.abs(hr.height - br.height),
            };
        });
        return {
            rootRow: true,
            rootWidth: root.width,
            viewportWidth: innerWidth,
            x: r.map((v) => Math.round(v.x)),
            w: r.map((v) => Math.round(v.width)),
            hosts,
        };
    });
    const hostsFill = columns.hosts.every((h) => h.display !== 'none' && h.visibility === 'visible' && h.widthDelta < 3 && h.heightDelta < 3);
    record('Columns preset fills viewport; all three live hosts fill their cells', columns.rootRow && columns.rootWidth > columns.viewportWidth * 0.9 && columns.x[0] < columns.x[1] && columns.x[1] < columns.x[2] && columns.w.every((w) => w > 250) && hostsFill, JSON.stringify(columns));
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\workspace-columns.png' });

    // Stack preset: cells should be top-to-bottom.
    await buttonByText('Stack').click();
    await page.waitForTimeout(300);
    const stack = await page.evaluate(() => {
        const r = [...document.querySelectorAll('.sws-cell')].map((e) => e.getBoundingClientRect());
        return { rootColumn: !!document.querySelector('#sws-tree > .sws-split-column'), y: r.map((v) => Math.round(v.y)), h: r.map((v) => Math.round(v.height)) };
    });
    record('Stack preset lays out three nonzero vertical cells', stack.rootColumn && stack.y[0] < stack.y[1] && stack.y[1] < stack.y[2] && stack.h.every((h) => h > 100), JSON.stringify(stack));
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\workspace-stack.png' });

    // A+B / C: nested top row + bottom spanning pane.
    await buttonByText('A+B / C').click();
    await page.waitForTimeout(300);
    const ab = await page.evaluate(() => ({
        rootColumn: !!document.querySelector('#sws-tree > .sws-split-column'),
        nestedRow: !!document.querySelector('#sws-tree > .sws-split-column > .sws-split-row'),
        cells: document.querySelectorAll('.sws-cell').length,
    }));
    record('A+B / C preset creates nested row over spanning pane', ab.rootColumn && ab.nestedRow && ab.cells === 3, JSON.stringify(ab));

    // Splitter resize on columns changes adjacent cell widths and persisted ratios.
    await buttonByText('Columns').click();
    await page.waitForTimeout(250);
    const divider = page.locator('.sws-divider-col').first();
    const dbox = await divider.boundingBox();
    const beforeWidths = await page.evaluate(() => [...document.querySelectorAll('.sws-cell')].map((e) => e.getBoundingClientRect().width));
    if (dbox) {
        await page.mouse.move(dbox.x + dbox.width / 2, dbox.y + dbox.height / 2);
        await page.mouse.down();
        await page.mouse.move(dbox.x + 90, dbox.y + dbox.height / 2, { steps: 5 });
        await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const afterResize = await page.evaluate(() => ({
        widths: [...document.querySelectorAll('.sws-cell')].map((e) => e.getBoundingClientRect().width),
        ratios: window.SillyTavern.getContext().extensionSettings.sbWorkspace.layout?.ratio,
    }));
    record('Splitter drag resizes cells and persists unequal ratios', !!dbox && Math.abs(afterResize.widths[0] - beforeWidths[0]) > 20 && new Set(afterResize.ratios?.map((r) => r.toFixed(2))).size > 1, JSON.stringify(afterResize));

    // Maximize and restore Chat.
    await page.locator('.sws-cell[data-pane="chat"] .sws-cell-btn[title="Maximize"]').click();
    await page.waitForTimeout(200);
    const maxed = await page.evaluate(() => {
        const el = document.querySelector('.sws-cell[data-pane="chat"]');
        const r = el.getBoundingClientRect();
        return { classed: el.classList.contains('sws-maximized'), coverage: (r.width * r.height) / (innerWidth * innerHeight) };
    });
    record('Maximize fills most of the viewport', maxed.classed && maxed.coverage > 0.7, JSON.stringify(maxed));
    await page.locator('.sws-cell[data-pane="chat"] .sws-cell-btn[title="Maximize"]').click();

    // Arrange mode + pointer drag: settings to lower zone of Chat.
    await buttonByText('Arrange').click();
    await page.waitForTimeout(100);
    const arrangeOn = await page.evaluate(() => document.getElementById('sws-overlay').classList.contains('sws-editing'));
    const grip = page.locator('.sws-cell[data-pane="settings"] .sws-grip');
    const target = page.locator('.sws-cell[data-pane="chat"]');
    const g = await grip.boundingBox();
    const t = await target.boundingBox();
    if (g && t) {
        await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
        await page.mouse.down();
        await page.mouse.move(t.x + t.width / 2, t.y + t.height * 0.9, { steps: 8 });
        await page.mouse.up();
    }
    await page.waitForTimeout(350);
    const dragged = await page.evaluate(() => ({
        cells: document.querySelectorAll('.sws-cell').length,
        nestedColumn: document.querySelectorAll('.sws-split-column').length,
        ids: [...document.querySelectorAll('.sws-cell')].map((e) => e.dataset.pane),
    }));
    record('Arrange mode enables pointer docking without losing panes', arrangeOn && !!g && !!t && dragged.cells === 3 && new Set(dragged.ids).size === 3 && dragged.nestedColumn >= 1, JSON.stringify(dragged));

    // Hide a pane, then reset recovers all three.
    await page.locator('.sws-cell[data-pane="characters"] .sws-cell-btn[title="Hide pane"]').click();
    await page.waitForTimeout(200);
    const hiddenCount = await page.locator('.sws-cell').count();
    await buttonByText('Reset').click();
    await page.waitForTimeout(250);
    const resetCount = await page.locator('.sws-cell').count();
    record('Hide removes one pane and Reset restores all three', hiddenCount === 2 && resetCount === 3, `hidden=${hiddenCount}, reset=${resetCount}`);

    // Close must restore exact parents and attributes.
    await page.locator('.sws-close').click();
    await page.waitForTimeout(250);
    const closeRestore = await page.evaluate(() => {
        const checks = [];
        for (const id of ['sheld', 'left-nav-panel', 'right-nav-panel']) {
            const el = document.getElementById(id);
            const home = window.__swsHomes[id];
            const attrs = Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
            checks.push({ id, sameParent: el.parentElement === home.parent, sameNext: el.nextSibling === home.next, sameAttrs: JSON.stringify(attrs) === JSON.stringify(home.attrs) });
        }
        return { overlayGone: !document.getElementById('sws-overlay'), checks };
    });
    record('Close removes overlay and exactly restores pane parents/attributes', closeRestore.overlayGone && closeRestore.checks.every((c) => c.sameParent && c.sameNext && c.sameAttrs), JSON.stringify(closeRestore));

    // Re-open then call the module's disable hook; must restore and remove rails/settings.
    await page.evaluate(() => window.SillyBunnyWorkspace.open());
    await page.waitForSelector('#sws-overlay');
    const disabled = await page.evaluate(async () => {
        const href = Array.from(document.querySelectorAll('script[type="module"]')).map((s) => s.src).find((s) => s.includes('sillybunny-workspace'));
        const mod = href ? await import(href) : null;
        if (!mod) return { imported: false };
        await mod.disable();
        return {
            imported: true,
            overlayGone: !document.getElementById('sws-overlay'),
            settingsGone: !document.getElementById('sws-settings'),
            railsGone: document.querySelectorAll('.sws-rail').length === 0,
            hostsHome: ['sheld', 'left-nav-panel', 'right-nav-panel'].every((id) => document.getElementById(id).parentElement === window.__swsHomes[id].parent),
        };
    });
    record('Disable hook removes UI/rails and restores all pane homes', disabled.imported && disabled.overlayGone && disabled.settingsGone && disabled.railsGone && disabled.hostsHome, JSON.stringify(disabled));

    // Enable again, open with real button, choose stack, reload: workspace should auto-open with stack persisted.
    await page.evaluate(async () => {
        const href = Array.from(document.querySelectorAll('script[type="module"]')).map((s) => s.src).find((s) => s.includes('sillybunny-workspace'));
        const mod = await import(href);
        await mod.enable();
    });
    await page.waitForSelector('#sws-settings', { state: 'attached' });
    await page.evaluate(() => document.querySelector('.sws-open-button').click());
    await buttonByText('Stack').click();
    // Host saveSettingsDebounced uses a 1s relaxed debounce. Stay well clear of
    // the boundary before reload so this tests persistence, not timer ordering.
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: 'commit' });
    const rebooted = await waitForBoot(page);
    await page.waitForTimeout(8000);
    const persistence = await page.evaluate(() => ({
        overlay: !!document.getElementById('sws-overlay'),
        stack: !!document.querySelector('#sws-tree > .sws-split-column'),
        enabled: window.SillyTavern?.getContext?.().extensionSettings.sbWorkspace.enabled,
    }));
    record('Reload restores enabled workspace and saved stack layout', rebooted && persistence.overlay && persistence.stack && persistence.enabled, JSON.stringify(persistence));

    // Cleanup: close workspace and reset disposable settings.
    await page.evaluate(() => {
        window.SillyBunnyWorkspace?.close();
        const ctx = window.SillyTavern?.getContext?.();
        if (ctx?.extensionSettings?.sbWorkspace) {
            Object.assign(ctx.extensionSettings.sbWorkspace, {
                enabled: false,
                editMode: false,
                layout: null,
                mobileLayout: null,
                rails: true,
            });
            ctx.saveSettingsDebounced();
        }
    });

    const ownErrors = [...pageErrors, ...consoleErrors].filter((e) => /sws-|SillyBunnyWorkspace|sbWorkspace|sillybunny-workspace/i.test(e));
    record('No workspace-scoped errors during interaction matrix', ownErrors.length === 0, ownErrors.slice(0, 3).join(' | '));
} catch (err) {
    record('interaction matrix runner', false, String(err));
} finally {
    await browser?.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed.`);
process.exit(failed.length ? 1 : 0);
