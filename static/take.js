// 答题页逻辑 —— 题型渲染 + 行为轨迹采集 + 提交

const params = new URLSearchParams(location.search);
const type = params.get('type');
// 测评版本:fast=快速 / standard=标准 / deep=深度;默认 standard
// 通过 URL ?version=fast 传入,供首页版本选择器或测试用
const version = ['fast', 'standard', 'deep'].includes(params.get('version'))
  ? params.get('version') : 'standard';

let bank, session, tracker;
let currentIdx = 0;
let lastType = null;
const answers = [];
let timerInterval = null;
let rhythmInterval = null;

// HTML 转义 —— 防止服务端题库数据(题干、选项、ID 等)注入 XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fisher-Yates 洗牌 —— 等概率随机打乱(替代 sort(random-0.5) 的有偏分布)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 题型展示信息 —— 从 i18n 资源动态取
function typeMeta(type) {
  return {
    name: mmI18n.t(`take.type_label.${type}`) || type,
    section: mmI18n.t(`take.type_label.${type}`) || type,
    hint: mmI18n.t('take.section_intro_default'),
  };
}

// 预计算:每种题型的题号分布 {type: [globalIdx, ...]} 与计数
function buildTypeIndex(questions) {
  const idx = {};
  const count = {};
  questions.forEach((q, i) => {
    (idx[q.type] = idx[q.type] || []).push(i);
    count[q.type] = (count[q.type] || 0) + 1;
  });
  return { idx, count };
}

async function init() {
  if (!type) { location.href = '/'; return; }
  [bank, session] = await Promise.all([
    api.get(`/api/assessments/${type}/questions?version=${version}`),
    api.post(`/api/sessions?assessment_type=${type}&version=${version}`),
  ]);
  // 设置三镜主题色
  document.body.dataset.mirror = type;
  document.getElementById('title').textContent = mmI18n.t(`take.title_${type}`) || bank.title;
  bank._typeIndex = buildTypeIndex(bank.questions);
  tracker = new BehaviorTracker();

  // 有草稿 → 先弹确认页,再决定恢复或重开
  const draftCount = session.draft_answers ? Object.keys(session.draft_answers).length : 0;
  if (draftCount > 0) {
    showDraftResume(draftCount);
  } else {
    renderQuestion();
  }
}

