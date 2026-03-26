(function (globalScope) {
    function createProgressionModule(deps) {
        const {
            CONFIG,
            REALMS,
            constants,
        } = deps.data;
        const {
            TRAINING_GAIN_PER_LINGSHI,
            TRAINING_BATCHES,
        } = constants;

        function getMaxTrainableLingshi(state) {
            const currentLingshi = deps.getInventoryCount(state, 'lingshi');
            const remainingCultivation = Math.max(0, state.maxCultivation - state.cultivation);
            if (remainingCultivation <= 0 || currentLingshi <= 0) {
                return 0;
            }
            return Math.min(currentLingshi, Math.ceil(remainingCultivation / TRAINING_GAIN_PER_LINGSHI));
        }

        function getTrainingPreview(state, batchKey = '1') {
            if (canBreakthrough(state)) {
                return {
                    ok: false,
                    batchKey,
                    stonesSpent: 0,
                    gain: 0,
                    error: '当前修为已满，请先尝试突破。',
                };
            }

            const configuredBatch = TRAINING_BATCHES[batchKey];
            if (configuredBatch === undefined) {
                return {
                    ok: false,
                    batchKey,
                    stonesSpent: 0,
                    gain: 0,
                    error: '未知的闭关批次。',
                };
            }

            const maxTrainableLingshi = getMaxTrainableLingshi(state);
            if (maxTrainableLingshi <= 0) {
                return {
                    ok: false,
                    batchKey,
                    stonesSpent: 0,
                    gain: 0,
                    error: '灵石不足，无法闭关。',
                };
            }

            const requestedBatch = Number.isFinite(configuredBatch)
                ? configuredBatch
                : maxTrainableLingshi;
            const stonesSpent = Math.max(0, Math.min(requestedBatch, maxTrainableLingshi));
            return {
                ok: stonesSpent > 0,
                batchKey,
                stonesSpent,
                gain: stonesSpent * TRAINING_GAIN_PER_LINGSHI,
                remainingCultivation: Math.max(0, state.maxCultivation - state.cultivation),
                error: stonesSpent > 0 ? '' : '灵石不足，无法闭关。',
            };
        }

        function trainWithLingshi(state, batchKey = '1') {
            const preview = getTrainingPreview(state, batchKey);
            if (!preview.ok) {
                return { ok: false, error: preview.error, stonesSpent: 0, gain: 0, batchKey };
            }

            const changed = deps.changeItem(state, 'lingshi', -preview.stonesSpent);
            if (!changed) {
                return { ok: false, error: '灵石不足，无法闭关。', stonesSpent: 0, gain: 0, batchKey };
            }

            state.cultivation = Math.min(state.maxCultivation, state.cultivation + preview.gain);
            deps.pushLog(state, `闭关炼化灵石 ${preview.stonesSpent} 枚，修为 +${preview.gain}`, 'normal');
            return {
                ok: true,
                batchKey,
                stonesSpent: preview.stonesSpent,
                gain: preview.gain,
                cultivation: state.cultivation,
            };
        }

        function canBreakthrough(state) {
            return state.cultivation >= state.maxCultivation;
        }

        function attemptBreakthrough(state, rng) {
            const random = rng || Math.random;
            if (!canBreakthrough(state)) {
                return { ok: false, error: '修为未满。' };
            }

            const atFinalPeak = state.realmIndex === REALMS.length - 1 && state.stageIndex === 2;
            if (atFinalPeak) {
                deps.pushLog(state, '你已站在此界巅峰，接下来该去回答最后那一问。', 'breakthrough');
                deps.ensureStoryCursor(state);
                return { ok: true, success: true, capped: true };
            }

            const actualRate = deps.getBreakthroughActualRate(state);
            const success = random() < actualRate;

            if (success) {
                state.stageIndex += 1;
                if (state.stageIndex >= 3) {
                    state.stageIndex = 0;
                    state.realmIndex = Math.min(state.realmIndex + 1, REALMS.length - 1);
                }
                state.cultivation = 0;
                state.breakthroughBonus = 0;
                deps.recalculateState(state, true);
                deps.pushLog(state, `突破成功，当前境界：${deps.getRealmLabel(state)}`, 'breakthrough');
                deps.queueLevelEventForRealm(state, deps.getRealmScore(state));
                deps.ensureStoryCursor(state);
                return { ok: true, success: true };
            }

            const penalty = Math.floor(state.maxCultivation * CONFIG.failPenaltyRate);
            state.cultivation = Math.max(0, state.cultivation - penalty);
            state.breakthroughBonus = 0;
            deps.pushLog(state, `突破失败，修为受损 ${penalty}`, 'fail');
            return { ok: true, success: false, penalty };
        }

        function touchSaveTimestamp(state, nowMs) {
            const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
            state.offlineTraining = deps.normalizeOfflineTrainingState(state.offlineTraining);
            state.offlineTraining.lastSavedAt = nextNowMs;
            return nextNowMs;
        }

        function resolveOfflineCultivation(state, nowMs) {
            const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
            state.offlineTraining = deps.normalizeOfflineTrainingState(state.offlineTraining);
            const lastSavedAt = state.offlineTraining.lastSavedAt;
            const emptyResult = {
                applied: false,
                gain: 0,
                durationMs: 0,
                effectiveDurationMs: 0,
                wasCapped: false,
            };

            if (!state.autoCultivate || !deps.canAutoCultivate(state) || !Number.isFinite(lastSavedAt)) {
                return emptyResult;
            }

            const durationMs = Math.max(0, nextNowMs - lastSavedAt);
            if (durationMs <= 0) {
                return {
                    ...emptyResult,
                    durationMs,
                };
            }

            const effectiveDurationMs = Math.min(durationMs, deps.getOfflineTrainingCapMs());
            const ticks = Math.floor(effectiveDurationMs / CONFIG.autoCultivateInterval);
            const remainingCultivation = Math.max(0, state.maxCultivation - state.cultivation);
            const gain = Math.min(remainingCultivation, Math.floor(ticks * deps.getAverageAutoCultivationGain()));
            const wasCapped = durationMs > effectiveDurationMs;

            if (gain <= 0) {
                return {
                    ...emptyResult,
                    durationMs,
                    effectiveDurationMs,
                    wasCapped,
                };
            }

            state.cultivation = Math.min(state.maxCultivation, state.cultivation + gain);
            state.offlineTraining.lastSettlementAt = nextNowMs;
            state.offlineTraining.lastDurationMs = durationMs;
            state.offlineTraining.lastEffectiveDurationMs = effectiveDurationMs;
            state.offlineTraining.lastGain = gain;
            state.offlineTraining.wasCapped = wasCapped;
            deps.pushLog(state, `闭关归来，离线吐纳 ${deps.formatOfflineDuration(effectiveDurationMs)}，修为 +${gain}`, 'good');
            if (wasCapped) {
                deps.pushLog(state, `离线收益按 ${Math.floor(deps.getOfflineTrainingCapMs() / (60 * 60 * 1000))} 小时封顶结算。`, 'normal');
            }

            return {
                applied: true,
                gain,
                durationMs,
                effectiveDurationMs,
                wasCapped,
            };
        }

        function resolveNaturalRecovery(state, nowMs) {
            const nextNowMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
            state.recovery = deps.normalizeRecoveryState(state.recovery);

            const intervalMs = Number.isFinite(CONFIG.naturalRecoveryIntervalMs)
                ? Math.max(1, Math.floor(CONFIG.naturalRecoveryIntervalMs))
                : 30000;
            const recoveryRatio = Number.isFinite(CONFIG.naturalRecoveryRatio) ? CONFIG.naturalRecoveryRatio : 0.03;
            const capRatio = Number.isFinite(CONFIG.naturalRecoveryCapRatio) ? CONFIG.naturalRecoveryCapRatio : 0.5;
            const tickGain = Math.max(1, Math.round(state.playerStats.maxHp * recoveryRatio));
            const capHp = Math.max(1, Math.floor(state.playerStats.maxHp * capRatio));
            const emptyResult = {
                applied: false,
                touched: false,
                gain: 0,
                ticks: 0,
                capHp,
                currentHp: state.playerStats.hp,
                lastCheckedAt: state.recovery.lastCheckedAt,
            };

            if (!state.recovery.lastCheckedAt) {
                state.recovery.lastCheckedAt = nextNowMs;
                return {
                    ...emptyResult,
                    touched: true,
                    lastCheckedAt: nextNowMs,
                };
            }

            const elapsedMs = Math.max(0, nextNowMs - state.recovery.lastCheckedAt);
            const ticks = Math.floor(elapsedMs / intervalMs);
            if (ticks <= 0) {
                return emptyResult;
            }

            state.recovery.lastCheckedAt += ticks * intervalMs;
            if (state.playerStats.hp >= capHp) {
                return {
                    ...emptyResult,
                    touched: true,
                    ticks,
                    lastCheckedAt: state.recovery.lastCheckedAt,
                };
            }

            const gain = Math.min(capHp - state.playerStats.hp, ticks * tickGain);
            if (gain <= 0) {
                return {
                    ...emptyResult,
                    touched: true,
                    ticks,
                    lastCheckedAt: state.recovery.lastCheckedAt,
                };
            }

            state.playerStats.hp = Math.min(capHp, state.playerStats.hp + gain);
            return {
                applied: true,
                touched: true,
                gain,
                ticks,
                capHp,
                currentHp: state.playerStats.hp,
                lastCheckedAt: state.recovery.lastCheckedAt,
            };
        }

        return {
            getTrainingPreview,
            trainWithLingshi,
            canBreakthrough,
            attemptBreakthrough,
            touchSaveTimestamp,
            resolveOfflineCultivation,
            resolveNaturalRecovery,
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = createProgressionModule;
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.core = registry.core || {};
    registry.core.createProgressionModule = createProgressionModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
