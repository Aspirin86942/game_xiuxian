// ===== 游戏配置 =====
const CONFIG = {
    // 奇遇触发概率
    ENCOUNTER_CHANCE: 0.15,
    // 基础突破成功率
    BASE_BREAKTHROUGH_RATE: 0.8,
    // 点击修为增益范围
    CLICK_GAIN_MIN: 1,
    CLICK_GAIN_MAX: 5,
    // 失败惩罚比例
    FAIL_PENALTY_RATE: 0.3,
    // 挂机自动修炼间隔（毫秒）
    AUTO_CULTIVATE_INTERVAL: 1000,
    // 挂机收益比例（相对于手动点击）
    AUTO_GAIN_RATIO: 0.6,
    // 挂机奇遇概率减半
    AUTO_ENCOUNTER_CHANCE: 0.075,
    // 背包物品掉落概率
    ITEM_DROP_CHANCE: 0.2,
    // 音效设置
    AUDIO_ENABLED: true,
    MUSIC_ENABLED: true,
};

// 音频上下文
let audioContext = null;

// ===== 物品定义 =====
const ITEMS = {
    // 材料
    lingcao: { name: '灵草', type: 'material', description: '常见的修炼材料', stackable: true },
    lingshi: { name: '灵石', type: 'material', description: '蕴含灵气的石头', stackable: true },
    yaodan: { name: '妖丹', type: 'material', description: '妖兽内丹，稀有材料', stackable: true },
    greenBottle: { name: '神秘绿瓶', type: 'treasure', description: '可以催熟灵药的神秘瓶子', stackable: false },
    moLetter: { name: '墨大夫遗书', type: 'quest', description: '墨大夫留下的信件，揭露了惊人秘密', stackable: false },
    evidence: { name: '药渣证据', type: 'quest', description: '从药房搜集的药渣，证明墨大夫在炼制某种禁药', stackable: false },
    shengxianling: { name: '升仙令', type: 'quest', description: '进入黄枫谷的凭证', stackable: false },
    zhujidan_material: { name: '筑基丹主药', type: 'material', description: '炼制筑基丹的主要材料', stackable: true },
    xuTianTu: { name: '虚天残图', type: 'quest', description: '虚天殿的残图，传说中藏有通天灵宝的秘密', stackable: false },
    // 丹药
    juqidan: { name: '聚气丹', type: 'pill', description: '服用后增加大量修为', effect: { cultivation: 200 }, stackable: true },
    zhujidan: { name: '筑基丹', type: 'pill', description: '提高突破成功率', effect: { breakthroughBonus: 0.15 }, stackable: true },
    jieduSan: { name: '解毒散', type: 'pill', description: '解除体内毒素', effect: { curePoison: true }, stackable: true },
    // 法宝
    feijian: { name: '飞剑', type: 'weapon', description: '增加攻击力', effect: { attack: 5 }, stackable: false },
    hujian: { name: '护身法器', type: 'armor', description: '增加防御力', effect: { defense: 3 }, stackable: false },
    quhun: { name: '曲魂（半傀儡）', type: 'companion', description: '墨府管家，被炼制成半傀儡的随从', stackable: false },
};

// ===== 妖兽定义 =====
const MONSTERS = [
    { name: '风狼', baseHp: 50, baseAttack: 8, baseDefense: 2, dropTable: ['lingcao', 'lingshi'] },
    { name: '赤练蛇', baseHp: 80, baseAttack: 12, baseDefense: 3, dropTable: ['lingcao', 'lingshi', 'yaodan'] },
    { name: '山魈', baseHp: 120, baseAttack: 15, baseDefense: 5, dropTable: ['lingshi', 'yaodan', 'feijian'] },
    { name: '黑熊精', baseHp: 200, baseAttack: 20, baseDefense: 8, dropTable: ['yaodan', 'hujian'] },
    { name: '千年狐妖', baseHp: 300, baseAttack: 25, baseDefense: 10, dropTable: ['yaodan', 'hujian', 'feijian'] },
];

