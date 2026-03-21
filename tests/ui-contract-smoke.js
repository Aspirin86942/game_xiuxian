const assert = require('assert');
const fs = require('fs');
const path = require('path');

function readFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function fileExists(relativePath) {
    return fs.existsSync(path.join(__dirname, '..', relativePath));
}

function testViewportContract(indexHtml) {
    const viewportMatch = indexHtml.match(/<meta name="viewport" content="([^"]+)">/);
    assert(viewportMatch, 'index.html 缺少 viewport 配置');
    const viewportContent = viewportMatch[1];
    assert(viewportContent.includes('maximum-scale=1'), 'viewport 应禁用放大');
    assert(viewportContent.includes('user-scalable=no'), 'viewport 应禁用手势缩放');
}

function testHeadAssets(indexHtml, serveStaticJs) {
    assert(indexHtml.includes('<meta name="theme-color" content="#335f53">'), 'head 中应声明 theme-color');
    assert(indexHtml.includes('<link rel="icon" type="image/x-icon" href="/favicon.ico">'), 'head 中应显式声明 favicon');
    assert(indexHtml.includes('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">'), 'head 中应显式声明 apple touch icon');
    assert(indexHtml.includes('<link rel="manifest" href="/site.webmanifest">'), 'head 中应显式声明 manifest');

    ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest'].forEach((fileName) => {
        assert(fileExists(fileName), `${fileName} 应存在于仓库根目录`);
    });

    const manifest = JSON.parse(readFile('site.webmanifest'));
    assert.strictEqual(manifest.name, '灵光修仙传', 'manifest.name 应匹配站点名');
    assert.strictEqual(manifest.short_name, '灵光修仙传', 'manifest.short_name 应匹配站点名');
    assert.strictEqual(manifest.start_url, '/', 'manifest.start_url 应指向根路径');
    assert.strictEqual(manifest.scope, '/', 'manifest.scope 应指向根路径');
    assert.strictEqual(manifest.display, 'browser', '本次不应把站点升级成独立安装模式');
    assert.strictEqual(manifest.theme_color, '#335f53', 'manifest.theme_color 应匹配既定 jade 色');
    assert.strictEqual(manifest.background_color, '#efe7d6', 'manifest.background_color 应匹配既定纸面底色');
    assert.deepStrictEqual(manifest.icons, [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ], 'manifest icons 应只声明根目录 192 / 512 PNG');

    assert(serveStaticJs.includes("'.ico': 'image/x-icon'"), '静态服务应返回 ico MIME');
    assert(serveStaticJs.includes("'.png': 'image/png'"), '静态服务应返回 png MIME');
    assert(serveStaticJs.includes("'.webmanifest': 'application/manifest+json; charset=utf-8'"), '静态服务应返回 webmanifest MIME');
}

