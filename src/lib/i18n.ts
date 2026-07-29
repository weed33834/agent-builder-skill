/**
 * 全站三语 i18n —— 移植自原项目 static/i18n.js,改为 React 友好的 hook 形式。
 * 资源命名空间:page.section.element,支持 "a.b.c" 嵌套 + {var} 插值 + 数组。
 * 语言状态走 Zustand(useLangStore),持久化到 localStorage(沿用原 key mm_lang)。
 */
import { useSyncExternalStore } from 'react'
import { useLangStore, type Lang } from '@/store'

// ===================== 资源类型(宽松,允许嵌套对象/字符串/数组) =====================
type ResNode = string | number | ResNode[] | { [k: string]: ResNode }
type ResTree = Record<Lang, ResNode>

// ===================== 翻译资源 =====================
const RES: ResTree = {
  zh: {
    nav: { celebrity: '名人镜', value: '价值镜', ideology: '意识镜', figures: '名人志' },
    common: {
      back: '← 返回', exit: '← 退出', confirm: '确认', start: '开始',
      loading: '加载中…', processing: '生成报告中…', processing_sub: '请稍候,这通常需要 5-15 秒',
      error_generic: '出现了一点意外', submit_failed: '提交失败,请重试', retry: '重试',
      err_timeout: '请求超时,请稍后重试', err_offline: '网络已断开,请检查连接',
      back_home: '回到首页', about: '关于', about_brand: '关于心镜',
      minutes: '分钟', questions: '题', your_mirror: '你的心镜',
      mirror_unused: '镜面尚未启用', mirror_unused_sub: '你的第一次凝视将在此留影',
      language: '语言', notice_i18n_partial: '当前为界面三语,题目内容仅提供中文版',
      menu: '菜单', main_nav: '主导航', privacy: '隐私政策', assessments: '测评',
    },
    seo: {
      site_name: '心镜 MindMirror',
      default_description: '心镜 MindMirror —— 通过名人镜、价值镜、意识镜三面镜子,以情境化答题和行为轨迹,看见真实的自己。',
      default_keywords: '心理测评,人格测试,MBTI,价值观,意识形态,名人灵魂匹配,自我探索,心镜',
      home_title: '心镜 MindMirror — 看见真实的自己',
      home_description: '通过名人镜、价值镜、意识镜三面镜子,以情境化答题与行为轨迹,看见真实的自己。',
      take_title: '{name} — 心镜', take_description: '正在作答心镜 {name},凭第一直觉选择最贴近你的选项。',
      report_title: '你的心镜报告 — MindMirror', report_description: '查看你的画像标签、维度详解、内在冲突与行为洞察。',
      about_title: '关于心镜 — MindMirror', about_description: '心镜是一个开源的自我探索工具,基于情境化测评与行为轨迹分析。',
      notfound_title: '404 — 镜子未照见此处 — 心镜', notfound_description: '你访问的页面不存在,或已被移动。回到镜子前,继续看见自己。',
      figure_title: '人物志 — 心镜 MindMirror', figure_description: '历史名人的详细介绍与轶事,从林肯到图灵,看见灵魂的底色。',
      privacy_title: '隐私政策 — 心镜 MindMirror', privacy_description: '心镜 MindMirror 隐私政策:我们收集哪些数据、为何收集、如何留存,以及你对自己数据的查看、导出与删除权利。',
    },
    home: {
      brand: '心镜', subtitle: 'MindMirror', disclaimer: '自我探索 · 仅供参考',
      onthisday_title: '今日认识', onthisday_sub: '与三位历史灵魂偶然相遇',
      mirrors: {
        celebrity: { icon: '名', title: '名人镜', tagline: '与历史灵魂对望', desc: '通过回答与历史名人真实困境相似的选择,测出你与谁最相近。从林肯的坚守到图灵的内向天才,找到与你底色共振的那个人。' },
        value: { icon: '义', title: '价值镜', tagline: '你的价值坐标', desc: '从利他、公正、诚实到自律,多维度刻画你在利益与原则之间的真实站位——你以为的原则,是否经得起情境的考验。' },
        ideology: { icon: '场', title: '意识镜', tagline: '政治光谱定位', desc: '经济与社会双轴交织,如实呈现你在政治光谱上的投影——不预设立场,也不引导结论。' },
      },
      enter: '入镜 →', hero_lede: '三面镜子,九种方法,照见你在历史长河与价值坐标中的真实投影。',
      start_cta: '开始第一次凝视', about_cta: '了解心镜', hero_trust: '无需注册 · 匿名 · 约 8 分钟',
      howto_1_label: '选镜', howto_1_desc: '选择一面镜子:名人、价值或意识',
      howto_2_label: '答题', howto_2_desc: '九种方法,约 8 分钟,诚实作答',
      howto_3_label: '照见', howto_3_desc: '获得专属报告,照见真实投影',
      figures: {
        title: '名人志', sub: '五十位历史灵魂,等你照见', search: '搜索姓名或标签',
        view_all_cta: '查看全部 50 位 →', chip_all: '全部', count: '共 {n} 位', no_match: '没有匹配的名人',
      },
    },
    take: {
      title_celebrity: '名人镜', title_value: '价值镜', title_ideology: '意识镜',
      section_label: '第 {n} 部分', section_intro_default: '凭第一直觉选择最贴近你的选项',
      type_label: { scale: '量表题', dilemma: '困境题', allocation: '资源分配', sort: '排序题', iat: '内隐联想', slider: '强度滑块', forced_choice: '强迫抉择', matrix: '同意度矩阵', auction: '价值拍卖' },
      auto_balance: '自动配平', total_label: '总计', rhythm: '节奏',
      dilemma_historical: '— 历史上,{figure} 亦曾面对相似抉择',
      alloc_hint: '分配总和须 = {total} · 可用按钮或拖动滑块', btn_minus: '减{n}', btn_plus: '加{n}',
      sort_hint: '拖拽或点击箭头排序,1 = 最重要', sort_move_up: '上移', sort_move_down: '下移',
      iat_hint: '凭直觉,越快越好', slider_hint: '拖动滑块,标记你的倾向', slider_aria: '倾向滑块',
      forced_choice_hint: '必须选其一,无中间地带',
      matrix_labels: ['强烈反对', '反对', '较反对', '中立', '较同意', '同意', '强烈同意'],
      matrix_hint: '对每条陈述选择同意程度', auction_remaining: '剩余金币',
      auction_hint: '可保留预算,出价反映你对每项的真实价值评估',
      alert_alloc_sum: '分配总和需要等于 {total}(现在是 {sum}),点一下「自动配平」就能补齐啦。',
      alert_matrix_incomplete: '每条陈述都选一下同意程度吧,别漏掉哦。',
      alert_auction_over: '总出价不能超过预算 {budget} 哦(现在是 {sum})。',
      draft_resume_title: '上次进行到第 {n} 题', draft_resume_sub: '是否继续上次未完成的凝视',
      draft_continue: '继续作答', draft_restart: '重新开始', load_failed: '题库加载失败', load_failed_sub: '网络似乎不太稳定,请检查连接后重试',
    },
    report: {
      back: '← 返回',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: '名镜 · 灵魂对望' },
        value: { eyebrow: 'VALUE', title: '义镜 · 价值坐标' },
        ideology: { eyebrow: 'IDEOLOGY', title: '意识镜 · 光谱定位' },
      },
      tags_empty: '— 数据尚不足以生成画像标签 —',
      sec_matches: '核心匹配', sec_dimensions: '维度详解', sec_conflicts: '内在冲突', sec_insights: '行为洞察',
      dim_labels: { openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性', agreeableness: '宜人性', neuroticism: '神经质', risk_taking: '风险偏好', idealism: '理想主义', honesty: '诚实', altruism: '利他', justice: '公正', duty: '责任', empathy: '共情', discipline: '自律', econ_left: '经济左', econ_right: '经济右', authority: '权威', liberty: '自由', tradition: '传统', progress: '进步', nationalist: '民族', globalist: '全球' },
      conflict_labels: { high_hesitation: '犹豫', frequent_change: '反复', timeout_instinct: '本能', dimension_contradiction: '矛盾', iat_implicit_explicit: '分裂', iat_hesitation: '潜犹豫' },
      insight_labels: { decision_style: '决策风格', time_pressure_effect: '时间压力', consistency: '一致性', iat_bias: '内隐偏向', courage_index: '勇气指数', ambivalence: '纠结度' },
      back_home: '回到首页', higher_than: '高于 {pct}%', btn_share: '分享 / 导出', btn_retake: '再照一次',
      error_title: '镜中空无', error_desc: '该结果不存在,或分享链接已失效。', error_back: '返回心镜首页',
    },
    figure: {
      title: '人物志', back: '← 返回', anecdote_title: '一则轶事', not_found: '查无此人',
      related_title: '相关:名人镜', related_desc: '想知道自己与这位历史人物有多接近?进入名人镜,用 80 道题照见你的灵魂底色。', related_cta: '进入名人镜 →',
    },
    notfound: { title: '镜子未照见此处', sub: '你访问的页面不存在,或已被移动。回到镜子前,继续看见自己。', home: '回到首页' },
    about: {
      sec_concept: '理解心镜',
      concept_body: '<p>市面上的人格测评大多是量表——你勾选,它加总,你得到一个标签。这套流程把人压缩成几个数字,却丢弃了最有价值的部分:你在面对两难时如何抉择,你在时间压力下流露的本能,你在改主意与笃定之间的微妙差异。</p><p>心镜不满足于此。它用<strong>两难困境</strong>将你置入历史情境,逼你在冲突中表态而非在安全区打分;用<strong>强迫抉择</strong>取消中间地带,让回避无处藏身;用<strong>价值拍卖</strong>以有限预算竞拍信念,出价即真实排序;用<strong>内隐联想</strong>绕过意识层,直接量度本能反应时差异。</p><p>每一道题都记录你的<strong>作答耗时、修改次数、决策轨迹</strong>。这些行为数据不直接改变维度得分,而是用于生成行为洞察与矛盾检测。秒选的答案会被标记,反复犹豫的会被追踪,笃定的选择会被识别。你以为你在选答案,其实答案也在选你。</p>',
      sec_mirrors: '三面镜子',
      mirrors: [
        { icon: '名', title: '名人镜', desc: '照见你与历史上哪位灵魂最为相近。80 题(fast 20 / standard 40 / deep 80),50 位历史人物库——不是模仿,是回响。从林肯的坚守到图灵的内向天才,找到与你底色共振的那个人。' },
        { icon: '义', title: '价值镜', desc: '照见你的价值坐标与道德水平。80 题(fast 20 / standard 40 / deep 80),从利他、公正、诚实到自律,多维度刻画你在利益与原则之间的真实站位——你以为的原则,是否经得起情境的考验。' },
        { icon: '场', title: '意识镜', desc: '照见你的意识形态坐标。80 题(fast 20 / standard 40 / deep 80),24 种意识形态库,经济轴与社会轴交叉定位。不预设立场,不引导结论,只如实呈现你在政治光谱上的投影。' },
      ],
      sec_methods: '九种答题方法',
      methods: [
        { name: '量表题', en: 'Scale', desc: '五点量表,测量稳定的人格倾向。看似简单,却是校准基准线的基础。' },
        { name: '困境题', en: 'Dilemma', desc: '历史两难情境,逼你在冲突中表态。没有标准答案,只有你的选择。' },
        { name: '强度滑块', en: 'Slider', desc: '0-100 连续光谱,取消离散选项的安全感。你必须精确标记倾向强度。' },
        { name: '强迫抉择', en: 'Forced Choice', desc: '二选其一,无中间地带。当逃避被取消,真实的偏好才浮现。' },
        { name: '同意度矩阵', en: 'Matrix', desc: '多条陈述 × 七点 Likert,测量结构化信念系统的一致性与矛盾。' },
        { name: '价值拍卖', en: 'Auction', desc: '有限预算竞拍价值观。出价即真实排序,可保留预算反映保留态度。' },
        { name: '资源分配', en: 'Allocation', desc: '总额固定,分配即优先级。总和必须等于给定值,无处藏私。' },
        { name: '排序题', en: 'Sort', desc: '拖拽排序,1 = 最重要。位置权重非线性递减,第一名远比第四名重要。' },
        { name: '内隐联想', en: 'IAT', desc: '凭直觉快速分类。反应时差异绕过意识,直接量度本能偏向。' },
      ],
      sec_behavior: '行为轨迹与计分',
      behavior_body: '<p>心镜的计分引擎按选项分值累加并归一化。行为数据不改变维度得分,而是用于洞察与矛盾检测:</p><p><strong>作答耗时</strong>——记录每题耗时,用于识别犹豫(远超中位数)与秒选(低于 1 秒)。这些模式不降低分数,但会在行为洞察中标注,帮助你理解自己的决策风格。</p><p><strong>修改次数</strong>——改主意 3 次以上的题目会被标记为"价值未定型"。这不是惩罚,而是承认:反复摇摆的回答本身就是一个信号,揭示你在该议题上的内在张力。</p><p><strong>决策轨迹</strong>——排序题的位置权重非线性递减,第一名与第二名的分差远大于第四与第五。资源分配题的峰值项会被高亮。这些轨迹数据让计分从"你最终选了什么"升级为"你如何选"。</p><p>最终,各维度得分经动态归一化映射到 0-100,再通过正态分布 CDF 估算百分位——告诉你在这个维度上高于多少人。冲突检测会揪出跨题型的维度矛盾(量表说左、排序说右)、IAT 内隐与外显的分裂、犹豫与反复的模式,生成六维行为洞察。</p>',
      sec_privacy: '数据与隐私',
      privacy_body: '<p>本测评<strong>完全匿名</strong>。系统仅以一个本地 token 关联你的记录,不收集姓名、邮箱、设备标识或任何身份信息。行为轨迹(作答耗时、修改次数、拖拽路径)仅用于生成更精准的报告,不会外传,不会用于广告投放,不会用于模型训练。</p><p>所有数据只存储在你自己的浏览器(localStorage)。你可以随时清除——在设置或浏览器中清除站点数据,那些影像便从镜中消散,了无痕迹。心镜没有服务器、没有数据库,你的回答永远不会离开这台设备。</p>',
      sec_boundary: '边界与声明',
      boundary_body: '<p>心镜是<strong>一面镜子</strong>,不是一把尺子。</p><p>它能照见倾向,不构成任何医疗诊断;它能引发思考,不能替代专业咨询。人格是多维且流动的,任何测评都只是某个切面的投影。若结果让你感到不安,请以平常心待之——镜中所见,不过是你某一刻的投影,而非你的全部。</p><p>名人匹配基于历史人物的典型行为特征评估,意识形态匹配基于经典理论坐标定位,两者均非精确科学,仅供自我探索与参考。</p><p style="margin-top:32px;color:var(--paper-faint);font-size:13px;letter-spacing:0.15em">— 镜不言,只照 —</p>',
    },
  },

  en: {
    nav: { celebrity: 'Celebrity', value: 'Value', ideology: 'Ideology', figures: 'Figures' },
    common: {
      back: '← Back', exit: '← Exit', confirm: 'Confirm', start: 'Begin',
      loading: 'Loading…', processing: 'Generating your report…', processing_sub: 'A moment please — usually takes 5–15 seconds',
      error_generic: 'Something went wrong', submit_failed: 'Submission failed, please retry', retry: 'Retry',
      err_timeout: 'Request timed out, please retry', err_offline: 'Network offline, check your connection',
      back_home: 'Back Home', about: 'About', about_brand: 'About MindMirror',
      minutes: 'min', questions: 'Q', your_mirror: 'Your MindMirror',
      mirror_unused: 'The Mirror Has Not Been Used', mirror_unused_sub: 'Your first reflection will be captured here',
      language: 'Language', notice_i18n_partial: 'Interface is trilingual; question content is Chinese-only in this build',
      menu: 'Menu', main_nav: 'Main navigation', privacy: 'Privacy', assessments: 'Assessments',
    },
    seo: {
      site_name: 'MindMirror',
      default_description: 'MindMirror — three mirrors (Celebrity, Value, Ideology) reveal who you truly are, through scenario-based questions and behavioral trajectories.',
      default_keywords: 'personality test, MBTI, values, ideology, soul resonance, self-discovery, MindMirror',
      home_title: 'MindMirror — See Truly',
      home_description: 'Three mirrors — Celebrity, Value, Ideology — reveal who you truly are through scenario-based questions and behavioral trajectories.',
      take_title: '{name} — MindMirror', take_description: 'Taking the {name} mirror. Choose by first instinct what fits you best.',
      report_title: 'Your MindMirror Report', report_description: 'View your profile tags, dimension detail, inner conflicts and behavioral insights.',
      about_title: 'About MindMirror', about_description: 'MindMirror is an open-source self-discovery tool built on scenario-based assessments and behavioral trajectory analysis.',
      notfound_title: '404 — The mirror sees nothing here — MindMirror', notfound_description: 'The page does not exist or has been moved. Return to the mirror and keep discovering yourself.',
      figure_title: 'Figure — MindMirror', figure_description: 'Detailed portraits and anecdotes of historical figures, from Lincoln to Turing.',
      privacy_title: 'Privacy Policy — MindMirror', privacy_description: 'MindMirror privacy policy: what data we collect, why, how long we keep it, and your rights to view, export and delete your data.',
    },
    home: {
      brand: 'MindMirror', subtitle: 'See Truly', disclaimer: 'For Self-Exploration · For Reference Only',
      onthisday_title: "Today's Figures", onthisday_sub: 'Meet three historical souls by chance',
      mirrors: {
        celebrity: { icon: 'C', title: 'Celebrity Mirror', tagline: 'Resonate with a historical soul', desc: "By answering choices similar to real dilemmas of historical figures, measure whom you most closely resemble. From Lincoln's resolve to Turing's introverted genius, find the figure whose undertone harmonizes with yours." },
        value: { icon: 'V', title: 'Value Mirror', tagline: 'Your moral coordinates', desc: 'From altruism and justice to honesty and discipline, multidimensional mapping of where you truly stand between interest and principle. Can your convictions survive the test of context?' },
        ideology: { icon: 'I', title: 'Ideology Mirror', tagline: 'Spectrum positioning', desc: 'Cross-positioned on economic and social axes. No presupposed stance, no guided conclusion — only an honest projection of where you fall on the political spectrum.' },
      },
      enter: 'Enter →', hero_lede: 'Three mirrors, nine methods — see your true projection across history and values.',
      start_cta: 'Begin Your First Gaze', about_cta: 'About MindMirror', hero_trust: 'No signup · Anonymous · ~8 min',
      howto_1_label: 'Choose', howto_1_desc: 'Pick a mirror: Celebrity, Value, or Ideology',
      howto_2_label: 'Answer', howto_2_desc: 'Nine methods, about 8 minutes, answer honestly',
      howto_3_label: 'See', howto_3_desc: 'Get a personalized report — see your true projection',
      figures: {
        title: 'Hall of Figures', sub: 'Fifty historical souls, waiting to be mirrored', search: 'Search by name or tag',
        view_all_cta: 'Browse all 50 →', chip_all: 'All', count: '{n} figures', no_match: 'No matching figures',
      },
    },
    take: {
      title_celebrity: 'Celebrity Mirror', title_value: 'Value Mirror', title_ideology: 'Ideology Mirror',
      section_label: 'Part {n}', section_intro_default: 'Choose by first instinct what fits you best',
      type_label: { scale: 'Scale', dilemma: 'Dilemma', allocation: 'Allocation', sort: 'Sort', iat: 'IAT', slider: 'Slider', forced_choice: 'Forced Choice', matrix: 'Matrix', auction: 'Auction' },
      auto_balance: 'Auto-Balance', total_label: 'Total', rhythm: 'Pace',
      dilemma_historical: '— Historically, {figure} too faced a similar choice',
      alloc_hint: 'Total must = {total} · Use buttons or drag the slider', btn_minus: 'Minus {n}', btn_plus: 'Plus {n}',
      sort_hint: 'Drag or use arrows to rank — 1 = most important', sort_move_up: 'Move up', sort_move_down: 'Move down',
      iat_hint: 'Trust your instinct — the faster the better', slider_hint: 'Drag the slider to mark your tendency', slider_aria: 'Tendency slider',
      forced_choice_hint: 'Choose one — no middle ground',
      matrix_labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'],
      matrix_hint: 'Rate your agreement with each statement', auction_remaining: 'Coins left',
      auction_hint: 'Budget may be kept — your bids reflect the true value you place on each item',
      alert_alloc_sum: 'The total needs to equal {total} (right now it\'s {sum}) — just tap "Auto-Balance" and it\'ll sort itself out.',
      alert_matrix_incomplete: 'Pick an agreement level for every statement, don\'t skip any.',
      alert_auction_over: 'Total bids can\'t go over the budget of {budget} (you\'re at {sum} right now).',
      draft_resume_title: 'You were on question {n}', draft_resume_sub: 'Continue your previous reflection?',
      draft_continue: 'Continue', draft_restart: 'Start Over', load_failed: 'Failed to load questions', load_failed_sub: 'The network seems unstable. Check your connection and retry.',
    },
    report: {
      back: '← Back',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: 'Celebrity · Soul Resonator' },
        value: { eyebrow: 'VALUE', title: 'Value · Moral Coordinates' },
        ideology: { eyebrow: 'IDEOLOGY', title: 'Ideology · Spectrum Map' },
      },
      tags_empty: '— Not enough data to generate profile tags —',
      sec_matches: 'Top Matches', sec_dimensions: 'Dimension Detail', sec_conflicts: 'Inner Conflicts', sec_insights: 'Behavioral Insights',
      dim_labels: { openness: 'Openness', conscientiousness: 'Conscientiousness', extraversion: 'Extraversion', agreeableness: 'Agreeableness', neuroticism: 'Neuroticism', risk_taking: 'Risk Taking', idealism: 'Idealism', honesty: 'Honesty', altruism: 'Altruism', justice: 'Justice', duty: 'Duty', empathy: 'Empathy', discipline: 'Discipline', econ_left: 'Econ-Left', econ_right: 'Econ-Right', authority: 'Authority', liberty: 'Liberty', tradition: 'Tradition', progress: 'Progress', nationalist: 'Nationalist', globalist: 'Globalist' },
      conflict_labels: { high_hesitation: 'Hesitation', frequent_change: 'Indecision', timeout_instinct: 'Instinct', dimension_contradiction: 'Contradiction', iat_implicit_explicit: 'Split', iat_hesitation: 'Latent Hesitation' },
      insight_labels: { decision_style: 'Decision Style', time_pressure_effect: 'Time Pressure', consistency: 'Consistency', iat_bias: 'Implicit Bias', courage_index: 'Courage Index', ambivalence: 'Ambivalence' },
      back_home: 'Back to Home', higher_than: 'Higher than {pct}%', btn_share: 'Share / Export', btn_retake: 'Take Again',
      error_title: 'The Mirror Is Empty', error_desc: 'This result does not exist, or the share link has expired.', error_back: 'Back to MindMirror Home',
    },
    figure: {
      title: 'Figure', back: '← Back', anecdote_title: 'An Anecdote', not_found: 'Figure not found',
      related_title: 'Related: Celebrity Mirror', related_desc: 'Wonder how close you are to this historical figure? Enter the Celebrity Mirror — 80 questions reveal the undertone of your soul.', related_cta: 'Enter Celebrity Mirror →',
    },
    notfound: { title: 'The mirror sees nothing here', sub: 'The page does not exist or has been moved. Return to the mirror and keep discovering yourself.', home: 'Back to home' },
    about: {
      sec_concept: 'WHAT IS MINDMIRROR',
      concept_body: '<p>Most personality assessments are checklists — you tick boxes, it tallies scores, you receive a label. This process compresses a person into a handful of numbers and discards the most valuable signal: how you decide under conflict, what instinct surfaces under time pressure, the subtle difference between hesitation and conviction.</p><p>MindMirror rejects this reduction. It uses <strong>moral dilemmas</strong> to place you in historical situations, forcing you to take a stand rather than score from a safe distance. It uses <strong>forced choice</strong> to eliminate the middle ground, leaving avoidance nowhere to hide. It uses <strong>value auctions</strong> where you bid on beliefs with a finite budget — your bid is your true ranking. It uses <strong>implicit association</strong> to bypass the conscious mind and measure raw reaction-time differences.</p><p>Every question records your <strong>response time, edit count, and decision trajectory</strong>. This behavioral data does not directly alter dimension scores — it is used to generate behavioral insights and conflict detection. Instant picks are flagged, repeated hesitation is tracked, confident choices are recognized. You think you are choosing answers; the answers are also choosing you.</p>',
      sec_mirrors: 'THREE MIRRORS',
      mirrors: [
        { icon: 'C', title: 'Celebrity Mirror', desc: "Reveals which historical soul you most closely resemble. 80 questions (fast 20 / standard 40 / deep 80), a library of 50 historical figures — not imitation, but resonance. From Lincoln's resolve to Turing's introverted genius, find the figure whose undertone harmonizes with yours." },
        { icon: 'V', title: 'Value Mirror', desc: 'Maps your value coordinates and moral level. 80 questions (fast 20 / standard 40 / deep 80) across altruism, justice, honesty, and discipline — multidimensional portrayal of where you truly stand between interest and principle. Can your convictions survive the test of context?' },
        { icon: 'I', title: 'Ideology Mirror', desc: 'Locates your ideological coordinates. 80 questions (fast 20 / standard 40 / deep 80), a library of 24 ideologies, cross-positioned on economic and social axes. No presupposed stance, no guided conclusion — only an honest projection of where you fall on the political spectrum.' },
      ],
      sec_methods: 'NINE QUESTION TYPES',
      methods: [
        { name: 'Scale', en: 'Scale', desc: 'Five-point Likert scale measuring stable personality traits. Simple in form, yet the foundation for calibrating the baseline.' },
        { name: 'Dilemma', en: 'Dilemma', desc: 'Historical moral dilemmas forcing you to take a stand under conflict. No correct answer — only your answer.' },
        { name: 'Slider', en: 'Slider', desc: 'A 0-100 continuous spectrum removing the safety of discrete options. You must precisely mark the intensity of your inclination.' },
        { name: 'Forced Choice', en: 'Forced Choice', desc: 'Pick one of two, no middle ground. When escape is cancelled, true preference surfaces.' },
        { name: 'Matrix', en: 'Matrix', desc: 'Multiple statements × seven-point Likert, measuring the consistency and contradictions within your belief system.' },
        { name: 'Auction', en: 'Auction', desc: 'Bid on values with a finite budget. Your bid is your true ranking; retaining budget reflects reserved attitudes.' },
        { name: 'Allocation', en: 'Allocation', desc: 'Fixed total — distribution is priority. The sum must equal the given value, leaving no room to hide.' },
        { name: 'Sort', en: 'Sort', desc: 'Drag to rank, 1 = most important. Position weights decay non-linearly; first place matters far more than fourth.' },
        { name: 'IAT', en: 'IAT', desc: 'Classify by intuition, fast as possible. Reaction-time differences bypass consciousness, measuring implicit bias directly.' },
      ],
      sec_behavior: 'BEHAVIORAL TRAJECTORY & SCORING',
      behavior_body: "<p>MindMirror's scoring engine tallies option values and normalizes them. Behavioral data does not alter dimension scores — it powers insights and conflict detection:</p><p><strong>Response time</strong> — every question's duration is logged to identify hesitation (far above median) and instant picks (under 1 second). These patterns don't reduce scores but are flagged in behavioral insights, helping you understand your decision style.</p><p><strong>Edit count</strong> — questions changed 3 or more times are flagged as \"unformed values.\" This isn't a penalty but an acknowledgment: a wavering answer is itself a signal, revealing inner tension on that issue.</p><p><strong>Decision trajectory</strong> — in ranking questions, position weights decay non-linearly; the gap between first and second far exceeds that between fourth and fifth. In allocation questions, the peak item is highlighted. This trajectory data elevates scoring from \"what you chose\" to \"how you chose\".</p><p>Finally, dimension scores are dynamically normalized to 0-100, then fed through a normal-distribution CDF to estimate percentiles — telling you what fraction of people you surpass on each dimension. Conflict detection surfaces cross-type contradictions (left on the scale, right in the ranking), IAT implicit-explicit splits, and hesitation patterns, yielding six-dimensional behavioral insights.</p>",
      sec_privacy: 'DATA & PRIVACY',
      privacy_body: '<p>This assessment is <strong>fully anonymous</strong>. The system associates your records with a single local token — it collects no name, email, device identifier, or any personally identifying information. Behavioral trajectories (response time, edit count, drag path) are used solely to generate a more precise report. They are never transmitted externally, used for advertising, or used for model training.</p><p>All data lives only in your own browser (localStorage). You may clear it at any time — wipe your site data in settings or your browser, and those reflections dissipate from the mirror without a trace. MindMirror has no server and no database; your answers never leave this device.</p>',
      sec_boundary: 'BOUNDARIES & DISCLAIMER',
      boundary_body: '<p>MindMirror is <strong>a mirror, not a ruler</strong>.</p><p>It can reveal tendencies, not constitute any medical diagnosis; it can provoke thought, not replace professional consultation. Personality is multidimensional and fluid — any assessment is merely a projection of one cross-section. If a result unsettles you, receive it with equanimity: what the mirror shows is but a projection of a single moment, not the whole of you.</p><p>Celebrity matching is based on assessed typical behavioral traits of historical figures; ideology matching is based on classical-theory coordinate positioning. Neither is exact science — both are for self-exploration and reference only.</p><p style="margin-top:32px;color:var(--paper-faint);font-size:13px;letter-spacing:0.15em">— The mirror speaks not; it only reflects —</p>',
    },
  },

  ja: {
    nav: { celebrity: '名人鏡', value: '価値鏡', ideology: '意識鏡', figures: '人物志' },
    common: {
      back: '← 戻る', exit: '← 終了', confirm: '確認', start: '開始',
      loading: '読み込み中…', processing: 'レポート生成中…', processing_sub: '少々お待ちください — 通常 5〜15 秒',
      error_generic: '予期しないエラー', submit_failed: '送信に失敗しました。再試行してください', retry: '再試行',
      err_timeout: 'リクエストがタイムアウトしました。後でもう一度', err_offline: 'ネットワークが切断されました',
      back_home: 'ホームへ', about: '心鏡とは', about_brand: '心鏡について',
      minutes: '分', questions: '問', your_mirror: 'あなたの心鏡',
      mirror_unused: '鏡はまだ使われていません', mirror_unused_sub: '初めての凝視がここに留められる',
      language: '言語', notice_i18n_partial: 'インターフェースは三語対応、設問内容は中国語のみ',
      menu: 'メニュー', main_nav: 'メインナビ', privacy: 'プライバシー', assessments: '測評',
    },
    seo: {
      site_name: '心鏡 MindMirror',
      default_description: '心鏡 MindMirror —— 名人鏡・価値鏡・意識鏡の三面鏡で、状況設定問題と行動軌跡を通じて本当の自分を見る。',
      default_keywords: '心理測定,人格テスト,MBTI,価値観,イデオロギー,名人魂マッチ,自己探索,心鏡',
      home_title: '心鏡 MindMirror — 本当の自分を見る',
      home_description: '名人鏡・価値鏡・意識鏡の三面鏡で、状況設定問題と行動軌跡を通じて本当の自分を見る。',
      take_title: '{name} — 心鏡', take_description: '心鏡 {name} に回答中。直感で最も近い選択肢を選んでください。',
      report_title: 'あなたの心鏡レポート — MindMirror', report_description: 'プロフィールタグ、次元詳細、内面の葛藤、行動インサイトを確認。',
      about_title: '心鏡について — MindMirror', about_description: '心鏡は状況設定評価と行動軌跡分析に基づくオープンソースの自己探索ツール。',
      notfound_title: '404 — 鏡はここを照らさない — 心鏡', notfound_description: 'ページは存在しないか、移動されました。鏡に戻り、自分を見つめ続けてください。',
      figure_title: '人物誌 — 心鏡 MindMirror', figure_description: '歴史人物の詳細紹介と逸話。リンカーンからチューリングまで、魂の本色を見る。',
      privacy_title: 'プライバシーポリシー — 心鏡 MindMirror', privacy_description: '心鏡 MindMirror プライバシーポリシー:収集するデータ、その目的、保有期間、およびあなたのデータに対する権利について。',
    },
    home: {
      brand: '心鏡', subtitle: '真の自己を見る', disclaimer: '自己探索 · 参考のみ',
      onthisday_title: '今日の出会い', onthisday_sub: '三人の歴史の魂と偶然に出会う',
      mirrors: {
        celebrity: { icon: '名', title: '名人鏡', tagline: '歴史の魂と共鳴する', desc: '歴史的人物の実際のジレンマに似た選択に答えることで、最も近い人物を測定。リンカーンの堅持からチューリングの内向的な天才まで、あなたの本色と共鳴する人物を見つける。' },
        value: { icon: '義', title: '価値鏡', tagline: 'あなたの道徳座標', desc: '利他・公正・誠実・自律から、利益と原則の間での真の立ち位置を多次元的に描写。あなたの原則は状況の試練に耐えられるか。' },
        ideology: { icon: '場', title: '意識鏡', tagline: '政治スペクトル定位', desc: '経済軸と社会軸の交叉で位置決め。立場を前提せず、結論を誘導せず、政治スペクトル上の投影をありのままに提示する。' },
      },
      enter: '入鏡 →', hero_lede: '三つの鏡、九つの方法で、歴史と価値の座標における真の投影を見る。',
      start_cta: '最初の凝視を始める', about_cta: '心鏡について', hero_trust: '登録不要 · 匿名 · 約8分',
      howto_1_label: '選鏡', howto_1_desc: '鏡を選ぶ:名人、価値、意識',
      howto_2_label: '回答', howto_2_desc: '九つの方法、約8分、正直に答える',
      howto_3_label: '照見', howto_3_desc: '専用レポートを得て、真の投影を見る',
      figures: {
        title: '人物誌', sub: '五十人の歴史の魂が、あなたを待っている', search: '名前・タグで検索',
        view_all_cta: '全50人を見る →', chip_all: 'すべて', count: '全{n}人', no_match: '該当する人物がいません',
      },
    },
    take: {
      title_celebrity: '名人鏡', title_value: '価値鏡', title_ideology: '意識鏡',
      section_label: '第 {n} 部分', section_intro_default: '第一直感で自分に最も近いものを選んでください',
      type_label: { scale: '評定尺度', dilemma: 'ジレンマ', allocation: '資源配分', sort: '並べ替え', iat: '内隠連想', slider: 'スライダー', forced_choice: '強制選択', matrix: '同意度行列', auction: '価値オークション' },
      auto_balance: '自動配分', total_label: '合計', rhythm: 'ペース',
      dilemma_historical: '— 歴史上,{figure} も同様の選択に直面した',
      alloc_hint: '配分合計 = {total} が必要 · ボタンまたはスライダーで操作', btn_minus: '−{n}', btn_plus: '+{n}',
      sort_hint: 'ドラッグまたは矢印で並べ替え、1 = 最重要', sort_move_up: '上に移動', sort_move_down: '下に移動',
      iat_hint: '直感で、速いほど良い', slider_hint: 'スライダーをドラッグして傾向を示す', slider_aria: '傾向スライダー',
      forced_choice_hint: 'どちらかを選択、中間なし',
      matrix_labels: ['強く反対', '反対', 'やや反対', '中立', 'やや同意', '同意', '強く同意'],
      matrix_hint: '各陳述への同意度を選択', auction_remaining: '残りコイン',
      auction_hint: '予算は保持可能、入札は各項目への真の価値評価を反映',
      alert_alloc_sum: '合計を {total} に合わせてくださいね（いま {sum}）。「自動配分」を押せばすぐ揃います。',
      alert_matrix_incomplete: 'どの陳述も同意度を選んでね、抜けがないように。',
      alert_auction_over: '入札合計は予算 {budget} を超えられません（いま {sum} です）。',
      draft_resume_title: '前回は第 {n} 問まで進んでいました', draft_resume_sub: '前回の凝視を続けますか',
      draft_continue: '続ける', draft_restart: 'やり直す', load_failed: '問題の読み込みに失敗しました', load_failed_sub: 'ネットワークが不安定のようです。接続を確認して再試行してください',
    },
    report: {
      back: '← 戻る',
      titles: {
        celebrity: { eyebrow: 'CELEBRITY', title: '名鏡 · 魂の共振' },
        value: { eyebrow: 'VALUE', title: '義鏡 · 価値座標' },
        ideology: { eyebrow: 'IDEOLOGY', title: '意識鏡 · スペクトル' },
      },
      tags_empty: '— データ不足でラベルを生成できません —',
      sec_matches: 'コアマッチング', sec_dimensions: '次元詳解', sec_conflicts: '内的矛盾', sec_insights: '行動インサイト',
      dim_labels: { openness: '開放性', conscientiousness: '誠実性', extraversion: '外向性', agreeableness: '協調性', neuroticism: '神経質', risk_taking: 'リスク志向', idealism: '理想主義', honesty: '誠実', altruism: '利他', justice: '公正', duty: '責任', empathy: '共感', discipline: '自制', econ_left: '経済左', econ_right: '経済右', authority: '権威', liberty: '自由', tradition: '伝統', progress: '進歩', nationalist: '民族', globalist: 'グローバル' },
      conflict_labels: { high_hesitation: '躊躇', frequent_change: '反復', timeout_instinct: '本能', dimension_contradiction: '矛盾', iat_implicit_explicit: '分裂', iat_hesitation: '潜在躊躇' },
      insight_labels: { decision_style: '意思決定', time_pressure_effect: '時間圧力', consistency: '一貫性', iat_bias: '内隠偏向', courage_index: '勇気指数', ambivalence: 'ためらい' },
      back_home: 'ホームへ戻る', higher_than: '{pct}% より上', btn_share: 'シェア / エクスポート', btn_retake: 'もう一度映す',
      error_title: '鏡の中は空', error_desc: 'この結果は存在しないか、共有リンクが無効になっています。', error_back: '心鏡ホームへ戻る',
    },
    figure: {
      title: '人物誌', back: '← 戻る', anecdote_title: '一つの逸話', not_found: '人物が見つかりません',
      related_title: '関連:名人鏡', related_desc: 'この歴史人物にどれほど近いか知りたくない?名人鏡に入り、80問であなたの魂の本色を照らし出そう。', related_cta: '名人鏡へ →',
    },
    notfound: { title: '鏡はここを照らさない', sub: 'ページが存在しない、または移動された。鏡に戻り、自分を見つめ続けよう。', home: 'ホームへ戻る' },
    about: {
      sec_concept: '心鏡とは',
      concept_body: '<p>世にある性格診断の多くは評定尺度です——あなたがチェックを入れ、それを合計し、ラベルを受け取る。このプロセスは人間をいくつかの数字に圧縮し、最も価値ある信号を捨て去ります:葛藤の中でどう決断するか、時間制圧下で現れる本能、躊躇と確信の間の微妙な差異。</p><p>心鏡はこれに満足しません。<strong>ジレンマ</strong>であなたを歴史的状況に置き、安全な距離から採点するのではなく葛藤の中で態度を表明させます。<strong>強制選択</strong>で中間地帯を撤廃し、逃避の余地を奪います。<strong>価値オークション</strong>で有限の予算で信念に入札させ——入札額こそが真の順位です。<strong>内隠連想</strong>で意識を迂回し、純粋な反応時間の差を直接測定します。</p><p>各問題はあなたの<strong>回答時間、修正回数、意思決定の軌跡</strong>を記録します。これらの行動データは次元スコアを直接変更せず、行動インサイトと矛盾検出の生成に用いられます。即答はフラグ付けされ、反復する躊躇は追跡され、確信ある選択は識別されます。あなたが答えを選んでいると思う時、答えもまたあなたを選んでいるのです。</p>',
      sec_mirrors: '三面の鏡',
      mirrors: [
        { icon: '名', title: '名人鏡', desc: '歴史上のどの魂に最も近いかを映し出す。80問(fast 20 / standard 40 / deep 80)、50人の歴史人物庫——模倣ではなく、共鳴。リンカーンの堅持からチューリングの内向的な天才まで、あなたの本色と共鳴する人物を見つける。' },
        { icon: '義', title: '価値鏡', desc: 'あなたの価値座標と道徳水準を映し出す。80問(fast 20 / standard 40 / deep 80)、利他・公正・誠実・自律から、利益と原則の間での真の立ち位置を多角的に描写——あなたの原則は状況の試練に耐えられるか。' },
        { icon: '場', title: '意識鏡', desc: 'あなたのイデオロギー座標を映し出す。80問(fast 20 / standard 40 / deep 80)、24のイデオロギー庫、経済軸と社会軸の交叉で位置づけ。立場を前提せず、結論を誘導せず、政治スペクトル上の投影をありのままに提示する。' },
      ],
      sec_methods: '九つの回答方法',
      methods: [
        { name: '評定尺度', en: 'Scale', desc: '五点尺度、安定した性格傾向を測定。形式はシンプルだが、基準線を較正する基盤。' },
        { name: 'ジレンマ', en: 'Dilemma', desc: '歴史的倫理ジレンマ、葛藤の中で態度を強要。正解なし——あなたの答えのみ。' },
        { name: 'スライダー', en: 'Slider', desc: '0-100の連続スペクトル、離散選択肢の安心感を排除。傾向の強度を正確に示さなければならない。' },
        { name: '強制選択', en: 'Forced Choice', desc: '二択、中間地帯なし。逃避が取消された時、真の嗜好が浮上する。' },
        { name: '同意度行列', en: 'Matrix', desc: '複数の陳述×七点リッカート、信念体系の一貫性と矛盾を測定。' },
        { name: '価値オークション', en: 'Auction', desc: '有限予算で価値に入札。入札額こそ真の順位、予算の保留は保留態度を反映。' },
        { name: '資源配分', en: 'Allocation', desc: '総額固定、配分即優先順位。合計は与えられた値に等しくなければならず、隠れ場所なし。' },
        { name: '並べ替え', en: 'Sort', desc: 'ドラッグで順位付け、1 = 最重要。位置の重みは非線形減衰、第一位は第四位より遥かに重要。' },
        { name: '内隠連想', en: 'IAT', desc: '直感で高速分類。反応時間の差が意識を迂回し、本能的偏見を直接測定。' },
      ],
      sec_behavior: '行動軌跡と採点',
      behavior_body: '<p>心鏡の採点エンジンは選択肢の値を合計して正規化します。行動データは次元スコアを変更せず、インサイトと矛盾検出に使用されます:</p><p><strong>回答時間</strong>——各問題の所要時間を記録し、躊躇(中央値を大幅に超過)と即答(1秒未満)を識別。これらのパターンはスコアを下げず、行動インサイトでフラグ付けされ、自分の意思決定スタイルの理解に役立ちます。</p><p><strong>修正回数</strong>——3回以上変更された問題は「未成型の価値」としてフラグ付け。これは罰ではなく、揺れる回答自体が信号であり、その議題における内なる緊張を明らかにすることの承認です。</p><p><strong>意思決定軌跡</strong>——並べ替え問題では位置の重みが非線形減衰し、第一位と第二位の差は第四位と第五位の差を遥かに超える。配分問題ではピーク項が強調される。この軌跡データは採点を「何を選んだか」から「どう選んだか」へ昇格させます。</p><p>最終的に、各次元のスコアは動的に0-100に正規化され、正規分布CDFで百分位を推定します——各次元であなたが何パーセントの人を上回るかを示す。矛盾検出は次元を跨ぐ矛盾(尺度では左、並べ替えでは右)、IATの内隠と外顕の分裂、躊躇パターンを摘出し、六次元の行動インサイトを生成します。</p>',
      sec_privacy: 'データとプライバシー',
      privacy_body: '<p>本診断は<strong>完全匿名</strong>です。システムは単一のローカルトークンであなたの記録を関連付けるだけで、氏名、メール、デバイス識別子、いかなる個人情報も収集しません。行動軌跡(回答時間、修正回数、ドラッグ経路)はより精緻なレポート生成にのみ使用され、外部送信、広告利用、モデル学習には一切使用されません。</p><p>全データはあなた自身のブラウザ(LocalStorage)にのみ保存されます。いつでも消去できます——設定やブラウザでサイトデータを削除すれば、それらの影像は鏡から消散し、痕跡を残しません。心鏡にサーバーもデータベースもなく、あなたの回答がこの端末を離れることはありません。</p>',
      sec_boundary: '境界と免責',
      boundary_body: '<p>心鏡は<strong>鏡であって、定規ではない</strong>。</p><p>傾向を映し出すことはできても、医療診断を構成することはできません。思考を促すことはできても、専門相談の代わりにはなりません。性格は多次元かつ流動的であり、いかなる測評も一断面の投影に過ぎません。結果に不安を感じたなら、平常心で受け止めてください——鏡に映るのは、ある瞬間のあなたの投影であり、あなたのすべてではありません。</p><p>名人マッチングは歴史人物の典型的行動特徴の評価に基づき、イデオロギーマッチングは古典理論の座標定位に基づきます。いずれも精密科学ではなく、自己探求と参考のためのものです。</p><p style="margin-top:32px;color:var(--paper-faint);font-size:13px;letter-spacing:0.15em">— 鏡は語らず、ただ映す —</p>',
    },
  },
}

