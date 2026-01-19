/**
 * Bot Saved Chats View Component
 * Allows uploading and storing .txt chat logs for a character
 */
class BotSavedChatsView extends HTMLElement {
    constructor() {
        super();
        this.botData = null;
        this._botId = null;
        this.MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
    }

    set botId(value) {
        this._botId = value;
        if (value) this.loadBotData();
    }

    get botId() {
        return this._botId;
    }

    escapeHtml(str) {
        const escapeHtml = window.SecurityUtils?.escapeHtml || ((s) => {
            const div = document.createElement('div');
            div.textContent = s;
            return div.innerHTML;
        });
        return escapeHtml(String(str ?? ''));
    }

    renderTextWithLineNumbers(text) {
        const raw = String(text ?? '');
        const lines = raw.split(/\r\n|\r|\n/);
        const gutter = lines.map((_, i) => `${i + 1}`).join('\n');
        const body = lines.map((line) => (line === '' ? '\u00A0' : line)).join('\n');

        return `
            <div class="code-with-lines chat-with-lines">
                <pre class="code-gutter" aria-hidden="true">${this.escapeHtml(gutter)}</pre>
                <pre class="code-content">${this.escapeHtml(body)}</pre>
            </div>
        `;
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

    getChats() {
        return this.botData?.metadata?.savedChats || this.botData?.savedChats || [];
    }

    normalizeChat(chat, index) {
        if (typeof chat === 'string') {
            return {
                name: `Chat ${index + 1}`,
                content: chat,
                createdAt: null,
                updatedAt: null
            };
        }
        return {
            name: chat?.name || `Chat ${index + 1}`,
            content: chat?.content || chat?.text || '',
            originalFilename: chat?.originalFilename,
            createdAt: chat?.createdAt || null,
            updatedAt: chat?.updatedAt || null
        };
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));

