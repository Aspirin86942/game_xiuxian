const assert = require('assert');
const GameCore = require('../game-core.js');
const StoryData = require('../story-data.js');

const ADAPTED_VOLUME_LABELS = Object.freeze({
    volume_one_qixuanmen: StoryData.VOLUME_DISPLAY_META.volume_one_qixuanmen.displayLabel,
    volume_two_ascending_path: StoryData.VOLUME_DISPLAY_META.volume_two_ascending_path.displayLabel,
    volume_three_magic_invasion: StoryData.VOLUME_DISPLAY_META.volume_three_magic_invasion.displayLabel,
    volume_four_overseas: StoryData.VOLUME_DISPLAY_META.volume_four_overseas.displayLabel,
    volume_five_homecoming: StoryData.VOLUME_DISPLAY_META.volume_five_homecoming.displayLabel,
});

function formatAdaptedVolumeLabel(volumeId, order) {
    return `${ADAPTED_VOLUME_LABELS[volumeId]}·第 ${order} 章`;
}

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
    if (!choice) {
        return;
    }

    const sources = [];
    if (choice.costs) {
        sources.push(choice.costs);
    }
    if (choice.requirements?.items) {
        sources.push(choice.requirements.items);
    }

    sources.forEach((costs) => {
        Object.entries(costs).forEach(([itemId, amount]) => {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, amount);
        });
    });

    if (choice.requirements?.flagsAll) {
        Object.entries(choice.requirements.flagsAll).forEach(([flagName, value]) => {
            state.flags[flagName] = value;
        });
    }
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

function getGeneratedHintSnapshot(chapterId, choiceId, configure) {
    const { view } = getChapterChoiceView(chapterId, configure);
    const choice = view.choices.find((item) => item.id === choiceId);
    assert(choice, `章节 ${chapterId} 缺少选项 ${choiceId}`);
    return {
        visibleCostLabel: choice.visibleCostLabel,
        longTermHint: choice.longTermHint,
        endingSeedNotes: (choice.endingSeeds || []).map((item) => item.note),
    };
}

function getChapterTexts(chapterId, configure) {
    const { state, view } = getChapterChoiceView(chapterId, configure);
    const speakers = view.story.beats
        .map((item) => item.speaker)
        .filter((speaker) => speaker && speaker !== '旁白');
    return {
        state,
        summary: view.chapter.summary,
        echoBeat: view.story.beats[view.story.beats.length - 1]?.text || '',
        beats: view.story.beats.map((item) => item.text),
        speakers,
        dialogueCount: view.story.beats.filter((item) => item.speaker !== '旁白').length,
    };
}

function getEndingOutcome(chapterId, choiceId, configure) {
    const { state, view } = getChapterChoiceView(chapterId, configure);
    const selectedChoice = view.choices.find((item) => item.id === choiceId);
    assert(selectedChoice, `章节 ${chapterId} 缺少选项 ${choiceId}`);
    topUpCosts(state, selectedChoice);
    const result = GameCore.chooseStoryOption(state, choiceId);
    assert.strictEqual(result.ok, true, `章节 ${chapterId} 选择 ${choiceId} 失败: ${result.error || 'unknown'}`);
    assert(state.ending, `章节 ${chapterId} 选择 ${choiceId} 后应进入结局`);
    return { state, ending: state.ending };
}

function withInsertedChoices(choiceMap, overrides) {
    return {
        ...choiceMap,
        '16_feiyu_return': 'share_drink_and_part',
        '18_nangong_return': 'owe_nangong_silently',
        '21_star_sea_foothold': 'claim_hunter_route',
        '22_xutian_rumor': 'bind_allies_before_entering',
        '23_star_sea_aftermath': 'honor_alliance_after_palace',
        '23_mocaihuan_return': 'admit_old_wrong',
        '23_volume_close': 'follow_old_alliances_home',
        ...(overrides || {}),
    };
}

function assertAuthoredBranchImpacts(chapterId, choices) {
    const bannedFragments = [
        '这一步没有立刻大声作响',
        '等路再拐回来时',
        '往后局势一紧',
        '这一步会在后续',
        '这一步会让你的',
    ];
    choices.forEach((choice) => {
        const pack = StoryData.BRANCH_IMPACT_PACKS?.[chapterId]?.[choice.id];
        assert(pack, `章节 ${chapterId} 选项 ${choice.id} 缺少显式 branchImpact`);
        assert.strictEqual(choice.branchImpact.title, pack.title, `${chapterId}:${choice.id} 标题未命中显式文案`);
        assert.strictEqual(choice.branchImpact.detail, pack.detail, `${chapterId}:${choice.id} 正文未命中显式文案`);
        bannedFragments.forEach((fragment) => {
            assert(!choice.branchImpact.detail.includes(fragment), `${chapterId}:${choice.id} 仍包含旧模板句`);
        });
    });
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

function testAlchemyRecipeCraftingSuccess() {
    const state = GameCore.createInitialState();
    state.inventory.lingcao = 2;
    state.inventory.lingshi = 5;

    const result = GameCore.craftRecipe(state, 'brew-jiedusan');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.inventory.jiedusan, 1);
    assert.strictEqual(state.inventory.lingcao || 0, 0);
    assert.strictEqual(state.inventory.lingshi || 0, 0);
}

function testAlchemyRecipeInsufficientMaterialsDoesNotPolluteInventory() {
    const state = GameCore.createInitialState();
    state.inventory.lingcao = 1;
    state.inventory.lingshi = 5;

    const result = GameCore.craftRecipe(state, 'brew-jiedusan');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error, '材料不足：灵草 x1');
    assert.deepStrictEqual(state.inventory, {
        lingcao: 1,
        lingshi: 5,
    });
}

function testHighTierBreakthroughPillRestrictions() {
    const lowRealmState = GameCore.createInitialState();
    lowRealmState.inventory.huashendan = 1;
    const lowRealmResult = GameCore.useItem(lowRealmState, 'huashendan');
    assert.strictEqual(lowRealmResult.ok, false);
    assert.strictEqual(lowRealmResult.error, '当前境界不足，化神丹需元婴及以上方可承受。');

    const lockedByBonusState = GameCore.createInitialState();
    GameCore.setRealmScore(lockedByBonusState, 9);
    lockedByBonusState.inventory.huashendan = 1;
    lockedByBonusState.breakthroughBonus = 0.15;
    const lockedByBonusResult = GameCore.useItem(lockedByBonusState, 'huashendan');
    assert.strictEqual(lockedByBonusResult.ok, false);
    assert.strictEqual(lockedByBonusResult.error, '已有药力护持，请先尝试突破。');
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
        '13_volume_close': 'enter_forbidden_ground_ready',
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
        '24_old_debt_and_name': 'settle_old_debts_openly',
        '24_bond_destination': 'choose_nangong_openly',
        25: 'walk_together_if_fate_allows',
        '25_final_branch': 'dadao_tongguang',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
        '21_star_sea_foothold': 'claim_hunter_route',
        '22_xutian_rumor': 'bind_allies_before_entering',
        '23_star_sea_aftermath': 'honor_alliance_after_palace',
        '23_mocaihuan_return': 'support_mocaihuan_longterm',
        '23_volume_close': 'follow_old_alliances_home',
    }));

    assert.strictEqual(state.ending.id, 'dadao_tongguang');
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
    assert.strictEqual(state.unreadStory, true, '非剧情页突破触发小境界事件时应标记未读');
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
    assert.strictEqual(initialState.version, GameCore.SAVE_VERSION);
    assert.strictEqual(initialState.ui.profileCollapsed, true);
    assert.deepStrictEqual(initialState.chapterChoices, {});
    assert.strictEqual(initialState.recentChoiceEcho, null);
    assert.deepStrictEqual(initialState.storyConsequences, {
        battleWill: 0,
        tribulation: 0,
        pressureTier: '安全',
        pressureTrend: '平稳',
    });
    assert.strictEqual(initialState.recentChoiceOutcome, null);
    assert.deepStrictEqual(initialState.decisionHistory, []);
    assert.deepStrictEqual(initialState.pendingEchoes, []);
    assert.deepStrictEqual(initialState.endingSeeds, []);

    const mergedLegacyState = GameCore.mergeSave({
        ui: {
            activeTab: 'story',
        },
    });
    assert.strictEqual(mergedLegacyState.ui.profileCollapsed, true);
    assert.strictEqual(mergedLegacyState.ui.activeTab, 'story');
    assert.deepStrictEqual(mergedLegacyState.chapterChoices, {});
    assert.strictEqual(mergedLegacyState.recentChoiceEcho, null);
    assert.deepStrictEqual(mergedLegacyState.storyConsequences, {
        battleWill: 0,
        tribulation: 0,
        pressureTier: '安全',
        pressureTrend: '平稳',
    });
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
        pressureTier: '失控',
        pressureTrend: '平稳',
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

function testUnsupportedLegacySaveVersionRejected() {
    const currentState = GameCore.createInitialState();
    const supportedSave = {
        ...currentState,
        version: GameCore.SAVE_VERSION,
    };
    const unsupportedSave = {
        ...currentState,
        version: GameCore.MIN_SUPPORTED_SAVE_VERSION - 1,
        storyProgress: 16,
    };

    assert.strictEqual(GameCore.isSupportedSaveData(supportedSave), true, '当前版本存档应继续被支持');
    assert.strictEqual(GameCore.isSupportedSaveData(unsupportedSave), false, '旧版晚期剧情存档应被显式阻断');
}

function testChoiceEchoStateUpdates() {
    const { state } = getChapterChoiceView(14);
    const result = GameCore.chooseStoryOption(state, 'save_nangong');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.chapterChoices[14], 'save_nangong');
    assert.strictEqual(state.recentChoiceEcho.chapterId, 14);
    assert.strictEqual(state.recentChoiceEcho.choiceId, 'save_nangong');
    assert.deepStrictEqual(state.storyConsequences, {
        battleWill: 2,
        tribulation: 0,
        pressureTier: '安全',
        pressureTrend: '平稳',
    });
    assert.strictEqual(state.recentChoiceOutcome.chapterId, 14);
    assert.strictEqual(state.recentChoiceOutcome.choiceId, 'save_nangong');
    assert.strictEqual(state.recentChoiceOutcome.battleWillGain, 2);
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 0);
    assert.strictEqual(state.decisionHistory.length, 1);
    assert.strictEqual(state.decisionHistory[0].promiseLabel, '保全');
    assert.strictEqual(state.decisionHistory[0].riskLabel, '有压');
    assert.strictEqual(state.decisionHistory[0].branchImpactTitle, '禁地留名');
    assert(state.decisionHistory[0].branchImpactDetail.includes('慢了半息'));
    assert(state.decisionHistory[0].branchImpactDetail.includes('很多人记住'));
    assert(state.pendingEchoes.length >= 1);
    assert(state.endingSeeds.length >= 1);

    const echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes.length, 1);
    assert.strictEqual(echoes[0].title, '禁地留名');
    assert(echoes[0].detail.includes('慢了半息'));
    assert(echoes[0].detail.includes('很多人记住'));
    assert(echoes[0].meta.includes('保全'));
    assert(echoes[0].meta.includes('有压'));
}

function testPendingEchoesStayHiddenFromVisibleFeed() {
    const { state } = getChapterChoiceView(14);
    const result = GameCore.chooseStoryOption(state, 'save_nangong');
    assert.strictEqual(result.ok, true);

    let echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes.length, 1);
    assert.strictEqual(echoes[0].title, '禁地留名');

    state.storyProgress = 16;
    echoes = GameCore.getEchoes(state);
    assert(echoes.some((item) => item.title === '禁地留名'));
    assert(!echoes.some((item) => item.title === '即时结果'));
    assert(!echoes.some((item) => item.title === '长期提示'));

    state.storyProgress = 20;
    echoes = GameCore.getEchoes(state);
    assert(echoes.some((item) => item.title === '禁地留名'));
}

function testChoiceTextsHideTradeoffPreview() {
    const mainView = getChapterChoiceView(14).view;
    mainView.choices.forEach((choice) => {
        assert(!choice.text.includes('战意'));
        assert(!choice.text.includes('劫煞'));
        assert(choice.promiseLabel);
        assert(choice.riskLabel);
        assert(choice.visibleCostLabel);
    });

    const levelState = GameCore.createInitialState();
    levelState.storyProgress = 999;
    GameCore.setRealmScore(levelState, 0);
    GameCore.ensureStoryCursor(levelState);
    const levelView = playToChoices(levelState);
    levelView.choices.forEach((choice) => {
        assert(!choice.text.includes('战意'));
        assert(!choice.text.includes('劫煞'));
        assert(choice.promiseLabel);
        assert(choice.riskLabel);
        assert(choice.visibleCostLabel);
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
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 0);
    assert.strictEqual(GameCore.getEchoes(state)[0].title, state.decisionHistory[0].branchImpactTitle);
    assert.strictEqual(GameCore.getEchoes(state).length, 1);
}

function testSamePromiseChoicesCreateDistinctBranchImpacts() {
    const state = createChapterState(8);
    let view = playToChoices(state);
    let result = GameCore.chooseStoryOption(state, 'protect_mo_house');
    assert.strictEqual(result.ok, true);

    state.storyProgress = 14;
    state.storyCursor = {
        source: 'main',
        storyId: null,
        chapterId: null,
        beatIndex: 0,
        mode: 'idle',
    };
    satisfyMainChapter(state);
    GameCore.ensureStoryCursor(state);
    view = playToChoices(state);
    assert.strictEqual(view.chapter.id, 14);

    result = GameCore.chooseStoryOption(state, 'save_nangong');
    assert.strictEqual(result.ok, true);

    const echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes.length >= 2, true);
    assert.strictEqual(echoes[0].title, '禁地留名');
    assert.strictEqual(echoes[1].title, '墨府余灯');
    assert.notStrictEqual(echoes[0].title, echoes[1].title);
    assert.notStrictEqual(echoes[0].detail, echoes[1].detail);
}

