document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const nextButton = document.getElementById('nextButton'); // Next Button
  const searchInput = document.getElementById('searchInput');
  const colorInput = document.getElementById('colorInput');
  const autoScrollCheckbox = document.getElementById('autoScroll');
  const advancedSearchCheckbox = document.getElementById('advancedSearch'); // Advanced Search Checkbox
  const resultCount = document.getElementById('resultCount');
  const logContainer = document.getElementById('logContainer'); // Log Container

  // Array to store the last 5 logs
  const logs = [];

  /**
   * Generates a timestamp in HH:MM:SS format (24-hour)
   * @returns {string} Formatted timestamp
   */
  function getCurrentTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Adds a log entry to the terminal
   * @param {string} message - The log message
   * @param {string} type - The type of log ('info', 'error', 'feature')
   */
  function addLog(message, type = 'info') {
    // Create a log object with timestamp
    const timestamp = getCurrentTimestamp();
    const log = { timestamp, message, type };

    // Add to the logs array
    logs.push(log);

    // Keep only the last 5 logs
    if (logs.length > 5) {
      logs.shift(); // Remove the oldest log
    }

    // Update the terminal display
    updateLogDisplay();
  }

  /**
   * Updates the log display in the terminal
   */
  function updateLogDisplay() {
    // Clear existing logs
    logContainer.innerHTML = '';

    // Iterate over the logs and create log entries
    logs.forEach((log) => {
      const logEntry = document.createElement('div');
      logEntry.classList.add('log-entry');

      // Create timestamp span
      const timestampSpan = document.createElement('span');
      timestampSpan.classList.add('timestamp');
      timestampSpan.textContent = `[${log.timestamp}]`;

      // Create message span
      const messageSpan = document.createElement('span');
      messageSpan.classList.add('message');
      messageSpan.textContent = log.message;

      // Append spans to log entry
      logEntry.appendChild(timestampSpan);
      logEntry.appendChild(messageSpan);

      // Assign class based on log type
      if (log.type === 'info') {
        logEntry.classList.add('info');
      } else if (log.type === 'error') {
        logEntry.classList.add('error');
      } else if (log.type === 'feature') {
        logEntry.classList.add('feature');
      }

      // Append to log container
      logContainer.appendChild(logEntry);
    });
  }

  /**
   * Sends a search query to the content script
   * @param {string} query - The search query
   * @param {string} color - The highlight color
   * @param {boolean} autoScroll - Whether to auto-scroll
   * @param {boolean} advancedSearch - Whether advanced search is enabled
   */
  const sendSearchQuery = (query, color, autoScroll, advancedSearch) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'SEARCH', query: query, color: color, autoScroll: autoScroll, advancedSearch: advancedSearch },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            addLog('Error: Unable to retrieve results.', 'error');
            resultCount.textContent = 'Error: Unable to retrieve results.';
            nextButton.disabled = true; // Disable Next button on error
            return;
          }

          if (response && typeof response.count === 'number') {
            resultCount.textContent = `${response.count} server(s) found`;
            addLog(`Search completed. ${response.count} server(s) found.`, 'info');

            if (response.count > 1) {
              nextButton.disabled = false; // Enable Next button
            } else {
              nextButton.disabled = true; // Disable Next button
            }
          } else {
            resultCount.textContent = '0 servers found';
            addLog('Search completed. 0 servers found.', 'info');
            nextButton.disabled = true; // Disable Next button
          }
        }
      );
    });
  };

  /**
   * Sends a clear command to the content script
   */
  const sendClearCommand = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR' }, () => {
        // Reset the result count display
        resultCount.textContent = '0 servers found';
        addLog('Highlights cleared.', 'info');
        nextButton.disabled = true; // Disable Next button
      });
    });
  };

  /**
   * Handles the search action
   */
  const handleSearch = () => {
    const query = searchInput.value.trim();
    const color = colorInput.value;
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;

    if (query === '') {
      alert('Please enter a search term.');
      addLog('Search attempted with empty query.', 'error');
      return;
    }

    // Log the search initiation
    addLog(`Initiating search for "${query}".`, 'info');

    // Save the selected color, auto-scroll preference, advanced search preference, and last query
    chrome.storage.sync.set(
      { highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch, lastQuery: query },
      () => {
        sendSearchQuery(query, color, autoScroll, advancedSearch);
      }
    );
  };

  // Event listener for Search button
  searchButton.addEventListener('click', handleSearch);

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
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the selected color and preferences
    chrome.storage.sync.set({ highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      // Optionally, trigger a new search with the updated color
      const query = searchInput.value.trim();
      if (query !== '') {
        // Also save the last query
        chrome.storage.sync.set({ lastQuery: query }, () => {
          sendSearchQuery(query, color, autoScroll, advancedSearch);
          addLog('Highlight color changed.', 'feature');
        });
      } else {
        addLog('Highlight color changed.', 'feature');
      }
    });
  });

  // Event listener for auto-scroll checkbox change
  autoScrollCheckbox.addEventListener('change', () => {
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the auto-scroll and advanced search preferences without triggering a search or highlight
    chrome.storage.sync.set({ autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      // Log the preference change
      addLog(`Auto-Scroll ${autoScroll ? 'enabled' : 'disabled'}.`, 'feature');
      addLog(`Advanced Search ${advancedSearch ? 'enabled' : 'disabled'}.`, 'feature');
    });
  });

  // Event listener for advanced search checkbox change
  advancedSearchCheckbox.addEventListener('change', () => {
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the advanced search preference without triggering a search or highlight
    chrome.storage.sync.set({ advancedSearchEnabled: advancedSearch }, () => {
      // Log the preference change
      addLog(`Advanced Search ${advancedSearch ? 'enabled' : 'disabled'}.`, 'feature');
    });
  });

  // Event listener for Enter Key Press on Search Input
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent any default action (if applicable)
      handleSearch(); // Trigger the same search function as clicking the Search button
    }
  });

  // Event listener for Next button
  nextButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'NEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          addLog('Error: Unable to navigate to the next server.', 'error');
          return;
        }
        // Log the Next navigation
        addLog('Navigated to the next server.', 'info');
      });
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
