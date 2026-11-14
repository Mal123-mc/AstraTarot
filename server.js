'use strict';

/*
 * 星屿塔罗 · 本地静态服务器
 * 纯 Node.js，无第三方依赖。默认端口 8787，被占用时自动向后寻找。
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = __dirname;
const HOST = '127.0.0.1';
const START_PORT = Number(process.env.TAROT_PORT) || 8787;
const MAX_ATTEMPTS = 24;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function resolveFile(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.split('?')[0].split('#')[0]);
  } catch (error) {
    return null;
  }
  if (!pathname.startsWith('/') || pathname.indexOf('\0') !== -1) return null;
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  // path.resolve 会消化 ".."，随后再用前缀检查把逃逸请求挡在根目录之外。
  const filePath = path.resolve(ROOT, '.' + pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return null;
  return filePath;
}

function sendText(response, status, text) {
  const body = Buffer.from(text, 'utf8');
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

async function handle(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  let filePath = resolveFile(request.url || '/');
  if (!filePath) {
    sendText(response, 400, 'Bad Request');
    return;
  }

  try {
    let stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = await fs.promises.stat(filePath);
    }
    if (!stat.isFile()) throw new Error('not a file');

    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === '.html';
    const isServiceWorker = path.basename(filePath) === 'sw.js';
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': isHtml || isServiceWorker ? 'no-store' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    };

    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
      sendText(response, 404, '404 · 这张牌不在这里');
      return;
    }
    console.error('[server] 读取失败：', filePath, error && error.message);
    sendText(response, 500, '500 · 服务器开小差了');
  }
}

function openBrowser(url) {
  if (process.env.TAROT_NO_OPEN === '1') return;
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (error) {
    // 浏览器打不开不影响服务本身，手动访问控制台里的地址即可。
  }
}

function start(port, attemptsLeft) {
  const server = http.createServer(function (request, response) {
    handle(request, response).catch(function (error) {
      console.error('[server] 未捕获错误：', error);
      if (!response.headersSent) sendText(response, 500, '500 · 服务器开小差了');
      else response.end();
    });
  });

  server.once('error', function (error) {
    if (error && error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log('端口 ' + port + ' 已被占用，尝试 ' + (port + 1) + ' …');
      start(port + 1, attemptsLeft - 1);
      return;
    }
    console.error('无法启动本地服务器：' + (error && error.message ? error.message : error));
    process.exitCode = 1;
  });

  server.listen(port, HOST, function () {
    const url = 'http://' + HOST + ':' + port + '/';
    console.log('');
    console.log('  ✦ 星屿塔罗 Astra Tarot');
    console.log('  ' + url);
    console.log('  数据只保存在这台设备的浏览器里。按 Ctrl+C 停止服务。');
    console.log('');
    openBrowser(url);
  });
}

start(START_PORT, MAX_ATTEMPTS);