function testMergedAnchors(indexHtml, gameJs, gameCoreJs, styleCss) {
    assert(/<div class="status-overview">[\s\S]*<div class="status-summary" id="status-summary">/.test(indexHtml), 'status-summary 应位于 status-overview 内部');
    assert(indexHtml.includes('id="summary-lingshi-display"'), '顶栏应展示灵石摘要');
    assert(indexHtml.includes('id="breakthrough-inline"'), '修炼区应存在新的突破率占位');
    assert(indexHtml.includes('id="adventure-btn"'), '修炼区应存在独立游历按钮');
    assert(indexHtml.includes('class="primary-actions"'), '修炼区应存在双按钮布局容器');
    assert(indexHtml.includes('id="train-cost-text"'), '修炼页应存在闭关成本说明');
    assert(indexHtml.includes('id="train-batch-controls"'), '修炼页应存在批量闭关控件');
    assert(indexHtml.includes('id="location-title"'), '修行页应保留当前地点摘要');
    assert(indexHtml.includes('id="combat-preview"'), '修行页应保留最近一次游历摘要');
    assert(indexHtml.includes('id="save-mode-note"'), '设置页应存在单机自由存档提示');
    assert(indexHtml.includes('id="location-npcs"'), '剧情页应保留人物入口');
    assert(indexHtml.includes('id="side-story-list"'), '剧情页应保留线索列表');
    assert(indexHtml.includes('data-page="alchemy"'), '应存在独立丹炉页');
    assert(indexHtml.includes('data-tab="alchemy"'), '底部导航应存在丹炉页签');
    assert(indexHtml.includes('id="alchemy-summary"'), '丹炉页应存在摘要锚点');
    assert(indexHtml.includes('id="alchemy-rule-text"'), '丹炉页应存在回血规则锚点');
    assert(indexHtml.includes('id="alchemy-list"'), '丹炉页应存在配方列表锚点');
    assert(indexHtml.includes('id="story-progress"'), '剧情页码容器缺失');
    assert(indexHtml.includes('id="story-pressure"'), '剧情页应存在压力摘要占位');
    assert(indexHtml.includes('id="story-ending-chain"'), '终局页应存在承诺链回指占位');
    assert(!indexHtml.includes('id="auto-toggle-btn"'), '自动吐纳按钮应已移除');
    assert(!indexHtml.includes('id="offline-summary-text"'), '离线收益摘要应已移除');
    assert(!indexHtml.includes('id="offline-modal"'), '离线收益弹层应已移除');
    assert(!indexHtml.includes('data-page="adventure"'), '独立游历页面应已移除');
    assert(!indexHtml.includes('data-tab="adventure"'), '独立游历页签应已移除');
    assert(!indexHtml.includes('id="battle-prep-summary"'), '旧战备摘要锚点应已移除');

    assert(gameJs.includes('trainWithLingshi'), 'game.js 应调用闭关接口');
    assert(gameJs.includes('resolveExpedition'), 'game.js 应调用游历事件池');
    assert(gameJs.includes('syncUnreadStoryState'), 'game.js 应统一维护剧情未读状态');
    assert(gameJs.includes('elements.mainBtn.disabled'), 'game.js 应维护闭关按钮禁用态');
    assert(gameJs.includes('elements.adventureBtn.disabled'), 'game.js 应维护游历按钮禁用态');
    assert(gameJs.includes('breakthroughInline'), 'game.js 应更新修炼区突破率文案');
    assert(gameJs.includes('renderAlchemyPage'), 'game.js 应渲染丹炉页');
    assert(gameJs.includes('startNaturalRecoveryLoop'), 'game.js 应维护自然回血定时器');
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
    assert(!gameJs.includes('pendingOfflineSettlement'), 'game.js 不应继续维护旧离线结算状态');
    assert(!gameJs.includes('battlePrepSummary'), 'game.js 不应继续依赖旧战备摘要锚点');
    assert(!gameJs.includes('canAutoCultivate'), 'game.js 不应继续读取自动吐纳能力');

    assert(gameCoreJs.includes('profileCollapsed'), 'game-core.js 应继续兼容旧存档的 profileCollapsed 字段');
    assert(gameCoreJs.includes('trainWithLingshi'), 'game-core.js 应暴露闭关接口');
    assert(gameCoreJs.includes('resolveExpedition'), 'game-core.js 应暴露游历事件池');
    assert(gameCoreJs.includes('ALCHEMY_RECIPES'), 'game-core.js 应暴露丹方数据入口');
    assert(gameCoreJs.includes('resolveNaturalRecovery'), 'game-core.js 应提供自然回血接口');
    assert(gameCoreJs.includes('craftRecipe'), 'game-core.js 应提供炼丹接口');
    assert(gameCoreJs.includes('resolveOfflineCultivation'), 'game-core.js 应继续保留离线吐纳结算接口');
    assert(gameCoreJs.includes('touchSaveTimestamp'), 'game-core.js 应继续保留离线时间戳接口');
    assert(gameCoreJs.includes('MIN_SUPPORTED_SAVE_VERSION'), 'game-core.js 应声明最小可支持存档版本');
    assert(gameCoreJs.includes('storyConsequences'), 'game-core.js 应维护抉择后果累计状态');
    assert(gameCoreJs.includes('recentChoiceOutcome'), 'game-core.js 应维护最近一次抉择结算结果');
    assert(gameCoreJs.includes('decisionHistory'), 'game-core.js 应维护关键承诺历史');
    assert(gameCoreJs.includes('pendingEchoes'), 'game-core.js 应维护延迟回响队列');
    assert(gameCoreJs.includes('endingSeeds'), 'game-core.js 应维护终局种子');
    assert(gameCoreJs.includes('isSupportedSaveData'), 'game-core.js 应显式校验旧版存档');

    assert(styleCss.includes('.training-panel'), '样式应存在闭关面板定义');
    assert(styleCss.includes('.primary-actions'), '样式应存在双按钮布局定义');
    assert(styleCss.includes('.secondary-main-button'), '样式应存在独立游历按钮定义');
    assert(styleCss.includes('.training-batch-btn'), '样式应存在闭关批次按钮定义');
    assert(styleCss.includes('.settings-note'), '样式应存在单机提示定义');
    assert(styleCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'), '底部导航应扩展为 5 列');
    assert(styleCss.includes('.alchemy-list'), '样式中应存在丹炉配方列表样式');
}

const indexHtml = readFile('index.html');
const gameJs = readFile('game.js');
const gameCoreJs = readFile('game-core.js');
const styleCss = readFile('style.css');
const serveStaticJs = readFile('tests/serve-static.js');

testViewportContract(indexHtml);
testHeadAssets(indexHtml, serveStaticJs);
testMergedAnchors(indexHtml, gameJs, gameCoreJs, styleCss);

console.log('ui contract smoke passed');
