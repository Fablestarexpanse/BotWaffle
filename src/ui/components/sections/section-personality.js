class SectionPersonality extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Personality';
    }

    connectedCallback() {
        super.connectedCallback();
        const removeBtn = this.querySelector('.remove-btn');
        if (removeBtn) removeBtn.remove();
    }

    renderContent() {
        // Get personality text - handle both old format (object) and new format (string)
        let personalityText = '';
        if (this._data.personality) {
            if (typeof this._data.personality === 'string') {
                personalityText = this._data.personality;
            } else if (this._data.personality.characterData) {
                // Old format - extract text from characterData if available
                const char = this._data.personality.characterData;
                personalityText = char.personality || '';
            } else if (this._data.personality.personality) {
                personalityText = this._data.personality.personality;
            } else if (this._data.personality.text) {
                personalityText = this._data.personality.text;
            }
        }

        const body = this.querySelector('.section-body');
        const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (text) => {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        body.innerHTML = `
            <div class="form-group">
                <label>Personality</label>
                <textarea id="personality-textarea" class="input-field" rows="10" 
                          placeholder="Describe the character's personality, traits, behavior, and mannerisms...">${escapeHtml(personalityText)}</textarea>
                <div class="field-hint">Enter the character's personality description</div>
            </div>
        `;

        // Set up change listener and auto-resize
        const textarea = body.querySelector('#personality-textarea');
        if (textarea) {
            // Auto-resize function
            const autoResize = () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            };
            
            // Set initial height
            autoResize();
            
            // Resize on input
            textarea.addEventListener('input', () => {
                autoResize();
                this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
            });
            
            // Resize on paste
            textarea.addEventListener('paste', () => {
                setTimeout(autoResize, 0);
            });
        }
    }

    getData() {
        const textarea = this.querySelector('#personality-textarea');
        if (textarea) {
            return textarea.value || '';
        }
        return '';
    }
}

customElements.define('section-personality', SectionPersonality);
