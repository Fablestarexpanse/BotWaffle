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
                        ${this._messages.map((msg, index) => {
                            const tokenCount = window.TokenCounter ? window.TokenCounter.estimateTokens(msg.text || '') : 0;
                            return `
                            <button type="button" class="message-tab ${index === 0 ? 'active' : ''}" data-index="${index}">
                                Message ${index + 1} (${tokenCount} tokens)
                                ${this._messages.length > 1 ? `<span class="tab-close" data-index="${index}">×</span>` : ''}
                            </button>
                        `;
                        }).join('')}
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
                    e.stopPropagation();
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

        // Save content on input and update token counts
        panels.forEach(panel => {
            const textarea = panel.querySelector('.message-textarea');
            if (textarea) {
                textarea.addEventListener('input', () => {
                    const index = parseInt(panel.getAttribute('data-index'), 10);
                    if (this._messages[index]) {
                        this._messages[index].text = textarea.value;
                    }
                    // Update token count for this message
                    this._updateMessageTokenCount(index);
                    // Trigger editor to update all token counts
                    this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
                });
            }
        });
        
        // Initial token count update
        setTimeout(() => {
            panels.forEach((panel, index) => {
                this._updateMessageTokenCount(index);
            });
        }, 100);
    }

    _switchTab(index) {
        const tabs = this.querySelectorAll('.message-tab');
        const panels = this.querySelectorAll('.message-panel');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        
        if (tabs[index]) tabs[index].classList.add('active');
        if (panels[index]) panels[index].classList.add('active');
        
        // Update token count when switching tabs (in case content changed)
        this._updateMessageTokenCount(index);
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
    
    _updateMessageTokenCount(index) {
        if (!window.TokenCounter) return;
        
        const tab = this.querySelector(`.message-tab[data-index="${index}"]`);
        const panel = this.querySelector(`.message-panel[data-index="${index}"]`);
        
        if (!tab || !panel) return;
        
        const textarea = panel.querySelector('.message-textarea');
        if (!textarea) return;
        
        const tokenCount = window.TokenCounter.estimateTokens(textarea.value);
        // Extract base text (Message X) and preserve close button
        const closeBtn = tab.querySelector('.tab-close');
        const hasCloseBtn = closeBtn !== null;
        // Get the base text by removing token count and close button text
        let baseText = tab.textContent.replace(/\s*\(\d+\s*tokens?\)\s*/i, '').replace(/\s*×\s*$/, '').trim();
        if (!baseText.match(/^Message\s+\d+$/)) {
            // Fallback: just use "Message X"
            baseText = `Message ${index + 1}`;
        }
        
        // Update tab text, preserving close button structure
        if (hasCloseBtn && this._messages.length > 1) {
            tab.innerHTML = `${baseText} (${tokenCount} tokens)<span class="tab-close" data-index="${index}">×</span>`;
        } else {
            tab.innerHTML = `${baseText} (${tokenCount} tokens)`;
        }
        
        // Re-setup listeners for this tab after innerHTML change
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                this._removeMessage(idx);
                return;
            }
            const idx = parseInt(tab.getAttribute('data-index'), 10);
            this._switchTab(idx);
        });
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
