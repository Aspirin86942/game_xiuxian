(function (globalScope) {
    function createStateModule(deps) {
        const { clone } = deps.shared;
        const {
            CONFIG,
            REALMS,
            LEVEL_STORY_EVENTS,
            SIDE_QUESTS_V1,
            constants,
        } = deps.data;
        const {
            MAX_LOGS,
            SAVE_VERSION,
            MIN_SUPPORTED_SAVE_VERSION,
            STORY_CONSEQUENCE_LIMITS,
            PRESSURE_COLLAPSE_THRESHOLD,
            SIDE_QUEST_STATE_VALUES,
        } = constants;

        const SIDE_QUEST_STATE_SET = new Set(SIDE_QUEST_STATE_VALUES);

        function createDefaultLevelStoryState() {
            const events = {};
            LEVEL_STORY_EVENTS.forEach((event) => {
                events[event.id] = {
                    triggered: false,
                    completed: false,
                };
            });
            return {
                events,
                currentEventId: null,
            };
        }

        function createDefaultOfflineTrainingState() {
            return {
                lastSavedAt: null,
                lastSettlementAt: null,
                lastDurationMs: 0,
                lastEffectiveDurationMs: 0,
                lastGain: 0,
                wasCapped: false,
            };
        }

        function createDefaultRecoveryState() {
            return {
                lastCheckedAt: null,
            };
        }

        function createDefaultStoryConsequences() {
            return {
                battleWill: 0,
                tribulation: 0,
                pressureTier: '安全',
                pressureTrend: '平稳',
            };
        }

        function createDefaultDecisionHistory() {
            return [];
        }

        function createDefaultPendingEchoes() {
            return [];
        }

        function createDefaultEndingSeeds() {
            return [];
        }

        function normalizeProgressCheckpoint(rawValue) {
            if (!Number.isFinite(rawValue)) {
                return null;
            }
            return Math.max(0, Math.floor(rawValue));
        }

        function createDefaultSideQuestEntry(definition) {
            return {
                questId: definition.id,
                state: 'locked',
                availableAtProgress: null,
                acceptedAtProgress: null,
                deadlineProgress: Number.isFinite(definition.availableToProgress)
                    ? definition.availableToProgress
                    : null,
                resolvedAtProgress: null,
                selectedChoiceId: null,
                lastResult: null,
            };
        }

        function createDefaultSideQuests() {
            return SIDE_QUESTS_V1.reduce((result, definition) => {
                result[definition.id] = createDefaultSideQuestEntry(definition);
                return result;
            }, {});
        }

        function normalizeSideQuestLastResult(rawValue) {
            if (!rawValue || typeof rawValue !== 'object') {
                return null;
            }
            return {
                outcome: typeof rawValue.outcome === 'string' ? rawValue.outcome : '',
                choiceId: typeof rawValue.choiceId === 'string' ? rawValue.choiceId : null,
                summary: typeof rawValue.summary === 'string' ? rawValue.summary : '',
                detail: typeof rawValue.detail === 'string' ? rawValue.detail : '',
            };
        }

        function normalizeSideQuestRecords(rawRecords) {
            const defaults = createDefaultSideQuests();
            if (!rawRecords || typeof rawRecords !== 'object') {
                return defaults;
            }

            SIDE_QUESTS_V1.forEach((definition) => {
                const rawEntry = rawRecords[definition.id];
                if (!rawEntry || typeof rawEntry !== 'object') {
                    return;
                }

                defaults[definition.id] = {
                    questId: definition.id,
                    state: SIDE_QUEST_STATE_SET.has(rawEntry.state) ? rawEntry.state : 'locked',
                    availableAtProgress: normalizeProgressCheckpoint(rawEntry.availableAtProgress),
                    acceptedAtProgress: normalizeProgressCheckpoint(rawEntry.acceptedAtProgress),
                    deadlineProgress: normalizeProgressCheckpoint(rawEntry.deadlineProgress)
                        ?? normalizeProgressCheckpoint(definition.availableToProgress),
                    resolvedAtProgress: normalizeProgressCheckpoint(rawEntry.resolvedAtProgress),
                    selectedChoiceId: typeof rawEntry.selectedChoiceId === 'string' ? rawEntry.selectedChoiceId : null,
                    lastResult: normalizeSideQuestLastResult(rawEntry.lastResult),
                };
            });

            return defaults;
        }

        function normalizeOfflineTrainingState(rawState) {
            if (!rawState || typeof rawState !== 'object') {
                return createDefaultOfflineTrainingState();
            }
            return {
                lastSavedAt: Number.isFinite(rawState.lastSavedAt) ? Math.floor(rawState.lastSavedAt) : null,
                lastSettlementAt: Number.isFinite(rawState.lastSettlementAt) ? Math.floor(rawState.lastSettlementAt) : null,
                lastDurationMs: Number.isFinite(rawState.lastDurationMs) ? Math.max(0, Math.floor(rawState.lastDurationMs)) : 0,
                lastEffectiveDurationMs: Number.isFinite(rawState.lastEffectiveDurationMs)
                    ? Math.max(0, Math.floor(rawState.lastEffectiveDurationMs))
                    : 0,
                lastGain: Number.isFinite(rawState.lastGain) ? Math.max(0, Math.floor(rawState.lastGain)) : 0,
                wasCapped: Boolean(rawState.wasCapped),
            };
        }

        function normalizeRecoveryState(rawState) {
            if (!rawState || typeof rawState !== 'object') {
                return createDefaultRecoveryState();
            }
            return {
                lastCheckedAt: Number.isFinite(rawState.lastCheckedAt) ? Math.floor(rawState.lastCheckedAt) : null,
            };
        }

        function clampConsequenceValue(rawValue, upperBound) {
            if (!Number.isFinite(rawValue)) {
                return 0;
            }
            return Math.max(0, Math.min(Math.floor(rawValue), upperBound));
        }

        function getPressureTierMeta(tribulation) {
            return constants.PRESSURE_TIERS.find((entry) => tribulation >= entry.min && tribulation <= entry.max)
                || constants.PRESSURE_TIERS[constants.PRESSURE_TIERS.length - 1];
        }

        function getPressureTrendLabel(delta) {
            if (delta <= 0) {
                return '平稳';
            }
            if (delta === 1) {
                return '有压';
            }
            if (delta === 2) {
                return '紧绷';
            }
            return '失控边缘';
        }

        function normalizeStoryConsequences(rawState) {
            const battleWill = clampConsequenceValue(rawState?.battleWill, STORY_CONSEQUENCE_LIMITS.battleWill);
            const tribulation = clampConsequenceValue(rawState?.tribulation, STORY_CONSEQUENCE_LIMITS.tribulation);
            const pressureTier = getPressureTierMeta(tribulation);
            const pressureTrend = typeof rawState?.pressureTrend === 'string' && rawState.pressureTrend
                ? rawState.pressureTrend
                : getPressureTrendLabel(0);

            return {
                battleWill,
                tribulation,
                pressureTier: pressureTier.label,
                pressureTrend,
            };
        }

        function normalizeDecisionHistory(rawState) {
            if (!Array.isArray(rawState)) {
                return createDefaultDecisionHistory();
            }
            return rawState
                .filter((entry) => entry && typeof entry === 'object')
                .slice(-constants.DECISION_HISTORY_LIMIT)
                .map((entry) => ({
                    chapterId: entry.chapterId ?? null,
                    choiceId: typeof entry.choiceId === 'string' ? entry.choiceId : '',
                    promiseType: typeof entry.promiseType === 'string' ? entry.promiseType : '',
                    promiseLabel: typeof entry.promiseLabel === 'string' ? entry.promiseLabel : '',
                    riskTier: typeof entry.riskTier === 'string' ? entry.riskTier : '',
                    riskLabel: typeof entry.riskLabel === 'string' ? entry.riskLabel : '',
                    costLabel: typeof entry.costLabel === 'string' ? entry.costLabel : '',
                    immediateSummary: typeof entry.immediateSummary === 'string' ? entry.immediateSummary : '',
                    longTermHint: typeof entry.longTermHint === 'string' ? entry.longTermHint : '',
                    branchImpactTitle: typeof entry.branchImpactTitle === 'string' ? entry.branchImpactTitle : '',
                    branchImpactDetail: typeof entry.branchImpactDetail === 'string' ? entry.branchImpactDetail : '',
                    pressureDelta: Number.isFinite(entry.pressureDelta) ? Math.max(0, Math.floor(entry.pressureDelta)) : 0,
                    endingSeedIds: Array.isArray(entry.endingSeedIds) ? entry.endingSeedIds.filter((value) => typeof value === 'string') : [],
                }));
        }

        function normalizePendingEchoes(rawState) {
            if (!Array.isArray(rawState)) {
                return createDefaultPendingEchoes();
            }
            return rawState
                .filter((entry) => entry && typeof entry === 'object')
                .map((entry) => ({
                    id: typeof entry.id === 'string' ? entry.id : '',
                    sourceChapterId: entry.sourceChapterId ?? null,
                    sourceChoiceId: typeof entry.sourceChoiceId === 'string' ? entry.sourceChoiceId : '',
                    title: typeof entry.title === 'string' ? entry.title : '',
                    detail: typeof entry.detail === 'string' ? entry.detail : '',
                    eligibleFromProgress: normalizeProgressCheckpoint(entry.eligibleFromProgress) ?? 0,
                    eligibleToProgress: normalizeProgressCheckpoint(entry.eligibleToProgress) ?? Number.MAX_SAFE_INTEGER,
                    consumed: Boolean(entry.consumed),
                }))
                .slice(-constants.DECISION_HISTORY_LIMIT);
        }

        function normalizeEndingSeeds(rawState) {
            if (!Array.isArray(rawState)) {
                return createDefaultEndingSeeds();
            }
            return rawState
                .filter((entry) => entry && typeof entry === 'object')
                .map((entry) => ({
                    id: typeof entry.id === 'string' ? entry.id : '',
                    sourceChapterId: entry.sourceChapterId ?? null,
                    sourceChoiceId: typeof entry.sourceChoiceId === 'string' ? entry.sourceChoiceId : '',
                    promiseType: typeof entry.promiseType === 'string' ? entry.promiseType : '',
                    note: typeof entry.note === 'string' ? entry.note : '',
                }))
                .slice(-constants.ENDING_SEED_LIMIT);
        }

        function normalizeRecentChoiceOutcome(rawState) {
            if (!rawState || typeof rawState !== 'object') {
                return null;
            }
            return {
                chapterId: rawState.chapterId ?? null,
                choiceId: rawState.choiceId ?? null,
                battleWillGain: clampConsequenceValue(rawState.battleWillGain, 3),
                tribulationGain: clampConsequenceValue(rawState.tribulationGain, 2),
                attackBonus: clampConsequenceValue(rawState.attackBonus, STORY_CONSEQUENCE_LIMITS.battleWill * 2),
                defenseBonus: clampConsequenceValue(rawState.defenseBonus, Math.floor(STORY_CONSEQUENCE_LIMITS.battleWill / 2)),
                hpBonus: clampConsequenceValue(rawState.hpBonus, STORY_CONSEQUENCE_LIMITS.battleWill * 6),
            };
        }

        function getOfflineTrainingCapMs() {
            if (Number.isFinite(CONFIG.offlineCultivateMaxDurationMs) && CONFIG.offlineCultivateMaxDurationMs > 0) {
                return CONFIG.offlineCultivateMaxDurationMs;
            }
            return 8 * 60 * 60 * 1000;
        }

        function getAverageAutoCultivationGain() {
            const lowerBound = Math.min(CONFIG.clickGainMin, CONFIG.clickGainMax);
            const upperBound = Math.max(CONFIG.clickGainMin, CONFIG.clickGainMax);
            let totalGain = 0;
            let outcomes = 0;
            for (let baseGain = lowerBound; baseGain <= upperBound; baseGain += 1) {
                totalGain += Math.max(1, Math.floor(baseGain * CONFIG.autoGainRatio));
                outcomes += 1;
            }
            return outcomes > 0 ? (totalGain / outcomes) : 0;
        }

        function formatOfflineDuration(durationMs) {
            const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours} 时 ${minutes} 分`;
        }

        function normalizeStoryCursor(rawCursor) {
            if (!rawCursor || typeof rawCursor !== 'object') {
                return {
                    source: 'main',
                    storyId: null,
                    chapterId: null,
                    beatIndex: 0,
                    mode: 'idle',
                };
            }
            return {
                source: ['main', 'level', 'ending'].includes(rawCursor.source) ? rawCursor.source : 'main',
                storyId: rawCursor.storyId ?? null,
                chapterId: rawCursor.chapterId ?? null,
                beatIndex: Number.isFinite(rawCursor.beatIndex) ? Math.max(0, Math.floor(rawCursor.beatIndex)) : 0,
                mode: ['idle', 'playing', 'choices'].includes(rawCursor.mode) ? rawCursor.mode : 'idle',
            };
        }

        function normalizeRealmState(rawRealmIndex, rawStageIndex) {
            const safeRealmIndex = Number.isFinite(rawRealmIndex) ? Math.floor(rawRealmIndex) : 0;
            const safeStageIndex = Number.isFinite(rawStageIndex) ? Math.floor(rawStageIndex) : 0;
            const safeScore = Math.max(0, Math.min((REALMS.length * 3) - 1, (safeRealmIndex * 3) + safeStageIndex));
            return {
                realmIndex: Math.floor(safeScore / 3),
                stageIndex: safeScore % 3,
            };
        }

        function normalizeActiveTab(rawTab) {
            return ['cultivation', 'alchemy', 'story'].includes(rawTab) ? rawTab : 'cultivation';
        }

        function normalizeInventoryState(rawInventory) {
            if (!rawInventory || typeof rawInventory !== 'object') {
                return {};
            }

            return Object.entries(rawInventory).reduce((result, [itemId, amount]) => {
                if (!deps.data.ITEMS[itemId] || !Number.isFinite(amount)) {
                    return result;
                }
                const safeAmount = Math.max(0, Math.floor(amount));
                if (safeAmount > 0) {
                    result[itemId] = safeAmount;
                }
                return result;
            }, {});
        }

        function normalizeLevelStoryState(rawState) {
            const nextState = createDefaultLevelStoryState();
            if (!rawState || typeof rawState !== 'object') {
                return nextState;
            }

            const sourceEvents = rawState.events && typeof rawState.events === 'object'
                ? rawState.events
                : rawState.byId && typeof rawState.byId === 'object'
                    ? rawState.byId
                    : {};

            LEVEL_STORY_EVENTS.forEach((event) => {
                const entry = sourceEvents[event.id] || {};
                nextState.events[event.id] = {
                    triggered: Boolean(entry.triggered),
                    completed: Boolean(entry.completed),
                };
            });

            if (rawState.currentEventId && nextState.events[rawState.currentEventId]) {
                nextState.currentEventId = rawState.currentEventId;
            }

            return nextState;
        }

        function getBattleWillBonuses(state) {
            const consequences = normalizeStoryConsequences(state?.storyConsequences);
            return {
                attack: consequences.battleWill * 2,
                defense: Math.floor(consequences.battleWill / 2),
                hp: consequences.battleWill * 6,
            };
        }

        function createTribulationEnding(state) {
            const consequences = normalizeStoryConsequences(state?.storyConsequences);
            return {
                id: 'zouhuo_rumo',
                title: '走火入魔',
                description: `你一路压在心头的失败压力终于越过了${consequences.pressureTier}的那道线。先前那些涉险而行、强撑不退的选择，终究没再被你按稳，识海里的裂声也在这一刻一并反噬回来。`,
            };
        }

        function createInitialState() {
            const state = {
                version: SAVE_VERSION,
                playerName: '无名散修',
                realmIndex: 0,
                stageIndex: 0,
                cultivation: 0,
                maxCultivation: REALMS[0].baseReq,
                breakthroughRate: CONFIG.baseBreakthroughRate,
                breakthroughBonus: 0,
                logs: [],
                inventory: {},
                playerStats: {
                    hp: 100,
                    maxHp: 100,
                    attack: 12,
                    defense: 5,
                },
                settings: {
                    audioEnabled: true,
                    musicEnabled: true,
                },
                offlineTraining: createDefaultOfflineTrainingState(),
                recovery: createDefaultRecoveryState(),
                storyConsequences: createDefaultStoryConsequences(),
                storyProgress: 0,
                chapterChoices: {},
                recentChoiceEcho: null,
                recentChoiceOutcome: null,
                decisionHistory: createDefaultDecisionHistory(),
                pendingEchoes: createDefaultPendingEchoes(),
                endingSeeds: createDefaultEndingSeeds(),
                sideQuests: createDefaultSideQuests(),
                storyCursor: {
                    source: 'main',
                    storyId: null,
                    chapterId: null,
                    beatIndex: 0,
                    mode: 'idle',
                },
                levelStoryState: createDefaultLevelStoryState(),
                ending: null,
                currentLocation: '青牛镇',
                npcRelations: {
                    '墨大夫': 0,
                    '厉飞雨': 0,
                    '墨彩环': 0,
                    '南宫婉': 0,
                    '李化元': 0,
                },
                routeScores: {
                    orthodox: 0,
                    demonic: 0,
                    secluded: 0,
                },
                flags: {},
                ui: {
                    activeTab: 'cultivation',
                    logCollapsed: false,
                    profileCollapsed: true,
                },
                unreadStory: true,
            };
            deps.recalculateState(state, true);
            return state;
        }

        function mergeSave(rawState) {
            const nextState = createInitialState();
            if (!rawState || typeof rawState !== 'object') {
                return nextState;
            }

            const defaultState = createInitialState();
            Object.assign(nextState, rawState);
            nextState.version = SAVE_VERSION;
            nextState.settings = { ...defaultState.settings, ...(rawState.settings || {}) };
            nextState.offlineTraining = normalizeOfflineTrainingState(rawState.offlineTraining);
            nextState.recovery = normalizeRecoveryState(rawState.recovery);
            nextState.storyConsequences = normalizeStoryConsequences(rawState.storyConsequences);
            nextState.ui = { ...defaultState.ui, ...(rawState.ui || {}) };
            nextState.ui.activeTab = normalizeActiveTab(nextState.ui.activeTab);
            nextState.storyCursor = normalizeStoryCursor(rawState.storyCursor);
            nextState.playerStats = { ...defaultState.playerStats, ...(rawState.playerStats || {}) };
            nextState.routeScores = { ...defaultState.routeScores, ...(rawState.routeScores || {}) };
            nextState.npcRelations = { ...defaultState.npcRelations, ...(rawState.npcRelations || {}) };
            nextState.flags = { ...(rawState.flags || {}) };
            nextState.inventory = normalizeInventoryState(rawState.inventory);
            nextState.chapterChoices = { ...(rawState.chapterChoices || {}) };
            nextState.recentChoiceEcho = rawState.recentChoiceEcho && typeof rawState.recentChoiceEcho === 'object'
                ? { chapterId: rawState.recentChoiceEcho.chapterId ?? null, choiceId: rawState.recentChoiceEcho.choiceId ?? null }
                : null;
            nextState.recentChoiceOutcome = normalizeRecentChoiceOutcome(rawState.recentChoiceOutcome);
            nextState.decisionHistory = normalizeDecisionHistory(rawState.decisionHistory);
            nextState.pendingEchoes = normalizePendingEchoes(rawState.pendingEchoes);
            nextState.endingSeeds = normalizeEndingSeeds(rawState.endingSeeds);
            nextState.sideQuests = normalizeSideQuestRecords(rawState.sideQuests);
            nextState.logs = Array.isArray(rawState.logs) ? rawState.logs.slice(0, MAX_LOGS) : [];
            nextState.ending = rawState.ending || null;
            nextState.levelStoryState = normalizeLevelStoryState(rawState.levelStoryState);
            nextState.playerName = typeof rawState.playerName === 'string' && rawState.playerName.trim()
                ? rawState.playerName
                : defaultState.playerName;
            nextState.currentLocation = typeof rawState.currentLocation === 'string' && rawState.currentLocation
                ? rawState.currentLocation
                : defaultState.currentLocation;
            Object.assign(nextState, normalizeRealmState(rawState.realmIndex, rawState.stageIndex));
            nextState.cultivation = Number.isFinite(rawState.cultivation) ? Math.floor(rawState.cultivation) : 0;
            nextState.breakthroughBonus = Number.isFinite(rawState.breakthroughBonus)
                ? Math.max(0, rawState.breakthroughBonus)
                : 0;
            delete nextState.autoCultivate;
            deps.recalculateState(nextState, false);
            nextState.cultivation = Math.max(0, Math.min(nextState.maxCultivation, nextState.cultivation));
            deps.syncSideQuestAvailability(nextState);
            return nextState;
        }

        function getRealmScore(state) {
            return (state.realmIndex * 3) + state.stageIndex;
        }

        function setRealmScore(state, score) {
            const previousScore = getRealmScore(state);
            const safeScore = Math.max(0, Math.min(score, (REALMS.length * 3) - 1));
            state.realmIndex = Math.floor(safeScore / 3);
            state.stageIndex = safeScore % 3;
            deps.recalculateState(state, true);
            if (safeScore > previousScore) {
                deps.queueLevelEventForRealm(state, safeScore);
            }
        }

        function getRealmLabel(state) {
            const realm = REALMS[state.realmIndex] || REALMS[REALMS.length - 1];
            const stage = realm.stages[state.stageIndex] || realm.stages[realm.stages.length - 1];
            return `${realm.name}·${stage}`;
        }

        function getRouteDominant(state) {
            const entries = Object.entries(state.routeScores);
            entries.sort((left, right) => right[1] - left[1]);
            return entries[0][0];
        }

        function getRouteDisplay(state) {
            const dominant = getRouteDominant(state);
            if (state.routeScores[dominant] <= 0) {
                return '未定';
            }

            const labels = {
                orthodox: '正道',
                demonic: '魔路',
                secluded: '苟修',
            };
            return labels[dominant];
        }

        function recalculateState(state, healFull) {
            const realm = REALMS[state.realmIndex] || REALMS[REALMS.length - 1];
            const stageMultiplier = 1 + (state.stageIndex * 0.55);
            state.maxCultivation = Math.floor(realm.baseReq * stageMultiplier);
            state.breakthroughRate = Math.max(0.12, CONFIG.baseBreakthroughRate - (state.realmIndex * realm.rateDrop));

            const previousMaxHp = state.playerStats.maxHp || 100;
            const rawHpRatio = previousMaxHp > 0 ? state.playerStats.hp / previousMaxHp : 1;
            const hpRatio = Number.isFinite(rawHpRatio) ? rawHpRatio : 1;
            const baseHp = 100 + (state.realmIndex * 48) + (state.stageIndex * 18);
            const passiveBonuses = deps.getInventoryPassiveBonuses(state);
            const battleWillBonuses = getBattleWillBonuses(state);

            state.playerStats.maxHp = baseHp + passiveBonuses.maxHp + battleWillBonuses.hp;
            state.playerStats.hp = healFull
                ? state.playerStats.maxHp
                : Math.max(1, Math.min(state.playerStats.maxHp, Math.round(state.playerStats.maxHp * hpRatio)));
            state.playerStats.attack = 12 + (state.realmIndex * 5) + (state.stageIndex * 2) + passiveBonuses.attack + battleWillBonuses.attack;
            state.playerStats.defense = 5 + (state.realmIndex * 3) + state.stageIndex + passiveBonuses.defense + battleWillBonuses.defense;
        }

        function pushLog(state, message, type = 'normal') {
            const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
            state.logs.unshift({ message, type, timestamp });
            if (state.logs.length > MAX_LOGS) {
                state.logs = state.logs.slice(0, MAX_LOGS);
            }
        }

        function serializeState(state) {
            return JSON.stringify(state, null, 2);
        }

        function isSupportedSaveData(rawState) {
            return Boolean(
                rawState
                && typeof rawState === 'object'
                && Number.isFinite(rawState.version)
                && rawState.version >= MIN_SUPPORTED_SAVE_VERSION
                && rawState.version <= SAVE_VERSION
            );
        }

        function getPressureStatusText(state) {
            const consequences = normalizeStoryConsequences(state?.storyConsequences);
            return `失败压力已至${consequences.pressureTier}（${consequences.pressureTrend}）`;
        }

        return {
            SAVE_VERSION,
            MIN_SUPPORTED_SAVE_VERSION,
            STORY_CONSEQUENCE_LIMITS,
            createInitialState,
            mergeSave,
            recalculateState,
            getRealmScore,
            setRealmScore,
            getRealmLabel,
            getRouteDisplay,
            getBattleWillBonuses,
            getPressureStatusText,
            createTribulationEnding,
            pushLog,
            serializeState,
            isSupportedSaveData,
            normalizeStoryConsequences,
            normalizeDecisionHistory,
            normalizePendingEchoes,
            normalizeEndingSeeds,
            normalizeRecentChoiceOutcome,
            normalizeStoryCursor,
            normalizeRealmState,
            normalizeActiveTab,
            normalizeInventoryState,
            normalizeLevelStoryState,
            normalizeOfflineTrainingState,
            normalizeRecoveryState,
            normalizeSideQuestRecords,
            getOfflineTrainingCapMs,
            getAverageAutoCultivationGain,
            formatOfflineDuration,
            clampConsequenceValue,
            getPressureTrendLabel,
            createDefaultSideQuests,
            createDefaultDecisionHistory,
            createDefaultPendingEchoes,
            createDefaultEndingSeeds,
            createDefaultStoryConsequences,
            clone,
            PRESSURE_COLLAPSE_THRESHOLD,
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = createStateModule;
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.core = registry.core || {};
    registry.core.createStateModule = createStateModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
