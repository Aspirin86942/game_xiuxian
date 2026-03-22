const GameCore = require('../../../game-core.js');
const StoryData = require('../../../story-data.js');

const STORAGE_KEY = StoryData.STORAGE_KEY;

function cloneState(state) {
    return JSON.parse(GameCore.serializeState(state));
}

function setRealmScore(state, score) {
    GameCore.setRealmScore(state, score);
    GameCore.recalculateState(state, true);
}

function satisfyChapterRequirements(state, chapterId) {
    const chapter = GameCore.getChapterById(chapterId);
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
        Object.entries(requirements.flagsAll).forEach(([flagName, value]) => {
            state.flags[flagName] = value;
        });
    }
    GameCore.recalculateState(state, false);
}

function formatRenderedStoryTitle(state) {
    const view = GameCore.getStoryView(state);
    if (!view) {
        return '暂无新剧情';
    }
    if (view.mode === 'ending') {
        return view.ending.title;
    }

    const sourceLabel = view.source === 'level'
        ? '小境界事件'
        : view.chapter.chapterLabel || (typeof view.chapter.id === 'number' ? `第 ${view.chapter.id + 1} 章` : '主线章节');
    const chapterTitle = view.source === 'level' ? view.chapter.title : (view.chapter.volumeChapterTitle || view.chapter.title);
    return `${sourceLabel} · ${chapterTitle}`;
}

function formatRenderedStoryProgress(state) {
    const view = GameCore.getStoryView(state);
    if (!view) {
        return '暂无可翻阅章节';
    }
    if (view.mode === 'ending') {
        return '终局';
    }
    const totalPages = view.story.beats.length;
    const currentPage = Math.min(totalPages, state.storyCursor.beatIndex + 1);
    return view.mode === 'choices'
        ? `第 ${totalPages} / ${totalPages} 页 · 抉择`
        : `第 ${currentPage} / ${totalPages} 页`;
}

function playCurrentStoryToChoices(state) {
    GameCore.ensureStoryCursor(state);
    let view = GameCore.getStoryView(state);
    while (view && view.mode === 'playing') {
        GameCore.advanceStoryBeat(state);
        view = GameCore.getStoryView(state);
    }
    return view;
}

function pickAvailableChoice(view, preferredId) {
    if (!view || !Array.isArray(view.choices) || view.choices.length === 0) {
        return null;
    }
    return view.choices.find((choice) => choice.id === preferredId && !choice.disabled)
        || view.choices.find((choice) => !choice.disabled)
        || view.choices[0];
}

function createChoiceState(chapterId, configure) {
    const state = GameCore.createInitialState();
    state.storyProgress = chapterId;
    state.ui.activeTab = 'story';
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
    satisfyChapterRequirements(state, chapterId);
    GameCore.ensureStoryCursor(state);
    GameCore.skipStoryPlayback(state);
    return state;
}

function fillInventoryWithSamples(state, limit = 18) {
    Object.keys(StoryData.ITEMS).slice(0, limit).forEach((itemId, index) => {
        state.inventory[itemId] = Math.max(1, index + 1);
    });
}

function createSerializedState(mutator) {
    const state = GameCore.createInitialState();
    if (mutator) {
        mutator(state);
    }
    GameCore.ensureStoryCursor(state);
    return {
        state,
        serialized: GameCore.serializeState(state),
    };
}

function createFreshScenario() {
    const { state, serialized } = createSerializedState();
    return {
        serialized,
        expectedRealmLabel: GameCore.getRealmLabel(state),
        expectedPlayerName: state.playerName,
    };
}

function createAlchemyScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.ui.activeTab = 'alchemy';
        draft.inventory.lingcao = 4;
        draft.inventory.lingshi = 20;
        draft.inventory.yaodan = 1;
        draft.playerStats.hp = 28;
        draft.recovery.lastCheckedAt = 1_710_000_000_000;
    });
    const previewState = cloneState(state);
    const craftResult = GameCore.craftRecipe(previewState, 'brew-jiedusan');
    return {
        serialized,
        recipeId: 'brew-jiedusan',
        expectedRuleTextFragment: '非战斗时每',
        expectedState: {
            inventory: previewState.inventory,
            outputText: craftResult.outputText,
        },
    };
}

function createTrainingScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.inventory.lingshi = 12;
        draft.cultivation = draft.maxCultivation - 20;
        draft.ui.activeTab = 'cultivation';
    });

    const afterTraining = cloneState(state);
    GameCore.trainWithLingshi(afterTraining, '10');

    const afterBreakthrough = cloneState(afterTraining);
    GameCore.attemptBreakthrough(afterBreakthrough, () => 0);

    return {
        serialized,
        initialState: {
            cultivationText: `${state.cultivation}/${state.maxCultivation}`,
            lingshi: state.inventory.lingshi,
            realmLabel: GameCore.getRealmLabel(state),
        },
        afterTraining: {
            cultivationText: `${afterTraining.cultivation}/${afterTraining.maxCultivation}`,
            lingshi: afterTraining.inventory.lingshi,
            mainButtonText: '渡劫突破',
        },
        afterBreakthrough: {
            realmLabel: GameCore.getRealmLabel(afterBreakthrough),
            cultivationText: `${afterBreakthrough.cultivation}/${afterBreakthrough.maxCultivation}`,
            realmIndex: afterBreakthrough.realmIndex,
            stageIndex: afterBreakthrough.stageIndex,
        },
    };
}

function createStoryScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.ui.activeTab = 'story';
    });

    const initialView = GameCore.getStoryView(state);
    const secondBeatState = cloneState(state);
    GameCore.advanceStoryBeat(secondBeatState);
    const continuedView = GameCore.getStoryView(secondBeatState);

    const choiceState = cloneState(state);
    GameCore.skipStoryPlayback(choiceState);
    const choiceView = GameCore.getStoryView(choiceState);
    const selectedChoice = choiceView.choices.find((choice) => choice.id === 'set_out_now' && !choice.disabled)
        || choiceView.choices.find((choice) => !choice.disabled)
        || choiceView.choices[0];

    const afterChoiceState = cloneState(choiceState);
    GameCore.chooseStoryOption(afterChoiceState, selectedChoice.id);
    const impact = GameCore.getEchoes(afterChoiceState)[0] || { title: '', detail: '', meta: '' };

    return {
        serialized,
        initialLine: initialView.currentBeat ? initialView.currentBeat.text : '',
        continuedLine: continuedView && continuedView.currentBeat ? continuedView.currentBeat.text : '',
        continuedProgressText: formatRenderedStoryProgress(secondBeatState),
        choiceId: selectedChoice.id,
        expectedChoiceMeta: {
            promiseLabel: selectedChoice.promiseLabel,
            riskLabel: selectedChoice.riskLabel,
            visibleCostLabel: selectedChoice.visibleCostLabel,
        },
        initialPressureText: GameCore.getPressureStatusText(choiceState),
        expectedPressureText: GameCore.getPressureStatusText(afterChoiceState),
        expectedTitle: formatRenderedStoryTitle(afterChoiceState),
        expectedStoryProgress: afterChoiceState.storyProgress,
        expectedImpact: {
            title: impact.title,
            detail: impact.detail,
            meta: impact.meta || '',
        },
    };
}

function createReadStoryAwayScenario() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'cultivation';
    state.unreadStory = false;

    return {
        serialized: GameCore.serializeState(state),
    };
}

function createBlockedMainChapterScenario() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'story';
    state.storyProgress = 10;
    state.unreadStory = false;
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

    return {
        serialized: GameCore.serializeState(state),
        expectedHint: '主线《太南小会》待解锁：需先修至筑基初期。升仙令线会在满足条件后继续。',
        expectedGoal: '主线《太南小会》待解锁：需先修至筑基初期。升仙令线会在满足条件后继续。',
    };
}

function createShengxianlingChapterScenario() {
    const state = createChoiceState(10, (draft) => {
        draft.inventory.lingshi = 20;
        draft.flags.fulfilledMoWill = true;
    });
    const view = GameCore.getStoryView(state);
    const bidChoice = view.choices.find((choice) => choice.id === 'bid_token');
    const previewState = cloneState(state);
    GameCore.chooseStoryOption(previewState, bidChoice.id);

    return {
        serialized: GameCore.serializeState(state),
        choiceId: bidChoice.id,
        choiceText: bidChoice.text,
        expectedTitle: formatRenderedStoryTitle(previewState),
        expectedTokenCount: previewState.inventory.shengxianling,
    };
}

