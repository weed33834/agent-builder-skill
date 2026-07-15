// ============================================================
// 心镜 MindMirror —— 全站三语切换 (中 / EN / 日)
// 自研轻量 i18n 引擎,无外部依赖
// ============================================================

const MM_LANG_KEY = 'mm_lang';

// ============================================================
// 翻译资源
// 命名空间:page.section.element
// ============================================================
const MM_I18N_RESOURCES = {
  zh: {
    common: {
      back: '← 返回',
      back_short: '← 返回',
      exit: '← 退出',
      submit: '提交',
      confirm: '确认',
      next: '下一题',
      prev: '上一题',
      start: '开始',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      close: '关闭',
      loading: '加载中…',
      processing: '生成报告中…',
      processing_sub: '请稍候,这通常需要 5-15 秒',
      error_generic: '出现了一点意外',
      retry: '重试',
      submit_failed: '提交失败,请重试',
      back_home: '回到首页',
      my_reports: '我的报告',
      about: '关于',
      share: '分享',
      download: '下载',
      export: '导出',
      yes: '是',
      no: '否',
      skip: '跳过',
      all: '全部',
      remaining: '剩余',
      total: '总计',
      used: '已用',
      seconds: '秒',
      minutes: '分钟',
      questions: '题',
      progress: '进度',
      about_brand: '关于心镜',
      you: '你',
      your_mirror: '你的心镜',
      mirror_unused: '镜面尚未启用',
      mirror_unused_sub: '你的第一次凝视将在此留影',
      no_data: '尚无影像',
      language: '语言',
      // 注意:此语言下题目内容仍为中文
      notice_i18n_partial: '当前为界面三语,题目内容仅提供中文版',
    },
    home: {
      brand: '心镜',
      subtitle: 'MindMirror',
      disclaimer: '非心理诊断 · 仅供参考',
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
      auto_balance: '自动配平',
      remaining_label: '剩余金币',
      total_label: '总计',
      of_total: '/ {total}',
      // 互动提示
      hint_drag: '拖拽排序',
      hint_tap: '点击选择',
      hint_slide: '拖动滑块',
      // 完成态
      completed: '已完成',
      thanks: '感谢你的凝视',
      generating: '正在生成报告',
      rhythm: '节奏',
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
      higher_than: '高于 {pct}%',
    },
    history: {
      title: '镜中影像',
      hero_title: '曾照见',
      hero_sub: 'Visions Past',
      hero_disc: '每一次凝视,皆留下一道影像',
      type_labels: { celebrity: '名人镜', value: '价值镜', ideology: '意识镜' },
      list_empty: '尚未留存任何影像',
      list_clear: '抹去全部',
      back: '← 返回',
      enter: '入镜 →',
      not_found: '这份报告已消散',
      retake: '复测',
      retake_hint: '重测同一面镜子,看看你是否变了',
    },
  },

  en: {
    common: {
      back: '← Back',
      back_short: '← Back',
      exit: '← Exit',
      submit: 'Submit',
      confirm: 'Confirm',
      next: 'Next',
      prev: 'Prev',
      start: 'Begin',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading…',
      processing: 'Generating your report…',
      processing_sub: 'A moment please — usually takes 5–15 seconds',
      error_generic: 'Something went wrong',
      retry: 'Retry',
      submit_failed: 'Submission failed, please retry',
      back_home: 'Back to Home',
      my_reports: 'My Reports',
      about: 'About',
      share: 'Share',
      download: 'Download',
      export: 'Export',
      yes: 'Yes',
      no: 'No',
      skip: 'Skip',
      all: 'All',
      remaining: 'Remaining',
      total: 'Total',
      used: 'Used',
      seconds: 's',
      minutes: 'min',
      questions: 'Q',
      progress: 'Progress',
      about_brand: 'About MindMirror',
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
      subtitle: 'See Truly',
      disclaimer: 'Not a Clinical Diagnosis · For Reference Only',
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
      intro_disclaimer: 'Response time and hesitation count enter your final report',
      timer_warning: 'Time running short',
      progress_label: '{current} / {total}',
      type_label: {
        scale: 'Scale', dilemma: 'Dilemma', allocation: 'Allocation', sort: 'Sort',
        iat: 'IAT', slider: 'Slider', forced_choice: 'Forced Choice',
        matrix: 'Matrix', auction: 'Auction',
      },
      auto_balance: 'Auto-Balance',
      remaining_label: 'Coins Left',
      total_label: 'Total',
      of_total: '/ {total}',
      hint_drag: 'Drag to Rank',
      hint_tap: 'Tap to Select',
      hint_slide: 'Drag the Slider',
      completed: 'Completed',
      thanks: 'Thank you for your gaze',
      generating: 'Generating report',
      rhythm: 'Pace',
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
      higher_than: 'Higher than {pct}%',
    },
    history: {
      title: 'Reflections',
      hero_title: 'What You Have Seen',
      hero_sub: 'Visions Past',
      hero_disc: 'Every gaze leaves a trace in the mirror',
      type_labels: { celebrity: 'Celebrity Mirror', value: 'Value Mirror', ideology: 'Ideology Mirror' },
      list_empty: 'No reflection has been kept',
      list_clear: 'Erase All',
      back: '← Back',
      enter: 'Enter →',
      not_found: 'This reflection has faded',
      retake: 'Retake',
      retake_hint: 'Look into the same mirror again — have you changed?',
    },
  },
  ja: {
    common: {
      back: '← 戻る',
      back_short: '← 戻る',
      exit: '← 終了',
      submit: '送信',
      confirm: '確認',
      next: '次へ',
      prev: '前へ',
      start: '開始',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      close: '閉じる',
      loading: '読み込み中…',
      processing: 'レポート生成中…',
      processing_sub: '少々お待ちください — 通常 5〜15 秒',
      error_generic: '予期しないエラー',
      retry: '再試行',
      submit_failed: '送信に失敗しました。再試行してください',
      back_home: 'ホームへ戻る',
      my_reports: 'レポート',
      about: '心鏡とは',
      share: '共有',
      download: 'ダウンロード',
      export: 'エクスポート',
      yes: 'はい',
      no: 'いいえ',
      skip: 'スキップ',
      all: '全て',
      remaining: '残り',
      total: '合計',
      used: '使用',
      seconds: '秒',
      minutes: '分',
      questions: '問',
      progress: '進捗',
      about_brand: '心鏡について',
      you: 'あなた',
      your_mirror: 'あなたの心鏡',
      mirror_unused: '鏡はまだ使われていません',
      mirror_unused_sub: '初めての凝視がここに留められる',
      no_data: '影像はまだありません',
      language: '言語',
      notice_i18n_partial: 'インターフェースは三語対応、設問内容は中国語のみ',
    },
    home: {
      brand: '心鏡',
      subtitle: '真の自己を見る',
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
      enter: '入鏡 →',
    },
    take: {
      title_celebrity: '名人鏡',
      title_value: '価値鏡',
      title_ideology: '意識鏡',
      section_label: '第 {n} 部分',
      section_intro_default: '第一直感で自分に最も近いものを選んでください',
      intro_disclaimer: '回答時間と躊躇回数は最終レポートに反映されます',
      timer_warning: '残りわずか',
      progress_label: '{current} / {total}',
      type_label: {
        scale: '評定尺度', dilemma: 'ジレンマ', allocation: '資源配分', sort: '並べ替え',
        iat: '内隠連想', slider: 'スライダー', forced_choice: '強制選択',
        matrix: '同意度行列', auction: '価値オークション',
      },
      auto_balance: '自動配分',
      remaining_label: '残り金貨',
      total_label: '合計',
      of_total: '/ {total}',
      hint_drag: 'ドラッグで順位',
      hint_tap: 'タップで選択',
      hint_slide: 'スライダーをドラッグ',
      completed: '完了',
      thanks: 'ご凝視ありがとうございました',
      generating: 'レポート生成中',
      rhythm: 'ペース',
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
      higher_than: '{pct}% より上',
    },
    history: {
      title: '鏡中の影像',
      hero_title: '照らし出したもの',
      hero_sub: 'Visions Past',
      hero_disc: 'すべての凝視は、鏡に一道の影像を残す',
      type_labels: { celebrity: '名人鏡', value: '価値鏡', ideology: '意識鏡' },
      list_empty: 'まだ影像は残されていません',
      list_clear: '全て消去',
      back: '← 戻る',
      enter: '入鏡 →',
      not_found: 'この影像は消え去りました',
      retake: '再測',
      retake_hint: '同じ鏡をもう一度見る — 変わったかどうか',
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