// ===== 剧情系统 - 主线章节 (26 章完整重构) =====
const STORY_CHAPTERS = [
    // ========== 序章：青牛镇 ==========
    {
        id: 0,
        title: '山村少年',
        location: '青牛镇',
        minRealmIndex: -1,
        minStageIndex: 0,
        summary: '家贫入门，决定去七玄门',
        trigger: (state) => state.storyProgress === 0,
        content: '你出生在越国边境的青牛镇，父母早逝，自幼与祖母相依为命。一日，你在上山砍柴时，偶然从一名垂死的老道人手中得到了一本残缺的修仙功法《引气诀》。\n\n老道人临终前告诉你，此功法虽不完整，却足以引你踏入仙门。你按照功法所述，每晚对着明月吐纳，竟真的感觉到体内有一股暖流缓缓流动。\n\n数月后，你听闻不远处的七玄门正在招收弟子，凡十五岁以下、有仙缘者皆可入门。你看着家中米缸日渐见底，心中明白这是改变命运的唯一机会。\n\n祖母将家中仅剩的几枚铜钱塞入你的行囊，浑浊的眼中满是期盼："孩子，若是仙缘不成，便回家来，奶奶等你。"\n\n你背着简单的行囊，踏上了前往七玄门的山路。山道崎岖，云雾缭绕，你望着那若隐若现的仙门殿宇，心中既有憧憬，也有忐忑。',
        choices: [
            {
                text: '立即出发',
                next: 1,
                reward: { cultivation: 50, item: null }
            },
            {
                text: '准备行囊（+资源）',
                next: 1,
                reward: { cultivation: 30, item: { id: 'lingcao', qty: 5 } },
                flags: { 'preparedWell': true }
            },
        ],
        unlockSystem: null,
        nextChapterIds: [1],
    },
    // ========== 第一章：七玄门考核 ==========
    {
        id: 1,
        title: '七玄门考核',
        location: '七玄门',
        minRealmIndex: -1,
        minStageIndex: 0,
        summary: '资质普通，勉强留下',
        trigger: (state) => state.storyProgress === 1,
        content: '你来到了七玄门外门，只见山门巍峨，云雾缭绕，不时有身穿青色道袍的弟子御风而过，令你心驰神往。\n\n负责考核的是一位姓张的外门长老，他让你将手放在一块测灵石上。片刻后，测灵石泛起微弱的白光。\n\n"灵根驳杂，资质普通。"张长老微微皱眉，语气平淡，"不过……"\n\n他话锋一转，目光在你脸上停留片刻，"你眼神坚定，心性尚可。修仙之路，资质虽重要，但并非唯一。你可愿从杂役弟子做起？"\n\n你心中一喜，连忙跪拜行礼："弟子愿意！"\n\n就这样，你被分配到药园做杂役，每日负责浇灌灵草、清理药田。虽然工作辛苦，但你每每想到自己已踏上仙路，便觉得浑身充满干劲。\n\n夜晚，你回到简陋的杂役房，取出那本残缺的《引气诀》，借着月光继续修炼。你暗暗发誓，定要在这仙门中闯出一片天地。',
        choices: [
            {
                text: '低调做人',
                next: 2,
                reward: { cultivation: 100, item: null },
                flags: { 'lowProfile': true }
            },
            {
                text: '张扬表现',
                next: 2,
                reward: { cultivation: 150, item: null },
                flags: { 'lowProfile': false }
            },
        ],
        unlockSystem: 'cultivation',
        nextChapterIds: [2],
    },
    // ========== 第二章：墨大夫收徒 ==========
    {
        id: 2,
        title: '墨大夫收徒',
        location: '神手谷',
        minRealmIndex: 0,
        minStageIndex: 0,
        summary: '墨大夫看中主角，传《长春功》',
        trigger: (state) => state.storyProgress === 2 && state.cultivation >= 100,
        content: '你在药园兢兢业业地劳作，同时暗中修炼《引气诀》。三个月后，你的修为已悄然突破至炼气初期，远超同期杂役弟子。\n\n一日，一位身着灰袍的老者来到药园，他是七玄门著名的墨大夫墨居仁。墨大夫在药园中巡视时，目光忽然停留在一株你照顾的百年灵参上。\n\n"这株参……"墨大夫眼中闪过一丝异色，"是你打理的？"\n\n你恭敬地回答："回前辈，正是。弟子每日按时浇水施肥，不敢有丝毫懈怠。"\n\n墨大夫细细打量你一番，忽道："你叫什么名字？可愿拜入我神手谷，做我的亲传弟子？"\n\n你心中一震，连忙跪拜："弟子韩立，拜见师父！"\n\n墨大夫微微一笑，取出一本泛黄的典籍："这本《长春功》是我早年所得，虽非顶级功法，却中正平和，最适合你。拿去吧，好生修炼，莫要辱没了我神手谷的名头。"',
        choices: [
            {
                text: '拜入墨大夫门下',
                next: 3,
                reward: { cultivation: 150, item: { id: 'juqidan', qty: 2 } },
                flags: { 'moDisciple': true, 'investigated': false },
                relationChange: { '墨大夫': 20 }
            },
            {
                text: '暗中调查墨大夫',
                next: 4,
                reward: { cultivation: 100, item: null },
                flags: { 'moDisciple': false, 'investigated': true },
                relationChange: { '墨大夫': -10 }
            },
            {
                text: '委婉拒绝',
                next: 5,
                reward: { cultivation: 120, item: null },
                flags: { 'moDisciple': false, 'investigated': false, 'soloCultivator': true },
                relationChange: { '墨大夫': -20 }
            },
        ],
        unlockSystem: 'alchemy',
        nextChapterIds: [3],
    },
    // ========== 第三章：厉飞雨之疾 ==========
    {
        id: 3,
        title: '厉飞雨之疾',
        location: '七玄门',
        minRealmIndex: 0,
        minStageIndex: 1,
        summary: '救治厉飞雨，建立第一份人情',
        trigger: (state) => state.storyProgress === 3 && state.stageIndex >= 1,
        content: '拜入神手谷后，你的修为稳步提升。一日，你在门中偶遇一位名叫厉飞雨的弟子，他面色苍白，步履虚浮，显然身患重病。\n\n厉飞雨是七玄门内门弟子，平日里仗义疏财，颇有人望。你曾听闻他为了修炼一门速成功法，透支了身体根基，导致如今修为停滞不前，寿命也在日渐损耗。\n\n"这位师弟，看你面色红润，修为不俗。"厉飞雨勉强挤出一丝笑容，"我这病……怕是无药可医了。"\n\n你心中一动。在神手谷这段时间，你见识了墨大夫的医术，或许可以求师父出手相助？\n\n回到神手谷后，你向墨大夫提及此事。墨大夫沉默良久，叹息道："飞雨那孩子……罢了，我尽力而为。"\n\n几日后，墨大夫炼制出丹药，厉飞雨的病情暂时稳定。厉飞雨对你感激涕零，与你结为异姓兄弟："贤弟大恩，厉某没齿难忘！"',
        choices: [
            {
                text: '替厉飞雨求药',
                next: 4,
                reward: { cultivation: 200 },
                relationChange: { '厉飞雨': 50, '墨大夫': 10 },
                flags: { 'helpedLi': true }
            },
            {
                text: '建议厉飞雨自行疗伤',
                next: 5,
                reward: { cultivation: 150 },
                relationChange: { '厉飞雨': -20, '墨大夫': 10 },
                flags: { 'helpedLi': false }
            },
        ],
        unlockSystem: 'npcRelation',
        nextChapterIds: [4],
    },
    // ========== 第四章：消失的药童 ==========
    {
        id: 4,
        title: '消失的药童',
        location: '神手谷',
        minRealmIndex: 0,
        minStageIndex: 2,
        summary: '发现墨大夫不对劲',
        trigger: (state) => state.storyProgress === 4 && state.stageIndex >= 2,
        content: '随着时间推移，你渐渐发现神手谷有些不对劲。先后有三名药童莫名失踪，墨大夫只说他们辞工回家了，但你总觉得事有蹊跷。\n\n一日深夜，你起身如厕，隐约看见墨大夫的密室中透出诡异绿光。你蹑手蹑脚地靠近，透过门缝窥见墨大夫正对着一个炼丹炉念念有词，炉中隐隐有血色雾气升腾。\n\n次日，你趁着墨大夫外出问诊，偷偷潜入他的药房。在药柜角落，你发现了一些奇怪的药渣——这些药材并非治病所用，而是某种邪术祭炼的辅料。\n\n你将药渣小心包好，心中惊疑不定。难道师父一直在用弟子的精血炼制禁药？那失踪的药童……\n\n你想起厉飞雨那日渐衰弱的身体，一个可怕的念头浮上心头：墨大夫帮助厉飞雨，恐怕并非出于善心，而是在进行某种不可告人的实验。',
        choices: [
            {
                text: '暗中调查',
                next: 5,
                reward: { cultivation: 100, item: { id: 'evidence', qty: 1 } },
                flags: { 'hasEvidence': true }
            },
            {
                text: '直接向墨大夫询问',
                next: 5,
                reward: { cultivation: 50 },
                flags: { 'hasEvidence': false },
                relationChange: { '墨大夫': -30 }
            },
        ],
        unlockSystem: 'quest',
        nextChapterIds: [5],
    },
    // ========== 第五章：绿瓶异象 ==========
    {
        id: 5,
        title: '绿瓶异象',
        location: '药园',
        minRealmIndex: 0,
        minStageIndex: 2,
        summary: '捡到神秘绿瓶，发现催熟灵药',
        trigger: (state) => state.storyProgress === 5,
        content: '一日，你被派往后山药园采集灵草。在药园深处，你偶然发现了一个被藤蔓覆盖的隐秘角落。\n\n扒开藤蔓，一个绿色的小瓶静静躺在泥土中。瓶子通体碧绿，散发着温润的光泽，似乎已有数百年历史。\n\n你将绿瓶收入怀中，并未在意。当晚，你想起白日采到的一株普通灵草，便取出绿瓶想要擦拭干净，看看能否卖个好价钱。\n\n谁知当你用绿瓶盛装清水时，奇异的一幕发生了——瓶中的水竟泛起淡淡的绿光，映照在你随手放在桌面上的那株灵草上。\n\n次日清晨，你惊讶地发现，那株原本普通的灵草竟然成熟了！药龄至少增加了十年！\n\n你心中狂跳，连忙取出绿瓶反复试验。果然，这绿瓶有着催熟灵药的逆天能力！\n\n你深吸一口气，将绿瓶贴身藏好。此物太过惊人，若是被人知晓，恐怕会引来杀身之祸。从今往后，必须更加谨慎行事。',
        choices: [
            {
                text: '收起绿瓶，尝试催熟灵药',
                next: 6,
                reward: { cultivation: 200, item: { id: 'greenBottle', qty: 1 } },
                flags: { 'hasGreenBottle': true }
            },
            {
                text: '上交宗门',
                next: 6,
                reward: { cultivation: 300, item: null },
                flags: { 'hasGreenBottle': false },
                relationChange: { '墨大夫': 20 }
            },
        ],
        unlockSystem: 'planting',
        nextChapterIds: [6],
    },
    // ========== 第六章：墨居仁摊牌 ==========
    {
        id: 6,
        title: '墨居仁摊牌',
        location: '神手谷密室',
        minRealmIndex: 0,
        minStageIndex: 3,
        summary: '师徒决裂，生死一战',
        trigger: (state) => state.storyProgress === 6 && state.stageIndex >= 3,
        content: `你带着药渣证据求见墨大夫，却见他早已在密室中等候。\n\n"徒儿，你果然来了。"墨大夫背对着你，声音沙哑，"为师等你许久了。"\n\n你心中一沉，强作镇定："师父，弟子只是想问清楚，药园失踪的几人，究竟去了哪里？"\n\n墨大夫缓缓转身，眼中满是血丝："你既已发现，为师也不瞒你。不错，那些药童都被我用来炼制'回春丹'了。"\n\n"你——"你怒不可遏，"他们可都是活生生的人命！"\n\n"人命？"墨大夫冷笑，"修仙界弱肉强食，人命如草芥。你以为为师为何收你为徒？因为你身具灵根，是炼制'夺舍丹'的最佳鼎炉！"\n\n你心中大骇，这才明白自己一直身处虎穴。墨大夫不再多言，祭出一件血色法宝向你攻来。\n\n你拼死抵抗，凭借着绿瓶催熟的灵药临时突破，与墨大夫战成一团。密室中灵气四溢，法宝碰撞之声不绝于耳。`,
        choices: [
            {
                text: '先手攻击',
                next: 7,
                reward: { cultivation: 500, item: { id: 'moLetter', qty: 1 } },
                flags: { 'fightStyle': 'aggressive' }
            },
            {
                text: '后发制人',
                next: 7,
                reward: { cultivation: 450, item: { id: 'moLetter', qty: 1 } },
                flags: { 'fightStyle': 'defensive' }
            },
            {
                text: '尝试逃跑',
                next: 8,
                reward: { cultivation: 300, item: { id: 'moLetter', qty: 1 } },
                flags: { 'fightStyle': 'flee' }
            },
        ],
        unlockSystem: 'boss',
        nextChapterIds: [7],
    },
    // ========== 第七章：遗书与解毒 ==========
    {
        id: 7,
        title: '遗书与解毒',
        location: '神手谷密室',
        minRealmIndex: 0,
        minStageIndex: 4,
        summary: '墨大夫陨落，留下遗书揭露惊天秘密',
        trigger: (state) => state.storyProgress === 7,
        content: `密室中的灵气渐渐平息，你拄着飞剑，大口喘息着。地上，墨大夫的尸体已经冰冷，那双死不瞑目的眼睛依然圆睁着，仿佛在诉说着不甘。\n\n你缓缓走到尸体旁，从他怀中取出一封泛黄的信件。信封上写着"立儿亲启"四个字，字迹潦草，似乎是在极度匆忙中写就的。\n\n"师父……"你心中五味杂陈，终究还是拆开了信封。\n\n信中，墨大夫详细讲述了他年轻时的经历。原来他早年曾在一处古修洞府中得到过一本奇书，书中记载了一种名为"夺舍重生"的禁术。此术可让人在寿元将尽时，夺取他人肉身，延续性命。\n\n"为师早年与人结仇，被人种下'蚀魂散'，时日无多。"墨大夫的字迹在这里变得模糊，似乎被泪水打湿，"本想在七玄门找个资质好的弟子，传授功法，待时机成熟时夺舍。谁知……你竟与为师年轻时如此相似。"\n\n你读到这里，心中一颤。原来墨大夫收你为徒，并非单纯出于善意，而是早有预谋。\n\n信的末尾，墨大夫写道："为师一生算计，最终却败给了自己。这'三尸脑神丹'的解药配方就在信后，你好自为之。另外，神手谷密室暗格中有一本《回春真录》，是为师早年所得，今赠予你，望你善用。"\n\n你合上信件，望向墨大夫的尸体，久久无言。修仙之路，当真如此残酷无情吗？`,
        choices: [
            {
                text: '收起遗书与解药配方',
                next: 8,
                reward: { cultivation: 500, item: { id: 'moLetter', qty: 1 } },
                flags: { 'hasMoLetter': true, 'hasSpringRecipe': true, 'mournMo': true }
            },
            {
                text: '烧毁遗书，只取解药',
                next: 8,
                reward: { cultivation: 400 },
                flags: { 'hasMoLetter': false, 'hasSpringRecipe': true, 'burnedLetter': true }
            },
            {
                text: '安葬墨大夫后离开',
                next: 8,
                reward: { cultivation: 450, item: { id: 'moLetter', qty: 1 } },
                relationChange: { '墨大夫': 20 },
                flags: { 'hasMoLetter': true, 'hasSpringRecipe': true, 'buriedMo': true }
            },
        ],
        unlockSystem: null,
        nextChapterIds: [8],
    },
    // ========== 第八章：墨府旧事 ==========
    {
        id: 8,
        title: '墨府旧事',
        location: '嘉元城',
        minRealmIndex: 0,
        minStageIndex: 4,
        summary: '见墨府众人，处理遗愿与恩怨',
        trigger: (state) => state.storyProgress === 8 && state.currentLocation === '嘉元城',
        content: `按照遗书所述，你来到了嘉元城墨府。这是一座占地数十亩的大宅院，雕梁画栋，气派非凡。然而如今，府上下人稀少，显得冷冷清清。\n\n墨府众人见到你手中的遗书和信物，顿时沸腾。原来墨大夫的夫人早已过世，只留下一女墨彩环，独自支撑着偌大的家业。\n\n"家父……真的去了？"墨彩环泪眼婆娑，声音颤抖，"他说过要回来的。"\n\n你心中不忍，将墨大夫的死因简化告知。墨彩环听罢，沉默良久，轻声道："父亲一生行医济世，救死扶伤，想不到最后……"\n\n你取出墨大夫遗书中提及的一些凡俗财物交还墨府，墨彩环对你感激涕零。\n\n"公子大恩，墨彩环没齿难忘。"墨彩环盈盈一拜，"若公子日后有所差遣，墨府上下万死不辞。"\n\n你在墨府盘桓数日，按照丹方炼制出解药，暂时压制了体内毒素。墨彩环再三挽留，但你深知七玄门此地不宜久留，决定远行寻找彻底解毒之法。\n\n夜晚，你独自站在墨府后院，望着天边明月，心中思绪万千。墨彩环端着一杯热茶走来，轻声道："公子，无论前方如何艰险，彩环都会一直等你回来。"\n\n你心中一动，望向眼前这个柔弱却坚强的女子。她知道你的秘密吗？知道你是修仙之人，知道你可能一去不返吗？`,
        choices: [
            {
                text: '完成墨大夫遗愿（照顾墨府）',
                next: 9,
                reward: { cultivation: 600, item: { id: 'juqidan', qty: 5 } },
                relationChange: { '墨彩环': 60 },
                flags: { 'fulfilledMoWill': true, 'promisedCare': true }
            },
            {
                text: '只取宝物离开',
                next: 9,
                reward: { cultivation: 500, item: { id: 'lingshi', qty: 10 } },
                relationChange: { '墨彩环': -20 },
                flags: { 'fulfilledMoWill': false, 'tookTreasure': true }
            },
            {
                text: '向墨彩环表明心意',
                next: 9,
                reward: { cultivation: 550 },
                relationChange: { '墨彩环': 80 },
                flags: { 'fulfilledMoWill': true, 'caihuanPromise': true, 'daoLvPromise': true }
            },
        ],
        unlockSystem: 'merchant',
        nextChapterIds: [9],
    },
    // ========== 第九章：曲魂初现 ==========
    {
        id: 9,
        title: '曲魂初现',
        location: '墨府',
        minRealmIndex: 0,
        minStageIndex: 4,
        summary: '发现墨大夫的秘密实验，处置曲魂',
        trigger: (state) => state.storyProgress === 9 && state.npcRelations['墨彩环'] >= 50,
        content: `在墨府后院的密室中，你发现了墨大夫炼制的第一个实验品——被炼成半傀儡的管家曲魂。\n\n曲魂双目无神，全身僵硬，但隐约还能看出人形。他脖子上挂着一块破旧的木牌，上面刻着"曲魂"二字。若是靠近细看，还能发现他眼底深处残留着一丝清明。\n\n墨彩环站在你身后，声音颤抖："这是府上的老管家，被父亲……炼成了这副模样。公子，求你解脱他的痛苦。"\n\n你仔细检查曲魂的身体，发现他的魂魄并未完全消散，而是被某种禁术强行束缚在体内。若能解开禁制，或许可以恢复部分神智，甚至让他成为你的助力。\n\n你取出墨大夫遗书中记载的解魂丹配方，发现需要几种稀有药材：千年灵芝、聚魂草、还魂果。这些药材在嘉元城难以寻得，只有前往更大的修仙城池才有可能买到。\n\n墨彩环望着曲魂空洞的双眼，轻声道："若公子能救他，彩环愿倾尽家产。"\n\n你心中权衡。救曲魂，需要耗费大量资源；但不救，又于心不忍。更何况，若真能将他炼制为忠心耿耿的随从，对你日后的修仙之路也不无裨益。`,
        choices: [
            {
                text: '收服曲魂为随从',
                next: 10,
                reward: { cultivation: 500, item: { id: 'quhun', qty: 1 } },
                flags: { 'hasQuhun': true, 'curedQuhun': false, 'quhunLoyal': true }
            },
            {
                text: '尝试解除禁制（消耗资源）',
                next: 10,
                reward: { cultivation: 600, item: { id: 'quhun', qty: 1 } },
                relationChange: { '墨彩环': 40 },
                flags: { 'hasQuhun': true, 'curedQuhun': true, 'quhunGrateful': true }
            },
            {
                text: '超度曲魂',
                next: 10,
                reward: { cultivation: 700 },
                relationChange: { '墨彩环': 20 },
                flags: { 'hasQuhun': false, 'curedQuhun': false, 'quhunReleased': true }
            },
        ],
        unlockSystem: 'companion',
        nextChapterIds: [10],
    },
    // ========== 第十章：太南小会 ==========
    {
        id: 10,
        title: '太南小会',
        location: '太南山',
        minRealmIndex: 0,
        minStageIndex: 5,
        summary: '散修交易会，升仙令现世',
        trigger: (state) => state.storyProgress === 10 && state.stageIndex >= 5,
        content: `你听闻太南山将举办散修交易会，决定前去碰碰运气，看看能否找到解毒的丹方或药材。\n\n太南山位于越国边境，每十年举办一次大型交易会。届时，来自各大宗门的散修齐聚一堂，交换修炼资源、功法秘籍、法宝丹药。这不仅是一场交易会，更是各大宗门暗中角力的场所。\n\n你抵达太南山时，只见人山人海，各色修士穿梭其中。有人在路边摆摊，高声叫卖自己的货物；有人在茶楼中低声私语，交换着不为人知的秘密；还有人独自坐在角落，眼神警惕地扫视着四周。\n\n你在人群中穿梭，忽然听到前方一阵骚动。原来是一位老者正在拍卖一枚升仙令——这是加入大门派的凭证，极为稀有。\n\n"这枚升仙令，是我早年在一处古修洞府中获得。"老者捋着胡须，眼中闪过一丝狡黠，"持有此令，可直接进入黄枫谷、掩月宗等大门派，无需经过繁琐考核。"\n\n你心中一动。黄枫谷是天越大陆第一宗门，若能加入，或许能找到彻底解毒之法。但此地人多眼杂，怕是有人心怀不轨。`,
        choices: [
            {
                text: '竞拍升仙令',
                next: 11,
                reward: { cultivation: 500, item: { id: 'shengxianling', qty: 1 } },
                flags: { 'hasShengxianling': true, 'auctionBidder': true }
            },
            {
                text: '私下收购消息',
                next: 11,
                reward: { cultivation: 400, item: { id: 'lingshi', qty: -5 } },
                flags: { 'hasShengxianling': false, 'hasSecretInfo': true, 'networked': true }
            },
            {
                text: '静观其变',
                next: 11,
                reward: { cultivation: 600 },
                flags: { 'hasShengxianling': false, 'hasSecretInfo': false, 'lowProfile': true, 'cautious': true }
            },
        ],
        unlockSystem: 'market',
        nextChapterIds: [11],
    },
    // ========== 第十一章：升仙令 ==========
    {
        id: 11,
        title: '升仙令',
        location: '太南山秘市',
        minRealmIndex: 0,
        minStageIndex: 5,
        summary: '得到入宗机会，决定去黄枫谷',
        trigger: (state) => state.storyProgress === 11,
        content: `在太南山秘市，你偶然得到了一块升仙令。这是加入黄枫谷的凭证，黄枫谷是天越大陆第一修仙宗门，远比七玄门强大。\n\n持有升仙令，你可以选择加入黄枫谷，也可以前往其他宗门。每大宗门都有其独特之处：\n\n黄枫谷以剑术和丹道闻名，门中高手如云，资源丰厚，但竞争也最为激烈；\n掩月宗是女子宗门，擅长幻术和音律功法，门规森严；\n化刀坞以刀法著称，门人皆作风风火火，好勇斗狠；\n而继续做散修，虽然自由自在，但资源获取困难，且容易被人欺凌。\n\n你手握升仙令，心中权衡利弊。此时，一位神秘修士悄然靠近你，低声道："道友，这升仙令可否出售？我愿出高价。"\n\n你心中一动，此人出价不低，足以买下许多修炼资源。但升仙令背后的机缘，又岂是区区灵石能衡量的？`,
        choices: [
            {
                text: '持令前往黄枫谷',
                next: 12,
                reward: { cultivation: 700, item: { id: 'shengxianling', qty: 1 } },
                relationChange: { '黄枫谷': 20 },
                flags: { 'joinedYellowMaple': true, 'sectChoice': 'yellowMaple' }
            },
            {
                text: '前往其他宗门',
                next: 12,
                reward: { cultivation: 650 },
                relationChange: { '黄枫谷': -10 },
                flags: { 'joinedYellowMaple': false, 'sectChoice': 'other' }
            },
            {
                text: '出售升仙令',
                next: 12,
                reward: { cultivation: 600, item: { id: 'lingshi', qty: 50 } },
                flags: { 'joinedYellowMaple': false, 'soldShengxianling': true, 'sectChoice': 'none' }
            },
        ],
        unlockSystem: null,
        nextChapterIds: [12],
    },
    // ========== 第十二章：百药园杂役 ==========
    {
        id: 12,
        title: '百药园杂役',
        location: '黄枫谷',
        minRealmIndex: 0,
        minStageIndex: 5,
        summary: '低调苟活，借小瓶培植灵药',
        trigger: (state) => state.storyProgress === 12 && state.currentLocation === '黄枫谷',
        content: `你加入了黄枫谷，被分配到百药园做杂役。虽然地位低下，但你可以利用绿瓶催熟灵药，暗中积累修炼资源。\n\n百药园是黄枫谷药草种植基地，占地数千亩，种植着各类灵草灵药。园中杂役上百人，皆是新入门的弟子。\n\n园主是一位姓王的老修士，他淡淡地扫了你一眼："从今日起，你负责丙区药田。每日需浇灌灵草十亩，除草施肥，不得有误。"\n\n你恭敬地应下，心中却暗自盘算。百药园虽辛苦，但接触灵药的机会多，正适合你用绿瓶催熟灵药，暗中修炼。\n\n夜晚，你回到简陋的杂役房，取出绿瓶和白日里偷偷采集的几株灵草。你将灵草放入绿瓶催熟，只见绿光闪烁，灵草药龄果然大增。\n\n"此物太过逆天，切不可让人知晓。"你暗暗告诫自己。`,
        choices: [
            {
                text: '低调种植灵药',
                next: 13,
                reward: { cultivation: 800, item: { id: 'lingcao', qty: 10 } },
                flags: { 'lowProfileFarming': true }
            },
            {
                text: '大量催熟灵药',
                next: 13,
                reward: { cultivation: 1000, item: { id: 'lingcao', qty: 20 } },
                flags: { 'lowProfileFarming': false, 'riskExposed': true }
            },
            {
                text: '结交其他杂役',
                next: 13,
                reward: { cultivation: 700 },
                relationChange: { '黄枫谷杂役': 30 },
                flags: { 'hasConnections': true }
            },
        ],
        unlockSystem: 'farming',
        nextChapterIds: [13],
    },
    // ========== 第十三章：血色禁地前夜 ==========
    {
        id: 13,
        title: '血色禁地前夜',
        location: '黄枫谷',
        minRealmIndex: 0,
        minStageIndex: 5,
        summary: '为筑基丹做准备，宗门内卷开始',
        trigger: (state) => state.storyProgress === 13 && state.cultivation >= 400,
        content: `黄枫谷宣布即将开启血色禁地，这是筑基期以下弟子最大的机缘。但你需要先炼制筑基丹，提高突破成功率。\n\n血色禁地是上古修士战场，内部危机四伏，但也蕴藏着无数机缘。禁地每百年开启一次，每次开启都会吸引大量弟子前往。\n\n"此次进入血色禁地，主要是为了采集'筑基草'。"李长老在高台上淡淡说道，"此草只生长在禁地深处，极为稀有。"\n\n你心中一动。筑基草正是炼制筑基丹的主药，若能多采集几株，不仅能炼制自己的筑基丹，还能出售换取修炼资源。\n\n然而，你很快发现，并非所有人都这么想。一些弟子已经开始暗中拉帮结派，准备在禁地中互相照应，甚至……杀人夺宝。\n\n夜深人静，你独自坐在房中，思索着进入禁地的策略。`,
        choices: [
            {
                text: '独自准备进入禁地',
                next: 14,
                reward: { cultivation: 1000, item: { id: 'zhujidan_material', qty: 3 } },
                flags: { 'soloIntoForbidden': true }
            },
            {
                text: '组队进入禁地',
                next: 14,
                reward: { cultivation: 900, item: { id: 'zhujidan_material', qty: 2 } },
                relationChange: { '黄枫谷队友': 20 },
                flags: { 'soloIntoForbidden': false, 'hasTeam': true }
            },
            {
                text: '放弃此次机会',
                next: 14,
                reward: { cultivation: 800, item: { id: 'juqidan', qty: 3 } },
                flags: { 'soloIntoForbidden': true, 'skipForbidden': true }
            },
        ],
        unlockSystem: 'preparation',
        nextChapterIds: [14],
    },
    // ========== 第十四章：血色禁地 ==========
    {
        id: 14,
        title: '血色禁地',
        location: '血色禁地',
        minRealmIndex: 0,
        minStageIndex: 5,
        summary: '采药、伏击、逃生、初遇南宫婉',
        trigger: (state) => state.storyProgress === 14 && state.inventory['zhujidan_material'] >= 3,
        content: `你进入了血色禁地，这里危机四伏。血色迷雾笼罩着整片大地，不时有妖兽的咆哮声从远处传来。\n\n你小心翼翼地前行，忽然听到前方传来打斗声。靠近一看，只见一名身穿紫色宫装的女子被数名黑衣修士围攻。那女子容貌绝美，气质清冷，但此刻已是香汗淋漓，显然支持不了多久。\n\n"此女是掩月宗的南宫婉！"你心中一震。掩月宗是越国第二大宗门，南宫婉更是门中天之骄女。\n\n"救我……"南宫婉发现了你，眼中闪过一丝希冀。\n\n那几名黑衣修士也注意到你，其中一人冷笑道："小子，识相的就滚开，否则连你一起杀！"\n\n你心中权衡。救下南宫婉，或许能得到掩月宗的人情；但若出手相救，也可能得罪这些黑衣修士背后的势力。\n\n更重要的是，这血色禁地中，杀人夺宝之事屡见不鲜。`,
        choices: [
            {
                text: '出手相助南宫婉',
                next: 15,
                reward: { cultivation: 1500, item: { id: 'zhujidan_material', qty: 2 } },
                relationChange: { '南宫婉': 80 },
                flags: { 'savedNangong': true }
            },
            {
                text: '坐山观虎斗',
                next: 15,
                reward: { cultivation: 1200, item: { id: 'zhujidan_material', qty: 3 } },
                relationChange: { '南宫婉': -50 },
                flags: { 'savedNangong': false, 'opportunistic': true }
            },
            {
                text: '趁乱寻宝',
                next: 15,
                reward: { cultivation: 1400, item: { id: 'lingshi', qty: 30 } },
                flags: { 'savedNangong': false, 'treasureHunter': true }
            },
            {
                text: '杀人夺宝（魔道线）',
                next: 15,
                reward: { cultivation: 2000, item: { id: 'yaodan', qty: 5 } },
                relationChange: { '南宫婉': -100, '正道': -50 },
                flags: { 'savedNangong': false, 'demonicPath': true }
            },
        ],
        unlockSystem: 'roguelite',
        nextChapterIds: [15],
    },
    // ========== 第十五章：情债与筑基 ==========
    {
        id: 15,
        title: '情债与筑基',
        location: '黄枫谷',
        minRealmIndex: 1,
        minStageIndex: 0,
        summary: '禁地余波，尝试筑基',
        trigger: (state) => state.storyProgress === 15 && state.realmIndex >= 1,
        content: `从血色禁地回来后，你利用获得的资源成功突破至筑基期。南宫婉对你暗生情愫，但她是掩月宗核心弟子，身份悬殊。\n\n"道友大恩，南宫婉没齿难忘。"南宫婉望着你，美眸中闪烁着异样的光芒，"若道友日后有所需要，掩月宗上下必当鼎力相助。"\n\n你心中一动。若能攀上掩月宗这棵大树，日后修炼之路必将顺畅许多。但你也清楚，南宫婉身份尊贵，自己如今只是黄枫谷一名普通弟子，两家宗门虽无恩怨，但也谈不上亲密。\n\n李长老得知你在禁地的表现，对你颇为赞赏："不错，不愧是我黄枫谷弟子。这是筑基丹的丹方，你好生修炼，争取早日进入内门。"\n\n你接过丹方，心中却想着南宫婉那意味深长的眼神。`,
        choices: [
            {
                text: '接受南宫婉的好意',
                next: 16,
                reward: { cultivation: 2000, item: { id: 'zhujidan', qty: 2 } },
                relationChange: { '南宫婉': 50 },
                flags: { 'acceptNangong': true }
            },
            {
                text: '保持距离专心修炼',
                next: 16,
                reward: { cultivation: 2500, item: { id: 'zhujidan', qty: 1 } },
                relationChange: { '南宫婉': -20 },
                flags: { 'acceptNangong': false, 'focusCultivation': true }
            },
            {
                text: '拒绝南宫婉（道心坚定）',
                next: 16,
                reward: { cultivation: 3000 },
                relationChange: { '南宫婉': -50 },
                flags: { 'acceptNangong': false, 'rejectedNangong': true, 'daoHeartFirm': true }
            },
        ],
        unlockSystem: 'cultivation2',
        nextChapterIds: [16],
    },
    // ========== 第十六章：李化元门下 ==========
    {
        id: 16,
        title: '李化元门下',
        location: '黄枫谷内门',
        minRealmIndex: 1,
        minStageIndex: 1,
        summary: '转入内门，得更高阶功法剑诀',
        trigger: (state) => state.storyProgress === 16 && state.stageIndex >= 1,
        content: `你的天赋被黄枫谷长老李化元看中，收为亲传弟子。你得以学习更高阶的功法和剑诀。\n\n李化元是黄枫谷五大金丹长老之一，以剑术和丹道著称。他收下你后，并未立刻传授高深功法，而是让你每日抄写道经，打磨心性。\n\n"修仙之路，心性为先。"李化元淡淡说道，"若心性不稳，修为再高也只是空中楼阁。"\n\n你恭敬地应下，心中却明白这是师父在考验你。于是你每日认真抄写，不敢有丝毫懈怠。\n\n三月后，李化元终于满意地点头："不错，心性已成，可以传你功法了。这是《青元剑诀》，乃是我黄枫谷镇派功法之一，你好生修炼。"\n\n你接过剑诀，心中激动不已。这《青元剑诀》虽非顶级功法，但也远超你之前修炼的《长春功》。`,
        choices: [
            {
                text: '拜入李长老门下',
                next: 17,
                reward: { cultivation: 2500, item: { id: 'feijian', qty: 1 } },
                relationChange: { '李化元': 50 },
                flags: { 'liDisciple': true }
            },
            {
                text: '拒绝拜师（保持自由）',
                next: 17,
                reward: { cultivation: 3000 },
                relationChange: { '李化元': -30, '黄枫谷': -20 },
                flags: { 'liDisciple': false, 'freeCultivator': true }
            },
            {
                text: '暂拜门下暗中学习',
                next: 17,
                reward: { cultivation: 2800, item: { id: 'feijian', qty: 1 } },
                relationChange: { '李化元': 20 },
                flags: { 'liDisciple': true, 'secretLearning': true }
            },
        ],
        unlockSystem: 'skillTree',
        nextChapterIds: [17],
    },
    // ========== 第十七章：燕家堡风云 ==========
    {
        id: 17,
        title: '燕家堡风云',
        location: '燕家堡',
        minRealmIndex: 1,
        minStageIndex: 2,
        summary: '宴会表象下暗潮汹涌',
        trigger: (state) => state.storyProgress === 17 && state.stageIndex >= 2,
        content: `你随李长老前往燕家堡参加修仙家族宴会。表面上一团和气，实则各怀鬼胎。\n\n燕家堡是越国第一修仙家族，堡主燕云山已至金丹后期，实力雄厚。此次宴会名为庆祝燕云山寿辰，实则是各大宗门互相试探、交换利益的场所。\n\n宴会上，你见到了各大宗门的精英弟子。有人风度翩翩，有人阴鸷狠辣，有人高傲冷艳。你暗中观察，心中暗自戒备。\n\n"这位道友面生得很。"一位锦衣青年走来，似笑非笑地看着你，"在下王家王蝉，不知道友来自何方？"\n\n你心中一凛。王家是越国四大家族之一，王蝉更是出了名的狠角色。此人主动搭话，恐怕不怀好意。\n\n你不动声色地应对，心中却在盘算如何应对可能到来的麻烦。`,
        choices: [
            {
                text: '低调行事',
                next: 18,
                reward: { cultivation: 3000 },
                flags: { 'lowProfileBanquet': true }
            },
            {
                text: '出头震慑',
                next: 18,
                reward: { cultivation: 3500, item: { id: 'lingshi', qty: 20 } },
                relationChange: { '王蝉': -30, '燕家堡': 20 },
                flags: { 'lowProfileBanquet': false, 'showedStrength': true }
            },
            {
                text: '结交各方势力',
                next: 18,
                reward: { cultivation: 2800 },
                relationChange: { '燕家堡': 30, '王家': -10 },
                flags: { 'lowProfileBanquet': false, 'networking': true }
            },
        ],
        unlockSystem: 'social',
        nextChapterIds: [18],
    },
    // ========== 第十八章：魔道争锋 ==========
    {
        id: 18,
        title: '魔道争锋',
        location: '越国边境',
        minRealmIndex: 1,
        minStageIndex: 3,
        summary: '魔道入侵，宗门局势失控',
        trigger: (state) => state.storyProgress === 18 && state.stageIndex >= 3,
        content: `魔道六宗入侵天越大陆，黄枫谷被迫应战。战火蔓延，生灵涂炭。\n\n魔道六宗以鬼灵门为首，联合血杀宗、合欢宗等邪派宗门，势如破竹般攻入越国边境。各大宗门被迫联合，组成正道联盟抵御魔道。\n\n"此次大战，关乎我正道存亡！"黄枫谷谷主在高台上慷慨陈词，"凡我弟子，当奋勇杀敌，不得退缩！"\n\n你站在人群中，心中却暗自盘算。正道与魔道之争，由来已久，胜负难料。自己区区筑基修为，在战场上不过是炮灰而已。\n\n李长老看向你："此次大战，你可选择参战，也可暂避锋芒。但无论选择如何，都要记住——活着才是最重要的。"\n\n你心中一动。师父此言，是在暗示什么吗？`,
        choices: [
            {
                text: '随宗门迎敌',
                next: 19,
                reward: { cultivation: 4000, item: { id: 'yaodan', qty: 5 } },
                relationChange: { '黄枫谷': 30, '正道': 20 },
                flags: { 'joinedWar': true, 'loyalToSect': true }
            },
            {
                text: '假意参战实则逃跑',
                next: 19,
                reward: { cultivation: 3500 },
                relationChange: { '黄枫谷': -20 },
                flags: { 'joinedWar': false, 'fledWar': true }
            },
            {
                text: '投靠魔道（魔道线）',
                next: 19,
                reward: { cultivation: 5000, item: { id: 'yaodan', qty: 10 } },
                relationChange: { '黄枫谷': -100, '正道': -50, '魔道': 30 },
                flags: { 'joinedWar': false, 'defectedToDemonic': true, 'demonicPath': true }
            },
        ],
        unlockSystem: 'war',
        nextChapterIds: [19],
    },
    // ========== 第十九章：灵矿死局 ==========
    {
        id: 19,
        title: '灵矿死局',
        location: '灵石矿脉',
        minRealmIndex: 1,
        minStageIndex: 4,
        summary: '被当作弃子，绝境求生',
        trigger: (state) => state.storyProgress === 19 && state.stageIndex >= 4,
        content: `你被派往守护灵石矿脉，却发现宗门高层已将你们当作弃子。你必须在绝境中求生。\n\n灵石矿脉位于越国边境深处，是各大宗门争夺的战略资源。黄枫谷在此部署了数百名弟子，由数名金丹修士坐镇。\n\n然而，当你抵达矿脉后不久，就发现情况不对。魔道攻势猛烈，而宗门派来的援兵却迟迟未到。更糟糕的是，有消息传来，高层已经决定放弃矿脉，收缩防线。\n\n"我们被放弃了！"一名弟子愤怒地喊道，"他们想让我们在这里送死！"\n\n军心涣散，有人开始逃跑，有人准备投降，还有人打算拼死一搏。\n\n你站在营地中，心中快速盘算。留在此地，必死无疑；逃跑，可能被魔道追杀；投降，或许能活命，但日后必将被正道唾弃。\n\n你必须做出选择。`,
        choices: [
            {
                text: '死守矿脉（忠义线）',
                next: 20,
                reward: { cultivation: 5000, item: { id: 'lingshi', qty: 30 } },
                relationChange: { '黄枫谷': 50, '正道': 30 },
                flags: { 'defendedMine': true, 'loyalToSect': true }
            },
            {
                text: '带队突围',
                next: 20,
                reward: { cultivation: 6000, item: { id: 'lingshi', qty: 20 } },
                relationChange: { '黄枫谷': 20, '队友': 50 },
                flags: { 'ledBreakout': true, 'hasFollowers': true }
            },
            {
                text: '独自逃生（苟道线）',
                next: 20,
                reward: { cultivation: 5500, item: { id: 'lingshi', qty: 10 } },
                relationChange: { '黄枫谷': -30 },
                flags: { 'fledAlone': true, 'soloSurvivor': true }
            },
        ],
        unlockSystem: 'survival',
        nextChapterIds: [20],
    },
    // ========== 第二十章：再别天南 ==========
    {
        id: 20,
        title: '再别天南',
        location: '传送阵',
        minRealmIndex: 2,
        minStageIndex: 0,
        summary: '不得不离开旧地，遁入乱星海',
        trigger: (state) => state.storyProgress === 20 && state.realmIndex >= 2,
        content: `金丹期的你已站在天越大陆巅峰，但仇家太多，你决定通过古传送阵前往乱星海，开始新的征程。\n\n经过灵矿一战，你虽成功存活，但也得罪了不少人。正道认为你见死不救，魔道觉得你不够忠诚。更重要的是，你在血色禁地和灵矿中获得的宝物，让一些人眼红不已。\n\n"此地不宜久留。"李长老悄然找到你，"这是古传送阵的坐标，前往乱星海吧。那里虽然危险，但机缘也不少。"\n\n你心中感激，师父终究还是关心自己的。\n\n站在古传送阵前，你回望天越大陆，心中五味杂陈。这里有你的恩师、友人、仇敌，还有……南宫婉。\n\n"南宫姑娘，若有来生，我们再续前缘。"你喃喃自语，随即踏入传送阵。\n\n光芒闪烁，你消失在原地。`,
        choices: [
            {
                text: '启动传送阵前往乱星海',
                next: 21,
                reward: { cultivation: 6000 },
                flags: { 'wentToStarSea': true }
            },
            {
                text: '前往其他大陆',
                next: 21,
                reward: { cultivation: 5500, item: { id: 'lingshi', qty: 20 } },
                flags: { 'wentToStarSea': false, 'wentToOtherContinent': true }
            },
            {
                text: '留在天南隐居',
                next: 21,
                reward: { cultivation: 5000 },
                relationChange: { '南宫婉': 20 },
                flags: { 'wentToStarSea': false, 'stayHidden': true }
            },
        ],
        unlockSystem: null,
        nextChapterIds: [21],
    },
    // ========== 第二十一章：初入星海 ==========
    {
        id: 21,
        title: '初入星海',
        location: '乱星海',
        minRealmIndex: 2,
        minStageIndex: 0,
        summary: '海域新秩序、新势力、新妖兽',
        trigger: (state) => state.storyProgress === 21 && state.currentLocation === '乱星海',
        content: `你来到了乱星海，这里与天南完全不同。海域广阔，妖兽横行，还有强大的海族和星宫。\n\n乱星海由星宫统治，但各大岛屿和海域实际上由不同势力掌控。这里有专门猎杀妖兽取丹的猎妖师，有往来各岛经商的修士，也有隐居深海的老怪物。\n\n你站在一座名为"天星城"的岛屿上，望着来往的修士，心中盘算着未来的路。\n\n"新来的？"一位中年修士走来，似笑非笑地看着你，"看你的打扮，是天南来的吧？这天星城可不便宜，住一天要一块灵石。"\n\n你心中一凛。看来这乱星海，也不像表面那样平静。\n\n"在下韩立，初来乍到，还请道友多多指教。"你拱手说道。\n\n那中年修士哈哈一笑："指教不敢当，不过有些规矩，还是要告诉你的。"`,
        choices: [
            {
                text: '猎杀妖兽取丹',
                next: 22,
                reward: { cultivation: 8000, item: { id: 'yaodan', qty: 10 } },
                flags: { 'monsterHunter': true }
            },
            {
                text: '经商赚钱',
                next: 22,
                reward: { cultivation: 7000, item: { id: 'lingshi', qty: 50 } },
                flags: { 'merchant': true }
            },
            {
                text: '寻找洞府闭关',
                next: 22,
                reward: { cultivation: 9000 },
                flags: { 'secluded': true }
            },
        ],
        unlockSystem: 'seaTravel',
        nextChapterIds: [22],
    },
    // ========== 第二十二章：虚天残图 ==========
    {
        id: 22,
        title: '虚天残图',
        location: '乱星海外海',
        minRealmIndex: 2,
        minStageIndex: 2,
        summary: '发现大机缘线索',
        trigger: (state) => state.storyProgress === 22 && state.stageIndex >= 2,
        content: `你在外海偶然得到了一张虚天殿的残图。传说中虚天殿内有通天灵宝，引得无数修士垂涎。\n\n虚天殿是乱星海最神秘的古迹，据说里面藏着能让人直接晋升元婴的宝物。但这也是一个巨大的陷阱——数百年来，不知多少金丹修士为了寻找虚天殿而葬身海底。\n\n你手中的残图只有三分之一，上面标记着一些模糊的路线和符号。\n\n"这残图……"你仔细端详，心中忽然一动。这符号，似乎在哪儿见过。\n\n你想起了在黄枫谷时，曾在藏经阁中看过一本古籍，上面记载着类似的符号。那似乎是……某种上古禁制？\n\n此时，一位神秘修士悄然靠近你，低声道："道友，这残图可否出售？我愿出高价。"\n\n你心中一动，此人出价不低，足以买下许多修炼资源。但虚天殿的机缘，又岂是区区灵石能衡量的？`,
        choices: [
            {
                text: '收集残图',
                next: 23,
                reward: { cultivation: 10000, item: { id: 'xuTianTu', qty: 1 } },
                flags: { 'hasXuTianTu': true, 'collectedAll': false }
            },
            {
                text: '出售残图',
                next: 23,
                reward: { cultivation: 9000, item: { id: 'lingshi', qty: 100 } },
                flags: { 'hasXuTianTu': false, 'soldXuTianTu': true }
            },
            {
                text: '放弃残图（远离因果）',
                next: 23,
                reward: { cultivation: 11000 },
                flags: { 'hasXuTianTu': false, 'avoidedKarma': true }
            },
        ],
        unlockSystem: 'treasureHunt',
        nextChapterIds: [23],
    },
    // ========== 第二十三章：星海飞驰 ==========
    {
        id: 23,
        title: '星海飞驰',
        location: '乱星海深处',
        minRealmIndex: 3,
        minStageIndex: 0,
        summary: '争宝、结盟、反杀',
        trigger: (state) => state.storyProgress === 23 && state.realmIndex >= 3,
        content: `你成功突破元婴期，在乱星海深处争夺虚天殿宝物。各路老怪齐聚，生死只在一念之间。\n\n虚天殿终于开启，来自各方的元婴老怪纷纷涌入。有你认识的天南修士，也有乱星海本土的强者，甚至还有来自其他大陆的神秘存在。\n\n"通天灵宝，有德者居之！"一位白发老怪哈哈大笑，眼中却满是贪婪。\n\n你站在虚天殿深处，望着那悬浮在空中的绿色小瓶——正是传说中的通天灵宝：掌天瓶！\n\n然而，就在你准备出手时，数位元婴后期大修士同时动了。他们各施手段，或明抢，或暗算，或结盟，或背叛。\n\n一时间，虚天殿内血雨腥风，惨叫连连。\n\n你心中快速盘算，是趁乱夺取宝物，还是与强者合作，亦或是坐收渔翁之利？`,
        choices: [
            {
                text: '虎口夺宝',
                next: 24,
                reward: { cultivation: 15000, item: { id: 'hujian', qty: 1 } },
                flags: { 'grabbedTreasure': true, 'madeEnemies': true }
            },
            {
                text: '与他人合作',
                next: 24,
                reward: { cultivation: 14000, item: { id: 'yaodan', qty: 10 } },
                relationChange: { '盟友': 30 },
                flags: { 'cooperated': true, 'hasAlly': true }
            },
            {
                text: '坐山观虎斗',
                next: 24,
                reward: { cultivation: 16000 },
                flags: { 'watchedFight': true, 'opportunistic': true }
            },
        ],
        unlockSystem: 'endgame',
        nextChapterIds: [24],
    },
    // ========== 第二十四章：重返天南 ==========
    {
        id: 24,
        title: '重返天南',
        location: '天南',
        minRealmIndex: 3,
        minStageIndex: 2,
        summary: '带着星海积累重返旧地',
        trigger: (state) => state.storyProgress === 24 && state.stageIndex >= 2,
        content: `你在乱星海已无敌手，决定重返天南。昔日的仇敌，在你眼中已如蝼蚁。\n\n百年过去，天越大陆物是人非。黄枫谷早已衰落，燕家堡也已易主，就连曾经名震天下的魔道六宗，如今也只剩下三宗。\n\n你站在当年熟悉的土地上，心中感慨万千。这里是你的起点，也是你曾经逃离的地方。\n\n"韩道友，你可算回来了。"一道熟悉的声音传来。你转头一看，竟是南宫婉。她容颜未改，依旧美艳动人，只是眼中多了几分沧桑。\n\n"南宫姑娘，别来无恙。"你拱手说道。\n\n南宫婉望着你，轻声道："百年了，我一直在等你。如今你已元婴后期，可愿……与我共结连理？"\n\n你心中一动。百年前因身份悬殊而不敢接受的感情，如今是否还有必要逃避？`,
        choices: [
            {
                text: '清算旧账',
                next: 25,
                reward: { cultivation: 20000, item: { id: 'lingshi', qty: 50 } },
                relationChange: { '正道': 20, '魔道': -30 },
                flags: { 'settledScores': true }
            },
            {
                text: '接受南宫婉（道侣线）',
                next: 25,
                reward: { cultivation: 18000 },
                relationChange: { '南宫婉': 100 },
                flags: { 'acceptedNangong': true, 'hasDaoLv': true }
            },
            {
                text: '隐居不出（苟道线）',
                next: 25,
                reward: { cultivation: 22000 },
                relationChange: { '南宫婉': -20 },
                flags: { 'wentIntoSeclusion': true, 'hiddenCultivator': true }
            },
        ],
        unlockSystem: null,
        nextChapterIds: [25],
    },
    // ========== 第二十五章：化神飞升 ==========
    {
        id: 25,
        title: '化神飞升',
        location: '大晋',
        minRealmIndex: 4,
        minStageIndex: 2,
        summary: '最终章、结局分支',
        trigger: (state) => state.storyProgress === 25 && state.realmIndex >= 4 && state.stageIndex >= 2,
        content: `你达到了人界巅峰，站在了飞升的临界点。前方是灵界还是其他世界？你的修仙之路将如何继续？\n\n大晋帝国，人界最强大的帝国。此处灵气浓郁，远超天南。你站在一座高峰之上，望着天边翻滚的云海，心中明悟——飞升的时机已到。\n\n数百年的修仙路，你从一介山村少年，到如今的人界至尊，历经无数生死，见证无数兴衰。如今，终于到了抉择的时刻。\n\n"韩道友，你真的要走吗？"南宫婉站在你身后，眼中满是不舍，"人界虽大，但有你我在，又何须去那未知的灵界？"\n\n你沉默不语。灵界，是无数修士向往的终极之地。但人界，有你的故人、你的回忆、你的……牵挂。\n\n此时，天空忽然裂开一道缝隙，一股强大的吸力从中传来。飞升通道，开启了！`,
        choices: [
            {
                text: '破碎虚空，飞升灵界（正统结局）',
                next: -1,
                reward: { cultivation: 99999 },
                flags: { 'ascendedToSpiritWorld': true },
                ending: { id: 1, title: '灵界仙尊', desc: '你成功飞升灵界，成为一方仙尊，继续你的修仙之路。' }
            },
            {
                text: '留在人界，人间无敌（人间结局）',
                next: -1,
                reward: { cultivation: 50000 },
                relationChange: { '南宫婉': 50 },
                flags: { 'stayedInMortalWorld': true },
                ending: { id: 2, title: '人界至尊', desc: '你选择留在人界，与南宫婉共结连理，成为人界永恒的传说。' }
            },
            {
                text: '转修散仙，逍遥天地（自由结局）',
                next: -1,
                reward: { cultivation: 60000 },
                flags: { 'becameImmortal': true },
                ending: { id: 3, title: '逍遥散仙', desc: '你放弃飞升，转修散仙之道，逍遥于天地之间，无拘无束。' }
            },
        ],
        unlockSystem: 'ending',
        nextChapterIds: [-1],
    },
];

