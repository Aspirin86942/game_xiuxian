const assert = require('assert');
const GameCore = require('../game-core.js');

function satisfyMainChapter(state) {
    const chapter = GameCore.getChapterById(state.storyProgress);
    if (!chapter) {
        return;
    }
    const requirements = chapter.requirements || {};
    if (requirements.realmScoreAtLeast !== undefined && GameCore.getRealmScore(state) < requirements.realmScoreAtLeast) {
        GameCore.setRealmScore(state, requirements.realmScoreAtLeast);
    }
    if (requirements.cultivationAtLeast !== undefined) {
        state.cultivation = Math.max(state.cultivation, requirements.cultivationAtLeast);
    }
    if (requirements.relationsMin) {
        Object.entries(requirements.relationsMin).forEach(([npcName, value]) => {
            state.npcRelations[npcName] = Math.max(state.npcRelations[npcName] || 0, value);
        });
    }
    if (requirements.items) {
        Object.entries(requirements.items).forEach(([itemId, value]) => {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, value);
        });
    }
    if (requirements.flagsAll) {
        Object.entries(requirements.flagsAll).forEach(([flag, value]) => {
            state.flags[flag] = value;
        });
    }
    GameCore.recalculateState(state, false);
}

function playToChoices(state) {
    let view = GameCore.getStoryView(state);
    assert(view, '应当能拿到剧情视图');
    while (view.mode === 'playing') {
        GameCore.advanceStoryBeat(state);
        view = GameCore.getStoryView(state);
    }
    assert.strictEqual(view.mode, 'choices');
    return view;
}

function topUpCosts(state, choice) {
    if (!choice || !choice.costs) {
        return;
    }
    Object.entries(choice.costs).forEach(([itemId, amount]) => {
        state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, amount);
    });
}

function assertNoNegativeInventory(state) {
    Object.values(state.inventory).forEach((value) => {
        assert(value >= 0, '库存不应出现负数');
    });
}

function runMainPath(choiceMap) {
    const state = GameCore.createInitialState();
    GameCore.ensureStoryCursor(state);

    while (!state.ending) {
        satisfyMainChapter(state);
        const view = playToChoices(state);
        if (view.source === 'level') {
            const fallbackChoice = view.choices.find((item) => !item.disabled) || view.choices[0];
            topUpCosts(state, fallbackChoice);
            const levelResult = GameCore.chooseStoryOption(state, fallbackChoice.id);
            assert(levelResult.ok, `小境界事件 ${view.chapter.id} 中途阻塞: ${levelResult.error || 'unknown'}`);
            assertNoNegativeInventory(state);
            continue;
        }

        assert.strictEqual(view.source, 'main');
        const choiceId = choiceMap[view.chapter.id];
        assert(choiceId, `缺少第 ${view.chapter.id} 章选择映射`);
        const selectedChoice = view.choices.find((item) => item.id === choiceId);
        topUpCosts(state, selectedChoice);
        const result = GameCore.chooseStoryOption(state, choiceId);
        assert(result.ok, `第 ${view.chapter.id} 章选择失败: ${result.error || 'unknown'}`);
        assertNoNegativeInventory(state);
    }

    return state;
}

function runUntilChapter(choiceMap, targetChapterId) {
    const state = GameCore.createInitialState();
    GameCore.ensureStoryCursor(state);

    while (!state.ending) {
        satisfyMainChapter(state);
        const view = playToChoices(state);
        if (view.source === 'level') {
            const fallbackChoice = view.choices.find((item) => !item.disabled) || view.choices[0];
            topUpCosts(state, fallbackChoice);
            const levelResult = GameCore.chooseStoryOption(state, fallbackChoice.id);
            assert(levelResult.ok, `小境界事件 ${view.chapter.id} 中途阻塞: ${levelResult.error || 'unknown'}`);
            continue;
        }

        if (view.chapter.id === targetChapterId) {
            return { state, view };
        }

        const choiceId = choiceMap[view.chapter.id];
        assert(choiceId, `缺少第 ${view.chapter.id} 章选择映射`);
        const selectedChoice = view.choices.find((item) => item.id === choiceId);
        topUpCosts(state, selectedChoice);
        const result = GameCore.chooseStoryOption(state, choiceId);
        assert(result.ok, `第 ${view.chapter.id} 章选择失败: ${result.error || 'unknown'}`);
    }

    throw new Error(`未能推进到第 ${targetChapterId} 章`);
}

function createChapterState(chapterId, configure) {
    const state = GameCore.createInitialState();
    state.storyProgress = chapterId;
    GameCore.LEVEL_STORY_EVENTS.forEach((event) => {
        state.levelStoryState.events[event.id] = { triggered: true, completed: true };
    });
    state.storyCursor = {
        source: 'main',
        storyId: null,
        chapterId: null,
        beatIndex: 0,
        mode: 'idle',
    };
    if (configure) {
        configure(state);
    }
    satisfyMainChapter(state);
    GameCore.ensureStoryCursor(state);
    GameCore.recalculateState(state, false);
    return state;
}

function getChapterChoiceView(chapterId, configure) {
    const state = createChapterState(chapterId, configure);
    const view = playToChoices(state);
    assert.strictEqual(view.chapter.id, chapterId);
    return { state, view };
}

function withInsertedChoices(choiceMap, overrides) {
    return {
        ...choiceMap,
        '16_feiyu_return': 'share_drink_and_part',
        '18_nangong_return': 'owe_nangong_silently',
        '23_mocaihuan_return': 'admit_old_wrong',
        ...(overrides || {}),
    };
}

function testStoryCursorSwitching() {
    const state = GameCore.createInitialState();
    const view = GameCore.getStoryView(state);
    assert(view);
    assert.strictEqual(view.source, 'main');
    assert.strictEqual(view.mode, 'playing');
    assert.strictEqual(view.visibleBeats.length, 1);

    GameCore.advanceStoryBeat(state);
    const secondBeatView = GameCore.getStoryView(state);
    assert.strictEqual(secondBeatView.source, 'main');
    assert.strictEqual(secondBeatView.visibleBeats.length, 2);

    GameCore.skipStoryPlayback(state);
    const choiceView = GameCore.getStoryView(state);
    assert.strictEqual(choiceView.mode, 'choices');
    assert.strictEqual(choiceView.source, 'main');
    assert(choiceView.choices.length >= 2);
}

