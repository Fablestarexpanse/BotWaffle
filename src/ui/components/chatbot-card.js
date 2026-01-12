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

        // Calculate token counts for each section
        const sectionTokens = {
            personality: 0,
            scenario: 0,
            initialMessages: 0,
            exampleDialogs: 0,
            customSections: 0
        };
        let tokenCount = 0;
        
        // Use TokenCounter if available
        if (window.TokenCounter) {
            const estimate = window.TokenCounter.estimateTokens || (() => 0);
            const countObject = window.TokenCounter.countTokensInObject || (() => 0);
            
            // Count personality tokens
            if (bot.personality) {
                if (bot.personality.characterData) {
                    sectionTokens.personality = countObject(bot.personality.characterData);
                } else {
                    sectionTokens.personality = countObject(bot.personality);
                }
                tokenCount += sectionTokens.personality;
            }
            
            // Count scenario tokens - extract text content only
            if (bot.scenario) {
                if (typeof bot.scenario === 'string') {
                    sectionTokens.scenario = estimate(bot.scenario);
                } else if (bot.scenario && typeof bot.scenario === 'object') {
                    const text = bot.scenario.scenario || bot.scenario.text || '';
                    if (text) sectionTokens.scenario = estimate(String(text));
                }
                tokenCount += sectionTokens.scenario;
            }
            
            // Count initial messages tokens - count only text fields
            if (bot.initialMessages) {
                if (Array.isArray(bot.initialMessages)) {
                    bot.initialMessages.forEach(msg => {
                        if (msg && typeof msg === 'object' && msg.text) {
                            sectionTokens.initialMessages += estimate(String(msg.text));
                        } else if (typeof msg === 'string') {
                            sectionTokens.initialMessages += estimate(msg);
                        }
                    });
                } else if (typeof bot.initialMessages === 'string') {
                    sectionTokens.initialMessages = estimate(bot.initialMessages);
                }
                tokenCount += sectionTokens.initialMessages;
            }
            
            // Count example dialogs tokens - count only user and assistant fields
            if (bot.exampleDialogs && Array.isArray(bot.exampleDialogs)) {
                bot.exampleDialogs.forEach(dialog => {
                    if (dialog && typeof dialog === 'object') {
                        if (dialog.user) sectionTokens.exampleDialogs += estimate(String(dialog.user));
                        if (dialog.assistant) sectionTokens.exampleDialogs += estimate(String(dialog.assistant));
                    }
                });
                tokenCount += sectionTokens.exampleDialogs;
            }
            
            // Count custom sections tokens
            if (bot.customSections && typeof bot.customSections === 'object') {
                sectionTokens.customSections = countObject(bot.customSections);
                tokenCount += sectionTokens.customSections;
            }
        }

        // Escape all user data to prevent XSS
        const escapeHtml = window.SecurityUtils.escapeHtml;
        const displayName = escapeHtml(bot.profile.displayName || bot.profile.name);
        const name = escapeHtml(bot.profile.name);
        const category = escapeHtml(bot.profile.category || '');
        // Limit description to 150 characters
        let descriptionText = bot.profile.description || 'No description provided.';
        if (descriptionText.length > 150) {
            descriptionText = descriptionText.substring(0, 150).trim() + '...';
        }
        const description = escapeHtml(descriptionText);
        const statusValue = bot.metadata.status || 'draft';
        const statusDisplay = statusValue === 'to-delete' ? 'To Delete' : statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
        const version = escapeHtml(bot.metadata.version || '1.0.0');
        const firstChar = name.charAt(0).toUpperCase();
        const altText = escapeHtml(name);
        const tags = bot.profile.tags || [];
        
        // Build tags HTML
        const tagsHtml = tags.length > 0 
            ? `<div class="card-tags">
                ${tags.map(tag => `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}
               </div>`
            : '';

        this.innerHTML = `
        <div class="chatbot-card status-${statusValue}">
                <div class="card-visual">
                    ${imageSrc
                ? `<img src="${escapeHtml(imageSrc)}" alt="${altText}" class="bot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="avatar-placeholder" style="display: none;">${firstChar}</div>`
                : `<div class="avatar-placeholder">${firstChar}</div>`
            }
                    ${tagsHtml}
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3>${displayName}</h3>
                        <div class="status-badge ${statusValue}">${escapeHtml(statusDisplay)}</div>
                    </div>
                    <div class="category">${category}</div>
                    <p class="description">${description}</p>
                <div class="card-footer">
                    <div class="card-footer-main">
                        <div class="token-breakdown-card">
                            <div class="token-grid">
                                <div class="token-item-card token-character-sheet">
                                    <span class="token-label">Character Sheet</span>
                                    <span class="token-value">${sectionTokens.customSections + sectionTokens.personality} tokens</span>
                                </div>
                                <div class="token-item-card token-scenario">
                                    <span class="token-label">Scenario</span>
                                    <span class="token-value">${sectionTokens.scenario} tokens</span>
                                </div>
                                <div class="token-item-card token-initial-messages">
                                    <span class="token-label">Initial Messages</span>
                                    <span class="token-value">${sectionTokens.initialMessages} tokens</span>
                                </div>
                                <div class="token-item-card token-example-dialogs">
                                    <span class="token-label">Example Dialogs</span>
                                    <span class="token-value">${sectionTokens.exampleDialogs} tokens</span>
                                </div>
                            </div>
                            <div class="token-totals">
                                <div class="token-total-item">
                                    <span class="token-total-label">Total Permanent</span>
                                    <span class="token-total-value token-permanent">${sectionTokens.customSections + sectionTokens.personality} tokens</span>
                                </div>
                                <div class="token-total-item">
                                    <span class="token-total-label">Total Temp</span>
                                    <span class="token-total-value token-temp">${sectionTokens.scenario + sectionTokens.initialMessages + sectionTokens.exampleDialogs} tokens</span>
                                </div>
                                <div class="token-total-item">
                                    <span class="token-total-label">Grand Total</span>
                                    <span class="token-total-value token-grand">${tokenCount} tokens</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-assets">
                            <button class="asset-button asset-images" data-type="images" title="View Images">
                                <span class="asset-icon">🖼️</span>
                                <span class="asset-label">Images</span>
                                <span class="asset-count">${(bot.profile.images && bot.profile.images.length) || 0}</span>
                            </button>
                            <button class="asset-button asset-scripts" data-type="scripts" title="View Scripts">
                                <span class="asset-icon">📜</span>
                                <span class="asset-label">Scripts</span>
                                <span class="asset-count">${(bot.scripts && bot.scripts.length) || 0}</span>
                            </button>
                            <button class="asset-button asset-prompts" data-type="prompts" title="View Image Prompts">
                                <span class="asset-icon">✨</span>
                                <span class="asset-label">Prompts</span>
                                <span class="asset-count">${(bot.imagePrompts && bot.imagePrompts.length) || 0}</span>
                            </button>
                        </div>
                    </div>
                    <div class="card-meta">
                        <span class="version">v${version}</span>
                        <div class="card-dates">
                            ${bot.metadata.created ? `<span class="date-item"><span class="date-label">Created:</span> <span class="date-value">${new Date(bot.metadata.created).toLocaleString()}</span></span>` : ''}
                            ${bot.metadata.updated ? `<span class="date-item"><span class="date-label">Edited:</span> <span class="date-value">${new Date(bot.metadata.updated).toLocaleString()}</span></span>` : ''}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;

        const card = this.querySelector('.chatbot-card');
        if (card) {
            card.addEventListener('click', (e) => {
                // Don't trigger edit if clicking on a tag
                if (e.target.closest('.tag')) {
                    e.stopPropagation();
                    const tag = e.target.getAttribute('data-tag');
                    if (tag) {
                        this.dispatchEvent(new CustomEvent('filter-by-tag', {
                            detail: { tag },
                            bubbles: true
                        }));
                    }
                    return;
                }
                
                this.dispatchEvent(new CustomEvent('edit-bot', {
                    detail: { id: bot.id },
                    bubbles: true
                }));
            });
        }
    }
}

customElements.define('chatbot-card', ChatbotCard);