// 草稿恢复确认覆盖层 —— 告知进度,让用户选择继续或重开
function showDraftResume(draftCount) {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay draft-resume';
  overlay.innerHTML = `
    <div class="mirror-disc" data-clarity="low"></div>
    <p>${mmI18n.t('take.draft_resume_title', { n: draftCount })}</p>
    <p class="loading-sub">${mmI18n.t('take.draft_resume_sub')}</p>
    <div class="draft-actions">
      <button class="btn-primary" id="draft-continue" type="button">${mmI18n.t('take.draft_continue')}</button>
      <button class="btn-link" id="draft-restart" type="button">${mmI18n.t('take.draft_restart')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#draft-continue').addEventListener('click', () => {
    restoreDraft();
    overlay.remove();
    renderQuestion();
  });
  overlay.querySelector('#draft-restart').addEventListener('click', async () => {
    overlay.querySelector('.draft-actions').style.display = 'none';
    // 调后端放弃草稿 + 新建会话
    session = await api.post(`/api/sessions?assessment_type=${type}&restart=true`);
    overlay.remove();
    renderQuestion();
  });
}

// 从 session.draft_answers 恢复答案 + 行为轨迹
function restoreDraft() {
  if (!session.draft_answers) return;
  const beh = session.behavior_log || {};
  // 按题目 ID 映射到对应位置(而非顺序追加),避免草稿不连续导致 answers 与 currentIdx 错位
  bank.questions.forEach((q, i) => {
    if (session.draft_answers[q.id]) {
      const b = beh[q.id] || {};
      answers[i] = {
        question_id: q.id,
        answer: session.draft_answers[q.id],
        duration_ms: b.duration_ms || 0,
        change_count: b.change_count || 0,
        trajectory: b.trajectory || null,
      };
    }
  });
  // 定位第一道未答题作为 currentIdx;全部已答则指向末尾触发提交
  currentIdx = bank.questions.findIndex((q, i) => !answers[i]);
  if (currentIdx < 0) currentIdx = bank.questions.length;
}

function renderQuestion() {
  if (currentIdx >= bank.questions.length) {
    submitAll(true);
    return;
  }
  const q = bank.questions[currentIdx];
  const pct = (currentIdx / bank.questions.length) * 100;
  document.getElementById('progress').style.width = pct + '%';

  // 顶部 i18n 提示(非中文时显示)
  updateI18nNotice();

  // 题型内进度:当前题型中第几题 / 该题型总数
  const ti = bank._typeIndex;
  const typeList = ti.idx[q.type] || [];
  const posInType = typeList.indexOf(currentIdx) + 1;
  const typeCount = ti.count[q.type] || 0;
  const meta = typeMeta(q.type);

  document.getElementById('progress-text').innerHTML =
    `<span class="num">${currentIdx + 1}</span> / ${bank.questions.length}`
    + ` <span class="type-badge">${meta.name} ${posInType}/${typeCount}</span>`;
  const area = document.getElementById('question-area');

  // 题型切换 → 显示分段过渡卡(此时不启动计时与轨迹)
  const isSectionBreak = (lastType !== q.type);
  if (isSectionBreak) {
    clearInterval(timerInterval);
    document.getElementById('timer').style.display = 'none';
    area.innerHTML = `
      <div class="section-intro">
        <div class="section-eyebrow">${mmI18n.t('take.section_label', { n: phaseNumber(q.type, ti) })}</div>
        <h2 class="section-title">${meta.section}</h2>
        <p class="section-hint">${meta.hint}</p>
        <button class="btn-primary section-start" type="button" data-i18n="common.start">${mmI18n.t('common.start')}</button>
      </div>`;
    lastType = q.type;
    document.querySelector('.section-start').addEventListener('click', () => {
      area.innerHTML = '';
      renderCurrent(q);
    });
  } else {
    renderCurrent(q);
  }
}

// i18n 提示显示控制
function updateI18nNotice() {
  const notice = document.getElementById('i18n-notice');
  if (!notice) return;
  if (mmI18n.lang !== 'zh') {
    notice.textContent = mmI18n.t('common.notice_i18n_partial');
    notice.style.display = '';
  } else {
    notice.style.display = 'none';
  }
}

// 当前题型的"第几部分"(按题型出现顺序)
function phaseNumber(type, ti) {
  const order = Object.keys(ti.idx);
  return order.indexOf(type) + 1;
}

// 局部刷新:仅更新进度/题型徽章(不重渲染题目,避免丢失答案)
function refreshI18n() {
  if (!bank) return;
  const q = bank.questions[currentIdx];
  if (!q) return;
  const ti = bank._typeIndex;
  const typeList = ti.idx[q.type] || [];
  const posInType = typeList.indexOf(currentIdx) + 1;
  const typeCount = ti.count[q.type] || 0;
  const meta = typeMeta(q.type);

  // 顶部 i18n 提示(非中文时显示)
  updateI18nNotice();

  document.getElementById('progress-text').innerHTML =
    `<span class="num">${currentIdx + 1}</span> / ${bank.questions.length}`
    + ` <span class="type-badge">${meta.name} ${posInType}/${typeCount}</span>`;
  // 如果当前在分段过渡卡,也更新
  const introEyebrow = document.querySelector('.section-eyebrow');
  const introTitle = document.querySelector('.section-title');
  const introHint = document.querySelector('.section-hint');
  const introStart = document.querySelector('.section-start');
  if (introEyebrow) introEyebrow.textContent = mmI18n.t('take.section_label', { n: phaseNumber(q.type, ti) });
  if (introTitle) introTitle.textContent = meta.section;
  if (introHint) introHint.textContent = meta.hint;
  if (introStart) introStart.textContent = mmI18n.t('common.start');
}

function renderCurrent(q) {
  const area = document.getElementById('question-area');
  const renderers = {
    scale: renderScale, dilemma: renderDilemma, allocation: renderAllocation,
    sort: renderSort, iat: renderIAT,
    slider: renderSlider, forced_choice: renderForcedChoice, matrix: renderMatrix, auction: renderAuction,
  };
  area.innerHTML = renderers[q.type](q);
  setupTimer(q);
  tracker.start();
  startRhythmBar();
  bindEvents(q);
}

function startRhythmBar() {
  const bar = document.getElementById('rhythm-bar');
  const timeEl = document.getElementById('rhythm-time');
  const changeEl = document.getElementById('rhythm-changes');
  if (!bar) return;
  bar.style.display = '';
  bar.classList.remove('peak');
  clearInterval(rhythmInterval);
  const tick = () => {
    const snap = tracker.snapshot();
    const sec = Math.round(snap.duration_ms / 1000);
    timeEl.textContent = sec + 's';
    changeEl.textContent = snap.change_count > 0 ? '×' + snap.change_count : '';
    bar.classList.toggle('peak', sec >= 8);
  };
  tick();
  rhythmInterval = setInterval(tick, 200);
}

function stopRhythmBar() {
  clearInterval(rhythmInterval);
  const bar = document.getElementById('rhythm-bar');
  if (bar) bar.style.display = 'none';
}

function setupTimer(q) {
  const el = document.getElementById('timer');
  // IAT 题自控节奏,不走单题倒计时
  if (!q.time_limit_sec || q.type === 'iat') {
    el.style.display = 'none';
    clearInterval(timerInterval);
    return;
  }
  el.style.display = 'block';
  const total = q.time_limit_sec;
  let remaining = total;
  const fill = el.querySelector('.fill');
  const numEl = el.querySelector('.num');
  const CIRC = 175.93; // 2 * π * 28
  const update = () => {
    numEl.textContent = remaining;
    const ratio = remaining / total;
    fill.style.strokeDashoffset = CIRC * (1 - ratio);
    el.classList.toggle('urgent', remaining <= 5);
  };
  update();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remaining--;
    update();
    if (remaining <= 0) {
      clearInterval(timerInterval);
      recordAnswer(q, getCurrentAnswer(q), true);
    }
  }, 1000);
}

// ===== 题型渲染 =====
function renderScale(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <div class="scale-points" data-q="${escapeHtml(q.id)}">
        ${q.points.map(p => `<div class="scale-point" data-id="${escapeHtml(p.id)}">${escapeHtml(p.text)}</div>`).join('')}
      </div>
    </div>`;
}

