class Sidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.navLinksContainer = this.sidebar?.querySelector('.nav-links');
        this.currentBotId = null;
        this.init();
    }

    init() {
        // Listen for edit-bot events to show bot-specific options
        document.addEventListener('edit-bot', (e) => {
            this.currentBotId = e.detail.id;
            this.showBotSpecificOptions();
        });

        // Listen for editor-cancel and editor-save to hide bot-specific options
        document.addEventListener('editor-cancel', () => {
            this.currentBotId = null;
            this.hideBotSpecificOptions();
        });

        document.addEventListener('editor-save', () => {
            // Keep bot-specific options visible after save
        });

        document.addEventListener('create-bot', () => {
            this.currentBotId = null;
            this.hideBotSpecificOptions();
        });

        // Listen for navigate-library to hide bot-specific options
        document.addEventListener('navigate-library', () => {
            this.currentBotId = null;
            this.hideBotSpecificOptions();
        });

        // Initialize existing links
        this.updateLinks();
    }

    updateLinks() {
        const links = this.navLinksContainer?.querySelectorAll('.nav-link');
        if (links) {
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.setActive(link);
                });
            });
        }
    }

    showBotSpecificOptions() {
        if (!this.navLinksContainer) return;

        // Check if bot-specific options already exist
        if (this.navLinksContainer.querySelector('.bot-specific-section')) {
            return;
        }

        // Create separator and bot-specific section
        const separator = document.createElement('li');
        separator.className = 'nav-separator';
        separator.innerHTML = '<hr style="margin: 12px 0; border-color: #334155;">';

        const botSection = document.createElement('li');
        botSection.className = 'bot-specific-section';
        botSection.innerHTML = `
            <div class="nav-section-title">Character Resources</div>
            <li class="nav-item">
                <a href="#" class="nav-link bot-nav-link" data-action="edit-character">
                    <i data-feather="edit"></i>
                    <span>Edit Character</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link bot-nav-link" data-view="pictures">
                    <i data-feather="image"></i>
                    <span>Pictures</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link bot-nav-link" data-view="scripts">
                    <i data-feather="file-text"></i>
                    <span>Scripts</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link bot-nav-link" data-view="saved-chats">
                    <i data-feather="message-square"></i>
                    <span>Saved Chats</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link bot-nav-link" data-view="image-prompts">
                    <i data-feather="zap"></i>
                    <span>Image Prompts</span>
                </a>
            </li>
        `;

        this.navLinksContainer.appendChild(separator);
        this.navLinksContainer.appendChild(botSection);

        // Re-initialize feather icons
        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        // Add click handlers for new links
        const botLinks = botSection.querySelectorAll('.bot-nav-link');
        botLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActive(link);
                
                // Check if it's the edit character link
                const action = link.getAttribute('data-action');
                if (action === 'edit-character' && this.currentBotId) {
                    // Navigate back to editor
                    document.dispatchEvent(new CustomEvent('edit-bot', {
                        detail: { id: this.currentBotId }
                    }));
                } else {
                    // Navigate to resource view
                    const view = link.getAttribute('data-view');
                    if (view) {
                        document.dispatchEvent(new CustomEvent('navigate-bot-view', {
                            detail: { view, botId: this.currentBotId }
                        }));
                    }
                }
            });
        });
    }

    hideBotSpecificOptions() {
        if (!this.navLinksContainer) return;

        const botSection = this.navLinksContainer.querySelector('.bot-specific-section');
        const separator = this.navLinksContainer.querySelector('.nav-separator');
        
        if (botSection) botSection.remove();
        if (separator) separator.remove();
    }

    setActive(activeLink) {
        const links = this.navLinksContainer?.querySelectorAll('.nav-link');
        if (links) {
            links.forEach(link => link.classList.remove('active'));
        }
        activeLink.classList.add('active');

        // Dispatch navigation event based on link text or data-view
        const viewName = activeLink.textContent.trim();
        const dataView = activeLink.getAttribute('data-view');

        if (dataView) {
            // Bot-specific view
            document.dispatchEvent(new CustomEvent('navigate-bot-view', {
                detail: { view: dataView, botId: this.currentBotId }
            }));
        } else if (viewName === 'My Library') {
            document.dispatchEvent(new CustomEvent('navigate-library'));
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.Sidebar = new Sidebar();
});
