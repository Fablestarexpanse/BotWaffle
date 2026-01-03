class ChatbotList extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <div class="toolbar">
                <input type="text" placeholder="Search bots..." id="search-input">
                <div class="controls">
                    <select id="sort-select">
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                    </select>
                    <div class="view-toggles">
                        <button id="view-grid" class="icon-btn active" title="Grid View">⊞</button>
                        <button id="view-list" class="icon-btn" title="List View">☰</button>
                    </div>
                </div>
                <div class="actions">
                    <button id="create-btn" class="primary-btn">+ New Bot</button>
                    <button id="refresh-btn" class="icon-btn">↻</button>
                </div>
            </div>
            <div class="grid-container" id="bot-grid">
                <!-- Cards injected here -->
                <div class="loading">Loading chatbots...</div>
            </div>
        `;

        this.bots = []; // Store fetched bots
        this.sortBy = 'date-desc';
        this.viewMode = 'grid';
    }

    connectedCallback() {
        this.loadChatbots();
        this.setupListeners();
    }

    setupListeners() {
        this.querySelector('#create-btn').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('create-bot', { bubbles: true }));
        });

        this.querySelector('#refresh-btn').addEventListener('click', () => {
            this.loadChatbots();
        });

        this.querySelector('#search-input').addEventListener('input', (e) => {
            this.filterBots(e.target.value);
        });

        this.querySelector('#sort-select').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderBots();
        });

        this.querySelector('#view-grid').addEventListener('click', () => this.setViewMode('grid'));
        this.querySelector('#view-list').addEventListener('click', () => this.setViewMode('list'));
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const grid = this.querySelector('#bot-grid');

        this.querySelector('#view-grid').classList.toggle('active', mode === 'grid');
        this.querySelector('#view-list').classList.toggle('active', mode === 'list');

        if (mode === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    async loadChatbots() {
        const grid = this.querySelector('#bot-grid');
        grid.innerHTML = '<div class="loading">Loading...</div>';

        try {
            this.bots = await window.api.chatbot.list();
            this.renderBots();
        } catch (error) {
            console.error('Failed to load chatbots:', error);
            grid.innerHTML = '<div class="error">Failed to load chatbots.</div>';
        }
    }

    renderBots() {
        const grid = this.querySelector('#bot-grid');
        grid.innerHTML = '';

        if (this.bots.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No chatbots found. Create one to get started!</p>
                </div>
            `;
            return;
        }

        // Sort bots
        const sortedBots = [...this.bots].sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.metadata.updated) - new Date(a.metadata.updated);
                case 'date-asc':
                    return new Date(a.metadata.updated) - new Date(b.metadata.updated);
                case 'name-asc':
                    return a.profile.name.localeCompare(b.profile.name);
                case 'name-desc':
                    return b.profile.name.localeCompare(a.profile.name);
                default:
                    return 0;
            }
        });

        // Filter provided by search (re-apply search if needed, but for now just render all sorted)
        // Ideally we filter then sort. Let's incorporate search state if we want to be robust, 
        // but for now I'll just render sorted and let the search listener hide/show. 
        // Better: Apply filter here too.

        const searchTerm = this.querySelector('#search-input').value.toLowerCase();

        sortedBots.forEach(bot => {
            const card = document.createElement('chatbot-card');
            card.data = bot;

            // Apply current filter
            const name = (bot.profile.displayName || bot.profile.name).toLowerCase();
            const desc = (bot.profile.description || '').toLowerCase();
            if (searchTerm && !name.includes(searchTerm) && !desc.includes(searchTerm)) {
                card.style.display = 'none';
            }

            grid.appendChild(card);
        });

        // Re-apply view mode class just in case interaction missed it
        if (this.viewMode === 'list') grid.classList.add('list-view');
        else grid.classList.remove('list-view');
    }

    filterBots(query) {
        // Just toggle visibility instead of re-rendering to keep it fast
        const cards = this.querySelectorAll('chatbot-card');
        const term = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('.description').textContent.toLowerCase();
            const match = name.includes(term) || desc.includes(term);
            card.style.display = match ? 'block' : 'none';
        });
    }
}

customElements.define('chatbot-list', ChatbotList);
