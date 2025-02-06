document.addEventListener('DOMContentLoaded', () => {
  // Element Declarations
  const statusIndicator = document.getElementById('statusIndicator');
  const pageStatus = document.getElementById('pageStatus');
  const reloadPageButton = document.getElementById('reloadPageButton');

  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');
  const nextButton = document.getElementById('nextButton');
  const searchInput = document.getElementById('searchInput');
  const colorInput = document.getElementById('colorInput');
  const autoScrollCheckbox = document.getElementById('autoScroll');
  const advancedSearchCheckbox = document.getElementById('advancedSearch');
  const resultCount = document.getElementById('resultCount');
  const logsContainer = document.getElementById('logs');

  // In-memory log queue (holds up to 5 logs)
  let logQueue = [];

  /**
   * Returns the current timestamp in 24-hour format.
   */
  const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  /**
   * Adds a log entry to the log viewer.
   * @param {string} message - The log message.
   * @param {string} type - The type of log ('info', 'error', 'feature').
   */
  const addLog = (message, type = 'info') => {
    const timestamp = getCurrentTimestamp();
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');

    // Style based on log type
    if (type === 'error') {
      logEntry.style.color = 'red';
    } else if (type === 'feature') {
      logEntry.style.color = 'blue';
    } else {
      logEntry.style.color = '#000';
    }
    logEntry.textContent = `[${timestamp}] ${message}`;

    // Add new log to the queue.
    logQueue.push({ element: logEntry, type });
    if (logQueue.length > 4) {
      const removedLog = logQueue.shift();
      logsContainer.removeChild(removedLog.element);
    }
    // Update opacity: older logs half opacity, newest full opacity.
    logQueue.forEach((log, index) => {
      if (index < logQueue.length - 1) {
        log.element.classList.add('gray');
        log.element.classList.remove('color');
      } else {
        log.element.classList.add('color');
        log.element.classList.remove('gray');
      }
    });
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  };

  /**
   * Updates the status indicator and message based on page readiness.
   * @param {boolean} isReady - True if page is ready.
   */
  const updateStatusIndicator = (isReady) => {
    if (isReady) {
      statusIndicator.style.backgroundColor = 'green';
      statusIndicator.style.animation = 'pulseGreen 2s infinite';
      statusIndicator.title = 'Page is fully loaded';
      pageStatus.textContent = 'Page loaded: Discord servers found.';
    } else {
      statusIndicator.style.backgroundColor = 'orange';
      statusIndicator.style.animation = 'pulse 2s infinite';
      statusIndicator.title = 'Loading...';
      pageStatus.textContent = 'Waiting for Discord servers...';
    }
  };

  /**
   * Checks if the active tab is on discord.com.
   */
  const checkIfOnDiscord = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const url = tabs[0].url;
      if (!url.includes('discord.com')) {
        pageStatus.textContent = 'Error: You are not on discord.com!';
        addLog('User is not on discord.com.', 'error');
        reloadPageButton.style.display = 'block';
        clearInterval(readyInterval);
      } else {
        reloadPageButton.style.display = 'none';
        addLog('User is on discord.com.', 'info');
      }
    });
  };

  /**
   * Checks if the Discord servers are loaded.
   */
  const checkPageReady = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CHECK_READY' }, (response) => {
        if (chrome.runtime.lastError) {
          updateStatusIndicator(false);
          addLog('Error: Unable to check page readiness.', 'error');
          reloadPageButton.style.display = 'block';
          return;
        }
        if (response && response.ready) {
          updateStatusIndicator(true);
          addLog('Page fully loaded and ready.', 'info');
          reloadPageButton.style.display = 'none';  // Hide reload button when ready
          clearInterval(readyInterval); // Stop polling once ready.
        } else {
          updateStatusIndicator(false);
        }
      });
    });
  };

  // Start polling every 2 seconds.
  const readyInterval = setInterval(checkPageReady, 2000);

  // Check if the user is on discord.com.
  checkIfOnDiscord();

  // Reload Page Button Click Handler.
  reloadPageButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.reload(tabs[0].id, () => {
        addLog('Reloading the page.', 'feature');
        reloadPageButton.style.display = 'none';
        pageStatus.textContent = 'Reloading...';
      });
    });
  });

  // Function to send search query to content script.
  const sendSearchQuery = (query, color, autoScroll, advancedSearch) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'SEARCH', query, color, autoScroll, advancedSearch },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            addLog('Error: Unable to retrieve search results.', 'error');
            resultCount.textContent = 'Error: Unable to retrieve results.';
            nextButton.disabled = true;
            return;
          }
          if (response && typeof response.count === 'number') {
            resultCount.textContent = `${response.count} server(s) found`;
            addLog(`Search completed. ${response.count} server(s) found.`, 'info');
            if (response.count > 1) {
              nextButton.disabled = false;
              addLog('Multiple matches found. "Next" button enabled.', 'feature');
            } else {
              nextButton.disabled = true;
              addLog('Single or no match found. "Next" button disabled.', 'feature');
            }
          } else {
            resultCount.textContent = '0 servers found';
            addLog('Search completed. No servers found.', 'info');
            nextButton.disabled = true;
          }
        }
      );
    });
  };

  // Function to send clear command to content script.
  const sendClearCommand = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        addLog('No active tab found.', 'error');
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR' }, () => {
        resultCount.textContent = '0 servers found';
        addLog('Highlights cleared.', 'info');
        nextButton.disabled = true;
      });
    });
  };

  // Handle Search Action.
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
    chrome.storage.sync.set(
      { highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch, lastQuery: query },
      () => {
        addLog('Search initiated.', 'info');
        sendSearchQuery(query, color, autoScroll, advancedSearch);
      }
    );
  };

  // Handle Clear Action.
  const handleClear = () => {
    searchInput.value = '';
    sendClearCommand();
    chrome.storage.sync.remove(['lastQuery'], () => {
      addLog('Search query cleared from storage.', 'info');
    });
  };

  // Handle Color Change.
  const handleColorChange = () => {
    const color = colorInput.value;
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;
    chrome.storage.sync.set({ highlightColor: color, autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      addLog('Highlight color changed.', 'feature');
      const query = searchInput.value.trim();
      if (query !== '') {
        chrome.storage.sync.set({ lastQuery: query }, () => {
          sendSearchQuery(query, color, autoScroll, advancedSearch);
        });
      }
    });
  };

  // Handle Auto-Scroll checkbox change.
  const handleAutoScrollChange = () => {
    const autoScroll = autoScrollCheckbox.checked;
    const advancedSearch = advancedSearchCheckbox.checked;
    chrome.storage.sync.set({ autoScrollEnabled: autoScroll, advancedSearchEnabled: advancedSearch }, () => {
      addLog(`Auto-Scroll ${autoScroll ? 'enabled' : 'disabled'}.`, 'feature');
    });
  };

  // Handle Advanced Search checkbox change.
  const handleAdvancedSearchChange = () => {
    const advancedSearch = advancedSearchCheckbox.checked;
    chrome.storage.sync.set({ advancedSearchEnabled: advancedSearch }, () => {
      addLog(`Advanced Search ${advancedSearch ? 'enabled' : 'disabled'}.`, 'feature');
    });
  };

  // Handle Enter key press in search input.
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  });

  // Handle Next button click.
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

  // Attach event listeners.
  searchButton.addEventListener('click', handleSearch);
  clearButton.addEventListener('click', handleClear);
  colorInput.addEventListener('change', handleColorChange);
  autoScrollCheckbox.addEventListener('change', handleAutoScrollChange);
  advancedSearchCheckbox.addEventListener('change', handleAdvancedSearchChange);
  nextButton.addEventListener('click', handleNext);

  // Log extension load.
  addLog('Extension loaded. Ready to search.', 'info');
});
