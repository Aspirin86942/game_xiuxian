const assert = require('assert');
const GameCore = require('../game-core.js');

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
        autoCultivate: true,
    });

    assert.strictEqual(merged.version, 4);
    assert.strictEqual(merged.offlineTraining.lastSavedAt, null);
    assert.strictEqual(merged.offlineTraining.lastGain, 0);
    assert.strictEqual(merged.offlineTraining.wasCapped, false);
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

testLegacySaveCompatibility();
testOfflineSettlementAppliesExpectedGain();
testOfflineSettlementRespectsCap();
testOfflineSettlementRequiresAutoCultivate();

console.log('offline smoke passed');