function renderDilemma(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <div class="scenario">${escapeHtml(q.scenario)}</div>
      <div class="options" data-q="${escapeHtml(q.id)}">
        ${q.options.map(o => `<div class="option" data-id="${escapeHtml(o.id)}">${escapeHtml(o.text)}</div>`).join('')}
      </div>
      ${q.historical_figure ? `<p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-top:32px;letter-spacing:0.1em;text-align:center">${mmI18n.t('take.dilemma_historical', { figure: escapeHtml(q.historical_figure) })}</p>` : ''}
    </div>`;
}

function renderAllocation(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">${mmI18n.t('take.alloc_hint', { total: escapeHtml(q.total) })}</p>
      <div data-q="${escapeHtml(q.id)}" class="alloc-list">
        ${q.targets.map(t => `
          <div class="alloc-row" data-id="${escapeHtml(t.id)}">
            <div class="alloc-head">
              <label>${escapeHtml(t.text)}</label>
              <div class="alloc-controls">
                <button class="alloc-btn" data-delta="-10" aria-label="${mmI18n.t('take.btn_minus', { n: 10 })}">−10</button>
                <button class="alloc-btn" data-delta="-1" aria-label="${mmI18n.t('take.btn_minus', { n: 1 })}">−1</button>
                <span class="val">0</span>
                <button class="alloc-btn" data-delta="1" aria-label="${mmI18n.t('take.btn_plus', { n: 1 })}">+1</button>
                <button class="alloc-btn" data-delta="10" aria-label="${mmI18n.t('take.btn_plus', { n: 10 })}">+10</button>
              </div>
            </div>
            <div class="alloc-bar"><div class="alloc-bar-fill" style="width:0%"></div></div>
            <input type="range" min="0" max="${escapeHtml(q.total)}" value="0" data-id="${escapeHtml(t.id)}" aria-label="${escapeHtml(t.text)}">
          </div>
        `).join('')}
        <div class="alloc-total">
          <span>${mmI18n.t('take.total_label')}</span>
          <span class="num">0</span>
          <span class="sep">/</span>
          <span class="target">${escapeHtml(q.total)}</span>
          <button class="alloc-balance" id="alloc-balance" type="button">${mmI18n.t('take.auto_balance')}</button>
        </div>
      </div>
      <button class="btn-primary" id="alloc-confirm" style="margin-top:40px;display:block;width:100%">${mmI18n.t('common.confirm')}</button>
    </div>`;
}

