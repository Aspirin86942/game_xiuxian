const GameCore = require('../../../game-core.js');
const StoryData = require('../../../story-data.js');

const STORAGE_KEY = StoryData.STORAGE_KEY;

function cloneState(state) {
    return JSON.parse(GameCore.serializeState(state));
}

function setRealmScore(state, score) {
    const safeScore = Math.max(0, Math.min(score, (GameCore.REALMS.length * 3) - 1));
    state.realmIndex = Math.floor(safeScore / 3);
    state.stageIndex = safeScore % 3;
    GameCore.recalculateState(state, true);
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
    if (!view || view.mode === 'ending') {
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

function createBreakthroughScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.cultivation = draft.maxCultivation;
        draft.breakthroughBonus = 0.2;
        draft.ui.activeTab = 'cultivation';
    });
    const previewState = cloneState(state);
    GameCore.attemptBreakthrough(previewState, () => 0.01);
    return {
        serialized,
        initialRealmLabel: GameCore.getRealmLabel(state),
        expectedRealmLabel: GameCore.getRealmLabel(previewState),
        expectedState: {
            realmIndex: previewState.realmIndex,
            stageIndex: previewState.stageIndex,
            cultivation: previewState.cultivation,
        },
    };
}

function createStoryScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.ui.activeTab = 'story';
    });

    const initialView = GameCore.getStoryView(state);
    const secondBeatState = cloneState(state);
    const advanceResult = GameCore.advanceStoryBeat(secondBeatState);
    const continuedView = advanceResult.ok ? GameCore.getStoryView(secondBeatState) : initialView;

    const choiceState = cloneState(state);
    GameCore.skipStoryPlayback(choiceState);
    const choiceView = GameCore.getStoryView(choiceState);
    const selectedChoice = choiceView.choices.find((choice) => choice.id === 'set_out_now' && !choice.disabled)
        || choiceView.choices.find((choice) => !choice.disabled)
        || choiceView.choices[0];

    const afterChoiceState = cloneState(choiceState);
    GameCore.chooseStoryOption(afterChoiceState, selectedChoice.id);
    const echoes = GameCore.getEchoes(afterChoiceState).map((item) => item.title);

    return {
        serialized,
        initialLine: initialView.currentBeat ? initialView.currentBeat.text : '',
        continuedLine: continuedView && continuedView.currentBeat ? continuedView.currentBeat.text : '',
        continuedProgressText: formatRenderedStoryProgress(secondBeatState),
        choiceId: selectedChoice.id,
        expectedTitle: formatRenderedStoryTitle(afterChoiceState),
        expectedStoryProgress: afterChoiceState.storyProgress,
        expectedEchoTitle: echoes[0] || '',
    };
}

function createCombatScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        setRealmScore(draft, 9);
        draft.inventory.feijian = 1;
        draft.inventory.hujian = 1;
        draft.inventory.quhun = 1;
        draft.currentLocation = '黄枫谷';
        draft.cultivation = Math.max(0, draft.maxCultivation - 40);
        draft.ui.activeTab = 'adventure';
        GameCore.recalculateState(draft, true);
    });
    const previewState = cloneState(state);
    const combatState = GameCore.beginCombat(previewState, () => 0);
    let result = null;
    while (!result || !result.finished) {
        result = GameCore.resolveCombatRound(previewState, combatState, () => 0);
    }
    return {
        serialized,
        expectedMonsterName: combatState.monster.name,
        expectedVictory: result.victory,
        expectedState: {
            cultivation: previewState.cultivation,
            playerHp: previewState.playerStats.hp,
            inventory: previewState.inventory,
        },
    };
}

function createConsumableScenario() {
    const { state, serialized } = createSerializedState((draft) => {
        draft.inventory.juqidan = 2;
        draft.cultivation = 0;
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

module.exports = {
    STORAGE_KEY,
    createFreshScenario,
    createBreakthroughScenario,
    createStoryScenario,
    createCombatScenario,
    createConsumableScenario,
    createCustomSaveScenario,
};