// ===== NPC 定义 =====
const NPCS = {
    '墨大夫': {
        name: '墨大夫',
        title: '七玄门神医',
        avatar: '👨‍⚕️',
        dialogues: [
            '你就是那个新来的弟子？资质还算不错。',
            '修仙之路，最重要的是坚持。',
            '这本《长春功》就赏给你了。',
            '哼，你终究还是发现了我的秘密……',
        ]
    },
    '厉飞雨': {
        name: '厉飞雨',
        title: '七玄门弟子',
        avatar: '🧑',
        dialogues: [
            '多谢道友出手相助。',
            '我这怪病，怕是时日无多了。',
            '修仙界险恶，道友需谨慎。',
            '若我能活下来，定当报答道友恩情。',
        ]
    },
    '墨彩环': {
        name: '墨彩环',
        title: '墨府千金',
        avatar: '👩',
        dialogues: [
            '家父的事，多谢道友费心。',
            '若不是道友，墨府怕是早已遭殃。',
            '修仙之人，果然与众不同。',
            '愿道友前程似锦，大道可期。',
        ]
    },
    '韩立': {
        name: '韩立',
        title: '韩老魔',
        avatar: '🧙',
        dialogues: [
            '道友有礼了。',
            '修仙界险恶，道友需谨慎。',
            '在下只是一介散修，不足挂齿。',
            '机缘难得，道友好自为之。',
        ]
    },
    '南宫婉': {
        name: '南宫婉',
        title: '掩月宗仙子',
        avatar: '🧚‍♀️',
        dialogues: [
            '见过道友。',
            '公子气度不凡，不知来自何方？',
            '修仙之人，当以大道为重。',
            '血色禁地一别，不知公子可安好？',
        ]
    },
    '大长老': {
        name: '大长老',
        title: '黄枫谷长老',
        avatar: '👴',
        dialogues: [
            '小友天赋不错，可愿拜入我黄枫谷？',
            '血色禁地虽险，但机缘也不少。',
            '好好修炼，莫要辱没了宗门名声。',
        ]
    },
    '李化元': {
        name: '李化元',
        title: '黄枫谷长老',
        avatar: '🧓',
        dialogues: [
            '你这小子，倒是有些天赋。',
            '既然拜入我门下，就要好好修炼。',
            '这柄飞剑赠予你，莫要辜负为师的期望。',
        ]
    },
    '万小山': {
        name: '万小山',
        title: '太南山散修',
        avatar: '🧔',
        dialogues: [
            '道友也是来参加交易会的？',
            '这升仙令可是好东西，道友收好。',
            '散修不易，互相照应。',
        ]
    },
    '曲魂': {
        name: '曲魂',
        title: '半傀儡管家',
        avatar: '👤',
        dialogues: [
            '……',
            '主人有何吩咐？',
            '曲魂任凭差遣。',
        ]
    },
};

