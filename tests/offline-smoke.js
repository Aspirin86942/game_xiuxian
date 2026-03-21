const assert = require('assert');
const GameCore = require('../game-core.js');
const StoryData = require('../story-data.js');

const FIXED_NOW = 1_710_000_000_000;

function createState(options = {}) {
    const {
        realmScore = 0,
        cultivation = 0,
        lingshi = 0,
    } = options;
    const state = GameCore.createInitialState();
    GameCore.setRealmScore(state, realmScore);
    state.cultivation = cultivation;
    if (lingshi > 0) {
        state.inventory.lingshi = lingshi;
    }
    GameCore.recalculateState(state, false);
    return state;
}

function createOfflineState({ realmScore, cultivation = 0, autoCultivate = true, offlineMs }) {
    const state = createState({ realmScore, cultivation });
    state.autoCultivate = autoCultivate;
    GameCore.touchSaveTimestamp(state, FIXED_NOW - offlineMs);
    return state;
}

function runCombatToEnd(state, combatState, rng) {
    let result = null;
    while (!result || !result.finished) {
        result = GameCore.resolveCombatRound(state, combatState, rng);
    }
    return result;
}

function testLegacySaveCompatibility() {
    const merged = GameCore.mergeSave({
        version: 5,
        autoCultivate: true,
        ui: {
            activeTab: 'adventure',
        },
    });

    assert.strictEqual(merged.version, GameCore.SAVE_VERSION);
    assert.strictEqual(GameCore.isSupportedSaveData({ version: 5 }), true);
    assert.strictEqual(GameCore.isSupportedSaveData({ version: 4 }), false);
    assert.strictEqual(merged.offlineTraining.lastSavedAt, null);
    assert.strictEqual(merged.offlineTraining.lastGain, 0);
    assert.strictEqual(merged.offlineTraining.wasCapped, false);
    assert.deepStrictEqual(merged.recovery, {
        lastCheckedAt: null,
    });
    assert.deepStrictEqual(merged.storyConsequences, {
        battleWill: 0,
        tribulation: 0,
        pressureTier: '安全',
        pressureTrend: '平稳',
    });
    assert.strictEqual(merged.ui.activeTab, 'cultivation');
}

function testTrainingSuccess() {
    const state = createState({ lingshi: 5, cultivation: 0 });

    const result = GameCore.trainWithLingshi(state, '1');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.stonesSpent, 1);
    assert.strictEqual(result.gain, 10);
    assert.strictEqual(state.inventory.lingshi, 4);
    assert.strictEqual(state.cultivation, 10);
    assert(state.cultivation <= state.maxCultivation);
}

function testTrainingFailure() {
    const state = createState();
    const before = GameCore.serializeState(state);

    const result = GameCore.trainWithLingshi(state, '1');
    assert.strictEqual(result.ok, false);
    assert(result.error.includes('灵石不足'));
    assert.strictEqual(GameCore.serializeState(state), before);
}

function testFullCultivationRequiresBreakthrough() {
    const state = createState({ lingshi: 20 });
    state.cultivation = state.maxCultivation;

    const preview = GameCore.getTrainingPreview(state, '1');
    assert.strictEqual(GameCore.canBreakthrough(state), true);
    assert.strictEqual(preview.ok, false);
    assert(preview.error.includes('请先尝试突破'));
}

function testResourceExpedition() {
    const state = createState({ lingshi: 3, cultivation: 40 });
    const cultivationBefore = state.cultivation;

    const result = GameCore.resolveExpedition(state, () => 0.5);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.type, 'resource');
    assert.strictEqual(state.cultivation, cultivationBefore);
    assert((state.inventory.lingshi || 0) > 3);
}

function testBattleVictoryRewardsNoCultivation() {
    const state = createState({ realmScore: 6, lingshi: 2, cultivation: 80 });
    const cultivationBefore = state.cultivation;
    const lingshiBefore = state.inventory.lingshi;

    const expedition = GameCore.resolveExpedition(state, () => 0);
    assert.strictEqual(expedition.type, 'battle');

    const result = runCombatToEnd(state, expedition.combatState, () => 0);
    assert.strictEqual(result.finished, true);
    assert.strictEqual(result.victory, true);
    assert.strictEqual(state.cultivation, cultivationBefore);
    assert((state.inventory.lingshi || 0) >= lingshiBefore);
}

