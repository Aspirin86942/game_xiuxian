const assert = require('assert');
const fs = require('fs');
const path = require('path');

function readFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function testViewportContract(indexHtml) {
    const viewportMatch = indexHtml.match(/<meta name="viewport" content="([^"]+)">/);
    assert(viewportMatch, 'index.html 缺少 viewport 配置');
    const viewportContent = viewportMatch[1];
    assert(viewportContent.includes('maximum-scale=1'), 'viewport 应禁用放大');
    assert(viewportContent.includes('user-scalable=no'), 'viewport 应禁用手势缩放');
}

function testNewMainLoopAnchors(indexHtml, gameJs, gameCoreJs, styleCss) {
    assert(indexHtml.includes('id="summary-lingshi-display"'), '顶栏应展示灵石摘要');
    assert(indexHtml.includes('id="train-cost-text"'), '修炼页应存在闭关成本说明');
    assert(indexHtml.includes('id="train-batch-controls"'), '修炼页应存在批量闭关控件');
    assert(indexHtml.includes('id="location-title"'), '修行页应保留当前地点摘要');
    assert(indexHtml.includes('id="combat-preview"'), '修行页应保留最近一次游历摘要');
    assert(indexHtml.includes('data-train-batch="1"'), '应存在 1 枚闭关按钮');
    assert(indexHtml.includes('data-train-batch="10"'), '应存在 10 枚闭关按钮');
    assert(indexHtml.includes('data-train-batch="max"'), '应存在 max 闭关按钮');
    assert(indexHtml.includes('id="save-mode-note"'), '设置页应存在单机自由存档提示');
    assert(indexHtml.includes('id="location-npcs"'), '剧情页应保留人物入口');
    assert(indexHtml.includes('id="side-story-list"'), '剧情页应保留线索列表');

    assert(!indexHtml.includes('id="auto-panel"'), '自动吐纳面板应已移除');
    assert(!indexHtml.includes('id="auto-toggle-btn"'), '自动吐纳按钮应已移除');
    assert(!indexHtml.includes('id="offline-summary-text"'), '离线收益摘要应已移除');
    assert(!indexHtml.includes('id="offline-modal"'), '离线收益弹层应已移除');
    assert(!indexHtml.includes('data-page="adventure"'), '独立游历页面应已移除');
    assert(!indexHtml.includes('data-tab="adventure"'), '独立游历页签应已移除');
    assert(!indexHtml.includes('id="adventure-btn"'), '独立游历按钮应已移除');

    assert(gameJs.includes('trainWithLingshi'), 'game.js 应调用闭关接口');
    assert(gameJs.includes('resolveExpedition'), 'game.js 应调用游历事件池');
    assert(!gameJs.includes('pendingOfflineSettlement'), 'game.js 不应继续维护离线结算状态');
    assert(!gameJs.includes('resolveOfflineCultivation'), 'game.js 不应继续调用离线收益接口');
    assert(!gameJs.includes('touchSaveTimestamp'), 'game.js 不应继续刷新旧存档时间戳');
    assert(!gameJs.includes('canAutoCultivate'), 'game.js 不应继续读取自动吐纳能力');
    assert(gameJs.includes("nextState.ui.activeTab = 'cultivation'") || gameCoreJs.includes("nextState.ui.activeTab = 'cultivation'"), '旧 adventure 页签应回落到 cultivation');

    assert(gameCoreJs.includes('trainWithLingshi'), 'game-core.js 应暴露闭关接口');
    assert(gameCoreJs.includes('resolveExpedition'), 'game-core.js 应暴露游历事件池');
    assert(!gameCoreJs.includes('resolveOfflineCultivation'), 'game-core.js 不应继续暴露离线收益接口');
    assert(!gameCoreJs.includes('touchSaveTimestamp'), 'game-core.js 不应继续暴露存档时间戳接口');

    assert(styleCss.includes('.training-panel'), '样式应存在闭关面板定义');
    assert(styleCss.includes('.training-batch-btn'), '样式应存在闭关批次按钮定义');
    assert(styleCss.includes('.settings-note'), '样式应存在单机提示定义');
}

const indexHtml = readFile('index.html');
const gameJs = readFile('game.js');
const gameCoreJs = readFile('game-core.js');
const styleCss = readFile('style.css');

testViewportContract(indexHtml);
testNewMainLoopAnchors(indexHtml, gameJs, gameCoreJs, styleCss);

console.log('ui contract smoke passed');
