class PersonalityBuilder extends HTMLElement {
    constructor() {
        super();
        this._data = {};
        this._mode = 'create';
    }

    set data(value) {
        this._data = value || {};
        this.render();
    }

    get data() {
        return this.getCharacterFromForm();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const char = this._data.characterData || {}; // Handle nested data if present
        const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (text) => {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        this.innerHTML = `
            <div class="personality-builder">
                <h3>Personality & Traits (PromptWaffle Engine)</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Gender</label>
                        <input type="text" id="p-gender" value="${escapeHtml(char.gender || '')}" placeholder="Female, Male, Non-binary...">
                    </div>
                    
                    <div class="form-group">
                        <label>Age</label>
                        <input type="text" id="p-age" value="${escapeHtml(char.age || '')}" placeholder="25, Ancient, Teenage...">
                    </div>

                    <div class="form-group">
                        <label>Role / Occupation</label>
                         <!-- Mapped to 'style' or 'class' in original tool -->
                        <input type="text" id="p-role" value="${escapeHtml(char.style || '')}" placeholder="Warrior, Student, Assistant...">
                    </div>
                </div>

                <div class="form-group">
                    <label>Personality Traits</label>
                    <textarea id="p-personality" rows="3" placeholder="Cheerful, sarcastic, analytical, shy...">${escapeHtml(char.personality || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Visual Description (Hair, Eyes, Clothing)</label>
                    <div class="nested-grid">
                        <input type="text" id="p-hair" value="${escapeHtml(char.hair || '')}" placeholder="Hair">
                        <input type="text" id="p-eyes" value="${escapeHtml(char.eyes || '')}" placeholder="Eyes">
                        <input type="text" id="p-clothing" value="${escapeHtml(char.clothing || '')}" placeholder="Clothing">
                    </div>
                </div>

                <div class="preview-section">
                    <label>System Prompt Preview</label>
                    <div id="p-preview" class="preview-box"></div>
                </div>
            </div>
        `;

        this.setupListeners();
        this.updatePreview();
    }

    setupListeners() {
        const inputs = this.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
                this.dispatchEvent(new CustomEvent('change', { bubbles: true }));
            });
        });
    }

    updatePreview() {
        const previewEl = this.querySelector('#p-preview');
        if (!previewEl) return;

        const char = this.getCharacterFromForm();
        const prompt = this.generateCharacterPrompt(char);
        previewEl.textContent = prompt || '(Fill out fields to generate prompt)';
    }

    getCharacterFromForm() {
        return {
            gender: this.querySelector('#p-gender')?.value || '',
            age: this.querySelector('#p-age')?.value || '',
            style: this.querySelector('#p-role')?.value || '', // Mapping Role to Style
            personality: this.querySelector('#p-personality')?.value || '',
            hair: this.querySelector('#p-hair')?.value || '',
            eyes: this.querySelector('#p-eyes')?.value || '',
            clothing: this.querySelector('#p-clothing')?.value || '',
            // Additional fields can be added
        };
    }

    // Ported from PromptWaffel/src/utils/characterBuilder.js
    generateCharacterPrompt(character) {
        const parts = [];

        // Physical attributes
        if (character.gender) parts.push(character.gender);
        if (character.age) parts.push(character.age);
        if (character.hair) parts.push(character.hair);
        if (character.eyes) parts.push(character.eyes);

        // Style and clothing
        if (character.clothing) parts.push(character.clothing);
        if (character.style) parts.push(character.style);

        // Personality
        if (character.personality) parts.push(character.personality);

        return parts.join(', ');
    }
}

customElements.define('personality-builder', PersonalityBuilder);
