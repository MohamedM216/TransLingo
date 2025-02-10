chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "searchWord",
            title: "Look up '%s'",
            contexts: ["selection"]
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "searchWord" && tab && tab.id) {
        try {
            const selectedText = info.selectionText.trim();
            const isArabic = /[\u0600-\u06FF]/.test(selectedText);

            if (isArabic) {
                // For Arabic text, get English translation
                const translationUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=ar|en`;
                const translationResponse = await fetch(translationUrl);
                const translationData = await translationResponse.json();
                
                if (translationData.responseStatus === 200) {
                    const englishText = translationData.responseData.translatedText;
                    const definitionResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(englishText)}`);
                    const definitionData = await definitionResponse.json();
                    
                    chrome.tabs.sendMessage(tab.id, {
                        type: "SHOW_DEFINITION",
                        data: definitionData,
                        originalText: selectedText,
                        translation: englishText,
                        isArabic: true
                    });
                }
            } else {
                // For English text, get Arabic translation and English definition
                const [definitionResponse, translationResponse] = await Promise.all([
                    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(selectedText)}`),
                    fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=en|ar`)
                ]);

                const [definitionData, translationData] = await Promise.all([
                    definitionResponse.json(),
                    translationResponse.json()
                ]);

                chrome.tabs.sendMessage(tab.id, {
                    type: "SHOW_DEFINITION",
                    data: definitionData,
                    originalText: selectedText,
                    translation: translationData.responseData.translatedText,
                    isArabic: false
                });
            }
        } catch (error) {
            console.error('Error:', error);
            chrome.tabs.sendMessage(tab.id, {
                type: "SHOW_ERROR",
                error: "Failed to fetch definition"
            });
        }
    }
});