// ============================================================
// 心镜 MindMirror —— 全站三语切换 (中 / EN / 日)
// 自研轻量 i18n 引擎,无外部依赖
// ============================================================

const MM_LANG_KEY = 'mm_lang';

// ============================================================
// 翻译资源
// 命名空间:page.section.element
// 只保留被引用的 key,清理 38 个未引用冗余 key
// ============================================================
const MM_I18N_RESOURCES = {
  zh: {
    common: {
      back: '← 返回',
      exit: '← 退出',
      confirm: '确认',
      start: '开始',
      loading: '加载中…',
      processing: '生成报告中…',
      processing_sub: '请稍候,这通常需要 5-15 秒',
      error_generic: '出现了一点意外',
      submit_failed: '提交失败,请重试',
      err_timeout: '请求超时,请稍后重试',
      err_offline: '网络已断开,请检查连接',
      back_home: '回到首页',
      my_reports: '我的报告',
      compare: '关系对比',
      login: '登录',
      about: '关于',
      about_brand: '关于心镜',
      profile: '我的面板',
      minutes: '分钟',
      questions: '题',
      your_mirror: '你的心镜',
      mirror_unused: '镜面尚未启用',
      mirror_unused_sub: '你的第一次凝视将在此留影',
      language: '语言',
      // 注意:此语言下题目内容仍为中文
      notice_i18n_partial: '当前为界面三语,题目内容仅提供中文版',
    },
    seo: {
      site_name: '心镜 MindMirror',
      default_description: '心镜 MindMirror —— 通过名人镜、价值镜、意识镜三面镜子,以情境化答题和行为轨迹,看见真实的自己。',
      default_keywords: '心理测评,人格测试,MBTI,价值观,意识形态,名人灵魂匹配,自我探索,心镜',
      home_title: '心镜 MindMirror — 看见真实的自己',
      home_description: '通过名人镜、价值镜、意识镜三面镜子,以情境化答题与行为轨迹,看见真实的自己。',
      take_title: '{name} — 心镜',
      take_description: '正在作答心镜 {name},凭第一直觉选择最贴近你的选项。',
      report_title: '你的心镜报告 — MindMirror',
      report_description: '查看你的画像标签、维度详解、内在冲突与行为洞察。',
      history_title: '镜中影像 — 心镜',
      history_description: '回顾你曾经照见的每一面镜子,每一次凝视皆留下一道影像。',
      bootcamp_title: '训练营 — 心镜',
      bootcamp_description: '每日教官任务,磨砺你的特质,连续打卡赢铁血徽章。',
      compare_title: '关系对比 — 心镜',
      compare_description: '把对方的对比码贴进来,看看你们的反差与默契。',
      about_title: '关于心镜 — MindMirror',
      about_description: '心镜是一个开源的自我探索工具,基于情境化测评与行为轨迹分析。',
      login_title: '登录 — 心镜',
      login_description: '注册或登录心镜账户,同步训练进度与对比码。',
      notfound_title: '404 — 镜子未照见此处 — 心镜',
      notfound_description: '你访问的页面不存在,或已被移动。回到镜子前,继续看见自己。',
      figure_title: '人物志 — 心镜 MindMirror',
      figure_description: '历史名人的详细介绍与轶事,从林肯到图灵,看见灵魂的底色。',
      profile_title: '我的面板 — 心镜',
      profile_description: '你的探索者档案:账户、训练概览、最近报告与对比码,都在这里。',
      og_image: '/images/og-card.svg',
      og_type: 'website',
      twitter_card: 'summary_large_image',
    },
    home: {
      brand: '心镜',
      subtitle: 'MindMirror',
      disclaimer: '自我探索 · 仅供参考',
      onthisday_title: '今日认识',
      onthisday_sub: '与三位历史灵魂偶然相遇',
      mirrors: {
        celebrity: {
          icon: '名', title: '名人镜', tagline: '与历史灵魂对望',
          desc: '通过回答与历史名人真实困境相似的选择,测出你与谁最相近。从林肯的坚守到图灵的内向天才,找到与你底色共振的那个人。',
        },
        value: {
          icon: '义', title: '价值镜', tagline: '你的价值坐标',
          desc: '从利他、公正、诚实到自律,多维度刻画你在利益与原则之间的真实站位——你以为的原则,是否经得起情境的考验。',
        },
        ideology: {
          icon: '场', title: '意识镜', tagline: '政治光谱定位',
          desc: '经济轴与社会轴交叉定位。不预设立场,不引导结论,只如实呈现你在政治光谱上的投影。',
        },
      },
      enter: '入镜 →',
    },
    take: {
      title_celebrity: '名人镜',
      title_value: '价值镜',
      title_ideology: '意识镜',
      section_label: '第 {n} 部分',
      section_intro_default: '凭第一直觉选择最贴近你的选项',
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
      auto_balance: '自动配平',
      total_label: '总计',
      rhythm: '节奏',
      // 题型提示、aria-label 与 alert 文案(原 take.js 硬编码中文,改由 i18n 提供)
      dilemma_historical: '— 历史上,{figure} 亦曾面对相似抉择',
      alloc_hint: '分配总和须 = {total} · 可用按钮或拖动滑块',
      btn_minus: '减{n}',
      btn_plus: '加{n}',
      sort_hint: '拖拽或点击箭头排序,1 = 最重要',
      sort_move_up: '上移',
      sort_move_down: '下移',
      iat_hint: '凭直觉,越快越好',
      slider_hint: '拖动滑块,标记你的倾向',
      slider_aria: '倾向滑块',
      forced_choice_hint: '必须选其一,无中间地带',
      matrix_labels: ['强烈反对', '反对', '较反对', '中立', '较同意', '同意', '强烈同意'],
      matrix_hint: '对每条陈述选择同意程度',
      auction_remaining: '剩余金币',
      auction_hint: '可保留预算,出价反映你对每项的真实价值评估',
      alert_alloc_sum: '分配总和需要等于 {total}(现在是 {sum}),点一下「自动配平」就能补齐啦。',
      alert_matrix_incomplete: '每条陈述都选一下同意程度吧,别漏掉哦。',
      alert_auction_over: '总出价不能超过预算 {budget} 哦(现在是 {sum})。',
      // 草稿恢复
      draft_resume_title: '上次进行到第 {n} 题',
      draft_resume_sub: '是否继续上次未完成的凝视',
      draft_continue: '继续作答',
      draft_restart: '重新开始',
    },
    report: {
      back: '← 返回',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: '名镜 · 灵魂对望' },
        value:     { eyebrow: 'VALUE',     title: '义镜 · 价值坐标' },
        ideology:  { eyebrow: 'IDEOLOGY',  title: '意识镜 · 光谱定位' },
      },
      tags_empty: '— 数据尚不足以生成画像标签 —',
      sec_matches: '核心匹配',
      sec_dimensions: '维度详解',
      sec_conflicts: '内在冲突',
      sec_insights: '行为洞察',
      // 维度名
      dim_labels: {
        openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性',
        agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义',
        honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律',
        econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由',
        tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球',
      },
      // 维度详解(下钻展开)
      dim_desc: {
        openness: '对新经验、艺术、抽象观念的开放程度。高分者好奇、想象力丰富;低分者务实、偏传统。',
        conscientiousness: '自我约束与目标导向。高分者自律、有计划;低分者灵活、随性。',
        extraversion: '能量指向外部世界。高分者活跃、善交际;低分者内敛、独处充电。',
        agreeableness: '人际倾向。高分者温和、利他;低分者直接、竞争性强。',
        neuroticism: '情绪敏感性。高分者体验深刻、易波动;低分者情绪稳定。',
        risk_taking: '面对不确定性的偏好。高分者敢于冒险;低分者偏稳健。',
        idealism: '理想与现实的张力。高分者原则至上;低分者结果导向。',
        honesty: '真诚与直率。高分者即便有代价也坚持说真话;低分者善意的灰色地带较多。',
        altruism: '为他人付出的意愿。高分者利他倾向强;低分者先保自身。',
        justice: '对公正的执着。高分者重视规则公平;低分者更看情境权变。',
        duty: '责任与承诺。高分者一诺千金;低分者灵活变通。',
        empathy: '共情能力。高分者能体会他人感受;低分者偏理性判断。',
        discipline: '自我节制。高分者克制有度;低分者随性而为。',
        econ_left: '支持再分配、政府干预的倾向。',
        econ_right: '支持市场自由、小政府的倾向。',
        authority: '重视秩序与权威的倾向。',
        liberty: '重视个人自由的倾向。',
        tradition: '传统价值与文化的认同。',
        progress: '变革与进步的倾向。',
        nationalist: '民族本位倾向。',
        globalist: '全球协作倾向。',
      },
      // 洞察标签
      insight_labels: {
        decision_style: '决策风格', time_pressure_effect: '时间压力', consistency: '一致性',
        iat_bias: '内隐偏向', courage_index: '勇气指数', ambivalence: '纠结度',
      },
      // 冲突类型
      conflict_labels: {
        high_hesitation: '犹豫', frequent_change: '反复', timeout_instinct: '本能',
        dimension_contradiction: '矛盾', iat_implicit_explicit: '分裂', iat_hesitation: '潜犹豫',
      },
      // 报告
      back_home: '回到首页',
      my_reports: '我的报告',
      copy_compare_code: '复制对比码',
      compare_code_copied: '已复制,可粘贴给好友',
      higher_than: '高于 {pct}%',
    },
    history: {
      title: '镜中影像',
      hero_title: '曾照见',
      hero_sub: 'Visions Past',
      hero_disc: '每一次凝视,皆留下一道影像',
      type_labels: { celebrity: '名人镜', value: '价值镜', ideology: '意识镜' },
      enter: '入镜 →',
      retake: '复测',
      retake_hint: '重测同一面镜子,看看你是否变了',
    },
    figure: {
      title: '人物志',
      back: '← 返回',
      anecdote_title: '一则轶事',
      view_reports: '我的报告',
      not_found: '查无此人',
    },

    bootcamp: {
      title: '训练营 — MindMirror',
      back: '← 返回结果',
      enter: '进入训练营 · 今日开练',
      eyebrow: 'BOOTCAMP',
      select_title: '挑一把要磨的刀',
      select_sub: '变强的是特质,不是变成某人',
      inspire: '启发来源:{figure}(仅为砥砺,非模仿)',
      pick: '选它 ▸',
      no_result: '先去测一次,才能选特质',
      no_trait: '暂无可磨的特质,先去照照镜子',
      mission_eyebrow: 'TODAY',
      mission_title: '今日教官任务',
      account: '做不到别睡',
      task_prefix: '今日任务',
      show_strict: '看教官原话',
      hide_strict: '收起教官原话',
      syncing: '同步中…',
      done_tag: '已成',
      retry: '重试',
      retry_hint: '同步失败:{msg}。再点一次重试。',
      streak_unit: '天',
      badge_short: '铁血',
      badge_hint: '连续 7 天,方得铁血',
      badge_hint_progress: '距铁血徽章还差 {n} 天',
      done_title: '今日收操',
      done_sub: '三令皆成,明天接着练。',
      tomorrow: '明日再来 →',
      error_title: '连接中断',
      error_sub: '教官暂时联系不上,稍后再试。',
      error_login_required: '训练营需要登录才能开启哦。可以先去登录,或者做完测评后从报告页的"进入训练营"按钮直接进。',
      empty_title: '今日未布训',
      empty_sub: '今天教官还没发任务,要不先去照照镜子?',
      empty_cta: '回我的结果',
      result_link: '查看我的结果',
      share_btn: '生成分享卡',
      share_title: '我的铁血训练卡',
      share_save: '保存图片',
      share_via: '喊战友来练',
      share_hint: '把进度甩给朋友,叫他们也来磨刀',
      share_no_data: '先完成一次训练再分享',
      // 6 个固定特质(对应后端 TraitTarget 枚举,英文 key 不翻译)
      traits: {
        more_decisive: '更果断',
        more_courageous: '更敢担当',
        more_resolute: '更坚定',
        more_action: '更敢行动',
        more_principled: '更守原则',
        more_focused: '更专注',
      },
      trait_desc: '选你想磨砺的一面,教官每日布训磨你',
    },
    compare: {
      title: '关系对比',
      sub: '把对方的对比码贴进来,看看你们的反差与默契。',
      go: '开始对比',
      copy_mine: '复制我的对比码',
      placeholder: '粘贴对方的对比码',
      compat: '契合度',
      self_label: '你',
      other_label: '对方',
      no_result: '还没有测评结果呢,先去照照镜子吧。',
      invalid: '这个对比码好像不对,或者结果已不存在,再核对一下?',
      copy_ok: '已复制,发给朋友吧。',
    },
    notfound: {
      title: '镜子未照见此处',
      sub: '你访问的页面不存在,或已被移动。回到镜子前,继续看见自己。',
      home: '回到首页',
    },
    login: {
      title: '登录 — 心镜',
      eyebrow: 'SIGN IN',
      title_zh: '心镜账户',
      sub: '注册或登录,训练进度与对比码将绑定账户。',
      email_ph: '邮箱',
      pwd_ph: '密码(至少 8 位)',
      nick_ph: '昵称(注册可选)',
      show: '显示',
      hide: '隐藏',
      register: '注册',
      login: '登录',
      err_email: '请输入有效邮箱',
      err_pwd: '密码至少 8 位',
      err_credentials: '邮箱或密码好像不对,再试试?',
      err_exists: '这个邮箱已经注册过了,直接登录就好',
      err_failed: '操作失败,请稍后重试',
    },
    profile: {
      title: '我的面板',
      hero_title: '探索者档案',
      hero_sub: 'Explorer',
      hero_disc: '你的每一次凝视,都在此留存',
      account_card: '账户',
      joined: '加入于',
      total_assessments: '测评总数',
      training_card: '训练',
      streak_current: '当前连续',
      streak_longest: '最长连续',
      iron_badge: '铁血徽章',
      badge_earned: '已获得',
      badge_locked: '未解锁',
      current_trait: '当前特质',
      no_goal: '尚未设定训练目标',
      recent_reports: '最近报告',
      no_reports: '还没有报告,先去照照镜子',
      compare_card: '对比',
      copy_compare_code: '复制最新对比码',
      copied: '已复制',
      login_required: '登录后查看完整面板',
      go_login: '去登录',
    },
  },

  en: {
    common: {
      back: '← Back',
      exit: '← Exit',
      confirm: 'Confirm',
      start: 'Begin',
      loading: 'Loading…',
      processing: 'Generating your report…',
      processing_sub: 'A moment please — usually takes 5–15 seconds',
      error_generic: 'Something went wrong',
      submit_failed: 'Submission failed, please retry',
      err_timeout: 'Request timed out, please retry',
      err_offline: 'Network offline, check your connection',
      back_home: 'Back Home',
      my_reports: 'My Reports',
      compare: 'Compare',
      login: 'Sign In',
      about: 'About',
      about_brand: 'About MindMirror',
      profile: 'My Profile',
      minutes: 'min',
      questions: 'Q',
      your_mirror: 'Your MindMirror',
      mirror_unused: 'The Mirror Has Not Been Used',
      mirror_unused_sub: 'Your first reflection will be captured here',
      language: 'Language',
      notice_i18n_partial: 'Interface is trilingual; question content is Chinese-only in this build',
    },
    seo: {
      site_name: 'MindMirror',
      default_description: 'MindMirror — three mirrors (Celebrity, Value, Ideology) reveal who you truly are, through scenario-based questions and behavioral trajectories.',
      default_keywords: 'personality test, MBTI, values, ideology, soul resonance, self-discovery, MindMirror',
      home_title: 'MindMirror — See Truly',
      home_description: 'Three mirrors — Celebrity, Value, Ideology — reveal who you truly are through scenario-based questions and behavioral trajectories.',
      take_title: '{name} — MindMirror',
      take_description: 'Taking the {name} mirror. Choose by first instinct what fits you best.',
      report_title: 'Your MindMirror Report',
      report_description: 'View your profile tags, dimension detail, inner conflicts and behavioral insights.',
      history_title: 'Visions Past — MindMirror',
      history_description: 'Every reflection leaves an image. Review the mirrors you have looked into.',
      bootcamp_title: 'Bootcamp — MindMirror',
      bootcamp_description: 'Daily drill from your instructor. Forge your traits, earn the Iron Badge.',
      compare_title: 'Relational Compare — MindMirror',
      compare_description: 'Paste a friend\'s compare code and see your contrast and harmony.',
      about_title: 'About MindMirror',
      about_description: 'MindMirror is an open-source self-discovery tool built on scenario-based assessments and behavioral trajectory analysis.',
      login_title: 'Sign In — MindMirror',
      login_description: 'Register or sign in to sync your bootcamp progress and compare codes.',
      notfound_title: '404 — The mirror sees nothing here — MindMirror',
      notfound_description: 'The page does not exist or has been moved. Return to the mirror and keep discovering yourself.',
      figure_title: 'Figure — MindMirror',
      figure_description: 'Detailed portraits and anecdotes of historical figures, from Lincoln to Turing.',
      profile_title: 'My Profile — MindMirror',
      profile_description: 'Your explorer archive: account, training overview, recent reports and compare code.',
      og_image: '/images/og-card.svg',
      og_type: 'website',
      twitter_card: 'summary_large_image',
    },
    home: {
      brand: 'MindMirror',
      subtitle: 'See Truly',
      disclaimer: 'For Self-Exploration · For Reference Only',
      onthisday_title: 'Today\'s Figures',
      onthisday_sub: 'Meet three historical souls by chance',
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
      enter: 'Enter →',
    },
    take: {
      title_celebrity: 'Celebrity Mirror',
      title_value: 'Value Mirror',
      title_ideology: 'Ideology Mirror',
      section_label: 'Part {n}',
      section_intro_default: 'Choose by first instinct what fits you best',
      type_label: {
        scale: 'Scale', dilemma: 'Dilemma', allocation: 'Allocation', sort: 'Sort',
        iat: 'IAT', slider: 'Slider', forced_choice: 'Forced Choice',
        matrix: 'Matrix', auction: 'Auction',
      },
      auto_balance: 'Auto-Balance',
      total_label: 'Total',
      rhythm: 'Pace',
      // Question hints, aria-labels and alert messages (previously hardcoded)
      dilemma_historical: '— Historically, {figure} too faced a similar choice',
      alloc_hint: 'Total must = {total} · Use buttons or drag the slider',
      btn_minus: 'Minus {n}',
      btn_plus: 'Plus {n}',
      sort_hint: 'Drag or use arrows to rank — 1 = most important',
      sort_move_up: 'Move up',
      sort_move_down: 'Move down',
      iat_hint: 'Trust your instinct — the faster the better',
      slider_hint: 'Drag the slider to mark your tendency',
      slider_aria: 'Tendency slider',
      forced_choice_hint: 'Choose one — no middle ground',
      matrix_labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'],
      matrix_hint: 'Rate your agreement with each statement',
      auction_remaining: 'Coins left',
      auction_hint: 'Budget may be kept — your bids reflect the true value you place on each item',
      alert_alloc_sum: 'The total needs to equal {total} (right now it\'s {sum}) — just tap "Auto-Balance" and it\'ll sort itself out.',
      alert_matrix_incomplete: 'Pick an agreement level for every statement, don\'t skip any.',
      alert_auction_over: 'Total bids can\'t go over the budget of {budget} (you\'re at {sum} right now).',
      // Draft resume
      draft_resume_title: 'You were on question {n}',
      draft_resume_sub: 'Continue your previous reflection?',
      draft_continue: 'Continue',
      draft_restart: 'Start Over',
    },
    report: {
      back: '← Back',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: 'Celebrity · Soul Resonator' },
        value:     { eyebrow: 'VALUE',     title: 'Value · Moral Coordinates' },
        ideology:  { eyebrow: 'IDEOLOGY',  title: 'Ideology · Spectrum Map' },
      },
      tags_empty: '— Not enough data to generate profile tags —',
      sec_matches: 'Top Matches',
      sec_dimensions: 'Dimension Detail',
      sec_conflicts: 'Inner Conflicts',
      sec_insights: 'Behavioral Insights',
      dim_labels: {
        openness: 'Openness', conscientiousness: 'Conscientiousness', extraversion: 'Extraversion',
        agreeableness: 'Agreeableness', neuroticism: 'Neuroticism', risk_taking: 'Risk Taking', idealism: 'Idealism',
        honesty: 'Honesty', altruism: 'Altruism', justice: 'Justice', duty: 'Duty', empathy: 'Empathy', discipline: 'Discipline',
        econ_left: 'Econ-Left', econ_right: 'Econ-Right', authority: 'Authority', liberty: 'Liberty',
        tradition: 'Tradition', progress: 'Progress', nationalist: 'Nationalist', globalist: 'Globalist',
      },
      dim_desc: {
        openness: 'Openness to new experiences, art, abstract ideas. High: curious, imaginative. Low: practical, conventional.',
        conscientiousness: 'Self-discipline and goal-orientation. High: organized, planned. Low: flexible, spontaneous.',
        extraversion: 'Energy directed outward. High: active, sociable. Low: reserved, recharges alone.',
        agreeableness: 'Interpersonal orientation. High: warm, altruistic. Low: direct, competitive.',
        neuroticism: 'Emotional sensitivity. High: feels deeply, reactive. Low: emotionally stable.',
        risk_taking: 'Appetite for uncertainty. High: bold, adventurous. Low: cautious, steady.',
        idealism: 'Tension between ideals and reality. High: principle above all. Low: outcome-oriented.',
        honesty: 'Sincerity and directness. High: tells truth even at cost. Low: comfortable with gray areas.',
        altruism: 'Willingness to give to others. High: strong altruism. Low: self-preservation first.',
        justice: 'Commitment to fairness. High: rules matter. Low: situational judgment.',
        duty: 'Responsibility and commitment. High: keeps promises. Low: flexible.',
        empathy: 'Capacity to feel others\' emotions. High: attuned. Low: rational judgment.',
        discipline: 'Self-restraint. High: measured. Low: spontaneous.',
        econ_left: 'Tendency toward redistribution and state intervention.',
        econ_right: 'Tendency toward free markets and small government.',
        authority: 'Valuing order and authority.',
        liberty: 'Valuing individual freedom.',
        tradition: 'Identification with traditional values.',
        progress: 'Inclination toward change and progress.',
        nationalist: 'Nation-first orientation.',
        globalist: 'Global cooperation orientation.',
      },
      insight_labels: {
        decision_style: 'Decision Style', time_pressure_effect: 'Time Pressure', consistency: 'Consistency',
        iat_bias: 'Implicit Bias', courage_index: 'Courage Index', ambivalence: 'Ambivalence',
      },
      conflict_labels: {
        high_hesitation: 'Hesitation', frequent_change: 'Indecision', timeout_instinct: 'Instinct',
        dimension_contradiction: 'Contradiction', iat_implicit_explicit: 'Split', iat_hesitation: 'Latent Hesitation',
      },
      back_home: 'Back to Home',
      my_reports: 'My Reports',
      copy_compare_code: 'Copy Compare Code',
      compare_code_copied: 'Copied — paste to a friend',
      higher_than: 'Higher than {pct}%',
    },
    history: {
      title: 'Reflections',
      hero_title: 'What You Have Seen',
      hero_sub: 'Visions Past',
      hero_disc: 'Every gaze leaves a trace in the mirror',
      type_labels: { celebrity: 'Celebrity Mirror', value: 'Value Mirror', ideology: 'Ideology Mirror' },
      enter: 'Enter →',
      retake: 'Retake',
      retake_hint: 'Look into the same mirror again — have you changed?',
    },
    figure: {
      title: 'Figure',
      back: '← Back',
      anecdote_title: 'An Anecdote',
      view_reports: 'My Reports',
      not_found: 'Figure not found',
    },

    bootcamp: {
      title: 'Bootcamp — MindMirror',
      back: '← Back to Result',
      enter: 'Enter Bootcamp · Start Today',
      eyebrow: 'BOOTCAMP',
      select_title: 'Pick the edge you want to sharpen',
      select_sub: 'What grows is the trait, not someone you become',
      inspire: 'Inspired by: {figure} (for tempering, not imitation)',
      pick: 'Pick it ▸',
      no_result: 'Take an assessment first to choose a trait',
      no_trait: 'No trait to sharpen yet — look in the mirror first',
      mission_eyebrow: 'TODAY',
      mission_title: "Today's Drill Sergeant Tasks",
      account: 'No sleep till done',
      task_prefix: 'Task',
      show_strict: 'Read the Sergeant’s words',
      hide_strict: 'Hide the Sergeant’s words',
      syncing: 'Syncing…',
      done_tag: 'Done',
      retry: 'Retry',
      retry_hint: 'Sync failed: {msg}. Tap again to retry.',
      streak_unit: 'days',
      badge_short: 'IRON',
      badge_hint: '7 days straight earns Iron Blood',
      badge_hint_progress: '{n} days to Iron Blood badge',
      done_title: 'Drill Complete',
      done_sub: 'All orders met. Back tomorrow.',
      tomorrow: 'Come Back Tomorrow →',
      error_title: 'Connection Lost',
      error_sub: 'The sergeant is unreachable. Try again later.',
      error_login_required: 'The bootcamp needs you to sign in first. You can log in now, or hop in from the "Enter Bootcamp" button on a report page after finishing an assessment.',
      empty_title: 'No Drill Today',
      empty_sub: 'The sergeant hasn\'t posted any tasks today — maybe look in the mirror first?',
      empty_cta: 'Back to My Result',
      result_link: 'View My Result',
      share_btn: 'Make Share Card',
      share_title: 'My Iron Blood Card',
      share_save: 'Save Image',
      share_via: 'Call in Allies',
      share_hint: 'Throw your progress at friends — make them train too',
      share_no_data: 'Finish a drill before sharing',
      // 6 fixed traits (matching backend TraitTarget enum; English keys stay untranslated)
      traits: {
        more_decisive: 'More Decisive',
        more_courageous: 'More Courageous',
        more_resolute: 'More Resolute',
        more_action: 'More Action',
        more_principled: 'More Principled',
        more_focused: 'More Focused',
      },
      trait_desc: 'Pick a trait to forge — your instructor drills you daily',
    },
    compare: {
      title: 'Relation Compare',
      sub: 'Paste a friend’s compare code to see where you clash and click.',
      go: 'Compare',
      copy_mine: 'Copy My Code',
      placeholder: 'Paste a friend’s compare code',
      compat: 'Compatibility',
      self_label: 'You',
      other_label: 'Them',
      no_result: 'Looks like you don\'t have an assessment yet — why not look in the mirror first?',
      invalid: 'That code doesn\'t seem right, or the result no longer exists — double-check it?',
      copy_ok: 'Copied — send it to a friend.',
    },
    notfound: {
      title: 'The mirror sees nothing here',
      sub: 'The page does not exist or has been moved. Return to the mirror and keep discovering yourself.',
      home: 'Back to home',
    },
    login: {
      title: 'Sign In — MindMirror',
      eyebrow: 'SIGN IN',
      title_zh: 'MindMirror Account',
      sub: 'Register or sign in — your training progress and compare code will be bound to your account.',
      email_ph: 'Email',
      pwd_ph: 'Password (min 8 chars)',
      nick_ph: 'Nickname (optional for register)',
      show: 'Show',
      hide: 'Hide',
      register: 'Register',
      login: 'Sign In',
      err_email: 'Please enter a valid email',
      err_pwd: 'Password must be at least 8 characters',
      err_credentials: 'That email or password doesn\'t look right — give it another try?',
      err_exists: 'This email is already registered, just sign in directly',
      err_failed: 'Something went wrong, please try again later',
    },
    profile: {
      title: 'My Profile',
      hero_title: 'Explorer Archive',
      hero_sub: 'Explorer',
      hero_disc: 'Every reflection is preserved here',
      account_card: 'Account',
      joined: 'Joined',
      total_assessments: 'Assessments',
      training_card: 'Training',
      streak_current: 'Current Streak',
      streak_longest: 'Longest Streak',
      iron_badge: 'Iron Badge',
      badge_earned: 'Earned',
      badge_locked: 'Locked',
      current_trait: 'Current Trait',
      no_goal: 'No training goal set',
      recent_reports: 'Recent Reports',
      no_reports: 'No reports yet — look in the mirror first',
      compare_card: 'Compare',
      copy_compare_code: 'Copy Latest Compare Code',
      copied: 'Copied',
      login_required: 'Sign in to view your full profile',
      go_login: 'Sign In',
    },
  },

  ja: {
    common: {
      back: '← 戻る',
      exit: '← 終了',
      confirm: '確認',
      start: '開始',
      loading: '読み込み中…',
      processing: 'レポート生成中…',
      processing_sub: '少々お待ちください — 通常 5〜15 秒',
      error_generic: '予期しないエラー',
      submit_failed: '送信に失敗しました。再試行してください',
      err_timeout: 'リクエストがタイムアウトしました。後でもう一度',
      err_offline: 'ネットワークが切断されました',
      back_home: 'ホームへ',
      my_reports: 'レポート',
      compare: '関係比較',
      login: 'ログイン',
      about: '心鏡とは',
      about_brand: '心鏡について',
      profile: 'マイパネル',
      minutes: '分',
      questions: '問',
      your_mirror: 'あなたの心鏡',
      mirror_unused: '鏡はまだ使われていません',
      mirror_unused_sub: '初めての凝視がここに留められる',
      language: '言語',
      notice_i18n_partial: 'インターフェースは三語対応、設問内容は中国語のみ',
    },
    seo: {
      site_name: '心鏡 MindMirror',
      default_description: '心鏡 MindMirror —— 名人鏡・価値鏡・意識鏡の三面鏡で、状況設定問題と行動軌跡を通じて本当の自分を見る。',
      default_keywords: '心理測定,人格テスト,MBTI,価値観,イデオロギー,名人魂マッチ,自己探索,心鏡',
      home_title: '心鏡 MindMirror — 本当の自分を見る',
      home_description: '名人鏡・価値鏡・意識鏡の三面鏡で、状況設定問題と行動軌跡を通じて本当の自分を見る。',
      take_title: '{name} — 心鏡',
      take_description: '心鏡 {name} に回答中。直感で最も近い選択肢を選んでください。',
      report_title: 'あなたの心鏡レポート — MindMirror',
      report_description: 'プロフィールタグ、次元詳細、内面の葛藤、行動インサイトを確認。',
      history_title: '鏡の中の影像 — 心鏡',
      history_description: '一度でも覗き込んだ鏡を振り返る。すべての凝視が影像を残す。',
      bootcamp_title: '訓練営 — 心鏡',
      bootcamp_description: '毎日の教官任務。特性を鍛え、連続チェックインで鉄血バッジを獲得。',
      compare_title: '関係対比 — 心鏡',
      compare_description: '相手の対比コードを貼り付けて、あなたたちの対比と共鳴を見る。',
      about_title: '心鏡について — MindMirror',
      about_description: '心鏡は状況設定評価と行動軌跡分析に基づくオープンソースの自己探索ツール。',
      login_title: 'サインイン — 心鏡',
      login_description: '登録またはサインインして訓練進捗と対比コードを同期。',
      notfound_title: '404 — 鏡はここを照らさない — 心鏡',
      notfound_description: 'ページは存在しないか、移動されました。鏡に戻り、自分を見つめ続けてください。',
      figure_title: '人物誌 — 心鏡 MindMirror',
      figure_description: '歴史人物の詳細紹介と逸話。リンカーンからチューリングまで、魂の本色を見る。',
      profile_title: 'マイパネル — 心鏡',
      profile_description: 'あなたの探索者アーカイブ:アカウント、訓練概要、最近のレポートと対比コード。',
      og_image: '/images/og-card.svg',
      og_type: 'website',
      twitter_card: 'summary_large_image',
    },
    home: {
      brand: '心鏡',
      subtitle: '真の自己を見る',
      disclaimer: '自己探索 · 参考のみ',
      onthisday_title: '今日の出会い',
      onthisday_sub: '三人の歴史の魂と偶然に出会う',
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
      enter: '入鏡 →',
    },
    take: {
      title_celebrity: '名人鏡',
      title_value: '価値鏡',
      title_ideology: '意識鏡',
      section_label: '第 {n} 部分',
      section_intro_default: '第一直感で自分に最も近いものを選んでください',
      type_label: {
        scale: '評定尺度', dilemma: 'ジレンマ', allocation: '資源配分', sort: '並べ替え',
        iat: '内隠連想', slider: 'スライダー', forced_choice: '強制選択',
        matrix: '同意度行列', auction: '価値オークション',
      },
      auto_balance: '自動配分',
      total_label: '合計',
      rhythm: 'ペース',
      // 設問ヒント・aria-label・アラート文案（旧ハードコード中文）
      dilemma_historical: '— 歴史上,{figure} も同様の選択に直面した',
      alloc_hint: '配分合計 = {total} が必要 · ボタンまたはスライダーで操作',
      btn_minus: '−{n}',
      btn_plus: '+{n}',
      sort_hint: 'ドラッグまたは矢印で並べ替え、1 = 最重要',
      sort_move_up: '上に移動',
      sort_move_down: '下に移動',
      iat_hint: '直感で、速いほど良い',
      slider_hint: 'スライダーをドラッグして傾向を示す',
      slider_aria: '傾向スライダー',
      forced_choice_hint: 'どちらかを選択、中間なし',
      matrix_labels: ['強く反対', '反対', 'やや反対', '中立', 'やや同意', '同意', '強く同意'],
      matrix_hint: '各陳述への同意度を選択',
      auction_remaining: '残りコイン',
      auction_hint: '予算は保持可能、入札は各項目への真の価値評価を反映',
      alert_alloc_sum: '合計を {total} に合わせてくださいね（いま {sum}）。「自動配分」を押せばすぐ揃います。',
      alert_matrix_incomplete: 'どの陳述も同意度を選んでね、抜けがないように。',
      alert_auction_over: '入札合計は予算 {budget} を超えられません（いま {sum} です）。',
      // 草稿復元
      draft_resume_title: '前回は第 {n} 問まで進んでいました',
      draft_resume_sub: '前回の凝視を続けますか',
      draft_continue: '続ける',
      draft_restart: 'やり直す',
    },
    report: {
      back: '← 戻る',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: '名鏡 · 魂の共振' },
        value:     { eyebrow: 'VALUE',     title: '義鏡 · 価値座標' },
        ideology:  { eyebrow: 'IDEOLOGY',  title: '意識鏡 · スペクトル' },
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
      dim_desc: {
        openness: '新しい経験・芸術・抽象観念への開放度。高得点者は好奇心旺盛、想像力豊か。低得点者は実務的、伝統寄り。',
        conscientiousness: '自己規律と目標志向。高得点者は自律的、計画的。低得点者は柔軟、気まぐれ。',
        extraversion: '外部世界へのエネルギー。高得点者は活発、社交的。低得点者は控えめ、独处で充電。',
        agreeableness: '対人志向。高得点者は温厚、利他的。低得点者は直接的、競争的。',
        neuroticism: '感情の感受性。高得点者は深く感受、反応的。低得点者は情緒安定。',
        risk_taking: '不確実性への嗜好。高得点者は大胆、冒険的。低得点者は慎重、堅実。',
        idealism: '理想と現実の張力。高得点者は原則優先。低得点者は結果志向。',
        honesty: '誠実さと率直さ。高得点者は代償があっても真実を語る。低得点者はグレーゾーンに寛容。',
        altruism: '他者に与える意欲。高得点者は強い利他性。低得点者は自己保存優先。',
        justice: '公正への執着。高得点者はルール重視。低得点者は状況判断。',
        duty: '責任と約束。高得点者は約束を守る。低得点者は柔軟。',
        empathy: '共感能力。高得点者は他者の感情に同調。低得点者は理性判断。',
        discipline: '自己抑制。高得点者は節度あり。低得点者は気まぐれ。',
        econ_left: '再分配と政府介入への傾向。',
        econ_right: '自由市場と小さな政府への傾向。',
        authority: '秩序と権威を重視する傾向。',
        liberty: '個人自由を重視する傾向。',
        tradition: '伝統的価値への同一化。',
        progress: '変化と進歩への傾向。',
        nationalist: '民族優先志向。',
        globalist: 'グローバル協力志向。',
      },
      insight_labels: {
        decision_style: '意思決定', time_pressure_effect: '時間圧力', consistency: '一貫性',
        iat_bias: '内隠偏向', courage_index: '勇気指数', ambivalence: 'ためらい',
      },
      conflict_labels: {
        high_hesitation: '躊躇', frequent_change: '反復', timeout_instinct: '本能',
        dimension_contradiction: '矛盾', iat_implicit_explicit: '分裂', iat_hesitation: '潜在躊躇',
      },
      back_home: 'ホームへ戻る',
      my_reports: 'レポート',
      copy_compare_code: '比較コードをコピー',
      compare_code_copied: 'コピーしました',
      higher_than: '{pct}% より上',
    },
    history: {
      title: '鏡中の影像',
      hero_title: '照らし出したもの',
      hero_sub: 'Visions Past',
      hero_disc: 'すべての凝視は、鏡に一道の影像を残す',
      type_labels: { celebrity: '名人鏡', value: '価値鏡', ideology: '意識鏡' },
      enter: '入鏡 →',
      retake: '再測',
      retake_hint: '同じ鏡をもう一度見る — 変わったかどうか',
    },
    figure: {
      title: '人物誌',
      back: '← 戻る',
      anecdote_title: '一つの逸話',
      view_reports: 'レポート',
      not_found: '人物が見つかりません',
    },

    bootcamp: {
      title: '訓練营 — MindMirror',
      back: '← 結果へ戻る',
      enter: '訓練营へ · 今日から',
      eyebrow: 'BOOTCAMP',
      select_title: '研ぎ澄ます刃を選べ',
      select_sub: '変わるのは「特质」であって、誰かになることではない',
      inspire: '啓発源:{figure}(鍛錬のため、模倣ではない)',
      pick: 'これを選ぶ ▸',
      no_result: 'まず測定してから特质を選べ',
      no_trait: '磨くべき特质がまだない。まず鏡を見よ。',
      mission_eyebrow: 'TODAY',
      mission_title: '今日の教官任務',
      account: '終えるまで寝るな',
      task_prefix: '今日の任務',
      show_strict: '教官の言葉を見る',
      hide_strict: '教官の言葉を閉じる',
      syncing: '同期中…',
      done_tag: '達成',
      retry: '再試行',
      retry_hint: '同期失敗:{msg}。もう一度タップして再試行。',
      streak_unit: '日',
      badge_short: '鉄血',
      badge_hint: '7日連続で鉄血の証',
      badge_hint_progress: '鉄血バッジまで残り{n}日',
      done_title: '今日の訓練終了',
      done_sub: '三令達成、明日また来い。',
      tomorrow: '明日また来る →',
      error_title: '接続切断',
      error_sub: '教官と連絡が取れません。後ほど再試行。',
      error_login_required: '訓練营を利用するにはログインが必要です。まずログインするか、測定後にレポートページの「訓練营へ」ボタンから入ってくださいね。',
      empty_title: '今日は訓練なし',
      empty_sub: '今日は教官まだ任務を出していないようです。まず鏡を見てみませんか?',
      empty_cta: '結果へ戻る',
      result_link: '結果を見る',
      share_btn: '共有カードを作る',
      share_title: '私の鉄血訓練カード',
      share_save: '画像を保存',
      share_via: '戦友を呼ぶ',
      share_hint: '進捗を友に投げつけ、一緒に鍛えよう',
      share_no_data: '共有する前に一度訓練を終えよ',
      // 6 つの固定特性(後端 TraitTarget 列挙と対応、英語 key は翻訳しない)
      traits: {
        more_decisive: 'より決断を',
        more_courageous: 'より勇気を',
        more_resolute: 'より意志を',
        more_action: 'より行動を',
        more_principled: 'より原則を',
        more_focused: 'より集中を',
      },
      trait_desc: '鍛えたい一面を選べ——教官が毎日鍛えに来る',
    },
    compare: {
      title: '関係比較',
      sub: '友人の比較コードを貼り付け、反発と契合を見よ。',
      go: '比較する',
      copy_mine: '私のコードをコピー',
      placeholder: '友人の比較コードを貼り付け',
      compat: '契合度',
      self_label: 'あなた',
      other_label: '相手',
      no_result: 'まだ測定結果がないようです。まず鏡を見てみませんか?',
      invalid: 'このコードは違うかもしれません、あるいは結果がなくなったか。もう一度確認してみてくださいね。',
      copy_ok: 'コピーしました、友に送りましょう。',
    },
    notfound: {
      title: '鏡はここを照らさない',
      sub: 'ページが存在しない、または移動された。鏡に戻り、自分を見つめ続けよう。',
      home: 'ホームへ戻る',
    },
    login: {
      title: 'ログイン — MindMirror',
      eyebrow: 'SIGN IN',
      title_zh: 'MindMirror アカウント',
      sub: '登録またはログイン — 訓練進度と比較コードがアカウントに紐づきます。',
      email_ph: 'メール',
      pwd_ph: 'パスワード(8文字以上)',
      nick_ph: 'ニックネーム(登録時任意)',
      show: '表示',
      hide: '非表示',
      register: '登録',
      login: 'ログイン',
      err_email: '有効なメールを入力してください',
      err_pwd: 'パスワードは8文字以上必要です',
      err_credentials: 'メールまたはパスワードが違うかもしれません、もう一度お試しになりますか?',
      err_exists: 'このメールはもう登録されているようです、そのままログインしてくださいね',
      err_failed: '操作に失敗しました、後でもう一度お試しください',
    },
    profile: {
      title: 'マイパネル',
      hero_title: '探索者アーカイブ',
      hero_sub: 'Explorer',
      hero_disc: 'すべての凝視がここに残る',
      account_card: 'アカウント',
      joined: '参加日',
      total_assessments: '測定数',
      training_card: '訓練',
      streak_current: '現在連続',
      streak_longest: '最長連続',
      iron_badge: '鉄血バッジ',
      badge_earned: '獲得済み',
      badge_locked: '未解除',
      current_trait: '現在の特质',
      no_goal: '訓練目標未設定',
      recent_reports: '最近のレポート',
      no_reports: 'まだレポートがありません。まず鏡を見て',
      compare_card: '対比',
      copy_compare_code: '最新対比コードをコピー',
      copied: 'コピー済み',
      login_required: 'ログインして完全なパネルを表示',
      go_login: 'ログインへ',
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
    // lang 属性(统一带区域子标签,便于浏览器/读屏器选择字体与发音)
    const langTag = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' }[lang] || lang;
    document.documentElement.lang = langTag;
    // 激活态
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    // 触发自定义事件,让页面 JS 同步状态(题目/报告内容等)
    document.dispatchEvent(new CustomEvent('mm:lang-changed', { detail: { lang } }));
    // 同步刷新 SEO meta(切语言时 title/description/OG 都要更新)
    _applySeoMeta();
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
  // 优先读 URL ?lang= 参数(分享链接指定语言),其次读 localStorage
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang && MM_I18N_RESOURCES[urlLang]) {
    saved = urlLang;
    try { localStorage.setItem(MM_LANG_KEY, saved); } catch (e) {}
  } else {
    try { saved = localStorage.getItem(MM_LANG_KEY) || 'zh'; } catch (e) {}
  }
  if (!MM_I18N_RESOURCES[saved]) saved = 'zh';
  mmI18n.lang = saved;
  applyLang(saved);
}

