/** Diagnose SillyBunny boot under iPhone UA in Windows Chromium. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pwPath = require.resolve('C:/Users/badiy/AppData/Local/hermes-workspace-tools/node_modules/playwright');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pwPath), 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\badiy\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe', args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:false, hasTouch:true, userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36' });
const page = await context.newPage();
const log=[];
page.on('console',m=>log.push(`[${m.type()}] ${m.text().slice(0,500)}`));
page.on('pageerror',e=>log.push(`[pageerror] ${String(e).slice(0,800)}`));
page.on('requestfailed',r=>log.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText||''}`));
await page.goto('http://127.0.0.1:4445/',{waitUntil:'commit',timeout:30000});
for(let i=0;i<12;i++){
  await page.waitForTimeout(5000);
  const s=await page.evaluate(()=>({readyState:document.readyState,title:document.title,body:!!document.body,kids:document.body?.children.length||0,st:!!window.SillyTavern,ctx:!!window.SillyTavern?.getContext?.(),guard:!!document.querySelector('[id*=boot],[class*=boot]'),guardText:[...document.querySelectorAll('[id*=boot],[class*=boot]')].map(e=>(e.textContent||'').trim()).filter(Boolean).slice(0,5),preloader:!!document.getElementById('preloader'),settings:!!document.getElementById('sws-settings'),scripts:[...document.scripts].map(s=>s.src).filter(Boolean).slice(-10)})).catch(e=>({evalErr:String(e)}));
  console.log('POLL',i,JSON.stringify(s));
  if(s.ctx&&s.settings)break;
}
console.log('--- LOGS ---');log.slice(-60).forEach(x=>console.log(x));
await page.screenshot({path:'C:\\Users\\badiy\\AppData\\Local\\hermes-workspace-tools\\mobile-boot-diag.png'});
await browser.close();
