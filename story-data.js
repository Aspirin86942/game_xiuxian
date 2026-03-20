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
                if (state.flags.helpedOldFriendAgain) return '你还肯为旧人伸手，这说明你到底没把自己修成一块只会算账的石头。';
                if (state.flags.keptDistanceFromOldFriend) return '你如今和谁都留着半步，我能理解，只是有时候看着也怪不像你。';
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
                if (state.flags.madeAmendsToMocaihuan) return '你这次没有只留一句“以后再说”。我记得的，也不只是你来迟了。';
                if (state.flags.admittedOldWrongToMocaihuan) return '人肯认错不算容易。只是有些日子已经过去，终究回不到原样。';
                if (state.flags.checkedOnMocaihuanThenLeft) return '你来确认我安好，这就够了。剩下的日子，我会自己过。';
                if (state.flags.returnedToMoHouse) return '你总算回来把旧约说完了。这一次，我听见的不是告别。';
                if (state.flags.mendedMoHouseDebt) return '你不是没有做错过，只是到底还是回头把这笔账补上了。';
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
                if (state.flags.openlyAcknowledgedNangongImportance) return '你既然已经承认我重要，往后很多路就不能再只按你一个人的活法去走。';
                if (state.flags.continuedToOweNangongSilently) return '你总说记得，可若一直只记在心里，这笔账和没还也没什么两样。';
                if (state.flags.avoidedNangongAgain) return '你躲得开我，却躲不开自己为什么总在真正重要的时候往后退。';
                if (state.flags.acceptedNangongPath) return '你既肯把路走得不那么冷，我也不会再让你独自扛完后半程。';
                if (state.flags.cutEmotion) return '你嘴上说只认资源不认人，可真到了回头的时候，还是来了。';
                if (state.flags.cooperatedAtXuTian) return '虚天殿那次你没先翻脸，这种事在乱星海比情话更值钱。';
                if (state.flags.rescuedFromXuTianEdge) return '你既然都在殿外回过头，就别再装作自己什么人都不想认。';
                if (state.flags.grabbedTreasure) return '你先伸手夺宝那一下，倒比你平日的推托更诚实。';
                if (state.flags.watchedXuTianFight) return '你总爱等别人先露底。只是虚天殿那次，旁人也把你的冷眼一起记住了。';
                if (state.flags.slippedPastXuTian) return '你绕殿而走那一步很稳，也让人更难看清你心里究竟还留没留别人。';
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
                if (state.flags.answeredLiSummons) return '门墙不只记名分，也记得谁肯在最后回来把话说清。';
                if (state.flags.enteredLihuayuanLineage) return '接了令牌，就别再把自己只当成借屋檐避雨的人。门里会护你，也会记着你该替谁扛事。';
                if (state.flags.usedLihuayuanInfluencePragmatically) return '你很会算借势的分寸，可门墙这种东西，借久了也会反过来看你。';
                if (state.flags.respectedLihuayuanButStayedIndependent) return '给自己留退路没有错，只是退路多了，别人也难把真正的背后交给你。';
                if (state.flags.mineChoice === 'rearGuard') return '灵矿那次你肯回头接人，这才像真正懂了“门里为什么要筑基修士”。';
                if (state.flags.mineChoice === 'hold') return '矿脉死局里你没先跑，这比平日说多少漂亮话都更像门内弟子。';
                if (state.flags.mineChoice === 'betrayGate') return '门墙可以容你借势，容不了你拿同门去换自己的位子。';
                if (state.flags.yanFortObservedQuietly || state.flags.lowProfileBanquet) return '燕家堡那一夜你没急着站队，说明你终于开始看懂局，不只是看懂人。';
                if (state.flags.yanFortNetworkBuilt || state.flags.builtBanquetNetwork) return '酒席上铺线不难，难的是别把自己也铺进别人的账里。';
                if (state.flags.yanFortEstablishedPresence || state.flags.showedStrength) return '燕家堡那次你敢把场面压住，别人以后看你，便不会再只看修为。';
                if (state.flags.learnsSecretively) return '你藏了不少心思，但能走回来，就说明还没把门里全忘。';
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
            title: '炼气初期：吐纳识气',
            summary: '第一口灵气入体，真正意义上的修仙开始了。',
            requirements: { realmScoreAtLeast: 0 },
            beats(state) {
                return [
                    beat('旁白', '你第一次清晰分辨出体内灵气的流向，呼吸也跟着沉下来。'),
                    beat('旁白', state.flags.preparedWell ? '你想起出门前带上的干粮和柴米，心神也稳了几分。' : '没有人提醒你如何稳住气机，只能靠一次次吐纳试出来。'),
                ];
            },
            choices(state) {
                return [
                    { text: '继续稳固根基', effects: { cultivation: 18, routeScores: { orthodox: 1 } } },
                    { text: '趁机多试几次引气诀', effects: { cultivation: 10, routeScores: { secluded: 1 } } },
                ];
            },
            effects: { cultivation: 15 },
        }),
        levelEvent({
            id: 'qi_1',
            realmScore: 1,
            title: '炼气中期：经脉初通',
            summary: '经脉开始顺畅，但心浮气躁也会更容易反噬。',
            requirements: { realmScoreAtLeast: 1 },
            beats(state) {
                return [
                    beat('旁白', '你开始能感觉到经脉中的细小阻滞，那不是疼，而是界限。'),
                    beat('旁白', state.flags.lowProfile ? '你明白低调不是退缩，而是先保住经脉里这点火种。' : '你总想在更短时间里看到结果，反而更需要压住躁意。'),
                ];
            },
            choices() {
                return [
                    { text: '养气半日', effects: { cultivation: 22, routeScores: { secluded: 1 } } },
                    { text: '强行多吐纳一轮', effects: { cultivation: 8, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 12 },
        }),
        levelEvent({
            id: 'qi_2',
            realmScore: 2,
            title: '炼气后期：药火微成',
            summary: '你开始能借外物补内息，但代价和风险也开始出现。',
            requirements: { realmScoreAtLeast: 2 },
            beats(state) {
                return [
                    beat('旁白', '灵草、丹药和你体内的气开始彼此勾连，像是试探，也像是协商。'),
                    beat('旁白', state.flags.startPath === 'disciple' ? '墨大夫教你的不只是功法，还有怎么不让别人看出你在意什么。' : '你越来越清楚，修行最先改变的往往不是力量，而是耐心。'),
                ];
            },
            choices() {
                return [
                    { text: '守住药性，不贪快', effects: { cultivation: 26, routeScores: { orthodox: 1 } } },
                    { text: '借绿瓶试一次催熟', effects: { cultivation: 16, routeScores: { secluded: 1 } } },
                ];
            },
            effects: { cultivation: 18 },
        }),
        levelEvent({
            id: 'ji_3',
            realmScore: 3,
            title: '筑基初期：骨脉重铸',
            summary: '从这里开始，修行不再只是堆修为，而是重塑身体。',
            requirements: { realmScoreAtLeast: 3 },
            beats(state) {
                return [
                    beat('旁白', '筑基之后，你能明显感觉到筋骨比从前沉稳，连打坐都更像在扎根。'),
                    beat('旁白', state.flags.hasGreenBottle ? '你知道那只绿瓶以后会越来越危险，也越来越值钱。' : '你第一次真切意识到，资源不足会比敌人更早把人逼到墙角。'),
                ];
            },
            choices() {
                return [
                    { text: '趁稳重夯实根基', effects: { cultivation: 34, routeScores: { orthodox: 1 } } },
                    { text: '试着提速冲境', effects: { cultivation: 20, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 22 },
        }),
        levelEvent({
            id: 'ji_4',
            realmScore: 4,
            title: '筑基中期：人情入局',
            summary: '你开始发现，修仙界里最难躲开的不是劫，而是关系。',
            requirements: { realmScoreAtLeast: 4 },
            beats(state) {
                return [
                    beat('旁白', '当你能稳住筑基中期的气机时，很多人对你的态度也开始变化。'),
                    beat('旁白', state.npcRelations['厉飞雨'] >= 30 ? '厉飞雨这条线还没断，他的信任会在后面不断回来找你。' : '有些人对你的态度开始模糊，恰恰说明你已不再是可以随便忽略的人。'),
                ];
            },
            choices() {
                return [
                    { text: '先处理好旧人情', effects: { relations: { '厉飞雨': 10 }, routeScores: { orthodox: 1 } } },
                    { text: '把人情先记账', effects: { routeScores: { secluded: 1 } } },
                ];
            },
            effects: { cultivation: 18 },
        }),
        levelEvent({
            id: 'ji_5',
            realmScore: 5,
            title: '筑基后期：瓶颈见锋',
            summary: '瓶颈开始显形，推进的代价也更明确。',
            requirements: { realmScoreAtLeast: 5 },
            beats(state) {
                return [
                    beat('旁白', '你在瓶颈边缘来回试探，像站在门槛上判断该不该抬脚。'),
                    beat('旁白', state.routeScores.demonic > state.routeScores.orthodox ? '你越来越熟悉“先取再说”的习惯。' : '你更常想的是怎样把风险留在自己能承受的范围里。'),
                ];
            },
            choices() {
                return [
                    { text: '压住气机，等下一轮', effects: { cultivation: 28, routeScores: { secluded: 1 } } },
                    { text: '借丹药强推一把', costs: { lingshi: 2 }, effects: { cultivation: 14, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 22 },
        }),
        levelEvent({
            id: 'jin_6',
            realmScore: 6,
            title: '金丹初期：丹成一线',
            summary: '金丹不是结束，而是你能否守住自己的开始。',
            requirements: { realmScoreAtLeast: 6 },
            beats(state) {
                return [
                    beat('旁白', '丹海中有了一点真正成形的东西，你对灵气的掌控也开始变得凌厉。'),
                    beat('旁白', state.flags.savedNangong ? '南宫婉的名字不再只是禁地里的惊鸿一瞥，而会变成一条持续的线。' : '有些旧人你虽然暂时没再见，却仍在关键时刻影响你的判断。'),
                ];
            },
            choices() {
                return [
                    { text: '稳住丹心', effects: { cultivation: 40, routeScores: { orthodox: 1 } } },
                    { text: '借斗法磨丹', effects: { cultivation: 26, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 24 },
        }),
        levelEvent({
            id: 'jin_7',
            realmScore: 7,
            title: '金丹中期：宗门旧账',
            summary: '你开始真正有资格参与宗门里的分量计算。',
            requirements: { realmScoreAtLeast: 7 },
            beats(state) {
                return [
                    beat('旁白', '进入金丹中期后，宗门、盟友、旧债全开始拿你当一个能被算进账本的人。'),
                    beat('旁白', state.flags.liDisciple ? '李化元那一边的态度，开始从“照看”变成“期待”或“约束”。' : '你知道自己还没有完全站稳，所以每次抉择都更像押注。'),
                ];
            },
            choices() {
                return [
                    { text: '先回宗门压局势', effects: { routeScores: { orthodox: 2 } } },
                    { text: '把旧账留给以后', effects: { routeScores: { secluded: 1 } } },
                ];
            },
            effects: { cultivation: 28 },
        }),
        levelEvent({
            id: 'jin_8',
            realmScore: 8,
            title: '金丹后期：禁地余波',
            summary: '血色禁地的后果开始倒灌回你的日常。',
            requirements: { realmScoreAtLeast: 8 },
            beats(state) {
                return [
                    beat('旁白', '你已经能明显感觉到，禁地那次选择并没有结束，它只是换了一个更慢的方式发作。'),
                    beat('旁白', state.flags.daoLvPromise ? '墨彩环的等待、南宫婉的态度、李化元的目光，这三条线开始一起压向你。' : '你知道自己越往后走，旧选择越会变成未来的路标。'),
                ];
            },
            choices() {
                return [
                    { text: '先清理旧债', effects: { cultivation: 30, routeScores: { orthodox: 1 } } },
                    { text: '把余波当资源', effects: { cultivation: 22, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 24 },
        }),
        levelEvent({
            id: 'yu_9',
            realmScore: 9,
            title: '元婴初期：神识初开',
            summary: '当神识真正展开，很多藏起来的东西也会被你看见。',
            requirements: { realmScoreAtLeast: 9 },
            beats(state) {
                return [
                    beat('旁白', '你的神识开始能跨越更远的距离，很多过去看不见的因果也在此时浮现。'),
                    beat('旁白', state.routeScores.secluded >= state.routeScores.orthodox ? '你越来越懂得如何把自己藏进安全范围里。' : '你开始更频繁地把“能不能帮别人”放进思考里。'),
                ];
            },
            choices() {
                return [
                    { text: '谨慎扩展神识', effects: { cultivation: 38, routeScores: { secluded: 1 } } },
                    { text: '直接探查旧地', effects: { cultivation: 26, routeScores: { orthodox: 1 } } },
                ];
            },
            effects: { cultivation: 30 },
        }),
        levelEvent({
            id: 'yu_10',
            realmScore: 10,
            title: '元婴中期：海路与旧人',
            summary: '海上势力让你意识到，旧人和新路会一起逼你表态。',
            requirements: { realmScoreAtLeast: 10 },
            beats(state) {
                return [
                    beat('旁白', '海路、商路、门路在你眼里开始有了差别，很多人也不再只看你是不是能打。'),
                    beat('旁白', state.flags.enteredStarSea ? '乱星海那边的动静，开始透过风声影响你在天南的判断。' : '你还没真正走远，但你已经知道远方的势力迟早会来找你。'),
                ];
            },
            choices() {
                return [
                    { text: '先看海上态势', effects: { routeScores: { secluded: 1 } } },
                    { text: '直接抢商机', effects: { routeScores: { demonic: 1 }, cultivation: 18 } },
                ];
            },
            effects: { cultivation: 26 },
        }),
        levelEvent({
            id: 'yu_11',
            realmScore: 11,
            title: '元婴后期：心魔回响',
            summary: '你越强，心里那些没有解决的东西就越容易回头。',
            requirements: { realmScoreAtLeast: 11 },
            beats(state) {
                return [
                    beat('旁白', '元婴后期的修为让你更接近答案，也更容易听见自己心里的杂音。'),
                    beat('旁白', state.routeScores.demonic > state.routeScores.orthodox ? '你已经习惯把“代价”放到后面算。' : '你开始更在意什么才算值得。'),
                ];
            },
            choices() {
                return [
                    { text: '静坐压心魔', effects: { cultivation: 34, routeScores: { orthodox: 1 } } },
                    { text: '借杀意斩念', effects: { cultivation: 20, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 26 },
        }),
        levelEvent({
            id: 'hs_12',
            realmScore: 12,
            title: '化神初期：一线天光',
            summary: '化神之后，天地间的差距会变得格外清晰。',
            requirements: { realmScoreAtLeast: 12 },
            beats(state) {
                return [
                    beat('旁白', '当你踏进化神初期，很多曾经以为跨不过去的事都变成了可处理的问题。'),
                    beat('旁白', state.flags.acceptedNangongPath ? '南宫婉的那条线，已经不只是情感，而是一种终局选择。' : '你开始意识到自己已经走到离飞升不远的位置。'),
                ];
            },
            choices() {
                return [
                    { text: '稳住天光', effects: { cultivation: 44, routeScores: { orthodox: 1 } } },
                    { text: '借外力冲关', effects: { cultivation: 28, routeScores: { demonic: 1 } } },
                ];
            },
            effects: { cultivation: 32 },
        }),
        levelEvent({
            id: 'hs_13',
            realmScore: 13,
            title: '化神中期：旧人来信',
            summary: '旧人的消息开始变成你必须回应的事。',
            requirements: { realmScoreAtLeast: 13 },
            beats(state) {
                return [
                    beat('旁白', '你不再轻易被境界压住，但信件、传闻和旧人还是能让你停一停。'),
                    beat('旁白', state.npcRelations['墨彩环'] >= 50 ? '墨府那边的牵挂仍在，说明你当初没把所有路都走死。' : '你知道自己有些关系没有彻底处理完。'),
                ];
            },
            choices() {
                return [
                    { text: '回信安人心', effects: { relations: { '墨彩环': 20 }, routeScores: { orthodox: 1 } } },
                    { text: '断信专修行', effects: { routeScores: { secluded: 1 }, cultivation: 16 } },
                ];
            },
            effects: { cultivation: 24 },
        }),
        levelEvent({
            id: 'hs_14',
            realmScore: 14,
            title: '化神后期：飞升前夜',
            summary: '最后一层窗纸已经很薄，飞升、留世、散道都近在眼前。',
            requirements: { realmScoreAtLeast: 14 },
            beats(state) {
                return [
                    beat('旁白', '到了化神后期，你反而越能感觉到自己距离最后选择有多近。'),
                    beat('旁白', state.routeScores.secluded >= state.routeScores.demonic ? '若你此时收手，你更像一个知道如何活下去的人。' : '若你此时再进一步，就意味着你愿意承担更大的因果。'),
                ];
            },
            choices() {
                return [
                    { text: '准备飞升', effects: { routeScores: { orthodox: 1 }, cultivation: 56 } },
                    { text: '继续压境', effects: { routeScores: { secluded: 1 }, cultivation: 30 } },
                ];
            },
            effects: { cultivation: 40 },
        }),
    ];

    LEVEL_STORY_EVENTS.forEach((event) => {
        const originalChoices = event.choices;
        event.choices = function normalizedChoices(state) {
            const rawChoices = typeof originalChoices === 'function' ? originalChoices(state) : originalChoices;
            return rawChoices.map((choice, index) => ({
                ...choice,
                id: choice.id || `${event.id}_choice_${index}`,
                effects: choice.effects || {},
                nextChapterId: choice.nextChapterId ?? null,
            }));
        };
    });

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
            requirements: { storyProgress: 9 },
            beats(state) {
                const lowTrust = (state.npcRelations['墨彩环'] || 0) < 20;
                return [
                    beat('旁白', '墨府地窖深处，你见到了半人半傀的曲魂。'),
                    beat('墨彩环', lowTrust
                        ? '你若还想从墨府带走什么，就先想清楚要不要把最后一点体面也一并拿走。'
                        : state.flags.daoLvPromise
                            ? '若你愿带他走，墨府便少一件旧日噩梦。'
                            : '我怕他，也怕旁人拿他来做文章。'),
                    beat('旁白', lowTrust
                        ? '账册、库银和旧怨都被摊在你面前。此刻你若伸手，拿走的就不只是曲魂。'
                        : '曲魂眼里只剩残存意志，却还认得“守门”两个字。'),
                    beat('旁白', lowTrust
                        ? '你可以强行带走这个半傀，也可以留下一笔代价，勉强把人情续回一截。'
                        : '你可以把他当兵器，也可以把他当一个还没完全碎掉的人。'),
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
                                flags: { hasQuhun: true, tookQuhunByForce: true },
                                routeScores: { demonic: 1 },
                            },
                            nextChapterId: 10,
                        },
                        {
                            id: 'buy_back_trust',
                            text: '留下灵石与善后安排，把这笔债补回一半',
                            costs: { lingshi: 6 },
                            effects: {
                                cultivation: 135,
                                relations: { '墨彩环': 45 },
                                flags: { mendedMoHouseDebt: true },
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
                                flags: { quhunReleased: true, hasQuhun: false, atonedToMoHouse: true },
                                routeScores: { orthodox: 1 },
                            },
                            nextChapterId: 10,
                        },
                    ];
                }

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
            summary: '禁地之后，筑基不再只是破境，而是你第一次决定怎样背着情债继续往前。',
            location: '黄枫谷',
            requirements: { storyProgress: 15, realmScoreAtLeast: 5 },
            beats(state) {
                const savedLine = state.flags.savedNangong
                    ? '南宫婉的传音只留下一句硬话: “主药既已入手，便别死在筑基上。你欠我的，还没还清。”'
                    : '你没有救下她，可禁地里那一眼仍像钩子一样留在识海，让你没法把这次筑基只当成一次资源兑换。';
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
                        nextChapterId: '18_nangong_return',
                    },
                    {
                        id: 'fake_fight',
                        text: '表面参战，暗里只保自己和近身人',
                        effects: {
                            cultivation: 500,
                            routeScores: { secluded: 2 },
                            flags: { warChoice: 'secluded' },
                        },
                        nextChapterId: '18_nangong_return',
                    },
                    {
                        id: 'defect_demonic',
                        text: '借乱投向魔道，以更狠的路换更快的位子',
                        effects: {
                            cultivation: 560,
                            routeScores: { demonic: 3 },
                            flags: { warChoice: 'demonic', demonicPath: true },
                        },
                        nextChapterId: '18_nangong_return',
                    },
                ];
            },
        },
        {
            id: '18_nangong_return',
            chapterLabel: '插章·并肩之后',
            title: '并肩之后',
            summary: '南宫婉这条线不是情绪奖励，而是终于有人看穿你之后，仍知道怎样和你站在一处。',
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
                    beat('旁白', '风里一时安静下来。你忽然意识到，这条线最难处理的地方从来不是说不出口，而是一旦说出口，往后很多路就不能再只按一个人的活法去走。'),
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
            location: '乱星海',
            requirements: { storyProgress: 21 },
            beats(state) {
                const arrivalLine = state.flags.enteredByTrade
                    ? '你是带着商路与货物来到，一上岸就得辨别哪条航道最值钱。'
                    : '你一脚踏上船只，却发现这里没有旧名头给你撑腰，只有你在航线里证明自己。';
                return [
                    beat('旁白', '乱星海群岛错落，散修、海盗、宗门与商会全混在一起。'),
                    beat('旁白', '海面没有城墙的秩序，所有人都靠资源、契约与速度来维持自己的地位。'),
                    beat('旁白', arrivalLine),
                    beat('旁白', '有人猎妖、有人成交、有人闭关，但他们更在意你今天交得出多少账。'),
                    beat('旁白', '猎妖是赌命的快活，跑商是抓住流动的钱，闭关则是把自己藏进孤立里。'),
                    beat('旁白', '你第一次意识到，换地图不只是换风景，而是换了活法。'),
                    beat('旁白', '别人不会再帮你记“你从哪来”，他们只问两件事: 你守约不守约，你翻脸快不快。'),
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
                        nextChapterId: 22,
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
                        nextChapterId: 22,
                    },
                    {
                        id: 'seek_cave',
                        text: '先找洞府闭关，把自己藏好',
                        effects: {
                            cultivation: 790,
                            routeScores: { secluded: 1 },
                            flags: { starSeaStyle: 'secluded', starSeaSecludedStart: true },
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
            location: '乱星海外海',
            requirements: { storyProgress: 22, realmScoreAtLeast: 8 },
            beats(state) {
                const infoLine = state.flags.starSeaStyle === 'merchant'
                    ? '你先从商路听见一些碎消息: 某家商会忽然高价收破阵材料，几名来历各异的修士死前都带着同一种极隐晦的禁制痕。'
                    : '你从猎妖和探岛里摸出一些碎线索: 异常灵潮、错位坐标、死者身上的古怪禁制，像被人故意拆散后扔进海里的拼图。';
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
                        nextChapterId: 23,
                    },
                    {
                        id: 'sell_map',
                        text: '卖图兑现，把危险和价码一起转手给别人',
                        effects: {
                            cultivation: 920,
                            items: { lingshi: 40 },
                            routeScores: { demonic: 1, secluded: 1 },
                            flags: { soldXuTianTu: true, hasXuTianTu: false, soldFragmentMapForResources: true },
                        },
                        nextChapterId: 23,
                    },
                    {
                        id: 'avoid_map',
                        text: '主动避局，只留最少信息后立刻抽身',
                        effects: {
                            cultivation: 960,
                            routeScores: { secluded: 2 },
                            flags: { avoidedXuTian: true, avoidedVoidHeavenCoreConflict: true },
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
                const crowdLine = state.flags.hasXuTianTu
                    ? '残图在你怀里发烫，所有盯着你的人都像是来拿命换图。你明知这扇门不是为善恶而开，却还是被推到了最前排。'
                    : state.flags.soldXuTianTu
                        ? '你卖掉的是图纸，没人能保证虚天殿的人不会再来找你要第二份。卖掉纸片不等于卖掉风暴。'
                        : '你原想避开虚天殿，可海上大势还是把你推到了门前。知道这扇门存在以后，很多人都再也装不回路过的样子。';
                const reputationLine = state.flags.cooperatedAtXuTian || state.flags.openlyAcknowledgedNangongImportance
                    ? '同行之人已经开始默认，你到了最窄的路上，多半还是会先看人能不能一起活着出去。'
                    : state.flags.mineChoice === 'betrayGate' || state.flags.mineChoice === 'harvest' || state.flags.grabbedTreasure
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
                        nextChapterId: '23_mocaihuan_return',
                    },
                    {
                        id: 'watch_last',
                        text: '继续隔岸看局，把别人的死战当成你的风向',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_mocaihuan_return',
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
                        nextChapterId: '23_mocaihuan_return',
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
                        nextChapterId: '23_mocaihuan_return',
                    },
                    {
                        id: 'watch_last',
                        text: '坐山观虎斗，等最狠的人先死',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_mocaihuan_return',
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
                        nextChapterId: '23_mocaihuan_return',
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
                        nextChapterId: '23_mocaihuan_return',
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
                        nextChapterId: '23_mocaihuan_return',
                    },
                    {
                        id: 'watch_last',
                        text: '坐山观虎斗，等最狠的人先死',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { watchedXuTianFight: true, starSeaWaitedForBestMoment: true },
                        },
                        nextChapterId: '23_mocaihuan_return',
                    },
                ];
            },
        },
        {
            id: '23_mocaihuan_return',
            chapterLabel: '插章·来信与重访',
            title: '来信与重访',
            summary: '墨彩环这一章不是等你给答案，而是让你看见凡人世界在你没回来时，究竟怎样自己熬了过去。',
            location: '嘉元城',
            requirements: { storyProgress: '23_mocaihuan_return' },
            beats(state) {
                const debtLine = state.flags.daoLvPromise || state.flags.mendedMoHouseDebt
                    ? '那封信没有一句“你为何不回”，却句句都在写你不在的时候，药行换了东主，旧仆散了几人，日子是怎样一点点自己熬过去的。'
                    : '信纸普通，字也算不上好看，只是写得很稳。越是平静，你越看得出那几年里真正替你承担后果的人，从来不是你自己。';
                return [
                    beat('旁白', '修士常以为“以后再补”是一种宽容，可对凡人来说，很多事没有以后，只有你没回来时，他们是怎么自己熬过去的。'),
                    beat('旁白', debtLine),
                    beat('旁白', '你后来重返嘉元城时，墨彩环已经不再是站在旧宅里等答案的人。她有自己的日子、自己的判断，也有了不再把你当成唯一答案的疏离。'),
                    beat('墨彩环', '我后来才明白，等一个修仙的人，其实和等一场雨差不多。你不知道它什么时候来，也不知道来了之后，究竟是解渴，还是把屋子冲塌。'),
                    beat('旁白', '这话并不尖刻，却比责怪更重。因为你终于看见，那些你以为能以后再补的旧账，在别人身上其实早就已经按年过完了。'),
                    beat('旁白', '她没有拦你，也没有再往前靠一步。你只能决定，自己是把这层因果接回手里，还是只确认她安好后再次离开。'),
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
                        nextChapterId: 24,
                    },
                    {
                        id: 'admit_old_wrong',
                        text: '坦白旧错，但不再越界介入她如今的日子',
                        effects: {
                            cultivation: 1250,
                            relations: { '墨彩环': 10 },
                            flags: { admittedOldWrongToMocaihuan: true },
                        },
                        nextChapterId: 24,
                    },
                    {
                        id: 'confirm_mocaihuan_safe',
                        text: '只确认她安好，随即离开，把人情停在这里',
                        effects: {
                            cultivation: 1240,
                            routeScores: { secluded: 1 },
                            flags: { checkedOnMocaihuanThenLeft: true },
                        },
                        nextChapterId: 24,
                    },
                ];
            },
        },
        {
            id: 24,
            title: '重返天南',
            summary: '你回到天南时才发现，真正涌上来的不是怀旧，而是那些还没认完的人、账与名字。',
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
                    ? '虚天这条线已经在你脚下形成了影子，无论你接不接，别人都会根据它来判断你。'
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
                const settlementFlags = { returnedTiannanForSettlement: true, oldDebtsCleared: true, settledScores: true };
                const settlementRelations = {};
                const bondsFlags = { returnedTiannanForBonds: true };
                const bondsRelations = {};

                if (moBond) {
                    settlementFlags.returnedToMoHouse = true;
                    settlementRelations['墨彩环'] = 10;
                    bondsFlags.returnedToMoHouse = true;
                    bondsRelations['墨彩环'] = 12;
                }

                if (liBond) {
                    settlementFlags.answeredLiSummons = true;
                    settlementRelations['李化元'] = 10;
                    bondsFlags.answeredLiSummons = true;
                    bondsRelations['李化元'] = 12;
                }

                if (nangongBond) {
                    bondsFlags.acceptedNangongPath = true;
                    bondsRelations['南宫婉'] = 18;
                }

                const settlementText = moBond
                    ? '清算旧账: 从嘉元城与旧宗门开始，把拖太久的承诺、怨与债一次理完'
                    : liBond
                        ? '清算旧账: 先把门墙旧案和一路压着的刀都抽出来'
                        : '清算旧账: 不再拖延，把旧仇、旧案与欠债一次理清';
                const bondsText = nangongBond
                    ? '接住旧情: 不再把南宫婉那条线继续拖成沉默'
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
                        nextChapterId: 25,
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
                        nextChapterId: 25,
                    },
                    {
                        id: 'returned_tiannan_but_remained_hidden',
                        text: '藏锋离场: 只处理必须处理的部分，不再背旧名，也不再重入旧局',
                        effects: {
                            cultivation: 1750,
                            routeScores: { secluded: 2 },
                            flags: { returnedTiannanButRemainedHidden: true, returnedToSeclusion: true },
                        },
                        nextChapterId: 25,
                    },
                ];
            },
        },
        {
            id: 25,
            title: '化神飞升',
            summary: '飞升前最后要认的，不是自己够不够强，而是这一生的关系、旧账与路数你究竟肯不肯承认。',
            location: '大晋',
            requirements: { storyProgress: 25, realmScoreAtLeast: 12 },
            beats(state) {
                const causalLine = state.flags.returnedTiannanForSettlement || state.flags.oldDebtsCleared || state.flags.settledScores
                    ? '你已回头清过一轮旧账，所以此刻站在门前，最重的并不是悔，而是你准备把怎样的自己继续带上去。'
                    : '你还记得那些被你拖进“以后再说”的人和事。门越近，这些没清完的旧账反而越像细线一样缠回神魂。';
                const relationLine = (state.flags.acceptedNangongPath || state.flags.acceptedNangongDebt || state.flags.returnedTiannanForBonds)
                    ? '墨彩环、李化元、南宫婉，甚至那些只在某一夜与你同路过的人，都不再只是支线对象，而是一路见过你底色的见证者。'
                    : '你回看一路同行的人时才发现，真正难丢的不是法宝和名声，而是那些你曾欠过、避过、也辜负过的目光。';
                const routeLine = state.routeScores.demonic >= state.routeScores.orthodox && state.routeScores.demonic >= state.routeScores.secluded
                    ? '正道、魔路、苟修从来不是旁人贴给你的标签，而是你每次为了更快更稳，究竟肯牺牲到哪一步的答案。'
                    : state.routeScores.secluded >= state.routeScores.orthodox
                        ? '你一路都在给自己留退路，如今站到门前，才知道“留后手”也终究会变成一种必须承认的活法。'
                        : '你并没有把所有人都算成代价，这让你走到最后时，仍能分得清强大与麻木到底差在哪里。';
                const legacyLine = state.flags.mineChoice === 'hold' || state.flags.mineChoice === 'rearGuard'
                    ? '灵矿那次有人因为你活着走了出来，所以你如今再谈大道，终究没法把“别人把命押在你身上”这件事从道心里剥开。'
                    : state.flags.mineChoice === 'betrayGate' || state.flags.mineChoice === 'harvest' || state.flags.mineChoice === 'soloEscape'
                        ? '灵矿那次你是怎么取舍的，连你自己都没法装作已经忘了。飞升门前，最先浮上来的往往不是功法，而是当年那些没被你一起带走的人。'
                        : '你回看灵矿和旧战场时才明白，很多人后来怎么看你，不是看你修到了什么，而是看你最先保住了什么。';
                const seaLine = state.flags.starSeaStyle === 'hunter'
                    ? '星海让你习惯拿命换快刀和名声，可真到了门前，名声最重的部分反而不是你杀了多少海妖，而是你在虚天殿那类局里有没有先对人下手。'
                    : state.flags.starSeaStyle === 'merchant'
                        ? '星海让你学会先看契约、消息和价码。如今站到门前，你才知道有些东西能算清，有些却一旦拿去换过，就会一直留在心里。'
                        : state.flags.starSeaStyle === 'secluded'
                            ? '星海让你把“先活下来”磨成了本能。直到飞升门前，你才第一次认真问自己: 活到这里之后，究竟要不要为谁停一停。'
                            : '乱星海那些年不只是换地图，也是在逼你选一种更像自己的活法。那种活法一路带着你走到了门前。';
                return [
                    beat('旁白', '飞升从来不是一道光。真正站到门前的人都知道，那更像是把这一生的路、债、名与人重新看一遍。'),
                    beat('旁白', '化神之后，风里灵机的流向、山河暗处的脉络、人与人之间藏着的因果，都比你少年时所见清楚了太多。'),
                    beat('旁白', '飞升前夜，你把青牛镇旧物、墨府旧名单和零散传信摊在案上。它们毫无灵气，却比任何重宝都更像来路。'),
                    beat('旁白', '你这才承认，最初修仙不是为了某句漂亮的大道之言，而是为了不再眼看凡人的命被慢慢磨掉，自己却什么都做不了。'),
                    beat('旁白', relationLine),
                    beat('旁白', legacyLine),
                    beat('旁白', seaLine),
                    beat('旁白', routeLine),
                    beat('旁白', causalLine),
                ];
            },
            choices(state) {
                const routes = state.routeScores || {};
                const flags = state.flags || {};
                const orthodox = routes.orthodox || 0;
                const demonic = routes.demonic || 0;
                const secluded = routes.secluded || 0;
                const relationNangong = state.npcRelations['南宫婉'] || 0;
                const relationMo = state.npcRelations['墨彩环'] || 0;
                const relationLi = state.npcRelations['李化元'] || 0;
                const orthodoxLead = orthodox >= demonic && orthodox >= secluded;
                const secludedLead = secluded > orthodox && secluded >= demonic;
                const demonicLead = demonic > orthodox && demonic >= secluded;
                const relationshipBonus = (flags.openlyAcknowledgedNangongImportance ? 24 : 0)
                    + (flags.continuedToOweNangongSilently ? 10 : 0)
                    + (flags.madeAmendsToMocaihuan ? 20 : 0)
                    + (flags.admittedOldWrongToMocaihuan ? 10 : 0)
                    + (flags.enteredLihuayuanLineage ? 10 : 0)
                    + (flags.respectedLihuayuanButStayedIndependent ? 6 : 0);
                const relationshipScore = Math.max(relationNangong, 0) + Math.max(relationMo, 0) + Math.max(relationLi, 0) + relationshipBonus;
                const highBonds = relationshipScore >= 150 || (relationNangong >= 90 && (relationMo >= 45 || relationLi >= 45));
                const debtsCleared = Boolean(
                    flags.oldDebtsCleared
                    || flags.returnedTiannanForSettlement
                    || flags.settledScores
                    || flags.mendedMoHouseDebt
                    || (flags.returnedToMoHouse && flags.answeredLiSummons)
                );
                const bondRecovered = Boolean(
                    flags.acceptedNangongDebt
                    || flags.acceptedNangongPath
                    || flags.returnedTiannanForBonds
                    || flags.returnedToMoHouse
                    || flags.answeredLiSummons
                    || flags.openlyAcknowledgedNangongImportance
                    || flags.continuedToOweNangongSilently
                    || flags.madeAmendsToMocaihuan
                    || flags.admittedOldWrongToMocaihuan
                );
                const hiddenPath = Boolean(
                    flags.returnedTiannanButRemainedHidden
                    || flags.returnedToSeclusion
                    || flags.avoidedXuTian
                    || flags.starSeaSeclusion
                    || flags.slippedPastXuTian
                );
                const coldDecision = Boolean(
                    flags.cutNangongTies
                    || flags.cutEmotion
                    || flags.avoidedNangongAgain
                    || flags.tookQuhunByForce
                    || flags.demonicPathSeed
                    || flags.usedLihuayuanInfluencePragmatically
                    || flags.warChoice === 'demonic'
                    || flags.mineChoice === 'betrayGate'
                    || flags.mineChoice === 'harvest'
                );
                const coldHeart = coldDecision || flags.suppressedNangongFeelings;
                const severeDebt = !debtsCleared && (coldDecision || demonicLead || relationNangong < 0 || relationMo < 0);
                const choices = [];

                if ((orthodoxLead || flags.savedNangong || flags.acceptedNangongPath || flags.returnedTiannanForBonds)
                    && !severeDebt
                    && (debtsCleared || flags.successfulFoundationEstablished || highBonds)) {
                    choices.push({
                        id: 'lingjie_xianzun',
                        text: relationNangong >= 110 && bondRecovered ? '推开更高的门，把这一生认下的人与路一起背去灵界' : '顺着这口尚未散掉的道心继续上行',
                        effects: {
                            cultivation: 5200,
                            routeScores: { orthodox: 1 },
                            flags: {
                                ascendedToSpiritWorld: true,
                                ascendedWithNangong: relationNangong >= 110 && flags.acceptedNangongPath,
                            },
                        },
                        ending: {
                            id: 'lingjie_xianzun',
                            title: '灵界仙尊',
                            description: relationNangong >= 110 && flags.acceptedNangongPath
                                ? '你最终还是走向了更高处。血色禁地埋下的那条线没有被你丢在人界身后，而是与道心一起被你背过了界壁。旁人先记得你的通玄道法，只有你自己知道，那个怕穷、怕弱、怕无力的凡人少年始终没有真正离开。'
                                : '你最终走向了更高的门。不是因为这一生足够干净，而是因为你肯承认那些擦不掉的旧字仍写在自己身上，并带着它们继续往上走。灵界迎来的不是神话，而是一个终于敢完整认下自身来路的修士。',
                        },
                        nextChapterId: -1,
                    });
                }

                if ((demonicLead || flags.returnedTiannanForSettlement || flags.settledScores)
                    && (debtsCleared || demonic >= orthodox)) {
                    choices.push({
                        id: 'renjie_zhizun',
                        text: demonicLead ? '留在人界，做最后那个没人敢越过去的人' : '不急着飞升，先把这片旧天地整理到不再轻易碾碎后来者',
                        effects: {
                            cultivation: 3800,
                            routeScores: { demonic: 1 },
                            flags: { stayedInMortalWorld: true },
                        },
                        ending: {
                            id: 'renjie_zhizun',
                            title: '人界至尊',
                            description: debtsCleared
                                ? '你最终没有立刻飞升。不是不能，而是不愿。旧账既然已被你亲手理到最后，便索性再留下来，把这个你曾吃尽苦头的人界整理成一个不至于让后来者一上来就被碾碎的样子。'
                                : '你最终没有离开，而是把自己化作人界最高的一座山。有人敬你，有人惧你，但所有人都承认，那片天地最后得看你的脸色与决断。',
                        },
                        nextChapterId: -1,
                    });
                }

                if (secludedLead || hiddenPath) {
                    choices.push({
                        id: 'xiaoyao_sanxian',
                        text: secludedLead ? '散去名号，只把风雨、药香与退路留在自己身边' : '不再给任何势力留下握住你的钥匙',
                        effects: {
                            cultivation: 3600,
                            routeScores: { secluded: 1 },
                            flags: { becameLooseImmortal: true },
                        },
                        ending: {
                            id: 'xiaoyao_sanxian',
                            title: '逍遥散仙',
                            description: '你最终选了离开，却不是为了飞升。山海之间自有去处，宗门、名望与争夺都被你慢慢放下。别人偶尔在偏僻坊市或荒海孤岛见到你，只当那是个看透很多事后，终于肯替自己活一次的人。',
                        },
                        nextChapterId: -1,
                    });
                }

                if ((flags.cutNangongTies || flags.suppressedNangongFeelings || flags.cutEmotion)
                    && coldDecision
                    && (demonicLead || secludedLead || hiddenPath)) {
                    choices.push({
                        id: 'taishang_wangqing',
                        text: '斩断最后那点迟疑，带着最冷的道心继续往上走',
                        effects: {
                            cultivation: 5000,
                            routeScores: { demonic: 1, secluded: 1 },
                            flags: { ascendedToSpiritWorld: true, severedMortalBonds: true },
                        },
                        ending: {
                            id: 'taishang_wangqing',
                            title: '太上忘情',
                            description: '你也走上了更高的路，而且比任何人都更干净利落。该舍的舍了，该断的断了，连最难斩的那一点迟疑也被你亲手磨平。很多年后旁人只会记得你的强与稳，很少有人知道你在最后一夜究竟差点想留下什么。',
                        },
                        nextChapterId: -1,
                    });
                }

                if (severeDebt) {
                    choices.push({
                        id: 'yinguo_chanshen',
                        text: '硬闯门前，看看那些被拖欠太久的因果会不会在此刻一起回来',
                        effects: {
                            cultivation: 3300,
                            routeScores: { demonic: 1 },
                            flags: { ascensionBlockedByKarma: true },
                        },
                        ending: {
                            id: 'yinguo_chanshen',
                            title: '因果缠身',
                            description: '你最终还是走到了门前，可门并没有真正为你打开。不是天道专门审你，而是那些被你推迟到“以后再说”的人、债与旧事，在这一刻全都浮回神魂之外。你没有立刻陨落，却终于明白修仙从不是拖得够久就能把一切拖过去。',
                        },
                        nextChapterId: -1,
                    });
                }

                if (highBonds && debtsCleared && !flags.cutNangongTies && !severeDebt) {
                    choices.push({
                        id: 'fanxin_weisi',
                        text: '门已打开，但先承认自己还有想留下的人与事',
                        effects: {
                            cultivation: 3400,
                            routeScores: { orthodox: 1 },
                            flags: { postponedAscension: true, stayedInMortalWorld: true },
                        },
                        ending: {
                            id: 'fanxin_weisi',
                            title: '凡心未死',
                            description: '门开了，你也知道自己只要再往前一步，许多牵扯都会被甩在人界身后。可你最终没有立刻踏出去。不是因为软弱，而是因为你一路走到这里，仍没有彻底忘记自己最早为何要修仙。所以你转身，决定再留一阵，把真正放不下的人与事先安顿好。',
                        },
                        nextChapterId: -1,
                    });
                }

                if (choices.length > 0) {
                    return choices;
                }

                return [
                    orthodoxLead
                        ? {
                            id: 'lingjie_xianzun',
                            text: '继续往上，把这一生完整带过门去',
                            effects: {
                                cultivation: 5200,
                                routeScores: { orthodox: 1 },
                                flags: { ascendedToSpiritWorld: true },
                            },
                            ending: {
                                id: 'lingjie_xianzun',
                                title: '灵界仙尊',
                                description: '你最终还是走向了更高处。门前没有谁替你洗白过去，你只是第一次肯完整认下自己的来路，并带着它继续往上走。',
                            },
                            nextChapterId: -1,
                        }
                        : secludedLead
                            ? {
                                id: 'xiaoyao_sanxian',
                                text: '散去名号，把路留给自己',
                                effects: {
                                    cultivation: 3600,
                                    routeScores: { secluded: 1 },
                                    flags: { becameLooseImmortal: true },
                                },
                                ending: {
                                    id: 'xiaoyao_sanxian',
                                    title: '逍遥散仙',
                                    description: '你没有继续把“更高”当成唯一答案，而是终于替自己选了一种还愿意过下去的活法。',
                                },
                                nextChapterId: -1,
                            }
                            : {
                                id: 'renjie_zhizun',
                                text: '先留下，把旧世界真正压稳',
                                effects: {
                                    cultivation: 3800,
                                    routeScores: { demonic: 1 },
                                    flags: { stayedInMortalWorld: true },
                                },
                                ending: {
                                    id: 'renjie_zhizun',
                                    title: '人界至尊',
                                    description: '你没有离开，而是决定先把人界的秩序攥在自己手里。有人敬你，有人惧你，但所有人都得承认最后是你在发话。',
                                },
                                nextChapterId: -1,
                            },
                ];
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
        const echoes = [
            beat('旁白', routeName === '正道'
                ? '你这一步又替别人留了余地，后面再有人求到面前时，他们会更自然地把希望压在你身上。'
                : routeName === '魔路'
                    ? '你这一步先算收益的痕迹很重，后面旧人再看见你时，往往会先闻到那股不肯吃亏的狠意。'
                    : routeName === '苟修'
                        ? '你还是先给自己留了退路，后面很多局里你都会先看哪条路还能抽身。'
                        : `${location} 这一段经历还没有定性，后面的章节会继续逼你表态。`),
        ];

        switch (chapter.id) {
            case 2:
                echoes.push(beat('旁白', flags.startPath === 'disciple'
                    ? '墨大夫这条线从这里开始不再只是师徒，而是逐步变成会反噬你的旧因果。'
                    : '你对墨大夫的态度会一直影响神手谷后面的文本和关系走向。'));
                break;
            case 3:
                echoes.push(beat('旁白', relations['厉飞雨'] >= 30
                    ? '厉飞雨会继续成为你在七玄门时期最直接的人情回声。'
                    : '你和厉飞雨之间留下的分寸，会在后面章节里不断被重新提起。'));
                break;
            case 6:
                echoes.push(beat('旁白', flags.defeatedMo
                    ? '墨居仁一死，墨府线和药渣线会开始分叉并持续回流。'
                    : '这场摊牌的后果不会立刻结束，后续章节会反复提起它。'));
                break;
            case 8:
                echoes.push(beat('旁白', relations['墨彩环'] >= 50
                    ? '墨彩环会把你看成可以托付旧事的人，这会在中后期继续回响。'
                    : '墨府的旧事没有散掉，只是暂时藏进你们的说话方式里。'));
                break;
            case 9:
                echoes.push(beat('旁白', flags.tookQuhunByForce
                    ? '你是带着一层旧债把曲魂拖离墨府的，这会让凡俗线一直留着刺。'
                    : flags.mendedMoHouseDebt
                        ? '你补回的那笔账，会让墨府线在后面留下重新转暖的余地。'
                        : flags.hasQuhun
                            ? '曲魂会作为随从线继续出现，凡俗旧宅也会因此多一层阴影。'
                            : '曲魂线的处理方式，会在后面影响你对“救人”和“用人”的理解。'));
                break;
            case 12:
                echoes.push(beat('旁白', flags.hasGreenBottle
                    ? '绿瓶的催熟能力从这里起不只是资源，而是你一路选择的放大器。'
                    : '百药园的低调与激进，会直接决定你后面缺不缺材料。'));
                break;
            case 14:
                echoes.push(beat('旁白', relations['南宫婉'] >= 50
                    ? '南宫婉线会在禁地后继续延伸，直到后面的天南与飞升节点。'
                    : '血色禁地这次选择，会持续影响你之后对盟友和机会的态度。'));
                break;
            case 15:
                echoes.push(beat('旁白', flags.acceptedNangongDebt
                    ? '你已经把南宫婉那条线认成了情债，后面再见她时，很多话都不会再只是试探。'
                    : flags.suppressedNangongFeelings
                        ? '你把心绪压进了更深处，可每次再见南宫婉，都得多用一分力气装作什么都没发生。'
                        : flags.cutNangongTies || flags.cutEmotion
                            ? '你嘴上说已把这层牵连斩断，可禁地那一夜留下的记忆，并不会因为一句“只认资源”就自己消失。'
                            : '筑基成了，但这一章留下的情债处理方式，会一直追到终局前夜。'));
                break;
            case 16:
                echoes.push(beat('旁白', flags.enteredLihuayuanLineage
                    ? '令牌一接，师门给你的就不只是庇护，也是“什么时候该替谁负责”的分量。'
                    : flags.respectedLihuayuanButStayedIndependent
                        ? '你听懂了李化元说的秩序与索取，却仍给自己留了半步退路。后面很多人也会因此只肯信你半步。'
                        : flags.usedLihuayuanInfluencePragmatically || flags.learnsSecretively
                            ? '你借了门墙的势，却没把自己全交进去。李化元往后看你时，认可和提防会一起留下。'
                            : '李化元这一章真正留下的，不是名分高低，而是你开始知道师门会向弟子索取什么。'));
                break;
            case 17:
                echoes.push(beat('旁白', flags.yanFortObservedQuietly || flags.lowProfileBanquet
                    ? '燕家堡那一夜你没急着替任何人站队。后来再遇到笑里藏刀的场面，别人会先记得你很难被拖进别人的节奏。'
                    : flags.yanFortEstablishedPresence || flags.showedStrength
                        ? '燕家堡灯火最盛那一刻，你当面把场子压住了。此后很多人提到你，不会再只说“此子能打”，还会说你敢在桌上亮牌。'
                        : flags.yanFortNetworkBuilt || flags.builtBanquetNetwork
                            ? '燕家堡这一夜你没有赢下场面，却铺下了线。后面再有旧局与新局缠到一处时，这些人脉会比一时名声更像暗手。'
                            : '燕家堡留下来的，不是宴席本身，而是你第一次被人按势力棋盘来放位置。'));
                break;
            case '16_feiyu_return':
                echoes.push(beat('旁白', flags.helpedOldFriendAgain
                    ? '厉飞雨没有给你大道理，只让你重新听见还有人先关心你是不是活着，而不是值不值得结交。'
                    : flags.keptDistanceFromOldFriend
                        ? '你把旧友情也停在半步之外，这会让后面很多“凡心未死”的回响更显得珍贵。'
                        : '这场旧友重逢留下的不是战力，而是一句总会回来敲你的问话: 你还记不记得自己为什么出发。'));
                break;
            case 18:
                echoes.push(beat('旁白', flags.warChoice === 'demonic'
                    ? '魔路从这里真正开始有连续后果，后面几章会不断回看这次站位。'
                    : flags.warChoice === 'secluded'
                        ? '苟修线在大战里立住了，后面会更强调退路和生存。'
                        : '正道线在大战里站住了，后面会继续考验你愿不愿意替别人扛事。'));
                break;
            case '18_nangong_return':
                echoes.push(beat('旁白', flags.openlyAcknowledgedNangongImportance
                    ? '你终于不再把南宫婉那条线只往外推。后面再谈旧情与终局时，这会被算成你肯认人的一次。'
                    : flags.continuedToOweNangongSilently
                        ? '你承认亏欠，却还是把话压回心里。往后每次再见她，这层沉默都会比旁人更重。'
                        : flags.avoidedNangongAgain
                            ? '你又一次把真正重要的话转开了。后面若再选最冷的路，这会成为很难洗掉的一笔。'
                            : '并肩之后留下的不是暧昧，而是有人真的看穿你之后，你还愿不愿承认。'));
                break;
            case 19:
                echoes.push(beat('旁白', flags.mineChoice === 'hold'
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
                        : '你带队突围活着出来之后，旁人会更自然地把“跟着你也许能活”这件事当真。'));
                break;
            case 20:
                echoes.push(beat('旁白', flags.enteredStarSea
                    ? '进入乱星海之后，你的旧路并没有断，只是换了一种海上的说法。'
                    : '不管有没有立刻入海，天南和乱星海都会继续互相回响。'));
                break;
            case 21:
                echoes.push(beat('旁白', flags.starSeaStyle === 'hunter' || flags.starSeaHunterStart
                    ? '你在星海先学会的是拿命开路。后来别人看你，不会只看来自哪里，还会看你敢不敢在最险的海路上先动。'
                    : flags.starSeaStyle === 'merchant' || flags.starSeaTraderStart
                        ? '你在星海先学会的是算契约、货路和消息。等虚天与旧账一起压过来时，这种先算清的习惯会处处露出来。'
                        : flags.starSeaStyle === 'secluded' || flags.starSeaSecludedStart
                            ? '你在星海先学会的是把自己藏稳。这条活法会一路影响你后面看待机缘、旧人和终局的方式。'
                            : '初入星海真正留下的，不是风景，而是你被迫换了一套新的生存逻辑。'));
                break;
            case 22:
                echoes.push(beat('旁白', flags.enteredVoidHeavenMapGame || flags.hasXuTianTu
                    ? '残图在手之后，别人要杀你的理由已经不需要完整证据。只要怀疑你知道得比他们多，就够把你拖进更大的局。'
                    : flags.soldFragmentMapForResources || flags.soldXuTianTu
                        ? '你卖出去的不只是纸片，也是别人通往那扇门的资格。换到手的是资源，留在心里的却是“危险只是换了个主人”。'
                        : flags.avoidedVoidHeavenCoreConflict || flags.avoidedXuTian
                            ? '你真正避开的不是宝，而是知道这扇门存在以后，还要装作与己无关的代价。'
                            : '虚天残图这章留下的，不是普通机缘，而是“知道”本身会不会把你拖下水。'));
                break;
            case '23_mocaihuan_return':
                echoes.push(beat('旁白', flags.madeAmendsToMocaihuan
                    ? '墨彩环这一笔不再只是“以后再补”。你这次是真的把旧账接回手里了，所以终局前看向嘉元城时，心里会少一层空白。'
                    : flags.admittedOldWrongToMocaihuan
                        ? '你承认了旧错，却也看清有些日子已经回不到原样。这会让后面的“旧账是否算清”不再只有黑白两面。'
                        : flags.checkedOnMocaihuanThenLeft
                            ? '你确认她安好后又离开了。往后若再说自己没有辜负凡俗旧人，这一步会先跳出来拦你。'
                            : '这封来信真正留下的，不是重逢本身，而是你终于看见有人替你扛过的那些年。'));
                break;
            case 23:
                echoes.push(beat('旁白', flags.grabbedTreasure || flags.starSeaSeizedTreasureFirst
                    ? '虚天殿前你先伸手去夺宝，这个动作会让很多后来者直接把你归进“关键时刻会先拿”的那类人。'
                    : flags.cooperatedAtXuTian || flags.rescuedFromXuTianEdge || flags.starSeaHeldAllianceTogether
                        ? '你在最窄的退路上先稳住了人，这会让虚天旧盟和南宫婉那条线在后面都更有分量。'
                        : flags.watchedXuTianFight || flags.secondHandBroker || flags.slippedPastXuTian || flags.starSeaWaitedForBestMoment
                            ? '你在虚天局里没有先把自己摆到明面，可活下来的人也因此更难彻底信你。因为他们都记得，你最会等别人先露底。'
                            : '虚天殿真正留下的，不是宝物本身，而是最窄那一步里你到底更像哪一类人。'));
                break;
            case 24:
                echoes.push(beat('旁白', flags.returnedTiannanForSettlement
                    ? '你这次回来没有再绕路。嘉元城、黄枫谷和旧敌旧账都会记得，是你亲手把该清的那部分清到了明面上。'
                    : flags.returnedTiannanForBonds
                        ? '旧人看见的不是“你终于回来了”，而是你终于肯承认，有些人和承诺不能一直拖到以后。'
                        : flags.returnedTiannanButRemainedHidden || flags.returnedToSeclusion
                            ? '你回过天南，却没有把自己重新交给天南。旧人只来得及看见一道影子，更多话仍被你留在背后。'
                            : '回到天南之后，嘉元城的旧屋、黄枫谷的门墙和禁地里的名字，都会轮番来认你。'));
                break;
            case 25:
                echoes.push(beat('旁白', '门前最后认三样东西: 你和谁还没断干净，你把多少旧账清到了明面上，以及你这一生到底更像正道、魔路，还是苟修。'));
                break;
            default:
                echoes.push(beat('旁白', `${location} 里发生过的这一步不会只留在原地，后面总会有人拿这里的事重新认你。`));
                break;
        }

        return echoes;
    }

    STORY_CHAPTERS.forEach((chapter) => {
        const originalBeats = chapter.beats;
        chapter.beats = function enrichedBeats(state) {
            const baseBeats = typeof originalBeats === 'function' ? originalBeats(state) : originalBeats;
            return [...baseBeats, ...getChapterEchoes(chapter, state)];
        };
    });

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
        LEVEL_STORY_EVENTS,
        STORY_CHAPTERS,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StoryData;
    }

    globalScope.StoryData = StoryData;
})(typeof window !== 'undefined' ? window : globalThis);