function createVolumeOneLedgerClosureScenario() {
    const state = createChoiceState(10, (draft) => {
        GameCore.setRealmScore(draft, 3);
        draft.flags.protectedMoHouse = true;
        draft.flags.fulfilledMoWill = true;
        draft.npcRelations['墨彩环'] = 36;
    });
    GameCore.getVisibleSideQuests(state);
    GameCore.acceptSideQuest(state, 'old_medicine_ledger');
    GameCore.chooseSideQuestOption(state, 'old_medicine_ledger', 'return_ledgers');
    state.storyCursor = {
        source: 'main',
        storyId: null,
        chapterId: null,
        beatIndex: 0,
        mode: 'idle',
    };
    GameCore.ensureStoryCursor(state);

    return {
        serialized: GameCore.serializeState(state),
        questId: 'old_medicine_ledger',
        expectedTitle: formatRenderedStoryTitle(state),
        expectedKeywordGroups: [
            ['墨府', '旧账'],
            ['活人', '交回', '账页'],
        ],
    };
}

function createVolumeOneApothecaryClosureScenario() {
    const state = createChoiceState(10, (draft) => {
        GameCore.setRealmScore(draft, 3);
        draft.flags.hasQuhun = true;
        draft.flags.keptQuhun = true;
        draft.flags.quhunIdentityMystery = true;
        draft.npcRelations['墨彩环'] = 34;
    });
    GameCore.getVisibleSideQuests(state);
    GameCore.acceptSideQuest(state, 'apothecary_boy_echo');
    GameCore.chooseSideQuestOption(state, 'apothecary_boy_echo', 'trace_the_voice');
    state.storyCursor = {
        source: 'main',
        storyId: null,
        chapterId: null,
        beatIndex: 0,
        mode: 'idle',
    };
    GameCore.ensureStoryCursor(state);

    return {
        serialized: GameCore.serializeState(state),
        questId: 'apothecary_boy_echo',
        expectedTitle: formatRenderedStoryTitle(state),
        expectedKeywordGroups: [
            ['药童', '旧案', '残影'],
            ['记住', '追索', '带着'],
        ],
    };
}

function createTribulationEndingScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.storyProgress = 14;
        draft.ui.activeTab = 'story';
        draft.storyConsequences.tribulation = 8;
        draft.storyConsequences.battleWill = 3;
        GameCore.LEVEL_STORY_EVENTS.forEach((event) => {
            draft.levelStoryState.events[event.id] = { triggered: true, completed: true };
        });
        satisfyChapterRequirements(draft, 14);
        draft.storyCursor = {
            source: 'main',
            storyId: 14,
            chapterId: 14,
            beatIndex: 0,
            mode: 'idle',
        };
        GameCore.ensureStoryCursor(draft);
        GameCore.skipStoryPlayback(draft);
    });

    const choiceView = GameCore.getStoryView(state);
    const selectedChoice = choiceView.choices.find((choice) => choice.id === 'kill_for_gain');
    const previewState = cloneState(state);
    GameCore.chooseStoryOption(previewState, 'kill_for_gain');
    const endingView = GameCore.getStoryView(previewState);
    const impact = GameCore.getEchoes(previewState)[0] || { title: '', detail: '', meta: '' };

    return {
        serialized,
        choiceId: 'kill_for_gain',
        expectedChoiceMeta: {
            promiseLabel: selectedChoice.promiseLabel,
            riskLabel: selectedChoice.riskLabel,
            visibleCostLabel: selectedChoice.visibleCostLabel,
        },
        expectedEndingTitle: '走火入魔',
        expectedPressureText: GameCore.getPressureStatusText(previewState),
        expectedImpact: {
            title: impact.title,
            detail: impact.detail,
            meta: impact.meta || '',
        },
        expectedRecapText: (endingView.ending.recapLines || []).join('；'),
        expectedTribulationValue: previewState.storyConsequences.tribulation,
        expectedResetRealmLabel: '炼气·初期',
        expectedResetCultivationText: '0/100',
    };
}

function createResourceExpeditionScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.inventory.lingshi = 0;
        draft.cultivation = 40;
        draft.ui.activeTab = 'cultivation';
    });

    const previewState = cloneState(state);
    const result = GameCore.resolveExpedition(previewState, () => 0.5);

    return {
        serialized,
        expectedSummary: result.summary,
        expectedLingshi: previewState.inventory.lingshi,
        expectedCultivationText: `${previewState.cultivation}/${previewState.maxCultivation}`,
    };
}

function createCombatScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        setRealmScore(draft, 6);
        draft.inventory.lingshi = 0;
        draft.inventory.juqidan = 1;
        draft.currentLocation = '黄枫谷';
        draft.cultivation = 80;
        draft.ui.activeTab = 'cultivation';
    });

    const previewState = cloneState(state);
    const expedition = GameCore.resolveExpedition(previewState, () => 0);
    let result = null;
    while (!result || !result.finished) {
        result = GameCore.resolveCombatRound(previewState, expedition.combatState, () => 0);
    }

    return {
        serialized,
        expectedMonsterName: expedition.combatState.monster.name,
        expectedSummary: previewState.logs[0].message,
        expectedState: {
            cultivation: previewState.cultivation,
            lingshi: previewState.inventory.lingshi || 0,
            hp: previewState.playerStats.hp,
        },
    };
}

function createConsumableScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.inventory.juqidan = 2;
        draft.cultivation = draft.maxCultivation - 10;
        draft.ui.activeTab = 'cultivation';
    });
    const previewState = cloneState(state);
    GameCore.useItem(previewState, 'juqidan');
    return {
        serialized,
        itemId: 'juqidan',
        expectedCultivationText: `${previewState.cultivation}/${previewState.maxCultivation}`,
        expectedInventoryCount: previewState.inventory.juqidan || 0,
    };
}

function createHighTierBreakthroughScenario(options = {}) {
    const {
        realmScore = 2,
        breakthroughBonus = 0,
    } = options;
    const { state, serialized } = createSerializedState((draft) => {
        setRealmScore(draft, realmScore);
        draft.inventory.huashendan = 1;
        draft.breakthroughBonus = breakthroughBonus;
        draft.ui.activeTab = 'cultivation';
    });
    const previewState = cloneState(state);
    const result = GameCore.useItem(previewState, 'huashendan');
    return {
        serialized,
        itemId: 'huashendan',
        expectedError: result.error,
        expectedInventoryCount: state.inventory.huashendan || 0,
    };
}

function createCustomSaveScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.playerName = '审查样本';
        setRealmScore(draft, 4);
        draft.cultivation = 88;
        draft.currentLocation = '黄枫谷';
        draft.inventory.juqidan = 1;
        draft.inventory.lingshi = 42;
        draft.settings.audioEnabled = false;
        draft.settings.musicEnabled = false;
        draft.ui.activeTab = 'story';
    });
    return {
        serialized,
        expectedState: {
            version: GameCore.SAVE_VERSION,
            playerName: state.playerName,
            realmLabel: GameCore.getRealmLabel(state),
            cultivationText: `${state.cultivation}/${state.maxCultivation}`,
            lingshi: state.inventory.lingshi,
            juqidan: state.inventory.juqidan,
            audioEnabled: state.settings.audioEnabled,
            musicEnabled: state.settings.musicEnabled,
        },
    };
}

function createLegacySaveScenario() {
    const { state } = createSerializedState((draft) => {
        draft.playerName = '旧版档案';
        draft.ui.activeTab = 'story';
    });
    const legacyState = cloneState(state);
    legacyState.version = 5;
    delete legacyState.recovery;
    return {
        serialized: JSON.stringify(legacyState),
        expectedState: {
            version: GameCore.SAVE_VERSION,
            playerName: legacyState.playerName,
            activeTab: 'story',
            recovery: {
                lastCheckedAt: null,
            },
        },
    };
}

function createAdventureTabSaveScenario() {
    const { state } = createSerializedState((draft) => {
        draft.playerName = '游历旧页签档';
        draft.ui.activeTab = 'adventure';
        draft.currentLocation = '黄枫谷';
        draft.inventory.lingshi = 0;
    });
    return {
        serialized: GameCore.serializeState(state),
        expectedPlayerName: state.playerName,
    };
}

function createJourneyScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.playerName = '闭环样本';
        draft.inventory.juqidan = 1;
        draft.inventory.lingshi = 0;
        draft.cultivation = draft.maxCultivation - 40;
        draft.ui.activeTab = 'cultivation';
    });

    const afterResource = cloneState(state);
    const resourceResult = GameCore.resolveExpedition(afterResource, () => 0.5);

    const afterTraining = cloneState(afterResource);
    GameCore.trainWithLingshi(afterTraining, '10');

    const afterItemUse = cloneState(afterTraining);
    GameCore.useItem(afterItemUse, 'juqidan');

    const afterBreakthrough = cloneState(afterItemUse);
    GameCore.attemptBreakthrough(afterBreakthrough, () => 0);

    const afterStoryProgress = cloneState(afterBreakthrough);
    const levelView = playCurrentStoryToChoices(afterStoryProgress);
    const levelChoice = pickAvailableChoice(levelView);
    GameCore.chooseStoryOption(afterStoryProgress, levelChoice.id);

    const mainView = playCurrentStoryToChoices(afterStoryProgress);
    const mainChoice = pickAvailableChoice(mainView, 'set_out_now');
    GameCore.chooseStoryOption(afterStoryProgress, mainChoice.id);
    afterStoryProgress.ui.activeTab = 'story';
    const exportedState = cloneState(afterStoryProgress);

    const continuedState = cloneState(exportedState);
    const continuedView = playCurrentStoryToChoices(continuedState);
    const continuationChoice = pickAvailableChoice(continuedView, 'keep_low_profile');
    GameCore.chooseStoryOption(continuedState, continuationChoice.id);
    continuedState.ui.activeTab = 'story';

    return {
        serialized,
        itemId: 'juqidan',
        trainBatch: '10',
        resourceRandomValue: 0.5,
        levelChoiceId: levelChoice.id,
        mainChoiceId: mainChoice.id,
        continuationChoiceId: continuationChoice.id,
        expectedAfterResource: {
            summary: resourceResult.summary,
            lingshi: afterResource.inventory.lingshi || 0,
            cultivationText: `${afterResource.cultivation}/${afterResource.maxCultivation}`,
            mainButtonText: '闭关修炼',
        },
        expectedAfterItemUse: {
            cultivationText: `${afterItemUse.cultivation}/${afterItemUse.maxCultivation}`,
            inventoryCount: afterItemUse.inventory.juqidan || 0,
            mainButtonText: '渡劫突破',
        },
        expectedAfterTraining: {
            cultivationText: `${afterTraining.cultivation}/${afterTraining.maxCultivation}`,
            lingshi: afterTraining.inventory.lingshi || 0,
            mainButtonText: '闭关修炼',
        },
        expectedAfterBreakthrough: {
            realmLabel: GameCore.getRealmLabel(afterBreakthrough),
            cultivationText: `${afterBreakthrough.cultivation}/${afterBreakthrough.maxCultivation}`,
        },
        expectedExportedState: {
            version: GameCore.SAVE_VERSION,
            playerName: exportedState.playerName,
            realmIndex: exportedState.realmIndex,
            stageIndex: exportedState.stageIndex,
            storyProgress: exportedState.storyProgress,
            chapterChoices: exportedState.chapterChoices,
            cultivationText: `${exportedState.cultivation}/${exportedState.maxCultivation}`,
            lingshi: exportedState.inventory.lingshi || 0,
        },
        expectedContinuedState: {
            storyProgress: continuedState.storyProgress,
            chapterChoices: continuedState.chapterChoices,
            pressureText: GameCore.getPressureStatusText(continuedState),
            decisionHistoryLength: continuedState.decisionHistory.length,
            cultivationText: `${continuedState.cultivation}/${continuedState.maxCultivation}`,
            realmLabel: GameCore.getRealmLabel(continuedState),
        },
    };
}

