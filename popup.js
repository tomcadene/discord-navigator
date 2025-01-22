document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const searchInput = document.getElementById('searchInput');
  const colorInput = document.getElementById('colorInput');
  const resultCount = document.getElementById('resultCount');

  // Load the saved color from storage
  chrome.storage.sync.get(['highlightColor'], (result) => {
    if (result.highlightColor) {
      colorInput.value = result.highlightColor;
    }
  });

  // Load the last search query from storage (Optional Enhancement)
  chrome.storage.sync.get(['lastQuery'], (result) => {
    if (result.lastQuery) {
      searchInput.value = result.lastQuery;
    }
  });

  // Function to send search query and color to content script
  const sendSearchQuery = (query, color) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: 'SEARCH', query: query, color: color }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resultCount.textContent = 'Error: Unable to retrieve results.';
          return;
        }

        if (response && typeof response.count === 'number') {
          resultCount.textContent = `${response.count} server(s) found`;
        } else {
          resultCount.textContent = '0 servers found';
        }
      });
    });
  };

  // Function to send clear command to content script
  const sendClearCommand = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR' }, () => {
        // Reset the result count display
        resultCount.textContent = '0 servers found';
      });
    });
  };

  // Event listener for Search button
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    const color = colorInput.value;
    if (query === '') {
      alert('Please enter a search term.');
      return;
    }

    // Save the selected color and last query
    chrome.storage.sync.set({ highlightColor: color, lastQuery: query }, () => {
      sendSearchQuery(query, color);
    });
  });

  // Event listener for Clear button
  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    sendClearCommand();
    // Remove the last query from storage
    chrome.storage.sync.remove(['lastQuery'], () => {});
  });

  // Event listener for color input change
  colorInput.addEventListener('change', () => {
    const color = colorInput.value;
    // Save the selected color
    chrome.storage.sync.set({ highlightColor: color }, () => {
      // Optionally, trigger a new search with the updated color
      const query = searchInput.value.trim();
      if (query !== '') {
        // Also save the last query
        chrome.storage.sync.set({ lastQuery: query }, () => {
          sendSearchQuery(query, color);
        });
      }
    });
  });

  // **Removed the input event listener to prevent automatic searching while typing**
  /*
  searchInput.addEventListener('input', debounce(() => {
    const query = searchInput.value.trim();
    const color = colorInput.value;
    if (query === '') {
      sendClearCommand();
      // Optionally, remove the last query from storage
      chrome.storage.sync.remove(['lastQuery'], () => {});
    } else {
      // Save the selected color and last query
      chrome.storage.sync.set({ highlightColor: color, lastQuery: query }, () => {
        sendSearchQuery(query, color);
      });
    }
  }, 300)); // Adjust the delay as needed (e.g., 300ms)
  */
});
