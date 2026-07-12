// 答题页逻辑 —— 题型渲染 + 行为轨迹采集 + 提交

const params = new URLSearchParams(location.search);
const type = params.get('type');

let bank, session, tracker;
let currentIdx = 0;
const answers = [];
let timerInterval = null;

async function init() {
  if (!type) { location.href = '/'; return; }
  [bank, session] = await Promise.all([
    api.get(`/api/assessments/${type}/questions`),
    api.post(`/api/sessions?assessment_type=${type}`),
  ]);
  document.getElementById('title').textContent = bank.title;
  // 恢复草稿(含行为数据)
  if (session.draft_answers) {
    const beh = session.behavior_log || {};
    for (const q of bank.questions) {
      if (session.draft_answers[q.id]) {
        const b = beh[q.id] || {};
        answers.push({
          question_id: q.id,
          answer: session.draft_answers[q.id],
          duration_ms: b.duration_ms || 0,
          change_count: b.change_count || 0,
          trajectory: b.trajectory || null,
        });
        currentIdx++;
      }
    }
  }
  tracker = new BehaviorTracker();
  renderQuestion();
}

function renderQuestion() {
  if (currentIdx >= bank.questions.length) {
    submitAll(true);
    return;
  }
  const q = bank.questions[currentIdx];
  const pct = (currentIdx / bank.questions.length) * 100;
  document.getElementById('progress').style.width = pct + '%';
  document.getElementById('progress-text').innerHTML = `<span class="num">${currentIdx + 1}</span> / ${bank.questions.length}`;

  setupTimer(q);
  const area = document.getElementById('question-area');
  tracker.start();

  const renderers = { scale: renderScale, dilemma: renderDilemma, allocation: renderAllocation, sort: renderSort, iat: renderIAT };
  area.innerHTML = renderers[q.type](q);
  bindEvents(q);
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
      <div class="question-prompt">${q.prompt}</div>
      <div class="scale-points" data-q="${q.id}">
        ${q.points.map(p => `<div class="scale-point" data-id="${p.id}">${p.text}</div>`).join('')}
      </div>
    </div>`;
}

function renderDilemma(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <div class="scenario">${q.scenario}</div>
      <div class="options" data-q="${q.id}">
        ${q.options.map(o => `<div class="option" data-id="${o.id}">${o.text}</div>`).join('')}
      </div>
      ${q.historical_figure ? `<p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-top:32px;letter-spacing:0.1em;text-align:center">— 历史上,${q.historical_figure} 亦曾面对相似抉择</p>` : ''}
    </div>`;
}

function renderAllocation(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">分配总和须 = ${q.total} · 可用按钮或拖动滑块</p>
      <div data-q="${q.id}" class="alloc-list">
        ${q.targets.map(t => `
          <div class="alloc-row" data-id="${t.id}">
            <div class="alloc-head">
              <label>${t.text}</label>
              <div class="alloc-controls">
                <button class="alloc-btn" data-delta="-10" aria-label="减10">−10</button>
                <button class="alloc-btn" data-delta="-1" aria-label="减1">−1</button>
                <span class="val">0</span>
                <button class="alloc-btn" data-delta="1" aria-label="加1">+1</button>
                <button class="alloc-btn" data-delta="10" aria-label="加10">+10</button>
              </div>
            </div>
            <div class="alloc-bar"><div class="alloc-bar-fill" style="width:0%"></div></div>
            <input type="range" min="0" max="${q.total}" value="0" data-id="${t.id}" aria-label="${t.text}">
          </div>
        `).join('')}
        <div class="alloc-total">
          <span>总 计</span>
          <span class="num">0</span>
          <span class="sep">/</span>
          <span class="target">${q.total}</span>
          <button class="alloc-balance" id="alloc-balance" type="button">自 动 配 平</button>
        </div>
      </div>
      <button class="btn-primary" id="alloc-confirm" style="margin-top:40px;display:block;width:100%">确 认</button>
    </div>`;
}