function testLegacySaveFallbackCreatesBranchImpacts() {
    const state = GameCore.createInitialState();
    state.decisionHistory = [];
    state.chapterChoices = {
        14: 'save_nangong',
        24: 'returned_tiannan_for_bonds',
    };
    state.recentChoiceEcho = null;
    state.pendingEchoes = [];

    const echoes = GameCore.getEchoes(state);
    assert.strictEqual(echoes.length, 2);
    assert.strictEqual(echoes[0].title, '旧情归位');
    assert.strictEqual(echoes[1].title, '禁地留名');
    assert(!echoes.some((item) => item.title === '即时结果'));
    assert(!echoes.some((item) => item.title === '长期提示'));
}

function testTribulationDeathEnding() {
    const { state } = getChapterChoiceView(14, (chapterState) => {
        chapterState.storyConsequences.tribulation = 8;
    });

    const result = GameCore.chooseStoryOption(state, 'kill_for_gain');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.ending, true);
    assert.strictEqual(result.death, true);
    assert.strictEqual(state.ending.id, 'zouhuo_rumo');
    assert.strictEqual(state.storyProgress, -1);
    assert.strictEqual(state.storyCursor.source, 'ending');
    assert.strictEqual(state.storyConsequences.pressureTier, '失控');
    assert.strictEqual(state.recentChoiceOutcome.battleWillGain, 3);
    assert.strictEqual(state.recentChoiceOutcome.tribulationGain, 1);
    assert.strictEqual(GameCore.getStoryView(state).source, 'ending');
    assert(Array.isArray(state.ending.recapLines));
    assert(state.ending.recapLines.length >= 2 && state.ending.recapLines.length <= 4);
}

function testPressureTierBoundaries() {
    [
        { tribulation: 0, pressureTier: '安全' },
        { tribulation: 2, pressureTier: '安全' },
        { tribulation: 3, pressureTier: '紧绷' },
        { tribulation: 5, pressureTier: '紧绷' },
        { tribulation: 6, pressureTier: '濒危' },
        { tribulation: 8, pressureTier: '濒危' },
        { tribulation: 9, pressureTier: '失控' },
    ].forEach(({ tribulation, pressureTier }) => {
        const merged = GameCore.mergeSave({
            storyConsequences: {
                battleWill: 0,
                tribulation,
            },
        });
        assert.strictEqual(merged.storyConsequences.pressureTier, pressureTier);
    });
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
    const orthodoxView = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'orthodox';
        state.routeScores.orthodox = 4;
        state.npcRelations['李化元'] = 20;
    }).view;

    const demonicView = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'demonic';
        state.routeScores.demonic = 5;
        state.flags.executedDisabledEnemy = true;
    }).view;

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
    assert.strictEqual(collectState.storyProgress, '22_xutian_rumor');

    const sellState = getChapterChoiceView(22).state;
    result = GameCore.chooseStoryOption(sellState, 'sell_map');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(sellState.flags.soldXuTianTu, true);
    assert.strictEqual(sellState.flags.soldFragmentMapForResources, true);
    assert.strictEqual(sellState.flags.hasXuTianTu, false);
    assert.strictEqual(sellState.storyProgress, '22_xutian_rumor');

    const avoidState = getChapterChoiceView(22).state;
    result = GameCore.chooseStoryOption(avoidState, 'avoid_map');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(avoidState.flags.avoidedXuTian, true);
    assert.strictEqual(avoidState.flags.avoidedVoidHeavenCoreConflict, true);
    assert.strictEqual(avoidState.storyProgress, '22_xutian_rumor');

    const rumorView = getChapterChoiceView('22_xutian_rumor').view;
    assert.deepStrictEqual(rumorView.choices.map((item) => item.id), [
        'hide_map_trace',
        'trade_on_rumors',
        'bind_allies_before_entering',
    ]);

    const hiddenRumorState = getChapterChoiceView('22_xutian_rumor').state;
    result = GameCore.chooseStoryOption(hiddenRumorState, 'hide_map_trace');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(hiddenRumorState.flags.hidXuTianTrail, true);
    assert.strictEqual(hiddenRumorState.flags.xutianRumorMode, 'hidden');
    assert.strictEqual(hiddenRumorState.storyProgress, 23);

    const profitRumorState = getChapterChoiceView('22_xutian_rumor').state;
    result = GameCore.chooseStoryOption(profitRumorState, 'trade_on_rumors');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(profitRumorState.flags.tradedOnXuTianRumors, true);
    assert.strictEqual(profitRumorState.flags.starSeaReputationRaisedByRumor, true);
    assert.strictEqual(profitRumorState.storyProgress, 23);

    const allianceRumorState = getChapterChoiceView('22_xutian_rumor').state;
    result = GameCore.chooseStoryOption(allianceRumorState, 'bind_allies_before_entering');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(allianceRumorState.flags.tiedXuTianRumorToAlliance, true);
    assert.strictEqual(allianceRumorState.flags.tiedXuTianRiskToPeople, true);
    assert.strictEqual(allianceRumorState.storyProgress, 23);
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
    assert.strictEqual(mocaihuanState.storyProgress, '23_volume_close');
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
    assert.strictEqual(settlementState.flags.tiannanReturnMode, 'settlement');
    assert.strictEqual(settlementState.storyProgress, '24_old_debt_and_name');

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

    const oldDebtView = getChapterChoiceView('24_old_debt_and_name', (state) => {
        state.flags.daoLvPromise = true;
        state.flags.enteredLihuayuanLineage = true;
        state.npcRelations['墨彩环'] = 52;
        state.npcRelations['李化元'] = 34;
    }).view;
    assert(oldDebtView.choices.find((item) => item.id === 'settle_old_debts_openly').text.includes('该认的账'));
}

function testLateGameGeneratedHintsContract() {
    const chapter24Hints = getGeneratedHintSnapshot(24, 'returned_tiannan_for_bonds');
    assert.strictEqual(chapter24Hints.visibleCostLabel, '此举代价：旧人旧账会更早找上门。');
    assert.strictEqual(chapter24Hints.longTermHint, '这一念不会当场闹大，可等你再站到门前时，旧人旧账会先一起回声。');

    const finalChoiceHints = getGeneratedHintSnapshot('25_final_branch', 'zhiying_xiangdao', (state) => {
        state.routeScores.secluded = 8;
        state.flags.volumeFiveBondTarget = 'distance';
        state.flags.volumeFiveAscensionAttitude = 'alone';
        state.npcRelations['南宫婉'] = 84;
    });
    assert.deepStrictEqual(finalChoiceHints.endingSeedNotes, [
        '门前若真走到“只影向道”，这一念会先来讨你一句实话。',
    ]);
}

function testEarlyChapterGeneratedHintsStayNeutral() {
    const chapter0Hints = getGeneratedHintSnapshot(0, 'set_out_now');
    assert.strictEqual(chapter0Hints.visibleCostLabel, '此举代价：会牵动后面的因果与去处');
    assert.strictEqual(chapter0Hints.longTermHint, '这一步不会立刻发作，却会在后面的几段路上留下能被认出的保全余波。');

    const chapter1Hints = getGeneratedHintSnapshot(1, 'keep_low_profile');
    assert.strictEqual(chapter1Hints.visibleCostLabel, '此举代价：眼前果报会来得更迟');
    assert.strictEqual(chapter1Hints.longTermHint, '这一步不会立刻发作，却会在后面的几段路上留下能被认出的试探余波。');

    const chapter20Hints = getGeneratedHintSnapshot(20, 'go_star_sea', (state) => {
        GameCore.setRealmScore(state, 7);
    });
    assert.strictEqual(chapter20Hints.visibleCostLabel, '此举代价：眼前脚步会慢半分');
    assert.strictEqual(chapter20Hints.longTermHint, '这一步不会立刻发作，却会在后面的几段路上留下能被认出的藏锋余波。');
}

function testLateVolumeGeneratedHintsFollowVolumeMetadata() {
    const chapter = StoryData.STORY_CHAPTERS.find((item) => item.id === '24_old_debt_and_name');
    assert(chapter, '应存在章节 24_old_debt_and_name');

    const originalId = chapter.id;
    try {
        chapter.id = 'volume_five_inserted_interlude';

        const state = GameCore.createInitialState();
        GameCore.setRealmScore(state, 10);
        state.flags.daoLvPromise = true;
        state.flags.enteredLihuayuanLineage = true;
        state.npcRelations['墨彩环'] = 52;
        state.npcRelations['李化元'] = 34;
        GameCore.recalculateState(state, false);

        const choice = chapter.choices(state).find((item) => item.id === 'settle_old_debts_openly');
        assert(choice, '伪插章后仍应生成 settle_old_debts_openly');
        assert.strictEqual(choice.visibleCostLabel, '此举代价：旧人旧账会更早找上门。');
        assert.strictEqual(choice.longTermHint, '这一念不会当场闹大，可等你再站到门前时，旧人旧账会先一起回声。');
    } finally {
        chapter.id = originalId;
    }
}

function testLateStringChapterGeneratedHintsStayLate() {
    const oldDebtHints = getGeneratedHintSnapshot('24_old_debt_and_name', 'settle_old_debts_openly', (state) => {
        state.flags.daoLvPromise = true;
        state.flags.enteredLihuayuanLineage = true;
        state.npcRelations['墨彩环'] = 52;
        state.npcRelations['李化元'] = 34;
    });
    assert.strictEqual(oldDebtHints.visibleCostLabel, '此举代价：旧人旧账会更早找上门。');
    assert.strictEqual(oldDebtHints.longTermHint, '后来再想起嘉元城与黄枫谷时，你先记住的不是谁曾亏待过你，而是你终于把自己那份也认了。');

    const bondHints = getGeneratedHintSnapshot('24_bond_destination', 'choose_nangong_openly', (state) => {
        state.flags.savedNangong = true;
        state.npcRelations['南宫婉'] = 82;
    });
    assert.strictEqual(bondHints.visibleCostLabel, '此举代价：旧人旧账会更早找上门。');
    assert.strictEqual(bondHints.longTermHint, '你终于不再把最重要的人推给“以后再说”。这会一路写进飞升前夜。');
}

function testEndingChoiceVisibilityTracksStoryState() {
    const sharedDaoView = getChapterChoiceView('25_final_branch', (state) => {
        state.routeScores.orthodox = 8;
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'shared';
        state.npcRelations['南宫婉'] = 120;
        state.flags.acceptedNangongPath = true;
    }).view;
    assert(sharedDaoView.choices.map((item) => item.id).includes('dadao_tongguang'));

    const redDustView = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'stay';
        state.npcRelations['南宫婉'] = 92;
    }).view;
    assert(redDustView.choices.map((item) => item.id).includes('youxi_hongchen'));

    const delayedView = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'delay';
        state.npcRelations['南宫婉'] = 88;
    }).view;
    assert(delayedView.choices.map((item) => item.id).includes('chidu_qingtian'));

    const mortalFarewellView = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'mocaihuan';
        state.flags.oldDebtsCleared = true;
        state.npcRelations['墨彩环'] = 72;
    }).view;
    assert(mortalFarewellView.choices.map((item) => item.id).includes('xianfan_shutu'));

    const lonelyView = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'distance';
        state.flags.volumeFiveAscensionAttitude = 'alone';
        state.npcRelations['南宫婉'] = 84;
    }).view;
    assert(lonelyView.choices.map((item) => item.id).includes('zhiying_xiangdao'));
}

