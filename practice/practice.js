// practice.js
const PracticeManager = {
    STORAGE_KEY: 'dictionary_practice_words',

    async addWord(word, translation, isArabic) {
        // Only allow English words
        if (isArabic) {
            return { success: false, message: 'Only English words can be added to practice' };
        }

        try {
            const practiceWords = await this.getPracticeWords();
            if (!practiceWords.some(item => item.word.toLowerCase() === word.toLowerCase())) {
                practiceWords.push({
                    word: word,
                    translation: translation,
                    dateAdded: new Date().toISOString(),
                    practiced: 0
                });
                await this.savePracticeWords(practiceWords);
                return { success: true, message: 'Word added to practice' };
            }
            return { success: false, message: 'Word already exists in practice list' };
        } catch (error) {
            console.error('Error adding word to practice:', error);
            return { success: false, message: 'Error adding word' };
        }
    },

    async isWordInPractice(word) {
        const practiceWords = await this.getPracticeWords();
        return practiceWords.some(item => item.word.toLowerCase() === word.toLowerCase());
    },

    async getPracticeWords() {
        return new Promise((resolve) => {
            chrome.storage.local.get(this.STORAGE_KEY, (result) => {
                resolve(result[this.STORAGE_KEY] || []);
            });
        });
    },

    async savePracticeWords(words) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: words }, resolve);
        });
    },

    async removeWord(word) {
        const practiceWords = await this.getPracticeWords();
        const updatedWords = practiceWords.filter(item => item.word !== word);
        await this.savePracticeWords(updatedWords);
    },

    async searchWords(query) {
        const practiceWords = await this.getPracticeWords();
        if (!query) return practiceWords;
        
        // Search only in English words
        return practiceWords.filter(item => 
            item.word.toLowerCase().includes(query.toLowerCase())
        );
    }
};

window.PracticeManager = PracticeManager;