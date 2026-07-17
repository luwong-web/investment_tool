const $ = (id) => document.getElementById(id);
let currentFilter = "all"; // all | 高 | 中 | 低 | morning
let allItems = [];

// ---------- 时钟 ----------
function tickClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  $("clock-time").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
  $("clock-date").textContent =
    `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${wd}`;
}
setInterval(tickClock, 1000);
tickClock();

// ---------- 相对时间 ----------
function relTime(ts) {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

// ---------- 渲染 ----------
function renderStats(s) {
  $("stat-total").textContent = s.total ?? 0;
  $("stat-high").textContent = s.high ?? 0;
  $("stat-mid").textContent = s.medium ?? 0;
  $("stat-low").textContent = s.low ?? 0;
}

function renderLLM(connected) {
  $("llm-dot").classList.toggle("on", !!connected);
  $("llm-label").textContent = connected
    ? "DeepSeek 已连接"
    : "Mock 打分模式(未配 API Key)";
}

function filterItems(items) {
  if (currentFilter === "all") return items;
  if (currentFilter === "morning") {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).getTime() / 1000;
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime() / 1000;
    return items.filter((x) => x.published_at >= dayStart && x.published_at < cutoff);
  }
  return items.filter((x) => x.impact === currentFilter);
}

function renderList() {
  const items = filterItems(allItems);
  const box = $("news-list");
  if (!items.length) {
    box.innerHTML = `<div class="empty">当前筛选下没有新闻。</div>`;
    return;
  }
  box.innerHTML = items.map(renderCard).join("");
}

function badgeCls(impact) {
  return impact === "高" ? "high" : impact === "中" ? "mid" : "low";
}

function renderCard(it) {
  const impact = it.impact || "低";
  const sectors = (it.sectors || [])
    .map((s) => `<span class="sector-tag">${escape(s)}</span>`)
    .join("");
  const reason = escape(it.reason || "");
  const linkOpen = it.url && /^https?:/.test(it.url)
    ? `<a href="${it.url}" target="_blank" rel="noopener">`
    : "";
  const linkClose = linkOpen ? "</a>" : "";
  return `
    <div class="news-card impact-${impact}">
      <div class="news-head">
        <div class="news-title">${linkOpen}${escape(it.title)}${linkClose}</div>
        <div class="news-meta">
          <span class="source-badge">${escape(it.source)}</span>
          <span>${relTime(it.published_at)}</span>
        </div>
      </div>
      <div class="news-body">
        <span class="impact-badge ${badgeCls(impact)}">${impact}影响</span>
        ${reason ? `<span class="reason">${reason}</span>` : ""}
        ${sectors}
      </div>
    </div>`;
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- 拉取 (静态 JSON) ----------
// 加 querystring 破缓存 —— GitHub Pages 有 CDN 缓存
function bust(path) {
  return `${path}?t=${Math.floor(Date.now() / 60000)}`;
}

async function loadStats() {
  try {
    const r = await fetch(bust("./data/stats.json"));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const s = await r.json();
    renderStats(s);
    renderLLM(!!s.llm_connected);
    if (s.generated_at) {
      $("last-refresh").textContent = `数据更新于 ${relTime(s.generated_at)}`;
    }
  } catch (e) {
    console.warn("stats.json load failed", e);
    renderLLM(false);
    $("llm-label").textContent = "数据未初始化(等待首次 GitHub Actions 运行)";
  }
}

async function loadNews() {
  try {
    const r = await fetch(bust("./data/news.json"));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    allItems = j.items || [];
    renderList();
  } catch (e) {
    console.warn("news.json load failed", e);
    $("news-list").innerHTML =
      `<div class="empty">还没有新闻数据。仓库首次 GitHub Actions 运行完成后自动出现。</div>`;
  }
}

// ---------- 事件 ----------
document.querySelectorAll(".chip").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
    el.classList.add("active");
    currentFilter = el.dataset.filter;
    renderList();
  });
});

// ---------- 启动 ----------
loadStats();
loadNews();
// 静态数据每小时才更新,轮询没必要密;60 秒一次足以让你在演示中看到时间戳变化
setInterval(loadStats, 60000);
setInterval(loadNews, 60000);