// ===== NPC 关系系统 =====
const NPC_RELATIONS = {
    '厉飞雨': {
        name: '厉飞雨',
        title: '七玄门好友',
        avatar: '🧑',
        initialRelation: 0,
        dialogues: [
            '多谢道友出手相助。',
            '我这怪病，怕是时日无多了。',
            '修仙界险恶，道友需谨慎。',
            '若我能活下来，定当报答道友恩情。',
            '你我兄弟情深，此生不忘。',
        ],
        relationStates: [
            { threshold: -50, title: '仇敌', dialogueIndex: [4] },
            { threshold: 0, title: '普通', dialogueIndex: [0, 1] },
            { threshold: 50, title: '挚友', dialogueIndex: [2, 3, 4] },
        ]
    },
    '墨大夫': {
        name: '墨大夫',
        title: '七玄门神医',
        avatar: '👨‍⚕️',
        initialRelation: 20,
        dialogues: [
            '你就是那个新来的弟子？资质还算不错。',
            '修仙之路，最重要的是坚持。',
            '这本《长春功》就赏给你了。',
            '哼，你终究还是发现了我的秘密……',
        ],
        relationStates: [
            { threshold: -50, title: '死敌', dialogueIndex: [3] },
            { threshold: 0, title: '师徒', dialogueIndex: [0, 1, 2] },
            { threshold: 50, title: '恩师', dialogueIndex: [1, 2] },
        ]
    },
    '墨彩环': {
        name: '墨彩环',
        title: '墨府千金',
        avatar: '👩',
        initialRelation: 0,
        dialogues: [
            '家父的事，多谢道友费心。',
            '若不是道友，墨府怕是早已遭殃。',
            '修仙之人，果然与众不同。',
            '愿道友前程似锦，大道可期。',
        ],
        relationStates: [
            { threshold: -50, title: '陌生', dialogueIndex: [0] },
            { threshold: 0, title: '友好', dialogueIndex: [0, 1] },
            { threshold: 50, title: '知己', dialogueIndex: [2, 3] },
        ]
    },
    '南宫婉': {
        name: '南宫婉',
        title: '掩月宗仙子',
        avatar: '🧚‍♀️',
        initialRelation: 0,
        dialogues: [
            '见过道友。',
            '公子气度不凡，不知来自何方？',
            '修仙之人，当以大道为重。',
            '血色禁地一别，不知公子可安好？',
            '愿与道友共证大道。',
        ],
        relationStates: [
            { threshold: -50, title: '陌生', dialogueIndex: [0] },
            { threshold: 0, title: '友好', dialogueIndex: [1, 2] },
            { threshold: 50, title: '道侣', dialogueIndex: [3, 4] },
        ]
    },
    '韩立': {
        name: '韩立',
        title: '韩老魔',
        avatar: '🧙',
        initialRelation: 0,
        dialogues: [
            '道友有礼了。',
            '修仙界险恶，道友需谨慎。',
            '在下只是一介散修，不足挂齿。',
            '机缘难得，道友好自为之。',
        ],
        relationStates: [
            { threshold: -50, title: '敌对', dialogueIndex: [1] },
            { threshold: 0, title: '普通', dialogueIndex: [0, 1] },
            { threshold: 50, title: '道友', dialogueIndex: [2, 3] },
        ]
    },
    '李化元': {
        name: '李化元',
        title: '黄枫谷长老',
        avatar: '🧓',
        initialRelation: 10,
        dialogues: [
            '你这小子，倒是有些天赋。',
            '既然拜入我门下，就要好好修炼。',
            '这柄飞剑赠予你，莫要辜负为师的期望。',
        ],
        relationStates: [
            { threshold: -50, title: '弃徒', dialogueIndex: [] },
            { threshold: 0, title: '弟子', dialogueIndex: [0, 1] },
            { threshold: 50, title: '爱徒', dialogueIndex: [2] },
        ]
    },
    '万小山': {
        name: '万小山',
        title: '太南山散修',
        avatar: '🧔',
        initialRelation: 0,
        dialogues: [
            '道友也是来参加交易会的？',
            '这升仙令可是好东西，道友收好。',
            '散修不易，互相照应。',
        ],
        relationStates: [
            { threshold: -50, title: '陌生', dialogueIndex: [] },
            { threshold: 0, title: '散修', dialogueIndex: [0] },
            { threshold: 50, title: '好友', dialogueIndex: [1, 2] },
        ]
    },
    '曲魂': {
        name: '曲魂',
        title: '半傀儡管家',
        avatar: '👤',
        initialRelation: 0,
        dialogues: [
            '……',
            '主人有何吩咐？',
            '曲魂任凭差遣。',
        ],
        relationStates: [
            { threshold: -50, title: '失控', dialogueIndex: [0] },
            { threshold: 0, title: '随从', dialogueIndex: [1] },
            { threshold: 50, title: '忠仆', dialogueIndex: [2] },
        ]
    },
};

