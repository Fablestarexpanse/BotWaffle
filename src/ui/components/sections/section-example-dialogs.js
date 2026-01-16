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

        const normalizedDialogs = dialogsData.map((dialog) => {
            if (typeof dialog === 'string') {
                return { id: this._generateId(), text: dialog };
            }

            if (dialog && typeof dialog === 'object') {
                const textValue = typeof dialog.text === 'string'
                    ? dialog.text
                    : [dialog.user ? `User: ${dialog.user}` : '', dialog.assistant ? `Assistant: ${dialog.assistant}` : '']
                        .filter(Boolean)
                        .join('\n');
                return { id: dialog.id || this._generateId(), text: textValue || '' };
            }

            return { id: this._generateId(), text: '' };
        });

        // Initialize with one empty dialog if empty
        if (normalizedDialogs.length === 0) {
            normalizedDialogs.push({ id: this._generateId(), text: '' });
        }

        this._dialogs = normalizedDialogs;

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
                                        <label>Example Dialog</label>
                                        <textarea class="input-field dialog-text" rows="6" placeholder="Enter the example dialog...">${escapeHtml(dialog.text || '')}</textarea>
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
            const dialogTextarea = item.querySelector('.dialog-text');
            
            if (dialogTextarea) {
                // Prevent header click from interfering
                dialogTextarea.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                dialogTextarea.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                dialogTextarea.addEventListener('input', () => {
                    if (this._dialogs[index]) {
                        this._dialogs[index].text = dialogTextarea.value;
                    }
                });
            }
        });
    }

    _addDialog() {
        const newDialog = { id: this._generateId(), text: '' };
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
            const dialogTextarea = item.querySelector('.dialog-text');
            const text = dialogTextarea ? dialogTextarea.value.trim() : '';
            
            // Only include if dialog has content
            if (text) {
                const dialog = this._dialogs[index] || { id: this._generateId() };
                dialogs.push({
                    id: dialog.id,
                    text
                });
            }
        });

        return dialogs.length > 0 ? dialogs : [];
    }
}

customElements.define('section-example-dialogs', SectionExampleDialogs);
