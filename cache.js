// cache.js
const Cache = {
    // Cache duration in milliseconds (24 hours)
    CACHE_DURATION: 24 * 60 * 60 * 1000,

    async set(key, value) {
        const item = {
            value: value,
            timestamp: Date.now()
        };
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: item }, () => resolve());
        });
    },

    async get(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get(key, (result) => {
                const item = result[key];
                if (!item) {
                    resolve(null);
                    return;
                }

                // Check if cache has expired
                if (Date.now() - item.timestamp > this.CACHE_DURATION) {
                    this.remove(key);
                    resolve(null);
                    return;
                }

                resolve(item.value);
            });
        });
    },

    async remove(key) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(key, () => resolve());
        });
    },

    createKey(type, text, sourceLang, targetLang) {
        return `${type}_${text}_${sourceLang}_${targetLang}`.toLowerCase();
    }
};

window.DictionaryCache = Cache;