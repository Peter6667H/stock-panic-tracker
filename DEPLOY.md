# 部署指南 — 让中国的父母也能打开

本应用是一个 Node.js (Express) 服务：后端代理请求 Yahoo Finance 数据并做计算，
前端是静态页面。**必须部署在境外服务器**（因为数据源 Yahoo Finance 在中国大陆被墙，
由境外服务器代发请求即可绕过；父母只看渲染结果，不直接连 Yahoo）。

---

## ⚠️ 关于"中国能否流畅打开"的现实说明

任何**境外免费平台的默认域名**（`*.onrender.com`、`*.vercel.app`、`*.fly.dev` 等），
在中国大陆的访问都**可能不稳定、偶尔打不开**。这不是代码问题，是跨境网络的客观限制。

- 多数时间能打开，但速度可能慢（尤其免费实例首次唤醒需 ~30 秒冷启动）。
- 若要**稳定流畅**，需要：境外 VPS（选 CN2 GIA 等优化线路）+ 自有域名。这需付费，
  但每月几美元即可，后续可升级。

先用免费方案验证效果，不行再升级。

---

## 方案 A：Render（免费、无需信用卡，推荐）

### 1. 准备一个 GitHub 账号
没有就到 https://github.com/signup 注册（1 分钟）。

### 2. 把代码推到 GitHub
本地已初始化好 git 仓库并提交。在本项目目录执行（把 `你的用户名` 换成实际的）：

```bash
# 方式一：装了 GitHub CLI (gh)
gh auth login
gh repo create stock-panic-tracker --public --source=. --push

# 方式二：在 github.com 网页手动建一个空仓库 stock-panic-tracker，然后：
git remote add origin https://github.com/你的用户名/stock-panic-tracker.git
git branch -M main
git push -u origin main
```

### 3. 在 Render 部署
1. 打开 https://render.com → 用 GitHub 账号登录。
2. New + → **Web Service** → 选择刚推送的 `stock-panic-tracker` 仓库。
3. Render 会自动读取 `render.yaml`，确认：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
4. 点 **Create Web Service**，等 2–3 分钟构建完成。
5. 得到形如 `https://stock-panic-tracker-xxxx.onrender.com` 的公网链接。

### 4. 把链接发到微信
直接把 `https://....onrender.com` 复制到微信发给父母即可。

> 免费实例 15 分钟无访问会休眠，父母首次打开需等约 30 秒唤醒，属正常现象。

---

## 方案 B：升级到稳定访问（可选，付费）

1. 买一台境外小型 VPS（搜索关键词：CN2 GIA / 三网优化 VPS，约 $3–5/月）。
2. 装 Node 18+，`git clone` 本仓库，`npm install`，用 `pm2 start server.js` 常驻。
3. 解析一个你自己的域名到 VPS，配 Nginx 反代 + HTTPS（Let's Encrypt）。
4. 这样得到的 `https://你的域名` 在中国访问最稳定。

---

## 本地运行（自用）

```bash
npm install
npm start
# 打开 http://localhost:3000
```
