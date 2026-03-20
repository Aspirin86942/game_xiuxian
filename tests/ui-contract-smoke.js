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
    assert(indexHtml.includes('id="story-progress"'), '剧情页码容器缺失');
    assert(!indexHtml.includes('id="story-history"'), '剧情历史列表应已移除');

    assert(!gameJs.includes('is-mobile-compact'), 'game.js 不应再依赖 is-mobile-compact');
    assert(!gameJs.includes('is-collapsed'), 'game.js 不应再依赖 is-collapsed');
    assert(!gameJs.includes('toggleProfileBtn'), 'game.js 不应再绑定顶部折叠按钮');
    assert(gameJs.includes('breakthroughInline'), 'game.js 应更新修炼区突破率文案');
    assert(gameJs.includes("elements.storyProgress.textContent"), 'game.js 应更新剧情页码文案');
    assert(gameJs.includes("'下一页'"), '剧情继续按钮应改为下一页');
    assert(gameJs.includes("'跳至抉择'"), '剧情跳过按钮应改为跳至抉择');

    assert(gameCoreJs.includes('profileCollapsed'), 'game-core.js 应继续兼容旧存档的 profileCollapsed 字段');

    assert(!styleCss.includes('@media (min-width: 760px)'), '不应继续保留桌面端专用布局');
    assert(!styleCss.includes('.status-card.is-mobile-compact'), '样式中不应继续保留 is-mobile-compact 分支');
    assert(!styleCss.includes('.status-card.is-collapsed'), '样式中不应继续保留 is-collapsed 分支');
}

const indexHtml = readFile('index.html');
const gameJs = readFile('game.js');
const gameCoreJs = readFile('game-core.js');
const styleCss = readFile('style.css');

testViewportContract(indexHtml);
testProfileAndStoryAnchors(indexHtml, gameJs, gameCoreJs, styleCss);

console.log('ui contract smoke passed');