function testChapterEchoesStayConcrete() {
    const forbiddenMetaWords = ['固定菜单', '支线', '关键旗标', '文字标签', '资源兑换', '情绪奖励', '关系后果', '分支影响'];
    const chapter8Texts = getChapterChoiceView(8).view.story.beats.map((item) => item.text);
    assert(chapter8Texts.some((text) => text.includes('试药') || text.includes('活人站在原地')));

    const chapter9Texts = getChapterChoiceView(9).view.story.beats.map((item) => item.text);
    assert(chapter9Texts.some((text) => text.includes('旧药杵') || text.includes('别过来')));

    const chapter12Texts = getChapterChoiceView(12).view.story.beats.map((item) => item.text);
    assert(chapter12Texts.some((text) => text.includes('离开第一卷之后') || text.includes('凡俗少年')));

    const chapter13CloseTexts = getChapterChoiceView('13_volume_close').view.story.beats.map((item) => item.text);
    assert(chapter13CloseTexts.some((text) => text.includes('离谷前最后一盏灯压得很低') || text.includes('升仙令、门墙和旧债')));

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

    const chapter23AftermathTexts = getChapterChoiceView('23_star_sea_aftermath', (state) => {
        state.flags.honoredAllianceAfterXuTian = true;
        state.npcRelations['南宫婉'] = 65;
    }).view.story.beats.map((item) => item.text);
    assert(chapter23AftermathTexts.some((text) => text.includes('虚天殿的盐气还挂在衣上') || text.includes('各自记住了你回身的那一下')));

    const chapter23CloseTexts = getChapterChoiceView('23_volume_close', (state) => {
        state.flags.honoredAllianceAfterXuTian = true;
        state.flags.madeAmendsToMocaihuan = true;
    }).view.story.beats.map((item) => item.text);
    assert(chapter23CloseTexts.some((text) => text.includes('到了离海之时') || text.includes('处世习气')));

    const chapter24Texts = getChapterChoiceView(24).view.story.beats.map((item) => item.text);
    assert(chapter24Texts.some((text) => text.includes('真正的返乡')));

    const chapter25Texts = getChapterChoiceView(25, (state) => {
        state.routeScores.orthodox = 8;
        state.routeScores.secluded = 3;
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveOldDebtMode = 'settled';
        state.npcRelations['南宫婉'] = 108;
    }).view.story.beats.map((item) => item.text);
    assert(chapter25Texts.some((text) => text.includes('飞升前夜')));
    assert(chapter25Texts.some((text) => text.includes('你最早不是为了大道修仙')));

    const chapter25FinalTexts = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'shared';
        state.npcRelations['南宫婉'] = 108;
    }).view.story.beats.map((item) => item.text);
    assert(chapter25FinalTexts.some((text) => text.includes('走到这里') || text.includes('真正追上来的')));

    const chapter15Text = getChapterChoiceView(15).view.story.beats.map((item) => item.text).join('\n');
    const chapter18Text = getChapterChoiceView(18, (state) => {
        state.flags.warChoice = 'demonic';
    }).view.story.beats.map((item) => item.text).join('\n');
    const chapter18ReturnText = getChapterChoiceView('18_nangong_return', (state) => {
        state.flags.openlyAcknowledgedNangongImportance = true;
    }).view.story.beats.map((item) => item.text).join('\n');
    const chapter25Text = chapter25Texts.join('\n');
    const chapter25FinalText = chapter25FinalTexts.join('\n');

    assertTextContainsNone(chapter15Text, forbiddenMetaWords, '第 15 章不应再出现资源兑换等黑话');
    assertTextContainsNone(chapter18Text, forbiddenMetaWords, '第 18 章不应再出现文字标签等黑话');
    assertTextContainsNone(chapter18ReturnText, forbiddenMetaWords, '18_nangong_return 不应再出现这条线等黑话');
    assertTextContainsNone(chapter25Text, forbiddenMetaWords, '第 25 章不应再出现固定菜单/支线/关键旗标等黑话');
    assertTextContainsNone(chapter25FinalText, forbiddenMetaWords, '门前问心段落不应再出现分支影响等黑话');
}

function testReturnHomeCharacterChaptersUseLiveDialogue() {
    const chapter23 = getChapterTexts('23_mocaihuan_return');
    assert.strictEqual(
        chapter23.summary,
        '一封家书把你重新拽回嘉元城。院门还在，等门的人已经学会不再把答案只押在你身上。',
        '章节 23_mocaihuan_return 的 summary 应命中本次重写文案',
    );
    assert(chapter23.dialogueCount >= 2, '章节 23_mocaihuan_return 至少应有 2 段人物对白，避免整章只剩旁白总结');
    assert(chapter23.speakers.includes('墨彩环'), '章节 23_mocaihuan_return 应包含墨彩环对白');
    assert(chapter23.speakers.includes('你'), '章节 23_mocaihuan_return 应包含“你”的对白');

    const chapter24 = getChapterTexts('24_old_debt_and_name', (state) => {
        state.flags.returnedTiannanForSettlement = true;
        state.flags.tiannanReturnMode = 'settlement';
    });
    assert.strictEqual(chapter24.state.flags.tiannanReturnMode, 'settlement', '章节 24_old_debt_and_name 应使用可达的返乡前置状态');
    assert.strictEqual(
        chapter24.summary,
        '嘉元城与黄枫谷都还记得你。难的不是回来，而是回来后不能再把该认的都推给明天。',
        '章节 24_old_debt_and_name 的 summary 应命中本次重写文案',
    );
    assert(chapter24.dialogueCount >= 2, '章节 24_old_debt_and_name 至少应有 2 段人物对白，避免整章只剩旁白总结');
    assert(chapter24.speakers.includes('墨彩环'), '章节 24_old_debt_and_name 应包含墨彩环对白');
    assert(chapter24.speakers.includes('黄枫谷执事'), '章节 24_old_debt_and_name 应包含黄枫谷执事对白');
    assert(chapter24.speakers.includes('你'), '章节 24_old_debt_and_name 应包含“你”的对白');
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
    const { state: orthoState, view: orthodoxView } = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'orthodox';
        state.routeScores.orthodox = 4;
        state.npcRelations['李化元'] = 20;
    });
    assert(orthodoxView.story.beats.length >= 8 && orthodoxView.story.beats.length <= 10);
    const orthoIds = orthodoxView.choices.map((item) => item.id);
    assert(orthoIds.includes('hold_the_line'));
    assert(orthoIds.includes('rescue_rearguard'));
    const holdState = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'orthodox';
        state.routeScores.orthodox = 4;
        state.npcRelations['李化元'] = 20;
    }).state;
    let result = GameCore.chooseStoryOption(holdState, 'hold_the_line');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(holdState.flags.heldSpiritMineLine, true);
    result = GameCore.chooseStoryOption(orthoState, 'rescue_rearguard');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(orthoState.flags.mineChoice, 'rearGuard');
    assert.strictEqual(orthoState.flags.ledMineBreakout, true);

    const { state: demoState, view: demonicView } = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'demonic';
        state.routeScores.demonic = 5;
        state.flags.executedDisabledEnemy = true;
        state.flags.roseInChaos = true;
    });
    const demoIds = demonicView.choices.map((item) => item.id);
    assert(demoIds.includes('open_mine_gate'));
    assert(demoIds.includes('harvest_chaos'));
    result = GameCore.chooseStoryOption(demoState, 'open_mine_gate');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(demoState.flags.mineChoice, 'betrayGate');
    assert.strictEqual(demoState.flags.escapedMineWithCoreAssets, true);

    const { state: routeSubState, view: routeState } = getChapterChoiceView(19, (state) => {
        state.flags.warChoice = 'secluded';
        state.routeScores.secluded = 4;
        state.flags.rescuedSmallGroup = true;
    });
    assert(routeState.choices.map((item) => item.id).includes('lead_breakout'));
    result = GameCore.chooseStoryOption(routeSubState, 'lead_breakout');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(routeSubState.flags.mineChoice, 'breakout');
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
    assert.strictEqual(hunterState.storyProgress, '21_star_sea_foothold');

    const traderState = getChapterChoiceView(21).state;
    result = GameCore.chooseStoryOption(traderState, 'run_trade');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(traderState.flags.starSeaStyle, 'merchant');
    assert.strictEqual(traderState.flags.starSeaTraderStart, true);
    assert.strictEqual(traderState.storyProgress, '21_star_sea_foothold');

    const secludedState = getChapterChoiceView(21).state;
    result = GameCore.chooseStoryOption(secludedState, 'seek_cave');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(secludedState.flags.starSeaStyle, 'secluded');
    assert.strictEqual(secludedState.flags.starSeaSecludedStart, true);

    const footholdView = getChapterChoiceView('21_star_sea_foothold').view;
    assert.deepStrictEqual(footholdView.choices.map((item) => item.id), [
        'claim_hunter_route',
        'build_trade_route',
        'secure_hidden_cave',
    ]);

    const hunterFootholdState = getChapterChoiceView('21_star_sea_foothold').state;
    result = GameCore.chooseStoryOption(hunterFootholdState, 'claim_hunter_route');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(hunterFootholdState.storyProgress, 22);

    const traderFootholdState = getChapterChoiceView('21_star_sea_foothold').state;
    result = GameCore.chooseStoryOption(traderFootholdState, 'build_trade_route');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(traderFootholdState.storyProgress, 22);

    const hiddenFootholdState = getChapterChoiceView('21_star_sea_foothold').state;
    result = GameCore.chooseStoryOption(hiddenFootholdState, 'secure_hidden_cave');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(hiddenFootholdState.storyProgress, 22);
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
    assert.strictEqual(soldState.state.storyProgress, '23_star_sea_aftermath');
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
    assert.strictEqual(avoidedState.state.storyProgress, '23_star_sea_aftermath');

    const defaultState = getChapterChoiceView(23, (state) => {
        state.flags.hasXuTianTu = true;
    });
    assert(defaultState.view.choices.map((item) => item.id).includes('grab_treasure'));
    result = GameCore.chooseStoryOption(defaultState.state, 'grab_treasure');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(defaultState.state.flags.starSeaSeizedTreasureFirst, true);
    assert.strictEqual(defaultState.state.storyProgress, '23_star_sea_aftermath');

    const aftermathView = getChapterChoiceView('23_star_sea_aftermath').view;
    assert.deepStrictEqual(aftermathView.choices.map((item) => item.id), [
        'honor_alliance_after_palace',
        'settle_reputation_with_profit',
        'cut_tracks_and_leave',
    ]);

    const allianceAftermathState = getChapterChoiceView('23_star_sea_aftermath').state;
    result = GameCore.chooseStoryOption(allianceAftermathState, 'honor_alliance_after_palace');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(allianceAftermathState.flags.honoredAllianceAfterXuTian, true);
    assert.strictEqual(allianceAftermathState.flags.nangongBondStageTwoConfirmed, true);
    assert.strictEqual(allianceAftermathState.storyProgress, '23_mocaihuan_return');

    const chainedState = getChapterChoiceView(23, (state) => {
        state.flags.hasXuTianTu = true;
    }).state;
    result = GameCore.chooseStoryOption(chainedState, 'cooperate_allies');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(chainedState.storyProgress, '23_star_sea_aftermath');
    let insertedView = playToChoices(chainedState);
    assert.strictEqual(insertedView.chapter.id, '23_star_sea_aftermath');
    result = GameCore.chooseStoryOption(chainedState, 'honor_alliance_after_palace');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(chainedState.storyProgress, '23_mocaihuan_return');
    insertedView = playToChoices(chainedState);
    assert.strictEqual(insertedView.chapter.id, '23_mocaihuan_return');
    result = GameCore.chooseStoryOption(chainedState, 'admit_old_wrong');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(chainedState.storyProgress, '23_volume_close');
    insertedView = playToChoices(chainedState);
    assert.strictEqual(insertedView.chapter.id, '23_volume_close');
    result = GameCore.chooseStoryOption(chainedState, 'follow_old_alliances_home');
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
        state.flags.volumeFiveOldDebtMode = 'settled';
        state.flags.volumeFiveBondTarget = 'nangong';
        state.npcRelations['南宫婉'] = 108;
    }).view;
    const beatTexts = chapterView.story.beats.map((item) => item.text);
    assert(beatTexts.some((text) => text.includes('飞升前夜')));
    assert(beatTexts.some((text) => text.includes('你最早不是为了大道修仙')));
    assert(beatTexts.some((text) => text.includes('正道、魔道、苟修')));

    const orthodoxState = getChapterChoiceView('25_final_branch', (state) => {
        state.routeScores.orthodox = 8;
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'shared';
        state.npcRelations['南宫婉'] = 108;
    }).state;
    let result = GameCore.chooseStoryOption(orthodoxState, 'dadao_tongguang');
    assert.strictEqual(result.ok, true);
    assert(orthodoxState.ending.description.includes('并肩') || orthodoxState.ending.description.includes('共破天劫'));

    const mortalState = getChapterChoiceView('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'mocaihuan';
        state.flags.oldDebtsCleared = true;
        state.npcRelations['墨彩环'] = 70;
    }).state;
    result = GameCore.chooseStoryOption(mortalState, 'xianfan_shutu');
    assert.strictEqual(result.ok, true);
    assert(mortalState.ending.description.includes('太晚') || mortalState.ending.description.includes('凡心'));
}

