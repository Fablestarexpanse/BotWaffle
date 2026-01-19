/**
 * Bot Scripts View Component
 * Manages scripts (lorebook scripts, etc.) for this character
 */
class BotScriptsView extends HTMLElement {
    constructor() {
        super();
        this.botId = null;
        this.botData = null;
    }

    escapeHtml(str) {
        const escapeHtml = window.SecurityUtils?.escapeHtml || ((s) => {
            const div = document.createElement('div');
            div.textContent = s;
            return div.innerHTML;
        });
        return escapeHtml(String(str ?? ''));
    }

    renderCodeWithLineNumbers(text) {
        const raw = String(text ?? '');
        const lines = raw.split(/\r\n|\r|\n/);

        const gutter = lines.map((_, i) => `${i + 1}`).join('\n');
        const code = lines.map((line) => {
            // Preserve empty lines so the layout stays consistent
            return line === '' ? '\u00A0' : line;
        }).join('\n');

        return `
            <div class="code-with-lines">
                <pre class="code-gutter" aria-hidden="true">${this.escapeHtml(gutter)}</pre>
                <pre class="code-content">${this.escapeHtml(code)}</pre>
            </div>
        `;
    }

    set botId(value) {
        this._botId = value;
        if (value) {
            this.loadBotData();
        }
    }

    get botId() {
        return this._botId;
    }

    async loadBotData() {
        if (!this.botId) return;

        try {
            this.botData = await window.api.chatbot.get(this.botId);
            this.render();
        } catch (error) {
            console.error('Error loading bot data:', error);
            this.innerHTML = '<div class="error-message">Failed to load bot data</div>';
        }
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        // Get scripts from bot data (stored in metadata.scripts)
        const scripts = this.botData.metadata?.scripts || this.botData.scripts || [];

        this.innerHTML = `
            <div class="bot-scripts-view">
                <div class="view-header">
                    <h2>Character Scripts</h2>
                    <button id="add-script-btn" class="primary-btn">
                        <i data-feather="plus"></i>
                        Add Script
                    </button>
                </div>

                ${scripts.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="file-text" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>No scripts saved yet</p>
                        <p class="empty-hint">Add scripts to store lorebook entries, activation systems, and other code for this character</p>
                    </div>
                ` : `
                    <div class="scripts-list" id="scripts-list">
                        ${scripts.map((script, index) => {
                            const scriptContent = typeof script === 'string' ? script : (script.content || script.text || '');
                            const scriptName = typeof script === 'object' && script.name ? script.name : `Script ${index + 1}`;
                            // Show full content (scrollable)
                            return `
                                <div class="script-card" data-index="${index}">
                                    <div class="script-header">
                                        <h3>${this.escapeHtml(scriptName)}</h3>
                                        <button class="icon-btn copy-script-btn" data-index="${index}" title="Copy script">
                                            <i data-feather="copy"></i>
                                        </button>
                                        <button class="icon-btn edit-script-btn" data-index="${index}" title="Edit script">
                                            <i data-feather="edit-2"></i>
                                        </button>
                                        <button class="icon-btn remove-script-btn" data-index="${index}" title="Remove script">
                                            <i data-feather="trash-2"></i>
                                        </button>
                                    </div>
                                    <div class="script-content">
                                        <div class="script-code">${this.renderCodeWithLineNumbers(scriptContent)}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        // Re-initialize feather icons
        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        this.setupListeners();
    }

