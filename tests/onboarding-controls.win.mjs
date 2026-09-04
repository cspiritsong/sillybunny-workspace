/** Resolve exact first-run control selectors before clicking. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe', args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
await page.waitForTimeout(30000);
const result = await page.evaluate(() => {
    const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const compact = (e) => ({ tag: e.tagName, id: e.id, cls: typeof e.className === 'string' ? e.className : '', text: (e.textContent || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 120), outer: e.outerHTML.slice(0, 500) });
    return {
        save: [...document.querySelectorAll('button, input, [role="button"], .menu_button')].filter((e) => visible(e) && (e.textContent || e.value || '').trim() === 'Save').map(compact),
        persona: [...document.querySelectorAll('input')].filter((e) => visible(e) && /persona/i.test(`${e.id} ${e.name} ${e.placeholder}`)).map(compact),
        qigSkip: [...document.querySelectorAll('#qig-wizard-skip, button')].filter((e) => visible(e) && /skip/i.test(e.textContent || '')).map(compact),
    };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
