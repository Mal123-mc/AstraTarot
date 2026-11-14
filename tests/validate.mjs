import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { CARDS, META } = require('../js/cards.js');

let checks = 0;
function check(label, condition) {
  checks += 1;
  assert.ok(condition, label);
}

/* ---------------------------------------------------------
   1. 牌库数据
   --------------------------------------------------------- */
check('78 张牌', CARDS.length === 78);
check('大牌 22 张', CARDS.filter((card) => card.arcana === 'major').length === 22);
check('小牌 56 张', CARDS.filter((card) => card.arcana === 'minor').length === 56);

const ids = new Set(CARDS.map((card) => card.id));
check('id 唯一', ids.size === 78);
for (const card of CARDS) {
  check(card.id + ' id 为整数', Number.isInteger(card.id));
  check(card.id + ' 名称非空', typeof card.name === 'string' && card.name.trim().length > 0);
  check(card.id + ' 英文名非空', typeof card.en === 'string' && card.en.trim().length > 0);
  check(card.id + ' 编号非空', typeof card.numeral === 'string' && card.numeral.length > 0);
  check(card.id + ' 关键词 3 个', Array.isArray(card.keywords) && card.keywords.length === 3);
  check(card.id + ' 正位牌义完整', typeof card.upright === 'string' && card.upright.length >= 12);
  check(card.id + ' 逆位牌义完整', typeof card.reversed === 'string' && card.reversed.length >= 12);
  check(card.id + ' 有符号或花色', card.arcana === 'major'
    ? (typeof card.symbol === 'string' && card.symbol.length > 0)
    : (typeof card.suit === 'string' && card.suit.length > 0));
}

const names = new Set(CARDS.map((card) => card.name));
check('中文牌名不重复', names.size === 78);

const suitKeys = Object.keys(META.suits);
check('四种花色', suitKeys.length === 4);
for (const key of suitKeys) {
  const suit = META.suits[key];
  const group = CARDS.filter((card) => card.suit === key);
  check(suit.name + ' 14 张', group.length === 14);
  check(suit.name + ' 有元素', typeof suit.element === 'string' && suit.element.length > 0);
}

/* ---------------------------------------------------------
   2. 页面与资源
   --------------------------------------------------------- */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
check('引用了 cards.js', html.includes('js/cards.js'));
check('引用了 app.js', html.includes('js/app.js'));
check('引用了 style.css', html.includes('css/style.css'));
check('引用了 manifest', html.includes('manifest.webmanifest'));
check('包含四个视图', ['view-reading', 'view-daily', 'view-deck', 'view-history'].every((id) => html.includes('id="' + id + '"')));
check('没有外部脚本', !/<script[^>]+src="https?:/i.test(html));
check('没有外部样式', !/<link[^>]+href="https?:/i.test(html));

const requiredFiles = [
  'server.js',
  'sw.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/astra-tarot-transparent.ico',
  'js/app.js',
  'js/cards.js',
  'css/style.css'
];
for (const file of requiredFiles) check(file + ' 存在', existsSync(join(ROOT, file)));

const ico = readFileSync(join(ROOT, 'icons/astra-tarot-transparent.ico'));
check('ICO 文件头正确', ico[0] === 0 && ico[1] === 0 && ico[2] === 1 && ico[3] === 0);
check('ICO 含多尺寸', ico.readUInt16LE(4) >= 5);

const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
check('manifest 有名称', Boolean(manifest.name));
check('manifest 有 start_url', Boolean(manifest.start_url));
check('manifest 为 standalone', manifest.display === 'standalone');
check('manifest 有 192 图标', manifest.icons.some((icon) => icon.sizes === '192x192'));
check('manifest 有 512 图标', manifest.icons.some((icon) => icon.sizes === '512x512'));
for (const icon of manifest.icons) {
  check('图标存在：' + icon.src, existsSync(join(ROOT, icon.src)));
}

const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
check('Service Worker 有缓存名', /CACHE_NAME/.test(sw));
check('Service Worker 有 fetch 处理', /addEventListener\('fetch'/.test(sw));

/* ---------------------------------------------------------
   3. 语法检查
   --------------------------------------------------------- */
for (const file of ['server.js', 'sw.js', 'js/app.js', 'js/cards.js']) {
  execFileSync(process.execPath, ['--check', join(ROOT, file)], { stdio: 'pipe' });
  checks += 1;
}

/* ---------------------------------------------------------
   4. 服务器冒烟测试（不打开浏览器）
   --------------------------------------------------------- */
const port = 8800 + (process.pid % 120);
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, TAROT_NO_OPEN: '1', TAROT_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
let errors = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { errors += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (match) {
      const url = match[0];
      try {
        const response = await fetch(url);
        if (response.ok) return url;
      } catch (error) { /* not listening yet */ }
    }
    if (child.exitCode != null) break;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('服务器未能在 8 秒内启动。\n' + output + errors);
}

let baseUrl;
try {
  baseUrl = await waitForServer();
  const home = await fetch(baseUrl);
  check('首页返回 200', home.status === 200);
  check('首页是 HTML', (home.headers.get('content-type') || '').includes('text/html'));
  check('首页包含品牌名', (await home.text()).includes('星屿塔罗'));

  const script = await fetch(new URL('js/cards.js', baseUrl));
  check('牌库脚本返回 200', script.status === 200);
  check('牌库脚本是 JS', (script.headers.get('content-type') || '').includes('text/javascript'));

  const missing = await fetch(new URL('not-a-real-card.html', baseUrl));
  check('未知路径返回 404', missing.status === 404);

  const manifestResponse = await fetch(new URL('manifest.webmanifest', baseUrl));
  check('manifest 返回 200', manifestResponse.status === 200);
  check('manifest 类型正确', (manifestResponse.headers.get('content-type') || '').includes('application/manifest+json'));
} finally {
  child.kill();
}

console.log('牌库、页面、PWA、语法与本地服务器检查通过（' + checks + ' 项）。');
console.log('启动方式：双击「启动塔罗.bat」，或运行  node server.js');
