(function (globalScope) {
    function beat(speaker, text) {
        return { speaker, text };
    }

    // 第一卷卷末需要把支线结果翻译成主线可见解释，避免旧 8~11 章只剩种子没有收口。
    function getVolumeOneDebtClosureLine(state, phase = 'market') {
        const flags = state?.flags || {};
        const relationMo = state?.npcRelations?.['墨彩环'] || 0;

        if (flags.returnedOldMedicineLedger) {
            return phase === 'market'
                ? '墨府那几页旧账最终还是回到了活人手里。你离开嘉元城时没再把它当成自己的后手，而是知道这笔因果至少已经有人能亲手收尾。'
                : '你后来再想起墨府时，最先记住的已不是那本账册，而是你终究把它交还给了还要继续过日子的人。第一卷走到这里，这笔账算是收回了凡人的手中。';
        }

        if (flags.keptMedicineLedgerNamesOnly) {
            return phase === 'market'
                ? '那几页账册并没有被你重新摊开到底。你只留下最关键的名字，把其余旧页按了回去，也等于承认自己是带着一笔没再深翻的旧账离开嘉元城。'
                : '你终究没有替墨府把每一页旧账都翻到天光下，只把最要紧的名字记在心里。到了离卷时，这已经不是悬着没说的尾巴，而是你亲手按住的一笔旧账。';
        }

        if (flags.mendedMoHouseDebt || flags.daoLvPromise || flags.fulfilledMoWill || relationMo >= 45) {
            return phase === 'market'
                ? '就算账页没有真正一张张交还，你也没有把墨府丢回死人堆里。替人挡过的风声、认下的承诺和补上的情分，已经让这笔旧账不再只是“以后再说”。'
                : '你未必把每一页账都交割干净，却已经用承诺、照拂或补偿替墨府把最重的那层债接了回来。对第一卷而言，这笔账到这里已经有了明白去处。';
        }

        return phase === 'market'
            ? '你没有再回头细翻墨府旧账，可也明白那件事该停在第一卷的门口：它留成一笔你认得出的凡俗旧因果，而不是下一卷还能拿来装新谜案的尾巴。'
            : '你终究没把墨府每一层旧账都补得漂亮，但也没有再假装它不存在。到了离卷时，这件事已经被你看成一笔认得出的旧因果，而不是悬着不提的空白。';
    }

    function getVolumeOneQuhunClosureLine(state, phase = 'market') {
        const flags = state?.flags || {};

        if (flags.quhunReleased) {
            return phase === 'market'
                ? '曲魂既已归去，神手谷旧案留下来的就不再是一件好用器物，而是一道你自己不肯彻底踩过去的底线。你是带着这层清楚离开嘉元城的。'
                : '你最终没有把曲魂留成工具。等第一卷走到出口，真正跟着你上路的不是一具可驱使的躯壳，而是“有些东西不能只按好不好用来算”的那条底线。';
        }

        if (flags.sealedQuhun) {
            return phase === 'market'
                ? '你没有继续深翻残影，也没有急着替曲魂定最终用法。被你带走的不是答案，而是一个明知迟早还要再回答、却先被你压下并暂时封住的问题。'
                : '第一卷离卷前，你终究还是没有把曲魂这件事回答到底。可它也不再是悬空旧案，而是一个被你亲手压下、暂时封住、以后迟早还要重新作答的问题。';
        }

        if (flags.tookQuhunByForce) {
            return phase === 'market'
                ? '你把曲魂连同墨府最后一点体面一起带离了嘉元城。从那一刻起，真正留下来的已经不是“拿没拿到手”，而是你往后还肯不肯承认自己究竟拿走了什么。'
                : '到了离卷时，你已经知道自己带走的从来不只是曲魂本身。神手谷旧案在你这里被写成了一条更锋利的分界: 以后你若再说“只是工具”，也得先过自己这一关。';
        }

        if (flags.curedQuhun && flags.keptQuhun) {
            return phase === 'market'
                ? '你把曲魂留在身边，却没把它只当成一件顺手兵器。这让药童残影不再只是旧案余波，而成了你以后分辨“人”和“可用之物”的一把尺。'
                : '曲魂最终还是跟在你身边，可第一卷已经替这件事定了性：你留下的不是一件纯粹工具，而是一道会逼你往后继续分清轻重的心障。';
        }

        if (flags.keptQuhun || flags.tracedApothecaryBoyEcho || flags.learnedQuhunIdentityFragment || flags.quhunIdentityMystery) {
            return phase === 'market'
                ? '无论你是顺着残影追下去，还是把曲魂留在身边，神手谷旧案都已经不可能再被当成“死人死尽就算完”的事情。你带着走的，是一条以后还会回来问你的分界线，也是一桩已经被你记住的旧案。'
                : '第一卷到了出口，药童残影这件事真正留下来的，不只是曲魂在不在身边，而是你今后还能不能把“活过的人”和“趁手之物”分清。你是带着这桩被记住的旧案离开的。';
        }

        return phase === 'market'
            ? '就算你没有把残影一路追到底，神手谷留下来的也早不只是一个模糊传闻。到了嘉元城之后，你已经知道这件事真正会跟着你走的，是它逼你以后再分轻重善恶的方式。'
            : '你未必把药童旧案全都查明了，但第一卷离卷前，这件事的意义已经说清：它不是下一卷的新悬念，而是你往后看待禁魂、尸炼与因果时绕不开的一道旧影。';
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
        offlineCultivateMaxDurationMs: 8 * 60 * 60 * 1000,
        itemDropChance: 0.2,
        naturalRecoveryIntervalMs: 30000,
        naturalRecoveryRatio: 0.03,
        naturalRecoveryCapRatio: 0.5,
    };

    const REALMS = [
        { name: '炼气', stages: ['初期', '中期', '后期'], baseReq: 100, rateDrop: 0.08 },
        { name: '筑基', stages: ['初期', '中期', '后期'], baseReq: 520, rateDrop: 0.12 },
        { name: '金丹', stages: ['初期', '中期', '后期'], baseReq: 2100, rateDrop: 0.17 },
        { name: '元婴', stages: ['初期', '中期', '后期'], baseReq: 8600, rateDrop: 0.22 },
        { name: '化神', stages: ['初期', '中期', '后期'], baseReq: 32000, rateDrop: 0.27 },
    ];

    const ITEMS = {
        lingcao: {
            name: '灵草',
            type: 'material',
            description: '药田里最常见的青叶，入炉可成丹，递出去也常是一份人情。',
            usable: false,
            actions: [{ id: 'refine', label: '炼化', summary: '炼化：回转 12% 气血。', effect: { healRatio: 0.12 } }],
        },
        lingshi: {
            name: '灵石',
            type: 'material',
            description: '修士行走世间的硬底子；无论闭关、交易还是保命，多半都绕不开它。',
            usable: false,
        },
        yaodan: {
            name: '妖丹',
            type: 'material',
            description: '妖物一身精华所凝，药性最烈，常被拿来压进高阶丹炉。',
            usable: false,
            actions: [{ id: 'refine', label: '炼化', summary: '炼化：折去 1 枚，得修为 60 点。', effect: { cultivation: 60 } }],
        },
        greenBottle: {
            name: '神秘绿瓶',
            type: 'treasure',
            description: '一只不起眼的小瓶，却最会在暗处催熟灵药；越少叫人看见，越安全。',
            usable: false,
            passiveEffects: { maxHp: 10, breakthroughBonus: 0.02 },
            passiveSummary: '持有生效：气血上限 +10，突破加成 +2%。',
        },
        moLetter: {
            name: '墨大夫遗书',
            type: 'quest',
            description: '墨居仁临死前留下的残信，纸面发脆，字里却还压着墨府旧因果。',
            usable: false,
            passiveEffects: { defense: 2 },
            passiveSummary: '持有生效：防御 +2。',
        },
        evidence: {
            name: '药渣证据',
            type: 'quest',
            description: '能把神手谷禁药旧事重新见光的证物。',
            usable: false,
            passiveEffects: { attack: 2 },
            passiveSummary: '持有生效：攻击 +2。',
        },
        shengxianling: {
            name: '升仙令',
            type: 'quest',
            description: '一枚能叩开黄枫谷山门的凭证，也是一场杀机的引子。',
            usable: false,
            passiveEffects: { maxHp: 8, defense: 1 },
            passiveSummary: '持有生效：气血上限 +8，防御 +1。',
        },
        zhujidanMaterial: {
            name: '筑基丹主药',
            type: 'material',
            description: '血色禁地才肯吐出的主药，见到它的人，多半都要拿命来换。',
            usable: false,
            passiveEffects: { breakthroughBonus: 0.04 },
            passiveCap: 3,
            passiveSummary: '持有生效：每份突破加成 +4%，最多按 3 份计算。',
        },
        xuTianTu: {
            name: '虚天残图',
            type: 'quest',
            description: '通往虚天殿的残图之一，拿在手里像捧着一段还没炸开的风声。',
            usable: false,
            passiveEffects: { attack: 3, breakthroughBonus: 0.02 },
            passiveSummary: '持有生效：攻击 +3，突破加成 +2%。',
        },
        juqidan: {
            name: '聚气丹',
            type: 'pill',
            description: '丹力一入腹，气机便立时高涨。',
            usable: true,
            effect: { cultivation: 220 },
            actions: [{ id: 'use', label: '使用', summary: '服下：得修为 220 点。', effect: { cultivation: 220 } }],
        },
        zhujidan: {
            name: '筑基丹',
            type: 'pill',
            description: '叩关前含下去，能替你多撑一口成败未定的气。',
            usable: true,
            effect: { breakthroughBonus: 0.15 },
            actions: [{ id: 'use', label: '使用', summary: '服下：下次突破额外 +15% 成算。', effect: { breakthroughBonus: 0.15 } }],
        },
        jiedusan: {
            name: '解毒散',
            type: 'pill',
            description: '散开余毒，也替乱掉的经脉缓一缓。',
            usable: true,
            effect: { healRatio: 0.35 },
            actions: [{ id: 'use', label: '使用', summary: '服下：回复 35% 最大气血。', effect: { healRatio: 0.35 } }],
        },
        huashendan: {
            name: '化神丹',
            type: 'pill',
            description: '元婴之后才压得住的重药，真正服下时，像把一口天火含进腹中。',
            usable: true,
            effect: { breakthroughBonus: 0.25 },
            actions: [{ id: 'use', label: '使用', summary: '服下：下次突破额外 +25% 成算。', effect: { breakthroughBonus: 0.25 } }],
        },
        feijian: {
            name: '飞剑',
            type: 'weapon',
            description: '剑光一起，游历中的杀伐便先利三分。',
            usable: false,
            passiveEffects: { attack: 6 },
            passiveSummary: '持有生效：攻击 +6。',
        },
        hujian: {
            name: '护身法器',
            type: 'armor',
            description: '护身灵光一开，游历中的来势便能替你挡下一层。',
            usable: false,
            passiveEffects: { defense: 4 },
            passiveSummary: '持有生效：防御 +4。',
        },
        quhun: {
            name: '曲魂',
            type: 'companion',
            description: '半人半傀的护卫，真到险处时，往往能替你多扛半口气。',
            usable: false,
            passiveEffects: { maxHp: 12 },
            passiveSummary: '持有生效：气血上限 +12。',
        },
    };

    const ALCHEMY_RECIPES = {
        'brew-jiedusan': {
            id: 'brew-jiedusan',
            name: '炼制解毒散',
            category: 'recovery',
            summary: '取灵草与灵石缓慢养脉，炼出一炉最常用的解毒散。',
            costs: { lingcao: 2, lingshi: 5 },
            outputs: { jiedusan: 1 },
            unlock: {},
        },
        'brew-juqidan': {
            id: 'brew-juqidan',
            name: '炼制聚气丹',
            category: 'cultivation',
            summary: '把灵草、妖丹与灵石一并压进炉里，炼成常备的聚气丹。',
            costs: { lingcao: 2, yaodan: 1, lingshi: 10 },
            outputs: { juqidan: 1 },
            unlock: {},
        },
        'brew-zhujidan': {
            id: 'brew-zhujidan',
            name: '炼制筑基丹',
            category: 'breakthrough',
            summary: '主药在手，才敢开这一炉，用来替前中期叩关添一口底气。',
            costs: { zhujidanMaterial: 1, lingcao: 2, lingshi: 20 },
            outputs: { zhujidan: 1 },
            unlock: {
                requiredItems: { zhujidanMaterial: 1 },
            },
        },
        'brew-huashendan': {
            id: 'brew-huashendan',
            name: '炼制化神丹',
            category: 'breakthrough',
            summary: '元婴之后才压得住的重丹，开炉时便知不是寻常火候。',
            costs: { yaodan: 3, lingcao: 4, lingshi: 60 },
            outputs: { huashendan: 1 },
            unlock: {
                minRealmIndex: 3,
            },
        },
    };

    const MONSTERS = [
        { name: '风狼', baseHp: 56, baseAttack: 8, baseDefense: 2, dropTable: ['lingcao', 'lingshi'] },
        { name: '赤练蛇', baseHp: 82, baseAttack: 12, baseDefense: 3, dropTable: ['lingcao', 'lingshi', 'yaodan'] },
        { name: '山魈', baseHp: 128, baseAttack: 16, baseDefense: 5, dropTable: ['lingshi', 'yaodan', 'feijian'] },
        { name: '黑熊精', baseHp: 190, baseAttack: 21, baseDefense: 8, dropTable: ['yaodan', 'hujian'] },
        { name: '海眼异蛟', baseHp: 286, baseAttack: 28, baseDefense: 11, dropTable: ['yaodan', 'hujian', 'xuTianTu'] },
    ];

    const LOCATIONS = {
        '青牛镇': { name: '青牛镇', description: '炊烟还在，旧屋也还在。很多后来绕不开的选择，都是从这里起身。', npcs: [] },
        '七玄门': { name: '七玄门', description: '山门不大，规矩也不算森严，却是你真正踏上仙路的第一道门槛。', npcs: ['墨大夫', '厉飞雨'] },
        '神手谷': { name: '神手谷', description: '药香压着血气，表面寂静，暗处却总像有人把刀背在身后。', npcs: ['墨大夫'] },
        '嘉元城': { name: '嘉元城', description: '凡俗城池灯火如常，墨府旧案与人情冷暖都在这里慢慢发酵。', npcs: ['墨彩环', '曲魂'] },
        '太南山': { name: '太南山', description: '散修云集，消息、法器、祸患与机缘都在这里一起叫价。', npcs: ['万小山'] },
        '黄枫谷': { name: '黄枫谷', description: '门规森严的大宗山门，既适合低头积累，也适合把名声慢慢种下。', npcs: ['李化元'] },
        '血色禁地': { name: '血色禁地', description: '脚下一步也许是机缘，再一步便可能只剩尸骨。', npcs: ['南宫婉'] },
        '燕家堡': { name: '燕家堡', description: '杯盏之间人人带笑，可真正摆在桌下的，多半都是算计。', npcs: [] },
        '越国边境': { name: '越国边境', description: '正魔两线相持不下，整片边境都像一根绷到发冷的弦。', npcs: [] },
        '灵石矿脉': { name: '灵石矿脉', description: '矿灯摇晃不定，一道军令下来，弃子和死士往往只隔半步。', npcs: [] },
        '乱星海': { name: '乱星海', description: '海上势力咬在一起，弱肉强食比天南来得更直也更冷。', npcs: ['南宫婉'] },
        '乱星海外海': { name: '乱星海外海', description: '残图、海妖、散修和命数，都被海风卷在一处。', npcs: [] },
        '乱星海深处': { name: '乱星海深处', description: '所有人都在朝同一件宝物赶，像赶向一场可能埋掉所有人的潮头。', npcs: [] },
        '天南': { name: '天南', description: '旧账、人情与道心都在这里等你回身去认。', npcs: ['南宫婉'] },
        '大晋': { name: '大晋', description: '人界最后一大段路，谁都想在这里替自己定下一个答案。', npcs: [] },
    };

    const LOCATION_COMMISSION_BOARD_META = {
        '青牛镇': {
            title: '青牛镇·委托榜',
            description: '镇上凡事还靠口耳相传，肯出手的多半都是真的急事。',
        },
        '太南山': {
            title: '太南山·委托榜',
            description: '散修云集，委托也五花八门，能不能接得住全看你手上底气。',
        },
        default: {
            title: '委托榜',
            description: '此地暂无公开委托。',
        },
    };

    const LOCATION_COMMISSIONS_V1 = [
        {
            id: 'qingniu_medicine_delivery',
            locationName: '青牛镇',
            title: '药材急递',
            detail: '镇上药铺缺了几味常用药，托人快送。',
            minRealmScore: 0,
            rewardPreview: '灵石 x2',
            priority: 40,
            choices: [],
        },
        {
            id: 'qingniu_rear_hill_noise',
            locationName: '青牛镇',
            title: '后山异响',
            detail: '后山近来夜里总有怪声，村民不敢靠近。',
            minRealmScore: 0,
            rewardPreview: '灵石 x2',
            priority: 30,
            choices: [],
        },
        {
            id: 'qingniu_lost_ox',
            locationName: '青牛镇',
            title: '走失耕牛',
            detail: '一户人家的耕牛走失，盼人帮忙找回。',
            minRealmScore: 0,
            rewardPreview: '灵石 x1',
            priority: 20,
            choices: [],
        },
        {
            id: 'qingniu_dawn_dew',
            locationName: '青牛镇',
            title: '晨露采集',
            detail: '清晨露水带灵性，需及时采集送到药房。',
            minRealmScore: 0,
            rewardPreview: '灵石 x1',
            priority: 10,
            choices: [],
        },
        {
            id: 'tainan_fake_cinnabar',
            locationName: '太南山',
            title: '伪丹朱排查',
            detail: '集市出现假丹朱，需要人去核查源头。',
            minRealmScore: 2,
            rewardPreview: '灵石 x4',
            priority: 40,
            choices: [],
        },
        {
            id: 'tainan_cave_scout',
            locationName: '太南山',
            title: '山洞探路',
            detail: '有人在山洞中发现灵气波动，求探查。',
            minRealmScore: 2,
            rewardPreview: '灵石 x4',
            priority: 30,
            choices: [],
        },
        {
            id: 'tainan_night_cargo',
            locationName: '太南山',
            title: '夜路护送',
            detail: '夜里运送货物，担心遇袭，急需护送。',
            minRealmScore: 2,
            rewardPreview: '灵石 x3',
            priority: 20,
            choices: [],
        },
        {
            id: 'tainan_material_purchase',
            locationName: '太南山',
            title: '材料代购',
            detail: '有人托你代购几味材料，需跑一趟集市。',
            minRealmScore: 2,
            rewardPreview: '灵石 x2',
            priority: 10,
            choices: [],
        },
    ];

    const SIDE_QUESTS_V1 = [
        {
            id: 'old_medicine_ledger',
            title: '旧药账',
            detail: '墨府旧账房里还压着几页泡皱的账册。墨痕已糊，纸上却还能辨出几个人名与药材去路。',
            category: '旧账',
            npc: '墨彩环',
            volumeAnchor: 'volume_one_qixuanmen',
            closureMode: 'volume_close',
            followupHook: {
                type: 'volume_one_closure',
                note: '卷末需明确交代墨府旧账是交还活人、留作后手，还是被主线判定为止步于此。',
            },
            availableFromProgress: 8,
            availableToProgress: 10,
            triggerCondition: {
                flagsAny: ['protectedMoHouse', 'promisedMoReturn', 'lootedMoHouse', 'daoLvPromise', 'tookTreasure'],
            },
            acceptCondition: {},
            failCondition: {},
            successCondition: { resolveByChoice: true },
            rewards: {
                items: { lingshi: 6 },
                flags: { sideQuestOldMedicineLedgerCompleted: true },
            },
            rewardPreview: '灵石 x6 · 墨府旧账有了去处',
            branchEffects: {
                return_ledgers: { title: '账页归主', detail: '你把账页交回活人手里，让旧事先有了能被清理的起点。' },
                keep_names_only: { title: '只留人名', detail: '你烧去大半旧页，只记住最关键的名字，准备以后再择机补这一刀。' },
            },
            choices: [
                {
                    id: 'return_ledgers',
                    text: '把账页交回墨彩环，让活人亲手收尾',
                    effects: {
                        relations: { '墨彩环': 3 },
                        routeScores: { orthodox: 1 },
                        flags: { returnedOldMedicineLedger: true },
                    },
                    resultSummary: '你把账页交回墨府，让这笔旧账重新落回活人手里。',
                },
                {
                    id: 'keep_names_only',
                    text: '焚去旧页，只把几个关键名字藏回袖中',
                    effects: {
                        relations: { '墨彩环': 1 },
                        routeScores: { secluded: 1 },
                        flags: { keptMedicineLedgerNamesOnly: true },
                    },
                    resultSummary: '你没有再把旧账翻到底，只把最要紧的名字留在自己手里。',
                },
            ],
            priority: 90,
            exclusiveGroup: null,
        },
        {
            id: 'apothecary_boy_echo',
            title: '药童残影',
            detail: '你又听见那句断断续续的话：师父让我们闭眼。那不像疯话，更像一桩迟迟没人肯说清的旧案。',
            category: '旧案',
            npc: '曲魂',
            volumeAnchor: 'volume_one_qixuanmen',
            closureMode: 'convert_to_main',
            followupHook: {
                type: 'main_chapter_read',
                note: '卷末需由七玄门风波或升仙出口前的主线回收这段残影，不能继续悬空。',
            },
            availableFromProgress: 9,
            availableToProgress: 11,
            triggerCondition: {
                flagsAny: ['hasQuhun', 'sealedQuhun', 'quhunReleased', 'keptQuhun'],
            },
            acceptCondition: {},
            failCondition: {},
            successCondition: { resolveByChoice: true },
            rewards: {
                items: { jiedusan: 1 },
                flags: { sideQuestApothecaryBoyEchoCompleted: true },
            },
            rewardPreview: '解毒散 x1 · 药童旧案有了结果',
            branchEffects: {
                trace_the_voice: { title: '顺声追旧案', detail: '你顺着那句疯话再往回查了一步，等于承认这件事并没有随死人一起埋干净。' },
                seal_the_memory: { title: '先把影子压住', detail: '你不再继续深翻，只给这段残影留下一道暂时不再扩散的封口。' },
            },
            choices: [
                {
                    id: 'trace_the_voice',
                    text: '顺着药童残语，再往里查一层',
                    effects: {
                        routeScores: { orthodox: 1 },
                        flags: { tracedApothecaryBoyEcho: true },
                    },
                    resultSummary: '你顺着残影多问了一层，让这桩旧案终于有了继续被人记住的理由。',
                },
                {
                    id: 'seal_the_memory',
                    text: '先把残影压住，眼下不再深翻',
                    effects: {
                        routeScores: { secluded: 1 },
                        items: { lingcao: 1 },
                        flags: { sealedApothecaryBoyEcho: true },
                    },
                    resultSummary: '你没有继续追索，只把这段残影先压下，免得再牵出更多活人的麻烦。',
                },
            ],
            priority: 88,
            exclusiveGroup: null,
        },
        {
            id: 'li_feiyu_wine',
            title: '厉飞雨的酒',
            detail: '还有旧友留在凡人江湖里。他未必懂你如今的境界，却多半还记得你最初是怎样起身的。',
            category: '旧友',
            npc: '厉飞雨',
            volumeAnchor: 'volume_two_ascending_path',
            closureMode: 'seed_forward',
            followupHook: {
                type: 'relationship_seed',
                note: '旧友重逢应结算在本卷窗口内，只把关系余波留给后续章节读取。',
            },
            availableFromProgress: 16,
            availableToProgress: 18,
            triggerCondition: {
                anyOf: [
                    { relationsMin: { '厉飞雨': 15 } },
                    { flagsAny: ['reconnectedWithLiFeiyu'] },
                ],
            },
            acceptCondition: {},
            failCondition: {},
            successCondition: { resolveByChoice: true },
            rewards: {
                items: { lingshi: 10 },
                flags: { sideQuestLiFeiyuWineCompleted: true },
            },
            rewardPreview: '灵石 x10 · 旧友这一段有了回声',
            branchEffects: {
                share_plain_wine: { title: '一杯旧酒', detail: '你没有谈大道，只陪旧友把凡人江湖里还没散干净的那点热气喝完。' },
                leave_medicine_and_go: { title: '留药即走', detail: '你没久留，只把能救急的东西留下，让旧情保持在不再相互拖累的距离。' },
            },
            choices: [
                {
                    id: 'share_plain_wine',
                    text: '陪厉飞雨喝一杯，把旧路上的话说开些',
                    costs: { lingshi: 2 },
                    effects: {
                        relations: { '厉飞雨': 4 },
                        routeScores: { orthodox: 1 },
                        flags: { sharedWineWithLiFeiyu: true },
                    },
                    resultSummary: '你陪旧友喝完一杯浊酒，让那段凡人旧路重新有了可回头的地方。',
                },
                {
                    id: 'leave_medicine_and_go',
                    text: '留下一份药和银钱，不多停留',
                    effects: {
                        items: { jiedusan: 1 },
                        relations: { '厉飞雨': 2 },
                        routeScores: { secluded: 1 },
                        flags: { leftMedicineForLiFeiyu: true },
                    },
                    resultSummary: '你没有久坐，只把该留的东西留下，让旧情停在彼此都还能承受的位置。',
                },
            ],
            priority: 86,
            exclusiveGroup: null,
        },
        {
            id: 'spirit_mine_survivor',
            title: '灵矿幸存者',
            detail: '灵矿一战之后，活下来的人说法并不一样。有人念你的情，也有人把你的过记得更深。',
            category: '战后',
            npc: '李化元',
            volumeAnchor: 'volume_three_modao_conflict',
            closureMode: 'volume_close',
            followupHook: {
                type: 'reputation_seed',
                note: '灵矿余波必须在当前战争窗口内完成定性，不能继续挂成常驻旧账。',
            },
            availableFromProgress: 19,
            availableToProgress: 21,
            triggerCondition: {
                flagsAny: ['heldSpiritMineLine', 'ledMineBreakout', 'escapedMineWithCoreAssets'],
            },
            acceptCondition: {},
            failCondition: {},
            successCondition: { resolveByChoice: true },
            rewards: {
                items: { lingshi: 12 },
                flags: { sideQuestSpiritMineSurvivorCompleted: true },
            },
            rewardPreview: '灵石 x12 · 灵矿余波已见收束',
            branchEffects: {
                send_secret_support: { title: '暗中补给', detail: '你没有高调出面，只把能稳住局面的东西送到幸存者手里。' },
                pay_and_cut_ties: { title: '付账断尾', detail: '你把这笔账当场了掉，不让幸存者和自己继续互相拖累。' },
            },
            choices: [
                {
                    id: 'send_secret_support',
                    text: '暗中送去补给，替他们续一条稳路',
                    effects: {
                        relations: { '李化元': 2 },
                        routeScores: { orthodox: 1 },
                        flags: { stabilizedSpiritMineSurvivors: true },
                    },
                    resultSummary: '你没有再站到台前，只是把补给送到，让幸存者知道这笔命债还没被你彻底丢开。',
                },
                {
                    id: 'pay_and_cut_ties',
                    text: '付下一笔安置钱，今后不再深牵',
                    effects: {
                        items: { lingcao: 1 },
                        routeScores: { secluded: 1 },
                        flags: { paidOffSpiritMineSurvivors: true },
                    },
                    resultSummary: '你把该付的账付清，把这段战后余波止在还能收束的位置。',
                },
            ],
            priority: 84,
            exclusiveGroup: null,
        },
        {
            id: 'void_map_aftermath',
            title: '残图余波',
            detail: '你以为事情已经过去。可真正危险的，往往不是争图那阵子，而是图早已不在手里，仍有人拿不准你到底知道多少。',
            category: '秘图',
            npc: '南宫婉',
            volumeAnchor: 'volume_four_star_sea',
            closureMode: 'seed_forward',
            followupHook: {
                type: 'rumor_seed',
                note: '残图余波要在当前卷内结算风险，只允许把情报与名声余波带去后续章节。',
            },
            availableFromProgress: 22,
            availableToProgress: 24,
            triggerCondition: {
                flagsAny: ['enteredVoidHeavenMapGame', 'soldFragmentMapForResources', 'avoidedVoidHeavenCoreConflict', 'hasXuTianTu', 'soldXuTianTu', 'avoidedXuTian'],
            },
            acceptCondition: {},
            failCondition: {},
            successCondition: { resolveByChoice: true },
            rewards: {
                items: { lingshi: 15 },
                flags: { sideQuestVoidMapAftermathCompleted: true },
            },
            rewardPreview: '灵石 x15 · 残图余波已有下落',
            branchEffects: {
                warn_nangong: { title: '先递警讯', detail: '你把残图余波先递给可信之人，让追索不至于只压到自己一人身上。' },
                sell_false_trail: { title: '放出假线', detail: '你主动放出一条假路，把后续追索往别处引开，为自己换出喘息时间。' },
            },
            choices: [
                {
                    id: 'warn_nangong',
                    text: '先把风声递给南宫婉，免得旧盟先受其害',
                    effects: {
                        relations: { '南宫婉': 3 },
                        routeScores: { orthodox: 1 },
                        flags: { warnedNangongAboutVoidMapRumors: true },
                    },
                    resultSummary: '你没有独吞消息，而是先把余波递给可信之人，让风险不再只压在自己身上。',
                },
                {
                    id: 'sell_false_trail',
                    text: '放出一条假线，把追索先引向别处',
                    effects: {
                        items: { lingcao: 2 },
                        routeScores: { demonic: 1 },
                        flags: { soldFalseTrailForVoidMap: true },
                    },
                    resultSummary: '你顺手布下一条假线，把残图之后的追索先拐到别处，为自己换来一段清净。',
                },
            ],
            priority: 82,
            exclusiveGroup: null,
        },
    ];

    const VOLUME_CONTRACT = Object.freeze({
        id: 'adapted_custom_volume_contract_v1',
        kind: 'adapted_custom_volumes',
        labelPrefix: '改编',
        originalBoundaryGuarantee: false,
        playerFacingNotes: Object.freeze([
            '当前主线卷采用改编后的自定义分卷。',
            '只借用原著世界观和部分卷名意象，不承诺与原著卷界一一对应。',
            '改编第五卷《归乡飞升》是自定义终局卷，不对应原著第五卷《名震一方》。',
        ]),
    });

    const VOLUME_DISPLAY_META = Object.freeze({
        volume_one_qixuanmen: Object.freeze({
            volumeId: 'volume_one_qixuanmen',
            displayLabel: '改编第一卷',
            displayTitle: '改编第一卷《七玄门风云》',
            volumeTitle: '七玄门风云',
            originalNovelVolumeTitle: '七玄门风云',
            matchesOriginalBoundary: false,
            contractNote: '当前采用改编分卷，只借用原著卷名意象，不承诺与原著卷界一致。',
        }),
        volume_two_ascending_path: Object.freeze({
            volumeId: 'volume_two_ascending_path',
            displayLabel: '改编第二卷',
            displayTitle: '改编第二卷《初踏修仙路》',
            volumeTitle: '初踏修仙路',
            originalNovelVolumeTitle: '初踏修仙路',
            matchesOriginalBoundary: false,
            contractNote: '当前采用改编分卷，只借用原著卷名意象，不承诺与原著卷界一致。',
        }),
        volume_three_magic_invasion: Object.freeze({
            volumeId: 'volume_three_magic_invasion',
            displayLabel: '改编第三卷',
            displayTitle: '改编第三卷《魔道入侵》',
            volumeTitle: '魔道入侵',
            originalNovelVolumeTitle: '魔道入侵',
            matchesOriginalBoundary: false,
            contractNote: '当前采用改编分卷，只借用原著卷名意象，不承诺与原著卷界一致。',
        }),
        volume_four_overseas: Object.freeze({
            volumeId: 'volume_four_overseas',
            displayLabel: '改编第四卷',
            displayTitle: '改编第四卷《风起海外》',
            volumeTitle: '风起海外',
            originalNovelVolumeTitle: '风起海外',
            matchesOriginalBoundary: false,
            contractNote: '当前采用改编分卷，只借用原著卷名意象，不承诺与原著卷界一致。',
        }),
        volume_five_homecoming: Object.freeze({
            volumeId: 'volume_five_homecoming',
            displayLabel: '改编第五卷',
            displayTitle: '改编第五卷《归乡飞升》',
            volumeTitle: '归乡飞升',
            originalNovelVolumeTitle: '名震一方',
            matchesOriginalBoundary: false,
            isCustomFinalVolume: true,
            contractNote: '当前改编第五卷是自定义终局卷，不对应原著第五卷《名震一方》。',
        }),
    });

    // 第一卷先用静态映射固定“新 8 章结构”和“旧 0~11 章归类”，避免后续改代码时边改边漂移。
    const VOLUME_ONE_CHAPTERS = Object.freeze([
        {
            id: 'volume_one_chapter_1',
            title: '入门七玄',
            legacyChapterIds: Object.freeze([0, 1]),
            volumeRole: 'opening',
            chapterGoal: '建立凡俗起点、离乡动机与进入七玄门的最初承诺。',
            chapterConflict: '资质平常的少年如何进入门内，并决定要用什么姿态开始活下去。',
            closureWrites: Object.freeze(['leaves_mortal_village', 'enters_qixuanmen']),
            nextReads: Object.freeze(['mo_invitation', 'sect_survival_logic']),
        },
        {
            id: 'volume_one_chapter_2',
            title: '神手谷试徒',
            legacyChapterIds: Object.freeze([2]),
            volumeRole: 'escalation',
            chapterGoal: '把修炼机会与危险师承绑定在一起。',
            chapterConflict: '墨大夫是机缘还是陷阱，玩家第一次要主动选边站。',
            closureWrites: Object.freeze(['accepts_or_resists_mo']),
            nextReads: Object.freeze(['li_feiyu_bond', 'herb_valley_suspicion']),
        },
        {
            id: 'volume_one_chapter_3',
            title: '门内旧友',
            legacyChapterIds: Object.freeze([3]),
            volumeRole: 'bonding',
            chapterGoal: '建立厉飞雨与门内旧友线，让第一卷真正带上人情重量。',
            chapterConflict: '玩家要不要把自己的活路分给别人，第一次让人情变成债。',
            closureWrites: Object.freeze(['li_feiyu_bond_seed']),
            nextReads: Object.freeze(['apothecary_case', 'mortal_bond_cost']),
        },
        {
            id: 'volume_one_chapter_4',
            title: '药童与绿瓶',
            legacyChapterIds: Object.freeze([4, 5]),
            volumeRole: 'reversal',
            chapterGoal: '从门内修行转向暗局求生，并引出绿瓶这一条长期主线。',
            chapterConflict: '药童旧案与绿瓶异象同时出现，普通修炼路径开始失效。',
            closureWrites: Object.freeze(['apothecary_case_exposed', 'green_bottle_seeded']),
            nextReads: Object.freeze(['mo_showdown', 'hidden_growth_path']),
        },
        {
            id: 'volume_one_chapter_5',
            title: '夺舍杀局',
            legacyChapterIds: Object.freeze([6]),
            volumeRole: 'climax',
            chapterGoal: '完成第一卷第一高潮，让主角从被动弟子转为主动求生者。',
            chapterConflict: '墨居仁与弟子之间只能活下一种身份，师徒关系彻底翻面。',
            closureWrites: Object.freeze(['mo_showdown_resolved']),
            nextReads: Object.freeze(['mo_letter_truth', 'first_contact_with_immortal_world']),
        },
        {
            id: 'volume_one_chapter_6',
            title: '遗书与真相',
            legacyChapterIds: Object.freeze([7]),
            volumeRole: 'fallout',
            chapterGoal: '把高潮后的遗产、解毒与修仙真相说明白。',
            chapterConflict: '杀局虽解，但遗书、解药与后续道路要求玩家重新定义自己站在什么世界门前。',
            closureWrites: Object.freeze(['mo_letter_owned', 'immortal_world_confirmed']),
            nextReads: Object.freeze(['mo_house_debt', 'ascension_path_seed']),
        },
        {
            id: 'volume_one_chapter_7',
            title: '七玄门风波',
            legacyChapterIds: Object.freeze([8, 9]),
            volumeRole: 'closure',
            chapterGoal: '回收墨府旧账、药童残影与门内旧人情，让凡俗阶段完成一次清账。',
            chapterConflict: '凡俗恩义、旧案余波与修仙前路第一次正面冲突，玩家必须决定带谁上路、把谁留在身后。',
            closureWrites: Object.freeze(['mo_house_debt_resolved', 'apothecary_echo_resolved']),
            nextReads: Object.freeze(['shengxian_exit', 'carry_forward_debts']),
        },
        {
            id: 'volume_one_chapter_8',
            title: '升仙路口',
            legacyChapterIds: Object.freeze([10, 11]),
            volumeRole: 'exit',
            chapterGoal: '给出离开凡俗与进入真正修仙路的明确出口。',
            chapterConflict: '太南小会与升仙令不再只是事件列表，而是第一卷卷末唯一合法出口。',
            closureWrites: Object.freeze(['volume_one_exit_locked']),
            nextReads: Object.freeze(['yellow_maple_entry', 'green_bottle_secrecy', 'one_unfinished_debt']),
        },
    ]);

    const VOLUME_ONE_LEGACY_CHAPTER_MAP = Object.freeze({
        0: Object.freeze({ targetChapterId: 'volume_one_chapter_1', action: 'merge_main' }),
        1: Object.freeze({ targetChapterId: 'volume_one_chapter_1', action: 'merge_main' }),
        2: Object.freeze({ targetChapterId: 'volume_one_chapter_2', action: 'keep_main' }),
        3: Object.freeze({ targetChapterId: 'volume_one_chapter_3', action: 'keep_main' }),
        4: Object.freeze({ targetChapterId: 'volume_one_chapter_4', action: 'merge_main' }),
        5: Object.freeze({ targetChapterId: 'volume_one_chapter_4', action: 'merge_main' }),
        6: Object.freeze({ targetChapterId: 'volume_one_chapter_5', action: 'keep_main' }),
        7: Object.freeze({ targetChapterId: 'volume_one_chapter_6', action: 'keep_main' }),
        8: Object.freeze({ targetChapterId: 'volume_one_chapter_7', action: 'downgrade_to_sidequest', sideQuestId: 'old_medicine_ledger' }),
        9: Object.freeze({ targetChapterId: 'volume_one_chapter_7', action: 'downgrade_to_sidequest', sideQuestId: 'apothecary_boy_echo' }),
        10: Object.freeze({ targetChapterId: 'volume_one_chapter_8', action: 'merge_main' }),
        11: Object.freeze({ targetChapterId: 'volume_one_chapter_8', action: 'merge_main' }),
    });

    const VOLUME_ONE_SIDE_QUEST_SEEDS = Object.freeze([
        Object.freeze({
            id: 'old_medicine_ledger',
            volumeAnchor: 'volume_one_qixuanmen',
            closureMode: 'volume_close',
            linkedLegacyChapterIds: Object.freeze([8]),
        }),
        Object.freeze({
            id: 'apothecary_boy_echo',
            volumeAnchor: 'volume_one_qixuanmen',
            closureMode: 'convert_to_main',
            linkedLegacyChapterIds: Object.freeze([9]),
        }),
    ]);

    // 第二卷沿用现有主线结构接入，但卷级语义与运行时素材吸收点单独固定。
    const VOLUME_TWO_CHAPTERS = Object.freeze([
        {
            id: 'volume_two_chapter_1',
            title: '离开旧地',
            legacyChapterIds: Object.freeze([12]),
            volumeRole: 'opening',
            chapterGoal: '建立真正离开七玄门旧阶段后的不稳感，让第二卷从“旧路已断”开始。',
            chapterConflict: '人已经踏上修仙路，可凡俗旧名、旧债与旧活法还没有彻底退出。',
            closureWrites: Object.freeze(['leaves_old_ground_for_good', 'admits_new_world_pressure']),
            nextReads: Object.freeze(['mortal_debt_return', 'tainan_market_entry']),
        },
        {
            id: 'volume_two_chapter_2',
            title: '凡俗旧债未清',
            legacyChapterIds: Object.freeze(['12_mortal_debt']),
            volumeRole: 'escalation',
            chapterGoal: '把墨府与墨彩环留下的凡俗旧债重新拉回主线上。',
            chapterConflict: '韩立已能往前走，但别人早已替他承担了这些年的后果。',
            closureWrites: Object.freeze(['mortal_debt_reframed', 'mocaihuan_seed_retained']),
            nextReads: Object.freeze(['tainan_rules', 'market_caution']),
        },
        {
            id: 'volume_two_chapter_3',
            title: '太南山与散修交易场',
            legacyChapterIds: Object.freeze(['12_tainan_market']),
            volumeRole: 'bonding',
            chapterGoal: '建立散修交易、情报与资源环境，让玩家第一次按修仙圈层规则思考。',
            chapterConflict: '不是所有东西都能靠修为拿到，很多活路先得靠消息与代价换。',
            closureWrites: Object.freeze(['tainan_rules_learned', 'market_contact_seeded']),
            nextReads: Object.freeze(['token_conflict', 'black_market_route']),
        },
        {
            id: 'volume_two_chapter_4',
            title: '升仙令与修士杀机',
            legacyChapterIds: Object.freeze(['12_token_kill']),
            volumeRole: 'reversal',
            chapterGoal: '让第二卷第一次真正进入修士视角的生死局。',
            chapterConflict: '资格、令牌与门票本身就会引来杀机，修仙界并不比凡俗更讲理。',
            closureWrites: Object.freeze(['token_conflict_resolved', 'sects_choice_forced']),
            nextReads: Object.freeze(['yellow_maple_entry', 'survival_style_confirmed']),
        },
        {
            id: 'volume_two_chapter_5',
            title: '进入黄枫谷',
            legacyChapterIds: Object.freeze(['12_enter_yellow_maple']),
            volumeRole: 'climax',
            chapterGoal: '完成第二卷的核心身份转换，让韩立真正进入宗门体系。',
            chapterConflict: '立足需要秩序与庇护，但交出多少自由、交给谁，并非无代价。',
            closureWrites: Object.freeze(['yellow_maple_identity_locked', 'sect_ladder_started']),
            nextReads: Object.freeze(['herb_garden_low_start', 'sect_rule_pressure']),
        },
        {
            id: 'volume_two_chapter_6',
            title: '百药园立足',
            legacyChapterIds: Object.freeze(['12_herb_garden']),
            volumeRole: 'fallout',
            chapterGoal: '把药园、绿瓶保密与长期积累变成稳定的宗门生存节奏。',
            chapterConflict: '真正的根基不是一时出头，而是在不起眼的位置熬出可持续优势。',
            closureWrites: Object.freeze(['herb_garden_foundation_built', 'green_bottle_hidden_again']),
            nextReads: Object.freeze(['forbidden_ground_eve', 'foundation_prep_ready']),
        },
        {
            id: 'volume_two_chapter_7',
            title: '宗门人际与禁地前夜',
            legacyChapterIds: Object.freeze([13]),
            volumeRole: 'closure',
            chapterGoal: '把门内人际、资源流转与禁地压力合成第二卷真正的卷末前夜。',
            chapterConflict: '韩立已经站稳修仙第一层台阶，却也必须承认自己已走进更残酷的圈层。',
            closureWrites: Object.freeze(['sect_position_established', 'forbidden_ground_ready']),
            nextReads: Object.freeze(['volume_two_exit', 'third_volume_entry']),
        },
        {
            id: 'volume_two_chapter_8',
            title: '此卷尽处',
            legacyChapterIds: Object.freeze(['13_volume_close']),
            volumeRole: 'exit',
            chapterGoal: '明确第二卷为什么在这里结束，以及为什么下一卷必须进入血色禁地。',
            chapterConflict: '真正踏上修仙路后，韩立已经不能再只按凡俗旧路处理人情、旧债与生死局。',
            closureWrites: Object.freeze(['volume_two_exit_locked', 'third_volume_hooks_registered']),
            nextReads: Object.freeze(['forbidden_ground_entry', 'foundation_prep_ready', 'mortal_debt_carryover', 'sect_identity_locked']),
        },
    ]);

    const VOLUME_TWO_LEGACY_CHAPTER_MAP = Object.freeze({
        10: Object.freeze({ targetChapterId: 'volume_two_chapter_3', action: 'reframe_runtime_material' }),
        11: Object.freeze({ targetChapterId: 'volume_two_chapter_4', action: 'reframe_runtime_material' }),
        12: Object.freeze({ targetChapterId: 'volume_two_chapter_6', action: 'reframe_runtime_material' }),
        13: Object.freeze({ targetChapterId: 'volume_two_chapter_7', action: 'reframe_runtime_material' }),
        14: Object.freeze({ targetChapterId: 'volume_two_chapter_8', action: 'forward_volume_boundary' }),
        15: Object.freeze({ targetChapterId: 'volume_two_chapter_8', action: 'forward_volume_boundary' }),
        16: Object.freeze({ targetChapterId: 'volume_two_chapter_8', action: 'forward_volume_boundary' }),
    });

    // 第三卷按现有 14~20 章节接入，18_nangong_return 升为核心章节，16_feiyu_return 保持卷内插章。
    const VOLUME_THREE_CHAPTERS = Object.freeze([
        {
            id: 'volume_three_chapter_1',
            title: '血色禁地',
            legacyChapterIds: Object.freeze([14]),
            volumeRole: 'opening',
            chapterGoal: '把第三卷从“试炼会改写路数”这一卷级承诺正式立起来。',
            chapterConflict: '韩立已经进场，但还没有决定自己会先保命、先认人还是先夺资源。',
            closureWrites: Object.freeze(['forbidden_ground_rules_locked', 'trial_pressure_started']),
            nextReads: Object.freeze(['nangong_first_bond', 'foundation_debt_choice']),
        },
        {
            id: 'volume_three_chapter_2',
            title: '情债与筑基',
            legacyChapterIds: Object.freeze([15]),
            volumeRole: 'escalation',
            chapterGoal: '回收禁地结果，并把筑基与情债处理方式绑成同一压力节点。',
            chapterConflict: '破境不再只是数值成长，而是你要决定如何背着这笔情债继续走。',
            closureWrites: Object.freeze(['foundation_step_completed', 'nangong_debt_mode_locked']),
            nextReads: Object.freeze(['li_lineage_pressure', 'old_friend_recall']),
        },
        {
            id: 'volume_three_chapter_3',
            title: '李化元门下',
            legacyChapterIds: Object.freeze([16]),
            volumeRole: 'bonding',
            chapterGoal: '把门墙、归属与宗门任务代价真正绑进第三卷主冲突。',
            chapterConflict: '韩立开始知道“站进门里”不是拿庇护，而是要连责任与代价一起拿。',
            closureWrites: Object.freeze(['li_lineage_entry_locked', 'sect_duty_pressure_started']),
            nextReads: Object.freeze(['yan_fort_board', 'feiyu_insert_window']),
        },
        {
            id: 'volume_three_chapter_4',
            title: '燕家堡风云',
            legacyChapterIds: Object.freeze([17]),
            volumeRole: 'reversal',
            chapterGoal: '让韩立第一次被摆上更大的势力棋盘，并感到局势正在失控。',
            chapterConflict: '家族、宗门、魔道势力已经不再允许他只按个人求生逻辑应对。',
            closureWrites: Object.freeze(['yan_fort_position_exposed', 'war_board_revealed']),
            nextReads: Object.freeze(['war_alignment_test', 'nangong_after_war']),
        },
        {
            id: 'volume_three_chapter_5',
            title: '魔道争锋',
            legacyChapterIds: Object.freeze([18]),
            volumeRole: 'climax',
            chapterGoal: '用边境大战和阵营冲突把第三卷核心矛盾真正推到台前。',
            chapterConflict: '正道 / 魔路 / 苟修不再只是路线标签，而要在生死局里给出代价。',
            closureWrites: Object.freeze(['war_route_locked', 'nangong_joint_survival_written']),
            nextReads: Object.freeze(['nangong_stage_one_settlement', 'mine_deadlock_entry']),
        },
        {
            id: 'volume_three_chapter_6',
            title: '并肩之后',
            legacyChapterIds: Object.freeze(['18_nangong_return']),
            volumeRole: 'fallout',
            chapterGoal: '清算大战之后的人情、亏欠与关系第一阶段落点。',
            chapterConflict: '南宫婉不再只是出场人物，而是终局级关系线的第一道锁点。',
            closureWrites: Object.freeze(['nangong_bond_stage_one', 'war_emotion_aftershock']),
            nextReads: Object.freeze(['mine_deadlock_entry', 'later_nangong_read']),
        },
        {
            id: 'volume_three_chapter_7',
            title: '灵矿死局',
            legacyChapterIds: Object.freeze([19]),
            volumeRole: 'closure',
            chapterGoal: '把大战后的死局、资源伦理与路线气质收成可解释状态。',
            chapterConflict: '韩立必须回答“更稳更快”和“还认不认人”到底谁排前面。',
            closureWrites: Object.freeze(['mine_deadlock_resolved', 'postwar_resource_pressure_written']),
            nextReads: Object.freeze(['star_sea_exit', 'route_identity_review']),
        },
        {
            id: 'volume_three_chapter_8',
            title: '再别天南',
            legacyChapterIds: Object.freeze([20]),
            volumeRole: 'exit',
            chapterGoal: '完成第三卷出口，并把地图外扩送到第四卷入口。',
            chapterConflict: '离开天南不是简单换地图，而是承认战争、旧债与关系已把他推到新阶段。',
            closureWrites: Object.freeze(['volume_three_exit_locked', 'star_sea_entry_confirmed']),
            nextReads: Object.freeze(['star_sea_entry', 'nangong_bond_stage_one', 'war_route_locked', 'postwar_resource_pressure']),
        },
    ]);

    // 第四卷按现有 21~23 与新增过桥章节接入，23_mocaihuan_return 升为核心章节，并把主线送往第五卷入口。
    const VOLUME_FOUR_CHAPTERS = Object.freeze([
        {
            id: 'volume_four_chapter_1',
            title: '初入星海',
            legacyChapterIds: Object.freeze([21]),
            volumeRole: 'opening',
            chapterGoal: '把第四卷从“离开天南后要靠什么在乱星海活下去”这一卷级承诺正式立起来。',
            chapterConflict: '韩立已经离开旧战场，却还没有在新的规则、资源和契约秩序里站稳脚跟。',
            closureWrites: Object.freeze(['star_sea_entry_locked', 'tiannan_left_behind']),
            nextReads: Object.freeze(['star_sea_style_seed', 'overseas_foothold_need']),
        },
        {
            id: 'volume_four_chapter_2',
            title: '海外立足',
            legacyChapterIds: Object.freeze(['21_star_sea_foothold']),
            volumeRole: 'escalation',
            chapterGoal: '把“换地图”真正落实为“换活法”，并写明星海立足的第一套方法论。',
            chapterConflict: '在更自由也更赤裸的海上，韩立要决定自己靠哪种姿态换来第一批稳固根基。',
            closureWrites: Object.freeze(['star_sea_style_locked', 'overseas_foothold_built']),
            nextReads: Object.freeze(['resource_network_entry', 'fragment_map_rumor']),
        },
        {
            id: 'volume_four_chapter_3',
            title: '虚天残图',
            legacyChapterIds: Object.freeze([22]),
            volumeRole: 'bonding',
            chapterGoal: '把新资源、新规则与新势力真正绑进第四卷主冲突。',
            chapterConflict: '残图不只是机缘，而是会让所有知道它存在的人同时变得危险的门票。',
            closureWrites: Object.freeze(['fragment_map_claimed', 'void_heaven_pressure_started']),
            nextReads: Object.freeze(['xutian_risk_spread', 'star_sea_reputation_test']),
        },
        {
            id: 'volume_four_chapter_4',
            title: '风声四起',
            legacyChapterIds: Object.freeze(['22_xutian_rumor']),
            volumeRole: 'reversal',
            chapterGoal: '让玩家意识到虚天残图真正改变的不是收益上限，而是别人如何提前定义你。',
            chapterConflict: '你还没进虚天殿，名声与风险已经先在海上扩散，连旁人的结盟都开始带着试探。',
            closureWrites: Object.freeze(['xutian_position_exposed', 'star_sea_reputation_written']),
            nextReads: Object.freeze(['void_heaven_entry', 'alliance_pressure']),
        },
        {
            id: 'volume_four_chapter_5',
            title: '虚天殿前后',
            legacyChapterIds: Object.freeze([23]),
            volumeRole: 'climax',
            chapterGoal: '用虚天殿的结盟、夺宝、退路与翻脸，把第四卷核心矛盾真正推到台前。',
            chapterConflict: '真正的考验不是谁修为更高，而是宝物、退路和同盟只能保一部分时，你会不会先把人当代价。',
            closureWrites: Object.freeze(['void_heaven_route_locked', 'alliance_choice_written']),
            nextReads: Object.freeze(['nangong_stage_two_settlement', 'old_debt_return_window']),
        },
        {
            id: 'volume_four_chapter_6',
            title: '并肩余波',
            legacyChapterIds: Object.freeze(['23_star_sea_aftermath']),
            volumeRole: 'fallout',
            chapterGoal: '清算虚天殿之后的人情、旧盟、声名与南宫婉线第二阶段落点。',
            chapterConflict: '南宫婉不再只是大战后的第一阶段回响，而是要在更高层级里重新确认你们是否还会站到一起。',
            closureWrites: Object.freeze(['nangong_bond_stage_two', 'star_sea_aftershock_written']),
            nextReads: Object.freeze(['mocaihuan_return_window', 'tiannan_return_pressure']),
        },
        {
            id: 'volume_four_chapter_7',
            title: '来信与重访',
            legacyChapterIds: Object.freeze(['23_mocaihuan_return']),
            volumeRole: 'closure',
            chapterGoal: '把凡俗旧账、墨彩环、旧盟关系与“你不在时别人如何过完这些年”收成可解释状态。',
            chapterConflict: '韩立要回答自己究竟是重新把旧账接回手里，还是只确认旧人安好后继续离开。',
            closureWrites: Object.freeze(['mocaihuan_debt_reframed', 'old_world_cost_acknowledged']),
            nextReads: Object.freeze(['star_sea_exit_review', 'return_home_trigger']),
        },
        {
            id: 'volume_four_chapter_8',
            title: '星海余波',
            legacyChapterIds: Object.freeze(['23_volume_close']),
            volumeRole: 'exit',
            chapterGoal: '完成第四卷出口，并把声名、旧盟、归乡压力和第五卷入口写清楚。',
            chapterConflict: '走到这里，真正逼你回头的已不是怀旧，而是星海留下的名声、债与必须回应的旧关系。',
            closureWrites: Object.freeze(['volume_four_exit_locked', 'tiannan_return_pressure_written']),
            nextReads: Object.freeze(['tiannan_return_pressure', 'nangong_bond_stage_two', 'star_sea_reputation_fixed', 'old_world_cost_acknowledged']),
        },
    ]);

    const VOLUME_FOUR_LEGACY_CHAPTER_MAP = Object.freeze({
        21: Object.freeze({ targetChapterId: 'volume_four_chapter_1', action: 'keep_main' }),
        22: Object.freeze({ targetChapterId: 'volume_four_chapter_3', action: 'keep_main' }),
        23: Object.freeze({ targetChapterId: 'volume_four_chapter_5', action: 'keep_main' }),
        '23_mocaihuan_return': Object.freeze({ targetChapterId: 'volume_four_chapter_7', action: 'promote_to_main' }),
        24: Object.freeze({ targetChapterId: 'volume_four_chapter_8', action: 'forward_volume_boundary' }),
        25: Object.freeze({ targetChapterId: 'volume_four_chapter_8', action: 'forward_volume_boundary' }),
    });

    // 第五卷按现有 24/25 与新增过桥章节接入，25 改为飞升前夜，终局分流单独成章。
    const VOLUME_FIVE_CHAPTERS = Object.freeze([
        {
            id: 'volume_five_chapter_1',
            title: '重返天南',
            legacyChapterIds: Object.freeze([24]),
            volumeRole: 'opening',
            chapterGoal: '把第五卷从“回头认账、认人、认自己”这一卷级承诺正式立起来。',
            chapterConflict: '韩立回到旧地后必须面对那些一直没有真正处理完的人、账与名字；真正的问题不是怀旧，而是认账。',
            closureWrites: Object.freeze(['tiannan_return_locked', 'volume_five_promise_written']),
            nextReads: Object.freeze(['old_debt_choice_window', 'bond_destination_window']),
        },
        {
            id: 'volume_five_chapter_2',
            title: '旧账与旧名',
            legacyChapterIds: Object.freeze(['24_old_debt_and_name']),
            volumeRole: 'escalation',
            chapterGoal: '把墨府旧债、黄枫谷门墙、旧敌与旧承诺真正收成可审计状态。',
            chapterConflict: '韩立要回答自己这些年到底补没补、认没认、躲没躲；旧账不能再继续被压成背景底色。',
            closureWrites: Object.freeze(['old_debts_accounted', 'old_name_disposition_written']),
            nextReads: Object.freeze(['mocaihuan_final_read', 'ascension_eve_route_review']),
        },
        {
            id: 'volume_five_chapter_3',
            title: '旧情去处',
            legacyChapterIds: Object.freeze(['24_bond_destination']),
            volumeRole: 'bonding',
            chapterGoal: '让南宫婉线、墨彩环线与旧人物回流在终局前完成最后一轮承接。',
            chapterConflict: '有些情已认下，有些仍被韩立拖成沉默，有些已经迟了；这一章必须把“谁被留下、谁被错过”写清。',
            closureWrites: Object.freeze(['bond_destination_locked', 'nangong_final_relation_written']),
            nextReads: Object.freeze(['ascension_eve_bond_review', 'terminal_ending_candidates']),
        },
        {
            id: 'volume_five_chapter_4',
            title: '飞升前夜',
            legacyChapterIds: Object.freeze([25]),
            volumeRole: 'closure',
            chapterGoal: '让韩立回看一路留下的人与物，并把路线、关系、旧账与关键旗标收成终局候选。',
            chapterConflict: '飞升不该再只是数值达标后的固定菜单，而应是对一生选择的最后回答。',
            closureWrites: Object.freeze(['ascension_attitude_locked', 'terminal_review_written']),
            nextReads: Object.freeze(['terminal_ending_candidates', 'abnormal_failure_check']),
        },
        {
            id: 'volume_five_chapter_5',
            title: '门前问心',
            legacyChapterIds: Object.freeze(['25_final_branch']),
            volumeRole: 'ending',
            chapterGoal: '在这里正式进入五条主终局，并清楚划出异常失败终局边界。',
            chapterConflict: '韩立不可能同时拥有所有答案；系统必须根据长期路线、关系、旧账与失败压力，给出真正属于他的终局。',
            closureWrites: Object.freeze(['volume_five_finished', 'ending_committed']),
            nextReads: Object.freeze([]),
        },
    ]);

    const VOLUME_FIVE_LEGACY_CHAPTER_MAP = Object.freeze({
        24: Object.freeze({ targetChapterId: 'volume_five_chapter_1', action: 'keep_main' }),
        '24_old_debt_and_name': Object.freeze({ targetChapterId: 'volume_five_chapter_2', action: 'expand_main' }),
        '24_bond_destination': Object.freeze({ targetChapterId: 'volume_five_chapter_3', action: 'expand_main' }),
        25: Object.freeze({ targetChapterId: 'volume_five_chapter_4', action: 'reframe_runtime_material' }),
        '25_final_branch': Object.freeze({ targetChapterId: 'volume_five_chapter_5', action: 'expand_main' }),
    });

    function hasVolumeFiveNangongBond(state) {
        const flags = state?.flags || {};
        const relationNangong = state?.npcRelations?.['南宫婉'] || 0;
        return relationNangong >= 60
            || flags.savedNangong
            || flags.acceptedNangongHelp
            || flags.acceptedNangongDebt
            || flags.acceptedNangongPath
            || flags.openlyAcknowledgedNangongImportance
            || flags.volumeFiveBondTarget === 'nangong';
    }

    function hasVolumeFiveMocaihuanBond(state) {
        const flags = state?.flags || {};
        const relationMo = state?.npcRelations?.['墨彩环'] || 0;
        return relationMo >= 45
            || flags.daoLvPromise
            || flags.mendedMoHouseDebt
            || flags.returnedToMoHouse
            || flags.madeAmendsToMocaihuan
            || flags.admittedOldWrongToMocaihuan
            || flags.volumeFiveBondTarget === 'mocaihuan';
    }

    function createVolumeFiveEndingChoice(id, text, ending, effects) {
        return {
            id,
            text,
            effects,
            ending,
            nextChapterId: -1,
        };
    }

    // 第五卷终局必须把“认账 / 认人 / 认自己”拆开结算，避免又退回旧的临时结局菜单。
    function buildVolumeFiveFinalChoices(state) {
        const flags = state?.flags || {};
        const routes = state?.routeScores || {};
        const relationNangong = state?.npcRelations?.['南宫婉'] || 0;
        const relationMo = state?.npcRelations?.['墨彩环'] || 0;
        const nangongBond = hasVolumeFiveNangongBond(state);
        const mocaihuanBond = hasVolumeFiveMocaihuanBond(state);
        const oldDebtSettled = Boolean(flags.oldDebtsCleared || flags.volumeFiveOldDebtMode === 'settled');
        const sharedDaoReady = flags.volumeFiveBondTarget === 'nangong'
            && flags.volumeFiveAscensionAttitude === 'shared'
            && relationNangong >= 95
            && !flags.cutEmotion;
        const delayedAscensionReady = flags.volumeFiveBondTarget === 'nangong'
            && flags.volumeFiveAscensionAttitude === 'delay'
            && relationNangong >= 80;
        const redDustReady = flags.volumeFiveBondTarget === 'nangong'
            && flags.volumeFiveAscensionAttitude === 'stay'
            && relationNangong >= 80;
        const lonelyDaoReady = nangongBond
            && (flags.volumeFiveAscensionAttitude === 'alone'
                || flags.volumeFiveBondTarget === 'distance'
                || flags.continuedToOweNangongSilently
                || flags.suppressedNangongFeelings
                || flags.cutEmotion);
        const mortalFarewellReady = flags.volumeFiveBondTarget === 'mocaihuan'
            && mocaihuanBond
            && oldDebtSettled;
        const choices = [];

        if (redDustReady) {
            choices.push(createVolumeFiveEndingChoice(
                'youxi_hongchen',
                '背对天门，先陪她把人间走完',
                {
                    id: 'youxi_hongchen',
                    title: '游戏红尘',
                    description: '当飞升天门洞开，你最终没有与南宫婉一同迈入更高处，而是背对天门，留在人间。你第一次不再害怕停下，也第一次觉得守住一个人，比继续独自往上更有意义。',
                },
                {
                    cultivation: 3600,
                    routeScores: { orthodox: 1 },
                    flags: { stayedInMortalWorld: true, choseGameOfRedDust: true, postponedAscension: true },
                },
            ));
        }

        if (sharedDaoReady) {
            choices.push(createVolumeFiveEndingChoice(
                'dadao_tongguang',
                '与南宫婉并肩渡劫，把大道走成两个人的路',
                {
                    id: 'dadao_tongguang',
                    title: '大道同光',
                    description: '雷光压到肩头时，你与南宫婉背贴着背把最后一重天劫扛了过去。门开那一瞬，你第一次觉得大道也会给并肩的人让路。',
                },
                {
                    cultivation: 5200,
                    routeScores: { orthodox: 1 },
                    flags: { ascendedToSpiritWorld: true, ascendedWithNangong: true, choseSharedDaoWithNangong: true },
                },
            ));
        }

        if (delayedAscensionReady) {
            choices.push(createVolumeFiveEndingChoice(
                'chidu_qingtian',
                '先把她送上去，赌她终会回身渡我',
                {
                    id: 'chidu_qingtian',
                    title: '迟渡情天',
                    description: '飞升通道开启时，你先把南宫婉送上灵界，自己却被留在人间。你原以为从此天人永隔，后来她却在上界回身劈开天门，把你重新渡了上去。这一场豪赌，终于得到了回答。',
                },
                {
                    cultivation: 5000,
                    routeScores: { orthodox: 1, secluded: 1 },
                    flags: { ascendedToSpiritWorld: true, delayedAscensionFulfilled: true, sentNangongAhead: true },
                },
            ));
        }

        if (mortalFarewellReady) {
            choices.push(createVolumeFiveEndingChoice(
                'xianfan_shutu',
                '认下那份来得太晚的凡心，再独自上路',
                {
                    id: 'xianfan_shutu',
                    title: '仙凡殊途',
                    description: '嘉元城灯火还在，墨彩环也站在旧门前。你把迟到太久的话说完，终究还是各自转身，只把那点最晚醒来的凡心带上了天路。',
                },
                {
                    cultivation: 4700,
                    routeScores: { orthodox: 1 },
                    flags: { ascendedToSpiritWorld: true, acceptedMortalFarewell: true, mortalOldDebtSettledAtLast: true },
                },
            ));
        }

        if (lonelyDaoReady) {
            choices.push(createVolumeFiveEndingChoice(
                'zhiying_xiangdao',
                '独自推门，让那句“以后再说”真的迟到尽头',
                {
                    id: 'zhiying_xiangdao',
                    title: '只影向道',
                    description: '门开时你身边没有第二个人。风从袖口一直灌到心口，你才听清那些年总被你按下去的话，终究还是没人替你补上。',
                },
                {
                    cultivation: 4900,
                    routeScores: { secluded: 1 },
                    flags: { ascendedToSpiritWorld: true, walkedDaoAlone: true, missedNangongByDelay: true },
                },
            ));
        }

        if (choices.length > 0) {
            return choices;
        }

        if (mortalFarewellReady || (mocaihuanBond && oldDebtSettled && relationMo >= 35)) {
            return [createVolumeFiveEndingChoice(
                'xianfan_shutu',
                '认下那份来得太晚的凡心，再独自上路',
                {
                    id: 'xianfan_shutu',
                    title: '仙凡殊途',
                    description: '嘉元城灯火还在，墨彩环也站在旧门前。你把迟到太久的话说完，终究还是各自转身，只把那点最晚醒来的凡心带上了天路。',
                },
                {
                    cultivation: 4700,
                    routeScores: { orthodox: 1 },
                    flags: { ascendedToSpiritWorld: true, acceptedMortalFarewell: true, mortalOldDebtSettledAtLast: true },
                },
            )];
        }

        if (sharedDaoReady || (nangongBond && flags.volumeFiveAscensionAttitude === 'shared' && relationNangong >= 75)) {
            return [createVolumeFiveEndingChoice(
                'dadao_tongguang',
                '与南宫婉并肩渡劫，把大道走成两个人的路',
                {
                    id: 'dadao_tongguang',
                    title: '大道同光',
                    description: '雷光压到肩头时，你与南宫婉背贴着背把最后一重天劫扛了过去。门开那一瞬，你第一次觉得大道也会给并肩的人让路。',
                },
                {
                    cultivation: 5200,
                    routeScores: { orthodox: 1 },
                    flags: { ascendedToSpiritWorld: true, ascendedWithNangong: true, choseSharedDaoWithNangong: true },
                },
            )];
        }

        if (delayedAscensionReady || (nangongBond && flags.volumeFiveAscensionAttitude === 'delay')) {
            return [createVolumeFiveEndingChoice(
                'chidu_qingtian',
                '先把她送上去，赌她终会回身渡我',
                {
                    id: 'chidu_qingtian',
                    title: '迟渡情天',
                    description: '你第一次连算都没算，先把生路让给了她，而她后来也用回身相渡证明这场豪赌值得。',
                },
                {
                    cultivation: 5000,
                    routeScores: { orthodox: 1, secluded: 1 },
                    flags: { ascendedToSpiritWorld: true, delayedAscensionFulfilled: true, sentNangongAhead: true },
                },
            )];
        }

        if (redDustReady || (nangongBond && flags.volumeFiveAscensionAttitude === 'stay' && relationNangong >= 60)) {
            return [createVolumeFiveEndingChoice(
                'youxi_hongchen',
                '背对天门，先陪她把人间走完',
                {
                    id: 'youxi_hongchen',
                    title: '游戏红尘',
                    description: '你第一次不再害怕停下，也第一次觉得守住一个人，比继续独自往上更有意义。',
                },
                {
                    cultivation: 3600,
                    routeScores: { orthodox: 1 },
                    flags: { stayedInMortalWorld: true, choseGameOfRedDust: true, postponedAscension: true },
                },
            )];
        }

        return [createVolumeFiveEndingChoice(
            'zhiying_xiangdao',
            '独自推门，让那句“以后再说”真的迟到尽头',
            {
                id: 'zhiying_xiangdao',
                title: '只影向道',
                description: '门开时你身边没有第二个人。风从袖口一直灌到心口，你才听清那些年总被你按下去的话，终究还是没人替你补上。',
            },
            {
                cultivation: 4900,
                routeScores: { secluded: 1 },
                flags: { ascendedToSpiritWorld: true, walkedDaoAlone: true, missedNangongByDelay: true },
            },
        )];
    }

    const CHAPTER_ECHO_PACKS = {
        8: {
            protect_mo_house: {
                immediate: { title: '墨府回响', detail: '你离开时，院中的灯没有立刻熄。那点光不算明亮，却像一笔你已经答应接下的活人账。' },
                delayed: { title: '墨府余灯', detail: '后来你再想起墨府时，先记住的不是死人，而是那句“你若想补，就别只补给自己看”。', npc: '墨彩环' },
                npcComment: { '墨彩环': { high: '你那次回来，至少没把我们也当成随手能丢的尾巴。', neutral: '你帮过，但也只是帮过。凡人的日子，终究还是得凡人自己过。', low: '你回来那一趟，更像是在替自己求心安。' } },
            },
            take_treasure_leave: {
                immediate: { title: '卷财离场', detail: '你带走了最值钱的东西，也把墨府最后一点还能相信你的理由一起带走了。' },
                delayed: { title: '宅门旧刺', detail: '日后每当你再看见墨府旧物，心里先浮起来的不是赚到多少，而是那天屋里压着怒气却连哭都没哭出来的安静。', npc: '墨彩环' },
                npcComment: { '墨彩环': { neutral: '我后来想明白了。修仙的人离开时，最会把拿走说成“减灾”。' } },
            },
            promise_caihuan: {
                immediate: { title: '留下承诺', detail: '你没有立刻补上这笔账，可从开口那一刻起，这就不再是“以后再说”，而是迟早要回来面对的事。' },
                delayed: { title: '一句未完', detail: '有些承诺最重，不是因为说得郑重，而是对方没有逼你发誓，却仍记住了。', npc: '墨彩环' },
                npcComment: { '墨彩环': { high: '你来得晚，但总算不是没来。', low: '我那时候就知道，修仙的人最喜欢把“回来”说得像明天。' } },
            },
        },
        9: {
            take_quhun: {
                immediate: { title: '曲魂在侧', detail: '你把一件可怕的东西留在了身边。从这天起，你越来越会把危险变成自己的力量。' },
                delayed: { title: '曲魂停顿', detail: '后来再驱使曲魂时，你偶尔会想起那一点像人的停顿。那念头很短，却足够让你知道，自己并非全然无感。', npc: '曲魂' },
                npcComment: { '墨彩环': { neutral: '你是留了它，也还是留了你自己的一道线。只是我不知道，那线以后会不会越来越淡。' } },
            },
            repair_quhun: {
                immediate: { title: '曲魂在侧', detail: '你把曲魂留在身边，却没把它只当工具。这会让你以后很难再把“用人”两个字说得太轻。' },
                delayed: { title: '曲魂余念', detail: '你没有把曲魂只当兵器。之后每逢再见傀儡、尸炼、禁魂之物，都会比旁人多停一息。', npc: '曲魂' },
                npcComment: { '墨彩环': { high: '你留了它，却没把它彻底留成死物。这一点，我记得。', neutral: '你若真记得它也曾像个人，就别只在好用的时候想起这件事。' } },
            },
            release_quhun: {
                immediate: { title: '超度曲魂', detail: '法火烧起来时，屋中像忽然轻了一点。你失去了一件好用的工具，却保住了一种还能直视自己的可能。' },
                delayed: { title: '火后余白', detail: '此后每逢再见傀儡、尸炼、禁魂之物，你都会比旁人多停一息。那一息很短，却是你没彻底滑下去的证据。', npc: '曲魂' },
                npcComment: { '墨彩环': { neutral: '那时我才第一次觉得，你还没有被这条路吃干净。' } },
            },
            buy_back_trust: {
                immediate: { title: '先把债压住', detail: '你没有立刻带走曲魂，也没有替这件事下最终判决。很多时候，暂时不判，并不代表迟早能避开。' },
                delayed: { title: '封存之问', detail: '后来你明白，真正被封住的从来不是曲魂，而是你一时不愿回答的那个问题。', npc: '墨彩环' },
                npcComment: { '墨彩环': { neutral: '你没急着伸手，这件事我记着。只是有些问题，不会因为先放着就自己散掉。' } },
            },
        },
        14: {
            save_nangong: {
                immediate: { title: '禁地回身', detail: '你慢了半息，却也正是这半息，让你以后再想起禁地时，至少还能认得那时的自己。' },
                delayed: { title: '禁地留名', detail: '禁地之后，很多人记住的不是你拿了什么，而是有人在最乱的时候，真回过头。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你那时救人，不是为了给谁看。', neutral: '禁地里肯回头的人不多，这件事我记得。' } },
            },
            watch_and_wait: {
                immediate: { title: '避开杀圈', detail: '你活得最稳，也看得最清。最稳的路，往往也最孤。' },
                delayed: { title: '退路先成', detail: '禁地这件事以后，你开始更相信退路，也开始更少期待别人会在关键时刻替你回头。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你不是胆小，你只是太早学会了，不把自己放到别人的选择里。' } },
            },
            loot_in_chaos: {
                immediate: { title: '主药先手', detail: '主药入手时，你先想到的不是喜悦，而是以后再遇上类似的局，你会不会越来越快。' },
                delayed: { title: '高效之险', detail: '那是你第一次真正尝到“先下手清场”有多高效。也正因如此，它才危险。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你那时很清楚自己在做什么。比犹豫的人更可怕。' } },
            },
            kill_for_gain: {
                immediate: { title: '主药先手', detail: '你把更狠的那一步也一起跨过去了。最先留下的，不是喜悦，而是你已经知道自己会越来越快。' },
                delayed: { title: '高效成瘾', detail: '你第一次真正把“先下手清场”当成了路数。越高效，越危险。', npc: '南宫婉' },
                npcComment: { '南宫婉': { low: '你那时不是没得选，你只是选了更快的那条。', neutral: '你那时很清楚自己在做什么。比犹豫的人更可怕。' } },
            },
        },
        15: {
            accept_nangong_debt: {
                immediate: { title: '认下情债', detail: '你并没有因此变弱。只是从这一刻起，你往后很多决定都不能再只按“值不值”来算。' },
                delayed: { title: '有人算进未来', detail: '有人不是你的拖累，也不是你的工具，而是你一旦认了，就必须把她算进未来的人。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你若真记得，不必总说出来。', neutral: '你既认了，就别再把这笔账说成一时路过。' } },
            },
            suppress_nangong_feelings: {
                immediate: { title: '压住心绪', detail: '你把那点心绪压了下去，手很稳。可真正难的不是压住，而是压久了以后，会不会连自己都信了那不重要。' },
                delayed: { title: '压久成影', detail: '后来每次见她，你都比平时更像无事发生。也正因为太像，才更显得那不是自然，而是刻意。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你最会的从来不是无情，是装作不必回应。' } },
            },
            cut_nangong_ties: {
                immediate: { title: '斩情求稳', detail: '你想把一切切得干净，可真正难斩的是已经进过心的那一瞬。' },
                delayed: { title: '记忆未断', detail: '往后只要她再出现一次，你就会知道自己那时斩掉的，未必是情，更可能只是想把“被牵住”的可能提前掐死。', npc: '南宫婉' },
                npcComment: { '南宫婉': { low: '你不是果断，你只是怕。', neutral: '你斩得很快，只是未必真斩干净。' } },
            },
        },
        16: {
            become_li_disciple: {
                immediate: { title: '正式入门', detail: '令牌入手那一刻，你得到的不只是庇护。你也第一次真正站进了某个秩序里。' },
                delayed: { title: '门墙在身', detail: '往后每当你借到师门之势时，都会想起这点: 宗门给你的，从来不是白给。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '入我门下，不是叫你更像我，是叫你别活成一块只会避祸的石头。' } },
            },
            keep_free: {
                immediate: { title: '受教而留步', detail: '你既想听明白局势，也想留好退路。这没有错，只是从今以后，别人很难彻底把后背交给你。' },
                delayed: { title: '独立有价', detail: '独立不是不站队，而是每一次不彻底站进去，都得自己补足代价。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '会给自己留退路的人，往往活得久；可太会留退路，也会让人不敢全信。' } },
            },
            learn_in_secret: {
                immediate: { title: '借势而行', detail: '你做了最现实的选择。这能让你走得快，也会让真正看得懂局的人更早防你。' },
                delayed: { title: '归属成筹码', detail: '别人说你“会做人”时，你知道那不是夸你温和，而是说你连归属都能算成筹码。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你脑子够用，只是有时太把自己放在最后一道门里。' } },
            },
        },
        17: {
            stay_quiet_banquet: {
                immediate: { title: '席间观局', detail: '你没在桌上替谁开口，却也因此让更多人记住: 你不是那种能被一句话拖下场的人。' },
                delayed: { title: '笑里先看座次', detail: '此后再入类似场合，你会本能先看座次、酒次、谁先笑、谁后答。你开始懂得，修仙界有些杀机从不带血。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你不是不会说话，你只是终于知道，太早开口和把脖子先递上去没什么差别。' } },
            },
            show_strength_banquet: {
                immediate: { title: '席上立威', detail: '你把场面压住了，也把很多人的记恨一起压进了心里。' },
                delayed: { title: '威与债一起留下', detail: '后来每逢局面发烂，总会有人先想到你是不是又要直接掀桌。这既是威，也是债。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '该压的时候能压，算个人物。只是压住一桌人，往往也会把记恨一起压出来。' } },
            },
            trade_favors_banquet: {
                immediate: { title: '桌下结线', detail: '你没有赢一夜的风头，却可能赢了很多以后才会显出用处的门路。' },
                delayed: { title: '门路比风头久', detail: '许多后来避开的坑、谈成的合作，都能追溯到这晚你没有只看眼前场面的那点耐心。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你倒是真把那点权势场的门道听进去了。' } },
            },
        },
        18: {
            fight_for_sect: {
                immediate: { title: '护住阵线', detail: '你不是不怕死，只是最后没有让“我能活”压过“他们会死”。' },
                delayed: { title: '可靠二字', detail: '大战之后，有人提你，先说“可靠”；这两个字听上去简单，背后却是拿命换来的。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你终于不像只会替自己活。' } },
            },
            defect_demonic: {
                immediate: { title: '斩敌夺势', detail: '你下手太快，快到连自己都来不及多想。那一刻你便知道，往后若再举刀，自己也得先提防心里那股越来越利的冷意。' },
                delayed: { title: '底线后移', detail: '只要再遇见失去反抗能力的敌人，你都会清楚记得: 第一次跨过去以后，后面会越来越容易。', npc: '南宫婉' },
                npcComment: { '南宫婉': { low: '你不是比以前更会活了，你只是更早决定谁该被留在后面。', neutral: '你那时快得太干净，连借口都没给自己留。' }, '李化元': { low: '你走得更快了，也把“门里的人”和“能拿来换位子的人”算得越来越像。' } },
            },
            fake_fight: {
                immediate: { title: '只带少数人走', detail: '你没替宗门补完那道裂口。可你救下的那些人，会比任何阵亡名册都更具体地记住你。' },
                delayed: { title: '少数人的活路', detail: '你不是愿为所有人负责的人。可对少数认定的人，你会真带他们活着出去。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你没替所有人扛下去，可你也不是只顾自己的人。' }, '李化元': { neutral: '你给少数人留了活路，宗门未必满意，但活下来的人会记得。' } },
            },
        },
        19: {
            hold_the_line: {
                immediate: { title: '死守矿线', detail: '你撑住了场面，也把更多人的生死一起压到了自己肩上。' },
                delayed: { title: '一句话压着人命', detail: '后来你总会想起那种感觉: 一句话出口，别人是真的会拿命照做。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '矿脉死局里你没先跑，这才像真正懂了门里为什么要筑基修士。' } },
            },
            lead_breakout: {
                immediate: { title: '带队突围', detail: '你放弃了死守，也放弃了体面上的全赢。可你第一次真正明白，带人活出来，本身就是一种很重的本事。' },
                delayed: { title: '生路也算本事', detail: '你往后会越来越擅长判断: 什么时候继续顶只是在给死人凑数，什么时候退一步反而是对活人负责。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你带人活出来了。矿丢不丢是一回事，知道什么时候该先把活人带出去，是另一回事。' } },
            },
            rescue_rearguard: {
                immediate: { title: '回身接人', detail: '你没有把所有人都带出来，却把最后一段最容易被放弃的人命也扛进了自己的账里。' },
                delayed: { title: '最后一段人命', detail: '回头接应的那一步，会让很多旧人后来更愿意把命押在你身上。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '灵矿那次你肯回头接人，这才像真正懂了“门里为什么要筑基修士”。' } },
            },
            sabotage_and_leave: {
                immediate: { title: '炸路脱身', detail: '你做的是能保自己脱身的干净选择。可真正拖住你的，是那些你明知来得及多做一点、却还是转身了的瞬间。' },
                delayed: { title: '活路不回头', detail: '你后来越走越稳，也越清楚自己那时切断的，不只是追兵，还有“我还能再多扛一点”的可能。', npc: '李化元' },
                npcComment: { '李化元': { low: '你给自己留了活路，也把“回头接人”这件事一并炸断了。' } },
            },
            escape_alone: {
                immediate: { title: '自保脱身', detail: '你做的是最干净利落的选择。可真正拖住你的，是那些你明知来得及多做一点、却还是转身了的瞬间。' },
                delayed: { title: '矿道背影', detail: '很多年后你未必还记得带出来了什么，却会记得矿道里那几道没来得及跟上的身影。', npc: '李化元' },
                npcComment: { '李化元': { low: '你活下来了，可门里未必要这种只顾自己先出矿的人。' } },
            },
            open_mine_gate: {
                immediate: { title: '开门换位', detail: '你把最冷的一步走成了现实。真正留下的，不是矿门开没开，而是你已经知道自己肯把谁拿去换更高的位置。' },
                delayed: { title: '矿门改色', detail: '后来你再怎么解释利害与大势，这件事都会先一步替别人定义你肯把谁当代价。', npc: '李化元' },
                npcComment: { '李化元': { low: '门墙可以容你借势，容不了你拿同门去换自己的位子。' } },
            },
            harvest_chaos: {
                immediate: { title: '死局收割', detail: '你在最乱的时候先看见了还能拿走什么。那一刻你已经知道，自己越来越像会把尸骨也折成台阶的人。' },
                delayed: { title: '冷收益', detail: '你已经证明过，最乱的时候你也能先看见可拿走什么。', npc: '李化元' },
                npcComment: { '李化元': { low: '你在死局里先看见了资源，这种眼力有用，也最让人心寒。' } },
            },
        },
        21: {
            hunt_monsters: {
                immediate: { title: '猎妖立足', detail: '海上的第一课不是变强，而是知道每次出手都真可能把命丢在水里。' },
                delayed: { title: '海上先活', detail: '后来你闻见海腥味，第一反应不再是远行，而是风向、妖潮、退路和能不能赚到这一趟。', npc: '万小山' },
            },
            run_trade: {
                immediate: { title: '跑商摸路', detail: '你没有第一时间去抢最凶的活，却更早学会了什么该碰，什么连看都别多看。' },
                delayed: { title: '风向先清', detail: '往后很多次避祸、寻路、先人一步，都不是靠运气，而是靠你在最开始愿意先把规则摸明白。', npc: '万小山' },
            },
            seek_cave: {
                immediate: { title: '闭关隐修', detail: '你拒绝了海上的喧哗。这让你错过很多，也保住了很多，尤其是在新地方最容易乱掉的心。' },
                delayed: { title: '先把自己站稳', detail: '别人都说你太稳。只有你自己知道，那时不是稳，是不想刚到新地便被人牵着走。', npc: '万小山' },
            },
        },
        '21_star_sea_foothold': {
            claim_hunter_route: {
                immediate: { title: '猎路成型', detail: '你先把最危险也最直接的路走熟了。星海会记住你不是靠旧名头立足，而是靠敢不敢先拿命去换站位。' },
                delayed: { title: '先拿命换根基', detail: '你后来越来越明白，猎路最贵的不是妖丹，而是别人会不会相信你到了最险的时候还能顶住。', npc: '万小山' },
            },
            build_trade_route: {
                immediate: { title: '货路成型', detail: '你没有急着闯最凶的风口，而是先把货路、价码和谁会临时翻脸摸清。' },
                delayed: { title: '先把账站稳', detail: '此后你再接大机缘前，往往都会先算消息、契约和谁最可能临时改口。', npc: '万小山' },
            },
            secure_hidden_cave: {
                immediate: { title: '洞府立住', detail: '你先把能退、能藏、能补给的地方握在手里。海上很多看似从容的局，都是靠这种先站稳换来的。' },
                delayed: { title: '先留退路', detail: '后来你再进更大的局，总会下意识先找能不能退、退去哪里、退完还剩什么。', npc: '万小山' },
            },
        },
        22: {
            collect_map: {
                immediate: { title: '亲自争图', detail: '你不是拿到了一张图，而是亲手把自己放进了一个知道太多就很难善终的局。' },
                delayed: { title: '知道也是代价', detail: '此后只要有人笑着来谈交易，你都会先想: 他到底是来买图，还是来确认该不该杀我。', npc: '万小山' },
            },
            sell_map: {
                immediate: { title: '卖图兑现', detail: '你把危险换成了资源。账面上这是赚，心里却未必真轻。' },
                delayed: { title: '危险换了主人', detail: '后来每当你花掉那笔换来的资源，总会短短地想一下: 危险只是换了个主人。', npc: '万小山' },
            },
            avoid_map: {
                immediate: { title: '主动避局', detail: '你亲手放过了一扇很可能一生只开一次的门。能做到这一步的人不多。' },
                delayed: { title: '收手知重', detail: '你会更清楚自己到底是哪类修士: 不是看见机缘就扑上去的人，而是能忍住不让“可能更高”把自己拖进必死局的人。', npc: '万小山' },
            },
        },
        '22_xutian_rumor': {
            hide_map_trace: {
                immediate: { title: '把风声压住', detail: '你没有急着抢下一口机缘，而是先让自己的名字不要在海上亮得太快。' },
                delayed: { title: '先让名字不亮', detail: '后来你越进危险局，越知道很多人不是死在不知道，而是死在太早被所有人知道。', npc: '万小山' },
            },
            trade_on_rumors: {
                immediate: { title: '拿风声换筹码', detail: '你把风声也算进了买卖。海上的消息并不会因为你卖得漂亮就变得干净，它只会换一种方式回来认你。' },
                delayed: { title: '消息也会反咬', detail: '往后只要你试着把局势折成筹码，心里都会先响起这一句: 风声出去之后，也会回来找人。', npc: '万小山' },
            },
            bind_allies_before_entering: {
                immediate: { title: '先把盟友绑住', detail: '你知道真正危险的不是图，而是图一露面后每个人都可能瞬间改口，所以你先试着把能同行的人绑住。' },
                delayed: { title: '有人得先认', detail: '你后来越来越清楚，有些大局不是靠谁最狠，而是靠谁肯在翻脸前先认下“我们到底算不算同一边”。', npc: '南宫婉' },
            },
        },
        23: {
            grab_treasure: {
                immediate: { title: '抢先夺宝', detail: '你先动了。那一刻所有还在维持的表面合作都被你一把撕开。' },
                delayed: { title: '先伸手的人', detail: '以后别人提起你在星海的名声时，会先记住一件事: 你在最关键的时候，永远不等别人先伸手。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你先伸手夺宝那一下，倒比你平日的推托更诚实。' } },
            },
            cooperate_allies: {
                immediate: { title: '稳住同盟', detail: '你没有拿最先那一下，却把一群原本很容易散掉的人重新拉在了一起。' },
                delayed: { title: '宝与命先看命', detail: '在宝和命摆在一处时，你没有先选宝。活下来的人会记得这个。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '那种时候还肯回头的人，不多。', neutral: '你没先选宝，这种事在乱星海比情话更值钱。' } },
            },
            pull_ally_out: {
                immediate: { title: '接应后退', detail: '你没有冲进最亮的宝光里，而是把能救的人先接出来。' },
                delayed: { title: '裂隙边回头', detail: '你不是愿为所有人负责的人。可对少数认定的人，你会真把他们带离最窄的裂隙。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你既然都在殿外回过头，就别再装作自己什么人都不想认。' } },
            },
            watch_last: {
                immediate: { title: '观望后动', detail: '你让别人先暴露，自己再找最优位。这很聪明，也让活下来的人以后都更难彻底信你。' },
                delayed: { title: '等得越准越冷', detail: '你越来越擅长等。只是等得越准，有时也越容易把自己等成别人眼里最冷的那种人。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你总爱等别人先露底。只是虚天殿那次，旁人也把你的冷眼一起记住了。' } },
            },
            sell_route_info: {
                immediate: { title: '再卖一手', detail: '你没有拿最亮的那口宝，却把风暴也做成了买卖。聪明是真的，冷也是真的。' },
                delayed: { title: '风暴也是货', detail: '很多人以后提起你时，不会先说你胆大，而会说你连一场大机缘都能拆成消息差去赚第二遍。', npc: '万小山' },
            },
            slip_past_palace: {
                immediate: { title: '悄然退场', detail: '你绕开了最亮也最窄的那一口气。多数人不是死在争，而是死在舍不得不争。' },
                delayed: { title: '避开传说', detail: '活下来的人未必看得懂你，但会先记住一件事: 你在最容易把命补进传说的时候，先把自己抽了出来。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你绕殿而走那一步很稳，也让人更难看清你心里究竟还留没留别人。' } },
            },
        },
        '23_star_sea_aftermath': {
            honor_alliance_after_palace: {
                immediate: { title: '殿后认人', detail: '你没有把虚天殿只当成一次夺宝，而是把一起活出来的人也真正认进了后果里。' },
                delayed: { title: '并肩不只一次', detail: '很多关系真正重，不是因为并肩过一次，而是那次过后你还肯继续认。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你若真认这层并肩，就别只在最险的时候回头。', neutral: '虚天之后你没再装作什么都没发生，这比许多漂亮话更值钱。' } },
            },
            settle_reputation_with_profit: {
                immediate: { title: '把名声折现', detail: '你知道名声最怕空着，于是先把它换成了看得见的筹码。聪明是真的，代价也是真的。' },
                delayed: { title: '声名也是筹码', detail: '后来每当别人先拿你的名声来谈条件，你都会明白，这里面也有你自己提前做过的账。', npc: '万小山' },
            },
            cut_tracks_and_leave: {
                immediate: { title: '先把尾巴剪断', detail: '你没有留在众人视线里等风声发酵，而是先把自己和局之间最显眼的那根线剪掉。' },
                delayed: { title: '并肩之后仍后退', detail: '你不是不记得谁和你一起闯过，只是更怕那层关系一旦被人看清，就会反过来变成你的破绽。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你总会先把最显眼的那根线剪掉，只是有些并肩，不会因此就算没发生。' } },
            },
        },
        '23_volume_close': {
            follow_old_alliances_home: {
                immediate: { title: '顺着旧盟回头', detail: '你这次回天南不是因为想家，而是因为终于承认有些旧盟、旧人和旧账必须由你自己回去认。' },
                delayed: { title: '归乡是来认人', detail: '真正逼你回去的，不是海路远近，而是那些你已经不能再装作与己无关的人。', npc: '南宫婉' },
            },
            return_with_reputation_pressure: {
                immediate: { title: '风声逼你回返', detail: '你很清楚再让星海风声自己发酵下去，别人就会替你把旧名和新名一起写死。' },
                delayed: { title: '名声也会追人', detail: '你后来越来越明白，名声不是披在身上的壳，它也会在你想转身时从背后追上来。', npc: '万小山' },
            },
            return_after_hiding_tracks: {
                immediate: { title: '压住尾巴再返', detail: '你没有带着海上的所有风声正面回头，而是先把最显眼的尾巴压住，再去认该认的人。' },
                delayed: { title: '回去也不再住回去', detail: '你回得去旧地，却再也不会完全住回旧日。真正留下来的，是“我认这笔账，但我不再把自己交回去”。', npc: '墨彩环' },
            },
        },
        24: {
            returned_tiannan_for_settlement: {
                immediate: { title: '清算旧账', detail: '你终于把那些拖了很多年的旧账翻到台面上。做完之后并没有想象中痛快，反倒像慢慢拔出一根埋了太久的刺。' },
                delayed: { title: '旧地认账', detail: '后来你再提起天南，不再只是一个离开的地方，而成了你真正回去认过一次账的旧地。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '肯回来清账，总比只会往高处飞强。' } },
            },
            returned_tiannan_for_bonds: {
                immediate: { title: '接住旧情', detail: '你没有再把最重要的人往“以后再说”里推。这一步看似不大，实际上比很多杀伐决断都更难。' },
                delayed: { title: '有人不能再拖', detail: '这一念不会当场闹大，可等你再站到门前时，旧人旧账会先一起回声。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你总算不是只在最危险的时候才想起回头。', neutral: '你既然回来了，就别再把真正重要的人留在“以后再说”里。' }, '墨彩环': { neutral: '你若真记得谁重要，就别总拿“以后”来糊弄现在。' } },
            },
            returned_tiannan_but_remained_hidden: {
                immediate: { title: '藏锋离场', detail: '你回来过，也处理了该处理的，却没有再把自己重新扔进旧名旧局里。' },
                delayed: { title: '来过却不住回去', detail: '你不是不认过去，只是不再让过去重新决定你现在是谁。', npc: '墨彩环' },
                npcComment: { '墨彩环': { neutral: '你回来过，却还是像一道影子。来得快，去得也快。' }, '南宫婉': { neutral: '你回来不是为了重新住进去，这点我看得出来。' } },
            },
        },
        '24_old_debt_and_name': {
            settle_old_debts_openly: {
                immediate: { title: '把账翻明', detail: '你没有再替自己留模糊地带，而是把该认的账、该补的错和该背的名一起翻到了明面上。' },
                delayed: { title: '旧债终见天光', detail: '后来再想起嘉元城与黄枫谷时，你先记住的不是谁曾亏待过你，而是你终于把自己那份也认了。', npc: '墨彩环' },
                npcComment: { '墨彩环': { high: '账能不能补回去是一回事，肯不肯认，是另一回事。你这次至少没再躲。', neutral: '你总算没有再把“以后”挂在嘴上。' }, '李化元': { neutral: '肯把旧账翻明，总比把心性也一起藏掉强。' } },
            },
            pay_accounts_but_leave_name_behind: {
                immediate: { title: '付账不住回去', detail: '你认了该认的那部分代价，却没有再把旧名重新背回肩上。' },
                delayed: { title: '只补该补的那半步', detail: '你替旧地留了交代，却也替自己留了退路。此后别人再认你时，会先说你肯认账，但不肯再把自己住回去。', npc: '李化元' },
                npcComment: { '李化元': { neutral: '你这一步不算逃，只是把分寸留得很死。' }, '墨彩环': { neutral: '你肯认一半，我看见了；剩下那一半，你还是收得很紧。' } },
            },
            cut_old_name_after_minimum_duty: {
                immediate: { title: '认完便断', detail: '你连旧名也一起压下，只把必须做的那部分做完，然后转身离场。' },
                delayed: { title: '名字留在旧地', detail: '后来别人提起你时，会先说你回来过，也会说你没打算再把自己交回去。', npc: '厉飞雨' },
                npcComment: { '厉飞雨': { neutral: '你回来得像风，走得也像风。可真认了什么，旧人还是看得出来。' } },
            },
        },
        '24_bond_destination': {
            choose_nangong_openly: {
                immediate: { title: '终于认她', detail: '你不再把与南宫婉的这一笔继续压在沉默里，而是第一次正面承认：她不是路上的插曲。' },
                delayed: { title: '旧情不再往后拖', detail: '你终于不再把最重要的人推给“以后再说”。这会一路写进飞升前夜。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你既然终于肯认，就别再把最重要的话丢给以后。', neutral: '你总算没再把我也一并塞回沉默里。' } },
            },
            face_mocaihuan_at_last: {
                immediate: { title: '把迟来的话说完', detail: '你回到嘉元城时，终于把那些本该更早说出口的话说给了墨彩环。' },
                delayed: { title: '凡心迟到', detail: '很多年后你才认下这份凡心。真正难受的，不是没认，而是认得太晚。', npc: '墨彩环' },
                npcComment: { '墨彩环': { high: '你若早一点认，也许会是另一回事。可人总归还是要往前活。', neutral: '迟来的话不是没分量，只是再重，也改不了已经过去的那些年。' } },
            },
            keep_everyone_at_distance: {
                immediate: { title: '还是把话压住', detail: '你看见了该认的人，却还是先把最重的话吞回去，只留下分寸与距离。' },
                delayed: { title: '又一次留给以后', detail: '你还是更习惯把重要的话拖到以后。可这一次，你已经知道以后未必真的会来。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你又把最重的话压回去了。只是这次你自己也知道，它不会凭空变轻。' }, '墨彩环': { neutral: '你还是那样，肯回来，却不肯真的把话说到底。' } },
            },
        },
        25: {
            stay_in_world_for_one_person: {
                immediate: { title: '先把人留住', detail: '天门近在眼前时，你第一次不是先想自己能走多远，而是先想这一回能不能把人留下。' },
                delayed: { title: '先向人间回身', detail: '你明知门已打开，却还是先把脚收了回来。飞升前夜因此第一次有了真正的人间分量。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你这次若真肯停，不必说给我听，我会看见。', neutral: '门都开了，你却先问人还在不在。' } },
            },
            walk_together_if_fate_allows: {
                immediate: { title: '把大道并肩写', detail: '你终于不再把飞升只看成独行之路，而是第一次认真把“并肩”也算进答案里。' },
                delayed: { title: '门前终于不再独行', detail: '你不是放弃大道，而是终于承认大道未必要独自去走。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '若真能并肩，那这一次你就别先把自己藏起来。', neutral: '你若真想两个人一起走，就别只在门前才想起这件事。' } },
            },
            send_her_ahead_and_wait_for_return: {
                immediate: { title: '先送她上去', detail: '这一次你没有先算自己，而是先把生路让给了她。' },
                delayed: { title: '迟来的豪赌', detail: '你第一次愿意不算得失地把自己押后。这会把“值不值得”一直拖到终局最后一刻。', npc: '南宫婉' },
                npcComment: { '南宫婉': { high: '你若真敢把自己押后一次，我不会当看不见。', neutral: '你总算也会不算得那么清。' } },
            },
            say_nothing_and_walk_alone: {
                immediate: { title: '还是一个人上路', detail: '门已经开了，你最后还是选了最熟悉的那条路：不说透，不停留，也不回头。' },
                delayed: { title: '独走成习', detail: '你以为这是稳妥，其实也是一路以来最熟悉的那种迟疑。', npc: '南宫婉' },
                npcComment: { '南宫婉': { neutral: '你若还是只会一个人走，那许多话也确实不用再说。' } },
            },
        },
        '25_final_branch': {
            youxi_hongchen: { immediate: { title: '游戏红尘', detail: '你背对天门，终于把“留下”当成了一次主动的选择。' } },
            dadao_tongguang: { immediate: { title: '大道同光', detail: '这一次你没有独行，而是与南宫婉并肩推开了更高处的门。' } },
            zhiying_xiangdao: { immediate: { title: '只影向道', detail: '门最终还是开了，只是走过去时，你已经只剩自己一个人。' } },
            xianfan_shutu: { immediate: { title: '仙凡殊途', detail: '你终于认下那份迟来的凡心，也终于明白它已经来得太晚。' } },
            chidu_qingtian: { immediate: { title: '迟渡情天', detail: '你第一次把自己押后，后来终于等到了那道回身相渡的光。' } },
        },
    };

    const BRANCH_IMPACT_PACKS = {
        0: {
            set_out_now: {
                title: '残卷离灶',
                detail: '你几乎没回头，旧屋的烟火就被你甩在了身后。后来每逢要在路和人之间立刻取舍，你都会先想起这回出门时那股硬下去的心。',
            },
            pack_and_leave: {
                title: '柴米在后',
                detail: '你终究还是先把灶台和祖母安顿了一遍，才肯把脚迈出去。这一步不显锋芒，却让你往后再谈大道时，总还记得凡人的日子也要有人收尾。',
            },
        },
        1: {
            keep_low_profile: {
                title: '先学门槛',
                detail: '你先把自己压进人群里，名字不急着往上送。后来很多险处你都能多活半步，靠的就是这时学会先看门槛再出声。',
            },
            show_drive: {
                title: '门里先声',
                detail: '你让人先记住了名字，也把自己提早摆上了别人的眼。往后每逢要抢一线机会，这股先让人看见的劲都会跟着你一起往前。',
            },
        },
        2: {
            become_disciple: {
                title: '门下留名',
                detail: '你终究还是站进了神手谷的门里。那声师徒当时并不显得沉重，后来很多回头路，都是从这里开始一寸寸合拢的。',
            },
            investigate_mo: {
                title: '袖里藏针',
                detail: '你行了弟子礼，心却没真正跪下去。从那时起，神手谷在你眼里就不只是师门，而更像一层总要亲手挑开的皮。',
            },
            stay_independent: {
                title: '门外停步',
                detail: '你没有接那条更近的路，神手谷也始终隔着半步。后来再想起这一节时，你先记住的不是错失，而是自己当时还肯替退路留一道缝。',
            },
        },
        3: {
            save_li: {
                title: '药炉换命',
                detail: '你替厉飞雨奔走那几趟，把旁人的生死第一次真背到肩上。后来再有人把求助递到你手里，你很难再完全装作没听见。',
            },
            warn_li: {
                title: '话到唇边',
                detail: '你把该说的说了，却没把自己整个人押进去。这会让你以后很会守分寸，也很难再轻易相信仅凭提醒就算尽了情义。',
            },
        },
        4: {
            collect_evidence: {
                title: '药渣入袖',
                detail: '你先忍住了摊牌的冲动，把能留下来的东西一件件收进手里。往后很多险局里，你都会比旁人更信证据，不信表面那层安稳。',
            },
            confront_early: {
                title: '先问其心',
                detail: '你把怀疑直接摆上了台面，屋里的空气也从那一刻开始变了味。后来再遇见笑着藏刀的人，你总会先想起这回先出声时对方眼里那点冷。',
            },
        },
        5: {
            keep_bottle: {
                title: '瓶光藏袖',
                detail: '绿瓶没再见天日，却从此贴着你往后每一步。你后来越走越会算资源，心里也一直记得有件东西一旦露白，就再难回到从前。',
            },
            trade_bottle_secret: {
                title: '秘物作价',
                detail: '你没把瓶子交出去，却先学会了让秘密替自己换路。自此之后，你会越来越懂得，消息和资源一样都能催熟人。',
            },
        },
        6: {
            strike_first: {
                title: '先手见血',
                detail: '你抢先把刀递出去，也把“等别人先出手”这条路一并斩了。后来很多生死一线里，你都比旁人更快，只是那份快也会先回来认你。',
            },
            bait_and_counter: {
                title: '等他失手',
                detail: '你把杀心压到最后一刻，等对方自己露出破绽。这会让你往后越来越信耐心本身也能伤人，而且往往伤得更深。',
            },
            escape_and_return: {
                title: '退路反刃',
                detail: '你先退了一步，再借那一步把人送进死局。后来你会越来越明白，真正可怕的从不是逃，而是连退路都能被你用成刀。',
            },
        },
        7: {
            keep_letter: {
                title: '遗书压袖',
                detail: '你把那封信与解药一起收好，等于把死人留下的账也一并背走。以后每逢旧事要不要认，你都会先想起袖里那张发脆的纸。',
            },
            burn_letter: {
                title: '火里断章',
                detail: '纸烧得很快，快到像替自己省了一层解释。可往后凡是想把旧因果一把烧净的时候，你都会记得灰烬里也藏着没烧完的名字。',
            },
            bury_mo: {
                title: '土覆旧名',
                detail: '你先让尸骨有了归处，才肯去算后面的利害。后来许多比人情更冷的选择来时，你心里总还留着这一铲土的分量。',
            },
        },
        8: {
            protect_mo_house: {
                title: '墨府余灯',
                detail: '你离开时，院里的灯还没灭，像一笔活人账被你亲手接住。后来再提墨府，你先想起的不是死人，而是那点逼你别只为自己补过的灯火。',
            },
            take_treasure_leave: {
                title: '宅门旧刺',
                detail: '你带走了最值钱的东西，也把墨府最后一点还能相信你的理由一起带走了。日后每逢再见旧宅残物，先扎你的往往不是赚到多少，而是那天屋里压着声的安静。',
            },
            promise_caihuan: {
                title: '一句未完',
                detail: '你没有立刻替这笔账收尾，却把它从“以后再说”说成了迟早要回来的事。有些承诺之所以重，不在于说得多响，而在于对方什么都没逼你，你却已开了口。',
            },
        },
        9: {
            take_quhun: {
                title: '曲魂停顿',
                detail: '你把一件可怕的东西留在了身边，也把“人”和“可用之物”之间那道界限一起带上了路。后来每逢曲魂忽然像旧人那样停半息，你都会知道自己并非全然无感。',
            },
            repair_quhun: {
                title: '残身留念',
                detail: '你把曲魂留下，却不肯把它收成一件纯粹顺手的兵器。从那以后，凡是和禁魂、尸炼有关的东西，你都会比旁人多停半息。',
            },
            buy_back_trust: {
                title: '封存之问',
                detail: '你先把最重的那一下按住，没有急着替这件事定性。后来真正反复回来敲你的，不是曲魂本身，而是你当时故意没回答的那个问题。',
            },
            release_quhun: {
                title: '火后余白',
                detail: '法火烧起来时，屋里像忽然轻了一点，你也替自己留住了一道还能直视此事的缝。此后每逢再见傀儡与禁魂之物，你都会比旁人多停那一息。',
            },
        },
        10: {
            bid_token: {
                title: '令牌到手',
                detail: '你把灵石砸进场里，没给旁人留太多想象空间。往后每逢要争一个明面上的名额，你都会更信先把价码摆上去的硬气。',
            },
            buy_rumor: {
                title: '暗线换令',
                detail: '你没有正面跟人抢，而是让消息替自己开门。后来很多局里，你都会先问路数从谁嘴里漏出来，再决定要不要动手。',
            },
            watch_market: {
                title: '袖中算盘',
                detail: '你先把摊位、人脸和话头都记住，没有急着把手伸出去。往后许多比灵石更值钱的机会，都会从这份先看后买的耐心里长出来。',
            },
        },
        11: {
            join_yellow_maple: {
                title: '令入宗门',
                detail: '你拿着升仙令走进黄枫谷，也等于把自己递进了一套更大的秩序里。往后每次借到门墙之力，你都会记得这一步不是天降，而是亲自换来的。',
            },
            shop_other_sects: {
                title: '门外试价',
                detail: '你没有立刻把身家压给一家，而是先把各门各派的口风摸了个遍。后来再进局时，你总会比旁人多留一层“这话究竟值不值得信”的心眼。',
            },
            sell_token: {
                title: '令牌折银',
                detail: '你把能进门的东西换成了手里看得见的本钱。往后很多人再看你，都会先记得你连门票也敢拿来作价。',
            },
        },
        12: {
            leave_without_return: {
                title: '旧地推远',
                detail: '你没有再给自己留一条“实在不行就回头”的退路。后来每当局势逼你选边时，你都会更快承认：这条路已经不允许你再按旧日活法求稳。',
            },
            send_word_back: {
                title: '旧名仍有回声',
                detail: '你没有回去，却还是让旧人知道你活着。这让很多凡俗旧债没有被彻底切断，也让你往后更难把“我已经走远了”说得太轻。',
            },
            cut_old_name: {
                title: '连旧名都压下',
                detail: '你把最能牵住自己的部分先按进了心底，像提前替自己剪断了回头路。往后每逢有人从旧地追来，你都会先本能地想：这一次该留哪一层名字，哪一层必须藏住。',
            },
        },
        '12_mortal_debt': {
            return_mortal_debt: {
                title: '把旧账认给活人',
                detail: '你没有把凡俗旧债继续拖成一句“以后再说”。此后很多人再想起你，先记住的不是你给过多少，而是你终究肯回来认那笔早该认的账。',
            },
            leave_resources_only: {
                title: '只留资源不留人',
                detail: '你把能补的东西留下，却没让自己真正停下来。往后每逢别人说你也算尽了心，你都会清楚知道：那更像是给旧账一个交代，而不是给旧人一个答案。',
            },
            keep_debt_distant: {
                title: '旧债压成底色',
                detail: '你没有真把这笔账结清，只是把它压成了一层以后会不断回来的底色。你越往上走，越难完全装作它已经过去。',
            },
        },
        '12_tainan_market': {
            buy_market_rule: {
                title: '先把路数看明',
                detail: '你第一次在散修圈层里学到的不是怎么赢，而是怎么不被别人轻易当成价码。后来每逢新局新地，你都会先找路数，再决定自己该亮出哪一面。',
            },
            take_black_route: {
                title: '黑市先留后手',
                detail: '你没有走最亮的那条路，而是先给自己埋了一条暗线。往后很多看似临时得来的消息，其实都能追回这次你肯花心思把路数摸黑一点。',
            },
            observe_without_buying: {
                title: '价格先看人心',
                detail: '你没有急着出手，只把摊位、口风和谁先抬价都记进了心里。后来别人说你谨慎，往往不是因为你不敢碰，而是你总先看见价钱后面那层人心。',
            },
        },
        '12_token_kill': {
            win_token_cleanly: {
                title: '资格带着刀味',
                detail: '你拿到的不只是令牌，还有别人立刻会盯上你的理由。往后每当资格、门票和资源摆在一起时，你都会先记得：修仙界最危险的，常常就是刚到手的那一下。',
            },
            trade_information_for_entry: {
                title: '用消息换门票',
                detail: '你没有硬冲最显眼的位置，而是拿别人没看懂的消息去换自己的入口。后来很多人以为你运气好，其实只是没看到你总肯先把消息当成命来算。',
            },
            kill_for_token_path: {
                title: '门票沾血',
                detail: '你把资格抢到手时，也第一次真切承认了“修士杀机”不是传闻。后来你再看那些名门正派的入场门槛，总会记得它们底下也压着血。',
            },
        },
        '12_enter_yellow_maple': {
            enter_as_low_profile_disciple: {
                title: '把身放低进门',
                detail: '你没有带着锋芒进去，而是先把自己安在最不起眼的位置。往后很多积累看起来像运气，其实都起于你这次愿意先低头站稳。',
            },
            enter_by_detour: {
                title: '门内也先探价',
                detail: '你进了宗门，却没让自己立刻变成宗门的一部分。此后每逢遇见大势与门墙，你都会比旁人多问一句：这份归属到底是庇护，还是另一种价码。',
            },
            enter_with_tradeoff: {
                title: '先拿立足，再补代价',
                detail: '你接受了这套秩序，也知道它不会白给。后来每当宗门给你路时，你都会先想清楚自己准备拿什么去换。',
            },
        },
        '12_herb_garden': {
            farm_quietly: {
                title: '药圃无声',
                detail: '你把最要紧的东西都埋进土里，不让任何异样先长在脸上。后来越是能催熟命数的东西，你越知道得藏在无人看见的地方。',
            },
            push_growth: {
                title: '药性催紧',
                detail: '你让灵药一茬接一茬地往前赶，也把自己对快的依赖一并喂大了。往后只要见到能省年份的路子，你都会先闻到这时种下的那点急。',
            },
            build_connections: {
                title: '药圃结线',
                detail: '你一边侍弄灵药，一边把门里的人情悄悄串了起来。后来很多看似偶然的照应，都会回到这段你肯花心思养人的日子。',
            },
        },
        13: {
            align_with_fellow_disciples: {
                title: '先认门内座次',
                detail: '你没有急着只为自己铺路，而是先把门内谁能同行、谁会翻脸看清。后来很多队伍会愿意先来问你一句，不是因为你最强，而是因为你最早看懂了门内的人心秩序。',
            },
            keep_low_profile_before_trial: {
                title: '试炼前先缩锋',
                detail: '你把自己往阴影里再收了一层，不肯在禁地前夜先变成显眼目标。往后每逢大局将开时，你都会更习惯先把锋芒收住，再等别人先露出刀口。',
            },
            stock_foundation_supplies: {
                title: '把破境准备先攒够',
                detail: '你在真正进场前先把后面的筑基与补给准备好，不肯只凭一口气冲进去。别人以后说你算得细，很多都是从这一步开始的。',
            },
        },
        '13_volume_close': {
            enter_forbidden_ground_ready: {
                title: '试炼前心里有数',
                detail: '你没有把第二卷只走成“终于进了宗门”，而是把禁地之前该认的门墙、旧债和积累都先摆明。下一卷真正开始时，你会比很多人更清楚自己为什么进去。',
            },
            enter_forbidden_ground_with_debt: {
                title: '带着旧债进试炼',
                detail: '你已经站上修仙路，却没有把凡俗那一头彻底放下。正因如此，下一卷很多决定都不会只剩资源与生死，它们还会反复逼你认人、认债、认来路。',
            },
            enter_forbidden_ground_from_shadows: {
                title: '先把自己藏进局里',
                detail: '你准备好了进去，却还是把最重要的部分留在暗处。等真正进到血色禁地时，你会更像那个先算活路、再决定值不值得出手的人。',
            },
        },
        14: {
            save_nangong: {
                title: '禁地留名',
                detail: '你慢了半息，却也正是这半息，让禁地往后再被提起时不只剩机缘与尸骨。后来很多人记住的不是你拿了什么，而是那时确实有人在最乱的时候回过头。',
            },
            watch_and_wait: {
                title: '退路先成',
                detail: '你活得最稳，也看得最清，像是先替自己把活路垫平了。禁地之后，你会越来越信退路，也更少指望别人真会在关键时替你回身。',
            },
            loot_in_chaos: {
                title: '高效之险',
                detail: '主药到手时，你先尝到的不是喜悦，而是自己出手越来越快的那点顺。往后再遇见同类局势，你都会知道这份高效既好用，也很危险。',
            },
            kill_for_gain: {
                title: '高效成瘾',
                detail: '你把更狠的那一步也一起跨过去了，留下来的不是痛快，而是自己已经知道会越来越快。第一次把清场当成路数以后，往后每一步都更难装作只是偶然。',
            },
        },
        15: {
            accept_nangong_debt: {
                title: '有人算进未来',
                detail: '你并没有因此变弱，只是从这一刻起，往后很多决定都不能再只按值不值来算。有人不是拖累，也不是工具，而是你一旦认了，就必须算进未来的人。',
            },
            suppress_nangong_feelings: {
                title: '压久成影',
                detail: '你把那点心绪压了下去，手很稳。可后来每次再见她，你都比平时更像无事发生，也正因为太像，才更显得那不是自然，而是刻意。',
            },
            cut_nangong_ties: {
                title: '记忆未断',
                detail: '你想把一切切得干净，可真正难斩的是已经进过心的那一瞬。往后只要她再出现一次，你就会知道自己当时斩掉的未必是情，更像是怕被牵住。',
            },
        },
        16: {
            become_li_disciple: {
                title: '门墙在身',
                detail: '令牌入手那一刻，你得到的不只是庇护，也第一次真正站进了某个秩序里。往后每当你借到师门之势时，都会想起这点：宗门给你的，从来不是白给。',
            },
            keep_free: {
                title: '独立有价',
                detail: '你既想听明白局势，也想留好退路。这没有错，只是从今以后，别人很难彻底把后背交给你，独立也就有了自己要补的价。',
            },
            learn_in_secret: {
                title: '归属成筹码',
                detail: '你做了最现实的选择，也让真正看得懂局的人更早防你。后来别人说你会做人时，你知道那不是夸温和，而是在说你连归属都能算成筹码。',
            },
        },
        '16_feiyu_return': {
            help_feiyu_again: {
                title: '旧义回手',
                detail: '你还是替旧友伸了手，像把很多年前那口没喝完的气重新接住。后来每逢想把凡俗旧日彻底丢干净时，厉飞雨这一笔都会先把你拉回来。',
            },
            share_drink_and_part: {
                title: '杯底留温',
                detail: '你们只把酒喝到够认出彼此，没有再把各自的日子重新搅在一起。此后再忆起七玄门，你先想到的会是这点尚能克制的旧情。',
            },
            distance_from_feiyu: {
                title: '酒盏停边',
                detail: '你故意把旧友情停在杯沿，不让它再往心里走深。后来每逢有人从旧日追上来，你都更擅长先把门关在半开之间。',
            },
        },
        17: {
            stay_quiet_banquet: {
                title: '笑里先看座次',
                detail: '你没在桌上替谁开口，却也因此让更多人记住你很难被一句话拖下场。此后再入类似场合，你会先看座次、酒次和谁先笑，慢慢懂得有些杀机从不带血。',
            },
            show_strength_banquet: {
                title: '威与债一起留下',
                detail: '你把场面压住了，也把很多人的记恨一起压进了心里。后来每逢局面发烂，总会有人先想到你是不是又要直接掀桌，这既是威，也是债。',
            },
            trade_favors_banquet: {
                title: '门路比风头久',
                detail: '你没有赢下一夜的风头，却铺下了许多以后才会显出用处的门路。许多后面避开的坑和谈成的事，都会回到这晚你肯把耐心花在桌下。',
            },
        },
        18: {
            fight_for_sect: {
                title: '可靠二字',
                detail: '你不是不怕死，只是最后没有让“我能活”压过“他们会死”。大战之后，有人提你先说可靠，这两个字听上去简单，背后却是拿命换来的。',
            },
            fake_fight: {
                title: '少数人的活路',
                detail: '你没替宗门补完那道裂口，却把认定的人真带出了死局。往后活下来的人会记得，你不是肯为所有人负责的人，但对少数人，你会真的回头。',
            },
            defect_demonic: {
                title: '底线后移',
                detail: '你做得很快，快到几乎没有多余情绪。只要再遇见失去反抗能力的敌人，你都会清楚记得：第一次跨过去以后，后面会越来越容易。',
            },
        },
        '18_nangong_return': {
            acknowledge_nangong_importance: {
                title: '正面认人',
                detail: '你终于没有再把最重要的话往外推。这一步之后，她在你心里不再只是旧险旧债，而是真会改写你以后去留的人。',
            },
            owe_nangong_silently: {
                title: '心债不言',
                detail: '你把亏欠认下，却还是不肯让它见光。后来每次再见她，沉默都会比旁人听见的话更重。',
            },
            avoid_nangong_again: {
                title: '话到门前',
                detail: '你明明已经走到能说清的地方，却还是把最要紧的一句转开了。往后若再选最冷的路，这次回避都会先回来给你作证。',
            },
        },
        19: {
            hold_the_line: {
                title: '一句压命',
                detail: '你把一句“守住”压出去，等于把许多条命也一起压上了肩。后来再有人听你发话时，你会先记起矿脉里那种一出口就要有人拿命照做的分量。',
            },
            lead_breakout: {
                title: '生路也算本事',
                detail: '你放弃了死守，也放弃了体面上的全赢，却第一次真正明白带人活出来本身就是本事。往后你会越来越擅长判断，什么时候继续顶只是在给死人凑数。',
            },
            rescue_rearguard: {
                title: '最后一段人命',
                detail: '你没有把所有人都带出来，却把最容易被放弃的那一段也扛进了自己的账里。后来很多旧人愿意把命押在你身上，靠的就是你这一步还肯回头。',
            },
            sabotage_and_leave: {
                title: '活路不回头',
                detail: '你做的是能保自己脱身的干净选择，可真正拖住你的，是那些明知来得及多做一点却还是转身的瞬间。你后来越走越稳，也越清楚自己当时切断的并不只是追兵。',
            },
            escape_alone: {
                title: '矿道背影',
                detail: '你做的是最干净利落的选择，连犹豫都省了。很多年后你未必还记得那次带出了什么，却会记得矿道里那几道没来得及跟上的身影。',
            },
            open_mine_gate: {
                title: '矿门改色',
                detail: '你亲手把矿门那道线改了颜色，也让“同门”二字从此有了可交换的价。不管别人以后怎么论大势，这一门之开都会先替他们认你。',
            },
            harvest_chaos: {
                title: '冷收益',
                detail: '你在最乱的时候先数还能拿走什么，连尸骨都被看成台阶的一部分。后来许多人防的不是你的狠，而是你连死局都能看见收益。',
            },
        },
        20: {
            go_star_sea: {
                title: '海上押命',
                detail: '你没有在天南再多停一步，而是把命直接压进一片更陌生的海。后来很多去与留的关口，你都会先想起这一回是怎样亲手把旧岸推远的。',
            },
            go_for_profit: {
                title: '先认风向',
                detail: '你到新地方先找商路和消息，不肯只凭一腔孤勇下海。往后每进一盘更大的局，你都会先摸风向，再决定自己要站成货、站成人，还是站成刀。',
            },
            go_hide: {
                title: '把身藏稳',
                detail: '你没急着去认新世界，而是先让自己从它的眼里消失一阵。后来别人说你总能躲过第一波风浪，你会知道那是从这时学来的本事。',
            },
        },
        21: {
            hunt_monsters: {
                title: '海上先活',
                detail: '海上的第一课不是变强，而是知道每次出手都真可能把命丢在水里。后来你闻见海腥味，第一反应不再是远行，而是风向、妖潮和退路。',
            },
            run_trade: {
                title: '风向先清',
                detail: '你没有第一时间去抢最凶的活，却更早学会了什么该碰，什么连看都别多看。往后很多次避祸和寻路，都不是靠运气，而是靠你先把规则摸明白。',
            },
            seek_cave: {
                title: '先把自己站稳',
                detail: '你拒绝了海上的喧哗，也保住了在新地方最容易乱掉的心。别人都说你太稳，只有你自己知道，那时不是稳，是不想刚到新地便被人牵着走。',
            },
        },
        '21_star_sea_foothold': {
            claim_hunter_route: {
                title: '先拿命换根基',
                detail: '你先把最危险也最直接的路走熟了。星海会记住你不是靠旧名头立足，而是靠敢不敢先拿命去换站位。',
            },
            build_trade_route: {
                title: '先把账站稳',
                detail: '你没有急着闯最凶的风口，而是先把货路、价码和谁会临时翻脸摸清。以后你再进大局，总会先算清这几笔账。',
            },
            secure_hidden_cave: {
                title: '先留退路',
                detail: '你先把能退、能藏、能补给的地方握在手里。后面很多看似从容的进退，其实都从这里起手。',
            },
        },
        22: {
            collect_map: {
                title: '知道也是代价',
                detail: '你不是拿到了一张图，而是亲手把自己放进了一个知道太多就很难善终的局。此后只要有人笑着来谈交易，你都会先想他究竟是来买图还是来认刀。',
            },
            sell_map: {
                title: '危险换了主人',
                detail: '你把危险换成了资源，账面上这是赚，心里却未必真轻。后来每当你花掉那笔换来的东西，总会短短想一下：危险只是换了个主人。',
            },
            avoid_map: {
                title: '收手知重',
                detail: '你亲手放过了一扇很可能一生只开一次的门。往后你会更清楚自己是哪类修士：不是看见机缘就扑上去的人，而是能忍住不让更高把自己拖进必死局的人。',
            },
        },
        '22_xutian_rumor': {
            hide_map_trace: {
                title: '先让名字不亮',
                detail: '你没有急着抢下一口机缘，而是先让自己的名字别在海上亮得太快。很多人不是死在不知道，而是死在太早被所有人知道。',
            },
            trade_on_rumors: {
                title: '消息也会反咬',
                detail: '你把风声也算进了买卖。海上的消息不会因为你卖得漂亮就变干净，它只会换一种方式回来认你。',
            },
            bind_allies_before_entering: {
                title: '有人得先认',
                detail: '你知道真正危险的不是图，而是图一露面后每个人都可能瞬间改口，所以先试着把能同行的人认下来。',
            },
        },
        23: {
            grab_treasure: {
                title: '先伸手的人',
                detail: '你先动了，那一把就把所有还在维持的合作表面撕开。以后别人提起你在星海的名声时，会先记住你在最关键的时候从不等别人先伸手。',
            },
            cooperate_allies: {
                title: '宝与命先看命',
                detail: '你没有拿最先那一下，却把一群原本很容易散掉的人重新拉在了一起。在宝与命摆在一处时，你没有先选宝，活下来的人会记得这个。',
            },
            pull_ally_out: {
                title: '裂隙边回头',
                detail: '你没有冲进最亮的宝光里，而是把能救的人先接出来。你不是愿为所有人负责的人，可对少数认定的人，你会真的把他们带离最窄的裂隙。',
            },
            watch_last: {
                title: '等得越准越冷',
                detail: '你让别人先暴露，自己再找最优位，这很聪明，也让活下来的人以后更难彻底信你。你越来越擅长等，只是等得越准，有时也越容易把自己等冷。',
            },
            sell_route_info: {
                title: '风暴也是货',
                detail: '你没有拿最亮的那口宝，却把风暴也做成了买卖。很多人以后提起你，不会先说胆大，而会说你连大机缘都能拆成消息差去赚第二遍。',
            },
            slip_past_palace: {
                title: '避开传说',
                detail: '你绕开了最亮也最窄的那一口气，多数人不是死在争，而是死在舍不得不争。活下来的人未必看得懂你，却会记得你在最像传说的地方先把自己抽了出来。',
            },
        },
        '23_star_sea_aftermath': {
            honor_alliance_after_palace: {
                title: '并肩不只一次',
                detail: '你没有把虚天殿只当成一次夺宝，而是把一起活出来的人也真正认进了后果里。很多关系真正重，不是并肩过一次，而是那次过后你还肯继续认。',
            },
            settle_reputation_with_profit: {
                title: '声名也是筹码',
                detail: '你知道名声最怕空着，于是先把它换成了看得见的筹码。后来每当别人先拿你的名声谈条件，你都会明白，这里面也有你自己做过的账。',
            },
            cut_tracks_and_leave: {
                title: '并肩之后仍后退',
                detail: '你不是不记得谁和你一起闯过，只是更怕那层关系一旦被人看清，就会反过来变成你的破绽。',
            },
        },
        '23_volume_close': {
            follow_old_alliances_home: {
                title: '归乡是来认人',
                detail: '你这次回天南不是因为想家，而是因为终于承认，有些旧盟、旧人和旧账必须由你自己回去认。',
            },
            return_with_reputation_pressure: {
                title: '名声也会追人',
                detail: '你很清楚再让星海风声自己发酵下去，别人就会替你把旧名和新名一起写死。名声不是壳，它也会在你想转身时从背后追上来。',
            },
            return_after_hiding_tracks: {
                title: '回去也不再住回去',
                detail: '你回得去旧地，却再也不会完全住回旧日。真正留下来的，是“我认这笔账，但我不再把自己交回去”。',
            },
        },
        '23_mocaihuan_return': {
            support_mocaihuan_longterm: {
                title: '旧账归手',
                detail: '你没有再把补偿说成一句将来的空话，而是把这笔账真正接回了手里。此后再想起嘉元城，心里少的不是愧意，而是那层总欠着没认的空白。',
            },
            admit_old_wrong: {
                title: '旧错见光',
                detail: '你把该认的错亲口认下，却没有再越过她如今的日子。后来很多关于补与不补的事，你都会记得承认并不等于重新占有。',
            },
            confirm_mocaihuan_safe: {
                title: '看过便走',
                detail: '你只是确认她安好，便把脚收了回来。往后若再说自己从未负人，这一步会先在心里轻轻拦你一下。',
            },
        },
        24: {
            returned_tiannan_for_settlement: {
                title: '旧地认账',
                detail: '你终于把那些拖了很多年的旧账翻到台面上，做完之后并没有想象中痛快，反倒像慢慢拔出一根埋太久的刺。后来你再提天南，它不再只是一个离开的地方，而是你真正回去认过账的旧地。',
            },
            returned_tiannan_for_bonds: {
                title: '有人不能再拖',
                detail: '你没有再把最重要的人往“以后再说”里推，这一步看似不大，实际上比许多杀伐决断都更难。你终于不能再假装自己的一生只需要对大道负责，因为你已亲手承认，有些人也该算进去。',
            },
            returned_tiannan_but_remained_hidden: {
                title: '来过却不住回去',
                detail: '你回来过，也处理了该处理的，却没有再把自己重新扔进旧名旧局里。你不是不认过去，只是不再让过去重新决定你现在是谁。',
            },
        },
        '24_old_debt_and_name': {
            settle_old_debts_openly: {
                title: '把账翻明',
                detail: '你这次没有再给自己留模糊地带，而是把该认的账、该补的错和该背的名一起翻到了明面上。旧地因此不再只是来过，而是被你真正认过一次。',
            },
            pay_accounts_but_leave_name_behind: {
                title: '只补不住回去',
                detail: '你认了该认的那部分代价，却没有再把旧名重新背回肩上。这一步留下的是分寸，也是一条更冷的退路。',
            },
            cut_old_name_after_minimum_duty: {
                title: '认完便断',
                detail: '你把必须处理的部分做完，随即连旧名也一起压下。后来再有人提起你，都会先说你回来过，却没打算再把自己交回去。',
            },
        },
        '24_bond_destination': {
            choose_nangong_openly: {
                title: '终于认她',
                detail: '你不再把与南宫婉的这一笔继续压在沉默里，而是第一次正面承认：她不是路上的插曲。此后飞升再近，这个人也不能被你算在外面。',
            },
            face_mocaihuan_at_last: {
                title: '迟来的凡心',
                detail: '你回到嘉元城时，终于把本该更早说出口的话说给了墨彩环。真正刺人的，不是没认，而是你知道自己认得太晚。',
            },
            keep_everyone_at_distance: {
                title: '还是把话压住',
                detail: '你看见了该认的人，却还是先把最重的话吞回去。这一步看似稳妥，实际上只是把“以后再说”又往后拖了一次。',
            },
        },
        25: {
            stay_in_world_for_one_person: {
                title: '先把人留住',
                detail: '天门近在眼前时，你第一次不是先想自己能走多远，而是先想这一回能不能把人留下。飞升因此第一次真的输给了人间。',
            },
            walk_together_if_fate_allows: {
                title: '把大道并肩写',
                detail: '你终于不再把飞升只看成独行之路，而是第一次认真把“并肩”也算进答案里。大道的意思，也因此被你重新写了一遍。',
            },
            send_her_ahead_and_wait_for_return: {
                title: '先把自己押后',
                detail: '你第一次愿意不先算自己，而是把生路让给了她。这不是退让，而是你终于肯把最重要的人放在自己的前面。',
            },
            say_nothing_and_walk_alone: {
                title: '独走成习',
                detail: '门已经开了，你最后还是选了最熟悉的那条路：不说透，不停留，也不回头。这一步稳得像习惯，也冷得像习惯。',
            },
        },
        '25_final_branch': {
            youxi_hongchen: {
                title: '游戏红尘',
                detail: '你背对天门，终于把“留下”当成了一次主动的选择。到最后，你仍愿意为了一个人把人间再走一遍。',
            },
            dadao_tongguang: {
                title: '大道同光',
                detail: '你终于没有独行，而是与南宫婉并肩推开了更高处的门。大道在这里第一次像两个人共有的一束光。',
            },
            zhiying_xiangdao: {
                title: '只影向道',
                detail: '门最终还是开了，只是走过去时，你已经只剩自己一个人。这是最成功，也最苍白的一场飞升。',
            },
            xianfan_shutu: {
                title: '仙凡殊途',
                detail: '你终于认下那份迟来的凡心，也终于明白它已经来得太晚。飞升仍在前方，可这份遗憾会一直跟着你。',
            },
            chidu_qingtian: {
                title: '迟渡情天',
                detail: '你第一次把自己押后，后来终于等到了那道回身相渡的光。那场豪赌没有白押。',
            },
        },
        qi_0: {
            stabilize_fast: {
                title: '强把气留',
                detail: '你没给惊惧留太多空隙，硬把第一缕灵气按在经脉里走完。后来每逢身体先喊疼、心却还想再逼一步时，这股不肯松手的劲都会先回来。',
            },
            observe_change: {
                title: '先记这一缕',
                detail: '你停下来记住那一点陌生的凉意，没有急着把它变成本事。此后很多关口，你都会比旁人更信体会本身也能救命。',
            },
            suppress_instinctively: {
                title: '把门先关',
                detail: '你几乎本能地把那缕气往回按，像在替凡人的自己多关一道门。后来再有更大的异变临身，你也总会先想收，再想进。',
            },
        },
        qi_1: {
            retry: {
                title: '火里再试',
                detail: '药火刚失手你就不肯退，非要把这处错摸个明白。往后很多险路上，你都会把“再试一次”当成比认输更顺手的本能。',
            },
            record_mistake: {
                title: '灰里记错',
                detail: '你先把失手的地方一笔笔记下来，没有让火气替你做主。后来很多本可翻车的地方，都是靠这时学会的记账心过的。',
            },
            grow_irritable: {
                title: '火气入心',
                detail: '你没怪药材，也没怪时机，只先把那股躁意压回自己身上。此后每逢天赋、门槛和资质这些字眼撞上来，这团火都比别处更容易复燃。',
            },
        },
        qi_2: {
            vow_not_to_be_weak: {
                title: '针下立誓',
                detail: '疼意最重的时候，你先记住的不是退，而是再也不想被逼到这一步。往后许多更狠的选择，都会从这句不肯再弱里长出影子。',
            },
            stop_and_breathe: {
                title: '痛里换息',
                detail: '你先停下来，把那股非要硬撑到底的劲松开一线。后来每逢只剩硬顶一条路时，你都会想起自己也曾在最疼的时候给过自己一口气。',
            },
            feel_retreat: {
                title: '凡念回潮',
                detail: '经脉如针时，你竟先想起了还能回头做凡人的那点旧日子。此后大道再亮，这一点退意也会时不时提醒你，你并非天生只认向前。',
            },
        },
        ji_3: {
            accept_change: {
                title: '旧骨脱壳',
                detail: '你没有跟旧我纠缠太久，任由那层凡俗的壳慢慢退下去。往后每次境界再变，你都会比旁人更早接受“人已经不是旧人”这件事。',
            },
            feel_unsettled: {
                title: '新身未稳',
                detail: '你看着旧我退远，心里先起的不是喜，而是一阵空。后来每逢更上一层楼，你都比旁人更容易先问一句：那原来的我还剩多少。',
            },
            treat_as_upgrade: {
                title: '把身作梯',
                detail: '你把这场脱胎当成理所当然的一步上升，几乎没给自己留惊惧。此后凡是能让人更高一层的东西，你都会更容易把代价也一并视作应当。',
            },
        },
        ji_4: {
            accept_and_remember: {
                title: '收情记账',
                detail: '你接了这份善意，却没让自己忘了它背后的用意。后来很多人情来往，你都会先记得情分，也记得价码。',
            },
            decline_all: {
                title: '门外收伞',
                detail: '你把所有伸来的手都挡在门外，不肯先欠任何一份人情。往后你能活得更清，也更容易在最需要人时发现自己身边空得太快。',
            },
            reverse_observe: {
                title: '借礼看人',
                detail: '你顺着人情往回看，把对方的心思先摸了个轮廓。此后再有人笑着示好，你总会先看那层笑里藏没藏别的东西。',
            },
        },
        ji_5: {
            face_the_thorn: {
                title: '刺上留眼',
                detail: '你没有急着把那点硌心的地方磨平，而是先低头看清它长在何处。后来再逢心障、旧伤和未了因果，你都更难骗自己说“它其实不在”。',
            },
            force_break: {
                title: '硬骨撞关',
                detail: '你不肯停，像用整副骨头去顶那道看不见的门。往后许多本可缓一步的地方，你都会更先信蛮力能替你开路。',
            },
            wait_it_out: {
                title: '把锋收回',
                detail: '你往后退了半步，没有急着和那道心障正面见血。此后每逢最想立刻求成的时候，这一步都会提醒你，不是每一根刺都非得当场拔出来。',
            },
        },
        jin_6: {
            accept_loneliness: {
                title: '丹成孤席',
                detail: '你认了强者终要独坐这一层冷意，没有再去替它找热闹的名字。后来很多比热闹更高的地方，你都会走得更稳，也更冷。',
            },
            think_of_old_people: {
                title: '旧人入丹',
                detail: '金丹既成，你先想起的却不是自己更高了，而是谁还留在旧路上。往后哪怕站得再高，旧人也总能在某些夜里把你从云上轻轻拽一下。',
            },
            press_down_emptiness: {
                title: '把空压平',
                detail: '你把那点空意直接压进修为里，不肯让它抬头。此后每逢境界再涨、心却没跟上，那层被压过的空都会先回来。',
            },
        },
        jin_7: {
            clear_old_debts: {
                title: '旧账见天',
                detail: '你主动把那些拖久了的名字翻到光下，不再让它们在暗处发霉。往后再回看来路，你心里会更重，却少了一层说不清的混浊。',
            },
            delay: {
                title: '账页压底',
                detail: '你把旧账重新压回了案底，像先替自己争一口缓气。后来只要有旧人旧地重新浮出来，这摞没翻完的账就会比别的东西更先响。',
            },
            sort_by_value: {
                title: '把人分价',
                detail: '你先问谁更值得处理，再问该不该处理。此后很多人再靠近你时，都会更容易被你下意识摆上秤。',
            },
        },
        jin_8: {
            accept_reputation: {
                title: '名字先行',
                detail: '你先接受了名字替你开路这回事，没有再假装自己只是路过。后来很多门会主动为你让开，可你也越来越难再藏回无名处。',
            },
            fear_reputation: {
                title: '名到人惊',
                detail: '你的名字先到了，你反而先起了防心。往后每逢旁人凭名声来认你，你都更容易先想：他们认的究竟是不是我。',
            },
            use_reputation: {
                title: '借名压席',
                detail: '你主动拿名声去压场，也等于承认它已经能替你动手。此后每次别人先因名字后退半步，你都会知道这层借来的势终究也要你自己承担。',
            },
        },
        yu_9: {
            adapt: {
                title: '目光出鞘',
                detail: '你很快适应了神识外放，好像眼睛忽然多出了一层更薄的刃。往后你会越来越难只按别人给你的表面去看人和局。',
            },
            restrain: {
                title: '把线收回',
                detail: '你明明能看得更远，却先学着把那根无形的线收回自己体内。后来面对能随意越界的力量时，你都会先记得克制不是吃亏。',
            },
            enjoy_control: {
                title: '掌中铺开',
                detail: '周围一切都像在掌心里徐徐铺开，这种可控让你先尝到快意。往后许多需要放手的时候，你都会比旁人更难立刻松开。',
            },
        },
        yu_10: {
            accept_solitude: {
                title: '长夜自守',
                detail: '漫长海路把人从喧哗里一层层刮净，你先学会了陪自己走完。后来很多只能独自扛的夜，你都会比从前更稳。',
            },
            remember_someone: {
                title: '夜里有人',
                detail: '海面太黑时，你心里却还会亮起一个能信半分的人影。此后哪怕隔着再远的海和年头，这一点被想起过的暖意也不会全散。',
            },
            prefer_it: {
                title: '孤夜成性',
                detail: '你发现自己并不讨厌这种长夜，甚至愿它更久一点。后来别人再说你冷，你会知道那不是一夜长成，而是从海上这一程开始。',
            },
        },
        yu_11: {
            answer_it: {
                title: '当面答它',
                detail: '你没有急着拔剑，而是先听那心魔把话说完。往后再遇见最像自己的恶念时，你会更知道该先认哪一句是真的。',
            },
            crush_it: {
                title: '把影打碎',
                detail: '你不肯给那东西多一口气，抬手就把它压回碎裂里。此后很多该慢慢认的心结，也更容易被你先用力按成沉默。',
            },
            stay_silent: {
                title: '让它照见',
                detail: '你一句也不答，只任那影子把你照了个通透。后来很多真正难解的关口前，你都会先习惯与沉默对坐。',
            },
        },
        hs_12: {
            accept_high_not_full: {
                title: '天高未满',
                detail: '你承认更高并不等于更圆满，没有急着替这点空缺找借口。后来再遇到看似登顶的时刻，你都会比别人更早想到还差一点。',
            },
            seek_next_goal: {
                title: '更上一阶',
                detail: '天光刚开，你就先去找下一个更高的台阶。往后凡是能让你再进一步的东西，都会比“此刻已够”更容易打动你。',
            },
            stay_alert: {
                title: '高处留醒',
                detail: '你没有被破境的亮意完全淹住，还给那点空留了警惕。此后越站上高处，你越不敢忘了脚下也会有空声。',
            },
        },
        hs_13: {
            return_now: {
                title: '见信回身',
                detail: '信一到，你便把许多别的事都往后压了压。后来再说自己只认大道不认旧人时，这次回身都会先把你拦住。',
            },
            stabilize_first: {
                title: '先稳此身',
                detail: '你没有被旧信一下拉回去，而是先把眼前局势按稳。往后每逢旧情旧债扑上来，你都会更本能地先守住当下的站位。',
            },
            put_away: {
                title: '信收入袖',
                detail: '你把信收起来，没有让它当场改写去向。后来许多真正重要的话和人，也会被你这样先放进袖里，再慢慢变重。',
            },
        },
        hs_14: {
            carry_all_forward: {
                title: '带着来路',
                detail: '你终于肯承认这一身来路不能只挑好看的带上去。门前真正让你站稳的，不是忘得干净，而是你还敢把这些都算成自己。',
            },
            higher_above_all: {
                title: '高处断尘',
                detail: '你觉得只要更高，许多名字与牵扯都该自行落下。往后若真一步跨出，这股“把一切留在脚下”的心也会先替你定色。',
            },
            consider_staying: {
                title: '门前留步',
                detail: '门已在前，你却第一次认真想过留下。此后别人再说你只会向上，你也知道自己曾在最高处为人间停过一步。',
            },
        },
    };

    const PROMISE_LABELS = Object.freeze({
        protect: '保全',
        probe: '试探',
        seize: '夺取',
        sacrifice: '献祭',
        sever: '决裂',
        conceal: '藏锋',
    });

    const RISK_LABELS = Object.freeze({
        steady: '稳妥',
        pressured: '有压',
        perilous: '涉险',
    });

    function getChapterProgressValue(chapterId) {
        if (typeof chapterId === 'number' && Number.isFinite(chapterId)) {
            return chapterId;
        }
        const matched = String(chapterId || '').match(/^(\d+)/);
        return matched ? Number.parseInt(matched[1], 10) : 0;
    }

    function formatChoiceCosts(costs) {
        if (!costs || typeof costs !== 'object') {
            return '';
        }
        return Object.entries(costs)
            .map(([itemId, amount]) => `${ITEMS[itemId]?.name || itemId} x${amount}`)
            .join('、');
    }

    function inferPromiseType(choice) {
        if (PROMISE_LABELS[choice?.promiseType]) {
            return choice.promiseType;
        }

        const choiceId = String(choice?.id || '');
        const text = String(choice?.text || '');
        const routes = choice?.effects?.routeScores || {};

        if (
            routes.orthodox > 0
            || /save|protect|help|hold|support|return|rescue|guard|acknowledge|promise/i.test(choiceId)
            || /护|救|守|接住|回头|认下|补|护住|帮/.test(text)
        ) {
            return 'protect';
        }

        if (
            /observe|watch|wait|collect|ask|record|survey|check|buy_rumor/i.test(choiceId)
            || /观察|试探|摸清|记下|看清|等一等/.test(text)
        ) {
            return 'probe';
        }

        if (
            routes.demonic > 0
            || /grab|loot|kill|harvest|sell|take|use|strike|crush|seize|open_mine_gate|defect/i.test(choiceId)
            || /夺|抢|杀|拿|卷|收割|卖|先下手|压碎/.test(text)
        ) {
            return 'seize';
        }

        if (
            /accept|stand|owe|stay|admit|fight_for|lead_breakout|go_team/i.test(choiceId)
            || /认下|承担|留下|扛|站住|接应|一起/.test(text)
        ) {
            return 'sacrifice';
        }

        if (
            /cut|burn|betray|defect|distance|escape_alone|decline|release|reject/i.test(choiceId)
            || /斩|切|断|背弃|烧|拒绝|抽身/.test(text)
        ) {
            return 'sever';
        }

        if (
            routes.secluded > 0
            || /keep_low|hide|slip|seek_cave|escape|bury|watch_last|stay_quiet|avoid|keep_free/i.test(choiceId)
            || /藏|稳|低调|退|绕开|避开|不露面|留退路/.test(text)
        ) {
            return 'conceal';
        }

        return 'protect';
    }

    function inferRiskTier(choice, tradeoff) {
        if (RISK_LABELS[choice?.riskTier]) {
            return choice.riskTier;
        }

        const choiceId = String(choice?.id || '');
        const routes = choice?.effects?.routeScores || {};
        const tribulationGain = Math.max(0, Number.isFinite(tradeoff?.tribulationGain) ? tradeoff.tribulationGain : 0);
        const hasCosts = Boolean(choice?.costs && Object.keys(choice.costs).length > 0);

        if (
            choice?.ending
            || tribulationGain >= 2
            || routes.demonic > 0
            || /kill|loot|grab|harvest|open_mine_gate|defect|betray|cut|strike_first/i.test(choiceId)
        ) {
            return 'perilous';
        }

        if (
            hasCosts
            || tribulationGain === 1
            || routes.secluded > 0
            || /observe|wait|keep|trade|seek|hide|watch|buy_rumor|avoid/i.test(choiceId)
        ) {
            return 'pressured';
        }

        return 'steady';
    }

    // 晚期 debt / 门前问心口径只属于第五卷主线，不能再跟着章节 id 前缀外溢。
    function isLateMainFallbackContext(context = {}) {
        return context.sourceType === 'main' && context.volumeId === 'volume_five_homecoming';
    }

    function buildVisibleCostLabel(choice, promiseLabel, riskLabel, context = {}) {
        if (typeof choice?.visibleCostLabel === 'string' && choice.visibleCostLabel.trim()) {
            return choice.visibleCostLabel.trim();
        }
        if (choice?.costs && Object.keys(choice.costs).length > 0) {
            return `消耗：${formatChoiceCosts(choice.costs)}`;
        }
        if (choice?.ending) {
            return '此举代价：门前再退半步，答案就会被拖到以后。';
        }
        if (riskLabel === '涉险') {
            return '此举代价：心劫会先记住这一念。';
        }
        if (riskLabel === '有压') {
            if (!isLateMainFallbackContext(context)) {
                if (promiseLabel === '试探') return '此举代价：眼前果报会来得更迟';
                if (promiseLabel === '藏锋') return '此举代价：眼前脚步会慢半分';
                return '此举代价：会牵动后面的因果与去处';
            }
            return '此举代价：旧人旧账会更早找上门。';
        }
        if (promiseLabel === '藏锋') {
            return '此举代价：得先把自己再往暗处压半步。';
        }
        if (promiseLabel === '试探') {
            return '此举代价：得先挨着风声再往前探。';
        }
        return '此举代价：会把后面的去路牵得更紧。';
    }

    function normalizeImmediateResult(rawResult, fallbackTitle, fallbackDetail) {
        if (rawResult && typeof rawResult === 'object') {
            return {
                title: rawResult.title || fallbackTitle,
                detail: rawResult.detail || fallbackDetail,
            };
        }
        return {
            title: fallbackTitle,
            detail: fallbackDetail,
        };
    }

    function joinBranchImpactDetails(parts) {
        return parts
            .map((part) => (typeof part === 'string' ? part.trim() : ''))
            .filter(Boolean)
            .filter((part, index, items) => items.indexOf(part) === index)
            .join(' ');
    }

    function buildBranchImpactTitleSeed(text) {
        return String(text || '')
            .split('：')
            .pop()
            .trim()
            .replace(/[，。、“”"'‘’「」『』：；！？（）()【】《》、\s]/g, '')
            .replace(/[与和及]/g, '')
            .replace(/^第\d+章/, '')
            .trim();
    }

    function getBranchImpactTitleSuffix(promiseLabel, riskLabel) {
        if (promiseLabel === '保全') {
            return riskLabel === '涉险' ? '守线' : '留痕';
        }
        if (promiseLabel === '献祭') {
            return riskLabel === '涉险' ? '折光' : '留价';
        }
        if (promiseLabel === '夺取') {
            return riskLabel === '涉险' ? '试锋' : '取势';
        }
        if (promiseLabel === '试探') {
            return riskLabel === '涉险' ? '探锋' : '探路';
        }
        if (promiseLabel === '切割' || promiseLabel === '决裂') {
            return '断线';
        }
        return riskLabel === '涉险' ? '试锋' : '留痕';
    }

    function getBranchImpactKeywordTitle(choiceText) {
        const text = String(choiceText || '');
        const keywordMappings = [
            { pattern: /旧账|补偿|照拂/, title: '旧账归手' },
            { pattern: /重要|承认/, title: '正面承认' },
            { pattern: /乱星海|星海/, title: '海上押命' },
            { pattern: /结队|同行|一起进入禁地|一起进禁地/, title: '结队求生' },
            { pattern: /独自.*禁地|单独.*禁地/, title: '独自入局' },
            { pattern: /隐藏|避开|不住回去/, title: '来过不住' },
        ];
        const matched = keywordMappings.find((entry) => entry.pattern.test(text));
        return matched ? matched.title : '';
    }

    function buildFallbackBranchImpactTitle(choice, context, promiseLabel, riskLabel) {
        if (typeof choice?.branchImpact?.title === 'string' && choice.branchImpact.title.trim()) {
            return choice.branchImpact.title.trim();
        }

        const keywordTitle = getBranchImpactKeywordTitle(choice?.text);
        if (keywordTitle) {
            return keywordTitle;
        }

        const chapterSeed = buildBranchImpactTitleSeed(context?.chapterTitle || '');
        if (chapterSeed) {
            return `${chapterSeed.slice(0, Math.min(4, chapterSeed.length))}${getBranchImpactTitleSuffix(promiseLabel, riskLabel)}`;
        }

        const choiceSeed = buildBranchImpactTitleSeed(choice?.text || '');
        if (choiceSeed) {
            return `${choiceSeed.slice(0, Math.min(4, choiceSeed.length))}${getBranchImpactTitleSuffix(promiseLabel, riskLabel)}`;
        }

        return `${promiseLabel || '此步'}${getBranchImpactTitleSuffix(promiseLabel, riskLabel)}`;
    }

    function buildFallbackBranchImpactDetail(choice, context, riskLabel) {
        if (typeof choice?.branchImpact?.detail === 'string' && choice.branchImpact.detail.trim()) {
            return choice.branchImpact.detail.trim();
        }

        const chapterTitle = String(context?.chapterTitle || '这一节路').trim();
        const chapterSummary = String(context?.chapterSummary || '').trim();

        if (choice?.ending?.description) {
            return choice.ending.description;
        }

        if (riskLabel === '涉险') {
            return `在“${chapterTitle}”之后，这一步像把刀意压回袖里。眼下还没见血，可风声一紧，它就会先从手上发冷。`;
        }
        if (riskLabel === '有压') {
            return `在“${chapterTitle}”之后，你没有把话说满，可那股压着不发的劲已经留在身上。等旧人旧账再追上来时，先抬头的就是这一念。`;
        }
        if (chapterSummary) {
            return `${chapterSummary} 这一页合上后，余温不会立刻散，往后的路回头时还会先照到你。`;
        }
        return '这一念没有留在原地。等后路再拐回来时，先认出你的，会是它留下的动静。';
    }

    function normalizeBranchImpact(choice, context, echoPack, promiseLabel, riskLabel) {
        const delayedTitle = typeof echoPack?.delayed?.title === 'string' ? echoPack.delayed.title.trim() : '';
        const delayedDetail = typeof echoPack?.delayed?.detail === 'string' ? echoPack.delayed.detail.trim() : '';
        const immediateTitle = typeof echoPack?.immediate?.title === 'string' ? echoPack.immediate.title.trim() : '';
        const immediateDetail = typeof echoPack?.immediate?.detail === 'string' ? echoPack.immediate.detail.trim() : '';
        const explicitTitle = typeof choice?.branchImpact?.title === 'string' ? choice.branchImpact.title.trim() : '';
        const explicitDetail = typeof choice?.branchImpact?.detail === 'string' ? choice.branchImpact.detail.trim() : '';

        const title = explicitTitle
            || delayedTitle
            || immediateTitle
            || buildFallbackBranchImpactTitle(choice, context, promiseLabel, riskLabel);

        const detail = explicitDetail
            || joinBranchImpactDetails([immediateDetail, delayedDetail])
            || buildFallbackBranchImpactDetail(choice, context, riskLabel);

        return {
            title,
            detail,
            promiseLabel,
            riskLabel,
        };
    }

    function buildLongTermHint(choice, riskLabel, promiseLabel, echoPack, context = {}) {
        if (typeof choice?.longTermHint === 'string' && choice.longTermHint.trim()) {
            return choice.longTermHint.trim();
        }
        if (echoPack?.delayed?.detail) {
            return echoPack.delayed.detail;
        }
        if (choice?.ending) {
            return `门前若真走到“${choice.ending.title}”，这一念会先来讨你一句实话。`;
        }
        if (riskLabel === '涉险') {
            return '这一念会先记在心劫里，往后风声一紧，它就先响。';
        }
        if (riskLabel === '有压') {
            if (!isLateMainFallbackContext(context)) {
                const promiseSeed = promiseLabel === '试探'
                    ? '试探'
                    : (promiseLabel === '藏锋' ? '藏锋' : '保全');
                return `这一步不会立刻发作，却会在后面的几段路上留下能被认出的${promiseSeed}余波。`;
            }
            return '这一念不会当场闹大，可等你再站到门前时，旧人旧账会先一起回声。';
        }
        if (promiseLabel === '藏锋') {
            return '这一念先被你压进袖里，等路更窄时才会露出锋口。';
        }
        if (promiseLabel === '试探') {
            return '这一念先落在试探里，等旁人回看时才知道你当时把谁先摆上了秤。';
        }
        return '这一念已经留在路上，往后总会有人顺着它认出你来。';
    }

    function normalizeDelayedEchoes(choice, chapterId, choiceId, sourceType, echoPack, longTermHint, promiseLabel) {
        if (Array.isArray(choice?.delayedEchoes) && choice.delayedEchoes.length > 0) {
            return choice.delayedEchoes.map((entry, index) => ({
                id: entry.id || `${choiceId}_delayed_${index}`,
                title: entry.title || `${promiseLabel}余波`,
                detail: entry.detail || longTermHint,
                eligibleFromProgress: Number.isFinite(entry.eligibleFromProgress) ? Math.max(0, Math.floor(entry.eligibleFromProgress)) : getChapterProgressValue(chapterId) + 2,
                eligibleToProgress: Number.isFinite(entry.eligibleToProgress) ? Math.max(0, Math.floor(entry.eligibleToProgress)) : getChapterProgressValue(chapterId) + 5,
                consumed: Boolean(entry.consumed),
            }));
        }

        if (echoPack?.delayed) {
            const baseProgress = getChapterProgressValue(chapterId);
            return [{
                id: `${choiceId}_delayed`,
                title: echoPack.delayed.title || `${promiseLabel}余波`,
                detail: echoPack.delayed.detail || longTermHint,
                eligibleFromProgress: baseProgress + 2,
                eligibleToProgress: baseProgress + 5,
                consumed: false,
            }];
        }

        if (sourceType !== 'main') {
            return [];
        }

        const baseProgress = getChapterProgressValue(chapterId);
        return [{
            id: `${choiceId}_delayed`,
            title: `${promiseLabel}余波`,
            detail: longTermHint,
            eligibleFromProgress: baseProgress + 2,
            eligibleToProgress: baseProgress + 5,
            consumed: false,
        }];
    }

    function normalizeEndingSeeds(choice, choiceId, sourceType, promiseType, longTermHint, chapterId, volumeId = '') {
        if (Array.isArray(choice?.endingSeeds) && choice.endingSeeds.length > 0) {
            return choice.endingSeeds.map((entry, index) => ({
                id: entry.id || `${choiceId}_seed_${index}`,
                note: entry.note || longTermHint,
                promiseType,
            }));
        }

        if (sourceType !== 'main' && !choice?.ending) {
            return [];
        }

        return [{
            id: `${choiceId}_seed`,
            note: choice?.ending
                ? (isLateMainFallbackContext({ chapterId, sourceType, volumeId })
                    ? `门前若真走到“${choice.ending.title}”，这一念会先来讨你一句实话。`
                    : longTermHint)
                : longTermHint,
            promiseType,
        }];
    }

    function getChapterChoiceComment(state, npcName) {
        const chapterChoices = state?.chapterChoices || {};
        const entries = Object.entries(chapterChoices);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
            const [chapterId, choiceId] = entries[index];
            const choicePack = CHAPTER_ECHO_PACKS[chapterId]?.[choiceId];
            const npcPack = choicePack?.npcComment?.[npcName];
            if (!npcPack) continue;
            if (typeof npcPack === 'string') return npcPack;
            const relation = state?.npcRelations?.[npcName] || 0;
            if (relation >= 60 && npcPack.high) return npcPack.high;
            if (relation <= 20 && npcPack.low) return npcPack.low;
            return npcPack.neutral || npcPack.high || npcPack.low || '';
        }
        return '';
    }

    function getStoryProgressNumber(state) {
        const raw = state?.storyProgress;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            return raw;
        }
        const matched = String(raw || '').match(/^(\d+)/);
        return matched ? Number.parseInt(matched[1], 10) : 0;
    }

    function pickSeededLine(lines, seed) {
        if (!Array.isArray(lines) || lines.length === 0) {
            return '';
        }
        const normalizedSeed = Math.abs(Number(seed) || 0) % lines.length;
        return lines[normalizedSeed];
    }

    // 这里用确定性选句，保证同一存档下 NPC 口风稳定，不会因为刷新界面来回跳变。
    function pickNpcLine(state, npcName, groups, offset = 0) {
        const relation = state?.npcRelations?.[npcName] || 0;
        const bucket = relation >= 50 ? 'high' : relation <= 0 ? 'low' : 'neutral';
        const lines = groups[bucket] || groups.neutral || groups.high || groups.low || [];
        const routes = state?.routeScores || {};
        const seed = getStoryProgressNumber(state)
            + relation
            + (routes.orthodox || 0)
            + (routes.demonic || 0)
            + (routes.secluded || 0)
            + offset;
        return pickSeededLine(lines, seed);
    }

    function hasAnyFlag(state, flagNames) {
        const flags = state?.flags || {};
        return flagNames.some((flagName) => Boolean(flags[flagName]));
    }

    const NPCS = {
        '墨大夫': {
            name: '墨大夫',
            title: '神手谷主人',
            avatar: '墨',
            dialogueByStage(state) {
                const highIntensityEcho = [
                    '我早说过，你这种人不是心狠，是太早知道心不狠活不下来。',
                    '你如今看人时那一眼，倒比我年轻时还稳。',
                    '别急着否认。你越想和我划清界限，就越说明你知道自己学到了什么。',
                    '我教你的从来不是医术，是怎么把别人的命看成一种可计算的东西。',
                    '你比我走得远，只因你比我更懂什么时候该装得像个人。',
                ];
                const neutralFragments = [
                    '若你看到这里，说明你终究还是活下来了。',
                    '我一生不信善恶，只信能不能成事。如今想来，也未必全对。',
                    '你若肯认我半分授业之实，便替我把该了的债了几笔。',
                    '人一旦尝过掌控他人生死的滋味，便很难再甘于只做棋子。',
                    '你以后若收弟子，迟早会懂：真正难教的不是蠢人，是像你我这样太会算的人。',
                ];
                const resist = [
                    '我不是你。',
                    '可每次说这话时，你都比平时更像在说服自己。',
                    '我学的是活命，不是学你。',
                    '但活命这两个字，本就是你最先教会我的。',
                    '若我真成了你，那我这一生也太可笑了。',
                ];
                const seed = getStoryProgressNumber(state);
                if (state.flags.firstSilencingKill) {
                    return pickSeededLine([
                        '你看，第一次最难，后面就顺了。',
                        '别怕承认，干净利落本就是一种天赋。',
                    ], seed);
                }
                if (state.flags.quhunReleased) {
                    return pickSeededLine([
                        '你居然舍得放。倒比我想的还多留了一点人味。',
                        '可记住，仁慈这种东西，通常都很贵。',
                    ], seed + 1);
                }
                if (state.flags.executedDisabledEnemy) {
                    return pickSeededLine([
                        '这一步你终究还是走到了。',
                        '现在你该懂，为何我从不信所谓留一线。',
                    ], seed + 2);
                }
                if (state.flags.postponedAscension || ['youxi_hongchen', 'xianfan_shutu'].includes(state.ending?.id)) {
                    return pickSeededLine([
                        '你走到这里，竟还没把那点凡心磨光。',
                        '也罢。也许正因如此，你才没彻底像我。',
                    ], seed + 3);
                }
                if (hasAnyFlag(state, ['executedDisabledEnemy', 'demonicPathSeed', 'betrayedSect'])
                    || (state.routeScores.demonic || 0) > ((state.routeScores.orthodox || 0) + (state.routeScores.secluded || 0))) {
                    return pickSeededLine(highIntensityEcho, seed + 4);
                }
                if ((state.npcRelations['墨大夫'] || 0) <= -20) {
                    return pickSeededLine(resist, seed + 5);
                }
                if (state.flags.startPath === 'disciple') {
                    return '好生炼药，别让旁人看出你手上这点灵性。';
                }
                return pickNpcLine(state, '墨大夫', {
                    high: highIntensityEcho,
                    neutral: neutralFragments,
                    low: resist,
                }, 6);
            },
        },
        '厉飞雨': {
            name: '厉飞雨',
            title: '七玄门内门弟子',
            avatar: '厉',
            dialogueByStage(state) {
                const high = [
                    '你现在看着厉害，可我还是更记得你当年那副不服输的穷酸样。',
                    '别人怕你，我不怕。你再怎么变，骨子里也还是那个不肯认命的家伙。',
                    '你若真哪天混到天上去了，也别把青牛镇忘得太干净。',
                    '你这人命硬，我一直知道。就是没想到会硬到今天这份上。',
                    '我不懂你们修仙那些大道理，但我看得出，你活得越来越累了。',
                ];
                const neutral = [
                    '你变了，这不奇怪。换我走你那条路，也未必还像现在这样说话。',
                    '你如今说一句话，要想三层。我听着都替你费劲。',
                    '能活到今天，总得丢点什么。你丢得算少还是算多，我看不清。',
                    '你现在回来看一眼，也算没把旧地方全忘了。',
                    '我帮不了你什么，顶多提醒你一句：别把自己活得连自己都不认了。',
                ];
                const low = [
                    '你是回来看看，还是回来确认自己早就不属于这儿了？',
                    '你现在站得高，说话也轻了。可轻不代表别人听不出来你在算。',
                    '有些人走出去是为了回来，有些人走出去就真不打算再认旧人了。',
                    '我以前觉得你只是谨慎，现在看，你是越来越会跟过去撇清。',
                    '你若只是想顺路看看我还活没活着，那看完也可以走了。',
                ];
                const seed = getStoryProgressNumber(state);
                if (state.flags.helpedOldFriendAgain) {
                    return pickSeededLine([
                        '你还肯回头帮这一把，我记下了。',
                        '行，我不和你说谢。咱们之间说这个太生分。',
                    ], seed);
                }
                if (state.flags.returnedTiannanButRemainedHidden || state.flags.returnedToSeclusion) {
                    return pickSeededLine([
                        '你都回来了，还藏着做什么？怕旧人认出你，还是怕自己认出旧日子？',
                        '你这活法，真像一阵风，谁都摸不住。',
                    ], seed + 1);
                }
                if (state.flags.battlefieldReputationFearsome) {
                    return pickSeededLine([
                        '外面都说你狠。我信一半。',
                        '你真狠了，才活得到今天；可你要是全狠了，也不会回来见我。',
                    ], seed + 2);
                }
                if (state.flags.keptDistanceFromOldFriend) {
                    return pickSeededLine(low, seed + 3);
                }
                return pickNpcLine(state, '厉飞雨', { high, neutral, low }, 7);
            },
        },
        '墨彩环': {
            name: '墨彩环',
            title: '墨府小姐',
            avatar: '彩',
            dialogueByStage(state) {
                const high = [
                    '你回来得晚，但总算不是没有回来。',
                    '我后来不再等你，只是记着你说过的话。你今日来了，那便算你没全失信。',
                    '你们修仙的人总说尘缘易断，可真断不断，不在嘴上。',
                    '我如今过得不算多好，但至少不是靠等谁活着。',
                    '你若真想补，就别只补给自己安心。',
                ];
                const neutral = [
                    '人总要往前过。你是修仙，我是过日子，本就不是一条路。',
                    '你欠不欠，我记得；你还不还，那是你的事。',
                    '当年那点事，我早就不日日想了。只是有些话，现在说出来也不再疼了。',
                    '你若只是来看看我过得如何，那你看到了。我没死，也没等。',
                    '凡人的日子很短，等太久，很多心思自己就熄了。',
                ];
                const low = [
                    '你回来做什么？收尾，还是确认当年那笔账终究没人追到你头上？',
                    '我最怕的不是你走，是你走的时候还说那是为了我好。',
                    '你们修仙的人最擅长的，就是把离开说成无可奈何。',
                    '我后来想明白了。指望一个修仙的人回来，和指望风别吹散灯一样，都不可靠。',
                    '你若想求我原谅，大可不必。我不是不恨，是恨久了也要活。',
                ];
                const seed = getStoryProgressNumber(state);
                if (state.flags.protectedMoHouse) {
                    return pickSeededLine([
                        '那次若不是你，墨府那点根怕是真保不住。',
                        '我不说感激，可这笔情，我知道该怎么记。',
                    ], seed);
                }
                if (state.flags.lootedMoHouse || state.flags.tookTreasure) {
                    return pickSeededLine([
                        '我后来最难受的不是你拿了什么，是你拿的时候，居然真能不回头。',
                        '那天我才知道，原来旧情在你眼里也可以折成价。',
                    ], seed + 1);
                }
                if (state.flags.promisedMoReturn || state.flags.daoLvPromise) {
                    return pickSeededLine([
                        '你这句我会回来，我记了很多年。',
                        '你若今日不来，这话往后也就不必再提了。',
                    ], seed + 2);
                }
                if (state.flags.madeAmendsToMocaihuan || state.flags.mendedMoHouseDebt) {
                    return pickSeededLine([
                        '迟来的补偿不是没用，只是它补不回那几年。',
                        '但人总不能一辈子只盯着没补回来的地方活。',
                    ], seed + 3);
                }
                if (state.flags.admittedOldWrongToMocaihuan) {
                    return '人肯认错不算容易。只是有些日子已经过去，终究回不到原样。';
                }
                if (state.flags.checkedOnMocaihuanThenLeft) {
                    return '你来确认我安好，这就够了。剩下的日子，我会自己过。';
                }
                return pickNpcLine(state, '墨彩环', { high, neutral, low }, 9);
            },
        },
        '南宫婉': {
            name: '南宫婉',
            title: '掩月宗仙子',
            avatar: '婉',
            dialogueByStage(state) {
                const high = [
                    '你还是老样子，越在意，越装得像没事。',
                    '你从来不是无情，只是太习惯先保住自己。',
                    '我见过你最狼狈的时候，所以你不必在我面前装得太稳。',
                    '你若记得，就不必总挂在嘴上。真记得的人，做事会变。',
                    '你一路走到今天，最难得的不是活着，是还没把该记的人全忘了。',
                ];
                const neutral = [
                    '你比以前更会藏了。',
                    '你总算学会先看局势再动，可有时也太会把自己藏进退路里。',
                    '禁地那件事我记得，但我不靠回忆活。',
                    '你若要还账，就别只会说以后。',
                    '你站得越高，越像谁也不欠。可真不欠的人，不会老避着不谈。',
                ];
                const low = [
                    '你不是断得干净，你只是怕。',
                    '你最会做的，不是拒绝，是把所有话都拖到谁也追不上的以后。',
                    '我不怪你选活路。只是你若连那也不敢认，便太难看。',
                    '你当年若真不在乎，也不必每次见我都像什么都没发生过。',
                    '你把自己护得很好。只是护久了，谁也进不来。',
                ];
                const seed = getStoryProgressNumber(state);
                if (state.flags.nangongTrustSeed || state.flags.savedNangong) {
                    return pickSeededLine([
                        '那时我敢把后背给你半息，已算难得。',
                        '你若连那半息都忘了，往后很多话也不必再说。',
                    ], seed);
                }
                if (state.flags.acceptedNangongDebt || state.flags.acceptedNangongPath) {
                    return pickSeededLine([
                        '你既认了，就别总拿修行为借口。',
                        '人情不是锁，可你既欠了，最好别装作没欠。',
                    ], seed + 1);
                }
                if (state.flags.suppressedNangongFeelings) {
                    return pickSeededLine([
                        '你压得住心，不代表压得住记忆。',
                        '越是刻意无事，越说明并非真无事。',
                    ], seed + 2);
                }
                if (hasAnyFlag(state, ['cutNangongTies', 'cutEmotion'])) {
                    return pickSeededLine([
                        '你切得倒快。只是很多事不是切断了就算过去。',
                        '你若真能全忘，今日看我时就不会停那一下。',
                    ], seed + 3);
                }
                if (state.flags.openlyAcknowledgedNangongImportance) {
                    return pickSeededLine([
                        '你终于肯不把一切都算成利弊了。',
                        '这一步比你破境还难，我知道。',
                    ], seed + 4);
                }
                if (state.flags.cooperatedAtXuTian) {
                    return '虚天殿那次你没先翻脸，这种事在乱星海比情话更值钱。';
                }
                if (state.flags.rescuedFromXuTianEdge) {
                    return '你既然都在殿外回过头，就别再装作自己什么人都不想认。';
                }
                if (state.flags.grabbedTreasure) {
                    return '你先伸手夺宝那一下，倒比你平日的推托更诚实。';
                }
                if (state.flags.watchedXuTianFight || state.flags.slippedPastXuTian) {
                    return pickNpcLine(state, '南宫婉', { high, neutral, low }, 11);
                }
                return pickNpcLine(state, '南宫婉', { high, neutral, low }, 10);
            },
        },
        '李化元': {
            name: '李化元',
            title: '黄枫谷长老',
            avatar: '李',
            dialogueByStage(state) {
                const high = [
                    '你总算不只是会替自己活。',
                    '修为高的人不缺，真正知道什么时候该上、什么时候该退的人才值钱。',
                    '你这一路没白走，至少没把谨慎活成怯懦。',
                    '你若真能把心性立住，往后不比任何资质更好的人差。',
                    '我看重你，不是因为你听话，是因为你知道代价。',
                ];
                const neutral = [
                    '你脑子够用，只是心还不够稳。',
                    '会留退路没错，可太会留退路，也会让人不敢全信。',
                    '你不是没有担当，只是总要先算到自己吃不吃亏。',
                    '宗门给你的，不是白给。你若用过，日后就得认。',
                    '别把独立当成什么都不背。真正的独立，是代价全自己扛。',
                ];
                const low = [
                    '你太会算，算到最后容易把自己也算轻了。',
                    '一个只肯借势、不肯认责的人，走不远。',
                    '你若总想着谁都不欠，迟早会发现谁也不愿替你担。',
                    '聪明人我见得多，真正可用的没有几个。',
                    '你最像的不是我年轻时，是那些以为永远能站在门外看局的人。',
                ];
                const seed = getStoryProgressNumber(state);
                if (state.flags.enteredLihuayuanLineage) {
                    return pickSeededLine([
                        '既入我门下，往后很多事便不能只按你一个人的活法来办。',
                        '我给你门路，也要看你能不能担得起门内的分量。',
                    ], seed);
                }
                if (state.flags.respectedLihuayuanButStayedIndependent) {
                    return pickSeededLine([
                        '你敬我，却不肯全信我。我能理解，也不会白白信你。',
                        '这样活下去不容易，但你既然选了，就别抱怨没人替你兜底。',
                    ], seed + 1);
                }
                if (state.flags.stoodTheLine || state.flags.mineChoice === 'hold') {
                    return pickSeededLine([
                        '那次你站住了，我记下了。',
                        '很多弟子会死，你若想活得有些不一样，便记住自己为何没退。',
                    ], seed + 2);
                }
                if (state.flags.rescuedSmallGroup || state.flags.mineChoice === 'rearGuard' || state.flags.warChoice === 'secluded') {
                    return pickSeededLine([
                        '你救下了人，也丢了阵线。宗门未必满意，我却不觉得那全是错。',
                        '会带人活，是本事；敢背因此来的非议，更是本事。',
                    ], seed + 3);
                }
                if (state.flags.usedLihuayuanInfluencePragmatically || state.flags.learnsSecretively) {
                    return pickSeededLine(low, seed + 4);
                }
                if (state.flags.answeredLiSummons) {
                    return '门墙不只记名分，也记得谁肯在最后回来把话说清。';
                }
                return pickNpcLine(state, '李化元', { high, neutral, low }, 12);
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
                if (state.flags.tookQuhunByForce) return '主人若只拿我当债，曲魂也会替主人把这层债记着。';
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

    function normalizeTradeoff(rawTradeoff, choice) {
        if (rawTradeoff && typeof rawTradeoff === 'object') {
            const battleWillGain = Number.isFinite(rawTradeoff.battleWillGain)
                ? Math.max(1, Math.min(3, Math.floor(rawTradeoff.battleWillGain)))
                : 2;
            const tribulationGain = Number.isFinite(rawTradeoff.tribulationGain)
                ? Math.max(1, Math.min(2, Math.floor(rawTradeoff.tribulationGain)))
                : 1;
            return { battleWillGain, tribulationGain };
        }

        const routeScores = choice?.effects?.routeScores || {};
        if ((routeScores.demonic || 0) > 0) {
            return { battleWillGain: 3, tribulationGain: 2 };
        }
        if ((routeScores.secluded || 0) > 0) {
            return { battleWillGain: 1, tribulationGain: 1 };
        }
        return { battleWillGain: 2, tribulationGain: 1 };
    }

    function normalizeChoice(choice, fallbackId, context = {}) {
        const normalizedId = choice.id || fallbackId;
        const authoredBranchImpact = BRANCH_IMPACT_PACKS[context.chapterId ?? normalizedId]?.[normalizedId] || null;
        const preparedChoice = authoredBranchImpact
            ? {
                ...choice,
                branchImpact: {
                    ...(authoredBranchImpact || {}),
                    ...(choice.branchImpact || {}),
                },
            }
            : choice;
        const tradeoff = normalizeTradeoff(preparedChoice.tradeoff, preparedChoice);
        const sourceType = context.sourceType || 'main';
        const chapterId = context.chapterId ?? normalizedId;
        const chapterTitle = context.chapterTitle || '';
        const chapterSummary = context.chapterSummary || '';
        const volumeId = context.volumeId || '';
        const echoPack = CHAPTER_ECHO_PACKS[chapterId]?.[normalizedId] || null;
        const promiseType = inferPromiseType({ ...preparedChoice, id: normalizedId });
        const riskTier = inferRiskTier({ ...preparedChoice, id: normalizedId }, tradeoff);
        const promiseLabel = PROMISE_LABELS[promiseType];
        const riskLabel = RISK_LABELS[riskTier];
        const immediateFallbackTitle = echoPack?.immediate?.title || `${promiseLabel}已定`;
        const immediateFallbackDetail = echoPack?.immediate?.detail
            || `你选了“${preparedChoice.text}”。这一念已落下印记，往后的相逢、旧账与去处都会再被它牵动。`;
        const immediateResult = normalizeImmediateResult(preparedChoice.immediateResult || echoPack?.immediate, immediateFallbackTitle, immediateFallbackDetail);
        const branchImpact = normalizeBranchImpact(preparedChoice, {
            chapterId,
            chapterTitle,
            chapterSummary,
            sourceType,
        }, echoPack, promiseLabel, riskLabel);
        const longTermHint = buildLongTermHint(preparedChoice, riskLabel, promiseLabel, echoPack, {
            chapterId,
            sourceType,
            volumeId,
        });
        const visibleCostLabel = buildVisibleCostLabel(preparedChoice, promiseLabel, riskLabel, {
            chapterId,
            sourceType,
            volumeId,
        });
        const defaultPressureDelta = riskTier === 'perilous'
            ? Math.max(1, Math.min(3, Math.floor((tradeoff.tribulationGain || 0) - 1 + (preparedChoice.ending ? 1 : 0))))
            : 0;

        return {
            ...preparedChoice,
            id: normalizedId,
            effects: preparedChoice.effects || {},
            nextChapterId: preparedChoice.nextChapterId ?? null,
            tradeoff,
            promiseType,
            promiseLabel,
            riskTier,
            riskLabel,
            visibleCostLabel,
            branchImpact,
            immediateResult,
            longTermHint,
            pressureDelta: Math.max(0, Math.min(3, Math.floor(preparedChoice.pressureDelta ?? defaultPressureDelta))),
            resolveDelta: Math.max(0, Math.min(3, Math.floor(preparedChoice.resolveDelta ?? tradeoff.battleWillGain ?? 0))),
            delayedEchoes: normalizeDelayedEchoes(preparedChoice, chapterId, normalizedId, sourceType, echoPack, longTermHint, promiseLabel),
            endingSeeds: normalizeEndingSeeds(preparedChoice, normalizedId, sourceType, promiseType, longTermHint, chapterId, volumeId),
        };
    }

    function levelEvent(options) {
        return {
            id: options.id,
            realmScore: options.realmScore,
            title: options.title,
            summary: options.summary,
            requirements: options.requirements,
            beats: options.beats,
            choices: options.choices,
            effects: options.effects || {},
            once: options.once !== false,
        };
    }

    const LEVEL_STORY_EVENTS = [
        levelEvent({
            id: 'qi_0',
            realmScore: 0,
            title: '炼气初期：第一缕灵气',
            summary: '修仙的开端不是神圣感，而是一个凡人第一次意识到自己再也不能只按凡人的方式活。',
            requirements: { realmScoreAtLeast: 0 },
            beats() {
                return [
                    beat('旁白', '第一次感到灵气入体时，你没有欣喜，只有惊惧。那感觉像有一丝冰凉的水顺着经脉最细处缓缓流过，把原本属于凡人的身体轻轻拨开了一条缝。'),
                    beat('旁白', '修仙的开端并不神圣，它只是让一个凡人第一次意识到，自己可能再也不能只按凡人的方式活了。'),
                ];
            },
            choices() {
                return [
                    { id: 'stabilize_fast', text: '强行继续运转周天', effects: { cultivation: 10, routeScores: { orthodox: 1 } } },
                    { id: 'observe_change', text: '停下体悟，先记住这种变化', effects: { cultivation: 6, routeScores: { secluded: 2 } } },
                    { id: 'suppress_instinctively', text: '下意识压住气感', effects: { cultivation: 4, flags: { fanxinAnchorLight: true } } },
                ];
            },
        }),
        levelEvent({
            id: 'qi_1',
            realmScore: 1,
            title: '炼气中期：药火第一次失控',
            summary: '修仙不是空想，它会很具体地烧掉你的钱、时间与希望。',
            requirements: { realmScoreAtLeast: 1 },
            beats() {
                return [
                    beat('旁白', '你照着残缺丹方试着温养药液，火候只差一丝便全盘皆坏。焦苦的药气冲上来时，你第一次真正感到：修仙不是空想，它会很具体地烧掉你的钱、时间与希望。'),
                    beat('旁白', '很多人后来只看见你会炼、会算、会省，没人知道你最早学会的，是失败也得自己买单。'),
                ];
            },
            choices() {
                return [
                    { id: 'retry', text: '继续试，不计成本摸透', effects: { cultivation: 8, flags: { alchemyProgress1: true } } },
                    { id: 'record_mistake', text: '记下失误，暂缓炼药', effects: { cultivation: 6, routeScores: { secluded: 1 } } },
                    { id: 'grow_irritable', text: '迁怒于自己资质不够', effects: { cultivation: 4, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'qi_2',
            realmScore: 2,
            title: '炼气后期：经脉如针',
            summary: '你后来追境界时，有一半其实不是为了更高，而是为了不再回到无能为力的时候。',
            requirements: { realmScoreAtLeast: 2 },
            beats() {
                return [
                    beat('旁白', '夜里运功时，经脉忽如针扎。你强撑着没停，恍惚间想起家中长辈劳作后的手。那一刻你忽然把修行和“再也不要无能为力”绑在了一起。'),
                    beat('旁白', '你后来追境界时，有一半其实不是为了更高，而是为了不再回到那种只能咬牙忍着、却什么都改变不了的状态。'),
                ];
            },
            choices() {
                return [
                    { id: 'vow_not_to_be_weak', text: '咬牙撑过，立下绝不再弱之念', effects: { cultivation: 8, flags: { fanxinAnchor1: true } } },
                    { id: 'stop_and_breathe', text: '停功调息，接受自己还不够强', effects: { cultivation: 6, routeScores: { secluded: 1 } } },
                    { id: 'feel_retreat', text: '想起凡人日子，生出一点退意', effects: { cultivation: 4, flags: { homesickSeed: true } } },
                ];
            },
        }),
        levelEvent({
            id: 'ji_3',
            realmScore: 3,
            title: '筑基初期：脱胎',
            summary: '破境不是多了一层修为，而是你第一次清楚感觉到，自己真的在离过去那个凡人越来越远。',
            requirements: { realmScoreAtLeast: 3 },
            beats() {
                return [
                    beat('旁白', '筑基之后第一次照见自身时，你竟有一瞬陌生。骨肉更凝，气机更稳，像是旧的自己死了一次，而新的自己正踩着旧骨头站起来。'),
                    beat('旁白', '破境不是多了一层修为，而是你第一次清楚感觉到，自己真的在离过去那个凡人越来越远。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_change', text: '接受这种变化', effects: { cultivation: 15 } },
                    { id: 'feel_unsettled', text: '对旧我已去生出惶然', effects: { cultivation: 8, flags: { fanxinAnchor2: true } } },
                    { id: 'treat_as_upgrade', text: '把这当成理所当然的晋升', effects: { cultivation: 10, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'ji_4',
            realmScore: 4,
            title: '筑基中期：人情入局',
            summary: '你第一次发现，修为一高，连别人对你好都不再那么单纯。',
            requirements: { realmScoreAtLeast: 4 },
            beats() {
                return [
                    beat('旁白', '筑基后第一次，有人带着礼物与试探来接近你。对方说得很客气，像只是来道贺，可你听得分明：他们不是来认识你，是来确认你值不值得先结一层情。'),
                    beat('旁白', '你第一次发现，修为一高，连别人对你好都不再那么单纯。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_and_remember', text: '收下善意，也记住其用意', effects: { cultivation: 10, flags: { socialCapital1: true } } },
                    { id: 'decline_all', text: '婉拒一切，不愿卷入', effects: { cultivation: 6, routeScores: { secluded: 2 } } },
                    { id: 'reverse_observe', text: '借势反过来观察对方', effects: { cultivation: 8, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'ji_5',
            realmScore: 5,
            title: '筑基后期：瓶颈见锋',
            summary: '很多瓶颈并不长在经脉里，它们长在你不愿承认却始终绕不开的那一点心思上。',
            requirements: { realmScoreAtLeast: 5 },
            beats() {
                return [
                    beat('旁白', '修为停住的那段时间，你试了很多法子，都差一点。最后你才隐约明白，不是灵力不够，而是心里有一件事一直没放平。'),
                    beat('旁白', '很多瓶颈并不长在经脉里，它们长在你不愿承认却始终绕不开的那一点心思上。'),
                ];
            },
            choices() {
                return [
                    { id: 'face_the_thorn', text: '正视那根刺', effects: { cultivation: 12, flags: { heartStability1: true } } },
                    { id: 'force_break', text: '继续硬冲，不理心障', effects: { cultivation: 10, routeScores: { demonic: 2 } } },
                    { id: 'wait_it_out', text: '暂退半步，等它自己淡', effects: { cultivation: 8, routeScores: { secluded: 2 } } },
                ];
            },
        }),
        levelEvent({
            id: 'jin_6',
            realmScore: 6,
            title: '金丹初期：丹成孤意',
            summary: '强并不会自动让人更圆满，很多时候，它只是让你更难把心里那点空说给谁听。',
            requirements: { realmScoreAtLeast: 6 },
            beats() {
                return [
                    beat('旁白', '金丹既成，气象自不同。可真正破境那一刻，你最先感到的不是喜，而是一种说不出的空：这么大的事，身边竟没有一个真正适合开口的人。'),
                    beat('旁白', '强并不会自动让人更圆满，很多时候，它只是让你更难把心里那点空说给谁听。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_loneliness', text: '接受强者本就更孤', effects: { cultivation: 10, routeScores: { secluded: 2 } } },
                    { id: 'think_of_old_people', text: '想起旧人，生出回望之意', effects: { cultivation: 8, relations: { '南宫婉': 2, '厉飞雨': 2, '墨彩环': 2 } } },
                    { id: 'press_down_emptiness', text: '用修为压住这点空意', effects: { cultivation: 6, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'jin_7',
            realmScore: 7,
            title: '金丹中期：旧账倒灌',
            summary: '旧账不会因为你变强就自动消失，它们只是等你有能力面对了，才回来。',
            requirements: { realmScoreAtLeast: 7 },
            beats() {
                return [
                    beat('旁白', '名声渐起之后，一些旧人旧事忽然又浮了上来。你原以为早年那些已经翻过去的决定，如今才知道，它们不过是一直压在水下，等你走高了再一起浮出。'),
                    beat('旁白', '旧账不会因为你变强就自动消失，它们只是等你有能力面对了，才回来。'),
                ];
            },
            choices() {
                return [
                    { id: 'clear_old_debts', text: '主动清账', effects: { cultivation: 12, flags: { oldDebtProgress1: true } } },
                    { id: 'delay', text: '暂不理会', effects: { cultivation: 6, routeScores: { secluded: 1 } } },
                    { id: 'sort_by_value', text: '先看谁更值得处理', effects: { cultivation: 8, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'jin_8',
            realmScore: 8,
            title: '金丹后期：名声先于你到场',
            summary: '名声最可怕的地方，不是别人怎么看你，而是它会反过来逼你活成某种样子。',
            requirements: { realmScoreAtLeast: 8 },
            beats() {
                return [
                    beat('旁白', '第一次，你还未进门，旁人便先低声提起了你的名字。有人敬，有人惧，也有人已经在心里替你安了一个位置。'),
                    beat('旁白', '名声最可怕的地方，不是别人怎么看你，而是它会反过来逼你活成某种样子。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_reputation', text: '接受名声带来的便利', effects: { cultivation: 10, flags: { reputation1: true } } },
                    { id: 'fear_reputation', text: '对名声本能防备', effects: { cultivation: 6, routeScores: { secluded: 2 } } },
                    { id: 'use_reputation', text: '主动利用名声压场', effects: { cultivation: 8, routeScores: { demonic: 2 } } },
                ];
            },
        }),
        levelEvent({
            id: 'yu_9',
            realmScore: 9,
            title: '元婴初期：神识外放',
            summary: '强者之所以危险，不只是因为能杀，更因为他开始太容易看见别人，而别人看不见他。',
            requirements: { realmScoreAtLeast: 9 },
            beats() {
                return [
                    beat('旁白', '神识扩张之后，你第一次能轻易感知许多从前触不到的细节。墙后之人、远处气机、旁人的一丝犹豫与心乱，都像摆到眼前。'),
                    beat('旁白', '强者之所以危险，不只是因为能杀，更因为他开始太容易看见别人，而别人看不见他。'),
                ];
            },
            choices() {
                return [
                    { id: 'adapt', text: '适应这种变化', effects: { cultivation: 20 } },
                    { id: 'restrain', text: '刻意收束，不愿滥用', effects: { cultivation: 8, routeScores: { orthodox: 1 } } },
                    { id: 'enjoy_control', text: '享受掌控全局的快感', effects: { cultivation: 10, routeScores: { demonic: 2 } } },
                ];
            },
        }),
        levelEvent({
            id: 'yu_10',
            realmScore: 10,
            title: '元婴中期：海路长夜',
            summary: '人越往后走，越容易把“我习惯了”错当成“我喜欢这样”。',
            requirements: { realmScoreAtLeast: 10 },
            beats() {
                return [
                    beat('旁白', '孤舟夜渡时，四野无声，只有潮声不断。你忽然发现，自己已经很久没有真正相信过谁了。'),
                    beat('旁白', '人越往后走，越容易把“我习惯了”错当成“我喜欢这样”。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_solitude', text: '接受这份孤独', effects: { cultivation: 8, routeScores: { secluded: 2 } } },
                    { id: 'remember_someone', text: '想起某个仍能信半分的人', effects: { cultivation: 6, relations: { '南宫婉': 3, '厉飞雨': 3 } } },
                    { id: 'prefer_it', text: '觉得这样最好', effects: { cultivation: 4, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'yu_11',
            realmScore: 11,
            title: '元婴后期：心魔借形',
            summary: '真正难过的心魔，从来不是它多强，而是它偏偏知道该问你哪一句话。',
            requirements: { realmScoreAtLeast: 11 },
            beats() {
                return [
                    beat('旁白', '心魔出现时，不是敌人的脸，也不是旧仇的影子。它竟是你自己年少时的样子，轻轻问：你现在活成你当初想变成的人了吗？'),
                    beat('旁白', '真正难过的心魔，从来不是它多强，而是它偏偏知道该问你哪一句话。'),
                ];
            },
            choices() {
                return [
                    { id: 'answer_it', text: '正面回答', effects: { cultivation: 12, flags: { heartStability2: true } } },
                    { id: 'crush_it', text: '强行压碎心魔', effects: { cultivation: 10, routeScores: { demonic: 2 } } },
                    { id: 'stay_silent', text: '沉默不语', effects: { cultivation: 8, routeScores: { secluded: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'hs_12',
            realmScore: 12,
            title: '化神初期：天光破境',
            summary: '修为越高，越难再靠“等我更强了就好了”来骗自己。',
            requirements: { realmScoreAtLeast: 12 },
            beats() {
                return [
                    beat('旁白', '破境成功那一瞬，天地像忽然静了一层。你本该欢喜，却只感到空。那些曾经拼命想得到的东西，如今真到了手边，反倒没能填上心里任何缺口。'),
                    beat('旁白', '修为越高，越难再靠“等我更强了就好了”来骗自己。'),
                ];
            },
            choices() {
                return [
                    { id: 'accept_high_not_full', text: '接受更高未必更满', effects: { cultivation: 12, flags: { heartStability3: true } } },
                    { id: 'seek_next_goal', text: '立刻寻找下一层目标', effects: { cultivation: 10, routeScores: { demonic: 1 } } },
                    { id: 'stay_alert', text: '对这份空意生出警惕', effects: { cultivation: 8, routeScores: { secluded: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'hs_13',
            realmScore: 13,
            title: '化神中期：旧人来信',
            summary: '有些信最重，不是字多，而是你知道它不会再有第二封。',
            requirements: { realmScoreAtLeast: 13 },
            beats() {
                return [
                    beat('旁白', '这时再收到旧人来信，已经不是普通问候。有人将死，有人在等，有人只是平静告诉你：许多事若再不回来认，便真的不用认了。'),
                    beat('旁白', '有些信最重，不是字多，而是你知道它不会再有第二封。'),
                ];
            },
            choices() {
                return [
                    { id: 'return_now', text: '立刻回去', effects: { cultivation: 10, flags: { oldDebtProgress2: true } } },
                    { id: 'stabilize_first', text: '先稳局势，再说', effects: { cultivation: 8, routeScores: { secluded: 1 } } },
                    { id: 'put_away', text: '把信收起，不立刻回应', effects: { cultivation: 6, routeScores: { demonic: 1 } } },
                ];
            },
        }),
        levelEvent({
            id: 'hs_14',
            realmScore: 14,
            title: '化神后期：飞升前夜',
            summary: '门真正开之前，最难过的那一关，从来不在天上，而在你敢不敢把这一生原样看一遍。',
            requirements: { realmScoreAtLeast: 14 },
            beats() {
                return [
                    beat('旁白', '临近终局，你把最早带出来的旧物放在案上。它们都不值钱，却比任何重宝都更像真正陪你走到这里的东西。'),
                    beat('旁白', '门真正开之前，最难过的那一关，从来不在天上，而在你敢不敢把这一生原样看一遍。'),
                ];
            },
            choices() {
                return [
                    { id: 'carry_all_forward', text: '承认来路，带着一切继续往前', effects: { cultivation: 12, flags: { endingBiasCarryOrigin: true } } },
                    { id: 'higher_above_all', text: '觉得只要更高，一切都可放下', effects: { cultivation: 10, flags: { endingBiasForget: true } } },
                    { id: 'consider_staying', text: '第一次认真考虑留下', effects: { cultivation: 8, flags: { endingBiasStay: true } } },
                ];
            },
        }),
    ];

    LEVEL_STORY_EVENTS.forEach((event) => {
        const originalChoices = event.choices;
        event.choices = function normalizedChoices(state) {
            const rawChoices = typeof originalChoices === 'function' ? originalChoices(state) : originalChoices;
            return rawChoices.map((choice, index) => normalizeChoice(choice, `${event.id}_choice_${index}`, {
                chapterId: event.id,
                sourceType: 'level',
                chapterTitle: event.title,
                chapterSummary: event.summary,
            }));
        };
    });

    const STORY_CHAPTERS = [
        {
            id: 0,
            title: '山村少年',
            summary: '青牛镇的柴刀、月光与残卷，给了你走出凡尘的第一步。',
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_one_chapter_1',
            location: '青牛镇',
            requirements: { storyProgress: 0 },
            beats() {
                return [
                    beat('旁白', '越国边角的青牛镇，夜里只听得见风吹茅檐。土路被薄霜压得发亮，村口老槐的影子斜斜挂在土墙上，连犬吠都像隔着一层冷雾。'),
                    beat('旁白', '你在山道旁救下一名垂死老道，对方半身都是泥水，血腥气混着山间湿冷草气扑在衣袖上。他临死前仍死死攥着你手腕，把一册残缺《引气诀》塞进你怀里。'),
                    beat('老道', '资质未必是路，肯熬，才可能见路。'),
                    beat('旁白', '几个月后，灶火、柴烟和清晨山雾陪着你把那几页残卷反复读烂，你体内终于生出一缕暖流。也正是在这个冬尽春来之际，你听说七玄门正在收徒。'),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_one_chapter_1',
            location: '七玄门',
            requirements: { storyProgress: 1 },
            beats(state) {
                return [
                    beat('旁白', '七玄门山门不算宏阔，却已是青牛镇少年心中不敢妄望之地。青石长阶被晨雾浸得微湿，山门内药香和松脂气顺着风往下飘，连守门弟子的衣角都带着镇上少见的整肃气。'),
                    beat('张长老', '灵根驳杂，资质寻常，若入门，只能从杂役做起。'),
                    beat('旁白', state.flags.preparedWell ? '你把路上备好的干粮分给同来少年，晨风里一时间只剩纸包摩挲和人群压低的道谢声，倒让几名执事多看了你一眼。' : '你没有多余的话，只在众人退缩时安静地把手按在测灵石上。石面冰凉，周围少年的呼吸声忽然全都近了。'),
                    beat('旁白', '最终你被留下，去了药园做杂役。进门那日正逢午后薄阳照在药圃的湿土上，成排药架泛着青色水光，你第一次觉得自己像是真的跨进了另一个世界。'),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'escalation',
            legacyVolumeTarget: 'volume_one_chapter_2',
            location: '神手谷',
            requirements: { storyProgress: 2, cultivationAtLeast: 60 },
            beats() {
                return [
                    beat('旁白', '药园一株百年灵参被你照料得生机格外旺盛，也把墨大夫的目光引了过来。清晨露水还挂在叶尖，药圃深处的土气和苦涩药香混在一起，那株灵参在一片灰绿里显得格外醒目。'),
                    beat('墨大夫', '你手稳，心也稳，来我神手谷做亲传，比留在药园强得多。'),
                    beat('旁白', '他递来一本《长春功》，纸页泛黄，封皮上全是旧指印。药室窗缝里漏进来的冷风把纸角吹得轻轻发响，那几道旧折痕像早有人把它翻烂了又收回去。'),
                    beat('旁白', '神手谷四下静得过分，连药炉里的火都压着声响。你知道这是机会，也可能是陷阱，而修行路上的机缘与陷阱，很多时候原本就是一体两面。'),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'bonding',
            legacyVolumeTarget: 'volume_one_chapter_3',
            location: '七玄门',
            requirements: { storyProgress: 3, realmScoreAtLeast: 1 },
            beats(state) {
                return [
                    beat('旁白', '厉飞雨病势反复，门里却没人真愿意替他担这份牵连。屋里药味苦得发沉，窗纸被夜风吹得一鼓一鼓，榻边那盏油灯烧得极低，像随时都会熄。'),
                    beat('厉飞雨', '我若不是急着求成，也不会把自己熬成这副样子。'),
                    beat('旁白', state.flags.startPath === 'disciple' ? '你手里正好有墨大夫给的药方，纸页边角还带着药室里那股陈旧草木气。可你心里也清楚，这药方未必干净，甚至可能比病本身更早把人拖进局里。' : '你没有现成法子，只能在药房、执事与传闻之间来回打听。白日里你听的是规矩，夜里听的却是病房外压低的闲话，越打听，越知此事绝不止一张药方那么简单。'),
                    beat('旁白', '救，还是不救，会把你和他绑在一起。灯影落在墙上时，你忽然明白，人情这种东西一旦伸手接住，就很难再说自己只是恰好路过。'),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'reversal',
            legacyVolumeTarget: 'volume_one_chapter_4',
            location: '神手谷',
            requirements: { storyProgress: 4, realmScoreAtLeast: 1 },
            beats(state) {
                return [
                    beat('旁白', '先后失踪的药童越来越多，神手谷夜里的门也越来越紧。入夜后的山谷没有虫鸣，只有风穿过木廊和药架时发出的细响，静得像有人提前把活气都压下去了。'),
                    beat('旁白', state.flags.helpedLi ? '厉飞雨偷偷塞给你一张名单，纸角被他攥得发皱，名字后面全是空白。那空白比任何供词都更叫人心底发寒，因为你一眼就看出，后面本该还有更多人。' : '你从残药和脚印里拼出一条不完整的线索。潮湿石地上的泥印一深一浅，像有人曾想把来路擦掉，却没来得及把所有痕迹都抹平。'),
                    beat('旁白', '密室里泛着绿光，丹炉边缘却沾着不该属于药材的血色。火光一跳，那抹暗红就从铜壁上浮出来，连空气里都混着焦苦药味和铁锈似的腥气。'),
                    beat('旁白', '你已经知道，再装作没看见，只会把自己也送进去。神手谷的夜色从这一刻起不再只是山中夜色，而像一层罩下来的盖子，逼你尽快决定，是先握住证据，还是直接去惊动谷中最危险的人。'),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'reversal',
            legacyVolumeTarget: 'volume_one_chapter_4',
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'climax',
            legacyVolumeTarget: 'volume_one_chapter_5',
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'fallout',
            legacyVolumeTarget: 'volume_one_chapter_6',
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
                            items: { moLetter: -1 },
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_one_chapter_7',
            location: '嘉元城',
            requirements: { storyProgress: 8 },
            beats(state) {
                return [
                    beat('旁白', '黄昏时分，你站在墨府外墙的阴影里，没有立刻现身。门外石狮残破，院里隐约传来争吵与催债声。你原以为自己只是回来收拾墨居仁死后留下的尾巴，如今才发现，修士之间的恶意并不会跟着尸体一起埋掉，它会顺着账册、人情和恐惧，一层层压到凡人头上。'),
                    beat('墨彩环', '你这时回来，不只是回来，也是在把新的风声带回这座宅子。'),
                    beat('旁白', '墨彩环开门见你时，眼里先是一怔，继而迅速冷了下来。她并没有求你救场，只平静地把现实摊开：有人在盯着墨府，有人要药方，有人要钱，有人要从死人身上再刮一层油。'),
                    beat('旁白', '夜里你在墨居仁旧书房的暗格中找到一份名单。那上面不是普通病人，而是一批被他拿来试药、却不方便留下痕迹的人。墨居仁死了，但这份因果并没死。你第一次真正意识到，所谓修士的因果，并不是玄而又玄的天道账本，而是总会有一个活人站在原地，替死人记得。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'protect_mo_house',
                        text: '护住墨府，先断外患',
                        effects: {
                            cultivation: 120,
                            relations: { '墨彩环': 60 },
                            routeScores: { orthodox: 1 },
                            flags: { fulfilledMoWill: true, protectedMoHouse: true, tookMoKarmicList: true },
                        },
                        nextChapterId: 9,
                    },
                    {
                        id: 'take_treasure_leave',
                        text: '卷走遗财，斩断旧事',
                        effects: {
                            cultivation: 140,
                            items: { lingshi: 8 },
                            relations: { '墨彩环': -20 },
                            routeScores: { demonic: 1 },
                            flags: { tookTreasure: true, lootedMoHouse: true, tookMoKarmicList: true },
                        },
                        nextChapterId: 9,
                    },
                    {
                        id: 'promise_caihuan',
                        text: '留下承诺，不立刻出手',
                        effects: {
                            cultivation: 130,
                            relations: { '墨彩环': 80 },
                            routeScores: { secluded: 1 },
                            flags: { daoLvPromise: true, fulfilledMoWill: true, promisedMoReturn: true, tookMoKarmicList: true },
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_one_chapter_7',
            location: '嘉元城',
            requirements: { storyProgress: 9 },
            beats(state) {
                const lowTrust = (state.npcRelations['墨彩环'] || 0) < 20;
                return [
                    beat('旁白', '第三个夜里，那具本该只是承载禁制的躯体忽然极轻地动了一下。你原以为是残余灵力牵引，可当你把屋内杂物尽数移开、只留下旧药杵时，它的指尖竟真的朝那方向挪了半寸。那不是普通傀儡反应，而是一点还没散尽的习惯。'),
                    beat('墨彩环', lowTrust
                        ? '你若还想从墨府带走什么，就先想清楚，要不要把最后一点体面也一并拿走。'
                        : '以前父亲抓药时，若我站在门口看，他总会先回头确认我没碰乱药柜。'),
                    beat('旁白', '你以神识试探，识海里浮出断裂画面：药房、药渍、站在门口的小姑娘，以及一句极轻的“别过来”。你第一次清楚面对这个问题：若死人还能留下习惯与执念，那把它炼成工具，究竟是在利用器物，还是在继续伤害一个已经无从归还的人？'),
                    beat('旁白', lowTrust
                        ? '你若此刻伸手，拿走的就不只是曲魂，还会把墨府最后一点能信你的理由一起扯走。'
                        : '账册、旧怨和还没散尽的人味被一起摊到你面前。你可以收下它，也可以替它做一个更难的了断。'),
                ];
            },
            choices(state) {
                const lowTrust = (state.npcRelations['墨彩环'] || 0) < 20;
                if (lowTrust) {
                    return [
                        {
                            id: 'take_quhun',
                            text: '强带曲魂离开，把这笔旧账一并收走',
                            effects: {
                                cultivation: 170,
                                items: { quhun: 1 },
                                relations: { '墨彩环': -10 },
                                flags: { hasQuhun: true, tookQuhunByForce: true, keptQuhun: true, quhunIdentityMystery: true },
                                routeScores: { demonic: 1 },
                            },
                            nextChapterId: 10,
                        },
                        {
                            id: 'buy_back_trust',
                            text: '封存曲魂，先把这笔债压住',
                            costs: { lingshi: 6 },
                            effects: {
                                cultivation: 135,
                                relations: { '墨彩环': 45 },
                                flags: { mendedMoHouseDebt: true, sealedQuhun: true, quhunIdentityMystery: true },
                                routeScores: { secluded: 1 },
                            },
                            nextChapterId: 10,
                        },
                        {
                            id: 'release_quhun',
                            text: '替曲魂超度，也给墨府留最后一点体面',
                            effects: {
                                cultivation: 155,
                                relations: { '墨彩环': 25 },
                                flags: { quhunReleased: true, hasQuhun: false, atonedToMoHouse: true, learnedQuhunIdentityFragment: true },
                                routeScores: { orthodox: 1 },
                            },
                            nextChapterId: 10,
                        },
                    ];
                }

                return [
                    {
                        id: 'take_quhun',
                        text: '收下曲魂，继续修复',
                        effects: {
                            cultivation: 140,
                            items: { quhun: 1 },
                            flags: { hasQuhun: true, keptQuhun: true, quhunIdentityMystery: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 10,
                    },
                    {
                        id: 'repair_quhun',
                        text: '留下曲魂，但不把它只当工具',
                        effects: {
                            cultivation: 150,
                            items: { quhun: 1 },
                            relations: { '墨彩环': 30 },
                            flags: { hasQuhun: true, curedQuhun: true, keptQuhun: true, quhunIdentityMystery: true },
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
                            flags: { quhunReleased: true, hasQuhun: false, learnedQuhunIdentityFragment: true },
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'exit',
            legacyVolumeTarget: 'volume_one_chapter_8',
            location: '太南山',
            requirements: { storyProgress: 10, realmScoreAtLeast: 3 },
            beats(state) {
                const debtClosureLine = getVolumeOneDebtClosureLine(state, 'market');
                const quhunClosureLine = getVolumeOneQuhunClosureLine(state, 'market');
                return [
                    beat('旁白', '筑基之后，你第一次走进真正的散修小会。'),
                    beat('万小山', '升仙令马上换手，想拿就趁现在，想省就只能换消息。'),
                    beat('旁白', state.flags.fulfilledMoWill ? '你身上还挂着墨府的人情，这让你在摊位间走得比别人更稳。' : '你知道自己没有背景，所以每一步都更像在赌。'),
                    beat('旁白', debtClosureLine),
                    beat('旁白', quhunClosureLine),
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
            volumeId: 'volume_one_qixuanmen',
            volumeRole: 'exit',
            legacyVolumeTarget: 'volume_one_chapter_8',
            location: '太南山',
            requirements: { storyProgress: 11 },
            beats(state) {
                const debtExitLine = getVolumeOneDebtClosureLine(state, 'exit');
                const quhunExitLine = getVolumeOneQuhunClosureLine(state, 'exit');
                return [
                    beat('旁白', state.flags.hasShengxianling ? '令牌入手后，你终于有资格考虑更大的宗门。' : '你虽然没直接拿到令牌，却摸清了几条能换来入门资格的暗路。'),
                    beat('旁白', debtExitLine),
                    beat('旁白', quhunExitLine),
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
                        requirements: { items: { shengxianling: 1 } },
                        effects: {
                            cultivation: 120,
                            items: { shengxianling: -1, lingshi: 18 },
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
            title: '离开旧地',
            summary: '越国边境风硬，回头路也硬。你还没走远，旧地的人与事却已经开始在背后追。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_two_chapter_1',
            location: '越国边境',
            requirements: { storyProgress: 12 },
            beats(state) {
                return [
                    beat('旁白', '离开第一卷之后，你终于明白，真正难的不是离开七玄门，而是承认自己已经不能再按七玄门那套活法回头。'),
                    beat('旁白', state.flags.joinedYellowMaple ? '黄枫谷那条门路已经在前方等你，可真正压人的不是宗门，而是你知道自己从此得用修士的方式来过日子。' : '你眼前还没有完全稳妥的门路，所以每一步都比在凡俗时更像把命压上去。'),
                    beat('旁白', '旧路像被风吹在背后，没完全断，也没有谁会替你再把它接回去。'),
                    beat('旁白', '这不是简单的赶路，而是你第一次真正把“凡俗少年”留在身后。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'leave_without_return',
                        text: '不再回头，先把活路算清',
                        effects: {
                            cultivation: 180,
                            routeScores: { secluded: 1 },
                            flags: { secondVolumeLeftOldLand: true },
                        },
                        nextChapterId: '12_mortal_debt',
                    },
                    {
                        id: 'send_word_back',
                        text: '托人捎话，至少让旧人知道你还活着',
                        effects: {
                            cultivation: 165,
                            relations: { '墨彩环': 5 },
                            routeScores: { orthodox: 1 },
                            flags: { sentWordBackFromRoad: true },
                        },
                        nextChapterId: '12_mortal_debt',
                    },
                    {
                        id: 'cut_old_name',
                        text: '连旧名一起压下，只带能活命的那部分上路',
                        effects: {
                            cultivation: 190,
                            routeScores: { demonic: 1 },
                            flags: { buriedOldNameOnRoad: true },
                        },
                        nextChapterId: '12_mortal_debt',
                    },
                ];
            },
        },
        {
            id: '12_mortal_debt',
            title: '凡俗旧债未清',
            summary: '嘉元城门没变，变的是门里那些等不起的人。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'escalation',
            legacyVolumeTarget: 'volume_two_chapter_2',
            location: '嘉元城',
            requirements: { storyProgress: '12_mortal_debt' },
            beats(state) {
                const debtLine = state.flags.sentWordBackFromRoad
                    ? '你没有亲自回去，却还是让旧人知道你活着。这让很多话都更像账，而不是纯粹的怀念。'
                    : state.flags.buriedOldNameOnRoad
                        ? '你本想把旧名一起压下，可真走到该认账的时候，才发现名字好藏，旧债不好藏。'
                        : '你没有再给自己留“回头就是交代”的错觉，反而更清楚哪些债若不正视，只会一路跟着你。';
                return [
                    beat('旁白', '再走回嘉元城方向时，你忽然发现最让人发紧的不是仇家，也不是埋伏，而是那些不必开口也能让你知道时间已经过去了的屋舍与人。'),
                    beat('旁白', debtLine),
                    beat('旁白', '有些事你当然可以继续拖。可你也越来越明白，别人并没有暂停在原地等你回来做决定。'),
                    beat('旁白', '修仙和凡俗并不是两张能彻底分开的纸。你走得越高，越会被迫回答：旧账到底是认，还是继续压。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'return_mortal_debt',
                        text: '亲自认一部分旧账，不再把它全推给以后',
                        effects: {
                            cultivation: 180,
                            relations: { '墨彩环': 10 },
                            routeScores: { orthodox: 1 },
                            flags: { volumeTwoMortalDebtFaced: true },
                        },
                        nextChapterId: '12_tainan_market',
                    },
                    {
                        id: 'leave_resources_only',
                        text: '留下资源补偿，但不让自己重新陷回旧日人情',
                        effects: {
                            cultivation: 190,
                            items: { lingshi: -4 },
                            routeScores: { secluded: 1 },
                            flags: { volumeTwoLeftResourcesOnly: true },
                        },
                        nextChapterId: '12_tainan_market',
                    },
                    {
                        id: 'keep_debt_distant',
                        text: '先把这笔旧债压成底色，继续往前',
                        effects: {
                            cultivation: 205,
                            routeScores: { demonic: 1 },
                            flags: { volumeTwoDebtHeldAtDistance: true },
                        },
                        nextChapterId: '12_tainan_market',
                    },
                ];
            },
        },
        {
            id: '12_tainan_market',
            title: '太南山与散修交易场',
            summary: '散修世界最贵的从来不只是法器，而是别人比你早知道半步。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'bonding',
            legacyVolumeTarget: 'volume_two_chapter_3',
            location: '太南山',
            requirements: { storyProgress: '12_tainan_market', realmScoreAtLeast: 3 },
            beats() {
                return [
                    beat('旁白', '真正走进太南山后，你才第一次清楚看见散修世界是怎么运转的：消息能卖，门路能卖，甚至谁先死都能卖。'),
                    beat('旁白', '这里没有人关心你以前是谁，只关心你手里有什么、知不知道价、敢不敢把东西拿出来换。'),
                    beat('旁白', '你很快明白，修仙并不只是变强。很多活路先得靠消息、交易和对风险的嗅觉换来。'),
                    beat('旁白', '如果你不能先把规则看懂，很快就会被别人当成规则的一部分。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'buy_market_rule',
                        text: '先花代价摸清路数，不急着抢东西',
                        costs: { lingshi: 4 },
                        effects: {
                            cultivation: 205,
                            routeScores: { orthodox: 1 },
                            flags: { learnedTainanRules: true },
                        },
                        nextChapterId: '12_token_kill',
                    },
                    {
                        id: 'take_black_route',
                        text: '先埋一条黑市暗线，给自己留后手',
                        costs: { lingshi: 3 },
                        effects: {
                            cultivation: 210,
                            routeScores: { secluded: 1 },
                            flags: { hasSecretInfo: true, securedBlackMarketRoute: true },
                        },
                        nextChapterId: '12_token_kill',
                    },
                    {
                        id: 'observe_without_buying',
                        text: '先看人心与价码，按兵不动',
                        effects: {
                            cultivation: 215,
                            routeScores: { demonic: 1 },
                            flags: { cautiousMarket: true, tainanWatchedSilently: true },
                        },
                        nextChapterId: '12_token_kill',
                    },
                ];
            },
        },
        {
            id: '12_token_kill',
            title: '升仙令与修士杀机',
            summary: '门票到手的那一刻，别人也会更快把你看成猎物。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'reversal',
            legacyVolumeTarget: 'volume_two_chapter_4',
            location: '太南山',
            requirements: { storyProgress: '12_token_kill' },
            beats(state) {
                return [
                    beat('旁白', '升仙令不只是资格，更像一块把所有眼光都拽过来的石头。'),
                    beat('旁白', state.flags.hasSecretInfo ? '你手里已有一条暗线，所以比旁人更早闻到那股不对劲的杀机。' : '你原以为抢到资格之后事情会简单一点，结果真正危险的反而是资格到手之后。'),
                    beat('旁白', '你第一次完整感到修士视角的生死局：不是谁更讲理，而是谁先看见、谁先动、谁愿意把别人当代价。'),
                    beat('旁白', '修仙世界并没有比凡俗更公平，它只是把杀机换成了更体面的说法。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'win_token_cleanly',
                        text: '抢下升仙令，再立刻抽身',
                        costs: { lingshi: 6 },
                        effects: {
                            cultivation: 230,
                            items: { shengxianling: 1 },
                            flags: { hasShengxianling: true, tokenConflictResolved: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: '12_enter_yellow_maple',
                    },
                    {
                        id: 'trade_information_for_entry',
                        text: '用暗线消息换入门资格，少在明面上见血',
                        effects: {
                            cultivation: 225,
                            flags: { hasShengxianling: true, tokenConflictResolved: true, hasSecretInfo: true },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: '12_enter_yellow_maple',
                    },
                    {
                        id: 'kill_for_token_path',
                        text: '借乱夺令，必要时先下手灭口',
                        effects: {
                            cultivation: 245,
                            items: { shengxianling: 1 },
                            flags: { hasShengxianling: true, tokenConflictResolved: true, firstCultivatorAmbushKill: true },
                            routeScores: { demonic: 1 },
                        },
                        nextChapterId: '12_enter_yellow_maple',
                    },
                ];
            },
        },
        {
            id: '12_enter_yellow_maple',
            title: '进入黄枫谷',
            summary: '真正接进宗门体系时，你才知道“立足”也是一种代价结构。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'climax',
            legacyVolumeTarget: 'volume_two_chapter_5',
            location: '黄枫谷',
            requirements: { storyProgress: '12_enter_yellow_maple' },
            beats(state) {
                return [
                    beat('旁白', state.flags.hasShengxianling ? '令牌在手，你终于能把自己放进一套更大的秩序里。' : '你终究还是摸到了进门的路子，只是比旁人更早知道这条路不是白给的。'),
                    beat('旁白', '黄枫谷真正给你的，不只是庇护与门路，还有一整套以后会不断向你索取的规矩。'),
                    beat('旁白', '从这一刻起，你不再只是“能不能进仙门”的问题，而是“准备把自己放进哪种秩序里活”。'),
                    beat('旁白', '这一步决定了第二卷真正的主冲突：你不是进入修仙路，而是要学会怎么在修仙路上站住。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'enter_as_low_profile_disciple',
                        text: '先把身放低，按最不起眼的弟子身份进去',
                        effects: {
                            cultivation: 240,
                            flags: { joinedYellowMaple: true, enteredYellowMapleLowProfile: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: '12_herb_garden',
                    },
                    {
                        id: 'enter_by_detour',
                        text: '先探门内门外口风，再借旁路入局',
                        effects: {
                            cultivation: 235,
                            flags: { joinedYellowMaple: true, enteredByDetour: true },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: '12_herb_garden',
                    },
                    {
                        id: 'enter_with_tradeoff',
                        text: '先拿立足的门票，代价以后再慢慢补',
                        effects: {
                            cultivation: 250,
                            flags: { joinedYellowMaple: true, enteredYellowMapleByTradeoff: true },
                            routeScores: { demonic: 1 },
                        },
                        nextChapterId: '12_herb_garden',
                    },
                ];
            },
        },
        {
            id: '12_herb_garden',
            title: '百药园立足',
            summary: '黄枫谷最不起眼的角落，恰好适合你慢慢把根基攒出来。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'fallout',
            legacyVolumeTarget: 'volume_two_chapter_6',
            location: '黄枫谷',
            requirements: { storyProgress: '12_herb_garden' },
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
            title: '宗门人际与禁地前夜',
            summary: '所有人都知道禁地危险，但真正先逼近你的，是门内座次、人情与谁准备把你拉进队里。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_two_chapter_7',
            location: '黄枫谷',
            requirements: { storyProgress: 13, realmScoreAtLeast: 4 },
            beats(state) {
                const farmingLine = state.flags.lowProfileFarming
                    ? '你藏得够深，所以没有人把你当作最先被盯上的目标。'
                    : '你最近在药园名声渐起，这让很多人都开始试图和你结队。';
                return [
                    beat('旁白', '血色禁地开放的消息一出，谷里像被火点着一样躁动。'),
                    beat('旁白', farmingLine),
                    beat('旁白', state.flags.madeGardenConnections ? '你在药园里悄悄结下的人情开始回流，很多原本不会来找你的人也第一次把你看成了可同行的人。' : '你忽然意识到，宗门并不是单靠修为排序的地方。谁先来搭话、谁想结队、谁只想借你挡刀，都是另一套更细的座次。'),
                    beat('李化元', '进去之前先想好，机缘是抢来的，命却得自己保。'),
                    beat('旁白', '你该以什么姿态进禁地，会决定之后整段修仙路的味道。'),
                    beat('旁白', '更重要的是，你已经不能再把自己当成一个只顾闷头修炼的人。真正的禁地前夜，先逼过来的是门内位置、人情债和谁会记住你这一回站在哪边。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'align_with_fellow_disciples',
                        text: '先认门内同行之人，把人情和队形都站稳',
                        effects: {
                            cultivation: 235,
                            routeScores: { orthodox: 1 },
                            flags: { alignedWithFellowDisciples: true, forbiddenGroundSocialReady: true },
                        },
                        nextChapterId: '13_volume_close',
                    },
                    {
                        id: 'keep_low_profile_before_trial',
                        text: '把锋芒再收一层，别在进禁地前先被人盯死',
                        effects: {
                            cultivation: 228,
                            routeScores: { secluded: 1 },
                            flags: { keptLowProfileBeforeTrial: true, forbiddenGroundSocialReady: true },
                        },
                        nextChapterId: '13_volume_close',
                    },
                    {
                        id: 'stock_foundation_supplies',
                        text: '把筑基与禁地的补给先攒够，再去争真正的试炼',
                        effects: {
                            cultivation: 242,
                            items: { jiedusan: 1, lingcao: 2 },
                            routeScores: { demonic: 1 },
                            flags: { stockedFoundationSupplies: true, foundationPrepReady: true },
                        },
                        nextChapterId: '13_volume_close',
                    },
                ];
            },
        },
        {
            id: '13_volume_close',
            title: '此卷尽处',
            summary: '第二卷真正要收住的，不是你有没有进宗门，而是你已经决定要以什么姿态进下一卷。',
            volumeId: 'volume_two_ascending_path',
            volumeRole: 'exit',
            legacyVolumeTarget: 'volume_two_chapter_8',
            location: '黄枫谷',
            requirements: { storyProgress: '13_volume_close' },
            beats(state) {
                const debtLine = state.flags.volumeTwoMortalDebtFaced
                    ? '凡俗旧债你并未彻底甩开，而是正面认了一部分。这样带进下一卷的，不是空白，而是一笔已经被承认的旧账。'
                    : state.flags.volumeTwoLeftResourcesOnly
                        ? '你给旧人留了补偿，却没把自己重新留回去。这让下一卷里的很多选择，都还会带着“你究竟算没算认过这笔账”的余味。'
                        : '你把旧债压进了底色里。它没有消失，只是会在更高处继续回来认你。';
                const sectLine = state.flags.alignedWithFellowDisciples
                    ? '你已经在门内站出了一种会让人愿意来找你的位置。'
                    : state.flags.keptLowProfileBeforeTrial
                        ? '你还在把自己往阴影里收，可这已经是有意识的生存方式，而不是最初那种纯粹无助。'
                        : '你把破境与补给先攒够了，也等于承认今后的修仙路不能只凭一口气硬冲。';
                return [
                    beat('旁白', '第二卷走到这里，真正定下来的不是你终于进了宗门，而是你已经学会：修仙世界里的人情、资源、门墙和旧债，都会一起追着你跑。'),
                    beat('旁白', debtLine),
                    beat('旁白', sectLine),
                    beat('旁白', '血色禁地的门就在前方。你要带进去的，不只是一身修为和几件法器，还有这一路上认下或压下的那些东西。'),
                    beat('旁白', '下一卷不会再问你能不能踏上修仙路，而会直接问：你准备拿什么代价，在这条路上活下去。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'enter_forbidden_ground_ready',
                        text: '把准备、门墙与路数都带齐，再进禁地',
                        effects: {
                            cultivation: 250,
                            flags: { volumeTwoExitLocked: true, forbiddenGroundEntryReady: true, sectIdentityLocked: true },
                            routeScores: { orthodox: 1 },
                        },
                        nextChapterId: 14,
                    },
                    {
                        id: 'enter_forbidden_ground_with_debt',
                        text: '带着未清旧债进场，看看它会把你逼成什么样',
                        effects: {
                            cultivation: 255,
                            flags: { volumeTwoExitLocked: true, mortalDebtCarryover: true, forbiddenGroundEntryReady: true },
                            routeScores: { secluded: 1 },
                        },
                        nextChapterId: 14,
                    },
                    {
                        id: 'enter_forbidden_ground_from_shadows',
                        text: '先把自己藏稳，再从暗处踏进下一卷',
                        effects: {
                            cultivation: 260,
                            flags: { volumeTwoExitLocked: true, forbiddenGroundEntryReady: true, hiddenApproachToForbidden: true },
                            routeScores: { demonic: 1 },
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
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_three_chapter_1',
            location: '血色禁地',
            requirements: { storyProgress: 14 },
            beats(state) {
                return [
                    beat('旁白', '入口开启时，灵气像被刀劈开一道口子。队伍只一个呼吸便散了：有人先冲，有人后退，有人假装同路，也有人从一开始便盯着同伴的后背。禁地里最先开始猎杀的，从来不是妖兽。'),
                    beat('旁白', '你沿林雾前行，不久便看见一具同门尸体斜挂树根，储物袋已空，喉间伤口薄而整齐，明显出自人手。越往深处，局势越乱。主药附近早有人埋伏，几拨修士表面结盟，实则人人都留着后手。'),
                    beat('旁白', '就在你准备绕开毒藤谷时，南宫婉自乱石后掠出，气息紊乱却仍极快。追兵在后，异兽在更远处闻声蠢动。你们被迫并肩而战，彼此都知道，一旦活着脱身，转头仍可能为了主药翻脸。'),
                    beat('旁白', '黎明前，禁制松动，争夺骤起。一名重伤修士倒在灵草旁奄奄一息，另一边主药已近在咫尺，后方还有最稳妥的退路。救人、夺药、保命，三条路终于同时摆在你眼前。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'save_nangong',
                        text: '先救人，再争药',
                        effects: {
                            cultivation: 280,
                            items: { zhujidanMaterial: 2 },
                            relations: { '南宫婉': 80 },
                            routeScores: { orthodox: 2 },
                            flags: { savedNangong: true, forbiddenGroundSavedSomeone: true, nangongTrustSeed: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'watch_and_wait',
                        text: '避开核心杀圈，只取次级灵物',
                        effects: {
                            cultivation: 250,
                            items: { zhujidanMaterial: 2 },
                            relations: { '南宫婉': -20 },
                            routeScores: { secluded: 1 },
                            flags: { savedNangong: false, watchedBattle: true, forbiddenGroundSurvivalFirst: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'loot_in_chaos',
                        text: '先夺主药，必要时灭口',
                        effects: {
                            cultivation: 270,
                            items: { zhujidanMaterial: 3, yaodan: 2 },
                            routeScores: { secluded: 1, demonic: 1 },
                            flags: { savedNangong: false, treasureHunter: true, forbiddenGroundTookMainHerb: true },
                        },
                        nextChapterId: 15,
                    },
                    {
                        id: 'kill_for_gain',
                        text: '先夺主药，再把知道的人一并处理',
                        effects: {
                            cultivation: 320,
                            items: { zhujidanMaterial: 3, yaodan: 3 },
                            relations: { '南宫婉': -100 },
                            routeScores: { demonic: 3 },
                            flags: { savedNangong: false, demonicPathSeed: true, forbiddenGroundTookMainHerb: true, firstSilencingKill: true },
                        },
                        nextChapterId: 15,
                    },
                ];
            },
        },
        {
            id: 15,
            title: '情债与筑基',
            summary: '禁地之后，筑基不再只是破境，而是你第一次决定怎样背着情债继续往前。',
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'escalation',
            legacyVolumeTarget: 'volume_three_chapter_2',
            location: '黄枫谷',
            requirements: { storyProgress: 15, realmScoreAtLeast: 5 },
            beats(state) {
                const savedLine = state.flags.savedNangong
                    ? '南宫婉的传音只留下一句硬话: “主药既已入手，便别死在筑基上。你欠我的，还没还清。”'
                    : '你没有救下她，可禁地里那一眼仍像钩子一样留在识海，让你没法骗自己：这次筑基不过是一场银货两讫的冷生意。';
                return [
                    beat('旁白', '筑基并不是往前迈一步，更像把旧的自己活活拆开，再把骨、血、执念和未了因果一起塞进更硬的壳里。'),
                    beat('旁白', '禁地归来后，玉盒里的主药明明香气馥郁，你先想起的却不是机缘，而是那几张死前仍不肯闭眼的脸。'),
                    beat('旁白', '你越想把南宫婉那一夜并肩死战的记忆压下去，它越像埋在经脉深处的一点火星，运功时总会沿最薄处烧上来。'),
                    beat('旁白', '这并不只是情爱。对一路都在防人的修士而言，真正危险的是你曾把后背交出去，也被别人认真记住。'),
                    beat('旁白', '药力冲进丹田时，筋骨与旧伤一起发作。你忽然又想起青牛镇那间矮屋，想起自己为何拼命也不肯再做那个无能为力的凡人。'),
                    beat('旁白', savedLine),
                    beat('旁白', '数个时辰后，浊气自口鼻长长吐出。筑基终于成了，可你心里并无狂喜，只剩一句更沉的自问: 以后再做选择时，你还肯不肯认这笔债。'),
                ];
            },
            choices(state) {
                const relation = state.npcRelations['南宫婉'] || 0;
                const acceptText = state.flags.savedNangong || relation >= 30
                    ? '认下这份情债: 记住她，也记住自己是怎样筑基的'
                    : '认下这份因果: 不再把那一夜只当成一次路过的合作';
                return [
                    {
                        id: 'accept_nangong_debt',
                        text: acceptText,
                        effects: {
                            cultivation: 325,
                            items: { zhujidan: 1 },
                            relations: { '南宫婉': 20 },
                            routeScores: { orthodox: 2 },
                            flags: {
                                acceptedNangongDebt: true,
                                acceptedNangongHelp: true,
                                successfulFoundationEstablished: true,
                            },
                        },
                        nextChapterId: 16,
                    },
                    {
                        id: 'suppress_nangong_feelings',
                        text: '压下心绪先稳住道基: 人情可以记，心不能乱',
                        effects: {
                            cultivation: 305,
                            items: { zhujidan: 1 },
                            relations: { '南宫婉': 8 },
                            routeScores: { secluded: 2 },
                            flags: {
                                suppressedNangongFeelings: true,
                                focusedBreakthrough: true,
                                successfulFoundationEstablished: true,
                            },
                        },
                        nextChapterId: 16,
                    },
                    {
                        id: 'cut_nangong_ties',
                        text: relation <= -40 ? '把禁地余波连同旧情一起压碎，只认资源不认人' : '强行斩断牵连，把这次筑基只算成自己的一步棋',
                        effects: {
                            cultivation: 315,
                            items: { zhujidan: 1 },
                            relations: { '南宫婉': -18 },
                            routeScores: { demonic: 2, secluded: 1 },
                            flags: {
                                cutNangongTies: true,
                                cutEmotion: true,
                                successfulFoundationEstablished: true,
                            },
                        },
                        nextChapterId: 16,
                    },
                ];
            },
        },
        {
            id: 16,
            title: '李化元门下',
            summary: '筑基之后，你真正要学的第一次不是术法，而是师门如何把人放进局里。',
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'bonding',
            legacyVolumeTarget: 'volume_three_chapter_3',
            location: '黄枫谷',
            requirements: { storyProgress: 16, realmScoreAtLeast: 5 },
            beats(state) {
                const nangongLine = state.npcRelations['南宫婉'] >= 50
                    ? '外头已经有人把你和掩月宗那位仙子放在一处议论，说明你不再只是名单上的普通弟子。'
                    : '执事、同门与外门来客看你的目光都变了。到了筑基，你终于开始被人当成一张值得下注的牌。';
                return [
                    beat('旁白', '真正让人改变的，从来不只是境界。有时候只是某位上位者看你一眼，便点破你已经学会怎么活下来，却还没学会活下来之后该替谁负责。'),
                    beat('旁白', '筑基之后，你第一次清楚感到“身份”带来的差别。过去你只是可用可弃的一名弟子，如今许多试探、拉拢和暗示都悄悄朝你靠近。'),
                    beat('旁白', nangongLine),
                    beat('李化元', '宗门真正需要的，不是会打的筑基修士，而是知道什么时候该替宗门去死，什么时候又该替宗门活下来的筑基修士。'),
                    beat('旁白', '这句话让你第一次明白，师门不是单纯传法授业的地方。它是秩序、庇护与索取，会给你名分，也会在关键处要求你别只为自己算账。'),
                    beat('李化元', '我看重你，不是因为你最听话，而是因为你知道怕、知道退，也知道什么时候该赌一把。这样的人，只要心性能立住，比逞强的更能活到后面。'),
                    beat('旁白', '临走前，李化元递来一枚令牌: “你可以正式站到我门下。从此在门内会更好走一些，也会更不好退一些。” 你接过它时，第一次觉得它像钥匙，也像锁。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'become_li_disciple',
                        text: '正式拜入门下，接受这份身份与归属',
                        effects: {
                            cultivation: 360,
                            relations: { '李化元': 20 },
                            items: { feijian: 1 },
                            routeScores: { orthodox: 2 },
                            flags: { liDisciple: true, enteredLihuayuanLineage: true },
                        },
                        nextChapterId: '16_feiyu_return',
                    },
                    {
                        id: 'keep_free',
                        text: '受教而不彻底绑定，给自己保留退路',
                        effects: {
                            cultivation: 330,
                            relations: { '李化元': 8 },
                            routeScores: { secluded: 2 },
                            flags: { liDisciple: false, freeCultivator: true, respectedLihuayuanButStayedIndependent: true },
                        },
                        nextChapterId: '16_feiyu_return',
                    },
                    {
                        id: 'learn_in_secret',
                        text: '借师门之势，但只认能为己所用的那部分',
                        effects: {
                            cultivation: 340,
                            relations: { '李化元': 4 },
                            routeScores: { demonic: 1, secluded: 1 },
                            flags: { liDisciple: true, learnsSecretively: true, usedLihuayuanInfluencePragmatically: true },
                        },
                        nextChapterId: '16_feiyu_return',
                    },
                ];
            },
        },
        {
            id: '16_feiyu_return',
            chapterLabel: '插章·旧友重逢',
            title: '旧友重逢',
            summary: '厉飞雨这一面，提醒你的不是旧友情本身，而是自己原来也曾被人用最普通的眼光看过。',
            location: '越国集镇',
            requirements: { storyProgress: '16_feiyu_return' },
            beats(state) {
                const relation = state.npcRelations['厉飞雨'] || 0;
                const openingLine = relation >= 15
                    ? '厉飞雨先是愣了一下，随即照旧笑骂: “我就知道你这家伙没那么容易死。”'
                    : '对方瘦了不少，眉眼却仍锋利。你几乎认不出这是当年那个总把不服输写在脸上的厉飞雨。';
                return [
                    beat('旁白', '有些旧友之所以难忘，不是因为后来常见，而是因为他知道你最初是什么样的人。'),
                    beat('旁白', openingLine),
                    beat('旁白', '太久没人这样同你说话了。如今很多人先看修为、再看身份、最后才想值不值得结交；厉飞雨先问的却只是你是不是还活着。'),
                    beat('厉飞雨', '你以前也谨慎，可没现在这么冷。你现在看人，先像在算。不过也对，你要还跟以前一样，大概活不到今天。'),
                    beat('旁白', '夜深后你们并肩坐在屋檐下，难得不用提防埋伏，不用掩饰身份，也不用替每句话再多算一层后果。'),
                    beat('厉飞雨', '记不全青牛镇也没事。别连自己原来为什么想离开都忘了就行。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'help_feiyu_again',
                        text: '替旧友补一把力，把这段人情接回手里',
                        effects: {
                            cultivation: 372,
                            items: { jiedusan: 1, lingshi: 8 },
                            relations: { '厉飞雨': 20 },
                            routeScores: { orthodox: 1 },
                            flags: { helpedOldFriendAgain: true, reconnectedWithLiFeiyu: true },
                        },
                        nextChapterId: 17,
                    },
                    {
                        id: 'share_drink_and_part',
                        text: '只叙旧，不让彼此重新卷进对方的日子',
                        effects: {
                            cultivation: 360,
                            relations: { '厉飞雨': 8 },
                            flags: { reconnectedWithLiFeiyu: true },
                        },
                        nextChapterId: 17,
                    },
                    {
                        id: 'distance_from_feiyu',
                        text: '故意把旧人情停在酒盏边，不让凡俗再牵住自己',
                        effects: {
                            cultivation: 358,
                            relations: { '厉飞雨': -8 },
                            routeScores: { secluded: 1 },
                            flags: { keptDistanceFromOldFriend: true },
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
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'reversal',
            legacyVolumeTarget: 'volume_three_chapter_4',
            location: '燕家堡',
            requirements: { storyProgress: 17, realmScoreAtLeast: 6 },
            beats(state) {
                const identityLine = state.flags.enteredLihuayuanLineage
                    ? '李化元这块门墙已经写在你身上，许多人一见你便先猜黄枫谷准备把手伸到哪一步。'
                    : state.flags.respectedLihuayuanButStayedIndependent
                        ? '你没把自己完全交给门墙，可那份来路仍足够让人猜测，你究竟会不会在关键时刻搬出师门。'
                        : state.flags.usedLihuayuanInfluencePragmatically
                            ? '你身上既有门墙影子，也有刻意留出的缝。越是这种来路不全明的修士，越容易被拿来试探。'
                            : '你没有显赫师门可借，能让人忌惮的只有一路攒下的判断与分寸。';
                const pressureLine = state.flags.helpedOldFriendAgain
                    ? '厉飞雨那一面还留在你心里，所以你比很多人更清楚，最狠的局往往不是当面翻脸，而是笑着把人排进价码。'
                    : '你站在席间看众人寒暄，第一次真切觉得修仙界最狠的刀，原来也能藏在座次、贺礼与一句句分毫不错的场面话里。';
                return [
                    beat('旁白', '很多人第一次见识修仙界的残酷，是在斗法场上。可真正老练的人都知道，最狠的刀往往不在明面上，它藏在贺礼、联姻、座次和称呼里。'),
                    beat('旁白', '燕家堡比你想象中还热闹。山门内外车马不绝，笑语不断，乍看像凡俗大族办喜事，可每一张笑脸都稳得过了头。'),
                    beat('旁白', pressureLine),
                    beat('旁白', identityLine),
                    beat('旁白', '酒席未开，你已看出这绝不只是庆宴。谁与谁坐得近，谁敬酒时故意慢半拍，谁提到某个名字时全场忽然一静，这些细节拼起来就是一张势力图。'),
                    beat('旁白', '席间有人忽然笑问: “修仙家族若遇外患，当以血脉为先，还是以实力为先？” 你立刻明白，这不是闲谈，而是逼你替别人站队。'),
                    beat('旁白', '你没有顺着答。很多局不是你避开就没事，而是你既然已经坐到桌上，别人就会默认你该给他们一个能拿去用的态度。'),
                    beat('旁白', '夜里灯火未灭，某个关键旁支却突然失踪，本该送进内库的一批资源也无影无踪。你这才看清，燕家堡真正发烂的不是外患，而是每个人都知道问题在哪，却都想让别人先动手。'),
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
                            flags: { lowProfileBanquet: true, yanFortObservedQuietly: true },
                        },
                        nextChapterId: 18,
                    },
                    {
                        id: 'show_strength_banquet',
                        text: '当场出手，先震住一批人',
                        effects: {
                            cultivation: 400,
                            routeScores: { orthodox: 1 },
                            flags: { showedStrength: true, yanFortEstablishedPresence: true },
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
                            flags: { builtBanquetNetwork: true, yanFortNetworkBuilt: true },
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
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'climax',
            legacyVolumeTarget: 'volume_three_chapter_5',
            location: '越国边境',
            requirements: { storyProgress: 18, realmScoreAtLeast: 6 },
            beats(state) {
                return [
                    beat('旁白', '大战前夜，营地里安静得出奇。所有人都在整备法器、丹药、阵位，表面有条不紊，实则没人真正相信自己明天还能完整回来。大战未起，人的心先散了一半。'),
                    beat('旁白', '半路上，你遇见一名重伤敌修。对方丹田已毁，几乎没有反抗之力。只要一抬手，你便能干净利落地解决一个后患；可你也清楚，这不只是杀不杀一个敌人的问题，而是自己会不会开始习惯这种事。'),
                    beat('旁白', '赶到断后战场时，局势已近崩溃。几名同门死守阵位，灵力枯竭，另一边却有更稳妥的退路可走。你忽然发现，此前一路攒下的心思与取舍，在这一刻都必须真的落到动作上。'),
                    beat('旁白', '正道、魔道、还是独善其身，不再只是说书人口中的虚词，而是你准备拿命去践行的定数。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'fight_for_sect',
                        text: '顶上断后，护住阵线',
                        effects: {
                            cultivation: 520,
                            relations: { '李化元': 12, '南宫婉': 8 },
                            routeScores: { orthodox: 2 },
                            flags: { warChoice: 'orthodox', stoodTheLine: true, didNotExecuteDisabledEnemy: true, battlefieldReputationRighteous: true },
                        },
                        nextChapterId: '18_nangong_return',
                    },
                    {
                        id: 'fake_fight',
                        text: '不卷死战，带少数人撤离',
                        effects: {
                            cultivation: 500,
                            relations: { '李化元': -5 },
                            routeScores: { secluded: 2 },
                            flags: { warChoice: 'secluded', rescuedSmallGroup: true, leftMainLine: true, battlefieldReputationPragmatic: true },
                        },
                        nextChapterId: '18_nangong_return',
                    },
                    {
                        id: 'defect_demonic',
                        text: '先斩失战力敌修，再借乱夺势',
                        effects: {
                            cultivation: 560,
                            relations: { '李化元': 4 },
                            routeScores: { demonic: 3 },
                            flags: { warChoice: 'demonic', demonicPath: true, executedDisabledEnemy: true, roseInChaos: true, battlefieldReputationFearsome: true },
                        },
                        nextChapterId: '18_nangong_return',
                    },
                ];
            },
        },
        {
            id: '18_nangong_return',
            title: '并肩之后',
            summary: '南宫婉这一笔不是一时心动，而是终于有人看穿你之后，仍知道该怎样与你并肩。',
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'fallout',
            legacyVolumeTarget: 'volume_three_chapter_6',
            location: '越国边境',
            requirements: { storyProgress: '18_nangong_return' },
            beats(state) {
                const warLine = state.flags.warChoice === 'demonic'
                    ? '你原以为她会先看到你身上那股更重的狠意，可真正并肩时，她看的仍是你最先护住了什么。'
                    : '这次重逢仍在追杀与破阵之间。你们谁都没空叙旧，却几乎不用多说就知道彼此下一步会站到哪里。';
                return [
                    beat('旁白', '世上最危险的靠近，不是有人喜欢你，而是有人见过你最狼狈、最冷、最不体面的样子之后，仍知道该怎么和你站在一处。'),
                    beat('旁白', warLine),
                    beat('南宫婉', '你比以前更会把话吞回去了。'),
                    beat('旁白', '你回她一句“你比以前更不需要别人替你收场”。南宫婉却只淡淡看着你，像早已把这层推托看穿。'),
                    beat('南宫婉', '你以前就不是为了替别人收场才出手。你只是那时还没学会承认。'),
                    beat('旁白', '风里一时安静下来。你忽然意识到，这段因果最难的地方从来不是说不出口，而是一旦说出口，往后漫长大道便再不能只按你一个人的活法去走。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'acknowledge_nangong_importance',
                        text: '正面承认她的重要，不再把这段因果继续往外推',
                        effects: {
                            cultivation: 585,
                            relations: { '南宫婉': 22 },
                            routeScores: { orthodox: 1 },
                            flags: { openlyAcknowledgedNangongImportance: true },
                        },
                        nextChapterId: 19,
                    },
                    {
                        id: 'owe_nangong_silently',
                        text: '承认亏欠，但先把这笔账继续压在心里',
                        effects: {
                            cultivation: 572,
                            relations: { '南宫婉': 10 },
                            flags: { continuedToOweNangongSilently: true },
                        },
                        nextChapterId: 19,
                    },
                    {
                        id: 'avoid_nangong_again',
                        text: '刻意把话转开，避免再让彼此站得更近',
                        effects: {
                            cultivation: 568,
                            relations: { '南宫婉': -8 },
                            routeScores: { secluded: 1 },
                            flags: { avoidedNangongAgain: true },
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
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_three_chapter_7',
            location: '灵石矿脉',
            requirements: { storyProgress: 19 },
            beats(state) {
                const splitLine = state.flags.warChoice === 'demonic'
                    ? '魔道早已递过话，开门交换换位的诱惑在你耳边低语。'
                    : state.flags.warChoice === 'orthodox'
                        ? '正道希望有人死守，正道也在盯你这张牌会按哪个方向压。'
                        : '你身边没了宗门那种统一节奏，每个人都在看你下一句究竟想留谁。';
                return [
                    beat('旁白', '灵石矿脉看起来比传言更像一口墓穴：静默、湿冷、被曲尺阵法压得喘不过气。'),
                    beat('旁白', splitLine),
                    beat('旁白', '矿道深处并没有自然的异常，而像有人提前调整好节奏，只等你踏进来后再合攏。'),
                    beat('旁白', '人心更乱：有人要死守，有人要突围，还有人早就把你当作谁先拉的人质。'),
                    beat('旁白', '第一次有人把命押在你一句话上，那个听着带着颤音的学弟，此刻眼里只剩信与恐惧。'),
                    beat('旁白', '你知道守/突/逃都不体面，只有你愿不愿亲自背起这份结果。'),
                    beat('旁白', '矿脉暴动频繁，哪怕你护住一小块退路，也可能把其余人留在崩塌里。'),
                ];
            },
            choices(state) {
                if (state.flags.warChoice === 'demonic') {
                    return [
                        {
                            id: 'open_mine_gate',
                            text: '里应外合开矿门，拿同门换一张更高的位子',
                            effects: {
                                cultivation: 660,
                                items: { lingshi: 24 },
                                routeScores: { demonic: 2 },
                                flags: { mineChoice: 'betrayGate', betrayedSect: true, escapedMineWithCoreAssets: true },
                            },
                            nextChapterId: 20,
                        },
                        {
                            id: 'harvest_chaos',
                            text: '借死局收拢矿脉资源，让所有尸骨都替你添一层台阶',
                            effects: {
                                cultivation: 650,
                                items: { yaodan: 4 },
                                routeScores: { demonic: 2 },
                                flags: { mineChoice: 'harvest', escapedMineWithCoreAssets: true },
                            },
                            nextChapterId: 20,
                        },
                        {
                            id: 'escape_alone',
                            text: '趁局势最乱时抽身，谁都别想再拖住你',
                            effects: {
                                cultivation: 640,
                                routeScores: { secluded: 1, demonic: 1 },
                                flags: { mineChoice: 'soloEscape', escapedMineWithCoreAssets: true },
                            },
                            nextChapterId: 20,
                        },
                    ];
                }

                if (state.flags.warChoice === 'orthodox') {
                    return [
                        {
                            id: 'hold_the_line',
                            text: '死守矿脉，替同门撑出一线退路',
                            effects: {
                                cultivation: 620,
                                items: { lingshi: 16 },
                                routeScores: { orthodox: 2 },
                                flags: { mineChoice: 'hold', heldSpiritMineLine: true },
                            },
                            nextChapterId: 20,
                        },
                        {
                            id: 'lead_breakout',
                            text: '带队突围，能救几个算几个',
                            effects: {
                                cultivation: 610,
                                routeScores: { secluded: 1, orthodox: 1 },
                                flags: { mineChoice: 'breakout', ledMineBreakout: true },
                            },
                            nextChapterId: 20,
                        },
                        {
                            id: 'rescue_rearguard',
                            text: '回头接应殿后同门，把最后一段人命也扛出来',
                            effects: {
                                cultivation: 600,
                                relations: { '李化元': 20 },
                                routeScores: { orthodox: 1 },
                                flags: { mineChoice: 'rearGuard', ledMineBreakout: true },
                            },
                            nextChapterId: 20,
                        },
                    ];
                }

                return [
                    {
                        id: 'lead_breakout',
                        text: '带队突围，能救几个算几个',
                        effects: {
                            cultivation: 610,
                            routeScores: { secluded: 1, orthodox: 1 },
                            flags: { mineChoice: 'breakout', ledMineBreakout: true },
                        },
                        nextChapterId: 20,
                    },
                    {
                        id: 'sabotage_and_leave',
                        text: '炸掉矿道再撤，把追兵和旧局一起埋住',
                        effects: {
                            cultivation: 625,
                            items: { lingshi: 10 },
                            routeScores: { secluded: 2 },
                            flags: { mineChoice: 'sabotageLeave', escapedMineWithCoreAssets: true },
                        },
                        nextChapterId: 20,
                    },
                    {
                        id: 'escape_alone',
                        text: '抛下大局先活命，别人的命各安天数',
                        effects: {
                            cultivation: 640,
                            routeScores: { secluded: 1, demonic: 1 },
                            flags: { mineChoice: 'soloEscape', escapedMineWithCoreAssets: true },
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
            volumeId: 'volume_three_magic_invasion',
            volumeRole: 'exit',
            legacyVolumeTarget: 'volume_three_chapter_8',
            location: '乱星海',
            requirements: { storyProgress: 20, realmScoreAtLeast: 7 },
            beats(state) {
                const warEcho = state.flags.mineChoice === 'hold'
                    ? '你带着一身旧伤和一些活下来的同门名字。'
                    : state.flags.mineChoice === 'rearGuard'
                        ? '你把殿后的人接了出来，从此很多旧同门都记住了你回头那一次。'
                        : state.flags.mineChoice === 'betrayGate'
                            ? '矿门洞开的那一刻，你就知道自己和旧宗门之间已经没有回头路。'
                            : state.flags.mineChoice === 'harvest'
                                ? '你把死局也当成了资源，连海风里都像还混着矿脉的血腥。'
                                : state.flags.mineChoice === 'sabotageLeave'
                                    ? '你炸断了身后的矿道，也炸断了很多人还能追上你的最后机会。'
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
            volumeId: 'volume_four_overseas',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_four_chapter_1',
            location: '乱星海',
            requirements: { storyProgress: 21 },
            beats(state) {
                const arrivalLine = state.flags.enteredByTrade
                    ? '你是带着商路与货物来到，一上岸就得辨别哪条航道最值钱。'
                    : '你一脚踏上船只，却发现这里没有旧名头给你撑腰，只有你在航线里证明自己。';
                return [
                    beat('旁白', '乱星海群岛错落，散修、海盗、宗门与商会全混在一起。'),
                    beat('旁白', '海面没有城墙的秩序，所有人都靠资源、契约与速度来维持自己的地位。'),
                    beat('旁白', '你离开天南时压下去的旧因果，并没有消失，只是被海风吹成了更远的回响。'),
                    beat('旁白', arrivalLine),
                    beat('旁白', '有人猎妖、有人成交、有人闭关，但他们更在意你今天交得出多少账。'),
                    beat('旁白', '猎妖是赌命的快活，跑商是抓住流动的钱，闭关则是把自己藏进孤立里。'),
                    beat('旁白', '你第一次意识到，出海不只是换个落脚处，而是连活法都得跟着改。'),
                    beat('旁白', '别人不会再帮你记“你从哪来”，他们只问两件事：你守约不守约，你翻脸快不快。'),
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
                            flags: { starSeaStyle: 'hunter', starSeaHunterStart: true },
                        },
                        nextChapterId: '21_star_sea_foothold',
                    },
                    {
                        id: 'run_trade',
                        text: '跑船做买卖，把资源堆起来',
                        effects: {
                            cultivation: 760,
                            items: { lingshi: 26 },
                            routeScores: { demonic: 1 },
                            flags: { starSeaStyle: 'merchant', starSeaTraderStart: true },
                        },
                        nextChapterId: '21_star_sea_foothold',
                    },
                    {
                        id: 'seek_cave',
                        text: '先找洞府闭关，把自己藏好',
                        effects: {
                            cultivation: 790,
                            routeScores: { secluded: 1 },
                            flags: { starSeaStyle: 'secluded', starSeaSecludedStart: true },
                        },
                        nextChapterId: '21_star_sea_foothold',
                    },
                ];
            },
        },
        {
            id: '21_star_sea_foothold',
            title: '海外立足',
            summary: '真正难的不是活过第一口海风，而是决定你准备靠什么在这片海上站稳。',
            volumeId: 'volume_four_overseas',
            volumeRole: 'escalation',
            legacyVolumeTarget: 'volume_four_chapter_2',
            location: '乱星海群岛',
            requirements: { storyProgress: '21_star_sea_foothold' },
            beats(state) {
                const styleLine = state.flags.starSeaStyle === 'hunter'
                    ? '你先在猎妖船和海兽尸骨里混熟了门道，很快就知道星海尊不尊重你，往往只看你敢不敢先拿命顶。'
                    : state.flags.starSeaStyle === 'merchant'
                        ? '你先在货舱、港口和暗价里站住脚，越算越明白星海最贵的不是货，而是谁比谁更早看懂风向。'
                        : '你先给自己找了能喘气的洞府与退路，海上的许多人只觉得你太谨慎，只有你知道这叫先别让自己被局带着走。';
                return [
                    beat('旁白', '真正的立足，从来不是找到一个岛、一条船或一处洞府，而是别人开始默认你留得住、赔得起，也翻得动脸。'),
                    beat('旁白', styleLine),
                    beat('旁白', '你渐渐看清，乱星海并没有更讲道理，它只是把“你值不值得合作”这件事算得比天南更明白。'),
                    beat('旁白', '猎路、货路、暗路、退路，每一条都能活人，也都能先把人逼成另一种样子。'),
                    beat('旁白', '更麻烦的是，一旦你站稳了第一步，后面的消息、资源和试探都会自己找上门来。'),
                    beat('旁白', '你终于知道，这一卷真正难的不是“有没有机缘”，而是“你准备拿哪种活法接机缘”。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'claim_hunter_route',
                        text: '把猎妖路数做熟，先拿命换出一块站位',
                        effects: {
                            cultivation: 900,
                            items: { yaodan: 3 },
                            routeScores: { orthodox: 1 },
                            flags: { starSeaFoothold: 'hunter', builtHunterFoothold: true, starSeaResourceNetwork: 'hunt' },
                        },
                        nextChapterId: 22,
                    },
                    {
                        id: 'build_trade_route',
                        text: '先把货路、契约和消息价码一并摸清',
                        effects: {
                            cultivation: 860,
                            items: { lingshi: 30 },
                            routeScores: { demonic: 1 },
                            flags: { starSeaFoothold: 'merchant', builtTradeFoothold: true, starSeaResourceNetwork: 'trade' },
                        },
                        nextChapterId: 22,
                    },
                    {
                        id: 'secure_hidden_cave',
                        text: '先握稳洞府、补给和退路，把自己彻底藏住',
                        effects: {
                            cultivation: 880,
                            routeScores: { secluded: 1 },
                            flags: { starSeaFoothold: 'secluded', builtHiddenFoothold: true, starSeaResourceNetwork: 'hide' },
                        },
                        nextChapterId: 22,
                    },
                ];
            },
        },
        {
            id: 22,
            title: '虚天残图',
            summary: '真正危险的不是残图太珍贵，而是你一旦知道这扇门可能存在，就很难再装作自己没看见。',
            volumeId: 'volume_four_overseas',
            volumeRole: 'bonding',
            legacyVolumeTarget: 'volume_four_chapter_3',
            location: '乱星海外海',
            requirements: { storyProgress: 22, realmScoreAtLeast: 8 },
            beats(state) {
                const infoLine = state.flags.starSeaStyle === 'merchant' || state.flags.starSeaFoothold === 'merchant'
                    ? '你先从商路听见一些碎消息：某家商会忽然高价收破阵材料，几名来历各异的修士死前都带着同一种极隐晦的禁制痕。'
                    : '你从猎妖和探岛里摸出一些碎线索：异常灵潮、错位坐标、死者身上的古怪禁制，像被人故意拆散后扔进海里的拼图。';
                return [
                    beat('旁白', '真正危险的机缘，往往不是因为它太珍贵，而是因为它会让所有知道它存在的人，在同一时间里忽然变得不再像人。'),
                    beat('旁白', '乱星海的消息比风还快，可这次不一样。越往下查，你越确定如今放出来流转的，只是别人故意切碎后让各方抢夺的残片。'),
                    beat('旁白', infoLine),
                    beat('旁白', '等残图真正落到你手里时，你先感到的不是兴奋，而是冷。它不像藏宝图，更像某处巨大禁制被拆散后的进入凭证。'),
                    beat('旁白', '这意味着知道得越多，越容易成为被清理的对象。很多人杀你甚至不需要确认你握着完整图，只要怀疑你知道一点，就足够你死上十次。'),
                    beat('旁白', '你终于明白，这一章真正的选择从来不只是贪不贪，而是愿不愿承受“知道”这件事本身的代价。'),
                    beat('旁白', '争图、卖图、避局，每一条路都不是单纯的利弊，而是在决定你是否还装得回那个只是路过的人。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'collect_map',
                        text: '亲自争图，把自己真正放进局里',
                        effects: {
                            cultivation: 1000,
                            items: { xuTianTu: 1 },
                            routeScores: { orthodox: 1, demonic: 1 },
                            flags: { hasXuTianTu: true, enteredVoidHeavenMapGame: true, heldFragmentMap: true },
                        },
                        nextChapterId: '22_xutian_rumor',
                    },
                    {
                        id: 'sell_map',
                        text: '卖图兑现，把危险和价码一起转手给别人',
                        effects: {
                            cultivation: 920,
                            items: { xuTianTu: -1, lingshi: 40 },
                            routeScores: { demonic: 1, secluded: 1 },
                            flags: { soldXuTianTu: true, hasXuTianTu: false, soldFragmentMapForResources: true },
                        },
                        nextChapterId: '22_xutian_rumor',
                    },
                    {
                        id: 'avoid_map',
                        text: '主动避局，只留最少信息后立刻抽身',
                        effects: {
                            cultivation: 960,
                            routeScores: { secluded: 2 },
                            flags: { avoidedXuTian: true, avoidedVoidHeavenCoreConflict: true },
                        },
                        nextChapterId: '22_xutian_rumor',
                    },
                ];
            },
        },
        {
            id: '22_xutian_rumor',
            title: '风声四起',
            summary: '残图还没把门真正打开，海上的风声、试探与价码就已经先把你围住了。',
            volumeId: 'volume_four_overseas',
            volumeRole: 'reversal',
            legacyVolumeTarget: 'volume_four_chapter_4',
            location: '乱星海诸岛',
            requirements: { storyProgress: '22_xutian_rumor', realmScoreAtLeast: 8 },
            beats(state) {
                const rumorLine = state.flags.hasXuTianTu
                    ? '你手里明明只是一块残图，可所有人的眼神都像已经把你看成了通往虚天殿的半扇门。'
                    : state.flags.soldXuTianTu
                        ? '你把残图卖了出去，却很快发现风声不会跟着成交一起转手。许多人更想知道的，是你到底还知道多少。'
                        : '你主动避开了残图本身，可光是“你知道这扇门存在”这一点，就足够让人重新估你的价。';
                return [
                    beat('旁白', '局真正开始变大时，最先变化的往往不是刀光，而是旁人怎么叫你、怎么试你、又怎么提前替你判路数。'),
                    beat('旁白', rumorLine),
                    beat('旁白', '海上的风声比残图跑得更快。有人想结盟，有人想试价，有人只是想先确认你该不该死。'),
                    beat('旁白', '你慢慢意识到，虚天残图最狠的一点，不是它会给你什么，而是它会让每个人都开始提前解释你。'),
                    beat('旁白', '这意味着就算你还没真正进虚天殿，名声、凶险与人情余波也已经先一步压了过来。'),
                    beat('旁白', '从这里开始，很多选择都不再只是“拿不拿”，而是“准备被别人当成哪种人”。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'hide_map_trace',
                        text: '先把名字和图迹压住，别让所有人都追着你看',
                        effects: {
                            cultivation: 1080,
                            routeScores: { secluded: 1 },
                            flags: { hidXuTianTrail: true, xutianRumorMode: 'hidden' },
                        },
                        nextChapterId: 23,
                    },
                    {
                        id: 'trade_on_rumors',
                        text: '顺手利用风声，先把这场大局做成筹码',
                        effects: {
                            cultivation: 1040,
                            items: { lingshi: 18 },
                            routeScores: { demonic: 1 },
                            flags: { tradedOnXuTianRumors: true, xutianRumorMode: 'profit', starSeaReputationRaisedByRumor: true },
                        },
                        nextChapterId: 23,
                    },
                    {
                        id: 'bind_allies_before_entering',
                        text: '先把能同行的人绑住，再谈这扇门值不值得进',
                        effects: {
                            cultivation: 1060,
                            relations: { '南宫婉': 8 },
                            routeScores: { orthodox: 1 },
                            flags: { tiedXuTianRumorToAlliance: true, xutianRumorMode: 'alliance', tiedXuTianRiskToPeople: true },
                        },
                        nextChapterId: 23,
                    },
                ];
            },
        },
        {
            id: 23,
            title: '虚天殿前后',
            summary: '虚天将开，海雾里每一句“同行”都像先写好的试探。',
            location: '乱星海深处',
            volumeId: 'volume_four_overseas',
            volumeRole: 'climax',
            legacyVolumeTarget: 'volume_four_chapter_5',
            requirements: { storyProgress: 23, realmScoreAtLeast: 9 },
            beats(state) {
                const crowdLine = state.flags.hasXuTianTu
                    ? '残图在你怀里发烫，所有盯着你的人都像是来拿命换图。你明知这扇门不是为善恶而开，却还是被推到了最前排。'
                    : state.flags.soldXuTianTu
                        ? '你卖掉的是图纸，没人能保证虚天殿的人不会再来找你要第二份。卖掉纸片不等于卖掉风暴。'
                        : '你原想避开虚天殿，可海上大势还是把你推到了门前。知道这扇门存在以后，很多人都再也装不回路过的样子。';
                const reputationLine = state.flags.cooperatedAtXuTian || state.flags.openlyAcknowledgedNangongImportance || state.flags.tiedXuTianRiskToPeople
                    ? '同行之人已经开始默认，你到了最窄的路上，多半还是会先看人能不能一起活着出去。'
                    : state.flags.mineChoice === 'betrayGate' || state.flags.mineChoice === 'harvest' || state.flags.grabbedTreasure || state.flags.tradedOnXuTianRumors
                        ? '你一路留下的锋利名声，也让旁人更早防着你会不会在关键时候第一个伸手。'
                        : '更危险的不是局本身，而是旁人已经根据你以前的样子，提前猜好了你这一步会怎样动。';
                return [
                    beat('旁白', '真正考验信义的，从来不是平静时候许下的承诺，而是宝物只够少数人拿走、退路也只够少数人活下来的时候，你会不会第一个伸手。'),
                    beat('旁白', '海雾深处，虚天殿将启未启。临时结盟的人越来越多，可信的人却越来越少，每个人都在说合作，可谁都知道那层纸薄得很。'),
                    beat('旁白', crowdLine),
                    beat('旁白', '前方禁制异动，一条看似更快的路忽然打开，另一条较稳的路却开始缓慢闭合。众人表面在商量路线，实则都在试探彼此把“宝”看得更重，还是把“人”看得更重。'),
                    beat('旁白', reputationLine),
                    beat('旁白', '很快便有人失足困在裂隙边，另一侧宝光却已显形，后方退路也在一寸寸收紧。你第一次清楚感觉到，前面这些年的路数、名声和欠债，终于都到了会被别人一起看见的时候。'),
                    beat('旁白', '很多局走到最后，拼的已不是修为，而是你愿不愿意承认，自己究竟是哪一类人。'),
                ];
            },
            choices(state) {
                if (state.flags.soldXuTianTu) {
                    return [
                        {
                            id: 'grab_treasure',
                            text: '残图虽卖，机缘未必卖完，还是去抢最硬的那一口',
                        effects: {
                            cultivation: 1300,
                            items: { hujian: 1 },
                            routeScores: { demonic: 2 },
                            flags: { grabbedTreasure: true, starSeaSeizedTreasureFirst: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'watch_last',
                        text: '继续隔岸看局，把别人的死战当成你的风向',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'sell_route_info',
                        text: '转卖虚天动线，再吃一手消息差',
                        effects: {
                            cultivation: 1220,
                            items: { lingshi: 28 },
                            routeScores: { demonic: 1 },
                            flags: { secondHandBroker: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                ];
            }

                if (state.flags.avoidedXuTian) {
                    return [
                        {
                            id: 'pull_ally_out',
                            text: '只在殿外接应，救能救的人便退',
                        effects: {
                            cultivation: 1200,
                            relations: { '南宫婉': 15 },
                            routeScores: { orthodox: 1 },
                            flags: { rescuedFromXuTianEdge: true, starSeaHeldAllianceTogether: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'watch_last',
                        text: '坐山观虎斗，等最狠的人先死',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'slip_past_palace',
                        text: '趁乱绕殿而走，把命和线索一起藏住',
                        effects: {
                            cultivation: 1210,
                            items: { hujian: 1 },
                            routeScores: { secluded: 1 },
                            flags: { slippedPastXuTian: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                ];
            }

                return [
                    {
                        id: 'grab_treasure',
                        text: '虎口夺宝，先下手为强',
                        effects: {
                            cultivation: 1300,
                            items: { hujian: 1 },
                            routeScores: { demonic: 2 },
                            flags: { grabbedTreasure: true, starSeaSeizedTreasureFirst: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'cooperate_allies',
                        text: '与人联手，先把最危险那一波熬过去',
                        effects: {
                            cultivation: 1260,
                            relations: { '南宫婉': 20 },
                            routeScores: { orthodox: 1 },
                            flags: { cooperatedAtXuTian: true, starSeaHeldAllianceTogether: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                    {
                        id: 'watch_last',
                        text: '坐山观虎斗，等最狠的人先死',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_star_sea_aftermath',
                    },
                ];
            },
        },
        {
            id: '23_star_sea_aftermath',
            title: '并肩余波',
            summary: '虚天殿之后，真正要收的不是宝，而是人情、名声与谁还肯继续并肩。',
            location: '乱星海海路',
            volumeId: 'volume_four_overseas',
            volumeRole: 'fallout',
            legacyVolumeTarget: 'volume_four_chapter_6',
            requirements: { storyProgress: '23_star_sea_aftermath', realmScoreAtLeast: 9 },
            beats(state) {
                const allianceLine = state.flags.cooperatedAtXuTian || state.flags.rescuedFromXuTianEdge
                    ? '虚天殿里那几步已经让旁人看清，你并不是只会在安全时候讲情义。真正难的是，殿后活下来以后，你还愿不愿意继续认这份并肩。'
                    : state.flags.grabbedTreasure || state.flags.secondHandBroker
                        ? '你带出来的东西很值钱，可人们先记住的反而不是宝，而是你在最窄的一刻到底把谁留在了身后。'
                        : '你从虚天局里活着出来了，可海上的风评还没收口。很多人都在等你下一步，看你究竟会继续认人，还是只认结果。';
                const nangongLine = (state.npcRelations['南宫婉'] || 0) >= 60 || state.flags.cooperatedAtXuTian || state.flags.rescuedFromXuTianEdge
                    ? '南宫婉没有再追问殿中细节，只淡淡道：“并肩一回不算难，难的是出了殿以后，你还认不认这层人情。”'
                    : '南宫婉这一线没有因为虚天结束就自动翻篇。越是临近离卷，你越看得出，有些人情拖得越久，越不会自己变轻。';
                return [
                    beat('旁白', '虚天殿真正留下来的，从来不只是宝。谁在殿里先伸手，谁在殿外先回头，海上所有活下来的人都记得。'),
                    beat('旁白', allianceLine),
                    beat('旁白', nangongLine),
                    beat('旁白', '更麻烦的是，海上的风声已经和你的名字绑在一起。你若不主动收束，它迟早会比你先一步回到旧地。'),
                    beat('旁白', '所以这一章真正要回答的，不是“赢没赢”，而是你要怎么带着虚天之后的人情与名声继续往前走。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'honor_alliance_after_palace',
                        text: '先认并肩旧盟，把虚天后的情义继续接住',
                        effects: {
                            cultivation: 1180,
                            relations: { '南宫婉': 12 },
                            routeScores: { orthodox: 1 },
                            flags: {
                                honoredAllianceAfterXuTian: true,
                                nangongBondStageTwoConfirmed: true,
                                starSeaAftermathMode: 'alliance',
                            },
                        },
                        nextChapterId: '23_mocaihuan_return',
                    },
                    {
                        id: 'settle_reputation_with_profit',
                        text: '顺势把名声折成筹码，先把虚天余波换成可见收益',
                        effects: {
                            cultivation: 1210,
                            items: { lingshi: 24 },
                            routeScores: { demonic: 1 },
                            flags: {
                                settledStarSeaReputationWithProfit: true,
                                starSeaAftermathMode: 'profit',
                                tiannanReturnPressureMode: 'reputation',
                            },
                        },
                        nextChapterId: '23_mocaihuan_return',
                    },
                    {
                        id: 'cut_tracks_and_leave',
                        text: '先把海上的痕迹断干净，别让更多人顺着余波认出你',
                        effects: {
                            cultivation: 1160,
                            routeScores: { secluded: 1 },
                            flags: {
                                cutStarSeaTracksAfterXuTian: true,
                                starSeaAftermathMode: 'hidden',
                                tiannanReturnPressureMode: 'hidden',
                            },
                        },
                        nextChapterId: '23_mocaihuan_return',
                    },
                ];
            },
        },
        {
            id: '23_mocaihuan_return',
            title: '来信与重访',
            summary: '一封家书把你重新拽回嘉元城。院门还在，等门的人已经学会不再把答案只押在你身上。',
            location: '嘉元城',
            volumeId: 'volume_four_overseas',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_four_chapter_7',
            requirements: { storyProgress: '23_mocaihuan_return' },
            beats(state) {
                const debtLine = state.flags.madeAmendsToMocaihuan || state.flags.mendedMoHouseDebt
                    ? '你上次留下的补偿还在起作用，可那并不等于这次进门就能当作什么都没欠。'
                    : '你带回来的不是迟到的义气，而是一个早该亲自回来交代的人。';
                return [
                    beat('旁白', '信纸并不名贵，边角却被人折得很平。你在海上看惯了生死和试探，反倒是这样一封只写日常的来信，让手指迟迟没能松开。'),
                    beat('旁白', debtLine),
                    beat('旁白', '再回嘉元城时，墨府门前的石阶已经换过两块。门里灯火不旺，却也没有你想象中的那种“只等你来定生死”的气息。'),
                    beat('墨彩环', '你总算肯回来一趟。别紧张，我不是来逼你补一张旧账单的。只是有些话若再不当面说，就真要烂在旧屋里了。'),
                    beat('你', '我欠下的，不止一张账单。只是这些年总想着先把命保住，回头便回得越来越晚。'),
                    beat('墨彩环', '凡人的日子不是给你存着的。你回来，我认；你不回来，我们也照样过。可你若进了这道门，总得先说明白，这次是来认人，还是只来看看。'),
                    beat('旁白', '她说话不急，分量却比责怪更重。你这才真听见这些年被自己一句“以后再补”压下去的声音。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'support_mocaihuan_longterm',
                        text: '补偿并长期照拂，把这笔旧账真正接回手里',
                        effects: {
                            cultivation: 1270,
                            items: { lingshi: 16 },
                            relations: { '墨彩环': 20 },
                            routeScores: { orthodox: 1 },
                            flags: { madeAmendsToMocaihuan: true, mendedMoHouseDebt: true },
                        },
                        nextChapterId: '23_volume_close',
                    },
                    {
                        id: 'admit_old_wrong',
                        text: '坦白旧错，但不再越界介入她如今的日子',
                        effects: {
                            cultivation: 1250,
                            relations: { '墨彩环': 10 },
                            flags: { admittedOldWrongToMocaihuan: true },
                        },
                        nextChapterId: '23_volume_close',
                    },
                    {
                        id: 'confirm_mocaihuan_safe',
                        text: '只确认她安好，随即离开，把人情停在这里',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { checkedOnMocaihuanThenLeft: true },
                        },
                        nextChapterId: '23_volume_close',
                    },
                ];
            },
        },
        {
            id: '23_volume_close',
            title: '星海余波',
            summary: '第四卷出口不再只是离海，而是决定你带着怎样的名声、旧盟与压力回望天南。',
            location: '乱星海外海',
            volumeId: 'volume_four_overseas',
            volumeRole: 'exit',
            legacyVolumeTarget: 'volume_four_chapter_8',
            requirements: { storyProgress: '23_volume_close', realmScoreAtLeast: 9 },
            beats(state) {
                const allianceLine = state.flags.honoredAllianceAfterXuTian || state.flags.nangongBondStageTwoConfirmed
                    ? '你没有把并肩那一夜只算成一次临时合作。到了离海之前，这已经变成别人能不能继续信你的分界。'
                    : state.flags.settledStarSeaReputationWithProfit
                        ? '你把名声折成过筹码，也清楚它不会就此消失。它只会先你一步，去旧地替你定义来意。'
                        : state.flags.cutStarSeaTracksAfterXuTian
                            ? '你把痕迹压得很低，却也知道真正重要的因果并不会因为你藏得好就彻底消失。'
                            : '虚天之后的海路没有安静下来，只是把结盟、名声和旧债一起压成了离卷前的最后一道风。';
                const mocaihuanLine = state.flags.madeAmendsToMocaihuan
                    ? '嘉元城那封信让你明白，有些旧账若真肯接回手里，就不能只在心里说“以后再补”。'
                    : state.flags.admittedOldWrongToMocaihuan
                        ? '你承认了旧错，也知道有些东西已经回不到原样。可承认本身，至少让这笔旧账不再是假装没发生。'
                        : '你没有把旧账全都接回手里，只是终于看清那些年里替你过日子的人，从来不是你自己。';
                return [
                    beat('旁白', '到了离海之时，真正要收的从来不是海图远近，而是你在这片海上养成了怎样的活法。乱星海给你的，不是一句现成答案，而是一身此后都甩不掉的处世习气。'),
                    beat('旁白', allianceLine),
                    beat('旁白', mocaihuanLine),
                    beat('旁白', '现在逼你回头的，不是怀旧，而是你已经知道：有些人情、旧名与海上余波，若不自己认，就只会先一步替你开口。'),
                    beat('旁白', '所以第四卷走到这里，真正的问题只剩一个：你要以怎样的姿态回看天南，回看旧盟，也回看那个早已不在原地等你的世界。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'follow_old_alliances_home',
                        text: '顺着旧盟与并肩情义回望天南，把该认的人先认下来',
                        effects: {
                            cultivation: 1260,
                            relations: { '南宫婉': 8 },
                            routeScores: { orthodox: 1 },
                            flags: {
                                followedStarSeaAlliancesHome: true,
                                tiannanReturnPressureMode: 'alliance',
                            },
                        },
                        nextChapterId: 24,
                    },
                    {
                        id: 'return_with_reputation_pressure',
                        text: '带着海上名声回去，让旧地先听见你如今是什么人',
                        effects: {
                            cultivation: 1280,
                            items: { lingshi: 12 },
                            routeScores: { demonic: 1 },
                            flags: {
                                returnedWithStarSeaReputationPressure: true,
                                tiannanReturnPressureMode: 'reputation',
                            },
                        },
                        nextChapterId: 24,
                    },
                    {
                        id: 'return_after_hiding_tracks',
                        text: '压住海上痕迹后再回头，尽量别让旧地一下子认全你的来路',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: {
                                returnedAfterHidingStarSeaTracks: true,
                                tiannanReturnPressureMode: 'hidden',
                            },
                        },
                        nextChapterId: 24,
                    },
                ];
            },
        },
        {
            id: 24,
            title: '重返天南',
            summary: '天南风物仍旧，认你的人却已经不是当年那一批。',
            volumeId: 'volume_five_homecoming',
            volumeRole: 'opening',
            legacyVolumeTarget: 'volume_five_chapter_1',
            location: '天南',
            requirements: { storyProgress: 24, realmScoreAtLeast: 10 },
            beats(state) {
                const moLine = state.flags.daoLvPromise || state.flags.mendedMoHouseDebt || (state.npcRelations['墨彩环'] || 0) >= 45
                    ? '你先想起嘉元城。无论墨府如今是灯火仍亮还是只剩旧宅残墙，那笔凡俗旧账都没有自己消失。'
                    : '你路过嘉元城方向时仍会停一停。那里没有谁等你凯旋，只有一些你当年没敢彻底看完的后果。';
                const liLine = state.flags.liDisciple || state.flags.learnsSecretively
                    ? '黄枫谷旧人也在被重新衡量。李化元若再见你，已不会只问修为，而会问你这趟回来到底认不认旧门墙。'
                    : '宗门旧名仍挂在许多人嘴边。你越往前走，越清楚“没有正式拜师”也不等于真的和师门两清。';
                const nangongLine = (state.npcRelations['南宫婉'] || 0) >= 60 || state.flags.savedNangong || state.flags.acceptedNangongHelp
                    ? '再见南宫婉时，她没有追问从前，只淡淡看着你: “你比当年更会藏了。那这次回来，是想挡，还是想走？”'
                    : '血色禁地那一夜并没有被时间抹平。你越接近旧地，越能感觉到有些人并不需要常见，也足以把你钉回当年的选择。';
                const mineLine = state.flags.mineChoice
                    ? state.flags.mineChoice === 'hold'
                        ? '你在矿脉里把人护到退路，可那件事已经把你变成能守住整条线的人。'
                        : state.flags.mineChoice === 'rearGuard'
                            ? '回头接应的那一步，让旧宗门之后再提起你时不只记得你能跑还记得你肯回头。'
                            : state.flags.mineChoice === 'betrayGate'
                                ? '矿门开启时你马上知道旧宗门已经不再等你回转。'
                                : state.flags.mineChoice === 'harvest'
                                    ? '死局里收资源让你穿得更冷、更有收益。'
                                    : state.flags.mineChoice === 'sabotageLeave'
                                        ? '炸断矿道的那一次决定，让你之后的苟修线更像斩断。'
                                        : state.flags.mineChoice === 'soloEscape'
                                            ? '独自逃生把你和那个死局划清，也给你带来永远的负音。'
                                            : '这次矿脉里你站过的那几步，依然在后面每章被提起。'
                    : '矿脉的死局还在你靴底，没人会让你像没事人一样过兵营。';
                const seaLine = state.flags.starSeaStyle
                    ? state.flags.starSeaStyle === 'hunter'
                        ? '星海的猎妖者要么先杀出名，要么先遭遇更深的凶险。'
                        : state.flags.starSeaStyle === 'merchant'
                            ? '跑商的人把你当成消息通路，风向变了第一时间就会找你确认。'
                            : '苟修在海上意味着你越来越多人看你是否还守得住那份退路。'
                    : '你在星海的身份还没完全固定，但每一步都在让人重新定义你。';
                const xuLine = state.flags.hasXuTianTu || state.flags.soldXuTianTu || state.flags.avoidedXuTian
                    ? '虚天这一笔已经在你脚下投了影子。无论你接不接，旁人都会先拿它来量你。'
                    : '你还没把虚天的残图真正放下，但它的存在已经在你身边发酵。';
                return [
                    beat('旁白', '真正的返乡，从来不是回到原地，而是你站在旧城旧路前，忽然发现所有人都继续往前走了，只有记忆还停在原处。'),
                    beat('旁白', '天南的风还是旧时味道，可旧镇地基已被雨水冲平，摊贩、门匾与路边说话的人，全都换成了另一代面孔。'),
                    beat('旁白', '你这才明白，所谓回家，很多时候只是回来确认: 那个你以为会一直留在原地的世界，其实早就不在了。'),
                    beat('旁白', mineLine),
                    beat('旁白', seaLine),
                    beat('旁白', xuLine),
                    beat('旁白', moLine),
                    beat('旁白', liLine),
                    beat('旁白', nangongLine),
                    beat('旁白', '重返天南不是为了怀旧，而是要决定三件事: 旧仇要不要清，旧情要不要认，旧名要不要继续背在身上。'),
                ];
            },
            choices(state) {
                const nangongBond = state.flags.savedNangong
                    || state.flags.acceptedNangongHelp
                    || state.flags.acceptedNangongDebt
                    || state.flags.openlyAcknowledgedNangongImportance
                    || state.flags.continuedToOweNangongSilently
                    || (state.npcRelations['南宫婉'] || 0) >= 60;
                const moBond = state.flags.daoLvPromise
                    || state.flags.mendedMoHouseDebt
                    || state.flags.madeAmendsToMocaihuan
                    || state.flags.admittedOldWrongToMocaihuan
                    || (state.npcRelations['墨彩环'] || 0) >= 45;
                const liBond = state.flags.liDisciple
                    || state.flags.learnsSecretively
                    || state.flags.enteredLihuayuanLineage
                    || state.flags.respectedLihuayuanButStayedIndependent
                    || state.flags.usedLihuayuanInfluencePragmatically
                    || (state.npcRelations['李化元'] || 0) >= 30;
                const settlementFlags = { returnedTiannanForSettlement: true, settledScores: true, tiannanReturnMode: 'settlement' };
                const settlementRelations = {};
                const bondsFlags = { returnedTiannanForBonds: true, tiannanReturnMode: 'bonds' };
                const bondsRelations = {};

                if (moBond) {
                    settlementRelations['墨彩环'] = 10;
                    bondsRelations['墨彩环'] = 12;
                }

                if (liBond) {
                    settlementRelations['李化元'] = 10;
                    bondsRelations['李化元'] = 12;
                }

                if (nangongBond) {
                    bondsRelations['南宫婉'] = 18;
                }

                const settlementText = moBond
                    ? '清算旧账: 从嘉元城与旧宗门开始，把拖太久的承诺、怨与债一次理完'
                    : liBond
                        ? '清算旧账: 先把门墙旧案和一路压着的刀都抽出来'
                        : '清算旧账: 不再拖延，把旧仇、旧案与欠债一次理清';
                const bondsText = nangongBond
                    ? '接住旧情：不再让与南宫婉的这一笔继续沉在无言里'
                    : moBond
                        ? '接住旧情: 先回嘉元城，把还能补的那笔旧情接回手里'
                        : liBond
                            ? '接住旧情: 先回师门，把还能说清的话说清'
                            : '接住旧情: 把还来得及补的人与承诺放到前面';

                return [
                    {
                        id: 'returned_tiannan_for_settlement',
                        text: settlementText,
                        effects: {
                            cultivation: 1800,
                            relations: settlementRelations,
                            routeScores: { orthodox: 1, demonic: 1 },
                            flags: settlementFlags,
                        },
                        nextChapterId: '24_old_debt_and_name',
                    },
                    {
                        id: 'returned_tiannan_for_bonds',
                        text: bondsText,
                        effects: {
                            cultivation: 1700,
                            relations: bondsRelations,
                            routeScores: { orthodox: 2 },
                            flags: bondsFlags,
                        },
                        nextChapterId: '24_old_debt_and_name',
                    },
                    {
                        id: 'returned_tiannan_but_remained_hidden',
                        text: '藏锋离场: 只处理必须处理的部分，不再背旧名，也不再重入旧局',
                        effects: {
                            cultivation: 1750,
                            routeScores: { secluded: 2 },
                            flags: {
                                returnedTiannanButRemainedHidden: true,
                                returnedToSeclusion: true,
                                tiannanReturnMode: 'hidden',
                            },
                        },
                        nextChapterId: '24_old_debt_and_name',
                    },
                ];
            },
        },
        {
            id: '24_old_debt_and_name',
            title: '旧账与旧名',
            summary: '嘉元城与黄枫谷都还记得你。难的不是回来，而是回来后不能再把该认的都推给明天。',
            volumeId: 'volume_five_homecoming',
            volumeRole: 'escalation',
            legacyVolumeTarget: 'volume_five_chapter_2',
            location: '嘉元城',
            requirements: { storyProgress: '24_old_debt_and_name', realmScoreAtLeast: 10 },
            beats(state) {
                const flags = state.flags || {};
                const relationMo = state.npcRelations['墨彩环'] || 0;
                const relationLi = state.npcRelations['李化元'] || 0;
                const returnLine = flags.tiannanReturnMode === 'settlement'
                    ? '你既已决定回来清账，旧地就不会再允许你只做一个过路人。'
                    : flags.tiannanReturnMode === 'bonds'
                        ? '你先承认了人，所以旧账也跟着站到了眼前。很多债并不会因为你先认了情就自行变轻。'
                        : '你本想只处理最低限度的部分，可真走到旧屋旧门前时，才知道最难压下去的从来不是旁人的目光，而是自己心里那句“其实我知道该认”。';
                const moLine = relationMo >= 45 || flags.daoLvPromise || flags.mendedMoHouseDebt
                    ? '墨府那一笔已经不能再被你说成“以后再补”。不管是补偿、认错还是断开，你都得给它一个像样的落点。'
                    : '嘉元城没有追着你算账，可也正因为如此，你更知道这笔账若还要拖，只会越来越像你自己的心病。';
                const liLine = relationLi >= 30 || flags.liDisciple || flags.enteredLihuayuanLineage
                    ? '黄枫谷旧门墙也在等你回话。真正要认的不是名分，而是你这些年借过、背过、又想甩开的那些东西。'
                    : '就算你没有正式把名字落在门墙里，旧宗门与旧战局也不会真把你当成无关人。';
                return [
                    beat('旁白', '回乡之后最先围上来的不是刀，而是两种完全不同的目光：一种来自还在等你给话的人，一种来自早就把你算进旧案里的人。'),
                    beat('墨彩环', '你若只把灵石放下，和从前把事往后拖，其实没多大分别。'),
                    beat('旁白', returnLine),
                    beat('黄枫谷执事', '李师叔当年替你压过的话，如今总该有人亲口回一句。你要认门墙，还是认完便走，今天都得说清。'),
                    beat('旁白', moLine),
                    beat('旁白', liLine),
                    beat('你', '我今天回来，不是为了把旧名重新挂回身上，而是为了把该我自己接的那一段先接住。'),
                    beat('旁白', '话一出口，旧屋、旧门和旧案才像真的落回了地上。很多年里你第一次不再只想着怎么脱身，而是先想怎么把这一步站稳。'),
                ];
            },
            choices(state) {
                const moBond = hasVolumeFiveMocaihuanBond(state);
                const liBond = (state.npcRelations['李化元'] || 0) >= 30
                    || state.flags.liDisciple
                    || state.flags.enteredLihuayuanLineage
                    || state.flags.respectedLihuayuanButStayedIndependent;
                const settleRelations = {};
                const partialRelations = {};
                if (moBond) {
                    settleRelations['墨彩环'] = 10;
                    partialRelations['墨彩环'] = 4;
                }
                if (liBond) {
                    settleRelations['李化元'] = 8;
                    partialRelations['李化元'] = 4;
                }
                return [
                    {
                        id: 'settle_old_debts_openly',
                        text: '把旧账翻明：该认的账、该补的错和该背的名，都由自己来结',
                        effects: {
                            cultivation: 1850,
                            relations: settleRelations,
                            routeScores: { orthodox: 1 },
                            flags: {
                                volumeFiveOldDebtMode: 'settled',
                                oldDebtsCleared: true,
                                returnedToMoHouse: moBond,
                                madeAmendsToMocaihuan: moBond,
                                answeredLiSummons: liBond,
                            },
                        },
                        nextChapterId: '24_bond_destination',
                    },
                    {
                        id: 'pay_accounts_but_leave_name_behind',
                        text: '付账但不住回去：把该补的补上，旧名却不再重新背回肩上',
                        effects: {
                            cultivation: 1780,
                            relations: partialRelations,
                            routeScores: { orthodox: 1, secluded: 1 },
                            flags: {
                                volumeFiveOldDebtMode: 'compensated',
                                oldDebtCompensationLeft: true,
                                checkedOnMocaihuanThenLeft: moBond,
                                answeredLiSummons: liBond,
                            },
                        },
                        nextChapterId: '24_bond_destination',
                    },
                    {
                        id: 'cut_old_name_after_minimum_duty',
                        text: '认完便断：只做最低限度的那部分，然后把旧名一起压下',
                        effects: {
                            cultivation: 1810,
                            routeScores: { demonic: 1, secluded: 1 },
                            flags: {
                                volumeFiveOldDebtMode: 'buried',
                                oldNameBuriedAtEnd: true,
                                keptDistanceFromOldFriend: true,
                                returnedToSeclusion: true,
                            },
                        },
                        nextChapterId: '24_bond_destination',
                    },
                ];
            },
        },
        {
            id: '24_bond_destination',
            title: '旧情去处',
            summary: '旧账总还能算，旧情却不是。真走到最后，人和路不可能永远都被你一起往后拖。',
            volumeId: 'volume_five_homecoming',
            volumeRole: 'bonding',
            legacyVolumeTarget: 'volume_five_chapter_3',
            location: '嘉元城',
            requirements: { storyProgress: '24_bond_destination', realmScoreAtLeast: 11 },
            beats(state) {
                const relationNangong = state.npcRelations['南宫婉'] || 0;
                const relationMo = state.npcRelations['墨彩环'] || 0;
                const nangongLine = relationNangong >= 70 || state.flags.savedNangong || state.flags.acceptedNangongDebt
                    ? '与南宫婉的这一笔走到这里，已经不能再靠沉默维持。她不必追着你要答案，你自己也知道迟早得给。'
                    : '你并不是不记得南宫婉，只是这些年太习惯先把最重的话压到最后。可现在已经没有更合适的“最后”了。';
                const moLine = relationMo >= 45 || state.flags.madeAmendsToMocaihuan || state.flags.daoLvPromise
                    ? '墨彩环那一笔更像凡心回头：你越想补，越知道有些东西不是肯补就能补回来的。'
                    : '嘉元城的灯火仍是凡人的灯火，它不会替你等太久，也不会替你解释太多。';
                return [
                    beat('旁白', '你终于意识到，真正会跟着你走到飞升前夜的，不只是仇与债，还有你究竟肯不肯承认谁算“重要”。'),
                    beat('旁白', nangongLine),
                    beat('旁白', moLine),
                    beat('旁白', '很多修士活到很高也只是更会算账。你走到这里，真正要回答的是：你会不会把人也算进去。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'choose_nangong_openly',
                        text: '正面认下南宫婉：别再让这笔旧情继续沉在无言里',
                        effects: {
                            cultivation: 1950,
                            relations: { '南宫婉': 18 },
                            routeScores: { orthodox: 1 },
                            flags: {
                                volumeFiveBondTarget: 'nangong',
                                openlyAcknowledgedNangongImportance: true,
                                acceptedNangongPath: true,
                            },
                        },
                        nextChapterId: 25,
                    },
                    {
                        id: 'face_mocaihuan_at_last',
                        text: '回嘉元城把迟来的话说完：凡心既已醒，就别再装作没醒',
                        effects: {
                            cultivation: 1880,
                            relations: { '墨彩环': 16 },
                            routeScores: { orthodox: 1 },
                            flags: {
                                volumeFiveBondTarget: 'mocaihuan',
                                admittedOldWrongToMocaihuan: true,
                                volumeFiveMortalHeartAwakened: true,
                            },
                        },
                        nextChapterId: 25,
                    },
                    {
                        id: 'keep_everyone_at_distance',
                        text: '还是把最重的话压住：认得出重要，却先不让任何人靠得太近',
                        effects: {
                            cultivation: 1900,
                            routeScores: { secluded: 1 },
                            flags: {
                                volumeFiveBondTarget: 'distance',
                                continuedToOweNangongSilently: true,
                                cutEmotion: true,
                            },
                        },
                        nextChapterId: 25,
                    },
                ];
            },
        },
        {
            id: 25,
            title: '飞升前夜',
            summary: '天门未开，案上的旧物先把你这一生照亮了一半。',
            volumeId: 'volume_five_homecoming',
            volumeRole: 'closure',
            legacyVolumeTarget: 'volume_five_chapter_4',
            location: '大晋',
            requirements: { storyProgress: 25, realmScoreAtLeast: 12 },
            beats(state) {
                const flags = state.flags || {};
                const relationNangong = state.npcRelations['南宫婉'] || 0;
                const relationMo = state.npcRelations['墨彩环'] || 0;
                const debtLine = flags.volumeFiveOldDebtMode === 'settled'
                    ? '旧账如今已被你真正翻明，所以摆在案上的不再只有刺，还有一种终于认过的松。'
                    : flags.volumeFiveOldDebtMode === 'compensated'
                        ? '你补了该补的那部分，却仍把自己留在门外。案上的旧物因此不只是账，也是分寸。'
                        : '你把最难堪的那部分压成了沉默。案上的旧物越整齐，就越像在提醒你什么还没真正说清。';
                const bondLine = flags.volumeFiveBondTarget === 'nangong'
                    ? relationNangong >= 85
                        ? '南宫婉这一笔已不能再被你说成路过。你走到门前时，首先想到的已经不是自己一个人够不够快。'
                        : '你终于承认她重要，却也知道很多话若现在还说不透，以后大概只会更难。'
                    : flags.volumeFiveBondTarget === 'mocaihuan'
                        ? relationMo >= 55
                            ? '墨彩环这一笔让你第一次正面看见：有些凡心不是没有，而是醒得太迟。'
                            : '你已把那份凡心看见，却也知道它再亮，也照不回已经过去的那些年。'
                        : '你还是更习惯把最重的话压在心里。飞升前夜最难承认的，也正是这种习惯本身。';
                return [
                    beat('旁白', '化神后期的天地，与当年你初上修行路时所见已完全不同。山河在神识中不再只是地貌，而像无数条运转的脉络。许多人一生追逐的机缘、法宝、名望，如今大半都已落到你身后。'),
                    beat('旁白', '飞升前夜，你没有立刻闭关，而是把一路留下来的旧物一一摊在案上：旧账页、凡俗旧物、墨府名单、旧符、残信。它们都不值钱，却比任何重宝都更像真正陪你走到这里的东西。'),
                    beat('旁白', '窗纸被夜风掀起时，你忽然发现自己再也没法把旧事都推给“当时只能如此”了。'),
                    beat('旁白', debtLine),
                    beat('旁白', bondLine),
                    beat('旁白', '天门就在前头，案上的旧物和身后的旧人却把去路逼得比雷声还窄。'),
                    beat('旁白', '你最早不是为了大道修仙，只是太早见过无能为力。'),
                    beat('旁白', '一路遇见的人，并非全是道上的过客；他们是见过你、逼过你、成全过你，也让你再难轻易骗过自己的人。'),
                    beat('旁白', '正道、魔道、苟修，从来都不是别人给你的牌子，而是你一次次面对“我能不能为了更稳更快而舍别人”时交出的答案。'),
                ];
            },
            choices() {
                return [
                    {
                        id: 'stay_in_world_for_one_person',
                        text: '门已打开，也先别走：这一回先把人留下，再谈飞升',
                        effects: {
                            cultivation: 2100,
                            routeScores: { orthodox: 1 },
                            flags: {
                                volumeFiveAscensionAttitude: 'stay',
                                stayedForOnePerson: true,
                                postponedAscension: true,
                            },
                        },
                        nextChapterId: '25_final_branch',
                    },
                    {
                        id: 'walk_together_if_fate_allows',
                        text: '若真有飞升，就试一次并肩而上',
                        effects: {
                            cultivation: 2200,
                            routeScores: { orthodox: 1 },
                            flags: {
                                volumeFiveAscensionAttitude: 'shared',
                                preparedSharedAscension: true,
                            },
                        },
                        nextChapterId: '25_final_branch',
                    },
                    {
                        id: 'send_her_ahead_and_wait_for_return',
                        text: '先把她送上去：这一回把自己押后一次',
                        effects: {
                            cultivation: 2180,
                            routeScores: { orthodox: 1, secluded: 1 },
                            flags: {
                                volumeFiveAscensionAttitude: 'delay',
                                sentNangongAheadAtGate: true,
                            },
                        },
                        nextChapterId: '25_final_branch',
                    },
                    {
                        id: 'say_nothing_and_walk_alone',
                        text: '还是什么都不说：门若要开，就先一个人过去',
                        effects: {
                            cultivation: 2250,
                            routeScores: { secluded: 1 },
                            flags: {
                                volumeFiveAscensionAttitude: 'alone',
                                walkedTowardAscensionAlone: true,
                                suppressedNangongFeelings: true,
                            },
                        },
                        nextChapterId: '25_final_branch',
                    },
                ];
            },
        },
        {
            id: '25_final_branch',
            title: '门前问心',
            summary: '门前无人催你，倒是一路没说完的话先挤到了喉间。',
            volumeId: 'volume_five_homecoming',
            volumeRole: 'ending',
            legacyVolumeTarget: 'volume_five_chapter_5',
            location: '大晋',
            requirements: { storyProgress: '25_final_branch', realmScoreAtLeast: 12 },
            beats(state) {
                const flags = state.flags || {};
                const relationNangong = state.npcRelations['南宫婉'] || 0;
                const relationMo = state.npcRelations['墨彩环'] || 0;
                const routeLine = (state.routeScores.orthodox || 0) >= Math.max(state.routeScores.demonic || 0, state.routeScores.secluded || 0)
                    ? '你一路更像那个仍愿意给别人留位置的人，所以终局时很多问题都会先被问成“你肯不肯认人”。'
                    : (state.routeScores.secluded || 0) >= (state.routeScores.demonic || 0)
                        ? '你一路更像那个总会先给自己留退路的人，所以终局时很多答案都会先带着“你究竟愿不愿意停下来”的味道。'
                        : '你一路更像那个先算收益与代价的人，所以终局时很多旧账都会比情面更早追上来。';
                const bondLine = flags.volumeFiveBondTarget === 'mocaihuan'
                    ? relationMo >= 55
                        ? '墨彩环这一笔已经不能再被你说成凡俗尾巴。它会直接决定你最后怎么看待“仙凡殊途”这四个字。'
                        : '你看见了那份凡心，却还没能真正补到旧人心里去。'
                    : flags.volumeFiveBondTarget === 'nangong'
                        ? relationNangong >= 90
                            ? '南宫婉这一笔已走到不能再回避的地步。你最后是独行、并肩还是押后自己，她都会在答案里。'
                            : '你终于承认了她重要，可你也知道，承认得太晚，本身就会改写答案。'
                        : '你还是把最重的话压到了门前。所以最后真正追上来的，不是别人，而是你自己一路以来的迟疑。';
                return [
                    beat('旁白', '走到这里，天门、旧地、旧人和一路留下来的痕迹终于同时站到了你面前。'),
                    beat('旁白', routeLine),
                    beat('旁白', bondLine),
                    beat('旁白', '现在摆在你脚边的，不是还能不能选，而是你要带着哪一身旧声旧债迈过这道门槛。'),
                ];
            },
            choices(state) {
                return buildVolumeFiveFinalChoices(state);
            },
        },
    ];

    function getRouteName(state) {
        const routes = state?.routeScores || {};
        const ordered = [
            ['orthodox', routes.orthodox || 0],
            ['demonic', routes.demonic || 0],
            ['secluded', routes.secluded || 0],
        ].sort((left, right) => right[1] - left[1]);

        if (ordered[0][1] <= 0) {
            return '未定';
        }

        return ordered[0][0] === 'orthodox' ? '正道' : ordered[0][0] === 'demonic' ? '魔路' : '苟修';
    }

    function getChapterEchoes(chapter, state) {
        const flags = state?.flags || {};
        const routeName = getRouteName(state);
        const relations = state?.npcRelations || {};
        const location = chapter.location || '无名之地';
        let text = '';
        switch (chapter.id) {
            case 2:
                text = flags.startPath === 'disciple'
                    ? '与墨大夫的这一笔从这里起不再只是师徒，而会渐渐变成反咬回来的旧因果。'
                    : '你如今待墨大夫是敬是疑，神手谷往后给你的回声便不会一样。';
                break;
            case 3:
                text = relations['厉飞雨'] >= 30
                    ? '厉飞雨会继续成为你在七玄门时期最直接的人情回声。'
                    : '你和厉飞雨之间留下的分寸，会在后面章节里不断被重新提起。';
                break;
            case 6:
                text = flags.defeatedMo
                    ? '墨居仁一死，墨府与药渣留下的旧事也就分成了两头，各自等着你回头去认。'
                    : '这场摊牌不会因今晚止息，往后许多相逢都还会被它牵出暗声。';
                break;
            case 8:
                text = '墨府这件事不会停在一宅白灯里。你如今说过的话、带走的东西和没说尽的真相，后面都会有人记着。';
                break;
            case 9:
                text = '曲魂这一章真正留下的，不只是它会不会跟在你身边，而是你往后还能不能把“人”和“可用之物”分清。';
                break;
            case 12:
                text = flags.sentWordBackFromRoad
                    ? '你离开旧地时没有把过去完全按死。这会让你后面很多“只谈活路”的选择，都被旧名旧债重新拽住一点。'
                    : flags.buriedOldNameOnRoad
                        ? '你从这一章起学会先把名字和来路藏起来。后面局势越大，这种先藏再动的习惯就越会变成你的本能。'
                        : '官道拐向太南山时，你终于把最后一次回头忍住了。前路还没稳，旧地也没断，只是从这一步起，它再不会替你挡风。';
                break;
            case '12_mortal_debt':
                text = '你走出嘉元城时没有比来时轻松多少，只是终于知道：这地方欠你的会疼，你欠这地方的也会疼。';
                break;
            case '12_tainan_market':
                text = '太南山散场后，摊位热气散得很快，你先记住的却是谁把消息当价码，谁把命当零头。';
                break;
            case '12_token_kill':
                text = '升仙令这一章真正留下的，不是门票本身，而是你终于知道修士的资格和杀机往往一起到场。';
                break;
            case '12_enter_yellow_maple':
                text = '黄枫谷不是奖励，而是一套更大的秩序。你以后借到的每一层门墙之力，都会回到这一步来重新认账。';
                break;
            case '12_herb_garden':
                text = flags.hasGreenBottle
                    ? '绿瓶的催熟之能从这里起不只是帮你省时省力，它也会把你往后的每一步照得更险更亮。'
                    : '你在百药园藏得多深、拿得多急，往后缺不缺药材与风声都要从这里算起。';
                break;
            case 13:
                text = flags.madeGardenConnections
                    ? '夜还没过三更，同门排位和话头已经先替禁地定了座次。你站到哪里，旁人便记到哪里。'
                    : '灯火压低后，谁来找你同路、谁只在远处看你，禁地未开就已经把答案写了一半。';
                break;
            case '13_volume_close':
                text = '离谷前最后一盏灯压得很低，你背上的升仙令、门墙和旧债却一件也没轻。';
                break;
            case 14:
                text = '血色禁地真正会定下的，不只是主药归谁，而是你第一次在活人、退路和机缘同时压来时，会先看哪一边。';
                break;
            case 15:
                text = flags.acceptedNangongDebt
                    ? '你已经把与南宫婉的这一笔认成了情债，往后再见，她前后一句话都会更重。'
                    : flags.suppressedNangongFeelings
                        ? '你把心绪压进了更深处，可每次再见南宫婉，都得多用一分力气装作什么都没发生。'
                        : flags.cutNangongTies || flags.cutEmotion
                            ? '你嘴上说已把这层牵连斩断，可禁地那一夜留下的记忆，并不会因为一句“只认资源”就自己消失。'
                            : '筑基成了，但这一章留下的情债处理方式，会一直追到终局前夜。';
                break;
            case 16:
                text = flags.enteredLihuayuanLineage
                    ? '令牌一接，师门给你的就不只是庇护，也是“什么时候该替谁负责”的分量。'
                    : flags.respectedLihuayuanButStayedIndependent
                        ? '你听懂了李化元说的秩序与索取，却仍给自己留了半步退路。后面很多人也会因此只肯信你半步。'
                        : flags.usedLihuayuanInfluencePragmatically || flags.learnsSecretively
                            ? '你借了门墙的势，却没把自己全交进去。李化元往后看你时，认可和提防会一起留下。'
                            : '李化元这一章真正留下的，不是名分高低，而是你开始知道师门会向弟子索取什么。';
                break;
            case 17:
                text = flags.yanFortObservedQuietly || flags.lowProfileBanquet
                    ? '燕家堡那一夜你没急着替任何人站队。后来再遇到笑里藏刀的场面，别人会先记得你很难被拖进别人的节奏。'
                    : flags.yanFortEstablishedPresence || flags.showedStrength
                        ? '燕家堡灯火最盛那一刻，你当面把场子压住了。此后很多人提到你，不会再只说“此子能打”，还会说你敢在桌上亮牌。'
                        : flags.yanFortNetworkBuilt || flags.builtBanquetNetwork
                            ? '燕家堡这一夜你没有赢下场面，却铺下了线。后面再有旧局与新局缠到一处时，这些人脉会比一时名声更像暗手。'
                            : '燕家堡留下来的，不是宴席本身，而是你第一次被人按势力棋盘来放位置。';
                break;
            case '16_feiyu_return':
                text = flags.helpedOldFriendAgain
                    ? '厉飞雨没有给你大道理，只让你重新听见还有人先关心你是不是活着，而不是值不值得结交。'
                    : flags.keptDistanceFromOldFriend
                        ? '你把旧友情也停在半步之外，这会让后面很多“凡心未死”的回响更显得珍贵。'
                        : '这场旧友重逢留下的不是战力，而是一句总会回来敲你的问话: 你还记不记得自己为什么出发。';
                break;
            case 18:
                text = flags.warChoice === 'demonic'
                    ? '魔道初成，刀光上的血意不会就此散尽。往后的局势只会一次次逼你记起今日怎样下手。'
                    : flags.warChoice === 'secluded'
                        ? '这一回你先给自己留足了活路。此后再逢死局，你多半还是会先看哪一步还能抽身。'
                        : '这一回你先替旁人站稳了一线。往后若再有人把命交到你手里，你便很难再只顾自己退身。';
                break;
            case '18_nangong_return':
                text = flags.openlyAcknowledgedNangongImportance
                    ? '你终于不再把与南宫婉的这一笔往外推。往后旧情若再翻上心头，你也再不能只装作不曾看见。'
                    : flags.continuedToOweNangongSilently
                        ? '你承认亏欠，却还是把话压回心里。往后每次再见她，这层沉默都会比旁人更重。'
                        : flags.avoidedNangongAgain
                            ? '你又一次把真正重要的话转开了。后面若再选最冷的路，这会成为很难洗掉的一笔。'
                            : '并肩之后留下的不是暧昧，而是有人真的看穿你之后，你还愿不愿承认。';
                break;
            case 19:
                text = flags.mineChoice === 'hold'
                    ? '灵矿里那次死守会一直跟着你。以后再有人谈起你，很多时候先说的不是修为，而是“那人曾在矿里替同门顶过一线”。'
                    : flags.mineChoice === 'rearGuard'
                        ? '你回头接应殿后同门那一步，会让很多旧人后来更愿意把命押在你身上。因为他们知道，你真到最后时未必先顾自己。'
                        : flags.mineChoice === 'betrayGate'
                            ? '你亲手打开过矿门。后来你再怎么解释利害与大势，这件事都会先一步替别人定义你肯把谁当代价。'
                            : flags.mineChoice === 'harvest'
                                ? '你在死局里收资源的做法，会让后面很多回看都带着冷意。因为你已经证明过，最乱的时候你也能先看见可拿走什么。'
                                : flags.mineChoice === 'sabotageLeave'
                                    ? '你炸断矿道再退那一次，会让你后面的很多选择都更像同一种活法: 留活路，但不回头。'
                    : flags.mineChoice === 'soloEscape'
                        ? '你独自逃生的样子，矿里活下来的人和死在那里的人都会记得。以后若再说自己只是别无选择，这一步总会回来拦你。'
                        : '你带队突围活着出来之后，旁人会更自然地把“跟着你也许能活”这件事当真。';
                break;
            case 20:
                text = flags.enteredStarSea
                    ? '进入乱星海之后，你的旧路并没有断，只是换了一种海上的说法。'
                    : '不管有没有立刻入海，天南和乱星海都会继续互相回响。';
                break;
            case 21:
                text = flags.starSeaStyle === 'hunter' || flags.starSeaHunterStart
                    ? '你在星海先学会的是拿命开路。后来别人看你，不会只看来自哪里，还会看你敢不敢在最险的海路上先动。'
                    : flags.starSeaStyle === 'merchant' || flags.starSeaTraderStart
                        ? '你在星海先学会的是算契约、货路和消息。等虚天与旧账一起压过来时，这种先算清的习惯会处处露出来。'
                        : flags.starSeaStyle === 'secluded' || flags.starSeaSecludedStart
                            ? '你在星海先学会的是把自己藏稳。这条活法会一路影响你后面看待机缘、旧人和终局的方式。'
                            : '初入星海真正留下的，不是风景，而是你被迫换了一套新的生存逻辑。';
                break;
            case '21_star_sea_foothold':
                text = flags.starSeaStyle === 'hunter' || flags.starSeaHunterStart
                    ? '你把最危险的猎路先走熟了。往后旁人提到你在星海立足，多半会先想起你敢不敢把命压在最凶的海口上。'
                    : flags.starSeaStyle === 'merchant' || flags.starSeaTraderStart
                        ? '你把货路和契约先站稳了。此后每逢大局，你都更像先把账算清，再决定要不要把人也押进去。'
                        : flags.starSeaStyle === 'secluded' || flags.starSeaSecludedStart
                            ? '你先把洞府、退路和藏身之法握在手里。后面很多看似从容的选择，都会沿着这条“先藏后动”的路径继续长。'
                            : '海外立足真正留下的，不是有没有站稳，而是你到底习惯用哪种姿态活下来。';
                break;
            case 22:
                text = flags.enteredVoidHeavenMapGame || flags.hasXuTianTu
                    ? '残图在手之后，别人要杀你的理由已经不需要完整证据。只要怀疑你知道得比他们多，就够把你拖进更大的局。'
                    : flags.soldFragmentMapForResources || flags.soldXuTianTu
                        ? '你卖出去的不只是纸片，也是别人通往那扇门的资格。换到手的是资源，留在心里的却是“危险只是换了个主人”。'
                        : flags.avoidedVoidHeavenCoreConflict || flags.avoidedXuTian
                            ? '你真正避开的不是宝，而是知道这扇门存在以后，还要装作与己无关的代价。'
                            : '虚天残图这章留下的，不是普通机缘，而是“知道”本身会不会把你拖下水。';
                break;
            case '22_xutian_rumor':
                text = flags.tiedXuTianRiskToPeople
                    ? '你在虚天开启前先把人心拴住了。此后再谈结盟，很多人都会记得你不是只会在殿里临时改口的人。'
                    : flags.tradedOnXuTianRumors
                        ? '你把风声也当成筹码用过了。以后只要局势再起，别人先想到的就不只是你知不知道，而是你会不会顺手再卖一次消息。'
                        : flags.starSeaReputationRaisedByRumor || flags.xutianRumorMode === 'quiet'
                            ? '你知道很多人不是死在不知道，而是死在太早被所有人知道。风声四起这一章，会让你后面越来越习惯先压住名字。'
                            : '虚天殿未开，风声已经先替你写好了半份名声。真正难的是你还没进局，就已经被别人按某一种人去防。';
                break;
            case 23:
                text = flags.grabbedTreasure || flags.starSeaSeizedTreasureFirst
                    ? '虚天殿前你先伸手去夺宝，这个动作会让很多后来者直接把你归进“关键时刻会先拿”的那类人。'
                    : flags.cooperatedAtXuTian || flags.rescuedFromXuTianEdge || flags.starSeaHeldAllianceTogether
                    ? '你在最窄的退路上先稳住了人。往后无论是虚天旧盟还是南宫婉，与这一步都再难分开。'
                        : flags.watchedXuTianFight || flags.secondHandBroker || flags.slippedPastXuTian || flags.starSeaWaitedForBestMoment
                            ? '你在虚天局里没有先把自己摆到明面，可活下来的人也因此更难彻底信你。因为他们都记得，你最会等别人先露底。'
                            : '殿门后的风还带着盐气，你却先记住了是谁在最窄那一步伸手，谁在最窄那一步松手。';
                break;
            case '23_star_sea_aftermath':
                text = flags.honoredAllianceAfterXuTian
                    ? '虚天殿的盐气还挂在衣上，并肩与翻脸的人却已经各自记住了你回身的那一下。'
                    : flags.settledStarSeaReputationWithProfit
                        ? '海风把名声吹得比人还快。你还没回头，旧人耳边先到的已经是“你这回把并肩折成了多少利”。'
                        : flags.cutStarSeaTracksAfterXuTian
                            ? '你把海上的痕迹压低了，可盐味还留在衣角。认得你的人只会更确定，你一到险处就先替自己留退路。'
                            : '虚天过后，先留下来的不是宝影，而是并肩的人有没有被你真的带出那道门。';
                break;
            case '23_mocaihuan_return':
                text = flags.madeAmendsToMocaihuan
                    ? '墨彩环这一笔不再只是“以后再补”。你这次是真的把旧账接回手里了，所以终局前看向嘉元城时，心里会少一层空白。'
                    : flags.admittedOldWrongToMocaihuan
                        ? '你承认了旧错，却也看清有些日子已经回不到原样。这会让后面的“旧账是否算清”不再只有黑白两面。'
                        : flags.checkedOnMocaihuanThenLeft
                            ? '你确认她安好后又离开了。往后若再说自己没有辜负凡俗旧人，这一步会先跳出来拦你。'
                            : '这封来信真正留下的，不是重逢本身，而是你终于看见有人替你扛过的那些年。';
                break;
            case '23_volume_close':
                text = flags.followedStarSeaAlliancesHome
                    ? '你带着旧盟与并肩之义回望天南，这会让后面很多“回不回头”的问题，先被人理解成你肯不肯继续认人。'
                    : flags.returnedWithStarSeaReputationPressure
                        ? '你带着海上的名声回去，旧地还没见到你的人，已经先听说了你如今更像什么样的人。'
                        : flags.returnedAfterHidingStarSeaTracks
                            ? '你尽量把海上的痕迹压到最低才回头。此后很多人提到你，都会先说你很会藏，也很少真的把自己放在别人眼前。'
                            : '第四卷出口真正留下的，不只是去往哪一卷，而是你决定以怎样的名声与姿态回望旧地。';
                break;
            case 24:
                text = flags.returnedTiannanForSettlement
                    ? '你这次回来没有再绕路。嘉元城、黄枫谷和旧敌旧账都会记得，是你亲手把该清的那部分清到了明面上。'
                    : flags.returnedTiannanForBonds
                        ? '旧人看见的不是“你终于回来了”，而是你终于肯承认，有些人和承诺不能一直拖到以后。'
                        : flags.returnedTiannanButRemainedHidden || flags.returnedToSeclusion
                            ? '你回过天南，却没有把自己重新交给天南。旧人只来得及看见一道影子，更多话仍被你留在背后。'
                            : '你才踏进天南几步，旧屋、门墙和故人的名字便一个接一个撞了上来，谁都没打算让你安静路过。';
                break;
            case '24_old_debt_and_name':
                text = flags.volumeFiveOldDebtMode === 'settled'
                    ? '旧账摊开时，最先发紧的不是旁人的眼色，而是你自己握着账页的手。'
                    : flags.volumeFiveOldDebtMode === 'compensated'
                        ? '灵石和补偿都摆上去了，可旧门前最重的仍是那句你愿不愿意亲口认下。'
                        : flags.volumeFiveOldDebtMode === 'buried'
                            ? '你把最难开口的那部分又压回去了，纸页合上时，沉默反倒比账更重。'
                            : '旧账翻到最后，真正难看的不是纸上的数，而是你这些年究竟绕开了几次回头。';
                break;
            case '24_bond_destination':
                text = flags.volumeFiveBondTarget === 'nangong'
                    ? '旧人真站到面前后，你才知道“认人”不是想起谁，而是肯不肯把脚步慢下来等一句回话。'
                    : flags.volumeFiveBondTarget === 'mocaihuan'
                        ? '墨府门前那盏灯没有替你补回旧岁月，却逼着你第一次把“太晚了”三个字听完整。'
                        : flags.volumeFiveBondTarget === 'distance'
                            ? '你还是把话压住了。风从人身边过去时没有留痕，可这一回你知道它会一路吹到门前。'
                            : '旧情到了卷末，不会再自己散。你肯不肯认，它都会先站在路中央等你。';
                break;
            case 25:
                text = flags.volumeFiveAscensionAttitude === 'stay'
                    ? '门已打开，你却先把脚收了回来。后面真正要被问的，不是你能不能走，而是你为什么愿意先为一个人停下。'
                    : flags.volumeFiveAscensionAttitude === 'shared'
                        ? '你第一次认真把“并肩”也算进了飞升这件事里。后面很多终局，都会先从这一念读起。'
                        : flags.volumeFiveAscensionAttitude === 'delay'
                            ? '你第一次愿意把自己押后。终局最后到底值不值得，就看这一念后面有没有人真的回头。'
                            : flags.volumeFiveAscensionAttitude === 'alone'
                                ? '你还是最习惯一个人走。后面真正追上来的，也会是这一点。'
                                : '门前最后要认三样东西：你和谁还没断干净，你把多少旧账清到了明面上，以及你这一生到底更像正道、魔道，还是苟修。';
                break;
            case '25_final_branch':
                text = flags.volumeFiveBondTarget === 'nangong'
                    ? '门槛已经在脚边，南宫婉这一笔也跟着站到了门前。你往前迈多快，她就会把这一步照得多亮。'
                    : flags.volumeFiveBondTarget === 'mocaihuan'
                        ? '门前最先响起来的不是天风，而是嘉元城旧灯和那句终究说晚了的话。'
                        : '门槛就在脚边，你若还把话往后拖，这阵风会先替你把那份迟疑吹回耳边。';
                break;
            default:
                text = routeName === '正道'
                    ? '你这一步多少替别人留了余地，后面再有人求到面前时，他们会更自然地把希望压在你身上。'
                    : routeName === '魔路'
                        ? '你这一步先算收益的痕迹很重，后面旧人再看见你时，往往会先闻到那股不肯吃亏的狠意。'
                        : routeName === '苟修'
                            ? '你还是先给自己留了退路，后面很多局里你都会先看哪条路还能抽身。'
                            : `${location} 里发生过的这一步不会只留在原地，后面总会有人拿这里的事重新认你。`;
                break;
        }
        return [beat('旁白', text)];
    }

    STORY_CHAPTERS.forEach((chapter) => {
        const originalBeats = chapter.beats;
        const originalChoices = chapter.choices;

        chapter.beats = function enrichedBeats(state) {
            const baseBeats = typeof originalBeats === 'function' ? originalBeats(state) : originalBeats;
            return [...baseBeats, ...getChapterEchoes(chapter, state)];
        };

        chapter.choices = function normalizedChoices(state) {
            const rawChoices = typeof originalChoices === 'function' ? originalChoices(state) : originalChoices;
            return (rawChoices || []).map((choice, index) => normalizeChoice(choice, `${chapter.id}_choice_${index}`, {
                chapterId: chapter.id,
                sourceType: 'main',
                chapterTitle: chapter.title,
                chapterSummary: chapter.summary,
                volumeId: chapter.volumeId,
            }));
        };
    });

    const StoryData = {
        STORAGE_KEY,
        CONFIG,
        VOLUME_CONTRACT,
        VOLUME_DISPLAY_META,
        REALMS,
        ITEMS,
        ALCHEMY_RECIPES,
        MONSTERS,
        LOCATIONS,
        NPCS,
        POSITIVE_ENCOUNTERS,
        NEGATIVE_ENCOUNTERS,
        CHAPTER_ECHO_PACKS,
        BRANCH_IMPACT_PACKS,
        LOCATION_COMMISSION_BOARD_META,
        LOCATION_COMMISSIONS_V1,
        SIDE_QUESTS_V1,
        VOLUME_ONE_CHAPTERS,
        VOLUME_ONE_LEGACY_CHAPTER_MAP,
        VOLUME_ONE_SIDE_QUEST_SEEDS,
        VOLUME_TWO_CHAPTERS,
        VOLUME_TWO_LEGACY_CHAPTER_MAP,
        VOLUME_THREE_CHAPTERS,
        VOLUME_FOUR_CHAPTERS,
        VOLUME_FOUR_LEGACY_CHAPTER_MAP,
        VOLUME_FIVE_CHAPTERS,
        VOLUME_FIVE_LEGACY_CHAPTER_MAP,
        LEVEL_STORY_EVENTS,
        STORY_CHAPTERS,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StoryData;
    }

    globalScope.StoryData = StoryData;
})(typeof window !== 'undefined' ? window : globalThis);
