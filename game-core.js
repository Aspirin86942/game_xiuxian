(function (globalScope) {
    const dataSource = globalScope.StoryData || (typeof require === 'function' ? require('./story-data.js') : null);

    if (!dataSource) {
        throw new Error('StoryData 未加载');
    }

    const {
        CONFIG,
        REALMS,
        ITEMS,
        ALCHEMY_RECIPES,
        MONSTERS,
        LOCATIONS,
        NPCS,
        STORY_CHAPTERS,
        LEVEL_STORY_EVENTS,
        SIDE_QUESTS_V1,
        VOLUME_ONE_CHAPTERS,
        VOLUME_TWO_CHAPTERS,
        VOLUME_THREE_CHAPTERS,
        VOLUME_FOUR_CHAPTERS,
        VOLUME_FIVE_CHAPTERS,
    } = dataSource;

    function loadSharedHelpers() {
        if (typeof module !== 'undefined' && module.exports) {
            return require('./src/shared/helpers.js');
        }
        return globalScope.__XIUXIAN_INTERNALS__?.shared?.helpers || null;
    }

    function loadCoreFactory(name, requirePath) {
        if (typeof module !== 'undefined' && module.exports) {
            return require(requirePath);
        }
        return globalScope.__XIUXIAN_INTERNALS__?.core?.[name] || null;
    }

    const sharedHelpers = loadSharedHelpers();
    const createStateModule = loadCoreFactory('createStateModule', './src/core/state.js');
    const createInventoryModule = loadCoreFactory('createInventoryModule', './src/core/inventory.js');
    const createStoryModule = loadCoreFactory('createStoryModule', './src/core/story.js');
    const createWorldModule = loadCoreFactory('createWorldModule', './src/core/world.js');
    const createProgressionModule = loadCoreFactory('createProgressionModule', './src/core/progression.js');

    if (!sharedHelpers || !createStateModule || !createInventoryModule || !createStoryModule || !createWorldModule || !createProgressionModule) {
        throw new Error('GameCore 内部模块未完整加载');
    }

    const SAVE_VERSION = 7;
    const MIN_SUPPORTED_SAVE_VERSION = 7;
    const MAX_LOGS = 120;
    const DECISION_HISTORY_LIMIT = 64;
    const ENDING_SEED_LIMIT = 4;
    const PRESSURE_COLLAPSE_THRESHOLD = 9;
    const TRAINING_GAIN_PER_LINGSHI = 10;
    const TRAINING_BATCHES = Object.freeze({
        '1': 1,
        '10': 10,
        max: Number.POSITIVE_INFINITY,
    });
    const STORY_CONSEQUENCE_LIMITS = Object.freeze({
        battleWill: 8,
        tribulation: 42,
    });
    const PRESSURE_TIERS = Object.freeze([
        { id: 'safe', label: '安全', min: 0, max: 2 },
        { id: 'tense', label: '紧绷', min: 3, max: 5 },
        { id: 'critical', label: '濒危', min: 6, max: 8 },
        { id: 'collapse', label: '失控', min: PRESSURE_COLLAPSE_THRESHOLD, max: STORY_CONSEQUENCE_LIMITS.tribulation },
    ]);
    const EXPEDITION_EVENT_WEIGHTS = Object.freeze({
        battle: 45,
        resource: 35,
        risk: 12,
        clue: 8,
    });
    const SIDE_QUEST_STATE_VALUES = Object.freeze(['locked', 'available', 'active', 'completed', 'failed', 'missed']);

    const deps = {
        shared: sharedHelpers,
        data: {
            CONFIG,
            REALMS,
            ITEMS,
            ALCHEMY_RECIPES,
            MONSTERS,
            LOCATIONS,
            NPCS,
            STORY_CHAPTERS,
            LEVEL_STORY_EVENTS,
            SIDE_QUESTS_V1,
            VOLUME_ONE_CHAPTERS,
            VOLUME_TWO_CHAPTERS,
            VOLUME_THREE_CHAPTERS,
            VOLUME_FOUR_CHAPTERS,
            VOLUME_FIVE_CHAPTERS,
            constants: {
                MAX_LOGS,
                SAVE_VERSION,
                MIN_SUPPORTED_SAVE_VERSION,
                DECISION_HISTORY_LIMIT,
                ENDING_SEED_LIMIT,
                PRESSURE_COLLAPSE_THRESHOLD,
                TRAINING_GAIN_PER_LINGSHI,
                TRAINING_BATCHES,
                STORY_CONSEQUENCE_LIMITS,
                PRESSURE_TIERS,
                EXPEDITION_EVENT_WEIGHTS,
                SIDE_QUEST_STATE_VALUES,
            },
        },
    };

    Object.assign(deps, createStateModule(deps));
    Object.assign(deps, createInventoryModule(deps));
    Object.assign(deps, createStoryModule(deps));
    Object.assign(deps, createWorldModule(deps));
    Object.assign(deps, createProgressionModule(deps));

    const GameCore = {
        SAVE_VERSION: deps.SAVE_VERSION,
        MIN_SUPPORTED_SAVE_VERSION: deps.MIN_SUPPORTED_SAVE_VERSION,
        CONFIG,
        REALMS,
        ITEMS,
        ALCHEMY_RECIPES,
        LOCATIONS,
        NPCS,
        LEVEL_STORY_EVENTS,
        STORY_CONSEQUENCE_LIMITS,
        createInitialState: deps.createInitialState,
        mergeSave: deps.mergeSave,
        recalculateState: deps.recalculateState,
        getRealmScore: deps.getRealmScore,
        setRealmScore: deps.setRealmScore,
        getRealmLabel: deps.getRealmLabel,
        getBattleWillBonuses: deps.getBattleWillBonuses,
        getRouteDisplay: deps.getRouteDisplay,
        getRouteSummary: deps.getRouteSummary,
        getPressureStatusText: deps.getPressureStatusText,
        getAlchemyRecipes: deps.getAlchemyRecipes,
        getEchoes: deps.getEchoes,
        getLocationMeta: deps.getLocationMeta,
        getBlockedMainStoryHint: deps.getBlockedMainStoryHint,
        getAvailableSideStories: deps.getAvailableSideStories,
        getVisibleSideQuests: deps.getVisibleSideQuests,
        getNpcDialogue: deps.getNpcDialogue,
        getAvailableMainChapter: deps.getAvailableMainChapter,
        getAvailableLevelEvent: deps.getAvailableLevelEvent,
        getCurrentPlayableStory: deps.getCurrentPlayableStory,
        getInventoryCount: deps.getInventoryCount,
        getItemActions: deps.getItemActions,
        getInventoryPassiveBonuses: deps.getInventoryPassiveBonuses,
        getBreakthroughActualRate: deps.getBreakthroughActualRate,
        formatCosts: deps.formatCosts,
        getNextGoalText: deps.getNextGoalText,
        getChapterById: deps.getChapterById,
        getLevelEventById: deps.getLevelEventById,
        resolveChapter: deps.resolveChapter,
        ensureStoryCursor: deps.ensureStoryCursor,
        getStoryView: deps.getStoryView,
        advanceStoryBeat: deps.advanceStoryBeat,
        skipStoryPlayback: deps.skipStoryPlayback,
        syncUnreadStoryState: deps.syncUnreadStoryState,
        chooseStoryOption: deps.chooseStoryOption,
        acceptSideQuest: deps.acceptSideQuest,
        chooseSideQuestOption: deps.chooseSideQuestOption,
        getTrainingPreview: deps.getTrainingPreview,
        trainWithLingshi: deps.trainWithLingshi,
        resolveExpedition: deps.resolveExpedition,
        canBreakthrough: deps.canBreakthrough,
        attemptBreakthrough: deps.attemptBreakthrough,
        isSupportedSaveData: deps.isSupportedSaveData,
        touchSaveTimestamp: deps.touchSaveTimestamp,
        resolveOfflineCultivation: deps.resolveOfflineCultivation,
        resolveNaturalRecovery: deps.resolveNaturalRecovery,
        craftRecipe: deps.craftRecipe,
        performItemAction: deps.performItemAction,
        useItem: deps.useItem,
        beginCombat: deps.beginCombat,
        resolveCombatRound: deps.resolveCombatRound,
        pushLog: deps.pushLog,
        serializeState: deps.serializeState,
        SIDE_QUESTS_V1,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameCore;
    }

    globalScope.GameCore = GameCore;
})(typeof window !== 'undefined' ? window : globalThis);
