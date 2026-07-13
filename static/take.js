// 答题页逻辑 —— 题型渲染 + 行为轨迹采集 + 提交

const params = new URLSearchParams(location.search);
const type = params.get('type');

let bank, session, tracker;
let currentIdx = 0;
let lastType = null;
const answers = [];
let timerInterval = null;

// 题型中文名 + 分段标题
const TYPE_META = {
  scale:        { name: '量表题',   section: '人格底色',   hint: '凭第一直觉选择最贴近你的选项' },
  dilemma:      { name: '困境题',   section: '抉择时刻',   hint: '设想自己身处此境,会如何抉择' },
  slider:       { name: '强度滑块', section: '程度光谱',   hint: '拖动滑块,标记你的倾向强度' },
  forced_choice:{ name: '强迫抉择', section: '二选其一',   hint: '必须选一个,没有中间地带' },
  matrix:       { name: '同意度',   section: '信念矩阵',   hint: '对每条陈述选择同意程度' },
  auction:      { name: '价值拍卖', section: '人生竞拍',   hint: '分配金币,可保留预算' },
  allocation:   { name: '资源分配', section: '价值天平',   hint: '分配总额须等于给定数值' },
  sort:         { name: '排序题',   section: '优先序列',   hint: '拖拽排序,1 = 最重要' },
  iat:          { name: '联想测验', section: '内隐联想',   hint: '凭直觉,越快越好' },
};

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
  bank._typeIndex = buildTypeIndex(bank.questions);
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

  // 题型内进度:当前题型中第几题 / 该题型总数
  const ti = bank._typeIndex;
  const typeList = ti.idx[q.type] || [];
  const posInType = typeList.indexOf(currentIdx) + 1;
  const typeCount = ti.count[q.type] || 0;
  const meta = TYPE_META[q.type] || { name: q.type, section: '', hint: '' };

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
        <div class="section-eyebrow">第 ${phaseNumber(q.type, ti)} 部分</div>
        <h2 class="section-title">${meta.section}</h2>
        <p class="section-hint">${meta.hint}</p>
        <button class="btn-primary section-start" type="button">开 始</button>
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

// 当前题型的"第几部分"(按题型出现顺序)
function phaseNumber(type, ti) {
  const order = Object.keys(ti.idx);
  return order.indexOf(type) + 1;
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

function renderSlider(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:40px;letter-spacing:0.1em;text-align:center">拖动滑块,标记你的倾向</p>
      <div class="slider-area" data-q="${q.id}">
        <div class="slider-value" id="slider-value">50</div>
        <div class="slider-track-wrap">
          <input type="range" min="0" max="100" value="50" id="slider-input" class="slider-input" aria-label="倾向滑块">
          <div class="slider-fill" id="slider-fill"></div>
        </div>
        <div class="slider-labels">
          <span>${q.left_label}</span>
          <span>${q.right_label}</span>
        </div>
        <button class="btn-primary" id="slider-confirm" style="margin-top:40px;display:block;width:100%">确 认</button>
      </div>
    </div>`;
}

function renderForcedChoice(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:40px;letter-spacing:0.1em;text-align:center">必须选其一,无中间地带</p>
      <div class="fc-area" data-q="${q.id}">
        <div class="fc-cards">
          ${q.sides.map((s, i) => `
            <div class="fc-card" data-id="${s.id}">
              <div class="fc-letter">${String.fromCharCode(65 + i)}</div>
              <div class="fc-text">${s.text}</div>
            </div>
          `).join('')}
        </div>
        <div class="fc-vs">VS</div>
      </div>
    </div>`;
}

function renderMatrix(q) {
  const smax = q.scale_max || 7;
  const labels = ['强烈反对', '反对', '较反对', '中立', '较同意', '同意', '强烈同意'];
  const leftAnchor = labels[0];
  const rightAnchor = labels[smax - 1];
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:14px;margin-bottom:32px;letter-spacing:0.1em">对每条陈述选择同意程度</p>
      <div class="matrix-area" data-q="${q.id}">
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
          <div class="matrix-row" data-id="${s.id}">
            <div class="matrix-text">${s.text}</div>
            <div class="matrix-scale">
              ${Array.from({length: smax}, (_, i) => `<div class="matrix-dot" data-val="${i+1}"></div>`).join('')}
            </div>
          </div>
        `).join('')}
        <button class="btn-primary" id="matrix-confirm" style="margin-top:40px;display:block;width:100%">确 认</button>
      </div>
    </div>`;
}

function renderAuction(q) {
  return `
    <div class="question-card">
      <div class="question-prompt">${q.prompt}</div>
      <div class="auction-area" data-q="${q.id}" data-budget="${q.budget}">
        <div class="auction-budget">
          <span>剩余金币</span>
          <span class="auction-remaining" id="auction-remaining">${q.budget}</span>
          <span>/ ${q.budget}</span>
        </div>
        ${q.items.map(it => `
          <div class="auction-row" data-id="${it.id}">
            <div class="auction-head">
              <label>${it.text}</label>
              <div class="alloc-controls">
                <button class="alloc-btn" data-delta="-10" aria-label="减10">−10</button>
                <button class="alloc-btn" data-delta="-1" aria-label="减1">−1</button>
                <span class="val">0</span>
                <button class="alloc-btn" data-delta="1" aria-label="加1">+1</button>
                <button class="alloc-btn" data-delta="10" aria-label="加10">+10</button>
              </div>
            </div>
            <div class="auction-bar"><div class="auction-bar-fill" style="width:0%"></div></div>
          </div>
        `).join('')}
        <p style="font-family:var(--font-display);font-style:italic;color:var(--paper-faint);font-size:13px;margin-top:24px;letter-spacing:0.1em;text-align:center">可保留预算,出价反映你对每项的真实价值评估</p>
        <button class="btn-primary" id="auction-confirm" style="margin-top:32px;display:block;width:100%">确 认 出 价</button>
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
      if (!allDone) { alert('请为每条陈述都选择同意程度。'); return; }
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
      if (sum > budget) { alert(`总出价不能超过预算 ${budget}(当前 ${sum})。`); return; }
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
  const reactions = [];
  const area = document.querySelector(`[data-q="${q.id}"]`);
  const wordEl = document.getElementById('iat-word');
  const progEl = document.getElementById('iat-progress');
  // 挂到 DOM 上,供 getCurrentAnswer 超时场景读取
  if (area) area._iatReactions = reactions;

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
    _timeout: timeout,  // 标记超时,供 submitAll 保留
  };
  currentIdx++;
  // 存草稿
  api.post(`/api/sessions/${session.id}/responses`, { answers: [answers[currentIdx - 1]], complete: false });
  renderQuestion();
}

async function submitAll(complete) {
  // 保留:有答案的题 + 超时未操作的题(后者让后端能生成 timeout_instinct 冲突)
  const valid = answers.filter(a => a && (Object.keys(a.answer || {}).length > 0 || a._timeout));
  // 去掉内部标记字段,不传后端
  const payload = valid.map(({ _timeout, ...rest }) => rest);
  const res = await api.post(`/api/sessions/${session.id}/responses`, { answers: payload, complete: true });
  if (res && res.result_id) {
    location.href = `/report.html?id=${res.result_id}`;
  } else {
    alert('提交失败,请重试');
  }
}

init();
