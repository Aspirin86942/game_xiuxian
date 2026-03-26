(function () {
    const internals = window.__XIUXIAN_INTERNALS__ || {};
    const createDomCacheModule = internals.ui?.createDomCacheModule;
    const createUiAudioModule = internals.ui?.createUiAudioModule;
    const createUiPersistenceModule = internals.ui?.createUiPersistenceModule;
    const createUiLoopsModule = internals.ui?.createUiLoopsModule;
    const createUiRenderersModule = internals.ui?.createUiRenderersModule;
    const createUiActionsModule = internals.ui?.createUiActionsModule;

    if (!createDomCacheModule || !createUiAudioModule || !createUiPersistenceModule || !createUiLoopsModule || !createUiRenderersModule || !createUiActionsModule) {
        throw new Error('game.js 内部 UI 模块未完整加载');
    }

    const ctx = {
        StoryData,
        GameCore,
        STORAGE_KEY: StoryData.STORAGE_KEY,
        ITEMS: StoryData.ITEMS,
        TRAINING_BATCH_KEYS: ['1', '10', 'max'],
        MAX_IMPORT_FILE_BYTES: 256 * 1024,
        gameState: GameCore.createInitialState(),
        combatState: null,
        naturalRecoveryTimer: null,
        combatTimer: null,
        audioContext: null,
        selectedTrainBatch: '1',
        elements: {},
    };

    const deps = {};
    Object.assign(deps, createDomCacheModule(deps));
    Object.assign(deps, createUiAudioModule(deps));
    Object.assign(deps, createUiRenderersModule(deps));
    Object.assign(deps, createUiLoopsModule(deps));
    Object.assign(deps, createUiPersistenceModule(deps));
    Object.assign(deps, createUiActionsModule(deps));

    document.addEventListener('DOMContentLoaded', () => deps.init(ctx));
})();