function testMainPathIntegrity() {
    const state = runMainPath(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        19: 'hold_the_line',
        20: 'go_star_sea',
        21: 'hunt_monsters',
        22: 'collect_map',
        23: 'cooperate_allies',
        24: 'returned_tiannan_for_bonds',
        25: 'lingjie_xianzun',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
        '23_mocaihuan_return': 'support_mocaihuan_longterm',
    }));

    assert.strictEqual(state.ending.id, 'lingjie_xianzun');
    assert(state.routeScores.orthodox > state.routeScores.demonic);
    assert((state.npcRelations['南宫婉'] || 0) >= 90);
    const endingView = GameCore.getStoryView(state);
    assert.strictEqual(endingView.source, 'ending');
    assert.strictEqual(endingView.mode, 'ending');
}

function testMoHouseTreasurePathNoDeadlock() {
    const { state, view } = runUntilChapter({
        0: 'set_out_now',
        1: 'show_drive',
        2: 'become_disciple',
        3: 'warn_li',
        4: 'confront_early',
        5: 'keep_bottle',
        6: 'strike_first',
        7: 'burn_letter',
        8: 'take_treasure_leave',
    }, 9);

    assert.strictEqual(view.source, 'main');
    assert.strictEqual(view.chapter.id, 9);
    const choiceIds = view.choices.map((item) => item.id);
    assert(choiceIds.includes('take_quhun'));
    assert(choiceIds.includes('buy_back_trust'));

    const trustChoice = view.choices.find((item) => item.id === 'buy_back_trust');
    topUpCosts(state, trustChoice);
    const result = GameCore.chooseStoryOption(state, trustChoice.id);
    assert.strictEqual(result.ok, true);
    assert((state.npcRelations['墨彩环'] || 0) >= 20);
    assert.strictEqual(state.storyProgress, 10);
}

function testLevelEventCoverage() {
    assert.strictEqual(GameCore.LEVEL_STORY_EVENTS.length, 15);
    const titleKeywords = {
        qi_0: '第一缕灵气',
        qi_1: '药火第一次失控',
        qi_2: '经脉如针',
        ji_3: '脱胎',
        ji_4: '人情入局',
        ji_5: '瓶颈见锋',
        jin_6: '丹成孤意',
        jin_7: '旧账倒灌',
        jin_8: '名声先于你到场',
        yu_9: '神识外放',
        yu_10: '海路长夜',
        yu_11: '心魔借形',
        hs_12: '天光破境',
        hs_13: '旧人来信',
        hs_14: '飞升前夜',
    };
    const beatKeywords = {
        qi_0: '灵气入体',
        qi_1: '残缺丹方',
        qi_2: '经脉忽如针扎',
        ji_3: '旧的自己死了一次',
        ji_4: '带着礼物与试探',
        ji_5: '心里有一件事一直没放平',
        jin_6: '说不出的空',
        jin_7: '一起浮出',
        jin_8: '还未进门',
        yu_9: '墙后之人',
        yu_10: '孤舟夜渡',
        yu_11: '你现在活成你当初想变成的人了吗',
        hs_12: '天地像忽然静了一层',
        hs_13: '不会再有第二封',
        hs_14: '最早带出来的旧物',
    };

    GameCore.LEVEL_STORY_EVENTS.forEach((event) => {
        const state = GameCore.createInitialState();
        // 让 storyProgress 指向空章节，避免主线章节优先级压过 level 事件。
        state.storyProgress = 999;
        GameCore.setRealmScore(state, event.realmScore);
        GameCore.ensureStoryCursor(state);

        const view = GameCore.getStoryView(state);
        assert(view, `小境界事件 ${event.id} 未触发`);
        assert.strictEqual(view.source, 'level');
        assert.strictEqual(view.story.id, event.id);
        assert.strictEqual(view.chapter.id, event.id);
        assert(view.story.title.includes(titleKeywords[event.id]));

        const finishedView = playToChoices(state);
        assert.strictEqual(finishedView.source, 'level');
        const beatText = finishedView.story.beats.map((item) => item.text).join('\n');
        assert(beatText.includes(beatKeywords[event.id]));
        const firstChoice = finishedView.choices[0];
        assert(firstChoice.tradeoff, `小境界事件 ${event.id} 需要归一化 tradeoff`);
        assert(firstChoice.tradeoff.battleWillGain >= 1);
        assert(firstChoice.tradeoff.tribulationGain >= 1);
        topUpCosts(state, firstChoice);
        const result = GameCore.chooseStoryOption(state, firstChoice.id);
        assert(result.ok, `小境界事件 ${event.id} 选择失败: ${result.error || 'unknown'}`);
        assertNoNegativeInventory(state);

        const status = state.levelStoryState.events[event.id];
        assert(status.triggered, `小境界事件 ${event.id} 未标记触发`);
        assert(status.completed, `小境界事件 ${event.id} 未标记完成`);

        const costlyChoice = finishedView.choices.find((item) => item.costs);
        if (costlyChoice) {
            const costCheckState = GameCore.createInitialState();
            costCheckState.storyProgress = 999;
            GameCore.setRealmScore(costCheckState, event.realmScore);
            GameCore.ensureStoryCursor(costCheckState);
            const costView = playToChoices(costCheckState);
            const blockedChoice = costView.choices.find((item) => item.id === costlyChoice.id);
            assert(blockedChoice, `小境界事件 ${event.id} 需要保留带成本选项`);
            assert.strictEqual(blockedChoice.disabled, true);
            const blocked = GameCore.chooseStoryOption(costCheckState, blockedChoice.id);
            assert.strictEqual(blocked.ok, false);
        }
    });
}

function testBreakthroughQueuesLevelStory() {
    const state = GameCore.createInitialState();
    state.cultivation = state.maxCultivation;

    const result = GameCore.attemptBreakthrough(state, () => 0);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.success, true);

    const view = GameCore.getStoryView(state);
    assert(view);
    assert.strictEqual(view.source, 'level');
    assert.strictEqual(view.story.id, 'qi_1');
}

