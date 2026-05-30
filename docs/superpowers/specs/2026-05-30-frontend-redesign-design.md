# 前端重设计规格 — png2webp 转换工坊

**日期**: 2026-05-30
**基于**: DESIGN.md（Anthropic claude.com 设计系统）

## 设计方向

奶油色画布 + 层叠卡片的编辑型工具页。将 DESIGN.md 的设计 token 应用到单页图片转换工具。

## 设计 Token

### 颜色
- Canvas: `#faf9f5`（页面底色）
- 卡片: `#ffffff`（白色卡片）+ `#e6dfd8` hairline 边框
- Primary: `#cc785c`（珊瑚主色 — 按钮、链接、focus 状态）
- Primary-active: `#a9583e`（按钮按下态）
- Primary-disabled: `#e6dfd8`（禁用态）
- Ink: `#141413`（标题文字）
- Body: `#3d3d3a`（正文）
- Muted: `#6c6a64`（辅助标题）
- Muted-soft: `#8e8b82`（次要文字/占位）
- Success: `#5db872`（成功状态）
- Error: `#c64545`（失败状态）
- Surface-card: `#efe9de`（预设按钮 active 态）

### 字体
- 标题: Cormorant Garamond, serif（Google Fonts）
- 正文: Inter, sans-serif（Google Fonts）
- 代码: JetBrains Mono, monospace（Google Fonts）

### 排版层级
- h1: 36px, 400, letter-spacing: -0.5px（Cormorant Garamond）
- 卡片标题: 22px, 400, letter-spacing: -0.3px
- 正文: 14-16px, 400, line-height: 1.55（Inter）
- 按钮: 14px, 500（Inter）
- 表头: 12px, 500, letter-spacing: 1.5px, uppercase
- Badge: 12px, 500

### 间距
- 卡片间距: 20px
- 卡片内边距: 32px
- 页面上下留白: 48px
- 内容最大宽度: 900px

### 圆角
- 卡片: 12px（rounded.lg）
- 按钮: 8px（rounded.md）
- Badge: 9999px（rounded.pill）
- 缩略图: 6px（rounded.sm）
- 模态框: 16px（rounded.xl）

## 组件映射

| 功能 | DESIGN.md 组件 | 说明 |
|------|---------------|------|
| 拖拽上传区 | feature-card 内嵌 drop zone | 白色卡片 + 虚线边框拖拽区 |
| 质量滑块 | Range input + category-tab | 珊瑚色 accent，预设胶囊按钮 |
| 主按钮 | button-primary | 珊瑚底 #cc785c，白字 |
| 次按钮 | button-secondary | 奶油底 + hairline 边框 |
| 状态标签 | badge-pill | 胶囊形，语义色背景 |
| 文件列表 | 白色卡片 + 表格 | caption-uppercase 表头 |
| Toast | semantic colors | success/error/info 语义色 |
| 模态框 | Modal overlay | 奶油色遮罩 + 白色弹窗 |

## 文件范围
- `public/index.html` — 结构更新
- `public/css/style.css` — 完全重写
- `public/js/app.js` — 保持功能不变，仅调整 CSS class 引用

## 功能保持
所有现有功能不变：拖拽上传、文件列表、质量设置、转换、单个下载、批量下载、预览对比、统计、剪贴板复制、键盘快捷键。
