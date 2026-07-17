// 报告页 —— 水银镜显现 + 画像标签 + 雷达图 + 维度/百分位/匹配/冲突/洞察

const params = new URLSearchParams(location.search);
const resultId = params.get('id');

let _lastResult = null;
let _radarChart = null;

const INSIGHT_ORDER = ['decision_style', 'consistency', 'ambivalence', 'courage_index', 'time_pressure_effect', 'iat_bias'];

// HTML 转义 —— 防止服务端报告数据(summary/匹配/冲突/洞察等)注入 XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function render() {
  if (!resultId) { location.href = '/'; return; }
  const r = await api.get(`/api/results/${resultId}`);
  _lastResult = r;
  // 设置三镜主题色
  document.body.dataset.mirror = r.assessment_type;
  doRender();
}

function doRender() {
  const r = _lastResult;
  if (!r) return;
  const dimEntries = Object.entries(r.dimensions || {});
  const tags = (r.profile && r.profile.tags) || [];
  const pcts = r.percentiles || {};
  const t = mmI18n.t(`report.titles.${r.assessment_type}`);
  const titleInfo = t || { eyebrow: r.assessment_type.toUpperCase(), title: mmI18n.t('common.your_mirror') };

  // 根据一致性判断镜面清晰度
  const consistency = r.insights?.consistency?.label || '';
  const clarity = consistency === '高' ? 'high' : consistency === '低' ? 'low' : '';

  const html = `
    <div class="report-hero">
      <div class="mirror-disc"${clarity ? ` data-clarity="${clarity}"` : ''}></div>
      <div class="report-eyebrow">${titleInfo.eyebrow}</div>
      <h2 class="report-title">${titleInfo.title}</h2>
      <div class="hero-divider"><span></span></div>
      ${tags.length ? `
      <div class="profile-tags">
        ${tags.map(t => `<span class="profile-tag">${escapeHtml(t)}</span>`).join('')}
      </div>` : `<p class="profile-empty">${mmI18n.t('report.tags_empty')}</p>`}
      <p class="report-summary">${escapeHtml(r.summary)}</p>
    </div>

    <div class="report-section">
      <h3>${mmI18n.t('report.sec_matches')}</h3>
      <div class="match-list">
        ${(r.matches || []).map((m, i) => {
          const isCelebrity = r.assessment_type === 'celebrity';
          const hasImage = isCelebrity && m.image;
          const hasQuote = m.quote;
          return `
          <div class="match-item ${i === 0 ? 'top' : ''}${hasImage ? ' with-image' : ''}">
            ${hasImage ? `
              <div class="match-portrait">
                <img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" loading="lazy" onerror="this.parentNode.classList.add('img-fallback');this.style.display='none';">
              </div>` : ''}
            <div class="match-body">
              <div class="match-name">${escapeHtml(m.name)}</div>
              <div class="match-blurb">${escapeHtml(m.blurb)}</div>
              ${hasQuote ? `<div class="match-quote">"${escapeHtml(m.quote)}"</div>` : ''}
            </div>
            <div class="match-pct">${m.match_pct != null ? escapeHtml(m.match_pct) : ''}<span style="font-size:14px;opacity:0.6">%</span></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${dimEntries.length ? `
    <div class="report-section">
      <h3>${mmI18n.t('report.sec_dimensions')}</h3>
      <div class="chart-container" id="radar"></div>
      <div class="dim-grid">
        ${dimEntries.map(([k, v]) => {
          const pct = pcts[k];
          const pctText = (pct !== undefined && pct !== null)
            ? mmI18n.t('report.higher_than', { pct: Math.round(pct) })
            : '';
          const dimLabel = mmI18n.t(`report.dim_labels.${k}`) || k;
          const dimDesc = mmI18n.t(`report.dim_desc.${k}`) || '';
          return `
          <div class="dim-item" data-dim="${escapeHtml(k)}" style="cursor:pointer">
            <div class="dim-head">
              <div class="dim-name">${escapeHtml(dimLabel)}</div>
              ${pctText ? `<div class="dim-pct">${escapeHtml(pctText)}</div>` : ''}
            </div>
            <div class="dim-score">${v != null ? escapeHtml(v) : ''}</div>
            <div class="dim-bar"><div class="dim-bar-fill" style="width:0" data-w="${Math.min(100, Math.max(0, v || 0))}"></div></div>
            <div class="dim-detail" style="display:none">${escapeHtml(dimDesc)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${(r.conflicts && r.conflicts.length) ? `
    <div class="report-section">
      <h3>${mmI18n.t('report.sec_conflicts')}</h3>
      <div class="conflict-list">
        ${r.conflicts.map(c => {
          const sev = Math.min(3, Math.max(1, +c.severity || 1));
          const typeLabel = mmI18n.t(`report.conflict_labels.${c.conflict_type}`) || c.conflict_type;
          return `
          <div class="conflict-item sev-${sev}">
            <div class="conflict-meta">
              <span class="conflict-type">${escapeHtml(typeLabel)}</span>
              <span class="conflict-dots">${'●'.repeat(sev)}${'○'.repeat(3 - sev)}</span>
            </div>
            <div class="conflict-desc">${escapeHtml(c.description)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="report-section">
      <h3>${mmI18n.t('report.sec_insights')}</h3>
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
              <span class="insight-label">${escapeHtml(mmI18n.t(`report.insight_labels.${k}`) || k)}</span>
              <span class="insight-value">${escapeHtml(v.label)}</span>
            </div>
            <div class="insight-desc">${escapeHtml(v.desc)}</div>
            ${extra}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="actions">
      <a href="/bootcamp.html?result_id=${escapeHtml(resultId)}" class="btn-primary" data-i18n="bootcamp.enter">进入训练营 · 今日开练</a>
      <a href="/" class="btn-secondary" data-i18n="report.back_home">回到首页</a>
      <a href="/history.html" class="btn-secondary" data-i18n="report.my_reports">我的报告</a>
    </div>
  `;
  document.getElementById('report').innerHTML = html;

  // 重新应用 i18n 到本次注入的 data-i18n 元素 —— 直接调 I18n.t 而不再走 applyLang,
  // 避免 mm:lang-changed 事件在递归中触发再次渲染.
  document.querySelectorAll('#report [data-i18n]').forEach(el => {
    const v = mmI18n.t(el.dataset.i18n);
    if (v !== el.dataset.i18n) el.textContent = v;
  });
  document.querySelectorAll('#report [data-i18n-html]').forEach(el => {
    const v = mmI18n.t(el.dataset.i18nHtml);
    if (v !== el.dataset.i18nHtml) el.innerHTML = v;
  });
  // 同步顶部 lang 按钮的激活态
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === mmI18n.lang);
  });
  document.documentElement.lang = mmI18n.lang === 'zh' ? 'zh-CN' : mmI18n.lang;

  // 维度条 + 洞察条动画
  setTimeout(() => {
    document.querySelectorAll('.dim-bar-fill, .insight-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 400);

  // 维度下钻:点击展开详情
  document.querySelectorAll('.dim-item').forEach(item => {
    item.addEventListener('click', () => {
      const detail = item.querySelector('.dim-detail');
      if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
    });
  });

  if (dimEntries.length) drawRadar(dimEntries);
}

function drawRadar(entries) {
  // 销毁旧实例,避免重复 canvas
  if (_radarChart) { try { _radarChart.dispose(); } catch (e) {} _radarChart = null; }
  const el = document.getElementById('radar');
  if (!el) return;
  // 从 CSS 变量取色,保持与全站主题一致
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#8b2e1f';
  const mirror = css.getPropertyValue('--mirror').trim() || accent;
  const inkSoft = css.getPropertyValue('--ink-soft').trim() || '#4a453e';
  const inkFaint = css.getPropertyValue('--ink-faint').trim() || '#8a857c';
  const line = css.getPropertyValue('--line').trim() || '#d0c9ba';
  const paper = css.getPropertyValue('--paper-faint').trim() || '#f8f5ee';

  const chart = echarts.init(el, null, { renderer: 'canvas' });
  _radarChart = chart;
  const radius = entries.length >= 10 ? '52%' : (entries.length >= 7 ? '58%' : '68%');
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: css.getPropertyValue('--paper').trim() || '#f4efe3',
      borderColor: line,
      textStyle: { color: inkSoft, fontFamily: "'Noto Serif SC', serif" },
      formatter: () => {
        const vals = entries.map(([k, v]) => `${escapeHtml(mmI18n.t(`report.dim_labels.${k}`) || k)}: <b>${escapeHtml(v)}</b>`);
        return vals.join('<br/>');
      },
    },
    radar: {
      indicator: entries.map(([k, v]) => ({ name: mmI18n.t(`report.dim_labels.${k}`) || k, max: 100 })),
      center: ['50%', '52%'],
      radius: radius,
      axisName: {
        color: inkFaint,
        fontSize: 13,
        fontFamily: "'Noto Serif SC', serif",
        padding: [6, 10],
      },
      splitLine: { lineStyle: { color: line } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(0,0,0,0.015)'] } },
      axisLine: { lineStyle: { color: line } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: entries.map(([, v]) => v),
        areaStyle: { color: accent + '33' },
        lineStyle: { color: accent, width: 2 },
        itemStyle: { color: accent, borderColor: paper, borderWidth: 1 },
        symbol: 'circle',
        symbolSize: 7,
      }],
    }],
  });
  window.addEventListener('resize', () => { try { chart.resize(); } catch (e) {} });
}

render();
// 暴露给语言切换使用
window.__mmRerender = () => { if (_lastResult) doRender(); };