function renderSort(q) {
  // Fisher-Yates 洗牌,等概率打乱选项顺序
  const shuffled = shuffle(q.items);
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">${mmI18n.t('take.sort_hint')}</p>
      <div class="sort-list" data-q="${escapeHtml(q.id)}">
        ${shuffled.map((it, i) => `<div class="sort-item" data-id="${escapeHtml(it.id)}" draggable="true"><div class="sort-controls"><button class="sort-move" data-dir="up" aria-label="${mmI18n.t('take.sort_move_up')}">▲</button><button class="sort-move" data-dir="down" aria-label="${mmI18n.t('take.sort_move_down')}">▼</button></div><span class="order">${i+1}</span><span class="sort-text">${escapeHtml(it.text)}</span></div>`).join('')}
      </div>
      <button class="btn-primary" id="sort-confirm" style="margin-top:40px;display:block;width:100%">${mmI18n.t('common.confirm')}</button>
    </div>`;
}

function renderIAT(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--ink-faint);font-size:13px;text-align:center;letter-spacing:0.15em;margin-bottom:20px">${mmI18n.t('take.iat_hint')}</p>
      <div class="iat-area" data-q="${escapeHtml(q.id)}">
        <div class="iat-labels">
          <span>← ${escapeHtml(q.left_label)}</span>
          <span>${escapeHtml(q.right_label)} →</span>
        </div>
        <div class="iat-word" id="iat-word"><span class="iat-fixation">+</span></div>
        <div class="iat-buttons">
          <button class="iat-btn" id="iat-left">${escapeHtml(q.left_label)}</button>
          <button class="iat-btn" id="iat-right">${escapeHtml(q.right_label)}</button>
        </div>
        <div class="iat-progress"><span id="iat-progress">0 / ${q.words.length}</span></div>
      </div>
    </div>`;
}

function renderSlider(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:40px;letter-spacing:0.1em;text-align:center">${mmI18n.t('take.slider_hint')}</p>
      <div class="slider-area" data-q="${escapeHtml(q.id)}">
        <div class="slider-value" id="slider-value">50</div>
        <div class="slider-track-wrap">
          <input type="range" min="0" max="100" value="50" id="slider-input" class="slider-input" aria-label="${mmI18n.t('take.slider_aria')}">
          <div class="slider-fill" id="slider-fill"></div>
        </div>
        <div class="slider-labels">
          <span>${escapeHtml(q.left_label)}</span>
          <span>${escapeHtml(q.right_label)}</span>
        </div>
        <button class="btn-primary" id="slider-confirm" style="margin-top:40px;display:block;width:100%">${mmI18n.t('common.confirm')}</button>
      </div>
    </div>`;
}

function renderForcedChoice(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:40px;letter-spacing:0.1em;text-align:center">${mmI18n.t('take.forced_choice_hint')}</p>
      <div class="fc-area" data-q="${escapeHtml(q.id)}">
        <div class="fc-cards">
          ${q.sides.map((s, i) => `
            <div class="fc-card" data-id="${escapeHtml(s.id)}">
              <div class="fc-letter">${String.fromCharCode(65 + i)}</div>
              <div class="fc-text">${escapeHtml(s.text)}</div>
            </div>
          `).join('')}
        </div>
        <div class="fc-vs">VS</div>
      </div>
    </div>`;
}

function renderMatrix(q) {
  const smax = q.scale_max || 7;
  // 同意度标签从 i18n 资源取(三语),数组长度固定 7
  const labels = mmI18n.t('take.matrix_labels');
  const leftAnchor = labels[0];
  const rightAnchor = labels[smax - 1];
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">${mmI18n.t('take.matrix_hint')}</p>
      <div class="matrix-area" data-q="${escapeHtml(q.id)}">
        <div class="matrix-header">
          <span></span>
          <div>
            <div class="matrix-anchors">
              <span>${leftAnchor}</span>
              <span>${rightAnchor}</span>
            </div>
            <div class="matrix-scale-labels">
              ${labels.slice(0, smax).map((l, i) => `<span>${i+1}</span>`).join('')}
            </div>
          </div>
        </div>
        ${q.statements.map(s => `
          <div class="matrix-row" data-id="${escapeHtml(s.id)}">
            <div class="matrix-text">${escapeHtml(s.text)}</div>
            <div class="matrix-scale">
              ${Array.from({length: smax}, (_, i) => `<div class="matrix-dot" data-val="${i+1}"></div>`).join('')}
            </div>
          </div>
        `).join('')}
        <button class="btn-primary" id="matrix-confirm" style="margin-top:40px;display:block;width:100%">${mmI18n.t('common.confirm')}</button>
      </div>
    </div>`;
}

function renderAuction(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <div class="auction-area" data-q="${escapeHtml(q.id)}" data-budget="${escapeHtml(q.budget)}">
        <div class="auction-budget">
          <span>${mmI18n.t('take.auction_remaining')}</span>
          <span class="auction-remaining" id="auction-remaining">${escapeHtml(q.budget)}</span>
          <span>/ ${escapeHtml(q.budget)}</span>
        </div>
        ${q.items.map(it => `
          <div class="auction-row" data-id="${escapeHtml(it.id)}">
            <div class="auction-head">
              <label>${escapeHtml(it.text)}</label>
              <div class="alloc-controls">
                <button class="alloc-btn" data-delta="-10" aria-label="${mmI18n.t('take.btn_minus', { n: 10 })}">−10</button>
                <button class="alloc-btn" data-delta="-1" aria-label="${mmI18n.t('take.btn_minus', { n: 1 })}">−1</button>
                <span class="val">0</span>
                <button class="alloc-btn" data-delta="1" aria-label="${mmI18n.t('take.btn_plus', { n: 1 })}">+1</button>
                <button class="alloc-btn" data-delta="10" aria-label="${mmI18n.t('take.btn_plus', { n: 10 })}">+10</button>
              </div>
            </div>
            <div class="auction-bar"><div class="auction-bar-fill" style="width:0%"></div></div>
          </div>
        `).join('')}
        <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:13px;margin-top:24px;letter-spacing:0.1em;text-align:center">${mmI18n.t('take.auction_hint')}</p>
        <button class="btn-primary" id="auction-confirm" style="margin-top:32px;display:block;width:100%">${mmI18n.t('common.confirm')}</button>
      </div>
    </div>`;
}

