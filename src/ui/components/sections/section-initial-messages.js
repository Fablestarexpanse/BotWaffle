class SectionInitialMessages extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Initial Messages';
        this._messages = [];
    }

    set messages(value) {
        this._messages = Array.isArray(value) ? value : [];
        if (this.isConnected && this.querySelector('.section-body')) {
            this.renderContent();
        }
    }

    get messages() {
        return this._messages || [];
    }

    connectedCallback() {
        super.connectedCallback();
    }

    renderContent() {
        const body = this.querySelector('.section-body');
        const initialMessages = this._data.initialMessages || this._data.scenario?.initialMessages || this._data.scenario?.messages || [];
        
        // Initialize messages if empty
        if (initialMessages.length === 0) {
            initialMessages.push({ id: this._generateId(), text: '' });
        }
        
        this._messages = initialMessages;

        const escapeHtml = window.SecurityUtils.escapeHtml;
        
        body.innerHTML = `
            <div class="initial-messages-section">
                <div class="form-group">
                    <div class="initial-messages-header">
                        <label>Initial Messages</label>
                        <button type="button" id="add-message-btn" class="secondary-btn small">+ Add Message</button>
                    </div>
                    <div class="messages-tabs" id="messages-tabs">
                        ${this._messages.map((msg, index) => `
                            <button type="button" class="message-tab ${index === 0 ? 'active' : ''}" data-index="${index}">
                                Message ${index + 1}
                                ${this._messages.length > 1 ? `<span class="tab-close" data-index="${index}">×</span>` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <div class="messages-content" id="messages-content">
                        ${this._messages.map((msg, index) => `
                            <div class="message-panel ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <textarea class="input-field message-textarea" rows="6" placeholder="Enter initial message...">${escapeHtml(msg.text || '')}</textarea>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this._setupListeners();
    }

    _generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _setupListeners() {
        const tabs = this.querySelectorAll('.message-tab');
        const panels = this.querySelectorAll('.message-panel');
        const addBtn = this.querySelector('#add-message-btn');

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) {
                    const index = parseInt(e.target.getAttribute('data-index'), 10);
                    this._removeMessage(index);
                    return;
                }
                
                const index = parseInt(tab.getAttribute('data-index'), 10);
                this._switchTab(index);
            });
        });

        // Add new message
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this._addMessage();
            });
        }

        // Save content on input
        panels.forEach(panel => {
            const textarea = panel.querySelector('.message-textarea');
            if (textarea) {
                textarea.addEventListener('input', () => {
                    const index = parseInt(panel.getAttribute('data-index'), 10);
                    if (this._messages[index]) {
                        this._messages[index].text = textarea.value;
                    }
                });
            }
        });
    }

    _switchTab(index) {
        const tabs = this.querySelectorAll('.message-tab');
        const panels = this.querySelectorAll('.message-panel');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        
        if (tabs[index]) tabs[index].classList.add('active');
        if (panels[index]) panels[index].classList.add('active');
    }

    _addMessage() {
        const newMsg = { id: this._generateId(), text: '' };
        this._messages.push(newMsg);
        this.renderContent();
        
        // Switch to the new tab
        setTimeout(() => {
            this._switchTab(this._messages.length - 1);
        }, 50);
    }

    _removeMessage(index) {
        if (this._messages.length <= 1) {
            // Don't allow removing the last message
            return;
        }
        
        this._messages.splice(index, 1);
        this.renderContent();
        
        // Switch to first tab if we removed the active one
        if (index >= this._messages.length) {
            this._switchTab(0);
        } else {
            this._switchTab(index);
        }
    }

    getData() {
        // Collect all message texts
        const messages = [];
        this._messages.forEach(msg => {
            const panel = this.querySelector(`.message-panel[data-index="${this._messages.indexOf(msg)}"]`);
            if (panel) {
                const textarea = panel.querySelector('.message-textarea');
                const text = textarea ? textarea.value : msg.text;
                if (text.trim()) {
                    messages.push({ id: msg.id, text: text.trim() });
                }
            } else {
                // Fallback: use stored value
                if (msg.text && msg.text.trim()) {
                    messages.push({ id: msg.id, text: msg.text.trim() });
                }
            }
        });

        return messages.length > 0 ? messages : [];
    }
}

customElements.define('section-initial-messages', SectionInitialMessages);
