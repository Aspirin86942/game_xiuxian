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
    } = dataSource;

    const STORY_LOOKUP = new Map(STORY_CHAPTERS.map((chapter) => [chapter.id, chapter]));
    const MAX_LOGS = 120;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
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
                chapterId: null,
                beatIndex: 0,
                mode: 'idle',
            },
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
            },
            unreadStory: true,
        };
        recalculateState(state, true);
        return state;
    }

    function mergeSave(rawState) {
        const nextState = createInitialState();
        if (!rawState || rawState.version !== 2) {
            return nextState;
        }

        Object.assign(nextState, rawState);
        nextState.settings = { ...createInitialState().settings, ...(rawState.settings || {}) };
        nextState.ui = { ...createInitialState().ui, ...(rawState.ui || {}) };
        nextState.storyCursor = { ...createInitialState().storyCursor, ...(rawState.storyCursor || {}) };
        nextState.playerStats = { ...createInitialState().playerStats, ...(rawState.playerStats || {}) };
        nextState.routeScores = { ...createInitialState().routeScores, ...(rawState.routeScores || {}) };
        nextState.npcRelations = { ...createInitialState().npcRelations, ...(rawState.npcRelations || {}) };
        nextState.flags = { ...(rawState.flags || {}) };
        nextState.inventory = { ...(rawState.inventory || {}) };
        nextState.logs = Array.isArray(rawState.logs) ? rawState.logs.slice(0, MAX_LOGS) : [];
        nextState.ending = rawState.ending || null;
        recalculateState(nextState, false);
        return nextState;
    }

    function getRealmScore(state) {
        return (state.realmIndex * 3) + state.stageIndex;
    }

    function setRealmScore(state, score) {
        const safeScore = Math.max(0, Math.min(score, (REALMS.length * 3) - 1));
        state.realmIndex = Math.floor(safeScore / 3);
        state.stageIndex = safeScore % 3;
        recalculateState(state, true);
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

    function resolveChapter(chapter, state) {
        if (!chapter) {
            return null;
        }
        const beats = typeof chapter.beats === 'function' ? chapter.beats(state) : (chapter.beats || []);
        const rawChoices = typeof chapter.choices === 'function' ? chapter.choices(state) : (chapter.choices || []);
        const choices = rawChoices.map((choice) => ({
            ...clone(choice),
            disabled: !canAffordCosts(state, choice.costs),
        }));
        return { ...chapter, beats, choices };
    }

    function getCurrentChapter(state) {
        if (state.ending) {
            return null;
        }
        const chapter = getChapterById(state.storyProgress);
        if (!chapter || !meetsRequirements(state, chapter.requirements)) {
            return null;
        }
        return resolveChapter(chapter, state);
    }

    function ensureStoryCursor(state) {
        const chapter = getCurrentChapter(state);
        if (!chapter) {
            state.storyCursor = { chapterId: null, beatIndex: 0, mode: 'idle' };
            return null;
        }

        if (state.storyCursor.chapterId !== chapter.id) {
            state.storyCursor = {
                chapterId: chapter.id,
                beatIndex: 0,
                mode: 'playing',
            };
            state.currentLocation = chapter.location || state.currentLocation;
            state.unreadStory = true;
            pushLog(state, `新剧情开启：第${chapter.id + 1}章《${chapter.title}》`, 'breakthrough');
        }

        return resolveChapter(getChapterById(state.storyCursor.chapterId), state);
    }

    function getStoryView(state) {
        if (state.ending) {
            return {
                mode: 'ending',
                ending: clone(state.ending),
            };
        }

        const chapter = ensureStoryCursor(state);
        if (!chapter) {
            return null;
        }

        const visibleCount = state.storyCursor.mode === 'choices'
            ? chapter.beats.length
            : Math.min(chapter.beats.length, state.storyCursor.beatIndex + 1);

        return {
            mode: state.storyCursor.mode,
            chapter,
            visibleBeats: chapter.beats.slice(0, visibleCount),
            currentBeat: chapter.beats[Math.max(0, visibleCount - 1)] || null,
            choices: state.storyCursor.mode === 'choices' ? chapter.choices : [],
        };
    }

    function advanceStoryBeat(state) {
        const chapter = ensureStoryCursor(state);
        if (!chapter) {
            return { ok: false, reason: 'no-story' };
        }
        if (state.storyCursor.mode === 'choices') {
            return { ok: true, mode: 'choices' };
        }
        if (state.storyCursor.beatIndex < chapter.beats.length - 1) {
            state.storyCursor.beatIndex += 1;
            return { ok: true, mode: 'playing' };
        }
        state.storyCursor.mode = 'choices';
        return { ok: true, mode: 'choices' };
    }

    function skipStoryPlayback(state) {
        const chapter = ensureStoryCursor(state);
        if (!chapter) {
            return { ok: false, reason: 'no-story' };
        }
        state.storyCursor.beatIndex = Math.max(0, chapter.beats.length - 1);
        state.storyCursor.mode = 'choices';
        return { ok: true };
    }

    function chooseStoryOption(state, choiceId) {
        const chapter = ensureStoryCursor(state);
        if (!chapter || state.storyCursor.mode !== 'choices') {
            return { ok: false, error: '当前没有可选择的剧情选项。' };
        }

        const choice = chapter.choices.find((item) => item.id === choiceId);
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
            state.storyCursor = { chapterId: null, beatIndex: 0, mode: 'idle' };
            state.storyProgress = -1;
            pushLog(state, `达成结局：${choice.ending.title}`, 'breakthrough');
            return { ok: true, ending: true };
        }

        state.storyProgress = choice.nextChapterId;
        state.storyCursor = { chapterId: null, beatIndex: 0, mode: 'idle' };
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

    function getEchoes(state) {
        const echoes = [];
        if (state.flags.startPath === 'disciple') {
            echoes.push({ title: '神手谷旧痕', detail: '你以弟子身份接近墨大夫，这让后续面对“师门”时更容易被旧记忆拉扯。' });
        }
        if (state.flags.daoLvPromise) {
            echoes.push({ title: '墨府承诺', detail: '墨彩环记得你留过的话，凡俗人情仍在你的后路里。' });
        }
        if (state.flags.savedNangong) {
            echoes.push({ title: '禁地救援', detail: '南宫婉对你的态度会持续影响中后期的对白与结局倾向。' });
        }
        if (state.flags.warChoice === 'demonic') {
            echoes.push({ title: '魔道投影', detail: '大战中的站位改变了你之后看待力量和代价的方式。' });
        }
        if (state.flags.returnedToSeclusion) {
            echoes.push({ title: '藏锋之心', detail: '你开始主动回避公开的胜负，更在意“活着留下选择”。' });
        }
        if (echoes.length === 0) {
            echoes.push({ title: '尚在起势', detail: '关键选择还不够多，继续推进剧情会看到更明显的回响。' });
        }
        return echoes;
    }

    function getAvailableSideStories(state) {
        const stories = [];
        if (state.storyProgress >= 8 && (state.npcRelations['墨彩环'] || 0) >= 40) {
            stories.push({ title: '墨府回信', detail: '墨彩环仍会给你留门，凡俗线不会就此断掉。', npc: '墨彩环' });
        }
        if (state.flags.hasQuhun) {
            stories.push({ title: '曲魂守门', detail: '曲魂偶尔会提醒你哪些地方不该正面冲进去。', npc: '曲魂' });
        }
        if (state.storyProgress >= 14 && getInventoryCount(state, 'zhujidanMaterial') > 0) {
            stories.push({ title: '炼筑基丹', detail: '你已经攒出主药，后续突破会更稳。' });
        }
        if (state.storyProgress >= 21 && state.flags.starSeaStyle === 'merchant') {
            stories.push({ title: '海路消息', detail: '商路会让你更早知道风险，也更早闻到钱味。', npc: '万小山' });
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
        getInventoryCount,
        formatCosts,
        getNextGoalText,
        getChapterById,
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
