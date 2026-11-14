import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://127.0.0.1:8787/';
const OUT = 'D:/taluopai/shots/';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const tabs = await fetch(CDP + '/json/list').then((response) => response.json());
const tab = tabs.find((item) => item.type === 'page');
if (!tab) throw new Error('No page target');

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function shot(name, options = {}) {
  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: Boolean(options.full),
    ...(options.clip ? { clip: { ...options.clip, scale: 1 } } : {})
  });
  writeFileSync(OUT + name + '.png', Buffer.from(screenshot.data, 'base64'));
  console.log('shot', name);
}

async function setViewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
}

await send('Page.enable');
await send('Runtime.enable');
await setViewport(1440, 1000);
await send('Page.navigate', { url: BASE });
await sleep(1200);
await evaluate(`(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  localStorage.clear();
  return true;
})()`);
await send('Page.reload', { ignoreCache: true });
await sleep(1800);
await evaluate('window.scrollTo(0,0);');
await shot('01-home');

// 抽牌：三张牌阵
await evaluate(`(() => {
  const question = document.querySelector('#question');
  question.value = '我该如何面对眼前这次选择？';
  question.dispatchEvent(new Event('input', { bubbles: true }));
  const three = document.querySelector('[data-spread="three"]');
  if (three) three.click();
  document.querySelector('#deal-btn').click();
})()`);
await sleep(1000);
await evaluate(`(() => {
  const shell = document.querySelector('.reading-shell');
  window.scrollTo(0, shell.offsetTop - 86);
})()`);
await sleep(350);
await shot('02-table');

const cardCount = await evaluate("document.querySelectorAll('#card-table .tarot-card').length");
for (let i = 0; i < cardCount; i += 1) {
  await evaluate(`document.querySelectorAll('#card-table .tarot-card')[${i}].click()`);
  await sleep(380);
}
await sleep(1300);
await evaluate(`(() => {
  const result = document.querySelector('#reading-result');
  window.scrollTo(0, result.offsetTop - 88);
})()`);
await sleep(450);
await shot('03-result-head');

await evaluate(`(() => {
  const el = document.querySelector('.interpretation');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 92);
})()`);
await sleep(350);
await shot('04-result-interpretation');

await evaluate(`(() => {
  const el = document.querySelector('.synthesis');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 92);
})()`);
await sleep(350);
await shot('05-result-synthesis');

// 每日一牌
await evaluate("document.querySelector('[data-view=daily]').click()");
await sleep(500);
await shot('06-daily-before');
await evaluate("document.querySelector('#daily-draw-btn').click()");
await sleep(1300);
await shot('07-daily-after');

// 牌库
await evaluate("document.querySelector('[data-view=deck]').click()");
await sleep(550);
await shot('08-deck');
await evaluate("document.querySelector('#deck-grid .tarot-card').click()");
await sleep(500);
await shot('09-card-modal');
await evaluate("document.querySelector('#card-dialog').close()");
await sleep(250);

// 记录
await evaluate("document.querySelector('[data-view=history]').click()");
await sleep(450);
await shot('10-history');
const opened = await evaluate(`(() => {
  const button = document.querySelector('#history-list [data-open-history]');
  if (!button) return false;
  button.click();
  return true;
})()`);
if (opened) {
  await sleep(450);
  await shot('11-history-modal');
  await evaluate("document.querySelector('#history-dialog').close()");
}

// 移动端
await setViewport(390, 844, true);
await send('Page.navigate', { url: BASE });
await sleep(1600);
await shot('12-mobile-home');
await evaluate(`(() => {
  const shell = document.querySelector('.reading-shell');
  window.scrollTo(0, shell.offsetTop - 20);
})()`);
await sleep(300);
await shot('13-mobile-setup');
await evaluate("document.querySelector('#deal-btn').click()");
await sleep(900);
const mobileCount = await evaluate("document.querySelectorAll('#card-table .tarot-card').length");
for (let i = 0; i < mobileCount; i += 1) {
  await evaluate(`document.querySelectorAll('#card-table .tarot-card')[${i}].click()`);
  await sleep(280);
}
await sleep(1200);
await evaluate(`(() => {
  const el = document.querySelector('#reading-result');
  window.scrollTo(0, el.offsetTop - 20);
})()`);
await sleep(350);
await shot('14-mobile-result');
await evaluate(`(() => {
  const el = document.querySelector('.interpretation');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20);
})()`);
await sleep(300);
await shot('15-mobile-interpretation');

console.log('done');
ws.close();
