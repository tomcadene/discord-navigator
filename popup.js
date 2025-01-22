document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const searchInput = document.getElementById('searchInput');
  const colorInput = document.getElementById('colorInput');
  const autoScrollCheckbox = document.getElementById('autoScroll');
  const resultCount = document.getElementById('resultCount');

  // Load the saved color, auto-scroll preference, and last query from storage
  chrome.storage.sync.get(['highlightColor', 'autoScrollEnabled', 'lastQuery'], (result) => {
    if (result.highlightColor) {
      colorInput.value = result.highlightColor;
    }

    if (typeof result.autoScrollEnabled === 'boolean') {
      autoScrollCheckbox.checked = result.autoScrollEnabled;
    }

    if (result.lastQuery) {
      searchInput.value = result.lastQuery;
    }
  });

  // Function to send search query, color, and auto-scroll preference to content script
  const sendSearchQuery = (query, color, autoScroll) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: 'SEARCH', query: query, color: color, autoScroll: autoScroll }, (response) => {
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
    const autoScroll = autoScrollCheckbox.checked;

    if (query === '') {
      alert('Please enter a search term.');
      return;
    }

    // Save the selected color, auto-scroll preference, and last query
    chrome.storage.sync.set({ highlightColor: color, autoScrollEnabled: autoScroll, lastQuery: query }, () => {
      sendSearchQuery(query, color, autoScroll);
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
    const autoScroll = autoScrollCheckbox.checked;
    // Save the selected color and auto-scroll preference
    chrome.storage.sync.set({ highlightColor: color, autoScrollEnabled: autoScroll }, () => {
      // Optionally, trigger a new search with the updated color
      const query = searchInput.value.trim();
      if (query !== '') {
        // Also save the last query
        chrome.storage.sync.set({ lastQuery: query }, () => {
          sendSearchQuery(query, color, autoScroll);
        });
      }
    });
  });

  // Event listener for auto-scroll checkbox change
  autoScrollCheckbox.addEventListener('change', () => {
    const autoScroll = autoScrollCheckbox.checked;
    const color = colorInput.value;
    // Save the auto-scroll preference
    chrome.storage.sync.set({ autoScrollEnabled: autoScroll }, () => {
      // Optionally, trigger a new search with the updated preference
      const query = searchInput.value.trim();
      if (query !== '') {
        sendSearchQuery(query, color, autoScroll);
      }
    });
  });
});
