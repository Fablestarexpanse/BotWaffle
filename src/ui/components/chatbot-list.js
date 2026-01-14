class ChatbotList extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <div class="chatbot-list-toolbar">
                <div class="toolbar-left">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Search bots..." id="search-input">
                    </div>
                    <button id="create-btn" class="primary-btn">
                        <span class="icon">+</span> New Bot
                    </button>
                </div>

                <div class="toolbar-right">
                    <div class="control-group">
                        <select id="sort-select">
                            <option value="date-desc">Newest</option>
                            <option value="date-asc">Oldest</option>
                            <option value="name-asc">A-Z</option>
                        </select>
                    </div>
                    
                    <button id="refresh-btn" class="icon-btn" title="Refresh">↻</button>
                </div>
            </div>

            <div class="grid-container" id="bot-grid">
                <!-- Cards injected here -->
                <div class="loading">Loading chatbots...</div>
            </div>
            
            <div class="pagination-container" id="pagination-container" style="display: none;">
                <div class="pagination-info">
                    <span id="pagination-info-text">Showing 0 - 0 of 0</span>
                </div>
                <div class="pagination-controls">
                    <button id="pagination-first" class="pagination-btn" title="First page">««</button>
                    <button id="pagination-prev" class="pagination-btn" title="Previous page">‹</button>
                    <div class="pagination-pages" id="pagination-pages"></div>
                    <button id="pagination-next" class="pagination-btn" title="Next page">›</button>
                    <button id="pagination-last" class="pagination-btn" title="Last page">»»</button>
                </div>
                <div class="pagination-page-size">
                    <label for="page-size-select">Per page:</label>
                    <select id="page-size-select" class="page-size-select">
                        <option value="25">25</option>
                        <option value="50" selected>50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                    </select>
                </div>
            </div>
        `;

        this.bots = []; // Store fetched bots
        this.filteredBots = []; // Filtered bots (after search)
        this.sortBy = 'date-desc';
        this.currentPage = 1;
        this.botsPerPage = 50; // Render 50 bots per page for optimal performance
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
            this.currentPage = 1; // Reset to first page on search
            this.filterBots(e.target.value);
        });

        this.querySelector('#sort-select').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.currentPage = 1; // Reset to first page on sort
            this.renderBots();
        });
        
        // Pagination controls
        this.querySelector('#pagination-prev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderBots();
            }
        });
        
        this.querySelector('#pagination-next').addEventListener('click', () => {
            const maxPage = this.getMaxPage();
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.renderBots();
            }
        });
        
        this.querySelector('#pagination-first').addEventListener('click', () => {
            this.currentPage = 1;
            this.renderBots();
        });
        
        this.querySelector('#pagination-last').addEventListener('click', () => {
            this.currentPage = this.getMaxPage();
            this.renderBots();
        });
        
        this.querySelector('#page-size-select').addEventListener('change', (e) => {
            this.botsPerPage = parseInt(e.target.value, 10);
            this.currentPage = 1; // Reset to first page when changing page size
            this.renderBots();
        });

        // Listen for tag filter events from cards
        this.addEventListener('filter-by-tag', (e) => {
            e.stopPropagation();
            const tag = e.detail.tag;
            const searchInput = this.querySelector('#search-input');
            if (searchInput) {
                searchInput.value = tag;
                this.currentPage = 1;
                this.filterBots(tag);
            }
        });
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
            this.updatePagination(0);
            return;
        }

        // Apply search filter first
        const searchTerm = this.querySelector('#search-input').value.toLowerCase();
        if (searchTerm) {
            this.filteredBots = this.bots.filter(bot => {
                const name = (bot.profile.displayName || bot.profile.name || '').toLowerCase();
                const desc = (bot.profile.description || '').toLowerCase();
                const category = (bot.profile.category || '').toLowerCase();
                const tags = (bot.profile.tags || []).join(' ').toLowerCase();
                return name.includes(searchTerm) || desc.includes(searchTerm) || 
                       category.includes(searchTerm) || tags.includes(searchTerm);
            });
        } else {
            this.filteredBots = [...this.bots];
        }

        // Sort filtered bots
        const sortedBots = this.filteredBots.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.metadata.updated) - new Date(a.metadata.updated);
                case 'date-asc':
                    return new Date(a.metadata.updated) - new Date(b.metadata.updated);
                case 'name-asc':
                    return (a.profile.displayName || a.profile.name || '').localeCompare(b.profile.displayName || b.profile.name || '');
                case 'name-desc':
                    return (b.profile.displayName || b.profile.name || '').localeCompare(a.profile.displayName || a.profile.name || '');
                default:
                    return 0;
            }
        });

        // Calculate pagination
        const totalBots = sortedBots.length;
        const maxPage = Math.max(1, Math.ceil(totalBots / this.botsPerPage));
        if (this.currentPage > maxPage && maxPage > 0) {
            this.currentPage = maxPage;
        }
        
        const startIndex = (this.currentPage - 1) * this.botsPerPage;
        const endIndex = Math.min(startIndex + this.botsPerPage, totalBots);
        const botsToRender = sortedBots.slice(startIndex, endIndex);

        // Render only bots for current page
        botsToRender.forEach(bot => {
            const card = document.createElement('chatbot-card');
            card.data = bot;
            grid.appendChild(card);
        });

        // Update pagination UI
        this.updatePagination(totalBots);
        
        // Scroll to top of grid when page changes
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    getMaxPage() {
        const totalBots = this.filteredBots.length;
        return Math.max(1, Math.ceil(totalBots / this.botsPerPage));
    }
    
    updatePagination(totalBots) {
        const paginationContainer = this.querySelector('#pagination-container');
        const maxPage = this.getMaxPage();
        
        if (totalBots === 0) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Update info text
        const startIndex = (this.currentPage - 1) * this.botsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.botsPerPage, totalBots);
        const infoText = this.querySelector('#pagination-info-text');
        infoText.textContent = `Showing ${startIndex} - ${endIndex} of ${totalBots} chatbot${totalBots !== 1 ? 's' : ''}`;
        
        // Update page buttons state
        this.querySelector('#pagination-first').disabled = this.currentPage === 1;
        this.querySelector('#pagination-prev').disabled = this.currentPage === 1;
        this.querySelector('#pagination-next').disabled = this.currentPage >= maxPage;
        this.querySelector('#pagination-last').disabled = this.currentPage >= maxPage;
        
        // Render page numbers
        const pagesContainer = this.querySelector('#pagination-pages');
        pagesContainer.innerHTML = '';
        
        // Show up to 7 page numbers (3 on each side of current + current)
        const showPages = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(showPages / 2));
        let endPage = Math.min(maxPage, startPage + showPages - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage < showPages - 1) {
            startPage = Math.max(1, endPage - showPages + 1);
        }
        
        // First page + ellipsis if needed
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-btn pagination-page-btn';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.renderBots();
            });
            pagesContainer.appendChild(firstBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pagesContainer.appendChild(ellipsis);
            }
        }
        
        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn pagination-page-btn';
            if (i === this.currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i.toString();
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.renderBots();
            });
            pagesContainer.appendChild(pageBtn);
        }
        
        // Last page + ellipsis if needed
        if (endPage < maxPage) {
            if (endPage < maxPage - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pagesContainer.appendChild(ellipsis);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-btn pagination-page-btn';
            lastBtn.textContent = maxPage.toString();
            lastBtn.addEventListener('click', () => {
                this.currentPage = maxPage;
                this.renderBots();
            });
            pagesContainer.appendChild(lastBtn);
        }
    }

    filterBots(query) {
        // Re-render with filter applied (handles pagination correctly)
        this.renderBots();
    }
}

customElements.define('chatbot-list', ChatbotList);