// ===== 事件绑定 =====
function bindEvents(q) {
  if (q.type === 'scale' || q.type === 'dilemma') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    container.querySelectorAll('.scale-point, .option').forEach(el => {
      el.addEventListener('click', () => {
        if (container.dataset.locked) return;  // 防双击竞态
        container.dataset.locked = '1';
        container.querySelectorAll('.scale-point, .option').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        tracker.recordChange(el.dataset.id);
        setTimeout(() => recordAnswer(q, { option_id: el.dataset.id }), 300);
      });
    });
  } else if (q.type === 'allocation') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    const total = q.total;

    const setRow = (row, newVal) => {
      newVal = Math.max(0, Math.min(total, newVal));
      const input = row.querySelector('input[type=range]');
      input.value = newVal;
      row.querySelector('.val').textContent = newVal;
      row.querySelector('.alloc-bar-fill').style.width = (newVal / total * 100) + '%';
      updateSum();
    };
    const updateSum = () => {
      const rows = [...container.querySelectorAll('.alloc-row')];
      const sum = rows.reduce((s, r) => s + +r.querySelector('input[type=range]').value, 0);
      const sumEl = container.querySelector('.alloc-total');
      sumEl.querySelector('.num').textContent = sum;
      sumEl.classList.toggle('ok', sum === total);
      sumEl.classList.toggle('over', sum > total);
      // 标记最大值行为 peak(并列取第一个)
      let maxRow = null, maxVal = 0;
      rows.forEach(r => {
        const v = +r.querySelector('input[type=range]').value;
        if (v > maxVal) { maxVal = v; maxRow = r; }
      });
      rows.forEach(r => r.classList.toggle('peak', r === maxRow && maxVal > 0));
    };

    // 滑块拖动
    container.querySelectorAll('input[type=range]').forEach(input => {
      input.addEventListener('input', () => {
        const row = input.closest('.alloc-row');
        setRow(row, +input.value);
        tracker.recordChange(+input.value);
      });
    });
    // ±1 / ±10 按钮
    container.querySelectorAll('.alloc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.alloc-row');
        const input = row.querySelector('input[type=range]');
        setRow(row, +input.value + (+btn.dataset.delta));
        tracker.recordChange(+input.value);
      });
    });
    // 自动配平 —— 按比例分摊差值,迭代直到配平
    document.getElementById('alloc-balance').addEventListener('click', () => {
      const inputs = [...container.querySelectorAll('input[type=range]')];
      let sum = inputs.reduce((s, i) => s + +i.value, 0);
      let diff = total - sum;
      if (diff === 0) return;
      // 差值为正:补到最大项;差值为负:从最大项扣,不够则继续扣次大项
      let guard = 0;
      while (diff !== 0 && guard++ < inputs.length + 2) {
        // 找当前最大项
        let target = inputs[0];
        for (const i of inputs) if (+i.value > +target.value) target = i;
        const cur = +target.value;
        const newVal = Math.max(0, Math.min(total, cur + diff));
        const actual = newVal - cur;
        diff -= actual;
        const row = target.closest('.alloc-row');
        setRow(row, newVal);
        tracker.recordChange(newVal);
      }
    });

    document.getElementById('alloc-confirm').addEventListener('click', () => {
      const alloc = {};
      container.querySelectorAll('input[type=range]').forEach(i => { alloc[i.dataset.id] = +i.value; });
      const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
      if (sum !== total) { mmUI.toast(mmI18n.t('take.alert_alloc_sum', { total, sum }), 'warn'); return; }
      recordAnswer(q, { allocation: alloc });
    });
  } else if (q.type === 'sort') {
    const list = document.querySelector(`[data-q="${q.id}"]`);
    let dragEl = null;
    list.querySelectorAll('.sort-item').forEach(item => {
      item.addEventListener('dragstart', () => { dragEl = item; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); reorder(list); tracker.recordChange([...list.children].map(c => c.dataset.id)); });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        const after = getDragAfter(list, e.clientY);
        if (after == null) list.appendChild(dragEl);
        else list.insertBefore(dragEl, after);
      });
    });
    // 触屏 fallback:上/下移动按钮
    list.querySelectorAll('.sort-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.sort-item');
        if (btn.dataset.dir === 'up' && item.previousElementSibling) {
          list.insertBefore(item, item.previousElementSibling);
        } else if (btn.dataset.dir === 'down' && item.nextElementSibling) {
          list.insertBefore(item, item.nextElementSibling.nextElementSibling);
        }
        reorder(list);
        tracker.recordChange([...list.children].map(c => c.dataset.id));
      });
    });
    document.getElementById('sort-confirm').addEventListener('click', () => {
      const order = [...list.children].map(c => c.dataset.id);
      recordAnswer(q, { order });
    });
  } else if (q.type === 'slider') {
    const input = document.getElementById('slider-input');
    const valEl = document.getElementById('slider-value');
    const fill = document.getElementById('slider-fill');
    const update = () => {
      const v = +input.value;
      valEl.textContent = v;
      fill.style.width = v + '%';
    };
    update();
    input.addEventListener('input', () => { update(); tracker.recordChange(+input.value); input.dataset.touched = '1'; });
    document.getElementById('slider-confirm').addEventListener('click', () => {
      recordAnswer(q, { position: +input.value });
    });
  } else if (q.type === 'forced_choice') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    container.querySelectorAll('.fc-card').forEach(card => {
      card.addEventListener('click', () => {
        if (container.dataset.locked) return;  // 防双击竞态
        container.dataset.locked = '1';
        container.querySelectorAll('.fc-card').forEach(x => x.classList.remove('selected'));
        card.classList.add('selected');
        tracker.recordChange(card.dataset.id);
        setTimeout(() => recordAnswer(q, { choice: card.dataset.id }), 350);
      });
    });
  } else if (q.type === 'matrix') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    container.querySelectorAll('.matrix-row').forEach(row => {
      row.querySelectorAll('.matrix-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          const val = +dot.dataset.val;
          row.querySelectorAll('.matrix-dot').forEach(d => d.classList.remove('selected'));
          // 填充到选中位置
          row.querySelectorAll('.matrix-dot').forEach(d => {
            if (+d.dataset.val <= val) d.classList.add('selected');
          });
          row.dataset.val = val;
          tracker.recordChange(val);
        });
      });
    });
    document.getElementById('matrix-confirm').addEventListener('click', () => {
      const ratings = {};
      let allDone = true;
      container.querySelectorAll('.matrix-row').forEach(row => {
        if (row.dataset.val) ratings[row.dataset.id] = +row.dataset.val;
        else allDone = false;
      });
      if (!allDone) { mmUI.toast(mmI18n.t('take.alert_matrix_incomplete'), 'warn'); return; }
      recordAnswer(q, { ratings });
    });
  } else if (q.type === 'auction') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    const budget = q.budget;
    const remainingEl = document.getElementById('auction-remaining');

    const getSum = () => {
      let sum = 0;
      container.querySelectorAll('.auction-row').forEach(r => { sum += +(r.querySelector('.val').textContent); });
      return sum;
    };
    const updateRemaining = () => {
      const sum = getSum();
      const rem = budget - sum;
      remainingEl.textContent = rem;
      remainingEl.parentElement.classList.toggle('over', rem < 0);
      remainingEl.parentElement.classList.toggle('ok', rem === 0);
      // 找到当前最高出价,用于 peak 高亮
      let maxVal = 0;
      container.querySelectorAll('.auction-row').forEach(r => {
        const v = +(r.querySelector('.val').textContent);
        if (v > maxVal) maxVal = v;
      });
      // 条形按预算比例 + peak 标记
      container.querySelectorAll('.auction-row').forEach(r => {
        const v = +(r.querySelector('.val').textContent);
        r.querySelector('.auction-bar-fill').style.width = (v / budget * 100) + '%';
        r.classList.toggle('peak', v > 0 && v === maxVal);
      });
    };
    const setRow = (row, newVal) => {
      // 不允许单行超过剩余预算(含已分配)
      const others = getSum() - +(row.querySelector('.val').textContent);
      const maxAllowed = budget - others;
      newVal = Math.max(0, Math.min(maxAllowed, newVal));
      row.querySelector('.val').textContent = newVal;
      updateRemaining();
    };
    container.querySelectorAll('.alloc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.auction-row');
        const cur = +(row.querySelector('.val').textContent);
        setRow(row, cur + (+btn.dataset.delta));
        tracker.recordChange(cur);
      });
    });
    updateRemaining();
    document.getElementById('auction-confirm').addEventListener('click', () => {
      const bids = {};
      container.querySelectorAll('.auction-row').forEach(r => { bids[r.dataset.id] = +(r.querySelector('.val').textContent); });
      const sum = Object.values(bids).reduce((a, b) => a + b, 0);
      if (sum > budget) { mmUI.toast(mmI18n.t('take.alert_auction_over', { budget, sum }), 'warn'); return; }
      recordAnswer(q, { bids });
    });
  } else if (q.type === 'iat') {
    runIAT(q);
  }
}

