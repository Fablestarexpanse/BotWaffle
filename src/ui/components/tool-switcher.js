class ToolSwitcher extends HTMLElement {
    constructor() {
        super();
        this.activeTool = 'bot-waffle'; // default
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    render() {
        this.innerHTML = `
            <div class="switcher-container">
                <button class="switcher-btn ${this.activeTool === 'bot-waffle' ? 'active' : ''}" data-tool="bot-waffle">
                    <span class="icon">🤖</span>
                    <span class="label">BotWaffle</span>
                </button>
                <div class="divider"></div>
                <button class="switcher-btn ${this.activeTool === 'prompt-waffle' ? 'active' : ''}" data-tool="prompt-waffle">
                    <span class="icon">🧇</span>
                    <span class="label">PromptWaffle</span>
                </button>
            </div>
        `;
    }

    setupListeners() {
        this.querySelectorAll('.switcher-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.getAttribute('data-tool');
                if (tool !== this.activeTool) {
                    this.switchTool(tool);
                }
            });
        });
    }

    switchTool(tool) {
        this.activeTool = tool;

        // Update UI
        this.querySelectorAll('.switcher-btn').forEach(btn => {
            if (btn.getAttribute('data-tool') === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Dispatch event
        this.dispatchEvent(new CustomEvent('tool-switch', {
            detail: { tool },
            bubbles: true
        }));
    }
}

customElements.define('tool-switcher', ToolSwitcher);
