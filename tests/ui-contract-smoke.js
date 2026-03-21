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

function testProfileAndStoryAnchors(indexHtml, gameJs, gameCoreJs, styleCss) {
    assert(/<div class="status-overview">[\s\S]*<div class="status-summary" id="status-summary">/.test(indexHtml), 'status-summary 应位于 status-overview 内部');
    assert(!indexHtml.includes('id="toggle-profile-btn"'), '顶部折叠按钮应已移除');
    assert(!indexHtml.includes('id="status-details"'), '顶部详情容器应已移除');
    assert(!indexHtml.includes('id="breakthrough-rate"'), '突破率不应继续留在顶栏');
    assert(!indexHtml.includes('id="route-display"'), '路数不应继续留在顶栏');
    assert(indexHtml.includes('id="breakthrough-inline"'), '修炼区应存在新的突破率占位');
    assert(indexHtml.includes('id="offline-summary-text"'), '修炼区应存在离线收益摘要占位');
    assert(indexHtml.includes('id="offline-modal"'), '应存在离线收益弹层');
    assert(indexHtml.includes('data-page="alchemy"'), '应存在独立丹炉页');
    assert(indexHtml.includes('data-tab="alchemy"'), '底部导航应存在丹炉页签');
    assert(indexHtml.includes('id="alchemy-summary"'), '丹炉页应存在摘要锚点');
    assert(indexHtml.includes('id="alchemy-rule-text"'), '丹炉页应存在回血规则锚点');
    assert(indexHtml.includes('id="alchemy-list"'), '丹炉页应存在配方列表锚点');
    assert(indexHtml.includes('id="battle-prep-summary"'), '游历页应存在战前丹药摘要锚点');
    assert(indexHtml.includes('id="story-progress"'), '剧情页码容器缺失');
    assert(indexHtml.includes('id="story-pressure"'), '剧情页应存在压力摘要占位');
    assert(indexHtml.includes('id="story-ending-chain"'), '终局页应存在承诺链回指占位');
    assert(!indexHtml.includes('id="story-history"'), '剧情历史列表应已移除');

    assert(!gameJs.includes('is-mobile-compact'), 'game.js 不应再依赖 is-mobile-compact');
    assert(!gameJs.includes('is-collapsed'), 'game.js 不应再依赖 is-collapsed');
    assert(!gameJs.includes('toggleProfileBtn'), 'game.js 不应再绑定顶部折叠按钮');
    assert(gameJs.includes('breakthroughInline'), 'game.js 应更新修炼区突破率文案');
    assert(gameJs.includes('pendingOfflineSettlement'), 'game.js 应维护离线收益结算状态');
    assert(gameJs.includes('renderAlchemyPage'), 'game.js 应渲染丹炉页');
    assert(gameJs.includes('startNaturalRecoveryLoop'), 'game.js 应维护自然回血定时器');
    assert(gameJs.includes('battlePrepSummary'), 'game.js 应渲染战前丹药摘要');
    assert(gameJs.includes('craftRecipe'), 'game.js 应绑定丹炉炼制事件');
    assert(gameJs.includes("window.addEventListener('pagehide', saveGame)"), 'game.js 应在 pagehide 时刷新存档时间戳');
    assert(gameJs.includes("elements.storyProgress.textContent"), 'game.js 应更新剧情页码文案');
    assert(gameJs.includes('storyPressure'), 'game.js 应渲染剧情压力摘要');
    assert(gameJs.includes('storyEndingChain'), 'game.js 应渲染终局承诺链');
    assert(gameJs.includes('risk-'), 'game.js 应渲染风险档位样式标识');
    assert(gameJs.includes('view.chapter.chapterLabel'), 'game.js 应优先使用 chapterLabel 显示插章标题');
    assert(gameJs.includes('result.death ? \'fail\''), 'game.js 应区分死亡结局与普通终局音效');
    assert(gameJs.includes("'下一页'"), '剧情继续按钮应改为下一页');
    assert(gameJs.includes("'跳至抉择'"), '剧情跳过按钮应改为跳至抉择');

    assert(gameCoreJs.includes('profileCollapsed'), 'game-core.js 应继续兼容旧存档的 profileCollapsed 字段');
    assert(gameCoreJs.includes('resolveOfflineCultivation'), 'game-core.js 应提供离线挂机结算接口');
    assert(gameCoreJs.includes('touchSaveTimestamp'), 'game-core.js 应提供存档时间戳刷新接口');
    assert(gameCoreJs.includes('ALCHEMY_RECIPES'), 'game-core.js 应暴露丹方数据入口');
    assert(gameCoreJs.includes('resolveNaturalRecovery'), 'game-core.js 应提供自然回血接口');
    assert(gameCoreJs.includes('craftRecipe'), 'game-core.js 应提供炼丹接口');
    assert(gameCoreJs.includes('storyConsequences'), 'game-core.js 应维护抉择后果累计状态');
    assert(gameCoreJs.includes('recentChoiceOutcome'), 'game-core.js 应维护最近一次抉择结算结果');
    assert(gameCoreJs.includes('decisionHistory'), 'game-core.js 应维护关键承诺历史');
    assert(gameCoreJs.includes('pendingEchoes'), 'game-core.js 应维护延迟回响队列');
    assert(gameCoreJs.includes('endingSeeds'), 'game-core.js 应维护终局种子');
    assert(gameCoreJs.includes('isSupportedSaveData'), 'game-core.js 应显式校验旧版存档');

    assert(!styleCss.includes('@media (min-width: 760px)'), '不应继续保留桌面端专用布局');
    assert(!styleCss.includes('.status-card.is-mobile-compact'), '样式中不应继续保留 is-mobile-compact 分支');
    assert(!styleCss.includes('.status-card.is-collapsed'), '样式中不应继续保留 is-collapsed 分支');
    assert(styleCss.includes('grid-template-columns: repeat(6, minmax(0, 1fr))'), '底部导航应扩展为 6 列');
    assert(styleCss.includes('.alchemy-list'), '样式中应存在丹炉配方列表样式');
}

const indexHtml = readFile('index.html');
const gameJs = readFile('game.js');
const gameCoreJs = readFile('game-core.js');
const styleCss = readFile('style.css');

testViewportContract(indexHtml);
testProfileAndStoryAnchors(indexHtml, gameJs, gameCoreJs, styleCss);

console.log('ui contract smoke passed');
