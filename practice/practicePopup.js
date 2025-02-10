// practicePopup.js
async function displayPracticeWords() {
    const words = await PracticeManager.getPracticeWords();
    const wordsListElement = document.getElementById('wordsList');
    
    if (words.length === 0) {
        wordsListElement.innerHTML = '<p>No words added to practice yet.</p>';
        return;
    }

    wordsListElement.innerHTML = words.map(word => `
        <div class="word-item">
            <div>
                <strong>${word.word}</strong> - ${word.translation}
                <br>
                <small>Added: ${new Date(word.dateAdded).toLocaleDateString()}</small>
            </div>
            <button class="remove-button" data-word="${word.word}">✕</button>
        </div>
    `).join('');

    // Add remove button handlers
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', async () => {
            await PracticeManager.removeWord(button.dataset.word);
            displayPracticeWords();
        });
    });
}

displayPracticeWords();