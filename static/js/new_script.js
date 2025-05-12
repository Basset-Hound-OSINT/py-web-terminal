// This is the updated script.js with fixes for:
// 1. Clearing the terminal when "clear" command is entered
// 2. Enabling text selection, copy/paste functionality in both terminal and AychPeak overlay
// 3. Added process selection and cancellation functionality

let terminal = document.getElementById("terminal");
let timeInfo = document.getElementById("time-info");
let lastInput = null;

function updateTimeBar() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    const date = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    timeInfo.textContent = `Time: ${time} ${date}`;
}

setInterval(updateTimeBar, 1000);
updateTimeBar();

// Global click event: focus the input of the active terminal
document.addEventListener("click", () => {
    let activeTerminal = document.querySelector(".terminal-window.active");
    if (activeTerminal) {
        let activeInput = activeTerminal.querySelector(".cmd-input:not([disabled])");
        if (activeInput) {
            activeInput.focus();
            lastInput = activeInput;
        }
    }
});

function createPrompt(promptText, targetTerminal = null) {
    let terminalElement = targetTerminal 
        ? targetTerminal.querySelector(".terminal") 
        : document.querySelector(".terminal-window.active .terminal");

    if (!terminalElement) return;

    let wrapper = document.createElement("div");
    wrapper.className = "prompt-line";

    let prompt = document.createElement("span");
    prompt.textContent = promptText;
    // Make prompt selectable
    prompt.style.userSelect = "text";

    let input = document.createElement("input");
    input.type = "text";
    input.className = "cmd-input";

    wrapper.appendChild(prompt);
    wrapper.appendChild(input);
    terminalElement.appendChild(wrapper);

    input.focus();
    lastInput = input;

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            const command = input.value;
            input.disabled = true;
            
            // Handle clear command locally
            if (command.trim().toLowerCase() === "clear") {
                // Clear terminal content
                terminalElement.innerHTML = "";
                // Create a new prompt
                createPrompt(promptText, targetTerminal);
                return;
            }
            
            sendCommand(command, terminalElement.closest(".terminal-window"));
        }
        
        // Allow default behavior for keyboard shortcuts (Ctrl+C, Ctrl+V)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
            // Let the browser handle copy/paste
            return;
        }
    });
}

function sendCommand(command, terminal) {
    fetch("/execute", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command })
    })
    .then(res => res.json())
    .then(data => {
        if (data.output) {
            let output = document.createElement("div");
            output.textContent = data.output;
            output.className = "output-line";
            // Make output selectable
            output.style.userSelect = "text";
            terminal.querySelector(".terminal").appendChild(output);
        }
        createPrompt(data.prompt);
        terminal.scrollTop = terminal.scrollHeight;
    });
}

// Initial prompt
createPrompt("Loading...");
fetch("/execute", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'pwd' })
}).then(res => res.json())
  .then(data => {
      let firstTerminal = document.querySelector(".terminal-window .terminal");
      firstTerminal.innerHTML = ""; // Clear "Loading..."
      createPrompt(data.prompt);
});

let terminalContainer = document.getElementById("terminal-container");

document.getElementById("split-v").addEventListener("click", () => splitTerminal("vertical"));
document.getElementById("split-h").addEventListener("click", () => splitTerminal("horizontal"));

function splitTerminal(direction) {
    let activeTerminal = document.querySelector(".terminal-window.active");
    if (!activeTerminal) return;

    // Clone the active terminal
    let newTerminal = activeTerminal.cloneNode(true);
    newTerminal.classList.remove("active");
    newTerminal.querySelector(".terminal").innerHTML = ""; // Clear cloned terminal content
    activeTerminal.parentNode.appendChild(newTerminal);

    // Wrap the active terminal and new terminal in a flex container
    let flexContainer = document.createElement("div");
    flexContainer.style.display = "flex";
    flexContainer.style.flexDirection = direction === "vertical" ? "row" : "column";
    flexContainer.style.flex = "1"; // Take up available space
    flexContainer.style.width = "100%";
    flexContainer.style.height = "100%";

    activeTerminal.parentNode.insertBefore(flexContainer, activeTerminal);
    flexContainer.appendChild(activeTerminal);
    flexContainer.appendChild(newTerminal);

    // Adjust flex properties for splitting
    activeTerminal.style.flex = "1";
    newTerminal.style.flex = "1";

    // Add event listeners to the new terminal
    addTerminalEventListeners(newTerminal);

    // Fetch the prompt dynamically for the new terminal
    fetch("/execute", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: '' }) // Empty command to fetch the prompt
    })
    .then(res => res.json())
    .then(data => {
        createPrompt(data.prompt, newTerminal); // Use the fetched prompt
    });
}

