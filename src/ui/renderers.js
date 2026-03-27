(function (globalScope) {
    function createUiRenderersModule(deps) {
        function getNaturalRecoveryRuleText(ctx) {
            const intervalSeconds = Math.max(1, Math.floor(ctx.StoryData.CONFIG.naturalRecoveryIntervalMs / 1000));
            const recoveryPercent = Math.round(ctx.StoryData.CONFIG.naturalRecoveryRatio * 100);
            const capPercent = Math.round(ctx.StoryData.CONFIG.naturalRecoveryCapRatio * 100);
            return `离了争斗，每 ${intervalSeconds} 秒可回转 ${recoveryPercent}% 气血，最多养回到 ${capPercent}%。`;
        }

        function getNaturalRecoveryCapHp(ctx) {
            return Math.max(1, Math.floor(ctx.gameState.playerStats.maxHp * ctx.StoryData.CONFIG.naturalRecoveryCapRatio));
        }

        function getLatestExpeditionSummary(ctx) {
            const latest = (ctx.gameState.logs || []).find((entry) => {
                if (!entry || typeof entry.message !== 'string') {
                    return false;
                }
                return entry.message.startsWith('你在 ') || entry.message.startsWith('游历');
            });

            if (!latest) {
                return '这一趟出去，也许带回灵石，也许撞上杀机，或听来几句风声。';
            }
            return `最近游历：${latest.message}`;
        }

        function getCultivationActionState(ctx) {
            if (ctx.GameCore.canBreakthrough(ctx.gameState)) {
                return { mode: 'breakthrough', preview: null };
            }

            const preview = ctx.GameCore.getTrainingPreview(ctx.gameState, ctx.selectedTrainBatch);
            if (preview.ok) {
                return { mode: 'train', preview };
            }

            return { mode: 'disabled', preview };
        }

        function renderStatus(ctx) {
            const realmLabel = ctx.GameCore.getRealmLabel(ctx.gameState);
            const summaryCultivationText = `${ctx.gameState.cultivation}/${ctx.gameState.maxCultivation}`;
            const lingshiCount = ctx.GameCore.getInventoryCount(ctx.gameState, 'lingshi');

            ctx.elements.playerName.textContent = ctx.gameState.playerName;
            ctx.elements.summaryRealmDisplay.textContent = realmLabel;
            ctx.elements.summaryCultivationDisplay.textContent = summaryCultivationText;
            ctx.elements.summaryLingshiDisplay.textContent = String(lingshiCount);

            const passiveBonuses = ctx.GameCore.getInventoryPassiveBonuses(ctx.gameState);
            const actualRate = ctx.GameCore.getBreakthroughActualRate(ctx.gameState);
            const bonusParts = [];
            if (ctx.gameState.breakthroughBonus > 0) {
                bonusParts.push(`临时 +${Math.round(ctx.gameState.breakthroughBonus * 100)}%`);
            }
            if ((passiveBonuses.breakthroughBonus || 0) > 0) {
                bonusParts.push(`持有 +${Math.round(passiveBonuses.breakthroughBonus * 100)}%`);
            }
            const bonusText = bonusParts.length > 0 ? ` · ${bonusParts.join(' · ')}` : '';
            ctx.elements.breakthroughInline.textContent = `此刻破关把握：${Math.round(actualRate * 100)}%${bonusText}`;
        }

        function renderTabs(ctx) {
            ctx.elements.pages.forEach((page) => {
                page.classList.toggle('active', page.dataset.page === ctx.gameState.ui.activeTab);
            });
            ctx.elements.navButtons.forEach((button) => {
                if (button.dataset.tab) {
                    button.classList.toggle('active', button.dataset.tab === ctx.gameState.ui.activeTab);
                }
            });
            ctx.elements.storyBadge.classList.toggle('show', !!ctx.gameState.unreadStory);
        }

        function renderCultivationPage(ctx) {
            const storyView = ctx.GameCore.getStoryView(ctx.gameState);
            const actionState = getCultivationActionState(ctx);
            const { mode, preview } = actionState;
            const location = ctx.GameCore.getLocationMeta(ctx.gameState);
            const blockedMainStoryHint = ctx.GameCore.getBlockedMainStoryHint(ctx.gameState);

            ctx.elements.mainBtn.textContent = mode === 'breakthrough' ? '渡劫突破' : '闭关修炼';
            ctx.elements.mainBtn.classList.toggle('breakthrough', mode === 'breakthrough');
            ctx.elements.mainBtn.disabled = !!ctx.combatState || mode === 'disabled';
            ctx.elements.adventureBtn.disabled = !!ctx.combatState;

            if (blockedMainStoryHint) {
                ctx.elements.hintText.textContent = blockedMainStoryHint;
            } else if (storyView && storyView.source === 'level' && storyView.mode !== 'ending') {
                ctx.elements.hintText.textContent = `心湖忽起一线悟境：《${storyView.chapter.title}》`;
            } else if (mode === 'breakthrough') {
                ctx.elements.hintText.textContent = '修为已至关前，只待心神一静，便可叩关。';
            } else if (mode === 'train') {
                const remainingAfterTraining = Math.max(0, ctx.gameState.maxCultivation - (ctx.gameState.cultivation + preview.gain));
                const suffix = remainingAfterTraining > 0 ? `，离破关还差 ${remainingAfterTraining} 点修为。` : '，已足够叩到关前。';
                ctx.elements.hintText.textContent = `已择 ${deps.getTrainBatchLabel(ctx.selectedTrainBatch)}，此番可炼化 ${preview.stonesSpent} 枚灵石，得修为 +${preview.gain}${suffix}`;
            } else {
                ctx.elements.hintText.textContent = '囊中灵石未足，眼下闭关难成，不妨先出门走一遭。';
            }

            if (mode === 'breakthrough') {
                ctx.elements.trainCostText.textContent = '修为已满，闭关先歇，请先叩关。';
            } else if (mode === 'train') {
                ctx.elements.trainCostText.textContent = `一枚灵石，可换 10 点修为。此番将化去 ${preview.stonesSpent} 枚，得修为 ${preview.gain} 点。`;
            } else {
                ctx.elements.trainCostText.textContent = '一枚灵石，可换 10 点修为。眼下这一批灵石不够，闭关暂且按住。';
            }

            ctx.elements.trainingBatchButtons.forEach((button) => {
                button.classList.toggle('active', button.dataset.trainBatch === ctx.selectedTrainBatch);
            });

            ctx.elements.locationTitle.textContent = location.name;
            ctx.elements.locationDesc.textContent = location.description;
            ctx.elements.combatPreview.textContent = ctx.combatState
                ? `正与 ${ctx.combatState.monster.name} 缠斗，已过第 ${ctx.combatState.round} 回。`
                : getLatestExpeditionSummary(ctx);

            const routeItems = ctx.GameCore.getRouteSummary(ctx.gameState);
            ctx.elements.routeSummary.innerHTML = routeItems.map((item) => `
                <article class="route-pill">
                    <strong>${item.title}</strong>
                    <p>${item.detail}</p>
                </article>
            `).join('');

            ctx.elements.logDrawerCard.classList.toggle('collapsed', !!ctx.gameState.ui.logCollapsed);
            ctx.elements.logContainer.innerHTML = ctx.gameState.logs.length > 0
                ? ctx.gameState.logs.slice(0, 24).map((entry) => `<div class="log-entry ${entry.type}">${entry.message}</div>`).join('')
                : '<div class="log-entry">行路簿上还未落字，先去把第一段缘起走出来。</div>';
        }

        function getSideQuestStateMeta(state) {
            const metaMap = {
                available: { label: '可应旧事', tone: 'available' },
                active: { label: '进行中', tone: 'active' },
                completed: { label: '已了结', tone: 'completed' },
                failed: { label: '已失手', tone: 'failed' },
                missed: { label: '已错过', tone: 'missed' },
            };
            return metaMap[state] || { label: '线索', tone: 'legacy' };
        }

        function formatSideQuestCosts(ctx, costs) {
            if (!costs || typeof costs !== 'object') {
                return '';
            }

            return Object.entries(costs)
                .filter(([, amount]) => amount > 0)
                .map(([itemId, amount]) => {
                    const itemName = ctx.ITEMS[itemId]?.name || itemId;
                    return `需用 ${itemName} x${amount}`;
                })
                .join(' · ');
        }

        function renderVisibleSideQuestCard(ctx, quest, hasOtherActiveQuest) {
            const stateMeta = getSideQuestStateMeta(quest.state);
            const npcMeta = quest.npc ? `<span class="side-story-badge">${quest.npc}</span>` : '';
            const categoryMeta = quest.category ? `<span class="side-story-badge">${quest.category}</span>` : '';
            const rewardLine = quest.rewardPreview ? `<div class="side-story-note"><strong>可得</strong><span>${quest.rewardPreview}</span></div>` : '';

            if (quest.state === 'available') {
                const disabled = hasOtherActiveQuest ? 'disabled' : '';
                const buttonText = hasOtherActiveQuest ? '另有旧事未了' : '应下这桩旧事';
                return `
                    <article class="side-story-item side-story-item--quest" data-side-quest-id="${quest.id}" data-side-quest-state="${quest.state}">
                        <div class="side-story-head">
                            <div><strong>${quest.title}</strong><p>${quest.detail}</p></div>
                            <span class="side-story-status side-story-status--${stateMeta.tone}">${stateMeta.label}</span>
                        </div>
                        <div class="side-story-meta-row">${categoryMeta}${npcMeta}</div>
                        ${rewardLine}
                        <div class="side-quest-actions">
                            <button class="side-quest-btn" data-side-quest-action="accept" data-side-quest-target-id="${quest.id}" type="button" ${disabled}>${buttonText}</button>
                        </div>
                    </article>
                `;
            }

            if (quest.state === 'active') {
                const choices = Array.isArray(quest.choices) ? quest.choices : [];
                return `
                    <article class="side-story-item side-story-item--quest" data-side-quest-id="${quest.id}" data-side-quest-state="${quest.state}">
                        <div class="side-story-head">
                            <div><strong>${quest.title}</strong><p>${quest.detail}</p></div>
                            <span class="side-story-status side-story-status--${stateMeta.tone}">${stateMeta.label}</span>
                        </div>
                        <div class="side-story-meta-row">${categoryMeta}${npcMeta}</div>
                        ${rewardLine}
                        <div class="side-quest-choices">
                            ${choices.map((choice) => {
                                const costText = formatSideQuestCosts(ctx, choice.costs);
                                return `
                                    <button class="side-quest-btn side-quest-btn--choice" data-side-quest-choice-id="${choice.id}" data-side-quest-target-id="${quest.id}" type="button">
                                        <span class="side-quest-choice-title">${choice.text}</span>
                                        ${costText ? `<span class="side-quest-choice-cost">${costText}</span>` : ''}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </article>
                `;
            }

            const result = quest.lastResult || {};
            const resultDetail = result.detail ? `<div class="side-story-note"><span>${result.detail}</span></div>` : '';
            const settlementLine = quest.state === 'completed' ? '<div class="side-story-note"><strong>结果</strong><span>这一桩已结算清楚</span></div>' : '';

            return `
                <article class="side-story-item side-story-item--quest" data-side-quest-id="${quest.id}" data-side-quest-state="${quest.state}">
                    <div class="side-story-head">
                        <div><strong>${quest.title}</strong><p>${result.summary || quest.detail}</p></div>
                        <span class="side-story-status side-story-status--${stateMeta.tone}">${stateMeta.label}</span>
                    </div>
                    <div class="side-story-meta-row">${categoryMeta}${npcMeta}</div>
                    ${settlementLine}
                    ${resultDetail}
                </article>
            `;
        }

        function renderLegacySideStoryCard(item) {
            const npcMeta = item.npc ? `<span class="side-story-badge">${item.npc}</span>` : '';
            return `
                <article class="side-story-item side-story-item--legacy">
                    <div class="side-story-head">
                        <div><strong>${item.title}</strong><p>${item.detail}</p></div>
                        <span class="side-story-status side-story-status--legacy">旧事线索</span>
                    </div>
                    ${npcMeta ? `<div class="side-story-meta-row">${npcMeta}</div>` : ''}
                </article>
            `;
        }

        function renderSideStoryList(ctx) {
            const visibleQuests = ctx.GameCore.getVisibleSideQuests(ctx.gameState);
            const visibleQuestTitles = new Set(visibleQuests.map((quest) => quest.title));
            const activeQuestId = visibleQuests.find((quest) => quest.state === 'active')?.id || null;
            const legacyStories = ctx.GameCore.getAvailableSideStories(ctx.gameState)
                .filter((item) => !visibleQuestTitles.has(item.title));

            const formalCards = visibleQuests.map((quest) => renderVisibleSideQuestCard(ctx, quest, Boolean(activeQuestId && activeQuestId !== quest.id)));
            const legacyCards = legacyStories.map((item) => renderLegacySideStoryCard(item));
            const cards = [...formalCards, ...legacyCards];

            ctx.elements.sideStoryList.innerHTML = cards.length > 0
                ? cards.join('')
                : '<article class="side-story-item side-story-item--legacy"><strong>暂无旧事上门</strong><p>风声暂歇，先把脚下这段路走深一些。</p></article>';
        }

        function renderStoryPage(ctx) {
            const view = ctx.GameCore.getStoryView(ctx.gameState);
            const echoes = ctx.GameCore.getEchoes(ctx.gameState);
            const location = ctx.GameCore.getLocationMeta(ctx.gameState);
            ctx.elements.storyPressure.innerHTML = `<strong>失败压力</strong><p>${ctx.GameCore.getPressureStatusText(ctx.gameState)}</p>`;
            ctx.elements.storyEndingChain.style.display = 'none';
            ctx.elements.storyEndingChain.innerHTML = '';
            ctx.elements.echoList.innerHTML = echoes.map((item) => `
                <article class="echo-item"><strong>${item.title}</strong><p>${item.detail}</p>${item.meta ? `<div class="echo-meta">${item.meta}</div>` : ''}</article>
            `).join('');
            ctx.elements.storyGoal.textContent = ctx.GameCore.getNextGoalText(ctx.gameState);

            ctx.elements.locationNpcs.innerHTML = location.npcs.length > 0
                ? location.npcs.map((npcName) => {
                    const dialogue = ctx.GameCore.getNpcDialogue(ctx.gameState, npcName);
                    const relation = ctx.gameState.npcRelations[npcName] || 0;
                    return `<button class="npc-btn" data-npc-name="${npcName}" type="button"><strong>${dialogue.name}</strong><span>${dialogue.title} · 关系 ${relation}</span></button>`;
                }).join('')
                : '<div class="side-story-item">此地眼下没有可主动攀谈的人。</div>';
            renderSideStoryList(ctx);

            if (!view) {
                const blockedMainStoryHint = ctx.GameCore.getBlockedMainStoryHint(ctx.gameState);
                ctx.elements.storyTitle.textContent = '前路未启';
                ctx.elements.storyMeta.textContent = '且候风声';
                ctx.elements.storySummary.textContent = blockedMainStoryHint || '眼下还没有新的篇章落到眼前，且先修行，或再去尘世走一遭。';
                ctx.elements.storyProgress.textContent = blockedMainStoryHint ? '主线待启' : '还无新章';
                ctx.elements.storySpeaker.textContent = blockedMainStoryHint ? '指引' : '旁白';
                ctx.elements.storyLine.textContent = blockedMainStoryHint || '前路一时无声。';
                ctx.elements.storyChoices.innerHTML = '';
                ctx.elements.storyContinueBtn.disabled = true;
                ctx.elements.storySkipBtn.disabled = true;
                ctx.elements.storyContinueBtn.textContent = '下一页';
                ctx.elements.storySkipBtn.textContent = '跳至抉择';
                return;
            }

            if (view.mode === 'ending') {
                ctx.elements.storyTitle.textContent = view.ending.title;
                ctx.elements.storyMeta.textContent = '终局';
                ctx.elements.storySummary.textContent = view.ending.description;
                ctx.elements.storyProgress.textContent = '终局';
                ctx.elements.storySpeaker.textContent = '尾声';
                ctx.elements.storyLine.textContent = '这一程走到这里，便算收住了。';
                if (Array.isArray(view.ending.recapLines) && view.ending.recapLines.length > 0) {
                    ctx.elements.storyEndingChain.style.display = 'block';
                    ctx.elements.storyEndingChain.innerHTML = `<strong>${view.ending.recapTitle || '关键承诺链'}</strong><p>${view.ending.recapLines.join('；')}</p>`;
                }
                ctx.elements.storyChoices.innerHTML = `
                    <button class="story-choice-btn" data-ending-action="reset" type="button">重新开始另一条路</button>
                    <button class="story-choice-btn" data-ending-action="export" type="button">导出当前结局存档</button>
                `;
                ctx.elements.storyContinueBtn.disabled = true;
                ctx.elements.storySkipBtn.disabled = true;
                ctx.elements.storyContinueBtn.textContent = '下一页';
                ctx.elements.storySkipBtn.textContent = '跳至抉择';
                return;
            }

            const isLevelStory = view.source === 'level';
            const sourceLabel = isLevelStory
                ? '小境界事件'
                : view.chapter.chapterLabel || (typeof view.chapter.id === 'number' ? `第 ${view.chapter.id + 1} 章` : '主线章节');
            const chapterTitle = isLevelStory ? view.chapter.title : (view.chapter.volumeChapterTitle || view.chapter.title);
            const realmLabel = isLevelStory ? ` · ${ctx.GameCore.getRealmLabel(ctx.gameState)}` : '';
            const totalPages = view.story.beats.length;
            const currentPage = Math.min(totalPages, ctx.gameState.storyCursor.beatIndex + 1);

            ctx.elements.storyTitle.textContent = `${sourceLabel} · ${chapterTitle}`;
            ctx.elements.storyMeta.textContent = `${isLevelStory ? '悟境' : '主线'}${realmLabel}`;
            ctx.elements.storySummary.textContent = isLevelStory
                ? `${view.chapter.summary} 这一念会直接牵动你的道心、手头资源或后面的人情。`
                : view.chapter.summary;
            ctx.elements.storyProgress.textContent = view.mode === 'choices'
                ? `第 ${totalPages} / ${totalPages} 页 · 抉择`
                : `第 ${currentPage} / ${totalPages} 页`;

            if (view.currentBeat) {
                ctx.elements.storySpeaker.textContent = view.currentBeat.speaker;
                ctx.elements.storyLine.textContent = view.currentBeat.text;
            }

            ctx.elements.storyContinueBtn.disabled = view.mode === 'choices';
            ctx.elements.storySkipBtn.disabled = view.mode === 'choices';
            ctx.elements.storyContinueBtn.textContent = view.mode === 'choices' ? '等待抉择' : '下一页';
            ctx.elements.storySkipBtn.textContent = '跳至抉择';

            ctx.elements.storyChoices.innerHTML = view.choices.map((choice) => `
                <button class="story-choice-btn" data-choice-id="${choice.id}" type="button" ${choice.disabled ? 'disabled' : ''}>
                    <span class="choice-title">${choice.text}</span>
                    <div class="choice-tags">
                        <span class="choice-tag">${choice.promiseLabel || '承诺未定'}</span>
                        <span class="choice-tag risk-${choice.riskTier || 'steady'}">${choice.riskLabel || '稳妥'}</span>
                    </div>
                    <span class="choice-cost">${choice.visibleCostLabel || (choice.costs ? `消耗：${ctx.GameCore.formatCosts(choice.costs)}` : '此举代价：往后总有回身来认的时候')}</span>
                    ${choice.disabledReason ? `<span class="choice-disabled-reason">${choice.disabledReason}</span>` : ''}
                </button>
            `).join('');
        }

        function renderAlchemyPage(ctx) {
            const recipes = ctx.GameCore.getAlchemyRecipes(ctx.gameState);
            const actualRate = ctx.GameCore.getBreakthroughActualRate(ctx.gameState);
            const currentRecoveryCapHp = getNaturalRecoveryCapHp(ctx);
            const categoryLabels = { recovery: '疗伤丹', cultivation: '修为丹', breakthrough: '破关丹' };

            ctx.elements.alchemySummary.innerHTML = `
                <article class="alchemy-metric"><span>当前气血</span><strong>${ctx.gameState.playerStats.hp} / ${ctx.gameState.playerStats.maxHp}</strong></article>
                <article class="alchemy-metric"><span>调息可回至</span><strong>${currentRecoveryCapHp} / ${ctx.gameState.playerStats.maxHp}</strong></article>
                <article class="alchemy-metric"><span>此刻突破率</span><strong>${Math.round(actualRate * 100)}%</strong></article>
                <article class="alchemy-metric"><span>护持药力</span><strong>${ctx.gameState.breakthroughBonus > 0 ? `+${Math.round(ctx.gameState.breakthroughBonus * 100)}%` : '无'}</strong></article>
            `;
            ctx.elements.alchemyRuleText.textContent = ctx.combatState
                ? '战斗中丹炉封闭，需先脱战后再开炉。'
                : getNaturalRecoveryRuleText(ctx);
            ctx.elements.alchemyList.innerHTML = recipes.map((recipe) => `
                <article class="alchemy-recipe">
                    <div class="alchemy-head"><div><strong>${recipe.name}</strong><span>${categoryLabels[recipe.category] || '丹方'}</span></div><span class="alchemy-output">${recipe.outputText}</span></div>
                    <p>${recipe.summary}</p>
                    <div class="alchemy-meta">
                        <div class="alchemy-line"><span>丹材</span><strong>${recipe.costText}</strong></div>
                        <div class="alchemy-line"><span>成丹</span><strong>${recipe.outputText}</strong></div>
                    </div>
                    <div class="alchemy-reason ${recipe.canCraft ? 'ready' : 'blocked'}">${recipe.canCraft ? '丹材已齐，此刻便可开炉。' : recipe.disabledReason}</div>
                    <button class="inventory-use-btn alchemy-craft-btn" data-craft-recipe-id="${recipe.id}" type="button" ${recipe.canCraft ? '' : 'disabled'}>开炉炼制</button>
                </article>
            `).join('');
        }

        function renderInventory(ctx) {
            const itemIds = Object.keys(ctx.gameState.inventory);
            if (itemIds.length === 0) {
                ctx.elements.inventoryList.innerHTML = '<div class="inventory-item"><strong>储物袋里还空着</strong><p>去外头走一遭，把该带回来的东西带回来。</p></div>';
                return;
            }

            ctx.elements.inventoryList.innerHTML = itemIds.map((itemId) => {
                const item = ctx.ITEMS[itemId] || { name: itemId, description: '来路不明，眼下还辨不出底细。' };
                const quantity = ctx.gameState.inventory[itemId];
                const actions = ctx.GameCore.getItemActions(itemId);
                const actionButtons = actions.map((action) => `
                    <button class="inventory-use-btn" data-item-id="${itemId}" data-item-action="${action.id}" ${action.id === 'use' ? `data-use-item="${itemId}"` : ''} type="button" ${ctx.combatState ? 'disabled' : ''}>${action.label}</button>
                `).join('');
                const tags = [...actions.map((action) => `<span class="inventory-tag inventory-tag-action">${action.label}</span>`), ...(item.passiveSummary ? ['<span class="inventory-tag inventory-tag-passive">持有生效</span>'] : [])].join('');
                const summaries = [...actions.map((action) => `<div class="inventory-effect-line">${action.summary || action.label}</div>`), ...(item.passiveSummary ? [`<div class="inventory-effect-line inventory-passive-summary">${item.passiveSummary}</div>`] : [])].join('');
                return `
                    <article class="inventory-item">
                        <div class="inventory-head"><strong>${item.name}</strong><span>x${quantity}</span></div>
                        <p>${item.description}</p>
                        ${tags ? `<div class="inventory-tags">${tags}</div>` : ''}
                        ${summaries ? `<div class="inventory-effect-list">${summaries}</div>` : ''}
                        ${actionButtons ? `<div class="inventory-actions">${actionButtons}</div>` : ''}
                    </article>
                `;
            }).join('');
        }

        function renderSettings(ctx) {
            ctx.elements.audioToggle.checked = !!ctx.gameState.settings.audioEnabled;
            ctx.elements.musicToggle.checked = !!ctx.gameState.settings.musicEnabled;
        }

        function renderCombat(ctx) {
            if (!ctx.combatState) {
                deps.hideModal(ctx.elements.combatModal);
                ctx.elements.combatLog.innerHTML = '';
                return;
            }

            deps.showModal(ctx.elements.combatModal);
            ctx.elements.combatTitle.textContent = `遭遇 ${ctx.combatState.monster.name}`;
            ctx.elements.monsterName.textContent = ctx.combatState.monster.name;
            ctx.elements.playerHpFill.style.width = `${(ctx.gameState.playerStats.hp / ctx.gameState.playerStats.maxHp) * 100}%`;
            ctx.elements.playerHpText.textContent = `${ctx.gameState.playerStats.hp} / ${ctx.gameState.playerStats.maxHp}`;
            ctx.elements.monsterHpFill.style.width = `${(ctx.combatState.monster.hp / ctx.combatState.monster.maxHp) * 100}%`;
            ctx.elements.monsterHpText.textContent = `${ctx.combatState.monster.hp} / ${ctx.combatState.monster.maxHp}`;
        }

        function render(ctx) {
            ctx.GameCore.syncUnreadStoryState(ctx.gameState);
            renderStatus(ctx);
            renderCultivationPage(ctx);
            renderAlchemyPage(ctx);
            renderStoryPage(ctx);
            renderInventory(ctx);
            renderSettings(ctx);
            renderCombat(ctx);
            renderTabs(ctx);
        }

        function showFloatingText(ctx, text, type) {
            if (!ctx.elements.floatingContainer) {
                return;
            }
            const span = document.createElement('span');
            span.className = `floating-text ${type}`;
            span.textContent = text;
            span.style.left = `${50 + ((Math.random() - 0.5) * 40)}%`;
            ctx.elements.floatingContainer.appendChild(span);
            window.setTimeout(() => {
                span.remove();
            }, 1300);
        }

        return {
            getNaturalRecoveryRuleText,
            getNaturalRecoveryCapHp,
            getLatestExpeditionSummary,
            getCultivationActionState,
            renderStatus,
            renderTabs,
            renderCultivationPage,
            renderStoryPage,
            renderAlchemyPage,
            renderInventory,
            renderSettings,
            renderCombat,
            render,
            showFloatingText,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createUiRenderersModule = createUiRenderersModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