function testLateGameEchoesUseSceneHooks() {
    const chapter13Connected = getChapterTexts(13, (state) => {
        state.flags.madeGardenConnections = true;
    }).echoBeat;
    const chapter13Default = getChapterTexts(13, (state) => {
        state.flags.madeGardenConnections = false;
    }).echoBeat;
    assert.strictEqual(chapter13Connected, '夜还没过三更，同门排位和话头已经先替禁地定了座次。你站到哪里，旁人便记到哪里。');
    assert.strictEqual(chapter13Default, '灯火压低后，谁来找你同路、谁只在远处看你，禁地未开就已经把答案写了一半。');
    assert.notStrictEqual(chapter13Connected, chapter13Default, 'case 13 应保留分支，不应退化成单一句子');

    const chapter23Alliance = getChapterTexts('23_star_sea_aftermath', (state) => {
        state.flags.honoredAllianceAfterXuTian = true;
    }).echoBeat;
    const chapter23Profit = getChapterTexts('23_star_sea_aftermath', (state) => {
        state.flags.settledStarSeaReputationWithProfit = true;
    }).echoBeat;
    const chapter23CutTracks = getChapterTexts('23_star_sea_aftermath', (state) => {
        state.flags.cutStarSeaTracksAfterXuTian = true;
    }).echoBeat;
    const chapter23Default = getChapterTexts('23_star_sea_aftermath').echoBeat;
    assert.strictEqual(chapter23Alliance, '虚天殿的盐气还挂在衣上，并肩与翻脸的人却已经各自记住了你回身的那一下。');
    assert.strictEqual(chapter23Profit, '海风把名声吹得比人还快。你还没回头，旧人耳边先到的已经是“你这回把并肩折成了多少利”。');
    assert.strictEqual(chapter23CutTracks, '你把海上的痕迹压低了，可盐味还留在衣角。认得你的人只会更确定，你一到险处就先替自己留退路。');
    assert.strictEqual(chapter23Default, '虚天过后，先留下来的不是宝影，而是并肩的人有没有被你真的带出那道门。');
    assert.strictEqual(new Set([chapter23Alliance, chapter23Profit, chapter23CutTracks, chapter23Default]).size, 4, 'case 23_star_sea_aftermath 四层分支都应存在');

    const chapter24Settled = getChapterTexts('24_old_debt_and_name', (state) => {
        state.flags.volumeFiveOldDebtMode = 'settled';
    }).echoBeat;
    const chapter24Compensated = getChapterTexts('24_old_debt_and_name', (state) => {
        state.flags.volumeFiveOldDebtMode = 'compensated';
    }).echoBeat;
    const chapter24Buried = getChapterTexts('24_old_debt_and_name', (state) => {
        state.flags.volumeFiveOldDebtMode = 'buried';
    }).echoBeat;
    const chapter24Default = getChapterTexts('24_old_debt_and_name', (state) => {
        delete state.flags.volumeFiveOldDebtMode;
    }).echoBeat;
    assert.strictEqual(chapter24Settled, '旧账摊开时，最先发紧的不是旁人的眼色，而是你自己握着账页的手。');
    assert.strictEqual(chapter24Compensated, '灵石和补偿都摆上去了，可旧门前最重的仍是那句你愿不愿意亲口认下。');
    assert.strictEqual(chapter24Buried, '你把最难开口的那部分又压回去了，纸页合上时，沉默反倒比账更重。');
    assert.strictEqual(chapter24Default, '旧账翻到最后，真正难看的不是纸上的数，而是你这些年究竟绕开了几次回头。');
    assert.strictEqual(new Set([chapter24Settled, chapter24Compensated, chapter24Buried, chapter24Default]).size, 4, 'case 24_old_debt_and_name 四层分支都应存在');

    const chapter24BondNangong = getChapterTexts('24_bond_destination', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
    }).echoBeat;
    const chapter24BondMocaihuan = getChapterTexts('24_bond_destination', (state) => {
        state.flags.volumeFiveBondTarget = 'mocaihuan';
    }).echoBeat;
    const chapter24BondDistance = getChapterTexts('24_bond_destination', (state) => {
        state.flags.volumeFiveBondTarget = 'distance';
    }).echoBeat;
    const chapter24BondDefault = getChapterTexts('24_bond_destination', (state) => {
        delete state.flags.volumeFiveBondTarget;
    }).echoBeat;
    assert.strictEqual(chapter24BondNangong, '旧人真站到面前后，你才知道“认人”不是想起谁，而是肯不肯把脚步慢下来等一句回话。');
    assert.strictEqual(chapter24BondMocaihuan, '墨府门前那盏灯没有替你补回旧岁月，却逼着你第一次把“太晚了”三个字听完整。');
    assert.strictEqual(chapter24BondDistance, '你还是把话压住了。风从人身边过去时没有留痕，可这一回你知道它会一路吹到门前。');
    assert.strictEqual(chapter24BondDefault, '旧情到了卷末，不会再自己散。你肯不肯认，它都会先站在路中央等你。');
    assert.strictEqual(new Set([chapter24BondNangong, chapter24BondMocaihuan, chapter24BondDistance, chapter24BondDefault]).size, 4, 'case 24_bond_destination 四层分支都应存在');

    const chapter25FinalNangong = getChapterTexts('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
    }).echoBeat;
    const chapter25FinalMocaihuan = getChapterTexts('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'mocaihuan';
    }).echoBeat;
    const chapter25FinalDistance = getChapterTexts('25_final_branch', (state) => {
        state.flags.volumeFiveBondTarget = 'distance';
    }).echoBeat;
    assert.strictEqual(chapter25FinalNangong, '门槛已经在脚边，南宫婉这一笔也跟着站到了门前。你往前迈多快，她就会把这一步照得多亮。');
    assert.strictEqual(chapter25FinalMocaihuan, '门前最先响起来的不是天风，而是嘉元城旧灯和那句终究说晚了的话。');
    assert.strictEqual(chapter25FinalDistance, '门槛就在脚边，你若还把话往后拖，这阵风会先替你把那份迟疑吹回耳边。');
    assert.strictEqual(new Set([chapter25FinalNangong, chapter25FinalMocaihuan, chapter25FinalDistance]).size, 3, 'case 25_final_branch 三层分支都应存在');

    const chapter12MarketEcho = getChapterTexts('12_tainan_market').echoBeat;
    const chapter13VolumeCloseEcho = getChapterTexts('13_volume_close').echoBeat;
    assert.strictEqual(chapter12MarketEcho, '太南山散场后，摊位热气散得很快，你先记住的却是谁把消息当价码，谁把命当零头。');
    assert.strictEqual(chapter13VolumeCloseEcho, '离谷前最后一盏灯压得很低，你背上的升仙令、门墙和旧债却一件也没轻。');
}

function testLateGameEndingDescriptionsLandOnScenes() {
    const sharedDao = getEndingOutcome('25_final_branch', 'dadao_tongguang', (state) => {
        state.flags.volumeFiveBondTarget = 'nangong';
        state.flags.volumeFiveAscensionAttitude = 'shared';
        state.npcRelations['南宫婉'] = 108;
    });
    assert.strictEqual(sharedDao.ending.description, '雷光压到肩头时，你与南宫婉背贴着背把最后一重天劫扛了过去。门开那一瞬，你第一次觉得大道也会给并肩的人让路。');

    const mortalFarewell = getEndingOutcome('25_final_branch', 'xianfan_shutu', (state) => {
        state.flags.volumeFiveBondTarget = 'mocaihuan';
        state.flags.oldDebtsCleared = true;
        state.npcRelations['墨彩环'] = 72;
    });
    assert.strictEqual(mortalFarewell.ending.description, '嘉元城灯火还在，墨彩环也站在旧门前。你把迟到太久的话说完，终究还是各自转身，只把那点最晚醒来的凡心带上了天路。');

    const lonelyDao = getEndingOutcome('25_final_branch', 'zhiying_xiangdao', (state) => {
        state.flags.volumeFiveBondTarget = 'distance';
        state.flags.volumeFiveAscensionAttitude = 'alone';
        state.npcRelations['南宫婉'] = 84;
    });
    assert.strictEqual(lonelyDao.ending.description, '门开时你身边没有第二个人。风从袖口一直灌到心口，你才听清那些年总被你按下去的话，终究还是没人替你补上。');
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

function testMainStoryChoiceQueuesUnreadForNextChapter() {
    const state = GameCore.createInitialState();
    GameCore.ensureStoryCursor(state);

    const initialStoryId = state.storyCursor.storyId;
    const choiceView = playToChoices(state);
    const selectedChoice = choiceView.choices.find((choice) => !choice.disabled) || choiceView.choices[0];
    topUpCosts(state, selectedChoice);

    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.unreadStory, true, '主线推进到下一章时应标记存在未读剧情');
    assert.notStrictEqual(state.storyCursor.storyId, initialStoryId, '主线推进后应切换到下一段剧情');
    assert.strictEqual(state.storyCursor.mode, 'playing');
}

function testMainStoryChoiceKeepsReadStateInsideStoryTab() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'story';
    GameCore.ensureStoryCursor(state);

    const choiceView = playToChoices(state);
    const selectedChoice = choiceView.choices.find((choice) => !choice.disabled) || choiceView.choices[0];
    topUpCosts(state, selectedChoice);

    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.unreadStory, false, '剧情页内衔接下一章时不应重新标记未读');
}

function testReadStoryDoesNotRelightUnreadOnRestore() {
    const restoredState = GameCore.mergeSave({
        version: GameCore.SAVE_VERSION,
        ui: { activeTab: 'cultivation' },
        storyProgress: 0,
        unreadStory: false,
    });

    GameCore.ensureStoryCursor(restoredState, { preserveRestoreReadState: true });
    assert.strictEqual(restoredState.unreadStory, false, '已读剧情在非剧情页恢复后不应被重新标记为未读');

    restoredState.ui.activeTab = 'story';
    GameCore.syncUnreadStoryState(restoredState);
    assert.strictEqual(restoredState.unreadStory, false, '进入剧情页后未读状态应保持清零');
}

function testBlockedMainChapterHintStaysConcrete() {
    const { state, view } = getChapterChoiceView(9);
    const selectedChoice = view.choices.find((choice) => choice.id === 'release_quhun') || view.choices.find((choice) => !choice.disabled);
    topUpCosts(state, selectedChoice);

    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.storyProgress, 10);
    assert.strictEqual(GameCore.getStoryView(state), null, '境界不足时第 10 章不应提前可播放');

    const nextGoal = GameCore.getNextGoalText(state);
    const blockedHint = GameCore.getBlockedMainStoryHint(state);
    assert.strictEqual(blockedHint, '主线《太南小会》尚未开卷：需先修至筑基初期。');
    assert.strictEqual(nextGoal, '主线《太南小会》尚未开卷：需先修至筑基初期。');
    assert(!blockedHint.includes('火候'));
    assert(!nextGoal.includes('火候'));
    assert(state.logs.some((entry) => entry.message.includes('太南小会') && entry.message.includes('筑基初期')));
}

function testChapter10BidTokenAwardsShengxianling() {
    const { state, view } = getChapterChoiceView(10, (draft) => {
        draft.inventory.lingshi = 20;
        draft.flags.fulfilledMoWill = true;
    });
    const selectedChoice = view.choices.find((choice) => choice.id === 'bid_token');
    assert(selectedChoice, '第 10 章应存在直接竞拍升仙令的选项');

    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.inventory.shengxianling, 1, '升仙令应在第 10 章结算后进入背包');
    assert.strictEqual(state.flags.hasShengxianling, true, '升仙令旗标应在第 10 章结算后写入');
    assert.strictEqual(state.storyProgress, 11, '竞拍升仙令后应推进到第 11 章');
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
        '13_volume_close': 'enter_forbidden_ground_ready',
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
        '24_old_debt_and_name': 'settle_old_debts_openly',
        '24_bond_destination': 'choose_nangong_openly',
        25: 'walk_together_if_fate_allows',
        '25_final_branch': 'dadao_tongguang',
    }, {
        '16_feiyu_return': 'help_feiyu_again',
        '18_nangong_return': 'acknowledge_nangong_importance',
        '23_mocaihuan_return': 'support_mocaihuan_longterm',
    }));
    const orthodoxEcho = GameCore.getEchoes(orthodoxState).map((item) => item.title);
    assert(orthodoxEcho.includes('有人不能再拖'));
    assert(orthodoxEcho.includes('大道同光'));
    assert(!orthodoxEcho.includes('即时结果'));
    assert(orthodoxState.ending.recapLines.some((line) => line.includes('有人不能再拖') || line.includes('大道同光')));

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
        12: 'cut_old_name',
        '12_mortal_debt': 'keep_debt_distant',
        '12_tainan_market': 'observe_without_buying',
        '12_token_kill': 'kill_for_token_path',
        '12_enter_yellow_maple': 'enter_with_tradeoff',
        '12_herb_garden': 'push_growth',
        13: 'stock_foundation_supplies',
        '13_volume_close': 'enter_forbidden_ground_from_shadows',
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
        '24_old_debt_and_name': 'cut_old_name_after_minimum_duty',
        '24_bond_destination': 'keep_everyone_at_distance',
        25: 'say_nothing_and_walk_alone',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
        '21_star_sea_foothold': 'build_trade_route',
        '22_xutian_rumor': 'trade_on_rumors',
        '23_star_sea_aftermath': 'settle_reputation_with_profit',
        '23_mocaihuan_return': 'confirm_mocaihuan_safe',
        '23_volume_close': 'return_with_reputation_pressure',
    }));
    const demonicEcho = GameCore.getEchoes(demonicState).map((item) => item.title);
    assert(demonicEcho.includes('价格先看人心'));
    assert(demonicEcho.includes('旧债压成底色'));
    assert(!demonicEcho.includes('即时结果'));
    assert(!demonicEcho.includes('长期提示'));
    const demonicEndingView = GameCore.getStoryView(demonicState);
    assert.strictEqual(demonicEndingView.source, 'ending');
    assert.strictEqual(demonicEndingView.ending.id, 'zouhuo_rumo');
    assert.strictEqual(demonicState.storyConsequences.pressureTier, '失控');
    assert(demonicEndingView.ending.recapLines.some((line) => line.includes('价格先看人心') || line.includes('旧债压成底色')));

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
        12: 'leave_without_return',
        '12_mortal_debt': 'leave_resources_only',
        '12_tainan_market': 'buy_market_rule',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_by_detour',
        '12_herb_garden': 'farm_quietly',
        13: 'keep_low_profile_before_trial',
        '13_volume_close': 'enter_forbidden_ground_with_debt',
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
        '24_old_debt_and_name': 'cut_old_name_after_minimum_duty',
        '24_bond_destination': 'keep_everyone_at_distance',
        25: 'say_nothing_and_walk_alone',
        '25_final_branch': 'zhiying_xiangdao',
    }, {
        '16_feiyu_return': 'distance_from_feiyu',
        '18_nangong_return': 'avoid_nangong_again',
        '21_star_sea_foothold': 'secure_hidden_cave',
        '22_xutian_rumor': 'hide_map_trace',
        '23_star_sea_aftermath': 'cut_tracks_and_leave',
        '23_mocaihuan_return': 'confirm_mocaihuan_safe',
        '23_volume_close': 'return_after_hiding_tracks',
    }));
    const secludedEcho = GameCore.getEchoes(secludedState).map((item) => item.title);
    assert(secludedEcho.includes('只影向道'));
    assert(secludedEcho.includes('来过却不住回去'));
    assert(!secludedEcho.includes('即时结果'));
    const secludedEndingView = GameCore.getStoryView(secludedState);
    assert.strictEqual(secludedEndingView.source, 'ending');
    assert.strictEqual(secludedEndingView.ending.id, 'zhiying_xiangdao');
    assert(secludedEndingView.ending.recapLines.some((line) => line.includes('只影向道') || line.includes('来过却不住回去')));
}

