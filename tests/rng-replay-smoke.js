const assert = require('assert');
const GameCore = require('../game-core.js');

function createReplayState() {
    const state = GameCore.createInitialState();
    GameCore.setRealmScore(state, 6);
    state.currentLocation = '黄枫谷';
    state.cultivation = 80;
    state.inventory.lingshi = 0;
    state.inventory.juqidan = 1;
    GameCore.recalculateState(state, true);
    return state;
}

function runResourceReplay() {
    const state = createReplayState();
    const result = GameCore.resolveExpedition(state, () => 0.5);
    return {
        result,
        serialized: GameCore.serializeState(state),
    };
}

function runBattleReplay(sequence) {
    const state = createReplayState();
    const queue = [...sequence];
    const rng = () => (queue.length > 0 ? queue.shift() : 0);
    const expedition = GameCore.resolveExpedition(state, rng);
    assert.strictEqual(expedition.type, 'battle', '固定序列应命中战斗分支');

    let roundResult = null;
    while (!roundResult || !roundResult.finished) {
        roundResult = GameCore.resolveCombatRound(state, expedition.combatState, rng);
    }

    return {
        roundResult,
        serialized: GameCore.serializeState(state),
        latestLog: state.logs[0]?.message || '',
    };
}

function testResourceReplayIsDeterministic() {
    const first = runResourceReplay();
    const second = runResourceReplay();
    assert.strictEqual(first.result.type, 'resource');
    assert.strictEqual(first.serialized, second.serialized, '相同资源随机输入应得到完全一致的状态');
    assert.strictEqual(first.result.summary, second.result.summary, '相同资源随机输入应得到一致摘要');
}

function testBattleReplayIsDeterministic() {
    const sequence = [
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
    ];
    const first = runBattleReplay(sequence);
    const second = runBattleReplay(sequence);
    assert.strictEqual(first.roundResult.finished, true);
    assert.strictEqual(first.serialized, second.serialized, '相同战斗随机序列应得到完全一致的状态');
    assert.strictEqual(first.latestLog, second.latestLog, '相同战斗随机序列应得到一致日志摘要');
}

testResourceReplayIsDeterministic();
testBattleReplayIsDeterministic();

console.log('rng replay smoke passed');
