/** Measure live pane/cell computed styles in Workspace columns mode. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe', args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:4445/', { waitUntil: 'commit', timeout: 30000 });
for (let i = 0; i < 10; i++) {
    if (await page.evaluate(() => !!window.SillyTavern?.getContext?.() && !!document.getElementById('sws-settings')).catch(() => false)) break;
    await page.waitForTimeout(5000);
}
await page.evaluate(() => {
    window.SillyBunnyWorkspace?.close();
    document.querySelectorAll('dialog[open], [role="dialog"]').forEach((d) => d.remove());
    document.querySelector('.sws-open-button').click();
    [...document.querySelectorAll('.sws-toolbar-button')].find((b) => b.textContent === 'Columns').click();
});
await page.waitForTimeout(500);
const out = await page.evaluate(() => {
    const rect = (e) => { const r = e.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom }; };
    const style = (e) => { const s=getComputedStyle(e); return { display:s.display,position:s.position,visibility:s.visibility,opacity:s.opacity,left:s.left,right:s.right,top:s.top,bottom:s.bottom,width:s.width,height:s.height,maxWidth:s.maxWidth,maxHeight:s.maxHeight,overflow:s.overflow,transform:s.transform,zIndex:s.zIndex }; };
    const root = document.querySelector('#sws-tree > *');
    return {
        viewport:{w:innerWidth,h:innerHeight},
        tree:{rect:rect(document.getElementById('sws-tree')),style:style(document.getElementById('sws-tree'))},
        root:{rect:rect(root),style:style(root)},
        panes:['sheld','left-nav-panel','right-nav-panel'].map((id)=>{const e=document.getElementById(id);const body=e.closest('.sws-cell-body');const cell=e.closest('.sws-cell');return{id,classes:e.className,rect:rect(e),style:style(e),bodyRect:rect(body),cellRect:rect(cell),childCount:e.children.length,text:(e.textContent||'').trim().slice(0,80)}})
    };
});
console.log(JSON.stringify(out,null,2));
await page.evaluate(() => window.SillyBunnyWorkspace?.close());
await browser.close();
