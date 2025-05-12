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
            sendCommand(command, terminalElement.closest(".terminal-window"));
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
    // Clear search on close
    processSearch.value = '';
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
        noResultsCell.colSpan = 12; // Span all columns
        noResultsCell.textContent = 'No matching processes found';
        noResultsCell.style.textAlign = 'center';
        noResultsCell.style.padding = '20px';
        noResultsRow.appendChild(noResultsCell);
        processTable.appendChild(noResultsRow);
        return;
    }
    
    // Add each process to the table
    processes.forEach(process => {
        const row = document.createElement('tr');
        
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
        
        processTable.appendChild(row);
    });
}

// Helper function to add a cell to a table row
function addCell(row, text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) {
        cell.className = className;
    }
    row.appendChild(cell);
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
