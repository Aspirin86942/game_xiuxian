const assert = require('assert');
const GameCore = require('../game-core.js');

function cloneState(state) {
    return JSON.parse(GameCore.serializeState(state));
}

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

function runCombatToEnd(state, combatState, rng) {
    let result = null;
    while (!result || !result.finished) {
        result = GameCore.resolveCombatRound(state, combatState, rng);
    }
    return result;
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
}

function testSaveVersionContract() {
    const legacy = {
        version: 5,
        playerName: '旧档',
    };
    assert.strictEqual(GameCore.isSupportedSaveData(legacy), false);

    const state = createState({ realmScore: 3, lingshi: 12, cultivation: 70 });
    const serialized = GameCore.serializeState(state);
    const restored = GameCore.mergeSave(JSON.parse(serialized));
    const mappedTabState = GameCore.mergeSave({
        version: 6,
        ui: {
            activeTab: 'adventure',
        },
    });

    assert.strictEqual(restored.version, 6);
    assert.strictEqual(restored.inventory.lingshi, state.inventory.lingshi);
    assert.strictEqual(restored.cultivation, state.cultivation);
    assert.strictEqual(restored.realmIndex, state.realmIndex);
    assert.strictEqual(restored.stageIndex, state.stageIndex);
    assert.strictEqual(mappedTabState.ui.activeTab, 'cultivation');
}

testTrainingSuccess();
testTrainingFailure();
testFullCultivationRequiresBreakthrough();
testResourceExpedition();
testBattleVictoryRewardsNoCultivation();
testBattleFailureNoCultivationPenalty();
testSaveVersionContract();

console.log('main loop smoke passed');
