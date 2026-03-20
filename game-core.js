(function (globalScope) {
    const dataSource = globalScope.StoryData || (typeof require === 'function' ? require('./story-data.js') : null);

    if (!dataSource) {
        throw new Error('StoryData 未加载');
    }

    const {
        CONFIG,
        REALMS,
        ITEMS,
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
    const STORY_CONSEQUENCE_LIMITS = Object.freeze({
        battleWill: 8,
        tribulation: 42,
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

    function createDefaultStoryConsequences() {
        return {
            battleWill: 0,
            tribulation: 0,
        };
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

    function clampConsequenceValue(rawValue, upperBound) {
        if (!Number.isFinite(rawValue)) {
            return 0;
        }
        return Math.max(0, Math.min(upperBound, Math.floor(rawValue)));
    }

    function normalizeStoryConsequences(rawState) {
        const nextState = createDefaultStoryConsequences();
        if (!rawState || typeof rawState !== 'object') {
            return nextState;
        }

        nextState.battleWill = clampConsequenceValue(rawState.battleWill, STORY_CONSEQUENCE_LIMITS.battleWill);
        nextState.tribulation = clampConsequenceValue(rawState.tribulation, STORY_CONSEQUENCE_LIMITS.tribulation);
        return nextState;
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
            description: `你一路积下的劫煞终于反噬心神。战意虽盛，却已压不住识海裂开的回声；当劫煞攀至 ${consequences.tribulation}/${STORY_CONSEQUENCE_LIMITS.tribulation}，这一局也只能在失控中断掉。`,
        };
    }

    function createInitialState() {
        const state = {
            version: 4,
            playerName: '无名散修',
            realmIndex: 0,
            stageIndex: 0,
            cultivation: 0,
            maxCultivation: REALMS[0].baseReq,
            breakthroughRate: CONFIG.baseBreakthroughRate,
            breakthroughBonus: 0,
            logs: [],
            autoCultivate: false,
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
            storyConsequences: createDefaultStoryConsequences(),
            storyProgress: 0,
            chapterChoices: {},
            recentChoiceEcho: null,
            recentChoiceOutcome: null,
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

        Object.assign(nextState, rawState);
        nextState.settings = { ...createInitialState().settings, ...(rawState.settings || {}) };
        nextState.offlineTraining = normalizeOfflineTrainingState(rawState.offlineTraining);
        nextState.storyConsequences = normalizeStoryConsequences(rawState.storyConsequences);
        nextState.ui = { ...createInitialState().ui, ...(rawState.ui || {}) };
        nextState.storyCursor = normalizeStoryCursor(rawState.storyCursor);
        nextState.playerStats = { ...createInitialState().playerStats, ...(rawState.playerStats || {}) };
        nextState.routeScores = { ...createInitialState().routeScores, ...(rawState.routeScores || {}) };
        nextState.npcRelations = { ...createInitialState().npcRelations, ...(rawState.npcRelations || {}) };
        nextState.flags = { ...(rawState.flags || {}) };
        nextState.inventory = { ...(rawState.inventory || {}) };
        nextState.chapterChoices = { ...(rawState.chapterChoices || {}) };
        nextState.recentChoiceEcho = rawState.recentChoiceEcho && typeof rawState.recentChoiceEcho === 'object'
            ? { chapterId: rawState.recentChoiceEcho.chapterId ?? null, choiceId: rawState.recentChoiceEcho.choiceId ?? null }
            : null;
        nextState.recentChoiceOutcome = normalizeRecentChoiceOutcome(rawState.recentChoiceOutcome);
        nextState.logs = Array.isArray(rawState.logs) ? rawState.logs.slice(0, MAX_LOGS) : [];
        nextState.ending = rawState.ending || null;
        nextState.levelStoryState = normalizeLevelStoryState(rawState.levelStoryState);
        recalculateState(nextState, false);
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

    function recalculateState(state, healFull) {
        const realm = REALMS[state.realmIndex] || REALMS[REALMS.length - 1];
        const stageMultiplier = 1 + (state.stageIndex * 0.55);
        state.maxCultivation = Math.floor(realm.baseReq * stageMultiplier);
        state.breakthroughRate = Math.max(0.12, CONFIG.baseBreakthroughRate - (state.realmIndex * realm.rateDrop));

        const previousMaxHp = state.playerStats.maxHp || 100;
        const hpRatio = previousMaxHp > 0 ? state.playerStats.hp / previousMaxHp : 1;
        const baseHp = 100 + (state.realmIndex * 48) + (state.stageIndex * 18);
        const itemAttack = getInventoryCount(state, 'feijian') > 0 ? 6 : 0;
        const itemDefense = getInventoryCount(state, 'hujian') > 0 ? 4 : 0;
        const companionBonus = getInventoryCount(state, 'quhun') > 0 ? 12 : 0;
        const battleWillBonuses = getBattleWillBonuses(state);

        state.playerStats.maxHp = baseHp + companionBonus + battleWillBonuses.hp;
        state.playerStats.hp = healFull ? state.playerStats.maxHp : Math.max(1, Math.min(state.playerStats.maxHp, Math.round(state.playerStats.maxHp * hpRatio)));
        state.playerStats.attack = 12 + (state.realmIndex * 5) + (state.stageIndex * 2) + itemAttack + battleWillBonuses.attack;
        state.playerStats.defense = 5 + (state.realmIndex * 3) + state.stageIndex + itemDefense + battleWillBonuses.defense;
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

    function canAffordCosts(state, costs) {
        if (!costs) {
            return true;
        }
        return Object.entries(costs).every(([itemId, amount]) => getInventoryCount(state, itemId) >= amount);
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
        const consequences = normalizeStoryConsequences(state.storyConsequences);
        const battleWillGain = clampConsequenceValue(tradeoff.battleWillGain, 3);
        const tribulationGain = clampConsequenceValue(tradeoff.tribulationGain, 2);
        const nextBattleWill = consequences.battleWill + battleWillGain;
        const nextTribulation = consequences.tribulation + tribulationGain;

        consequences.battleWill = Math.min(STORY_CONSEQUENCE_LIMITS.battleWill, nextBattleWill);
        consequences.tribulation = Math.min(STORY_CONSEQUENCE_LIMITS.tribulation, nextTribulation);
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

        pushLog(state, `抉择余波：战意 +${battleWillGain}，劫煞 +${tribulationGain}`, tribulationGain > battleWillGain ? 'bad' : 'normal');

        return {
            battleWillGain,
            tribulationGain,
            totalBonus,
            triggeredDeath: nextTribulation > STORY_CONSEQUENCE_LIMITS.tribulation,
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
        state.unreadStory = true;
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
            return {
                ...normalizedChoice,
                disabled: !canAffordCosts(state, normalizedChoice.costs),
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
            state.unreadStory = true;
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
            return { ok: false, error: '资源不足，无法选择该选项。' };
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

        if (tradeoffResult.triggeredDeath) {
            state.ending = createTribulationEnding(state);
            state.storyCursor = {
                source: 'ending',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            state.storyProgress = -1;
            pushLog(state, '劫煞积满，心神失守，本局在走火入魔中终结。', 'fail');
            return { ok: true, ending: true, death: true };
        }

        if (choice.ending) {
            state.ending = clone(choice.ending);
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
                detail: `战意 ${consequences.battleWill}/${STORY_CONSEQUENCE_LIMITS.battleWill}：当前战斗加成 攻击 +${battleWillBonuses.attack} / 防御 +${battleWillBonuses.defense} / 气血 +${battleWillBonuses.hp}`,
            },
            {
                title: '劫煞',
                detail: `劫煞 ${consequences.tribulation}/${STORY_CONSEQUENCE_LIMITS.tribulation}：劫煞过盛将走火入魔`,
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
        const outcome = normalizeRecentChoiceOutcome(state.recentChoiceOutcome);
        if (!outcome) {
            return null;
        }

        return {
            title: '抉择余波',
            detail: `本次抉择：战意 +${outcome.battleWillGain}，劫煞 +${outcome.tribulationGain}。当前战斗加成：攻击 +${outcome.attackBonus}、防御 +${outcome.defenseBonus}、气血 +${outcome.hpBonus}。`,
        };
    }

    function getEchoes(state) {
        const echoes = [];
        const outcomeEcho = getChoiceOutcomeEcho(state);
        if (outcomeEcho) {
            echoes.push({
                title: outcomeEcho.title,
                detail: outcomeEcho.detail,
            });
        }

        const recentEcho = getChoiceImmediateEcho(state.recentChoiceEcho?.chapterId, state.recentChoiceEcho?.choiceId);
        if (recentEcho) {
            echoes.push({
                title: recentEcho.title,
                detail: recentEcho.detail,
            });
        }

        const seenDelayedTitles = new Set();
        getSortedChapterChoiceEntries(state).forEach(([chapterId, choiceId]) => {
            const delayedEcho = getChoiceDelayedEcho(chapterId, choiceId);
            if (delayedEcho && !seenDelayedTitles.has(delayedEcho.title)) {
                seenDelayedTitles.add(delayedEcho.title);
                echoes.push({
                    title: delayedEcho.title,
                    detail: delayedEcho.detail,
                });
            }
        });

        if (state.flags.startPath === 'disciple') {
            echoes.push({ title: '神手谷旧痕', detail: '你以弟子身份接近墨大夫，这让后续面对“师门”时更容易被旧记忆拉扯。' });
        }
        if (state.flags.helpedOldFriendAgain) {
            echoes.push({ title: '旧友照面', detail: '厉飞雨重新把你拉回那个还会被人先问“活着没有”的自己，这条线会一直提醒你别把凡人来路忘净。' });
        }
        if (state.flags.keptDistanceFromOldFriend) {
            echoes.push({ title: '旧情隔席', detail: '你连旧友也停在半步之外，这会让后面很多“凡心未死”的回响更显得艰难。' });
        }
        if (state.flags.hasSecretInfo) {
            echoes.push({ title: '暗线消息', detail: '太南山换来的消息没有白费，它让你在宗门和海路两条线里都更懂得留后手。' });
        }
        if (state.flags.ascendedWithNangong) {
            echoes.push({ title: '并肩飞升', detail: '血色禁地埋下的那条线，最后被你们一起带过了界壁。' });
        }
        if (echoes.length === 0) {
            echoes.push({ title: '尚在起势', detail: '关键选择还不够多，继续推进剧情会看到更明显的回响。' });
        }
        return echoes;
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

    function cultivate(state, isAuto, rng) {
        const random = rng || Math.random;
        const baseGain = Math.floor(random() * (CONFIG.clickGainMax - CONFIG.clickGainMin + 1)) + CONFIG.clickGainMin;
        const gain = isAuto ? Math.max(1, Math.floor(baseGain * CONFIG.autoGainRatio)) : baseGain;
        state.cultivation = Math.min(state.maxCultivation, state.cultivation + gain);

        const encounterRoll = random();
        const encounterPool = encounterRoll < (isAuto ? CONFIG.autoEncounterChance : CONFIG.encounterChance);
        let encounter = null;
        if (encounterPool) {
            const isPositive = random() > 0.42;
            const sourcePool = isPositive ? POSITIVE_ENCOUNTERS : NEGATIVE_ENCOUNTERS;
            encounter = clone(sourcePool[Math.floor(random() * sourcePool.length)]);
            applyEffects(state, encounter);
            pushLog(state, encounter.text, isPositive ? 'good' : 'bad');
        }

        if (!isAuto) {
            pushLog(state, `吐纳聚气，修为 +${gain}`, 'normal');
        }

        return { gain, encounter };
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

        const actualRate = Math.min(0.95, state.breakthroughRate + state.breakthroughBonus);
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

    function useItem(state, itemId) {
        const item = ITEMS[itemId];
        if (!item || !item.usable) {
            return { ok: false, error: '该物品不可直接使用。' };
        }
        if (getInventoryCount(state, itemId) <= 0) {
            return { ok: false, error: '物品不足。' };
        }
        changeItem(state, itemId, -1);
        applyEffects(state, item.effect);
        pushLog(state, `使用 ${item.name}`, 'good');
        return { ok: true };
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
            const cultivationGain = Math.min(state.maxCultivation - state.cultivation, Math.floor(combatState.monster.maxHp * 1.7));
            state.cultivation += cultivationGain;
            pushLog(state, `游历击败 ${combatState.monster.name}，修为 +${cultivationGain}`, 'good');

            const dropCount = Math.floor(random() * 2) + 1;
            const drops = [];
            for (let index = 0; index < dropCount; index += 1) {
                const itemId = combatState.monster.dropTable[Math.floor(random() * combatState.monster.dropTable.length)];
                const quantity = itemId === 'feijian' || itemId === 'hujian' || itemId === 'xuTianTu' ? 1 : (Math.floor(random() * 2) + 1);
                changeItem(state, itemId, quantity);
                drops.push({ itemId, quantity });
                pushLog(state, `游历掉落 ${ITEMS[itemId].name} x${quantity}`, 'good');
            }
            state.playerStats.hp = Math.max(1, Math.round(state.playerStats.maxHp * 0.65));
            return { cultivationGain, drops };
        }

        const cultivationLoss = Math.floor(state.cultivation * 0.18);
        state.cultivation = Math.max(0, state.cultivation - cultivationLoss);
        state.playerStats.hp = Math.max(1, Math.round(state.playerStats.maxHp * 0.45));
        pushLog(state, `游历失利，损失修为 ${cultivationLoss}`, 'fail');
        return { cultivationLoss, drops: [] };
    }

    function serializeState(state) {
        return JSON.stringify(state, null, 2);
    }

    const GameCore = {
        CONFIG,
        REALMS,
        ITEMS,
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
        getEchoes,
        getLocationMeta,
        getAvailableSideStories,
        getNpcDialogue,
        getAvailableMainChapter,
        getAvailableLevelEvent,
        getCurrentPlayableStory,
        getInventoryCount,
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
        cultivate,
        canBreakthrough,
        attemptBreakthrough,
        canAutoCultivate,
        touchSaveTimestamp,
        resolveOfflineCultivation,
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