function renderSort(q) {
  const shuffled = [...q.items].sort(() => Math.random() - 0.5);
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">拖拽排序,1 = 最重要</p>
      <div class="sort-list" data-q="${q.id}">
        ${shuffled.map((it, i) => `<div class="sort-item" data-id="${it.id}" draggable="true"><span class="order">${i+1}</span>${it.text}</div>`).join('')}
      </div>
      <button class="btn-primary" id="sort-confirm" style="margin-top:40px;display:block;width:100%">确 认 排 序</button>
    </div>`;
}

function renderIAT(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;text-align:center;letter-spacing:0.15em;margin-bottom:20px">凭直觉,越快越好</p>
      <div class="iat-area" data-q="${q.id}">
        <div class="iat-labels">
          <span>← ${q.left_label}</span>
          <span>${q.right_label} →</span>
        </div>
        <div class="iat-word" id="iat-word">准备</div>
        <div class="iat-buttons">
          <button class="iat-btn" id="iat-left">${q.left_label}</button>
          <button class="iat-btn" id="iat-right">${q.right_label}</button>
        </div>
        <div class="iat-progress"><span id="iat-progress">0 / ${q.words.length}</span></div>
      </div>
    </div>`;
}

// ===== 事件绑定 =====
function bindEvents(q) {
  if (q.type === 'scale' || q.type === 'dilemma') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    container.querySelectorAll('.scale-point, .option').forEach(el => {
      el.addEventListener('click', () => {
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
    // 自动配平 —— 把差值补到当前最大项(并列取第一个)
    document.getElementById('alloc-balance').addEventListener('click', () => {
      const inputs = [...container.querySelectorAll('input[type=range]')];
      const sum = inputs.reduce((s, i) => s + +i.value, 0);
      const diff = total - sum;
      if (diff === 0) return;
      // 加:补到最大项;减:从最大项扣
      let target = inputs[0];
      for (const i of inputs) if (+i.value > +target.value) target = i;
      const row = target.closest('.alloc-row');
      setRow(row, +target.value + diff);
      tracker.recordChange(+target.value);
    });

    document.getElementById('alloc-confirm').addEventListener('click', () => {
      const alloc = {};
      container.querySelectorAll('input[type=range]').forEach(i => { alloc[i.dataset.id] = +i.value; });
      const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
      if (sum !== total) { alert(`总和须 = ${total}(当前 ${sum})。可点击「自动配平」一键补齐。`); return; }
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
    document.getElementById('sort-confirm').addEventListener('click', () => {
      const order = [...list.children].map(c => c.dataset.id);
      recordAnswer(q, { order });
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
  const reactions = [];
  const wordEl = document.getElementById('iat-word');
  const progEl = document.getElementById('iat-progress');

  function next() {
    if (idx >= q.words.length) { recordAnswer(q, { iat: reactions }); return; }
    const w = q.words[idx];
    wordEl.textContent = w.word;
    wordEl.style.animation = 'none';
    void wordEl.offsetWidth; // reflow 重置动画
    wordEl.style.animation = '';
    wordStart = performance.now();
    progEl.textContent = `${idx + 1} / ${q.words.length}`;
  }
  function classify(side) {
    if (idx >= q.words.length) return;
    const w = q.words[idx];
    const rt = performance.now() - wordStart;
    reactions.push({ word: w.word, category: w.category, response: side, rt: Math.round(rt), correct: w.category === side });
    idx++;
    next();
  }
  document.getElementById('iat-left').onclick = () => classify('left');
  document.getElementById('iat-right').onclick = () => classify('right');
  document.onkeydown = e => {
    if (e.key === 'ArrowLeft') classify('left');
    if (e.key === 'ArrowRight') classify('right');
  };
  next();
}

function getCurrentAnswer(q) {
  if (q.type === 'scale' || q.type === 'dilemma') {
    const sel = document.querySelector(`[data-q="${q.id}"] .selected`);
    return sel ? { option_id: sel.dataset.id } : {};
  }
  return {};
}

function recordAnswer(q, answer, timeout = false) {
  clearInterval(timerInterval);
  document.onkeydown = null;
  const snap = tracker.snapshot();
  if (timeout) snap.duration_ms = q.time_limit_sec * 1000 + 100;
  answers[currentIdx] = {
    question_id: q.id,
    answer,
    duration_ms: snap.duration_ms,
    change_count: snap.change_count,
    trajectory: snap.trajectory,
  };
  currentIdx++;
  // 存草稿
  api.post(`/api/sessions/${session.id}/responses`, { answers: [answers[currentIdx - 1]], complete: false });
  renderQuestion();
}

async function submitAll(complete) {
  const valid = answers.filter(a => a && a.answer && Object.keys(a.answer).length > 0);
  const res = await api.post(`/api/sessions/${session.id}/responses`, { answers: valid, complete: true });
  if (res.result_id) {
    location.href = `/report.html?id=${res.result_id}`;
  }
}

init();
