// Track mouse position
document.addEventListener('mousemove', (e) => {
  window.mouseX = e.clientX;
  window.mouseY = e.clientY;
});

// Function to detect if text is Arabic
function isArabic(text) {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
}

// Double-click event listener
document.addEventListener('dblclick', async (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
      try {
          const isArabicText = isArabic(selectedText);
          if (isArabicText) {
              try {
                  const englishText = await fetchTranslationWithCache(selectedText, true);
                  try {
                      const definitionData = await fetchDefinitionWithCache(englishText);
                      showPopup(selectedText, englishText, definitionData, window.mouseX, window.mouseY, true);
                  } catch (defError) {
                      showPopup(selectedText, englishText, null, window.mouseX, window.mouseY, true);
                  }
              } catch (error) {
                  throw new Error('Translation failed');
              }
          } else {
              try {
                  const [definitionData, translation] = await Promise.all([
                      fetchDefinitionWithCache(selectedText),
                      fetchTranslationWithCache(selectedText, false)
                  ]);
                  showPopup(selectedText, translation, definitionData, window.mouseX, window.mouseY, false);
              } catch (error) {
                  showPopup(selectedText, 'الترجمة غير متوفرة', null, window.mouseX, window.mouseY, false);
              }
          }
      } catch (error) {
          console.error('Error:', error);
          const translation = isArabic(selectedText) ? 'Translation error' : 'خطأ في الترجمة';
          showPopup(selectedText, translation, null, window.mouseX, window.mouseY, isArabic(selectedText));
      }
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_DEFINITION") {
      const mouseX = window.mouseX || window.innerWidth / 2;
      const mouseY = window.mouseY || window.innerHeight / 2;
      showPopup(
          message.originalText,
          message.translation,
          message.data,
          mouseX,
          mouseY,
          message.isArabic
      );
  }
});

