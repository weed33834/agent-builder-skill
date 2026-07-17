// 心镜 MindMirror 前端 —— API 客户端 + 行为轨迹采集

// 用户 token(本地存,首访自动生成)
const TOKEN_KEY = 'mindmirror_token';
function getToken() {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) { t = crypto.randomUUID(); localStorage.setItem(TOKEN_KEY, t); }
  return t;
}

// JWT(真实登录)存于此 key;存在时请求带 Bearer,否则回退匿名 uuid
const JWT_KEY = 'mindmirror_jwt';
function getJwt() { return localStorage.getItem(JWT_KEY) || ''; }
function setJwt(t) { if (t) localStorage.setItem(JWT_KEY, t); else localStorage.removeItem(JWT_KEY); }

// API 客户端 —— 有 JWT 带 Bearer,否则带匿名 X-User-Token
const api = {
  _headers(extra) {
    const h = Object.assign({}, extra);
    const jwt = getJwt();
    if (jwt) h['Authorization'] = 'Bearer ' + jwt;
    else h['X-User-Token'] = getToken();
    return h;
  },
  async get(url) {
    const r = await fetch(url, { headers: this._headers({}) });
    if (r.status === 401 && getJwt()) setJwt('');  // 令牌失效则清掉,回退匿名
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    });
    if (r.status === 401 && getJwt()) setJwt('');
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