function testMissedLevelStoryCanRecover() {
    const state = GameCore.createInitialState();
    state.storyProgress = 999;
    GameCore.setRealmScore(state, 6);
    ['qi_0', 'qi_1', 'qi_2', 'ji_3', 'ji_4'].forEach((eventId) => {
        state.levelStoryState.events[eventId] = { triggered: true, completed: true };
    });
    state.levelStoryState.events.jin_6 = { triggered: true, completed: true };
    state.storyCursor = {
        source: 'main',
        storyId: null,
        chapterId: null,
        beatIndex: 0,
        mode: 'idle',
    };

    const pendingEvent = GameCore.getAvailableLevelEvent(state);
    assert(pendingEvent);
    assert.strictEqual(pendingEvent.id, 'ji_5');
}

function testProfileCollapseSaveCompatibility() {
    const initialState = GameCore.createInitialState();
    assert.strictEqual(initialState.ui.profileCollapsed, true);
    assert.deepStrictEqual(initialState.chapterChoices, {});
    assert.strictEqual(initialState.recentChoiceEcho, null);
    assert.deepStrictEqual(initialState.storyConsequences, { battleWill: 0, tribulation: 0 });
    assert.strictEqual(initialState.recentChoiceOutcome, null);

    const mergedLegacyState = GameCore.mergeSave({
        ui: {
            activeTab: 'story',
        },
    });
    assert.strictEqual(mergedLegacyState.ui.profileCollapsed, true);
    assert.strictEqual(mergedLegacyState.ui.activeTab, 'story');
    assert.deepStrictEqual(mergedLegacyState.chapterChoices, {});
    assert.strictEqual(mergedLegacyState.recentChoiceEcho, null);
    assert.deepStrictEqual(mergedLegacyState.storyConsequences, { battleWill: 0, tribulation: 0 });
    assert.strictEqual(mergedLegacyState.recentChoiceOutcome, null);

    const mergedExplicitState = GameCore.mergeSave({
        ui: {
            profileCollapsed: false,
        },
        chapterChoices: {
            14: 'save_nangong',
        },
        recentChoiceEcho: {
            chapterId: 14,
            choiceId: 'save_nangong',
        },
        storyConsequences: {
            battleWill: 99,
            tribulation: 88,
        },
        recentChoiceOutcome: {
            chapterId: 14,
            choiceId: 'save_nangong',
            battleWillGain: 9,
            tribulationGain: 7,
            attackBonus: 999,
            defenseBonus: 999,
            hpBonus: 999,
        },
    });
    assert.strictEqual(mergedExplicitState.ui.profileCollapsed, false);
    assert.strictEqual(mergedExplicitState.chapterChoices[14], 'save_nangong');
    assert.strictEqual(mergedExplicitState.recentChoiceEcho.chapterId, 14);
    assert.strictEqual(mergedExplicitState.recentChoiceEcho.choiceId, 'save_nangong');
    assert.deepStrictEqual(mergedExplicitState.storyConsequences, {
        battleWill: GameCore.STORY_CONSEQUENCE_LIMITS.battleWill,
        tribulation: GameCore.STORY_CONSEQUENCE_LIMITS.tribulation,
    });
    assert.deepStrictEqual(mergedExplicitState.recentChoiceOutcome, {
        chapterId: 14,
        choiceId: 'save_nangong',
        battleWillGain: 3,
        tribulationGain: 2,
        attackBonus: GameCore.STORY_CONSEQUENCE_LIMITS.battleWill * 2,
        defenseBonus: Math.floor(GameCore.STORY_CONSEQUENCE_LIMITS.battleWill / 2),
        hpBonus: GameCore.STORY_CONSEQUENCE_LIMITS.battleWill * 6,
    });
}

function testChoiceEchoStateUpdates() {
    const { state } = getChapterChoiceView(14);
    const result = GameCore.chooseStoryOption(state, 'save_nangong');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.chapterChoices[14], 'save_nangong');
    assert.strictEqual(state.recentChoiceEcho.chapterId, 14);
    assert.strictEqual(state.recentChoiceEcho.choiceId, 'save_nangong');
    assert.deepStrictEqual(state.storyConsequences, { battleWill: 2, tribulation: 1 });
    assert.strictEqual(state.recentChoiceOutcome.chapterId, 14);
    assert.strictEqual(state.recentChoiceOutcome.choiceId, 'save_nangong');
    assert.strictEqual(state.recentChoiceOutcome.battleWillGain, 2);
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 1);

    const echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes[0].title, '抉择余波');
    assert(echoes[0].detail.includes('战意 +2'));
    assert(echoes[0].detail.includes('劫煞 +1'));
    assert(echoes.some((item) => item.title === '禁地回身'));
    assert(echoes.some((item) => item.title === '禁地留名'));
}

function testChoiceTextsHideTradeoffPreview() {
    const mainView = getChapterChoiceView(14).view;
    mainView.choices.forEach((choice) => {
        assert(!choice.text.includes('战意'));
        assert(!choice.text.includes('劫煞'));
    });

    const levelState = GameCore.createInitialState();
    levelState.storyProgress = 999;
    GameCore.setRealmScore(levelState, 0);
    GameCore.ensureStoryCursor(levelState);
    const levelView = playToChoices(levelState);
    levelView.choices.forEach((choice) => {
        assert(!choice.text.includes('战意'));
        assert(!choice.text.includes('劫煞'));
    });
}

function testBattleWillBonusesAffectStats() {
    const { state } = getChapterChoiceView(0);
    const initialStats = {
        hp: state.playerStats.maxHp,
        attack: state.playerStats.attack,
        defense: state.playerStats.defense,
    };

    const result = GameCore.chooseStoryOption(state, 'set_out_now');
    assert.strictEqual(result.ok, true);

    const bonuses = GameCore.getBattleWillBonuses(state);
    assert.deepStrictEqual(bonuses, { attack: 4, defense: 1, hp: 12 });
    assert.strictEqual(state.playerStats.maxHp, initialStats.hp + bonuses.hp);
    assert.strictEqual(state.playerStats.attack, initialStats.attack + bonuses.attack);
    assert.strictEqual(state.playerStats.defense, initialStats.defense + bonuses.defense);
}

function testLevelChoiceOutcomeStateUpdates() {
    const state = GameCore.createInitialState();
    state.storyProgress = 999;
    GameCore.setRealmScore(state, 0);
    GameCore.ensureStoryCursor(state);

    const view = playToChoices(state);
    const result = GameCore.chooseStoryOption(state, 'observe_change');
    assert.strictEqual(view.source, 'level');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.recentChoiceOutcome.chapterId, 'qi_0');
    assert.strictEqual(state.recentChoiceOutcome.choiceId, 'observe_change');
    assert.strictEqual(state.recentChoiceOutcome.battleWillGain, 1);
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 1);
    assert.strictEqual(GameCore.getEchoes(state)[0].title, '抉择余波');
}