function getDragAfter(container, y) {
  const els = [...container.querySelectorAll('.sort-item:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity }).element;
}

function reorder(list) {
  [...list.children].forEach((c, i) => c.querySelector('.order').textContent = i + 1);
}

function runIAT(q) {
  let idx = 0;
  let wordStart = 0;
  let canRespond = false;
  let currentErrored = false;  // 当前词是否已记录过错答,避免重复 push
  const reactions = [];
  const area = document.querySelector(`[data-q="${q.id}"]`);
  const wordEl = document.getElementById('iat-word');
  const progEl = document.getElementById('iat-progress');
  const leftBtn = document.getElementById('iat-left');
  const rightBtn = document.getElementById('iat-right');
  if (area) area._iatReactions = reactions;

  function showFixation() {
    canRespond = false;
    wordEl.innerHTML = '<span class="iat-fixation">+</span>';
  }

  function showWord(w) {
    wordEl.textContent = w.word;
    wordEl.style.animation = 'none';
    void wordEl.offsetWidth;
    wordEl.style.animation = '';
    wordStart = performance.now();
    canRespond = true;
    currentErrored = false;  // 新词展示 → 重置错答标记
  }

  function next() {
    if (idx >= q.words.length) { recordAnswer(q, { iat: reactions }); return; }
    const w = q.words[idx];
    progEl.textContent = `${idx + 1} / ${q.words.length}`;
    // 注视点 → 词汇(标准 IAT 流程)
    showFixation();
    setTimeout(() => showWord(w), 350);
  }

  function flashError(btn) {
    btn.classList.add('error');
    setTimeout(() => btn.classList.remove('error'), 400);
  }

  function classify(side) {
    if (!canRespond || idx >= q.words.length) return;
    const w = q.words[idx];
    const rt = performance.now() - wordStart;
    const correct = w.category === side;
    if (!correct) {
      // 错答:闪烁纠错,不推进;仅首次错答记录一次,避免重复反应堆积
      flashError(side === 'left' ? leftBtn : rightBtn);
      if (!currentErrored) {
        reactions.push({ word: w.word, category: w.category, response: side, rt: Math.round(rt), correct: false });
        currentErrored = true;
      }
      return;
    }
    reactions.push({ word: w.word, category: w.category, response: side, rt: Math.round(rt), correct: true });
    idx++;
    next();
  }

  leftBtn.onclick = () => classify('left');
  rightBtn.onclick = () => classify('right');

  // 键盘:用 addEventListener 便于精确移除
  const keyHandler = e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); classify('left'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); classify('right'); }
  };
  document.addEventListener('keydown', keyHandler);
  // 挂到 area 上供 recordAnswer 清理
  if (area) area._iatKeyHandler = keyHandler;

  next();
}

