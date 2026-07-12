// 心镜 MindMirror 前端 —— API 客户端 + 行为轨迹采集

// 用户 token(本地存,首访自动生成)
const TOKEN_KEY = 'mindmirror_token';
function getToken() {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) { t = crypto.randomUUID(); localStorage.setItem(TOKEN_KEY, t); }
  return t;
}

// API 客户端 —— 自动带 X-User-Token
const api = {
  async get(url) {
    const r = await fetch(url, { headers: { 'X-User-Token': getToken() } });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Token': getToken() },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  },
};

// 行为轨迹采集器 —— 记录每题的耗时、修改次数、滑块/拖拽路径
class BehaviorTracker {
  constructor() {
    this.startTime = 0;
    this.changeCount = 0;
    this.trajectory = [];
  }
  start() {
    this.startTime = performance.now();
    this.changeCount = 0;
    this.trajectory = [];
  }
  recordChange(value) {
    this.changeCount++;
    this.trajectory.push({ t: performance.now() - this.startTime, value });
  }
  snapshot() {
    return {
      duration_ms: Math.round(performance.now() - this.startTime),
      change_count: this.changeCount,
      trajectory: this.trajectory.length ? this.trajectory : null,
    };
  }
}
