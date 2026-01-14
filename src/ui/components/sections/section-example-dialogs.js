class SectionExampleDialogs extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Example Dialogs';
        this._dialogs = [];
    }

    set dialogs(value) {
        this._dialogs = Array.isArray(value) ? value : [];
        if (this.isConnected && this.querySelector('.section-body')) {
            this.renderContent();
        }
    }

    get dialogs() {
        return this._dialogs || [];
    }

    connectedCallback() {
        super.connectedCallback();
    }

    renderContent() {
        const body = this.querySelector('.section-body');
        const dialogsData = this._data.exampleDialogs || this._data.dialogs || [];
        
        // Initialize with one empty dialog if empty
        if (dialogsData.length === 0) {
            dialogsData.push({ id: this._generateId(), user: '', assistant: '' });
        }
        
        this._dialogs = dialogsData;

        const escapeHtml = window.SecurityUtils.escapeHtml;
        
        body.innerHTML = `
            <div class="example-dialogs-section">
                <div class="form-group">
                    <div class="dialogs-header">
                        <label>Example Dialogs</label>
                        <button type="button" id="add-dialog-btn" class="secondary-btn small">+ Add Dialog</button>
                    </div>
                    <div class="dialogs-list" id="dialogs-list">
                        ${this._dialogs.map((dialog, index) => `
                            <div class="dialog-item" data-index="${index}">
                                <div class="dialog-header">
                                    <span class="dialog-number">Dialog ${index + 1}</span>
                                    ${this._dialogs.length > 1 ? `<button type="button" class="icon-btn small remove-dialog-btn" data-index="${index}" title="Remove">×</button>` : ''}
                                </div>
                                <div class="dialog-content">
                                    <div class="form-group">
                                        <label>User:</label>
                                        <textarea class="input-field dialog-user" rows="3" placeholder="User message...">${escapeHtml(dialog.user || '')}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label>Assistant:</label>
                                        <textarea class="input-field dialog-assistant" rows="3" placeholder="Assistant response...">${escapeHtml(dialog.assistant || '')}</textarea>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this._setupListeners();
    }

    _generateId() {
        return 'dialog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _setupListeners() {
        const addBtn = this.querySelector('#add-dialog-btn');
        const removeBtns = this.querySelectorAll('.remove-dialog-btn');

        // Add new dialog
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this._addDialog();
            });
        }

        // Remove dialog
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                this._removeDialog(index);
            });
        });

        // Save content on input
        const dialogItems = this.querySelectorAll('.dialog-item');
        dialogItems.forEach(item => {
            const index = parseInt(item.getAttribute('data-index'), 10);
            const userTextarea = item.querySelector('.dialog-user');
            const assistantTextarea = item.querySelector('.dialog-assistant');
            
            if (userTextarea) {
                // Prevent header click from interfering
                userTextarea.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                userTextarea.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                userTextarea.addEventListener('input', () => {
                    if (this._dialogs[index]) {
                        this._dialogs[index].user = userTextarea.value;
                    }
                });
            }
            
            if (assistantTextarea) {
                // Prevent header click from interfering
                assistantTextarea.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                assistantTextarea.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                assistantTextarea.addEventListener('input', () => {
                    if (this._dialogs[index]) {
                        this._dialogs[index].assistant = assistantTextarea.value;
                    }
                });
            }
        });
    }

    _addDialog() {
        const newDialog = { id: this._generateId(), user: '', assistant: '' };
        this._dialogs.push(newDialog);
        this.renderContent();
    }

    _removeDialog(index) {
        if (this._dialogs.length <= 1) {
            // Don't allow removing the last dialog
            return;
        }
        
        this._dialogs.splice(index, 1);
        this.renderContent();
    }

    getData() {
        const dialogs = [];
        const dialogItems = this.querySelectorAll('.dialog-item');
        
        dialogItems.forEach(item => {
            const index = parseInt(item.getAttribute('data-index'), 10);
            const userTextarea = item.querySelector('.dialog-user');
            const assistantTextarea = item.querySelector('.dialog-assistant');
            
            const user = userTextarea ? userTextarea.value.trim() : '';
            const assistant = assistantTextarea ? assistantTextarea.value.trim() : '';
            
            // Only include if at least one field has content
            if (user || assistant) {
                const dialog = this._dialogs[index] || { id: this._generateId() };
                dialogs.push({
                    id: dialog.id,
                    user: user,
                    assistant: assistant
                });
            }
        });

        return dialogs.length > 0 ? dialogs : [];
    }
}

customElements.define('section-example-dialogs', SectionExampleDialogs);
