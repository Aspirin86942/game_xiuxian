(function () {
    const STORAGE_KEY = StoryData.STORAGE_KEY;
    const { ITEMS, LOCATIONS } = StoryData;

    let gameState = GameCore.createInitialState();
    let combatState = null;
    let autoCultivateTimer = null;
    let naturalRecoveryTimer = null;
    let combatTimer = null;
    let audioContext = null;
    let pendingOfflineSettlement = null;

    const elements = {};

    function getOfflineCapHours() {
        const capMs = Number.isFinite(StoryData.CONFIG.offlineCultivateMaxDurationMs)
            ? StoryData.CONFIG.offlineCultivateMaxDurationMs
            : 8 * 60 * 60 * 1000;
        return Math.max(1, Math.floor(capMs / (60 * 60 * 1000)));
    }

    function formatOfflineDuration(durationMs) {
        const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours} 小时 ${minutes} 分`;
    }

    function getOfflineRuleText(autoUnlocked) {
        const capHours = getOfflineCapHours();
        return autoUnlocked
            ? `离线收益仅在开启自动吐纳后生效，最多累计 ${capHours} 小时。`
            : `筑基期后解锁自动吐纳与离线收益，最多累计 ${capHours} 小时。`;
    }

    function getOfflineSummaryText(autoUnlocked) {
        const trainingState = gameState.offlineTraining || {};
        if (!trainingState.lastGain || trainingState.lastGain <= 0) {
            return getOfflineRuleText(autoUnlocked);
        }

        const cappedText = trainingState.wasCapped ? `，已按 ${getOfflineCapHours()} 小时封顶` : '';
        return `上次离线吐纳 ${formatOfflineDuration(trainingState.lastEffectiveDurationMs)}，修为 +${trainingState.lastGain}${cappedText}`;
    }

    function getNaturalRecoveryRuleText() {
        const intervalSeconds = Math.max(1, Math.floor(StoryData.CONFIG.naturalRecoveryIntervalMs / 1000));
        const recoveryPercent = Math.round(StoryData.CONFIG.naturalRecoveryRatio * 100);
        const capPercent = Math.round(StoryData.CONFIG.naturalRecoveryCapRatio * 100);
        return `非战斗时每 ${intervalSeconds} 秒回复 ${recoveryPercent}% 最大气血，最多恢复到 ${capPercent}% 气血。`;
    }

    function getNaturalRecoveryCapHp() {
        return Math.max(1, Math.floor(gameState.playerStats.maxHp * StoryData.CONFIG.naturalRecoveryCapRatio));
    }

    function getBattlePrepSummaryText() {
        const breakthroughBonusText = gameState.breakthroughBonus > 0
            ? `当前药力护持 +${Math.round(gameState.breakthroughBonus * 100)}%`
            : '当前无临时突破药力';
        return `解毒散 x${gameState.inventory.jiedusan || 0} · 筑基丹 x${gameState.inventory.zhujidan || 0} · 化神丹 x${gameState.inventory.huashendan || 0} · ${breakthroughBonusText}`;
    }

    function markRecoveryCheckpoint(nowMs) {
        const safeNowMs = typeof nowMs === 'number' ? nowMs : Date.now();
        gameState.recovery = gameState.recovery || { lastCheckedAt: null };
        gameState.recovery.lastCheckedAt = safeNowMs;
    }

    function primeNaturalRecoveryState(nowMs) {
        if (combatState) {
            return;
        }
        GameCore.resolveNaturalRecovery(gameState, nowMs);
    }

    function dismissOfflineSettlement() {
        pendingOfflineSettlement = null;
        hideModal(elements.offlineModal);
    }

    function cacheElements() {
        [
            'player-name',
            'summary-realm-display',
            'summary-cultivation-display',
            'breakthrough-inline',
            'main-btn',
            'hint-text',
            'auto-panel',
            'auto-status-text',
            'auto-toggle-btn',
            'auto-toggle-text',
            'offline-summary-text',
            'floating-container',
            'toggle-log-btn',
            'log-container',
            'story-title',
            'story-meta',
            'story-summary',
            'story-progress',
            'story-speaker',
            'story-line',
            'story-continue-btn',
            'story-skip-btn',
            'story-choices',
            'story-goal',
            'story-pressure',
            'story-ending-chain',
            'route-summary',
            'echo-list',
            'alchemy-summary',
            'alchemy-rule-text',
            'alchemy-list',
            'location-title',
            'location-desc',
            'location-npcs',
            'side-story-list',
            'adventure-btn',
            'combat-preview',
            'battle-prep-summary',
            'story-badge',
            'inventory-modal',
            'inventory-list',
            'close-inventory',
            'settings-modal',
            'close-settings',
            'audio-toggle',
            'music-toggle',
            'export-btn',
            'import-btn',
            'reset-btn',
            'offline-modal',
            'offline-duration-text',
            'offline-gain-text',
            'offline-current-text',
            'close-offline-modal',
            'dialogue-modal',
            'dialogue-name',
            'dialogue-avatar',
            'dialogue-text',
            'close-dialogue',
            'combat-modal',
            'combat-title',
            'player-hp-fill',
            'player-hp-text',
            'monster-name',
            'monster-hp-fill',
            'monster-hp-text',
            'combat-log',
            'confirm-modal',
            'cancel-reset',
            'confirm-reset',
            'log-drawer-card',
        ].forEach((id) => {
            const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            elements[key] = document.getElementById(id);
        });

        elements.pages = Array.from(document.querySelectorAll('.page'));
        elements.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    }

    function initAudio() {
        if (audioContext || !gameState.settings.audioEnabled) {
            return;
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            return;
        }
        audioContext = new Ctx();
    }

    function playTone(frequency, duration) {
        if (!gameState.settings.audioEnabled) {
            return;
        }
        initAudio();
        if (!audioContext) {
            return;
        }
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.03;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    function playSound(kind) {
        const toneMap = {
            click: [392, 0.08],
            breakthrough: [587, 0.18],
            fail: [220, 0.16],
            story: [440, 0.1],
            victory: [660, 0.22],
        };
        const tone = toneMap[kind];
        if (tone) {
            playTone(tone[0], tone[1]);
        }
    }

    function saveGame() {
        GameCore.touchSaveTimestamp(gameState, Date.now());
        localStorage.setItem(STORAGE_KEY, GameCore.serializeState(gameState));
    }

    function bootstrapFreshState() {
        gameState = GameCore.createInitialState();
        GameCore.ensureStoryCursor(gameState);
        pendingOfflineSettlement = null;
    }

    function getUnsupportedSaveMessage(rawState) {
        const versionText = Number.isFinite(rawState?.version) ? `v${rawState.version}` : '未知版本';
        return `检测到旧版存档（${versionText}），当前叙事决策系统已升级到 v${GameCore.SAVE_VERSION}。`;
    }

    function restoreGameState(parsedState, shouldResolveOffline) {
        gameState = GameCore.mergeSave(parsedState);
        GameCore.ensureStoryCursor(gameState);
        pendingOfflineSettlement = null;

        if (!shouldResolveOffline) {
            primeNaturalRecoveryState(Date.now());
            return;
        }

        try {
            const settlement = GameCore.resolveOfflineCultivation(gameState, Date.now());
            pendingOfflineSettlement = settlement.applied ? settlement : null;
        } catch (error) {
            console.error('离线挂机结算失败', error);
            pendingOfflineSettlement = null;
        }
        primeNaturalRecoveryState(Date.now());
    }

    function loadGame() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            bootstrapFreshState();
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!GameCore.isSupportedSaveData(parsed)) {
                console.warn('检测到旧版存档，已自动重置');
                window.alert(`${getUnsupportedSaveMessage(parsed)}该存档不会继续加载，已为你重置为新档。`);
                localStorage.removeItem(STORAGE_KEY);
                bootstrapFreshState();
                saveGame();
                return;
            }
            restoreGameState(parsed, true);
        } catch (error) {
            console.error('存档读取失败', error);
            bootstrapFreshState();
        }
    }

    function resetGame() {
        stopAutoCultivate();
        stopCombatLoop();
        localStorage.removeItem(STORAGE_KEY);
        bootstrapFreshState();
        hideModal(elements.confirmModal);
        hideModal(elements.settingsModal);
        hideModal(elements.offlineModal);
        render();
        saveGame();
    }

    function showModal(modalElement) {
        modalElement.classList.add('show');
    }

    function hideModal(modalElement) {
        modalElement.classList.remove('show');
    }

    function setActiveTab(tabName) {
        if (tabName === 'alchemy' && combatState) {
            window.alert('战斗中不可分心炼丹。');
            return false;
        }
        gameState.ui.activeTab = tabName;
        if (tabName === 'story') {
            gameState.unreadStory = false;
        }
        render();
        saveGame();
        return true;
    }

    function renderStatus() {
        const realmLabel = GameCore.getRealmLabel(gameState);
        const summaryCultivationText = `${gameState.cultivation}/${gameState.maxCultivation}`;
        elements.playerName.textContent = gameState.playerName;
        elements.summaryRealmDisplay.textContent = realmLabel;
        elements.summaryCultivationDisplay.textContent = summaryCultivationText;

        const passiveBonuses = GameCore.getInventoryPassiveBonuses(gameState);
        const actualRate = GameCore.getBreakthroughActualRate(gameState);
        const bonusParts = [];
        if (gameState.breakthroughBonus > 0) {
            bonusParts.push(`临时 +${Math.round(gameState.breakthroughBonus * 100)}%`);
        }
        if ((passiveBonuses.breakthroughBonus || 0) > 0) {
            bonusParts.push(`持有 +${Math.round(passiveBonuses.breakthroughBonus * 100)}%`);
        }
        const bonusText = bonusParts.length > 0 ? ` · ${bonusParts.join(' · ')}` : '';
        elements.breakthroughInline.textContent = `当前突破率：${Math.round(actualRate * 100)}%${bonusText}`;
    }

    function renderTabs() {
        elements.pages.forEach((page) => {
            page.classList.toggle('active', page.dataset.page === gameState.ui.activeTab);
        });
        elements.navButtons.forEach((button) => {
            const isPageButton = button.dataset.tab;
            if (isPageButton) {
                button.classList.toggle('active', button.dataset.tab === gameState.ui.activeTab);
            }
        });
        elements.storyBadge.classList.toggle('show', gameState.unreadStory);
    }

    function renderCultivationPage() {
        const canBreakthrough = GameCore.canBreakthrough(gameState);
        const storyView = GameCore.getStoryView(gameState);
        elements.mainBtn.textContent = canBreakthrough ? '渡劫突破' : '吐纳聚气';
        elements.mainBtn.classList.toggle('breakthrough', canBreakthrough);
        if (storyView && storyView.source === 'level' && storyView.mode !== 'ending') {
            elements.hintText.textContent = `当前有小境界事件：${storyView.chapter.title}`;
        } else {
            elements.hintText.textContent = canBreakthrough
                ? '修为已满，心神沉静后即可尝试突破。'
                : `继续吐纳，还需 ${Math.max(0, gameState.maxCultivation - gameState.cultivation)} 点修为。`;
        }

        const autoUnlocked = GameCore.canAutoCultivate(gameState);
        elements.autoPanel.style.display = 'grid';
        elements.autoStatusText.textContent = autoUnlocked
            ? '离线期间会按自动吐纳速度继续积累修为。'
            : '筑基期后解锁自动吐纳。';
        elements.autoToggleBtn.disabled = !autoUnlocked;
        elements.autoToggleBtn.classList.toggle('active', autoUnlocked && gameState.autoCultivate);
        elements.autoToggleText.textContent = autoUnlocked
            ? `自动吐纳：${gameState.autoCultivate ? '开' : '关'}`
            : '尚未解锁';
        elements.offlineSummaryText.textContent = getOfflineSummaryText(autoUnlocked);

        const routeItems = GameCore.getRouteSummary(gameState);
        elements.routeSummary.innerHTML = routeItems.map((item) => `
            <article class="route-pill">
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
            </article>
        `).join('');

        elements.logDrawerCard.classList.toggle('collapsed', !!gameState.ui.logCollapsed);
        elements.logContainer.innerHTML = gameState.logs.length > 0
            ? gameState.logs.slice(0, 24).map((entry) => `<div class="log-entry ${entry.type}">${entry.message}</div>`).join('')
            : '<div class="log-entry">修行未起笔，先去走第一段剧情。</div>';
    }

    function renderStoryPage() {
        const view = GameCore.getStoryView(gameState);
        const echoes = GameCore.getEchoes(gameState);
        elements.storyPressure.innerHTML = `
            <strong>失败压力</strong>
            <p>${GameCore.getPressureStatusText(gameState)}</p>
        `;
        elements.storyEndingChain.style.display = 'none';
        elements.storyEndingChain.innerHTML = '';
        elements.echoList.innerHTML = echoes.map((item) => `
            <article class="echo-item">
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
                ${item.meta ? `<div class="echo-meta">${item.meta}</div>` : ''}
            </article>
        `).join('');
        elements.storyGoal.textContent = GameCore.getNextGoalText(gameState);

        if (!view) {
            elements.storyTitle.textContent = '暂无新剧情';
            elements.storyMeta.textContent = '静候机缘';
            elements.storySummary.textContent = '当前没有满足条件的新章节，先去修炼或游历。';
            elements.storyProgress.textContent = '暂无可翻阅章节';
            elements.storySpeaker.textContent = '旁白';
            elements.storyLine.textContent = '前路暂时沉默。';
            elements.storyChoices.innerHTML = '';
            elements.storyContinueBtn.disabled = true;
            elements.storySkipBtn.disabled = true;
            elements.storyContinueBtn.textContent = '下一页';
            elements.storySkipBtn.textContent = '跳至抉择';
            return;
        }

        if (view.mode === 'ending') {
            elements.storyTitle.textContent = view.ending.title;
            elements.storyMeta.textContent = '终局';
            elements.storySummary.textContent = view.ending.description;
            elements.storyProgress.textContent = '终局';
            elements.storySpeaker.textContent = '尾声';
            elements.storyLine.textContent = '这一段路已经走完。';
            if (Array.isArray(view.ending.recapLines) && view.ending.recapLines.length > 0) {
                elements.storyEndingChain.style.display = 'block';
                elements.storyEndingChain.innerHTML = `
                    <strong>${view.ending.recapTitle || '关键承诺链'}</strong>
                    <p>${view.ending.recapLines.join('；')}</p>
                `;
            }
            elements.storyChoices.innerHTML = `
                <button class="story-choice-btn" data-ending-action="reset" type="button">重新开始另一条路</button>
                <button class="story-choice-btn" data-ending-action="export" type="button">导出当前结局存档</button>
            `;
            elements.storyContinueBtn.disabled = true;
            elements.storySkipBtn.disabled = true;
            elements.storyContinueBtn.textContent = '下一页';
            elements.storySkipBtn.textContent = '跳至抉择';
            return;
        }

        const isLevelStory = view.source === 'level';
        const sourceLabel = isLevelStory
            ? '小境界事件'
            : view.chapter.chapterLabel || (typeof view.chapter.id === 'number' ? `第 ${view.chapter.id + 1} 章` : '主线章节');
        const realmLabel = isLevelStory ? ` · ${GameCore.getRealmLabel(gameState)}` : '';
        const totalPages = view.story.beats.length;
        const currentPage = Math.min(totalPages, gameState.storyCursor.beatIndex + 1);

        elements.storyTitle.textContent = `${sourceLabel} · ${view.chapter.title}`;
        elements.storyMeta.textContent = `${isLevelStory ? '悟境' : '主线'}${realmLabel}`;
        elements.storySummary.textContent = isLevelStory
            ? `${view.chapter.summary} 这一层会直接影响你的道心、资源或后续人情。`
            : view.chapter.summary;
        elements.storyProgress.textContent = view.mode === 'choices'
            ? `第 ${totalPages} / ${totalPages} 页 · 抉择`
            : `第 ${currentPage} / ${totalPages} 页`;

        if (view.currentBeat) {
            elements.storySpeaker.textContent = view.currentBeat.speaker;
            elements.storyLine.textContent = view.currentBeat.text;
        }

        elements.storyContinueBtn.disabled = view.mode === 'choices';
        elements.storySkipBtn.disabled = view.mode === 'choices';
        elements.storyContinueBtn.textContent = view.mode === 'choices'
            ? '等待抉择'
            : '下一页';
        elements.storySkipBtn.textContent = '跳至抉择';

        elements.storyChoices.innerHTML = view.choices.map((choice) => `
            <button
                class="story-choice-btn"
                data-choice-id="${choice.id}"
                type="button"
                ${choice.disabled ? 'disabled' : ''}
            >
                <span class="choice-title">${choice.text}</span>
                <div class="choice-tags">
                    <span class="choice-tag">${choice.promiseLabel || '承诺未定'}</span>
                    <span class="choice-tag risk-${choice.riskTier || 'steady'}">${choice.riskLabel || '稳妥'}</span>
                </div>
                <span class="choice-cost">${choice.visibleCostLabel || (choice.costs ? `消耗：${GameCore.formatCosts(choice.costs)}` : '机会成本：会改写后续路线')}</span>
                ${choice.disabledReason ? `<span class="choice-disabled-reason">${choice.disabledReason}</span>` : ''}
            </button>
        `).join('');
    }

    function renderAlchemyPage() {
        const recipes = GameCore.getAlchemyRecipes(gameState);
        const actualRate = GameCore.getBreakthroughActualRate(gameState);
        const currentRecoveryCapHp = getNaturalRecoveryCapHp();
        const categoryLabels = {
            recovery: '疗伤丹',
            cultivation: '修为丹',
            breakthrough: '破关丹',
        };

        elements.alchemySummary.innerHTML = `
            <article class="alchemy-metric">
                <span>当前气血</span>
                <strong>${gameState.playerStats.hp} / ${gameState.playerStats.maxHp}</strong>
            </article>
            <article class="alchemy-metric">
                <span>保底回血封顶</span>
                <strong>${currentRecoveryCapHp} / ${gameState.playerStats.maxHp}</strong>
            </article>
            <article class="alchemy-metric">
                <span>当前突破率</span>
                <strong>${Math.round(actualRate * 100)}%</strong>
            </article>
            <article class="alchemy-metric">
                <span>临时药力</span>
                <strong>${gameState.breakthroughBonus > 0 ? `+${Math.round(gameState.breakthroughBonus * 100)}%` : '无'}</strong>
            </article>
        `;
        elements.alchemyRuleText.textContent = combatState
            ? '战斗中丹炉封闭，需先脱战后再开炉。'
            : getNaturalRecoveryRuleText();
        elements.alchemyList.innerHTML = recipes.map((recipe) => `
            <article class="alchemy-recipe">
                <div class="alchemy-head">
                    <div>
                        <strong>${recipe.name}</strong>
                        <span>${categoryLabels[recipe.category] || '丹方'}</span>
                    </div>
                    <span class="alchemy-output">${recipe.outputText}</span>
                </div>
                <p>${recipe.summary}</p>
                <div class="alchemy-meta">
                    <div class="alchemy-line"><span>丹材</span><strong>${recipe.costText}</strong></div>
                    <div class="alchemy-line"><span>成丹</span><strong>${recipe.outputText}</strong></div>
                </div>
                <div class="alchemy-reason ${recipe.canCraft ? 'ready' : 'blocked'}">
                    ${recipe.canCraft ? '材料已齐，可立即开炉。' : recipe.disabledReason}
                </div>
                <button
                    class="inventory-use-btn alchemy-craft-btn"
                    data-craft-recipe-id="${recipe.id}"
                    type="button"
                    ${recipe.canCraft ? '' : 'disabled'}
                >开炉炼制</button>
            </article>
        `).join('');
    }

    function renderAdventurePage() {
        const location = GameCore.getLocationMeta(gameState);
        elements.locationTitle.textContent = location.name;
        elements.locationDesc.textContent = location.description;

        elements.locationNpcs.innerHTML = location.npcs.length > 0
            ? location.npcs.map((npcName) => {
                const dialogue = GameCore.getNpcDialogue(gameState, npcName);
                const relation = gameState.npcRelations[npcName] || 0;
                return `
                    <button class="npc-btn" data-npc-name="${npcName}" type="button">
                        <strong>${dialogue.name}</strong>
                        <span>${dialogue.title} · 关系 ${relation}</span>
                    </button>
                `;
            }).join('')
            : '<div class="side-story-item">此地暂时没有可主动交谈的人物。</div>';

        const sideStories = GameCore.getAvailableSideStories(gameState);
        elements.sideStoryList.innerHTML = sideStories.map((item) => `
            <article class="side-story-item">
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
            </article>
        `).join('');

        if (combatState) {
            elements.combatPreview.textContent = `正在与 ${combatState.monster.name} 交战，第 ${combatState.round} 回合。`;
        } else {
            elements.combatPreview.textContent = '游历会自动战斗，胜可得修为与掉落，败则折损部分修为。';
        }
        elements.battlePrepSummary.textContent = getBattlePrepSummaryText();
    }

    function renderInventory() {
        const itemIds = Object.keys(gameState.inventory);
        if (itemIds.length === 0) {
            elements.inventoryList.innerHTML = '<div class="inventory-item"><strong>储物袋空空如也</strong><p>去剧情或游历里拿点东西回来。</p></div>';
            return;
        }

        elements.inventoryList.innerHTML = itemIds.map((itemId) => {
            const item = ITEMS[itemId] || { name: itemId, description: '来历不明，暂时无法辨认。' };
            const quantity = gameState.inventory[itemId];
            const actions = GameCore.getItemActions(itemId);
            const actionButtons = actions.map((action) => `
                <button
                    class="inventory-use-btn"
                    data-item-id="${itemId}"
                    data-item-action="${action.id}"
                    ${action.id === 'use' ? `data-use-item="${itemId}"` : ''}
                    type="button"
                    ${combatState ? 'disabled' : ''}
                >${action.label}</button>
            `).join('');
            const tags = [
                ...actions.map((action) => `<span class="inventory-tag inventory-tag-action">${action.label}</span>`),
                ...(item.passiveSummary ? ['<span class="inventory-tag inventory-tag-passive">持有生效</span>'] : []),
            ].join('');
            const summaries = [
                ...actions.map((action) => `<div class="inventory-effect-line">${action.summary || action.label}</div>`),
                ...(item.passiveSummary ? [`<div class="inventory-effect-line inventory-passive-summary">${item.passiveSummary}</div>`] : []),
            ].join('');
            return `
                <article class="inventory-item">
                    <div class="inventory-head">
                        <strong>${item.name}</strong>
                        <span>x${quantity}</span>
                    </div>
                    <p>${item.description}</p>
                    ${tags ? `<div class="inventory-tags">${tags}</div>` : ''}
                    ${summaries ? `<div class="inventory-effect-list">${summaries}</div>` : ''}
                    ${actionButtons ? `<div class="inventory-actions">${actionButtons}</div>` : ''}
                </article>
            `;
        }).join('');
    }

    function renderSettings() {
        elements.audioToggle.checked = gameState.settings.audioEnabled;
        elements.musicToggle.checked = gameState.settings.musicEnabled;
    }

    function renderCombat() {
        if (!combatState) {
            hideModal(elements.combatModal);
            elements.combatLog.innerHTML = '';
            return;
        }

        showModal(elements.combatModal);
        elements.combatTitle.textContent = `遭遇 ${combatState.monster.name}`;
        elements.monsterName.textContent = combatState.monster.name;
        elements.playerHpFill.style.width = `${(gameState.playerStats.hp / gameState.playerStats.maxHp) * 100}%`;
        elements.playerHpText.textContent = `${gameState.playerStats.hp} / ${gameState.playerStats.maxHp}`;
        elements.monsterHpFill.style.width = `${(combatState.monster.hp / combatState.monster.maxHp) * 100}%`;
        elements.monsterHpText.textContent = `${combatState.monster.hp} / ${combatState.monster.maxHp}`;
    }

    function renderOfflineSettlement() {
        if (!pendingOfflineSettlement || !pendingOfflineSettlement.applied) {
            hideModal(elements.offlineModal);
            return;
        }

        elements.offlineDurationText.textContent = pendingOfflineSettlement.wasCapped
            ? `离线 ${formatOfflineDuration(pendingOfflineSettlement.durationMs)}，按 ${formatOfflineDuration(pendingOfflineSettlement.effectiveDurationMs)} 结算`
            : `离线 ${formatOfflineDuration(pendingOfflineSettlement.effectiveDurationMs)}`;
        elements.offlineGainText.textContent = `修为 +${pendingOfflineSettlement.gain}`;
        elements.offlineCurrentText.textContent = `${gameState.cultivation}/${gameState.maxCultivation}`;
        showModal(elements.offlineModal);
    }

    function render() {
        renderStatus();
        renderTabs();
        renderCultivationPage();
        renderAlchemyPage();
        renderStoryPage();
        renderAdventurePage();
        renderInventory();
        renderSettings();
        renderCombat();
        renderOfflineSettlement();
    }

    function showFloatingText(text, type) {
        const span = document.createElement('span');
        span.className = `floating-text ${type}`;
        span.textContent = text;
        span.style.left = `${50 + ((Math.random() - 0.5) * 40)}%`;
        elements.floatingContainer.appendChild(span);
        setTimeout(() => {
            span.remove();
        }, 1300);
    }

    function handleCultivate(isAuto) {
        if (GameCore.canBreakthrough(gameState)) {
            const result = GameCore.attemptBreakthrough(gameState);
            playSound(result.success ? 'breakthrough' : 'fail');
            if (result.capped) {
                showFloatingText('绝巅已至', 'breakthrough');
            } else if (result.success) {
                showFloatingText('突破成功', 'breakthrough');
            } else {
                showFloatingText(`突破失败 -${result.penalty}`, 'loss');
            }
        } else {
            const result = GameCore.cultivate(gameState, isAuto);
            if (!isAuto) {
                showFloatingText(`修为 +${result.gain}`, 'gain');
                playSound('click');
            }
        }

        GameCore.ensureStoryCursor(gameState);
        render();
        saveGame();
    }

    function startAutoCultivate() {
        if (!GameCore.canAutoCultivate(gameState)) {
            return;
        }
        stopAutoCultivate();
        gameState.autoCultivate = true;
        autoCultivateTimer = window.setInterval(() => {
            handleCultivate(true);
        }, StoryData.CONFIG.autoCultivateInterval);
    }

    function stopAutoCultivate() {
        gameState.autoCultivate = false;
        if (autoCultivateTimer) {
            window.clearInterval(autoCultivateTimer);
            autoCultivateTimer = null;
        }
    }

    function runNaturalRecoveryTick() {
        if (combatState) {
            return;
        }

        const result = GameCore.resolveNaturalRecovery(gameState, Date.now());
        if (!result.touched) {
            return;
        }

        render();
        saveGame();
    }

    function startNaturalRecoveryLoop() {
        stopNaturalRecoveryLoop();
        naturalRecoveryTimer = window.setInterval(runNaturalRecoveryTick, StoryData.CONFIG.naturalRecoveryIntervalMs);
    }

    function stopNaturalRecoveryLoop() {
        if (naturalRecoveryTimer) {
            window.clearInterval(naturalRecoveryTimer);
            naturalRecoveryTimer = null;
        }
    }

    function stopCombatLoop() {
        if (combatTimer) {
            window.clearTimeout(combatTimer);
            combatTimer = null;
        }
        markRecoveryCheckpoint();
        combatState = null;
    }

    function appendCombatEntries(lines) {
        lines.forEach((line) => {
            const node = document.createElement('div');
            node.className = 'combat-entry';
            node.textContent = line;
            elements.combatLog.prepend(node);
        });
    }

    function runCombatLoop() {
        if (!combatState) {
            return;
        }

        const roundResult = GameCore.resolveCombatRound(gameState, combatState);
        appendCombatEntries(roundResult.entries);
        renderCombat();
        renderStatus();

        if (roundResult.finished) {
            playSound(roundResult.victory ? 'victory' : 'fail');
            const endText = roundResult.victory ? '战斗结束，你赢了。' : '战斗结束，你险胜退走。';
            appendCombatEntries([endText]);
            combatTimer = window.setTimeout(() => {
                stopCombatLoop();
                hideModal(elements.combatModal);
                render();
                saveGame();
            }, 1200);
            return;
        }

        combatTimer = window.setTimeout(runCombatLoop, 900);
    }

    function startAdventure() {
        if (combatState) {
            return;
        }
        primeNaturalRecoveryState(Date.now());
        markRecoveryCheckpoint();
        combatState = GameCore.beginCombat(gameState);
        elements.combatLog.innerHTML = '';
        appendCombatEntries([`你在 ${gameState.currentLocation} 遭遇 ${combatState.monster.name}。`]);
        renderCombat();
        combatTimer = window.setTimeout(runCombatLoop, 700);
        saveGame();
    }

    function openDialogue(npcName) {
        const dialogue = GameCore.getNpcDialogue(gameState, npcName);
        if (!dialogue) {
            return;
        }
        elements.dialogueName.textContent = `${dialogue.name} · ${dialogue.title}`;
        elements.dialogueAvatar.textContent = dialogue.avatar;
        elements.dialogueText.textContent = dialogue.text;
        showModal(elements.dialogueModal);
    }

    function exportSave() {
        saveGame();
        const blob = new Blob([GameCore.serializeState(gameState)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `灵光修仙传_v${GameCore.SAVE_VERSION}_${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function importSave() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (event) => {
            const [file] = event.target.files || [];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                try {
                    const parsed = JSON.parse(loadEvent.target.result);
                    if (!GameCore.isSupportedSaveData(parsed)) {
                        window.alert(`导入失败：${getUnsupportedSaveMessage(parsed)}该存档不会覆盖当前进度。`);
                        return;
                    }
                    stopAutoCultivate();
                    stopCombatLoop();
                    restoreGameState(parsed, true);
                    if (gameState.autoCultivate) {
                        startAutoCultivate();
                    }
                    render();
                    saveGame();
                } catch (error) {
                    window.alert(`导入失败：${error.message}`);
                }
            };
            reader.readAsText(file, 'utf-8');
        });
        input.click();
    }

    function bindEvents() {
        elements.mainBtn.addEventListener('click', () => handleCultivate(false));
        elements.autoToggleBtn.addEventListener('click', () => {
            if (gameState.autoCultivate) {
                stopAutoCultivate();
            } else {
                startAutoCultivate();
            }
            render();
            saveGame();
        });

        elements.toggleLogBtn.addEventListener('click', () => {
            gameState.ui.logCollapsed = !gameState.ui.logCollapsed;
            render();
            saveGame();
        });

        elements.storyContinueBtn.addEventListener('click', () => {
            const view = GameCore.getStoryView(gameState);
            if (!view || view.mode === 'ending' || view.mode === 'choices') {
                return;
            }
            GameCore.advanceStoryBeat(gameState);
            gameState.unreadStory = false;
            playSound('story');
            render();
            saveGame();
        });

        elements.storySkipBtn.addEventListener('click', () => {
            const result = GameCore.skipStoryPlayback(gameState);
            if (result.ok) {
                render();
                saveGame();
            }
        });

        elements.storyChoices.addEventListener('click', (event) => {
            const target = event.target.closest('[data-choice-id], [data-ending-action]');
            if (!target) {
                return;
            }

            if (target.dataset.endingAction === 'reset') {
                showModal(elements.confirmModal);
                return;
            }
            if (target.dataset.endingAction === 'export') {
                exportSave();
                return;
            }

            const result = GameCore.chooseStoryOption(gameState, target.dataset.choiceId);
            if (!result.ok) {
                window.alert(result.error);
                return;
            }
            gameState.unreadStory = false;
            playSound(result.death ? 'fail' : (result.ending ? 'victory' : 'story'));
            render();
            saveGame();
        });

        elements.navButtons.forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.tab) {
                    setActiveTab(button.dataset.tab);
                    return;
                }
                if (button.dataset.action === 'inventory') {
                    renderInventory();
                    showModal(elements.inventoryModal);
                    return;
                }
                if (button.dataset.action === 'settings') {
                    renderSettings();
                    showModal(elements.settingsModal);
                }
            });
        });

        elements.locationNpcs.addEventListener('click', (event) => {
            const button = event.target.closest('[data-npc-name]');
            if (button) {
                openDialogue(button.dataset.npcName);
            }
        });

        elements.inventoryList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-item-action]');
            if (!button) {
                return;
            }
            const result = GameCore.performItemAction(
                gameState,
                button.dataset.itemId,
                button.dataset.itemAction,
                { inCombat: Boolean(combatState) },
            );
            if (!result.ok) {
                window.alert(result.error);
                return;
            }
            if (result.delta.cultivation > 0) {
                showFloatingText(`修为 +${result.delta.cultivation}`, 'gain');
            } else if (result.delta.hp > 0) {
                showFloatingText(`气血 +${result.delta.hp}`, 'gain');
            } else if (result.delta.breakthroughRate > 0) {
                showFloatingText(`突破率 +${Math.round(result.delta.breakthroughRate * 100)}%`, 'breakthrough');
            }
            playSound('click');
            render();
            saveGame();
        });

        elements.alchemyList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-craft-recipe-id]');
            if (!button) {
                return;
            }
            const result = GameCore.craftRecipe(gameState, button.dataset.craftRecipeId, {
                inCombat: Boolean(combatState),
            });
            if (!result.ok) {
                window.alert(result.error);
                return;
            }
            showFloatingText(result.outputText, 'gain');
            playSound('click');
            render();
            saveGame();
        });

        elements.adventureBtn.addEventListener('click', startAdventure);

        elements.closeInventory.addEventListener('click', () => hideModal(elements.inventoryModal));
        elements.closeSettings.addEventListener('click', () => hideModal(elements.settingsModal));
        elements.closeDialogue.addEventListener('click', () => hideModal(elements.dialogueModal));
        elements.closeOfflineModal.addEventListener('click', dismissOfflineSettlement);

        elements.audioToggle.addEventListener('change', () => {
            gameState.settings.audioEnabled = elements.audioToggle.checked;
            saveGame();
        });
        elements.musicToggle.addEventListener('change', () => {
            gameState.settings.musicEnabled = elements.musicToggle.checked;
            saveGame();
        });
        elements.exportBtn.addEventListener('click', exportSave);
        elements.importBtn.addEventListener('click', importSave);
        elements.resetBtn.addEventListener('click', () => showModal(elements.confirmModal));
        elements.cancelReset.addEventListener('click', () => hideModal(elements.confirmModal));
        elements.confirmReset.addEventListener('click', resetGame);

        [elements.inventoryModal, elements.settingsModal, elements.dialogueModal, elements.confirmModal].forEach((modal) => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    hideModal(modal);
                }
            });
        });

        elements.offlineModal.addEventListener('click', (event) => {
            if (event.target === elements.offlineModal) {
                dismissOfflineSettlement();
            }
        });
    }

    function init() {
        cacheElements();
        loadGame();
        bindEvents();
        startNaturalRecoveryLoop();
        primeNaturalRecoveryState(Date.now());
        window.addEventListener('pagehide', saveGame);
        if (gameState.autoCultivate) {
            startAutoCultivate();
        }
        render();
        saveGame();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
