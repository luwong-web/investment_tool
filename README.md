# AI 金融智能体 · 投研舆情监控

面试演示版:GitHub Actions 每小时定时抓 **华尔街见闻 lives + 新浪财经 7×24**,用 **DeepSeek** 判断每条新闻对股价的影响档次(高 / 中 / 低),结果写成静态 JSON,前端 GitHub Pages 展示。

## 架构

```
GitHub Actions (每小时)
   ↓ python scripts/generate.py
   ├─ fetch 见闻 + 新浪
   ├─ 与旧 data/news.json 合并去重
   ├─ 未打分的调 DeepSeek 批量评级
   └─ 写回 data/news.json + data/stats.json → git commit → push

GitHub Pages
   ↑ 静态托管 index.html + assets/*
   前端 fetch("./data/news.json") 展示
```

## 部署步骤

### 1. 建 GitHub 仓库并推代码

在 GitHub 网页上新建一个 **public** 仓库(免费账号只有 public repo 才能用 Pages;私有 repo 需要 Pro)。假设名字叫 `investmen`。

在项目目录里:

```powershell
cd D:\Users\vivianwang\Desktop\investmen
git init
git add .
git commit -m "init: 投研舆情监控 v1"
git branch -M main
git remote add origin https://github.com/<你的用户名>/investmen.git
git push -u origin main
```

### 2. 加 DeepSeek Key 到 Secrets

进仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- Name: `DEEPSEEK_API_KEY`
- Secret: 你的 DeepSeek API Key

没配也能跑,会自动走 mock 关键词打分,但演示效果会差不少。

### 3. 开启 GitHub Pages

进仓库 → **Settings** → **Pages** →
- **Source**: Deploy from a branch
- **Branch**: `main` / `/ (root)`
- 保存

大概 1-2 分钟后,访问 `https://<你的用户名>.github.io/investmen/`。

### 4. 首次触发 Actions

Actions 定时是每小时的第 17 分钟。不想等,可以手动跑一次:

进仓库 → **Actions** → 左侧 **Update news data** → 右侧 **Run workflow** → **Run workflow**。

1-2 分钟后 workflow 完成,`data/news.json` 会被机器人自动 commit 到 main,Pages 随即刷新。

### 5. 授权 Actions 写仓库(如果第一次 push 失败)

如果看到 `Permission denied to github-actions[bot]`,进 **Settings** → **Actions** → **General** → 找到 **Workflow permissions** → 勾 **Read and write permissions** → 保存。

## 本地调试

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# 编辑 .env 填 DEEPSEEK_API_KEY(可留空)
python scripts/generate.py
```

之后打开 `index.html` 直接双击不行(浏览器安全策略不允许本地 file:// 加载 JSON),要起一个静态服务器:

```powershell
python -m http.server 8000
```

然后浏览器打开 [http://localhost:8000](http://localhost:8000)。

## 目录

```
investmen/
├── index.html            首页
├── assets/
│   ├── app.js            渲染 + 筛选
│   └── style.css         复刻截图风格
├── data/
│   ├── news.json         生成的新闻列表(最近 24h)
│   └── stats.json        统计数据
├── scripts/
│   ├── generate.py       Actions 入口
│   ├── config.py
│   ├── scorer.py         DeepSeek 打分 + mock 兜底
│   └── fetchers/
│       ├── wallstreetcn.py
│       └── sina.py
├── .github/workflows/
│   └── update.yml        每小时定时
├── requirements.txt
├── .env.example
└── .gitignore
```

## 调整参数

改 `.env`(本地)或改 `.github/workflows/update.yml` 里的 `env` 段(线上):

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 空 | 留空走 mock |
| `SCORE_BATCH_SIZE` | 10 | 单次 LLM 请求打分几条 |
| `RETAIN_HOURS` | 24 | JSON 里只保留最近多少小时 |
| `MAX_SCORE_PER_RUN` | 60 | 单次 Actions 最多喂 LLM 多少条,控成本 |

## 成本估算

按每小时 20-40 条新增新闻、mock 或 DeepSeek 打分:

- GitHub Actions:public repo 无限免费;
- DeepSeek:一天 500-1500 条 × 平均 100 tokens/条 ≈ 0.05-0.15 元/天,月 ¥2-5。
