# 星屿塔罗 · Astra Tarot

一副安静、私密的 78 张塔罗牌，运行在本地浏览器里。

- 22 张大阿尔卡纳 + 56 张小阿尔卡纳，完整正位 / 逆位牌义
- 四种牌阵：单牌指引、时间之流（3 张）、关系之镜（5 张）、凯尔特十字（10 张）
- 每日一牌：同一天只抽一次，零点后自动更新
- 78 张牌库：按大牌 / 权杖 / 圣杯 / 宝剑 / 星币筛选，支持牌名与关键词搜索
- 占卜记录：自动保存在本机，可回看、复制、删除
- 牌面由 SVG / CSS 程序化绘制，无外部图片、字体或 CDN
- 响应式布局、键盘与读屏标签、`prefers-reduced-motion` 支持
- PWA：通过本地服务器访问后可安装到桌面 / 主屏幕，并支持离线打开

## 快速开始

需要 Node.js 18 或更高版本。项目没有任何 npm 依赖。

```powershell
# 方式一：双击
启动塔罗.bat

# 方式二：命令行
node server.js
```

服务器默认运行在 <http://127.0.0.1:8787/>，启动后会自动打开默认浏览器。8787 被占用时会自动尝试下一个端口。

### Windows 安装包

已提供可分发安装包：

```
dist\星屿塔罗-安装程序-1.0.0.exe
```

安装包内置 Node.js 运行时，目标电脑不需要预装 Node.js；按当前用户安装到 `%LOCALAPPDATA%\Programs\AstraTarot`，不需要管理员权限。安装后会创建开始菜单快捷方式，并可选择创建桌面快捷方式，可在「设置 → 应用」中卸载。

安装包使用 NSIS 3.x 编译。重新构建：

```powershell
# 可选：指定独立的 node.exe 与 Python 路径
$env:NODE_EXE = 'D:\Node\node.exe'
$env:PYTHON  = 'python'
powershell -ExecutionPolicy Bypass -File installer\build.ps1
```

构建需要：Node.js 18+、NSIS 3.x；`installer\assets\` 中的安装向导图片已随项目提供，只有重新生成图片时才需要 Python + Pillow。产物会写入 `dist\`。

也可以直接运行：

```powershell
npm run build:installer
```

`启动塔罗.bat` 会优先使用同目录下的 `node.exe`（安装版），找不到时再使用系统 `node`（源码运行）。


### 桌面快捷方式

项目已生成透明底的 Windows 图标 `icons/astra-tarot-transparent.ico`，并在桌面创建「星屿塔罗」快捷方式，双击即可启动。如果快捷方式丢失，可以重新生成：

```powershell
powershell -ExecutionPolicy Bypass -File tools/make-shortcut.ps1
```

也可以用 npm：

```powershell
npm start
```

### 可选环境变量

| 变量 | 作用 |
| --- | --- |
| `TAROT_PORT` | 指定起始端口，例如 `set TAROT_PORT=9000` |
| `TAROT_NO_OPEN=1` | 启动时不自动打开浏览器 |

## 使用

1. 在「占卜」页写下此刻的问题，或点一个示例问题。
2. 选择牌阵，点击「洗牌并抽牌」。
3. 按任意顺序点击牌背，逐张翻开；全部翻开后自动生成解读。
4. 解读包含每张牌在当前位置的含义，以及元素、正逆位、大 / 小牌的整体观察。
5. 结果会自动保存到「记录」，也可在「每日一牌」抽今天的提醒。

问题留空也可以抽牌，结果会以「此刻的指引」为标题。

## 数据与隐私

所有数据只写入当前浏览器的 `localStorage`，不会向外部服务发送任何数据：

- `astra.settings.v1`：音效开关
- `astra.daily.v1`：当天抽到的牌
- `astra.history.v1`：最近 60 条占卜记录

清除浏览器站点数据会同时清除这些记录。项目没有账号、后端或统计脚本。

## 目录结构

```
index.html               页面结构与对话弹窗
css/style.css            深空午夜 + 古金视觉系统、牌面、响应式布局
js/cards.js              78 张牌的数据与牌义
js/app.js                抽牌、牌阵、解读、每日一牌、牌库、记录、PWA 注册
server.js                零依赖本地静态服务器（默认 8787）
启动塔罗.bat             Windows 一键启动
manifest.webmanifest     PWA 清单
sw.js                    离线缓存（网络优先，失败回退缓存）
icons/                   SVG / 192 / 512 / ICO 图标
installer/               NSIS 安装包脚本、向导图片与构建脚本
dist/                    构建产物（安装包）
tests/validate.mjs       数据、资源、语法与服务器冒烟测试
tools/                   图标生成、快捷方式与截图辅助脚本（开发用）
shots/                   开发过程截图（可删除）
```

## 测试

```powershell
node tests/validate.mjs
# 或
npm test
```

当前覆盖 680 项检查：牌数 / 字段 / id / 花色分布、HTML 资源引用、外链检查、manifest、Service Worker、ICO 图标、四个 JS 的语法，以及启动本地服务器后的首页、数据文件、404 与 MIME 冒烟测试。

## 重新生成图标

需要 Python、Pillow 与 numpy：

```powershell
python tools/make-icons.py
```

会重新生成 `icons/icon-512.png`、`icons/icon-192.png` 与透明底多尺寸 Windows 图标 `icons/astra-tarot-transparent.ico`。`icons/icon.svg` 是手工维护的矢量版本。

## 说明

塔罗是自我觉察的工具，不构成医疗、法律、投资或心理治疗建议。牌面呈现的是此刻的可能性，最终判断与选择始终属于使用者。
