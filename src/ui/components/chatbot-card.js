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

        this.innerHTML = `
            <div class="chatbot-card">
                <div class="card-visual">
                    ${imageSrc
                ? `<img src="${imageSrc}" alt="${bot.profile.name}" class="bot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="avatar-placeholder" style="display: none;">${bot.profile.name.charAt(0).toUpperCase()}</div>`
                : `<div class="avatar-placeholder">${bot.profile.name.charAt(0).toUpperCase()}</div>`
            }
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3>${bot.profile.displayName || bot.profile.name}</h3>
                        <div class="status-badge ${bot.metadata.status}">${bot.metadata.status}</div>
                    </div>
                    <div class="category">${bot.profile.category}</div>
                    <p class="description">${bot.profile.description || 'No description provided.'}</p>
                    <div class="card-footer">
                        <span class="version">v${bot.metadata.version}</span>
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
