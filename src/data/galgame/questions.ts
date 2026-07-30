/**
 * Galgame 资历测评 —— 题库数据。
 * 趣味向测评,通过 50 道单选题测出答题者的 Galgame 阅历等级。
 * 5 个维度各 10 题:experience 阅历量 / genre 类型偏好 / aesthetic 审美 / narrative 剧情理解 / meme 梗文化。
 * 每题 4 选项,score 为 0/2/4/6(0=没接触,6=老司机),选项顺序已打乱。
 */
export type GalgameDim = 'experience' | 'genre' | 'aesthetic' | 'narrative' | 'meme'

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
  // ===== experience 阅历量 g01-g10 =====
  {
    id: 'g01',
    dim: 'experience',
    prompt: '你玩过的 Galgame(含视觉小说)数量大致是?',
    options: [
      { id: 'a', text: '一部都没玩过,只看过动画改编', score: 0 },
      { id: 'b', text: '1-5 部,几个名作通关过', score: 2 },
      { id: 'c', text: '30 部以上,硬盘里能拉出一份通关清单', score: 6 },
      { id: 'd', text: '6-30 部,算是正经入坑了', score: 4 },
    ],
  },
  {
    id: 'g02',
    dim: 'experience',
    prompt: '你最早是怎么入的 Galgame 这个坑?',
    options: [
      { id: 'a', text: '完全没接触过,纯来凑热闹', score: 0 },
      { id: 'b', text: '动画入坑,后来才知道有原作游戏', score: 2 },
      { id: 'c', text: '被朋友或论坛安利,直接玩的原作', score: 4 },
      { id: 'd', text: '当年在汉化组、补丁、镜像里摸爬滚打过来', score: 6 },
    ],
  },
  {
    id: 'g03',
    dim: 'experience',
    prompt: 'Key 社的作品你通关过几部?',
    options: [
      { id: 'a', text: 'Key 社是哪个社', score: 0 },
      { id: 'b', text: 'AIR/Kanon/CLANNAD/Little Busters/Rewrite/Summer Pockets 基本全通,还补了 ONE', score: 6 },
      { id: 'c', text: '看过 CLANNAD 动画,游戏没玩', score: 2 },
      { id: 'd', text: '玩过 AIR、Kanon、CLANNAD 这几部', score: 4 },
    ],
  },
  {
    id: 'g04',
    dim: 'experience',
    prompt: 'TYPE-MOON 的视觉小说你玩过哪些?',
    options: [
      { id: 'a', text: '只玩过手游 FGO,本体没碰', score: 0 },
      { id: 'b', text: '看过 Fate 动画,月姬那画风劝退了', score: 2 },
      { id: 'c', text: 'Fate/stay night 三线通关,月姬也补了', score: 4 },
      { id: 'd', text: 'Fate、月姬、hollow ataraxia 全通,魔法使之夜也买了,还蹲着月姬重制', score: 6 },
    ],
  },
  {
    id: 'g05',
    dim: 'experience',
    prompt: '你玩 Galgame 时的语言习惯是?',
    options: [
      { id: 'a', text: '只玩有官方中文的', score: 0 },
      { id: 'b', text: '等汉化补丁,不挑', score: 2 },
      { id: 'c', text: '日文原版直接推,顺带吐槽翻译腔,偶尔对照英文版', score: 6 },
      { id: 'd', text: '啃生肉,边查词典边推', score: 4 },
    ],
  },
  {
    id: 'g06',
    dim: 'experience',
    prompt: '科学 ADV 系列你玩到哪了?',
    options: [
      { id: 'a', text: 'Steins;Gate、Chaos;Head、Robotics;Notes、Chaos;Child 全推完,还等过 Anonymous;Code', score: 6 },
      { id: 'b', text: '没听过这个系列', score: 0 },
      { id: 'c', text: '看过 Steins;Gate 动画', score: 2 },
      { id: 'd', text: '通关了 Steins;Gate,Chaos;Head 也摸过', score: 4 },
    ],
  },
  {
    id: 'g07',
    dim: 'experience',
    prompt: '你玩过的“泣系”作品(让你真的哭出来的)有多少?',
    options: [
      { id: 'a', text: '没哭过,也不知道泣系是啥', score: 0 },
      { id: 'b', text: '看过别人哭着安利,自己没玩', score: 2 },
      { id: 'c', text: 'CLANNAD、AIR 这些哭过几次', score: 4 },
      { id: 'd', text: 'Key 社全家桶、Summer Pockets、ATRI 都把我整破防过,纸巾消耗惊人', score: 6 },
    ],
  },
  {
    id: 'g08',
    dim: 'experience',
    prompt: '关于“全年龄版”和“18 禁版”,你的认知?',
    options: [
      { id: 'a', text: 'Galgame 还有这种区分?', score: 0 },
      { id: 'b', text: '清楚哪个作品出过哪种版本,补丁怎么打、和谐了啥门儿清', score: 6 },
      { id: 'c', text: '听说有,没具体了解过', score: 2 },
      { id: 'd', text: '知道 Steam 上多为全年龄版,原版常有补丁', score: 4 },
    ],
  },
  {
    id: 'g09',
    dim: 'experience',
    prompt: '同人/社团出品的视觉小说你接触过吗?',
    options: [
      { id: 'a', text: '同人也能做 Galgame?', score: 0 },
      { id: 'b', text: '知道有,没玩过', score: 2 },
      { id: 'c', text: '月姬、寒蝉这些同人出身的大作都推过,还追过社团新作', score: 6 },
      { id: 'd', text: '玩过几个有名的同人 VN', score: 4 },
    ],
  },
  {
    id: 'g10',
    dim: 'experience',
    prompt: '你玩视觉小说时,“CG 回收率”和“全通”对你重要吗?',
    options: [
      { id: 'a', text: '不懂啥意思', score: 0 },
      { id: 'b', text: '通关就行,不追求', score: 2 },
      { id: 'c', text: '会存档回溯把主要 CG 收集齐', score: 4 },
      { id: 'd', text: '全通、CG100%、TIPS 全开、成就全拿,差一个都浑身难受', score: 6 },
    ],
  },

  // ===== genre 类型偏好 g11-g20 =====
  {
    id: 'g11',
    dim: 'genre',
    prompt: 'Galgame 的类型分支你了解多少?',
    options: [
      { id: 'a', text: '纯爱/泣系/悬疑/科幻/Nukige/妹系/社会派/恋爱育成,门类和代表作都能聊', score: 6 },
      { id: 'b', text: '不都一样吗,都是谈恋爱', score: 0 },
      { id: 'c', text: '知道有纯爱和……别的?', score: 2 },
      { id: 'd', text: '纯爱、泣系、悬疑、科幻这些大分类能分清', score: 4 },
    ],
  },
  {
    id: 'g12',
    dim: 'genre',
    prompt: '下面哪种 Galgame 走向你最吃得下?',
    options: [
      { id: 'a', text: '不太分得清', score: 0 },
      { id: 'b', text: '校园恋爱那种', score: 2 },
      { id: 'c', text: '悬疑解谜或者烧脑科幻', score: 4 },
      { id: 'd', text: '随便哪种都行,从妹系到社会派到 meta 诡计都能接得住', score: 6 },
    ],
  },
  {
    id: 'g13',
    dim: 'genre',
    prompt: '提到“Nukige”(拔作),你的反应?',
    options: [
      { id: 'a', text: '什么玩意儿?', score: 0 },
      { id: 'b', text: '听过这个词,没玩过', score: 2 },
      { id: 'c', text: '门类里也分高下,有的剧本居然还能打,能聊几句', score: 6 },
      { id: 'd', text: '知道是啥,基本绕着走', score: 4 },
    ],
  },
  {
    id: 'g14',
    dim: 'genre',
    prompt: '“视觉小说”和“恋爱冒险(ADV)”在你心里?',
    options: [
      { id: 'a', text: '不是一回事吗', score: 0 },
      { id: 'b', text: '好像有点区别,说不上来', score: 2 },
      { id: 'c', text: '知道 VN 偏重文本阅读,ADV 更重选择与探索', score: 4 },
      { id: 'd', text: '能讲清 Kinetic Novel、Sound Novel、ADV、VN 的演化与代表作', score: 6 },
    ],
  },
  {
    id: 'g15',
    dim: 'genre',
    prompt: '下列剧本家,你能对上号几位?',
    options: [
      { id: 'a', text: '一个都不认识', score: 0 },
      { id: 'b', text: '再加上龙骑士07、打越钢太郎、SCA-自、新岛夕,各家风格如数家珍', score: 6 },
      { id: 'c', text: '听过麻枝准、奈須きのこ', score: 2 },
      { id: 'd', text: '麻枝准、奈須きのこ、虚淵玄、丸戸史明都能说出代表作', score: 4 },
    ],
  },
  {
    id: 'g16',
    dim: 'genre',
    prompt: '对“泣系”这个类型,你怎么看?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '就是催泪向吧?', score: 2 },
      { id: 'c', text: '知道是 Key 社带起来的流派,主打情绪累积后爆发', score: 4 },
      { id: 'd', text: '能聊泣系脉络,从 ONE 到 AIR 到 CLANNAD 到 Summer Pockets 的传承', score: 6 },
    ],
  },
  {
    id: 'g17',
    dim: 'genre',
    prompt: '你玩过的作品中,世界观最“硬”的是?',
    options: [
      { id: 'a', text: '没注意过世界观', score: 0 },
      { id: 'b', text: '校园日常那种吧', score: 2 },
      { id: 'c', text: 'Muv-Luv 的 BETA、装甲恶鬼村正的武家社会、海猫的黄金魔女,越硬越上头', score: 6 },
      { id: 'd', text: 'Fate 的圣杯战争、月姬的死徒设定这种', score: 4 },
    ],
  },
  {
    id: 'g18',
    dim: 'genre',
    prompt: '对“乙女游戏”你的了解?',
    options: [
      { id: 'a', text: '不知道是啥', score: 0 },
      { id: 'b', text: '知道是女性向恋爱游戏', score: 2 },
      { id: 'c', text: '玩过或看过几部,薄樱鬼、魔鬼恋人那种', score: 4 },
      { id: 'd', text: '清楚乙女和 Galgame 的受众差异,也懂为什么有人既推 Galgame 又玩乙女', score: 6 },
    ],
  },
  {
    id: 'g19',
    dim: 'genre',
    prompt: '你玩 Galgame 时,会特意挑剧本家吗?',
    options: [
      { id: 'a', text: '按剧本家筛片,SCA-自的哲学向、打越的诡计向、丸戸的情感向各有各的追法', score: 6 },
      { id: 'b', text: '不知道剧本家有啥区别', score: 0 },
      { id: 'c', text: '偶尔听说某个名气大', score: 2 },
      { id: 'd', text: '会追麻枝准、虚淵玄这种大名字', score: 4 },
    ],
  },
  {
    id: 'g20',
    dim: 'genre',
    prompt: '对“带系统的 Galgame”(恋爱育成、SRPG 等),你的经验?',
    options: [
      { id: 'a', text: 'Galgame 不都是点点点看字吗', score: 0 },
      { id: 'b', text: '传颂之物的 SRPG、樱花大战的战斗、Muv-Luv 的机甲都推过,系统党也吃得下', score: 6 },
      { id: 'c', text: '听说有带养成的', score: 2 },
      { id: 'd', text: '玩过心跳回忆、美少女梦工厂这种育成向', score: 4 },
    ],
  },

  // ===== aesthetic 审美 g21-g30 =====
  {
    id: 'g21',
    dim: 'aesthetic',
    prompt: '下列画师,以“萌系大眼”画风闻名的是?',
    options: [
      { id: 'a', text: '武内崇', score: 0 },
      { id: 'b', text: 'みつみ美里', score: 2 },
      { id: 'c', text: '樋上至', score: 6 },
      { id: 'd', text: 'Na-Ga', score: 4 },
    ],
  },
  {
    id: 'g22',
    dim: 'aesthetic',
    prompt: '对“原画崩坏”这词,你的认知?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '好像动画里常见?', score: 2 },
      { id: 'c', text: '知道是作画质量下降,游戏里也有', score: 4 },
      { id: 'd', text: '能分清是原画师本人画风还是真崩,也懂“樋上至画风”被说成“崩坏”的陈年老梗', score: 6 },
    ],
  },
  {
    id: 'g23',
    dim: 'aesthetic',
    prompt: '你最喜欢的角色立绘风格是?',
    options: [
      { id: 'a', text: '没怎么注意过立绘', score: 0 },
      { id: 'b', text: '各家画风都能欣赏,从樋上至的圆眼到 SCA-自作品里ろど的写意都吃得下', score: 6 },
      { id: 'c', text: '萌系可爱的就行', score: 2 },
      { id: 'd', text: '有辨识度的,比如武内崇的人物', score: 4 },
    ],
  },
  {
    id: 'g24',
    dim: 'aesthetic',
    prompt: '对“CG”在 Galgame 里的作用,你怎么看?',
    options: [
      { id: 'a', text: 'CG 是啥', score: 0 },
      { id: 'b', text: '就是插图吧', score: 2 },
      { id: 'c', text: '懂 CG 数量、回收机制、和谐版删了哪些,看画风就能猜制作社', score: 6 },
      { id: 'd', text: '知道是关键剧情的特写大图', score: 4 },
    ],
  },
  {
    id: 'g25',
    dim: 'aesthetic',
    prompt: '“SD 角色”(Q 版小人)在 Galgame 里,你的反应?',
    options: [
      { id: 'a', text: '会留意哪家的 SD 可爱,Key、Leaf 的 SD 各有风格,有些 SD 比正图还出圈', score: 6 },
      { id: 'b', text: 'SD 是什么', score: 0 },
      { id: 'c', text: '见过那种大头小身子的', score: 2 },
      { id: 'd', text: '知道是日常搞笑场景用的 Q 版立绘', score: 4 },
    ],
  },
  {
    id: 'g26',
    dim: 'aesthetic',
    prompt: '下列声优,你能在 Galgame 角色里对上号的?',
    options: [
      { id: 'a', text: '都不熟', score: 0 },
      { id: 'b', text: '杉田智和、中村悠一这种,主要听动画', score: 2 },
      { id: 'c', text: '知道不少声优既配动画也配 Galgame', score: 4 },
      { id: 'd', text: '緑川光、子安武人、川澄绫子在 Galgame 里的角色能如数家珍,还会因为 CV 去推片', score: 6 },
    ],
  },
  {
    id: 'g27',
    dim: 'aesthetic',
    prompt: 'Galgame 的 BGM/音乐,你的关注程度?',
    options: [
      { id: 'a', text: '没注意过', score: 0 },
      { id: 'b', text: '折戸伸治、戸越まごめ、MANYO 这些作曲都能聊,音乐是推片的一大动力', score: 6 },
      { id: 'c', text: 'OP 好听会留意一下', score: 2 },
      { id: 'd', text: '会专门听 OST,Key、Leaf 的音乐有印象', score: 4 },
    ],
  },
  {
    id: 'g28',
    dim: 'aesthetic',
    prompt: 'Galgame 的 UI/界面设计,你会留意吗?',
    options: [
      { id: 'a', text: '没留意过', score: 0 },
      { id: 'b', text: '好看的会多看两眼', score: 2 },
      { id: 'c', text: '会研究对话框、TIPS 弹窗、存档界面,科学 ADV 的 TIPS 系统就很有讲究', score: 6 },
      { id: 'd', text: '能感觉到有的 UI 贴氛围,有的很敷衍', score: 4 },
    ],
  },
  {
    id: 'g29',
    dim: 'aesthetic',
    prompt: '关于“配音 vs 只看文本”,你的习惯?',
    options: [
      { id: 'a', text: 'Galgame 还有配音?', score: 0 },
      { id: 'b', text: '有配音当然听配音', score: 2 },
      { id: 'c', text: '看作品定,有的全语音有的部分语音', score: 4 },
      { id: 'd', text: '清楚哪些作品全语音、哪些主角无口,懂“主角无口”是为代入感做的设计取舍', score: 6 },
    ],
  },
  {
    id: 'g30',
    dim: 'aesthetic',
    prompt: '你判断一部 Galgame “美术在线”的标准?',
    options: [
      { id: 'a', text: '能看出原画师功力、SD 与正图一致性、和谐版删改对构图的影响', score: 6 },
      { id: 'b', text: '看图好看就行', score: 0 },
      { id: 'c', text: '立绘精致、CG 多', score: 2 },
      { id: 'd', text: '画风统一、人物有辨识度、CG 与剧情契合', score: 4 },
    ],
  },

  // ===== narrative 剧情理解 g31-g40 =====
  {
    id: 'g31',
    dim: 'narrative',
    prompt: '对 Galgame 的“共通线 + 个人线”结构,你的理解?',
    options: [
      { id: 'a', text: '不懂这结构', score: 0 },
      { id: 'b', text: '知道有主线和角色线', score: 2 },
      { id: 'c', text: '能聊这种结构的优劣势,以及单线 Kinetic Novel 为何另起炉灶', score: 6 },
      { id: 'd', text: '清楚共通线铺垫、个人线展开的套路', score: 4 },
    ],
  },
  {
    id: 'g32',
    dim: 'narrative',
    prompt: '对“多线分支”和“选择影响结局”,你的经验?',
    options: [
      { id: 'a', text: '不知道还能分支', score: 0 },
      { id: 'b', text: '知道有不同结局', score: 2 },
      { id: 'c', text: '会存档试不同选项,把几个结局打出来', score: 4 },
      { id: 'd', text: '分支逻辑、Flag 触发条件都摸得清,还能预测哪条是 True End', score: 6 },
    ],
  },
  {
    id: 'g33',
    dim: 'narrative',
    prompt: '“True End”这个概念,你怎么理解?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '懂 True End 与 Good/Normal/Bad End 的层级,也见过没 True End 的争议作', score: 6 },
      { id: 'c', text: '就是真结局吧', score: 2 },
      { id: 'd', text: '知道是作者认定的正统结局,通常要先打通其他线', score: 4 },
    ],
  },
  {
    id: 'g34',
    dim: 'narrative',
    prompt: '对“Bad End”你的态度?',
    options: [
      { id: 'a', text: '为什么要打坏结局', score: 0 },
      { id: 'b', text: '不小心打出过,挺难受', score: 2 },
      { id: 'c', text: '能欣赏 Bad End 的叙事价值,有的比真结局还震撼(比如沙耶之歌某些走向)', score: 6 },
      { id: 'd', text: '会特意收集,Bad End 也是体验的一部分', score: 4 },
    ],
  },
  {
    id: 'g35',
    dim: 'narrative',
    prompt: '对“剧透”这回事,你的立场?',
    options: [
      { id: 'a', text: '无所谓,看剧透也行', score: 0 },
      { id: 'b', text: '不想被剧透,偶尔看到也还好', score: 2 },
      { id: 'c', text: '推片前严格避雷,推完才讨论', score: 4 },
      { id: 'd', text: '既懂被剧透的痛,也理解“剧透党”那种“我看懂了想分享”的冲动,会看场合分级讨论', score: 6 },
    ],
  },
  {
    id: 'g36',
    dim: 'narrative',
    prompt: '对“伏笔”和“回收”,你的敏感度?',
    options: [
      { id: 'a', text: 'Ever17、海猫那种长线伏笔能边推边盘,回收时爽感拉满', score: 6 },
      { id: 'b', text: '不太注意', score: 0 },
      { id: 'c', text: '看到回收才会恍然大悟', score: 2 },
      { id: 'd', text: '推的时候会记细节,期待后面回收', score: 4 },
    ],
  },
  {
    id: 'g37',
    dim: 'narrative',
    prompt: '对 Galgame 的世界观构建,你的关注?',
    options: [
      { id: 'a', text: '看剧情就行,不管设定', score: 0 },
      { id: 'b', text: '大体看看', score: 2 },
      { id: 'c', text: '能比较不同作品的世界观完成度,Fate、月姬、Muv-Luv 的设定深度都聊得来', score: 6 },
      { id: 'd', text: '会读 TIPS、设定集,搞懂规则', score: 4 },
    ],
  },
  {
    id: 'g38',
    dim: 'narrative',
    prompt: '你觉得 Galgame “角色塑造”的关键是?',
    options: [
      { id: 'a', text: '长得好看就行', score: 0 },
      { id: 'b', text: '性格讨喜', score: 2 },
      { id: 'c', text: '有成长弧线、有记忆点', score: 4 },
      { id: 'd', text: '懂“属性”只是入口,真立住角色靠细节与矛盾,间桐樱、古河渚这种层次才经得起品', score: 6 },
    ],
  },
  {
    id: 'g39',
    dim: 'narrative',
    prompt: '对 Galgame 的“主题/母题”,你的体会?',
    options: [
      { id: 'a', text: '没想过', score: 0 },
      { id: 'b', text: '会琢磨 SCA-自的“美与艺术”、虚淵玄的“正义与救赎”这种作者性主题', score: 6 },
      { id: 'c', text: '有些作品确实有点深意', score: 2 },
      { id: 'd', text: '能看出 CLANNAD 讲家族、Steins;Gate 讲选择与代价', score: 4 },
    ],
  },
  {
    id: 'g40',
    dim: 'narrative',
    prompt: '对“剧本家个人风格”,你能分辨多少?',
    options: [
      { id: 'a', text: '分辨不出', score: 0 },
      { id: 'b', text: '知道几个有名的', score: 2 },
      { id: 'c', text: '麻枝准的煽情、虚淵玄的致郁能分清', score: 4 },
      { id: 'd', text: '打越的视角诡计、龙骑士07的元叙事、丸戸的日常细腻、SCA-自的哲学啰嗦,一眼就认', score: 6 },
    ],
  },

  // ===== meme 梗文化 g41-g50 =====
  {
    id: 'g41',
    dim: 'meme',
    prompt: '看到“白色相簿2”三个字,你脑中第一反应?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '好像是个有名的恋爱作品', score: 2 },
      { id: 'c', text: '雪菜党还是和纱党?届かない恋的旋律已经响起来了', score: 6 },
      { id: 'd', text: '白学、党争、又到了那个季节', score: 4 },
    ],
  },
  {
    id: 'g42',
    dim: 'meme',
    prompt: '“又到了白色相簿的季节”这梗,你懂吗?',
    options: [
      { id: 'a', text: '完全不懂', score: 0 },
      { id: 'b', text: '好像是句台词?', score: 2 },
      { id: 'c', text: '知道是 WA2 OP 名场面,冬天必刷', score: 4 },
      { id: 'd', text: '每年入冬社交平台必被这句刷屏,白学现场一触即发', score: 6 },
    ],
  },
  {
    id: 'g43',
    dim: 'meme',
    prompt: '“Galgame 是文学”这梗,你的理解?',
    options: [
      { id: 'a', text: '既懂这梗的自嘲,也确实能掰扯 SCA-自、打越作品的文本价值,“RPG 是文学”同理', score: 6 },
      { id: 'b', text: '啥梗?', score: 0 },
      { id: 'c', text: '大概是调侃吧', score: 2 },
      { id: 'd', text: '知道是玩家半认真半自嘲地把 VN 拔高到文学高度', score: 4 },
    ],
  },
  {
    id: 'g44',
    dim: 'meme',
    prompt: '“萌豚”这个词,你的态度?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '骄傲地自认萌豚,见萌系立绘就走不动道,还分得出各家萌法', score: 6 },
      { id: 'c', text: '好像是骂人的?', score: 2 },
      { id: 'd', text: '知道是萌系爱好者自嘲,自己也常被这么叫', score: 4 },
    ],
  },
  {
    id: 'g45',
    dim: 'meme',
    prompt: '“十连抽”“SSR”这类词,你的熟悉度?',
    options: [
      { id: 'a', text: '没听过', score: 0 },
      { id: 'b', text: '知道是抽卡用语', score: 2 },
      { id: 'c', text: 'FGO 之类手游里常用,跟 Galgame 也沾边', score: 4 },
      { id: 'd', text: '清楚抽卡手游与 Galgame 的边界,也懂“为立绘/剧本去抽”的痛', score: 6 },
    ],
  },
  {
    id: 'g46',
    dim: 'meme',
    prompt: '提到“沙耶”,你想到的是?',
    options: [
      { id: 'a', text: '不认识', score: 0 },
      { id: 'b', text: '好像是个角色名', score: 2 },
      { id: 'c', text: '沙耶的真实形态、主角视角的世界反转,社会派 Galgame 的代表梗都懂', score: 6 },
      { id: 'd', text: '沙耶之歌,虚淵玄,致郁系', score: 4 },
    ],
  },
  {
    id: 'g47',
    dim: 'meme',
    prompt: '对“剧透党”,你的感受?',
    options: [
      { id: 'a', text: '没概念', score: 0 },
      { id: 'b', text: '就是爱剧透的人吧', score: 2 },
      { id: 'c', text: '推片时最怕遇上,体验全毁', score: 4 },
      { id: 'd', text: '既恨又被剧透过,也理解那种“我看懂了想分享”的冲动,会主动避开雷区', score: 6 },
    ],
  },
  {
    id: 'g48',
    dim: 'meme',
    prompt: '“社会的 Galgame”指什么,你懂吗?',
    options: [
      { id: 'a', text: '不懂', score: 0 },
      { id: 'b', text: '沙耶之歌、鬼哭街、装甲恶鬼村正这些 Nitroplus 系是代表,跟萌系泾渭分明', score: 6 },
      { id: 'c', text: '反映社会的?', score: 2 },
      { id: 'd', text: '知道是相对纯爱、主打沉重社会与人性主题的那类', score: 4 },
    ],
  },
  {
    id: 'g49',
    dim: 'meme',
    prompt: '对“为什么你会在这里”这类名台词/梗,你的熟悉度?',
    options: [
      { id: 'a', text: '没印象', score: 0 },
      { id: 'b', text: '好像在哪听过', score: 2 },
      { id: 'c', text: '能接上各种名场面名台词,从 Steins;Gate 的“El Psy Kongroo”到 Re:Zero 的梗都门儿清', score: 6 },
      { id: 'd', text: '知道是某些作品里的经典桥段', score: 4 },
    ],
  },
  {
    id: 'g50',
    dim: 'meme',
    prompt: '“配音:杉田智和”这种 staff 信息,你的反应?',
    options: [
      { id: 'a', text: '不关心 staff', score: 0 },
      { id: 'b', text: '杉田智和?好像听过', score: 2 },
      { id: 'c', text: '知道他配过不少动画和游戏角色', score: 4 },
      { id: 'd', text: '看到 cast 里有熟悉的声优就更有动力推,会专门留意 Galgame 的配音阵容', score: 6 },
    ],
  },
]