// Function to fetch translation with caching
async function fetchTranslationWithCache(text, isArabicText) {
  const sourceLang = isArabicText ? 'ar' : 'en';
  const targetLang = isArabicText ? 'en' : 'ar';
  
  // Check cache first
  const cacheKey = DictionaryCache.createKey('translation', text, sourceLang, targetLang);
  const cachedTranslation = await DictionaryCache.get(cacheKey);
  
  if (cachedTranslation) {
      return cachedTranslation;
  }

  // If not in cache, fetch from API
  const encodedText = encodeURIComponent(text);
  const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLang}`;
  
  try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData.translatedText) {
          const translation = data.responseData.translatedText;
          // Store in cache before returning
          await DictionaryCache.set(cacheKey, translation);
          return translation;
      }
      throw new Error('Translation failed');
  } catch (error) {
      console.error('Translation error:', error);
      return isArabicText ? 'Translation not available' : 'الترجمة غير متوفرة';
  }
}

// Function to fetch definition with caching
async function fetchDefinitionWithCache(word) {
  // Check cache first
  const cacheKey = DictionaryCache.createKey('definition', word, 'en', 'en');
  const cachedDefinition = await DictionaryCache.get(cacheKey);
  
  if (cachedDefinition) {
      return cachedDefinition;
  }

  // If not in cache, fetch from API
  try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      
      // Store in cache before returning
      await DictionaryCache.set(cacheKey, data);
      return data;
  } catch (error) {
      console.error('Error fetching definition:', error);
      throw new Error('Unable to fetch definition. Please try again later.');
  }
}

// Function to show the popup
async function showPopup(originalText, translation, definition, x, y, isArabicText) {
  const existingPopup = document.getElementById('dictionary-popup');
  if (existingPopup) {
      existingPopup.remove();
  }

  const popupContainer = document.createElement('div');
  popupContainer.id = 'dictionary-popup';
  popupContainer.style.position = 'fixed';
  popupContainer.style.zIndex = '10000';

  const shadowRoot = popupContainer.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
      .dict-popup {
          background: white;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 300px;
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.5;
      }
      .dict-popup h3 {
          margin: 0 0 10px;
          font-size: 18px;
          color: #1a73e8;
          direction: ${isArabicText ? 'rtl' : 'ltr'};
          text-align: ${isArabicText ? 'right' : 'left'};
      }
      .translation {
          font-size: 16px;
          color: #2e7d32;
          margin: 10px 0;
          text-align: ${isArabicText ? 'left' : 'right'};
          direction: ${isArabicText ? 'ltr' : 'rtl'};
          font-family: 'Arial', sans-serif;
      }
      .examples {
          font-size: 13px;
          color: #666;
          font-style: italic;
          margin-top: 8px;
          direction: ltr;
          text-align: left;
      }
      .example-item {
          margin-bottom: 5px;
          padding-left: 10px;
          border-left: 2px solid #1a73e8;
      }
      .drag-handle {
          cursor: move;
          padding: 5px;
          background: #f1f1f1;
          border-bottom: 1px solid #ddd;
          border-radius: 8px 8px 0 0;
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
      }
      .practice-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
          font-size: 12px;
          transition: background-color 0.2s;
      }
      .practice-button:hover {
          background-color: #1557b0;
      }
      .practice-button.added {
          background-color: #34a853;
          cursor: default;
      }
      .practice-button.disabled {
          background-color: #ccc;
          cursor: not-allowed;
      }
      .button-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-top: 10px;
      }
      .notification {
          font-size: 11px;
          color: #d32f2f;
          margin-top: 4px;
      }
  `;
  shadowRoot.appendChild(style);

  const popup = document.createElement('div');
  popup.className = 'dict-popup';

  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = isArabicText ? 'اسحب هنا' : 'Drag me';
  dragHandle.setAttribute('unselectable', 'on');
  popup.appendChild(dragHandle);

  let content = `
      <h3>${originalText}</h3>
      <div class="translation">${translation}</div>
  `;

  if (definition && definition[0] && definition[0].meanings) {
      let examples = [];
      for (const meaning of definition[0].meanings) {
          for (const def of meaning.definitions) {
              if (def.example && examples.length < 2) {
                  examples.push(def.example);
              }
              if (examples.length === 2) break;
          }
          if (examples.length === 2) break;
      }

      if (examples.length > 0) {
          content += `
              <div class="examples">
                  ${examples.map(example => `
                      <div class="example-item">${example}</div>
                  `).join('')}
              </div>
          `;
      }
  }

  // Add practice button only for English words
  if (!isArabicText) {
      const isInPractice = await PracticeManager.isWordInPractice(originalText);
      content += `
          <div class="button-container">
              ${isInPractice ? 
                  `<button class="practice-button added" disabled>Already in Practice</button>
                   <div class="notification">This word is already in your practice list</div>` :
                  `<button class="practice-button" id="addToPractice">Add to Practice</button>`
              }
          </div>
      `;
  }

  popup.innerHTML += content;

  // Add click handler for the practice button
  const practiceButton = popup.querySelector('#addToPractice');
  if (practiceButton) {
      practiceButton.addEventListener('click', async () => {
          const result = await PracticeManager.addWord(originalText, translation, false);
          if (result.success) {
              practiceButton.textContent = 'Added to Practice';
              practiceButton.classList.add('added');
              practiceButton.disabled = true;
          } else {
              const notification = document.createElement('div');
              notification.className = 'notification';
              notification.textContent = result.message;
              practiceButton.parentNode.appendChild(notification);
          }
      });
  }

  shadowRoot.appendChild(popup);

  const popupWidth = 300;
  const popupHeight = 200;
  const adjustedPosition = adjustPopupPosition(x, y, popupWidth, popupHeight);
  popupContainer.style.left = `${adjustedPosition.x}px`;
  popupContainer.style.top = `${adjustedPosition.y}px`;

  document.body.appendChild(popupContainer);

  document.addEventListener('click', function closePopup(e) {
      if (!popupContainer.contains(e.target)) {
          popupContainer.remove();
          document.removeEventListener('click', closePopup);
      }
  });

  enableDrag(popupContainer, dragHandle);
}

// Function to adjust the popup position
function adjustPopupPosition(x, y, popupWidth, popupHeight) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (x + popupWidth > viewportWidth) {
      x = viewportWidth - popupWidth - 10;
  }
  if (y + popupHeight > viewportHeight) {
      y = viewportHeight - popupHeight - 10;
  }

  return { x, y };
}

// Function to enable dragging of the popup
function enableDrag(element, dragHandle) {
  let isDragging = false;
  let offsetX, offsetY;

  const actualDragHandle = element.shadowRoot.querySelector('.drag-handle');

  const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
  };

  const onMouseMove = (e) => {
      if (isDragging) {
          e.preventDefault();
          const x = e.clientX - offsetX;
          const y = e.clientY - offsetY;
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
      }
  };

  const onMouseUp = (e) => {
      if (isDragging) {
          e.preventDefault();
          isDragging = false;
      }
  };

  actualDragHandle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  actualDragHandle.style.userSelect = 'none';
  actualDragHandle.style.webkitUserSelect = 'none';
  actualDragHandle.style.msUserSelect = 'none';
}