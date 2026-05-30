<p align="center">
  <img src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f5bc.svg" width="80" alt="jpg2webp" />
</p>

<h1 align="center">jpg2webp</h1>

<p align="center">
  <strong>本地 JPG/PNG → WebP 图片转换工具</strong><br>
  拖拽上传，一键转换，压缩体积，提升博客加载速度<br>
  完全本地运行，数据不上传，无需联网
</p>

<p align="center">
  <a href="README.md"><b>中文</b></a> &nbsp;|&nbsp;
  <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-coral" alt="PRs">
</p>

---

## 快速开始

```bash
git clone https://github.com/你的用户名/jpg2webp.git
cd jpg2webp
npm install        # 安装依赖（含 Sharp 原生二进制）
npm start          # 启动服务，默认 http://localhost:3000
```

浏览器访问 `http://localhost:3000`，拖入图片即可开始转换。

如需自定义端口：

```bash
PORT=8080 npm start
```

## 功能亮点

- **拖拽上传** — 支持拖拽和点击选择，浏览器端 `MIME` 过滤 JPG/PNG，最多 20 张同时处理
- **质量可调** — `10–100` 滑动条 + 快捷预设（快速 60 / 标准 80 / 高清 95），实时生效
- **无损模式** — 基于 `Sharp` 的 `lossless` 编码，适合 PNG 透明图，开启后质量滑块自动禁用
- **批量转换** — 服务端 `Sharp` 逐张转换，`Archiver` 流式打包 ZIP，全程不占满内存
- **预览对比** — 点击缩略图弹出模态框，并排展示原图与 WebP 结果
- **压缩统计** — 自动计算原始大小、转换后大小和节省百分比，支持一键复制
- **快捷键** — `Ctrl + Enter` 开始转换，无需鼠标操作

## 页面截图

<!-- 启动服务后截图拖到这里 -->
<!-- ![screenshot](https://user-images.githubusercontent.com/...) -->

## API 接口

### 端点一览

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | 健康检查，返回运行状态和 uptime |
| `POST` | `/api/convert/single` | 单张转换，返回 `image/webp` 二进制 |
| `POST` | `/api/convert/batch` | 批量转换，返回 `application/zip` 流式下载 |

### 调用示例

```bash
curl -X POST http://localhost:3000/api/convert/single \
  -F "image=@photo.jpg" \
  -F "quality=80" \
  -o output.webp
```

批量转换：

```bash
curl -X POST http://localhost:3000/api/convert/batch \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.png" \
  -F "quality=80" \
  -o converted.zip
```

返回 (`/api/health`)：

```json
{
  "status": "ok",
  "uptime": 12.345
}
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `image` / `images` | File / File[] | 必填 | JPG 或 PNG 图片，批量最多 20 张 |
| `quality` | `int` | 80 | 质量 1–100，无损模式下忽略 |
| `lossless` | `bool` | false | 无损 WebP 编码（PNG 推荐） |

## 架构

```
浏览器 (拖拽 / 设置)
        │
        ▼  multipart/form-data
   Express Server
        │
        ├── Multer ──▶ uploads/ (磁盘缓冲)
        │
        ▼
   Sharp (libvips)
        │
        ├── 单张 ──▶ res.sendFile(.webp)
        │
        └── 批量 ──▶ Archiver (流式 ZIP) ──▶ res (application/zip)

清理 ◀── res.on('close') ── 删除 uploads/ & outputs/
```

## 项目结构

```
jpg2webp/
├── server.js                 # 入口 — 启动 Express 并绑定端口
├── src/
│   ├── app.js                # Express 配置 — 静态文件、路由挂载、错误处理
│   ├── routes/
│   │   └── convert.js        # API 路由 — health / single / batch
│   ├── services/
│   │   └── converter.js      # Sharp 核心 — convertOne() / convertBatch()
│   └── middleware/
│       └── upload.js         # Multer 配置 — 磁盘存储、MIME 过滤、大小限制
├── public/
│   ├── index.html            # 前端页面 — 拖拽区、设置栏、文件列表、统计
│   ├── css/
│   │   └── style.css         # 样式 — 响应式布局、状态徽标、模态框
│   └── js/
│       └── app.js            # 前端逻辑 — 状态管理、JSZip 解压、下载触发
├── uploads/                  # 临时上传目录 (gitignored)
├── outputs/                  # 临时输出目录 (gitignored)
└── package.json
```

## 快捷键

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | 开始转换 |
| 点击缩略图 | 打开原图/WebP 对比预览 |

## 依赖

| Package | Purpose |
|---------|---------|
| [`express`](https://github.com/expressjs/express) | HTTP 服务框架 |
| [`sharp`](https://github.com/lovell/sharp) | 图像处理 — JPG/PNG 解码 + WebP 编码 |
| [`multer`](https://github.com/expressjs/multer) | multipart 文件上传解析 |
| [`archiver`](https://github.com/archiverjs/node-archiver) | 流式 ZIP 打包 |
| [`jszip`](https://github.com/Stuk/jszip) | 浏览器端 ZIP 解压 (CDN 加载) |

## 设计说明

- 色彩主题 `#d4785c`（暖珊瑚色），整体暖白 `#fdf6f0` 底色
- Sharp 无损模式下 `quality` 参数无效，前端自动禁用滑块
- 中文文件名在 `Content-Disposition` 头中使用 `encodeURIComponent` 处理
- Archiver v8 使用 `new ZipArchive(options)` 而非旧版 `archiver(format, options)`
- 所有转换临时文件在响应结束后自动清理

## 开源许可

MIT © AbsurdStone

---

<p align="center">
  <sub>Built with Node.js + Express + Sharp. Design inspired by warm minimalism.</sub>
</p>
