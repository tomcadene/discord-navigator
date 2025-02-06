// Array to store all matched elements
let matchedElements = [];
let currentIndex = 0;

function clearHighlights() {
  const highlighted = document.querySelectorAll('.discord-search-highlight');
  highlighted.forEach(elem => {
    elem.style.boxShadow = '';
    elem.style.border = '';
    elem.style.borderRadius = '';
    elem.style.backgroundColor = ''; // Remove green background
    elem.classList.remove('discord-search-highlight');
  });
  matchedElements = [];
  currentIndex = 0;
}

function performSearch(query, color, autoScroll, advancedSearch) {
  clearHighlights();
  const serversDiv = document.querySelector('div[aria-label="Servers"]');
  if (!serversDiv) return { count: 0 };
  const groupChats = serversDiv.querySelectorAll('div.listItem__650eb');
  let matchCount = 0;
  groupChats.forEach(chat => {
    const innerDiv = chat.querySelector('div > div[data-dnd-name]');
    if (innerDiv) {
      const chatName = innerDiv.getAttribute('data-dnd-name').toLowerCase();
      const searchTerm = query.toLowerCase();
      let isMatch = false;
      if (advancedSearch) {
        const searchLetters = searchTerm.split('');
        isMatch = searchLetters.every(letter => chatName.includes(letter));
      } else {
        isMatch = chatName.includes(searchTerm);
      }
      if (isMatch) {
        innerDiv.style.boxShadow = `0 0 0 2px ${color}`;
        innerDiv.style.borderRadius = '0.5rem';
        innerDiv.style.backgroundColor = 'rgba(158, 240, 26, 0.2)'; // Green background
        innerDiv.classList.add('discord-search-highlight');
        matchCount += 1;
        matchedElements.push(innerDiv);
      }
    }
  });
  if (autoScroll && matchedElements.length > 0) {
    currentIndex = 0;
    matchedElements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return { count: matchCount };
}

function scrollToNext() {
  if (matchedElements.length === 0) return;
  currentIndex = (currentIndex + 1) % matchedElements.length;
  matchedElements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH') {
    const { query, color, autoScroll, advancedSearch } = message;
    const result = performSearch(query, color, autoScroll, advancedSearch);
    sendResponse(result);
  } else if (message.type === 'CLEAR') {
    clearHighlights();
    sendResponse({ cleared: true });
  } else if (message.type === 'NEXT') {
    scrollToNext();
    sendResponse({ scrolled: true });
  } else if (message.type === 'CHECK_READY') {
    const serversDiv = document.querySelector('div[aria-label="Servers"]');
    sendResponse({ ready: !!serversDiv });
  }
});
