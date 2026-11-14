const CDP = 'http://127.0.0.1:9222';
const tabs = await fetch(CDP + '/json/list').then((r) => r.json());
const tab = tabs.find((item) => item.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    console.log('EXCEPTION:', d.text, d.exception?.description || '');
    console.log('at', d.url, d.lineNumber, d.columnNumber);
    for (const frame of d.stackTrace?.callFrames || []) {
      console.log('  ', frame.functionName, frame.url, frame.lineNumber);
    }
  }
  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    if (e.level === 'error' || e.level === 'warning') console.log('LOG', e.level, e.text, e.url || '');
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const type = msg.params.type;
    if (type === 'error' || type === 'warning') {
      console.log('CONSOLE', type, msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  }
});
function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((resolve) => pending.set(msgId, resolve));
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Runtime.evaluate', {
  expression: `(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    return true;
  })()`,
  awaitPromise: true
});
await send('Page.reload', { ignoreCache: true });
await new Promise((r) => setTimeout(r, 2500));
const result = await send('Runtime.evaluate', {
  expression: `JSON.stringify({ count: document.querySelector('#question-count')?.textContent, cards: document.querySelectorAll('#deck-grid .tarot-card').length, errors: window.__errors || null })`,
  returnByValue: true
});
console.log('state', result.result.value);
ws.close();
