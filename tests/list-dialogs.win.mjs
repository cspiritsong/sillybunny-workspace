/** List open first-run dialogs and actionable controls on Canary. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe', args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const targetUrl = process.env.SWS_TARGET_URL || 'http://127.0.0.1:4445/';
await page.goto(targetUrl, { waitUntil: 'commit', timeout: 30000 });
await page.waitForTimeout(30000);
const dialogs = await page.evaluate(() => {
    const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    return {
        dialogs: [...document.querySelectorAll('dialog, [role="dialog"], .popup')].map((d, i) => ({
            i,
            tag: d.tagName,
            id: d.id,
            cls: d.className,
            open: d.matches('dialog') ? d.open : getComputedStyle(d).display !== 'none',
            text: (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600),
            controls: [...d.querySelectorAll('button, input, select, [role="button"]')].slice(0, 20).map((e) => ({
                tag: e.tagName,
                id: e.id,
                type: e.type,
                text: (e.textContent || e.value || e.getAttribute('aria-label') || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                visible: visible(e),
            })),
        })),
        visibleInputs: [...document.querySelectorAll('input')].filter(visible).map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            value: e.value,
            placeholder: e.placeholder,
            outer: e.outerHTML.slice(0, 400),
        })),
    };
});
console.log(JSON.stringify(dialogs, null, 2));
await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\first-run-dialogs.png' });
await browser.close();