function testExplicitBranchImpactCoverage() {
    const seenKeys = new Set();
    const scenarios = [
        { chapterId: 0 },
        { chapterId: 1 },
        { chapterId: 2 },
        { chapterId: 3 },
        { chapterId: 4 },
        { chapterId: 5 },
        { chapterId: 6 },
        { chapterId: 7 },
        { chapterId: 8 },
        { chapterId: 9 },
        { chapterId: 9, configure(state) { state.npcRelations['墨彩环'] = 35; } },
        { chapterId: 10 },
        { chapterId: 11 },
        { chapterId: 12 },
        { chapterId: '12_mortal_debt' },
        { chapterId: '12_tainan_market' },
        { chapterId: '12_token_kill' },
        { chapterId: '12_enter_yellow_maple' },
        { chapterId: '12_herb_garden' },
        { chapterId: 13 },
        { chapterId: '13_volume_close' },
        { chapterId: 14 },
        { chapterId: 15 },
        { chapterId: 16 },
        { chapterId: '16_feiyu_return' },
        { chapterId: 17 },
        { chapterId: 18 },
        { chapterId: '18_nangong_return' },
        { chapterId: 19 },
        { chapterId: 19, configure(state) { state.flags.warChoice = 'orthodox'; } },
        { chapterId: 19, configure(state) { state.flags.warChoice = 'demonic'; } },
        { chapterId: 20 },
        { chapterId: 21 },
        { chapterId: '21_star_sea_foothold' },
        { chapterId: 22 },
        { chapterId: '22_xutian_rumor' },
        { chapterId: 23 },
        { chapterId: 23, configure(state) { state.flags.soldXuTianTu = true; } },
        { chapterId: 23, configure(state) { state.flags.avoidedXuTian = true; } },
        { chapterId: '23_star_sea_aftermath' },
        { chapterId: '23_mocaihuan_return' },
        { chapterId: '23_volume_close' },
        { chapterId: 24 },
        { chapterId: '24_old_debt_and_name' },
        { chapterId: '24_bond_destination' },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { orthodox: 10, secluded: 1 };
                state.flags.oldDebtsCleared = true;
                state.npcRelations['南宫婉'] = 40;
            },
        },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { demonic: 1 };
                state.flags.heldSpiritMineLine = true;
            },
        },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { secluded: 10 };
            },
        },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { demonic: 2, secluded: 2 };
                state.flags.suppressedNangongFeelings = true;
                state.flags.executedDisabledEnemy = true;
            },
        },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { demonic: 10 };
                state.flags.lootedMoHouse = true;
            },
        },
        {
            chapterId: 25,
            configure(state) {
                state.routeScores = { orthodox: 1 };
                state.flags.returnedTiannanForBonds = true;
                state.npcRelations['墨彩环'] = 30;
            },
        },
        {
            chapterId: '25_final_branch',
            configure(state) {
                state.routeScores = { orthodox: 8 };
                state.flags.volumeFiveBondTarget = 'nangong';
                state.flags.volumeFiveAscensionAttitude = 'shared';
                state.npcRelations['南宫婉'] = 108;
            },
        },
        {
            chapterId: '25_final_branch',
            configure(state) {
                state.flags.volumeFiveBondTarget = 'distance';
                state.flags.volumeFiveAscensionAttitude = 'alone';
                state.npcRelations['南宫婉'] = 84;
            },
        },
        {
            chapterId: '25_final_branch',
            configure(state) {
                state.flags.volumeFiveBondTarget = 'mocaihuan';
                state.flags.oldDebtsCleared = true;
                state.npcRelations['墨彩环'] = 72;
            },
        },
        {
            chapterId: '25_final_branch',
            configure(state) {
                state.flags.volumeFiveBondTarget = 'nangong';
                state.flags.volumeFiveAscensionAttitude = 'delay';
                state.npcRelations['南宫婉'] = 88;
            },
        },
        {
            chapterId: '25_final_branch',
            configure(state) {
                state.flags.volumeFiveBondTarget = 'nangong';
                state.flags.volumeFiveAscensionAttitude = 'stay';
                state.npcRelations['南宫婉'] = 92;
            },
        },
    ];

    scenarios.forEach(({ chapterId, configure }) => {
        const { view } = getChapterChoiceView(chapterId, configure);
        assertAuthoredBranchImpacts(view.chapter.id, view.choices);
        view.choices.forEach((choice) => seenKeys.add(`${view.chapter.id}:${choice.id}`));
    });

    const baseState = GameCore.createInitialState();
    GameCore.LEVEL_STORY_EVENTS.forEach((event) => {
        const choices = event.choices(baseState);
        assertAuthoredBranchImpacts(event.id, choices);
        choices.forEach((choice) => seenKeys.add(`${event.id}:${choice.id}`));
    });

    [
        '9:repair_quhun',
        '19:hold_the_line',
        '19:rescue_rearguard',
        '19:open_mine_gate',
        '19:harvest_chaos',
        '21_star_sea_foothold:build_trade_route',
        '22_xutian_rumor:trade_on_rumors',
        '23:pull_ally_out',
        '23:sell_route_info',
        '23:slip_past_palace',
        '23_star_sea_aftermath:settle_reputation_with_profit',
        '23_volume_close:return_with_reputation_pressure',
        '24_old_debt_and_name:settle_old_debts_openly',
        '24_bond_destination:choose_nangong_openly',
        '25:walk_together_if_fate_allows',
        '25_final_branch:dadao_tongguang',
        '25_final_branch:zhiying_xiangdao',
        '25_final_branch:xianfan_shutu',
        '25_final_branch:chidu_qingtian',
        '25_final_branch:youxi_hongchen',
    ].forEach((key) => {
        assert(seenKeys.has(key), `动态分支未被测试覆盖：${key}`);
    });
}

function testVolumeOneRemapCoverage() {
    assert(Array.isArray(StoryData.VOLUME_ONE_CHAPTERS), '应导出第一卷 8 章结构');
    assert.strictEqual(StoryData.VOLUME_ONE_CHAPTERS.length, 8, '第一卷应固定为 8 章');

    const map = StoryData.VOLUME_ONE_LEGACY_CHAPTER_MAP;
    assert(map, '应导出第一卷旧章映射');
    const keys = Object.keys(map).map((value) => Number(value)).sort((left, right) => left - right);
    assert.deepStrictEqual(keys, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], '旧 0~11 章必须全部被映射');

    const actions = new Set(['merge_main', 'keep_main', 'downgrade_to_sidequest']);
    const sideQuestDowngrades = [];
    Object.entries(map).forEach(([legacyId, entry]) => {
        assert(entry.targetChapterId, `旧章节 ${legacyId} 缺少目标章`);
        assert(actions.has(entry.action), `旧章节 ${legacyId} 的 action 非法`);
        if (entry.action === 'downgrade_to_sidequest') {
            assert(entry.sideQuestId, `旧章节 ${legacyId} 下放支线时缺少 sideQuestId`);
            sideQuestDowngrades.push(entry.sideQuestId);
        }
    });
    assert.deepStrictEqual(sideQuestDowngrades.sort(), ['apothecary_boy_echo', 'old_medicine_ledger']);

    const exitChapter = StoryData.VOLUME_ONE_CHAPTERS.find((chapter) => chapter.id === 'volume_one_chapter_8');
    assert(exitChapter, '第一卷应存在升仙路口章节');
    assert.strictEqual(exitChapter.volumeRole, 'exit');
    assert(exitChapter.nextReads.length <= 3, '第一卷卷末跨卷读取点不应超过 3 条');
}

function testAdaptedVolumeContractMetadata() {
    assert(StoryData.VOLUME_CONTRACT, '应导出改编分卷合同');
    assert.strictEqual(StoryData.VOLUME_CONTRACT.kind, 'adapted_custom_volumes');
    assert.strictEqual(StoryData.VOLUME_CONTRACT.originalBoundaryGuarantee, false);
    assert(
        StoryData.VOLUME_CONTRACT.playerFacingNotes.some((note) => note.includes('不承诺与原著卷界一一对应')),
        '改编分卷合同应明确声明不承诺与原著卷界一一对应',
    );
    assert.strictEqual(StoryData.VOLUME_DISPLAY_META.volume_five_homecoming.originalNovelVolumeTitle, '名震一方');
    assert.strictEqual(StoryData.VOLUME_DISPLAY_META.volume_five_homecoming.isCustomFinalVolume, true);
}

function testVolumeOneMetadataScaffold() {
    const firstVolumeChapters = StoryData.STORY_CHAPTERS.filter((chapter) => typeof chapter.id === 'number' && chapter.id >= 0 && chapter.id <= 11);
    assert.strictEqual(firstVolumeChapters.length, 12, '应保留旧 0~11 章以供兼容映射');
    const legacySideQuests = StoryData.__LEGACY_SIDE_QUESTS_V1 || [];
    firstVolumeChapters.forEach((chapter) => {
        assert.strictEqual(chapter.volumeId, 'volume_one_qixuanmen', `章节 ${chapter.id} 缺少第一卷锚点`);
        assert(typeof chapter.volumeRole === 'string' && chapter.volumeRole.length > 0, `章节 ${chapter.id} 缺少卷内角色`);
        assert(typeof chapter.legacyVolumeTarget === 'string' && chapter.legacyVolumeTarget.length > 0, `章节 ${chapter.id} 缺少兼容目标章`);
    });

    const firstVolumeSeeds = StoryData.VOLUME_ONE_SIDE_QUEST_SEEDS;
    assert(Array.isArray(firstVolumeSeeds) && firstVolumeSeeds.length >= 2, '第一卷应导出支线种子');
    firstVolumeSeeds.forEach((seed) => {
        assert.strictEqual(seed.volumeAnchor, 'volume_one_qixuanmen');
        assert(['volume_close', 'seed_forward', 'convert_to_main'].includes(seed.closureMode), `支线 ${seed.id} closureMode 非法`);
        assert(Array.isArray(seed.linkedLegacyChapterIds) && seed.linkedLegacyChapterIds.length > 0, `支线 ${seed.id} 缺少旧章来源`);
    });

    ['old_medicine_ledger', 'apothecary_boy_echo'].forEach((questId) => {
        const quest = legacySideQuests.find((entry) => entry.id === questId);
        assert(quest, `支线 ${questId} 应存在`);
        assert.strictEqual(quest.volumeAnchor, 'volume_one_qixuanmen');
        assert(['volume_close', 'seed_forward', 'convert_to_main'].includes(quest.closureMode));
        assert(quest.followupHook && quest.followupHook.type && quest.followupHook.note, `支线 ${questId} 缺少卷末回收说明`);
    });
}

