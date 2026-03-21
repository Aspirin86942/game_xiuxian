(function () {
    const STORAGE_KEY = StoryData.STORAGE_KEY;
    const { ITEMS } = StoryData;
    const TRAINING_BATCH_KEYS = ['1', '10', 'max'];
    const MAX_IMPORT_FILE_BYTES = 256 * 1024;

    let gameState = GameCore.createInitialState();
    let combatState = null;
    let naturalRecoveryTimer = null;
    let combatTimer = null;
    let audioContext = null;
    let selectedTrainBatch = '1';

    const elements = {};

    function getNaturalRecoveryRuleText() {
        const intervalSeconds = Math.max(1, Math.floor(StoryData.CONFIG.naturalRecoveryIntervalMs / 1000));
        const recoveryPercent = Math.round(StoryData.CONFIG.naturalRecoveryRatio * 100);
        const capPercent = Math.round(StoryData.CONFIG.naturalRecoveryCapRatio * 100);
        return `非战斗时每 ${intervalSeconds} 秒回复 ${recoveryPercent}% 最大气血，最多恢复到 ${capPercent}% 气血。`;
    }

    function getNaturalRecoveryCapHp() {
        return Math.max(1, Math.floor(gameState.playerStats.maxHp * StoryData.CONFIG.naturalRecoveryCapRatio));
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
    function cacheElements() {
        [
            'player-name',
            'summary-realm-display',
            'summary-cultivation-display',
            'summary-lingshi-display',
            'breakthrough-inline',
            'main-btn',
            'adventure-btn',
            'hint-text',
            'training-panel',
            'train-cost-text',
            'train-batch-controls',
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
            'combat-preview',
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
            'save-mode-note',
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
        elements.trainingBatchButtons = Array.from(document.querySelectorAll('[data-train-batch]'));
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

    function showModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('show');
        }
    }

    function hideModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('show');
        }
    }

    function saveGame() {
        localStorage.setItem(STORAGE_KEY, GameCore.serializeState(gameState));
    }

    function bootstrapFreshState() {
        gameState = GameCore.createInitialState();
        GameCore.ensureStoryCursor(gameState);
        selectedTrainBatch = '1';
    }

    function getUnsupportedSaveMessage(rawState) {
        const versionText = Number.isFinite(rawState?.version) ? `v${rawState.version}` : '未知版本';
        if (Number.isFinite(rawState?.version) && rawState.version > GameCore.SAVE_VERSION) {
            return `检测到更高版本存档（${versionText}），当前主循环仅支持 v${GameCore.MIN_SUPPORTED_SAVE_VERSION} - v${GameCore.SAVE_VERSION}。`;
        }
        return `检测到旧版存档（${versionText}），当前主循环已升级到 v${GameCore.SAVE_VERSION}。`;
    }

    function restoreGameState(parsedState) {
        gameState = GameCore.mergeSave(parsedState);
        GameCore.ensureStoryCursor(gameState);
        syncUnreadStoryState();
        selectedTrainBatch = TRAINING_BATCH_KEYS.includes(selectedTrainBatch) ? selectedTrainBatch : '1';
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
            restoreGameState(parsed);
        } catch (error) {
            console.error('存档读取失败', error);
            localStorage.removeItem(STORAGE_KEY);
            bootstrapFreshState();
            saveGame();
        }
    }

    function resetGame() {
        stopCombatLoop();
        localStorage.removeItem(STORAGE_KEY);
        bootstrapFreshState();
        [
            elements.confirmModal,
            elements.settingsModal,
            elements.inventoryModal,
            elements.dialogueModal,
            elements.combatModal,
        ].forEach(hideModal);
        render();
        saveGame();
    }

    function setActiveTab(tabName) {
        if (tabName === 'alchemy' && combatState) {
            window.alert('战斗中不可分心炼丹。');
            return false;
        }
        gameState.ui.activeTab = tabName;
        syncUnreadStoryState();
        render();
        saveGame();
        return true;
    }

    function getTrainBatchLabel(batchKey) {
        const labels = {
            '1': '1 枚',
            '10': '10 枚',
            max: '尽数闭关',
        };
        return labels[batchKey] || '当前批次';
    }

    function getLatestExpeditionSummary() {
        const latest = (gameState.logs || []).find((entry) => {
            if (!entry || typeof entry.message !== 'string') {
                return false;
            }
            return entry.message.startsWith('你在 ') || entry.message.startsWith('游历');
        });

        if (!latest) {
            return '游历可能获得灵石、遭遇战斗、折损气血，或打听剧情线索。';
        }
        return `最近游历：${latest.message}`;
    }

    function syncUnreadStoryState() {
        // “新剧情”只代表离开剧情页后出现的未读章节；停留在剧情页时要立即清零，避免刷新和章节衔接后残留徽标。
        if (gameState.ui.activeTab === 'story') {
            gameState.unreadStory = false;
        }
    }

    function getCultivationActionState() {
        if (GameCore.canBreakthrough(gameState)) {
            return { mode: 'breakthrough', preview: null };
        }

        const preview = GameCore.getTrainingPreview(gameState, selectedTrainBatch);
        if (preview.ok) {
            return { mode: 'train', preview };
        }

        return { mode: 'disabled', preview };
    }

    function renderStatus() {
        const realmLabel = GameCore.getRealmLabel(gameState);
        const summaryCultivationText = `${gameState.cultivation}/${gameState.maxCultivation}`;
        const lingshiCount = GameCore.getInventoryCount(gameState, 'lingshi');

        elements.playerName.textContent = gameState.playerName;
        elements.summaryRealmDisplay.textContent = realmLabel;
        elements.summaryCultivationDisplay.textContent = summaryCultivationText;
        elements.summaryLingshiDisplay.textContent = String(lingshiCount);

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
            if (button.dataset.tab) {
                button.classList.toggle('active', button.dataset.tab === gameState.ui.activeTab);
            }
        });
        elements.storyBadge.classList.toggle('show', !!gameState.unreadStory);
    }

    function renderCultivationPage() {
        const storyView = GameCore.getStoryView(gameState);
        const actionState = getCultivationActionState();
        const { mode, preview } = actionState;
        const location = GameCore.getLocationMeta(gameState);

        elements.mainBtn.textContent = mode === 'breakthrough'
            ? '渡劫突破'
            : '闭关修炼';
        elements.mainBtn.classList.toggle('breakthrough', mode === 'breakthrough');
        elements.mainBtn.disabled = !!combatState || mode === 'disabled';
        elements.adventureBtn.disabled = !!combatState;

        if (storyView && storyView.source === 'level' && storyView.mode !== 'ending') {
            elements.hintText.textContent = `当前有小境界事件：${storyView.chapter.title}`;
        } else if (mode === 'breakthrough') {
            elements.hintText.textContent = '修为已满，心神沉静后即可尝试突破。';
        } else if (mode === 'train') {
            const remainingAfterTraining = Math.max(0, gameState.maxCultivation - (gameState.cultivation + preview.gain));
            const suffix = remainingAfterTraining > 0
                ? `，距突破还差 ${remainingAfterTraining} 点修为。`
                : '，足以触及突破门槛。';
            elements.hintText.textContent = `已选 ${getTrainBatchLabel(selectedTrainBatch)}，将炼化 ${preview.stonesSpent} 枚灵石，修为 +${preview.gain}${suffix}`;
        } else {
            elements.hintText.textContent = '当前灵石不足，闭关暂不可用，可先出门游历搜集灵石。';
        }

        if (mode === 'breakthrough') {
            elements.trainCostText.textContent = '当前修为已满，闭关暂停，请先尝试突破。';
        } else if (mode === 'train') {
            elements.trainCostText.textContent = `每枚灵石可炼化 10 点修为。本次将消耗 ${preview.stonesSpent} 枚灵石，获得 ${preview.gain} 点修为。`;
        } else {
            elements.trainCostText.textContent = '每枚灵石可炼化 10 点修为。当前批次灵石不足，闭关按钮已禁用。';
        }

        elements.trainingBatchButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.trainBatch === selectedTrainBatch);
        });

        elements.locationTitle.textContent = location.name;
        elements.locationDesc.textContent = location.description;
        if (combatState) {
            elements.combatPreview.textContent = `正在与 ${combatState.monster.name} 交战，第 ${combatState.round} 回合。`;
        } else {
            elements.combatPreview.textContent = getLatestExpeditionSummary();
        }

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
        const location = GameCore.getLocationMeta(gameState);
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
        elements.storyContinueBtn.textContent = view.mode === 'choices' ? '等待抉择' : '下一页';
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
        elements.audioToggle.checked = !!gameState.settings.audioEnabled;
        elements.musicToggle.checked = !!gameState.settings.musicEnabled;
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

    function render() {
        renderStatus();
        renderTabs();
        renderCultivationPage();
        renderAlchemyPage();
        renderStoryPage();
        renderInventory();
        renderSettings();
        renderCombat();
    }

    function showFloatingText(text, type) {
        if (!elements.floatingContainer) {
            return;
        }
        const span = document.createElement('span');
        span.className = `floating-text ${type}`;
        span.textContent = text;
        span.style.left = `${50 + ((Math.random() - 0.5) * 40)}%`;
        elements.floatingContainer.appendChild(span);
        window.setTimeout(() => {
            span.remove();
        }, 1300);
    }

    function handleCultivate() {
        const actionState = getCultivationActionState();

        if (actionState.mode === 'breakthrough') {
            const result = GameCore.attemptBreakthrough(gameState);
            if (!result.ok) {
                showFloatingText('修为未满', 'loss');
                playSound('fail');
            } else if (result.capped) {
                showFloatingText('绝巅已至', 'breakthrough');
                playSound('breakthrough');
            } else if (result.success) {
                showFloatingText('突破成功', 'breakthrough');
                playSound('breakthrough');
            } else {
                showFloatingText(`突破失败 -${result.penalty}`, 'loss');
                playSound('fail');
            }
        } else if (actionState.mode === 'train') {
            const result = GameCore.trainWithLingshi(gameState, selectedTrainBatch);
            if (!result.ok) {
                showFloatingText('灵石不足', 'loss');
                playSound('fail');
            } else {
                showFloatingText(`修为 +${result.gain}`, 'gain');
                playSound('click');
            }
        } else {
            showFloatingText('灵石不足', 'loss');
            playSound('fail');
            return;
        }

        GameCore.ensureStoryCursor(gameState);
        syncUnreadStoryState();
        render();
        saveGame();
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

    function createCombatSettlementEntries(roundResult) {
        if (!roundResult.rewards) {
            return [];
        }

        if (roundResult.victory) {
            const entries = [];
            if (roundResult.rewards.lingshiGain) {
                entries.push(`战利：灵石 +${roundResult.rewards.lingshiGain}`);
            }
            if (Array.isArray(roundResult.rewards.drops) && roundResult.rewards.drops.length > 0) {
                roundResult.rewards.drops.forEach((drop) => {
                    const itemName = ITEMS[drop.itemId]?.name || drop.itemId;
                    entries.push(`掉落：${itemName} x${drop.quantity}`);
                });
            }
            return entries;
        }

        if (roundResult.rewards.lingshiLoss > 0) {
            return [`损失：灵石 -${roundResult.rewards.lingshiLoss}`];
        }
        return ['损失：未带回额外灵石'];
    }

    function runCombatLoop() {
        if (!combatState) {
            return;
        }

        const roundResult = GameCore.resolveCombatRound(gameState, combatState);
        appendCombatEntries(roundResult.entries);
        renderCombat();
        renderStatus();
        renderCultivationPage();

        if (roundResult.finished) {
            appendCombatEntries(createCombatSettlementEntries(roundResult));
            appendCombatEntries([roundResult.victory ? '战斗结束，你带着收获离去。' : '战斗结束，你负伤退走。']);
            playSound(roundResult.victory ? 'victory' : 'fail');
            combatTimer = window.setTimeout(() => {
                stopCombatLoop();
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
        const result = GameCore.resolveExpedition(gameState);
        if (!result.ok) {
            window.alert(result.error || '游历失败');
            return;
        }

        if (result.type === 'battle') {
            markRecoveryCheckpoint();
            combatState = result.combatState;
            elements.combatLog.innerHTML = '';
            appendCombatEntries([result.summary]);
            render();
            combatTimer = window.setTimeout(runCombatLoop, 700);
            saveGame();
            return;
        }

        if (result.type === 'resource') {
            showFloatingText(`灵石 +${result.lingshiGain}`, 'gain');
            playSound('click');
        } else if (result.type === 'risk') {
            const text = result.lingshiLoss > 0
                ? `灵石 -${result.lingshiLoss}`
                : `气血 -${result.hpLoss}`;
            showFloatingText(text, 'loss');
            playSound('fail');
        } else {
            showFloatingText('探得线索', 'breakthrough');
            playSound('story');
        }

        render();
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
            if (file.size > MAX_IMPORT_FILE_BYTES) {
                window.alert(`导入失败：存档文件过大，请控制在 ${Math.floor(MAX_IMPORT_FILE_BYTES / 1024)} KB 以内。`);
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
                    stopCombatLoop();
                    restoreGameState(parsed);
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
        elements.mainBtn.addEventListener('click', handleCultivate);
        elements.adventureBtn.addEventListener('click', startAdventure);

        elements.trainBatchControls.addEventListener('click', (event) => {
            const button = event.target.closest('[data-train-batch]');
            if (!button) {
                return;
            }
            const nextBatchKey = button.dataset.trainBatch;
            if (!TRAINING_BATCH_KEYS.includes(nextBatchKey)) {
                return;
            }
            selectedTrainBatch = nextBatchKey;
            renderCultivationPage();
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
            syncUnreadStoryState();
            playSound('story');
            render();
            saveGame();
        });

        elements.storySkipBtn.addEventListener('click', () => {
            const result = GameCore.skipStoryPlayback(gameState);
            if (result.ok) {
                syncUnreadStoryState();
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
            syncUnreadStoryState();
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
        elements.closeInventory.addEventListener('click', () => hideModal(elements.inventoryModal));
        elements.closeSettings.addEventListener('click', () => hideModal(elements.settingsModal));
        elements.closeDialogue.addEventListener('click', () => hideModal(elements.dialogueModal));

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
    }

    function init() {
        cacheElements();
        loadGame();
        bindEvents();
        startNaturalRecoveryLoop();
        primeNaturalRecoveryState(Date.now());
        window.addEventListener('pagehide', saveGame);
        render();
        saveGame();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
