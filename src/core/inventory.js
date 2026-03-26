(function (globalScope) {
    function createInventoryModule(deps) {
        const { clone } = deps.shared;
        const {
            ITEMS,
            ALCHEMY_RECIPES,
            REALMS,
        } = deps.data;

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
                deps.pushLog(state, `消耗 ${ITEMS[itemId].name} x${amount}`, 'bad');
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
                    deps.pushLog(state, `${actionLabel} ${ITEMS[itemId].name} x${Math.abs(amount)}`, amount > 0 ? 'good' : 'bad');
                });
            }

            if (effects.relations) {
                Object.entries(effects.relations).forEach(([npcName, amount]) => {
                    state.npcRelations[npcName] = (state.npcRelations[npcName] || 0) + amount;
                    deps.pushLog(state, `${npcName} 关系 ${amount > 0 ? '+' : ''}${amount}`, amount > 0 ? 'good' : 'bad');
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

            deps.recalculateState(state, false);
        }

        function mergeEffectPayload(baseEffects, extraEffects) {
            const merged = {};
            const numericKeys = ['cultivation', 'breakthroughBonus', 'healRatio'];
            numericKeys.forEach((key) => {
                const total = (baseEffects?.[key] || 0) + (extraEffects?.[key] || 0);
                if (total) {
                    merged[key] = total;
                }
            });

            ['items', 'relations', 'routeScores', 'flags'].forEach((key) => {
                const combined = {};
                if (baseEffects?.[key] && typeof baseEffects[key] === 'object') {
                    Object.entries(baseEffects[key]).forEach(([name, value]) => {
                        combined[name] = value;
                    });
                }
                if (extraEffects?.[key] && typeof extraEffects[key] === 'object') {
                    Object.entries(extraEffects[key]).forEach(([name, value]) => {
                        if (key === 'flags') {
                            combined[name] = value;
                        } else {
                            combined[name] = (combined[name] || 0) + value;
                        }
                    });
                }
                if (Object.keys(combined).length > 0) {
                    merged[key] = combined;
                }
            });

            if (extraEffects?.location || baseEffects?.location) {
                merged.location = extraEffects?.location || baseEffects?.location;
            }

            return merged;
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
            deps.pushLog(state, `${recipe.name} 成功，炼成 ${outputText}`, 'good');
            return {
                ok: true,
                recipeId,
                outputs: clone(recipe.outputs || {}),
                outputText,
                message: `炼成 ${outputText}`,
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
            deps.pushLog(state, `${action.label} ${item.name}`, 'good');

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

        return {
            getInventoryCount,
            getMissingCosts,
            canAffordCosts,
            changeItem,
            applyCosts,
            applyEffects,
            mergeEffectPayload,
            getItemActions,
            getInventoryPassiveBonuses,
            getBreakthroughActualRate,
            formatCosts,
            getAlchemyRecipes,
            craftRecipe,
            getItemActionPreconditionError,
            performItemAction,
            useItem,
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = createInventoryModule;
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.core = registry.core || {};
    registry.core.createInventoryModule = createInventoryModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
