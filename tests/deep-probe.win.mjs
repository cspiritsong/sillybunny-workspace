/** Deep probe: what did the Workspace extension actually mount on the live page? */
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
    await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(30000);

    const probe = await page.evaluate(async () => {
        const ctx = window.SillyTavern?.getContext?.();
        const extSettings = ctx?.extensionSettings ?? {};
        const sbws = extSettings.sbWorkspace;
        const api = window.SillyBunnyWorkspace;
        // Fetch the extension stylesheet content to test for our rules.
        const cssSources = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((l) => l.href)
            .filter((h) => /third-party|sillybunny-workspace/i.test(h || ''));
        let cssText = '';
        for (const href of cssSources) {
            try {
                const r = await fetch(href);
                cssText += await r.text();
            } catch (e) {
                cssText += `FETCH_ERR ${href}: ${e}`;
            }
        }
        const inlineCss = Array.from(document.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
        const bodyWords = (document.body.textContent || '').slice(0, 300).replace(/\s+/g, ' ');
        return {
            hasCtx: !!ctx,
            sbwsSettings: sbws,
            apiMethods: api ? Object.keys(api) : null,
            cssSources,
            cssHasOverlay: cssText.includes('.sws-overlay') || inlineCss.includes('.sws-overlay'),
            cssHasRail: cssText.includes('sws-rail-track') || inlineCss.includes('sws-rail-track'),
            anySettingsHost: !!document.getElementById('extensions_settings2') || !!document.getElementById('extensions_settings'),
            settingsBlockInDom: !!document.getElementById('sws-settings'),
            swsButtonsInBody: bodyWords,
            chatExists: !!document.getElementById('chat'),
            sheldExists: !!document.getElementById('sheld'),
        };
    });

    console.log(JSON.stringify(probe, null, 2));
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\canary-workspace-probe.png' });
} catch (err) {
    console.error('FAIL', err);
} finally {
    await browser?.close();
}