        this.innerHTML = `
            <div class="bot-saved-chats-view">
                <div class="view-header">
                    <h2>Saved Chats</h2>
                    <button id="upload-chat-btn" class="primary-btn">
                        <i data-feather="upload"></i>
                        Upload .txt Chat
                    </button>
                    <input id="chat-upload-input" class="chat-upload-input" type="file" accept=".txt,text/plain" multiple style="display:none;" />
                </div>

                ${chats.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="message-square" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>No saved chats yet</p>
                        <p class="empty-hint">Upload .txt chat files to keep logs with this character</p>
                    </div>
                ` : `
                    <div class="chats-list" id="chats-list">
                        ${chats.map((chat, index) => {
                            const lineCount = Math.max(1, String(chat.content ?? '').split(/\r\n|\r|\n/).length);
                            const charCount = String(chat.content ?? '').length;
                            const updated = chat.updatedAt || chat.createdAt;
                            const updatedLabel = updated ? new Date(updated).toLocaleString() : '—';
                            const previewLines = String(chat.content ?? '').split(/\r\n|\r|\n/).slice(0, 6).join('\n');
                            const preview = previewLines.length > 600 ? previewLines.slice(0, 600) + '…' : previewLines;

                            return `
                                <div class="chat-card" data-index="${index}">
                                    <div class="chat-header">
                                        <h3 title="${this.escapeHtml(chat.name)}">${this.escapeHtml(chat.name)}</h3>
                                        <button class="icon-btn view-chat-btn" data-index="${index}" title="View chat">
                                            <i data-feather="eye"></i>
                                        </button>
                                        <button class="icon-btn copy-chat-btn" data-index="${index}" title="Copy chat">
                                            <i data-feather="copy"></i>
                                        </button>
                                        <button class="icon-btn remove-chat-btn" data-index="${index}" title="Remove chat">
                                            <i data-feather="trash-2"></i>
                                        </button>
                                    </div>
                                    <div class="chat-meta">
                                        <span>${lineCount} lines</span>
                                        <span>${charCount.toLocaleString()} chars</span>
                                        <span>Updated: ${this.escapeHtml(updatedLabel)}</span>
                                    </div>
                                    <div class="chat-preview">
                                        <pre>${this.escapeHtml(preview)}</pre>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        this.setupListeners();
    }

    setupListeners() {
        const uploadBtn = this.querySelector('#upload-chat-btn');
        const uploadInput = this.querySelector('#chat-upload-input');

        if (uploadBtn && uploadInput) {
            uploadBtn.addEventListener('click', () => uploadInput.click());
            uploadInput.addEventListener('change', async () => {
                const files = Array.from(uploadInput.files || []);
                uploadInput.value = '';
                if (files.length === 0) return;
                await this.handleUploadFiles(files);
            });
        }

        this.querySelectorAll('.view-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.view-chat-btn').getAttribute('data-index'));
                this.viewChat(index);
            });
        });

        this.querySelectorAll('.copy-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.copy-chat-btn').getAttribute('data-index'));
                this.copyChat(index);
            });
        });

        this.querySelectorAll('.remove-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-chat-btn').getAttribute('data-index'));
                this.removeChat(index);
            });
        });
    }

    async handleUploadFiles(files) {
        try {
            // Size/type validation + read as text
            const reads = files.map(file => {
                return new Promise((resolve, reject) => {
                    if (!file) return resolve(null);
                    const isTxt = (file.type === 'text/plain') || (String(file.name || '').toLowerCase().endsWith('.txt'));
                    if (!isTxt) {
                        return reject(new Error(`Unsupported file type: ${file.name}`));
                    }
                    if (file.size > this.MAX_FILE_BYTES) {
                        return reject(new Error(`${file.name} is too large (max 5MB)`));
                    }
                    const reader = new FileReader();
                    reader.onload = () => resolve({ file, text: String(reader.result ?? '') });
                    reader.onerror = () => reject(new Error(`Failed reading ${file.name}`));
                    reader.readAsText(file);
                });
            });

            const results = (await Promise.all(reads)).filter(Boolean);
            if (results.length === 0) return;

            const currentData = await window.api.chatbot.get(this.botId);
            const existing = currentData.metadata?.savedChats || currentData.savedChats || [];

            const existingNames = new Set(existing.map((c, i) => {
                if (typeof c === 'string') return `Chat ${i + 1}`;
                return c?.name;
            }).filter(Boolean));

            const now = new Date().toISOString();
            const newEntries = results.map(({ file, text }) => {
                const baseName = String(file.name || 'chat.txt').replace(/\.txt$/i, '');
                let name = baseName || 'Chat';
                if (existingNames.has(name)) {
                    let n = 2;
                    while (existingNames.has(`${name} (${n})`)) n++;
                    name = `${name} (${n})`;
                }
                existingNames.add(name);

                return {
                    name,
                    content: text,
                    originalFilename: file.name,
                    createdAt: now,
                    updatedAt: now
                };
            });

            const metadata = currentData.metadata || {};
            metadata.savedChats = [...existing, ...newEntries];

            await window.api.chatbot.update(this.botId, { metadata });
            await this.loadBotData();
            this.showToast(`Uploaded ${newEntries.length} chat file(s)`, 'success');
        } catch (error) {
            console.error('Error uploading chats:', error);
            this.showToast(error.message || 'Error uploading chats', 'error');
        }
    }

    async copyChat(index) {
        try {
            const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
            const chat = chats[index];
            if (!chat) return;

            await navigator.clipboard.writeText(String(chat.content ?? ''));
            this.showToast('Chat copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying chat:', error);
            this.showToast('Failed to copy chat', 'error');
        }
    }

    viewChat(index) {
        const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
        const chat = chats[index];
        if (!chat) return;

        const modal = document.createElement('div');
        modal.className = 'chat-view-modal';
        modal.innerHTML = `
            <div class="chat-view-modal-content">
                <div class="chat-view-modal-header">
                    <h3>${this.escapeHtml(chat.name)}</h3>
                    <button class="chat-view-modal-close" title="Close">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="chat-view-modal-body">
                    ${this.renderTextWithLineNumbers(chat.content)}
                </div>
                <div class="chat-view-modal-footer">
                    <button class="secondary-btn chat-view-modal-copy">
                        <i data-feather="copy"></i>
                        Copy
                    </button>
                    <button class="primary-btn chat-view-modal-close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        const close = () => modal.remove();
        modal.querySelector('.chat-view-modal-close')?.addEventListener('click', close);
        modal.querySelector('.chat-view-modal-close-btn')?.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
        modal.querySelector('.chat-view-modal-copy')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(String(chat.content ?? ''));
                this.showToast('Chat copied to clipboard!', 'success');
            } catch (e) {
                this.showToast('Failed to copy chat', 'error');
            }
        });
    }

    async removeChat(index) {
        if (!confirm('Remove this saved chat?')) return;

        try {
            const currentData = await window.api.chatbot.get(this.botId);
            const existing = currentData.metadata?.savedChats || currentData.savedChats || [];
            if (index < 0 || index >= existing.length) return;

            existing.splice(index, 1);

            const metadata = currentData.metadata || {};
            metadata.savedChats = existing;
            await window.api.chatbot.update(this.botId, { metadata });

            await this.loadBotData();
            this.showToast('Saved chat removed', 'success');
        } catch (error) {
            console.error('Error removing chat:', error);
            this.showToast('Error removing chat', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

customElements.define('bot-saved-chats-view', BotSavedChatsView);

