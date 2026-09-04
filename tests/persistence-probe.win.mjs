/** Isolate Workspace settings persistence on Canary. Leaves enabled=false afterward. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
    args: ['--no-proxy-server'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const saves = [];
const errors = [];
page.on('response', (r) => { if (r.url().includes('/api/settings/save')) saves.push({ status: r.status(), url: r.url() }); });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e}`));

await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
for (let i = 0; i < 10; i++) {
    if (await page.evaluate(() => !!window.SillyTavern?.getContext?.() && !!document.getElementById('sws-settings')).catch(() => false)) break;
    await page.waitForTimeout(5000);
}

await page.evaluate(() => {
    document.querySelectorAll('dialog[open], [role="dialog"]').forEach((d) => d.remove());
    window.SillyBunnyWorkspace?.close();
    document.querySelector('.sws-open-button').click();
});
await page.waitForSelector('#sws-overlay');
await page.locator('.sws-toolbar-button', { hasText: 'Stack' }).first().click({ force: true });
await page.waitForTimeout(5000);
const beforeDirect = await page.evaluate(() => structuredClone(window.SillyTavern.getContext().extensionSettings.sbWorkspace));

// Await the host's non-debounced save to prove server persistence deterministically.
const directSave = await page.evaluate(async () => {
    try {
        const host = await import('/script.js');
        await host.saveSettings();
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
});
await page.waitForTimeout(1000);
const afterDirect = await page.evaluate(() => structuredClone(window.SillyTavern.getContext().extensionSettings.sbWorkspace));

console.log('BEFORE_DIRECT', JSON.stringify(beforeDirect));
console.log('DIRECT_SAVE', JSON.stringify(directSave));
console.log('AFTER_DIRECT', JSON.stringify(afterDirect));
console.log('SAVE_RESPONSES', JSON.stringify(saves));
console.log('ERRORS', JSON.stringify(errors.filter((e) => /settings|conflict|save|workspace/i.test(e)).slice(0, 20)));

// Reload and report persisted value, then reset and await save.
await page.reload({ waitUntil: 'commit' });
for (let i = 0; i < 10; i++) {
    if (await page.evaluate(() => !!window.SillyTavern?.getContext?.() && !!document.getElementById('sws-settings')).catch(() => false)) break;
    await page.waitForTimeout(5000);
}
const reloaded = await page.evaluate(() => structuredClone(window.SillyTavern.getContext().extensionSettings.sbWorkspace));
console.log('RELOADED', JSON.stringify(reloaded));
await page.evaluate(async () => {
    window.SillyBunnyWorkspace?.close();
    const ctx = window.SillyTavern.getContext();
    Object.assign(ctx.extensionSettings.sbWorkspace, { enabled: false, editMode: false, layout: null, mobileLayout: null, rails: true });
    const host = await import('/script.js');
    await host.saveSettings();
});
await browser.close();
