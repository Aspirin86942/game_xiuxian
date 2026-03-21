const assert = require('assert');
const GameCore = require('../game-core.js');
const { createInvalidSaveFixtures } = require('./e2e/helpers/saveFactory');

function ensureStateInvariants(state, label) {
    GameCore.ensureStoryCursor(state);
    const view = GameCore.getStoryView(state);

    assert(Number.isFinite(state.cultivation), `${label}: cultivation 应为数值`);
    assert(state.cultivation >= 0, `${label}: cultivation 不应为负数`);
    assert(state.cultivation <= state.maxCultivation, `${label}: cultivation 不应超过 maxCultivation`);
    assert(state.playerStats.hp >= 1, `${label}: hp 不应低于 1`);
    assert(state.playerStats.hp <= state.playerStats.maxHp, `${label}: hp 不应超过 maxHp`);
    assert(Object.values(state.inventory).every((value) => Number.isFinite(value) && value >= 0), `${label}: inventory 不应出现负数`);
    assert(['cultivation', 'alchemy', 'story'].includes(state.ui.activeTab), `${label}: activeTab 必须落在合法页面`);

    if (view && view.mode !== 'ending') {
        assert.strictEqual(String(state.storyCursor.chapterId), String(view.chapter.id), `${label}: storyCursor.chapterId 应与当前视图章节一致`);
        assert(state.storyCursor.beatIndex >= 0, `${label}: storyCursor.beatIndex 不应为负数`);
    }
}

function assertRoundTripStable(rawState, label) {
    const merged = GameCore.mergeSave(rawState);
    GameCore.ensureStoryCursor(merged);
    const once = GameCore.serializeState(merged);
    const mergedAgain = GameCore.mergeSave(JSON.parse(once));
    GameCore.ensureStoryCursor(mergedAgain);
    const twice = GameCore.serializeState(mergedAgain);
    assert.strictEqual(twice, once, `${label}: serialize -> merge -> serialize 应保持稳定`);
}

function testEmptySaveFallsBackToFreshState() {
    const state = GameCore.mergeSave(null);
    assert.strictEqual(state.version, GameCore.SAVE_VERSION);
    ensureStateInvariants(state, 'empty save');
    assertRoundTripStable(null, 'empty save');
}

function testMissingFieldsSaveStaysRecoverable() {
    const fixtures = createInvalidSaveFixtures();
    const state = GameCore.mergeSave(JSON.parse(fixtures.missingFields));
    ensureStateInvariants(state, 'missing fields');
    assert.strictEqual(state.playerName, '异常样本');
    assert.deepStrictEqual(state.inventory, {});
    assertRoundTripStable(JSON.parse(fixtures.missingFields), 'missing fields');
}

function testTypeErrorsAndSemanticInvalidDataAreSanitized() {
    const fixtures = createInvalidSaveFixtures();
    const typeErrorState = GameCore.mergeSave(JSON.parse(fixtures.typeErrors));
    ensureStateInvariants(typeErrorState, 'type errors');
    assert.strictEqual(typeErrorState.cultivation, 0);
    assert.strictEqual(typeErrorState.realmIndex, 4);
    assert.strictEqual(typeErrorState.stageIndex, 2);
    assert.deepStrictEqual(typeErrorState.inventory, {});

    const semanticState = GameCore.mergeSave(JSON.parse(fixtures.semanticInvalid));
    ensureStateInvariants(semanticState, 'semantic invalid');
    assert.strictEqual(semanticState.cultivation, 0);
    assert.strictEqual(semanticState.inventory.lingshi, undefined);
    assert.strictEqual(semanticState.inventory.juqidan, 2);
    assertRoundTripStable(JSON.parse(fixtures.semanticInvalid), 'semantic invalid');
}

function testNumericExtremesAreClampedIntoLegalRanges() {
    const fixtures = createInvalidSaveFixtures();
    const state = GameCore.mergeSave(JSON.parse(fixtures.numericExtremes));
    ensureStateInvariants(state, 'numeric extremes');
    assert.strictEqual(state.realmIndex, 4);
    assert.strictEqual(state.stageIndex, 2);
    assert.strictEqual(state.cultivation, state.maxCultivation);
    assert(state.inventory.lingshi > 0);
    assertRoundTripStable(JSON.parse(fixtures.numericExtremes), 'numeric extremes');
}

function testSupportedAndUnsupportedVersions() {
    assert.strictEqual(GameCore.isSupportedSaveData({ version: GameCore.MIN_SUPPORTED_SAVE_VERSION }), true);
    assert.strictEqual(GameCore.isSupportedSaveData({ version: GameCore.SAVE_VERSION }), true);
    assert.strictEqual(GameCore.isSupportedSaveData({ version: GameCore.MIN_SUPPORTED_SAVE_VERSION - 1 }), false);
    assert.strictEqual(GameCore.isSupportedSaveData({ version: GameCore.SAVE_VERSION + 1 }), false);
}

testEmptySaveFallsBackToFreshState();
testMissingFieldsSaveStaysRecoverable();
testTypeErrorsAndSemanticInvalidDataAreSanitized();
testNumericExtremesAreClampedIntoLegalRanges();
testSupportedAndUnsupportedVersions();

console.log('save resilience smoke passed');
