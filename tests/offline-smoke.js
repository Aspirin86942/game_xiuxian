const assert = require('assert');
const GameCore = require('../game-core.js');
const StoryData = require('../story-data.js');

const FIXED_NOW = 1_710_000_000_000;

function createOfflineState({ realmScore, cultivation = 0, autoCultivate = true, offlineMs }) {
    const state = GameCore.createInitialState();
    GameCore.setRealmScore(state, realmScore);
    state.cultivation = cultivation;
    state.autoCultivate = autoCultivate;
    GameCore.touchSaveTimestamp(state, FIXED_NOW - offlineMs);
    return state;
}

function testLegacySaveCompatibility() {
    const merged = GameCore.mergeSave({
        version: 5,
        autoCultivate: true,
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
testOfflineSettlementAppliesExpectedGain();
testOfflineSettlementRespectsCap();
testOfflineSettlementRequiresAutoCultivate();
testNaturalRecoveryAppliesTickAndCap();

console.log('offline smoke passed');
