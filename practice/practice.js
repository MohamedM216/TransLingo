// practice.js
const PracticeManager = {
    // Key for storing practice words in local storage
    STORAGE_KEY: 'dictionary_practice_words',

    // Add a word to practice list
    async addWord(word, translation, isArabic) {
        try {
            const practiceWords = await this.getPracticeWords();
            
            // Check if word already exists
            if (!practiceWords.some(item => item.word === word)) {
                practiceWords.push({
                    word: word,
                    translation: translation,
                    isArabic: isArabic,
                    dateAdded: new Date().toISOString(),
                    practiced: 0  // Number of times practiced
                });
                
                await this.savePracticeWords(practiceWords);
                return true;
            }
            return false; // Word already exists
        } catch (error) {
            console.error('Error adding word to practice:', error);
            return false;
        }
    },

    // Get all practice words
    async getPracticeWords() {
        return new Promise((resolve) => {
            chrome.storage.local.get(this.STORAGE_KEY, (result) => {
                resolve(result[this.STORAGE_KEY] || []);
            });
        });
    },

    // Save practice words
    async savePracticeWords(words) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: words }, resolve);
        });
    },

    // Remove a word from practice list
    async removeWord(word) {
        const practiceWords = await this.getPracticeWords();
        const updatedWords = practiceWords.filter(item => item.word !== word);
        await this.savePracticeWords(updatedWords);
    }
};

window.PracticeManager = PracticeManager;