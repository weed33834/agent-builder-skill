// 报告页 —— 水银镜显现 + 画像标签 + 雷达图 + 维度/百分位/匹配/冲突/洞察

const params = new URLSearchParams(location.search);
const resultId = params.get('id');

const DIM_LABELS = {
  openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性',
  agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义',
  honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律',
  econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由',
  tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球',
};
const INSIGHT_LABELS = {
  decision_style: '决策风格',
  time_pressure_effect: '时间压力',
  consistency: '一致性',
  iat_bias: '内隐偏向',
  courage_index: '勇气指数',
  ambivalence: '纠结度',
};
const INSIGHT_ORDER = ['decision_style', 'consistency', 'ambivalence', 'courage_index', 'time_pressure_effect', 'iat_bias'];
const CONFLICT_TYPE_LABELS = {
  high_hesitation: '犹豫',
  frequent_change: '反复',
  timeout_instinct: '本能',
  dimension_contradiction: '矛盾',
  iat_implicit_explicit: '分裂',
  iat_hesitation: '潜犹豫',
};
const ASSESSMENT_TITLES = {
  celebrity: { eyebrow: 'C E L E B R I T Y', title: '名 镜 · 灵魂对望' },
  value:     { eyebrow: 'V A L U E',         title: '义 镜 · 价值坐标' },
  ideology:  { eyebrow: 'I D E O L O G Y',   title: '意 识 镜 · 光谱定位' },
};

async function render() {
  if (!resultId) { location.href = '/'; return; }
  const r = await api.get(`/api/results/${resultId}`);
  const dimEntries = Object.entries(r.dimensions);
  const tags = (r.profile && r.profile.tags) || [];
  const pcts = r.percentiles || {};
  const titleInfo = ASSESSMENT_TITLES[r.assessment_type] || { eyebrow: r.assessment_type.toUpperCase(), title: '心 镜 报 告' };

  const html = `
    <div class="report-hero">
      <div class="mirror-disc"></div>
      <div class="report-eyebrow">${titleInfo.eyebrow}</div>
      <h2 class="report-title">${titleInfo.title}</h2>
      <div class="hero-divider"><span></span></div>
      ${tags.length ? `
      <div class="profile-tags">
        ${tags.map(t => `<span class="profile-tag">${t}</span>`).join('')}
      </div>` : `<p class="profile-empty">— 数据尚不足以生成画像标签 —</p>`}
      <p class="report-summary">${r.summary || ''}</p>
    </div>

    <div class="report-section">
      <h3>核 心 匹 配</h3>
      <div class="match-list">
        ${(r.matches || []).map((m, i) => `
          <div class="match-item ${i === 0 ? 'top' : ''}">
            <div>
              <div class="match-name">${m.name}</div>
              <div class="match-blurb">${m.blurb}</div>
            </div>
            <div class="match-pct">${m.match_pct || ''}<span style="font-size:14px;opacity:0.6">%</span></div>
          </div>
        `).join('')}
      </div>
    </div>

    ${dimEntries.length ? `
    <div class="report-section">
      <h3>维 度 详 解</h3>
      <div class="chart-container" id="radar"></div>
      <div class="dim-grid">
        ${dimEntries.map(([k, v]) => {
          const pct = pcts[k];
          const pctText = (pct !== undefined && pct !== null) ? `高于 ${Math.round(pct)}%` : '';
          return `
          <div class="dim-item">
            <div class="dim-head">
              <div class="dim-name">${DIM_LABELS[k] || k}</div>
              ${pctText ? `<div class="dim-pct">${pctText}</div>` : ''}
            </div>
            <div class="dim-score">${v ?? ''}</div>
            <div class="dim-bar"><div class="dim-bar-fill" style="width:0" data-w="${Math.min(100, Math.max(0, v))}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${(r.conflicts && r.conflicts.length) ? `
    <div class="report-section">
      <h3>内 在 冲 突</h3>
      <div class="conflict-list">
        ${r.conflicts.map(c => {
          const sev = Math.min(3, Math.max(1, +c.severity || 1));
          const typeLabel = CONFLICT_TYPE_LABELS[c.conflict_type] || c.conflict_type;
          return `
          <div class="conflict-item sev-${sev}">
            <div class="conflict-meta">
              <span class="conflict-type">${typeLabel}</span>
              <span class="conflict-dots">${'●'.repeat(sev)}${'○'.repeat(3 - sev)}</span>
            </div>
            <div class="conflict-desc">${c.description}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="report-section">
      <h3>行 为 洞 察</h3>
      <div class="insight-list">
        ${INSIGHT_ORDER.filter(k => r.insights && r.insights[k]).map(k => {
          const v = r.insights[k];
          let extra = '';
          if (k === 'courage_index' && typeof v.score === 'number') {
            extra = `<div class="insight-bar"><div class="insight-bar-fill" style="width:0" data-w="${v.score}"></div></div>`;
          } else if (k === 'ambivalence' && typeof v.score === 'number') {
            extra = `<div class="insight-bar"><div class="insight-bar-fill amber" style="width:0" data-w="${v.score}"></div></div>`;
          } else if (k === 'iat_bias' && typeof v.bias === 'number') {
            const magnitude = Math.min(100, Math.abs(v.bias) / 3);
            extra = `<div class="insight-bar"><div class="insight-bar-fill violet" style="width:0" data-w="${magnitude}"></div></div>`;
          }
          return `
          <div class="insight-item">
            <div class="insight-head">
              <span class="insight-label">${INSIGHT_LABELS[k] || k}</span>
              <span class="insight-value">${v.label}</span>
            </div>
            <div class="insight-desc">${v.desc}</div>
            ${extra}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="actions">
      <a href="/" class="btn-secondary">回到首页</a>
      <a href="/history.html" class="btn-secondary">我的报告</a>
    </div>
  `;
  document.getElementById('report').innerHTML = html;

  // 维度条 + 洞察条动画 —— 延迟触发宽度过渡
  setTimeout(() => {
    document.querySelectorAll('.dim-bar-fill, .insight-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 400);

  if (dimEntries.length) drawRadar(dimEntries);
}

function drawRadar(entries) {
  const chart = echarts.init(document.getElementById('radar'), null, { renderer: 'canvas' });
  // 维度多时缩小半径,避免标签拥挤
  const radius = entries.length >= 10 ? '52%' : (entries.length >= 7 ? '58%' : '68%');
  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: entries.map(([k, v]) => ({ name: DIM_LABELS[k] || k, max: 100 })),
      center: ['50%', '52%'],
      radius: radius,
      axisName: {
        color: '#d4d8e0',
        fontSize: 13,
        fontFamily: "'Noto Serif SC', serif",
        padding: [6, 10],
      },
      splitLine: { lineStyle: { color: 'rgba(62, 62, 72, 0.9)' } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(138,141,150,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(62, 62, 72, 0.9)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: entries.map(([, v]) => v),
        areaStyle: { color: 'rgba(208, 73, 64, 0.2)' },
        lineStyle: { color: '#d04940', width: 2 },
        itemStyle: { color: '#d04940', borderColor: '#fff', borderWidth: 1 },
        symbol: 'circle',
        symbolSize: 7,
      }],
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

render();
