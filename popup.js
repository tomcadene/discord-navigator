document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const nextButton = document.getElementById('nextButton'); // Next Button
  const searchInput = document.getElementById('searchInput');
  const colorInput = document.getElementById('colorInput');
  const autoScrollCheckbox = document.getElementById('autoScroll');
  const advancedSearchCheckbox = document.getElementById('advancedSearch'); // Advanced Search Checkbox
  const resultCount = document.getElementById('resultCount');
  const logsContainer = document.getElementById('logs'); // Log Entries Container

  // In-memory log queue (holds up to 5 logs)
  let logQueue = [];

  /**
   * Formats the current timestamp in 24-hour format.
   * Example Output: "14:35:27"
   */
  const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  /**
   * Adds a new log entry to the log viewer.
   * @param {string} message - The log message.
   * @param {string} type - The type of log ('info', 'error', 'feature').
   */
  const addLog = (message, type = 'info') => {
    const timestamp = getCurrentTimestamp();
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');

    // Determine the style based on the log type and queue position
    if (type === 'error') {
      logEntry.style.color = 'red';
    } else if (type === 'feature') {
      logEntry.style.color = 'blue';
    } else {
      logEntry.style.color = '#000'; // Default color
    }

    logEntry.textContent = `[${timestamp}] ${message}`;

    // Add the new log to the queue
    logQueue.push({ element: logEntry, type });

    // Ensure the queue doesn't exceed 4 logs
    if (logQueue.length > 4) {
      const removedLog = logQueue.shift();
      logsContainer.removeChild(removedLog.element);
    }

    // Append the new log to the container
    logsContainer.appendChild(logEntry);

    // Update log styles: older logs gray, newest log in full color
    logQueue.forEach((log, index) => {
      if (index < logQueue.length - 1) {
        log.element.classList.add('gray');
        log.element.classList.remove('color');
      } else {
        log.element.classList.add('color');
        log.element.classList.remove('gray');
      }
    });

    // Automatically scroll to the bottom to show the latest log
    logsContainer.scrollTop = logsContainer.scrollHeight;
  };

  /**
   * Function to send search query, color, auto-scroll preference, and advanced search preference to content script
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
            addLog('Error: Unable to communicate with content script.', 'error');
            resultCount.textContent = 'Error: Unable to retrieve results.';
            nextButton.disabled = true; // Disable Next button on error
            return;
          }

          if (response && typeof response.count === 'number') {
            resultCount.textContent = `${response.count} server(s) found`;
            addLog(`Search completed. ${response.count} server(s) found.`, 'info');

            if (response.count > 1) {
              nextButton.disabled = false; // Enable Next button
              addLog('Multiple matches found. "Next" button enabled.', 'feature');
            } else {
              nextButton.disabled = true; // Disable Next button
              addLog('Single or no match found. "Next" button disabled.', 'feature');
            }
          } else {
            resultCount.textContent = '0 servers found';
            addLog('Search completed. No servers found.', 'info');
            nextButton.disabled = true; // Disable Next button
          }
        }
      );
    });
  };

  /**
   * Function to send clear command to content script
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
   * Function to handle search action
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

    // Save the selected color, auto-scroll preference, advanced search preference, and last query
    chrome.storage.sync.set(
      { highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch, lastQuery: query },
      () => {
        addLog('Search initiated.', 'info');
        sendSearchQuery(query, color, autoScroll, advancedSearch);
      }
    );
  };

  /**
   * Function to handle clearing the search
   */
  const handleClear = () => {
    searchInput.value = '';
    sendClearCommand();
    // Remove the last query from storage
    chrome.storage.sync.remove(['lastQuery'], () => {
      addLog('Search query cleared from storage.', 'info');
    });
  };

  /**
   * Function to handle color change
   */
  const handleColorChange = () => {
    const color = colorInput.value;
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the selected color and preferences
    chrome.storage.sync.set({ highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      addLog('Highlight color changed.', 'feature');
      // Optionally, trigger a new search with the updated color
      const query = searchInput.value.trim();
      if (query !== '') {
        // Also save the last query
        chrome.storage.sync.set({ lastQuery: query }, () => {
          sendSearchQuery(query, color, autoScroll, advancedSearch);
        });
      }
    });
  };

  /**
   * Function to handle auto-scroll checkbox change
   */
  const handleAutoScrollChange = () => {
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the auto-scroll and advanced search preferences without triggering a search or highlight
    chrome.storage.sync.set({ autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      addLog(`Auto-Scroll ${autoScroll ? 'enabled' : 'disabled'}.`, 'feature');
    });
  };

  /**
   * Function to handle advanced search checkbox change
   */
  const handleAdvancedSearchChange = () => {
    const advancedSearch = advancedSearchCheckbox.checked;
    // Save the advanced search preference without triggering a search or highlight
    chrome.storage.sync.set({ advancedSearchEnabled: advancedSearch }, () => {
      addLog(`Advanced Search ${advancedSearch ? 'enabled' : 'disabled'}.`, 'feature');
    });
  };

  /**
   * Function to handle the Next button click
   */
  const handleNext = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'NEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          addLog('Error: Unable to communicate with content script.', 'error');
          return;
        }
        addLog('Navigated to the next matching server.', 'info');
      });
    });
  };

  /**
   * Adds a log entry with a timestamp.
   * @param {string} message - The message to log.
   * @param {string} type - The type of log ('info', 'error', 'feature').
   */
  // Function is defined above as addLog

  /**
   * Event Listeners
   */
  // Search button click
  searchButton.addEventListener('click', handleSearch);

  // Clear button click
  clearButton.addEventListener('click', handleClear);

  // Color picker change
  colorInput.addEventListener('change', handleColorChange);

  // Auto-Scroll checkbox change
  autoScrollCheckbox.addEventListener('change', handleAutoScrollChange);

  // Advanced Search checkbox change
  advancedSearchCheckbox.addEventListener('change', handleAdvancedSearchChange);

  // Enter key press in search input
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission
      handleSearch();
    }
  });

  // Next button click
  nextButton.addEventListener('click', handleNext);

  /**
   * Initialize the log viewer with a welcome message
   */
  addLog('Extension loaded. Ready to search.', 'info');
});
