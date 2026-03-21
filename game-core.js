(function (globalScope) {
    const dataSource = globalScope.StoryData || (typeof require === 'function' ? require('./story-data.js') : null);

    if (!dataSource) {
        throw new Error('StoryData 未加载');
    }

    const {
        CONFIG,
        REALMS,
        ITEMS,
        ALCHEMY_RECIPES,
        MONSTERS,
        LOCATIONS,
        NPCS,
        POSITIVE_ENCOUNTERS,
        NEGATIVE_ENCOUNTERS,
        STORY_CHAPTERS,
        LEVEL_STORY_EVENTS,
    } = dataSource;

    const STORY_LOOKUP = new Map(STORY_CHAPTERS.map((chapter) => [chapter.id, chapter]));
    const STORY_ORDER = new Map(STORY_CHAPTERS.map((chapter, index) => [String(chapter.id), index]));
    const MAX_LOGS = 120;
    const SAVE_VERSION = 6;
    const MIN_SUPPORTED_SAVE_VERSION = 5;
    const DECISION_HISTORY_LIMIT = 64;
    const ENDING_SEED_LIMIT = 4;
    const PRESSURE_COLLAPSE_THRESHOLD = 9;
    const TRAINING_GAIN_PER_LINGSHI = 10;
    const TRAINING_BATCHES = Object.freeze({
        '1': 1,
        '10': 10,
        max: Number.POSITIVE_INFINITY,
    });
    const STORY_CONSEQUENCE_LIMITS = Object.freeze({
        battleWill: 8,
        tribulation: 42,
    });
    const PRESSURE_TIERS = Object.freeze([
        { id: 'safe', label: '安全', min: 0, max: 2 },
        { id: 'tense', label: '紧绷', min: 3, max: 5 },
        { id: 'critical', label: '濒危', min: 6, max: 8 },
        { id: 'collapse', label: '失控', min: PRESSURE_COLLAPSE_THRESHOLD, max: STORY_CONSEQUENCE_LIMITS.tribulation },
    ]);
    const EXPEDITION_EVENT_WEIGHTS = Object.freeze({
        battle: 45,
        resource: 35,
        risk: 12,
        clue: 8,
    });

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

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

    function normalizeOfflineTrainingState(rawState) {
        const nextState = createDefaultOfflineTrainingState();
        if (!rawState || typeof rawState !== 'object') {
            return nextState;
        }

        const numericFields = ['lastSavedAt', 'lastSettlementAt', 'lastDurationMs', 'lastEffectiveDurationMs', 'lastGain'];
        numericFields.forEach((fieldName) => {
            const rawValue = rawState[fieldName];
            if (!Number.isFinite(rawValue)) {
                return;
            }
            if (fieldName === 'lastSavedAt' || fieldName === 'lastSettlementAt') {
                nextState[fieldName] = rawValue > 0 ? Math.floor(rawValue) : null;
                return;
            }
            nextState[fieldName] = Math.max(0, Math.floor(rawValue));
        });
        nextState.wasCapped = Boolean(rawState.wasCapped);
        return nextState;
    }

    function normalizeRecoveryState(rawState) {
        const nextState = createDefaultRecoveryState();
        if (!rawState || typeof rawState !== 'object') {
            return nextState;
        }
        if (Number.isFinite(rawState.lastCheckedAt) && rawState.lastCheckedAt > 0) {
            nextState.lastCheckedAt = Math.floor(rawState.lastCheckedAt);
        }
        return nextState;
    }

    function clampConsequenceValue(rawValue, upperBound) {
        if (!Number.isFinite(rawValue)) {
            return 0;
        }
        return Math.max(0, Math.min(upperBound, Math.floor(rawValue)));
    }

    function getPressureTierMeta(tribulation) {
        const safeTribulation = clampConsequenceValue(tribulation, STORY_CONSEQUENCE_LIMITS.tribulation);
        return PRESSURE_TIERS.find((item) => safeTribulation >= item.min && safeTribulation <= item.max) || PRESSURE_TIERS[0];
    }

    function getPressureTrendLabel(delta) {
        if (delta > 0) {
            return '上扬';
        }
        if (delta < 0) {
            return '缓和';
        }
        return '平稳';
    }

    function normalizeStoryConsequences(rawState) {
        const nextState = createDefaultStoryConsequences();
        if (!rawState || typeof rawState !== 'object') {
            return nextState;
        }

        nextState.battleWill = clampConsequenceValue(rawState.battleWill, STORY_CONSEQUENCE_LIMITS.battleWill);
        nextState.tribulation = clampConsequenceValue(rawState.tribulation, STORY_CONSEQUENCE_LIMITS.tribulation);
        nextState.pressureTier = getPressureTierMeta(nextState.tribulation).label;
        nextState.pressureTrend = typeof rawState.pressureTrend === 'string' && rawState.pressureTrend
            ? rawState.pressureTrend
            : '平稳';
        return nextState;
    }

    function normalizeDecisionHistory(rawState) {
        if (!Array.isArray(rawState)) {
            return createDefaultDecisionHistory();
        }
        return rawState
            .filter((entry) => entry && typeof entry === 'object')
            .slice(-DECISION_HISTORY_LIMIT)
            .map((entry) => ({
                chapterId: entry.chapterId ?? null,
                choiceId: entry.choiceId ?? null,
                promiseType: entry.promiseType ?? 'protect',
                promiseLabel: entry.promiseLabel ?? '保全',
                riskTier: entry.riskTier ?? 'steady',
                riskLabel: entry.riskLabel ?? '稳妥',
                costLabel: entry.costLabel ?? '',
                immediateSummary: entry.immediateSummary ?? '',
                longTermHint: entry.longTermHint ?? '',
                branchImpactTitle: entry.branchImpactTitle ?? '',
                branchImpactDetail: entry.branchImpactDetail ?? '',
                pressureDelta: clampConsequenceValue(entry.pressureDelta, 3),
                endingSeedIds: Array.isArray(entry.endingSeedIds) ? entry.endingSeedIds.slice(0, ENDING_SEED_LIMIT) : [],
            }));
    }

    function normalizePendingEchoes(rawState) {
        if (!Array.isArray(rawState)) {
            return createDefaultPendingEchoes();
        }
        return rawState
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => ({
                id: entry.id ?? null,
                sourceChapterId: entry.sourceChapterId ?? null,
                sourceChoiceId: entry.sourceChoiceId ?? null,
                title: entry.title ?? '延迟回响',
                detail: entry.detail ?? '',
                eligibleFromProgress: Number.isFinite(entry.eligibleFromProgress) ? Math.max(0, Math.floor(entry.eligibleFromProgress)) : 0,
                eligibleToProgress: Number.isFinite(entry.eligibleToProgress) ? Math.max(0, Math.floor(entry.eligibleToProgress)) : STORY_CONSEQUENCE_LIMITS.tribulation,
                consumed: Boolean(entry.consumed),
            }));
    }

    function normalizeEndingSeeds(rawState) {
        if (!Array.isArray(rawState)) {
            return createDefaultEndingSeeds();
        }
        return rawState
            .filter((entry) => entry && typeof entry === 'object')
            .slice(-ENDING_SEED_LIMIT)
            .map((entry) => ({
                id: entry.id ?? null,
                sourceChapterId: entry.sourceChapterId ?? null,
                sourceChoiceId: entry.sourceChoiceId ?? null,
                promiseType: entry.promiseType ?? 'protect',
                note: entry.note ?? '',
            }));
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

        const source = rawCursor.source === 'level' || rawCursor.source === 'ending' ? rawCursor.source : 'main';
        const storyId = rawCursor.storyId ?? rawCursor.chapterId ?? null;
        return {
            source,
            storyId,
            chapterId: rawCursor.chapterId ?? storyId,
            beatIndex: Number.isInteger(rawCursor.beatIndex) ? rawCursor.beatIndex : 0,
            mode: rawCursor.mode === 'playing' || rawCursor.mode === 'choices' ? rawCursor.mode : 'idle',
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
        return rawTab === 'alchemy' || rawTab === 'story'
            ? rawTab
            : 'cultivation';
    }

    function normalizeInventoryState(rawInventory) {
        if (!rawInventory || typeof rawInventory !== 'object') {
            return {};
        }

        return Object.entries(rawInventory).reduce((result, [itemId, rawValue]) => {
            if (!Number.isFinite(rawValue)) {
                return result;
            }
            const nextValue = Math.max(0, Math.floor(rawValue));
            if (nextValue > 0) {
                result[itemId] = nextValue;
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
            id: 'zouhuorumo',
            title: '走火入魔',
            description: `你一路累积的失败压力终于越过${consequences.pressureTier}边界。先前那些涉险而行、强撑不退的选择没有再被稳住，识海里的裂声也在此刻一起反噬回来。`,
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
        recalculateState(state, true);
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
        recalculateState(nextState, false);
        nextState.cultivation = Math.max(0, Math.min(nextState.maxCultivation, nextState.cultivation));
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
        recalculateState(state, true);
        if (safeScore > previousScore) {
            queueLevelEventForRealm(state, safeScore);
        }
    }

    function getRealmLabel(state) {
        const realm = REALMS[state.realmIndex] || REALMS[REALMS.length - 1];
        const stage = realm.stages[state.stageIndex] || realm.stages[realm.stages.length - 1];
        return `${realm.name}·${stage}`;
    }

    function getRouteDominant(state) {
        const entries = Object.entries(state.routeScores);
        entries.sort((a, b) => b[1] - a[1]);
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

    function getItemActions(itemId) {
        const item = ITEMS[itemId];
        if (!item) {
            return [];
        }
        if (Array.isArray(item.actions) && item.actions.length > 0) {
            return item.actions;
        }
        if (item.usable && item.effect) {
            return [{ id: 'use', label: '使用', summary: item.description, effect: item.effect }];
        }
        return [];
    }

    function getItemPassiveCount(state, itemId, item) {
        const count = getInventoryCount(state, itemId);
        if (count <= 0 || !item?.passiveEffects) {
            return 0;
        }
        if (Number.isFinite(item.passiveCap)) {
            return Math.max(0, Math.min(count, Math.floor(item.passiveCap)));
        }
        return 1;
    }

    function getInventoryPassiveBonuses(state) {
        const bonuses = {
            attack: 0,
            defense: 0,
            maxHp: 0,
            breakthroughBonus: 0,
        };

        Object.entries(ITEMS).forEach(([itemId, item]) => {
            const passiveCount = getItemPassiveCount(state, itemId, item);
            if (passiveCount <= 0) {
                return;
            }

            Object.entries(item.passiveEffects || {}).forEach(([statKey, amount]) => {
                if (!Number.isFinite(amount)) {
                    return;
                }
                bonuses[statKey] = (bonuses[statKey] || 0) + (amount * passiveCount);
            });
        });

        return bonuses;
    }

    function getBreakthroughActualRate(state) {
        const passiveBonuses = getInventoryPassiveBonuses(state);
        return Math.min(0.95, state.breakthroughRate + state.breakthroughBonus + (passiveBonuses.breakthroughBonus || 0));
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
        const passiveBonuses = getInventoryPassiveBonuses(state);
        const battleWillBonuses = getBattleWillBonuses(state);

        state.playerStats.maxHp = baseHp + passiveBonuses.maxHp + battleWillBonuses.hp;
        state.playerStats.hp = healFull ? state.playerStats.maxHp : Math.max(1, Math.min(state.playerStats.maxHp, Math.round(state.playerStats.maxHp * hpRatio)));
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

    function getInventoryCount(state, itemId) {
        return Math.max(0, state.inventory[itemId] || 0);
    }

    function getMissingCosts(state, costs) {
        if (!costs) {
            return {};
        }

        return Object.entries(costs).reduce((result, [itemId, amount]) => {
            const shortage = Math.max(0, amount - getInventoryCount(state, itemId));
            if (shortage > 0) {
                result[itemId] = shortage;
            }
            return result;
        }, {});
    }

    function canAffordCosts(state, costs) {
        return Object.keys(getMissingCosts(state, costs)).length === 0;
    }

    function changeItem(state, itemId, delta) {
        if (!ITEMS[itemId] || delta === 0) {
            return false;
        }

        const current = getInventoryCount(state, itemId);
        if (delta < 0 && current < Math.abs(delta)) {
            return false;
        }

        const nextValue = current + delta;
        if (nextValue <= 0) {
            delete state.inventory[itemId];
        } else {
            state.inventory[itemId] = nextValue;
        }
        return true;
    }

    function applyCosts(state, costs) {
        if (!costs) {
            return true;
        }
        if (!canAffordCosts(state, costs)) {
            return false;
        }

        Object.entries(costs).forEach(([itemId, amount]) => {
            changeItem(state, itemId, -amount);
            pushLog(state, `消耗 ${ITEMS[itemId].name} x${amount}`, 'bad');
        });
        return true;
    }

    function applyEffects(state, effects) {
        if (!effects) {
            return;
        }

        if (effects.cultivation) {
            state.cultivation = Math.max(0, Math.min(state.maxCultivation, state.cultivation + effects.cultivation));
        }

        if (effects.breakthroughBonus) {
            state.breakthroughBonus += effects.breakthroughBonus;
        }

        if (effects.healRatio) {
            const healAmount = Math.round(state.playerStats.maxHp * effects.healRatio);
            state.playerStats.hp = Math.min(state.playerStats.maxHp, state.playerStats.hp + healAmount);
        }

        if (effects.items) {
            Object.entries(effects.items).forEach(([itemId, amount]) => {
                if (amount === 0) {
                    return;
                }
                const changed = changeItem(state, itemId, amount);
                if (!changed) {
                    return;
                }
                const actionLabel = amount > 0 ? '获得' : '失去';
                pushLog(state, `${actionLabel} ${ITEMS[itemId].name} x${Math.abs(amount)}`, amount > 0 ? 'good' : 'bad');
            });
        }

        if (effects.relations) {
            Object.entries(effects.relations).forEach(([npcName, amount]) => {
                state.npcRelations[npcName] = (state.npcRelations[npcName] || 0) + amount;
                pushLog(state, `${npcName} 关系 ${amount > 0 ? '+' : ''}${amount}`, amount > 0 ? 'good' : 'bad');
            });
        }

        if (effects.routeScores) {
            Object.entries(effects.routeScores).forEach(([routeKey, amount]) => {
                state.routeScores[routeKey] = (state.routeScores[routeKey] || 0) + amount;
            });
        }

        if (effects.flags) {
            Object.assign(state.flags, effects.flags);
        }

        if (effects.location) {
            state.currentLocation = effects.location;
        }

        recalculateState(state, false);
    }

    function applyChoiceTradeoff(state, story, choice) {
        const tradeoff = choice.tradeoff && typeof choice.tradeoff === 'object'
            ? choice.tradeoff
            : { battleWillGain: 2, tribulationGain: 1 };
        const previousConsequences = normalizeStoryConsequences(state.storyConsequences);
        const battleWillGain = clampConsequenceValue(choice.resolveDelta ?? tradeoff.battleWillGain, 3);
        const tribulationGain = clampConsequenceValue(choice.pressureDelta ?? tradeoff.tribulationGain, 3);
        const nextBattleWill = previousConsequences.battleWill + battleWillGain;
        const nextTribulation = previousConsequences.tribulation + tribulationGain;
        const consequences = normalizeStoryConsequences({
            battleWill: Math.min(STORY_CONSEQUENCE_LIMITS.battleWill, nextBattleWill),
            tribulation: Math.min(STORY_CONSEQUENCE_LIMITS.tribulation, nextTribulation),
            pressureTrend: getPressureTrendLabel(tribulationGain),
        });
        state.storyConsequences = consequences;
        recalculateState(state, false);

        const totalBonus = getBattleWillBonuses(state);
        state.recentChoiceOutcome = {
            chapterId: story.id,
            choiceId: choice.id,
            battleWillGain,
            tribulationGain,
            attackBonus: totalBonus.attack,
            defenseBonus: totalBonus.defense,
            hpBonus: totalBonus.hp,
        };

        pushLog(
            state,
            `抉择余波：${choice.promiseLabel || '承诺'}已落定，失败压力转为${consequences.pressureTier}（${consequences.pressureTrend}）。`,
            tribulationGain > battleWillGain ? 'bad' : 'normal',
        );

        return {
            battleWillGain,
            tribulationGain,
            totalBonus,
            pressureTier: consequences.pressureTier,
            pressureTrend: consequences.pressureTrend,
            triggeredDeath: nextTribulation >= PRESSURE_COLLAPSE_THRESHOLD,
        };
    }

    function appendDecisionHistory(state, entry) {
        state.decisionHistory = normalizeDecisionHistory([...(state.decisionHistory || []), entry]);
    }

    function appendPendingEchoes(state, story, choice) {
        const currentEntries = normalizePendingEchoes(state.pendingEchoes);
        const nextEntries = (choice.delayedEchoes || []).map((entry) => ({
            id: entry.id,
            sourceChapterId: story.id,
            sourceChoiceId: choice.id,
            title: entry.title,
            detail: entry.detail,
            eligibleFromProgress: entry.eligibleFromProgress,
            eligibleToProgress: entry.eligibleToProgress,
            consumed: Boolean(entry.consumed),
        }));
        state.pendingEchoes = normalizePendingEchoes([...currentEntries, ...nextEntries]);
    }

    function appendEndingSeeds(state, story, choice) {
        const currentSeeds = normalizeEndingSeeds(state.endingSeeds);
        const nextSeeds = (choice.endingSeeds || []).map((entry) => ({
            id: entry.id,
            sourceChapterId: story.id,
            sourceChoiceId: choice.id,
            promiseType: entry.promiseType || choice.promiseType,
            note: entry.note,
        }));
        state.endingSeeds = normalizeEndingSeeds([...currentSeeds, ...nextSeeds]);
    }

    function getRecentDecisionEntries(state, limit = DECISION_HISTORY_LIMIT) {
        const entries = normalizeDecisionHistory(state.decisionHistory);
        return entries.slice(Math.max(0, entries.length - limit));
    }

    function getChoiceDefinitionByEntry(chapterId, choiceId, state) {
        const story = getChapterById(chapterId) || getLevelEventById(chapterId);
        if (!story) {
            return null;
        }

        const availableChoices = typeof story.choices === 'function' ? story.choices(state) : story.choices;
        if (!Array.isArray(availableChoices)) {
            return null;
        }
        return availableChoices.find((item) => item.id === choiceId) || null;
    }

    function getLegacyBranchImpact(chapterId, choiceId) {
        return getChoiceDelayedEcho(chapterId, choiceId) || getChoiceImmediateEcho(chapterId, choiceId);
    }

    function getDecisionBranchImpact(entry) {
        if (!entry) {
            return null;
        }

        const title = typeof entry.branchImpactTitle === 'string' ? entry.branchImpactTitle.trim() : '';
        const detail = typeof entry.branchImpactDetail === 'string' ? entry.branchImpactDetail.trim() : '';
        if (title && detail) {
            return { title, detail };
        }

        const legacyImpact = getLegacyBranchImpact(entry.chapterId, entry.choiceId);
        if (legacyImpact) {
            return legacyImpact;
        }

        if (detail || title) {
            return {
                title: title || entry.promiseLabel || '分支影响',
                detail: detail || entry.longTermHint || entry.immediateSummary || '这一步已经留在你的路上，之后还会被重新认出。',
            };
        }

        return {
            title: entry.promiseLabel || '分支影响',
            detail: entry.longTermHint || entry.immediateSummary || '这一步已经留在你的路上，之后还会被重新认出。',
        };
    }

    function getEndingRecapLines(state, choice) {
        const chain = getRecentDecisionEntries(state, 4).map((entry) => {
            const impact = getDecisionBranchImpact(entry);
            return `${impact.title} · ${entry.promiseLabel} / ${entry.riskLabel}：${impact.detail}`;
        });
        if (choice) {
            const finalTitle = choice.branchImpact?.title || choice.ending?.title || choice.text;
            chain.push(`收束于「${finalTitle}」：此前留下的每一道分支影响，都在这里一起合了拢。`);
        }
        return chain.slice(-4);
    }

    function decorateEnding(ending, state, choice) {
        return {
            ...clone(ending),
            recapTitle: '关键承诺链',
            recapLines: getEndingRecapLines(state, choice),
        };
    }

    function meetsRequirements(state, requirements) {
        if (!requirements) {
            return true;
        }
        if (requirements.storyProgress !== undefined && state.storyProgress !== requirements.storyProgress) {
            return false;
        }
        if (requirements.realmScoreAtLeast !== undefined && getRealmScore(state) < requirements.realmScoreAtLeast) {
            return false;
        }
        if (requirements.cultivationAtLeast !== undefined && state.cultivation < requirements.cultivationAtLeast) {
            return false;
        }
        if (requirements.relationsMin) {
            const relationOk = Object.entries(requirements.relationsMin).every(([npcName, value]) => (state.npcRelations[npcName] || 0) >= value);
            if (!relationOk) {
                return false;
            }
        }
        if (requirements.items) {
            const itemsOk = Object.entries(requirements.items).every(([itemId, amount]) => getInventoryCount(state, itemId) >= amount);
            if (!itemsOk) {
                return false;
            }
        }
        if (requirements.flagsAll) {
            const flagsOk = Object.entries(requirements.flagsAll).every(([flagName, expected]) => state.flags[flagName] === expected);
            if (!flagsOk) {
                return false;
            }
        }
        if (requirements.notFlags) {
            const notFlagsOk = Object.entries(requirements.notFlags).every(([flagName, expected]) => state.flags[flagName] !== expected);
            if (!notFlagsOk) {
                return false;
            }
        }
        return true;
    }

    function getChapterById(chapterId) {
        return STORY_LOOKUP.get(chapterId) || null;
    }

    function getLevelEventById(eventId) {
        return LEVEL_STORY_EVENTS.find((event) => event.id === eventId) || null;
    }

    function getAvailableMainChapter(state) {
        const chapter = getChapterById(state.storyProgress);
        if (!chapter || !meetsRequirements(state, chapter.requirements)) {
            return null;
        }
        return chapter;
    }

    function getPendingLevelEvents(state) {
        const realmScore = getRealmScore(state);
        const stateMap = state.levelStoryState && state.levelStoryState.events ? state.levelStoryState.events : {};
        return LEVEL_STORY_EVENTS.filter((event) => {
            if (event.realmScore > realmScore) {
                return false;
            }
            const entry = stateMap[event.id] || {};
            if (entry.completed || entry.triggered) {
                return false;
            }
            return meetsRequirements(state, event.requirements);
        });
    }

    function getAvailableLevelEvent(state) {
        const realmScore = getRealmScore(state);
        const pendingEvents = getPendingLevelEvents(state);
        return pendingEvents.find((event) => event.realmScore === realmScore) || pendingEvents[0] || null;
    }

    function queueLevelEventForRealm(state, realmScore) {
        const stateMap = state.levelStoryState && state.levelStoryState.events ? state.levelStoryState.events : {};
        const pendingEvent = LEVEL_STORY_EVENTS.find((event) => {
            if (event.realmScore !== realmScore) {
                return false;
            }
            const entry = stateMap[event.id] || {};
            if (entry.completed || entry.triggered) {
                return false;
            }
            return meetsRequirements(state, event.requirements);
        });

        if (!pendingEvent) {
            return null;
        }

        state.storyCursor = {
            source: 'level',
            storyId: pendingEvent.id,
            chapterId: pendingEvent.id,
            beatIndex: 0,
            mode: 'playing',
        };
        state.levelStoryState.events[pendingEvent.id].triggered = true;
        state.levelStoryState.currentEventId = pendingEvent.id;
        state.currentLocation = pendingEvent.location || state.currentLocation;
        state.unreadStory = shouldMarkStoryUnread(state);
        pushLog(state, `境界感悟浮现：${pendingEvent.title}`, 'breakthrough');
        return pendingEvent;
    }

    function getStoryByCursor(state) {
        const cursor = normalizeStoryCursor(state.storyCursor);
        if (cursor.source === 'ending' || state.ending) {
            return null;
        }

        if (cursor.source === 'level') {
            return getLevelEventById(cursor.storyId);
        }

        return getChapterById(cursor.storyId ?? state.storyProgress);
    }

    function getChoiceDisabledReason(state, choice) {
        const requirementsMet = meetsRequirements(state, choice.requirements);
        const costsMet = canAffordCosts(state, choice.costs);
        if (requirementsMet && costsMet) {
            return '';
        }
        const missing = [];

        Object.entries(choice.requirements?.items || {})
            .filter(([itemId, amount]) => getInventoryCount(state, itemId) < amount)
            .forEach(([itemId, amount]) => {
                missing.push(`${ITEMS[itemId]?.name || itemId} x${amount}`);
            });

        Object.entries(choice.costs || {})
            .filter(([itemId, amount]) => getInventoryCount(state, itemId) < amount)
            .forEach(([itemId, amount]) => {
                missing.push(`${ITEMS[itemId]?.name || itemId} x${amount}`);
            });

        return missing.length > 0 ? `不足：${missing.join('、')}` : '当前条件不足';
    }

    function resolveStoryDefinition(definition, state, source) {
        if (!definition) {
            return null;
        }
        const beats = typeof definition.beats === 'function' ? definition.beats(state) : (definition.beats || []);
        const rawChoices = typeof definition.choices === 'function' ? definition.choices(state) : (definition.choices || []);
        const choices = rawChoices.map((choice, index) => {
            const normalizedChoice = clone(choice);
            if (!normalizedChoice.id) {
                // 小境界事件允许用文本驱动定义，但运行期必须有稳定 id，避免选择和测试都落到 undefined。
                normalizedChoice.id = `${definition.id}_choice_${index}`;
            }
            const disabled = !meetsRequirements(state, normalizedChoice.requirements) || !canAffordCosts(state, normalizedChoice.costs);
            return {
                ...normalizedChoice,
                disabled,
                disabledReason: disabled ? getChoiceDisabledReason(state, normalizedChoice) : '',
            };
        });
        return { ...definition, source, beats, choices };
    }

    function resolveChapter(chapter, state) {
        return resolveStoryDefinition(chapter, state, 'main');
    }

    function getCurrentPlayableStory(state) {
        if (state.ending) {
            return null;
        }

        const cursor = normalizeStoryCursor(state.storyCursor);
        if (cursor.mode === 'playing' || cursor.mode === 'choices') {
            const currentStory = getStoryByCursor({ ...state, storyCursor: cursor });
            if (currentStory && cursor.source !== 'level') {
                const chapter = getAvailableMainChapter(state);
                if (chapter && chapter.id === currentStory.id) {
                    return resolveStoryDefinition(chapter, state, 'main');
                }
            }
            if (currentStory && cursor.source === 'level') {
                const stateMap = state.levelStoryState && state.levelStoryState.events ? state.levelStoryState.events : {};
                const entry = stateMap[currentStory.id] || {};
                if (!entry.completed) {
                    return resolveStoryDefinition(currentStory, state, 'level');
                }
            }
        }

        const mainChapter = getAvailableMainChapter(state);
        if (mainChapter) {
            return resolveStoryDefinition(mainChapter, state, 'main');
        }

        const levelEvent = getAvailableLevelEvent(state);
        if (levelEvent) {
            return resolveStoryDefinition(levelEvent, state, 'level');
        }

        return null;
    }

    function formatStoryLabel(story) {
        if (!story) {
            return '未知剧情';
        }
        if (story.source === 'level') {
            return `小境界事件《${story.title}》`;
        }
        if (story.chapterLabel) {
            return story.chapterLabel;
        }
        if (typeof story.id === 'number' && Number.isFinite(story.id)) {
            return `第${story.id + 1}章《${story.title}》`;
        }
        return `《${story.title}》`;
    }

    function shouldMarkStoryUnread(state) {
        return state?.ui?.activeTab !== 'story';
    }

    function ensureStoryCursor(state) {
        if (state.ending) {
            state.storyCursor = {
                source: 'ending',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            return null;
        }

        const current = getCurrentPlayableStory(state);
        if (!current) {
            state.storyCursor = {
                source: 'main',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            state.levelStoryState.currentEventId = null;
            return null;
        }

        const cursor = normalizeStoryCursor(state.storyCursor);
        if (cursor.source !== current.source || cursor.storyId !== current.id || cursor.mode === 'idle') {
            state.storyCursor = {
                source: current.source,
                storyId: current.id,
                chapterId: current.id,
                beatIndex: 0,
                mode: 'playing',
            };
            if (current.source === 'level') {
                state.levelStoryState.events[current.id].triggered = true;
                state.levelStoryState.currentEventId = current.id;
            } else {
                state.levelStoryState.currentEventId = null;
            }
            state.currentLocation = current.location || state.currentLocation;
            state.unreadStory = shouldMarkStoryUnread(state);
            const storyLabel = formatStoryLabel(current);
            pushLog(state, `新剧情开启：${storyLabel}`, 'breakthrough');
        }

        return resolveStoryDefinition(current, state, current.source);
    }

    function getStoryView(state) {
        if (state.ending) {
            return {
                source: 'ending',
                mode: 'ending',
                story: null,
                chapter: null,
                ending: clone(state.ending),
            };
        }

        const story = ensureStoryCursor(state);
        if (!story) {
            return null;
        }

        const visibleCount = state.storyCursor.mode === 'choices'
            ? story.beats.length
            : Math.min(story.beats.length, state.storyCursor.beatIndex + 1);

        return {
            source: story.source,
            mode: state.storyCursor.mode,
            story,
            chapter: story,
            visibleBeats: story.beats.slice(0, visibleCount),
            currentBeat: story.beats[Math.max(0, visibleCount - 1)] || null,
            choices: state.storyCursor.mode === 'choices' ? story.choices : [],
        };
    }

    function advanceStoryBeat(state) {
        const story = ensureStoryCursor(state);
        if (!story) {
            return { ok: false, reason: 'no-story' };
        }
        if (state.storyCursor.mode === 'choices') {
            return { ok: true, mode: 'choices' };
        }
        if (state.storyCursor.beatIndex < story.beats.length - 1) {
            state.storyCursor.beatIndex += 1;
            return { ok: true, mode: 'playing' };
        }
        state.storyCursor.mode = 'choices';
        return { ok: true, mode: 'choices' };
    }

    function skipStoryPlayback(state) {
        const story = ensureStoryCursor(state);
        if (!story) {
            return { ok: false, reason: 'no-story' };
        }
        state.storyCursor.beatIndex = Math.max(0, story.beats.length - 1);
        state.storyCursor.mode = 'choices';
        return { ok: true };
    }

    function chooseStoryOption(state, choiceId) {
        const story = ensureStoryCursor(state);
        if (!story || state.storyCursor.mode !== 'choices') {
            return { ok: false, error: '当前没有可选择的剧情选项。' };
        }

        const choice = story.choices.find((item) => item.id === choiceId);
        if (!choice) {
            return { ok: false, error: '选项不存在。' };
        }
        if (choice.disabled) {
            return { ok: false, error: choice.disabledReason || '资源不足，无法选择该选项。' };
        }
        if (!applyCosts(state, choice.costs)) {
            return { ok: false, error: '资源不足，无法支付代价。' };
        }

        applyEffects(state, choice.effects);
        pushLog(state, `剧情抉择：${choice.text}`, 'normal');
        const tradeoffResult = applyChoiceTradeoff(state, story, choice);

        if (story.source === 'main') {
            const chapterId = story.id;
            state.chapterChoices[String(chapterId)] = choice.id;
            state.recentChoiceEcho = { chapterId, choiceId: choice.id };
        }

        if (story.source === 'level') {
            const levelEntry = state.levelStoryState.events[story.id] || { triggered: true, completed: false };
            levelEntry.triggered = true;
            levelEntry.completed = true;
            state.levelStoryState.events[story.id] = levelEntry;
            state.levelStoryState.currentEventId = null;
        }

        appendDecisionHistory(state, {
            chapterId: story.id,
            choiceId: choice.id,
            promiseType: choice.promiseType,
            promiseLabel: choice.promiseLabel,
            riskTier: choice.riskTier,
            riskLabel: choice.riskLabel,
            costLabel: choice.visibleCostLabel || formatCosts(choice.costs),
            immediateSummary: choice.immediateResult?.detail || choice.text,
            longTermHint: choice.longTermHint || '',
            branchImpactTitle: choice.branchImpact?.title || '',
            branchImpactDetail: choice.branchImpact?.detail || '',
            pressureDelta: tradeoffResult.tribulationGain,
            endingSeedIds: (choice.endingSeeds || []).map((entry) => entry.id),
        });
        appendPendingEchoes(state, story, choice);
        appendEndingSeeds(state, story, choice);

        if (tradeoffResult.triggeredDeath) {
            state.ending = decorateEnding(createTribulationEnding(state), state, choice);
            state.storyCursor = {
                source: 'ending',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            state.storyProgress = -1;
            pushLog(state, '失败压力进入失控，本局在走火入魔中终结。', 'fail');
            return { ok: true, ending: true, death: true };
        }

        if (choice.ending) {
            state.ending = decorateEnding(choice.ending, state, choice);
            state.storyCursor = {
                source: 'ending',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            state.storyProgress = -1;
            pushLog(state, `达成结局：${choice.ending.title}`, 'breakthrough');
            return { ok: true, ending: true };
        }

        if (story.source === 'main' && choice.nextChapterId !== undefined) {
            state.storyProgress = choice.nextChapterId;
        }

        state.storyCursor = {
            source: 'main',
            storyId: null,
            chapterId: null,
            beatIndex: 0,
            mode: 'idle',
        };
        ensureStoryCursor(state);
        return { ok: true };
    }

    function formatCosts(costs) {
        if (!costs) {
            return '';
        }
        return Object.entries(costs)
            .map(([itemId, amount]) => `${ITEMS[itemId].name} x${amount}`)
            .join('、');
    }

    function getAlchemyUnlockError(state, recipe) {
        const unlock = recipe?.unlock || {};
        if (Number.isFinite(unlock.minRealmIndex) && state.realmIndex < unlock.minRealmIndex) {
            const targetRealm = REALMS[unlock.minRealmIndex] || REALMS[REALMS.length - 1];
            return `境界不足，需达到 ${targetRealm.name}。`;
        }
        if (unlock.requiredItems) {
            const missingItems = getMissingCosts(state, unlock.requiredItems);
            if (Object.keys(missingItems).length > 0) {
                return `锁定：需先持有 ${formatCosts(missingItems)}`;
            }
        }
        return '';
    }

    function getAlchemyRecipes(state) {
        return Object.values(ALCHEMY_RECIPES).map((recipe) => {
            const lockReason = getAlchemyUnlockError(state, recipe);
            const missingCosts = getMissingCosts(state, recipe.costs);
            const missingCostText = Object.keys(missingCosts).length > 0 ? formatCosts(missingCosts) : '';
            return {
                id: recipe.id,
                name: recipe.name,
                category: recipe.category,
                summary: recipe.summary,
                costs: clone(recipe.costs || {}),
                outputs: clone(recipe.outputs || {}),
                unlock: clone(recipe.unlock || {}),
                costText: formatCosts(recipe.costs),
                outputText: formatCosts(recipe.outputs),
                lockReason,
                missingCosts,
                missingCostText,
                unlocked: !lockReason,
                canCraft: !lockReason && !missingCostText,
                disabledReason: lockReason || (missingCostText ? `缺少：${missingCostText}` : ''),
            };
        });
    }

    function craftRecipe(state, recipeId, options = {}) {
        if (options.inCombat) {
            return { ok: false, error: '战斗中不可分心炼丹。' };
        }

        const recipe = ALCHEMY_RECIPES[recipeId];
        if (!recipe) {
            return { ok: false, error: '丹方不存在。' };
        }

        const lockReason = getAlchemyUnlockError(state, recipe);
        if (lockReason) {
            return { ok: false, error: lockReason };
        }

        const missingCosts = getMissingCosts(state, recipe.costs);
        if (Object.keys(missingCosts).length > 0) {
            return { ok: false, error: `材料不足：${formatCosts(missingCosts)}` };
        }

        if (!applyCosts(state, recipe.costs)) {
            return { ok: false, error: '材料不足。' };
        }

        applyEffects(state, { items: recipe.outputs });
        const outputText = formatCosts(recipe.outputs);
        pushLog(state, `${recipe.name} 成功，炼成 ${outputText}`, 'good');
        return {
            ok: true,
            recipeId,
            outputs: clone(recipe.outputs || {}),
            outputText,
            message: `炼成 ${outputText}`,
        };
    }

    function getNextGoalText(state) {
        if (state.ending) {
            return '结局已定，可重开体验另一条路。';
        }
        const chapter = getChapterById(state.storyProgress);
        const mainReady = chapter && meetsRequirements(state, chapter.requirements);
        if (!mainReady) {
            const levelEvent = getAvailableLevelEvent(state);
            if (levelEvent) {
                return `下一条等级事件：${levelEvent.title}（${REALMS[Math.floor(levelEvent.realmScore / 3)].name}·${REALMS[Math.floor(levelEvent.realmScore / 3)].stages[levelEvent.realmScore % 3]}）`;
            }
        }
        if (!chapter) {
            return '暂无待触发剧情。';
        }
        const requirements = chapter.requirements || {};
        const hints = [];
        if (requirements.realmScoreAtLeast !== undefined && getRealmScore(state) < requirements.realmScoreAtLeast) {
            const realmIndex = Math.floor(requirements.realmScoreAtLeast / 3);
            const stageIndex = requirements.realmScoreAtLeast % 3;
            hints.push(`修至 ${REALMS[realmIndex].name}${REALMS[realmIndex].stages[stageIndex]}`);
        }
        if (requirements.cultivationAtLeast !== undefined && state.cultivation < requirements.cultivationAtLeast) {
            hints.push(`当前修为达到 ${requirements.cultivationAtLeast}`);
        }
        if (requirements.relationsMin) {
            Object.entries(requirements.relationsMin).forEach(([npcName, value]) => {
                if ((state.npcRelations[npcName] || 0) < value) {
                    hints.push(`${npcName} 关系至少 ${value}`);
                }
            });
        }
        if (requirements.items) {
            Object.entries(requirements.items).forEach(([itemId, value]) => {
                if (getInventoryCount(state, itemId) < value) {
                    hints.push(`持有 ${ITEMS[itemId].name} x${value}`);
                }
            });
        }
        return hints.length > 0 ? `下一章触发条件：${hints.join('，')}` : '下一章条件已满足，请前往剧情页。';
    }

    function getRouteSummary(state) {
        const dominant = getRouteDominant(state);
        const consequences = normalizeStoryConsequences(state.storyConsequences);
        const battleWillBonuses = getBattleWillBonuses(state);
        const scoreMap = {
            orthodox: state.routeScores.orthodox,
            demonic: state.routeScores.demonic,
            secluded: state.routeScores.secluded,
        };

        const descriptions = {
            orthodox: {
                title: '正道倾向',
                detail: '你仍愿意替人、替宗门或替某种秩序留出位置。很多后续剧情会因此更偏向“护住什么”。',
            },
            demonic: {
                title: '魔路倾向',
                detail: '你越来越习惯先抓住收益，再决定要不要给别人留活口。很多章节会因此更锋利。',
            },
            secluded: {
                title: '苟修倾向',
                detail: '你更擅长藏锋、留退路、绕开最正面的冲撞。很多回响会偏向规避因果与延后出手。',
            },
        };

        const summary = descriptions[dominant];
        return [
            {
                title: summary.title,
                detail: summary.detail,
            },
            {
                title: '分值对照',
                detail: `正道 ${scoreMap.orthodox} / 魔路 ${scoreMap.demonic} / 苟修 ${scoreMap.secluded}`,
            },
            {
                title: '战意',
                detail: `当前战斗加成：攻击 +${battleWillBonuses.attack} / 防御 +${battleWillBonuses.defense} / 气血 +${battleWillBonuses.hp}`,
            },
            {
                title: '失败压力',
                detail: `当前处于${consequences.pressureTier}，趋势${consequences.pressureTrend}。进入失控后将触发走火入魔终局。`,
            },
        ];
    }

    function getMainStoryProgressValue(state) {
        if (typeof state.storyProgress === 'number' && Number.isFinite(state.storyProgress)) {
            return state.storyProgress;
        }
        const matched = String(state.storyProgress || '').match(/^(\d+)/);
        return matched ? Number.parseInt(matched[1], 10) : 0;
    }

    function hasAnyStateFlag(state, flagNames) {
        const flags = state?.flags || {};
        return flagNames.some((flagName) => Boolean(flags[flagName]));
    }

    function getChoiceImmediateEcho(chapterId, choiceId) {
        const echoKey = `${chapterId}:${choiceId}`;
        switch (echoKey) {
        case '8:protect_mo_house':
            return { title: '墨府回响', detail: '你离开时，院中的灯没有立刻熄。那点光不算明亮，却像一笔你已经答应接下的活人账。' };
        case '8:take_treasure_leave':
            return { title: '卷财离场', detail: '你带走了最值钱的东西，也把墨府最后一点还能相信你的理由一起带走了。' };
        case '8:promise_caihuan':
            return { title: '留下承诺', detail: '你没有立刻补上这笔账。可从你开口的那一刻起，这就不再是“以后再说”，而是迟早要回来面对的事。' };
        case '9:take_quhun':
            return { title: '曲魂在侧', detail: '你把一件可怕的东西留在了身边。从这天起，你越来越会把危险变成自己的力量。' };
        case '9:repair_quhun':
            return { title: '曲魂留痕', detail: '你把曲魂留在身边，却没把它只当工具。这会让你以后很难再把“用人”两个字说得太轻。' };
        case '9:release_quhun':
            return { title: '超度曲魂', detail: '法火烧起来时，屋中像忽然轻了一点。你失去了一件好用的工具，却保住了一种还能直视自己的可能。' };
        case '9:buy_back_trust':
            return { title: '先把债压住', detail: '你没有立刻伸手，也没有替这件事下最终判决。很多时候，暂时不判，并不代表迟早能避开。' };
        case '14:save_nangong':
            return { title: '禁地回身', detail: '你慢了半息，却也正是这半息，让你以后再想起禁地时，至少还能认得那时的自己。' };
        case '14:watch_and_wait':
            return { title: '避开杀圈', detail: '你活得最稳，也看得最清。很多时候，最稳的路往往也最孤。' };
        case '14:loot_in_chaos':
            return { title: '主药先手', detail: '主药入手时，你先想到的不是喜悦，而是以后再遇上类似的局，你会不会越来越快。' };
        case '14:kill_for_gain':
            return { title: '高效成瘾', detail: '你把更狠的那一步也一起跨过去了。最先留下的，不是喜悦，而是你已经知道自己会越来越快。' };
        case '15:accept_nangong_debt':
            return { title: '认下情债', detail: '你并没有因此变弱。只是从这一刻起，你往后很多决定都不能再只按“值不值”来算。' };
        case '15:suppress_nangong_feelings':
            return { title: '压住心绪', detail: '你把那点心绪压了下去，手很稳。可真正难的不是压住，而是压久了以后，会不会连自己都信了那不重要。' };
        case '15:cut_nangong_ties':
            return { title: '斩情求稳', detail: '你想把一切切得干净。可修行路上很多东西都能斩，真正难斩的是已经进过心的那一瞬。' };
        case '16:become_li_disciple':
            return { title: '正式入门', detail: '令牌入手那一刻，你得到的不只是庇护。你也第一次真正站进了某个秩序里。' };
        case '16:keep_free':
            return { title: '受教而留步', detail: '你既想听明白局势，也想留好退路。这没有错，只是从今以后，别人很难彻底把后背交给你。' };
        case '16:learn_in_secret':
            return { title: '借势而行', detail: '你做了最现实的选择。这能让你走得快，也会让真正看得懂局的人更早防你。' };
        case '17:stay_quiet_banquet':
            return { title: '席间观局', detail: '你没在桌上替谁开口，却也因此让更多人记住：你不是那种能被一句话拖下场的人。' };
        case '17:show_strength_banquet':
            return { title: '席上立威', detail: '你把场面压住了，也把很多人的记恨一起压进了心里。' };
        case '17:trade_favors_banquet':
            return { title: '桌下结线', detail: '你没有赢一夜的风头，却可能赢了很多以后才会显出用处的门路。' };
        case '18:fight_for_sect':
            return { title: '护住阵线', detail: '你不是不怕死，只是最后没有让“我能活”压过“他们会死”。' };
        case '18:defect_demonic':
            return { title: '斩敌夺势', detail: '你做得很快，快到几乎没有多余情绪。那一刻你便知道，自己正在变成一种以后连自己都得提防的效率。' };
        case '18:fake_fight':
            return { title: '只带少数人走', detail: '你没替宗门补完那道裂口。可你救下的那些人，会比任何阵亡名册都更具体地记住你。' };
        case '19:hold_the_line':
            return { title: '死守矿线', detail: '你撑住了场面，也把更多人的生死一起压到了自己肩上。这不是最聪明的路，却是最像领头人的路。' };
        case '19:lead_breakout':
            return { title: '带队突围', detail: '你放弃了死守，也放弃了体面上的全赢。可你第一次真正明白，带人活出来，本身就是一种很重的本事。' };
        case '19:rescue_rearguard':
            return { title: '回身接人', detail: '你没有把所有人都带出来，却把最后一段最容易被放弃的人命也扛进了自己的账里。' };
        case '19:sabotage_and_leave':
            return { title: '炸路脱身', detail: '你做的是能保自己脱身的干净选择。可真正拖住你的，是那些你明知来得及多做一点、却还是转身了的瞬间。' };
        case '19:escape_alone':
            return { title: '自保脱身', detail: '你做的是最干净利落的选择。可真正拖住你的，是那些你明知来得及多做一点、却还是转身了的瞬间。' };
        case '19:open_mine_gate':
            return { title: '开门换位', detail: '你把最冷的一步走成了现实。真正留下的，不是矿门开没开，而是你已经知道自己肯把谁拿去换更高的位置。' };
        case '19:harvest_chaos':
            return { title: '死局收割', detail: '你在最乱的时候先看见了还能拿走什么。那一刻你已经知道，自己越来越像会把尸骨也折成台阶的人。' };
        case '21:hunt_monsters':
            return { title: '猎妖立足', detail: '海上的第一课不是变强，而是知道每次出手都真可能把命丢在水里。' };
        case '21:run_trade':
            return { title: '跑商摸路', detail: '你没有第一时间去抢最凶的活。可你更早学会了什么该碰，什么连看都别多看。' };
        case '21:seek_cave':
            return { title: '闭关隐修', detail: '你拒绝了海上的喧哗。这让你错过很多，也保住了很多。' };
        case '22:collect_map':
            return { title: '残图在手', detail: '你不是拿到了一张图，而是亲手把自己放进了一个知道太多就很难善终的局。' };
        case '22:sell_map':
            return { title: '卖图兑现', detail: '你把危险换成了资源。账面上这是赚，心里却未必真轻。' };
        case '22:avoid_map':
            return { title: '主动避局', detail: '你亲手放过了一扇很可能一生只开一次的门。能做到这一步的人不多。' };
        case '23:grab_treasure':
            return { title: '抢先夺宝', detail: '你先动了。那一刻所有还在维持的表面合作都被你一把撕开。' };
        case '23:cooperate_allies':
            return { title: '先稳同盟', detail: '你没有拿最先那一下，却把一群原本很容易散掉的人重新拉在了一起。' };
        case '23:pull_ally_out':
            return { title: '殿外回身', detail: '你没有在殿内抢那一口，却在殿外把要掉下去的人拉了回来。' };
        case '23:watch_last':
            return { title: '晚半步出手', detail: '你让别人先暴露，自己再找最优位。这很聪明，也让所有活下来的人以后都更难彻底信你。' };
        case '23:sell_route_info':
            return { title: '卖路吃差', detail: '你不争宝物本身，却先把所有人的路数折成价码。' };
        case '23:slip_past_palace':
            return { title: '绕殿而走', detail: '你把自己从最危险的中心摘了出去，也让人更难看清你究竟还留没留别人的位置。' };
        case '24:returned_tiannan_for_settlement':
            return { title: '清算旧账', detail: '你终于把那些拖了很多年的旧账翻到台面上。做完之后并没有想象中痛快，反倒像从身体里慢慢拔出一根埋了太久的刺。' };
        case '24:returned_tiannan_for_bonds':
            return { title: '接住旧情', detail: '你没有再把最重要的人往“以后再说”里推。这一步看似不大，实际上比很多杀伐决断都更难。' };
        case '24:returned_tiannan_but_remained_hidden':
            return { title: '藏锋离场', detail: '你回来过，也处理了该处理的，却没有再把自己重新扔进旧名旧局里。' };
        case '25:lingjie_xianzun':
            return { title: '灵界仙尊', detail: '你最终还是走向了那扇更高的门。你没有洗白自己，只是敢把这一生完整带去更高处。' };
        case '25:renjie_zhizun':
            return { title: '人界至尊', detail: '你明明已经可以离开，却仍决定留下。所谓至尊，不是站得最高，而是走得掉时仍肯回头。' };
        case '25:xiaoyao_sanxian':
            return { title: '逍遥散仙', detail: '你最终选了离开，却不是飞升。你只是终于替自己选了一种还愿意过下去的活法。' };
        case '25:taishang_wangqing':
            return { title: '太上忘情', detail: '你也飞升了，而且比很多人都更干净利落。可真正让人不安的，是你快想不起当年舍不得的是什么。' };
        case '25:yinguo_chanshen':
            return { title: '因果缠身', detail: '你最终还是走到了门前，可门没有真正为你打开。那些以为已被埋掉的旧因旧果，在这一刻全都浮了上来。' };
        case '25:fanxin_weisi':
            return { title: '凡心未死', detail: '门开了，你看见更高处，却最终没有立刻踏出去。这一次，你选留下。' };
        default:
            return null;
        }
    }

    function getSortedChapterChoiceEntries(state) {
        return Object.entries(state.chapterChoices || {})
            .filter(([, choiceId]) => Boolean(choiceId))
            .sort((left, right) => (STORY_ORDER.get(String(right[0])) ?? -1) - (STORY_ORDER.get(String(left[0])) ?? -1));
    }

    function getChoiceDelayedEcho(chapterId, choiceId) {
        const echoKey = `${chapterId}:${choiceId}`;
        switch (echoKey) {
        case '8:protect_mo_house':
            return { title: '墨府余灯', detail: '后来你再想起墨府时，记住的不是墨居仁那张脸，而是墨彩环那句“你若想补，就别只补给自己看”。', npc: '墨彩环' };
        case '8:take_treasure_leave':
            return { title: '宅门旧刺', detail: '日后每当你再看见墨府旧物，心里先浮起来的不是赚到多少，而是那天屋里压着怒气却连哭都没哭出来的安静。', npc: '墨彩环' };
        case '8:promise_caihuan':
            return { title: '一句未完', detail: '有些承诺最重，不是因为说得郑重，而是对方没有逼你发誓，却仍记住了。', npc: '墨彩环' };
        case '9:take_quhun':
            return { title: '曲魂停顿', detail: '后来再驱使曲魂时，你偶尔会想起那一点像人的停顿。那念头很短，却足够让你知道，自己并非全然无感。', npc: '曲魂' };
        case '9:repair_quhun':
            return { title: '曲魂余念', detail: '你没有把曲魂只当兵器。之后每逢再见傀儡、尸炼、禁魂之物，都会比旁人多停一息。', npc: '曲魂' };
        case '9:release_quhun':
            return { title: '火后余白', detail: '此后每逢再见傀儡、尸炼、禁魂之物，你都会比旁人多停一息。那一息很短，却是你没彻底滑下去的证据。', npc: '曲魂' };
        case '9:buy_back_trust':
            return { title: '封存之问', detail: '后来你明白，真正被封住的从来不是曲魂，而是你一时不愿回答的那个问题。', npc: '墨彩环' };
        case '14:save_nangong':
            return { title: '禁地留名', detail: '很多人记住的不是你在禁地里拿了什么，而是你究竟先选了人、药，还是自己。', npc: '南宫婉' };
        case '14:watch_and_wait':
            return { title: '退路先成', detail: '你活得最稳，也看得最清。很多人直到禁地结束都还在替自己找理由，你却已经明白最稳的路往往也最孤。', npc: '南宫婉' };
        case '14:loot_in_chaos':
        case '14:kill_for_gain':
            return { title: '高效之险', detail: '南宫婉会以不同口风记住你在禁地里的那一个动作。越高效，越危险。', npc: '南宫婉' };
        case '15:accept_nangong_debt':
            return { title: '有人算进未来', detail: '有人不是你的拖累，也不是你的工具，而是你一旦认了，就必须把她算进未来的人。', npc: '南宫婉' };
        case '15:suppress_nangong_feelings':
            return { title: '压久成影', detail: '后来每次见她，你都比平时更像无事发生。也正因为太像，才更显得那不是自然，而是刻意。', npc: '南宫婉' };
        case '15:cut_nangong_ties':
            return { title: '记忆未断', detail: '你想提前掐死被谁牵住的可能，可往后只要她再出现一次，你就会知道自己那时未必真斩干净。', npc: '南宫婉' };
        case '16:become_li_disciple':
            return { title: '门墙在身', detail: '此后每当你借到师门之势，都会想起一点：宗门给你的，从来不是白给。', npc: '李化元' };
        case '16:keep_free':
            return { title: '独立有价', detail: '独立不是不站队，而是每一次不彻底站进去，都得自己补足代价。', npc: '李化元' };
        case '16:learn_in_secret':
            return { title: '归属成筹码', detail: '别人说你“会做人”时，你知道那不是夸你温和，而是说你连归属都能算成筹码。', npc: '李化元' };
        case '17:stay_quiet_banquet':
            return { title: '笑里先看座次', detail: '此后再入类似场合，你会本能先看座次、酒次、谁先笑、谁后答。你开始懂得修仙界有些杀机从不带血。', npc: '李化元' };
        case '17:show_strength_banquet':
            return { title: '威与债一起留下', detail: '后来每逢局面发烂，总会有人先想到你是不是又要直接掀桌。这既是威，也是债。', npc: '李化元' };
        case '17:trade_favors_banquet':
            return { title: '门路比风头久', detail: '许多后来避开的坑、谈成的合作，都能追溯到这晚你没有只看眼前场面的那点耐心。', npc: '李化元' };
        case '18:fight_for_sect':
            return { title: '可靠二字', detail: '从这一战开始，别人提起你的名字时，语气里会先带上“可靠”两个字。', npc: '李化元' };
        case '18:defect_demonic':
            return { title: '底线后移', detail: '只要再遇见失去反抗能力的敌人，你都会清楚记得：第一次跨过去以后，后面会越来越容易。', npc: '南宫婉' };
        case '18:fake_fight':
            return { title: '少数人的活路', detail: '你不是愿为所有人负责的人。可对少数认定的人，你会真带他们活着出去。', npc: '南宫婉' };
        case '19:hold_the_line':
            return { title: '一句话压着人命', detail: '后来你总会想起那种感觉：一句话出口，别人是真的会拿命照做。', npc: '李化元' };
        case '19:lead_breakout':
            return { title: '生路也算本事', detail: '你往后会越来越擅长判断：什么时候继续顶只是在给死人凑数，什么时候退一步反而是对活人负责。', npc: '李化元' };
        case '19:rescue_rearguard':
            return { title: '最后一段人命', detail: '回头接应的那一步，会让很多旧人后来更愿意把命押在你身上。', npc: '李化元' };
        case '19:sabotage_and_leave':
            return { title: '活路不回头', detail: '你后来越走越稳，也越清楚自己那时切断的，不只是追兵，还有“我还能再多扛一点”的可能。', npc: '李化元' };
        case '19:escape_alone':
            return { title: '矿道背影', detail: '很多年后你未必还记得带出来了什么，却会记得矿道里那几道没来得及跟上的身影。', npc: '李化元' };
        case '19:open_mine_gate':
            return { title: '矿门改色', detail: '后来你再怎么解释利害与大势，这件事都会先一步替别人定义你肯把谁当代价。', npc: '李化元' };
        case '19:harvest_chaos':
            return { title: '冷收益', detail: '你已经证明过，最乱的时候你也能先看见可拿走什么。', npc: '李化元' };
        case '21:hunt_monsters':
            return { title: '海上先活', detail: '星海会逐渐削弱你在天南累积的旧名，逼你在新秩序里重新建立信誉。', npc: '万小山' };
        case '21:run_trade':
            return { title: '风向先清', detail: '往后很多次避祸、寻路、先人一步，都不是靠运气，而是靠你在最开始愿意先把规则摸明白。', npc: '万小山' };
        case '21:seek_cave':
            return { title: '先把自己站稳', detail: '你拒绝了海上的喧哗。这让你错过很多，也保住了很多。', npc: '万小山' };
        case '22:collect_map':
            return { title: '图后追索', detail: '此后只要有人笑着来谈交易，你都会先想：他到底是来买图，还是来确认该不该杀我。', npc: '南宫婉' };
        case '22:sell_map':
            return { title: '危险换了主人', detail: '图纸离手后，危险并没消失，只是换了个主人继续往外滚。你知道别人迟早还会顺藤摸到你这里。', npc: '万小山' };
        case '22:avoid_map':
            return { title: '门前止步', detail: '你避开的不是宝物，而是知道它存在之后，还要装作与己无关的那份代价。', npc: '南宫婉' };
        case '23:grab_treasure':
            return { title: '先伸手的人', detail: '23 章之后，别人会开始按你过去的行为模式来预测你。', npc: '南宫婉' };
        case '23:cooperate_allies':
            return { title: '同盟多留一息', detail: '这一次你没有把人心让给宝光。后面旧盟友与南宫婉都会把这件事继续算在你头上。', npc: '南宫婉' };
        case '23:pull_ally_out':
            return { title: '险边回手', detail: '有人会记得你在最窄那一步先回了头，而不是先算那件宝够不够你多上一层。', npc: '南宫婉' };
        case '23:watch_last':
            return { title: '等得越准越冷', detail: '你越来越擅长让别人先暴露，再踩着最稳的时机出手。久而久之，别人也会把这点一并防着你。', npc: '南宫婉' };
        case '23:sell_route_info':
            return { title: '消息也能伤人', detail: '你证明过，哪怕不亲手下场，也能把局里的死活折进一笔消息差里。', npc: '万小山' };
        case '23:slip_past_palace':
            return { title: '把命藏进缝里', detail: '你越来越擅长从最乱的中心旁边擦过去。别人未必能抓住你，却会知道你很难被真正看透。', npc: '南宫婉' };
        case '24:returned_tiannan_for_settlement':
            return { title: '旧账见光', detail: '天南并没有挽留你。它只是让你把那些该看见的都看了一遍。', npc: '墨彩环' };
        case '24:returned_tiannan_for_bonds':
            return { title: '旧情归位', detail: '旧人见到的不是“你终于回来”，而是你终于肯承认有些人和承诺不能一直拖到以后。', npc: '南宫婉' };
        case '24:returned_tiannan_but_remained_hidden':
            return { title: '只留一道影子', detail: '你回来认过事，却没有再把自己重新扔进旧名旧局里。', npc: '厉飞雨' };
        default:
            return null;
        }
    }

    function getChoiceOutcomeEcho(state) {
        const latestDecision = getRecentDecisionEntries(state, 1)[0] || null;
        if (!latestDecision) {
            return null;
        }

        return {
            title: '即时结果',
            detail: latestDecision.immediateSummary,
        };
    }

    function getChoiceLongTermEcho(state) {
        const latestDecision = getRecentDecisionEntries(state, 1)[0] || null;
        if (!latestDecision || !latestDecision.longTermHint) {
            return null;
        }
        return {
            title: '长期提示',
            detail: latestDecision.longTermHint,
        };
    }

    function getEligiblePendingEchoes(state) {
        const storyProgress = getMainStoryProgressValue(state);
        return normalizePendingEchoes(state.pendingEchoes)
            .filter((entry) => !entry.consumed && storyProgress >= entry.eligibleFromProgress && storyProgress <= entry.eligibleToProgress)
            .slice(-4)
            .map((entry) => ({
                title: entry.title,
                detail: entry.detail,
            }));
    }

    function getChapterSourceLabel(chapterId) {
        const chapter = getChapterById(chapterId);
        if (chapter) {
            const prefix = chapter.chapterLabel || (typeof chapter.id === 'number' ? `第 ${chapter.id + 1} 章` : '主线章节');
            return `${prefix} · ${chapter.title}`;
        }

        const levelEvent = getLevelEventById(chapterId);
        if (levelEvent) {
            return `悟境 · ${levelEvent.title}`;
        }

        if (chapterId !== null && chapterId !== undefined && chapterId !== '') {
            return `章节 · ${chapterId}`;
        }

        return '';
    }

    function getBranchImpactMeta(promiseLabel, riskLabel, chapterId) {
        return [promiseLabel, riskLabel, getChapterSourceLabel(chapterId)]
            .filter(Boolean)
            .join(' · ');
    }

    function getDecisionHistoryBranchImpacts(state) {
        return getRecentDecisionEntries(state, DECISION_HISTORY_LIMIT)
            .slice()
            .reverse()
            .map((entry) => {
                const impact = getDecisionBranchImpact(entry);
                return {
                    title: impact.title,
                    detail: impact.detail,
                    meta: getBranchImpactMeta(entry.promiseLabel, entry.riskLabel, entry.chapterId),
                };
            });
    }

    function getLegacyBranchImpactEntries(state) {
        return getSortedChapterChoiceEntries(state)
            .map(([chapterId, choiceId]) => {
                const impact = getLegacyBranchImpact(chapterId, choiceId);
                if (!impact) {
                    return null;
                }
                const choice = getChoiceDefinitionByEntry(chapterId, choiceId, state);
                return {
                    title: impact.title,
                    detail: impact.detail,
                    meta: getBranchImpactMeta(choice?.promiseLabel || '', choice?.riskLabel || '', chapterId),
                };
            })
            .filter(Boolean);
    }

    function getEchoes(state) {
        const historyEchoes = getDecisionHistoryBranchImpacts(state);
        if (historyEchoes.length > 0) {
            return historyEchoes;
        }

        const legacyEchoes = getLegacyBranchImpactEntries(state);
        if (legacyEchoes.length > 0) {
            return legacyEchoes;
        }

        const recentEcho = getLegacyBranchImpact(state.recentChoiceEcho?.chapterId, state.recentChoiceEcho?.choiceId);
        if (recentEcho) {
            return [{
                title: recentEcho.title,
                detail: recentEcho.detail,
                meta: getChapterSourceLabel(state.recentChoiceEcho?.chapterId),
            }];
        }

        return [{ title: '尚在起势', detail: '关键选择还不够多，继续推进剧情会看到更明显的分支影响。', meta: '' }];
    }

    function getAvailableSideStories(state) {
        const storyProgress = getMainStoryProgressValue(state);
        const stories = [];
        const seenTitles = new Set();
        const pushStory = (title, detail, npc) => {
            if (seenTitles.has(title)) {
                return;
            }
            seenTitles.add(title);
            stories.push(npc ? { title, detail, npc } : { title, detail });
        };

        if (storyProgress >= 8 && hasAnyStateFlag(state, ['protectedMoHouse', 'promisedMoReturn', 'lootedMoHouse', 'daoLvPromise', 'tookTreasure'])) {
            pushStory('旧药账', '墨府旧账房中留下几页被水浸过的账册。账面不清，却隐约能看出一些人名与药材流向。', '墨彩环');
        }
        if (storyProgress >= 9 && hasAnyStateFlag(state, ['hasQuhun', 'sealedQuhun', 'quhunReleased', 'keptQuhun'])) {
            pushStory('药童残影', '你偶然又听见那句断断续续的话：师父让我们闭眼。也许这不是疯话，而是还没被说清的旧案。', '曲魂');
        }
        if (hasAnyStateFlag(state, ['fanxinAnchor1', 'fanxinAnchor2'])) {
            pushStory('青牛旧路', '离家太久后，最容易被忘的不是地方，而是自己最初为什么要走。', '厉飞雨');
        }
        if ((state.npcRelations['厉飞雨'] || 0) >= 15 || state.flags.reconnectedWithLiFeiyu) {
            pushStory('厉飞雨的酒', '有旧友仍活在凡人江湖里。他不懂你如今的境界，却大概还记得你最早是什么样子。', '厉飞雨');
        }
        if (storyProgress >= 8 && (state.npcRelations['墨彩环'] || 0) >= 0) {
            pushStory('墨府来信', '信纸平常，字迹也平常。可越平常的信，越说明写信的人早已学会不把希望全压在你身上。', '墨彩环');
        }
        if (hasAnyStateFlag(state, ['enteredLihuayuanLineage', 'respectedLihuayuanButStayedIndependent', 'usedLihuayuanInfluencePragmatically', 'learnsSecretively'])) {
            pushStory('师门棋局', '你已经不是随便一名弟子。这意味着以后很多看似与你无关的事，都会有人先拿你的态度去试风向。', '李化元');
        }
        if (storyProgress >= 14) {
            pushStory('禁地旧名', '血色禁地过去很久了，可仍有人会在提起你时，先想起那一次你究竟是先救人、先夺药，还是先保自己。', '南宫婉');
        }
        if (storyProgress >= 19 && hasAnyStateFlag(state, ['heldSpiritMineLine', 'ledMineBreakout', 'escapedMineWithCoreAssets'])) {
            pushStory('灵矿幸存者', '灵矿一战之后，活下来的人说法并不一样。有人念你的情，也有人记你的过。', '李化元');
        }
        if (storyProgress >= 21) {
            pushStory('海上契约', '星海不认旧名，只认账。你若想在这里真正站住脚，总要有一两次让人觉得和你合作不亏。', '万小山');
        }
        if (storyProgress >= 22 && hasAnyStateFlag(state, ['enteredVoidHeavenMapGame', 'soldFragmentMapForResources', 'avoidedVoidHeavenCoreConflict', 'hasXuTianTu', 'soldXuTianTu', 'avoidedXuTian'])) {
            pushStory('残图余波', '你以为事情已经过去，其实真正危险的往往不是争图那阵子，而是图早不在手里了，仍有人不确定你到底知道多少。', '南宫婉');
        }
        if (storyProgress >= 24) {
            pushStory('旧地重光', '你已走得太远。可人走得越远，有些旧地越会在某个时候忽然显得很重。');
        }
        if (storyProgress >= 25) {
            pushStory('飞升前夜', '有些人临门一脚，只看更高处；也有人会在这时忽然把一生重新看一遍。');
        }

        if (state.flags.hasSecretInfo) {
            pushStory('黑市暗桩', '太南山那条暗线仍然有用，后面可以继续借它探路或换资源。', '万小山');
        }
        if (stories.length === 0) {
            stories.push({ title: '暂无显性支线', detail: '继续修炼或推进主线后，会解锁新的旁支回响。' });
        }
        return stories;
    }

    function getLocationMeta(state) {
        return LOCATIONS[state.currentLocation] || {
            name: state.currentLocation,
            description: '此地暂无详细记载。',
            npcs: [],
        };
    }

    function getNpcDialogue(state, npcName) {
        const npc = NPCS[npcName];
        if (!npc) {
            return null;
        }
        return {
            name: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: npc.dialogueByStage(state),
        };
    }

    function getMaxTrainableLingshi(state) {
        const currentLingshi = getInventoryCount(state, 'lingshi');
        const remainingCultivation = Math.max(0, state.maxCultivation - state.cultivation);
        if (remainingCultivation <= 0 || currentLingshi <= 0) {
            return 0;
        }
        return Math.min(currentLingshi, Math.ceil(remainingCultivation / TRAINING_GAIN_PER_LINGSHI));
    }

    function getTrainingPreview(state, batchKey = '1') {
        if (canBreakthrough(state)) {
            return {
                ok: false,
                batchKey,
                stonesSpent: 0,
                gain: 0,
                error: '当前修为已满，请先尝试突破。',
            };
        }

        const configuredBatch = TRAINING_BATCHES[batchKey];
        if (configuredBatch === undefined) {
            return {
                ok: false,
                batchKey,
                stonesSpent: 0,
                gain: 0,
                error: '未知的闭关批次。',
            };
        }

        const maxTrainableLingshi = getMaxTrainableLingshi(state);
        if (maxTrainableLingshi <= 0) {
            return {
                ok: false,
                batchKey,
                stonesSpent: 0,
                gain: 0,
                error: '灵石不足，无法闭关。',
            };
        }

        const requestedBatch = Number.isFinite(configuredBatch)
            ? configuredBatch
            : maxTrainableLingshi;
        const stonesSpent = Math.max(0, Math.min(requestedBatch, maxTrainableLingshi));
        return {
            ok: stonesSpent > 0,
            batchKey,
            stonesSpent,
            gain: stonesSpent * TRAINING_GAIN_PER_LINGSHI,
            remainingCultivation: Math.max(0, state.maxCultivation - state.cultivation),
            error: stonesSpent > 0 ? '' : '灵石不足，无法闭关。',
        };
    }

    function trainWithLingshi(state, batchKey = '1') {
        const preview = getTrainingPreview(state, batchKey);
        if (!preview.ok) {
            return { ok: false, error: preview.error, stonesSpent: 0, gain: 0, batchKey };
        }

        const changed = changeItem(state, 'lingshi', -preview.stonesSpent);
        if (!changed) {
            return { ok: false, error: '灵石不足，无法闭关。', stonesSpent: 0, gain: 0, batchKey };
        }

        state.cultivation = Math.min(state.maxCultivation, state.cultivation + preview.gain);
        pushLog(state, `闭关炼化灵石 ${preview.stonesSpent} 枚，修为 +${preview.gain}`, 'normal');
        return {
            ok: true,
            batchKey,
            stonesSpent: preview.stonesSpent,
            gain: preview.gain,
            cultivation: state.cultivation,
        };
    }

    function canBreakthrough(state) {
        return state.cultivation >= state.maxCultivation;
    }

    function attemptBreakthrough(state, rng) {
        const random = rng || Math.random;
        if (!canBreakthrough(state)) {
            return { ok: false, error: '修为未满。' };
        }

        const atFinalPeak = state.realmIndex === REALMS.length - 1 && state.stageIndex === 2;
        if (atFinalPeak) {
            pushLog(state, '你已站在此界巅峰，接下来该去回答最后那一问。', 'breakthrough');
            ensureStoryCursor(state);
            return { ok: true, success: true, capped: true };
        }

        const actualRate = getBreakthroughActualRate(state);
        const success = random() < actualRate;

        if (success) {
            state.stageIndex += 1;
            if (state.stageIndex >= 3) {
                state.stageIndex = 0;
                state.realmIndex = Math.min(state.realmIndex + 1, REALMS.length - 1);
            }
            state.cultivation = 0;
            state.breakthroughBonus = 0;
            recalculateState(state, true);
            pushLog(state, `突破成功，当前境界：${getRealmLabel(state)}`, 'breakthrough');
            queueLevelEventForRealm(state, getRealmScore(state));
            ensureStoryCursor(state);
            return { ok: true, success: true };
        }

        const penalty = Math.floor(state.maxCultivation * CONFIG.failPenaltyRate);
        state.cultivation = Math.max(0, state.cultivation - penalty);
        state.breakthroughBonus = 0;
        pushLog(state, `突破失败，修为受损 ${penalty}`, 'fail');
        return { ok: true, success: false, penalty };
    }

    function chooseExpeditionEventType(random) {
        const totalWeight = Object.values(EXPEDITION_EVENT_WEIGHTS).reduce((sum, value) => sum + value, 0);
        let remainingWeight = random() * totalWeight;
        const orderedKeys = ['battle', 'resource', 'risk', 'clue'];
        for (const key of orderedKeys) {
            remainingWeight -= EXPEDITION_EVENT_WEIGHTS[key];
            if (remainingWeight < 0) {
                return key;
            }
        }
        return 'resource';
    }

    function getExpeditionReward(state, divisor, minimum) {
        return Math.max(minimum, Math.ceil(state.maxCultivation / divisor));
    }

    function resolveExpedition(state, rng) {
        const random = rng || Math.random;
        const eventType = chooseExpeditionEventType(random);
        const location = getLocationMeta(state);

        if (eventType === 'battle') {
            const combatState = beginCombat(state, random);
            const summary = `你在 ${location.name} 察觉妖气，遭遇 ${combatState.monster.name}。`;
            pushLog(state, summary, 'normal');
            return {
                ok: true,
                type: 'battle',
                summary,
                combatState,
            };
        }

        if (eventType === 'resource') {
            const lingshiGain = getExpeditionReward(state, 80, 2);
            changeItem(state, 'lingshi', lingshiGain);
            const summary = `你在 ${location.name} 搜得灵石 ${lingshiGain} 枚，可带回洞府闭关。`;
            pushLog(state, summary, 'good');
            return {
                ok: true,
                type: 'resource',
                summary,
                lingshiGain,
            };
        }

        if (eventType === 'risk') {
            const lingshiLoss = Math.min(getInventoryCount(state, 'lingshi'), getExpeditionReward(state, 140, 1));
            const hpLoss = Math.max(1, Math.round(state.playerStats.maxHp * 0.12));
            if (lingshiLoss > 0) {
                changeItem(state, 'lingshi', -lingshiLoss);
            }
            state.playerStats.hp = Math.max(1, state.playerStats.hp - hpLoss);
            const summary = lingshiLoss > 0
                ? `你在 ${location.name} 遭阵雾扰乱，折损灵石 ${lingshiLoss} 枚，气血 -${hpLoss}。`
                : `你在 ${location.name} 被煞气所伤，气血 -${hpLoss}。`;
            pushLog(state, summary, 'bad');
            return {
                ok: true,
                type: 'risk',
                summary,
                lingshiLoss,
                hpLoss,
            };
        }

        const sideStories = getAvailableSideStories(state);
        if (sideStories.length <= 0) {
            const fallbackGain = getExpeditionReward(state, 80, 2);
            changeItem(state, 'lingshi', fallbackGain);
            const summary = `你在 ${location.name} 未寻得新线索，却顺手带回灵石 ${fallbackGain} 枚。`;
            pushLog(state, summary, 'good');
            return {
                ok: true,
                type: 'resource',
                summary,
                lingshiGain: fallbackGain,
            };
        }

        const clue = sideStories[Math.floor(random() * sideStories.length)];
        const summary = `你在 ${location.name} 听闻线索「${clue.title}」，可前往剧情与游历页继续查看。`;
        pushLog(state, summary, 'normal');
        return {
            ok: true,
            type: 'clue',
            summary,
            clueTitle: clue.title,
        };
    }

    function canAutoCultivate(state) {
        return state.realmIndex >= 1;
    }

    function touchSaveTimestamp(state, nowMs) {
        const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
        state.offlineTraining = normalizeOfflineTrainingState(state.offlineTraining);
        state.offlineTraining.lastSavedAt = nextNowMs;
        return nextNowMs;
    }

    function resolveOfflineCultivation(state, nowMs) {
        const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
        state.offlineTraining = normalizeOfflineTrainingState(state.offlineTraining);
        const lastSavedAt = state.offlineTraining.lastSavedAt;
        const emptyResult = {
            applied: false,
            gain: 0,
            durationMs: 0,
            effectiveDurationMs: 0,
            wasCapped: false,
        };

        if (!state.autoCultivate || !canAutoCultivate(state) || !Number.isFinite(lastSavedAt)) {
            return emptyResult;
        }

        const durationMs = Math.max(0, nextNowMs - lastSavedAt);
        if (durationMs <= 0) {
            return {
                ...emptyResult,
                durationMs,
            };
        }

        const effectiveDurationMs = Math.min(durationMs, getOfflineTrainingCapMs());
        const ticks = Math.floor(effectiveDurationMs / CONFIG.autoCultivateInterval);
        const remainingCultivation = Math.max(0, state.maxCultivation - state.cultivation);
        const gain = Math.min(remainingCultivation, Math.floor(ticks * getAverageAutoCultivationGain()));
        const wasCapped = durationMs > effectiveDurationMs;

        if (gain <= 0) {
            return {
                ...emptyResult,
                durationMs,
                effectiveDurationMs,
                wasCapped,
            };
        }

        state.cultivation = Math.min(state.maxCultivation, state.cultivation + gain);
        state.offlineTraining.lastSettlementAt = nextNowMs;
        state.offlineTraining.lastDurationMs = durationMs;
        state.offlineTraining.lastEffectiveDurationMs = effectiveDurationMs;
        state.offlineTraining.lastGain = gain;
        state.offlineTraining.wasCapped = wasCapped;
        pushLog(state, `闭关归来，离线吐纳 ${formatOfflineDuration(effectiveDurationMs)}，修为 +${gain}`, 'good');
        if (wasCapped) {
            pushLog(state, `离线收益按 ${Math.floor(getOfflineTrainingCapMs() / (60 * 60 * 1000))} 小时封顶结算。`, 'normal');
        }

        return {
            applied: true,
            gain,
            durationMs,
            effectiveDurationMs,
            wasCapped,
        };
    }

    function resolveNaturalRecovery(state, nowMs) {
        const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
        state.recovery = normalizeRecoveryState(state.recovery);

        const intervalMs = Number.isFinite(CONFIG.naturalRecoveryIntervalMs)
            ? Math.max(1, Math.floor(CONFIG.naturalRecoveryIntervalMs))
            : 30000;
        const recoveryRatio = Number.isFinite(CONFIG.naturalRecoveryRatio) ? CONFIG.naturalRecoveryRatio : 0.03;
        const capRatio = Number.isFinite(CONFIG.naturalRecoveryCapRatio) ? CONFIG.naturalRecoveryCapRatio : 0.5;
        const tickGain = Math.max(1, Math.round(state.playerStats.maxHp * recoveryRatio));
        const capHp = Math.max(1, Math.floor(state.playerStats.maxHp * capRatio));
        const emptyResult = {
            applied: false,
            touched: false,
            gain: 0,
            ticks: 0,
            capHp,
            currentHp: state.playerStats.hp,
            lastCheckedAt: state.recovery.lastCheckedAt,
        };

        if (!state.recovery.lastCheckedAt) {
            state.recovery.lastCheckedAt = nextNowMs;
            return {
                ...emptyResult,
                touched: true,
                lastCheckedAt: nextNowMs,
            };
        }

        const elapsedMs = Math.max(0, nextNowMs - state.recovery.lastCheckedAt);
        const ticks = Math.floor(elapsedMs / intervalMs);
        if (ticks <= 0) {
            return emptyResult;
        }

        state.recovery.lastCheckedAt += ticks * intervalMs;
        if (state.playerStats.hp >= capHp) {
            return {
                ...emptyResult,
                touched: true,
                ticks,
                lastCheckedAt: state.recovery.lastCheckedAt,
            };
        }

        const gain = Math.min(capHp - state.playerStats.hp, ticks * tickGain);
        if (gain <= 0) {
            return {
                ...emptyResult,
                touched: true,
                ticks,
                lastCheckedAt: state.recovery.lastCheckedAt,
            };
        }

        state.playerStats.hp = Math.min(capHp, state.playerStats.hp + gain);
        return {
            applied: true,
            touched: true,
            gain,
            ticks,
            capHp,
            currentHp: state.playerStats.hp,
            lastCheckedAt: state.recovery.lastCheckedAt,
        };
    }

    function getItemActionPreconditionError(state, itemId, action, options = {}) {
        if (options.inCombat) {
            return '战斗中不可使用物品。';
        }

        const effect = action?.effect || {};
        if (effect.cultivation && state.cultivation >= state.maxCultivation) {
            return '当前修为已满，请先尝试突破。';
        }
        if (effect.healRatio && state.playerStats.hp >= state.playerStats.maxHp) {
            return '当前气血已满，无需使用该物品。';
        }
        if (effect.breakthroughBonus && state.breakthroughBonus > 0) {
            return '已有药力护持，请先尝试突破。';
        }
        if (itemId === 'huashendan' && state.realmIndex < 3) {
            return '当前境界不足，化神丹需元婴及以上方可承受。';
        }
        return '';
    }

    function performItemAction(state, itemId, actionId, options = {}) {
        const item = ITEMS[itemId];
        const action = getItemActions(itemId).find((entry) => entry.id === actionId) || null;
        if (!item || !action) {
            return { ok: false, error: '该物品当前无法执行此动作。' };
        }
        if (getInventoryCount(state, itemId) <= 0) {
            return { ok: false, error: '物品不足。' };
        }

        const preconditionError = getItemActionPreconditionError(state, itemId, action, options);
        if (preconditionError) {
            return { ok: false, error: preconditionError };
        }

        const beforeSnapshot = {
            cultivation: state.cultivation,
            hp: state.playerStats.hp,
            actualRate: getBreakthroughActualRate(state),
        };
        changeItem(state, itemId, -1);
        applyEffects(state, action.effect || item.effect);
        pushLog(state, `${action.label} ${item.name}`, 'good');

        return {
            ok: true,
            actionId,
            itemId,
            delta: {
                cultivation: state.cultivation - beforeSnapshot.cultivation,
                hp: state.playerStats.hp - beforeSnapshot.hp,
                breakthroughRate: getBreakthroughActualRate(state) - beforeSnapshot.actualRate,
            },
        };
    }

    function useItem(state, itemId, options = {}) {
        return performItemAction(state, itemId, 'use', options);
    }

    function beginCombat(state, rng) {
        const random = rng || Math.random;
        const maxMonsterIndex = Math.min(MONSTERS.length - 1, state.realmIndex + 1);
        const template = MONSTERS[Math.floor(random() * (maxMonsterIndex + 1))];
        return {
            round: 0,
            monster: {
                name: template.name,
                hp: template.baseHp + (state.realmIndex * 24) + (state.stageIndex * 8),
                maxHp: template.baseHp + (state.realmIndex * 24) + (state.stageIndex * 8),
                attack: template.baseAttack + (state.realmIndex * 3) + state.stageIndex,
                defense: template.baseDefense + state.realmIndex,
                dropTable: clone(template.dropTable),
            },
        };
    }

    function resolveCombatRound(state, combatState, rng) {
        const random = rng || Math.random;
        const entries = [];

        combatState.round += 1;
        const playerVariance = Math.floor(random() * 4);
        const playerDamage = Math.max(1, state.playerStats.attack + playerVariance - combatState.monster.defense);
        combatState.monster.hp = Math.max(0, combatState.monster.hp - playerDamage);
        entries.push(`第 ${combatState.round} 回合，你对 ${combatState.monster.name} 造成 ${playerDamage} 点伤害。`);

        if (combatState.monster.hp <= 0) {
            const rewards = settleCombat(state, combatState, true, random);
            return { finished: true, victory: true, entries, rewards };
        }

        const monsterVariance = Math.floor(random() * 3);
        const monsterDamage = Math.max(0, combatState.monster.attack + monsterVariance - state.playerStats.defense);
        state.playerStats.hp = Math.max(0, state.playerStats.hp - monsterDamage);
        entries.push(`${combatState.monster.name} 反击，造成 ${monsterDamage} 点伤害。`);

        if (state.playerStats.hp <= 0) {
            const rewards = settleCombat(state, combatState, false, random);
            return { finished: true, victory: false, entries, rewards };
        }

        return { finished: false, victory: null, entries, rewards: null };
    }

    function settleCombat(state, combatState, victory, random) {
        if (victory) {
            const lingshiGain = getExpeditionReward(state, 90, 3);
            changeItem(state, 'lingshi', lingshiGain);
            pushLog(state, `游历击败 ${combatState.monster.name}，灵石 +${lingshiGain}`, 'good');

            const dropCount = Math.floor(random() * 2) + 1;
            const drops = [];
            for (let index = 0; index < dropCount; index += 1) {
                const itemId = combatState.monster.dropTable[Math.floor(random() * combatState.monster.dropTable.length)];
                const quantity = itemId === 'feijian' || itemId === 'hujian' || itemId === 'xuTianTu' ? 1 : (Math.floor(random() * 2) + 1);
                changeItem(state, itemId, quantity);
                drops.push({ itemId, quantity });
                pushLog(state, `游历掉落 ${ITEMS[itemId].name} x${quantity}`, 'good');
            }
            // 保留主线灵石经济，但胜利后不强行覆盖回合里已经结算出的真实血量。
            state.playerStats.hp = Math.max(1, Math.min(state.playerStats.maxHp, state.playerStats.hp));
            return { lingshiGain, drops };
        }

        const lingshiLoss = Math.min(getInventoryCount(state, 'lingshi'), Math.max(1, Math.floor(getExpeditionReward(state, 90, 3) / 2)));
        if (lingshiLoss > 0) {
            changeItem(state, 'lingshi', -lingshiLoss);
        }
        state.playerStats.hp = Math.max(1, Math.round(state.playerStats.maxHp * 0.2));
        const summary = lingshiLoss > 0
            ? `游历失利，折损灵石 ${lingshiLoss}`
            : '游历失利，未能带回额外灵石';
        pushLog(state, summary, 'fail');
        return { lingshiLoss, drops: [] };
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
        return `失败压力：${consequences.pressureTier}（${consequences.pressureTrend}）`;
    }

    const GameCore = {
        SAVE_VERSION,
        MIN_SUPPORTED_SAVE_VERSION,
        CONFIG,
        REALMS,
        ITEMS,
        ALCHEMY_RECIPES,
        LOCATIONS,
        NPCS,
        LEVEL_STORY_EVENTS,
        STORY_CONSEQUENCE_LIMITS,
        createInitialState,
        mergeSave,
        recalculateState,
        getRealmScore,
        setRealmScore,
        getRealmLabel,
        getBattleWillBonuses,
        getRouteDisplay,
        getRouteSummary,
        getPressureStatusText,
        getAlchemyRecipes,
        getEchoes,
        getLocationMeta,
        getAvailableSideStories,
        getNpcDialogue,
        getAvailableMainChapter,
        getAvailableLevelEvent,
        getCurrentPlayableStory,
        getInventoryCount,
        getItemActions,
        getInventoryPassiveBonuses,
        getBreakthroughActualRate,
        formatCosts,
        getNextGoalText,
        getChapterById,
        getLevelEventById,
        resolveChapter,
        ensureStoryCursor,
        getStoryView,
        advanceStoryBeat,
        skipStoryPlayback,
        chooseStoryOption,
        getTrainingPreview,
        trainWithLingshi,
        resolveExpedition,
        canBreakthrough,
        attemptBreakthrough,
        isSupportedSaveData,
        touchSaveTimestamp,
        resolveOfflineCultivation,
        resolveNaturalRecovery,
        craftRecipe,
        performItemAction,
        useItem,
        beginCombat,
        resolveCombatRound,
        pushLog,
        serializeState,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameCore;
    }

    globalScope.GameCore = GameCore;
})(typeof window !== 'undefined' ? window : globalThis);
