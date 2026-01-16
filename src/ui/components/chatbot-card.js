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
                        if (dialog.text) {
                            sectionTokens.exampleDialogs += estimate(String(dialog.text));
                        } else {
                            if (dialog.user) sectionTokens.exampleDialogs += estimate(String(dialog.user));
                            if (dialog.assistant) sectionTokens.exampleDialogs += estimate(String(dialog.assistant));
                        }
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
                <div class="card-header-section">
                    <div class="card-header-top">
                        <div class="card-title-group">
                            <h3>${displayName}</h3>
                            <div class="category">${category}</div>
                        </div>
                        <div class="card-header-actions">
                            <div class="status-badge ${statusValue}">${escapeHtml(statusDisplay)}</div>
                            <button class="card-delete-btn" title="Delete chatbot" data-chatbot-id="${bot.id}">🗑️</button>
                        </div>
                    </div>
                    <p class="description">${description}</p>
                </div>
                <div class="card-body-section">
                    <div class="card-visual-compact">
                        ${imageSrc
                ? `<img src="${escapeHtml(imageSrc)}" alt="${altText}" class="bot-image-compact" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="avatar-placeholder-compact" style="display: none;">${firstChar}</div>`
                : `<div class="avatar-placeholder-compact">${firstChar}</div>`
            }
                        <div class="card-tags-compact">
                            ${tags.map(tag => `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="card-data-section">
                        <div class="token-breakdown-compact">
                            <div class="token-row">
                                <span class="token-label-compact">Sheet:</span>
                                <span class="token-value-compact token-character-sheet">${sectionTokens.customSections + sectionTokens.personality}</span>
                                <span class="token-label-compact">Scenario:</span>
                                <span class="token-value-compact token-scenario">${sectionTokens.scenario}</span>
                            </div>
                            <div class="token-row">
                                <span class="token-label-compact">Initial:</span>
                                <span class="token-value-compact token-initial-messages">${sectionTokens.initialMessages}</span>
                                <span class="token-label-compact">Examples:</span>
                                <span class="token-value-compact token-example-dialogs">${sectionTokens.exampleDialogs}</span>
                            </div>
                            <div class="token-totals-compact">
                                <div class="token-total-row">
                                    <span class="token-total-label-compact">Perm:</span>
                                    <span class="token-total-value-compact token-permanent">${sectionTokens.customSections + sectionTokens.personality}</span>
                                    <span class="token-total-label-compact">Temp:</span>
                                    <span class="token-total-value-compact token-temp">${sectionTokens.scenario + sectionTokens.initialMessages + sectionTokens.exampleDialogs}</span>
                                    <span class="token-total-label-compact">Total:</span>
                                    <span class="token-total-value-compact token-grand">${tokenCount}</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-assets-compact">
                            <button class="asset-button-compact asset-images" data-type="images" title="View Images">
                                <span class="asset-icon-compact">🖼️</span>
                                <span class="asset-count-compact">${(bot.profile.images && bot.profile.images.length) || 0}</span>
                            </button>
                            <button class="asset-button-compact asset-scripts" data-type="scripts" title="View Scripts">
                                <span class="asset-icon-compact">📜</span>
                                <span class="asset-count-compact">${(bot.scripts && bot.scripts.length) || 0}</span>
                            </button>
                            <button class="asset-button-compact asset-prompts" data-type="prompts" title="View Image Prompts">
                                <span class="asset-icon-compact">✨</span>
                                <span class="asset-count-compact">${(bot.imagePrompts && bot.imagePrompts.length) || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-footer-compact">
                    <span class="version-compact">v${version}</span>
                    <div class="card-dates-compact">
                        ${bot.metadata.created ? `<span class="date-item-compact"><span class="date-label-compact">Created:</span> <span class="date-value-compact">${new Date(bot.metadata.created).toLocaleDateString()}</span></span>` : ''}
                        ${bot.metadata.updated ? `<span class="date-item-compact"><span class="date-label-compact">Edited:</span> <span class="date-value-compact">${new Date(bot.metadata.updated).toLocaleDateString()}</span></span>` : ''}
                    </div>
                </div>
            </div>
        `;

        const card = this.querySelector('.chatbot-card');
        if (card) {
            // Delete button handler
            const deleteBtn = card.querySelector('.card-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const chatbotName = bot.profile?.displayName || bot.profile?.name || 'this chatbot';
                    if (window.EditorModals && window.EditorModals.showDeleteConfirmationModalForCard) {
                        window.EditorModals.showDeleteConfirmationModalForCard(bot.id, chatbotName, () => {
                            // After deletion, find the chatbot-list element and refresh it
                            const chatbotList = document.querySelector('chatbot-list');
                            if (chatbotList && chatbotList.loadChatbots) {
                                chatbotList.loadChatbots();
                            }
                        });
                    }
                });
            }

            card.addEventListener('click', (e) => {
                // Don't trigger edit if clicking on delete button, tag, or asset buttons
                if (e.target.closest('.card-delete-btn') || e.target.closest('.tag') || e.target.closest('.asset-button-compact')) {
                    e.stopPropagation();
                    if (e.target.closest('.tag')) {
                        const tag = e.target.getAttribute('data-tag');
                        if (tag) {
                            this.dispatchEvent(new CustomEvent('filter-by-tag', {
                                detail: { tag },
                                bubbles: true
                            }));
                        }
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
