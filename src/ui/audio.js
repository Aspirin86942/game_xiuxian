(function (globalScope) {
    function createUiAudioModule() {
        function initAudio(ctx) {
            if (ctx.audioContext || !ctx.gameState.settings.audioEnabled) {
                return;
            }

            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                return;
            }
            ctx.audioContext = new Ctx();
        }

        function playTone(ctx, frequency, duration) {
            if (!ctx.gameState.settings.audioEnabled) {
                return;
            }

            initAudio(ctx);
            if (!ctx.audioContext) {
                return;
            }

            const oscillator = ctx.audioContext.createOscillator();
            const gain = ctx.audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.value = 0.03;
            oscillator.connect(gain);
            gain.connect(ctx.audioContext.destination);
            oscillator.start();
            oscillator.stop(ctx.audioContext.currentTime + duration);
        }

        function playSound(ctx, kind) {
            const toneMap = {
                click: [392, 0.08],
                breakthrough: [587, 0.18],
                fail: [220, 0.16],
                story: [440, 0.1],
                victory: [660, 0.22],
            };
            const tone = toneMap[kind];
            if (tone) {
                playTone(ctx, tone[0], tone[1]);
            }
        }

        return {
            initAudio,
            playTone,
            playSound,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createUiAudioModule = createUiAudioModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