function addTerminalEventListeners(terminal) {
    // Highlight the selected terminal
    terminal.addEventListener("click", () => {
        document.querySelectorAll(".terminal-window").forEach(t => t.classList.remove("active"));
        terminal.classList.add("active");

        // Update the lastInput reference to the selected terminal's input
        let activeInput = terminal.querySelector(".cmd-input:not([disabled])");
        if (activeInput) {
            activeInput.focus();
            lastInput = activeInput;
        }
    });

    // Close the terminal
    terminal.querySelector(".close-btn").addEventListener("click", () => {
        terminal.remove();
        adjustTerminalSizes();
    });

    // Resize the terminal
    let resizeHandle = terminal.querySelector(".resize-handle");
    resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        document.addEventListener("mousemove", resizeTerminal);
        document.addEventListener("mouseup", stopResizing);
    });

    function resizeTerminal(e) {
        let rect = terminal.getBoundingClientRect();
        let newWidth = e.clientX - rect.left;
        terminal.style.width = `${newWidth}px`;
        adjustTerminalSizes();
    }

    function stopResizing() {
        document.removeEventListener("mousemove", resizeTerminal);
        document.removeEventListener("mouseup", stopResizing);
    }
}

function adjustTerminalSizes() {
    let terminals = document.querySelectorAll(".terminal-window");
    let totalWidth = terminalContainer.offsetWidth;
    let totalHeight = terminalContainer.offsetHeight;

    terminals.forEach(terminal => {
        let rect = terminal.getBoundingClientRect();
        if (rect.width > totalWidth) terminal.style.width = `${totalWidth}px`;
        if (rect.height > totalHeight) terminal.style.height = `${totalHeight}px`;
    });
}

// Add event listeners to the initial terminal
addTerminalEventListeners(document.querySelector(".terminal-window"));

// Aychpeak functionality
const aychpeakOverlay = document.getElementById('aychpeak-overlay');
const processTable = document.getElementById('process-tbody');
const processSearch = document.getElementById('process-search');
let refreshInterval;
let allProcesses = []; // Store all processes for filtering
let selectedProcesses = new Set(); // Store selected process IDs

// Open aychpeak overlay
document.getElementById('aychpeak-btn').addEventListener('click', () => {
    aychpeakOverlay.classList.remove('hidden');
    fetchProcessData();
    // Set up auto-refresh every 3 seconds
    refreshInterval = setInterval(fetchProcessData, 3000);
    // Focus the search input
    setTimeout(() => processSearch.focus(), 100);
});

// Close aychpeak overlay
document.getElementById('close-aychpeak').addEventListener('click', () => {
    aychpeakOverlay.classList.add('hidden');
    clearInterval(refreshInterval);
    // Clear search and selected processes on close
    processSearch.value = '';
    selectedProcesses.clear();
    updateCancelButtonState();
});

// Clear search button
document.getElementById('clear-search').addEventListener('click', () => {
    processSearch.value = '';
    filterProcesses('');
    processSearch.focus(); // Keep focus on the search input
});

// Process search functionality
processSearch.addEventListener('input', () => {
    const searchTerm = processSearch.value.toLowerCase();
    filterProcesses(searchTerm);
});

// Cancel selected processes button
document.getElementById('cancel-selected').addEventListener('click', () => {
    if (selectedProcesses.size === 0) {
        showNotification('No processes selected', 'warning');
        return;
    }
    
    cancelSelectedProcesses();
});

// Cancel selected processes
function cancelSelectedProcesses() {
    const pidsToCancel = Array.from(selectedProcesses);
    if (pidsToCancel.length === 0) return;
    
    // Show loading indicator
    const cancelBtn = document.getElementById('cancel-selected');
    const originalText = cancelBtn.textContent;
    cancelBtn.textContent = 'Canceling...';
    cancelBtn.disabled = true;
    
    // Send request to cancel processes
    fetch('/cancel_processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pids: pidsToCancel })
    })
    .then(response => response.json())
    .then(data => {
        // Reset button state
        cancelBtn.textContent = originalText;
        cancelBtn.disabled = false;
        
        // Handle response
        if (data.success) {
            if (data.errors.length === 0) {
                showNotification('All selected processes canceled successfully', 'success');
            } else {
                // Show error popup with details
                showErrorPopup(data.errors);
            }
            
            // Clear selections and refresh process list
            selectedProcesses.clear();
            updateCancelButtonState();
            fetchProcessData();
        } else {
            showNotification('Failed to cancel processes', 'error');
        }
    })
    .catch(error => {
        console.error('Error canceling processes:', error);
        cancelBtn.textContent = originalText;
        cancelBtn.disabled = false;
        showNotification('Error: Could not communicate with server', 'error');
    });
}

