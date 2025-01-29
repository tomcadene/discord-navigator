// Function to remove existing highlights
function clearHighlights() {
  const highlighted = document.querySelectorAll('.discord-search-highlight');
  highlighted.forEach(elem => {
    // Remove the box-shadow or border
    elem.style.boxShadow = '';
    elem.style.border = '';
    elem.style.borderRadius = '';
    
    // Remove the highlight class
    elem.classList.remove('discord-search-highlight');
  });
}

// Function to perform the search, highlight matches, and scroll to the first match
function performSearch(query, color, autoScroll) {
  clearHighlights(); // Clear previous highlights

  const serversDiv = document.querySelector('div[aria-label="Servers"]');
  if (!serversDiv) return { count: 0 };

  const groupChats = serversDiv.querySelectorAll('div.listItem__650eb');
  let matchCount = 0;
  let firstMatch = null;

  groupChats.forEach(chat => {
    const innerDiv = chat.querySelector('div > div[data-dnd-name]');
    if (innerDiv) {
      const chatName = innerDiv.getAttribute('data-dnd-name').toLowerCase();
      const searchTerm = query.toLowerCase();
      if (chatName.includes(searchTerm)) {
        // Apply highlight
        innerDiv.style.boxShadow = `0 0 0 2px ${color}`;
        innerDiv.style.borderRadius = '0.25rem';
        innerDiv.classList.add('discord-search-highlight');

        matchCount += 1;

        // Track the first matching server
        if (!firstMatch) {
          firstMatch = innerDiv;
        }
      }
    }
  });

  // Scroll to the first matching server if autoScroll is enabled and there is at least one match
  if (autoScroll && firstMatch) {
    // Scroll the parent container to bring the first match into view
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return { count: matchCount };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH') {
    const { query, color, autoScroll } = message;
    const result = performSearch(query, color, autoScroll);
    // Send back the count
    sendResponse(result);
  } else if (message.type === 'CLEAR') {
    clearHighlights();
    // Optionally, send back confirmation
    sendResponse({ cleared: true });
  }

  // Indicate that we will respond asynchronously if needed
  // Not necessary here since sendResponse is called synchronously
});
