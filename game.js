(function () {
    const STORAGE_KEY = StoryData.STORAGE_KEY;
    const { ITEMS, LOCATIONS } = StoryData;

    let gameState = GameCore.createInitialState();
    let combatState = null;
    let autoCultivateTimer = null;
    let combatTimer = null;
    let audioContext = null;

    const elements = {};

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
            'route-summary',
            'echo-list',
            'location-title',
            'location-desc',
            'location-npcs',
            'side-story-list',
            'adventure-btn',
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
        localStorage.setItem(STORAGE_KEY, GameCore.serializeState(gameState));
    }

    function loadGame() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            gameState = GameCore.createInitialState();
            GameCore.ensureStoryCursor(gameState);
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            gameState = GameCore.mergeSave(parsed);
            GameCore.ensureStoryCursor(gameState);
        } catch (error) {
            console.error('存档读取失败', error);
            gameState = GameCore.createInitialState();
            GameCore.ensureStoryCursor(gameState);
        }
    }

    function resetGame() {
        stopAutoCultivate();
        stopCombatLoop();
        localStorage.removeItem(STORAGE_KEY);
        gameState = GameCore.createInitialState();
        GameCore.ensureStoryCursor(gameState);
        hideModal(elements.confirmModal);
        hideModal(elements.settingsModal);
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
        gameState.ui.activeTab = tabName;
        if (tabName === 'story') {
            gameState.unreadStory = false;
        }
        render();
        saveGame();
    }

    function renderStatus() {
        const realmLabel = GameCore.getRealmLabel(gameState);
        const summaryCultivationText = `${gameState.cultivation}/${gameState.maxCultivation}`;
        elements.playerName.textContent = gameState.playerName;
        elements.summaryRealmDisplay.textContent = realmLabel;
        elements.summaryCultivationDisplay.textContent = summaryCultivationText;

        const actualRate = Math.min(0.95, gameState.breakthroughRate + gameState.breakthroughBonus);
        const bonusText = gameState.breakthroughBonus > 0 ? ` · 加成 +${Math.round(gameState.breakthroughBonus * 100)}%` : '';
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
        elements.autoPanel.style.display = autoUnlocked ? 'flex' : 'none';
        elements.autoStatusText.textContent = autoUnlocked
            ? '筑基之后可持续吐纳，适合慢慢攒境界。'
            : '筑基期后解锁自动吐纳。';
        elements.autoToggleBtn.classList.toggle('active', gameState.autoCultivate);
        elements.autoToggleText.textContent = `自动吐纳：${gameState.autoCultivate ? '开' : '关'}`;

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
        elements.echoList.innerHTML = echoes.map((item) => `
            <article class="echo-item">
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
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
                ${choice.text}
                ${choice.costs ? `<span class="choice-cost">消耗：${GameCore.formatCosts(choice.costs)}</span>` : ''}
            </button>
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
    }

    function renderInventory() {
        const itemIds = Object.keys(gameState.inventory);
        if (itemIds.length === 0) {
            elements.inventoryList.innerHTML = '<div class="inventory-item"><strong>储物袋空空如也</strong><p>去剧情或游历里拿点东西回来。</p></div>';
            return;
        }

        elements.inventoryList.innerHTML = itemIds.map((itemId) => {
            const item = ITEMS[itemId];
            const quantity = gameState.inventory[itemId];
            return `
                <article class="inventory-item">
                    <div class="inventory-head">
                        <strong>${item.name}</strong>
                        <span>x${quantity}</span>
                    </div>
                    <p>${item.description}</p>
                    ${item.usable ? `<button class="inventory-use-btn" data-use-item="${itemId}" type="button">使用</button>` : ''}
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

    function render() {
        renderStatus();
        renderTabs();
        renderCultivationPage();
        renderStoryPage();
        renderAdventurePage();
        renderInventory();
        renderSettings();
        renderCombat();
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

    function stopCombatLoop() {
        if (combatTimer) {
            window.clearTimeout(combatTimer);
            combatTimer = null;
        }
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
        const blob = new Blob([GameCore.serializeState(gameState)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `灵光修仙传_v2_${new Date().toISOString().slice(0, 10)}.json`;
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
                    stopAutoCultivate();
                    stopCombatLoop();
                    gameState = GameCore.mergeSave(parsed);
                    GameCore.ensureStoryCursor(gameState);
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
            playSound(result.ending ? 'victory' : 'story');
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
            const button = event.target.closest('[data-use-item]');
            if (!button) {
                return;
            }
            const result = GameCore.useItem(gameState, button.dataset.useItem);
            if (!result.ok) {
                window.alert(result.error);
                return;
            }
            render();
            saveGame();
        });

        elements.adventureBtn.addEventListener('click', startAdventure);

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
        if (gameState.autoCultivate) {
            startAutoCultivate();
        }
        render();
        saveGame();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
