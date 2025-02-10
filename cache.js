const Cache = {
    // Cache duration in milliseconds (e.g., 24 hours)
    CACHE_DURATION: 24 * 60 * 60 * 1000,

    async set(key, value) {
        const item = {
            value: value,
            timestamp: Date.now()
        };
        console.log('%cCaching data for key:', 'color: #2196F3; font-weight: bold', key);
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: item }, () => resolve());
        });
    },

    async get(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get(key, (result) => {
                const item = result[key];
                if (!item) {
                    console.log('%cCache miss for key:', 'color: #F44336; font-weight: bold', key);
                    resolve(null);
                    return;
                }

                if (Date.now() - item.timestamp > this.CACHE_DURATION) {
                    console.log('%cCache expired for key:', 'color: #FF9800; font-weight: bold', key);
                    this.remove(key);
                    resolve(null);
                    return;
                }

                console.log('%cCache hit for key:', 'color: #4CAF50; font-weight: bold', key);
                resolve(item.value);
            });
        });
    },

    async remove(key) {
        console.log('%cRemoving cached item:', 'color: #795548; font-weight: bold', key);
        return new Promise((resolve) => {
            chrome.storage.local.remove(key, () => resolve());
        });
    },

    async debug() {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                console.group('Cache Debug Info');
                console.log('All cached items:', items);
                console.log('Cache size:', Object.keys(items).length);
                console.log('Cache age:', this._getOldestItemAge(items));
                console.groupEnd();
                resolve(items);
            });
        });
    },

    _getOldestItemAge(items) {
        let oldest = Date.now();
        Object.values(items).forEach(item => {
            if (item.timestamp < oldest) {
                oldest = item.timestamp;
            }
        });
        return Math.round((Date.now() - oldest) / (1000 * 60 * 60 * 24)) + ' days';
    },

    async clearAll() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                console.log('Cache cleared');
                resolve();
            });
        });
    },

    createKey(type, text, sourceLang, targetLang) {
        return `${type}_${text}_${sourceLang}_${targetLang}`.toLowerCase();
    }
};

window.DictionaryCache = Cache;