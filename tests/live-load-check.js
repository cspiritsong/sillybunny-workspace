/**
 * Live-load check for the Workspace extension against the running SillyBunny
 * Canary instance. Reaches it through a localhost SSH tunnel; waits on app
 * boot rather than full asset load, so a slow tunnel does not fake a failure.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pwPath = require.resolve('/home/badi/.hermes/hermes-agent/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);

const URL = process.env.CANARY_URL || 'http://127.0.0.1:4445/';
const results = [];
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

let browser;
try {
    browser = await chromium.launch({ args: ['--no-proxy-server'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
        if (m.type() === 'error') {
            consoleErrors.push(String(m.text()));
        }
    });

    // Commit = server responded; then poll for SillyTavern boot, no asset deadline.
    await page.goto(URL, { waitUntil: 'commit', timeout: 30000 });
    record('page navigation committed', true);
    const booted = await page.waitForFunction(
        () => {
            const ready = document.querySelector('#chat, #right-nav-panel, .drawer-content');
            const ctx = window.SillyTavern?.getContext?.();
            return !!ctx && !!ready;
        },
        null,
        { timeout: 120000 },
    ).then(() => true).catch(() => false);
    record('SillyTavern app booted (context + shell DOM)', booted);

    // Give the extension manager a moment to register third-party hooks.
    await page.waitForTimeout(6000);

    const markers = await page.evaluate(() => {
        const ctx = window.SillyTavern?.getContext?.();
        const extSettings = ctx?.extensionSettings ?? {};
        const allErrors = [];
        return {
            stContext: !!ctx,
            extKeys: Object.keys(extSettings),
            settingsBlock: !!document.getElementById('sws-settings'),
            globalApi: !!window.SillyBunnyWorkspace,
            hasCss: Array.from(document.querySelectorAll('style, link')).some((s) => (s.textContent || s.href || '').includes('sws-overlay')),
        };
    });

    const ownErrors = [
        ...pageErrors.filter((e) => /sws|workspace|SillyBunnyWorkspace|sbWorkspace/i.test(e)),
        ...consoleErrors.filter((e) => /sws|workspace|SillyBunnyWorkspace|sbWorkspace/i.test(e)),
    ];
    record('workspace settings key registered', (markers.extKeys || []).includes('sbWorkspace'), JSON.stringify(markers.extKeys || []));
    record('workspace settings block rendered', !!markers.settingsBlock);
    record('workspace global API exposed', !!markers.globalApi);
    record('workspace stylesheet present', !!markers.hasCss);
    record('no workspace-scoped page/console errors', ownErrors.length === 0, ownErrors.slice(0, 3).join(' | '));

    await page.screenshot({ path: '/tmp/canary-workspace-live.png' });
} catch (err) {
    record('live load run', false, String(err));
} finally {
    await browser?.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} live checks passed.`);
process.exit(failed.length ? 1 : 0);