function testVolumeOneLegacyChapterLabelsUseRemappedVolumeStructure() {
    const chapter8View = getChapterChoiceView(8).view;
    assert.strictEqual(chapter8View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_one_qixuanmen', 7));
    assert.strictEqual(chapter8View.chapter.volumeChapterTitle, '七玄门风波');

    const chapter9View = getChapterChoiceView(9).view;
    assert.strictEqual(chapter9View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_one_qixuanmen', 7));
    assert.strictEqual(chapter9View.chapter.volumeChapterTitle, '七玄门风波');

    const chapter10View = getChapterChoiceView(10).view;
    assert.strictEqual(chapter10View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_one_qixuanmen', 8));
    assert.strictEqual(chapter10View.chapter.volumeChapterTitle, '升仙路口');

    const chapter11View = getChapterChoiceView(11).view;
    assert.strictEqual(chapter11View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_one_qixuanmen', 8));
    assert.strictEqual(chapter11View.chapter.volumeChapterTitle, '升仙路口');
}

function testVolumeTwoMetadataScaffold() {
    assert(Array.isArray(StoryData.VOLUME_TWO_CHAPTERS), '应导出第二卷 8 章结构');
    assert.strictEqual(StoryData.VOLUME_TWO_CHAPTERS.length, 8, '第二卷应固定为 8 章');

    const map = StoryData.VOLUME_TWO_LEGACY_CHAPTER_MAP;
    assert(map, '应导出第二卷旧素材映射');
    const keys = Object.keys(map).map((value) => Number(value)).sort((left, right) => left - right);
    assert.deepStrictEqual(keys, [10, 11, 12, 13, 14, 15, 16], '第二卷旧素材映射应覆盖当前 10~16 章边界');

    const actions = new Set(['reframe_runtime_material', 'forward_volume_boundary']);
    Object.entries(map).forEach(([legacyId, entry]) => {
        assert(entry.targetChapterId, `第二卷旧素材 ${legacyId} 缺少目标章`);
        assert(actions.has(entry.action), `第二卷旧素材 ${legacyId} action 非法`);
    });

    const exitChapter = StoryData.VOLUME_TWO_CHAPTERS.find((chapter) => chapter.id === 'volume_two_chapter_8');
    assert(exitChapter, '第二卷应存在卷末收束章节');
    assert.strictEqual(exitChapter.volumeRole, 'exit');
    assert.strictEqual(exitChapter.nextReads.length, 4, '第二卷卷末读取点应固定为 4 条');
}

function testVolumeTwoChapterLabelsUseRemappedVolumeStructure() {
    const chapter12View = getChapterChoiceView(12).view;
    assert.strictEqual(chapter12View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 1));
    assert.strictEqual(chapter12View.chapter.volumeChapterTitle, '离开旧地');

    const chapterDebtView = getChapterChoiceView('12_mortal_debt').view;
    assert.strictEqual(chapterDebtView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 2));
    assert.strictEqual(chapterDebtView.chapter.volumeChapterTitle, '凡俗旧债未清');

    const chapter13View = getChapterChoiceView(13, (state) => {
        GameCore.setRealmScore(state, 4);
    }).view;
    assert.strictEqual(chapter13View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 7));
    assert.strictEqual(chapter13View.chapter.volumeChapterTitle, '宗门人际与禁地前夜');

    const chapterCloseView = getChapterChoiceView('13_volume_close').view;
    assert.strictEqual(chapterCloseView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 8));
    assert.strictEqual(chapterCloseView.chapter.volumeChapterTitle, '此卷尽处');
}

function testVolumeTwoExitStopsBeforeForbiddenGroundBody() {
    const { state, view } = runUntilChapter(withInsertedChoices({
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
    }), '13_volume_close');

    assert.strictEqual(view.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 8));
    assert.strictEqual(view.chapter.volumeChapterTitle, '此卷尽处');
    const selectedChoice = view.choices.find((choice) => choice.id === 'enter_forbidden_ground_ready');
    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.storyProgress, 14, '第二卷卷末应把主线送到第 14 章第三卷入口');
    const nextView = GameCore.getStoryView(state);
    assert(nextView, '卷末推进后应立即出现下一章剧情');
    assert.strictEqual(nextView.chapter.id, 14);
    assert.notStrictEqual(nextView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_two_ascending_path', 8), '卷末后不应继续停留在第二卷');
}

function testVolumeThreeMetadataScaffold() {
    assert(Array.isArray(StoryData.VOLUME_THREE_CHAPTERS), '应导出第三卷 8 章结构');
    assert.strictEqual(StoryData.VOLUME_THREE_CHAPTERS.length, 8, '第三卷应固定为 8 章');

    const expectedLegacyIds = [14, 15, 16, 17, 18, '18_nangong_return', 19, 20];
    const actualLegacyIds = StoryData.VOLUME_THREE_CHAPTERS.flatMap((chapter) => [...(chapter.legacyChapterIds || [])]);
    assert.deepStrictEqual(actualLegacyIds, expectedLegacyIds, '第三卷旧素材映射应覆盖当前 14~20 主链并纳入 18_nangong_return');

    const exitChapter = StoryData.VOLUME_THREE_CHAPTERS.find((chapter) => chapter.id === 'volume_three_chapter_8');
    assert(exitChapter, '第三卷应存在卷末出口章节');
    assert.strictEqual(exitChapter.volumeRole, 'exit');
    assert.strictEqual(exitChapter.nextReads.length, 4, '第三卷卷末读取点应固定为 4 条');
}

function testVolumeThreeChapterLabelsUseRemappedVolumeStructure() {
    const chapter14View = getChapterChoiceView(14).view;
    assert.strictEqual(chapter14View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 1));
    assert.strictEqual(chapter14View.chapter.volumeChapterTitle, '血色禁地');

    const chapter18View = getChapterChoiceView(18, (state) => {
        GameCore.setRealmScore(state, 6);
    }).view;
    assert.strictEqual(chapter18View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 5));
    assert.strictEqual(chapter18View.chapter.volumeChapterTitle, '魔道争锋');

    const nangongFalloutView = getChapterChoiceView('18_nangong_return').view;
    assert.strictEqual(nangongFalloutView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 6));
    assert.strictEqual(nangongFalloutView.chapter.volumeChapterTitle, '并肩之后');

    const feiyuInsertView = getChapterChoiceView('16_feiyu_return').view;
    assert.strictEqual(feiyuInsertView.chapter.chapterLabel, '插章·旧友重逢');
    assert.strictEqual(feiyuInsertView.chapter.volumeChapterTitle, null);

    const chapter20View = getChapterChoiceView(20, (state) => {
        GameCore.setRealmScore(state, 7);
    }).view;
    assert.strictEqual(chapter20View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 8));
    assert.strictEqual(chapter20View.chapter.volumeChapterTitle, '再别天南');
}

function testVolumeThreeExitMovesToLaterAssets() {
    const { state, view } = runUntilChapter(withInsertedChoices({
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
        '13_volume_close': 'enter_forbidden_ground_ready',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        '16_feiyu_return': 'help_feiyu_again',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        '18_nangong_return': 'acknowledge_nangong_importance',
        19: 'hold_the_line',
    }), 20);

    assert.strictEqual(view.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 8));
    assert.strictEqual(view.chapter.volumeChapterTitle, '再别天南');
    const selectedChoice = view.choices.find((choice) => choice.id === 'go_star_sea');
    const result = GameCore.chooseStoryOption(state, selectedChoice.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.storyProgress, 21, '第三卷卷末应把主线送到第 21 章后续卷入口');
    const nextView = GameCore.getStoryView(state);
    assert(nextView, '卷末推进后应立即出现后续章节剧情');
    assert.strictEqual(nextView.chapter.id, 21);
    assert.notStrictEqual(nextView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_three_magic_invasion', 8), '卷末后不应继续停留在第三卷');
}

function testVolumeFourMetadataScaffold() {
    assert(Array.isArray(StoryData.VOLUME_FOUR_CHAPTERS), '应导出第四卷 8 章结构');
    assert.strictEqual(StoryData.VOLUME_FOUR_CHAPTERS.length, 8, '第四卷应固定为 8 章');

    const expectedLegacyIds = [21, '21_star_sea_foothold', 22, '22_xutian_rumor', 23, '23_star_sea_aftermath', '23_mocaihuan_return', '23_volume_close'];
    const actualLegacyIds = StoryData.VOLUME_FOUR_CHAPTERS.flatMap((chapter) => [...(chapter.legacyChapterIds || [])]);
    assert.deepStrictEqual(actualLegacyIds, expectedLegacyIds, '第四卷卷内 8 章应覆盖当前星海正文与新增过桥章节');

    const map = StoryData.VOLUME_FOUR_LEGACY_CHAPTER_MAP;
    assert(map, '应导出第四卷旧素材映射');
    assert.deepStrictEqual(
        Object.keys(map).sort(),
        ['21', '22', '23', '23_mocaihuan_return', '24', '25'].sort(),
        '第四卷旧素材映射应覆盖 21、22、23、23_mocaihuan_return 以及 24/25 的跨卷边界',
    );

    const actions = new Set(['keep_main', 'promote_to_main', 'forward_volume_boundary']);
    Object.entries(map).forEach(([legacyId, entry]) => {
        assert(entry.targetChapterId, `第四卷旧素材 ${legacyId} 缺少目标章`);
        assert(actions.has(entry.action), `第四卷旧素材 ${legacyId} action 非法`);
    });

    const exitChapter = StoryData.VOLUME_FOUR_CHAPTERS.find((chapter) => chapter.id === 'volume_four_chapter_8');
    assert(exitChapter, '第四卷应存在卷末出口章节');
    assert.strictEqual(exitChapter.volumeRole, 'exit');
    assert.strictEqual(exitChapter.nextReads.length, 4, '第四卷卷末读取点应固定为 4 条');
}

function testVolumeFourChapterLabelsUseRemappedVolumeStructure() {
    const chapter21View = getChapterChoiceView(21).view;
    assert.strictEqual(chapter21View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 1));
    assert.strictEqual(chapter21View.chapter.volumeChapterTitle, '初入星海');

    const footholdView = getChapterChoiceView('21_star_sea_foothold').view;
    assert.strictEqual(footholdView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 2));
    assert.strictEqual(footholdView.chapter.volumeChapterTitle, '海外立足');

    const chapter22View = getChapterChoiceView(22).view;
    assert.strictEqual(chapter22View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 3));
    assert.strictEqual(chapter22View.chapter.volumeChapterTitle, '虚天残图');

    const rumorView = getChapterChoiceView('22_xutian_rumor').view;
    assert.strictEqual(rumorView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 4));
    assert.strictEqual(rumorView.chapter.volumeChapterTitle, '风声四起');

    const chapter23View = getChapterChoiceView(23).view;
    assert.strictEqual(chapter23View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 5));
    assert.strictEqual(chapter23View.chapter.volumeChapterTitle, '虚天殿前后');

    const aftermathView = getChapterChoiceView('23_star_sea_aftermath').view;
    assert.strictEqual(aftermathView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 6));
    assert.strictEqual(aftermathView.chapter.volumeChapterTitle, '并肩余波');

    const mocaihuanView = getChapterChoiceView('23_mocaihuan_return').view;
    assert.strictEqual(mocaihuanView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 7));
    assert.strictEqual(mocaihuanView.chapter.volumeChapterTitle, '来信与重访');

    const closeView = getChapterChoiceView('23_volume_close').view;
    assert.strictEqual(closeView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 8));
    assert.strictEqual(closeView.chapter.volumeChapterTitle, '星海余波');
}

function testVolumeFiveMetadataScaffold() {
    assert(Array.isArray(StoryData.VOLUME_FIVE_CHAPTERS), '应导出第五卷 5 章结构');
    assert.strictEqual(StoryData.VOLUME_FIVE_CHAPTERS.length, 5, '第五卷应固定为 5 章');

    const expectedLegacyIds = [24, '24_old_debt_and_name', '24_bond_destination', 25, '25_final_branch'];
    const actualLegacyIds = StoryData.VOLUME_FIVE_CHAPTERS.flatMap((chapter) => [...(chapter.legacyChapterIds || [])]);
    assert.deepStrictEqual(actualLegacyIds, expectedLegacyIds, '第五卷 5 章应覆盖当前 24 / 25 与新增过桥章节');

    const map = StoryData.VOLUME_FIVE_LEGACY_CHAPTER_MAP;
    assert(map, '应导出第五卷旧素材映射');
    assert.deepStrictEqual(
        Object.keys(map).sort(),
        ['24', '24_old_debt_and_name', '24_bond_destination', '25', '25_final_branch'].sort(),
        '第五卷旧素材映射应覆盖 24、24_old_debt_and_name、24_bond_destination、25 与 25_final_branch',
    );

    const actions = new Set(['keep_main', 'expand_main', 'reframe_runtime_material']);
    Object.entries(map).forEach(([legacyId, entry]) => {
        assert(entry.targetChapterId, `第五卷旧素材 ${legacyId} 缺少目标章`);
        assert(actions.has(entry.action), `第五卷旧素材 ${legacyId} action 非法`);
    });
}

function testVolumeFiveChapterLabelsUseRemappedVolumeStructure() {
    const chapter24View = getChapterChoiceView(24).view;
    assert.strictEqual(chapter24View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 1));
    assert.strictEqual(chapter24View.chapter.volumeChapterTitle, '重返天南');

    const debtView = getChapterChoiceView('24_old_debt_and_name').view;
    assert.strictEqual(debtView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 2));
    assert.strictEqual(debtView.chapter.volumeChapterTitle, '旧账与旧名');

    const bondView = getChapterChoiceView('24_bond_destination').view;
    assert.strictEqual(bondView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 3));
    assert.strictEqual(bondView.chapter.volumeChapterTitle, '旧情去处');

    const chapter25View = getChapterChoiceView(25).view;
    assert.strictEqual(chapter25View.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 4));
    assert.strictEqual(chapter25View.chapter.volumeChapterTitle, '飞升前夜');

    const finalView = getChapterChoiceView('25_final_branch').view;
    assert.strictEqual(finalView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 5));
    assert.strictEqual(finalView.chapter.volumeChapterTitle, '门前问心');
}

