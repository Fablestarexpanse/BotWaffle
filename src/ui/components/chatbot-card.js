class ChatbotCard extends HTMLElement {
    constructor() {
        super();
    }

    set data(bot) {
        this.innerHTML = `
            <div class="chatbot-card">
                <div class="card-visual">
                    ${(bot.profile.image || (bot.profile.images && bot.profile.images[0]))
                ? `<img src="${bot.profile.image || bot.profile.images[0]}" alt="${bot.profile.name}" class="bot-image">`
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
