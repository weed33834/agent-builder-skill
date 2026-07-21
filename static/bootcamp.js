// 训练营(教官每日任务)—— 状态机 + API 调用 + 交互
// 复用 app.js:api(get/post 自动注入 X-User-Token)、getToken

const params = new URLSearchParams(location.search);
const resultId = params.get('result_id');
const GOAL_KEY = 'mm_bootcamp_goal';

// HTML 转义 —— 防止服务端任务数据(prompt/strict_prompt)注入 XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function is404(e) { return e && typeof e.message === 'string' && e.message.indexOf('404') === 0; }
function is401(e) { return e && typeof e.message === 'string' && e.message.indexOf('401') === 0; }

function readCachedGoal() {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

let state = {
  status: 'loading',   // loading | select | mission | done | error | empty
  goal: null,          // { trait_target, source_figure, ... }
  mission: null,       // { id, mission_date, tasks:[{id,prompt,strict_prompt,done}], ... }
  streak: 0,
  badge: false,
  reportTraits: null,  // { tags:[], figure:'' }
  error: null,
};
const expanded = new Set();   // 已展开 strict_prompt 的任务 id,渲染后恢复

// ===== 渲染 =====
function render() {
  const root = document.getElementById('bootcamp');
  if (!root) return;
  switch (state.status) {
    case 'loading': root.innerHTML = loadingHtml(); break;
    case 'select':  root.innerHTML = selectHtml(); break;
    case 'mission': root.innerHTML = missionHtml(); break;
    case 'done':    root.innerHTML = doneHtml(); break;
    case 'error':   root.innerHTML = errorHtml(); break;
    case 'empty':   root.innerHTML = emptyHtml(); break;
    default:        root.innerHTML = loadingHtml();
  }
  // 恢复 strict_prompt 展开态
  expanded.forEach(id => {
    const el = root.querySelector(`[data-strict="${id}"]`);
    const btn = root.querySelector(`[data-toggle-strict="${id}"]`);
    if (el) el.style.display = '';
    if (btn) btn.textContent = mmI18n.t('bootcamp.hide_strict');
  });
}

function loadingHtml() {
  return `
    <div class="loading-overlay" style="position:static;background:transparent">
      <div class="mirror-disc" data-clarity="high"></div>
      <p>${mmI18n.t('common.loading')}</p>
    </div>`;
}

function selectHtml() {
  // figure=id(后端校验),figureName=显示名(界面展示)
  const figure = (state.reportTraits && state.reportTraits.figure) || '';
  const figureName = (state.reportTraits && state.reportTraits.figureName) || '';
  // 6 个固定特质(对应后端 TraitTarget 枚举),data-trait 传英文枚举值,
  // 显示用 i18n.t 本地化标签。不再用 report.profile.tags(那是画像标签,非磨砺特质)。
  const TRAIT_KEYS = ['more_decisive', 'more_courageous', 'more_resolute', 'more_action', 'more_principled', 'more_focused'];
  const cards = TRAIT_KEYS.map(k => {
    const label = mmI18n.t(`bootcamp.traits.${k}`) || k;
    return `
      <div class="trait-card" data-trait="${escapeHtml(k)}" data-figure="${escapeHtml(figure)}">
        <h3>${escapeHtml(label)}</h3>
        <p class="trait-desc">${mmI18n.t('bootcamp.trait_desc')}</p>
        ${figureName ? `<p class="trait-inspire">${mmI18n.t('bootcamp.inspire', { figure: escapeHtml(figureName) })}</p>` : ''}
        <p class="trait-pick">${mmI18n.t('bootcamp.pick')}</p>
      </div>`;
  }).join('');
  return `
    <section class="bc-hero">
      <div class="bc-eyebrow">${mmI18n.t('bootcamp.eyebrow')}</div>
      <h2 class="bc-title">${mmI18n.t('bootcamp.select_title')}</h2>
      <p class="bc-select-sub">${mmI18n.t('bootcamp.select_sub')}</p>
    </section>
    <div class="trait-grid">${cards}</div>`;
}

function streakBlockHtml() {
  const s = state.streak || 0;
  const pct = Math.min(100, Math.max(0, (s / 7) * 100));
  const remaining = Math.max(0, 7 - s);
  const hint = remaining > 0
    ? mmI18n.t('bootcamp.badge_hint_progress', { n: remaining })
    : mmI18n.t('bootcamp.badge_hint');
  return `
    <div class="streak-block">
      <div class="streak-top">
        <div class="streak-num"><span class="num">${s}</span><span class="streak-unit">${mmI18n.t('bootcamp.streak_unit')}</span></div>
        <div class="badge-seal${state.badge ? '' : ' locked'}" title="${mmI18n.t('bootcamp.badge_short')}">${mmI18n.t('bootcamp.badge_short')}</div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div>
      <p class="streak-hint">${hint}</p>
    </div>`;
}

function taskCardHtml(t) {
  const idx = state.mission.tasks.indexOf(t) + 1;
  const done = !!t.done;
  return `
    <div class="task-card${done ? ' done' : ''}" data-task="${escapeHtml(t.id)}">
      <button class="task-check" type="button" data-complete="${escapeHtml(t.id)}" aria-pressed="${done}" aria-label="${mmI18n.t('bootcamp.task_prefix')} ${idx}">
        <span class="task-check-box">${done ? '✓' : ''}</span>
      </button>
      <div class="task-body">
        <div class="task-head">
          <span class="task-idx">${mmI18n.t('bootcamp.task_prefix')} ${idx}</span>
          ${done ? `<span class="task-done-tag">${mmI18n.t('bootcamp.done_tag')}</span>` : ''}
          <span class="task-syncing" data-syncing="${escapeHtml(t.id)}" style="display:none">${mmI18n.t('bootcamp.syncing')}</span>
        </div>
        <p class="task-prompt">${escapeHtml(t.prompt)}</p>
        <button class="task-strict-toggle" type="button" data-toggle-strict="${escapeHtml(t.id)}">${mmI18n.t('bootcamp.show_strict')}</button>
        <div class="task-strict" data-strict="${escapeHtml(t.id)}" style="display:none">
          <p class="task-strict-text">${escapeHtml(t.strict_prompt)}</p>
        </div>
        <div class="task-error" data-error="${escapeHtml(t.id)}" style="display:none"></div>
      </div>
    </div>`;
}

function missionHtml() {
  const m = state.mission;
  const tasks = (m.tasks || []).map(t => taskCardHtml(t)).join('');
  return `
    <section class="bc-hero">
      <div class="bc-eyebrow">${mmI18n.t('bootcamp.mission_eyebrow')}</div>
      <h2 class="bc-title">${mmI18n.t('bootcamp.mission_title')}</h2>
      <p class="bc-sub">${escapeHtml(state.goal ? (mmI18n.t(`bootcamp.traits.${state.goal.trait_target}`) || state.goal.trait_label || state.goal.trait_target || '') : '')} · ${mmI18n.t('bootcamp.account')}</p>
    </section>
    ${streakBlockHtml()}
    <div class="task-list">${tasks}</div>
    <div class="actions bc-share-row">
      <button class="btn-secondary" type="button" data-share="1">${mmI18n.t('bootcamp.share_btn')}</button>
    </div>`;
}

function doneHtml() {
  const s = state.streak || 0;
  return `
    <section class="bc-done">
      <div class="badge-seal${state.badge ? '' : ' locked'}">${mmI18n.t('bootcamp.badge_short')}</div>
      <h2 class="bc-done-title">${mmI18n.t('bootcamp.done_title')}</h2>
      <p class="bc-done-sub">${mmI18n.t('bootcamp.done_sub')}</p>
      <div class="streak-block">
        <div class="streak-top">
          <div class="streak-num"><span class="num">${s}</span><span class="streak-unit">${mmI18n.t('bootcamp.streak_unit')}</span></div>
        </div>
      </div>
      <div class="actions">
        <a href="/" class="btn-primary" data-i18n="bootcamp.tomorrow">${mmI18n.t('bootcamp.tomorrow')}</a>
        <a href="/report.html${resultId ? '?id=' + escapeHtml(resultId) : ''}" class="btn-secondary" data-i18n="bootcamp.result_link">${mmI18n.t('bootcamp.result_link')}</a>
        <a href="/compare.html" class="btn-secondary" data-i18n="compare.title">${mmI18n.t('compare.title')}</a>
        <button class="btn-secondary" type="button" data-share="1">${mmI18n.t('bootcamp.share_btn')}</button>
      </div>
    </section>`;
}

function errorHtml() {
  return `
    <div class="empty-state">
      <h2>${mmI18n.t('bootcamp.error_title')}</h2>
      <p>${escapeHtml(state.error || mmI18n.t('common.error_generic'))}</p>
      <p><button class="btn-primary" type="button" data-retry="1">${mmI18n.t('bootcamp.retry')}</button></p>
    </div>`;
}

function emptyHtml() {
  return `
    <div class="empty-state">
      <h2>${mmI18n.t('bootcamp.empty_title')}</h2>
      <p>${mmI18n.t('bootcamp.empty_sub')}</p>
      <p><a href="/report.html${resultId ? '?id=' + escapeHtml(resultId) : ''}" class="btn-primary" data-i18n="bootcamp.empty_cta">${mmI18n.t('bootcamp.empty_cta')}</a></p>
    </div>`;
}

// ===== 流程 =====
async function init() {
  // 返回链接带上 result_id
  const back = document.querySelector('.back-link');
  if (back) back.href = '/report.html' + (resultId ? '?id=' + resultId : '');

  state.status = 'loading'; render();
  try {
    const goal = await api.get('/api/goals/me');
    state.goal = goal;
    await enterMission();
  } catch (e) {
    if (is404(e)) { await enterSelect(); return; }
    // 401 未登录:若有 result_id 走 enterSelect 让匿名选型,否则提示登录
    if (is401(e)) {
      if (resultId) { await enterSelect(); return; }
      state.error = mmI18n.t('bootcamp.error_login_required');
      state.status = 'error'; render();
      return;
    }
    // 非 404/401(多为网络错误):尝试本地缓存 goal 兜底,否则报错
    const cached = readCachedGoal();
    if (cached) { state.goal = cached; await enterMission(); return; }
    state.error = mmI18n.t('common.error_generic');
    state.status = 'error'; render();
  }
}

async function enterSelect() {
  if (!resultId) {
    state.error = mmI18n.t('bootcamp.no_result');
    state.status = 'error'; render(); return;
  }
  try {
    const report = await api.get(`/api/results/${resultId}`);
    const tags = (report.profile && report.profile.tags) || [];
    // figure_id 用于后端 createGoal(source_figure) 校验(必须为 celebrity.yaml 的 id)
    // figure_name 用于界面展示("启发来源: 林肯")
    const topMatch = report.matches && report.matches[0];
    const figureId = (topMatch && topMatch.id) || '';
    const figureName = (topMatch && topMatch.name) || '';
    state.reportTraits = { tags, figure: figureId, figureName };
    state.status = 'select';
  } catch (e) {
    // 401/404 时给友好文案,不暴露原始 JSON
    if (is401(e) || is404(e)) {
      state.error = mmI18n.t('bootcamp.error_login_required');
    } else {
      state.error = mmI18n.t('common.error_generic');
    }
    state.status = 'error';
  }
  render();
}

async function enterMission() {
  state.status = 'loading'; render();
  try {
    const [mission, streak] = await Promise.all([
      api.get('/api/missions/today'),
      api.get('/api/missions/streak'),
    ]);
    state.mission = mission;
    // StreakOut schema: { current, longest, badge, last_completed_date }
    state.streak = (streak && streak.current) || 0;
    state.badge = !!(streak && streak.badge);
    if (!mission.tasks || mission.tasks.length === 0) {
      state.status = 'empty';
    } else if (mission.tasks.every(t => t.done)) {
      state.status = 'done';
    } else {
      state.status = 'mission';
    }
  } catch (e) {
    if (is404(e)) { state.status = 'empty'; }
    else if (is401(e)) { state.error = mmI18n.t('bootcamp.error_login_required'); state.status = 'error'; }
    else { state.error = mmI18n.t('common.error_generic'); state.status = 'error'; }
  }
  render();
}

async function createGoal(traitTarget, sourceFigure) {
  try {
    const goal = await api.post('/api/goals', {
      trait_target: traitTarget,
      source_figure: sourceFigure || undefined,
    });
    state.goal = goal;
  } catch (e) {
    state.error = is401(e) ? mmI18n.t('bootcamp.error_login_required') : mmI18n.t('common.error_generic');
    state.status = 'error'; render(); return;
  }
  // 本地缓存(离线兜底 / 避免重复选);服务端为权威
  try { localStorage.setItem(GOAL_KEY, JSON.stringify({ trait_target: traitTarget, source_figure: sourceFigure || '' })); } catch (e) {}
  await enterMission();
}

async function completeTask(taskId) {
  const m = state.mission;
  if (!m) return;
  const task = m.tasks.find(t => t.id === taskId);
  if (!task || task.done) return;
  const card = document.querySelector(`[data-task="${taskId}"]`);
  if (card && card.dataset.locked) return;   // 防双击竞态
  if (card) card.dataset.locked = '1';

  // 乐观更新:标记完成 + 显示"同步中"(不盲目 +1 streak,避免多任务重复计数)
  task.done = true;
  if (card) {
    card.classList.add('done');
    const box = card.querySelector('.task-check-box'); if (box) box.textContent = '✓';
    const btn = card.querySelector('.task-check'); if (btn) btn.setAttribute('aria-pressed', 'true');
  }
  showSyncing(taskId, true);

  try {
    const res = await api.post(`/api/missions/${m.id}/tasks/${taskId}/complete`, {});
    // 以响应为准对账(坑2:乐观 ≠ 后端 done)
    if (res && res.mission && Array.isArray(res.mission.tasks)) m.tasks = res.mission.tasks;
    // complete 响应:{ mission, streak: StreakOut },streak 是对象不是 number
    if (res && res.streak && typeof res.streak.current === 'number') state.streak = res.streak.current;
    if (res && res.streak && typeof res.streak.badge === 'boolean') state.badge = res.streak.badge;
    showSyncing(taskId, false);
    if (card) card.removeAttribute('data-locked');
    if (m.tasks.every(t => t.done)) {
      state.status = 'done';
      render();
    } else {
      updateStreakDom();   // 局部刷新 streak,保留 strict_prompt 展开态
    }
  } catch (e) {
    // 回滚
    task.done = false;
    if (card) {
      card.classList.remove('done');
      const box = card.querySelector('.task-check-box'); if (box) box.textContent = '';
      card.removeAttribute('data-locked');
    }
    showSyncing(taskId, false);
    showCardError(taskId, is401(e) ? mmI18n.t('bootcamp.error_login_required') : mmI18n.t('common.error_generic'));
  }
}

function showSyncing(taskId, on) {
  const el = document.querySelector(`[data-syncing="${taskId}"]`);
  if (el) el.style.display = on ? '' : 'none';
}
function showCardError(taskId, msg) {
  const el = document.querySelector(`[data-error="${taskId}"]`);
  if (el) { el.textContent = mmI18n.t('bootcamp.retry_hint', { msg }); el.style.display = ''; }
}
function updateStreakDom() {
  const block = document.querySelector('.streak-block');
  if (!block) { render(); return; }
  const s = state.streak || 0;
  const numEl = block.querySelector('.streak-num .num');
  if (numEl) numEl.textContent = s;
  const fill = block.querySelector('.progress-fill');
  if (fill) fill.style.width = Math.min(100, Math.max(0, (s / 7) * 100)) + '%';
  const hint = block.querySelector('.streak-hint');
  const remaining = Math.max(0, 7 - s);
  if (hint) hint.textContent = remaining > 0 ? mmI18n.t('bootcamp.badge_hint_progress', { n: remaining }) : mmI18n.t('bootcamp.badge_hint');
  const seal = block.querySelector('.badge-seal');
  if (seal) seal.classList.toggle('locked', !state.badge);
}

// ===== 分享卡（viral hook）=====
function shareCard() {
  if (!state.goal) {
    state.error = mmI18n.t('bootcamp.share_no_data');
    state.status = 'error'; render(); return;
  }
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // 宣纸底 + 朱墨边框
  ctx.fillStyle = '#f3ece0'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#8b2e1f'; ctx.lineWidth = 8; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.textAlign = 'center';
  // 标题
  ctx.fillStyle = '#2b2622'; ctx.font = '600 56px "Noto Serif SC", serif';
  ctx.fillText('心镜 · 铁血训练营', W / 2, 165);
  ctx.fillStyle = '#8b2e1f'; ctx.font = '400 30px "Noto Serif SC", serif';
  ctx.fillText('MindMirror Bootcamp', W / 2, 212);
  // 目标特质
  const trait = state.goal.trait_label || mmI18n.t('bootcamp.select_title');
  ctx.fillStyle = '#2b2622'; ctx.font = '700 84px "Noto Serif SC", serif';
  ctx.fillText(trait, W / 2, 430);
  ctx.fillStyle = '#6b6157'; ctx.font = '400 30px "Noto Serif SC", serif';
  ctx.fillText(mmI18n.t('bootcamp.mission_eyebrow'), W / 2, 478);
  // 连续天数（大字）
  const s = state.streak || 0;
  ctx.fillStyle = '#8b2e1f'; ctx.font = '800 200px "Noto Serif SC", serif';
  ctx.fillText(String(s), W / 2, 760);
  ctx.fillStyle = '#2b2622'; ctx.font = '400 34px "Noto Serif SC", serif';
  const sub = state.badge
    ? mmI18n.t('bootcamp.badge_short')
    : mmI18n.t('bootcamp.badge_hint_progress', { n: Math.max(0, 7 - s) });
  ctx.fillText(mmI18n.t('bootcamp.streak_unit') + ' · ' + sub, W / 2, 830);
  // 分隔线
  ctx.strokeStyle = '#d8cdbb'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, 900); ctx.lineTo(W - 120, 900); ctx.stroke();
  // 文案
  ctx.fillStyle = '#6b6157'; ctx.font = '400 30px "Noto Serif SC", serif';
  ctx.fillText(mmI18n.t('bootcamp.share_hint'), W / 2, 980);
  // 页脚日期
  ctx.fillStyle = '#8b2e1f'; ctx.font = '400 28px "Noto Serif SC", serif';
  const d = new Date();
  const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  ctx.fillText('心镜 MindMirror · ' + ds, W / 2, 1240);

  showShareOverlay(c.toDataURL('image/png'));
}