// Show notification message
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        
        // Remove the notification after a delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }, 10);
}

// Show error popup for failed process cancellations
function showErrorPopup(errors) {
    // Create overlay backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'popup-backdrop';
    
    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'error-popup';
    
    // Create popup header
    const header = document.createElement('div');
    header.className = 'popup-header';
    header.innerHTML = `
        <h3>Process Cancellation Report</h3>
        <button class="popup-close-btn">✕</button>
    `;
    
    // Create popup content
    const content = document.createElement('div');
    content.className = 'popup-content';
    
    // Add error details
    const errorList = document.createElement('div');
    errorList.className = 'error-list';
    
    errors.forEach(err => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.innerHTML = `<strong>PID ${err.pid}:</strong> ${err.error}`;
        errorList.appendChild(errorItem);
    });
    
    content.appendChild(errorList);
    
    // Add close button at bottom
    const footer = document.createElement('div');
    footer.className = 'popup-footer';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'popup-button';
    footer.appendChild(closeBtn);
    
    // Assemble popup
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(footer);
    backdrop.appendChild(popup);
    document.body.appendChild(backdrop);
    
    // Add event listeners to close buttons
    const closeButtons = [
        header.querySelector('.popup-close-btn'),
        closeBtn
    ];
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            backdrop.classList.add('fading');
            setTimeout(() => backdrop.remove(), 300);
        });
    });
    
    // Let the popup fade in
    setTimeout(() => backdrop.classList.add('visible'), 10);
}

// Filter processes based on search term
function filterProcesses(searchTerm) {
    if (!searchTerm) {
        // If search is empty, display all processes
        updateProcessTable(allProcesses);
        return;
    }
    
    // Filter processes that match the search term
    const filteredProcesses = allProcesses.filter(process => {
        // Search across all relevant fields
        return (
            process.pid.toString().includes(searchTerm) || 
            process.user.toLowerCase().includes(searchTerm) || 
            process.command.toLowerCase().includes(searchTerm) ||
            process.cpu.toString().toLowerCase().includes(searchTerm) ||
            process.mem.toString().toLowerCase().includes(searchTerm) ||
            process.virt.toString().toLowerCase().includes(searchTerm) ||
            process.res.toString().toLowerCase().includes(searchTerm) ||
            process.shr.toString().toLowerCase().includes(searchTerm) ||
            process.time.toLowerCase().includes(searchTerm) ||
            process.pr.toString().toLowerCase().includes(searchTerm) ||
            process.ni.toString().toLowerCase().includes(searchTerm) ||
            process.s.toLowerCase().includes(searchTerm)
        );
    });
    
    updateProcessTable(filteredProcesses);
}

// Fetch process data from server
function fetchProcessData() {
    fetch('/get_processes')
        .then(response => response.json())
        .then(data => {
            allProcesses = data.processes; // Store all processes
            // Apply current filter if search box has content
            const searchTerm = processSearch.value.toLowerCase();
            if (searchTerm) {
                filterProcesses(searchTerm);
            } else {
                updateProcessTable(allProcesses);
            }
        })
        .catch(error => {
            console.error('Error fetching process data:', error);
        });
}

