const tabSelectorMap = {
    cultivation: '[data-tab="cultivation"]',
    alchemy: '[data-tab="alchemy"]',
    story: '[data-tab="story"]',
    inventory: '[data-action="inventory"]',
    settings: '[data-action="settings"]',
};

const modalCloseSelectorMap = {
    'inventory-modal': '#close-inventory',
    'settings-modal': '#close-settings',
    'dialogue-modal': '#close-dialogue',
    'confirm-modal': '#cancel-reset',
};

const modalBodySelectorMap = {
    'inventory-modal': '#inventory-modal .modal-panel',
    'settings-modal': '#settings-modal .modal-panel',
    'dialogue-modal': '#dialogue-modal .dialogue-text',
    'combat-modal': '#combat-modal .combat-log',
    'confirm-modal': '#confirm-modal .modal-panel',
};

module.exports = {
    status: {
        playerName: '#player-name',
        realm: '#summary-realm-display',
        cultivation: '#summary-cultivation-display',
        lingshi: '#summary-lingshi-display',
        activePage: '.page.active',
    },
    tabs: {
        ...tabSelectorMap,
    },
    nav: {
        tabList: '.bottom-nav',
        tab: (tabId) => tabSelectorMap[tabId] || `[data-tab="${tabId}"], [data-action="${tabId}"]`,
        storyBadge: '#story-badge',
    },
    pages: {
        cultivation: '.page[data-page="cultivation"]',
        alchemy: '.page[data-page="alchemy"]',
        story: '.page[data-page="story"]',
    },
    cultivation: {
        mainButton: '#main-btn',
        adventureButton: '#adventure-btn',
        hint: '#hint-text',
        rate: '#breakthrough-inline',
        trainCost: '#train-cost-text',
        batchButton: (batchKey) => `[data-train-batch="${batchKey}"]`,
    },
    story: {
        title: '#story-title',
        line: '#story-line',
        progress: '#story-progress',
        continueButton: '#story-continue-btn',
        skipButton: '#story-skip-btn',
        choices: '#story-choices',
        choiceButtons: '#story-choices .story-choice-btn',
        choice: (choiceId) => `#story-choices [data-choice-id="${choiceId}"]`,
        pressure: '#story-pressure',
        endingChain: '#story-ending-chain',
        goal: '#story-goal',
        echoList: '#echo-list',
    },
    alchemy: {
        summary: '#alchemy-summary',
        ruleText: '#alchemy-rule-text',
        list: '#alchemy-list',
        craftButton: (recipeId) => `[data-craft-recipe-id="${recipeId}"]`,
    },
    journey: {
        preview: '#combat-preview',
        locationTitle: '#location-title',
        locationDesc: '#location-desc',
        npcs: '#location-npcs',
        clues: '#side-story-list',
    },
    inventory: {
        modal: '#inventory-modal',
        closeButton: '#close-inventory',
        list: '#inventory-list',
        useButton: (itemId) => `[data-use-item="${itemId}"]`,
        actionButton: (itemId, actionId) => `[data-item-id="${itemId}"][data-item-action="${actionId}"]`,
        anyActionButton: (itemId) => `[data-item-id="${itemId}"][data-item-action]`,
    },
    settings: {
        modal: '#settings-modal',
        closeButton: '#close-settings',
        audioToggle: '#audio-toggle',
        musicToggle: '#music-toggle',
        exportButton: '#export-btn',
        importButton: '#import-btn',
        resetButton: '#reset-btn',
        confirmResetButton: '#confirm-reset',
        cancelResetButton: '#cancel-reset',
        saveModeNote: '#save-mode-note',
    },
    combat: {
        modal: '#combat-modal',
        title: '#combat-title',
        log: '#combat-log',
    },
    modal: {
        body: (modalId) => modalBodySelectorMap[modalId] || `#${modalId} .modal-panel`,
        close: (modalId) => modalCloseSelectorMap[modalId] || `#${modalId} .icon-btn`,
    },
};