function showShareOverlay(url) {
  let ov = document.getElementById('share-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'share-overlay';
    ov.className = 'share-overlay';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div class="share-modal">
      <h3>${escapeHtml(mmI18n.t('bootcamp.share_title'))}</h3>
      <img class="share-img" src="${url}" alt="share card" />
      <div class="share-actions">
        <button class="btn-primary" type="button" data-share-save="1">${escapeHtml(mmI18n.t('bootcamp.share_save'))}</button>
        <button class="btn-secondary" type="button" data-share-via="1">${escapeHtml(mmI18n.t('bootcamp.share_via'))}</button>
        <button class="btn-ghost" type="button" data-share-close="1">×</button>
      </div>
    </div>`;
  ov.style.display = 'flex';
  ov.onclick = (e) => {
    if (e.target === ov || e.target.dataset.shareClose) ov.style.display = 'none';
    else if (e.target.dataset.shareSave) downloadDataUrl(url, 'mindmirror-bootcamp.png');
    else if (e.target.dataset.shareVia) shareViaWeb(url);
  };
}

function downloadDataUrl(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

async function shareViaWeb(url) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], 'mindmirror-bootcamp.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: mmI18n.t('bootcamp.share_title'),
        text: mmI18n.t('bootcamp.share_hint'),
      });
      return;
    }
  } catch (e) { /* 用户取消或非安全上下文,回落下载 */ }
  downloadDataUrl(url, 'mindmirror-bootcamp.png');
}

// ===== 事件委托 =====
function onBootcampClick(e) {
  const t = e.target.closest ? e.target : (e.target.parentNode || null);
  const trait = t && t.closest ? t.closest('[data-trait]') : null;
  if (trait) { createGoal(trait.dataset.trait, trait.dataset.figure || ''); return; }
  const check = t && t.closest ? t.closest('[data-complete]') : null;
  if (check) { completeTask(check.dataset.complete); return; }
  const toggle = t && t.closest ? t.closest('[data-toggle-strict]') : null;
  if (toggle) { toggleStrict(toggle.dataset.toggleStrict); return; }
  const retry = t && t.closest ? t.closest('[data-retry]') : null;
  if (retry) { retryAction(); return; }
  const share = t && t.closest ? t.closest('[data-share]') : null;
  if (share) { shareCard(); return; }
}
function toggleStrict(taskId) {
  const el = document.querySelector(`[data-strict="${taskId}"]`);
  const btn = document.querySelector(`[data-toggle-strict="${taskId}"]`);
  if (!el || !btn) return;
  const open = el.style.display === 'none';
  el.style.display = open ? '' : 'none';
  btn.textContent = open ? mmI18n.t('bootcamp.hide_strict') : mmI18n.t('bootcamp.show_strict');
  if (open) expanded.add(taskId); else expanded.delete(taskId);
}
function retryAction() { init(); }

document.getElementById('bootcamp').addEventListener('click', onBootcampClick);
window.__mmBootcampRerender = render;
init();
