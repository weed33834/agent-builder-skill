/**
 * Galgame 资历测评 —— 称号档位数据。
 * 5 档称号覆盖 0-180 分(30 题 × 最高 6 分 = 180),每档 36 分区间,均可达。
 * 每档三语点评,引用真实作品/梗,有 Galgame 玩家社群的人味。
 */
export interface GalgameTitle {
  tier: number
  min_score: number
  max_score: number
  name_zh: string
  name_en: string
  name_ja: string
  blurb_zh: string
  blurb_en: string
  blurb_ja: string
  emoji: string
}

export const GALGAME_TITLES: GalgameTitle[] = [
  {
    tier: 1,
    min_score: 0,
    max_score: 36,
    name_zh: '未开封',
    name_en: 'Sealed',
    name_ja: '未開封',
    blurb_zh: '包装纸都还没撕开，连共通线和个人线的区别都不清楚。白学现场只能围观吃瓜，Key 社的催泪弹还没命中你。慢慢来，Galgame 的大门永远为你敞开。',
    blurb_en: 'Haven\'t even torn the shrink wrap. Common routes and character routes are still a mystery. You can only watch the White Album 2 faction wars from the sidelines, and Key\'s tear-jerkers haven\'t hit you yet. Take your time—the door to galge is always open.',
    blurb_ja: 'シュリンクすら剥がしていない。共通線と個人線の違いもわからない。白学の現場では野次馬まで、Key 社の涙弾もまだ命中していない。ゆっくりでいい、Galgame の扉はいつでも開いている。',
    emoji: '📦',
  },
  {
    tier: 2,
    min_score: 37,
    max_score: 72,
    name_zh: '通常版',
    name_en: 'Regular Edition',
    name_ja: '通常版',
    blurb_zh: '几部名作通关过，开始懂什么叫共通线和个人线，也知道 True End 通常要放在最后打。"又到了白色相簿的季节"刷屏时，你已经能跟着乐了。',
    blurb_en: 'Cleared a few classics and is starting to grasp common routes and character routes. You know True End comes last. When "the season of White Album comes again" floods the timeline, you\'re already in on the joke.',
    blurb_ja: '名作をいくつかクリアし、共通線と個人線が何か分かってきた。True End は最後に来るものだと知っている。「また白バレの季節になった」が流れると、もう一緒に笑える。',
    emoji: '📀',
  },
  {
    tier: 3,
    min_score: 73,
    max_score: 108,
    name_zh: '限定版',
    name_en: 'Limited Edition',
    name_ja: '限定版',
    blurb_zh: 'Key 社哭过、Fate 三线推过，白学现场能发表两句意见。剧本家的风格开始能分辨，原画师是谁也能说上几句。硬盘里躺着一串通关记录，离完全版还差一步。',
    blurb_en: 'Cried at Key, cleared all three Fate routes, and can hold an opinion at a White Album 2 debate. You\'re starting to recognize scriptwriters\' styles and can name a few key illustrators. A string of clears on the hard drive—one step away from the Perfect Edition.',
    blurb_ja: 'Key 社で泣き、Fate 三ルートを攻略し、白学の現場でも一言ある。シナリオライターの個性が見え始め、原画家の名前も出てくる。HDD にはクリア記録が並び、完全版まであと一歩。',
    emoji: '🎯',
  },
  {
    tier: 4,
    min_score: 109,
    max_score: 144,
    name_zh: '完全版',
    name_en: 'Perfect Edition',
    name_ja: '完全版',
    blurb_zh: '剧本家风格一眼能认，打越的诡计、龙骑士07的元叙事、丸户的细腻日常都品过。沙耶之歌对你来说已经是"当年"的事了，同人社团的新作也在追。萌豚也好社会派也罢，来者不拒。',
    blurb_en: 'You can spot a scriptwriter\'s style at a glance—Uchikoshi\'s tricks, Ryukishi07\'s meta-narrative, Maruto\'s nuanced daily life. Saya no Uta is already "back in the day" for you, and you\'re keeping up with new doujin circle releases. Moe-pig or social school, bring it on.',
    blurb_ja: 'シナリオライターの個性は一目で判別。打越の仕掛け、竜騎士07のメタ物語、丸戸の繊細な日常を味わってきた。沙耶の歌はもう「あの頃」の話で、同人サークルの新作も追っている。萌豚も社会派も何でも来い。',
    emoji: '💿',
  },
  {
    tier: 5,
    min_score: 145,
    max_score: 180,
    name_zh: 'コレクターズエディション',
    name_en: "Collector's Edition",
    name_ja: 'コレクターズエディション',
    blurb_zh: '白学现场发言权在握，SCA-自的哲学和打越的诡计都嚼过。硬盘里不仅装着通关记录，还躺着设定集和原声带。从 Key 社到 Nitroplus 到同人名作，你已经是圈子里的活字典了。',
    blurb_en: 'You hold the floor in any White Album 2 debate and have chewed through SCA-JI\'s philosophy and Uchikoshi\'s plot tricks. Your hard drive holds not just clear records but art books and soundtracks too. From Key to Nitroplus to legendary doujin works, you\'re a living encyclopedia of the scene.',
    blurb_ja: '白学の現場で発言権あり、SCA-自の哲学も打越の仕掛けも噛み砕いた。HDD にはクリア記録だけでなく、設定資料集やサントラも眠っている。Key 社から Nitroplus、同人名作まで、あなたは場の生き字引だ。',
    emoji: '👑',
  },
]