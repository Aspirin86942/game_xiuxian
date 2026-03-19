(function (globalScope) {
    function beat(speaker, text) {
        return { speaker, text };
    }

    const STORAGE_KEY = 'xiuxian_save_v2';

    const CONFIG = {
        encounterChance: 0.15,
        autoEncounterChance: 0.08,
        baseBreakthroughRate: 0.8,
        clickGainMin: 1,
        clickGainMax: 5,
        autoGainRatio: 0.6,
        failPenaltyRate: 0.3,
        autoCultivateInterval: 1000,
        itemDropChance: 0.2,
    };

    const REALMS = [
        { name: '炼气', stages: ['初期', '中期', '后期'], baseReq: 100, rateDrop: 0.08 },
        { name: '筑基', stages: ['初期', '中期', '后期'], baseReq: 520, rateDrop: 0.12 },
        { name: '金丹', stages: ['初期', '中期', '后期'], baseReq: 2100, rateDrop: 0.17 },
        { name: '元婴', stages: ['初期', '中期', '后期'], baseReq: 8600, rateDrop: 0.22 },
        { name: '化神', stages: ['初期', '中期', '后期'], baseReq: 32000, rateDrop: 0.27 },
    ];

    const ITEMS = {
        lingcao: { name: '灵草', type: 'material', description: '药园常见灵植，可炼丹或换取人情。', usable: false },
        lingshi: { name: '灵石', type: 'material', description: '修仙界硬通货，买消息、走关系都要用。', usable: false },
        yaodan: { name: '妖丹', type: 'material', description: '妖兽精华，常用作高阶丹药辅材。', usable: false },
        greenBottle: { name: '神秘绿瓶', type: 'treasure', description: '可催熟灵药的奇物，越少张扬越安全。', usable: false },
        moLetter: { name: '墨大夫遗书', type: 'quest', description: '墨居仁死前留下的残信，藏着墨府旧因果。', usable: false },
        evidence: { name: '药渣证据', type: 'quest', description: '能证明神手谷暗地里炼制禁药。', usable: false },
        shengxianling: { name: '升仙令', type: 'quest', description: '进入黄枫谷的关键凭证。', usable: false },
        zhujidanMaterial: { name: '筑基丹主药', type: 'material', description: '血色禁地里才有的大药。', usable: false },
        xuTianTu: { name: '虚天残图', type: 'quest', description: '通往虚天殿的线索之一。', usable: false },
        juqidan: { name: '聚气丹', type: 'pill', description: '服下后立得修为。', usable: true, effect: { cultivation: 220 } },
        zhujidan: { name: '筑基丹', type: 'pill', description: '下次突破额外提升 15% 成功率。', usable: true, effect: { breakthroughBonus: 0.15 } },
        jiedusan: { name: '解毒散', type: 'pill', description: '调理经脉与余毒。', usable: true, effect: { healRatio: 0.35 } },
        feijian: { name: '飞剑', type: 'weapon', description: '提升游历战斗中的攻击力。', usable: false },
        hujian: { name: '护身法器', type: 'armor', description: '提升游历战斗中的防御力。', usable: false },
        quhun: { name: '曲魂', type: 'companion', description: '半傀儡护卫，可在险境里护你一线。', usable: false },
    };

    const MONSTERS = [
        { name: '风狼', baseHp: 56, baseAttack: 8, baseDefense: 2, dropTable: ['lingcao', 'lingshi'] },
        { name: '赤练蛇', baseHp: 82, baseAttack: 12, baseDefense: 3, dropTable: ['lingcao', 'lingshi', 'yaodan'] },
        { name: '山魈', baseHp: 128, baseAttack: 16, baseDefense: 5, dropTable: ['lingshi', 'yaodan', 'feijian'] },
        { name: '黑熊精', baseHp: 190, baseAttack: 21, baseDefense: 8, dropTable: ['yaodan', 'hujian'] },
        { name: '海眼异蛟', baseHp: 286, baseAttack: 28, baseDefense: 11, dropTable: ['yaodan', 'hujian', 'xuTianTu'] },
    ];

    const LOCATIONS = {
        '青牛镇': { name: '青牛镇', description: '你的旧家还在烟火里，很多选择都从这里开始。', npcs: [] },
        '七玄门': { name: '七玄门', description: '越国小宗门，门规不严，却是你真正踏入仙路的起点。', npcs: ['墨大夫', '厉飞雨'] },
        '神手谷': { name: '神手谷', description: '药香与血气交杂，表面平静，暗处却藏刀。', npcs: ['墨大夫'] },
        '嘉元城': { name: '嘉元城', description: '凡俗城池，墨府旧案与人情都在这里发芽。', npcs: ['墨彩环', '曲魂'] },
        '太南山': { name: '太南山', description: '散修汇聚的小会，消息、法器、祸患都能买到。', npcs: ['万小山'] },
        '黄枫谷': { name: '黄枫谷', description: '大宗门规矩森严，适合低调积累，也适合埋下名声。', npcs: ['李化元'] },
        '血色禁地': { name: '血色禁地', description: '一脚踩下去是机缘，另一脚踩下去就是尸骨。', npcs: ['南宫婉'] },
        '燕家堡': { name: '燕家堡', description: '宴席之上人人带笑，桌案之下处处是算计。', npcs: [] },
        '越国边境': { name: '越国边境', description: '正魔双方的攻守被拉成一条又长又冷的线。', npcs: [] },
        '灵石矿脉': { name: '灵石矿脉', description: '矿灯摇晃，弃子与死士往往只差一道军令。', npcs: [] },
        '乱星海': { name: '乱星海', description: '海上势力交错，弱肉强食比天南更赤裸。', npcs: ['南宫婉'] },
        '乱星海外海': { name: '乱星海外海', description: '残图、海妖与散修的命都一起漂在浪上。', npcs: [] },
        '乱星海深处': { name: '乱星海深处', description: '所有人都在赶路，追同一件可能杀死所有人的宝物。', npcs: [] },
        '天南': { name: '天南', description: '旧账、人情与道心都在等你回头。', npcs: ['南宫婉'] },
        '大晋': { name: '大晋', description: '人界最后一段路，谁都想在这里定出自己的答案。', npcs: [] },
    };

    const NPCS = {
        '墨大夫': {
            name: '墨大夫',
            title: '神手谷主人',
            avatar: '墨',
            dialogueByStage(state) {
                const relation = state.npcRelations['墨大夫'] || 0;
                if (relation <= -20) return '你既已看清我，就该明白修仙界从不是讲仁义的地方。';
                if (state.flags.startPath === 'disciple') return '好生炼药，别让旁人看出你手上这点灵性。';
                return '好奇心太重的人，往往活不长。';
            },
        },
        '厉飞雨': {
            name: '厉飞雨',
            title: '七玄门内门弟子',
            avatar: '厉',
            dialogueByStage(state) {
                const relation = state.npcRelations['厉飞雨'] || 0;
                if (relation >= 50) return '贤弟，你若开口，厉某这条命都可以借你一半。';
                if (relation <= -10) return '各走各路吧，我不欠你，你也不欠我。';
                return '门里风声越来越紧，道友最近最好别单独乱走。';
            },
        },
        '墨彩环': {
            name: '墨彩环',
            title: '墨府小姐',
            avatar: '彩',
            dialogueByStage(state) {
                const relation = state.npcRelations['墨彩环'] || 0;
                if (state.flags.daoLvPromise) return '你当日那句承诺，我一直记着，只是不知你还记不记得。';
                if (relation >= 60) return '道友每回来一次，墨府便像多了一盏灯。';
                return '父亲的旧事，我想问，却又怕听见答案。';
            },
        },
        '南宫婉': {
            name: '南宫婉',
            title: '掩月宗仙子',
            avatar: '婉',
            dialogueByStage(state) {
                const relation = state.npcRelations['南宫婉'] || 0;
                if (state.routeScores.demonic > state.routeScores.orthodox) return '你眼里那股狠意，比当年禁地里的血色还重。';
                if (relation >= 80) return '大道再远，只要你还回头，我便还在。';
                return '你总把话说得很轻，可你的选择从来不轻。';
            },
        },
        '李化元': {
            name: '李化元',
            title: '黄枫谷长老',
            avatar: '李',
            dialogueByStage(state) {
                const relation = state.npcRelations['李化元'] || 0;
                if (relation >= 50) return '你这人不爱说话，但心里有数，为师放心。';
                if (relation <= -20) return '你若只想借宗门遮风，迟早也会被风刮走。';
                return '门内不缺天才，缺的是知道什么时候该忍的人。';
            },
        },
        '万小山': {
            name: '万小山',
            title: '太南山散修',
            avatar: '万',
            dialogueByStage(state) {
                if (state.flags.hasSecretInfo) return '我卖你的消息可不便宜，你最好真能用得上。';
                return '散修最值钱的不是法器，是一条比别人早半步的消息。';
            },
        },
        '曲魂': {
            name: '曲魂',
            title: '半傀儡护卫',
            avatar: '曲',
            dialogueByStage(state) {
                if (state.flags.quhunReleased) return '残魂归去后，只剩一缕旧愿还在墨府门前。';
                if (state.flags.hasQuhun) return '主人前路多险，曲魂可替主人挡一次刀。';
                return '……';
            },
        },
    };

    const POSITIVE_ENCOUNTERS = [
        { text: '你在山径尽头悟出一丝气机，修为随之松动。', cultivation: 28 },
        { text: '你拾得几块碎灵石，勉强够添一口灵气。', items: { lingshi: 3 } },
        { text: '你救下受伤散修，对方留下了一瓶聚气丹。', items: { juqidan: 1 } },
        { text: '你偶遇无主药圃，顺手采下几株灵草。', items: { lingcao: 2 } },
    ];

    const NEGATIVE_ENCOUNTERS = [
        { text: '你行功岔气，灵力散了一截。', cultivation: -18 },
        { text: '你误入旧阵，灵石被阵纹吞去了几枚。', items: { lingshi: -4 } },
        { text: '你被妖气擦过经脉，心神一时难定。', cultivation: -24 },
    ];

    const STORY_CHAPTERS = [
        {
            id: 0,
            title: '山村少年',
            summary: '青牛镇的柴刀、月光与残卷，给了你走出凡尘的第一步。',
            location: '青牛镇',
            requirements: { storyProgress: 0 },
            beats() {
                return [
                    beat('旁白', '越国边角的青牛镇，夜里只听得见风吹茅檐。'),
                    beat('旁白', '你在山道上捡到一名垂死老道，对方把一册残缺《引气诀》塞进你怀里。'),
                    beat('老道', '资质未必是路，肯熬，才可能见路。'),
                    beat('旁白', '几个月后，你体内终于生出一缕暖流，也听说七玄门正在收徒。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'set_out_now',
                        text: '带着残卷立刻上路',
                        effects: { cultivation: 40, routeScores: { orthodox: 1 }, flags: { preparedWell: false } },
                        nextChapterId: 1,
                    },
                    {
                        id: 'pack_and_leave',
                        text: '先收拾行囊，再给祖母留些柴米',
                        effects: { cultivation: 30, items: { lingcao: 2 }, routeScores: { secluded: 1 }, flags: { preparedWell: true } },
                        nextChapterId: 1,
                    },
                ];
            },
        },
        {
            id: 1,
            title: '七玄门考核',
            summary: '灵根并不出众，但你还有心性、耐性和一口不肯认输的气。',
            location: '七玄门',
            requirements: { storyProgress: 1 },
            beats(state) {
                return [
                    beat('旁白', '七玄门山门不算宏阔，却已是青牛镇少年们想都不敢想的地方。'),
                    beat('张长老', '灵根驳杂，资质寻常，若入门，只能从杂役做起。'),
                    beat('旁白', state.flags.preparedWell ? '你把路上备好的干粮分给同来少年，倒让几名执事多看了你一眼。' : '你没有多余的话，只在众人退缩时安静地把手按在测灵石上。'),
                    beat('旁白', '最终你被留下，去了药园做杂役。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'keep_low_profile',
                        text: '低调做事，先把门里规矩摸清',
                        effects: { cultivation: 70, flags: { lowProfile: true } },
                        nextChapterId: 2,
                    },
                    {
                        id: 'show_drive',
                        text: '主动揽活，让人先记住你的名字',
                        effects: { cultivation: 85, flags: { lowProfile: false }, routeScores: { orthodox: 1 } },
                        nextChapterId: 2,
                    },
                ];
            },
        },
        {
            id: 2,
            title: '墨大夫收徒',
            summary: '药园里的平静只是假象，你第一次真正面对“选择师门”这件事。',
            location: '神手谷',
            requirements: { storyProgress: 2, cultivationAtLeast: 60 },
            beats() {
                return [
                    beat('旁白', '药园一株百年灵参被你照料得精神异常，也把墨大夫的目光引了过来。'),
                    beat('墨大夫', '你手稳，心也稳，来我神手谷做亲传，比留在药园强得多。'),
                    beat('旁白', '他递来一本《长春功》，纸页泛黄，封皮上全是旧指印。'),
                    beat('旁白', '你知道这是机会，也可能是陷阱。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'become_disciple',
                        text: '拜入墨大夫门下，先借势修行',
                        effects: {
                            cultivation: 120,
                            items: { juqidan: 1 },
                            relations: { '墨大夫': 20 },
                            routeScores: { orthodox: 1 },
                            flags: { startPath: 'disciple' },
                        },
                        nextChapterId: 3,
                    },
                    {
                        id: 'investigate_mo',
                        text: '表面答应，暗地里查神手谷底细',
                        effects: {
                            cultivation: 90,
                            relations: { '墨大夫': -5 },
                            routeScores: { secluded: 1 },
                            flags: { startPath: 'investigator' },
                        },
                        nextChapterId: 3,
                    },
                    {
                        id: 'stay_independent',
                        text: '婉拒收徒，继续做散碎杂役',
                        effects: {
                            cultivation: 80,
                            routeScores: { secluded: 2 },
                            flags: { startPath: 'solo' },
                        },
                        nextChapterId: 3,
                    },
                ];
            },
        },
        {
            id: 3,
            title: '厉飞雨之疾',
            summary: '你第一次能决定别人的命运，也第一次知道人情会变成债。',
            location: '七玄门',
            requirements: { storyProgress: 3, realmScoreAtLeast: 1 },
            beats(state) {
                return [
                    beat('旁白', '厉飞雨病势反复，门里却没人真愿意替他担这份麻烦。'),
                    beat('厉飞雨', '我若不是急着求成，也不会把自己熬成这副样子。'),
                    beat('旁白', state.flags.startPath === 'disciple' ? '你手里正好有墨大夫给的药方，心里也清楚这药方未必干净。' : '你没有现成法子，只能在药房、执事与传闻之间来回打听。'),
                    beat('旁白', '救，还是不救，会把你和他绑在一起。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'save_li',
                        text: '替厉飞雨奔走求药',
                        effects: {
                            cultivation: 110,
                            relations: { '厉飞雨': 50, '墨大夫': 5 },
                            routeScores: { orthodox: 1 },
                            flags: { helpedLi: true },
                        },
                        nextChapterId: 4,
                    },
                    {
                        id: 'warn_li',
                        text: '只提醒他小心，不替他深陷其中',
                        effects: {
                            cultivation: 95,
                            relations: { '厉飞雨': -10 },
                            routeScores: { secluded: 1 },
                            flags: { helpedLi: false },
                        },
                        nextChapterId: 4,
                    },
                ];
            },
        },
        {
            id: 4,
            title: '消失的药童',
            summary: '神手谷真正的腥气终于溢了出来。',
            location: '神手谷',
            requirements: { storyProgress: 4, realmScoreAtLeast: 1 },
            beats(state) {
                return [
                    beat('旁白', '先后失踪的药童越来越多，神手谷夜里的门也越来越紧。'),
                    beat('旁白', state.flags.helpedLi ? '厉飞雨偷偷塞给你一张名单，名字后面全是空白。' : '你从残药和脚印里拼出一条不完整的线索。'),
                    beat('旁白', '密室里泛着绿光，丹炉边缘却沾着不该属于药材的血色。'),
                    beat('旁白', '你已经知道，再装作没看见，只会把自己也送进去。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'collect_evidence',
                        text: '先拿证据，再找时机摊牌',
                        effects: { cultivation: 70, items: { evidence: 1 }, flags: { hasEvidence: true } },
                        nextChapterId: 5,
                    },
                    {
                        id: 'confront_early',
                        text: '直接当面试探墨大夫',
                        effects: { cultivation: 45, relations: { '墨大夫': -20 }, flags: { hasEvidence: false, rashConfrontation: true } },
                        nextChapterId: 5,
                    },
                ];
            },
        },
        {
            id: 5,
            title: '绿瓶异象',
            summary: '你手里多了一件足够改变命运，也足够招来杀身之祸的东西。',
            location: '神手谷',
            requirements: { storyProgress: 5 },
            beats() {
                return [
                    beat('旁白', '后山藤蔓之下，你捡到一只古旧绿瓶。'),
                    beat('旁白', '它看着不起眼，盛过一夜月华的水却能让灵草骤然成熟。'),
                    beat('旁白', '你试了三次，结果一次比一次吓人。'),
                    beat('旁白', '从此以后，你得决定这份机缘是藏，还是换。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'keep_bottle',
                        text: '私藏绿瓶，从此更低调',
                        effects: {
                            cultivation: 120,
                            items: { greenBottle: 1 },
                            routeScores: { secluded: 2 },
                            flags: { hasGreenBottle: true },
                        },
                        nextChapterId: 6,
                    },
                    {
                        id: 'trade_bottle_secret',
                        text: '不交瓶，但只拿它暗中换取资源',
                        effects: {
                            cultivation: 140,
                            items: { lingcao: 2 },
                            routeScores: { orthodox: 1 },
                            flags: { hasGreenBottle: true, usesBottleForTrade: true },
                        },
                        nextChapterId: 6,
                    },
                ];
            },
        },
        {
            id: 6,
            title: '墨居仁摊牌',
            summary: '师徒、猎物、鼎炉，这几个身份只能活下来一个。',
            location: '神手谷',
            requirements: { storyProgress: 6, realmScoreAtLeast: 2 },
            beats(state) {
                return [
                    beat('旁白', '墨大夫在密室中等你，像是早就知道你会来。'),
                    beat('墨大夫', state.flags.startPath === 'disciple' ? '为师教你修炼，不是为了看你反咬一口。' : '我早说过，好奇心太重的人活不长。'),
                    beat('旁白', state.flags.hasEvidence ? '你把药渣甩在丹炉前，血气与药香一同翻涌。' : '你虽没有完整证据，却已经看明白自己就是下一个药童。'),
                    beat('旁白', '这场对峙不可能再靠言语结束。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'strike_first',
                        text: '抢先动手，以狠制狠',
                        effects: {
                            cultivation: 220,
                            items: { moLetter: 1, jiedusan: 1 },
                            routeScores: { demonic: 1 },
                            flags: { moShowdownStyle: 'aggressive', defeatedMo: true },
                        },
                        nextChapterId: 7,
                    },
                    {
                        id: 'bait_and_counter',
                        text: '稳住心神，等他露出破绽再反击',
                        effects: {
                            cultivation: 210,
                            items: { moLetter: 1, jiedusan: 1 },
                            routeScores: { orthodox: 1 },
                            flags: { moShowdownStyle: 'calm', defeatedMo: true },
                        },
                        nextChapterId: 7,
                    },
                    {
                        id: 'escape_and_return',
                        text: '先退，借绿瓶与药力反杀',
                        effects: {
                            cultivation: 180,
                            items: { moLetter: 1 },
                            routeScores: { secluded: 1 },
                            flags: { moShowdownStyle: 'flee', defeatedMo: true },
                        },
                        nextChapterId: 7,
                    },
                ];
            },
        },
        {
            id: 7,
            title: '遗书与解毒',
            summary: '杀局已解，因果却还在你手里翻页。',
            location: '神手谷',
            requirements: { storyProgress: 7 },
            beats(state) {
                return [
                    beat('旁白', '墨居仁死后，密室安静得只剩丹火爆裂的细响。'),
                    beat('旁白', state.flags.moShowdownStyle === 'aggressive' ? '你手上的血还没干，心里却反而比先前更冷。' : '你把解药和残卷一一收起，开始清点这场生死局真正留下了什么。'),
                    beat('旁白', '遗书里写着墨府、写着旧债，也写着一个求你善后的名字。'),
                    beat('旁白', '此后你要活成什么样，已经不只由修为决定。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'keep_letter',
                        text: '带走遗书和解药，认下这段因果',
                        effects: {
                            cultivation: 120,
                            flags: { hasMoLetter: true, burnedLetter: false, mournMo: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 8,
                    },
                    {
                        id: 'burn_letter',
                        text: '烧掉遗书，只留对自己有用的东西',
                        effects: {
                            cultivation: 90,
                            flags: { hasMoLetter: false, burnedLetter: true, mournMo: false },
                            routeScores: { demonic: 1 },
                        },
                        nextChapterId: 8,
                    },
                    {
                        id: 'bury_mo',
                        text: '先埋了尸骨，再决定如何处理墨府',
                        effects: {
                            cultivation: 105,
                            flags: { hasMoLetter: true, buriedMo: true, mournMo: true },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: 8,
                    },
                ];
            },
        },
        {
            id: 8,
            title: '墨府旧事',
            summary: '凡俗宅门里的哭声，不比修仙界的刀光更轻。',
            location: '嘉元城',
            requirements: { storyProgress: 8 },
            beats(state) {
                return [
                    beat('旁白', '嘉元城还是老样子，只有墨府门口的白灯笼格外刺眼。'),
                    beat('墨彩环', state.flags.hasMoLetter ? '父亲最后可曾提过我们？' : '家父死了，城里却还有许多人盯着墨府。'),
                    beat('旁白', state.flags.burnedLetter ? '你没有把全部真相说出来，只把最能保她活下去的部分留给她。' : '你把遗书掐头去尾地念给她听，既保了墨府，也保了自己。'),
                    beat('旁白', '墨彩环看你的眼神，从防备慢慢变成了倚赖。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'protect_mo_house',
                        text: '留下来帮墨府稳住局面',
                        effects: {
                            cultivation: 120,
                            relations: { '墨彩环': 60 },
                            routeScores: { orthodox: 1 },
                            flags: { fulfilledMoWill: true },
                        },
                        nextChapterId: 9,
                    },
                    {
                        id: 'take_treasure_leave',
                        text: '只拿能用上的金银法器，尽快离城',
                        effects: {
                            cultivation: 140,
                            items: { lingshi: 8 },
                            relations: { '墨彩环': -20 },
                            routeScores: { demonic: 1 },
                            flags: { tookTreasure: true },
                        },
                        nextChapterId: 9,
                    },
                    {
                        id: 'promise_caihuan',
                        text: '安顿墨府后，对墨彩环留下一句承诺',
                        effects: {
                            cultivation: 130,
                            relations: { '墨彩环': 80 },
                            routeScores: { secluded: 1 },
                            flags: { daoLvPromise: true, fulfilledMoWill: true },
                        },
                        nextChapterId: 9,
                    },
                ];
            },
        },
        {
            id: 9,
            title: '曲魂初现',
            summary: '墨府的暗格里不止藏金银，还藏着一个勉强算“活着”的人。',
            location: '嘉元城',
            requirements: { storyProgress: 9, relationsMin: { '墨彩环': 20 } },
            beats(state) {
                return [
                    beat('旁白', '墨府地窖深处，你见到了半人半傀的曲魂。'),
                    beat('墨彩环', state.flags.daoLvPromise ? '若你愿带他走，墨府便少一件旧日噩梦。' : '我怕他，也怕旁人拿他来做文章。'),
                    beat('旁白', '曲魂眼里只剩残存意志，却还认得“守门”两个字。'),
                    beat('旁白', '你可以把他当兵器，也可以把他当一个还没完全碎掉的人。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'take_quhun',
                        text: '收下曲魂，让他做护卫',
                        effects: {
                            cultivation: 140,
                            items: { quhun: 1 },
                            flags: { hasQuhun: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 10,
                    },
                    {
                        id: 'repair_quhun',
                        text: '花心思修补禁制，让他少些痛苦',
                        effects: {
                            cultivation: 150,
                            items: { quhun: 1 },
                            relations: { '墨彩环': 30 },
                            flags: { hasQuhun: true, curedQuhun: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 10,
                    },
                    {
                        id: 'release_quhun',
                        text: '替他超度，留下一段未完的善缘',
                        effects: {
                            cultivation: 160,
                            relations: { '墨彩环': 20 },
                            flags: { quhunReleased: true, hasQuhun: false },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: 10,
                    },
                ];
            },
        },
        {
            id: 10,
            title: '太南小会',
            summary: '散修市集里最贵的不是法器，是别人比你早知道半步。',
            location: '太南山',
            requirements: { storyProgress: 10, realmScoreAtLeast: 3 },
            beats(state) {
                return [
                    beat('旁白', '筑基之后，你第一次走进真正的散修小会。'),
                    beat('万小山', '升仙令马上换手，想拿就趁现在，想省就只能换消息。'),
                    beat('旁白', state.flags.fulfilledMoWill ? '你身上还挂着墨府的人情，这让你在摊位间走得比别人更稳。' : '你知道自己没有背景，所以每一步都更像在赌。'),
                    beat('旁白', '消息、灵石、名声，总得拿一个出去换。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'bid_token',
                        text: '直接竞拍升仙令',
                        costs: { lingshi: 8 },
                        effects: {
                            cultivation: 120,
                            items: { shengxianling: 1 },
                            flags: { hasShengxianling: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 11,
                    },
                    {
                        id: 'buy_rumor',
                        text: '花灵石买消息，再走暗线换令',
                        costs: { lingshi: 5 },
                        effects: {
                            cultivation: 110,
                            flags: { hasSecretInfo: true },
                            items: { lingshi: 2 },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: 11,
                    },
                    {
                        id: 'watch_market',
                        text: '按兵不动，先记住各家路数',
                        effects: {
                            cultivation: 90,
                            routeScores: { demonic: 1 },
                            flags: { cautiousMarket: true },
                        },
                        nextChapterId: 11,
                    },
                ];
            },
        },
        {
            id: 11,
            title: '升仙令',
            summary: '令牌拿在手里，宗门却未必只有一个答案。',
            location: '太南山',
            requirements: { storyProgress: 11 },
            beats(state) {
                return [
                    beat('旁白', state.flags.hasShengxianling ? '令牌入手后，你终于有资格考虑更大的宗门。' : '你虽然没直接拿到令牌，却摸清了几条能换来入门资格的暗路。'),
                    beat('旁白', '黄枫谷稳，别宗刺激，留在散修圈则最自由。'),
                    beat('旁白', '这一次不是“能不能进仙门”，而是“要把自己交给谁”。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'join_yellow_maple',
                        text: '前往黄枫谷，先借大宗门立足',
                        effects: {
                            cultivation: 140,
                            items: { shengxianling: 1 },
                            flags: { joinedYellowMaple: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 12,
                    },
                    {
                        id: 'shop_other_sects',
                        text: '四处试探，再从旁门入局',
                        effects: {
                            cultivation: 130,
                            flags: { joinedYellowMaple: true, enteredByDetour: true },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: 12,
                    },
                    {
                        id: 'sell_token',
                        text: '把令牌卖了，换一笔可观本钱',
                        effects: {
                            cultivation: 120,
                            items: { lingshi: 18 },
                            flags: { soldShengxianling: true, joinedYellowMaple: true },
                            routeScores: { demonic: 1 },
                        },
                        nextChapterId: 12,
                    },
                ];
            },
        },
        {
            id: 12,
            title: '百药园杂役',
            summary: '黄枫谷最不起眼的角落，恰好适合你慢慢积累。',
            location: '黄枫谷',
            requirements: { storyProgress: 12 },
            beats(state) {
                return [
                    beat('旁白', '进了黄枫谷，你仍从最不起眼的药园做起。'),
                    beat('旁白', state.flags.hasGreenBottle ? '绿瓶让你可以一夜之间把灵草养老十年，但也让你时时都怕有人多看一眼。' : '你没有绿瓶可仗，只能靠耐性和门内规矩慢慢攒家底。'),
                    beat('李化元', '药园也是修行，能把小事做稳的人，才配碰大事。'),
                    beat('旁白', '你知道自己在谷里还没资格出头，但已经有资格布线。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'farm_quietly',
                        text: '低调种药，不让任何人察觉异常',
                        effects: {
                            cultivation: 200,
                            items: { lingcao: 4 },
                            routeScores: { secluded: 1 },
                            flags: { lowProfileFarming: true },
                        },
                        nextChapterId: 13,
                    },
                    {
                        id: 'push_growth',
                        text: '加速催熟灵药，先攒筑基资源',
                        effects: {
                            cultivation: 220,
                            items: { lingcao: 6, lingshi: 4 },
                            routeScores: { demonic: 1 },
                            flags: { lowProfileFarming: false, riskExposed: true },
                        },
                        nextChapterId: 13,
                    },
                    {
                        id: 'build_connections',
                        text: '一边种药，一边结交执役与同门',
                        effects: {
                            cultivation: 180,
                            relations: { '李化元': 10 },
                            routeScores: { orthodox: 1 },
                            flags: { madeGardenConnections: true },
                        },
                        nextChapterId: 13,
                    },
                ];
            },
        },
        {
            id: 13,
            title: '血色禁地前夜',
            summary: '所有人都知道禁地危险，但所有人也都知道不进去就追不上别人。',
            location: '黄枫谷',
            requirements: { storyProgress: 13, realmScoreAtLeast: 4 },
            beats(state) {
                return [
                    beat('旁白', '血色禁地开放的消息一出，谷里像被火点着一样躁动。'),
                    beat('旁白', state.flags.lowProfileFarming ? '你藏得够深，所以没有人把你当作最先被盯上的目标。' : '你最近在药园名声渐起，这让很多人都开始试图和你结队。'),
                    beat('李化元', '进去之前先想好，机缘是抢来的，命却得自己保。'),
                    beat('旁白', '你该以什么姿态进禁地，会决定之后整段修仙路的味道。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'go_solo',
                        text: '独自进禁地，把底牌握在自己手里',
                        effects: {
                            cultivation: 230,
                            routeScores: { secluded: 1 },
                            flags: { soloIntoForbidden: true },
                        },
                        nextChapterId: 14,
                    },
                    {
                        id: 'go_team',
                        text: '结队进入，先保证活着出来',
                        effects: {
                            cultivation: 220,
                            relations: { '李化元': 10 },
                            routeScores: { orthodox: 1 },
                            flags: { soloIntoForbidden: false },
                        },
                        nextChapterId: 14,
                    },
                    {
                        id: 'prepare_heavy',
                        text: '提前布药阵和退路，宁可慢也不莽',
                        effects: {
                            cultivation: 210,
                            items: { jiedusan: 1 },
                            routeScores: { secluded: 1 },
                            flags: { preparedForbiddenLand: true },
                        },
                        nextChapterId: 14,
                    },
                ];
            },
        },
        {
            id: 14,
            title: '血色禁地',
            summary: '这一步之后，你的“路数”会真正被定型。',
            location: '血色禁地',
            requirements: { storyProgress: 14 },
            beats(state) {
                return [
                    beat('旁白', '禁地里尸骨压着灵草，活人踩着活人。'),
                    beat('旁白', '你在谷底听见斗法声，也看见了重伤的南宫婉。'),
                    beat('南宫婉', '若你现在离开，我未必会记恨你。'),
                    beat('旁白', state.flags.soloIntoForbidden ? '独行让你更快赶到这处谷底，也让你更像一个只对自己负责的人。' : '与你同行的人都在等你做决定，你知道自己不能只替自己选。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'save_nangong',
                        text: '冒险出手，救下南宫婉',
                        effects: {
                            cultivation: 280,
                            items: { zhujidanMaterial: 2 },
                            relations: { '南宫婉': 80 },
                            routeScores: { orthodox: 2 },
                            flags: { savedNangong: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'watch_and_wait',
                        text: '先观局势，捡最稳的一段因果',
                        effects: {
                            cultivation: 250,
                            items: { zhujidanMaterial: 2 },
                            relations: { '南宫婉': -20 },
                            routeScores: { secluded: 1 },
                            flags: { savedNangong: false, watchedBattle: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'loot_in_chaos',
                        text: '趁乱收药夺宝，把活路握在自己手里',
                        effects: {
                            cultivation: 270,
                            items: { zhujidanMaterial: 3, yaodan: 2 },
                            routeScores: { secluded: 1, demonic: 1 },
                            flags: { savedNangong: false, treasureHunter: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'kill_for_gain',
                        text: '顺势杀人夺宝，彻底转向狠路',
                        effects: {
                            cultivation: 320,
                            items: { zhujidanMaterial: 3, yaodan: 3 },
                            relations: { '南宫婉': -100 },
                            routeScores: { demonic: 3 },
                            flags: { savedNangong: false, demonicPathSeed: true },
                        },
                        nextChapterId: 15,
                    },
                ];
            },
        },
        {
            id: 15,
            title: '情债与筑基',
            summary: '筑基丹、南宫婉、道心和人情，一下子全挤到了你面前。',
            location: '黄枫谷',
            requirements: { storyProgress: 15, realmScoreAtLeast: 5 },
            beats(state) {
                const savedLine = state.flags.savedNangong
                    ? '南宫婉亲自送来了一枚玉简与一炉筑基资源。'
                    : '你虽然带回了材料，却也带回了南宫婉看向你的那一瞬冷意。';
                return [
                    beat('旁白', '禁地归来之后，黄枫谷所有人都在忙着消化各自得到的东西。'),
                    beat('旁白', savedLine),
                    beat('旁白', '你知道自己离筑基大成只差临门一脚，也知道这一步会把你的路数钉得更牢。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'accept_nangong',
                        text: '收下南宫婉的人情，记住这份缘',
                        effects: {
                            cultivation: 320,
                            items: { zhujidan: 1 },
                            relations: { '南宫婉': 50 },
                            routeScores: { orthodox: 1 },
                            flags: { acceptedNangongHelp: true },
                        },
                        nextChapterId: 16,
                    },
                    {
                        id: 'focus_breakthrough',
                        text: '只拿材料，情分先压下',
                        effects: {
                            cultivation: 300,
                            items: { zhujidan: 1 },
                            routeScores: { secluded: 1 },
                            flags: { focusedBreakthrough: true },
                        },
                        nextChapterId: 16,
                    },
                    {
                        id: 'cut_emotion',
                        text: '彻底压住情债，只认资源不认人',
                        effects: {
                            cultivation: 310,
                            items: { zhujidan: 1 },
                            relations: { '南宫婉': -30 },
                            routeScores: { demonic: 1 },
                            flags: { cutEmotion: true },
                        },
                        nextChapterId: 16,
                    },
                ];
            },
        },
        {
            id: 16,
            title: '李化元门下',
            summary: '黄枫谷不只给你资源，也开始给你身份。',
            location: '黄枫谷',
            requirements: { storyProgress: 16, realmScoreAtLeast: 5 },
            beats(state) {
                return [
                    beat('李化元', '你在禁地里活着回来，还带着东西回来，说明你不只是运气好。'),
                    beat('旁白', state.npcRelations['南宫婉'] >= 50 ? '外头已经有人把你和掩月宗那位仙子放在一处议论。' : '门内门外都在重新估算你的分量。'),
                    beat('旁白', '拜师意味着庇护，也意味着牵绊。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'become_li_disciple',
                        text: '拜入李化元门下，先把根基坐稳',
                        effects: {
                            cultivation: 360,
                            relations: { '李化元': 50 },
                            items: { feijian: 1 },
                            routeScores: { orthodox: 1 },
                            flags: { liDisciple: true },
                        },
                        nextChapterId: 17,
                    },
                    {
                        id: 'keep_free',
                        text: '不彻底拜师，保留更多退路',
                        effects: {
                            cultivation: 330,
                            relations: { '李化元': -10 },
                            routeScores: { secluded: 1 },
                            flags: { liDisciple: false, freeCultivator: true },
                        },
                        nextChapterId: 17,
                    },
                    {
                        id: 'learn_in_secret',
                        text: '表面拜师，暗里只取法门不交底',
                        effects: {
                            cultivation: 340,
                            relations: { '李化元': 15 },
                            routeScores: { demonic: 1 },
                            flags: { liDisciple: true, learnsSecretively: true },
                        },
                        nextChapterId: 17,
                    },
                ];
            },
        },
        {
            id: 17,
            title: '燕家堡风云',
            summary: '一场宴席，把你推到更大的势力棋盘边上。',
            location: '燕家堡',
            requirements: { storyProgress: 17, realmScoreAtLeast: 6 },
            beats(state) {
                return [
                    beat('旁白', '燕家堡宴会奢华，席间笑语却比刀锋更薄。'),
                    beat('旁白', state.flags.liDisciple ? '你背后有李化元的名头，很多人说话都先看你的袖口。' : '你没有师门名号可借，只能靠先前攒下的口碑与冷静。'),
                    beat('旁白', '你知道这场宴会不是为了吃酒，而是为了看谁更值得拉拢。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'stay_quiet_banquet',
                        text: '少说多看，把各家底色记下来',
                        effects: {
                            cultivation: 380,
                            routeScores: { secluded: 1 },
                            flags: { lowProfileBanquet: true },
                        },
                        nextChapterId: 18,
                    },
                    {
                        id: 'show_strength_banquet',
                        text: '当场出手，先震住一批人',
                        effects: {
                            cultivation: 400,
                            routeScores: { orthodox: 1 },
                            flags: { showedStrength: true },
                        },
                        nextChapterId: 18,
                    },
                    {
                        id: 'trade_favors_banquet',
                        text: '趁宴结交势力，先把人脉铺出去',
                        effects: {
                            cultivation: 360,
                            items: { lingshi: 12 },
                            routeScores: { demonic: 1 },
                            flags: { builtBanquetNetwork: true },
                        },
                        nextChapterId: 18,
                    },
                ];
            },
        },
        {
            id: 18,
            title: '魔道争锋',
            summary: '从这一章开始，正道、魔道、苟道不再只是嘴上说说。',
            location: '越国边境',
            requirements: { storyProgress: 18, realmScoreAtLeast: 6 },
            beats(state) {
                const dominant = state.routeScores.demonic > state.routeScores.orthodox
                    ? '你已经习惯先算收益，再想代价。'
                    : state.routeScores.secluded > state.routeScores.orthodox
                        ? '你更关心退路，而不是旗号。'
                        : '你还愿意相信宗门和盟友至少值得托一次底。';
                return [
                    beat('旁白', '正魔大战逼近，黄枫谷与边境诸宗全部被推上前线。'),
                    beat('旁白', dominant),
                    beat('旁白', '站在哪一边、以什么方式站，这次不会只影响名声。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'fight_for_sect',
                        text: '随宗门迎敌，先守住越国这条线',
                        effects: {
                            cultivation: 520,
                            routeScores: { orthodox: 2 },
                            flags: { warChoice: 'orthodox' },
                        },
                        nextChapterId: 19,
                    },
                    {
                        id: 'fake_fight',
                        text: '表面参战，暗里只保自己和近身人',
                        effects: {
                            cultivation: 500,
                            routeScores: { secluded: 2 },
                            flags: { warChoice: 'secluded' },
                        },
                        nextChapterId: 19,
                    },
                    {
                        id: 'defect_demonic',
                        text: '借乱投向魔道，以更狠的路换更快的位子',
                        effects: {
                            cultivation: 560,
                            routeScores: { demonic: 3 },
                            flags: { warChoice: 'demonic', demonicPath: true },
                        },
                        nextChapterId: 19,
                    },
                ];
            },
        },
        {
            id: 19,
            title: '灵矿死局',
            summary: '被扔进矿脉的人，大多不是精锐，而是被允许牺牲的人。',
            location: '灵石矿脉',
            requirements: { storyProgress: 19 },
            beats(state) {
                return [
                    beat('旁白', '灵石矿脉的援军迟迟不到，你很快明白自己这一队被当成了弃子。'),
                    beat('旁白', state.flags.warChoice === 'demonic' ? '魔道那边已经递过一次话，只要你开门，很多事都能省。' : '同门中有人要死守，有人想突围，也有人已经开始偷看撤路。'),
                    beat('旁白', '你要守住的，可能是义，也可能只是你还不想彻底变成另一个人。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'hold_the_line',
                        text: '死守矿脉，替同门撑出一线退路',
                        effects: {
                            cultivation: 620,
                            items: { lingshi: 16 },
                            routeScores: { orthodox: 2 },
                            flags: { mineChoice: 'hold' },
                        },
                        nextChapterId: 20,
                    },
                    {
                        id: 'lead_breakout',
                        text: '带队突围，能救几个算几个',
                        effects: {
                            cultivation: 610,
                            routeScores: { secluded: 1, orthodox: 1 },
                            flags: { mineChoice: 'breakout' },
                        },
                        nextChapterId: 20,
                    },
                    {
                        id: 'escape_alone',
                        text: '抛下大局先活命，别人的命各安天数',
                        effects: {
                            cultivation: 640,
                            routeScores: { secluded: 1, demonic: 1 },
                            flags: { mineChoice: 'soloEscape' },
                        },
                        nextChapterId: 20,
                    },
                ];
            },
        },
        {
            id: 20,
            title: '再别天南',
            summary: '离开并不意味着切断一切，只是把旧因果压到更远的地方。',
            location: '乱星海',
            requirements: { storyProgress: 20, realmScoreAtLeast: 7 },
            beats(state) {
                const warEcho = state.flags.mineChoice === 'hold'
                    ? '你带着一身旧伤和一些活下来的同门名字。'
                    : state.flags.mineChoice === 'soloEscape'
                        ? '你背后没人跟着，耳边却总像还能听见矿脉里的喊声。'
                        : '你把能带走的人都尽量带上了，代价是再也回不到从前那种轻松。';
                return [
                    beat('旁白', '天南局势越发烂，你终于决定借传送阵离开这一片旧战场。'),
                    beat('旁白', warEcho),
                    beat('旁白', '乱星海在前，过去却还黏在靴底。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'go_star_sea',
                        text: '直入乱星海，把命运重新洗一遍',
                        effects: {
                            cultivation: 700,
                            routeScores: { secluded: 1 },
                            flags: { enteredStarSea: true },
                        },
                        nextChapterId: 21,
                    },
                    {
                        id: 'go_for_profit',
                        text: '先找商路和消息线，把新地盘摸清',
                        effects: {
                            cultivation: 680,
                            items: { lingshi: 20 },
                            routeScores: { demonic: 1 },
                            flags: { enteredStarSea: true, enteredByTrade: true },
                        },
                        nextChapterId: 21,
                    },
                    {
                        id: 'go_hide',
                        text: '先闭关避祸，等局势替你筛掉一些人',
                        effects: {
                            cultivation: 660,
                            routeScores: { secluded: 2 },
                            flags: { enteredStarSea: true, starSeaSeclusion: true },
                        },
                        nextChapterId: 21,
                    },
                ];
            },
        },
        {
            id: 21,
            title: '初入星海',
            summary: '这里比天南更自由，也更赤裸。',
            location: '乱星海',
            requirements: { storyProgress: 21 },
            beats(state) {
                return [
                    beat('旁白', '乱星海群岛错落，散修、海盗、宗门与商会全混在一起。'),
                    beat('旁白', state.flags.enteredByTrade ? '你很快意识到这里的钱路比道义更稳。' : '你先感受到的是陌生和危险，然后才是机缘。'),
                    beat('旁白', '同一片海面上，有人猎妖，有人经商，有人闭关不问世事。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'hunt_monsters',
                        text: '猎杀海妖，以战养战',
                        effects: {
                            cultivation: 820,
                            items: { yaodan: 4 },
                            routeScores: { orthodox: 1 },
                            flags: { starSeaStyle: 'hunter' },
                        },
                        nextChapterId: 22,
                    },
                    {
                        id: 'run_trade',
                        text: '跑船做买卖，把资源堆起来',
                        effects: {
                            cultivation: 760,
                            items: { lingshi: 26 },
                            routeScores: { demonic: 1 },
                            flags: { starSeaStyle: 'merchant' },
                        },
                        nextChapterId: 22,
                    },
                    {
                        id: 'seek_cave',
                        text: '先找洞府闭关，把自己藏好',
                        effects: {
                            cultivation: 790,
                            routeScores: { secluded: 1 },
                            flags: { starSeaStyle: 'secluded' },
                        },
                        nextChapterId: 22,
                    },
                ];
            },
        },
        {
            id: 22,
            title: '虚天残图',
            summary: '所有人都知道残图危险，但几乎没有人愿意放手。',
            location: '乱星海外海',
            requirements: { storyProgress: 22, realmScoreAtLeast: 8 },
            beats(state) {
                return [
                    beat('旁白', '残图的传闻像潮水一样席卷外海。'),
                    beat('旁白', state.flags.starSeaStyle === 'merchant' ? '你从商路里先拿到了消息，也因此更明白残图值多少钱。' : '你从猎妖与探岛过程中，逐渐摸到了残图出现的轨迹。'),
                    beat('旁白', '你手里已经有选择，问题只在于你愿不愿把自己扔进更大的因果里。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'collect_map',
                        text: '亲自收集残图，赌一次更大的机缘',
                        effects: {
                            cultivation: 1000,
                            items: { xuTianTu: 1 },
                            routeScores: { orthodox: 1 },
                            flags: { hasXuTianTu: true },
                        },
                        nextChapterId: 23,
                    },
                    {
                        id: 'sell_map',
                        text: '残图到手就卖，拿稳看得见的收益',
                        effects: {
                            cultivation: 920,
                            items: { lingshi: 40 },
                            routeScores: { demonic: 1 },
                            flags: { soldXuTianTu: true, hasXuTianTu: false },
                        },
                        nextChapterId: 23,
                    },
                    {
                        id: 'avoid_map',
                        text: '故意避开残图争夺，远离大因果',
                        effects: {
                            cultivation: 960,
                            routeScores: { secluded: 2 },
                            flags: { avoidedXuTian: true },
                        },
                        nextChapterId: 23,
                    },
                ];
            },
        },
        {
            id: 23,
            title: '星海飞驰',
            summary: '虚天殿之前，真正的考验不是战力，而是你会不会在关键时刻改口。',
            location: '乱星海深处',
            requirements: { storyProgress: 23, realmScoreAtLeast: 9 },
            beats(state) {
                const xuLine = state.flags.hasXuTianTu
                    ? '残图在你怀里发烫，所有盯着你的人都像是来拿命换图。'
                    : state.flags.soldXuTianTu
                        ? '虽然你早已出手残图，但虚天殿的风波还是把你卷了进去。'
                        : '你原想避开虚天殿，可海上大势还是把你推到了门前。';
                return [
                    beat('旁白', '海雾深处，虚天殿将启未启。'),
                    beat('旁白', xuLine),
                    beat('旁白', '合作、抢先、坐等别人两败俱伤，每一种都有人成功过，也都有人死过。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'grab_treasure',
                        text: '虎口夺宝，先下手为强',
                        effects: {
                            cultivation: 1300,
                            items: { hujian: 1 },
                            routeScores: { demonic: 2 },
                            flags: { grabbedTreasure: true },
                        },
                        nextChapterId: 24,
                    },
                    {
                        id: 'cooperate_allies',
                        text: '与人联手，先把最危险那一波熬过去',
                        effects: {
                            cultivation: 1260,
                            relations: { '南宫婉': 20 },
                            routeScores: { orthodox: 1 },
                            flags: { cooperatedAtXuTian: true },
                        },
                        nextChapterId: 24,
                    },
                    {
                        id: 'watch_last',
                        text: '坐山观虎斗，等最狠的人先死',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true },
                        },
                        nextChapterId: 24,
                    },
                ];
            },
        },
        {
            id: 24,
            title: '重返天南',
            summary: '旧人、旧账、旧情，在你回身的一刻全部涌上来。',
            location: '天南',
            requirements: { storyProgress: 24, realmScoreAtLeast: 10 },
            beats(state) {
                const routeLine = state.routeScores.demonic >= state.routeScores.orthodox && state.routeScores.demonic >= state.routeScores.secluded
                    ? '你如今的名声已经带着几分令人避让的血色。'
                    : state.routeScores.secluded >= state.routeScores.orthodox
                        ? '你像一阵不肯让人抓住的风，许多人只听过你的事，却很少真正见过你。'
                        : '不少旧人仍把你看作能站出来的人。';
                return [
                    beat('旁白', '兜转一圈后，你还是回到了天南。'),
                    beat('旁白', routeLine),
                    beat('旁白', state.npcRelations['南宫婉'] >= 60 ? '南宫婉没有问你为何回来，只问你这次会停多久。' : '天南留下的人很多，但真能与你再并肩的不多。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'settle_old_scores',
                        text: '清算旧账，把一路压着的刀都抽出来',
                        effects: {
                            cultivation: 1800,
                            routeScores: { orthodox: 1, demonic: 1 },
                            flags: { settledScores: true },
                        },
                        nextChapterId: 25,
                    },
                    {
                        id: 'accept_nangong_path',
                        text: '接住南宫婉这段缘，把路走得不那么冷',
                        effects: {
                            cultivation: 1700,
                            relations: { '南宫婉': 50 },
                            routeScores: { orthodox: 1 },
                            flags: { acceptedNangongPath: true },
                        },
                        nextChapterId: 25,
                    },
                    {
                        id: 'hide_again',
                        text: '收起旧账旧情，继续做那个最难被捉住的人',
                        effects: {
                            cultivation: 1750,
                            routeScores: { secluded: 2 },
                            flags: { returnedToSeclusion: true },
                        },
                        nextChapterId: 25,
                    },
                ];
            },
        },
        {
            id: 25,
            title: '化神飞升',
            summary: '真正的结局，不是你能不能更强，而是你最终承认自己是谁。',
            location: '大晋',
            requirements: { storyProgress: 25, realmScoreAtLeast: 12 },
            beats(state) {
                const routeLine = state.routeScores.demonic >= state.routeScores.orthodox && state.routeScores.demonic >= state.routeScores.secluded
                    ? '一路走来，你最熟练的已经不是忍，而是取舍之后的狠。'
                    : state.routeScores.secluded >= state.routeScores.orthodox
                        ? '你始终在退半步、藏半分，也正因如此活到了现在。'
                        : '你仍愿意替某些人某些事留下位置，这也是你最后还能抬头看天的原因。';
                return [
                    beat('旁白', '化神之后，天地间仿佛只剩最后一层纸。'),
                    beat('旁白', routeLine),
                    beat('旁白', '破界飞升、留在人间、逍遥散去，你终于能自己写最后一笔。'),
                ];
            },
            choices(state) {
                const orthodoxLead = state.routeScores.orthodox >= state.routeScores.demonic && state.routeScores.orthodox >= state.routeScores.secluded;
                const secludedLead = state.routeScores.secluded > state.routeScores.orthodox && state.routeScores.secluded >= state.routeScores.demonic;
                return [
                    {
                        id: 'ending_ascend',
                        text: orthodoxLead ? '顺着这口正气破界飞升' : '斩断人界因果，飞升灵界',
                        effects: {
                            cultivation: 5000,
                            routeScores: { orthodox: 1 },
                            flags: { ascendedToSpiritWorld: true },
                        },
                        ending: {
                            id: 'ascend',
                            title: '灵界仙尊',
                            description: '你带着一路淬出的道心破开界壁而去。人界留下的是传说，灵界迎来的是一个懂得忍、懂得狠、也懂得何时停手的修士。',
                        },
                        nextChapterId: -1,
                    },
                    {
                        id: 'ending_rule_mortal',
                        text: state.routeScores.demonic > state.routeScores.orthodox ? '留在人界，做最没人敢违逆的那一个' : '留在人界，把山河与旧人都护在手里',
                        effects: {
                            cultivation: 3500,
                            routeScores: { demonic: 1 },
                            flags: { stayedInMortalWorld: true },
                        },
                        ending: {
                            id: 'mortal',
                            title: '人界至尊',
                            description: '你没有离开，而是把自己化作人界最高的一座山。有人敬你，有人惧你，但所有人都承认那片天地最后归你发话。',
                        },
                        nextChapterId: -1,
                    },
                    {
                        id: 'ending_wander',
                        text: secludedLead ? '散去名号，只带一壶酒一身风' : '转修散仙，不再给任何势力留下把柄',
                        effects: {
                            cultivation: 3600,
                            routeScores: { secluded: 1 },
                            flags: { becameLooseImmortal: true },
                        },
                        ending: {
                            id: 'wander',
                            title: '逍遥散仙',
                            description: '你放下了“必须更强”的最后一层执念。山海、旧友、风雨与月色都成了路，而你终于只对自己负责。',
                        },
                        nextChapterId: -1,
                    },
                ];
            },
        },
    ];

    const StoryData = {
        STORAGE_KEY,
        CONFIG,
        REALMS,
        ITEMS,
        MONSTERS,
        LOCATIONS,
        NPCS,
        POSITIVE_ENCOUNTERS,
        NEGATIVE_ENCOUNTERS,
        STORY_CHAPTERS,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StoryData;
    }

    globalScope.StoryData = StoryData;
})(typeof window !== 'undefined' ? window : globalThis);
