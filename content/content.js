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
              // For Arabic text, get English translation
              const translationUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=ar|en`;
              const translationResponse = await fetch(translationUrl);
              const translationData = await translationResponse.json();
              
              if (translationData.responseStatus === 200) {
                  const englishText = translationData.responseData.translatedText;
                  try {
                      const definitionResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(englishText)}`);
                      const definitionData = await definitionResponse.json();
                      showPopup(selectedText, englishText, definitionData, window.mouseX, window.mouseY, true);
                  } catch (defError) {
                      // If definition fetch fails, still show the translation
                      showPopup(selectedText, englishText, null, window.mouseX, window.mouseY, true);
                  }
              } else {
                  throw new Error('Translation failed');
              }
          } else {
              // For English text, get Arabic translation and English definition
              try {
                  const [definitionResponse, translationResponse] = await Promise.all([
                      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(selectedText)}`),
                      fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=en|ar`)
                  ]);

                  const [definitionData, translationData] = await Promise.all([
                      definitionResponse.json(),
                      translationResponse.json()
                  ]);

                  if (translationData.responseStatus === 200) {
                      showPopup(
                          selectedText,
                          translationData.responseData.translatedText,
                          definitionData,
                          window.mouseX,
                          window.mouseY,
                          false
                      );
                  } else {
                      throw new Error('Translation failed');
                  }
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

// Function to show the popup
function showPopup(originalText, translation, definition, x, y, isArabicText) {
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
      .button-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
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

  // Add practice button
  content += `
      <div class="button-container">
          <button class="practice-button" id="addToPractice">
              ${isArabicText ? 'Add to Practice' : 'أضف للتمرين'}
          </button>
      </div>
  `;

  popup.innerHTML += content;

  // Add click handler for the practice button
  const practiceButton = popup.querySelector('#addToPractice');
  practiceButton.addEventListener('click', async () => {
      const added = await PracticeManager.addWord(originalText, translation, isArabicText);
      if (added) {
          practiceButton.textContent = isArabicText ? 'Added!' : 'تمت الإضافة!';
          practiceButton.classList.add('added');
          practiceButton.disabled = true;
      }
  });

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