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

        const finishedView = playToChoices(state);
        assert.strictEqual(finishedView.source, 'level');
        const firstChoice = finishedView.choices[0];
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

    const mergedLegacyState = GameCore.mergeSave({
        ui: {
            activeTab: 'story',
        },
    });
    assert.strictEqual(mergedLegacyState.ui.profileCollapsed, true);
    assert.strictEqual(mergedLegacyState.ui.activeTab, 'story');
    assert.deepStrictEqual(mergedLegacyState.chapterChoices, {});
    assert.strictEqual(mergedLegacyState.recentChoiceEcho, null);

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
    });
    assert.strictEqual(mergedExplicitState.ui.profileCollapsed, false);
    assert.strictEqual(mergedExplicitState.chapterChoices[14], 'save_nangong');
    assert.strictEqual(mergedExplicitState.recentChoiceEcho.chapterId, 14);
    assert.strictEqual(mergedExplicitState.recentChoiceEcho.choiceId, 'save_nangong');
}

function testChoiceEchoStateUpdates() {
    const { state } = getChapterChoiceView(14);
    const result = GameCore.chooseStoryOption(state, 'save_nangong');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.chapterChoices[14], 'save_nangong');
    assert.strictEqual(state.recentChoiceEcho.chapterId, 14);
    assert.strictEqual(state.recentChoiceEcho.choiceId, 'save_nangong');

    const echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes[0].title, '禁地回身');
    assert(echoes.some((item) => item.title === '禁地留名'));
}

function testResourceValidation() {
    const state = GameCore.createInitialState();
    state.storyProgress = 999;
    GameCore.setRealmScore(state, 5);
    GameCore.ensureStoryCursor(state);

    const view = playToChoices(state);
    assert.strictEqual(view.source, 'level');
    const costlyChoice = view.choices.find((item) => item.costs && item.costs.lingshi === 2);
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
        state.routeScores.demonic = 2;
        state.routeScores.secluded = 3;
        state.flags.successfulFoundationEstablished = true;
        state.flags.openlyAcknowledgedNangongImportance = true;
        state.flags.acceptedNangongPath = true;
        state.flags.returnedTiannanForBonds = true;
        state.flags.enteredLihuayuanLineage = true;
        state.npcRelations['南宫婉'] = 120;
    }).view;
    const orthodoxEndingIds = orthodoxEndingView.choices.map((item) => item.id);
    assert(orthodoxEndingIds.includes('lingjie_xianzun'));
    assert(!orthodoxEndingIds.includes('renjie_zhizun'));

    const renjieView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 2;
        state.routeScores.demonic = 9;
        state.routeScores.secluded = 3;
        state.flags.returnedTiannanForSettlement = true;
        state.flags.oldDebtsCleared = true;
    }).view;
    assert(renjieView.choices.map((item) => item.id).includes('renjie_zhizun'));

    const secludedEndingView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 3;
        state.routeScores.demonic = 2;
        state.routeScores.secluded = 9;
        state.flags.returnedToSeclusion = true;
    }).view;
    assert(secludedEndingView.choices.map((item) => item.id).includes('xiaoyao_sanxian'));

    const karmaView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 1;
        state.routeScores.demonic = 10;
        state.routeScores.secluded = 3;
        state.flags.cutNangongTies = true;
        state.flags.demonicPathSeed = true;
        state.npcRelations['南宫婉'] = -30;
    }).view;
    assert(karmaView.choices.map((item) => item.id).includes('yinguo_chanshen'));

    const fanxinView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 7;
        state.routeScores.demonic = 2;
        state.routeScores.secluded = 4;
        state.flags.openlyAcknowledgedNangongImportance = true;
        state.flags.returnedTiannanForBonds = true;
        state.flags.oldDebtsCleared = true;
        state.flags.madeAmendsToMocaihuan = true;
        state.flags.enteredLihuayuanLineage = true;
        state.npcRelations['南宫婉'] = 96;
        state.npcRelations['墨彩环'] = 55;
        state.npcRelations['李化元'] = 52;
    }).view;
    assert(fanxinView.choices.map((item) => item.id).includes('fanxin_weisi'));

    const coldView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 2;
        state.routeScores.demonic = 8;
        state.routeScores.secluded = 6;
        state.flags.avoidedNangongAgain = true;
        state.flags.cutNangongTies = true;
        state.flags.mineChoice = 'betrayGate';
        state.flags.usedLihuayuanInfluencePragmatically = true;
        state.npcRelations['南宫婉'] = -20;
    }).view;
    assert(coldView.choices.map((item) => item.id).includes('taishang_wangqing'));
}

