/**
 * Galgame 资历测评 —— 称号档位数据。
 * 5 档称号覆盖 0-300 分(50 题 × 最高 6 分 = 300)。
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
    max_score: 60,
    name_zh: '萌新玩家',
    name_en: 'Newbie',
    name_ja: '萌新プレイヤー',
    blurb_zh: '还没被 Key 社催泪过,白学现场只能围观吃瓜。Galgame 的大门刚推开一条缝,慢慢来。',
    blurb_en: 'Hasn\'t been wrecked by a Key visual novel yet, and can only watch the White Album 2 faction wars from the sidelines. The door to galge just cracked open—take your time.',
    blurb_ja: 'まだ Key 社に泣かされたことがなく、白学の現場では野次馬まで。Galgame の扉をようやく少し開けたところ、焦らずいこう。',
    emoji: '🌱',
  },
  {
    tier: 2,
    min_score: 61,
    max_score: 120,
    name_zh: '入门玩家',
    name_en: 'Beginner',
    name_ja: '入門プレイヤー',
    blurb_zh: '通关过几部名作,开始懂什么叫共通线和个人线。“又到了白色相簿的季节”刷屏时,你已经能跟着乐了。',
    blurb_en: 'Cleared a few classics and finally gets what "common route" and "character route" mean. When "the season of White Album comes again" floods the timeline, you\'re already in on the joke.',
    blurb_ja: '名作をいくつかクリアし、共通線と個人線が何か分かってきた。「また白バレの季節になった」が流れると、もう一緒に笑える。',
    emoji: '🎮',
  },
  {
    tier: 3,
    min_score: 121,
    max_score: 180,
    name_zh: '小资历',
    name_en: 'Casual Veteran',
    name_ja: '小ベテラン',
    blurb_zh: 'Key 社哭过、Fate 三线推过,白学现场能发表两句意见。再往前走两步,就要撞上新世界了。',
    blurb_en: 'Has cried at Key, cleared all three Fate routes, and can hold an opinion at a White Album 2 debate. Two more steps and a whole new world opens up.',
    blurb_ja: 'Key 社で泣き、Fate 三ルートを攻略し、白学の現場でも一言ある。あと二歩進めば新世界に突入する。',
    emoji: '📚',
  },
  {
    tier: 4,
    min_score: 181,
    max_score: 240,
    name_zh: '老资历',
    name_en: 'Veteran',
    name_ja: 'ベテラン',
    blurb_zh: '硬盘里躺着一串通关记录,剧本家风格一眼能认。沙耶之歌对你来说已经是“当年”的事了。',
    blurb_en: 'A string of clears on the hard drive, and a scriptwriter\'s style recognized at a glance. Saya no Uta is already "back in the day" for you.',
    blurb_ja: 'HDD にはクリア記録が並び、シナリオライターの個性は一目で判別。沙耶の歌はもう「あの頃」の話。',
    emoji: '🏆',
  },
  {
    tier: 5,
    min_score: 241,
    max_score: 300,
    name_zh: '老司机',
    name_en: 'Master',
    name_ja: '達人',
    blurb_zh: '白学现场发言权在握,SCA-自的哲学和打越的诡计都嚼过。萌豚也好社会派也罢,来者不拒。',
    blurb_en: 'Holds the floor in any White Album 2 debate, and has chewed through SCA-JI\'s philosophy and Uchikoshi\'s plot tricks. Moe-pig or social-school, bring it on.',
    blurb_ja: '白学の現場で発言権あり、SCA-自の哲学も打越の仕掛けも噛み砕いた。萌豚も社会派も何でも来い。',
    emoji: '👑',
  },
]
