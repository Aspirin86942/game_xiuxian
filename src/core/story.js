(function (globalScope) {
    function createStoryModule(deps) {
        const { clone } = deps.shared;
        const {
            ITEMS,
            REALMS,
            STORY_CHAPTERS,
            LEVEL_STORY_EVENTS,
            VOLUME_ONE_CHAPTERS,
            VOLUME_TWO_CHAPTERS,
            VOLUME_THREE_CHAPTERS,
            VOLUME_FOUR_CHAPTERS,
            constants,
        } = deps.data;
        const { DECISION_HISTORY_LIMIT, PRESSURE_COLLAPSE_THRESHOLD } = constants;

        const STORY_LOOKUP = new Map(STORY_CHAPTERS.map((chapter) => [chapter.id, chapter]));
        const STORY_ORDER = new Map(STORY_CHAPTERS.map((chapter, index) => [String(chapter.id), index]));
        const VOLUME_CHAPTER_LOOKUP = new Map([
            ...(VOLUME_ONE_CHAPTERS || []).map((chapter, index) => [
                chapter.id,
                {
                    id: chapter.id,
                    title: chapter.title,
                    volumeOrder: index + 1,
                    volumeLabel: '第一卷',
                },
            ]),
            ...(VOLUME_TWO_CHAPTERS || []).map((chapter, index) => [
                chapter.id,
                {
                    id: chapter.id,
                    title: chapter.title,
                    volumeOrder: index + 1,
                    volumeLabel: '第二卷',
                },
            ]),
            ...(VOLUME_THREE_CHAPTERS || []).map((chapter, index) => [
                chapter.id,
                {
                    id: chapter.id,
                    title: chapter.title,
                    volumeOrder: index + 1,
                    volumeLabel: '第三卷',
                },
            ]),
            ...(VOLUME_FOUR_CHAPTERS || []).map((chapter, index) => [
                chapter.id,
                {
                    id: chapter.id,
                    title: chapter.title,
                    volumeOrder: index + 1,
                    volumeLabel: '第四卷',
                },
            ]),
        ]);
        const LEGACY_ECHO_OVERRIDES = Object.freeze({
            '24:returned_tiannan_for_settlement': {
                title: '旧账见光',
                detail: '天南并没有挽留你。它只是让你把那些该看见的都看了一遍。',
            },
            '24:returned_tiannan_for_bonds': {
                title: '旧情归位',
                detail: '旧人见到的不是“你终于回来”，而是你终于肯承认有些人和承诺不能一直拖到以后。',
            },
            '24:returned_tiannan_but_remained_hidden': {
                title: '只留一道影子',
                detail: '你回来认过事，却没有再把自己重新扔进旧名旧局里。',
            },
        });

        function isSameStoryCursor(cursor, story) {
            if (!cursor || !story) {
                return false;
            }
            return cursor.mode !== 'idle'
                && cursor.source === story.source
                && cursor.storyId === story.id;
        }

        function syncUnreadStoryState(state, options = {}) {
            if (!state || typeof state !== 'object') {
                return false;
            }

            const currentStory = Object.prototype.hasOwnProperty.call(options, 'currentStory')
                ? options.currentStory
                : getCurrentPlayableStory(state);
            const previousCursor = deps.normalizeStoryCursor(Object.prototype.hasOwnProperty.call(options, 'previousCursor')
                ? options.previousCursor
                : state.storyCursor);
            const previousUnread = Object.prototype.hasOwnProperty.call(options, 'previousUnread')
                ? Boolean(options.previousUnread)
                : Boolean(state.unreadStory);

            if (state?.ui?.activeTab === 'story' || !currentStory) {
                state.unreadStory = false;
                return state.unreadStory;
            }

            const preserveRestoreReadState = Boolean(options.preserveRestoreReadState)
                && previousCursor.mode === 'idle'
                && previousUnread === false;

            if (isSameStoryCursor(previousCursor, currentStory) || preserveRestoreReadState) {
                state.unreadStory = previousUnread;
                return state.unreadStory;
            }

            state.unreadStory = true;
            return state.unreadStory;
        }

        function getRouteDominant(state) {
            const entries = Object.entries(state.routeScores);
            entries.sort((left, right) => right[1] - left[1]);
            return entries[0][0];
        }

        function getChapterById(chapterId) {
            if (STORY_LOOKUP.has(chapterId)) {
                return STORY_LOOKUP.get(chapterId) || null;
            }
            const normalizedId = typeof chapterId === 'string' && /^\d+$/.test(chapterId)
                ? Number.parseInt(chapterId, 10)
                : chapterId;
            return STORY_LOOKUP.get(normalizedId) || null;
        }

        function getLevelEventById(eventId) {
            return LEVEL_STORY_EVENTS.find((event) => event.id === eventId) || null;
        }

        function meetsRequirements(state, requirements) {
            if (!requirements) {
                return true;
            }
            if (requirements.storyProgress !== undefined && state.storyProgress !== requirements.storyProgress) {
                return false;
            }
            if (requirements.realmScoreAtLeast !== undefined && deps.getRealmScore(state) < requirements.realmScoreAtLeast) {
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
                const itemsOk = Object.entries(requirements.items).every(([itemId, amount]) => deps.getInventoryCount(state, itemId) >= amount);
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

        function getAvailableMainChapter(state) {
            const chapter = getChapterById(state.storyProgress);
            if (!chapter || !meetsRequirements(state, chapter.requirements)) {
                return null;
            }
            return chapter;
        }

        function getPendingLevelEvents(state) {
            const realmScore = deps.getRealmScore(state);
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
            const realmScore = deps.getRealmScore(state);
            const pendingEvents = getPendingLevelEvents(state);
            return pendingEvents.find((event) => event.realmScore === realmScore) || pendingEvents[0] || null;
        }

        function getVolumeChapterMeta(chapter) {
            if (!chapter || typeof chapter !== 'object') {
                return null;
            }

            const targetId = typeof chapter.legacyVolumeTarget === 'string'
                ? chapter.legacyVolumeTarget
                : (typeof chapter.id === 'string' ? chapter.id : null);
            if (!targetId) {
                return null;
            }

            const volumeChapter = VOLUME_CHAPTER_LOOKUP.get(targetId);
            if (!volumeChapter) {
                return null;
            }

            return {
                label: `${volumeChapter.volumeLabel}·第 ${volumeChapter.volumeOrder} 章`,
                title: volumeChapter.title,
            };
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
                    normalizedChoice.id = `${definition.id}_choice_${index}`;
                }
                const disabled = !meetsRequirements(state, normalizedChoice.requirements) || !deps.canAffordCosts(state, normalizedChoice.costs);
                return {
                    ...normalizedChoice,
                    disabled,
                    disabledReason: disabled ? getChoiceDisabledReason(state, normalizedChoice) : '',
                };
            });
            const volumeMeta = source === 'main' ? getVolumeChapterMeta(definition) : null;
            return {
                ...definition,
                source,
                beats,
                choices,
                chapterLabel: definition.chapterLabel || volumeMeta?.label,
                volumeChapterTitle: volumeMeta?.title || null,
            };
        }

        function resolveChapter(chapter, state) {
            return resolveStoryDefinition(chapter, state, 'main');
        }

        function getCurrentPlayableStory(state) {
            if (state.ending) {
                return null;
            }

            const cursor = deps.normalizeStoryCursor(state.storyCursor);
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

        function getStoryByCursor(state) {
            const cursor = deps.normalizeStoryCursor(state.storyCursor);
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
            const costsMet = deps.canAffordCosts(state, choice.costs);
            if (requirementsMet && costsMet) {
                return '';
            }
            const missing = [];

            Object.entries(choice.requirements?.items || {})
                .filter(([itemId, amount]) => deps.getInventoryCount(state, itemId) < amount)
                .forEach(([itemId, amount]) => {
                    missing.push(`${ITEMS[itemId]?.name || itemId} x${amount}`);
                });

            Object.entries(choice.costs || {})
                .filter(([itemId, amount]) => deps.getInventoryCount(state, itemId) < amount)
                .forEach(([itemId, amount]) => {
                    missing.push(`${ITEMS[itemId]?.name || itemId} x${amount}`);
                });

            return missing.length > 0 ? `不足：${missing.join('、')}` : '当前条件不足';
        }

        function applyChoiceTradeoff(state, story, choice) {
            const tradeoff = choice.tradeoff && typeof choice.tradeoff === 'object'
                ? choice.tradeoff
                : { battleWillGain: 2, tribulationGain: 1 };
            const previousConsequences = deps.normalizeStoryConsequences(state.storyConsequences);
            const battleWillGain = deps.clampConsequenceValue(choice.resolveDelta ?? tradeoff.battleWillGain, 3);
            const tribulationGain = deps.clampConsequenceValue(choice.pressureDelta ?? tradeoff.tribulationGain, 3);
            const nextBattleWill = previousConsequences.battleWill + battleWillGain;
            const nextTribulation = previousConsequences.tribulation + tribulationGain;
            const consequences = deps.normalizeStoryConsequences({
                battleWill: Math.min(deps.STORY_CONSEQUENCE_LIMITS.battleWill, nextBattleWill),
                tribulation: Math.min(deps.STORY_CONSEQUENCE_LIMITS.tribulation, nextTribulation),
                pressureTrend: deps.getPressureTrendLabel(tribulationGain),
            });
            state.storyConsequences = consequences;
            deps.recalculateState(state, false);

            const totalBonus = deps.getBattleWillBonuses(state);
            state.recentChoiceOutcome = {
                chapterId: story.id,
                choiceId: choice.id,
                battleWillGain,
                tribulationGain,
                attackBonus: totalBonus.attack,
                defenseBonus: totalBonus.defense,
                hpBonus: totalBonus.hp,
            };

            deps.pushLog(
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
            state.decisionHistory = deps.normalizeDecisionHistory([...(state.decisionHistory || []), entry]);
        }

        function appendPendingEchoes(state, story, choice) {
            const currentEntries = deps.normalizePendingEchoes(state.pendingEchoes);
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
            state.pendingEchoes = deps.normalizePendingEchoes([...currentEntries, ...nextEntries]);
        }

        function appendEndingSeeds(state, story, choice) {
            const currentSeeds = deps.normalizeEndingSeeds(state.endingSeeds);
            const nextSeeds = (choice.endingSeeds || []).map((entry) => ({
                id: entry.id,
                sourceChapterId: story.id,
                sourceChoiceId: choice.id,
                promiseType: entry.promiseType || choice.promiseType,
                note: entry.note,
            }));
            state.endingSeeds = deps.normalizeEndingSeeds([...currentSeeds, ...nextSeeds]);
        }

        function getRecentDecisionEntries(state, limit = DECISION_HISTORY_LIMIT) {
            const entries = deps.normalizeDecisionHistory(state.decisionHistory);
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

        function getDecisionBranchImpact(entry, state) {
            if (!entry) {
                return null;
            }

            const title = typeof entry.branchImpactTitle === 'string' ? entry.branchImpactTitle.trim() : '';
            const detail = typeof entry.branchImpactDetail === 'string' ? entry.branchImpactDetail.trim() : '';
            if (title && detail) {
                return { title, detail };
            }

            const choice = getChoiceDefinitionByEntry(entry.chapterId, entry.choiceId, state);
            const branchImpact = choice?.branchImpact || null;
            if (branchImpact?.title || branchImpact?.detail) {
                return {
                    title: branchImpact.title || entry.promiseLabel || '分支影响',
                    detail: branchImpact.detail || entry.longTermHint || entry.immediateSummary || '这一步已经留在你的路上，之后还会被重新认出。',
                };
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
                const impact = getDecisionBranchImpact(entry, state);
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

            const previousCursor = deps.normalizeStoryCursor(state.storyCursor);
            const previousUnread = Boolean(state.unreadStory);
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
            syncUnreadStoryState(state, {
                currentStory: pendingEvent,
                previousCursor,
                previousUnread,
            });
            deps.pushLog(state, `境界感悟浮现：${pendingEvent.title}`, 'breakthrough');
            return pendingEvent;
        }

        function ensureStoryCursor(state, options = {}) {
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
                const previousCursor = deps.normalizeStoryCursor(state.storyCursor);
                const previousUnread = Boolean(state.unreadStory);
                state.storyCursor = {
                    source: 'main',
                    storyId: null,
                    chapterId: null,
                    beatIndex: 0,
                    mode: 'idle',
                };
                state.levelStoryState.currentEventId = null;
                syncUnreadStoryState(state, {
                    currentStory: null,
                    previousCursor,
                    previousUnread,
                });
                return null;
            }

            const cursor = deps.normalizeStoryCursor(state.storyCursor);
            const previousUnread = Boolean(state.unreadStory);
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
                syncUnreadStoryState(state, {
                    currentStory: current,
                    previousCursor: cursor,
                    previousUnread,
                    preserveRestoreReadState: Boolean(options.preserveRestoreReadState),
                });
                deps.pushLog(state, `新剧情开启：${formatStoryLabel(current)}`, 'breakthrough');
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
            if (!deps.applyCosts(state, choice.costs)) {
                return { ok: false, error: '资源不足，无法支付代价。' };
            }

            deps.applyEffects(state, choice.effects);
            deps.pushLog(state, `剧情抉择：${choice.text}`, 'normal');
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
                costLabel: choice.visibleCostLabel || deps.formatCosts(choice.costs),
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
                state.ending = decorateEnding(deps.createTribulationEnding(state), state, choice);
                state.storyCursor = {
                    source: 'ending',
                    storyId: null,
                    chapterId: null,
                    beatIndex: 0,
                    mode: 'idle',
                };
                state.storyProgress = -1;
                deps.pushLog(state, '失败压力进入失控，本局在走火入魔中终结。', 'fail');
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
                deps.pushLog(state, `达成结局：${choice.ending.title}`, 'breakthrough');
                return { ok: true, ending: true };
            }

            if (story.source === 'main' && choice.nextChapterId !== undefined) {
                state.storyProgress = choice.nextChapterId;
            }

            deps.syncSideQuestAvailability(state);
            state.storyCursor = {
                source: 'main',
                storyId: null,
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            };
            ensureStoryCursor(state);
            if (story.source === 'main' && choice.nextChapterId !== undefined) {
                const blockedMainStoryHint = getBlockedMainStoryHint(state);
                if (blockedMainStoryHint) {
                    deps.pushLog(state, blockedMainStoryHint, 'normal');
                }
            }
            return { ok: true };
        }

        function getNextGoalText(state) {
            if (state.ending) {
                return '结局已定，可重开体验另一条路。';
            }
            const chapter = getChapterById(state.storyProgress);
            if (!chapter) {
                return '暂无待触发剧情。';
            }
            const blockedHint = getBlockedMainStoryHint(state);
            if (blockedHint) {
                return blockedHint;
            }

            const levelEvent = getAvailableLevelEvent(state);
            if (levelEvent) {
                return `下一条等级事件：${levelEvent.title}（${REALMS[Math.floor(levelEvent.realmScore / 3)].name}·${REALMS[Math.floor(levelEvent.realmScore / 3)].stages[levelEvent.realmScore % 3]}）`;
            }

            return '下一章条件已满足，请前往剧情页。';
        }

        function getChapterRequirementHints(state, chapter) {
            if (!chapter || !chapter.requirements) {
                return [];
            }

            const requirements = chapter.requirements || {};
            const hints = [];
            if (requirements.realmScoreAtLeast !== undefined && deps.getRealmScore(state) < requirements.realmScoreAtLeast) {
                const realmIndex = Math.floor(requirements.realmScoreAtLeast / 3);
                const stageIndex = requirements.realmScoreAtLeast % 3;
                hints.push(`修至${REALMS[realmIndex].name}${REALMS[realmIndex].stages[stageIndex]}`);
            }
            if (requirements.cultivationAtLeast !== undefined && state.cultivation < requirements.cultivationAtLeast) {
                hints.push(`当前修为达到${requirements.cultivationAtLeast}`);
            }
            if (requirements.relationsMin) {
                Object.entries(requirements.relationsMin).forEach(([npcName, value]) => {
                    if ((state.npcRelations[npcName] || 0) < value) {
                        hints.push(`${npcName}关系至少${value}`);
                    }
                });
            }
            if (requirements.items) {
                Object.entries(requirements.items).forEach(([itemId, value]) => {
                    if (deps.getInventoryCount(state, itemId) < value) {
                        const itemName = ITEMS[itemId]?.name || itemId;
                        hints.push(`持有${itemName} x${value}`);
                    }
                });
            }
            return hints;
        }

        function getBlockedMainStoryHint(state) {
            const chapter = getChapterById(state.storyProgress);
            if (!chapter || meetsRequirements(state, chapter.requirements)) {
                return '';
            }

            const hints = getChapterRequirementHints(state, chapter);
            if (hints.length === 0) {
                return '';
            }

            const baseHint = `主线《${chapter.title}》待解锁：需先${hints.join('，')}。`;
            const extraHint = chapter.id === 10
                ? '升仙令线会在满足条件后继续。'
                : '当前主线并未中断，只是还没到火候。';
            const levelEvent = getAvailableLevelEvent(state);
            if (!levelEvent) {
                return `${baseHint}${extraHint}`;
            }

            return `${baseHint}${extraHint}当前可先处理小境界事件《${levelEvent.title}》。`;
        }

        function getRouteSummary(state) {
            const dominant = getRouteDominant(state);
            const consequences = deps.normalizeStoryConsequences(state.storyConsequences);
            const battleWillBonuses = deps.getBattleWillBonuses(state);
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
                { title: summary.title, detail: summary.detail },
                { title: '分值对照', detail: `正道 ${scoreMap.orthodox} / 魔路 ${scoreMap.demonic} / 苟修 ${scoreMap.secluded}` },
                { title: '战意', detail: `当前战斗加成：攻击 +${battleWillBonuses.attack} / 防御 +${battleWillBonuses.defense} / 气血 +${battleWillBonuses.hp}` },
                { title: '失败压力', detail: `当前处于${consequences.pressureTier}，趋势${consequences.pressureTrend}。进入失控后将触发走火入魔终局。` },
            ];
        }

        function getMainStoryProgressValue(state) {
            if (typeof state.storyProgress === 'number' && Number.isFinite(state.storyProgress)) {
                return state.storyProgress;
            }
            const matched = String(state.storyProgress || '').match(/^(\d+)/);
            return matched ? Number.parseInt(matched[1], 10) : 0;
        }

        function getChapterSourceLabel(chapterId) {
            const chapter = getChapterById(chapterId);
            if (chapter) {
                const volumeMeta = getVolumeChapterMeta(chapter);
                const prefix = chapter.chapterLabel || volumeMeta?.label || (typeof chapter.id === 'number' ? `第 ${chapter.id + 1} 章` : '主线章节');
                return `${prefix} · ${volumeMeta?.title || chapter.title}`;
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

        function getLegacyBranchImpact(choice, chapterId, choiceId) {
            const override = LEGACY_ECHO_OVERRIDES[`${chapterId}:${choiceId}`];
            if (override) {
                return override;
            }
            if (Array.isArray(choice?.delayedEchoes) && choice.delayedEchoes.length > 0) {
                return {
                    title: choice.delayedEchoes[0].title || choice.branchImpact?.title || '分支影响',
                    detail: choice.delayedEchoes[0].detail || choice.branchImpact?.detail || choice.longTermHint || choice.text,
                };
            }

            if (choice?.branchImpact) {
                return {
                    title: choice.branchImpact.title || '分支影响',
                    detail: choice.branchImpact.detail || choice.longTermHint || choice.text,
                };
            }

            return null;
        }

        function getLegacyBranchImpactEntries(state) {
            return Object.entries(state.chapterChoices || {})
                .filter(([, choiceId]) => Boolean(choiceId))
                .sort((left, right) => (STORY_ORDER.get(String(right[0])) ?? -1) - (STORY_ORDER.get(String(left[0])) ?? -1))
                .map(([chapterId, choiceId]) => {
                    const choice = getChoiceDefinitionByEntry(chapterId, choiceId, state);
                    const impact = getLegacyBranchImpact(choice, chapterId, choiceId);
                    if (!impact) {
                        return null;
                    }
                    return {
                        title: impact.title,
                        detail: impact.detail,
                        meta: getBranchImpactMeta(choice?.promiseLabel || '', choice?.riskLabel || '', chapterId),
                    };
                })
                .filter(Boolean);
        }

        function getEchoes(state) {
            const historyEchoes = getRecentDecisionEntries(state, DECISION_HISTORY_LIMIT)
                .slice()
                .reverse()
                .map((entry) => {
                    const impact = getDecisionBranchImpact(entry, state);
                    return {
                        title: impact.title,
                        detail: impact.detail,
                        meta: getBranchImpactMeta(entry.promiseLabel, entry.riskLabel, entry.chapterId),
                    };
                })
                .filter(Boolean);

            if (historyEchoes.length > 0) {
                return historyEchoes;
            }

            const legacyEchoes = getLegacyBranchImpactEntries(state);
            if (legacyEchoes.length > 0) {
                return legacyEchoes;
            }

            const recentChoice = state.recentChoiceEcho;
            if (recentChoice?.chapterId !== undefined && recentChoice?.choiceId) {
                const choice = getChoiceDefinitionByEntry(recentChoice.chapterId, recentChoice.choiceId, state);
                const impact = getLegacyBranchImpact(choice, recentChoice.chapterId, recentChoice.choiceId);
                if (impact) {
                    return [{
                        title: impact.title,
                        detail: impact.detail,
                        meta: getChapterSourceLabel(recentChoice.chapterId),
                    }];
                }
            }

            return [{ title: '尚在起势', detail: '关键选择还不够多，继续推进剧情会看到更明显的分支影响。', meta: '' }];
        }

        return {
            resolveChapter,
            syncUnreadStoryState,
            getChapterById,
            getLevelEventById,
            getAvailableMainChapter,
            getAvailableLevelEvent,
            getCurrentPlayableStory,
            ensureStoryCursor,
            getStoryView,
            advanceStoryBeat,
            skipStoryPlayback,
            chooseStoryOption,
            getNextGoalText,
            getBlockedMainStoryHint,
            getRouteSummary,
            getEchoes,
            getMainStoryProgressValue,
            queueLevelEventForRealm,
            meetsRequirements,
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = createStoryModule;
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.core = registry.core || {};
    registry.core.createStoryModule = createStoryModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
