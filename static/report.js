// 报告页 —— 水银镜显现 + 雷达图 + 维度/匹配/冲突/洞察

const params = new URLSearchParams(location.search);
const resultId = params.get('id');

const DIM_LABELS = {
  openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性',
  agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义',
  honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律',
  econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由',
  tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球',
};
const INSIGHT_LABELS = { decision_style: '决策风格', time_pressure_effect: '时间压力', consistency: '一致性' };

async function render() {
  if (!resultId) { location.href = '/'; return; }
  const r = await api.get(`/api/results/${resultId}`);
  const dimEntries = Object.entries(r.dimensions);

  const html = `
    <div class="report-hero">
      <div class="mirror-disc"></div>
      <p class="report-summary">${r.summary}</p>
    </div>

    <div class="report-section">
      <h3>核 心 匹 配</h3>
      <div class="match-list">
        ${r.matches.map(m => `
          <div class="match-item">
            <div>
              <div class="match-name">${m.name}</div>
              <div class="match-blurb">${m.blurb}</div>
            </div>
            <div class="match-pct">${m.match_pct}<span style="font-size:14px;opacity:0.6">%</span></div>
          </div>
        `).join('')}
      </div>
    </div>

    ${dimEntries.length ? `
    <div class="report-section">
      <h3>维 度 详 解</h3>
      <div class="chart-container" id="radar"></div>
      <div class="dim-grid">
        ${dimEntries.map(([k, v]) => `
          <div class="dim-item">
            <div class="dim-name">${DIM_LABELS[k] || k}</div>
            <div class="dim-score">${v}</div>
            <div class="dim-bar"><div class="dim-bar-fill" style="width:0" data-w="${v}"></div></div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${r.conflicts.length ? `
    <div class="report-section">
      <h3>内 在 冲 突</h3>
      <div class="conflict-list">
        ${r.conflicts.map(c => `<div class="conflict-item">${c.description}</div>`).join('')}
      </div>
    </div>` : ''}

    <div class="report-section">
      <h3>行 为 洞 察</h3>
      <div class="insight-list">
        ${Object.entries(r.insights).map(([k, v]) => `
          <div class="insight-item">
            <span class="insight-label">${INSIGHT_LABELS[k] || k}</span>${v.label} — ${v.desc}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="actions">
      <a href="/" class="btn-secondary">回到首页</a>
      <a href="/history.html" class="btn-secondary">我的报告</a>
    </div>
  `;
  document.getElementById('report').innerHTML = html;

  // 维度条动画 —— 延迟触发宽度过渡
  setTimeout(() => {
    document.querySelectorAll('.dim-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 400);

  if (dimEntries.length) drawRadar(dimEntries);
}

function drawRadar(entries) {
  const chart = echarts.init(document.getElementById('radar'), null, { renderer: 'canvas' });
  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: entries.map(([k, v]) => ({ name: DIM_LABELS[k] || k, max: 100 })),
      center: ['50%', '52%'],
      radius: '68%',
      axisName: { color: '#a8a4a0', fontSize: 12, fontFamily: 'Noto Serif SC' },
      splitLine: { lineStyle: { color: '#2a2a30' } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(138,141,150,0.03)'] } },
      axisLine: { lineStyle: { color: '#2a2a30' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: entries.map(([, v]) => v),
        areaStyle: { color: 'rgba(200,68,60,0.15)' },
        lineStyle: { color: '#c8443c', width: 1.5 },
        itemStyle: { color: '#c8443c' },
        symbol: 'circle',
        symbolSize: 5,
      }],
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

render();
