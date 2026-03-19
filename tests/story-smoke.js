const assert = require('assert');
const GameCore = require('../game-core.js');

function satisfyCurrentChapter(state) {
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
    GameCore.recalculateState(state, false);
}

function revealChoices(state) {
    let view = GameCore.getStoryView(state);
    while (view && view.mode === 'playing') {
        GameCore.advanceStoryBeat(state);
        view = GameCore.getStoryView(state);
    }
    return view;
}

function runPath(choiceMap) {
    const state = GameCore.createInitialState();
    GameCore.ensureStoryCursor(state);

    while (!state.ending) {
        satisfyCurrentChapter(state);
        const view = revealChoices(state);
        assert(view, `章节 ${state.storyProgress} 未能出现`);
        assert.strictEqual(view.mode, 'choices', `章节 ${state.storyProgress} 未进入选择态`);
        const choiceId = choiceMap[view.chapter.id];
        assert(choiceId, `缺少第 ${view.chapter.id} 章选择映射`);
        const selectedChoice = view.choices.find((item) => item.id === choiceId);
        if (selectedChoice && selectedChoice.costs) {
            Object.entries(selectedChoice.costs).forEach(([itemId, value]) => {
                state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, value);
            });
        }
        const result = GameCore.chooseStoryOption(state, choiceId);
        assert(result.ok, `第 ${view.chapter.id} 章选择失败: ${result.error || 'unknown'}`);
    }

    return state;
}

function testStorySequence() {
    const state = GameCore.createInitialState();
    satisfyCurrentChapter(state);
    GameCore.ensureStoryCursor(state);

    let view = GameCore.getStoryView(state);
    assert(view);
    assert.strictEqual(view.mode, 'playing');
    assert.strictEqual(view.visibleBeats.length, 1);

    GameCore.advanceStoryBeat(state);
    view = GameCore.getStoryView(state);
    assert.strictEqual(view.visibleBeats.length, 2);

    GameCore.skipStoryPlayback(state);
    view = GameCore.getStoryView(state);
    assert.strictEqual(view.mode, 'choices');
    assert(view.choices.length >= 2);
}

function testCostValidation() {
    const state = GameCore.createInitialState();
    state.storyProgress = 10;
    GameCore.setRealmScore(state, 3);
    state.inventory.lingshi = 3;
    GameCore.ensureStoryCursor(state);
    const view = revealChoices(state);
    const rumorChoice = view.choices.find((item) => item.id === 'buy_rumor');
    assert(rumorChoice);
    assert.strictEqual(rumorChoice.disabled, true);

    const result = GameCore.chooseStoryOption(state, 'buy_rumor');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(state.inventory.lingshi, 3);
}

function testOrthodoxPath() {
    const state = runPath({
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
}

function testDemonicEcho() {
    const state = runPath({
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

    assert.strictEqual(state.ending.id, 'mortal');
    const echoChapter = GameCore.resolveChapter(GameCore.getChapterById(25), state);
    assert(echoChapter.beats.some((item) => item.text.includes('取舍之后的狠')));
}

function testSecludedEcho() {
    const state = runPath({
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

    assert.strictEqual(state.ending.id, 'wander');
    const finalChapter = GameCore.resolveChapter(GameCore.getChapterById(25), state);
    assert(finalChapter.beats.some((item) => item.text.includes('退半步') || item.text.includes('藏半分')));
}

testStorySequence();
testCostValidation();
testOrthodoxPath();
testDemonicEcho();
testSecludedEcho();

console.log('story smoke passed');
