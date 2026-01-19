class SectionScenario extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Scenario';
    }

    connectedCallback() {
        super.connectedCallback();
    }

    renderContent() {
        const body = this.querySelector('.section-body');
        const scenarioData = this._data.scenario || {};
        
        const escapeHtml = window.SecurityUtils.escapeHtml;
        const scenarioValue = scenarioData.scenario || scenarioData.text || '';
        
        body.innerHTML = `
            <div class="scenario-section">
                <div class="form-group">
                    <label>Scenario</label>
                    <textarea id="scenario-text" class="input-field" rows="6" placeholder="Describe the scenario or setting...">${escapeHtml(scenarioValue)}</textarea>
                </div>
            </div>
        `;
        
        // Setup listeners to prevent header click from interfering and auto-resize
        const textarea = body.querySelector('#scenario-text');
        if (textarea) {
            // Auto-resize function
            const autoResize = () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            };
            
            // Set initial height
            autoResize();
            
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            textarea.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
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
        const scenarioText = this.querySelector('#scenario-text');
        const scenarioValue = scenarioText ? scenarioText.value.trim() : '';

        return {
            scenario: scenarioValue,
            text: scenarioValue // Backward compatibility
        };
    }
}

customElements.define('section-scenario', SectionScenario);