function testTribulationDeathEnding() {
    const { state } = getChapterChoiceView(14, (chapterState) => {
        chapterState.storyConsequences.tribulation = 41;
    });

    const result = GameCore.chooseStoryOption(state, 'kill_for_gain');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.ending, true);
    assert.strictEqual(result.death, true);
    assert.strictEqual(state.ending.id, 'zouhuorumo');
    assert.strictEqual(state.storyProgress, -1);
    assert.strictEqual(state.storyCursor.source, 'ending');
    assert.strictEqual(state.storyConsequences.tribulation, GameCore.STORY_CONSEQUENCE_LIMITS.tribulation);
    assert.strictEqual(state.recentChoiceOutcome.battleWillGain, 3);
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 2);
    assert.strictEqual(GameCore.getStoryView(state).source, 'ending');
}

function testResourceValidation() {
    const { state, view } = getChapterChoiceView(9, (chapterState) => {
        chapterState.npcRelations['墨彩环'] = -10;
    });
    assert.strictEqual(view.source, 'main');
    const costlyChoice = view.choices.find((item) => item.id === 'buy_back_trust');
    assert(costlyChoice);
    assert.strictEqual(costlyChoice.disabled, true);

    const result = GameCore.chooseStoryOption(state, costlyChoice.id);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(state.inventory.lingshi || 0, 0);
    assertNoNegativeInventory(state);
}

function testMineChoicesBecomeRouteSpecific() {
    const orthodoxView = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
    }), 19).view;

    const demonicView = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'show_drive',
        2: 'become_disciple',
        3: 'warn_li',
        4: 'confront_early',
        5: 'keep_bottle',
        6: 'strike_first',
        7: 'burn_letter',
        8: 'take_treasure_leave',
        9: 'take_quhun',
        10: 'watch_market',
        11: 'sell_token',
        12: 'push_growth',
        13: 'go_solo',
        14: 'kill_for_gain',
        15: 'cut_nangong_ties',
        16: 'learn_in_secret',
        17: 'trade_favors_banquet',
        18: 'defect_demonic',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
    }), 19).view;

    const orthodoxChoiceIds = orthodoxView.choices.map((item) => item.id);
    const demonicChoiceIds = demonicView.choices.map((item) => item.id);

    assert(orthodoxChoiceIds.includes('hold_the_line'));
    assert(orthodoxChoiceIds.includes('rescue_rearguard'));
    assert(!orthodoxChoiceIds.includes('open_mine_gate'));

    assert(demonicChoiceIds.includes('open_mine_gate'));
    assert(demonicChoiceIds.includes('harvest_chaos'));
    assert(!demonicChoiceIds.includes('hold_the_line'));
}

function testChapter15ChoiceFlags() {
    const starter = (state) => {
        state.flags.savedNangong = true;
        state.npcRelations['南宫婉'] = 80;
    };
    const openingView = getChapterChoiceView(15, starter).view;
    const choiceIds = openingView.choices.map((item) => item.id);

    assert.deepStrictEqual(choiceIds, [
        'accept_nangong_debt',
        'suppress_nangong_feelings',
        'cut_nangong_ties',
    ]);
    assert(openingView.story.beats.length >= 8);

    const acceptState = getChapterChoiceView(15, starter).state;
    let result = GameCore.chooseStoryOption(acceptState, 'accept_nangong_debt');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(acceptState.flags.acceptedNangongDebt, true);
    assert.strictEqual(acceptState.flags.acceptedNangongHelp, true);
    assert.strictEqual(acceptState.flags.successfulFoundationEstablished, true);

    const suppressState = getChapterChoiceView(15, starter).state;
    result = GameCore.chooseStoryOption(suppressState, 'suppress_nangong_feelings');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(suppressState.flags.suppressedNangongFeelings, true);
    assert.strictEqual(suppressState.flags.successfulFoundationEstablished, true);

    const cutState = getChapterChoiceView(15, starter).state;
    result = GameCore.chooseStoryOption(cutState, 'cut_nangong_ties');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(cutState.flags.cutNangongTies, true);
    assert.strictEqual(cutState.flags.cutEmotion, true);
    assert.strictEqual(cutState.flags.successfulFoundationEstablished, true);
}

function testChapter16ChoiceFlags() {
    const openingView = getChapterChoiceView(16, (state) => {
        state.npcRelations['南宫婉'] = 70;
    }).view;
    const choiceIds = openingView.choices.map((item) => item.id);

    assert.deepStrictEqual(choiceIds, [
        'become_li_disciple',
        'keep_free',
        'learn_in_secret',
    ]);
    assert(openingView.story.beats.length >= 8);

    const discipleState = getChapterChoiceView(16).state;
    let result = GameCore.chooseStoryOption(discipleState, 'become_li_disciple');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(discipleState.storyProgress, '16_feiyu_return');
    assert.strictEqual(discipleState.flags.liDisciple, true);
    assert.strictEqual(discipleState.flags.enteredLihuayuanLineage, true);

    const freeState = getChapterChoiceView(16).state;
    result = GameCore.chooseStoryOption(freeState, 'keep_free');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(freeState.flags.freeCultivator, true);
    assert.strictEqual(freeState.flags.respectedLihuayuanButStayedIndependent, true);

    const pragmaticState = getChapterChoiceView(16).state;
    result = GameCore.chooseStoryOption(pragmaticState, 'learn_in_secret');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(pragmaticState.flags.learnsSecretively, true);
    assert.strictEqual(pragmaticState.flags.usedLihuayuanInfluencePragmatically, true);
}

