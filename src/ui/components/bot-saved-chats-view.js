/**
 * Bot Saved Chats View Component
 * Allows uploading and storing chat logs for a character
 * Supported: TXT, MD, JSON (including SillyTavern), EPUB, and custom chat formats.
 */
class BotSavedChatsView extends HTMLElement {
    constructor() {
        super();
        this.botData = null;
        this._botId = null;
        this.MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024; // 5MB
        this.MAX_BINARY_FILE_BYTES = 25 * 1024 * 1024; // 25MB (EPUB)
        this.filteredChats = [];
        this.searchTerm = '';
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
            this.filterChats();
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
                format: 'txt',
                mime: 'text/plain',
                tags: [],
                createdAt: null,
                updatedAt: null
            };
        }
        return {
            name: chat?.name || `Chat ${index + 1}`,
            content: chat?.content || chat?.text || '',
            format: chat?.format || 'txt',
            mime: chat?.mime,
            originalFilename: chat?.originalFilename,
            originalText: chat?.originalText,
            dataBase64: chat?.dataBase64,
            byteLength: chat?.byteLength,
            tags: chat?.tags || [],
            createdAt: chat?.createdAt || null,
            updatedAt: chat?.updatedAt || null
        };
    }

    filterChats() {
        const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
        const term = this.searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredChats = chats;
            return;
        }

        this.filteredChats = chats.filter(chat => {
            const name = (chat.name || '').toLowerCase();
            const content = (chat.content || '').toLowerCase();
            const format = (this.formatLabel(chat.format) || '').toLowerCase();
            const tags = (chat.tags || []).map(t => t.toLowerCase()).join(' ');
            return name.includes(term) || content.includes(term) || format.includes(term) || tags.includes(term);
        });
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer || new ArrayBuffer(0));
        const CHUNK = 0x8000;
        const chunks = [];
        for (let i = 0; i < bytes.length; i += CHUNK) {
            const slice = bytes.subarray(i, i + CHUNK);
            chunks.push(String.fromCharCode.apply(null, slice));
        }
        return btoa(chunks.join(''));
    }

    getFileExtension(filename) {
        const name = String(filename || '');
        const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
        return m ? m[1] : '';
    }

    formatLabel(format) {
        const f = String(format || '').toLowerCase();
        switch (f) {
            case 'txt': return 'TXT';
            case 'md': return 'MD';
            case 'json': return 'JSON';
            case 'sillytavern': return 'SillyTavern';
            case 'epub': return 'EPUB';
            case 'chat': return 'CHAT';
            default: return (f || 'FILE').toUpperCase();
        }
    }

    tryParseJson(text) {
        try {
            return JSON.parse(String(text));
        } catch {
            return null;
        }
    }

    extractSillyTavernMessages(parsed) {
        // Attempt to normalize common SillyTavern chat export shapes.
        // We accept multiple variants to be robust.
        const isMsg = (m) => m && typeof m === 'object' && (
            typeof m.mes === 'string' ||
            typeof m.message === 'string' ||
            typeof m.content === 'string' ||
            typeof m.text === 'string'
        );

        const toMsgText = (m) => {
            const text = (typeof m.mes === 'string' ? m.mes
                : typeof m.message === 'string' ? m.message
                : typeof m.content === 'string' ? m.content
                : typeof m.text === 'string' ? m.text
                : '');
            const name = (typeof m.name === 'string' && m.name.trim()) ? m.name.trim()
                : (m.is_user === true || m.role === 'user') ? 'You'
                : (m.is_user === false || m.role === 'assistant') ? 'Character'
                : 'Message';
            return { name, text };
        };

        let arr = null;
        if (Array.isArray(parsed)) arr = parsed;
        else if (parsed && Array.isArray(parsed.messages)) arr = parsed.messages;
        else if (parsed && Array.isArray(parsed.chat)) arr = parsed.chat;
        else if (parsed && Array.isArray(parsed.data)) arr = parsed.data;

        if (!arr || !arr.some(isMsg)) return null;

        const msgs = arr.filter(isMsg).map(toMsgText).filter(m => m.text && m.text.trim());
        if (msgs.length === 0) return null;
        return msgs;
    }

    normalizeForReading(entry) {
        const format = String(entry.format || '').toLowerCase();
        if (format === 'epub') {
            return {
                viewerType: 'binary',
                title: entry.name,
                description: 'EPUB files can be stored and exported. Built-in reading is not supported yet.',
                content: ''
            };
        }

        if (format === 'sillytavern') {
            // Prefer normalized readable transcript if present in content; otherwise attempt parse from originalText
            const original = entry.originalText || entry.content || '';
            const parsed = this.tryParseJson(original);
            const msgs = parsed ? this.extractSillyTavernMessages(parsed) : null;
            if (msgs) {
                const transcript = msgs.map(m => `${m.name}: ${m.text}`).join('\n\n');
                return { viewerType: 'text', title: entry.name, content: transcript };
            }
            // fallback
            return { viewerType: 'text', title: entry.name, content: String(entry.content || '') };
        }

        if (format === 'json') {
            const parsed = this.tryParseJson(entry.content);
            if (parsed) {
                return { viewerType: 'text', title: entry.name, content: JSON.stringify(parsed, null, 2) };
            }
        }

        // txt/md/chat fallback: show as-is
        return { viewerType: 'text', title: entry.name, content: String(entry.content || '') };
    }

    async exportEntry(entry, { original = false } = {}) {
        try {
            const format = String(entry.format || '').toLowerCase();
            const baseName = (entry.originalFilename ? String(entry.originalFilename) : String(entry.name || 'chat'))
                .replace(/[<>:"/\\|?*]/g, '_')
                .substring(0, 200);

            if (format === 'epub') {
                if (!entry.dataBase64) throw new Error('Missing EPUB data');
                if (!window.api?.saveBinaryFile) throw new Error('Export not available');
                const filename = baseName.toLowerCase().endsWith('.epub') ? baseName : `${baseName}.epub`;
                const result = await window.api.saveBinaryFile(entry.dataBase64, filename);
                if (!result?.success && !result?.cancelled) throw new Error(result?.error || 'Export failed');
                return;
            }

            // Text exports
            if (!window.api?.saveTextFile) throw new Error('Export not available');

            if (format === 'sillytavern' && original) {
                const jsonText = String(entry.originalText || '');
                if (!jsonText) throw new Error('Missing original SillyTavern JSON');
                const filename = baseName.toLowerCase().endsWith('.json') ? baseName : `${baseName}.json`;
                const result = await window.api.saveTextFile(jsonText, filename);
                if (!result?.success && !result?.cancelled) throw new Error(result?.error || 'Export failed');
                return;
            }

            const reading = this.normalizeForReading(entry);
            const content = reading.viewerType === 'text' ? reading.content : '';

            // Choose extension
            let ext = 'txt';
            if (format === 'md') ext = 'md';
            if (format === 'json') ext = 'json';
            if (format === 'chat') ext = 'chat';
            if (format === 'sillytavern') ext = 'txt';

            const filename = baseName.match(/\.[a-z0-9]+$/i) ? baseName : `${baseName}.${ext}`;
            const result = await window.api.saveTextFile(String(content ?? ''), filename);
            if (!result?.success && !result?.cancelled) throw new Error(result?.error || 'Export failed');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast(error.message || 'Export failed', 'error');
        }
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        const chats = this.filteredChats;

        this.innerHTML = `
            <div class="bot-saved-chats-view">
                <div class="view-header">
                    <h2>Saved Chats</h2>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <button id="open-chats-location-btn" class="secondary-btn" title="Open saved chats folder">
                            <i data-feather="folder"></i>
                            Open Location
                        </button>
                        <button id="upload-chat-btn" class="primary-btn">
                            <i data-feather="upload"></i>
                            Upload Chat Files
                        </button>
                    </div>
                    <input id="chat-upload-input" class="chat-upload-input" type="file" accept=".txt,.md,.json,.chat,.epub,text/plain,text/markdown,application/json,application/epub+zip" multiple style="display:none;" />
                </div>

                <div class="resource-toolbar">
                    <div class="search-box">
                        <i data-feather="search" class="search-icon"></i>
                        <input type="text" id="chat-search-input" placeholder="Search chats..." value="${this.escapeHtml(this.searchTerm)}">
                    </div>
                </div>

                ${chats.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="message-square" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>${this.searchTerm ? 'No chats match your search' : 'No saved chats yet'}</p>
                        <p class="empty-hint">${this.searchTerm ? 'Try a different search term' : 'Upload chat files (TXT/MD/JSON/EPUB/SillyTavern) to keep logs with this character'}</p>
                    </div>
                ` : `
                    <div class="resource-grid" id="chats-grid">
                        ${chats.map((chat, index) => {
                            const allChats = this.getChats().map((c, i) => this.normalizeChat(c, i));
                            const actualIndex = allChats.findIndex(c => c.name === chat.name && c.content === chat.content && c.format === chat.format);
                            const isBinary = String(chat.format || '').toLowerCase() === 'epub';
                            const lineCount = isBinary ? 0 : Math.max(1, String(chat.content ?? '').split(/\r\n|\r|\n/).length);
                            const charCount = isBinary ? 0 : String(chat.content ?? '').length;
                            const updated = chat.updatedAt || chat.createdAt;
                            const updatedLabel = updated ? new Date(updated).toLocaleDateString() : '—';
                            const previewLines = isBinary ? '' : String(chat.content ?? '').split(/\r\n|\r|\n/).slice(0, 8);
                            const preview = isBinary ? 'Binary file (EPUB). Click View to export.' : (previewLines.join('\n').length > 250 ? previewLines.join('\n').substring(0, 250) + '…' : previewLines.join('\n'));
                            const formatBadge = this.formatLabel(chat.format);
                            const tags = chat.tags || [];

                            return `
                                <div class="resource-card" data-index="${actualIndex}">
                                    <div class="resource-card-header">
                                        <h3 title="${this.escapeHtml(chat.name)}">${this.escapeHtml(chat.name)}</h3>
                                        <span class="resource-format-badge">${this.escapeHtml(formatBadge)}</span>
                                        <div class="resource-card-actions">
                                            <button class="icon-btn view-chat-btn" data-index="${actualIndex}" title="View chat">
                                                <i data-feather="eye"></i>
                                            </button>
                                            <button class="icon-btn export-chat-btn" data-index="${actualIndex}" title="Export chat">
                                                <i data-feather="download"></i>
                                            </button>
                                            <button class="icon-btn copy-chat-btn" data-index="${actualIndex}" title="Copy chat">
                                                <i data-feather="copy"></i>
                                            </button>
                                            <button class="icon-btn remove-chat-btn" data-index="${actualIndex}" title="Remove chat">
                                                <i data-feather="trash-2"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="resource-card-tags">
                                        ${tags.length > 0 
                                            ? tags.map(tag => `<span class="tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`).join('')
                                            : '<span class="tag-placeholder">No tags</span>'}
                                        <button class="icon-btn edit-tags-btn" data-index="${actualIndex}" title="Edit tags" style="width: 24px; height: 24px; padding: 0;">
                                            <i data-feather="tag" style="width: 14px; height: 14px;"></i>
                                        </button>
                                    </div>
                                    <div class="resource-card-meta">
                                        ${isBinary ? `<span>${(chat.byteLength || 0).toLocaleString()} bytes</span>` : `<span>${lineCount} lines</span>`}
                                        ${isBinary ? '' : `<span>${charCount.toLocaleString()} chars</span>`}
                                        <span>${this.escapeHtml(updatedLabel)}</span>
                                    </div>
                                    <div class="resource-card-preview">
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
        // Open location button
        const openLocationBtn = this.querySelector('#open-chats-location-btn');
        if (openLocationBtn) {
            openLocationBtn.addEventListener('click', () => this.openLocation());
        }

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

        // Search input
        const searchInput = this.querySelector('#chat-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterChats();
                this.render();
            });
        }

        // Tag click handlers
        this.querySelectorAll('.resource-card-tags .tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagValue = tag.getAttribute('data-tag');
                if (tagValue && searchInput) {
                    searchInput.value = tagValue;
                    this.searchTerm = tagValue;
                    this.filterChats();
                    this.render();
                }
            });
        });

        // Edit tags buttons
        this.querySelectorAll('.edit-tags-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.editChatTags(index);
            });
        });

        this.querySelectorAll('.view-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.viewChat(index);
            });
        });

        this.querySelectorAll('.export-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
                const chat = chats[index];
                if (!chat) return;
                this.exportEntry(chat);
            });
        });

        this.querySelectorAll('.copy-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.copyChat(index);
            });
        });

        this.querySelectorAll('.remove-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.removeChat(index);
            });
        });
    }

    async handleUploadFiles(files) {
        try {
            const reads = files.map(file => {
                return new Promise((resolve, reject) => {
                    if (!file) return resolve(null);

                    const ext = this.getFileExtension(file.name);
                    const isEpub = ext === 'epub' || file.type === 'application/epub+zip';
                    const isText = ['txt', 'md', 'json', 'chat'].includes(ext) ||
                        ['text/plain', 'text/markdown', 'application/json'].includes(String(file.type || '').toLowerCase());

                    if (!isEpub && !isText) {
                        return reject(new Error(`Unsupported file type: ${file.name}`));
                    }

                    if (isEpub) {
                        if (file.size > this.MAX_BINARY_FILE_BYTES) {
                            return reject(new Error(`${file.name} is too large (max 25MB)`));
                        }
                        const reader = new FileReader();
                        reader.onload = () => resolve({ file, kind: 'binary', buffer: reader.result });
                        reader.onerror = () => reject(new Error(`Failed reading ${file.name}`));
                        reader.readAsArrayBuffer(file);
                        return;
                    }

                    if (file.size > this.MAX_TEXT_FILE_BYTES) {
                        return reject(new Error(`${file.name} is too large (max 5MB)`));
                    }
                    const reader = new FileReader();
                    reader.onload = () => resolve({ file, kind: 'text', text: String(reader.result ?? '') });
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
            const newEntries = results.map((result) => {
                const file = result.file;
                const ext = this.getFileExtension(file.name);
                const baseName = String(file.name || 'chat').replace(/\.[a-z0-9]+$/i, '');
                let name = baseName || 'Chat';
                if (existingNames.has(name)) {
                    let n = 2;
                    while (existingNames.has(`${name} (${n})`)) n++;
                    name = `${name} (${n})`;
                }
                existingNames.add(name);

                // EPUB (binary)
                if (result.kind === 'binary') {
                    const bytes = new Uint8Array(result.buffer || new ArrayBuffer(0));
                    const base64 = this.arrayBufferToBase64(result.buffer);
                    return {
                        name,
                        format: 'epub',
                        mime: 'application/epub+zip',
                        dataBase64: base64,
                        byteLength: bytes.length,
                        content: '',
                        tags: [],
                        originalFilename: file.name,
                        createdAt: now,
                        updatedAt: now
                    };
                }

                // Text
                const text = String(result.text ?? '');
                let format = ext || 'txt';
                let mime = file.type || (format === 'md' ? 'text/markdown' : format === 'json' ? 'application/json' : 'text/plain');

                // SillyTavern detection (JSON)
                let originalText = undefined;
                if (format === 'json') {
                    const parsed = this.tryParseJson(text);
                    const msgs = parsed ? this.extractSillyTavernMessages(parsed) : null;
                    if (msgs) {
                        format = 'sillytavern';
                        originalText = text;
                        // Keep a readable transcript in content
                        const transcript = msgs.map(m => `${m.name}: ${m.text}`).join('\n\n');
                        return {
                            name,
                            format,
                            mime: 'application/json',
                            content: transcript,
                            originalText,
                            tags: [],
                            originalFilename: file.name,
                            createdAt: now,
                            updatedAt: now
                        };
                    }
                }

                // Generic JSON prettify for easier reading (store pretty, but keep original too)
                if (format === 'json') {
                    const parsed = this.tryParseJson(text);
                    if (parsed) {
                        originalText = text;
                        return {
                            name,
                            format,
                            mime,
                            content: JSON.stringify(parsed, null, 2),
                            originalText,
                            tags: [],
                            originalFilename: file.name,
                            createdAt: now,
                            updatedAt: now
                        };
                    }
                }

                return {
                    name,
                    format,
                    mime,
                    content: text,
                    tags: [],
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

            const format = String(chat.format || '').toLowerCase();
            if (format === 'epub') {
                this.showToast('EPUB is a binary file. Use Export instead.', 'info');
                return;
            }

            const reading = this.normalizeForReading(chat);
            await navigator.clipboard.writeText(String(reading.content ?? ''));
            this.showToast('Chat copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying chat:', error);
            this.showToast('Failed to copy chat', 'error');
        }
    }

    async openLocation() {
        if (!this.botId) return;

        try {
            const chatsFolderPath = await window.api.getCharacterFolderPath(this.botId, 'saved-chats');
            if (!chatsFolderPath) {
                alert('Character folder not found');
                return;
            }
            await window.api.openPath(chatsFolderPath);
        } catch (error) {
            console.error('Error opening location:', error);
            alert('Error opening folder: ' + (error.message || 'Unknown error'));
        }
    }

    viewChat(index) {
        const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
        const chat = chats[index];
        if (!chat) return;

        const reading = this.normalizeForReading(chat);
        const format = String(chat.format || '').toLowerCase();

        const modal = document.createElement('div');
        modal.className = 'chat-view-modal';
        modal.innerHTML = `
            <div class="chat-view-modal-content">
                <div class="chat-view-modal-header">
                    <div class="chat-view-modal-title">
                        <h3>${this.escapeHtml(reading.title || chat.name)}</h3>
                        <span class="chat-format-badge">${this.escapeHtml(this.formatLabel(chat.format))}</span>
                    </div>
                    <button class="chat-view-modal-close" title="Close">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="chat-view-modal-body">
                    ${reading.viewerType === 'binary'
                        ? `<div class="chat-binary-note">
                                <p>${this.escapeHtml(reading.description || '')}</p>
                                <p class="chat-binary-meta">${this.escapeHtml(chat.originalFilename || '')} ${(chat.byteLength ? `(${chat.byteLength.toLocaleString()} bytes)` : '')}</p>
                           </div>`
                        : this.renderTextWithLineNumbers(reading.content)}
                </div>
                <div class="chat-view-modal-footer">
                    <button class="secondary-btn chat-view-modal-export">
                        <i data-feather="download"></i>
                        Export
                    </button>
                    ${format === 'sillytavern' && chat.originalText ? `
                        <button class="secondary-btn chat-view-modal-export-original">
                            <i data-feather="file-text"></i>
                            Export Original JSON
                        </button>
                    ` : ''}
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
                if (reading.viewerType === 'binary') {
                    this.showToast('Use Export for this file type', 'info');
                    return;
                }
                await navigator.clipboard.writeText(String(reading.content ?? ''));
                this.showToast('Copied to clipboard!', 'success');
            } catch (e) {
                this.showToast('Failed to copy chat', 'error');
            }
        });

        modal.querySelector('.chat-view-modal-export')?.addEventListener('click', async () => {
            await this.exportEntry(chat);
        });
        modal.querySelector('.chat-view-modal-export-original')?.addEventListener('click', async () => {
            await this.exportEntry(chat, { original: true });
        });
    }

    async editChatTags(index) {
        try {
            const chats = this.getChats().map((c, i) => this.normalizeChat(c, i));
            const chat = chats[index];
            if (!chat) return;

            const currentTags = (chat.tags || []).join(', ');
            const tagsInput = await this.showInputModal('Edit Tags', 'Enter tags separated by commas:', currentTags);
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            const currentData = await window.api.chatbot.get(this.botId);
            const existing = currentData.metadata?.savedChats || currentData.savedChats || [];
            if (index < 0 || index >= existing.length) return;

            existing[index] = {
                ...existing[index],
                tags: tags,
                updatedAt: new Date().toISOString()
            };

            const metadata = currentData.metadata || {};
            metadata.savedChats = existing;
            await window.api.chatbot.update(this.botId, { metadata });

            await this.loadBotData();
            this.showToast('Tags updated', 'success');
        } catch (error) {
            console.error('Error editing tags:', error);
            this.showToast('Error editing tags', 'error');
        }
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
            
            input.style.pointerEvents = 'auto';
            input.style.position = 'relative';
            input.style.zIndex = '10001';
            input.style.cursor = 'text';
            
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

            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('focus', (e) => e.stopPropagation());

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

