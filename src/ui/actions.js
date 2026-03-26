(function (globalScope) {
    function createUiActionsModule(deps) {
        function getTrainBatchLabel(batchKey) {
            const labels = {
                '1': '1 枚',
                '10': '10 枚',
                max: '尽数闭关',
            };
            return labels[batchKey] || '当前批次';
        }

        function setActiveTab(ctx, tabName) {
            if (tabName === 'alchemy' && ctx.combatState) {
                window.alert('战斗中不可分心炼丹。');
                return false;
            }
            ctx.gameState.ui.activeTab = tabName;
            ctx.GameCore.syncUnreadStoryState(ctx.gameState);
            deps.render(ctx);
            deps.saveGame(ctx);
            return true;
        }

        function handleCultivate(ctx) {
            const actionState = deps.getCultivationActionState(ctx);

            if (actionState.mode === 'breakthrough') {
                const result = ctx.GameCore.attemptBreakthrough(ctx.gameState);
                if (!result.ok) {
                    deps.showFloatingText(ctx, '修为未满', 'loss');
                    deps.playSound(ctx, 'fail');
                } else if (result.capped) {
                    deps.showFloatingText(ctx, '绝巅已至', 'breakthrough');
                    deps.playSound(ctx, 'breakthrough');
                } else if (result.success) {
                    deps.showFloatingText(ctx, '突破成功', 'breakthrough');
                    deps.playSound(ctx, 'breakthrough');
                } else {
                    deps.showFloatingText(ctx, `突破失败 -${result.penalty}`, 'loss');
                    deps.playSound(ctx, 'fail');
                }
            } else if (actionState.mode === 'train') {
                const result = ctx.GameCore.trainWithLingshi(ctx.gameState, ctx.selectedTrainBatch);
                if (!result.ok) {
                    deps.showFloatingText(ctx, '灵石不足', 'loss');
                    deps.playSound(ctx, 'fail');
                } else {
                    deps.showFloatingText(ctx, `修为 +${result.gain}`, 'gain');
                    deps.playSound(ctx, 'click');
                }
            } else {
                deps.showFloatingText(ctx, '灵石不足', 'loss');
                deps.playSound(ctx, 'fail');
                return;
            }

            ctx.GameCore.ensureStoryCursor(ctx.gameState);
            ctx.GameCore.syncUnreadStoryState(ctx.gameState);
            deps.render(ctx);
            deps.saveGame(ctx);
        }

        function startAdventure(ctx) {
            if (ctx.combatState) {
                return;
            }

            deps.primeNaturalRecoveryState(ctx, Date.now());
            const result = ctx.GameCore.resolveExpedition(ctx.gameState);
            if (!result.ok) {
                window.alert(result.error || '游历失败');
                return;
            }

            if (result.type === 'battle') {
                deps.markRecoveryCheckpoint(ctx);
                ctx.combatState = result.combatState;
                ctx.elements.combatLog.innerHTML = '';
                deps.appendCombatEntries(ctx, [result.summary]);
                deps.render(ctx);
                ctx.combatTimer = window.setTimeout(() => deps.runCombatLoop(ctx), 700);
                deps.saveGame(ctx);
                return;
            }

            if (result.type === 'resource') {
                deps.showFloatingText(ctx, `灵石 +${result.lingshiGain}`, 'gain');
                deps.playSound(ctx, 'click');
            } else if (result.type === 'risk') {
                const text = result.lingshiLoss > 0 ? `灵石 -${result.lingshiLoss}` : `气血 -${result.hpLoss}`;
                deps.showFloatingText(ctx, text, 'loss');
                deps.playSound(ctx, 'fail');
            } else {
                deps.showFloatingText(ctx, '探得线索', 'breakthrough');
                deps.playSound(ctx, 'story');
            }

            deps.render(ctx);
            deps.saveGame(ctx);
        }

        function openDialogue(ctx, npcName) {
            const dialogue = ctx.GameCore.getNpcDialogue(ctx.gameState, npcName);
            if (!dialogue) {
                return;
            }
            ctx.elements.dialogueName.textContent = `${dialogue.name} · ${dialogue.title}`;
            ctx.elements.dialogueAvatar.textContent = dialogue.avatar;
            ctx.elements.dialogueText.textContent = dialogue.text;
            deps.showModal(ctx.elements.dialogueModal);
        }

        function bindEvents(ctx) {
            ctx.elements.mainBtn.addEventListener('click', () => handleCultivate(ctx));
            ctx.elements.adventureBtn.addEventListener('click', () => startAdventure(ctx));

            ctx.elements.trainBatchControls.addEventListener('click', (event) => {
                const button = event.target.closest('[data-train-batch]');
                if (!button) {
                    return;
                }
                const nextBatchKey = button.dataset.trainBatch;
                if (!ctx.TRAINING_BATCH_KEYS.includes(nextBatchKey)) {
                    return;
                }
                ctx.selectedTrainBatch = nextBatchKey;
                deps.renderCultivationPage(ctx);
            });

            ctx.elements.toggleLogBtn.addEventListener('click', () => {
                ctx.gameState.ui.logCollapsed = !ctx.gameState.ui.logCollapsed;
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.storyContinueBtn.addEventListener('click', () => {
                const view = ctx.GameCore.getStoryView(ctx.gameState);
                if (!view || view.mode === 'ending' || view.mode === 'choices') {
                    return;
                }
                ctx.GameCore.advanceStoryBeat(ctx.gameState);
                ctx.GameCore.syncUnreadStoryState(ctx.gameState);
                deps.playSound(ctx, 'story');
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.storySkipBtn.addEventListener('click', () => {
                const result = ctx.GameCore.skipStoryPlayback(ctx.gameState);
                if (result.ok) {
                    ctx.GameCore.syncUnreadStoryState(ctx.gameState);
                    deps.render(ctx);
                    deps.saveGame(ctx);
                }
            });

            ctx.elements.storyChoices.addEventListener('click', (event) => {
                const target = event.target.closest('[data-choice-id], [data-ending-action]');
                if (!target) {
                    return;
                }

                if (target.dataset.endingAction === 'reset') {
                    deps.showModal(ctx.elements.confirmModal);
                    return;
                }
                if (target.dataset.endingAction === 'export') {
                    deps.exportSave(ctx);
                    return;
                }

                const result = ctx.GameCore.chooseStoryOption(ctx.gameState, target.dataset.choiceId);
                if (!result.ok) {
                    window.alert(result.error);
                    return;
                }
                ctx.GameCore.syncUnreadStoryState(ctx.gameState);
                deps.playSound(ctx, result.death ? 'fail' : (result.ending ? 'victory' : 'story'));
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.navButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    if (button.dataset.tab) {
                        setActiveTab(ctx, button.dataset.tab);
                        return;
                    }
                    if (button.dataset.action === 'inventory') {
                        deps.renderInventory(ctx);
                        deps.showModal(ctx.elements.inventoryModal);
                        return;
                    }
                    if (button.dataset.action === 'settings') {
                        deps.renderSettings(ctx);
                        deps.showModal(ctx.elements.settingsModal);
                    }
                });
            });

            ctx.elements.locationNpcs.addEventListener('click', (event) => {
                const button = event.target.closest('[data-npc-name]');
                if (button) {
                    openDialogue(ctx, button.dataset.npcName);
                }
            });

            ctx.elements.sideStoryList.addEventListener('click', (event) => {
                const actionButton = event.target.closest('[data-side-quest-action], [data-side-quest-choice-id]');
                if (!actionButton) {
                    return;
                }

                const questId = actionButton.dataset.sideQuestTargetId
                    || actionButton.closest('[data-side-quest-id]')?.dataset.sideQuestId;
                if (!questId) {
                    return;
                }

                if (actionButton.dataset.sideQuestAction === 'accept') {
                    const result = ctx.GameCore.acceptSideQuest(ctx.gameState, questId);
                    if (!result.ok) {
                        window.alert(result.error || '当前无法接取该支线。');
                        deps.playSound(ctx, 'fail');
                        return;
                    }

                    deps.showFloatingText(ctx, '接下支线', 'breakthrough');
                    deps.playSound(ctx, 'story');
                    deps.render(ctx);
                    deps.saveGame(ctx);
                    return;
                }

                const choiceId = actionButton.dataset.sideQuestChoiceId;
                if (!choiceId) {
                    return;
                }

                const result = ctx.GameCore.chooseSideQuestOption(ctx.gameState, questId, choiceId);
                if (!result.ok) {
                    window.alert(result.error || '当前无法了结该支线。');
                    deps.playSound(ctx, 'fail');
                    return;
                }

                deps.showFloatingText(ctx, '支线已了结', 'gain');
                deps.playSound(ctx, 'click');
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.inventoryList.addEventListener('click', (event) => {
                const button = event.target.closest('[data-item-action]');
                if (!button) {
                    return;
                }
                const result = ctx.GameCore.performItemAction(ctx.gameState, button.dataset.itemId, button.dataset.itemAction, {
                    inCombat: Boolean(ctx.combatState),
                });
                if (!result.ok) {
                    window.alert(result.error);
                    return;
                }
                if (result.delta.cultivation > 0) {
                    deps.showFloatingText(ctx, `修为 +${result.delta.cultivation}`, 'gain');
                } else if (result.delta.hp > 0) {
                    deps.showFloatingText(ctx, `气血 +${result.delta.hp}`, 'gain');
                } else if (result.delta.breakthroughRate > 0) {
                    deps.showFloatingText(ctx, `突破率 +${Math.round(result.delta.breakthroughRate * 100)}%`, 'breakthrough');
                }
                deps.playSound(ctx, 'click');
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.alchemyList.addEventListener('click', (event) => {
                const button = event.target.closest('[data-craft-recipe-id]');
                if (!button) {
                    return;
                }
                const result = ctx.GameCore.craftRecipe(ctx.gameState, button.dataset.craftRecipeId, {
                    inCombat: Boolean(ctx.combatState),
                });
                if (!result.ok) {
                    window.alert(result.error);
                    return;
                }
                deps.showFloatingText(ctx, result.outputText, 'gain');
                deps.playSound(ctx, 'click');
                deps.render(ctx);
                deps.saveGame(ctx);
            });

            ctx.elements.closeInventory.addEventListener('click', () => deps.hideModal(ctx.elements.inventoryModal));
            ctx.elements.closeSettings.addEventListener('click', () => deps.hideModal(ctx.elements.settingsModal));
            ctx.elements.closeDialogue.addEventListener('click', () => deps.hideModal(ctx.elements.dialogueModal));

            ctx.elements.audioToggle.addEventListener('change', () => {
                ctx.gameState.settings.audioEnabled = ctx.elements.audioToggle.checked;
                deps.saveGame(ctx);
            });
            ctx.elements.musicToggle.addEventListener('change', () => {
                ctx.gameState.settings.musicEnabled = ctx.elements.musicToggle.checked;
                deps.saveGame(ctx);
            });
            ctx.elements.exportBtn.addEventListener('click', () => deps.exportSave(ctx));
            ctx.elements.importBtn.addEventListener('click', () => deps.importSave(ctx));
            ctx.elements.resetBtn.addEventListener('click', () => deps.showModal(ctx.elements.confirmModal));
            ctx.elements.cancelReset.addEventListener('click', () => deps.hideModal(ctx.elements.confirmModal));
            ctx.elements.confirmReset.addEventListener('click', () => deps.resetGame(ctx));

            [ctx.elements.inventoryModal, ctx.elements.settingsModal, ctx.elements.dialogueModal, ctx.elements.confirmModal].forEach((modal) => {
                modal.addEventListener('click', (event) => {
                    if (event.target === modal) {
                        deps.hideModal(modal);
                    }
                });
            });
        }

        function init(ctx) {
            deps.cacheElements(ctx);
            deps.loadGame(ctx);
            bindEvents(ctx);
            deps.startNaturalRecoveryLoop(ctx);
            deps.primeNaturalRecoveryState(ctx, Date.now());
            window.addEventListener('pagehide', () => deps.saveGame(ctx));
            deps.render(ctx);
            deps.saveGame(ctx);
        }

        return {
            getTrainBatchLabel,
            setActiveTab,
            handleCultivate,
            startAdventure,
            openDialogue,
            bindEvents,
            init,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createUiActionsModule = createUiActionsModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
