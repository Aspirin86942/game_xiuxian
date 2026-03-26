(function (globalScope) {
    function createDomCacheModule() {
        function cacheElements(ctx) {
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
                ctx.elements[key] = document.getElementById(id);
            });

            ctx.elements.pages = Array.from(document.querySelectorAll('.page'));
            ctx.elements.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
            ctx.elements.trainingBatchButtons = Array.from(document.querySelectorAll('[data-train-batch]'));
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

        return {
            cacheElements,
            showModal,
            hideModal,
        };
    }

    const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
    registry.ui = registry.ui || {};
    registry.ui.createDomCacheModule = createDomCacheModule;
    globalScope.__XIUXIAN_INTERNALS__ = registry;
})(typeof window !== 'undefined' ? window : globalThis);