function testChapter22ChoiceFlags() {
    const openingView = getChapterChoiceView(22, (state) => {
        state.flags.starSeaStyle = 'merchant';
    }).view;
    const choiceIds = openingView.choices.map((item) => item.id);

    assert.deepStrictEqual(choiceIds, [
        'collect_map',
        'sell_map',
        'avoid_map',
    ]);
    assert(openingView.story.beats.length >= 8);

    const collectState = getChapterChoiceView(22).state;
    let result = GameCore.chooseStoryOption(collectState, 'collect_map');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(collectState.flags.hasXuTianTu, true);
    assert.strictEqual(collectState.flags.enteredVoidHeavenMapGame, true);
    assert.strictEqual(collectState.flags.heldFragmentMap, true);

    const sellState = getChapterChoiceView(22).state;
    result = GameCore.chooseStoryOption(sellState, 'sell_map');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(sellState.flags.soldXuTianTu, true);
    assert.strictEqual(sellState.flags.soldFragmentMapForResources, true);
    assert.strictEqual(sellState.flags.hasXuTianTu, false);

    const avoidState = getChapterChoiceView(22).state;
    result = GameCore.chooseStoryOption(avoidState, 'avoid_map');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(avoidState.flags.avoidedXuTian, true);
    assert.strictEqual(avoidState.flags.avoidedVoidHeavenCoreConflict, true);
}

function testInsertedReturnArcFlags() {
    const feiyuView = getChapterChoiceView('16_feiyu_return', (state) => {
        state.npcRelations['厉飞雨'] = 25;
    }).view;
    assert(feiyuView.story.beats.length >= 6);
    assert.deepStrictEqual(feiyuView.choices.map((item) => item.id), [
        'help_feiyu_again',
        'share_drink_and_part',
        'distance_from_feiyu',
    ]);

    const feiyuState = getChapterChoiceView('16_feiyu_return').state;
    let result = GameCore.chooseStoryOption(feiyuState, 'help_feiyu_again');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(feiyuState.flags.helpedOldFriendAgain, true);
    assert.strictEqual(feiyuState.flags.reconnectedWithLiFeiyu, true);

    const nangongState = getChapterChoiceView('18_nangong_return').state;
    result = GameCore.chooseStoryOption(nangongState, 'acknowledge_nangong_importance');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(nangongState.flags.openlyAcknowledgedNangongImportance, true);

    const mocaihuanState = getChapterChoiceView('23_mocaihuan_return').state;
    result = GameCore.chooseStoryOption(mocaihuanState, 'support_mocaihuan_longterm');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(mocaihuanState.flags.madeAmendsToMocaihuan, true);
    assert.strictEqual(mocaihuanState.flags.mendedMoHouseDebt, true);
}

function testChapter24ChoicesStayVisibleAndUseDebtHooks() {
    const debtHookView = getChapterChoiceView(24, (state) => {
        state.flags.daoLvPromise = true;
        state.npcRelations['墨彩环'] = -10;
        state.routeScores.orthodox = 4;
        state.routeScores.secluded = 1;
    }).view;
    const choiceIds = debtHookView.choices.map((item) => item.id);

    assert(choiceIds.includes('returned_tiannan_for_settlement'));
    assert(choiceIds.includes('returned_tiannan_for_bonds'));
    assert(choiceIds.includes('returned_tiannan_but_remained_hidden'));
    assert(debtHookView.choices.find((item) => item.id === 'returned_tiannan_for_settlement').text.includes('嘉元城'));

    const settlementState = getChapterChoiceView(24, (state) => {
        state.flags.daoLvPromise = true;
        state.npcRelations['墨彩环'] = -10;
        state.routeScores.orthodox = 4;
    }).state;
    let result = GameCore.chooseStoryOption(settlementState, 'returned_tiannan_for_settlement');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(settlementState.flags.returnedTiannanForSettlement, true);
    assert.strictEqual(settlementState.flags.oldDebtsCleared, true);
    assert.strictEqual(settlementState.flags.returnedToMoHouse, true);

    const bondView = getChapterChoiceView(24, (state) => {
        state.flags.openlyAcknowledgedNangongImportance = true;
        state.npcRelations['南宫婉'] = 62;
        state.routeScores.orthodox = 5;
    }).view;
    assert(bondView.choices.find((item) => item.id === 'returned_tiannan_for_bonds').text.includes('南宫婉'));

    const mocaihuanBondView = getChapterChoiceView(24, (state) => {
        state.flags.madeAmendsToMocaihuan = true;
        state.npcRelations['墨彩环'] = 18;
    }).view;
    assert(mocaihuanBondView.choices.find((item) => item.id === 'returned_tiannan_for_bonds').text.includes('嘉元城'));
}

function testEndingChoiceVisibilityTracksStoryState() {
    const orthodoxEndingView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.routeScores.secluded = 3;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 120;
        state.npcRelations['李化元'] = 20;
    }).view;
    const orthodoxEndingIds = orthodoxEndingView.choices.map((item) => item.id);
    assert(orthodoxEndingIds.includes('lingjie_xianzun'));

    const renjieView = getChapterChoiceView(25, (state) => {
        state.flags.stoodTheLine = true;
    }).view;
    assert(renjieView.choices.map((item) => item.id).includes('renjie_zhizun'));

    const secludedEndingView = getChapterChoiceView(25, (state) => {
        state.routeScores.secluded = 10;
        state.flags.returnedToSeclusion = true;
    }).view;
    assert(secludedEndingView.choices.map((item) => item.id).includes('xiaoyao_sanxian'));

    const karmaView = getChapterChoiceView(25, (state) => {
        state.routeScores.demonic = 10;
        state.flags.lootedMoHouse = true;
        state.flags.executedDisabledEnemy = true;
    }).view;
    assert(karmaView.choices.map((item) => item.id).includes('yinguo_chanshen'));

    const fanxinView = getChapterChoiceView(25, (state) => {
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 36;
    }).view;
    assert(fanxinView.choices.map((item) => item.id).includes('fanxin_weisi'));

    const coldView = getChapterChoiceView(25, (state) => {
        state.flags.cutNangongTies = true;
        state.flags.executedDisabledEnemy = true;
    }).view;
    assert(coldView.choices.map((item) => item.id).includes('taishang_wangqing'));
}

