// 答题页逻辑 —— 题型渲染 + 行为轨迹采集 + 提交

const params = new URLSearchParams(location.search);
const type = params.get('type');

let bank, session, tracker;
let currentIdx = 0;
const answers = []; // 累积答案
let timerInterval = null;

async function init() {
  if (!type) { location.href = '/'; return; }
  // 并行取题库 + 开会话
  [bank, session] = await Promise.all([
    api.get(`/api/assessments/${type}/questions`),
    api.post(`/api/sessions?assessment_type=${type}`),
  ]);
  document.getElementById('title').textContent = bank.title;
  // 恢复草稿(含行为数据,避免刷新后行为丢失)
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
  document.getElementById('progress-text').textContent = `${currentIdx + 1} / ${bank.questions.length}`;

  // 限时题启动倒计时
  setupTimer(q);

  const area = document.getElementById('question-area');
  tracker.start();

  const renderers = {
    scale: renderScale,
    dilemma: renderDilemma,
    allocation: renderAllocation,
    sort: renderSort,
    iat: renderIAT,
  };
  area.innerHTML = renderers[q.type](q);
  // 绑定事件
  bindEvents(q);
}

function setupTimer(q) {
  const el = document.getElementById('timer');
  // IAT 题自控节奏,不走单题倒计时(否则会中断逐词分类)
  if (!q.time_limit_sec || q.type === 'iat') {
    el.style.display = 'none';
    clearInterval(timerInterval);
    return;
  }
  el.style.display = 'flex';
  let remaining = q.time_limit_sec;
  el.textContent = remaining;
  el.classList.toggle('urgent', remaining <= 5);
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remaining--;
    el.textContent = remaining;
    el.classList.toggle('urgent', remaining <= 5);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      // 超时:记录本能答案(用当前选中,无则跳过)
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
      ${q.historical_figure ? `<p style="color:var(--fg-muted);font-size:13px;margin-top:16px">历史上的 ${q.historical_figure} 也曾面对相似抉择</p>` : ''}
    </div>`;
}

function renderAllocation(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="color:var(--fg-muted);font-size:14px;margin-bottom:16px">分配总和须 = ${q.total}</p>
      <div data-q="${q.id}">
        ${q.targets.map(t => `
          <div class="alloc-row">
            <label>${t.text}</label>
            <input type="range" min="0" max="${q.total}" value="0" data-id="${t.id}">
            <span class="val">0</span>
          </div>
        `).join('')}
        <div class="alloc-total">总计:<span id="alloc-sum">0</span> / ${q.total}</div>
      </div>
      <button class="btn-secondary" id="alloc-confirm" style="margin-top:20px;display:block;width:100%">确认</button>
    </div>`;
}

function renderSort(q) {
  // 随机打乱初始顺序
  const shuffled = [...q.items].sort(() => Math.random() - 0.5);
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <div class="sort-list" data-q="${q.id}">
        ${shuffled.map((it, i) => `<div class="sort-item" data-id="${it.id}" draggable="true"><span class="order">${i+1}</span>${it.text}</div>`).join('')}
      </div>
      <button class="btn-secondary" id="sort-confirm" style="margin-top:20px;display:block;width:100%">确认排序</button>
    </div>`;
}

function renderIAT(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <div class="iat-area" data-q="${q.id}">
        <div style="display:flex;gap:24px;color:var(--fg-muted);font-size:13px">
          <span>← ${q.left_label}</span>
          <span>${q.right_label} →</span>
        </div>
        <div class="iat-word" id="iat-word">准备</div>
        <div class="iat-buttons">
          <button class="iat-btn" id="iat-left">${q.left_label}</button>
          <button class="iat-btn" id="iat-right">${q.right_label}</button>
        </div>
        <div style="color:var(--fg-muted);font-size:13px"><span id="iat-progress">0 / ${q.words.length}</span></div>
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
        // 量表/困境选中后稍微停留再进下一题
        setTimeout(() => recordAnswer(q, { option_id: el.dataset.id }), 250);
      });
    });
  } else if (q.type === 'allocation') {
    const container = document.querySelector(`[data-q="${q.id}"]`);
    const sumEl = document.getElementById('alloc-sum');
    const total = q.total;
    container.querySelectorAll('input[type=range]').forEach(input => {
      input.addEventListener('input', () => {
        input.parentElement.querySelector('.val').textContent = input.value;
        const sum = [...container.querySelectorAll('input[type=range]')].reduce((s, i) => s + +i.value, 0);
        sumEl.textContent = sum;
        sumEl.parentElement.classList.toggle('ok', sum === total);
        tracker.recordChange(+input.value);
      });
    });
    document.getElementById('alloc-confirm').addEventListener('click', () => {
      const alloc = {};
      container.querySelectorAll('input[type=range]').forEach(i => { alloc[i.dataset.id] = +i.value; });
      const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
      if (sum !== total) { alert(`总和须 = ${total}(当前 ${sum})`); return; }
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

// IAT —— 逐词显示,记录反应时
function runIAT(q) {
  let idx = 0;
  let wordStart = 0;
  const reactions = [];
  const wordEl = document.getElementById('iat-word');
  const progEl = document.getElementById('iat-progress');

  function next() {
    if (idx >= q.words.length) {
      recordAnswer(q, { iat: reactions });
      return;
    }
    const w = q.words[idx];
    wordEl.textContent = w.word;
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
  // 键盘 ← →
  document.onkeydown = e => {
    if (e.key === 'ArrowLeft') classify('left');
    if (e.key === 'ArrowRight') classify('right');
  };
  next();
}

function getCurrentAnswer(q) {
  // 超时时取当前状态
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
  if (timeout) snap.duration_ms = q.time_limit_sec * 1000 + 100; // 标记超时
  answers[currentIdx] = {
    question_id: q.id,
    answer,
    duration_ms: snap.duration_ms,
    change_count: snap.change_count,
    trajectory: snap.trajectory,
  };
  currentIdx++;
  // 存草稿(每答一题存一次,防丢失)
  api.post(`/api/sessions/${session.id}/responses`, { answers: [answers[currentIdx - 1]], complete: false });
  renderQuestion();
}

async function submitAll(complete) {
  // 过滤未答
  const valid = answers.filter(a => a && a.answer && Object.keys(a.answer).length > 0);
  const res = await api.post(`/api/sessions/${session.id}/responses`, { answers: valid, complete: true });
  if (res.result_id) {
    location.href = `/report.html?id=${res.result_id}`;
  }
}

init();
