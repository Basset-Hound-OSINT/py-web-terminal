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