function testChapterEchoesStayConcrete() {
    const chapter8Texts = getChapterChoiceView(8).view.story.beats.map((item) => item.text);
    assert(chapter8Texts.some((text) => text.includes('试药') || text.includes('活人站在原地')));

    const chapter9Texts = getChapterChoiceView(9).view.story.beats.map((item) => item.text);
    assert(chapter9Texts.some((text) => text.includes('旧药杵') || text.includes('别过来')));

    const chapter14Texts = getChapterChoiceView(14).view.story.beats.map((item) => item.text);
    assert(chapter14Texts.some((text) => text.includes('最先开始猎杀的，从来不是妖兽')));

    const chapter19Texts = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'orthodox';
    }).view.story.beats.map((item) => item.text);
    assert(chapter19Texts.some((text) => text.includes('第一次有人把命押在你一句话上')));

    const chapter23Texts = getChapterChoiceView(23, (state) => {
        state.flags.hasXuTianTu = true;
    }).view.story.beats.map((item) => item.text);
    assert(chapter23Texts.some((text) => text.includes('真正考验信义的')));

    const chapter24Texts = getChapterChoiceView(24).view.story.beats.map((item) => item.text);
    assert(chapter24Texts.some((text) => text.includes('真正的返乡')));

    const chapter25Texts = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.routeScores.secluded = 3;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 108;
    }).view.story.beats.map((item) => item.text);
    assert(chapter25Texts.some((text) => text.includes('飞升前夜')));
    assert(chapter25Texts.some((text) => text.includes('你最早不是为了大道修仙')));
}

function testChapter17BeatsAndFlags() {
    const { view } = getChapterChoiceView(17, (state) => {
        state.flags.enteredLihuayuanLineage = true;
    });
    assert(view.story.beats.length >= 8 && view.story.beats.length <= 10);
    const lowProfileState = getChapterChoiceView(17).state;
    let result = GameCore.chooseStoryOption(lowProfileState, 'stay_quiet_banquet');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(lowProfileState.flags.lowProfileBanquet, true);
    assert.strictEqual(lowProfileState.flags.yanFortObservedQuietly, true);

    const strengthState = getChapterChoiceView(17).state;
    result = GameCore.chooseStoryOption(strengthState, 'show_strength_banquet');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(strengthState.flags.showedStrength, true);
    assert.strictEqual(strengthState.flags.yanFortEstablishedPresence, true);

    const networkState = getChapterChoiceView(17).state;
    result = GameCore.chooseStoryOption(networkState, 'trade_favors_banquet');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(networkState.flags.builtBanquetNetwork, true);
    assert.strictEqual(networkState.flags.yanFortNetworkBuilt, true);
}

function testChapter19RouteChoices() {
    const { state: orthoState, view: orthodoxView } = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
    }), 19);
    assert(orthodoxView.story.beats.length >= 8 && orthodoxView.story.beats.length <= 10);
    const orthoIds = orthodoxView.choices.map((item) => item.id);
    assert(orthoIds.includes('hold_the_line'));
    assert(orthoIds.includes('rescue_rearguard'));
    const holdState = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
    }), 19).state;
    let result = GameCore.chooseStoryOption(holdState, 'hold_the_line');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(holdState.flags.heldSpiritMineLine, true);
    result = GameCore.chooseStoryOption(orthoState, 'rescue_rearguard');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(orthoState.flags.mineChoice, 'rearGuard');
    assert.strictEqual(orthoState.flags.ledMineBreakout, true);

    const { state: demoState, view: demonicView } = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'show_drive',
        2: 'become_disciple',
        3: 'warn_li',
        4: 'confront_early',
        5: 'keep_bottle',
        6: 'strike_first',
        7: 'burn_letter',
        8: 'take_treasure_leave',
        9: 'take_quhun',
        10: 'watch_market',
        11: 'sell_token',
        12: 'push_growth',
        13: 'go_solo',
        14: 'kill_for_gain',
        15: 'cut_nangong_ties',
        16: 'learn_in_secret',
        17: 'trade_favors_banquet',
        18: 'defect_demonic',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
    }), 19);
    const demoIds = demonicView.choices.map((item) => item.id);
    assert(demoIds.includes('open_mine_gate'));
    assert(demoIds.includes('harvest_chaos'));
    result = GameCore.chooseStoryOption(demoState, 'open_mine_gate');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(demoState.flags.mineChoice, 'betrayGate');
    assert.strictEqual(demoState.flags.escapedMineWithCoreAssets, true);

    const { state: routeSubState, view: routeState } = runUntilChapter(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fake_fight',
    }, {
        '16_feiyu_return': 'share_drink_and_part',
        '18_nangong_return': 'owe_nangong_silently',
    }), 19);
    assert(routeState.choices.map((item) => item.id).includes('lead_breakout'));
}

function testChapter21StarSeaFlags() {
    const { view } = getChapterChoiceView(21, (state) => {
        state.flags.enteredStarSea = true;
    });
    assert(view.story.beats.length >= 8 && view.story.beats.length <= 10);
    assert.deepStrictEqual(view.choices.map((item) => item.id), ['hunt_monsters', 'run_trade', 'seek_cave']);
    const hunterState = getChapterChoiceView(21).state;
    let result = GameCore.chooseStoryOption(hunterState, 'hunt_monsters');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(hunterState.flags.starSeaStyle, 'hunter');
    assert.strictEqual(hunterState.flags.starSeaHunterStart, true);

    const traderState = getChapterChoiceView(21).state;
    result = GameCore.chooseStoryOption(traderState, 'run_trade');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(traderState.flags.starSeaStyle, 'merchant');
    assert.strictEqual(traderState.flags.starSeaTraderStart, true);

    const secludedState = getChapterChoiceView(21).state;
    result = GameCore.chooseStoryOption(secludedState, 'seek_cave');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(secludedState.flags.starSeaStyle, 'secluded');
    assert.strictEqual(secludedState.flags.starSeaSecludedStart, true);
}

function testChapter23BranchChoices() {
    const soldState = getChapterChoiceView(23, (state) => {
        state.flags.soldXuTianTu = true;
        state.flags.hasXuTianTu = false;
    });
    assert(soldState.view.story.beats.length >= 8 && soldState.view.story.beats.length <= 10);
    const soldIds = soldState.view.choices.map((item) => item.id);
    assert(soldIds.includes('sell_route_info'));
    let result = GameCore.chooseStoryOption(soldState.state, 'sell_route_info');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(soldState.state.storyProgress, '23_mocaihuan_return');
    assert.strictEqual(soldState.state.flags.starSeaWaitedForBestMoment, true);

    const avoidedState = getChapterChoiceView(23, (state) => {
        state.flags.avoidedXuTian = true;
    });
    const avoidedIds = avoidedState.view.choices.map((item) => item.id);
    assert(avoidedIds.includes('pull_ally_out'));
    assert(avoidedIds.includes('slip_past_palace'));
    result = GameCore.chooseStoryOption(avoidedState.state, 'pull_ally_out');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(avoidedState.state.flags.rescuedFromXuTianEdge, true);
    assert.strictEqual(avoidedState.state.flags.starSeaHeldAllianceTogether, true);
    assert.strictEqual(avoidedState.state.storyProgress, '23_mocaihuan_return');

    const defaultState = getChapterChoiceView(23, (state) => {
        state.flags.hasXuTianTu = true;
    });
    assert(defaultState.view.choices.map((item) => item.id).includes('grab_treasure'));
    result = GameCore.chooseStoryOption(defaultState.state, 'grab_treasure');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(defaultState.state.flags.starSeaSeizedTreasureFirst, true);

    const chainedState = getChapterChoiceView(23, (state) => {
        state.flags.hasXuTianTu = true;
    }).state;
    result = GameCore.chooseStoryOption(chainedState, 'cooperate_allies');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(chainedState.storyProgress, '23_mocaihuan_return');
    const insertedView = playToChoices(chainedState);
    assert.strictEqual(insertedView.chapter.id, '23_mocaihuan_return');
    result = GameCore.chooseStoryOption(chainedState, 'admit_old_wrong');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(chainedState.storyProgress, 24);
}

