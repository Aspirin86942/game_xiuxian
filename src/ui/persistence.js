(function (globalScope) {
    function createUiPersistenceModule(deps) {
        function saveGame(ctx) {
            localStorage.setItem(ctx.STORAGE_KEY, ctx.GameCore.serializeState(ctx.gameState));
        }

        function bootstrapFreshState(ctx) {
            ctx.gameState = ctx.GameCore.createInitialState();
            ctx.GameCore.ensureStoryCursor(ctx.gameState);
            ctx.selectedTrainBatch = '1';
        }

        function getUnsupportedSaveMessage(rawState, ctx) {
            const versionText = Number.isFinite(rawState?.version) ? `v${rawState.version}` : '未知版本';
            if (Number.isFinite(rawState?.version) && rawState.version > ctx.GameCore.SAVE_VERSION) {
                return `检测到更高版本存档（${versionText}），当前主循环仅支持 v${ctx.GameCore.MIN_SUPPORTED_SAVE_VERSION} - v${ctx.GameCore.SAVE_VERSION}。`;
            }
            return `检测到旧版存档（${versionText}），当前主循环已升级到 v${ctx.GameCore.SAVE_VERSION}。`;
        }

        function restoreGameState(ctx, parsedState) {
            ctx.gameState = ctx.GameCore.mergeSave(parsedState);
            ctx.GameCore.ensureStoryCursor(ctx.gameState, { preserveRestoreReadState: true });
            ctx.GameCore.syncUnreadStoryState(ctx.gameState);
            ctx.selectedTrainBatch = ctx.TRAINING_BATCH_KEYS.includes(ctx.selectedTrainBatch) ? ctx.selectedTrainBatch : '1';
            deps.primeNaturalRecoveryState(ctx, Date.now());
        }

        function loadGame(ctx) {
            const raw = localStorage.getItem(ctx.STORAGE_KEY);
            if (!raw) {
                bootstrapFreshState(ctx);
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                if (!ctx.GameCore.isSupportedSaveData(parsed)) {
                    console.warn('检测到旧版存档，已自动重置');
                    window.alert(`${getUnsupportedSaveMessage(parsed, ctx)}该存档不会继续加载，已为你重置为新档。`);
                    localStorage.removeItem(ctx.STORAGE_KEY);
                    bootstrapFreshState(ctx);
                    saveGame(ctx);
                    return;
                }
                restoreGameState(ctx, parsed);
            } catch (error) {
                console.error('存档读取失败', error);
                localStorage.removeItem(ctx.STORAGE_KEY);
                bootstrapFreshState(ctx);
                saveGame(ctx);
            }
        }

        function resetGame(ctx) {
            deps.stopCombatLoop(ctx);
            localStorage.removeItem(ctx.STORAGE_KEY);
            bootstrapFreshState(ctx);
            [
                ctx.elements.confirmModal,
                ctx.elements.settingsModal,
                ctx.elements.inventoryModal,
                ctx.elements.dialogueModal,
                ctx.elements.combatModal,
            ].forEach(deps.hideModal);
            deps.render(ctx);
            saveGame(ctx);
        }

        function exportSave(ctx) {
            saveGame(ctx);
            const blob = new Blob([ctx.GameCore.serializeState(ctx.gameState)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `灵光修仙传_v${ctx.GameCore.SAVE_VERSION}_${new Date().toISOString().slice(0, 10)}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
        }

        function importSave(ctx) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', (event) => {
                const [file] = event.target.files || [];
                if (!file) {
                    return;
                }
                if (file.size > ctx.MAX_IMPORT_FILE_BYTES) {
                    window.alert(`导入失败：存档文件过大，请控制在 ${Math.floor(ctx.MAX_IMPORT_FILE_BYTES / 1024)} KB 以内。`);
                    return;
                }
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    try {
                        const parsed = JSON.parse(loadEvent.target.result);
                        if (!ctx.GameCore.isSupportedSaveData(parsed)) {
                            window.alert(`导入失败：${getUnsupportedSaveMessage(parsed, ctx)}该存档不会覆盖当前进度。`);
                            return;
                        }
                        deps.stopCombatLoop(ctx);
                        restoreGameState(ctx, parsed);
                        deps.render(ctx);
                        saveGame(ctx);
                    } catch (error) {
                        window.alert(`导入失败：${error.message}`);
                    }
                };
                reader.readAsText(file, 'utf-8');
            });
            input.click();
        }

        return {
            saveGame,
            bootstrapFreshState,
            getUnsupportedSaveMessage,
            restoreGameState,
            loadGame,
            resetGame,
            exportSave,
            importSave,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createUiPersistenceModule = createUiPersistenceModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
