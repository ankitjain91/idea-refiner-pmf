#!/usr/bin/env node
/**
 * SmoothBrains – Final Integration Verification Script
 * One-file, CI-friendly. Requires: node >= 18, playwright
 * (Install with: npm i -D playwright @playwright/test)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const log = (...a) => console.log('[verify]', ...a);

const REQUIRED = {
  routes: ['/', '/hub', '/deep-dive', '/logged-out'],
  deepDiveBasemapHint: 'world.topo.bathy'
};

const result = {
  static: { tsconfigAlias: false, viteAliasPlugin: false },
  server: { started: false, baseUrl: '', via: '' },
  routes: {},
  ui: {
    landingHasCTA: false,
    deepDiveHasSatelliteMap: false,
    loggedOutHasCard: false
  },
  cache: { localStorageWriteRead: false },
  errors: []
};

function fail(msg) { result.errors.push(msg); }

function readJSON(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return null; }
}
function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return null; }
}

// 1. Static wiring checks
function checkTsconfig() {
  const ts = readJSON('tsconfig.json');
  if (!ts?.compilerOptions) return false;
  const { baseUrl, paths } = ts.compilerOptions;
  return baseUrl === 'src' && paths && paths['@/*'] && Array.isArray(paths['@/*']);
}
function checkVitePlugin() {
  const vite = readText('vite.config.ts') || readText('vite.config.js');
  if (!vite) return false;
  return /vite-tsconfig-paths/.test(vite) && /plugins:\s*\[.*?react\(\).*?tsconfigPaths\(\).*?\]/s.test(vite);
}

result.static.tsconfigAlias = checkTsconfig();
if (!result.static.tsconfigAlias) fail('tsconfig.json missing baseUrl=src and paths alias config.');
result.static.viteAliasPlugin = checkVitePlugin();
if (!result.static.viteAliasPlugin) fail('vite.config missing vite-tsconfig-paths plugin.');

// 2. Start server (or use BASE_URL)
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
let previewProc = null;

async function startPreviewIfNeeded() {
  if (process.env.BASE_URL) {
    result.server.started = true;
    result.server.baseUrl = process.env.BASE_URL;
    result.server.via = 'BASE_URL';
    return;
  }
  log('Building project...');
  await runCmd('npm', ['run', 'build']);
  log('Starting preview server...');
  previewProc = spawn('npm', ['run', 'preview', '--', '--port', '5173', '--strictPort'], { stdio: 'pipe' });
  let ready = false;
  previewProc.stdout.on('data', (buf) => {
    const s = buf.toString();
    if (/Local:\s*http:\/\/(127\.0\.0\.1|localhost):5173/.test(s)) ready = true;
  });
  const start = Date.now();
  while (!ready && Date.now() - start < 15000) { await delay(250); }
  if (!ready) { fail('Preview server did not start within 15s.'); return; }
  result.server.started = true;
  result.server.baseUrl = BASE_URL;
  result.server.via = 'vite preview';
}

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env: process.env });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} failed (${code})`)));
  });
}

// 3. Browser checks
async function runBrowserChecks() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  async function checkRoute(pathname, assertions = []) {
    const url = joinUrl(result.server.baseUrl, pathname);
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      result.routes[pathname] = resp && resp.ok() ? 'ok' : `http ${resp?.status()}`;
      for (const a of assertions) await a(page);
    } catch (e) {
      result.routes[pathname] = 'failed';
      fail(`Route ${pathname} failed: ${e?.message || e}`);
    }
  }

  await checkRoute('/', [async (p) => {
    const el = await p.locator('text=/Start|Analyze|Explore|Go to Hub/i').first();
    result.ui.landingHasCTA = (await el.count()) > 0;
    if (!result.ui.landingHasCTA) fail('Landing missing CTA.');
  }]);

  await checkRoute('/hub', [async (p) => {
    const cardish = p.locator("div[class*='rounded-2xl'], div.card, article, section");
    if ((await cardish.count()) < 1) fail('Hub appears empty.');
  }]);

  await checkRoute('/deep-dive', [async (p) => {
    const imgs = p.locator('img');
    const n = await imgs.count();
    let found = false;
    for (let i = 0; i < n; i++) {
      const src = await imgs.nth(i).getAttribute('src');
      if (src && src.includes(REQUIRED.deepDiveBasemapHint)) { found = true; break; }
    }
    result.ui.deepDiveHasSatelliteMap = found;
    if (!found) fail('Deep Dive satellite basemap not detected.');
  }]);

  await checkRoute('/logged-out', [async (p) => {
    const el = p.locator('text=/Signed out|Logged out/i').first();
    result.ui.loggedOutHasCard = (await el.count()) > 0;
    if (!result.ui.loggedOutHasCard) fail('Logged-out page missing card.');
  }]);

  // Cache test
  try {
    await page.goto(joinUrl(result.server.baseUrl, '/'));
    await page.evaluate(() => localStorage.setItem('__verify_cache_test', JSON.stringify({ ok: true })));
    const ok = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('__verify_cache_test')||'{}').ok === true; } catch { return false; }
    });
    result.cache.localStorageWriteRead = ok;
    if (!ok) fail('localStorage read/write failed.');
  } catch (e) { fail(`Cache check failed: ${e?.message || e}`); }

  await browser.close();
}

function joinUrl(base, p) { return `${base.replace(/\/$/, '')}${p.startsWith('/') ? p : `/${p}`}`; }

async function main() {
  try {
    await startPreviewIfNeeded();
    if (!result.server.started) return outputAndExit(1);
    await runBrowserChecks();
  } catch (e) { fail(`Fatal: ${e?.message || e}`); }
  finally { if (previewProc) previewProc.kill('SIGINT'); }
  outputAndExit(result.errors.length ? 1 : 0);
}

function outputAndExit(code) {
  console.log('\n=== Integration Verification Summary ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(code);
}

main();
