// practicePopup.js
let currentWords = [];

async function displayPracticeWords(searchQuery = '') {
    const words = await PracticeManager.searchWords(searchQuery);
    currentWords = words;
    const wordsListElement = document.getElementById('wordsList');
    
    if (words.length === 0) {
        wordsListElement.innerHTML = `
            <div class="no-words">
                ${searchQuery ? 'No matching English words found.' : 'No words added to practice yet.'}
            </div>`;
        return;
    }

    wordsListElement.innerHTML = words.map(word => `
        <div class="word-item">
            <div class="word-details">
                <div class="word-text">${word.word}</div>
                <div class="word-translation">${word.translation}</div>
                <div class="date-added">
                    Added: ${new Date(word.dateAdded).toLocaleDateString()}
                </div>
            </div>
            <button class="remove-button" data-word="${word.word}">Delete</button>
        </div>
    `).join('');

    // Remove button handlers
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', async () => {
            await PracticeManager.removeWord(button.dataset.word);
            displayPracticeWords(document.getElementById('searchInput').value);
        });
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    displayPracticeWords(e.target.value);
});


displayPracticeWords();