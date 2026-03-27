const assert = require('assert');
const fs = require('fs');
const path = require('path');
const GameCore = require('../game-core.js');

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

function testScriptOrder(indexHtml) {
    const scriptSources = [...indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
    const expectedOrder = [
        'story-data.js',
        'src/shared/helpers.js',
        'src/core/state.js',
        'src/core/inventory.js',
        'src/core/story.js',
        'src/core/world.js',
        'src/core/progression.js',
        'game-core.js',
        'src/ui/dom-cache.js',
        'src/ui/audio.js',
        'src/ui/persistence.js',
        'src/ui/loops.js',
        'src/ui/renderers.js',
        'src/ui/actions.js',
        'game.js',
    ];
    assert.deepStrictEqual(scriptSources.slice(-expectedOrder.length), expectedOrder, '内部脚本加载顺序必须保持 façade 装配约束');
    expectedOrder.slice(1, -2).forEach((filePath) => {
        assert(fileExists(filePath), `${filePath} 应存在`);
    });
}

function testAnchorsAndStyles(indexHtml, styleCss) {
    assert(/<div class="status-overview">[\s\S]*<div class="status-summary" id="status-summary">/.test(indexHtml), 'status-summary 应位于 status-overview 内部');
    [
        'summary-lingshi-display',
        'breakthrough-inline',
        'adventure-btn',
        'train-cost-text',
        'train-batch-controls',
        'location-title',
        'combat-preview',
        'save-mode-note',
        'location-npcs',
        'side-story-list',
        'alchemy-summary',
        'alchemy-rule-text',
        'alchemy-list',
        'story-progress',
        'story-pressure',
        'story-ending-chain',
    ].forEach((anchorId) => {
        assert(indexHtml.includes(`id="${anchorId}"`), `${anchorId} 锚点缺失`);
    });
    assert(indexHtml.includes('data-page="alchemy"'), '应存在独立丹炉页');
    assert(indexHtml.includes('data-tab="alchemy"'), '底部导航应存在丹炉页签');
    assert(!indexHtml.includes('data-page="adventure"'), '独立游历页面应已移除');
    assert(!indexHtml.includes('data-tab="adventure"'), '独立游历页签应已移除');

    [
        '.training-panel',
        '.primary-actions',
        '.secondary-main-button',
        '.training-batch-btn',
        '.settings-note',
        '.alchemy-list',
    ].forEach((token) => {
        assert(styleCss.includes(token), `${token} 样式定义缺失`);
    });
    assert(styleCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'), '底部导航应扩展为 5 列');
}

function testGameCoreFacade() {
    const requiredFunctions = [
        'createInitialState',
        'mergeSave',
        'recalculateState',
        'getAlchemyRecipes',
        'getEchoes',
        'getLocationMeta',
        'getVisibleSideQuests',
        'getNpcDialogue',
        'getStoryView',
        'advanceStoryBeat',
        'skipStoryPlayback',
        'chooseStoryOption',
        'trainWithLingshi',
        'resolveExpedition',
        'attemptBreakthrough',
        'resolveOfflineCultivation',
        'resolveNaturalRecovery',
        'craftRecipe',
        'performItemAction',
        'resolveCombatRound',
        'serializeState',
        'isSupportedSaveData',
    ];
    requiredFunctions.forEach((name) => {
        assert.strictEqual(typeof GameCore[name], 'function', `GameCore.${name} 应继续作为 façade 方法暴露`);
    });
    assert.strictEqual(GameCore.SAVE_VERSION, 7, 'SAVE_VERSION 应更新到第二卷断档版本');
    assert.strictEqual(GameCore.MIN_SUPPORTED_SAVE_VERSION, 7, 'MIN_SUPPORTED_SAVE_VERSION 应与当前版本同步抬高');

    const state = GameCore.createInitialState();
    assert.strictEqual(state.ui.activeTab, 'cultivation');
    assert.strictEqual(typeof GameCore.getPressureStatusText(state), 'string');
    assert.strictEqual(Array.isArray(GameCore.SIDE_QUESTS_V1), true);
}

const indexHtml = readFile('index.html');
const styleCss = readFile('style.css');
const serveStaticJs = readFile('tests/serve-static.js');

testViewportContract(indexHtml);
testHeadAssets(indexHtml, serveStaticJs);
testScriptOrder(indexHtml);
testAnchorsAndStyles(indexHtml, styleCss);
testGameCoreFacade();

console.log('ui contract smoke passed');
