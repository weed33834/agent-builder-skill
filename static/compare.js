// 关系对比 —— 粘贴对方对比码,渲染维度反差 + 契合度
// 复用 app.js:api(get/post 自动注入 X-User-Token)、getToken、injectLangSwitch

(function () {
  const codeEl = document.getElementById('code');
  const msgEl = document.getElementById('compare-msg');
  const outEl = document.getElementById('compare-result');

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function setMsg(t, kind) {
    msgEl.textContent = t || '';
    msgEl.className = 'compare-msg' + (kind ? ' ' + kind : '');
  }

  async function doCompare() {
    const code = (codeEl.value || '').trim();
    if (!code) { setMsg(mmI18n.t('compare.invalid'), 'err'); return; }
    setMsg(''); outEl.innerHTML = '';
    try {
      const data = await api.get('/api/compare?other=' + encodeURIComponent(code));
      renderCompare(data);
    } catch (e) {
      setMsg(mmI18n.t('compare.invalid'), 'err');
    }
  }

  function renderCompare(d) {
    if (!d.self_summary) { setMsg(mmI18n.t('compare.no_result'), 'err'); return; }
    const rows = (d.dimensions || []).map((dim) => {
      const sv = dim.self_pct, ov = dim.other_pct;
      const max = Math.max(sv, ov, 1);
      const sw = (sv / max) * 100, ow = (ov / max) * 100;
      return `
        <div class="cmp-row">
          <div class="cmp-head"><span>${escapeHtml(dim.name)}</span><span class="cmp-verdict">${escapeHtml(dim.verdict)}</span></div>
          <div class="cmp-bars">
            <div class="cmp-bar cmp-self" style="width:${sw}%"><span>${sv}</span></div>
            <div class="cmp-bar cmp-other" style="width:${ow}%"><span>${ov}</span></div>
          </div>
        </div>`;
    }).join('');
    outEl.innerHTML = `
      <div class="cmp-summary">
        <div class="cmp-card">
          <h4>${escapeHtml(mmI18n.t('compare.self_label'))}</h4>
          <p>${(d.self_summary.tags || []).map(escapeHtml).join(' · ')}</p>
        </div>
        <div class="cmp-score">
          <div class="cmp-ring">${d.compatibility}<small>%</small></div>
          <p>${escapeHtml(mmI18n.t('compare.compat'))}</p>
        </div>
        <div class="cmp-card">
          <h4>${escapeHtml(mmI18n.t('compare.other_label'))}</h4>
          <p>${(d.other_summary.tags || []).map(escapeHtml).join(' · ')}</p>
        </div>
      </div>
      <p class="cmp-verdict-text">${escapeHtml(d.verdict)}</p>
      <div class="cmp-dims">${rows}</div>`;
  }

  async function copyMine() {
    try {
      const list = await api.get('/api/me/results');
      if (!list || !list.length) { setMsg(mmI18n.t('compare.no_result'), 'err'); return; }
      await navigator.clipboard.writeText(list[0].id);
      setMsg(mmI18n.t('compare.copy_ok'), 'ok');
    } catch (e) {
      setMsg(mmI18n.t('compare.no_result'), 'err');
    }
  }

  document.getElementById('btn-compare').addEventListener('click', doCompare);
  document.getElementById('btn-copy').addEventListener('click', copyMine);
  codeEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCompare(); });
})();