function createInvalidSaveFixtures() {
    const { state } = createSerializedState((draft) => {
        draft.playerName = '异常样本';
        draft.inventory.juqidan = 1;
        draft.inventory.lingshi = 20;
        draft.ui.activeTab = 'story';
    });
    const baseState = cloneState(state);

    const missingFields = {
        version: GameCore.SAVE_VERSION,
        playerName: baseState.playerName,
    };
    const typeErrors = {
        ...cloneState(baseState),
        cultivation: 'bad-data',
        realmIndex: 'oops',
        stageIndex: 99,
        playerStats: {
            hp: 'bad-hp',
        },
        inventory: {
            lingshi: 'NaN',
            juqidan: -3,
        },
        ui: {
            activeTab: 'inventory',
        },
    };
    const semanticInvalid = {
        ...cloneState(baseState),
        cultivation: -999,
        realmIndex: 99,
        stageIndex: 99,
        playerStats: {
            ...baseState.playerStats,
            hp: -20,
        },
        inventory: {
            ...baseState.inventory,
            lingshi: -9,
            juqidan: 2,
        },
        storyCursor: {
            source: 'main',
            storyId: 'missing',
            chapterId: 'missing',
            beatIndex: -8,
            mode: 'choices',
        },
    };
    const numericExtremes = {
        ...cloneState(baseState),
        cultivation: Number.MAX_SAFE_INTEGER,
        realmIndex: Number.MAX_SAFE_INTEGER,
        stageIndex: Number.MAX_SAFE_INTEGER,
        playerStats: {
            ...baseState.playerStats,
            hp: Number.MAX_SAFE_INTEGER,
        },
        inventory: {
            ...baseState.inventory,
            lingshi: Number.MAX_SAFE_INTEGER,
            juqidan: Number.MAX_SAFE_INTEGER,
        },
        storyCursor: {
            source: 'ending',
            storyId: 'bad-ending',
            chapterId: 'bad-ending',
            beatIndex: Number.MAX_SAFE_INTEGER,
            mode: 'choices',
        },
    };

    return {
        validBase: GameCore.serializeState(baseState),
        emptySave: '',
        nonJson: 'not-json-save',
        truncatedJson: '{"version": 6, "playerName": "坏档"',
        missingFields: JSON.stringify(missingFields, null, 2),
        typeErrors: JSON.stringify(typeErrors, null, 2),
        semanticInvalid: JSON.stringify(semanticInvalid, null, 2),
        numericExtremes: JSON.stringify(numericExtremes, null, 2),
        unsupportedLegacy: JSON.stringify({
            ...cloneState(baseState),
            version: GameCore.MIN_SUPPORTED_SAVE_VERSION - 1,
        }, null, 2),
        futureVersion: JSON.stringify({
            ...cloneState(baseState),
            version: GameCore.SAVE_VERSION + 1,
        }, null, 2),
        oversizedField: JSON.stringify({
            ...cloneState(baseState),
            playerName: '超'.repeat(140_000),
        }),
    };
}

function createLongChoiceScenario() {
    const state = createChoiceState(0, (draft) => {
        fillInventoryWithSamples(draft, 30);
    });
    const view = GameCore.getStoryView(state);
    const longestChoice = [...view.choices]
        .filter((choice) => !choice.disabled)
        .sort((left, right) => right.text.length - left.text.length)[0];

    return {
        serialized: GameCore.serializeState(state),
        choiceId: longestChoice.id,
        choiceText: longestChoice.text,
        expectedTitle: formatRenderedStoryTitle(state),
        expectedChoiceCount: view.choices.length,
        inventoryItemCount: Object.keys(state.inventory).length,
    };
}

module.exports = {
    STORAGE_KEY,
    createFreshScenario,
    createAlchemyScenario,
    createTrainingScenario,
    createStoryScenario,
    createReadStoryAwayScenario,
    createBlockedMainChapterScenario,
    createShengxianlingChapterScenario,
    createVolumeOneLedgerClosureScenario,
    createVolumeOneApothecaryClosureScenario,
    createTribulationEndingScenario,
    createResourceExpeditionScenario,
    createCombatScenario,
    createConsumableScenario,
    createHighTierBreakthroughScenario,
    createCustomSaveScenario,
    createLegacySaveScenario,
    createAdventureTabSaveScenario,
    createJourneyScenario,
    createInvalidSaveFixtures,
    createLongChoiceScenario,
};
