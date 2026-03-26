(function (globalScope) {
    function createWorldModule(deps) {
        const { clone } = deps.shared;
        const {
            ITEMS,
            LOCATIONS,
            NPCS,
            SIDE_QUESTS_V1,
            MONSTERS,
            constants,
        } = deps.data;
        const SIDE_QUEST_LOOKUP = new Map((SIDE_QUESTS_V1 || []).map((quest) => [quest.id, quest]));

        function hasAnyStateFlag(state, flagNames) {
            const flags = state?.flags || {};
            return flagNames.some((flagName) => Boolean(flags[flagName]));
        }

        function evaluateRelationThresholds(state, thresholds, comparator) {
            if (!thresholds || typeof thresholds !== 'object') {
                return true;
            }
            return Object.entries(thresholds).every(([npcName, threshold]) => comparator((state.npcRelations[npcName] || 0), threshold));
        }

        function evaluateSideQuestCondition(state, condition) {
            if (!condition || typeof condition !== 'object') {
                return true;
            }

            if (Array.isArray(condition.anyOf) && condition.anyOf.length > 0) {
                const matched = condition.anyOf.some((entry) => evaluateSideQuestCondition(state, entry));
                if (!matched) {
                    return false;
                }
            }

            if (Array.isArray(condition.allOf) && condition.allOf.length > 0) {
                const matched = condition.allOf.every((entry) => evaluateSideQuestCondition(state, entry));
                if (!matched) {
                    return false;
                }
            }

            if (condition.not && evaluateSideQuestCondition(state, condition.not)) {
                return false;
            }

            if (Array.isArray(condition.flagsAny) && condition.flagsAny.length > 0 && !hasAnyStateFlag(state, condition.flagsAny)) {
                return false;
            }

            if (Array.isArray(condition.flagsNone) && condition.flagsNone.some((flagName) => Boolean(state.flags[flagName]))) {
                return false;
            }

            if (condition.flagsAll && typeof condition.flagsAll === 'object') {
                const allFlagsMatched = Object.entries(condition.flagsAll).every(([flagName, expectedValue]) => state.flags[flagName] === expectedValue);
                if (!allFlagsMatched) {
                    return false;
                }
            }

            if (!evaluateRelationThresholds(state, condition.relationsMin, (current, threshold) => current >= threshold)) {
                return false;
            }

            if (!evaluateRelationThresholds(state, condition.relationsMax, (current, threshold) => current <= threshold)) {
                return false;
            }

            if (condition.requiredItems && typeof condition.requiredItems === 'object') {
                const enoughItems = Object.entries(condition.requiredItems).every(([itemId, amount]) => deps.getInventoryCount(state, itemId) >= amount);
                if (!enoughItems) {
                    return false;
                }
            }

            return true;
        }

        function getSideQuestDefinition(questId) {
            return SIDE_QUEST_LOOKUP.get(questId) || null;
        }

        function hasQuestConditionRules(condition) {
            return Boolean(condition && typeof condition === 'object' && Object.keys(condition).length > 0);
        }

        function createSideQuestResult(outcome, quest, overrides = {}) {
            return {
                outcome,
                choiceId: overrides.choiceId || null,
                summary: overrides.summary || '',
                detail: overrides.detail || '',
            };
        }

        function syncSideQuestAvailability(state) {
            if (!state || typeof state !== 'object') {
                return state;
            }

            state.sideQuests = deps.normalizeSideQuestRecords(state.sideQuests);
            const storyProgress = deps.getMainStoryProgressValue(state);

            SIDE_QUESTS_V1.forEach((definition) => {
                const record = state.sideQuests[definition.id];
                if (!record) {
                    return;
                }

                const previousState = record.state;
                if (previousState === 'completed' || previousState === 'failed' || previousState === 'missed') {
                    return;
                }

                const withinWindow = storyProgress >= definition.availableFromProgress
                    && storyProgress <= definition.availableToProgress;
                const triggerMatched = evaluateSideQuestCondition(state, definition.triggerCondition);
                const acceptMatched = evaluateSideQuestCondition(state, definition.acceptCondition);
                const explicitFail = hasQuestConditionRules(definition.failCondition)
                    && evaluateSideQuestCondition(state, definition.failCondition);

                record.deadlineProgress = Number.isFinite(definition.availableToProgress)
                    ? definition.availableToProgress
                    : record.deadlineProgress;

                if (previousState === 'active') {
                    if (explicitFail || storyProgress > definition.availableToProgress) {
                        record.state = 'failed';
                        record.resolvedAtProgress = storyProgress;
                        record.lastResult = createSideQuestResult('failed', definition, {
                            summary: `${definition.title}已失手。`,
                            detail: explicitFail ? '任务命中了显式失败条件。' : '主线进度越过了任务窗口，你没能及时了结这笔事。',
                        });
                    }
                    return;
                }

                if (storyProgress > definition.availableToProgress) {
                    const shouldMiss = record.availableAtProgress !== null || (triggerMatched && acceptMatched);
                    if (shouldMiss) {
                        record.state = 'missed';
                        record.resolvedAtProgress = storyProgress;
                        record.lastResult = createSideQuestResult('missed', definition, {
                            summary: `${definition.title}已错过。`,
                            detail: '你没有在主线窗口内接下这桩支线，旧账已经自行滑过去了。',
                        });
                    }
                    return;
                }

                if (withinWindow && triggerMatched && acceptMatched) {
                    record.state = 'available';
                    if (record.availableAtProgress === null) {
                        record.availableAtProgress = storyProgress;
                    }
                    return;
                }

                record.state = 'locked';
            });

            return state;
        }

        function getVisibleSideQuests(state) {
            syncSideQuestAvailability(state);
            return SIDE_QUESTS_V1
                .map((definition) => {
                    const runtime = state.sideQuests[definition.id];
                    return {
                        id: definition.id,
                        title: definition.title,
                        detail: definition.detail,
                        category: definition.category,
                        npc: definition.npc || null,
                        priority: definition.priority || 0,
                        exclusiveGroup: definition.exclusiveGroup || null,
                        availableFromProgress: definition.availableFromProgress,
                        availableToProgress: definition.availableToProgress,
                        rewardPreview: definition.rewardPreview || '',
                        choices: clone(definition.choices || []),
                        state: runtime.state,
                        availableAtProgress: runtime.availableAtProgress,
                        acceptedAtProgress: runtime.acceptedAtProgress,
                        deadlineProgress: runtime.deadlineProgress,
                        resolvedAtProgress: runtime.resolvedAtProgress,
                        selectedChoiceId: runtime.selectedChoiceId,
                        lastResult: runtime.lastResult ? clone(runtime.lastResult) : null,
                    };
                })
                .filter((entry) => entry.state !== 'locked')
                .sort((left, right) => (right.priority - left.priority)
                    || (left.availableFromProgress - right.availableFromProgress)
                    || left.title.localeCompare(right.title, 'zh-CN'));
        }

        function acceptSideQuest(state, questId) {
            syncSideQuestAvailability(state);
            const definition = getSideQuestDefinition(questId);
            if (!definition) {
                return { ok: false, error: '支线任务不存在。' };
            }

            const record = state.sideQuests[questId];
            if (!record || record.state !== 'available') {
                return { ok: false, error: '当前无法接取该支线。' };
            }

            const activeQuest = Object.values(state.sideQuests).find((entry) => entry.state === 'active' && entry.questId !== questId);
            if (activeQuest) {
                return { ok: false, error: '已有进行中的支线，请先完成当前支线。' };
            }

            record.state = 'active';
            if (record.availableAtProgress === null) {
                record.availableAtProgress = deps.getMainStoryProgressValue(state);
            }
            record.acceptedAtProgress = deps.getMainStoryProgressValue(state);
            record.deadlineProgress = definition.availableToProgress;
            record.lastResult = null;
            deps.pushLog(state, `接取支线：${definition.title}`, 'normal');
            return { ok: true, quest: getVisibleSideQuests(state).find((entry) => entry.id === questId) || null };
        }

        function chooseSideQuestOption(state, questId, choiceId) {
            syncSideQuestAvailability(state);
            const definition = getSideQuestDefinition(questId);
            if (!definition) {
                return { ok: false, error: '支线任务不存在。' };
            }

            const record = state.sideQuests[questId];
            if (!record || record.state !== 'active') {
                return { ok: false, error: '当前没有可结算的支线选项。' };
            }

            const choice = (definition.choices || []).find((item) => item.id === choiceId);
            if (!choice) {
                return { ok: false, error: '支线选项不存在。' };
            }

            if (!deps.applyCosts(state, choice.costs)) {
                return { ok: false, error: '资源不足，无法支付支线代价。' };
            }

            const totalEffects = deps.mergeEffectPayload(definition.rewards, choice.effects);
            deps.applyEffects(state, totalEffects);
            deps.pushLog(state, `支线抉择：${choice.text}`, 'normal');

            const branchMeta = definition.branchEffects?.[choice.id] || null;
            record.state = 'completed';
            record.selectedChoiceId = choice.id;
            record.resolvedAtProgress = deps.getMainStoryProgressValue(state);
            record.lastResult = createSideQuestResult('completed', definition, {
                choiceId: choice.id,
                summary: choice.resultSummary || `你已了结支线：${definition.title}。`,
                detail: branchMeta?.detail || '',
            });
            deps.pushLog(state, `完成支线：${definition.title}`, 'good');

            syncSideQuestAvailability(state);
            return { ok: true, quest: getVisibleSideQuests(state).find((entry) => entry.id === questId) || null };
        }

        function getAvailableSideStories(state) {
            syncSideQuestAvailability(state);
            const storyProgress = deps.getMainStoryProgressValue(state);
            const stories = [];
            const seenTitles = new Set();
            const pushStory = (title, detail, npc) => {
                if (seenTitles.has(title)) {
                    return;
                }
                seenTitles.add(title);
                stories.push(npc ? { title, detail, npc } : { title, detail });
            };
            const pushQuestStory = (questId) => {
                const quest = getSideQuestDefinition(questId);
                if (!quest) {
                    return;
                }
                pushStory(quest.title, quest.detail, quest.npc);
            };

            if (storyProgress >= 8 && hasAnyStateFlag(state, ['protectedMoHouse', 'promisedMoReturn', 'lootedMoHouse', 'daoLvPromise', 'tookTreasure'])) {
                pushQuestStory('old_medicine_ledger');
            }
            if (storyProgress >= 9 && hasAnyStateFlag(state, ['hasQuhun', 'sealedQuhun', 'quhunReleased', 'keptQuhun'])) {
                pushQuestStory('apothecary_boy_echo');
            }
            if (hasAnyStateFlag(state, ['fanxinAnchor1', 'fanxinAnchor2'])) {
                pushStory('青牛旧路', '离家太久后，最容易被忘的不是地方，而是自己最初为什么要走。', '厉飞雨');
            }
            if ((state.npcRelations['厉飞雨'] || 0) >= 15 || state.flags.reconnectedWithLiFeiyu) {
                pushQuestStory('li_feiyu_wine');
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
                pushQuestStory('spirit_mine_survivor');
            }
            if (storyProgress >= 21) {
                pushStory('海上契约', '星海不认旧名，只认账。你若想在这里真正站住脚，总要有一两次让人觉得和你合作不亏。', '万小山');
            }
            if (storyProgress >= 22 && hasAnyStateFlag(state, ['enteredVoidHeavenMapGame', 'soldFragmentMapForResources', 'avoidedVoidHeavenCoreConflict', 'hasXuTianTu', 'soldXuTianTu', 'avoidedXuTian'])) {
                pushQuestStory('void_map_aftermath');
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

        function chooseExpeditionEventType(random) {
            const totalWeight = Object.values(constants.EXPEDITION_EVENT_WEIGHTS).reduce((sum, value) => sum + value, 0);
            let remainingWeight = random() * totalWeight;
            const orderedKeys = ['battle', 'resource', 'risk', 'clue'];
            for (const key of orderedKeys) {
                remainingWeight -= constants.EXPEDITION_EVENT_WEIGHTS[key];
                if (remainingWeight < 0) {
                    return key;
                }
            }
            return 'resource';
        }

        function getExpeditionReward(state, divisor, minimum) {
            return Math.max(minimum, Math.ceil(state.maxCultivation / divisor));
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

        function settleCombat(state, combatState, victory, random) {
            if (victory) {
                const lingshiGain = getExpeditionReward(state, 90, 3);
                deps.changeItem(state, 'lingshi', lingshiGain);
                deps.pushLog(state, `游历击败 ${combatState.monster.name}，灵石 +${lingshiGain}`, 'good');

                const dropCount = Math.floor(random() * 2) + 1;
                const drops = [];
                for (let index = 0; index < dropCount; index += 1) {
                    const itemId = combatState.monster.dropTable[Math.floor(random() * combatState.monster.dropTable.length)];
                    const quantity = itemId === 'feijian' || itemId === 'hujian' || itemId === 'xuTianTu' ? 1 : (Math.floor(random() * 2) + 1);
                    deps.changeItem(state, itemId, quantity);
                    drops.push({ itemId, quantity });
                    deps.pushLog(state, `游历掉落 ${ITEMS[itemId].name} x${quantity}`, 'good');
                }
                state.playerStats.hp = Math.max(1, Math.min(state.playerStats.maxHp, state.playerStats.hp));
                return { lingshiGain, drops };
            }

            const lingshiLoss = Math.min(deps.getInventoryCount(state, 'lingshi'), Math.max(1, Math.floor(getExpeditionReward(state, 90, 3) / 2)));
            if (lingshiLoss > 0) {
                deps.changeItem(state, 'lingshi', -lingshiLoss);
            }
            state.playerStats.hp = Math.max(1, Math.round(state.playerStats.maxHp * 0.2));
            deps.pushLog(state, lingshiLoss > 0 ? `游历失利，折损灵石 ${lingshiLoss}` : '游历失利，未能带回额外灵石', 'fail');
            return { lingshiLoss, drops: [] };
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

        function resolveExpedition(state, rng) {
            const random = rng || Math.random;
            const eventType = chooseExpeditionEventType(random);
            const location = getLocationMeta(state);

            if (eventType === 'battle') {
                const combatState = beginCombat(state, random);
                const summary = `你在 ${location.name} 察觉妖气，遭遇 ${combatState.monster.name}。`;
                deps.pushLog(state, summary, 'normal');
                return { ok: true, type: 'battle', summary, combatState };
            }

            if (eventType === 'resource') {
                const lingshiGain = getExpeditionReward(state, 80, 2);
                deps.changeItem(state, 'lingshi', lingshiGain);
                const summary = `你在 ${location.name} 搜得灵石 ${lingshiGain} 枚，可带回洞府闭关。`;
                deps.pushLog(state, summary, 'good');
                return { ok: true, type: 'resource', summary, lingshiGain };
            }

            if (eventType === 'risk') {
                const lingshiLoss = Math.min(deps.getInventoryCount(state, 'lingshi'), getExpeditionReward(state, 140, 1));
                const hpLoss = Math.max(1, Math.round(state.playerStats.maxHp * 0.12));
                if (lingshiLoss > 0) {
                    deps.changeItem(state, 'lingshi', -lingshiLoss);
                }
                state.playerStats.hp = Math.max(1, state.playerStats.hp - hpLoss);
                const summary = lingshiLoss > 0
                    ? `你在 ${location.name} 遭阵雾扰乱，折损灵石 ${lingshiLoss} 枚，气血 -${hpLoss}。`
                    : `你在 ${location.name} 被煞气所伤，气血 -${hpLoss}。`;
                deps.pushLog(state, summary, 'bad');
                return { ok: true, type: 'risk', summary, lingshiLoss, hpLoss };
            }

            const sideStories = getAvailableSideStories(state);
            if (sideStories.length <= 0) {
                const fallbackGain = getExpeditionReward(state, 80, 2);
                deps.changeItem(state, 'lingshi', fallbackGain);
                const summary = `你在 ${location.name} 未寻得新线索，却顺手带回灵石 ${fallbackGain} 枚。`;
                deps.pushLog(state, summary, 'good');
                return { ok: true, type: 'resource', summary, lingshiGain: fallbackGain };
            }

            const clue = sideStories[Math.floor(random() * sideStories.length)];
            const summary = `你在 ${location.name} 听闻线索「${clue.title}」，可前往剧情与游历页继续查看。`;
            deps.pushLog(state, summary, 'normal');
            return { ok: true, type: 'clue', summary, clueTitle: clue.title };
        }

        function canAutoCultivate(state) {
            return state.realmIndex >= 1;
        }

        return {
            getVisibleSideQuests,
            acceptSideQuest,
            chooseSideQuestOption,
            getAvailableSideStories,
            getLocationMeta,
            getNpcDialogue,
            resolveExpedition,
            canAutoCultivate,
            beginCombat,
            resolveCombatRound,
            syncSideQuestAvailability,
            SIDE_QUESTS_V1,
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = createWorldModule;
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.core = registry.core || {};
    registry.core.createWorldModule = createWorldModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
