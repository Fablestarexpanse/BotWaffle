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

        // Calculate token counts for each section (excluding profile section)
        // Use the same approach as the editor: count all content that would be exported
        const sectionTokens = {
            personality: 0,
            scenario: 0,
            initialMessages: 0,
            exampleDialogs: 0,
            customSections: 0
        };
        let tokenCount = 0;
        
        if (window.TokenCounter && window.TokenCounter.estimateTokens) {
            try {
                // Helper function to recursively count tokens in any value
                const countValue = (value) => {
                    if (!value) return 0;
                    if (typeof value === 'string') {
                        return window.TokenCounter.estimateTokens(value);
                    }
                    if (typeof value === 'number' || typeof value === 'boolean') {
                        return window.TokenCounter.estimateTokens(String(value));
                    }
                    if (Array.isArray(value)) {
                        return value.reduce((sum, item) => sum + countValue(item), 0);
                    }
                    if (typeof value === 'object' && value !== null) {
                        return Object.values(value).reduce((sum, val) => sum + countValue(val), 0);
                    }
                    return 0;
                };

                // Count personality tokens - handle nested structure
                if (bot.personality) {
                    if (bot.personality.characterData) {
                        // Personality builder format: { characterData: {...} }
                        sectionTokens.personality = countValue(bot.personality.characterData);
                    } else {
                        // Direct personality object
                        sectionTokens.personality = countValue(bot.personality);
                    }
                    tokenCount += sectionTokens.personality;
                }
                
                // Count scenario tokens
                if (bot.scenario) {
                    if (typeof bot.scenario === 'string') {
                        sectionTokens.scenario = window.TokenCounter.estimateTokens(bot.scenario);
                    } else if (typeof bot.scenario === 'object') {
                        // Try both 'scenario' and 'text' fields
                        if (bot.scenario.scenario) {
                            sectionTokens.scenario += window.TokenCounter.estimateTokens(String(bot.scenario.scenario));
                        }
                        if (bot.scenario.text) {
                            sectionTokens.scenario += window.TokenCounter.estimateTokens(String(bot.scenario.text));
                        }
                        // Also count any other string values in the object
                        Object.values(bot.scenario).forEach(val => {
                            if (typeof val === 'string' && val !== bot.scenario.scenario && val !== bot.scenario.text) {
                                sectionTokens.scenario += window.TokenCounter.estimateTokens(val);
                            }
                        });
                    }
                    tokenCount += sectionTokens.scenario;
                }
                
                // Count initial messages tokens
                if (bot.initialMessages) {
                    if (Array.isArray(bot.initialMessages)) {
                        bot.initialMessages.forEach(msg => {
                            if (msg && typeof msg === 'object') {
                                if (msg.text) {
                                    sectionTokens.initialMessages += window.TokenCounter.estimateTokens(String(msg.text));
                                }
                                // Count any other string fields
                                Object.values(msg).forEach(val => {
                                    if (typeof val === 'string' && val !== msg.text) {
                                        sectionTokens.initialMessages += window.TokenCounter.estimateTokens(val);
                                    }
                                });
                            } else if (typeof msg === 'string') {
                                sectionTokens.initialMessages += window.TokenCounter.estimateTokens(msg);
                            }
                        });
                    } else if (typeof bot.initialMessages === 'string') {
                        sectionTokens.initialMessages = window.TokenCounter.estimateTokens(bot.initialMessages);
                    }
                    tokenCount += sectionTokens.initialMessages;
                }
                
                // Count example dialogs tokens
                if (bot.exampleDialogs) {
                    if (Array.isArray(bot.exampleDialogs)) {
                        bot.exampleDialogs.forEach(dialog => {
                            if (dialog && typeof dialog === 'object') {
                                if (dialog.user) {
                                    sectionTokens.exampleDialogs += window.TokenCounter.estimateTokens(String(dialog.user));
                                }
                                if (dialog.assistant) {
                                    sectionTokens.exampleDialogs += window.TokenCounter.estimateTokens(String(dialog.assistant));
                                }
                                // Count any other string fields
                                Object.values(dialog).forEach(val => {
                                    if (typeof val === 'string' && val !== dialog.user && val !== dialog.assistant) {
                                        sectionTokens.exampleDialogs += window.TokenCounter.estimateTokens(val);
                                    }
                                });
                            }
                        });
                    }
                    tokenCount += sectionTokens.exampleDialogs;
                }
                
                // Count custom section tokens - handle nested structure
                if (bot.customSections && typeof bot.customSections === 'object') {
                    // customSections is an object where keys are category names
                    // Each category contains field data: { fieldName: value, ... }
                    Object.values(bot.customSections).forEach(sectionData => {
                        if (sectionData && typeof sectionData === 'object') {
                            // Count all string values in the section
                            Object.values(sectionData).forEach(value => {
                                sectionTokens.customSections += countValue(value);
                            });
                        }
                    });
                    tokenCount += sectionTokens.customSections;
                }
            } catch (error) {
                console.error('Error calculating token count:', error);
                // Fallback: try using countTokensInObject if available
                if (window.TokenCounter.countTokensInObject) {
                    try {
                        const dataToCount = {
                            personality: bot.personality,
                            scenario: bot.scenario,
                            initialMessages: bot.initialMessages,
                            exampleDialogs: bot.exampleDialogs,
                            customSections: bot.customSections
                        };
                        tokenCount = window.TokenCounter.countTokensInObject(dataToCount);
                        // If fallback is used, we can't break down by section, so set all to 0
                        Object.keys(sectionTokens).forEach(key => {
                            sectionTokens[key] = 0;
                        });
                    } catch (fallbackError) {
                        console.error('Fallback token counting also failed:', fallbackError);
                    }
                }
            }
        }

        // Escape all user data to prevent XSS
        const escapeHtml = window.SecurityUtils.escapeHtml;
        const displayName = escapeHtml(bot.profile.displayName || bot.profile.name);
        const name = escapeHtml(bot.profile.name);
        const category = escapeHtml(bot.profile.category || '');
        // Limit description to 200 characters
        let descriptionText = bot.profile.description || 'No description provided.';
        if (descriptionText.length > 200) {
            descriptionText = descriptionText.substring(0, 200).trim() + '...';
        }
        const description = escapeHtml(descriptionText);
        const status = escapeHtml(bot.metadata.status || 'draft');
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
            <div class="chatbot-card">
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
                        <div class="status-badge ${status}">${status}</div>
                    </div>
                    <div class="category">${category}</div>
                    <p class="description">${description}</p>
                    <div class="token-breakdown">
                        ${sectionTokens.personality > 0 ? `<div class="token-item"><span class="token-label">Personality:</span> <span class="token-value">${sectionTokens.personality}</span></div>` : ''}
                        ${sectionTokens.scenario > 0 ? `<div class="token-item"><span class="token-label">Scenario:</span> <span class="token-value">${sectionTokens.scenario}</span></div>` : ''}
                        ${sectionTokens.initialMessages > 0 ? `<div class="token-item"><span class="token-label">Initial Messages:</span> <span class="token-value">${sectionTokens.initialMessages}</span></div>` : ''}
                        ${sectionTokens.exampleDialogs > 0 ? `<div class="token-item"><span class="token-label">Example Dialogs:</span> <span class="token-value">${sectionTokens.exampleDialogs}</span></div>` : ''}
                        ${sectionTokens.customSections > 0 ? `<div class="token-item"><span class="token-label">Custom Sections:</span> <span class="token-value">${sectionTokens.customSections}</span></div>` : ''}
                    </div>
                    <div class="card-footer">
                        <span class="version">v${version}</span>
                        <span class="total-tokens-footer">Total Tokens: ${tokenCount}</span>
                        <div class="card-dates">
                            ${bot.metadata.created ? `<span class="date-item"><span class="date-label">Created:</span> <span class="date-value">${new Date(bot.metadata.created).toLocaleDateString()}</span></span>` : ''}
                            ${bot.metadata.updated ? `<span class="date-item"><span class="date-label">Edited:</span> <span class="date-value">${new Date(bot.metadata.updated).toLocaleDateString()}</span></span>` : ''}
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
