(function (globalScope) {
    function ensureInternalNamespace() {
        const registry = globalScope.__XIUXIAN_INTERNALS__ || {};
        registry.shared = registry.shared || {};
        registry.core = registry.core || {};
        registry.ui = registry.ui || {};
        globalScope.__XIUXIAN_INTERNALS__ = registry;
        return registry;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    const sharedHelpers = {
        clone,
        ensureInternalNamespace,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sharedHelpers;
    }

    const registry = ensureInternalNamespace();
    registry.shared.helpers = sharedHelpers;
})(typeof window !== 'undefined' ? window : globalThis);
