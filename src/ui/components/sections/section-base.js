class SectionBase extends HTMLElement {
    constructor() {
        super();
        this._data = {};
        this._minimized = false;
        this._title = 'Section';
    }

    static get observedAttributes() {
        return ['title', 'minimized'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'title') {
            this._title = newValue;
            this.updateHeader();
        }
        if (name === 'minimized') {
            this._minimized = newValue === 'true';
            this.toggleContent();
        }
    }

    set data(value) {
        this._data = value || {};
        if (this.isConnected && this.querySelector('.section-body')) {
            this.renderContent();
        }
    }

    get data() {
        return this._data;
    }

    // To be overridden by subclasses
    renderContent() {
        // Implementation for content
    }

    connectedCallback() {
        this.renderFrame();
        this.renderContent();
    }

    renderFrame() {
        this.setAttribute('draggable', 'true'); // Enable dragging on the host
        this.innerHTML = `
            <div class="section-container">
                <div class="section-header">
                    <div class="header-left">
                        <span class="drag-handle" title="Drag to Reorder">⋮⋮</span>
                        <span class="toggle-icon">▼</span>
                        <h3 class="section-title">${this._title}</h3>
                    </div>
                    <div class="header-actions">
                        <button class="icon-btn remove-btn" title="Remove Section">×</button>
                    </div>
                </div>
                <div class="section-body">
                    <!-- Content injected here -->
                </div>
            </div>
        `;

        this.setupBaseListeners();
        this.toggleContent(); // Apply initial state
    }

    setupBaseListeners() {
        this.querySelector('.section-header').addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn')) return;
            this._minimized = !this._minimized;
            this.toggleContent();
            this.dispatchEvent(new CustomEvent('toggle-section', {
                detail: { minimized: this._minimized },
                bubbles: true
            }));
        });

        this.querySelector('.remove-btn').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('remove-section', { bubbles: true }));
        });
    }

    toggleContent() {
        const body = this.querySelector('.section-body');
        const icon = this.querySelector('.toggle-icon');
        if (!body || !icon) return;

        if (this._minimized) {
            body.style.display = 'none';
            icon.style.transform = 'rotate(-90deg)';
        } else {
            body.style.display = 'block';
            icon.style.transform = 'rotate(0deg)';
        }
    }

    updateHeader() {
        const titleEl = this.querySelector('.section-title');
        if (titleEl) titleEl.textContent = this._title;
    }
}

customElements.define('section-base', SectionBase);