// ===== 地点定义 =====
const LOCATIONS = {
    '青牛镇': { name: '青牛镇', description: '边陲小城，你的故乡', npcs: [], systems: [] },
    '七玄门': { name: '七玄门', description: '小修仙宗门，你在此入门', npcs: ['墨大夫', '厉飞雨'], systems: ['cultivation'] },
    '神手谷': { name: '神手谷', description: '墨大夫的隐居地', npcs: ['墨大夫'], systems: ['alchemy'] },
    '药园': { name: '药园', description: '七玄门药草种植地', npcs: [], systems: ['planting'] },
    '嘉元城': { name: '嘉元城', description: '凡人城池，墨大夫老家', npcs: ['墨彩环'], systems: ['merchant'] },
    '太南山': { name: '太南山', description: '散修聚集地', npcs: ['万小山'], systems: ['market'] },
    '黄枫谷': { name: '黄枫谷', description: '天越大陆第一宗门', npcs: ['李化元', '大长老'], systems: ['mission', 'farming'] },
    '血色禁地': { name: '血色禁地', description: '上古修士战场，危机四伏', npcs: ['南宫婉'], systems: ['roguelite'] },
    '燕家堡': { name: '燕家堡', description: '越国修仙家族', npcs: [], systems: ['social'] },
    '乱星海': { name: '乱星海', description: '海外修仙圣地', npcs: ['南宫婉'], systems: ['seaTravel'] },
    '天南': { name: '天南', description: '天越大陆腹地', npcs: [], systems: [] },
    '大晋': { name: '大晋', description: '人界最强大的帝国', npcs: [], systems: [] },
    '人界': { name: '人界', description: '凡人居住的世界', npcs: [], systems: [] },
};

// ===== 境界系统 =====
const REALMS = [
    { name: '炼气', stages: ['初期', '中期', '后期'], baseReq: 100, rateDrop: 0.1 },
    { name: '筑基', stages: ['初期', '中期', '后期'], baseReq: 500, rateDrop: 0.15 },
    { name: '金丹', stages: ['初期', '中期', '后期'], baseReq: 2000, rateDrop: 0.2 },
    { name: '元婴', stages: ['初期', '中期', '后期'], baseReq: 8000, rateDrop: 0.25 },
    { name: '化神', stages: ['初期', '中期', '后期'], baseReq: 30000, rateDrop: 0.3 },
];

// ===== 奇遇事件池 =====
const POSITIVE_ENCOUNTERS = [
    { text: '你偶遇云游仙人指点，修为大增', gain: 50, type: 'good' },
    { text: '你在山涧拾得灵石，吸收后修为提升', gain: 20, type: 'good' },
    { text: '你静坐顿悟，对大道感悟更深', gain: 30, type: 'good' },
    { text: '你发现一处上古洞府，获得传承', gain: 80, type: 'good' },
    { text: '你服用千年灵果，修为暴涨', gain: 60, type: 'good' },
    { text: '你观摩日月运行，道心稳固', gain: 25, type: 'good' },
    { text: '你救助受伤修士，获赠修炼心得', gain: 35, type: 'good' },
];

const NEGATIVE_ENCOUNTERS = [
    { text: '你误食毒草，修为受损', loss: 10, type: 'bad' },
    { text: '你行功岔气，经脉不畅', loss: 20, type: 'bad' },
    { text: '你心神不稳，修为散逸', loss: 15, type: 'bad' },
    { text: '你遭遇心魔侵扰，道心震荡', loss: 25, type: 'bad' },
    { text: '你强行突破小境界，反受其害', loss: 30, type: 'bad' },
];

