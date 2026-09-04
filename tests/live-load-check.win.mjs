// Windows wrapper: same checks, Playwright loaded from the laptop-local module path.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const localPw = path.join(process.env.PW_LOCAL_ROOT || '', 'playwright');
const pwEntry = require.resolve(localPw);
const pwEsm = pwEntry.endsWith('.mjs') ? pwEntry : path.join(path.dirname(pwEntry), 'index.mjs');
const { chromium } = await import(pathToFileURL(pwEsm).href);

const URL = process.env.CANARY_URL || 'http://127.0.0.1:4445/';
const results = [];
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

let browser;
try {
    // Launch full Chromium headlessly via its explicit cached executable
    // (revision 1223). The AppData\Local junction loop on this host breaks
    // Playwright's own browser registry path resolution, so bypass it.
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
        args: ['--no-proxy-server'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(String(m.text())); });

    await page.goto(URL, { waitUntil: 'commit', timeout: 30000 });
    record('page navigation committed', true);

    // Manual poll: waitForFunction proved unreliable in this headless setup,
    // while direct polling detects boot reliably (~10s here).
    let booted = false;
    for (let i = 0; i < 8; i++) {
        const snap = await page.evaluate(() => ({
            readyState: document.readyState,
            hasCtx: !!window.SillyTavern?.getContext?.(),
            hasChat: !!document.getElementById('chat'),
        })).catch(() => null);
        if (snap && snap.hasCtx && snap.hasChat && snap.readyState === 'complete') {
            booted = true;
            break;
        }
        await page.waitForTimeout(10000);
    }
    record('SillyTavern app booted (context + chat shell)', booted);
    await page.waitForTimeout(8000);

    const markers = await page.evaluate(async () => {
        const ctx = window.SillyTavern?.getContext?.();
        const extSettings = ctx?.extensionSettings ?? {};
        const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((l) => l.href || '')
            .filter((h) => h.includes('sillybunny-workspace'));
        let cssText = '';
        for (const href of cssLinks) {
            try {
                const r = await fetch(href);
                cssText += await r.text();
            } catch {
                // ignore fetch failures; inline style fallback below
            }
        }
        const inlineCss = Array.from(document.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
        return {
            stContext: !!ctx,
            extKeys: Object.keys(extSettings),
            settingsBlock: !!document.getElementById('sws-settings'),
            globalApi: !!window.SillyBunnyWorkspace,
            hasCss: cssText.includes('.sws-overlay') || inlineCss.includes('.sws-overlay'),
            rails: document.querySelectorAll('.sws-rail').length,
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
    await page.screenshot({ path: 'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\canary-workspace-live.png' });
} catch (err) {
    record('live load run', false, String(err));
} finally {
    await browser?.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} live checks passed.`);
process.exit(failed.length ? 1 : 0);
