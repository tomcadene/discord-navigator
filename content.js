// Function to remove existing highlights
function clearHighlights() {
  const highlighted = document.querySelectorAll('.discord-search-highlight');
  highlighted.forEach(elem => {
    // Option 1: If using border
    // elem.style.border = '';

    // Option 2: If using box-shadow
    elem.style.boxShadow = '';

    // Remove the highlight class
    elem.classList.remove('discord-search-highlight');

    // If you implemented text highlighting (optional), you'd need to handle removing the <span> elements here
    // Example:
    // const parent = elem.parentNode;
    // parent.replaceChild(document.createTextNode(elem.textContent), elem);
  });
}

// Function to perform the search and highlight matches
function performSearch(query) {
  clearHighlights(); // Clear previous highlights

  const serversDiv = document.querySelector('div[aria-label="Servers"]');
  if (!serversDiv) return;

  const groupChats = serversDiv.querySelectorAll('div.listItem_c96c45');

  groupChats.forEach(chat => {
    const innerDiv = chat.querySelector('div > div[data-dnd-name]');
    if (innerDiv) {
      const chatName = innerDiv.getAttribute('data-dnd-name').toLowerCase();
      const searchTerm = query.toLowerCase();
      if (chatName.includes(searchTerm)) {
        // Highlight by adding a green border or box-shadow around the inner div
        // Option 1: Using border
        // innerDiv.style.border = '2px solid green';

        // Option 2: Using box-shadow
        innerDiv.style.boxShadow = '0 0 0 2px green';

        // Add a CSS class for easy removal
        innerDiv.classList.add('discord-search-highlight');
      }
    }
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH') {
    performSearch(message.query);
  } else if (message.type === 'CLEAR') {
    clearHighlights();
  }
});
