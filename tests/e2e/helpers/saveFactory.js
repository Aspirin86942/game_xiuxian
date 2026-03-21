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
    return `${sourceLabel} · ${view.chapter.title}`;
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
            version: 6,
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
    return {
        serialized: JSON.stringify(legacyState),
        expectedAlertFragment: '检测到旧版存档（v5）',
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

module.exports = {
    STORAGE_KEY,
    createFreshScenario,
    createTrainingScenario,
    createStoryScenario,
    createTribulationEndingScenario,
    createResourceExpeditionScenario,
    createCombatScenario,
    createConsumableScenario,
    createCustomSaveScenario,
    createLegacySaveScenario,
    createAdventureTabSaveScenario,
};
