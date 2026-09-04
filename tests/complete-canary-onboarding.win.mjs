/** Complete disposable Canary onboarding with existing defaults. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe', args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const targetUrl = process.env.SWS_TARGET_URL || 'http://127.0.0.1:4445/';
await page.goto(targetUrl, { waitUntil: 'commit', timeout: 30000 });
await page.waitForTimeout(30000);

const personaValue = await page.locator('dialog[open] .popup-input').inputValue().catch(() => '');
console.log('PERSONA_VALUE=' + JSON.stringify(personaValue));
const save = page.locator('.popup-button-ok.result-control', { hasText: 'Save' }).last();
const saveVisible = await save.isVisible().catch(() => false);
if (saveVisible && personaValue.trim()) {
    await save.click({ force: true });
    console.log('WELCOME_SAVE=clicked-preserving-existing-value');
} else if (saveVisible) {
    throw new Error('Welcome persona value is empty; refusing to invent one.');
} else {
    console.log('WELCOME_SAVE=already-complete-or-not-visible');
}
await page.waitForTimeout(5000);

const skip = page.locator('#qig-wizard-skip');
const skipVisible = await skip.isVisible().catch(() => false);
if (skipVisible) {
    await skip.click({ force: true });
    console.log('QIG_SKIP=clicked');
} else {
    console.log('QIG_SKIP=already-complete-or-not-visible');
}
await page.waitForTimeout(5000);

// Confirm a direct save reaches the endpoint and receives success.
const saveStatuses = [];
page.on('response', (r) => { if (r.url().includes('/api/settings/save')) saveStatuses.push(r.status()); });
const saveResult = await page.evaluate(async () => {
    const host = await import('/script.js');
    try {
        await host.saveSettings();
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
});
await page.waitForTimeout(1000);
console.log('DIRECT_SAVE=' + JSON.stringify(saveResult));
console.log('SAVE_STATUSES=' + JSON.stringify(saveStatuses));
console.log('DIALOGS_LEFT=' + await page.evaluate(() => document.querySelectorAll('dialog[open], [role="dialog"]').length));
console.log('PAGE_ERRORS=' + JSON.stringify(errors));
await browser.close();