function testBattleFailureNoCultivationPenalty() {
    const state = createState({ realmScore: 4, lingshi: 1, cultivation: 60 });
    const cultivationBefore = state.cultivation;

    const expedition = GameCore.resolveExpedition(state, () => 0);
    assert.strictEqual(expedition.type, 'battle');

    state.playerStats.hp = 1;
    state.playerStats.attack = 1;
    state.playerStats.defense = 0;
    expedition.combatState.monster.hp = expedition.combatState.monster.maxHp = 999;
    expedition.combatState.monster.attack = 999;
    expedition.combatState.monster.defense = 999;

    const result = runCombatToEnd(state, expedition.combatState, () => 0);
    assert.strictEqual(result.finished, true);
    assert.strictEqual(result.victory, false);
    assert.strictEqual(state.cultivation, cultivationBefore);
    assert((state.inventory.lingshi || 0) >= 0);
    assert.strictEqual(state.playerStats.hp, Math.max(1, Math.round(state.playerStats.maxHp * 0.2)));
}

function testOfflineSettlementAppliesExpectedGain() {
    const state = createOfflineState({
        realmScore: 11,
        cultivation: 500,
        offlineMs: 2 * 60 * 60 * 1000,
    });

    const result = GameCore.resolveOfflineCultivation(state, FIXED_NOW);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.durationMs, 2 * 60 * 60 * 1000);
    assert.strictEqual(result.effectiveDurationMs, 2 * 60 * 60 * 1000);
    assert.strictEqual(result.wasCapped, false);
    assert.strictEqual(result.gain, 11520);
    assert.strictEqual(state.cultivation, 12020);
    assert.strictEqual(state.offlineTraining.lastGain, 11520);
    assert(state.logs[0].message.includes('闭关归来'));
}

function testOfflineSettlementRespectsCap() {
    const state = createOfflineState({
        realmScore: 14,
        cultivation: 1000,
        offlineMs: 12 * 60 * 60 * 1000,
    });

    const result = GameCore.resolveOfflineCultivation(state, FIXED_NOW);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.durationMs, 12 * 60 * 60 * 1000);
    assert.strictEqual(result.effectiveDurationMs, 8 * 60 * 60 * 1000);
    assert.strictEqual(result.wasCapped, true);
    assert.strictEqual(result.gain, 46080);
    assert.strictEqual(state.cultivation, 47080);
    assert.strictEqual(state.offlineTraining.wasCapped, true);
    assert(state.logs.some((entry) => entry.message.includes('封顶结算')));
}

function testOfflineSettlementRequiresAutoCultivate() {
    const state = createOfflineState({
        realmScore: 11,
        cultivation: 500,
        autoCultivate: false,
        offlineMs: 2 * 60 * 60 * 1000,
    });
    const initialLogCount = state.logs.length;

    const result = GameCore.resolveOfflineCultivation(state, FIXED_NOW);
    assert.strictEqual(result.applied, false);
    assert.strictEqual(result.gain, 0);
    assert.strictEqual(state.cultivation, 500);
    assert.strictEqual(state.logs.length, initialLogCount);
}

function testNaturalRecoveryAppliesTickAndCap() {
    const state = GameCore.createInitialState();
    GameCore.setRealmScore(state, 8);
    state.playerStats.hp = 1;
    state.recovery.lastCheckedAt = FIXED_NOW - (StoryData.CONFIG.naturalRecoveryIntervalMs * 40);

    const capHp = Math.max(1, Math.floor(state.playerStats.maxHp * StoryData.CONFIG.naturalRecoveryCapRatio));
    const result = GameCore.resolveNaturalRecovery(state, FIXED_NOW);

    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.capHp, capHp);
    assert.strictEqual(state.playerStats.hp, capHp);
    assert.strictEqual(result.currentHp, capHp);
    assert.strictEqual(result.lastCheckedAt, FIXED_NOW);
}

testLegacySaveCompatibility();
testTrainingSuccess();
testTrainingFailure();
testFullCultivationRequiresBreakthrough();
testResourceExpedition();
testBattleVictoryRewardsNoCultivation();
testBattleFailureNoCultivationPenalty();
testOfflineSettlementAppliesExpectedGain();
testOfflineSettlementRespectsCap();
testOfflineSettlementRequiresAutoCultivate();
testNaturalRecoveryAppliesTickAndCap();

console.log('offline smoke passed');
