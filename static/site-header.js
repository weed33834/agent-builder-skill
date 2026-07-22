/**
 * 全局站点头部 —— 所有页面共用
 * 自动注入顶部导航栏,高亮当前页对应项
 * 在 i18n.js 之后加载,注入后调 applyLang 翻译导航项
 */
(function () {
  // 跳过不需要导航的页面
  var skipPages = ['/take.html']; // 答题页全屏聚焦,不显示导航
  if (skipPages.indexOf(location.pathname) !== -1) return;

  var navItems = [
    { href: '/take.html?type=celebrity', i18nKey: 'nav.celebrity', match: ['celebrity'] },
    { href: '/take.html?type=value', i18nKey: 'nav.value', match: ['value'] },
    { href: '/take.html?type=ideology', i18nKey: 'nav.ideology', match: ['ideology'] },
    { href: '/bootcamp.html', i18nKey: 'nav.bootcamp', match: ['bootcamp'] },
    { href: '/compare.html', i18nKey: 'nav.compare', match: ['compare'] },
    { href: '/history.html', i18nKey: 'nav.reports', match: ['history', 'report'] },
  ];

  var path = location.pathname + location.search;
  function isActive(item) {
    return item.match.some(function (kw) { return path.indexOf(kw) !== -1; });
  }

  var navHtml = navItems.map(function (item) {
    var cls = isActive(item) ? 'nav-link active' : 'nav-link';
    return '<a href="' + item.href + '" class="' + cls + '" data-i18n="' + item.i18nKey + '">' +
      (window.mmI18n ? mmI18n.t(item.i18nKey) : '') + '</a>';
  }).join('');

  var header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML =
    '<div class="site-header-inner">' +
      '<a href="/" class="brand">' +
        '<img src="/images/logo.svg" alt="心镜" width="28" height="28">' +
        '<span class="brand-name">心镜</span>' +
      '</a>' +
      '<nav class="primary-nav" aria-label="主导航">' + navHtml + '</nav>' +
      '<div class="header-right">' +
        '<a href="/profile.html" class="header-icon-link" aria-label="我的面板" title="我的面板">' +
          '<img src="/images/mirror-celebrity.svg" alt="" width="20" height="20">' +
        '</a>' +
        '<a href="/login.html" class="btn-primary btn-sm" data-i18n="nav.login">登录</a>' +
      '</div>' +
    '</div>';

  // 插到 body 最前面
  document.body.insertBefore(header, document.body.firstChild);

  // 翻译导航项(如果 i18n 已初始化)
  if (window.mmI18n && typeof applyLang === 'function') {
    applyLang(mmI18n.lang);
  }
})();
