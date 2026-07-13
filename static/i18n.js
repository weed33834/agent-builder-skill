// ============================================================
// 心镜 MindMirror —— 全站三语切换 (中 / EN / 日)
// 使用 i18next (vendored to /vendor/i18next.min.js)
// ============================================================

const MM_LANG_KEY = 'mm_lang';

// ============================================================
// 翻译资源
// 命名空间:page.section.element
// ============================================================
const MM_I18N_RESOURCES = {
  zh: {
    common: {
      back: '← 返 回',
      back_short: '← 返回',
      exit: '← 退 出',
      submit: '提 交',
      confirm: '确 认',
      next: '下 一 题',
      prev: '上 一 题',
      start: '开 始',
      save: '保 存',
      cancel: '取 消',
      delete: '删 除',
      close: '关 闭',
      loading: '加载中…',
      processing: '生成报告中…',
      processing_sub: '请稍候,这通常需要 5-15 秒',
      error_generic: '出现了一点意外',
      retry: '重 试',
      back_home: '回 到 首 页',
      my_reports: '我 的 报 告',
      about: '关 于',
      share: '分 享',
      download: '下 载',
      export: '导 出',
      yes: '是',
      no: '否',
      skip: '跳 过',
      all: '全 部',
      remaining: '剩 余',
      total: '总 计',
      used: '已 用',
      seconds: '秒',
      minutes: '分钟',
      questions: '题',
      progress: '进度',
      about_brand: '关 于 心 镜',
      you: '你',
      your_mirror: '你的心镜',
      mirror_unused: '镜 面 尚 未 启 用',
      mirror_unused_sub: '你的第一次凝视将在此留影',
      no_data: '尚 无 影 像',
      language: '语言',
      // 注意:此语言下题目内容仍为中文
      notice_i18n_partial: '当前为界面三语,题目内容仅提供中文版',
    },
    home: {
      brand: '心 镜',
      subtitle: 'M I N D \u00A0 M I R R O R',
      disclaimer: '非 心 理 诊 断 · 仅 供 参 考',
      mirrors: {
        celebrity: {
          icon: '名', title: '名 人 镜', tagline: '与历史灵魂对望',
          desc: '通过回答与历史名人真实困境相似的选择,测出你与谁最相近。从林肯的坚守到图灵的内向天才,找到与你底色共振的那个人。',
        },
        value: {
          icon: '义', title: '价 值 镜', tagline: '你的价值坐标',
          desc: '从利他、公正、诚实到自律,多维度刻画你在利益与原则之间的真实站位——你以为的原则,是否经得起情境的考验。',
        },
        ideology: {
          icon: '场', title: '意 识 镜', tagline: '政治光谱定位',
          desc: '经济轴与社会轴交叉定位。不预设立场,不引导结论,只如实呈现你在政治光谱上的投影。',
        },
      },
      enter: '入 镜 →',
    },
    take: {
      title_celebrity: '名 人 镜',
      title_value: '价 值 镜',
      title_ideology: '意 识 镜',
      section_label: '第 {n} 部 分',
      section_intro_default: '凭第一直觉选择最贴近你的选项',
      intro_disclaimer: '作答时间与犹豫次数会进入最终报告',
      timer_warning: '时间将尽',
      progress_label: '{current} / {total}',
      type_label: {
        scale: '量表题',
        dilemma: '困境题',
        allocation: '资源分配',
        sort: '排序题',
        iat: '内隐联想',
        slider: '强度滑块',
        forced_choice: '强迫抉择',
        matrix: '同意度矩阵',
        auction: '价值拍卖',
      },
      // 通用控件
      auto_balance: '自 动 配 平',
      remaining_label: '剩 余 金 币',
      total_label: '总 计',
      of_total: '/ {total}',
      // 互动提示
      hint_drag: '拖 拽 排 序',
      hint_tap: '点 击 选 择',
      hint_slide: '拖 动 滑 块',
      // 完成态
      completed: '已 完 成',
      thanks: '感谢你的凝视',
      generating: '正在生成报告',
    },
    report: {
      back: '← 返 回',
      titles: {
        celebrity: { eyebrow: 'C E L E B R I T Y', title: '名 镜 · 灵魂对望' },
        value:     { eyebrow: 'V A L U E',          title: '义 镜 · 价值坐标' },
        ideology:  { eyebrow: 'I D E O L O G Y',    title: '意 识 镜 · 光谱定位' },
      },
      tags_empty: '— 数据尚不足以生成画像标签 —',
      sec_matches: '核 心 匹 配',
      sec_dimensions: '维 度 详 解',
      sec_conflicts: '内 在 冲 突',
      sec_insights: '行 为 洞 察',
      // 维度名
      dim_labels: {
        openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性',
        agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义',
        honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律',
        econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由',
        tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球',
      },
      // 洞察标签
      insight_labels: {
        decision_style: '决策风格', time_pressure_effect: '时间压力', consistency: '一致性',
        iat_bias: '内隐偏向', courage_index: '勇气指数', ambivalence: '纠结度',
      },
      // 冲突类型
      conflict_labels: {
        high_hesitation: '犹 豫', frequent_change: '反 复', timeout_instinct: '本 能',
        dimension_contradiction: '矛 盾', iat_implicit_explicit: '分 裂', iat_hesitation: '潜 犹 豫',
      },
      // 报告
      back_home: '回 到 首 页',
      my_reports: '我 的 报 告',
      higher_than: '高于 {pct}%',
    },
    history: {
      title: '镜 中 影 像',
      hero_title: '曾 照 见',
      hero_sub: 'V I S I O N S \u00A0 P A S T',
      hero_disc: '每一次凝视,皆留下一道影像',
      type_labels: { celebrity: '名 人 镜', value: '价 值 镜', ideology: '意 识 镜' },
      list_empty: '尚未留存任何影像',
      list_clear: '抹 去 全 部',
      back: '← 返 回',
      enter: '入 镜 →',
      not_found: '这份报告已消散',
    },
  },

  en: {
    common: {
      back: '← BACK',
      back_short: '← Back',
      exit: '← EXIT',
      submit: 'SUBMIT',
      confirm: 'CONFIRM',
      next: 'NEXT',
      prev: 'PREV',
      start: 'BEGIN',
      save: 'SAVE',
      cancel: 'CANCEL',
      delete: 'DELETE',
      close: 'CLOSE',
      loading: 'Loading…',
      processing: 'Generating your report…',
      processing_sub: 'A moment please — usually takes 5–15 seconds',
      error_generic: 'Something went wrong',
      retry: 'RETRY',
      back_home: 'BACK TO HOME',
      my_reports: 'MY REPORTS',
      about: 'ABOUT',
      share: 'SHARE',
      download: 'DOWNLOAD',
      export: 'EXPORT',
      yes: 'Yes',
      no: 'No',
      skip: 'SKIP',
      all: 'ALL',
      remaining: 'Remaining',
      total: 'Total',
      used: 'Used',
      seconds: 's',
      minutes: 'min',
      questions: 'Q',
      progress: 'Progress',
      about_brand: 'ABOUT MINDMIRROR',
      you: 'You',
      your_mirror: 'Your MindMirror',
      mirror_unused: 'The Mirror Has Not Been Used',
      mirror_unused_sub: 'Your first reflection will be captured here',
      no_data: 'No Visions Yet',
      language: 'Language',
      notice_i18n_partial: 'Interface is trilingual; question content is Chinese-only in this build',
    },
    home: {
      brand: 'MindMirror',
      subtitle: 'S E E \u00A0 T R U L Y',
      disclaimer: 'NOT A CLINICAL DIAGNOSIS · FOR REFERENCE ONLY',
      mirrors: {
        celebrity: {
          icon: 'C', title: 'Celebrity Mirror', tagline: 'Resonate with a historical soul',
          desc: 'By answering choices similar to real dilemmas of historical figures, measure whom you most closely resemble. From Lincoln\'s resolve to Turing\'s introverted genius, find the figure whose undertone harmonizes with yours.',
        },
        value: {
          icon: 'V', title: 'Value Mirror', tagline: 'Your moral coordinates',
          desc: 'From altruism and justice to honesty and discipline, multidimensional mapping of where you truly stand between interest and principle. Can your convictions survive the test of context?',
        },
        ideology: {
          icon: 'I', title: 'Ideology Mirror', tagline: 'Spectrum positioning',
          desc: 'Cross-positioned on economic and social axes. No presupposed stance, no guided conclusion — only an honest projection of where you fall on the political spectrum.',
        },
      },
      enter: 'ENTER →',
    },
    take: {
      title_celebrity: 'CELEBRITY MIRROR',
      title_value: 'VALUE MIRROR',
      title_ideology: 'IDEOLOGY MIRROR',
      section_label: 'PART {n}',
      section_intro_default: 'Choose by first instinct what fits you best',
      intro_disclaimer: 'Response time and hesitation count enter your final report',
      timer_warning: 'Time running short',
      progress_label: '{current} / {total}',
      type_label: {
        scale: 'SCALE', dilemma: 'DILEMMA', allocation: 'ALLOCATION', sort: 'SORT',
        iat: 'IAT', slider: 'SLIDER', forced_choice: 'FORCED CHOICE',
        matrix: 'MATRIX', auction: 'AUCTION',
      },
      auto_balance: 'AUTO-BALANCE',
      remaining_label: 'COINS LEFT',
      total_label: 'TOTAL',
      of_total: '/ {total}',
      hint_drag: 'DRAG TO RANK',
      hint_tap: 'TAP TO SELECT',
      hint_slide: 'DRAG THE SLIDER',
      completed: 'COMPLETED',
      thanks: 'Thank you for your gaze',
      generating: 'Generating report',
    },
    report: {
      back: '← BACK',
      titles: {
        celebrity: { eyebrow: 'C E L E B R I T Y', title: 'Celebrity · Soul Resonator' },
        value:     { eyebrow: 'V A L U E',          title: 'Value · Moral Coordinates' },
        ideology:  { eyebrow: 'I D E O L O G Y',    title: 'Ideology · Spectrum Map' },
      },
      tags_empty: '— Not enough data to generate profile tags —',
      sec_matches: 'TOP MATCHES',
      sec_dimensions: 'DIMENSION DETAIL',
      sec_conflicts: 'INNER CONFLICTS',
      sec_insights: 'BEHAVIORAL INSIGHTS',
      dim_labels: {
        openness: 'Openness', conscientiousness: 'Conscientiousness', extraversion: 'Extraversion',
        agreeableness: 'Agreeableness', neuroticism: 'Neuroticism', risk_taking: 'Risk Taking', idealism: 'Idealism',
        honesty: 'Honesty', altruism: 'Altruism', justice: 'Justice', duty: 'Duty', empathy: 'Empathy', discipline: 'Discipline',
        econ_left: 'Econ-Left', econ_right: 'Econ-Right', authority: 'Authority', liberty: 'Liberty',
        tradition: 'Tradition', progress: 'Progress', nationalist: 'Nationalist', globalist: 'Globalist',
      },
      insight_labels: {
        decision_style: 'Decision Style', time_pressure_effect: 'Time Pressure', consistency: 'Consistency',
        iat_bias: 'Implicit Bias', courage_index: 'Courage Index', ambivalence: 'Ambivalence',
      },
      conflict_labels: {
        high_hesitation: 'Hesitation', frequent_change: 'Indecision', timeout_instinct: 'Instinct',
        dimension_contradiction: 'Contradiction', iat_implicit_explicit: 'Split', iat_hesitation: 'Latent Hesitation',
      },
      back_home: 'BACK TO HOME',
      my_reports: 'MY REPORTS',
      higher_than: 'Higher than {pct}%',
    },
    history: {
      title: 'REFLECTIONS',
      hero_title: 'WHAT YOU HAVE SEEN',
      hero_sub: 'V I S I O N S \u00A0 P A S T',
      hero_disc: 'Every gaze leaves a trace in the mirror',
      type_labels: { celebrity: 'CELEBRITY MIRROR', value: 'VALUE MIRROR', ideology: 'IDEOLOGY MIRROR' },
      list_empty: 'No reflection has been kept',
      list_clear: 'ERASE ALL',
      back: '← BACK',
      enter: 'ENTER →',
      not_found: 'This reflection has faded',
    },
  },
  ja: {
    common: {
      back: '← 戻 る',
      back_short: '← 戻る',
      exit: '← 終 了',
      submit: '送 信',
      confirm: '確 認',
      next: '次 へ',
      prev: '前 へ',
      start: '開 始',
      save: '保 存',
      cancel: 'キ ャ ン セ ル',
      delete: '削 除',
      close: '閉 じ る',
      loading: '読み込み中…',
      processing: 'レポート生成中…',
      processing_sub: '少々お待ちください — 通常 5〜15 秒',
      error_generic: '予期しないエラー',
      retry: '再 試 試',
      back_home: 'ホームへ戻る',
      my_reports: 'レポート',
      about: '心鏡とは',
      share: '共 有',
      download: 'ダウン',
      export: 'エクスポート',
      yes: 'は い',
      no: 'いいえ',
      skip: 'ス キ ッ プ',
      all: '全 て',
      remaining: '残 り',
      total: '合 計',
      used: '使 用',
      seconds: '秒',
      minutes: '分',
      questions: '問',
      progress: '進 捗',
      about_brand: '心 鏡 に つ い て',
      you: 'あ な た',
      your_mirror: 'あなたの心鏡',
      mirror_unused: '鏡はまだ使われていません',
      mirror_unused_sub: '初めての凝視がここに留められる',
      no_data: '影像はまだありません',
      language: '言語',
      notice_i18n_partial: 'インターフェースは三語対応、設問内容は中国語のみ',
    },
    home: {
      brand: '心 鏡',
      subtitle: '真 の 自 己 を 見 る',
      disclaimer: '心理診断ではありません · 参考のみ',
      mirrors: {
        celebrity: {
          icon: '名', title: '名人鏡', tagline: '歴史の魂と共鳴する',
          desc: '歴史的人物の実際のジレンマに似た選択に答えることで、最も近い人物を測定。リンカーンの堅持からチューリングの内向的な天才まで、あなたの本色と共鳴する人物を見つける。',
        },
        value: {
          icon: '義', title: '価値鏡', tagline: 'あなたの道徳座標',
          desc: '利他・公正・誠実・自律から、利益と原則の間での真の立ち位置を多次元的に描写。あなたの原則は状況の試練に耐えられるか。',
        },
        ideology: {
          icon: '場', title: '意識鏡', tagline: '政治スペクトル定位',
          desc: '経済軸と社会軸の交叉で位置決め。立場を前提せず、結論を誘導せず、政治スペクトル上の投影をありのままに提示する。',
        },
      },
      enter: '入 鏡 →',
    },
    take: {
      title_celebrity: '名 人 鏡',
      title_value: '価 値 鏡',
      title_ideology: '意 識 鏡',
      section_label: '第 {n} 部 分',
      section_intro_default: '第一直感で自分に最も近いものを選んでください',
      intro_disclaimer: '回答時間と躊躇回数は最終レポートに反映されます',
      timer_warning: '残りわずか',
      progress_label: '{current} / {total}',
      type_label: {
        scale: '評 定 尺 度', dilemma: 'ジ レ ン マ', allocation: '資 源 配 分', sort: '並 べ 替 え',
        iat: '内 隠 連 想', slider: 'ス ラ イ ダ ー', forced_choice: '強 制 選 択',
        matrix: '同 意 度 行 列', auction: '価 値 オ ー ク シ ョ ン',
      },
      auto_balance: '自 動 配 分',
      remaining_label: '残 り 金 貨',
      total_label: '合 計',
      of_total: '/ {total}',
      hint_drag: 'ドラッグで順位',
      hint_tap: 'タップで選択',
      hint_slide: 'スライダーをドラッグ',
      completed: '完 了',
      thanks: 'ご凝視ありがとうございました',
      generating: 'レポート生成中',
    },
    report: {
      back: '← 戻 る',
      titles: {
        celebrity: { eyebrow: 'C E L E B R I T Y', title: '名 鏡 · 魂の共振' },
        value:     { eyebrow: 'V A L U E',          title: '義 鏡 · 価値座標' },
        ideology:  { eyebrow: 'I D E O L O G Y',    title: '意 識 鏡 · スペクトル' },
      },
      tags_empty: '— データ不足でラベルを生成できません —',
      sec_matches: 'コアマッチング',
      sec_dimensions: '次元詳解',
      sec_conflicts: '内的矛盾',
      sec_insights: '行動インサイト',
      dim_labels: {
        openness: '開放性', conscientiousness: '誠実性', extraversion: '外向性',
        agreeableness: '協調性', neuroticism: '神経質', risk_taking: 'リスク志向', idealism: '理想主義',
        honesty: '誠実', altruism: '利他', justice: '公正', duty: '責任', empathy: '共感', discipline: '自制',
        econ_left: '経済左', econ_right: '経済右', authority: '権威', liberty: '自由',
        tradition: '伝統', progress: '進歩', nationalist: '民族', globalist: 'グローバル',
      },
      insight_labels: {
        decision_style: '意思決定', time_pressure_effect: '時間圧力', consistency: '一貫性',
        iat_bias: '内隠偏向', courage_index: '勇気指数', ambivalence: 'ためらい',
      },
      conflict_labels: {
        high_hesitation: '躊 躇', frequent_change: '反 復', timeout_instinct: '本 能',
        dimension_contradiction: '矛 盾', iat_implicit_explicit: '分 裂', iat_hesitation: '潜 在 躊 躇',
      },
      back_home: 'ホームへ戻る',
      my_reports: 'レポート',
      higher_than: '{pct}% より上',
    },
    history: {
      title: '鏡 中 の 影 像',
      hero_title: '照 ら し 出 し た も の',
      hero_sub: 'V I S I O N S \u00A0 P A S T',
      hero_disc: 'すべての凝視は、鏡に一道の影像を残す',
      type_labels: { celebrity: '名 人 鏡', value: '価 値 鏡', ideology: '意 識 鏡' },
      list_empty: 'まだ影像は残されていません',
      list_clear: '全 て 消 去',
      back: '← 戻 る',
      enter: '入 鏡 →',
      not_found: 'この影像は消え去りました',
    },
  },
};