// Update the process table with data
function updateProcessTable(processes) {
    // Clear the table body
    processTable.innerHTML = '';
    
    if (processes.length === 0) {
        // Show "No matching processes" message
        const noResultsRow = document.createElement('tr');
        const noResultsCell = document.createElement('td');
        noResultsCell.colSpan = 13; // Span all columns (added checkbox column)
        noResultsCell.textContent = 'No matching processes found';
        noResultsCell.style.textAlign = 'center';
        noResultsCell.style.padding = '20px';
        // Make cell content selectable
        noResultsCell.style.userSelect = "text";
        noResultsRow.appendChild(noResultsCell);
        processTable.appendChild(noResultsRow);
        return;
    }
    
    // Add each process to the table
    processes.forEach(process => {
        const row = document.createElement('tr');
        // Make row selectable
        row.style.userSelect = "text";
        
        // Add checkbox column first
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'checkbox-cell';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'process-checkbox';
        checkbox.dataset.pid = process.pid;
        checkbox.checked = selectedProcesses.has(process.pid);
        
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent row click from toggling checkbox
            
            if (checkbox.checked) {
                selectedProcesses.add(process.pid);
            } else {
                selectedProcesses.delete(process.pid);
            }
            
            updateCancelButtonState();
        });
        
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        
        // Add all process data fields
        addCell(row, process.pid, 'pid');
        addCell(row, process.user);
        addCell(row, process.pr);
        addCell(row, process.ni);
        addCell(row, process.virt);
        addCell(row, process.res);
        addCell(row, process.shr);
        addCell(row, process.s);
        
        // Highlight high CPU usage
        const cpuClass = parseFloat(process.cpu) > 10 ? 'cpu-high' : '';
        addCell(row, process.cpu, cpuClass);
        
        // Highlight high memory usage
        const memClass = parseFloat(process.mem) > 10 ? 'mem-high' : '';
        addCell(row, process.mem, memClass);
        
        addCell(row, process.time);
        addCell(row, process.command);
        
        // Add click event to toggle checkbox when row is clicked
        row.addEventListener('click', (e) => {
            // Only toggle if the click wasn't on the checkbox itself
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                
                // Trigger the change event
                const changeEvent = new Event('change');
                checkbox.dispatchEvent(changeEvent);
            }
        });
        
        processTable.appendChild(row);
    });
}

// Update cancel button state based on selections
function updateCancelButtonState() {
    const cancelBtn = document.getElementById('cancel-selected');
    
    if (selectedProcesses.size > 0) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = `Cancel Selected (${selectedProcesses.size})`;
    } else {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancel Selected';
    }
}

// Helper function to add a cell to a table row
function addCell(row, text, className = '') {
    const cell = document.createElement('td');
    
    // Add the text content
    cell.textContent = text;
    
    // Add any specified class
    if (className) {
        cell.className = className;
    }
    
    // Make cell content selectable
    cell.style.userSelect = "text";
    
    // If we have a search term, highlight matches
    const searchTerm = processSearch.value.toLowerCase();
    if (searchTerm && text && typeof text === 'string') {
        const textLower = text.toLowerCase();
        if (textLower.includes(searchTerm)) {
            // Create highlighted version of the cell content
            const highlightedText = createHighlightedText(text, searchTerm);
            // Clear the cell and append the highlighted content
            cell.textContent = '';
            cell.appendChild(highlightedText);
        }
    }
    
    row.appendChild(cell);
}

// Helper function to create highlighted text with a search term
function createHighlightedText(text, searchTerm) {
    const fragment = document.createDocumentFragment();
    const textLower = text.toLowerCase();
    let lastIndex = 0;
    
    // Find all occurrences of the search term
    let startIndex = textLower.indexOf(searchTerm);
    while (startIndex !== -1) {
        // Add text before match
        if (startIndex > lastIndex) {
            fragment.appendChild(document.createTextNode(
                text.substring(lastIndex, startIndex)
            ));
        }
        
        // Add highlighted match
        const highlight = document.createElement('span');
        highlight.className = 'highlight';
        highlight.style.backgroundColor = '#335533';
        highlight.style.color = '#ffffff';
        highlight.style.padding = '0 2px';
        highlight.style.borderRadius = '2px';
        highlight.textContent = text.substring(startIndex, startIndex + searchTerm.length);
        // Make highlight selectable
        highlight.style.userSelect = "text";
        fragment.appendChild(highlight);
        
        // Move to next position
        lastIndex = startIndex + searchTerm.length;
        startIndex = textLower.indexOf(searchTerm, lastIndex);
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(
            text.substring(lastIndex)
        ));
    }
    
    return fragment;
}

// Add a small delay to prevent searching on every keystroke
// Process search functionality with debounce
let searchTimeout;
processSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchTerm = processSearch.value.toLowerCase();
        filterProcesses(searchTerm);
    }, 150); // 150ms delay for better performance
});

// Clear search with escape key
processSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        processSearch.value = '';
        filterProcesses('');
    }
});

// Select all processes checkbox functionality
document.getElementById('select-all').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    
    // Get all visible process checkboxes
    const checkboxes = document.querySelectorAll('#process-tbody .process-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        
        const pid = parseInt(checkbox.dataset.pid);
        if (isChecked) {
            selectedProcesses.add(pid);
        } else {
            selectedProcesses.delete(pid);
        }
    });
    
    updateCancelButtonState();
});

// Make sure all copy/paste operations work correctly
document.addEventListener('keydown', function(e) {
    // Only let the browser handle copy (Ctrl+C) and paste (Ctrl+V)
    // Don't override the default behavior - text selection should work automatically
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        // Let the browser handle it
        return;
    }
});