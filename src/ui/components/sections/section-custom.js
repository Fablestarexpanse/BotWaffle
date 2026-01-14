class SectionCustom extends customElements.get('section-base') {
    constructor() {
        super();
        this._category = '';
        this._fields = [];
    }

    get category() {
        return this._category || '';
    }

    set category(value) {
        this._category = value || '';
        this._title = this._category || 'Custom Section';
        // Update header if it exists
        this.updateHeader();
    }

    get fields() {
        return this._fields || [];
    }

    set fields(value) {
        this._fields = value || [];
        if (this.isConnected && this.querySelector('.section-body')) {
            this.renderContent();
        }
    }

    connectedCallback() {
        // Ensure title is set before rendering frame
        if (this._category && !this._title) {
            this._title = this._category;
        } else if (!this._title) {
            this._title = 'Custom Section';
        }
        // Call parent connectedCallback which renders the frame
        super.connectedCallback();
    }

    renderContent() {
        const body = this.querySelector('.section-body');
        // Access custom section data - stored under customSections[categoryName]
        const customSections = this._data.customSections || {};
        const sectionData = customSections[this._category] || {};
        
        body.innerHTML = `
            <div class="custom-section-form">
                ${this._fields.map((field, index) => {
                    const value = sectionData[field.name] || field.defaultValue || '';
                    return this.renderField(field, value, index);
                }).join('')}
            </div>
        `;
        
        // Set up event listeners for input fields to prevent header click interference
        this.setupInputListeners();
    }

    setupInputListeners() {
        const body = this.querySelector('.section-body');
        if (!body) return;
        
        // Add event listeners to all input fields to prevent header click from interfering
        // Use simple bubbling phase - no need for capture phase which can cause delays
        body.querySelectorAll('.input-field, input, textarea, select').forEach(input => {
            // Only stop propagation on click and focus - the essential ones
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('input', () => {
                this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
            });
        });
        
        // Also stop propagation on labels
        body.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    renderField(field, value, index) {
        const fieldId = `field-${index}-${field.name}`;
        
        switch (field.type) {
            case 'text':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label || field.name}</label>
                        <input type="text" id="${fieldId}" name="${field.name}" 
                               class="input-field" value="${this.escapeHtml(value)}" 
                               placeholder="${field.placeholder || ''}">
                    </div>
                `;
            
            case 'textarea':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label || field.name}</label>
                        <textarea id="${fieldId}" name="${field.name}" 
                                  class="input-field" rows="${field.rows || 4}" 
                                  placeholder="${field.placeholder || ''}">${this.escapeHtml(value)}</textarea>
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label || field.name}</label>
                        <input type="number" id="${fieldId}" name="${field.name}" 
                               class="input-field" value="${value}" 
                               placeholder="${field.placeholder || ''}">
                    </div>
                `;
            
            case 'select':
                const options = (field.options || []).map(opt => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    const selected = value === optValue ? 'selected' : '';
                    return `<option value="${this.escapeHtml(optValue)}" ${selected}>${this.escapeHtml(optLabel)}</option>`;
                }).join('');
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label || field.name}</label>
                        <select id="${fieldId}" name="${field.name}" class="input-field">
                            ${options}
                        </select>
                    </div>
                `;
            
            case 'checkbox':
                const checked = value === true || value === 'true' ? 'checked' : '';
                return `
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="${fieldId}" name="${field.name}" 
                                   class="input-field" ${checked}>
                            <span>${field.label || field.name}</span>
                        </label>
                    </div>
                `;
            
            default:
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label || field.name}</label>
                        <input type="text" id="${fieldId}" name="${field.name}" 
                               class="input-field" value="${this.escapeHtml(value)}" 
                               placeholder="${field.placeholder || ''}">
                    </div>
                `;
        }
    }

    escapeHtml(text) {
        // Use global security utility for consistency
        return window.SecurityUtils.escapeHtml(text);
    }

    getData() {
        const body = this.querySelector('.section-body');
        const data = {};
        
        this._fields.forEach(field => {
            const input = body.querySelector(`[name="${field.name}"]`);
            if (input) {
                if (field.type === 'checkbox') {
                    data[field.name] = input.checked;
                } else if (field.type === 'number') {
                    data[field.name] = input.value ? Number(input.value) : null;
                } else {
                    data[field.name] = input.value || '';
                }
            }
        });
        
        return data;
    }
}

customElements.define('section-custom', SectionCustom);

