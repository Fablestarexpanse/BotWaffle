class ChatbotCard extends HTMLElement {
    constructor() {
        super();
    }

    set data(bot) {
        // Get thumbnail image - prefer thumbnailIndex, fallback to first image
        let thumbnailImage = null;
        if (bot.profile.images && bot.profile.images.length > 0) {
            const thumbnailIndex = bot.profile.thumbnailIndex !== undefined ? bot.profile.thumbnailIndex : 0;
            thumbnailImage = bot.profile.images[thumbnailIndex] || bot.profile.images[0];
        } else if (bot.profile.image) {
            thumbnailImage = bot.profile.image;
        }

        // Determine if it's a local file path or URL
        const isLocalFile = thumbnailImage && !thumbnailImage.startsWith('http://') && !thumbnailImage.startsWith('https://') && !thumbnailImage.startsWith('file://');
        let imageSrc = thumbnailImage;
        if (imageSrc && isLocalFile) {
            // Convert Windows path to file:// URL
            const normalizedPath = thumbnailImage.replace(/\\/g, '/');
            imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
        }

        // Escape all user data to prevent XSS
        const escapeHtml = window.SecurityUtils.escapeHtml;
        const displayName = escapeHtml(bot.profile.displayName || bot.profile.name);
        const name = escapeHtml(bot.profile.name);
        const category = escapeHtml(bot.profile.category || '');
        const description = escapeHtml(bot.profile.description || 'No description provided.');
        const status = escapeHtml(bot.metadata.status || 'draft');
        const version = escapeHtml(bot.metadata.version || '1.0.0');
        const firstChar = name.charAt(0).toUpperCase();
        const altText = escapeHtml(name);

        this.innerHTML = `
            <div class="chatbot-card">
                <div class="card-visual">
                    ${imageSrc
                ? `<img src="${escapeHtml(imageSrc)}" alt="${altText}" class="bot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="avatar-placeholder" style="display: none;">${firstChar}</div>`
                : `<div class="avatar-placeholder">${firstChar}</div>`
            }
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3>${displayName}</h3>
                        <div class="status-badge ${status}">${status}</div>
                    </div>
                    <div class="category">${category}</div>
                    <p class="description">${description}</p>
                    <div class="card-footer">
                        <span class="version">v${version}</span>
                        <span class="date">${new Date(bot.metadata.updated).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;

        this.querySelector('.chatbot-card').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('edit-bot', {
                detail: { id: bot.id },
                bubbles: true
            }));
        });
    }
}

customElements.define('chatbot-card', ChatbotCard);