function testEchoesAndSideStoriesIncludeNewSignals() {
    const echoState = GameCore.createInitialState();
    echoState.chapterChoices = {
        17: 'stay_quiet_banquet',
        21: 'hunt_monsters',
        23: 'grab_treasure',
    };
    echoState.recentChoiceEcho = { chapterId: 23, choiceId: 'grab_treasure' };
    const echoes = GameCore.getEchoes(echoState);
    const echoTitles = echoes.map((item) => item.title);
    assert.strictEqual(echoes[0].title, '抢先夺宝');
    assert(echoTitles.includes('笑里先看座次'));
    assert(echoTitles.includes('海上先活'));
    assert(echoTitles.includes('先伸手的人'));

    const sideState = GameCore.createInitialState();
    sideState.storyProgress = 25;
    sideState.flags.protectedMoHouse = true;
    sideState.flags.escapedMineWithCoreAssets = true;
    sideState.flags.enteredVoidHeavenMapGame = true;
    const sideStories = GameCore.getAvailableSideStories(sideState).map((item) => item.title);
    assert(sideStories.includes('旧药账'));
    assert(sideStories.includes('灵矿幸存者'));
    assert(sideStories.includes('残图余波'));
    assert(sideStories.includes('飞升前夜'));
}

function testNpcDialogueUsesChapterEchoes() {
    const mocaihuanState = GameCore.createInitialState();
    mocaihuanState.flags.protectedMoHouse = true;
    assert(GameCore.getNpcDialogue(mocaihuanState, '墨彩环').text.includes('墨府那点根'));

    const mocaihuanLootState = GameCore.createInitialState();
    mocaihuanLootState.flags.lootedMoHouse = true;
    assert(GameCore.getNpcDialogue(mocaihuanLootState, '墨彩环').text.includes('不回头') || GameCore.getNpcDialogue(mocaihuanLootState, '墨彩环').text.includes('折成价'));

    const mocaihuanPromiseState = GameCore.createInitialState();
    mocaihuanPromiseState.flags.promisedMoReturn = true;
    assert(GameCore.getNpcDialogue(mocaihuanPromiseState, '墨彩环').text.includes('我会回来') || GameCore.getNpcDialogue(mocaihuanPromiseState, '墨彩环').text.includes('记了很多年'));

    const nangongState = GameCore.createInitialState();
    nangongState.flags.acceptedNangongDebt = true;
    assert(GameCore.getNpcDialogue(nangongState, '南宫婉').text.includes('你既认了')
        || GameCore.getNpcDialogue(nangongState, '南宫婉').text.includes('人情不是锁'));

    const nangongSuppressedState = GameCore.createInitialState();
    nangongSuppressedState.flags.suppressedNangongFeelings = true;
    assert(GameCore.getNpcDialogue(nangongSuppressedState, '南宫婉').text.includes('压得住心'));

    const nangongCutState = GameCore.createInitialState();
    nangongCutState.flags.cutNangongTies = true;
    assert(GameCore.getNpcDialogue(nangongCutState, '南宫婉').text.includes('切得倒快') || GameCore.getNpcDialogue(nangongCutState, '南宫婉').text.includes('全忘'));

    const liState = GameCore.createInitialState();
    liState.flags.enteredLihuayuanLineage = true;
    assert(GameCore.getNpcDialogue(liState, '李化元').text.includes('既入我门下'));

    const liFreeState = GameCore.createInitialState();
    liFreeState.flags.respectedLihuayuanButStayedIndependent = true;
    assert(GameCore.getNpcDialogue(liFreeState, '李化元').text.includes('不肯全信我') || GameCore.getNpcDialogue(liFreeState, '李化元').text.includes('兜底'));

    const liBattleState = GameCore.createInitialState();
    liBattleState.flags.stoodTheLine = true;
    assert(GameCore.getNpcDialogue(liBattleState, '李化元').text.includes('站住了'));
}

function testEndingEchoTextsStayReflective() {
    const chapterView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.routeScores.secluded = 3;
        state.flags.acceptedNangongDebt = true;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 108;
    }).view;
    const beatTexts = chapterView.story.beats.map((item) => item.text);
    assert(beatTexts.some((text) => text.includes('飞升前夜')));
    assert(beatTexts.some((text) => text.includes('你最早不是为了大道修仙')));
    assert(beatTexts.some((text) => text.includes('正道、魔道、苟修')));

    const orthodoxState = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.routeScores.secluded = 4;
        state.flags.acceptedNangongDebt = true;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 108;
        state.npcRelations['李化元'] = 20;
    }).state;
    let result = GameCore.chooseStoryOption(orthodoxState, 'lingjie_xianzun');
    assert.strictEqual(result.ok, true);
    assert(orthodoxState.ending.description.includes('并非因为你比谁更干净'));

    const causalState = getChapterChoiceView(25, (state) => {
        state.routeScores.demonic = 12;
        state.flags.cutEmotion = true;
        state.flags.executedDisabledEnemy = true;
        state.flags.lootedMoHouse = true;
    }).state;
    result = GameCore.chooseStoryOption(causalState, 'yinguo_chanshen');
    assert.strictEqual(result.ok, true);
    assert(causalState.ending.description.includes('旧因旧果'));
}

