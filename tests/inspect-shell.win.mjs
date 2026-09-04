/** Inspect the live Canary shell structure so acceptance checks match reality. */
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
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
    await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(25000);

    const state = await page.evaluate(() => ({
        readyState: document.readyState,
        hasCtx: !!window.SillyTavern?.getContext?.(),
        ids: ['chat', 'sheld', 'right-nav-panel', 'left-nav-panel', 'extensions_settings', 'extensions_settings2', 'sws-settings', 'sws-overlay', 'top-bar']
            .filter((id) => document.getElementById(id)),
        cssCount: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => (l.href || '').split('/').pop()).slice(0, 40),
        bodyText: (document.body.textContent || '').slice(0, 200).replace(/\s+/g, ' '),
        formPresent: !!document.getElementById('form_sheld'),
        chatForm: !!document.querySelector('#send_form'),
    }));

    console.log(JSON.stringify(state, null, 2));
    const interesting = logs.filter((l) => /sws|workspace|SillyBunnyWorkspace|sbWorkspace|third-party/i.test(l));
    console.log('--- workspace-scoped logs:', interesting.length, '---');
    interesting.slice(0, 20).forEach((l) => console.log(l));
    if (interesting.length === 0) {
        console.log('--- last raw logs ---');
        logs.slice(-15).forEach((l) => console.log(l));
    }
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\canary-shell.png' });
} catch (err) {
    console.error('FAIL', err);
} finally {
    await browser?.close();
}