// ============================================================
// SEO meta 动态注入 —— 各 HTML 头部只需声明
//   <meta name="mm-page" content="home">
// 引擎会读取 seo.{page}_title / seo.{page}_description 自动生成
//   <title>, <meta description>, OG, Twitter Card, canonical
// 切换语言时也会同步刷新(在 applyLang 末尾调用 _applySeoMeta)
// ============================================================
function _setMeta(attr, key, val) {
  if (!val) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', val);
}

function _applySeoMeta() {
  const pageEl = document.head.querySelector('meta[name="mm-page"]');
  if (!pageEl) return;
  const page = pageEl.getAttribute('content') || 'home';
  const t = mmI18n.t.bind(mmI18n);
  const title = t(`seo.${page}_title`) !== `seo.${page}_title`
    ? t(`seo.${page}_title`)
    : t('seo.home_title');
  const desc = t(`seo.${page}_description`) !== `seo.${page}_description`
    ? t(`seo.${page}_description`)
    : t('seo.default_description');
  const siteName = t('seo.site_name');
  const ogImage = t('seo.og_image');
  const ogType = t('seo.og_type');
  const twitterCard = t('seo.twitter_card');
  // OG image 必须是绝对 URL,社交平台才能抓取
  const ogImageUrl = new URL(ogImage, location.origin).href;

  if (title && title !== `seo.${page}_title`) {
    document.title = title;
  }
  _setMeta('name', 'description', desc);
  _setMeta('name', 'keywords', t('seo.default_keywords'));
  // Open Graph
  _setMeta('property', 'og:title', title);
  _setMeta('property', 'og:description', desc);
  _setMeta('property', 'og:site_name', siteName);
  _setMeta('property', 'og:type', ogType);
  _setMeta('property', 'og:image', ogImageUrl);
  _setMeta('property', 'og:locale', mmI18n.lang === 'zh' ? 'zh_CN' : (mmI18n.lang === 'ja' ? 'ja_JP' : 'en_US'));
  // Twitter Card
  _setMeta('name', 'twitter:card', twitterCard);
  _setMeta('name', 'twitter:title', title);
  _setMeta('name', 'twitter:description', desc);
  _setMeta('name', 'twitter:image', ogImageUrl);
  // canonical(若已存在则不覆盖);404 页面不注入 canonical(避免搜索引擎索引不存在的 URL)
  const pageType404 = document.querySelector('meta[name="mm-page"]')?.content === 'notfound';
  if (!pageType404 && !document.head.querySelector('link[rel="canonical"]')) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = location.origin + location.pathname;
    document.head.appendChild(link);
  }
  // theme-color(为 PWA / 浏览器 chrome 着色)
  _setMeta('name', 'theme-color', '#f4efe3');
}

// 自动初始化 —— DOM ready 时
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initLang(); _applySeoMeta(); });
} else {
  initLang();
  _applySeoMeta();
}