function testStringChapterLogsNoNaN() {
    ['16_feiyu_return', '18_nangong_return', '23_mocaihuan_return'].forEach((chapterId) => {
        const state = createChapterState(chapterId);
        assert(state.logs.every((entry) => !entry.message.includes('NaN')));
    });
}

function testStoryPagingState() {
    const state = GameCore.createInitialState();
    GameCore.ensureStoryCursor(state);

    let view = GameCore.getStoryView(state);
    assert(view);
    assert.strictEqual(state.storyCursor.beatIndex, 0);
    assert.strictEqual(view.currentBeat.text, view.story.beats[0].text);

    GameCore.advanceStoryBeat(state);
    view = GameCore.getStoryView(state);
    assert.strictEqual(state.storyCursor.beatIndex, 1);
    assert.strictEqual(view.currentBeat.text, view.story.beats[1].text);

    GameCore.skipStoryPlayback(state);
    view = GameCore.getStoryView(state);
    assert.strictEqual(view.mode, 'choices');
    assert.strictEqual(state.storyCursor.beatIndex, view.story.beats.length - 1);
    assert.strictEqual(view.currentBeat.text, view.story.beats[view.story.beats.length - 1].text);
}

function testBranchEchoes() {
    const orthodoxState = runMainPath(withInsertedChoices({
        0: 'set_out_now',
        1: 'keep_low_profile',
        2: 'become_disciple',
        3: 'save_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'bait_and_counter',
        7: 'keep_letter',
        8: 'protect_mo_house',
        9: 'repair_quhun',
        10: 'watch_market',
        11: 'join_yellow_maple',
        12: 'build_connections',
        13: 'go_team',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        19: 'hold_the_line',
        20: 'go_star_sea',
        21: 'hunt_monsters',
        22: 'collect_map',
        23: 'cooperate_allies',
        24: 'returned_tiannan_for_bonds',
        25: 'lingjie_xianzun',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
        '23_mocaihuan_return': 'support_mocaihuan_longterm',
    }));
    const orthodoxEcho = GameCore.getEchoes(orthodoxState).map((item) => item.title);
    assert(orthodoxEcho.includes('禁地留名'));
    assert(orthodoxEcho.includes('灵界仙尊'));

    const demonicState = runMainPath(withInsertedChoices({
        0: 'set_out_now',
        1: 'show_drive',
        2: 'become_disciple',
        3: 'warn_li',
        4: 'confront_early',
        5: 'keep_bottle',
        6: 'strike_first',
        7: 'burn_letter',
        8: 'take_treasure_leave',
        9: 'take_quhun',
        10: 'watch_market',
        11: 'sell_token',
        12: 'push_growth',
        13: 'go_solo',
        14: 'kill_for_gain',
        15: 'cut_nangong_ties',
        16: 'learn_in_secret',
        17: 'trade_favors_banquet',
        18: 'defect_demonic',
        19: 'escape_alone',
        20: 'go_for_profit',
        21: 'run_trade',
        22: 'sell_map',
        23: 'grab_treasure',
        24: 'returned_tiannan_for_settlement',
        25: 'renjie_zhizun',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
        '23_mocaihuan_return': 'confirm_mocaihuan_safe',
    }));
    const demonicEcho = GameCore.getEchoes(demonicState).map((item) => item.title);
    assert(demonicEcho.includes('底线后移'));
    const demonicEndingView = GameCore.getStoryView(demonicState);
    assert.strictEqual(demonicEndingView.source, 'ending');
    assert.strictEqual(demonicEndingView.ending.id, 'zouhuorumo');
    assert.strictEqual(demonicState.storyConsequences.tribulation, GameCore.STORY_CONSEQUENCE_LIMITS.tribulation);

    const secludedState = runMainPath(withInsertedChoices({
        0: 'pack_and_leave',
        1: 'keep_low_profile',
        2: 'stay_independent',
        3: 'warn_li',
        4: 'collect_evidence',
        5: 'keep_bottle',
        6: 'escape_and_return',
        7: 'bury_mo',
        8: 'promise_caihuan',
        9: 'release_quhun',
        10: 'buy_rumor',
        11: 'shop_other_sects',
        12: 'farm_quietly',
        13: 'prepare_heavy',
        14: 'watch_and_wait',
        15: 'suppress_nangong_feelings',
        16: 'keep_free',
        17: 'stay_quiet_banquet',
        18: 'fake_fight',
        19: 'lead_breakout',
        20: 'go_hide',
        21: 'seek_cave',
        22: 'avoid_map',
        23: 'watch_last',
        24: 'returned_tiannan_but_remained_hidden',
        25: 'xiaoyao_sanxian',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
        '23_mocaihuan_return': 'confirm_mocaihuan_safe',
    }));
    const secludedEcho = GameCore.getEchoes(secludedState).map((item) => item.title);
    assert(secludedEcho.includes('只留一道影子'));
    assert(secludedEcho.includes('逍遥散仙'));
    const secludedEndingView = GameCore.getStoryView(secludedState);
    assert.strictEqual(secludedEndingView.source, 'ending');
    assert.strictEqual(secludedEndingView.ending.id, 'xiaoyao_sanxian');
}

testStoryCursorSwitching();
testMainPathIntegrity();
testMoHouseTreasurePathNoDeadlock();
testLevelEventCoverage();
testBreakthroughQueuesLevelStory();
testMissedLevelStoryCanRecover();
testProfileCollapseSaveCompatibility();
testChoiceEchoStateUpdates();
testChoiceTextsHideTradeoffPreview();
testBattleWillBonusesAffectStats();
testLevelChoiceOutcomeStateUpdates();
testTribulationDeathEnding();
testResourceValidation();
testMineChoicesBecomeRouteSpecific();
testChapter15ChoiceFlags();
testChapter16ChoiceFlags();
testChapter22ChoiceFlags();
testInsertedReturnArcFlags();
testChapter24ChoicesStayVisibleAndUseDebtHooks();
testEndingChoiceVisibilityTracksStoryState();
testChapterEchoesStayConcrete();
testChapter17BeatsAndFlags();
testChapter19RouteChoices();
testChapter21StarSeaFlags();
testChapter23BranchChoices();
testEchoesAndSideStoriesIncludeNewSignals();
testNpcDialogueUsesChapterEchoes();
testEndingEchoTextsStayReflective();
testStringChapterLogsNoNaN();
testStoryPagingState();
testBranchEchoes();

console.log('story smoke passed');
