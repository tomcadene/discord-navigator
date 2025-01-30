// Array to store all matched elements
let matchedElements = [];
// Current index in the matchedElements array
let currentIndex = 0;

/**
 * Clears all existing highlights by removing styles and classes.
 */
function clearHighlights() {
  const highlighted = document.querySelectorAll('.discord-search-highlight');
  highlighted.forEach(elem => {
    // Remove the box-shadow or border
    elem.style.boxShadow = '';
    elem.style.border = '';
    elem.style.borderRadius = '';
    
    // Remove the green background color
    elem.style.backgroundColor = '';
    
    // Remove the highlight class
    elem.classList.remove('discord-search-highlight');
  });
  // Clear the matchedElements array and reset currentIndex
  matchedElements = [];
  currentIndex = 0;
}

/**
 * Performs the search based on user input and highlights matched servers.
 * @param {string} query - The search term entered by the user.
 * @param {string} color - The color selected by the user for highlighting.
 * @param {boolean} autoScroll - Whether to auto-scroll to the first match.
 * @param {boolean} advancedSearch - Whether advanced search is enabled.
 * @returns {object} - An object containing the count of matches found.
 */
function performSearch(query, color, autoScroll, advancedSearch) {
  clearHighlights(); // Clear previous highlights

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
        // Advanced Search: Check if all letters in searchTerm are present in chatName
        const searchLetters = searchTerm.split('');
        isMatch = searchLetters.every(letter => chatName.includes(letter));
      } else {
        // Normal Search: Check if chatName includes the searchTerm as a substring
        isMatch = chatName.includes(searchTerm);
      }

      if (isMatch) {
        // Apply highlight: box-shadow and green background
        innerDiv.style.boxShadow = `0 0 0 2px ${color}`;
        innerDiv.style.borderRadius = '0.5rem';
        innerDiv.style.backgroundColor = 'rgba(158, 240, 26, 0.2)'; // Semi-transparent green

        // Add the highlight class
        innerDiv.classList.add('discord-search-highlight');

        matchCount += 1;
        matchedElements.push(innerDiv); // Add to matchedElements array
      }
    }
  });

  // If autoScroll is enabled, scroll to the first match
  if (autoScroll && matchedElements.length > 0) {
    currentIndex = 0; // Reset to first match
    matchedElements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return { count: matchCount };
}

/**
 * Scrolls to the next matched server in the list.
 */
function scrollToNext() {
  if (matchedElements.length === 0) return;

  // Increment the index
  currentIndex = (currentIndex + 1) % matchedElements.length; // Wrap around

  // Scroll to the next matched element
  matchedElements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Listens for messages from the popup and handles them accordingly.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH') {
    const { query, color, autoScroll, advancedSearch } = message;
    const result = performSearch(query, color, autoScroll, advancedSearch);
    // Send back the count
    sendResponse(result);
  } else if (message.type === 'CLEAR') {
    clearHighlights();
    // Send back confirmation
    sendResponse({ cleared: true });
  } else if (message.type === 'NEXT') {
    scrollToNext();
    // Send back confirmation
    sendResponse({ scrolled: true });
  }

  // Indicate that we will respond asynchronously if needed
  // Not necessary here since sendResponse is called synchronously
});