function testVolumeFourEntryAndExitUseRemappedStructure() {
    const { state: entryState, view: entryView } = runUntilChapter(withInsertedChoices({
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
        '13_volume_close': 'enter_forbidden_ground_ready',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        '16_feiyu_return': 'help_feiyu_again',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        '18_nangong_return': 'acknowledge_nangong_importance',
        19: 'hold_the_line',
        20: 'go_star_sea',
    }), 21);

    assert.strictEqual(entryView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 1));
    assert.strictEqual(entryView.chapter.volumeChapterTitle, '初入星海');
    let result = GameCore.chooseStoryOption(entryState, 'hunt_monsters');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(entryState.storyProgress, '21_star_sea_foothold');
    let nextView = GameCore.getStoryView(entryState);
    assert(nextView, '第四卷入口推进后应立即进入卷内第二章');
    assert.strictEqual(nextView.chapter.id, '21_star_sea_foothold');
    assert.strictEqual(nextView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 2));

    const { state: exitState, view: exitView } = runUntilChapter(withInsertedChoices({
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
        12: 'send_word_back',
        '12_mortal_debt': 'return_mortal_debt',
        '12_tainan_market': 'take_black_route',
        '12_token_kill': 'trade_information_for_entry',
        '12_enter_yellow_maple': 'enter_as_low_profile_disciple',
        '12_herb_garden': 'build_connections',
        13: 'align_with_fellow_disciples',
        '13_volume_close': 'enter_forbidden_ground_ready',
        14: 'save_nangong',
        15: 'accept_nangong_debt',
        16: 'become_li_disciple',
        '16_feiyu_return': 'help_feiyu_again',
        17: 'show_strength_banquet',
        18: 'fight_for_sect',
        '18_nangong_return': 'acknowledge_nangong_importance',
        19: 'hold_the_line',
        20: 'go_star_sea',
        21: 'hunt_monsters',
        '21_star_sea_foothold': 'claim_hunter_route',
        22: 'collect_map',
        '22_xutian_rumor': 'bind_allies_before_entering',
        23: 'cooperate_allies',
        '23_star_sea_aftermath': 'honor_alliance_after_palace',
        '23_mocaihuan_return': 'support_mocaihuan_longterm',
    }), '23_volume_close');

    assert.strictEqual(exitView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 8));
    assert.strictEqual(exitView.chapter.volumeChapterTitle, '星海余波');
    exitState.levelStoryState.events.yu_10 = { triggered: true, completed: true };
    GameCore.setRealmScore(exitState, 10);
    GameCore.recalculateState(exitState, false);
    result = GameCore.chooseStoryOption(exitState, 'follow_old_alliances_home');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(exitState.storyProgress, 24, '第四卷卷末应把主线送到第五卷第 1 章');
    nextView = GameCore.getStoryView(exitState);
    assert(nextView, '第四卷卷末推进后应立即出现第 24 章剧情');
    assert.strictEqual(nextView.chapter.id, 24);
    assert.strictEqual(nextView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_five_homecoming', 1));
    assert.notStrictEqual(nextView.chapter.chapterLabel, formatAdaptedVolumeLabel('volume_four_overseas', 8), '卷末后不应继续停留在第四卷');
}

function getVolumeOneExitArcTexts(configure) {
    const chapter10 = getChapterChoiceView(10, (state) => {
        GameCore.setRealmScore(state, 3);
        if (configure) {
            configure(state);
        }
    }).view.story.beats.map((item) => item.text).join('\n');
    const chapter11 = getChapterChoiceView(11, (state) => {
        if (configure) {
            configure(state);
        }
    }).view.story.beats.map((item) => item.text).join('\n');
    return `${chapter10}\n${chapter11}`;
}

function assertTextContainsOneOf(text, fragments, message) {
    assert(fragments.some((fragment) => text.includes(fragment)), message);
}

function assertTextContainsNone(text, fragments, message) {
    assert(fragments.every((fragment) => !text.includes(fragment)), message);
}

function testVolumeOneLateArcLegacyProgressStaysReadable() {
    const scenarios = [
        {
            progress: 8,
            configure(state) {
                state.flags.protectedMoHouse = true;
            },
            expectedVolumeTitle: '七玄门风波',
        },
        {
            progress: 9,
            configure(state) {
                state.flags.hasQuhun = true;
                state.flags.keptQuhun = true;
                state.npcRelations['墨彩环'] = 25;
            },
            expectedVolumeTitle: '七玄门风波',
        },
        {
            progress: 10,
            configure(state) {
                GameCore.setRealmScore(state, 3);
                state.flags.fulfilledMoWill = true;
            },
            expectedVolumeTitle: '升仙路口',
        },
        {
            progress: 11,
            configure(state) {
                state.flags.hasShengxianling = true;
            },
            expectedVolumeTitle: '升仙路口',
        },
    ];

    scenarios.forEach(({ progress, configure, expectedVolumeTitle }) => {
        const state = GameCore.mergeSave({ storyProgress: progress });
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
        GameCore.ensureStoryCursor(state);

        const view = GameCore.getStoryView(state);
        assert(view, `旧存档 storyProgress=${progress} 不应出现空剧情`);
        assert.strictEqual(view.source, 'main');
        assert.strictEqual(view.chapter.volumeChapterTitle, expectedVolumeTitle);
        assert.strictEqual(view.chapter.chapterLabel.startsWith(`${ADAPTED_VOLUME_LABELS.volume_one_qixuanmen}·第 `), true);
    });
}

function testVolumeOneLedgerClosureReadsReturnLedgersPath() {
    const text = getVolumeOneExitArcTexts((state) => {
        state.flags.fulfilledMoWill = true;
        state.flags.returnedOldMedicineLedger = true;
        state.npcRelations['墨彩环'] = 55;
    });
    assert(text.includes('墨府'), '旧药账归还路径的卷末解释应继续指向墨府');
    assertTextContainsOneOf(text, ['活人', '交回', '账页'], '旧药账归还路径应在卷末主线解释“账已回到活人手里”');
}

function testVolumeOneLedgerClosureReadsNamesOnlyPath() {
    const text = getVolumeOneExitArcTexts((state) => {
        state.flags.keptMedicineLedgerNamesOnly = true;
        state.flags.fulfilledMoWill = true;
        state.npcRelations['墨彩环'] = 20;
    });
    assertTextContainsOneOf(text, ['旧账', '墨府'], '只留名字路径仍应被卷末主线认作一笔旧账');
    assertTextContainsOneOf(text, ['名字', '按住', '压住'], '只留名字路径应在卷末主线明确解释为“先把账按住”');
}

function testVolumeOneApothecaryClosureReadsTracePath() {
    const text = getVolumeOneExitArcTexts((state) => {
        state.flags.tracedApothecaryBoyEcho = true;
        state.flags.keptQuhun = true;
        state.flags.quhunIdentityMystery = true;
        state.npcRelations['墨彩环'] = 30;
    });
    assertTextContainsOneOf(text, ['药童', '旧案', '残影'], '药童残影追查路径应在卷末主线继续被点名');
    assertTextContainsOneOf(text, ['记住', '追索', '带着'], '追查路径应在卷末主线明确说明这件事被记住并带上路');
}

function testVolumeOneApothecaryClosureReadsSealPath() {
    const text = getVolumeOneExitArcTexts((state) => {
        state.flags.sealedQuhun = true;
        state.flags.quhunIdentityMystery = true;
        state.npcRelations['墨彩环'] = 35;
    });
    assertTextContainsOneOf(text, ['曲魂', '残影', '旧案'], '压下残影路径应在卷末主线继续解释曲魂或旧案');
    assertTextContainsOneOf(text, ['压下', '封住', '不再继续', '没有回答'], '压下残影路径应在卷末主线明确说明是暂时封住而非完全消失');
}

function testLateVolumeHooksAvoidMetaThesisLines() {
    const banned = [
        '这一章真正留下的',
        '这一卷真正',
        '真正的问题已经不再是',
        '到了这里，真正要收拢的',
    ];

    const expectations = [
        {
            chapterId: 12,
            summary: '越国边境风硬，回头路也硬。你还没走远，旧地的人与事却已经开始在背后追。',
            hookField: 'echoBeat',
            hookText: '官道拐向太南山时，你终于把最后一次回头忍住了。前路还没稳，旧地也没断，只是从这一步起，它再不会替你挡风。',
        },
        {
            chapterId: '12_mortal_debt',
            summary: '嘉元城门没变，变的是门里那些等不起的人。',
            hookField: 'echoBeat',
            hookText: '你走出嘉元城时没有比来时轻松多少，只是终于知道：这地方欠你的会疼，你欠这地方的也会疼。',
        },
        {
            chapterId: 23,
            summary: '虚天将开，海雾里每一句“同行”都像先写好的试探。',
            hookField: 'echoBeat',
            hookText: '殿门后的风还带着盐气，你却先记住了是谁在最窄那一步伸手，谁在最窄那一步松手。',
        },
        {
            chapterId: 24,
            summary: '天南风物仍旧，认你的人却已经不是当年那一批。',
            hookField: 'echoBeat',
            hookText: '你才踏进天南几步，旧屋、门墙和故人的名字便一个接一个撞了上来，谁都没打算让你安静路过。',
        },
        {
            chapterId: 25,
            summary: '天门未开，案上的旧物先把你这一生照亮了一半。',
            hookField: 'beats',
            hookText: '天门就在前头，案上的旧物和身后的旧人却把去路逼得比雷声还窄。',
        },
        {
            chapterId: '25_final_branch',
            summary: '门前无人催你，倒是一路没说完的话先挤到了喉间。',
            hookField: 'echoBeat',
            hookText: '门槛就在脚边，你若还把话往后拖，这阵风会先替你把那份迟疑吹回耳边。',
        },
    ];

    expectations.forEach(({ chapterId, summary: expectedSummary, hookField, hookText: expectedHookText }) => {
        const texts = getChapterTexts(chapterId);
        const actualHookText = hookField === 'beats'
            ? (texts.beats.find((item) => item === expectedHookText) || '')
            : (texts[hookField] || '');
        assert.strictEqual(texts.summary, expectedSummary, `章节 ${chapterId} summary 不匹配`);
        if (hookField === 'beats') {
            assert(texts.beats.includes(expectedHookText), `章节 ${chapterId} beats 未命中目标 hook`);
        } else {
            assert.strictEqual(actualHookText, expectedHookText, `章节 ${chapterId} ${hookField} 不匹配`);
        }
        assertTextContainsNone(actualHookText, banned, `章节 ${chapterId} 目标 hook 文案仍带有作者总结腔`);
    });
}

function createCommissionState(locationName, realmScore, configure) {
    const state = GameCore.createInitialState();
    state.currentLocation = locationName;
    GameCore.setRealmScore(state, realmScore);
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
    GameCore.recalculateState(state, false);
    GameCore.syncCommissionAvailability(state);
    return state;
}

function testCommissionAuthoringContract() {
    assert.strictEqual(Array.isArray(GameCore.LOCATION_COMMISSIONS_V1), true);
    GameCore.LOCATION_COMMISSIONS_V1.forEach((commission) => {
        [
            'id',
            'title',
            'boardLabel',
            'category',
            'location',
            'minRealmScore',
            'maxRealmScore',
            'detail',
            'rewardPreview',
            'choices',
        ].forEach((field) => {
            assert(commission[field] !== undefined, `委托 ${commission.id || 'unknown'} 缺少字段 ${field}`);
        });
        assert(Array.isArray(commission.choices), `委托 ${commission.id} choices 应为数组`);
        assert(commission.choices.length > 0, `委托 ${commission.id} 需要至少一个选择`);
    });

    const byId = GameCore.LOCATION_COMMISSIONS_V1.reduce((result, commission) => {
        result[commission.id] = commission;
        return result;
    }, {});

    assert.strictEqual(byId.qingniu_medicine_delivery.title, '山路送药');
    assert.strictEqual(byId.qingniu_medicine_delivery.rewardPreview, '灵石 x4 · 灵草 x1');
    assert.strictEqual(byId.qingniu_medicine_delivery.choices[0].id, 'take_short_path');
    assert.strictEqual(byId.qingniu_medicine_delivery.choices[1].id, 'take_safe_path');

    assert.strictEqual(byId.qingniu_rear_hill_noise.title, '后山异响');
    assert.strictEqual(byId.qingniu_rear_hill_noise.choices[1].resultState, 'failed');

    assert.strictEqual(byId.qingniu_lost_ox.title, '失牛与雾');
    assert.strictEqual(byId.qingniu_lost_ox.rewardPreview, '灵石 x5 · 灵草 x2');

    assert.strictEqual(byId.qingniu_dawn_dew.title, '采露换符');
    assert.strictEqual(byId.qingniu_dawn_dew.choices[0].id, 'deliver_every_drop');
    assert.strictEqual(byId.qingniu_dawn_dew.choices[1].id, 'keep_half_for_yourself');

    assert.strictEqual(byId.tainan_fake_cinnabar.title, '摊前假丹砂');
    assert.strictEqual(byId.tainan_fake_cinnabar.rewardPreview, '灵石 x9 · 灵草 x1');

    assert.strictEqual(byId.tainan_cave_scout.title, '洞府探风');
    assert.strictEqual(byId.tainan_cave_scout.choices[1].resultState, 'failed');

    assert.strictEqual(byId.tainan_night_cargo.title, '夜路押货');
    assert.strictEqual(byId.tainan_night_cargo.rewardPreview, '灵石 x7 · 解毒散 x1');

    assert.strictEqual(byId.tainan_material_purchase.title, '代购灵材');
    assert.strictEqual(byId.tainan_material_purchase.choices[1].resultState, 'failed');

    const qingniuMeta = GameCore.getCommissionBoardMeta({ currentLocation: '青牛镇' });
    assert.strictEqual(qingniuMeta.title, '坊间委托');
    assert.strictEqual(qingniuMeta.emptyTitle, '此地眼下暂无委托');
    assert(qingniuMeta.emptyDetail.includes('镇口告示板'));

    const tainanMeta = GameCore.getCommissionBoardMeta({ currentLocation: '太南山' });
    assert.strictEqual(tainanMeta.title, '山市委托');
    assert.strictEqual(tainanMeta.emptyTitle, '此地眼下暂无委托');
    assert(tainanMeta.emptyDetail.includes('摊风'));

    const defaultMeta = GameCore.getCommissionBoardMeta({ currentLocation: '未知之地' });
    assert.strictEqual(defaultMeta.title, '地点委托');
    assert.strictEqual(defaultMeta.emptyTitle, '此地眼下暂无委托');
    assert(defaultMeta.emptyDetail.includes('修为'));
}

