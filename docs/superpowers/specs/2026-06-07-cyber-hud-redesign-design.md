# 赛博 HUD 改版设计 — Stock Panic Terminal

生成于 2026-06-07 · 经 brainstorming 确认

## 目标

把美股恐慌仪表盘从"旧三栏布局 + AI 配色"升级为**赛博科技 HUD 视觉 + 微交互动效**,面向美股散户群体,数据保持清晰可读。纯前端改版,不动后端、不动数据逻辑、不动功能范围。

## 范围

**做:**
- 赛博 HUD 视觉语言(HUD 角框、发光线、网格、扫描线、等宽数据、终端式标题)
- 微交互与动效层(hover 发光、点击反馈、数字滚动、数据更新过渡、面板入场、实时元素脉冲、扫描线扫过)

**不做(本次明确排除):**
- 点击下钻详情浮层
- 交互式仪表因子拆解
- 可定制/可拖拽布局

**保留(功能一个不少):** 恐慌仪表、VIX/指数卡、市场结构、ETF/Mag7/科技股、风险矩阵、杠杆衰减、K线图、Ctrl+K 搜索、AI 问答"小慌"。

## 视觉语言

| 元素 | 规格 |
|------|------|
| 底色 | `#030711` 近黑 + 动态网格(已有)+ 扫描线微光 + 角落辉光池 |
| 主色 | 电光青 `#06b6d4` / `#22d3ee` |
| 辅色 | 靛紫 `#8b5cf6` |
| 面板框 | HUD 角框 `⌜⌝⌞⌟`(CSS 伪元素角标)+ 1px 发光青边,取代普通圆角卡片 |
| 数字字体 | JetBrains Mono(已加载)+ 青色辉光 |
| 标签字体 | 无衬线(已有 Hanken) |
| 区块标题 | 终端风:`// 恐慌指数`、`[ 风险矩阵 ]`、`>> 杠杆 ETF` |
| 涨跌色 | 绿 `#10d97a` / 红 `#ff4d5a`,保留现有语义 |

## 组件级处理

- **全局(App.jsx / main.jsx)**:加固定扫描线遮罩层(CSS 动画,`pointer-events:none`)、网格背景增强、角落辉光。尊重 `prefers-reduced-motion` 关闭动效。
- **Header.jsx**:改 HUD 指挥栏 —— `[ STOCK PANIC TERMINAL ]` 标题、`● ONLINE` 脉冲点、ET 时钟等宽、行情状态灯。
- **PanicGauge.jsx**(canvas):改雷达/瞄准镜式 HUD 环 —— 发光弧、刻度环、超大等宽分数、指针辉光(已是青色,增强为 HUD 反应堆样式)。
- **PanicSection / StructureSection / StockSection / RiskTable / LeverageSection / ChartSection / AiInsight**:统一套 HUD 角框 + 终端式标题 + hover 发光。
- **StockCard.jsx**:卡片改 HUD 单元格,hover 青色发光描边 + 微抬升,数字等宽。
- **RiskTable.jsx**:终端表格风,行 hover 发光扫过,排序箭头改 HUD 样式。
- **SearchPalette / AskPanel**:命令面板/控制台对话风,已接近,增强发光与等宽。

## 动效清单(微交互层)

| 动效 | 触发 | 实现 |
|------|------|------|
| 扫描线扫过 | 持续 | CSS `@keyframes` 平移渐变遮罩 |
| 面板入场 | 加载 | `fade + translateY` stagger |
| 数字滚动跳动 | 数据更新 | JS 计数动画(恐慌分、价格) |
| hover 发光 | 鼠标悬停卡片/行 | `box-shadow` glow 过渡 |
| 点击波纹 | 点击可交互元素 | CSS ripple 伪元素 |
| 实时脉冲 | ONLINE 灯/实时数据 | `@keyframes` opacity 脉冲 |
| 数据更新闪烁 | 行情刷新 | 短暂背景高亮淡出 |

全部动效受 `prefers-reduced-motion: reduce` 控制,可关闭,保证可访问性与低端设备性能。

## 涉及文件

- `frontend/src/styles.css` — 主战场,重写视觉语言与动效
- `frontend/src/components/*.jsx` — 加 HUD 框结构、终端标题、动效 hook(改动以结构/类名为主,不动数据逻辑)
- `frontend/src/components/PanicGauge.jsx` — canvas 仪表 HUD 化
- `frontend/src/App.jsx` / `main.jsx` — 扫描线/网格/辉光全局层

## 验证

- 本地 `npm run build` 通过 + `npm start` 跑起来
- 视觉检查:HUD 框、发光、扫描线、动效在桌面/移动断点正常
- 功能回归:所有板块数据、搜索、AI 问答、图表交互照常
- 部署:本地 build → 提交 dist/ → push → Render 手动部署(自动部署待修分支设置)

## 部署遗留(非本次范围,提醒)

Render 自动部署未生效(疑似监听分支非 main),目前靠手动 Deploy。建议改 Settings → Branch 为 main。