function getCurrentAnswer(q) {
  if (q.type === 'scale' || q.type === 'dilemma') {
    const sel = document.querySelector(`[data-q="${q.id}"] .selected`);
    return sel ? { option_id: sel.dataset.id } : {};
  }
  if (q.type === 'slider') {
    const input = document.getElementById('slider-input');
    // 未拖动过返回空,避免默认值 50 污染数据
    if (!input || !input.dataset.touched) return {};
    return { position: +input.value };
  }
  if (q.type === 'forced_choice') {
    const sel = document.querySelector(`[data-q="${q.id}"] .fc-card.selected`);
    return sel ? { choice: sel.dataset.id } : {};
  }
  if (q.type === 'matrix') {
    const ratings = {};
    document.querySelectorAll(`[data-q="${q.id}"] .matrix-row`).forEach(r => {
      if (r.dataset.val) ratings[r.dataset.id] = +r.dataset.val;
    });
    return Object.keys(ratings).length ? { ratings } : {};
  }
  if (q.type === 'auction') {
    const bids = {};
    let touched = false;
    document.querySelectorAll(`[data-q="${q.id}"] .auction-row`).forEach(r => {
      const val = +(r.querySelector('.val').textContent);
      if (val > 0) touched = true;
      bids[r.dataset.id] = val;
    });
    // 全 0 = 未操作,返回空避免污染
    return touched ? { bids } : {};
  }
  if (q.type === 'allocation') {
    const allocation = {};
    let touched = false;
    document.querySelectorAll(`[data-q="${q.id}"] .alloc-row`).forEach(r => {
      const val = +(r.querySelector('.val').textContent);
      if (val > 0) touched = true;
      allocation[r.dataset.id] = val;
    });
    return touched ? { allocation } : {};
  }
  if (q.type === 'sort') {
    const order = [];
    document.querySelectorAll(`[data-q="${q.id}"] .sort-item`).forEach(el => {
      order.push(el.dataset.id);
    });
    return order.length ? { order } : {};
  }
  if (q.type === 'iat') {
    const area = document.querySelector(`[data-q="${q.id}"]`);
    if (!area) return {};
    const reactions = area._iatReactions || [];
    return reactions.length ? { iat: reactions } : {};
  }
  return {};
}