function testCommissionFailureOutcome() {
    const state = createCommissionState('青牛镇', 0);
    const accepted = GameCore.acceptCommission(state, 'qingniu_rear_hill_noise');
    assert.strictEqual(accepted.ok, true);
    const resolved = GameCore.chooseCommissionOption(state, 'qingniu_rear_hill_noise', 'strike_first');
    assert.strictEqual(resolved.ok, true);
    assert.strictEqual(state.commissions.qingniu_rear_hill_noise.state, 'failed');
    assert.strictEqual(state.commissions.qingniu_rear_hill_noise.lastResult.outcome, 'failed');
}

function testCommissionHappyPath() {
    const state = createCommissionState('青牛镇', 0);
    const beforeLingshi = state.inventory.lingshi || 0;
    const beforeLingcao = state.inventory.lingcao || 0;
    const accepted = GameCore.acceptCommission(state, 'qingniu_medicine_delivery');
    assert.strictEqual(accepted.ok, true);

    const resolved = GameCore.chooseCommissionOption(state, 'qingniu_medicine_delivery', 'take_short_path');
    assert.strictEqual(resolved.ok, true);
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.state, 'completed');

    const afterLingshi = state.inventory.lingshi || 0;
    const afterLingcao = state.inventory.lingcao || 0;
    assert(afterLingshi > beforeLingshi || afterLingcao > beforeLingcao, '应至少发放灵石或灵草奖励');

    const retry = GameCore.chooseCommissionOption(state, 'qingniu_medicine_delivery', 'take_short_path');
    assert.strictEqual(retry.ok, false);
}

function testCommissionSaveMigrationV8() {
    const legacyState = GameCore.createInitialState();
    legacyState.version = 7;
    legacyState.currentLocation = '青牛镇';
    legacyState.sideQuests = {
        old_medicine_ledger: {
            questId: 'old_medicine_ledger',
            state: 'completed',
            selectedChoiceId: 'return_ledgers',
            lastResult: {
                outcome: 'completed',
                choiceId: 'return_ledgers',
                summary: '旧药账已了结。',
                detail: '旧系统遗留记录，应在 v8 导入时被丢弃。',
            },
        },
    };

    const migrated = GameCore.mergeSave(JSON.parse(JSON.stringify(legacyState)));
    assert.strictEqual(migrated.version, 8);
    assert.strictEqual(Array.isArray(GameCore.LOCATION_COMMISSIONS_V1), true);
    assert.strictEqual(typeof migrated.commissions, 'object');
    assert.strictEqual(migrated.sideQuests, undefined);
    assert.strictEqual(
        Object.keys(migrated.commissions).length,
        GameCore.LOCATION_COMMISSIONS_V1.length,
        'v8 存档应按新委托表重建 commissions',
    );
    assert.strictEqual(migrated.commissions.qingniu_medicine_delivery.state, 'available');
    assert.strictEqual(migrated.commissions.tainan_fake_cinnabar.state, 'hidden');
}

function testInitialCommissionBoardUsesLocationAndRealm() {
    const qingniuState = createCommissionState('青牛镇', 0);
    const tainanLowState = createCommissionState('太南山', 1);
    const tainanReadyState = createCommissionState('太南山', 2);

    assert.deepStrictEqual(
        GameCore.getVisibleCommissions(qingniuState).map((entry) => entry.id).sort(),
        [
            'qingniu_medicine_delivery',
            'qingniu_rear_hill_noise',
            'qingniu_lost_ox',
            'qingniu_dawn_dew',
        ].sort(),
    );
    assert.strictEqual(GameCore.getVisibleCommissions(tainanLowState).length, 0);
    assert.deepStrictEqual(
        GameCore.getVisibleCommissions(tainanReadyState).map((entry) => entry.id).sort(),
        [
            'tainan_fake_cinnabar',
            'tainan_cave_scout',
            'tainan_night_cargo',
            'tainan_material_purchase',
        ].sort(),
    );
}

function testCommissionActiveLimitAndResolution() {
    const state = createCommissionState('青牛镇', 0);
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.availableAtRealmScore, GameCore.getRealmScore(state));
    const firstAccept = GameCore.acceptCommission(state, 'qingniu_medicine_delivery');
    assert.strictEqual(firstAccept.ok, true);
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.state, 'active');
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.acceptedAtRealmScore, GameCore.getRealmScore(state));

    const secondAccept = GameCore.acceptCommission(state, 'qingniu_lost_ox');
    assert.strictEqual(secondAccept.ok, false);
    assert.strictEqual(secondAccept.error, '另有委托在身，请先把手头这一笔收住。');

    const resolveResult = GameCore.chooseCommissionOption(state, 'qingniu_medicine_delivery', 'take_safe_path');
    assert.strictEqual(resolveResult.ok, true);
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.state, 'completed');
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.selectedChoiceId, 'take_safe_path');
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.lastResult.summary, '你绕开了最险的山坳，把人和药都安稳送到了。');
    assert.strictEqual(state.commissions.qingniu_medicine_delivery.resolvedAtRealmScore, GameCore.getRealmScore(state));
}

function testCommissionFailurePathIsLocal() {
    const state = createCommissionState('太南山', 2);
    const acceptResult = GameCore.acceptCommission(state, 'tainan_cave_scout');
    assert.strictEqual(acceptResult.ok, true);

    const failResult = GameCore.chooseCommissionOption(state, 'tainan_cave_scout', 'step_into_trap');
    assert.strictEqual(failResult.ok, true);
    assert.strictEqual(state.commissions.tainan_cave_scout.state, 'failed');
    assert.strictEqual(state.commissions.tainan_cave_scout.lastResult.outcome, 'failed');
    assert.strictEqual(state.commissions.tainan_cave_scout.lastResult.summary, '你想再多探一层，结果踩塌了洞里的旧陷阵。');
}

function testExpeditionRumorPointsToVisibleCommission() {
    const state = createCommissionState('太南山', 2);
    const result = GameCore.resolveExpedition(state, () => 0.99);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.type, 'commission');
    assert(result.summary.includes('你在 太南山 听见一笔委托风声'));
    assert(
        result.summary.includes('摊前假丹砂')
        || result.summary.includes('洞府探风')
        || result.summary.includes('夜路押货')
        || result.summary.includes('代购灵材'),
        '风声事件应引用当前地点可见委托标题',
    );
}

function testExpeditionClueFallsBackWhenNoVisibleCommission() {
    const state = createCommissionState('七玄门', 0, (draft) => {
        draft.storyProgress = 8;
        draft.flags.protectedMoHouse = true;
        draft.npcRelations['墨彩环'] = -1;
    });
    const result = GameCore.resolveExpedition(state, () => 0.99);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.type, 'clue');
    assert(result.summary.includes('旧药账'));
}

function testCompletedCommissionStaysLocalToItsLocation() {
    const state = createCommissionState('青牛镇', 0);
    const accepted = GameCore.acceptCommission(state, 'qingniu_medicine_delivery');
    assert.strictEqual(accepted.ok, true);
    const resolved = GameCore.chooseCommissionOption(state, 'qingniu_medicine_delivery', 'take_safe_path');
    assert.strictEqual(resolved.ok, true);

    state.currentLocation = '太南山';
    GameCore.setRealmScore(state, 2);
    GameCore.syncCommissionAvailability(state);
    const visible = GameCore.getVisibleCommissions(state);
    assert.strictEqual(visible.some((entry) => entry.id === 'qingniu_medicine_delivery'), false);
    assert(
        visible.some((entry) => entry.id === 'tainan_fake_cinnabar')
        && visible.some((entry) => entry.id === 'tainan_cave_scout')
        && visible.some((entry) => entry.id === 'tainan_night_cargo')
        && visible.some((entry) => entry.id === 'tainan_material_purchase'),
        '太南山委托仍应可见',
    );
}

testStoryCursorSwitching();
testAlchemyRecipeCraftingSuccess();
testAlchemyRecipeInsufficientMaterialsDoesNotPolluteInventory();
testHighTierBreakthroughPillRestrictions();
testMainPathIntegrity();
testMoHouseTreasurePathNoDeadlock();
testLevelEventCoverage();
testBreakthroughQueuesLevelStory();
testMissedLevelStoryCanRecover();
testProfileCollapseSaveCompatibility();
testUnsupportedLegacySaveVersionRejected();
testChoiceEchoStateUpdates();
testPendingEchoesStayHiddenFromVisibleFeed();
testChoiceTextsHideTradeoffPreview();
testBattleWillBonusesAffectStats();
testLevelChoiceOutcomeStateUpdates();
testSamePromiseChoicesCreateDistinctBranchImpacts();
testLegacySaveFallbackCreatesBranchImpacts();
testTribulationDeathEnding();
testPressureTierBoundaries();
testResourceValidation();
testMineChoicesBecomeRouteSpecific();
testChapter15ChoiceFlags();
testChapter16ChoiceFlags();
testChapter22ChoiceFlags();
testInsertedReturnArcFlags();
testChapter24ChoicesStayVisibleAndUseDebtHooks();
testLateGameGeneratedHintsContract();
testEarlyChapterGeneratedHintsStayNeutral();
testLateVolumeGeneratedHintsFollowVolumeMetadata();
testLateStringChapterGeneratedHintsStayLate();
testEndingChoiceVisibilityTracksStoryState();
testChapterEchoesStayConcrete();
testReturnHomeCharacterChaptersUseLiveDialogue();
testChapter17BeatsAndFlags();
testChapter19RouteChoices();
testChapter21StarSeaFlags();
testChapter23BranchChoices();
testEchoesAndSideStoriesIncludeNewSignals();
testNpcDialogueUsesChapterEchoes();
testEndingEchoTextsStayReflective();
testLateGameEchoesUseSceneHooks();
testLateGameEndingDescriptionsLandOnScenes();
testStringChapterLogsNoNaN();
testStoryPagingState();
testMainStoryChoiceQueuesUnreadForNextChapter();
testMainStoryChoiceKeepsReadStateInsideStoryTab();
testReadStoryDoesNotRelightUnreadOnRestore();
testBlockedMainChapterHintStaysConcrete();
testChapter10BidTokenAwardsShengxianling();
testBranchEchoes();
testExplicitBranchImpactCoverage();
testVolumeOneRemapCoverage();
testAdaptedVolumeContractMetadata();
testVolumeOneMetadataScaffold();
testVolumeOneLegacyChapterLabelsUseRemappedVolumeStructure();
testVolumeTwoMetadataScaffold();
testVolumeTwoChapterLabelsUseRemappedVolumeStructure();
testVolumeTwoExitStopsBeforeForbiddenGroundBody();
testVolumeThreeMetadataScaffold();
testVolumeThreeChapterLabelsUseRemappedVolumeStructure();
testVolumeThreeExitMovesToLaterAssets();
testVolumeFourMetadataScaffold();
testVolumeFourChapterLabelsUseRemappedVolumeStructure();
testVolumeFiveMetadataScaffold();
testVolumeFiveChapterLabelsUseRemappedVolumeStructure();
testVolumeFourEntryAndExitUseRemappedStructure();
testVolumeOneLateArcLegacyProgressStaysReadable();
testVolumeOneLedgerClosureReadsReturnLedgersPath();
testVolumeOneLedgerClosureReadsNamesOnlyPath();
testVolumeOneApothecaryClosureReadsTracePath();
testVolumeOneApothecaryClosureReadsSealPath();
testLateVolumeHooksAvoidMetaThesisLines();
testCommissionAuthoringContract();
testCommissionFailureOutcome();
testCommissionHappyPath();
testCommissionSaveMigrationV8();
testInitialCommissionBoardUsesLocationAndRealm();
testCommissionActiveLimitAndResolution();
testCommissionFailurePathIsLocal();
testExpeditionRumorPointsToVisibleCommission();
testExpeditionClueFallsBackWhenNoVisibleCommission();
testCompletedCommissionStaysLocalToItsLocation();

console.log('story smoke passed');