// ============================================================
// 简易 i18n 引擎 —— 替代 i18next,支持 {var} 插值、嵌套 key、fallback
// ============================================================
class I18n {
  constructor(resources, defaultLang = 'zh') {
    this.res = resources;
    this.lang = defaultLang;
    this.fallback = 'zh';
  }
  setLang(lang) {
    if (this.res[lang]) {
      this.lang = lang;
      try { localStorage.setItem(MM_LANG_KEY, lang); } catch (e) {}
    }
  }
  /** 取值:支持 "a.b.c" 嵌套 + {var} 插值 + 数组索引 */
  t(key, vars) {
    const parts = key.split('.');
    let val = this._lookup(this.res[this.lang], parts);
    if (val === undefined) val = this._lookup(this.res[this.fallback], parts);
    if (val === undefined) val = key;
    if (typeof val === 'string' && vars) {
      return val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
    }
    return val;
  }
  _lookup(obj, parts) {
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
}

const mmI18n = new I18n(MM_I18N_RESOURCES, 'zh');

// ============================================================
// 语言切换 UI 注入
// ============================================================
function injectLangSwitch(host) {
  const wrap = document.createElement('div');
  wrap.className = 'lang-switch';
  wrap.id = 'lang-switch';
  wrap.setAttribute('aria-label', mmI18n.t('common.language'));
  wrap.innerHTML = `
    <button class="lang-btn" data-lang="zh" type="button" aria-label="中文">中</button>
    <button class="lang-btn" data-lang="en" type="button" aria-label="English">EN</button>
    <button class="lang-btn" data-lang="ja" type="button" aria-label="日本語">日</button>
  `;
  if (host) host.appendChild(wrap);
  else document.body.appendChild(wrap);

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.lang-btn');
    if (btn) applyLang(btn.dataset.lang);
  });
}

