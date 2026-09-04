/**
 * Debug pass: reload the live Canary page and dump every console message and
 * page error so a silently failed third-party extension import becomes visible.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pwPath = require.resolve('/home/badi/.hermes/hermes-agent/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);

const URL = process.env.CANARY_URL || 'http://127.0.0.1:4445/';
let browser;
try {
    browser = await chromium.launch({ args: ['--no-proxy-server'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const log = [];
    page.on('console', (m) => log.push(`[console.${m.type()}] ${m.text().slice(0, 400)}`));
    page.on('pageerror', (e) => log.push(`[pageerror] ${String(e).slice(0, 600)}`));
    page.on('requestfailed', (r) => log.push(`[requestfailed] ${r.method()} ${r.url().slice(0, 200)} ${r.failure()?.errorText || ''}`));

    await page.goto(URL, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(45000);

    const state = await page.evaluate(() => ({
        readyState: document.readyState,
        ctx: !!window.SillyTavern?.getContext?.(),
        hasChat: !!document.querySelector('#chat'),
        hasSettings2: !!document.getElementById('extensions_settings2'),
    }));

    const interesting = log.filter((l) => /workspace|sillybunny-workspace|sbWorkspace|third-party|SillyBunnyWorkspace|sws-/i.test(l));
    console.log('STATE', JSON.stringify(state));
    console.log('--- WORKSPACE-SCOPED LOG ---');
    interesting.forEach((l) => console.log(l));
    console.log(`--- scoped count: ${interesting.length} of ${log.length} total ---`);
    if (interesting.length === 0) {
        console.log('--- LAST 30 RAW ---');
        log.slice(-30).forEach((l) => console.log(l));
    }
} catch (err) {
    console.error('RUN FAILED', err);
} finally {
    await browser?.close();
}