// ===================== 取值工具 =====================
function lookup(obj: ResNode | undefined, parts: string[]): ResNode | undefined {
  let cur: ResNode | undefined = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined
    cur = (cur as { [k: string]: ResNode })[p]
  }
  return cur
}

function interpolate(val: string, vars?: Record<string, string | number>): string {
  if (!vars) return val
  return val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
}

/** 纯函数翻译:指定 lang 取值。供非组件场景(如 SEO meta)使用。 */
export function translate<T = string>(lang: Lang, key: string, vars?: Record<string, string | number>): T {
  const parts = key.split('.')
  let val = lookup(RES[lang], parts)
  if (val === undefined) val = lookup(RES.zh, parts) // fallback 中文
  if (val === undefined) return key as unknown as T
  if (typeof val === 'string') return interpolate(val, vars) as unknown as T
  return val as unknown as T
}

// ===================== React hook =====================
/**
 * useI18n —— 订阅 lang store,lang 变化时组件重渲。
 * 返回 { lang, t, setLang }。t 是带当前 lang 闭包的翻译函数。
 */
export function useI18n() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  const t = <T = string>(key: string, vars?: Record<string, string | number>): T =>
    translate<T>(lang, key, vars)
  return { lang, setLang, t }
}

// 让 <html lang> 随语言切换(替代原 i18n.js 的 document.documentElement.lang 设置)
const LANG_TAG: Record<Lang, string> = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' }
export function langTag(lang: Lang): string {
  return LANG_TAG[lang] || lang
}

// useSyncExternalStore 占位避免未用警告(保留以备未来 SSR 同步)
void useSyncExternalStore
