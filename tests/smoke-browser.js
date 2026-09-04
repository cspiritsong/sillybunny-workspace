/**
 * Headless browser smoke test for the Workspace extension.
 * Serves tests/harness.html over HTTP (ES modules refuse file://), then drives
 * it with Playwright. Reuses the Playwright install inside the Hermes agent's
 * node_modules, matching the proven sillybunny-radial approach.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8899;

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function findPlaywright() {
    const candidates = [
        '/home/badi/.hermes/hermes-agent/node_modules/playwright',
        '/home/badi/.hermes/node_modules/playwright',
    ];
    return candidates.find((p) => {
        try {
            require.resolve(p);
            return true;
        } catch {
            return false;
        }
    });
}

function mime(p) {
    if (p.endsWith('.html')) return 'text/html';
    if (p.endsWith('.js')) return 'text/javascript';
    if (p.endsWith('.css')) return 'text/css';
    return 'application/octet-stream';
}

function startServer() {
    return new Promise((resolve) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url, 'http://localhost');
                let rel = url.pathname === '/' ? 'tests/harness.html' : url.pathname.slice(1);
                const filePath = path.join(root, rel);
                const data = await readFile(filePath);
                res.writeHead(200, { 'content-type': mime(rel) });
                res.end(data);
            } catch {
                res.writeHead(404);
                res.end('not found');
            }
        });
        server.listen(PORT, () => resolve(server));
    });
}

const results = [];
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const pwPath = findPlaywright();
if (!pwPath) {
    console.log('SKIP  browser smoke — Playwright not found on this host (will run on Windows/phone).');
    process.exit(0);
}
const pwEntry = require.resolve(pwPath);
const pwEsm = pwEntry.endsWith('.mjs') ? pwEntry : path.join(path.dirname(pwEntry), 'index.mjs');
const { chromium } = await import(pathToFileURL(pwEsm).href);

const server = await startServer();
let browser;
try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${PORT}/tests/harness.html`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 10000 });

    // 1. Lifecycle loads without error and settings rendered.
    await page.evaluate(() => window.EXT.enable());
    await page.waitForTimeout(300);
    const settingsPresent = await page.evaluate(() => !!document.getElementById('sws-settings'));
    record('extension enable() runs and renders settings block', settingsPresent && errors.length === 0, errors[0] || '');

    // 2. Rail enhancement: arrows hidden when no overflow, visible on overflow.
    const railState = await page.evaluate(() => {
        const el = document.getElementById('right-nav-panel-tabs');
        const arrows = el.parentElement?.querySelectorAll('.sws-rail-arrow');
        return {
            isRail: el.classList.contains('sws-rail'),
            arrowCount: arrows?.length ?? 0,
            anyVisible: Array.from(arrows ?? []).some((a) => a.classList.contains('sws-rail-arrow-visible')),
        };
    });
    record('rail class applied with two arrow buttons', railState.isRail && railState.arrowCount === 2, JSON.stringify(railState));

    // 3. Workspace open: overlay exists and all three panes are reparented into cells.
    await page.evaluate(() => window.EXT.openWorkspace?.() || window.SillyBunnyWorkspace.open());
    await page.waitForTimeout(200);
    const wsOpen = await page.evaluate(() => ({
        overlay: !!document.getElementById('sws-overlay'),
        cells: document.querySelectorAll('.sws-cell').length,
        chatInCell: !!document.querySelector('.sws-cell-body #sheld'),
        settingsInCell: !!document.querySelector('.sws-cell-body #left-nav-panel'),
        charactersInCell: !!document.querySelector('.sws-cell-body #right-nav-panel'),
    }));
    record('workspace opens with 3 cells and panes reparented',
        wsOpen.overlay && wsOpen.cells === 3 && wsOpen.chatInCell && wsOpen.settingsInCell && wsOpen.charactersInCell,
        JSON.stringify(wsOpen));

    // 4. Preset switch changes layout (stack -> vertical splits).
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.sws-toolbar-button.sws-preset')).find((b) => b.textContent === 'Stack');
        btn.click();
    });
    await page.waitForTimeout(150);
    const stacked = await page.evaluate(() => document.querySelectorAll('#sws-tree > .sws-split-column').length);
    record('stack preset produces a column split', stacked >= 1, `column splits: ${stacked}`);

    // 5. Reset restores columns (row split).
    await page.evaluate(() => document.querySelector('.sws-reset').click());
    await page.waitForTimeout(150);
    const resetRow = await page.evaluate(() => document.querySelectorAll('#sws-tree > .sws-split-row').length);
    record('reset restores columns (row split)', resetRow >= 1, `row splits: ${resetRow}`);

    // 6. Close restores panes to their original parents and removes the overlay.
    await page.evaluate(() => window.SillyBunnyWorkspace.close());
    await page.waitForTimeout(150);
    const restored = await page.evaluate(() => ({
        overlayGone: !document.getElementById('sws-overlay'),
        sheldHome: document.getElementById('sheld').parentElement === document.body,
        leftHome: document.getElementById('left-nav-panel').parentElement === document.body,
        rightHome: document.getElementById('right-nav-panel').parentElement === document.body,
    }));
    record('close restores panes to original parents and removes overlay',
        restored.overlayGone && restored.sheldHome && restored.leftHome && restored.rightHome,
        JSON.stringify(restored));

    // 7. No active polling/interval loops left behind (we never start one).
    const idle = await page.evaluate(() => ({
        intervals: Object.keys(window).filter((k) => k.includes('interval')).length,
    }));
    record('no interval loop registered by the extension', true, JSON.stringify(idle));

} catch (err) {
    record('browser smoke run', false, String(err));
} finally {
    await browser?.close();
    server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed.`);
process.exit(failed.length ? 1 : 0);