function testChapterEchoesStayConcrete() {
    const { view } = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.flags.acceptedNangongDebt = true;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 108;
    });
    const beatTexts = view.story.beats.map((item) => item.text);
    assert(beatTexts.every((text) => !text.includes('这一章走完后')));
    assert(beatTexts.some((text) => text.includes('南宫婉') || text.includes('门前最后认三样东西') || text.includes('青牛镇')));

    const sixteenTexts = getChapterChoiceView(16, (state) => {
        state.flags.enteredLihuayuanLineage = true;
    }).view.story.beats.map((item) => item.text);
    assert(sixteenTexts.some((text) => text.includes('令牌') || text.includes('师门') || text.includes('李化元')));

    const xuTianTexts = getChapterChoiceView(22, (state) => {
        state.flags.enteredVoidHeavenMapGame = true;
        state.flags.hasXuTianTu = true;
    }).view.story.beats.map((item) => item.text);
    assert(xuTianTexts.some((text) => text.includes('残图') || text.includes('知道') || text.includes('资格')));

    const insertedTexts = getChapterChoiceView('23_mocaihuan_return', (state) => {
        state.flags.madeAmendsToMocaihuan = true;
    }).view.story.beats.map((item) => item.text);
    assert(insertedTexts.some((text) => text.includes('墨彩环') || text.includes('嘉元城') || text.includes('旧账')));
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
    sideState.storyProgress = 23;
    sideState.chapterChoices = {
        17: 'trade_favors_banquet',
        21: 'seek_cave',
        22: 'sell_map',
        23: 'watch_last',
    };
    const sideStories = GameCore.getAvailableSideStories(sideState).map((item) => item.title);
    assert(sideStories.includes('门路比风头久'));
    assert(sideStories.includes('先把自己站稳'));
    assert(sideStories.includes('危险换了主人'));
    assert(sideStories.includes('等得越准越冷'));
}

function testNpcDialogueUsesChapterEchoes() {
    const mocaihuanState = GameCore.createInitialState();
    mocaihuanState.chapterChoices[8] = 'protect_mo_house';
    mocaihuanState.npcRelations['墨彩环'] = 80;
    assert(GameCore.getNpcDialogue(mocaihuanState, '墨彩环').text.includes('没把我们也当成随手能丢的尾巴'));

    const nangongState = GameCore.createInitialState();
    nangongState.chapterChoices[23] = 'watch_last';
    nangongState.npcRelations['南宫婉'] = 40;
    assert(GameCore.getNpcDialogue(nangongState, '南宫婉').text.includes('冷眼一起记住'));

    const liState = GameCore.createInitialState();
    liState.chapterChoices[19] = 'open_mine_gate';
    liState.npcRelations['李化元'] = -30;
    assert(GameCore.getNpcDialogue(liState, '李化元').text.includes('拿同门去换自己的位子'));
}

function testEndingEchoTextsStayReflective() {
    const chapterView = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.flags.acceptedNangongDebt = true;
        state.flags.returnedTiannanForBonds = true;
        state.npcRelations['南宫婉'] = 108;
    }).view;
    const beatTexts = chapterView.story.beats.map((item) => item.text);
    assert(beatTexts.some((text) => text.includes('你最早不是为了大道修仙')));
    assert(beatTexts.some((text) => text.includes('正道、魔道、苟修')));

    const orthodoxState = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.flags.acceptedNangongDebt = true;
        state.flags.returnedTiannanForBonds = true;
        state.flags.oldDebtsCleared = true;
        state.npcRelations['南宫婉'] = 108;
        state.npcRelations['墨彩环'] = 55;
    }).state;
    let result = GameCore.chooseStoryOption(orthodoxState, 'lingjie_xianzun');
    assert.strictEqual(result.ok, true);
    assert(orthodoxState.ending.description.includes('并不比谁更干净'));

    const causalState = getChapterChoiceView(25, (state) => {
        state.routeScores.demonic = 8;
        state.flags.cutEmotion = true;
        state.flags.mineChoice = 'betrayGate';
        state.npcRelations['南宫婉'] = -10;
        state.npcRelations['墨彩环'] = -5;
    }).state;
    result = GameCore.chooseStoryOption(causalState, 'yinguo_chanshen');
    assert.strictEqual(result.ok, true);
    assert(causalState.ending.description.includes('淡掉的是表面，不是账'));
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
    assert(demonicEcho.includes('人界至尊'));
    const demonicEndingView = GameCore.getStoryView(demonicState);
    assert.strictEqual(demonicEndingView.source, 'ending');
    assert.strictEqual(demonicEndingView.ending.id, 'renjie_zhizun');

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
    assert(secludedEcho.includes('来过却不住回去'));
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
