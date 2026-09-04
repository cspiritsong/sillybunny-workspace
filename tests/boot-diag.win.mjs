/** Diagnose the boot wait: what does the page look like at each poll? */
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
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 300)); });
    await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
    console.log('goto committed');
    // Poll manually 8x every 10s, printing what the boot predicate sees.
    for (let i = 0; i < 8; i++) {
        const snap = await page.evaluate(() => ({
            t: Math.round(performance.now() / 1000),
            readyState: document.readyState,
            hasCtx: !!window.SillyTavern?.getContext?.(),
            hasChat: !!document.getElementById('chat'),
            chatDisplay: (() => { const el = document.getElementById('chat'); return el ? getComputedStyle(el).display : 'n/a'; })(),
            loading: !!document.getElementById('loading_screen'),
            preloader: !!document.getElementById('preloader'),
            bodyKids: document.body.children.length,
        })).catch((e) => ({ evalErr: String(e) }));
        console.log('POLL', i, JSON.stringify(snap));
        if (snap.hasCtx && snap.hasChat && snap.readyState === 'complete') {
            console.log('BOOT_DETECTED at poll', i);
            break;
        }
        await page.waitForTimeout(10000);
    }
    if (pageErrors.length) {
        console.log('PAGE_ERRORS:', pageErrors.slice(0, 5).join('\n'));
    }
} catch (err) {
    console.error('RUN_FAIL', err);
} finally {
    await browser?.close();
}
