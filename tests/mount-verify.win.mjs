/** Verify extension mount markers precisely after a full wait. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);

let browser;
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
        args: ['--no-proxy-server'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const logs = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 250)}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
    await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
    // App boot in this environment takes ~25-40s from the earlier probes.
    await page.waitForTimeout(45000);

    const state = await page.evaluate(() => {
        const ctx = window.SillyTavern?.getContext?.();
        return {
            hasCtx: !!ctx,
            hasChat: !!document.getElementById('chat'),
            readyState: document.readyState,
            swsSettings: !!document.getElementById('sws-settings'),
            swsOpenButton: !!document.querySelector('.sws-open-button'),
            swsRails: document.querySelectorAll('.sws-rail').length,
            railRows: document.querySelectorAll('.sws-rail-track').length,
            workspaceInBody: (document.body.textContent || '').includes('Open Workspace'),
            cssLinks: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .map((l) => l.href || '')
                .filter((h) => h.includes('sillybunny-workspace')),
        };
    });
    console.log('STATE', JSON.stringify(state, null, 2));
    const swsLogs = logs.filter((l) => /sillybunny-workspace|sbWorkspace|sws-|SillyBunnyWorkspace/i.test(l));
    console.log('--- workspace-scoped logs ---');
    swsLogs.slice(0, 20).forEach((l) => console.log(l));
    if (swsLogs.length === 0) {
        console.log('--- last 10 logs ---');
        logs.slice(-10).forEach((l) => console.log(l));
    }
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\canary-v012-mount.png' });
} catch (err) {
    console.error('FAIL', err);
} finally {
    await browser?.close();
}
