(function (globalScope) {
    function createUiLoopsModule(deps) {
        function markRecoveryCheckpoint(ctx, nowMs) {
            const safeNowMs = typeof nowMs === 'number' ? nowMs : Date.now();
            ctx.gameState.recovery = ctx.gameState.recovery || { lastCheckedAt: null };
            ctx.gameState.recovery.lastCheckedAt = safeNowMs;
        }

        function primeNaturalRecoveryState(ctx, nowMs) {
            if (ctx.combatState) {
                return;
            }
            ctx.GameCore.resolveNaturalRecovery(ctx.gameState, nowMs);
        }

        function runNaturalRecoveryTick(ctx) {
            if (ctx.combatState) {
                return;
            }

            const result = ctx.GameCore.resolveNaturalRecovery(ctx.gameState, Date.now());
            if (!result.touched) {
                return;
            }

            deps.render(ctx);
            deps.saveGame(ctx);
        }

        function startNaturalRecoveryLoop(ctx) {
            stopNaturalRecoveryLoop(ctx);
            ctx.naturalRecoveryTimer = window.setInterval(
                () => runNaturalRecoveryTick(ctx),
                ctx.StoryData.CONFIG.naturalRecoveryIntervalMs,
            );
        }

        function stopNaturalRecoveryLoop(ctx) {
            if (ctx.naturalRecoveryTimer) {
                window.clearInterval(ctx.naturalRecoveryTimer);
                ctx.naturalRecoveryTimer = null;
            }
        }

        function stopCombatLoop(ctx) {
            if (ctx.combatTimer) {
                window.clearTimeout(ctx.combatTimer);
                ctx.combatTimer = null;
            }
            markRecoveryCheckpoint(ctx);
            ctx.combatState = null;
        }

        function appendCombatEntries(ctx, lines) {
            lines.forEach((line) => {
                const node = document.createElement('div');
                node.className = 'combat-entry';
                node.textContent = line;
                ctx.elements.combatLog.prepend(node);
            });
        }

        function createCombatSettlementEntries(ctx, roundResult) {
            if (!roundResult.rewards) {
                return [];
            }

            if (roundResult.victory) {
                const entries = [];
                if (roundResult.rewards.lingshiGain) {
                    entries.push(`战利：灵石 +${roundResult.rewards.lingshiGain}`);
                }
                if (Array.isArray(roundResult.rewards.drops) && roundResult.rewards.drops.length > 0) {
                    roundResult.rewards.drops.forEach((drop) => {
                        const itemName = ctx.ITEMS[drop.itemId]?.name || drop.itemId;
                        entries.push(`掉落：${itemName} x${drop.quantity}`);
                    });
                }
                return entries;
            }

            if (roundResult.rewards.lingshiLoss > 0) {
                return [`损失：灵石 -${roundResult.rewards.lingshiLoss}`];
            }
            return ['损失：未带回额外灵石'];
        }

        function runCombatLoop(ctx) {
            if (!ctx.combatState) {
                return;
            }

            const roundResult = ctx.GameCore.resolveCombatRound(ctx.gameState, ctx.combatState);
            appendCombatEntries(ctx, roundResult.entries);
            deps.renderCombat(ctx);
            deps.renderStatus(ctx);
            deps.renderCultivationPage(ctx);

            if (roundResult.finished) {
                appendCombatEntries(ctx, createCombatSettlementEntries(ctx, roundResult));
                appendCombatEntries(ctx, [roundResult.victory ? '战斗结束，你带着收获离去。' : '战斗结束，你负伤退走。']);
                deps.playSound(ctx, roundResult.victory ? 'victory' : 'fail');
                ctx.combatTimer = window.setTimeout(() => {
                    stopCombatLoop(ctx);
                    deps.render(ctx);
                    deps.saveGame(ctx);
                }, 1200);
                return;
            }

            ctx.combatTimer = window.setTimeout(() => runCombatLoop(ctx), 900);
        }

        return {
            markRecoveryCheckpoint,
            primeNaturalRecoveryState,
            runNaturalRecoveryTick,
            startNaturalRecoveryLoop,
            stopNaturalRecoveryLoop,
            stopCombatLoop,
            appendCombatEntries,
            createCombatSettlementEntries,
            runCombatLoop,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createUiLoopsModule = createUiLoopsModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