// ===== 任务链系统 =====
const STORY_ENCOUNTERS = {
    '墨大夫线': [
        { id: 'mo_1', text: '夜探药房', requirement: { progress: 4, location: '神手谷' } },
        { id: 'mo_2', text: '搜集药渣', requirement: { progress: 4, location: '神手谷' } },
        { id: 'mo_3', text: '追问厉飞雨', requirement: { progress: 4, relation: { '厉飞雨': 30 } } },
        { id: 'mo_4', text: '密室对质', requirement: { progress: 4, item: 'evidence' } },
        { id: 'mo_5', text: '遗书抉择', requirement: { progress: 6, bossDefeated: '墨居仁' } },
    ],
    '墨府线': [
        { id: 'mf_1', text: '拜访墨府', requirement: { progress: 8, location: '嘉元城' } },
        { id: 'mf_2', text: '安慰墨彩环', requirement: { progress: 8, relation: { '墨彩环': 30 } } },
        { id: 'mf_3', text: '完成遗愿', requirement: { progress: 8, item: 'moLetter' } },
    ],
    '太南小会线': [
        { id: 'tn_1', text: '前往太南山', requirement: { progress: 10, location: '太南山' } },
        { id: 'tn_2', text: '参加交易会', requirement: { progress: 10 } },
        { id: 'tn_3', text: '获取升仙令', requirement: { progress: 11, item: 'shengxianling' } },
    ],
    '百药园线': [
        { id: 'by_1', text: '管理百药园', requirement: { progress: 12, location: '黄枫谷' } },
        { id: 'by_2', text: '催熟灵药', requirement: { progress: 12, item: 'greenBottle' } },
        { id: 'by_3', text: '收集筑基材料', requirement: { progress: 13, item: 'zhujidan_material' } },
    ],
    '血色禁地线': [
        { id: 'xs_1', text: '进入禁地', requirement: { progress: 14, location: '血色禁地' } },
        { id: 'xs_2', text: '采集灵药', requirement: { progress: 14 } },
        { id: 'xs_3', text: '救援南宫婉', requirement: { progress: 14, relation: { '南宫婉': 50 } } },
    ],
    '燕家堡线': [
        { id: 'yj_1', text: '参加宴会', requirement: { progress: 17, location: '燕家堡' } },
        { id: 'yj_2', text: '暗中调查', requirement: { progress: 17 } },
    ],
    '魔道入侵线': [
        { id: 'md_1', text: '宗门集结', requirement: { progress: 18, location: '黄枫谷' } },
        { id: 'md_2', text: '前线抗敌', requirement: { progress: 18 } },
        { id: 'md_3', text: '守护灵矿', requirement: { progress: 19, location: '灵石矿脉' } },
    ],
    '乱星海线': [
        { id: 'lx_1', text: '抵达乱星海', requirement: { progress: 21, location: '乱星海' } },
        { id: 'lx_2', text: '探索外海', requirement: { progress: 22 } },
        { id: 'lx_3', text: '收集虚天残图', requirement: { progress: 22, item: 'greenBottle' } },
        { id: 'lx_4', text: '进入虚天殿', requirement: { progress: 23, realm: 3 } },
    ],
};

// ===== 游戏状态 =====
let gameState = {
    playerName: '无名散修',
    realmIndex: 0,
    stageIndex: 0,
    cultivation: 0,
    maxCultivation: 0,
    breakthroughRate: 0.8,
    logs: [],
    // 挂机系统
    autoCultivate: false,
    // 背包系统
    inventory: {},
    // 临时突破加成
    breakthroughBonus: 0,
    // 战斗系统
    playerStats: {
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
    },
    // 音效设置
    settings: {
        audioEnabled: true,
        musicEnabled: true,
    },
    // 剧情系统
    storyProgress: 0,
    currentLocation: '青牛镇',
    completedTasks: [],
    npcRelations: {},
    // 任务链系统
    taskChains: {},
    // 剧情标志
    flags: {},
};

// 战斗状态
let combatState = null;

// 挂机定时器
let autoCultivateTimer = null;

// 剧情状态
let currentDialogue = null;

// ===== DOM 元素 =====
const elements = {
    playerName: null,
    realmDisplay: null,
    cultivationDisplay: null,
    breakthroughRate: null,
    mainBtn: null,
    hintText: null,
    logContainer: null,
    floatingContainer: null,
    resetBtn: null,
    exportBtn: null,
    importBtn: null,
    confirmModal: null,
    cancelReset: null,
    confirmReset: null,
    // 挂机系统
    autoSection: null,
    autoToggleBtn: null,
    autoToggleText: null,
    autoStatusText: null,
    // 背包系统
    inventoryBtn: null,
    inventoryPanel: null,
    inventoryList: null,
    // 战斗系统
    adventureBtn: null,
    combatPanel: null,
    combatLog: null,
    playerHpFill: null,
    playerHpText: null,
    monsterHpFill: null,
    monsterHpText: null,
    monsterName: null,
    // 设置系统
    settingsBtn: null,
    settingsModal: null,
    closeSettingsBtn: null,
    audioToggle: null,
    musicToggle: null,
    // 剧情系统
    storyPanel: null,
    storyContent: null,
    storyActions: null,
    dialogueModal: null,
    dialogueAvatar: null,
    dialogueText: null,
    dialogueActions: null,
};

// ===== 初始化 =====
function init() {
    cacheElements();
    loadGame();
    bindEvents();
    render();
    log('欢迎来到《灵光修仙传》，开始你的修仙之路吧！', 'normal');
}

function cacheElements() {
    elements.playerName = document.getElementById('player-name');
    elements.realmDisplay = document.getElementById('realm-display');
    elements.cultivationDisplay = document.getElementById('cultivation-display');
    elements.breakthroughRate = document.getElementById('breakthrough-rate');
    elements.mainBtn = document.getElementById('main-btn');
    elements.hintText = document.getElementById('hint-text');
    elements.logContainer = document.getElementById('log-container');
    elements.floatingContainer = document.getElementById('floating-container');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.exportBtn = document.getElementById('export-btn');
    elements.importBtn = document.getElementById('import-btn');
    elements.confirmModal = document.getElementById('confirm-modal');
    elements.cancelReset = document.getElementById('cancel-reset');
    elements.confirmReset = document.getElementById('confirm-reset');
    // 挂机系统
    elements.autoSection = document.getElementById('auto-section');
    elements.autoToggleBtn = document.getElementById('auto-toggle-btn');
    elements.autoToggleText = document.getElementById('auto-toggle-text');
    elements.autoStatusText = document.getElementById('auto-status-text');
    // 背包系统
    elements.inventoryBtn = document.getElementById('inventory-btn');
    elements.inventoryModal = document.getElementById('inventory-modal');
    elements.inventoryList = document.getElementById('inventory-list');
    elements.closeInventoryBtn = document.getElementById('close-inventory');
    // 战斗系统
    elements.adventureBtn = document.getElementById('adventure-btn');
    elements.combatPanel = document.getElementById('combat-panel');
    elements.combatLog = document.getElementById('combat-log');
    elements.playerHpFill = document.getElementById('player-hp-fill');
    elements.playerHpText = document.getElementById('player-hp-text');
    elements.monsterHpFill = document.getElementById('monster-hp-fill');
    elements.monsterHpText = document.getElementById('monster-hp-text');
    elements.monsterName = document.getElementById('monster-name');
    // 设置系统
    elements.settingsBtn = document.getElementById('settings-btn');
    elements.settingsModal = document.getElementById('settings-modal');
    elements.closeSettingsBtn = document.getElementById('close-settings');
    elements.audioToggle = document.getElementById('audio-toggle');
    elements.musicToggle = document.getElementById('music-toggle');
    // 剧情系统
    elements.storyPanel = document.getElementById('story-panel');
    elements.storyContent = document.getElementById('story-content');
    elements.storyActions = document.getElementById('story-actions');
    elements.dialogueModal = document.getElementById('dialogue-modal');
    elements.dialogueAvatar = document.getElementById('dialogue-avatar');
    elements.dialogueText = document.getElementById('dialogue-text');
    elements.dialogueActions = document.getElementById('dialogue-actions');
}

function bindEvents() {
    elements.mainBtn.addEventListener('click', onMainButtonClick);
    elements.resetBtn.addEventListener('click', showResetModal);
    elements.cancelReset.addEventListener('click', hideResetModal);
    elements.confirmReset.addEventListener('click', resetGame);
    elements.exportBtn.addEventListener('click', exportSave);
    elements.importBtn.addEventListener('click', importSave);
    // 挂机系统
    elements.autoToggleBtn.addEventListener('click', toggleAutoCultivate);
    // 背包系统
    elements.inventoryBtn.addEventListener('click', openInventory);
    elements.closeInventoryBtn.addEventListener('click', closeInventory);
    // 战斗系统
    elements.adventureBtn.addEventListener('click', startAdventure);
    // 设置系统
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettingsBtn.addEventListener('click', closeSettings);
    elements.audioToggle.addEventListener('change', toggleAudio);
    elements.musicToggle.addEventListener('change', toggleMusic);
}

// 初始化完成后检查剧情
function init() {
    cacheElements();
    loadGame();
    bindEvents();
    render();
    log('欢迎来到《灵光修仙传》，开始你的修仙之路吧！', 'normal');
    checkStoryProgress();
}

// ===== 核心逻辑 =====
function onMainButtonClick() {
    const currentRealm = REALMS[gameState.realmIndex];

    // 检查是否可以突破
    if (gameState.cultivation >= gameState.maxCultivation) {
        attemptBreakthrough();
    } else {
        cultivate();
    }
    saveGame();
}

function cultivate(isAuto = false) {
    // 计算修为增益（挂机收益降低）
    const baseGain = Math.floor(Math.random() * (CONFIG.CLICK_GAIN_MAX - CONFIG.CLICK_GAIN_MIN + 1)) + CONFIG.CLICK_GAIN_MIN;
    const gain = isAuto ? Math.max(1, Math.floor(baseGain * CONFIG.AUTO_GAIN_RATIO)) : baseGain;
    gameState.cultivation = Math.min(gameState.cultivation + gain, gameState.maxCultivation);

    // 显示飘字
    if (!isAuto) {
        showFloatingText(`修为 +${gain}`, 'gain');
        playSound('click');
    }

    // 检查奇遇（挂机概率减半）
    const encounterChance = isAuto ? CONFIG.AUTO_ENCOUNTER_CHANCE : CONFIG.ENCOUNTER_CHANCE;
    if (Math.random() < encounterChance) {
        triggerEncounter();
    }

    // 更新提示
    updateHint();
    render();
}

// ===== 音效系统 =====
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!gameState.settings.audioEnabled) return;
    if (!audioContext) initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;

    switch (type) {
        case 'click':
            // 点击修炼：短促高音
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

        case 'gain':
            // 获得修为：上升音阶
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

        case 'breakthrough':
            // 突破成功：和弦音
            playTone(440, now, 0.3);
            playTone(554, now + 0.1, 0.3);
            playTone(659, now + 0.2, 0.4);
            break;

        case 'fail':
            // 突破失败：下降音
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'encounter':
            // 奇遇：特殊音效
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.setValueAtTime(800, now + 0.1);
            oscillator.frequency.setValueAtTime(1000, now + 0.2);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'combat':
            // 战斗：打击音
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

        case 'victory':
            // 胜利：欢快音阶
            playTone(523, now, 0.15);
            playTone(659, now + 0.15, 0.15);
            playTone(784, now + 0.3, 0.2);
            break;
    }
}

