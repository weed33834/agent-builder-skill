// 心镜 MindMirror 前端 —— API 客户端 + 行为轨迹采集 + 通用 UI 工具

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

// 默认请求超时(毫秒) —— 测评提交可传更长 timeout 覆盖
const API_DEFAULT_TIMEOUT = 15000;

/**
 * 带 timeout 的 fetch 封装
 * - 超时抛 TimeoutError(message 形如 "timeout 15000ms")
 * - 非网络错误统一抛 Error(`${status} ${text}`)
 */
async function fetchWithTimeout(url, options = {}, timeout = API_DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    if (r.status === 401 && getJwt()) setJwt('');  // 令牌失效则清掉,回退匿名
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`timeout ${timeout}ms`);
      err.name = 'TimeoutError';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// API 客户端 —— 有 JWT 带 Bearer,否则带匿名 X-User-Token
const api = {
  _headers(extra) {
    const h = Object.assign({}, extra);
    const jwt = getJwt();
    if (jwt) h['Authorization'] = 'Bearer ' + jwt;
    else h['X-User-Token'] = getToken();
    return h;
  },
  async get(url, opts = {}) {
    const r = await fetchWithTimeout(url, { headers: this._headers({}) }, opts.timeout);
    return r.json();
  },
  async post(url, body, opts = {}) {
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    }, opts.timeout);
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

// ============================================================
// mmUI —— 通用 UI 工具:Toast / Inline Error / Loading
// 替代原生 alert(),提供沉浸式不打断的反馈
// 依赖:mmI18n(若未加载则用 fallback 文案)
// ============================================================
const mmUI = {
  /** 浮层 Toast:3 秒自动消失,可重复堆叠
   *  @param {string} msg 文案
   *  @param {'info'|'warn'|'error'} kind 样式
   */
  toast(msg, kind = 'info') {
    let host = document.getElementById('mm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mm-toast-host';
      host.className = 'mm-toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = `mm-toast mm-toast-${kind}`;
    t.textContent = msg;
    host.appendChild(t);
    // 入场动画
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3200);
  },

  /** 在指定容器内显示 inline 错误提示(替代 alert 阻断式)
   *  @param {HTMLElement} container 容器
   *  @param {string} msg 文案
   *  @param {string} [key] 复用同 key 时只更新不新增
   */
  inlineError(container, msg, key = 'default') {
    if (!container) return;
    let el = container.querySelector(`.mm-inline-error[data-key="${key}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'mm-inline-error';
      el.dataset.key = key;
      el.setAttribute('role', 'alert');
      container.prepend(el);
    }
    el.textContent = msg;
    // 4 秒后自动消失
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 4000);
  },

  /** 通用错误提示:根据 Error 对象的 message 智能选 toast 还是 inline
   *  - timeout / 网络错误 → toast
   *  - 其他 → inline(若容器存在),否则 toast
   */
  notifyError(err, container = null, key = 'default') {
    const t = (typeof mmI18n !== 'undefined') ? mmI18n : null;
    let msg;
    let kind = 'error';
    if (err && err.name === 'TimeoutError') {
      msg = t ? t.t('common.err_timeout') : '请求超时,请稍后重试';
      kind = 'warn';
    } else if (err && err.message && err.message.startsWith('timeout')) {
      msg = t ? t.t('common.err_timeout') : '请求超时,请稍后重试';
      kind = 'warn';
    } else if (!navigator.onLine) {
      msg = t ? t.t('common.err_offline') : '网络已断开';
      kind = 'warn';
    } else {
      msg = (t ? t.t('common.error_generic') : '出现了一点意外');
    }
    if (container && kind === 'error') {
      this.inlineError(container, msg, key);
    } else {
      this.toast(msg, kind);
    }
  },
};

// ============================================================
// Service Worker 注册 —— 仅在生产环境(非 localhost)注册,
// 避免开发时缓存干扰调试
// ============================================================
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 注册失败静默,不影响主流程
    });
  });
}
