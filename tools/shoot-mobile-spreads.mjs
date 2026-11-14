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

async function shot(name) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT + name + '.png', Buffer.from(screenshot.data, 'base64'));
  console.log('shot', name);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844
});

async function run(spreadKey, label) {
  await send('Page.navigate', { url: BASE });
  await sleep(1400);
  await evaluate('window.scrollTo(0,0)');
  await evaluate(`(() => {
    const question = document.querySelector('#question');
    question.value = '这段关系接下来会如何发展？';
    question.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-spread="${spreadKey}"]').click();
    document.querySelector('#deal-btn').click();
  })()`);
  await sleep(1200);
  await evaluate(`(() => {
    const table = document.querySelector('.table-panel');
    window.scrollTo(0, table.getBoundingClientRect().top + window.scrollY - 78);
  })()`);
  await sleep(350);
  await shot('24-mobile-' + label + '-table');

  const count = await evaluate("document.querySelectorAll('#card-table .tarot-card').length");
  for (let i = 0; i < count; i += 1) {
    await evaluate(`document.querySelectorAll('#card-table .tarot-card')[${i}].click()`);
    await sleep(220);
  }
  await sleep(1500);
  await evaluate(`(() => {
    const result = document.querySelector('#reading-result');
    window.scrollTo(0, result.offsetTop - 12);
  })()`);
  await sleep(400);
  await shot('25-mobile-' + label + '-result');
}

await run('five', 'five');
await run('ten', 'ten');

console.log('done');
ws.close();
