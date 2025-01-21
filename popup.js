document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const searchInput = document.getElementById('searchInput');
  let debounceTimeout;

  // Function to send search query to content script
  const sendSearchQuery = (query) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SEARCH', query: query });
    });
  };

  // Function to send clear command to content script
  const sendClearCommand = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR' });
    });
  };

  // Debounce function
  const debounce = (func, delay) => {
    return function(...args) {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // Event listener for Search button
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query === '') {
      alert('Please enter a search term.');
      return;
    }
    sendSearchQuery(query);
  });

  // Event listener for Clear button
  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    sendClearCommand();
  });

  // Trigger search on input with debounce
  searchInput.addEventListener('input', debounce(() => {
    const query = searchInput.value.trim();
    if (query === '') {
      sendClearCommand();
    } else {
      sendSearchQuery(query);
    }
  }, 300)); // Adjust the delay as needed (e.g., 300ms)
});
