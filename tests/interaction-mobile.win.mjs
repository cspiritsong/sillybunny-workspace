/**
 * Mobile/touch acceptance matrix for SillyBunny Workspace.
 * Runs on Windows Chromium with a 390x844 Android-class touch viewport against Canary.
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
    // The mobile shell/boot guard loads scripts conservatively on this Windows
    // testbed; allow up to three minutes rather than misclassifying slow boot.
    for (let i = 0; i < 36; i++) {
        const ready = await page.evaluate(() => !!window.SillyTavern?.getContext?.()
            && !!document.getElementById('sws-settings')).catch(() => false);
        if (ready) return true;
        await page.waitForTimeout(5000);
    }
    return false;
}

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
    args: ['--no-proxy-server'],
});
const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

try {
    await page.goto(URL, { waitUntil: 'commit', timeout: 60000 });
    record('mobile test host booted with Workspace mounted', await waitForBoot(page));
    await page.setViewportSize({ width: 390, height: 844 });
    const touchSession = await context.newCDPSession(page);
    await touchSession.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    // Isolate from unrelated host setup dialogs and reset mobile state. Chromium
    // boots with a desktop UA for transport reliability; wrap only the host's
    // UA-based isMobile result so the plugin executes its real mobile branch.
    await page.evaluate(() => {
        if (!window.__swsOriginalGetContext) {
            window.__swsOriginalGetContext = window.SillyTavern.getContext.bind(window.SillyTavern);
            window.SillyTavern.getContext = (...args) => {
                const ctx = window.__swsOriginalGetContext(...args);
                ctx.isMobile = () => true;
                return ctx;
            };
        }
        const clear = () => document.querySelectorAll('dialog[open], [role="dialog"], .qig-popup-overlay, .popup-overlay').forEach((d) => d.remove());
        clear();
        window.__swsDialogGuard?.disconnect();
        window.__swsDialogGuard = new MutationObserver(clear);
        window.__swsDialogGuard.observe(document.body, { childList: true, subtree: true });
        window.SillyBunnyWorkspace?.close();
        const ctx = window.SillyTavern.getContext();
        Object.assign(ctx.extensionSettings.sbWorkspace, {
            enabled: false,
            editMode: false,
            layout: null,
            mobileLayout: null,
            rails: true,
        });
        window.__mobileHomes = Object.fromEntries(['sheld', 'left-nav-panel', 'right-nav-panel'].map((id) => {
            const e = document.getElementById(id);
            return [id, { parent: e.parentElement, attrs: Object.fromEntries([...e.attributes].map((a) => [a.name, a.value])) }];
        }));
        document.querySelector('.sws-open-button').click();
    });
    await page.waitForSelector('#sws-overlay');

    const initial = await page.evaluate(() => {
        const cells = [...document.querySelectorAll('.sws-cell')].map((e) => e.getBoundingClientRect());
        const buttons = [...document.querySelectorAll('.sws-toolbar-button')].map((e) => e.getBoundingClientRect().height);
        const cellButtons = [...document.querySelectorAll('.sws-cell-btn')].map((e) => e.getBoundingClientRect());
        return {
            isMobile: window.SillyTavern.getContext().isMobile(),
            stack: !!document.querySelector('#sws-tree > .sws-split-column'),
            cells: cells.map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })),
            toolbarHeights: buttons,
            cellButtons: cellButtons.map((r) => ({ w: r.width, h: r.height })),
            toolbarScrolls: document.getElementById('sws-toolbar').scrollWidth > document.getElementById('sws-toolbar').clientWidth,
            rails: document.querySelectorAll('.sws-rail').length,
            overflowingRails: [...document.querySelectorAll('.sws-rail')].filter((e) => e.scrollWidth > e.clientWidth).length,
            railTouchActions: [...document.querySelectorAll('.sws-rail')].map((e) => getComputedStyle(e).touchAction),
        };
    });
    record('mobile profile detected and fresh mobile layout defaults to Stack', initial.isMobile && initial.stack, JSON.stringify(initial));
    record('mobile panes span viewport in one vertical stack', initial.cells.length === 3 && initial.cells.every((r) => r.w > 370) && initial.cells[0].y < initial.cells[1].y && initial.cells[1].y < initial.cells[2].y, JSON.stringify(initial.cells));
    record('mobile controls meet 40-44px touch floor', initial.toolbarHeights.every((h) => h >= 44) && initial.cellButtons.every((r) => r.w >= 40 && r.h >= 40), JSON.stringify({ toolbar: initial.toolbarHeights, cell: initial.cellButtons }));
    record('layout toolbar is one scrollable row, not wrapped', initial.toolbarScrolls);
    record('approved host menu rows mount as overflowing touch rails', initial.rails > 0 && initial.overflowingRails > 0 && initial.railTouchActions.every((v) => v.includes('pan-x')), `rails=${initial.rails}, overflowing=${initial.overflowingRails}`);

    // Verify the rail's conditional navigation control. Native finger swipe is
    // deliberately left to the physical-device gate; CDP cannot synthesize
    // compositor scrolling after post-boot touch emulation on this host.
    const arrowProbe = await page.evaluate(async () => {
        const rail = [...document.querySelectorAll('.sws-rail')].find((e) => e.scrollWidth > e.clientWidth);
        if (!rail) {
            return { found: false };
        }
        const right = rail.parentElement?.querySelector('.sws-rail-arrow-right');
        const before = rail.scrollLeft;
        const arrowVisible = right?.classList.contains('sws-rail-arrow-visible') ?? false;
        right?.click();
        await new Promise((resolve) => setTimeout(resolve, 800));
        return {
            found: true,
            arrowVisible,
            before,
            after: rail.scrollLeft,
            clientWidth: rail.clientWidth,
            scrollWidth: rail.scrollWidth,
        };
    });
    record('conditional rail arrow advances an overflowing rail', arrowProbe.found && arrowProbe.arrowVisible && arrowProbe.after > arrowProbe.before + 10, JSON.stringify(arrowProbe));

    // Touch Arrange and drag settings below Chat. Use CDP touch input on the grip.
    await page.evaluate(() => [...document.querySelectorAll('.sws-toolbar-button')].find((b) => b.textContent === 'Arrange').click());
    const grip = page.locator('.sws-cell[data-pane="settings"] .sws-grip');
    const target = page.locator('.sws-cell[data-pane="chat"]');
    const g = await grip.boundingBox();
    const t = await target.boundingBox();
    let touchDocked = false;
    if (g && t) {
        const cdp = await context.newCDPSession(page);
        const sx = g.x + g.width / 2;
        const sy = g.y + g.height / 2;
        const tx = t.x + t.width / 2;
        const ty = t.y + t.height * 0.9;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, radiusX: 5, radiusY: 5, force: 1 }] });
        for (let i = 1; i <= 8; i++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + (tx - sx) * i / 8, y: sy + (ty - sy) * i / 8, radiusX: 5, radiusY: 5, force: 1 }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(500);
        touchDocked = await page.evaluate(() => document.querySelectorAll('.sws-cell').length === 3 && document.querySelectorAll('.sws-split-column').length >= 1);
    }
    record('touch drag rearranges without losing panes', touchDocked, JSON.stringify({ grip: !!g, target: !!t }));

    // Maximize on phone and reset.
    await page.locator('.sws-cell[data-pane="chat"] .sws-cell-btn[title="Maximize"]').click({ force: true });
    const maxed = await page.evaluate(() => {
        const e = document.querySelector('.sws-cell[data-pane="chat"]');
        const r = e.getBoundingClientRect();
        return { on: e.classList.contains('sws-maximized'), coverage: r.width * r.height / (innerWidth * innerHeight) };
    });
    record('phone maximize fills most viewport', maxed.on && maxed.coverage > 0.7, JSON.stringify(maxed));
    await page.locator('.sws-cell[data-pane="chat"] .sws-cell-btn[title="Maximize"]').click({ force: true });
    await page.evaluate(() => [...document.querySelectorAll('.sws-toolbar-button')].find((b) => b.textContent === 'Reset').click());
    const reset = await page.evaluate(() => document.querySelectorAll('.sws-cell').length === 3 && !!document.querySelector('#sws-tree > .sws-split-column'));
    record('Reset returns all panes to the mobile Stack default', reset);

    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\workspace-mobile-390.png' });

    // Close/restoration, then clean disposable extension settings.
    await page.evaluate(async () => {
        window.SillyBunnyWorkspace.close();
        const ctx = window.SillyTavern.getContext();
        Object.assign(ctx.extensionSettings.sbWorkspace, { enabled: false, editMode: false, layout: null, mobileLayout: null, rails: true });
        const host = await import('/script.js');
        await host.saveSettings();
    });
    const restored = await page.evaluate(() => ['sheld', 'left-nav-panel', 'right-nav-panel'].every((id) => document.getElementById(id).parentElement === window.__mobileHomes[id].parent));
    record('mobile Close restores all host pane homes', restored);

    const ownErrors = [...pageErrors, ...consoleErrors].filter((e) => /sws-|SillyBunnyWorkspace|sbWorkspace|sillybunny-workspace/i.test(e));
    record('no Workspace-scoped errors during mobile matrix', ownErrors.length === 0, ownErrors.slice(0, 3).join(' | '));
} catch (err) {
    record('mobile matrix runner', false, String(err));
} finally {
    await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} mobile checks passed.`);
process.exit(failed.length ? 1 : 0);
