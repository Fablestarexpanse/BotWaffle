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

        // Calculate token counts for all sections
        let sheetTokens = 0;  // Personality/Character Sheet
        let scenarioTokens = 0;
        let initialTokens = 0;
        let examplesTokens = 0;
        let permTokens = 0;  // Permanent tokens (personality + scenario + initial + examples)
        let tempTokens = 0;  // Temporary tokens (conversation history - not stored in bot data)
        let totalTokens = 0;
        
        // Use TokenCounter if available
        if (window.TokenCounter && window.TokenCounter.estimateTokens) {
            const estimateTokens = window.TokenCounter.estimateTokens;
            const countObject = window.TokenCounter.countTokensInObject || ((obj) => {
                // Fallback: if countTokensInObject doesn't work, try to extract strings and estimate
                if (typeof obj === 'string') return estimateTokens(obj);
                if (Array.isArray(obj)) {
                    return obj.reduce((sum, item) => sum + (typeof item === 'string' ? estimateTokens(item) : 0), 0);
                }
                if (typeof obj === 'object' && obj !== null) {
                    return Object.values(obj).reduce((sum, val) => {
                        if (typeof val === 'string') return sum + estimateTokens(val);
                        return sum;
                    }, 0);
                }
                return 0;
            });
            
            // Count personality/character sheet tokens
            if (bot.personality) {
                if (typeof bot.personality === 'string') {
                    sheetTokens = estimateTokens(bot.personality);
                } else if (bot.personality.characterData) {
                    sheetTokens = countObject(bot.personality.characterData);
                } else if (bot.personality.personality) {
                    sheetTokens = estimateTokens(String(bot.personality.personality));
                } else if (bot.personality.text) {
                    sheetTokens = estimateTokens(String(bot.personality.text));
                } else {
                    sheetTokens = countObject(bot.personality);
                }
            }
            
            // Count scenario tokens
            if (bot.scenario) {
                if (typeof bot.scenario === 'string') {
                    scenarioTokens = estimateTokens(bot.scenario);
                } else if (bot.scenario.scenario) {
                    scenarioTokens = estimateTokens(String(bot.scenario.scenario));
                } else if (bot.scenario.text) {
                    scenarioTokens = estimateTokens(String(bot.scenario.text));
                } else {
                    scenarioTokens = countObject(bot.scenario);
                }
            }
            
            // Count initial messages tokens
            if (bot.initialMessages) {
                if (Array.isArray(bot.initialMessages)) {
                    initialTokens = bot.initialMessages.reduce((sum, msg) => {
                        if (typeof msg === 'string') {
                            return sum + estimateTokens(msg);
                        }
                        const text = msg.text || msg.message || '';
                        return sum + estimateTokens(String(text));
                    }, 0);
                } else if (typeof bot.initialMessages === 'string') {
                    initialTokens = estimateTokens(bot.initialMessages);
                } else {
                    initialTokens = countObject(bot.initialMessages);
                }
            }
            
            // Count example dialogs tokens
            if (bot.exampleDialogs) {
                if (Array.isArray(bot.exampleDialogs)) {
                    examplesTokens = bot.exampleDialogs.reduce((sum, dialog) => {
                        if (typeof dialog === 'string') {
                            return sum + estimateTokens(dialog);
                        }
                        const userText = String(dialog.user || '');
                        const assistantText = String(dialog.assistant || '');
                        const dialogText = String(dialog.text || '');
                        return sum + estimateTokens(userText) + estimateTokens(assistantText) + estimateTokens(dialogText);
                    }, 0);
                } else if (typeof bot.exampleDialogs === 'string') {
                    examplesTokens = estimateTokens(bot.exampleDialogs);
                } else {
                    examplesTokens = countObject(bot.exampleDialogs);
                }
            }
            
            // Permanent tokens = character data that stays in context (sheet + scenario + examples)
            // Initial messages are temporary (sent once at start of conversation)
            permTokens = sheetTokens + scenarioTokens + examplesTokens;
            
            // Temporary tokens = initial messages + conversation history
            // (conversation history not stored in bot data, so only initial messages for cards)
            tempTokens = initialTokens;
            
            // Total = permanent + temporary
            totalTokens = permTokens + tempTokens;
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
                                <span class="token-label-compact">SHEET:</span>
                                <span class="token-value-compact token-personality">${sheetTokens}</span>
                                <span class="token-label-compact">SCENARIO:</span>
                                <span class="token-value-compact token-scenario">${scenarioTokens}</span>
                            </div>
                            <div class="token-row">
                                <span class="token-label-compact">INITIAL:</span>
                                <span class="token-value-compact token-initial-messages">${initialTokens}</span>
                                <span class="token-label-compact">EXAMPLES:</span>
                                <span class="token-value-compact token-example-dialogs">${examplesTokens}</span>
                            </div>
                            <div class="token-totals-compact">
                                <div class="token-total-row">
                                    <span class="token-total-label-compact">PERM:</span>
                                    <span class="token-total-value-compact token-perm">${permTokens}</span>
                                    <span class="token-total-label-compact">TEMP:</span>
                                    <span class="token-total-value-compact token-temp">${tempTokens}</span>
                                    <span class="token-total-label-compact">TOTAL:</span>
                                    <span class="token-total-value-compact token-grand">${totalTokens}</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-assets-compact">
                            <button class="asset-button-compact asset-images" data-type="images" title="View Images" data-bot-id="${bot.id}">
                                <span class="asset-icon-compact">🖼️</span>
                                <span class="asset-count-compact">${(bot.profile.images && bot.profile.images.length) || 0}</span>
                            </button>
                            <button class="asset-button-compact asset-scripts" data-type="scripts" title="View Scripts" data-bot-id="${bot.id}">
                                <span class="asset-icon-compact">📜</span>
                                <span class="asset-count-compact">${(bot.metadata?.scripts && bot.metadata.scripts.length) || 0}</span>
                            </button>
                            <button class="asset-button-compact asset-prompts" data-type="prompts" title="View Image Prompts" data-bot-id="${bot.id}">
                                <span class="asset-icon-compact">✨</span>
                                <span class="asset-count-compact">${(bot.metadata?.imagePrompts && bot.metadata.imagePrompts.length) || 0}</span>
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

            // Handle asset button clicks for navigation
            const assetButtons = card.querySelectorAll('.asset-button-compact');
            assetButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const assetType = btn.getAttribute('data-type');
                    const botId = btn.getAttribute('data-bot-id');
                    
                    if (botId && assetType) {
                        // Map asset type to view name
                        let viewName = 'scripts';
                        if (assetType === 'images') {
                            viewName = 'pictures';
                        } else if (assetType === 'prompts') {
                            viewName = 'image-prompts';
                        }
                        
                        // Check if editor is already open for this bot
                        const editor = document.querySelector('chatbot-editor');
                        const isEditorOpen = editor && editor.currentId === botId;
                        
                        if (!isEditorOpen) {
                            // First open the editor for this bot
                            this.dispatchEvent(new CustomEvent('edit-bot', {
                                detail: { id: botId },
                                bubbles: true
                            }));
                            
                            // Wait for editor to open, then navigate
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent('navigate-bot-view', {
                                    detail: { 
                                        view: viewName,
                                        botId: botId
                                    },
                                    bubbles: true
                                }));
                            }, 300);
                        } else {
                            // Editor already open, just navigate
                            document.dispatchEvent(new CustomEvent('navigate-bot-view', {
                                detail: { 
                                    view: viewName,
                                    botId: botId
                                },
                                bubbles: true
                            }));
                        }
                    }
                });
            });

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
