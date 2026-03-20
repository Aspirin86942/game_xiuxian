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
    const state = runMainPath({
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
        15: 'accept_nangong',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        19: 'hold_the_line',
        20: 'go_star_sea',
        21: 'hunt_monsters',
        22: 'collect_map',
        23: 'cooperate_allies',
        24: 'accept_nangong_path',
        25: 'ending_ascend',
    });

    assert.strictEqual(state.ending.id, 'ascend');
    assert(state.routeScores.orthodox > state.routeScores.demonic);
    assert((state.npcRelations['南宫婉'] || 0) >= 100);
    const endingView = GameCore.getStoryView(state);
    assert.strictEqual(endingView.source, 'ending');
    assert.strictEqual(endingView.mode, 'ending');
}

function testLevelEventCoverage() {
    assert.strictEqual(GameCore.LEVEL_STORY_EVENTS.length, 15);

    GameCore.LEVEL_STORY_EVENTS.forEach((event) => {
        const state = GameCore.createInitialState();
        // 选一个会被主线门槛挡住的位置，避免主线章节优先级压过 level 事件。
        state.storyProgress = 9;
        state.npcRelations['墨彩环'] = 0;
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
            costCheckState.storyProgress = 9;
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
    state.storyProgress = 9;
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

    const mergedLegacyState = GameCore.mergeSave({
        ui: {
            activeTab: 'story',
        },
    });
    assert.strictEqual(mergedLegacyState.ui.profileCollapsed, true);
    assert.strictEqual(mergedLegacyState.ui.activeTab, 'story');

    const mergedExplicitState = GameCore.mergeSave({
        ui: {
            profileCollapsed: false,
        },
    });
    assert.strictEqual(mergedExplicitState.ui.profileCollapsed, false);
}

function testResourceValidation() {
    const state = GameCore.createInitialState();
    state.storyProgress = 9;
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
    const orthodoxState = runMainPath({
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
        15: 'accept_nangong',
        16: 'become_li_disciple',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        19: 'hold_the_line',
        20: 'go_star_sea',
        21: 'hunt_monsters',
        22: 'collect_map',
        23: 'cooperate_allies',
        24: 'accept_nangong_path',
        25: 'ending_ascend',
    });
    const orthodoxEcho = GameCore.getEchoes(orthodoxState).map((item) => item.title);
    assert(orthodoxEcho.includes('禁地救援'));

    const demonicState = runMainPath({
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
        15: 'cut_emotion',
        16: 'learn_in_secret',
        17: 'trade_favors_banquet',
        18: 'defect_demonic',
        19: 'escape_alone',
        20: 'go_for_profit',
        21: 'run_trade',
        22: 'sell_map',
        23: 'grab_treasure',
        24: 'settle_old_scores',
        25: 'ending_rule_mortal',
    });
    const demonicEcho = GameCore.getEchoes(demonicState).map((item) => item.title);
    assert(demonicEcho.includes('魔道投影'));
    const demonicEndingView = GameCore.getStoryView(demonicState);
    assert.strictEqual(demonicEndingView.source, 'ending');
    assert.strictEqual(demonicEndingView.ending.id, 'mortal');

    const secludedState = runMainPath({
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
        15: 'focus_breakthrough',
        16: 'keep_free',
        17: 'stay_quiet_banquet',
        18: 'fake_fight',
        19: 'lead_breakout',
        20: 'go_hide',
        21: 'seek_cave',
        22: 'avoid_map',
        23: 'watch_last',
        24: 'hide_again',
        25: 'ending_wander',
    });
    const secludedEcho = GameCore.getEchoes(secludedState).map((item) => item.title);
    assert(secludedEcho.includes('藏锋之心'));
    const secludedEndingView = GameCore.getStoryView(secludedState);
    assert.strictEqual(secludedEndingView.source, 'ending');
    assert.strictEqual(secludedEndingView.ending.id, 'wander');
}

testStoryCursorSwitching();
testMainPathIntegrity();
testLevelEventCoverage();
testBreakthroughQueuesLevelStory();
testMissedLevelStoryCanRecover();
testProfileCollapseSaveCompatibility();
testResourceValidation();
testStoryPagingState();
testBranchEchoes();

console.log('story smoke passed');
