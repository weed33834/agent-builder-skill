// 报告页 —— 渲染结论/匹配/维度/冲突/洞察 + 雷达图

const params = new URLSearchParams(location.search);
const resultId = params.get('id');

async function render() {
  if (!resultId) { location.href = '/'; return; }
  const r = await api.get(`/api/results/${resultId}`);

  const dimEntries = Object.entries(r.dimensions);
  const html = `
    <div class="report-hero">
      <div class="mirror-icon">◈</div>
      <p class="report-summary">${r.summary}</p>
    </div>

    <div class="report-section">
      <h3>核心匹配</h3>
      <div class="match-list">
        ${r.matches.map(m => `
          <div class="match-item">
            <div>
              <div style="font-size:16px">${m.name}</div>
              <div class="match-blurb">${m.blurb}</div>
            </div>
            <div class="match-pct">${m.match_pct}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${dimEntries.length ? `
    <div class="report-section">
      <h3>维度详解</h3>
      <div class="chart-container" id="radar"></div>
      <div class="dim-grid" style="margin-top:20px">
        ${dimEntries.map(([k, v]) => `
          <div class="dim-item">
            <div class="dim-name">${dimLabel(k)}</div>
            <div class="dim-score">${v}</div>
            <div class="dim-bar"><div class="dim-bar-fill" style="width:${v}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${r.conflicts.length ? `
    <div class="report-section">
      <h3>你的内在冲突</h3>
      <div class="conflict-list">
        ${r.conflicts.map(c => `<div class="conflict-item">${c.description}</div>`).join('')}
      </div>
    </div>` : ''}

    <div class="report-section">
      <h3>行为洞察</h3>
      <div class="insight-list">
        ${Object.entries(r.insights).map(([k, v]) => `
          <div class="insight-item">
            <span class="insight-label">${insightLabel(k)}:</span> ${v.label} — ${v.desc}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="actions">
      <a href="/" class="btn-secondary">回到首页</a>
      <a href="/history.html" class="btn-secondary">我的报告</a>
      <a href="/" class="btn-link">分享</a>
    </div>
  `;
  document.getElementById('report').innerHTML = html;

  // 雷达图
  if (dimEntries.length) drawRadar(dimEntries);
}

function drawRadar(entries) {
  const chart = echarts.init(document.getElementById('radar'), 'dark');
  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: entries.map(([k, v]) => ({ name: dimLabel(k), max: 100 })),
      axisName: { color: '#8892b0' },
      splitLine: { lineStyle: { color: '#233049' } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(100,255,218,0.03)'] } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: entries.map(([, v]) => v),
        areaStyle: { color: 'rgba(100,255,218,0.2)' },
        lineStyle: { color: '#64ffda' },
        itemStyle: { color: '#64ffda' },
      }],
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

const DIM_LABELS = {
  openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性',
  agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义',
  honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律',
  econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由',
  tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球',
};
function dimLabel(k) { return DIM_LABELS[k] || k; }

function insightLabel(k) {
  return { decision_style: '决策风格', time_pressure_effect: '时间压力效应', consistency: '一致性' }[k] || k;
}

render();