function playTone(frequency, startTime, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// ===== 挂机系统 =====
function checkAutoCultivateUnlock() {
    // 筑基期解锁挂机
    const isUnlocked = gameState.realmIndex >= 1;
    if (isUnlocked) {
        elements.autoSection.style.display = 'block';
        elements.autoStatusText.textContent = '自动吐纳已解锁';
    } else {
        elements.autoSection.style.display = 'none';
        elements.autoStatusText.textContent = '筑基期解锁自动修炼';
    }
    return isUnlocked;
}

function toggleAutoCultivate() {
    if (gameState.autoCultivate) {
        // 停止挂机
        stopAutoCultivate();
    } else {
        // 启动挂机
        startAutoCultivate();
    }
    saveGame();
}

function startAutoCultivate() {
    gameState.autoCultivate = true;
    elements.autoToggleText.textContent = '自动吐纳：开';
    elements.autoToggleBtn.classList.add('active');

    // 启动定时器
    autoCultivateTimer = setInterval(() => {
        autoCultivateTick();
    }, CONFIG.AUTO_CULTIVATE_INTERVAL);

    log('已开启自动吐纳，每秒自动获得修为', 'good');
}

function stopAutoCultivate() {
    gameState.autoCultivate = false;
    elements.autoToggleText.textContent = '自动吐纳：关';
    elements.autoToggleBtn.classList.remove('active');

    // 停止定时器
    if (autoCultivateTimer) {
        clearInterval(autoCultivateTimer);
        autoCultivateTimer = null;
    }

    log('已关闭自动吐纳', 'normal');
}

function autoCultivateTick() {
    // 检查是否满修为需要突破
    if (gameState.cultivation >= gameState.maxCultivation) {
        // 挂机模式下不自动突破，等待玩家手动操作
        stopAutoCultivate();
        log('修为已满，自动吐纳停止，请手动突破', 'normal');
        return;
    }

    cultivate(true);
    saveGame();
}

function triggerEncounter() {
    const isPositive = Math.random() > 0.4; // 60% 正面事件
    const pool = isPositive ? POSITIVE_ENCOUNTERS : NEGATIVE_ENCOUNTERS;
    const event = pool[Math.floor(Math.random() * pool.length)];

    if (event.gain) {
        gameState.cultivation = Math.min(gameState.cultivation + event.gain, gameState.maxCultivation);
        showFloatingText(`+${event.gain}`, 'gain');
        log(`【奇遇】${event.text}`, event.type);
        playSound('encounter');
    } else if (event.loss) {
        gameState.cultivation = Math.max(gameState.cultivation - event.loss, 0);
        showFloatingText(`-${event.loss}`, 'loss');
        log(`【奇遇】${event.text}`, event.type);
        playSound('fail');
    }

    // 物品掉落（仅在正面奇遇时）
    if (isPositive && Math.random() < CONFIG.ITEM_DROP_CHANCE) {
        dropItem();
    }

    updateHint();
}

// ===== 背包系统 =====
function dropItem() {
    const dropTable = [
        { id: 'lingcao', chance: 0.5, min: 1, max: 3 },
        { id: 'lingshi', chance: 0.3, min: 1, max: 2 },
        { id: 'yaodan', chance: 0.1, min: 1, max: 1 },
    ];

    const roll = Math.random();
    let cumulative = 0;

    for (const item of dropTable) {
        cumulative += item.chance;
        if (roll <= cumulative) {
            const quantity = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
            addItemToInventory(item.id, quantity);
            log(`【掉落】获得 ${ITEMS[item.id].name} x${quantity}`, 'good');
            break;
        }
    }
}

function addItemToInventory(itemId, quantity) {
    if (!gameState.inventory[itemId]) {
        gameState.inventory[itemId] = 0;
    }
    gameState.inventory[itemId] += quantity;
}

function removeItemFromInventory(itemId, quantity) {
    if (!gameState.inventory[itemId]) return false;
    if (gameState.inventory[itemId] < quantity) return false;

    gameState.inventory[itemId] -= quantity;
    if (gameState.inventory[itemId] <= 0) {
        delete gameState.inventory[itemId];
    }
    return true;
}

function useItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !gameState.inventory[itemId]) return;

    if (item.type === 'pill') {
        // 丹药使用
        if (item.effect.cultivation) {
            gameState.cultivation = Math.min(gameState.cultivation + item.effect.cultivation, gameState.maxCultivation);
            log(`服用${item.name}，修为增加 ${item.effect.cultivation}点`, 'good');
            showFloatingText(`修为 +${item.effect.cultivation}`, 'gain');
        }
        if (item.effect.breakthroughBonus) {
            gameState.breakthroughBonus = item.effect.breakthroughBonus;
            log(`服用${item.name}，下次突破成功率提升 ${Math.round(item.effect.breakthroughBonus * 100)}%`, 'good');
        }
        removeItemFromInventory(itemId, 1);
        render();
        renderInventory();
        saveGame();
    } else {
        // 材料
        log(`${item.name}是材料，无法直接使用`, 'normal');
    }
}

function openInventory() {
    elements.inventoryModal.classList.add('show');
    renderInventory();
}

function closeInventory() {
    elements.inventoryModal.classList.remove('show');
}

function renderInventory() {
    const itemIds = Object.keys(gameState.inventory);

    if (itemIds.length === 0) {
        elements.inventoryList.innerHTML = '<p class="inventory-empty">储物袋空空如也</p>';
        return;
    }

    elements.inventoryList.innerHTML = itemIds.map(id => {
        const item = ITEMS[id];
        const quantity = gameState.inventory[id];
        const isUsable = item.type === 'pill' ? 'true' : 'false';
        return `
            <div class="inventory-item" data-item-id="${id}" data-usable="${isUsable}">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">x${quantity}</span>
                </div>
                <p class="item-desc">${item.description}</p>
                ${item.type === 'pill' ? `<button class="btn-use-item" onclick="useItem('${id}')">使用</button>` : ''}
            </div>
        `;
    }).join('');
}

// ===== 剧情系统 =====
function checkStoryProgress() {
    // 先按正常流程检查
    for (const chapter of STORY_CHAPTERS) {
        if (chapter.trigger(gameState)) {
            showStoryChapter(chapter);
            return;
        }
    }

    // 保底触发：当玩家境界达到但进度落后时，自动跳转到对应章节
    // 避免因跳过某些章节导致剧情链断裂
    const currentRealm = gameState.realmIndex;
    const currentStage = gameState.stageIndex;

    // 查找玩家境界已达到但未触发的章节
    for (const chapter of STORY_CHAPTERS) {
        // 只检查进度落后的章节
        if (chapter.id <= gameState.storyProgress) continue;

        // 检查境界是否达到
        if (chapter.minRealmIndex > currentRealm) continue;
        if (chapter.minStageIndex > currentStage) continue;

        // 找到第一个符合条件的章节，触发它
        log(`【剧情跳过】因境界提升，自动触发：${chapter.title}`, 'normal');
        showStoryChapter(chapter);
        return;
    }

    // 没有新剧情，隐藏剧情面板
    elements.storyPanel.style.display = 'none';
}

function showStoryChapter(chapter) {
    elements.storyPanel.style.display = 'block';
    document.getElementById('story-title').textContent = `第${chapter.id + 1}章：${chapter.title}`;

    // 显示章节简介
    const summaryHtml = chapter.summary ? `<p class="story-summary">${chapter.summary}</p>` : '';
    elements.storyContent.innerHTML = `<p>${chapter.content}</p>${summaryHtml}`;

    // 生成选项按钮
    elements.storyActions.innerHTML = chapter.choices.map((choice, index) =>
        `<button class="story-action-btn" onclick="handleStoryChoice(${chapter.id}, ${index})">${choice.text}</button>`
    ).join('');

    // 更新地点
    if (chapter.location) {
        gameState.currentLocation = chapter.location;
    }
}

function handleStoryChoice(chapterId, choiceIndex) {
    const chapter = STORY_CHAPTERS.find(c => c.id === chapterId);
    if (!chapter || !chapter.choices[choiceIndex]) return;

    const choice = chapter.choices[choiceIndex];

    // 检查前置条件（如果有）
    if (choice.requirement && !checkRequirement(choice.requirement)) {
        log('条件不满足，无法选择此选项', 'bad');
        return;
    }

    // 应用奖励
    applyReward(choice.reward);

    // 应用关系变更
    applyRelationChange(choice.relationChange);

    // 记录关键选择（flags）
    if (choice.flags) {
        for (const [flag, value] of Object.entries(choice.flags)) {
            gameState.flags[flag] = value;
        }
    }

    // 支持 nextChapterIds 数组或单一 next
    let nextChapterId;
    if (choice.nextChapterIds && choice.nextChapterIds.length > 0) {
        nextChapterId = choice.nextChapterIds[0]; // 默认取第一个，预留扩展
    } else if (choice.next !== undefined) {
        nextChapterId = choice.next;
    } else {
        return;
    }

    // 处理结局（nextChapterId 为 -1 时）
    if (nextChapterId === -1) {
        const ending = choice.ending;
        if (ending) {
            showEnding(ending);
        }
        return;
    }

    const nextChapter = STORY_CHAPTERS.find(c => c.id === nextChapterId);

    // 更新剧情进度
    gameState.storyProgress = nextChapterId;
    // 先同步下一章地点，避免”触发条件依赖地点但地点尚未更新”导致剧情卡死
    if (nextChapter && nextChapter.location) {
        gameState.currentLocation = nextChapter.location;
    }

    // 解锁系统
    if (chapter.unlockSystem) {
        unlockSystem(chapter.unlockSystem);
    }

    // 关闭剧情面板
    elements.storyPanel.style.display = 'none';

    log(`剧情推进：${chapter.title} → 第${nextChapterId + 1}章`, 'normal');
    render();
    saveGame();

    // 检查下一个剧情
    setTimeout(() => checkStoryProgress(), 500);
}

function unlockSystem(systemName) {
    const systemNames = {
        'cultivation': '修炼系统',
        'alchemy': '炼丹系统',
        'npcRelation': 'NPC 关系系统',
        'quest': '任务系统',
        'planting': '种植系统',
        'boss': 'Boss 战系统',
        'merchant': '商队系统',
        'companion': '随从系统',
        'market': '交易会系统',
        'farming': '农场系统',
        'preparation': '备战系统',
        'roguelite': 'Roguelite 副本',
        'cultivation2': '筑基修炼',
        'skillTree': '技能树系统',
        'social': '社交系统',
        'war': '宗门战争',
        'survival': '生存模式',
        'seaTravel': '海域游历',
        'treasureHunt': '寻宝系统',
        'endgame': '终局玩法',
        'ending': '结局系统',
    };
    log(`解锁新玩法：${systemNames[systemName] || systemName}`, 'breakthrough');
}

// ===== 结局显示 =====
function showEnding(ending) {
    elements.storyPanel.style.display = 'block';
    document.getElementById('story-title').textContent = `结局 ${ending.id}: ${ending.title}`;
    elements.storyContent.innerHTML = `
        <div class="ending-display">
            <h2 style="color: #gold; font-size: 24px; margin-bottom: 20px;">${ending.title}</h2>
            <p style="font-size: 16px; line-height: 1.8;">${ending.desc}</p>
            <p style="margin-top: 30px; color: #888;">感谢游玩《灵光修仙传》！</p>
        </div>
    `;
    elements.storyActions.innerHTML = `
        <button class="story-action-btn" onclick="resetGameAfterEnding()">重新开始</button>
        <button class="story-action-btn" onclick="exportSave()">导出存档</button>
    `;
    log(`达成结局：${ending.title} - ${ending.desc}`, 'breakthrough');
    playSound('victory');
}

function resetGameAfterEnding() {
    elements.storyPanel.style.display = 'none';
    resetGame();
}

// ===== 任务链系统函数 =====
function checkRequirement(requirement) {
    if (!requirement) return true;

    // 检查最小关系值
    if (requirement.minRelation) {
        for (const [npc, value] of Object.entries(requirement.minRelation)) {
            if ((gameState.npcRelations[npc] || 0) < value) return false;
        }
    }
    // 检查物品
    if (requirement.item && !gameState.inventory[requirement.item]) return false;
    // 检查境界
    if (requirement.realm !== undefined && gameState.realmIndex < requirement.realm) return false;
    // 检查地点
    if (requirement.location && gameState.currentLocation !== requirement.location) return false;
    // 检查 flag 不存在
    if (requirement.notFlag) {
        for (const [flag, value] of Object.entries(requirement.notFlag)) {
            if (gameState.flags[flag] === value) return false;
        }
    }
    return true;
}

function applyReward(reward) {
    if (!reward) return;
    if (reward.cultivation) {
        gameState.cultivation = Math.min(gameState.cultivation + reward.cultivation, gameState.maxCultivation);
        showFloatingText(`修为 +${reward.cultivation}`, 'gain');
    }
    if (reward.item) {
        addItemToInventory(reward.item.id, reward.item.qty);
        log(`获得奖励：${ITEMS[reward.item.id].name} x${reward.item.qty}`, 'good');
    }
}

function applyRelationChange(relationChange) {
    if (!relationChange) return;
    for (const [npcName, change] of Object.entries(relationChange)) {
        if (!gameState.npcRelations[npcName]) {
            gameState.npcRelations[npcName] = 0;
        }
        gameState.npcRelations[npcName] += change;
        log(`${npcName} 关系 ${change > 0 ? '+' : ''}${change}`, change > 0 ? 'good' : 'bad');
    }
}

function checkTaskChainProgress() {
    // 检查当前进度下可触发的任务链
    const availableChains = [];
    for (const [chainName, tasks] of Object.entries(STORY_ENCOUNTERS)) {
        for (const task of tasks) {
            if (canTriggerTask(task) && !gameState.completedTasks.includes(task.id)) {
                availableChains.push({ chainName, task });
            }
        }
    }
    return availableChains;
}

function canTriggerTask(task) {
    const req = task.requirement;
    if (!req) return true;

    // 检查进度
    if (req.progress !== undefined && gameState.storyProgress < req.progress) {
        return false;
    }

    // 检查地点
    if (req.location && gameState.currentLocation !== req.location) {
        return false;
    }

    // 检查关系
    if (req.relation) {
        for (const [npcName, minRelation] of Object.entries(req.relation)) {
            if ((gameState.npcRelations[npcName] || 0) < minRelation) {
                return false;
            }
        }
    }

    // 检查物品
    if (req.item && !gameState.inventory[req.item]) {
        return false;
    }

    // 检查境界
    if (req.realm !== undefined && gameState.realmIndex < req.realm) {
        return false;
    }

    return true;
}

function triggerStoryEncounter(chainName, taskId) {
    const chain = STORY_ENCOUNTERS[chainName];
    const task = chain.find(t => t.id === taskId);
    if (!task) return;

    log(`【任务】${chainName}: ${task.text}`, 'normal');
    gameState.completedTasks.push(taskId);
    saveGame();
}

function showDialogue(npcKey) {
    const npc = NPCS[npcKey];
    if (!npc) return;

    // 获取关系值
    const relation = gameState.npcRelations[npcKey] || 0;

    // 根据关系值选择对话
    let dialogue = npc.dialogues[0];
    if (NPC_RELATIONS[npcKey]) {
        const relationData = NPC_RELATIONS[npcKey];
        const relationState = relationData.relationStates.find(rs => relation >= rs.threshold);
        if (relationState && relationState.dialogueIndex.length > 0) {
            const dialogueIndex = relationState.dialogueIndex[Math.floor(Math.random() * relationState.dialogueIndex.length)];
            dialogue = relationData.dialogues[dialogueIndex] || npc.dialogues[0];
        }
    }

    elements.dialogueAvatar.textContent = npc.avatar;
    elements.dialogueText.textContent = dialogue;
    elements.dialogueActions.innerHTML = `<button class="dialogue-btn" onclick="closeDialogue()">离开</button>`;
    elements.dialogueModal.classList.add('show');
    playSound('encounter');
}

function closeDialogue() {
    elements.dialogueModal.classList.remove('show');
}