async function recordAnswer(q, answer, timeout = false) {
  clearInterval(timerInterval);
  stopRhythmBar();
  // 清理 IAT 键盘监听(如果存在)
  const area = document.querySelector(`[data-q="${q.id}"]`);
  if (area && area._iatKeyHandler) {
    document.removeEventListener('keydown', area._iatKeyHandler);
    area._iatKeyHandler = null;
  }
  document.onkeydown = null;
  const snap = tracker.snapshot();
  if (timeout) snap.duration_ms = q.time_limit_sec * 1000 + 100;
  answers[currentIdx] = {
    question_id: q.id,
    answer,
    duration_ms: snap.duration_ms,
    change_count: snap.change_count,
    trajectory: snap.trajectory,
    _timeout: timeout,  // 标记超时,供 submitAll 保留
  };
  currentIdx++;
  // 存草稿 —— await 确保存盘完成;失败时提示用户(复用通用错误文案)
  await saveDraft(answers[currentIdx - 1]);
  renderQuestion();
}

// 草稿保存(被 recordAnswer await;失败时 toast 提示,随后继续渲染下一题)
async function saveDraft(answer) {
  try {
    await api.post(`/api/sessions/${session.id}/responses`, { answers: [answer], complete: false });
  } catch (e) {
    mmUI.notifyError(e);
  }
}

async function submitAll(complete) {
  // 保留:有答案的题 + 超时未操作的题(后者让后端能生成 timeout_instinct 冲突)
  const valid = answers.filter(a => a && (Object.keys(a.answer || {}).length > 0 || a._timeout));
  // 去掉内部标记字段,不传后端
  const payload = valid.map(({ _timeout, ...rest }) => rest);
  // loading 覆盖层
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="mirror-disc" data-clarity="high"></div>
    <p>${mmI18n.t('common.processing')}</p>
    <p class="loading-sub">${mmI18n.t('common.processing_sub')}</p>
  `;
  document.body.appendChild(overlay);
  try {
    // 提交测评允许较长超时(后端要做评分计算)
    const res = await api.post(`/api/sessions/${session.id}/responses`, { answers: payload, complete: true }, { timeout: 60000 });
    if (res && res.result_id) {
      location.href = `/report.html?id=${res.result_id}`;
    } else {
      overlay.remove();
      mmUI.toast(mmI18n.t('common.submit_failed'), 'error');
    }
  } catch (e) {
    overlay.remove();
    mmUI.notifyError(e, null, 'submit');
  }
}

init();
