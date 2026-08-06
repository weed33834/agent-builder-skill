/**
 * Galgame 资历测评 —— 题库数据。
 * 趣味向测评,通过 30 道单选题测出答题者的 Galgame 阅历等级。
 * 5 个维度各 6 题:depth 阅历深度 / knowledge 作品通晓 / culture 圈内文化 / aesthetic 审美素养 / narrative 剧本鉴赏。
 * 每题 4 选项,score 为 0/2/4/6(0=没接触,6=老司机),选项顺序已打乱。
 */
export type GalgameDim = 'depth' | 'knowledge' | 'culture' | 'aesthetic' | 'narrative'

export interface GalgameOption {
  id: string
  text: string
  score: number
}

export interface GalgameQuestion {
  id: string
  dim: GalgameDim
  prompt: string
  options: GalgameOption[]
}

export const GALGAME_QUESTIONS: GalgameQuestion[] = [
  // ===== depth 阅历深度 g01-g06 =====
  {
    id: 'g01',
    dim: 'depth',
    prompt: '你玩过的 Galgame（含视觉小说）数量大致是？',
    options: [
      { id: 'a', text: '一部都没玩过，只看过动画改编', score: 0 },
      { id: 'b', text: '1-5 部，几个名作通关过', score: 2 },
      { id: 'c', text: '6-30 部，算是正经入坑了', score: 4 },
      { id: 'd', text: '30 部以上，硬盘里能拉出一份通关清单', score: 6 },
    ],
  },
  {
    id: 'g02',
    dim: 'depth',
    prompt: '你最早是怎么入坑 Galgame 的？',
    options: [
      { id: 'a', text: '完全没接触过，纯来凑热闹', score: 0 },
      { id: 'b', text: '动画入坑，后来才知道有原作游戏', score: 2 },
      { id: 'c', text: '被朋友或论坛安利，直接玩的原作', score: 4 },
      { id: 'd', text: '当年在汉化组、补丁、镜像里摸爬滚打过来', score: 6 },
    ],
  },
  {
    id: 'g03',
    dim: 'depth',
    prompt: 'Key 社的作品你通关过几部？',
    options: [
      { id: 'a', text: 'Key 社是哪个社', score: 0 },
      { id: 'b', text: '看过 CLANNAD 动画，游戏没玩', score: 2 },
      { id: 'c', text: '玩过 AIR、Kanon、CLANNAD 这几部', score: 4 },
      { id: 'd', text: 'AIR/Kanon/CLANNAD/LB/Rewrite/SP 全通，还补了 ONE', score: 6 },
    ],
  },
  {
    id: 'g04',
    dim: 'depth',
    prompt: '你玩 Galgame 时的语言习惯是？',
    options: [
      { id: 'a', text: '只玩有官方中文的', score: 0 },
      { id: 'b', text: '等汉化补丁，不挑', score: 2 },
      { id: 'c', text: '啃生肉，边查词典边推', score: 4 },
      { id: 'd', text: '日文原版直接推，顺带吐槽翻译腔', score: 6 },
    ],
  },
  {
    id: 'g05',
    dim: 'depth',
    prompt: '你玩过的"泣系"作品（让你真的哭出来的）有多少？',
    options: [
      { id: 'a', text: '没哭过，也不知道泣系是啥', score: 0 },
      { id: 'b', text: '看过别人哭着安利，自己没玩', score: 2 },
      { id: 'c', text: 'CLANNAD、AIR 这些哭过几次', score: 4 },
      { id: 'd', text: 'Key 社全家桶、Summer Pockets、ATRI 都把我整破防过', score: 6 },
    ],
  },
  {
    id: 'g06',
    dim: 'depth',
    prompt: '你的"Galgame 年资"大概多久？',
    options: [
      { id: 'a', text: '不到 1 年，刚入坑', score: 0 },
      { id: 'b', text: '1-3 年，还算新人', score: 2 },
      { id: 'c', text: '3-5 年，算是有一定积累了', score: 4 },
      { id: 'd', text: '5 年以上，从初中/高中就开始玩了', score: 6 },
    ],
  },

  // ===== knowledge 作品通晓 g07-g12 =====
  {
    id: 'g07',
    dim: 'knowledge',
    prompt: 'TYPE-MOON 的视觉小说你玩过哪些？',
    options: [
      { id: 'a', text: '只玩过手游 FGO，本体没碰', score: 0 },
      { id: 'b', text: '看过 Fate 动画，月姬那画风劝退了', score: 2 },
      { id: 'c', text: 'Fate/stay night 三线通关，月姬也补了', score: 4 },
      { id: 'd', text: 'Fate、月姬、hollow ataraxia 全通，魔法使之夜也买了，还蹲着月姬重制', score: 6 },
    ],
  },
  {
    id: 'g08',
    dim: 'knowledge',
    prompt: '科学 ADV 系列你玩到哪了？',
    options: [
      { id: 'a', text: '没听过这个系列', score: 0 },
      { id: 'b', text: '看过 Steins;Gate 动画', score: 2 },
      { id: 'c', text: '通关了 Steins;Gate，Chaos;Head 也摸过', score: 4 },
      { id: 'd', text: 'SG、CH、RN、CC 全推完，还等过 Anonymous;Code', score: 6 },
    ],
  },
  {
    id: 'g09',
    dim: 'knowledge',
    prompt: 'Nitroplus 的作品你接触过哪些？',
    options: [
      { id: 'a', text: '没听过 Nitroplus', score: 0 },
      { id: 'b', text: '听说过沙耶之歌这个名字', score: 2 },
      { id: 'c', text: '玩过沙耶之歌、鬼哭街等几部', score: 4 },
      { id: 'd', text: '沙耶、鬼哭街、装甲恶鬼村正、冻京 Necro 都推过，N+ 厨', score: 6 },
    ],
  },
  {
    id: 'g10',
    dim: 'knowledge',
    prompt: 'Leaf 社 / AQUAPLUS 的作品你玩过哪些？',
    options: [
      { id: 'a', text: '没听过 Leaf 社', score: 0 },
      { id: 'b', text: '听说过 To Heart、白色相簿 2', score: 2 },
      { id: 'c', text: '玩过白色相簿 2，白学现场能发言', score: 4 },
      { id: 'd', text: 'To Heart、白色相簿 2、传颂之物、提亚拉之泪全通，Leaf 厨', score: 6 },
    ],
  },
  {
    id: 'g11',
    dim: 'knowledge',
    prompt: '以下剧本家，你能对上号几位？（麻枝准、奈须蘑菇、虚渊玄、丸户史明、打越钢太郎、SCA-自、龙骑士07）',
    options: [
      { id: 'a', text: '一个都不认识', score: 0 },
      { id: 'b', text: '听过麻枝准、奈须蘑菇', score: 2 },
      { id: 'c', text: '麻枝准、奈须蘑菇、虚渊玄、丸户史明都能说出代表作', score: 4 },
      { id: 'd', text: '以上全部 + 龙骑士07、打越、SCA-自，各家风格如数家珍', score: 6 },
    ],
  },
  {
    id: 'g12',
    dim: 'knowledge',
    prompt: '对"meta 游戏"（元叙事 / 打破第四面墙），你了解吗？',
    options: [
      { id: 'a', text: '没听过这个词', score: 0 },
      { id: 'b', text: '好像听说过，不太懂', score: 2 },
      { id: 'c', text: '知道 Ever17、君与彼女与彼女之恋这类', score: 4 },
      { id: 'd', text: '玩过 Ever17、君彼女、海猫、OneShot 等，还懂元叙事理论', score: 6 },
    ],
  },

  // ===== culture 圈内文化 g13-g18 =====
  {
    id: 'g13',
    dim: 'culture',
    prompt: '"白色相簿 2" 三个字，你脑中第一反应是？',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '好像是个有名的恋爱作品', score: 2 },
      { id: 'c', text: '白学、党争、又到了那个季节', score: 4 },
      { id: 'd', text: '雪菜党还是和纱党？届かない恋的旋律已经响起来了', score: 6 },
    ],
  },
  {
    id: 'g14',
    dim: 'culture',
    prompt: '"又到了白色相簿的季节" 这梗，你懂吗？',
    options: [
      { id: 'a', text: '完全不懂', score: 0 },
      { id: 'b', text: '好像是句台词？', score: 2 },
      { id: 'c', text: '知道是 WA2 OP 名场面，冬天必刷', score: 4 },
      { id: 'd', text: '每年入冬社交平台必被这句刷屏，白学现场一触即发', score: 6 },
    ],
  },
  {
    id: 'g15',
    dim: 'culture',
    prompt: '"萌豚" 这个词，你的态度是？',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '好像是骂人的？', score: 2 },
      { id: 'c', text: '知道是萌系爱好者自嘲，自己也常被这么叫', score: 4 },
      { id: 'd', text: '骄傲地自认萌豚，见萌系立绘就走不动道，还分得出各家萌法', score: 6 },
    ],
  },
  {
    id: 'g16',
    dim: 'culture',
    prompt: '"沙耶" 这两个字，你想到的是什么？',
    options: [
      { id: 'a', text: '不认识', score: 0 },
      { id: 'b', text: '好像是个角色名', score: 2 },
      { id: 'c', text: '沙耶之歌，虚渊玄，致郁系', score: 4 },
      { id: 'd', text: '沙耶的真实形态、主角视角的世界反转，社会派 Galgame 的代表梗', score: 6 },
    ],
  },
  {
    id: 'g17',
    dim: 'culture',
    prompt: '"El Psy Kongroo" 你懂这是什么吗？',
    options: [
      { id: 'a', text: '完全没听过', score: 0 },
      { id: 'b', text: '好像是某种咒语？', score: 2 },
      { id: 'c', text: '知道是 Steins;Gate 里凶真的口头禅', score: 4 },
      { id: 'd', text: '不仅能接 El Psy Kongroo，还知道 Kongroo 是拼写梗，石头门名场面信手拈来', score: 6 },
    ],
  },
  {
    id: 'g18',
    dim: 'culture',
    prompt: '"Galgame 是文学" 这梗，你的理解是？',
    options: [
      { id: 'a', text: '啥梗？', score: 0 },
      { id: 'b', text: '大概是调侃吧', score: 2 },
      { id: 'c', text: '知道是玩家半认真半自嘲地把 VN 拔高到文学高度', score: 4 },
      { id: 'd', text: '既懂这梗的自嘲，也确实能掰扯 SCA-自、打越作品的文本价值', score: 6 },
    ],
  },

  // ===== aesthetic 审美素养 g19-g24 =====
  {
    id: 'g19',
    dim: 'aesthetic',
    prompt: '你能分辨以下哪些画师的画风？（樋上至、Na-Ga、武内崇、ろど）',
    options: [
      { id: 'a', text: '完全分不清', score: 0 },
      { id: 'b', text: '能认出武内崇的', score: 2 },
      { id: 'c', text: '樋上至的圆眼、武内崇的线条能分清', score: 4 },
      { id: 'd', text: '樋上至、Na-Ga、武内崇、ろど、みつみ美里都能一眼认出', score: 6 },
    ],
  },
  {
    id: 'g20',
    dim: 'aesthetic',
    prompt: '对"原画崩坏"这词，你的认知是？',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '好像动画里常见？', score: 2 },
      { id: 'c', text: '知道是作画质量下降，游戏里也有', score: 4 },
      { id: 'd', text: '能分清是原画师本人画风还是真崩，也懂"樋上至画风"被说成"崩坏"的陈年老梗', score: 6 },
    ],
  },
  {
    id: 'g21',
    dim: 'aesthetic',
    prompt: 'Galgame 的 BGM / 音乐，你的关注程度是？',
    options: [
      { id: 'a', text: '没注意过', score: 0 },
      { id: 'b', text: 'OP 好听会留意一下', score: 2 },
      { id: 'c', text: '会专门听 OST，Key、Leaf 的音乐有印象', score: 4 },
      { id: 'd', text: "折戸伸治、戸越まごめ、MANYO、I've Sound 这些作曲都能聊，音乐是推片的一大动力", score: 6 },
    ],
  },
  {
    id: 'g22',
    dim: 'aesthetic',
    prompt: '关于"配音 vs 只看文本"，你的习惯是？',
    options: [
      { id: 'a', text: 'Galgame 还有配音？', score: 0 },
      { id: 'b', text: '有配音当然听配音', score: 2 },
      { id: 'c', text: '看作品定，有的全语音有的部分语音', score: 4 },
      { id: 'd', text: '清楚哪些作品全语音、哪些主角无口，懂"主角无口"是为代入感做的设计取舍', score: 6 },
    ],
  },
  {
    id: 'g23',
    dim: 'aesthetic',
    prompt: '你判断一部 Galgame "美术在线"的标准是？',
    options: [
      { id: 'a', text: '看图好看就行', score: 0 },
      { id: 'b', text: '立绘精致、CG 多', score: 2 },
      { id: 'c', text: '画风统一、人物有辨识度、CG 与剧情契合', score: 4 },
      { id: 'd', text: '能看出原画师功力、SD 与正图一致性、和谐版删改对构图的影响', score: 6 },
    ],
  },
  {
    id: 'g24',
    dim: 'aesthetic',
    prompt: '声优阵容会影响你推一部 Galgame 的决定吗？',
    options: [
      { id: 'a', text: '不关心声优', score: 0 },
      { id: 'b', text: '偶尔会注意', score: 2 },
      { id: 'c', text: '看到熟悉的声优会更有动力', score: 4 },
      { id: 'd', text: '会专门因为 CV 去推片，緑川光、子安武人、川澄绫子在 Galgame 里的角色如数家珍', score: 6 },
    ],
  },

  // ===== narrative 剧本鉴赏 g25-g30 =====
  {
    id: 'g25',
    dim: 'narrative',
    prompt: '对 Galgame 的"共通线 + 个人线"结构，你的理解是？',
    options: [
      { id: 'a', text: '不懂这结构', score: 0 },
      { id: 'b', text: '知道有主线和角色线', score: 2 },
      { id: 'c', text: '清楚共通线铺垫、个人线展开的套路', score: 4 },
      { id: 'd', text: '能聊这种结构的优劣势，以及单线 Kinetic Novel 为何另起炉灶', score: 6 },
    ],
  },
  {
    id: 'g26',
    dim: 'narrative',
    prompt: '"True End" 这个概念，你怎么理解？',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '就是真结局吧', score: 2 },
      { id: 'c', text: '知道是作者认定的正统结局，通常要先打通其他线', score: 4 },
      { id: 'd', text: '懂 True End 与 Good/Normal/Bad End 的层级，也见过没 True End 的争议作', score: 6 },
    ],
  },
  {
    id: 'g27',
    dim: 'narrative',
    prompt: '对"Bad End"你的态度是？',
    options: [
      { id: 'a', text: '为什么要打坏结局', score: 0 },
      { id: 'b', text: '不小心打出过，挺难受', score: 2 },
      { id: 'c', text: '会特意收集，Bad End 也是体验的一部分', score: 4 },
      { id: 'd', text: '能欣赏 Bad End 的叙事价值，有的比真结局还震撼（比如沙耶之歌、Fate HF）', score: 6 },
    ],
  },
  {
    id: 'g28',
    dim: 'narrative',
    prompt: '对"伏笔"和"回收"，你的敏感度是？',
    options: [
      { id: 'a', text: '不太注意', score: 0 },
      { id: 'b', text: '看到回收才会恍然大悟', score: 2 },
      { id: 'c', text: '推的时候会记细节，期待后面回收', score: 4 },
      { id: 'd', text: 'Ever17、海猫那种长线伏笔能边推边盘，回收时爽感拉满', score: 6 },
    ],
  },
  {
    id: 'g29',
    dim: 'narrative',
    prompt: '你觉得 Galgame "角色塑造"的关键是？',
    options: [
      { id: 'a', text: '长得好看就行', score: 0 },
      { id: 'b', text: '性格讨喜', score: 2 },
      { id: 'c', text: '有成长弧线、有记忆点', score: 4 },
      { id: 'd', text: '懂"属性"只是入口，真立住角色靠细节与矛盾，间桐樱、古河渚这种层次才经得起品', score: 6 },
    ],
  },
  {
    id: 'g30',
    dim: 'narrative',
    prompt: '对"剧本家个人风格"，你能分辨多少？',
    options: [
      { id: 'a', text: '分辨不出', score: 0 },
      { id: 'b', text: '知道几个有名的', score: 2 },
      { id: 'c', text: '麻枝准的煽情、虚渊玄的致郁能分清', score: 4 },
      { id: 'd', text: '打越的视角诡计、龙骑士07的元叙事、丸户的日常细腻、SCA-自的哲学啰嗦，一眼就认', score: 6 },
    ],
  },
]