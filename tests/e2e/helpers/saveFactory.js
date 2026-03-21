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
    if (!view || view.mode === 'ending') {
        return '终局';
    }
    const totalPages = view.story.beats.length;
    const currentPage = Math.min(totalPages, state.storyCursor.beatIndex + 1);
    return view.mode === 'choices'
        ? `第 ${totalPages} / ${totalPages} 页 · 抉择`
        : `第 ${currentPage} / ${totalPages} 页`;
}

function formatOfflineDuration(durationMs) {
    const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} 小时 ${minutes} 分`;
}

function getOfflineCapHours() {
    return Math.floor(StoryData.CONFIG.offlineCultivateMaxDurationMs / (60 * 60 * 1000));
}

function formatOfflineSummary(state, autoUnlocked) {
    const trainingState = state.offlineTraining || {};
    if (!trainingState.lastGain || trainingState.lastGain <= 0) {
        return autoUnlocked
            ? `离线收益仅在开启自动吐纳后生效，最多累计 ${getOfflineCapHours()} 小时。`
            : `筑基期后解锁自动吐纳与离线收益，最多累计 ${getOfflineCapHours()} 小时。`;
    }

    const cappedText = trainingState.wasCapped ? `，已按 ${getOfflineCapHours()} 小时封顶` : '';
    return `上次离线吐纳 ${formatOfflineDuration(trainingState.lastEffectiveDurationMs)}，修为 +${trainingState.lastGain}${cappedText}`;
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
        expectedResetStoryConsequences: {
            battleWill: 0,
            tribulation: 0,
            pressureTier: '安全',
            pressureTrend: '平稳',
        },
    };
}

function createLegacySaveScenario() {
    const { state } = createSerializedState((draft) => {
        draft.playerName = '旧版档案';
        draft.ui.activeTab = 'story';
    });
    const legacyState = cloneState(state);
    legacyState.version = 4;
    delete legacyState.decisionHistory;
    delete legacyState.pendingEchoes;
    delete legacyState.endingSeeds;
    if (legacyState.storyConsequences) {
        delete legacyState.storyConsequences.pressureTier;
        delete legacyState.storyConsequences.pressureTrend;
    }
    return {
        serialized: JSON.stringify(legacyState),
        expectedAlertFragment: '检测到旧版存档（v4）',
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

function createOfflineSettlementScenario(options = {}) {
    const {
        nowMs = 1_710_000_000_000,
        offlineMs = 2 * 60 * 60 * 1000,
        realmScore = 11,
        cultivation = 500,
        autoCultivate = true,
    } = options;

    const { state, serialized } = createSerializedState((draft) => {
        setRealmScore(draft, realmScore);
        draft.cultivation = cultivation;
        draft.autoCultivate = autoCultivate;
        draft.ui.activeTab = 'cultivation';
        draft.offlineTraining = {
            ...draft.offlineTraining,
            lastSavedAt: nowMs - offlineMs,
            lastSettlementAt: null,
            lastDurationMs: 0,
            lastEffectiveDurationMs: 0,
            lastGain: 0,
            wasCapped: false,
        };
    });

    const previewState = cloneState(state);
    const settlement = GameCore.resolveOfflineCultivation(previewState, nowMs);
    const expectedDurationText = settlement.wasCapped
        ? `离线 ${formatOfflineDuration(settlement.durationMs)}，按 ${formatOfflineDuration(settlement.effectiveDurationMs)} 结算`
        : `离线 ${formatOfflineDuration(settlement.effectiveDurationMs)}`;

    return {
        serialized,
        nowMs,
        expectedState: {
            applied: settlement.applied,
            gain: settlement.gain,
            durationText: expectedDurationText,
            cultivationText: `${previewState.cultivation}/${previewState.maxCultivation}`,
            cultivation: previewState.cultivation,
            maxCultivation: previewState.maxCultivation,
            realmLabel: GameCore.getRealmLabel(previewState),
            realmIndex: previewState.realmIndex,
            stageIndex: previewState.stageIndex,
            wasCapped: settlement.wasCapped,
            offlineSummaryText: formatOfflineSummary(previewState, GameCore.canAutoCultivate(previewState)),
        },
        initialState: {
            cultivationText: `${state.cultivation}/${state.maxCultivation}`,
            cultivation: state.cultivation,
            realmLabel: GameCore.getRealmLabel(state),
            realmIndex: state.realmIndex,
            stageIndex: state.stageIndex,
        },
    };
}

module.exports = {
    STORAGE_KEY,
    createFreshScenario,
    createBreakthroughScenario,
    createStoryScenario,
    createTribulationEndingScenario,
    createLegacySaveScenario,
    createCombatScenario,
    createConsumableScenario,
    createCustomSaveScenario,
    createOfflineSettlementScenario,
};
