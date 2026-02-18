class BotBioView extends HTMLElement {
    constructor() {
        super();
        this._botId = null;
        this.botData = null;
        this.bioProfiles = [];
        this.activeProfileId = null;
        this._isHtmlMode = false;
        this._savedRange = null;
    }

    set botId(value) {
        this._botId = value;
        if (value) this.loadBotData();
    }

    get botId() {
        return this._botId;
    }

    async loadBotData() {
        try {
            this.botData = await window.api.chatbot.get(this._botId);
            this.bioProfiles = Array.isArray(this.botData.bioProfiles) ? this.botData.bioProfiles : [];
            this.render();
        } catch (err) {
            console.error('[BotBioView] Failed to load bot data:', err);
            this.innerHTML = `<div style="color:var(--danger);padding:20px;">Failed to load character data.</div>`;
        }
    }

    _generateId() {
        return 'bio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _getCharacterImages() {
        return this.botData?.profile?.images || (this.botData?.profile?.image ? [this.botData.profile.image] : []);
    }

    render() {
        const botName = this.botData?.profile?.name || 'Character';
        const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (t) => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        this.innerHTML = `
            <div class="bio-view-wrapper">
                <div class="bio-view-header">
                    <h2 class="bio-view-title">
                        <i data-feather="user"></i>
                        Character Bio — ${escapeHtml(botName)}
                    </h2>
                    <p class="bio-view-subtitle">Build a rich text profile bio. Save multiple versions for different platforms or AU scenarios.</p>
                </div>

                <div class="bio-view-body">
                    <!-- LEFT: Editor -->
                    <div class="bio-editor-panel">
                        <div class="bio-toolbar" id="bio-toolbar">
                            <!-- Paragraph style -->
                            <select class="bio-format-select" id="bio-format-select" title="Paragraph style">
                                <option value="p">Paragraph</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                            </select>

                            <div class="bio-toolbar-sep"></div>

                            <!-- Bold / Italic / Underline -->
                            <button type="button" class="bio-tool-btn" data-cmd="bold" title="Bold"><b>B</b></button>
                            <button type="button" class="bio-tool-btn" data-cmd="italic" title="Italic"><i>I</i></button>
                            <button type="button" class="bio-tool-btn" data-cmd="underline" title="Underline"><u>U</u></button>

                            <div class="bio-toolbar-sep"></div>

                            <!-- Text color -->
                            <label class="bio-color-btn" title="Text color">
                                <span class="bio-color-icon" id="bio-text-color-icon" style="border-bottom:3px solid #F0F4F8;">A</span>
                                <input type="color" id="bio-text-color" value="#F0F4F8" style="display:none;">
                            </label>

                            <!-- Highlight color -->
                            <label class="bio-color-btn" title="Highlight color">
                                <span class="bio-color-icon" id="bio-highlight-icon" style="background:#FFAB00;color:#000;">H</span>
                                <input type="color" id="bio-highlight-color" value="#FFAB00" style="display:none;">
                            </label>

                            <div class="bio-toolbar-sep"></div>

                            <!-- Alignment -->
                            <button type="button" class="bio-tool-btn" data-cmd="justifyLeft" title="Align left">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2"/><rect x="0" y="5" width="9" height="2"/><rect x="0" y="9" width="14" height="2"/><rect x="0" y="13" width="9" height="2"/></svg>
                            </button>
                            <button type="button" class="bio-tool-btn" data-cmd="justifyCenter" title="Align center">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2"/><rect x="2.5" y="5" width="9" height="2"/><rect x="0" y="9" width="14" height="2"/><rect x="2.5" y="13" width="9" height="2"/></svg>
                            </button>
                            <button type="button" class="bio-tool-btn" data-cmd="justifyRight" title="Align right">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2"/><rect x="5" y="5" width="9" height="2"/><rect x="0" y="9" width="14" height="2"/><rect x="5" y="13" width="9" height="2"/></svg>
                            </button>
                            <button type="button" class="bio-tool-btn" data-cmd="justifyFull" title="Justify">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2"/><rect x="0" y="5" width="14" height="2"/><rect x="0" y="9" width="14" height="2"/><rect x="0" y="13" width="14" height="2"/></svg>
                            </button>

                            <div class="bio-toolbar-sep"></div>

                            <!-- Insert Image (from character images) -->
                            <button type="button" class="bio-tool-btn" id="bio-insert-image-btn" title="Insert image from character's saved images">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </button>

                            <!-- Insert Link -->
                            <button type="button" class="bio-tool-btn" id="bio-insert-link-btn" title="Insert link">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>

                            <div class="bio-toolbar-sep"></div>

                            <!-- HTML source toggle -->
                            <button type="button" class="bio-tool-btn" id="bio-html-toggle-btn" title="Toggle HTML source view">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            </button>
                        </div>

                        <!-- Rich text editor -->
                        <div class="bio-editor" id="bio-editor" contenteditable="true" spellcheck="true">
                            <p><br></p>
                        </div>

                        <!-- HTML source editor (hidden by default) -->
                        <textarea class="bio-html-source" id="bio-html-source" spellcheck="false" placeholder="HTML source..."></textarea>

                        <div class="bio-editor-footer">
                            <span class="bio-char-count" id="bio-char-count">0 characters</span>
                            ${this.activeProfileId ? `<span class="bio-active-label">Editing: <strong>${escapeHtml(this._getActiveProfileName())}</strong></span>` : '<span class="bio-active-label" style="opacity:0.5;">No profile loaded</span>'}
                        </div>
                    </div>

                    <!-- RIGHT: Saved Profiles -->
                    <div class="bio-profiles-panel">
                        <div class="bio-profiles-header">
                            <h3 class="bio-profiles-title">Saved Profiles</h3>
                        </div>

                        <!-- Save / Update form -->
                        <div class="bio-save-form">
                            <div class="form-group" style="margin-bottom:8px;">
                                <input type="text" id="bio-profile-name" class="input-field" placeholder="Profile name (e.g. Main, Dark AU)" maxlength="60">
                            </div>
                            <div class="form-group" style="margin-bottom:10px;">
                                <input type="text" id="bio-profile-tag" class="input-field" placeholder="Tag / category (e.g. Canon, NSFW)" maxlength="30">
                            </div>
                            <div class="bio-save-actions">
                                <button type="button" id="bio-save-new-btn" class="primary-btn" style="flex:1;">Save as New</button>
                                <button type="button" id="bio-update-btn" class="secondary-btn" style="flex:1;" ${this.activeProfileId ? '' : 'disabled'}>Update Current</button>
                            </div>
                        </div>

                        <div class="bio-profiles-list" id="bio-profiles-list">
                            ${this._renderProfilesList(escapeHtml)}
                        </div>
                    </div>
                </div>

                <!-- Insert Image Modal -->
                <div class="bio-modal-overlay" id="bio-image-modal" style="display:none;">
                    <div class="bio-modal">
                        <div class="bio-modal-header">
                            <h3>Insert Image</h3>
                            <button type="button" class="bio-modal-close" id="bio-image-modal-close">&times;</button>
                        </div>
                        <div class="bio-modal-body" id="bio-image-modal-body">
                            <!-- populated dynamically -->
                        </div>
                    </div>
                </div>

                <!-- Insert Link Modal -->
                <div class="bio-modal-overlay" id="bio-link-modal" style="display:none;">
                    <div class="bio-modal">
                        <div class="bio-modal-header">
                            <h3>Insert Link</h3>
                            <button type="button" class="bio-modal-close" id="bio-link-modal-close">&times;</button>
                        </div>
                        <div class="bio-modal-body">
                            <div class="form-group">
                                <label>Link Text</label>
                                <input type="text" id="bio-link-text" class="input-field" placeholder="Display text">
                            </div>
                            <div class="form-group">
                                <label>URL</label>
                                <input type="url" id="bio-link-url" class="input-field" placeholder="https://...">
                            </div>
                        </div>
                        <div class="bio-modal-footer">
                            <button type="button" class="secondary-btn" id="bio-link-cancel">Cancel</button>
                            <button type="button" class="primary-btn" id="bio-link-insert">Insert Link</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (typeof feather !== 'undefined') feather.replace();
        this._setupStyles();
        this._setupListeners();
    }

    _getActiveProfileName() {
        const p = this.bioProfiles.find(p => p.id === this.activeProfileId);
        return p ? p.name : '';
    }

    _renderProfilesList(escapeHtml) {
        if (!escapeHtml) escapeHtml = (t) => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if (this.bioProfiles.length === 0) {
            return `<div class="bio-profiles-empty">No saved profiles yet.<br>Write a bio and click "Save as New".</div>`;
        }
        return this.bioProfiles.map((profile) => {
            const isActive = profile.id === this.activeProfileId;
            const date = profile.updated ? new Date(profile.updated).toLocaleDateString() : '';
            return `
                <div class="bio-profile-card ${isActive ? 'active' : ''}" data-id="${escapeHtml(profile.id)}">
                    <div class="bio-profile-card-header">
                        <div class="bio-profile-card-info">
                            <span class="bio-profile-name">${escapeHtml(profile.name || 'Untitled')}</span>
                            ${profile.tag ? `<span class="bio-profile-tag">${escapeHtml(profile.tag)}</span>` : ''}
                        </div>
                        <span class="bio-profile-date">${date}</span>
                    </div>
                    <div class="bio-profile-card-actions">
                        <button type="button" class="secondary-btn small bio-load-btn" data-id="${escapeHtml(profile.id)}" title="Load this profile into editor">
                            ${isActive ? 'Loaded' : 'Load'}
                        </button>
                        <button type="button" class="danger-btn small bio-delete-btn" data-id="${escapeHtml(profile.id)}" title="Delete this profile">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    _setupStyles() {
        const styleId = 'bot-bio-view-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ── Wrapper ───────────────────────────────────── */
            .bio-view-wrapper {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--bg-primary);
                color: var(--text-primary);
                overflow: hidden;
                position: relative;
            }
            .bio-view-header {
                padding: 20px 24px 12px;
                border-bottom: 1px solid #334155;
                flex-shrink: 0;
            }
            .bio-view-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 4px;
            }
            .bio-view-title svg { color: var(--accent); }
            .bio-view-subtitle {
                font-size: 13px;
                color: var(--text-secondary);
                margin: 0;
            }

            /* ── Body split ───────────────────────────────── */
            .bio-view-body {
                display: flex;
                flex: 1;
                overflow: hidden;
                gap: 0;
            }

            /* ── Editor Panel ─────────────────────────────── */
            .bio-editor-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #334155;
                overflow: hidden;
            }

            /* ── Toolbar ──────────────────────────────────── */
            .bio-toolbar {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 12px;
                background: var(--bg-secondary);
                border-bottom: 1px solid #334155;
                flex-wrap: wrap;
                flex-shrink: 0;
            }
            .bio-format-select {
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid #334155;
                border-radius: var(--radius-sm);
                padding: 4px 8px;
                font-size: 13px;
                cursor: pointer;
                outline: none;
            }
            .bio-format-select:focus {
                border-color: var(--accent-glow);
                box-shadow: 0 0 0 2px rgba(0,245,255,0.15);
            }
            .bio-toolbar-sep {
                width: 1px;
                height: 22px;
                background: #334155;
                margin: 0 4px;
            }
            .bio-tool-btn {
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid #334155;
                border-radius: 6px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 13px;
                transition: background 0.15s, border-color 0.15s, color 0.15s;
                flex-shrink: 0;
                padding: 0;
            }
            .bio-tool-btn:hover {
                background: var(--accent);
                color: #000;
                border-color: var(--accent);
            }
            .bio-tool-btn:hover svg { stroke: #000; }
            .bio-tool-btn.active {
                background: var(--accent);
                color: #000;
                border-color: var(--accent);
            }
            .bio-tool-btn.active svg { stroke: #000; }
            .bio-color-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: var(--bg-tertiary);
                border: 1px solid #334155;
                border-radius: 6px;
                cursor: pointer;
                transition: border-color 0.15s;
                flex-shrink: 0;
            }
            .bio-color-btn:hover { border-color: var(--accent-glow); }
            .bio-color-icon {
                font-size: 14px;
                font-weight: 700;
                line-height: 1;
                pointer-events: none;
                padding: 2px;
            }

            /* ── Editable area ────────────────────────────── */
            .bio-editor {
                flex: 1;
                padding: 20px 24px;
                overflow-y: auto;
                outline: none;
                font-size: 15px;
                line-height: 1.7;
                color: var(--text-primary);
                background: var(--bg-primary);
                min-height: 200px;
                caret-color: var(--accent);
            }
            .bio-editor:focus {
                box-shadow: inset 0 0 0 1px rgba(0,245,255,0.2);
            }
            .bio-editor p { margin: 0 0 8px; }
            .bio-editor h1 { font-size: 26px; font-weight: 700; margin: 12px 0 8px; color: var(--accent); }
            .bio-editor h2 { font-size: 20px; font-weight: 600; margin: 10px 0 6px; color: var(--accent-glow); }
            .bio-editor h3 { font-size: 16px; font-weight: 600; margin: 8px 0 4px; color: var(--text-secondary); }
            .bio-editor a { color: var(--accent-glow); text-decoration: underline; }
            .bio-editor img { max-width: 100%; border-radius: 6px; margin: 4px 0; }
            .bio-editor[contenteditable="true"]:empty:before {
                content: "Start writing...";
                color: var(--text-secondary);
                font-style: italic;
                pointer-events: none;
            }

            /* ── HTML source textarea ─────────────────────── */
            .bio-html-source {
                display: none;
                flex: 1;
                padding: 16px 20px;
                background: #0a0f1e;
                color: #7dd3fc;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 13px;
                line-height: 1.6;
                border: none;
                outline: none;
                resize: none;
                overflow-y: auto;
            }
            .bio-html-source.visible {
                display: block;
            }

            .bio-editor-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 16px;
                background: var(--bg-secondary);
                border-top: 1px solid #334155;
                font-size: 12px;
                color: var(--text-secondary);
                flex-shrink: 0;
            }
            .bio-active-label { font-size: 12px; }

            /* ── Profiles Panel ───────────────────────────── */
            .bio-profiles-panel {
                width: 300px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                background: var(--bg-secondary);
                overflow: hidden;
            }
            .bio-profiles-header {
                padding: 16px 16px 8px;
                border-bottom: 1px solid #334155;
                flex-shrink: 0;
            }
            .bio-profiles-title {
                font-size: 14px;
                font-weight: 600;
                margin: 0;
                color: var(--text-primary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .bio-save-form {
                padding: 12px 16px;
                border-bottom: 1px solid #334155;
                flex-shrink: 0;
            }
            .bio-save-actions {
                display: flex;
                gap: 8px;
            }
            .bio-profiles-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .bio-profiles-empty {
                text-align: center;
                color: var(--text-secondary);
                font-size: 13px;
                padding: 24px 16px;
                line-height: 1.6;
            }
            .bio-profile-card {
                background: var(--bg-tertiary);
                border: 1px solid #334155;
                border-radius: var(--radius-sm);
                padding: 10px 12px;
                transition: border-color 0.15s;
            }
            .bio-profile-card.active {
                border-color: var(--accent);
                box-shadow: 0 0 0 1px rgba(255,171,0,0.2);
            }
            .bio-profile-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
                gap: 8px;
            }
            .bio-profile-card-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            .bio-profile-name {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .bio-profile-tag {
                display: inline-block;
                font-size: 10px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 20px;
                background: rgba(0,245,255,0.1);
                color: var(--accent-glow);
                border: 1px solid rgba(0,245,255,0.2);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                width: fit-content;
            }
            .bio-profile-date {
                font-size: 11px;
                color: var(--text-secondary);
                white-space: nowrap;
                flex-shrink: 0;
            }
            .bio-profile-card-actions {
                display: flex;
                gap: 6px;
            }
            .bio-profile-card-actions .small {
                padding: 4px 10px;
                font-size: 12px;
            }

            /* ── Modals ───────────────────────────────────── */
            .bio-modal-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
            }
            .bio-modal {
                background: var(--bg-secondary);
                border: 1px solid #334155;
                border-radius: var(--radius-md);
                width: 480px;
                max-width: 90%;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            .bio-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #334155;
                flex-shrink: 0;
            }
            .bio-modal-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            .bio-modal-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 20px;
                cursor: pointer;
                line-height: 1;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
            .bio-modal-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
            .bio-modal-body {
                padding: 16px 20px;
                overflow-y: auto;
                flex: 1;
            }
            .bio-modal-footer {
                padding: 12px 20px;
                border-top: 1px solid #334155;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                flex-shrink: 0;
            }

            /* ── Image picker grid ────────────────────────── */
            .bio-image-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .bio-image-thumb {
                aspect-ratio: 1;
                border-radius: 6px;
                overflow: hidden;
                border: 2px solid #334155;
                cursor: pointer;
                transition: border-color 0.15s, transform 0.1s;
                background: var(--bg-tertiary);
            }
            .bio-image-thumb:hover {
                border-color: var(--accent);
                transform: scale(1.03);
            }
            .bio-image-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            .bio-image-empty {
                text-align: center;
                color: var(--text-secondary);
                font-size: 13px;
                padding: 24px;
                line-height: 1.6;
            }
        `;
        document.head.appendChild(style);
    }

    _setupListeners() {
        const toolbar = this.querySelector('#bio-toolbar');
        const editor = this.querySelector('#bio-editor');
        const htmlSource = this.querySelector('#bio-html-source');
        const formatSelect = this.querySelector('#bio-format-select');
        const textColorInput = this.querySelector('#bio-text-color');
        const textColorIcon = this.querySelector('#bio-text-color-icon');
        const highlightInput = this.querySelector('#bio-highlight-color');
        const highlightIcon = this.querySelector('#bio-highlight-icon');
        const insertImageBtn = this.querySelector('#bio-insert-image-btn');
        const insertLinkBtn = this.querySelector('#bio-insert-link-btn');
        const htmlToggleBtn = this.querySelector('#bio-html-toggle-btn');
        const saveNewBtn = this.querySelector('#bio-save-new-btn');
        const updateBtn = this.querySelector('#bio-update-btn');
        const profilesList = this.querySelector('#bio-profiles-list');
        const charCount = this.querySelector('#bio-char-count');

        // ── Toolbar: button commands ──────────────────────
        if (toolbar) {
            toolbar.addEventListener('mousedown', (e) => {
                const btn = e.target.closest('[data-cmd]');
                if (btn) {
                    e.preventDefault();
                    document.execCommand(btn.dataset.cmd, false, null);
                    editor?.focus();
                    this._updateToolbarState();
                }
            });
        }

        // ── Format select ─────────────────────────────────
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                document.execCommand('formatBlock', false, e.target.value);
                editor?.focus();
            });
        }

        // ── Text color ────────────────────────────────────
        if (textColorInput) {
            const textColorLabel = textColorInput.closest('label');
            if (textColorLabel) {
                textColorLabel.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    editor?.focus();
                    this._savedRange = this._saveSelection();
                    textColorInput.click();
                });
            }
            textColorInput.addEventListener('input', (e) => {
                if (this._savedRange) this._restoreSelection(this._savedRange);
                document.execCommand('foreColor', false, e.target.value);
                if (textColorIcon) textColorIcon.style.borderBottomColor = e.target.value;
            });
        }

        // ── Highlight color ───────────────────────────────
        if (highlightInput) {
            const highlightLabel = highlightInput.closest('label');
            if (highlightLabel) {
                highlightLabel.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    editor?.focus();
                    this._savedRange = this._saveSelection();
                    highlightInput.click();
                });
            }
            highlightInput.addEventListener('input', (e) => {
                if (this._savedRange) this._restoreSelection(this._savedRange);
                document.execCommand('hiliteColor', false, e.target.value);
                if (highlightIcon) {
                    highlightIcon.style.background = e.target.value;
                    const hex = e.target.value.replace('#','');
                    const r = parseInt(hex.substr(0,2),16);
                    const g = parseInt(hex.substr(2,2),16);
                    const b = parseInt(hex.substr(4,2),16);
                    highlightIcon.style.color = (r*0.299 + g*0.587 + b*0.114) > 128 ? '#000' : '#fff';
                }
            });
        }

        // ── Insert Image ──────────────────────────────────
        if (insertImageBtn) {
            insertImageBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this._savedRange = this._saveSelection();
                this._openImageModal();
            });
        }

        // ── Insert Link ───────────────────────────────────
        if (insertLinkBtn) {
            insertLinkBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this._savedRange = this._saveSelection();
                this._openLinkModal();
            });
        }

        // ── HTML source toggle ────────────────────────────
        if (htmlToggleBtn) {
            htmlToggleBtn.addEventListener('click', () => this._toggleHtmlMode());
        }

        // ── Editor: char count + toolbar state ───────────
        if (editor) {
            editor.addEventListener('input', () => {
                const text = editor.innerText || '';
                if (charCount) charCount.textContent = `${text.length} characters`;
            });
            editor.addEventListener('keyup', () => this._updateToolbarState());
            editor.addEventListener('mouseup', () => this._updateToolbarState());
        }

        // ── Image modal ───────────────────────────────────
        const imageModal = this.querySelector('#bio-image-modal');
        const imageModalClose = this.querySelector('#bio-image-modal-close');
        if (imageModalClose) {
            imageModalClose.addEventListener('click', () => {
                if (imageModal) imageModal.style.display = 'none';
            });
        }
        if (imageModal) {
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) imageModal.style.display = 'none';
            });
        }

        // ── Link modal ────────────────────────────────────
        const linkModal = this.querySelector('#bio-link-modal');
        const linkModalClose = this.querySelector('#bio-link-modal-close');
        const linkCancel = this.querySelector('#bio-link-cancel');
        const linkInsert = this.querySelector('#bio-link-insert');

        if (linkModalClose) linkModalClose.addEventListener('click', () => { if (linkModal) linkModal.style.display = 'none'; });
        if (linkCancel) linkCancel.addEventListener('click', () => { if (linkModal) linkModal.style.display = 'none'; });
        if (linkModal) {
            linkModal.addEventListener('click', (e) => {
                if (e.target === linkModal) linkModal.style.display = 'none';
            });
        }
        if (linkInsert) {
            linkInsert.addEventListener('click', () => this._insertLink());
        }

        // ── Save as New ───────────────────────────────────
        if (saveNewBtn) {
            saveNewBtn.addEventListener('click', () => this._saveAsNew());
        }

        // ── Update Current ────────────────────────────────
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this._updateCurrent());
        }

        // ── Profiles list: load / delete ──────────────────
        if (profilesList) {
            profilesList.addEventListener('click', (e) => {
                const loadBtn = e.target.closest('.bio-load-btn');
                const deleteBtn = e.target.closest('.bio-delete-btn');
                if (loadBtn) this._loadProfile(loadBtn.getAttribute('data-id'));
                if (deleteBtn) this._deleteProfile(deleteBtn.getAttribute('data-id'));
            });
        }
    }

    // ── HTML source toggle ────────────────────────────────
    _toggleHtmlMode() {
        const editor = this.querySelector('#bio-editor');
        const htmlSource = this.querySelector('#bio-html-source');
        const htmlToggleBtn = this.querySelector('#bio-html-toggle-btn');
        if (!editor || !htmlSource) return;

        this._isHtmlMode = !this._isHtmlMode;

        if (this._isHtmlMode) {
            // Switch to HTML view: copy innerHTML → textarea
            htmlSource.value = editor.innerHTML;
            editor.style.display = 'none';
            htmlSource.classList.add('visible');
            htmlToggleBtn?.classList.add('active');
            htmlSource.focus();
        } else {
            // Switch back to rich text: apply textarea content → editor
            editor.innerHTML = htmlSource.value || '<p><br></p>';
            htmlSource.classList.remove('visible');
            editor.style.display = '';
            htmlToggleBtn?.classList.remove('active');
            editor.focus();
        }
    }

    // ── Image modal ───────────────────────────────────────
    _openImageModal() {
        const modal = this.querySelector('#bio-image-modal');
        const body = this.querySelector('#bio-image-modal-body');
        if (!modal || !body) return;

        const images = this._getCharacterImages();

        if (images.length === 0) {
            body.innerHTML = `<div class="bio-image-empty">No images found for this character.<br>Add images in the <strong>Pictures</strong> section first.</div>`;
        } else {
            body.innerHTML = `<div class="bio-image-grid">${images.map((src, i) => `
                <div class="bio-image-thumb" data-src="${src}" title="Click to insert">
                    <img src="${src}" alt="Character image ${i+1}" loading="lazy">
                </div>
            `).join('')}</div>`;

            body.querySelectorAll('.bio-image-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const src = thumb.getAttribute('data-src');
                    this._insertImage(src);
                    modal.style.display = 'none';
                });
            });
        }

        modal.style.display = 'flex';
    }

    _insertImage(src) {
        const editor = this.querySelector('#bio-editor');
        if (!editor) return;
        editor.focus();
        if (this._savedRange) this._restoreSelection(this._savedRange);
        document.execCommand('insertHTML', false, `<img src="${src}" alt="" style="max-width:100%;">`);
    }

    // ── Link modal ────────────────────────────────────────
    _openLinkModal() {
        const modal = this.querySelector('#bio-link-modal');
        const linkText = this.querySelector('#bio-link-text');
        const linkUrl = this.querySelector('#bio-link-url');
        if (!modal) return;

        // Pre-fill text with current selection
        const sel = window.getSelection();
        if (linkText) linkText.value = (sel && sel.toString().trim()) ? sel.toString().trim() : '';
        if (linkUrl) linkUrl.value = '';

        modal.style.display = 'flex';
        setTimeout(() => { (linkUrl || linkText)?.focus(); }, 50);
    }

    _insertLink() {
        const modal = this.querySelector('#bio-link-modal');
        const linkText = this.querySelector('#bio-link-text')?.value?.trim();
        const linkUrl = this.querySelector('#bio-link-url')?.value?.trim();
        if (!linkUrl) return;

        const editor = this.querySelector('#bio-editor');
        if (!editor) return;
        editor.focus();
        if (this._savedRange) this._restoreSelection(this._savedRange);

        const sel = window.getSelection();
        const hasSelection = sel && sel.toString().trim().length > 0;
        const displayText = linkText || linkUrl;

        if (hasSelection) {
            document.execCommand('createLink', false, linkUrl);
        } else {
            document.execCommand('insertHTML', false, `<a href="${linkUrl}">${displayText}</a>`);
        }

        if (modal) modal.style.display = 'none';
    }

    // ── Utilities ─────────────────────────────────────────
    _saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
        return null;
    }

    _restoreSelection(range) {
        if (!range) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    _updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
        commands.forEach(cmd => {
            const btn = this.querySelector(`[data-cmd="${cmd}"]`);
            if (btn) {
                try { btn.classList.toggle('active', document.queryCommandState(cmd)); }
                catch (e) { /* ignore */ }
            }
        });

        const formatSelect = this.querySelector('#bio-format-select');
        if (formatSelect) {
            try {
                const blockFormat = document.queryCommandValue('formatBlock').toLowerCase();
                const optionMap = { 'p': 'p', 'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'div': 'p' };
                formatSelect.value = optionMap[blockFormat] || 'p';
            } catch(e) { /* ignore */ }
        }
    }

    _getEditorContent() {
        if (this._isHtmlMode) {
            // If in HTML mode, get from the textarea
            return this.querySelector('#bio-html-source')?.value || '';
        }
        return this.querySelector('#bio-editor')?.innerHTML || '';
    }

    // ── Profile CRUD ──────────────────────────────────────
    async _saveAsNew() {
        const nameInput = this.querySelector('#bio-profile-name');
        const tagInput = this.querySelector('#bio-profile-tag');
        const name = nameInput?.value?.trim() || 'Untitled';
        const tag = tagInput?.value?.trim() || '';
        const content = this._getEditorContent();

        const profile = {
            id: this._generateId(),
            name,
            tag,
            content,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.bioProfiles.push(profile);
        this.activeProfileId = profile.id;

        await this._persist();
        this._refreshProfilesPanel();

        if (nameInput) nameInput.value = '';
        if (tagInput) tagInput.value = '';
    }

    async _updateCurrent() {
        if (!this.activeProfileId) return;
        const idx = this.bioProfiles.findIndex(p => p.id === this.activeProfileId);
        if (idx === -1) return;

        this.bioProfiles[idx].content = this._getEditorContent();
        this.bioProfiles[idx].updated = new Date().toISOString();

        await this._persist();
        this._refreshProfilesPanel();
    }

    _loadProfile(id) {
        const profile = this.bioProfiles.find(p => p.id === id);
        if (!profile) return;

        const editor = this.querySelector('#bio-editor');
        const htmlSource = this.querySelector('#bio-html-source');

        // If in HTML mode, update both
        if (this._isHtmlMode && htmlSource) {
            htmlSource.value = profile.content || '<p><br></p>';
        }
        if (editor) editor.innerHTML = profile.content || '<p><br></p>';

        this.activeProfileId = id;
        this._refreshProfilesPanel();

        const activeLabel = this.querySelector('.bio-active-label');
        if (activeLabel) {
            const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (t) => String(t ?? '');
            activeLabel.innerHTML = `Editing: <strong>${escapeHtml(profile.name)}</strong>`;
            activeLabel.style.opacity = '1';
        }

        const updateBtn = this.querySelector('#bio-update-btn');
        if (updateBtn) updateBtn.disabled = false;
    }

    async _deleteProfile(id) {
        const profile = this.bioProfiles.find(p => p.id === id);
        if (!profile) return;

        const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (t) => String(t ?? '');
        if (!confirm(`Delete profile "${escapeHtml(profile.name)}"? This cannot be undone.`)) return;

        this.bioProfiles = this.bioProfiles.filter(p => p.id !== id);

        if (this.activeProfileId === id) {
            this.activeProfileId = null;
            const editor = this.querySelector('#bio-editor');
            if (editor) editor.innerHTML = '<p><br></p>';
            const activeLabel = this.querySelector('.bio-active-label');
            if (activeLabel) { activeLabel.textContent = 'No profile loaded'; activeLabel.style.opacity = '0.5'; }
            const updateBtn = this.querySelector('#bio-update-btn');
            if (updateBtn) updateBtn.disabled = true;
        }

        await this._persist();
        this._refreshProfilesPanel();
    }

    async _persist() {
        try {
            await window.api.chatbot.update(this._botId, { bioProfiles: this.bioProfiles });
        } catch (err) {
            console.error('[BotBioView] Failed to save bio profiles:', err);
        }
    }

    _refreshProfilesPanel() {
        const list = this.querySelector('#bio-profiles-list');
        if (!list) return;
        const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (t) => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        list.innerHTML = this._renderProfilesList(escapeHtml);
    }
}

customElements.define('bot-bio-view', BotBioView);
