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
    const MAX_LOGS = 120;

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

    function createInitialState() {
        const state = {
            version: 2,
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
            storyProgress: 0,
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
        nextState.ui = { ...createInitialState().ui, ...(rawState.ui || {}) };
        nextState.storyCursor = normalizeStoryCursor(rawState.storyCursor);
        nextState.playerStats = { ...createInitialState().playerStats, ...(rawState.playerStats || {}) };
        nextState.routeScores = { ...createInitialState().routeScores, ...(rawState.routeScores || {}) };
        nextState.npcRelations = { ...createInitialState().npcRelations, ...(rawState.npcRelations || {}) };
        nextState.flags = { ...(rawState.flags || {}) };
        nextState.inventory = { ...(rawState.inventory || {}) };
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

        state.playerStats.maxHp = baseHp + companionBonus;
        state.playerStats.hp = healFull ? state.playerStats.maxHp : Math.max(1, Math.min(state.playerStats.maxHp, Math.round(state.playerStats.maxHp * hpRatio)));
        state.playerStats.attack = 12 + (state.realmIndex * 5) + (state.stageIndex * 2) + itemAttack;
        state.playerStats.defense = 5 + (state.realmIndex * 3) + state.stageIndex + itemDefense;
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

        if (story.source === 'level') {
            const levelEntry = state.levelStoryState.events[story.id] || { triggered: true, completed: false };
            levelEntry.triggered = true;
            levelEntry.completed = true;
            state.levelStoryState.events[story.id] = levelEntry;
            state.levelStoryState.currentEventId = null;
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
        ];
    }

    function getMainStoryProgressValue(state) {
        if (typeof state.storyProgress === 'number' && Number.isFinite(state.storyProgress)) {
            return state.storyProgress;
        }
        const matched = String(state.storyProgress || '').match(/^(\d+)/);
        return matched ? Number.parseInt(matched[1], 10) : 0;
    }

    function getEchoes(state) {
        const echoes = [];
        if (state.flags.startPath === 'disciple') {
            echoes.push({ title: '神手谷旧痕', detail: '你以弟子身份接近墨大夫，这让后续面对“师门”时更容易被旧记忆拉扯。' });
        }
        if (state.flags.daoLvPromise) {
            echoes.push({ title: '墨府承诺', detail: '墨彩环记得你留过的话，凡俗人情仍在你的后路里。' });
        }
        if (state.flags.mendedMoHouseDebt) {
            echoes.push({ title: '墨府补账', detail: '你没有让“卷财离场”停在最后一步，而是回头把墨府那笔账补回了一截。' });
        }
        if (state.flags.tookQuhunByForce) {
            echoes.push({ title: '强取曲魂', detail: '你是带着一层旧债把曲魂拖离墨府的，这让凡俗线始终带着一根刺。' });
        }
        if (state.flags.savedNangong) {
            echoes.push({ title: '禁地救援', detail: '南宫婉对你的态度会持续影响中后期的对白与结局倾向。' });
        }
        if (state.flags.lowProfileBanquet) {
            echoes.push({ title: '燕堡观察', detail: '燕家堡那夜你没急着出手，很多人随后才记得起你这张很难被拖进别处的脸。' });
        }
        if (state.flags.builtBanquetNetwork) {
            echoes.push({ title: '宴席人脉', detail: '你在那座大家族的筵席里借酒搭线，越往后节奏越像你早就记得别人什么时候要翻脸。' });
        }
        if (state.flags.enteredLihuayuanLineage) {
            echoes.push({ title: '门墙在身', detail: '你接过李化元的令牌之后，师门不再只是屋檐，而成了会向你索取责任的一层身份。' });
        }
        if (state.flags.usedLihuayuanInfluencePragmatically) {
            echoes.push({ title: '借势留痕', detail: '你借了李化元一脉的势，也让“是否把自己真正交给某个秩序”成了后面甩不开的问题。' });
        }
        if (state.flags.helpedOldFriendAgain) {
            echoes.push({ title: '旧友照面', detail: '厉飞雨重新把你拉回那个还会被人先问“活着没有”的自己，这条线会一直提醒你别把凡人来路忘净。' });
        }
        if (state.flags.keptDistanceFromOldFriend) {
            echoes.push({ title: '旧情隔席', detail: '你连旧友也停在半步之外，这让后面很多“凡心未死”的回响都更显得艰难。' });
        }
        if (state.flags.warChoice === 'demonic') {
            echoes.push({ title: '魔道投影', detail: '大战中的站位改变了你之后看待力量和代价的方式。' });
        }
        if (state.flags.openlyAcknowledgedNangongImportance) {
            echoes.push({ title: '并肩已认', detail: '你终于承认南宫婉的重要，往后许多终局判断都会把这看成你肯认人的一次。' });
        }
        if (state.flags.avoidedNangongAgain) {
            echoes.push({ title: '再度回避', detail: '你又一次把真正重要的话转开了，这会让“最冷的路”在后面显得更像惯性。' });
        }
        if (state.flags.mineChoice === 'rearGuard') {
            echoes.push({ title: '回身殿后', detail: '你在矿脉里回头接应过殿后同门，这件事会让旧宗门线在后期继续记得你。' });
        }
        if (state.flags.mineChoice === 'betrayGate') {
            echoes.push({ title: '矿门之叛', detail: '矿门开启那一刻，你和旧宗门之间的线就已经改了颜色。' });
        }
        if (state.flags.returnedToSeclusion) {
            echoes.push({ title: '藏锋之心', detail: '你开始主动回避公开的胜负，更在意“活着留下选择”。' });
        }
        if (state.flags.hasSecretInfo) {
            echoes.push({ title: '暗线消息', detail: '太南山换来的消息没有白费，它让你在宗门和海路两条线里都更懂得留后手。' });
        }
        if (state.flags.starSeaStyle === 'hunter' || state.flags.starSeaHunterStart) {
            echoes.push({ title: '猎妖名声', detail: '你在星海先把猎妖当活法，把战绩写在水面上，让陌生人知道你敢第一个站出来。' });
        }
        if (state.flags.starSeaStyle === 'merchant' || state.flags.starSeaTraderStart) {
            echoes.push({ title: '商路摸索', detail: '你先把商路、契约与分配摸透，很多后来者都记得你曾比他们更早看清钱味。' });
        }
        if (state.flags.starSeaStyle === 'secluded' || state.flags.starSeaSecludedStart) {
            echoes.push({ title: '隐海沉潜', detail: '你在星海先藏得更深，让别人误以为你碰不到，可直到需要退路，没几个人能撕开这层静。' });
        }
        if (state.flags.learnsSecretively) {
            echoes.push({ title: '秘学旁听', detail: '你没有正面拜师，却依旧摸到李化元一脉的门道，这条线会一直影响你看待师门与自由。' });
        }
        if (state.flags.showedStrength) {
            echoes.push({ title: '燕堡留名', detail: '燕家堡那次不再低调，后续很多场合都会先把你当成能压局的人。' });
        }
        if (state.flags.mineChoice === 'breakout') {
            echoes.push({ title: '矿脉突围', detail: '你带队杀出去过一次，之后别人更容易把生路押在你身上。' });
        }
        if (state.flags.cooperatedAtXuTian) {
            echoes.push({ title: '虚天旧盟', detail: '你在虚天殿留下的合作关系并没有断，它会继续影响后面的互信和结局色彩。' });
        }
        if (state.flags.hasXuTianTu) {
            echoes.push({ title: '残图在手', detail: '虚天残图不只是机缘，更让你持续暴露在更大的觊觎与算计里。' });
        }
        if (state.flags.grabbedTreasure) {
            echoes.push({ title: '先手夺宝', detail: '你在虚天殿那次一出手便压住局面，这让后来者再也猜不到你下一步会怎么出手。' });
        }
        if (state.flags.watchedXuTianFight) {
            echoes.push({ title: '虚天旁观', detail: '你选择坐山观虎斗，很多人最后反而在你身上看出是不是在等那个叫你决定的瞬间。' });
        }
        if (state.flags.secondHandBroker) {
            echoes.push({ title: '二手情报', detail: '你把虚天动线转卖出去后，认识到危险只是换了主人，这让你之后看待机缘更现实。' });
        }
        if (state.flags.rescuedFromXuTianEdge) {
            echoes.push({ title: '退路兼顾', detail: '从裂隙边把人拉回来的那次，让你在别人眼里变成既能救人又不忘自己底线的那类人。' });
        }
        if (state.flags.slippedPastXuTian) {
            echoes.push({ title: '悄然退场', detail: '你那次趁乱绕殿而走，留下的是“他或许还没彻底离场”的影子。' });
        }
        if (state.flags.soldFragmentMapForResources) {
            echoes.push({ title: '卖图留影', detail: '你把残图换成了资源，却也记住了“危险只是换了主人”这回事，后面看待机缘会更现实。' });
        }
        if (state.flags.avoidedVoidHeavenCoreConflict) {
            echoes.push({ title: '避局知重', detail: '你主动避开了虚天核心杀局，这条苟修线会让你在大机缘面前更习惯先算活路。' });
        }
        if (state.flags.madeAmendsToMocaihuan) {
            echoes.push({ title: '墨府回身', detail: '你不再只把墨彩环那一线留给“以后再补”，这会让旧账与凡心在终局前多出一层实感。' });
        }
        if (state.flags.admittedOldWrongToMocaihuan) {
            echoes.push({ title: '旧错已认', detail: '你承认过墨府那笔旧错，这会让后面的“债是否算清”不再只是冷冰冰的二选一。' });
        }
        if (state.flags.acceptedNangongPath) {
            echoes.push({ title: '同路之约', detail: '你没有回避南宫婉那条线，所以终局之前很多话都不会再只停在心里。' });
        }
        if (state.flags.returnedToMoHouse) {
            echoes.push({ title: '旧约回身', detail: '你在终局前重新回到嘉元城，把当年留下的话真正补成了一条线。' });
        }
        if (state.flags.answeredLiSummons) {
            echoes.push({ title: '门墙回首', detail: '李化元线不再只是评价高低，而是被你亲手回收到终局之前。' });
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
        if (storyProgress >= 8 && (state.npcRelations['墨彩环'] || 0) >= 40) {
            stories.push({ title: '墨府回信', detail: '墨彩环仍会给你留门，凡俗线不会就此断掉。', npc: '墨彩环' });
        }
        if (storyProgress >= 9 && state.flags.tookTreasure) {
            stories.push({ title: '墨府债目', detail: '你从墨府卷走的那部分东西没有被忘掉，这条账目之后还会回来找你。', npc: '墨彩环' });
        }
        if (state.flags.mendedMoHouseDebt) {
            stories.push({ title: '嘉元补账', detail: '你已经把墨府那笔旧债补回了一截，后面仍有机会把凡俗线续成真正的回身。', npc: '墨彩环' });
        }
        if (state.flags.madeAmendsToMocaihuan || state.flags.admittedOldWrongToMocaihuan) {
            stories.push({ title: '彩环来信', detail: '墨彩环这一线已经不再只是旧宅背景，而是你是否真肯回头认错与补账的试金石。', npc: '墨彩环' });
        }
        if (state.flags.hasQuhun) {
            stories.push({ title: '曲魂守门', detail: '曲魂偶尔会提醒你哪些地方不该正面冲进去。', npc: '曲魂' });
        }
        if (state.flags.lowProfileBanquet) {
            stories.push({ title: '燕堡余音', detail: '那晚你没在宴席上急着出手，后来者常说“他不会随便被拖进别人的节奏里”。', npc: '燕家堡' });
        }
        if (state.flags.builtBanquetNetwork) {
            stories.push({ title: '宴席人脉', detail: '你在燕家堡的席上顺势结线，这条“别人记得你订的那手酒”会继续帮你找人。', npc: '燕家堡' });
        }
        if (storyProgress >= 14 && getInventoryCount(state, 'zhujidanMaterial') > 0) {
            stories.push({ title: '炼筑基丹', detail: '你已经攒出主药，后续突破会更稳。' });
        }
        if ((state.flags.savedNangong || state.flags.acceptedNangongHelp) && (state.npcRelations['南宫婉'] || 0) >= 60) {
            stories.push({ title: '掩月来信', detail: '南宫婉这条线已经不只是回响，她会在中后段继续主动把话递到你面前。', npc: '南宫婉' });
        }
        if (state.flags.openlyAcknowledgedNangongImportance || state.flags.continuedToOweNangongSilently) {
            stories.push({ title: '并肩余波', detail: '南宫婉已经不只是禁地旧人，你们之间开始留下会直接影响终局的那类话。', npc: '南宫婉' });
        }
        if (storyProgress >= 21 && state.flags.starSeaStyle === 'merchant') {
            stories.push({ title: '海路消息', detail: '商路会让你更早知道风险，也更早闻到钱味。', npc: '万小山' });
        }
        if (state.flags.hasSecretInfo) {
            stories.push({ title: '黑市暗桩', detail: '太南山那条暗线仍然有用，后面可以继续借它探路或换资源。', npc: '万小山' });
        }
        if (state.flags.starSeaStyle === 'hunter') {
            stories.push({ title: '猎妖比拼', detail: '星海口碑里，你早就被记住是先端上去那类人，今后再有人找你组队就多了点分量。', npc: '万小山' });
        }
        if (state.flags.starSeaStyle === 'secluded') {
            stories.push({ title: '隐海传闻', detail: '许多人只记得你在海边消失的模样，这让你在关键时刻多出些“我其实不想搅局”的缓冲。', npc: '万小山' });
        }
       if (state.flags.madeGardenConnections) {
            stories.push({ title: '药园旧友', detail: '你在黄枫谷药园留过人情，药材与传话会更快朝你靠拢。', npc: '李化元' });
        }
        if (state.flags.learnsSecretively) {
            stories.push({ title: '秘法旁注', detail: '你不在名分上拜入门墙，却还是接住了李化元留下的另一层指点。', npc: '李化元' });
        }
        if (state.flags.liDisciple || state.flags.answeredLiSummons) {
            stories.push({ title: '门墙旧帖', detail: '李化元这一线已经从“是否拜师”走到“是否回头把门墙旧账说清”。', npc: '李化元' });
        }
        if (state.flags.enteredLihuayuanLineage || state.flags.respectedLihuayuanButStayedIndependent || state.flags.usedLihuayuanInfluencePragmatically) {
            stories.push({ title: '门内眼色', detail: '李化元给你的不只是术法，还是一份“宗门会怎样把人放进局里”的权力教育。', npc: '李化元' });
        }
        if (state.flags.helpedOldFriendAgain || state.flags.reconnectedWithLiFeiyu) {
            stories.push({ title: '旧友酒痕', detail: '厉飞雨这条线不讲大道，只提醒你别把自己一路活成连旧来路都认不出的样子。', npc: '厉飞雨' });
        }
        if (state.flags.cooperatedAtXuTian) {
            stories.push({ title: '虚天旧盟', detail: '虚天殿的合作没有散场，后续还能继续用这份信任换一条路。', npc: '南宫婉' });
        }
        if (state.flags.enteredVoidHeavenMapGame || state.flags.soldFragmentMapForResources || state.flags.avoidedVoidHeavenCoreConflict) {
            stories.push({ title: '虚天余波', detail: '你对残图的处理方式已经定下。后面面对大机缘时，争、卖、避的底色都会更明显。', npc: '万小山' });
        }
        if (state.flags.acceptedNangongPath) {
            stories.push({ title: '婉约来信', detail: '你既然没有退开，南宫婉的回应也会越来越直接。', npc: '南宫婉' });
        }
        if (state.flags.grabbedTreasure) {
            stories.push({ title: '先手留痕', detail: '那次带着残图冲进虚天殿让你成了别人眼里先动手的那类人，很多局从此先看你表情。', npc: '南宫婉' });
        }
        if (state.flags.watchedXuTianFight) {
            stories.push({ title: '虚天旁观', detail: '你在殿前没有急着表态，活下来的人却都记得你最擅长等别人先露底。', npc: '南宫婉' });
        }
        if (state.flags.secondHandBroker) {
            stories.push({ title: '虚天转手', detail: '你把虚天动线再卖一手之后，很多人都把你当成那类连风暴都能拿来做买卖的人。', npc: '万小山' });
        }
        if (state.flags.rescuedFromXuTianEdge) {
            stories.push({ title: '裂隙救援', detail: '你在那条裂隙救人出入之后，很多人开始想着你是否会在关键时刻把人挺出来。', npc: '南宫婉' });
        }
        if (state.flags.slippedPastXuTian) {
            stories.push({ title: '暗线退场', detail: '你那次绕殿而走，把“别人在乎你没出现”的故事留给了虚天殿。', npc: '南宫婉' });
        }
        if (state.flags.returnedToMoHouse) {
            stories.push({ title: '旧约已续', detail: '嘉元城的那句承诺终于被你重新接上，凡俗线不再只是背景。', npc: '墨彩环' });
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
        createInitialState,
        mergeSave,
        recalculateState,
        getRealmScore,
        setRealmScore,
        getRealmLabel,
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