// ===== 战斗系统 =====
function startAdventure() {
    // 检查是否已有战斗在进行
    if (combatState) {
        log('正在战斗中，无法出发', 'normal');
        return;
    }

    // 根据境界选择妖兽
    const maxIndex = Math.min(gameState.realmIndex + 1, MONSTERS.length - 1);
    const monsterTemplate = MONSTERS[Math.floor(Math.random() * (maxIndex + 1))];

    // 初始化战斗状态
    combatState = {
        monster: {
            name: monsterTemplate.name,
            hp: monsterTemplate.baseHp + (gameState.realmIndex * 20),
            maxHp: monsterTemplate.baseHp + (gameState.realmIndex * 20),
            attack: monsterTemplate.baseAttack + (gameState.realmIndex * 3),
            defense: monsterTemplate.baseDefense + gameState.realmIndex,
            dropTable: monsterTemplate.dropTable,
        },
        round: 0,
    };

    // 显示战斗面板
    elements.combatPanel.style.display = 'block';
    elements.monsterName.textContent = monsterTemplate.name;
    updateCombatUI();
    log(`遭遇 ${monsterTemplate.name}，准备战斗！`, 'bad');

    // 开始自动战斗
    setTimeout(combatRound, 500);
}

function combatRound() {
    if (!combatState) return;

    combatState.round++;

    // 玩家攻击
    const playerDamage = Math.max(1, gameState.playerStats.attack - combatState.monster.defense);
    combatState.monster.hp -= playerDamage;
    addCombatLog(`第${combatState.round}回合：你攻击${combatState.monster.name}，造成${playerDamage}点伤害`);

    // 更新 UI
    updateCombatUI();

    // 检查妖兽是否死亡
    if (combatState.monster.hp <= 0) {
        endCombat(true);
        return;
    }

    // 妖兽攻击（延迟显示）
    setTimeout(() => {
        if (!combatState) return;

        const monsterDamage = Math.max(0, combatState.monster.attack - gameState.playerStats.defense);
        gameState.playerStats.hp -= monsterDamage;
        addCombatLog(`${combatState.monster.name}反击，造成${monsterDamage}点伤害`);

        // 更新 UI
        updateCombatUI();

        // 检查玩家是否死亡
        if (gameState.playerStats.hp <= 0) {
            endCombat(false);
        } else {
            // 继续下一回合
            setTimeout(combatRound, 1000);
        }
    }, 800);
}

function updateCombatUI() {
    if (!combatState) return;

    const playerHpPercent = (gameState.playerStats.hp / gameState.playerStats.maxHp) * 100;
    const monsterHpPercent = (combatState.monster.hp / combatState.monster.maxHp) * 100;

    elements.playerHpFill.style.width = `${Math.max(0, playerHpPercent)}%`;
    elements.playerHpText.textContent = `${gameState.playerStats.hp}/${gameState.playerStats.maxHp}`;
    elements.monsterHpFill.style.width = `${Math.max(0, monsterHpPercent)}%`;
    elements.monsterHpText.textContent = `${combatState.monster.hp}/${combatState.monster.maxHp}`;
}

function addCombatLog(message) {
    const entry = document.createElement('div');
    entry.className = 'combat-log-entry';
    entry.textContent = message;
    elements.combatLog.insertBefore(entry, elements.combatLog.firstChild);

    // 限制日志数量
    if (elements.combatLog.children.length > 20) {
        elements.combatLog.lastChild.remove();
    }
}

// ===== 设置系统 =====
function openSettings() {
    elements.settingsModal.classList.add('show');
    // 同步设置状态
    elements.audioToggle.checked = gameState.settings.audioEnabled;
    elements.musicToggle.checked = gameState.settings.musicEnabled;
}

function closeSettings() {
    elements.settingsModal.classList.remove('show');
    saveGame();
}

function toggleAudio() {
    gameState.settings.audioEnabled = elements.audioToggle.checked;
    if (gameState.settings.audioEnabled) {
        initAudio();
        log('音效已开启', 'normal');
    } else {
        log('音效已关闭', 'normal');
    }
    saveGame();
}

function toggleMusic() {
    gameState.settings.musicEnabled = elements.musicToggle.checked;
    if (gameState.settings.musicEnabled) {
        log('音乐已开启', 'normal');
    } else {
        log('音乐已关闭', 'normal');
    }
    saveGame();
}

function endCombat(victory) {
    if (victory) {
        log(`🎉 战胜了${combatState.monster.name}！`, 'good');
        playSound('victory');

        // 掉落奖励
        const dropCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < dropCount; i++) {
            const dropTable = combatState.monster.dropTable;
            const itemId = dropTable[Math.floor(Math.random() * dropTable.length)];
            const item = ITEMS[itemId];
            if (item) {
                const quantity = item.stackable ? Math.floor(Math.random() * 2) + 1 : 1;
                addItemToInventory(itemId, quantity);
                log(`【掉落】获得 ${item.name} x${quantity}`, 'good');
            }
        }

        // 修为奖励
        const cultivationReward = combatState.monster.maxHp * 2;
        gameState.cultivation = Math.min(gameState.cultivation + cultivationReward, gameState.maxCultivation);
        log(`战斗胜利，获得 ${cultivationReward} 点修为`, 'good');
        showFloatingText(`修为 +${cultivationReward}`, 'gain');
    } else {
        log(`❌ 不敌${combatState.monster.name}，落荒而逃！损失部分修为`, 'fail');
        playSound('fail');
        gameState.cultivation = Math.floor(gameState.cultivation * 0.8);
    }

    // 重置战斗状态
    combatState = null;
    elements.combatPanel.style.display = 'none';
    elements.combatLog.innerHTML = '';

    // 恢复玩家血量（部分）
    gameState.playerStats.hp = Math.floor(gameState.playerStats.maxHp * 0.5);

    render();
    saveGame();
}

function resetPlayerStats() {
    // 根据境界重置玩家属性
    const baseHp = 100 + (gameState.realmIndex * 50);
    const baseAttack = 10 + (gameState.realmIndex * 5);
    const baseDefense = 5 + (gameState.realmIndex * 2);

    gameState.playerStats = {
        hp: baseHp,
        maxHp: baseHp,
        attack: baseAttack,
        defense: baseDefense,
    };
}

function attemptBreakthrough() {
    // 计算实际突破成功率（基础 + 丹药加成）
    const actualRate = Math.min(0.95, gameState.breakthroughRate + gameState.breakthroughBonus);
    const success = Math.random() < actualRate;
    const currentRealm = REALMS[gameState.realmIndex];

    if (success) {
        // 突破成功
        gameState.stageIndex++;

        // 检查是否进入大境界
        if (gameState.stageIndex >= currentRealm.stages.length) {
            gameState.stageIndex = 0;
            gameState.realmIndex++;

            if (gameState.realmIndex >= REALMS.length) {
                log('🎉 恭喜你已修炼至化神后期，达到此界巅峰！', 'breakthrough');
                gameState.realmIndex = REALMS.length - 1;
                gameState.stageIndex = REALMS.length - 1;
            } else {
                log(`🎉 突破成功！晋升至${REALMS[gameState.realmIndex].name}！`, 'breakthrough');
            }
        } else {
            log(`🎉 突破成功！进入${currentRealm.name}${currentRealm.stages[gameState.stageIndex]}！`, 'breakthrough');
        }

        // 重置修为并计算新上限
        gameState.cultivation = 0;
        gameState.breakthroughBonus = 0; // 清除突破加成
        resetPlayerStats(); // 更新战斗属性
        calculateNextRequirement();
        showFloatingText('突破成功！', 'breakthrough');
        playSound('breakthrough');
        // 检查剧情推进
        setTimeout(() => checkStoryProgress(), 300);

    } else {
        // 突破失败
        const penalty = Math.floor(gameState.maxCultivation * CONFIG.FAIL_PENALTY_RATE);
        gameState.cultivation = Math.max(0, gameState.cultivation - penalty);
        gameState.breakthroughBonus = 0; // 清除突破加成
        log(`❌ 突破失败！修为受损，损失${penalty}点修为`, 'fail');
        showFloatingText(`突破失败 -${penalty}`, 'loss');
        playSound('fail');
    }

    render();
    saveGame();
}

function calculateNextRequirement() {
    if (gameState.realmIndex >= REALMS.length) {
        gameState.maxCultivation = 999999;
        gameState.breakthroughRate = 0;
        return;
    }

    const realm = REALMS[gameState.realmIndex];
    const stageMultiplier = 1 + (gameState.stageIndex * 0.5);
    gameState.maxCultivation = Math.floor(realm.baseReq * stageMultiplier);
    gameState.breakthroughRate = Math.max(0.1, CONFIG.BASE_BREAKTHROUGH_RATE - (gameState.realmIndex * realm.rateDrop));
}

// ===== 日志系统 =====
function log(message, type = 'normal') {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    gameState.logs.unshift({ message, type, timestamp });

    // 限制日志数量
    if (gameState.logs.length > 100) {
        gameState.logs = gameState.logs.slice(0, 100);
    }

    renderLogs();
}

function renderLogs() {
    elements.logContainer.innerHTML = gameState.logs.map(entry =>
        `<div class="log-entry ${entry.type}">${entry.message}</div>`
    ).join('');
}

// ===== 飘字效果 =====
function showFloatingText(text, type = 'gain') {
    const span = document.createElement('span');
    span.className = `floating-text ${type}`;
    span.textContent = text;
    span.style.left = `${50 + (Math.random() - 0.5) * 40}%`;
    elements.floatingContainer.appendChild(span);

    // 动画结束后移除
    setTimeout(() => {
        span.remove();
    }, 1500);
}

// ===== 存档系统 =====
function saveGame() {
    localStorage.setItem('xiuxian_save', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('xiuxian_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // 旧存档兼容性：限制 storyProgress 最大值
            if (parsed.storyProgress !== undefined) {
                parsed.storyProgress = Math.min(parsed.storyProgress, 25);
            }
            // 合并存档数据
            gameState = { ...gameState, ...parsed };
            // 初始化缺失的字段
            if (!gameState.taskChains) gameState.taskChains = {};
            if (!gameState.flags) gameState.flags = {};
            if (!gameState.npcRelations) gameState.npcRelations = {};

            calculateNextRequirement();
            resetPlayerStats();
            // 恢复挂机状态
            if (gameState.autoCultivate && checkAutoCultivateUnlock()) {
                startAutoCultivate();
            } else {
                checkAutoCultivateUnlock();
            }
        } catch (e) {
            console.error('存档加载失败', e);
        }
    } else {
        checkAutoCultivateUnlock();
        resetPlayerStats();
    }
    updateHint();
    // 检查剧情
    setTimeout(() => checkStoryProgress(), 100);
}

function resetGame() {
    // 停止挂机
    if (autoCultivateTimer) {
        clearInterval(autoCultivateTimer);
        autoCultivateTimer = null;
    }
    // 清除战斗状态
    combatState = null;
    elements.combatPanel.style.display = 'none';

    // 保留设置
    const savedSettings = { ...gameState.settings };

    gameState = {
        playerName: '无名散修',
        realmIndex: 0,
        stageIndex: 0,
        cultivation: 0,
        maxCultivation: 0,
        breakthroughRate: 0.8,
        logs: [],
        autoCultivate: false,
        inventory: {},
        breakthroughBonus: 0,
        playerStats: {
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 5,
        },
        settings: savedSettings,
        storyProgress: 0,
        currentLocation: '青牛镇',
        completedTasks: [],
        npcRelations: {},
        taskChains: {},
        flags: {},
    };
    hideResetModal();
    saveGame();
    render();
    checkAutoCultivateUnlock();
    resetPlayerStats();
    log('已重置修为，重新开始修仙之路。', 'normal');
    checkStoryProgress();
}

function showResetModal() {
    elements.confirmModal.classList.add('show');
}

function hideResetModal() {
    elements.confirmModal.classList.remove('show');
}

function exportSave() {
    const saveData = localStorage.getItem('xiuxian_save');
    if (saveData) {
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `修仙存档_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        log('存档已导出', 'normal');
    }
}

function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.cultivation !== undefined && data.realmIndex !== undefined) {
                    gameState = { ...gameState, ...data };
                    calculateNextRequirement();
                    saveGame();
                    render();
                    log('存档已导入', 'good');
                } else {
                    alert('无效的存档文件');
                }
            } catch (err) {
                alert('读取存档失败：' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== 渲染 =====
function render() {
    const currentRealm = REALMS[gameState.realmIndex] || REALMS[REALMS.length - 1];

    elements.playerName.textContent = gameState.playerName;
    elements.realmDisplay.textContent = `${currentRealm.name}·${currentRealm.stages[gameState.stageIndex] || '后期'}`;
    elements.cultivationDisplay.textContent = `${gameState.cultivation} / ${gameState.maxCultivation}`;

    // 计算实际突破率（基础 + 丹药加成）
    const actualRate = Math.min(0.95, gameState.breakthroughRate + gameState.breakthroughBonus);
    let rateText = `${Math.round(actualRate * 100)}%`;
    if (gameState.breakthroughBonus > 0) {
        rateText += ` (+${Math.round(gameState.breakthroughBonus * 100)}%)`;
    }
    elements.breakthroughRate.textContent = rateText;

    // 检查挂机解锁状态
    checkAutoCultivateUnlock();

    // 更新按钮状态
    if (gameState.cultivation >= gameState.maxCultivation) {
        elements.mainBtn.textContent = '渡劫突破';
        elements.mainBtn.classList.add('breakthrough');
        elements.hintText.textContent = '修为已至瓶颈，点击突破！';
    } else {
        elements.mainBtn.textContent = '吐纳聚气';
        elements.mainBtn.classList.remove('breakthrough');
        updateHint();
    }

    renderLogs();
}

function updateHint() {
    const remaining = gameState.maxCultivation - gameState.cultivation;
    if (remaining <= 0) {
        elements.hintText.textContent = '修为已至瓶颈，点击突破！';
    } else {
        elements.hintText.textContent = `点击修炼，还需${remaining}点修为可突破`;
    }
}

// ===== 启动游戏 =====
document.addEventListener('DOMContentLoaded', init);