function applyLang(lang) {
  // 防止 mm:lang-changed 监听器再次调用 applyLang 导致无限递归
  if (applyLang._busy) {
    applyLang._pending = lang;
    return;
  }
  applyLang._busy = true;
  try {
    mmI18n.setLang(lang);
    // 文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = mmI18n.t(el.dataset.i18n);
      if (v !== el.dataset.i18n) el.textContent = v;
    });
    // HTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = mmI18n.t(el.dataset.i18nHtml);
      if (v !== el.dataset.i18nHtml) el.innerHTML = v;
    });
    // 占位
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = mmI18n.t(el.dataset.i18nPlaceholder);
      if (v !== el.dataset.i18nPlaceholder) el.setAttribute('placeholder', v);
    });
    // 标题
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const v = mmI18n.t(el.dataset.i18nTitle);
      if (v !== el.dataset.i18nTitle) el.title = v;
    });
    // lang 属性
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    // 激活态
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    // 触发自定义事件,让页面 JS 同步状态(题目/报告内容等)
    document.dispatchEvent(new CustomEvent('mm:lang-changed', { detail: { lang } }));
  } finally {
    applyLang._busy = false;
  }
  // 若递归期间排了队,再补一次
  if (applyLang._pending && applyLang._pending !== lang) {
    const next = applyLang._pending;
    applyLang._pending = null;
    applyLang(next);
  } else {
    applyLang._pending = null;
  }
}

function initLang() {
  let saved = 'zh';
  try { saved = localStorage.getItem(MM_LANG_KEY) || 'zh'; } catch (e) {}
  if (!MM_I18N_RESOURCES[saved]) saved = 'zh';
  mmI18n.lang = saved;
  applyLang(saved);
}

// 自动初始化 —— DOM ready 时
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLang);
} else {
  initLang();
}