    setupListeners() {
        // Add script button
        const addBtn = this.querySelector('#add-script-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddScript());
        }

        // Copy script buttons
        this.querySelectorAll('.copy-script-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.copy-script-btn').getAttribute('data-index'));
                this.copyScript(index);
            });
        });

        // Edit script buttons
        this.querySelectorAll('.edit-script-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.edit-script-btn').getAttribute('data-index'));
                this.editScript(index);
            });
        });

        // Remove script buttons
        this.querySelectorAll('.remove-script-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-script-btn').getAttribute('data-index'));
                this.removeScript(index);
            });
        });
    }

    async handleAddScript() {
        try {
            // Show modal to paste script content
            const scriptContent = await this.showScriptInputModal('Add Script', 'Paste your script content here:', '');
            if (!scriptContent || !scriptContent.trim()) {
                return;
            }

            // Get script name
            const scriptName = await this.showInputModal('Name Script', 'Enter a name for this script:', '');
            if (!scriptName || !scriptName.trim()) {
                return;
            }

            // Get current scripts
            const currentData = await window.api.chatbot.get(this.botId);
            const scripts = currentData.metadata?.scripts || currentData.scripts || [];

            // Add new script
            const newScript = {
                name: scriptName.trim(),
                content: scriptContent.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            scripts.push(newScript);

            // Update bot data
            const metadata = currentData.metadata || {};
            metadata.scripts = scripts;

            await window.api.chatbot.update(this.botId, { metadata: metadata });

            // Refresh view
            await this.loadBotData();

            // Refresh chatbot list to update script count
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList) {
                chatbotList.loadChatbots();
            }

            this.showToast(`Script "${scriptName.trim()}" added successfully!`, 'success');
        } catch (error) {
            console.error('Error adding script:', error);
            this.showToast('Error adding script: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async copyScript(index) {
        try {
            const scripts = this.botData.metadata?.scripts || this.botData.scripts || [];
            const script = scripts[index];
            if (!script) return;

            const scriptContent = typeof script === 'string' ? script : (script.content || script.text || '');
            
            await navigator.clipboard.writeText(scriptContent);
            this.showToast('Script copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying script:', error);
            this.showToast('Error copying script: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async editScript(index) {
        try {
            const scripts = this.botData.metadata?.scripts || this.botData.scripts || [];
            const script = scripts[index];
            if (!script) return;

            const scriptContent = typeof script === 'string' ? script : (script.content || script.text || '');
            const scriptName = typeof script === 'object' && script.name ? script.name : `Script ${index + 1}`;

            // Show edit modal
            const newContent = await this.showScriptInputModal('Edit Script', 'Edit script content:', scriptContent);
            if (newContent === null) {
                return; // User cancelled
            }

            // Get new name
            const newName = await this.showInputModal('Edit Script Name', 'Enter a name for this script:', scriptName);
            if (!newName || !newName.trim()) {
                return;
            }

            // Update script
            const currentData = await window.api.chatbot.get(this.botId);
            const updatedScripts = [...(currentData.metadata?.scripts || currentData.scripts || [])];
            
            updatedScripts[index] = {
                ...updatedScripts[index],
                name: newName.trim(),
                content: newContent.trim(),
                updatedAt: new Date().toISOString()
            };

            // Update bot data
            const metadata = currentData.metadata || {};
            metadata.scripts = updatedScripts;

            await window.api.chatbot.update(this.botId, { metadata: metadata });

            // Refresh view
            await this.loadBotData();

            // Refresh chatbot list
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList) {
                chatbotList.loadChatbots();
            }

            this.showToast(`Script "${newName.trim()}" updated successfully!`, 'success');
        } catch (error) {
            console.error('Error editing script:', error);
            this.showToast('Error editing script: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async removeScript(index) {
        if (!confirm('Are you sure you want to remove this script?')) return;

        try {
            const currentData = await window.api.chatbot.get(this.botId);
            const scripts = currentData.metadata?.scripts || currentData.scripts || [];
            const script = scripts[index];
            const scriptName = typeof script === 'object' && script.name ? script.name : `Script ${index + 1}`;

            // Remove script
            scripts.splice(index, 1);

            // Update bot data
            const metadata = currentData.metadata || {};
            metadata.scripts = scripts;

            await window.api.chatbot.update(this.botId, { metadata: metadata });

            // Refresh view
            await this.loadBotData();

            // Refresh chatbot list
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList) {
                chatbotList.loadChatbots();
            }

            this.showToast(`Script "${scriptName}" removed successfully!`, 'success');
        } catch (error) {
            console.error('Error removing script:', error);
            this.showToast('Error removing script: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async showInputModal(title, placeholder, defaultValue) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'input-modal';
            modal.innerHTML = `
                <div class="input-modal-content">
                    <div class="input-modal-header">
                        <h3>${title}</h3>
                        <button class="input-modal-close">&times;</button>
                    </div>
                    <div class="input-modal-body">
                        <input type="text" class="input-modal-input" placeholder="${placeholder}" value="${defaultValue || ''}">
                    </div>
                    <div class="input-modal-footer">
                        <button class="input-modal-btn input-modal-cancel">Cancel</button>
                        <button class="input-modal-btn input-modal-confirm primary-btn">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.input-modal-input');
            
            // Make input clickable and editable
            input.style.pointerEvents = 'auto';
            input.style.position = 'relative';
            input.style.zIndex = '10001';
            input.style.cursor = 'text';
            
            // Focus and select after a small delay to ensure modal is fully rendered
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);

            const close = () => {
                modal.remove();
                resolve('');
            };

            const confirm = () => {
                const value = input.value.trim();
                modal.remove();
                resolve(value);
            };

            modal.querySelector('.input-modal-close').addEventListener('click', close);
            modal.querySelector('.input-modal-cancel').addEventListener('click', close);
            modal.querySelector('.input-modal-confirm').addEventListener('click', confirm);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            // Prevent clicks on input from closing modal
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
            });

            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirm();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
            });
        });
    }

    async showScriptInputModal(title, placeholder, defaultValue) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'script-input-modal';
            modal.innerHTML = `
                <div class="script-input-modal-content">
                    <div class="script-input-modal-header">
                        <h3>${title}</h3>
                        <button class="script-input-modal-close">&times;</button>
                    </div>
                    <div class="script-input-modal-body">
                        <div class="script-editor">
                            <pre class="script-editor-gutter" aria-hidden="true"></pre>
                            <textarea class="script-input-modal-textarea script-editor-textarea" placeholder="${placeholder}" rows="20">${defaultValue || ''}</textarea>
                        </div>
                    </div>
                    <div class="script-input-modal-footer">
                        <button class="script-input-modal-btn script-input-modal-cancel">Cancel</button>
                        <button class="script-input-modal-btn script-input-modal-confirm primary-btn">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const textarea = modal.querySelector('.script-input-modal-textarea');
            const gutter = modal.querySelector('.script-editor-gutter');

            const updateLineNumbers = () => {
                const lineCount = Math.max(1, String(textarea.value ?? '').split(/\r\n|\r|\n/).length);
                const lines = Array.from({ length: lineCount }, (_, i) => `${i + 1}`).join('\n');
                gutter.textContent = lines;
                gutter.scrollTop = textarea.scrollTop;
            };

            updateLineNumbers();
            
            // Make textarea clickable and editable
            textarea.style.pointerEvents = 'auto';
            textarea.style.position = 'relative';
            textarea.style.zIndex = '10001';
            textarea.style.cursor = 'text';
            
            // Focus after a small delay to ensure modal is fully rendered
            setTimeout(() => {
                textarea.focus();
                if (defaultValue) {
                    textarea.setSelectionRange(0, defaultValue.length);
                } else {
                    textarea.setSelectionRange(0, 0);
                }
            }, 50);

            const close = () => {
                modal.remove();
                resolve(null);
            };

            const confirm = () => {
                const value = textarea.value;
                modal.remove();
                resolve(value);
            };

            modal.querySelector('.script-input-modal-close').addEventListener('click', close);
            modal.querySelector('.script-input-modal-cancel').addEventListener('click', close);
            modal.querySelector('.script-input-modal-confirm').addEventListener('click', confirm);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            // Prevent clicks on textarea from closing modal
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            textarea.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            textarea.addEventListener('focus', (e) => {
                e.stopPropagation();
            });

            textarea.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
                // Allow Ctrl+Enter to confirm
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    confirm();
                }
            });

            textarea.addEventListener('input', updateLineNumbers);
            textarea.addEventListener('scroll', () => {
                gutter.scrollTop = textarea.scrollTop;
            });
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

customElements.define('bot-scripts-view', BotScriptsView);
