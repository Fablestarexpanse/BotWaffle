class ChatbotEditor extends HTMLElement {
    constructor() {
        super();
        this.currentId = null;
        this._isDirty = false;
    }

    get hasUnsavedChanges() {
        return this._isDirty;
    }

    set mode(value) {
        this._mode = value; // 'create' or 'edit'
    }

    set chatbotData(data) {
        this._data = data || {};
        this.currentId = data ? data.id : null;
        this.render();
        // Update display name after render
        setTimeout(() => {
            this.updateDisplayName();
        }, 100);
    }

    connectedCallback() {
        this.render();
    }

    render() {
        try {
            const bot = this._data || {};
            const isEdit = this._mode === 'edit';

        // Default layout - Profile, then Character Sheet (Personality), then other sections
        const defaultLayout = [
            { type: 'profile', id: 'section-profile', minimized: false },
            { type: 'personality', id: 'section-personality', minimized: false },
            { type: 'scenario', id: 'section-scenario', minimized: false },
            { type: 'initial-messages', id: 'section-initial-messages', minimized: false },
            { type: 'example-dialogs', id: 'section-example-dialogs', minimized: false }
        ];
        
        // If bot has a layout, use it but ensure profile is first and always present
        if (bot.layout && Array.isArray(bot.layout)) {
            this.layout = [...bot.layout];
        } else {
            this.layout = defaultLayout;
        }
        
        // CRITICAL: Ensure required sections are always in layout (profile MUST be first)
        const requiredSections = [
            { type: 'profile', id: 'section-profile' },
            { type: 'personality', id: 'section-personality' },
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        // First, ensure all required sections exist
        requiredSections.forEach(required => {
            const exists = this.layout.some(l => l.type === required.type);
            if (!exists) {
                // Insert profile at the beginning, others at the end
                if (required.type === 'profile') {
                    this.layout.unshift({
                        type: required.type,
                        id: required.id,
                        minimized: false
                    });
                } else {
                    this.layout.push({
                        type: required.type,
                        id: required.id,
                        minimized: false
                    });
                }
            }
        });
        
        // CRITICAL: Ensure profile is ALWAYS first, no matter what
        const profileIndex = this.layout.findIndex(s => s.type === 'profile');
        if (profileIndex === -1) {
            // Profile doesn't exist - add it first
            this.layout.unshift({ type: 'profile', id: 'section-profile', minimized: false });
        } else if (profileIndex > 0) {
            // Profile exists but not first - move it to first
            const profile = this.layout.splice(profileIndex, 1)[0];
            this.layout.unshift(profile);
        }

        // Get display name for header
        const displayName = bot?.profile?.displayName || bot?.displayName || (isEdit ? 'Unnamed Bot' : '');
        
        this.innerHTML = `
            <div class="editor-header">
                <div class="header-left" style="display: flex; align-items: center; gap: 20px;">
                    <h2>${isEdit ? 'Edit Chatbot' : 'Create New Chatbot'}</h2>
                    <button id="save-btn" class="primary-btn">Save</button>
                </div>
                <div class="header-center" id="bot-display-name">
                    ${isEdit ? `<span class="bot-name-display">${displayName || 'Unnamed Bot'}</span>` : ''}
                </div>
                <div class="actions">
                    <button id="load-template-btn" class="secondary-btn">Load Template</button>
                    <button id="save-template-btn" class="secondary-btn">Save as Template</button>
                    ${isEdit ? `
                        <button id="export-sheet-btn" class="secondary-btn">Export Character Sheet</button>
                        <button id="delete-btn" class="danger-btn">Delete</button>
                    ` : ''}
                </div>
            </div>

            <div id="other-sections-container">
                <!-- Profile section injected here first -->
            </div>
            <div id="other-sections-after-container">
                <!-- Personality, Scenario, Initial Messages, Example Dialogs sections injected here -->
            </div>
        `;

            // Ensure DOM is ready before rendering sections
            setTimeout(() => {
                this.renderSections(bot);
                this.setupListeners();
                
                // Initial display name update after sections are rendered
                setTimeout(() => {
                    this.updateDisplayName();
                }, 100);
            }, 0);
        } catch (error) {
            console.error('Error in render():', error);
            this.innerHTML = `<div style="color: red; padding: 20px;">Error rendering editor: ${error.message}</div>`;
            throw error;
        }
    }

    renderSections(botData) {
        try {
            const otherSectionsContainer = this.querySelector('#other-sections-container');
            const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
            
            if (!otherSectionsContainer || !otherSectionsAfterContainer) {
                console.error('Required containers not found!', { 
                    otherSectionsContainer, 
                    otherSectionsAfterContainer,
                    innerHTML: this.innerHTML.substring(0, 200)
                });
                return;
            }
        
        // Clear containers
        otherSectionsContainer.innerHTML = '';
        otherSectionsAfterContainer.innerHTML = '';

        // Sections that appear after Profile
        const afterProfileTypes = ['personality', 'scenario', 'initial-messages', 'example-dialogs'];

        // Render profile section first in otherSectionsContainer - ALWAYS render it
        let profileSection = this.layout.find(s => s.type === 'profile');
        if (!profileSection) {
            console.warn('Profile section missing from layout! Adding it now.', this.layout);
            profileSection = { type: 'profile', id: 'section-profile', minimized: false };
            this.layout.unshift(profileSection);
        }
        
        // Always create and render profile section
        const tagName = 'section-profile';
        
        // Check if custom element is defined
        if (customElements.get(tagName)) {
            const element = document.createElement(tagName);
            
            // Set attributes
            if (profileSection.id) element.id = profileSection.id;
            if (profileSection.minimized) element.setAttribute('minimized', 'true');
            
            // Set data - this will trigger rendering
            element.data = botData;
            
            // Append to container
            otherSectionsContainer.appendChild(element);
        } else {
            console.error('section-profile custom element not registered! Attempting to render later...');
            // Try to render profile later, but continue with other sections
            setTimeout(() => {
                if (customElements.get(tagName)) {
                    const element = document.createElement(tagName);
                    if (profileSection.id) element.id = profileSection.id;
                    if (profileSection.minimized) element.setAttribute('minimized', 'true');
                    element.data = botData;
                    otherSectionsContainer.appendChild(element);
                } else {
                    console.error('section-profile still not registered after delay');
                }
            }, 100);
        }

        // Render all sections after Profile (personality, scenario, initial-messages, example-dialogs)
        const afterSections = this.layout.filter(s => afterProfileTypes.includes(s.type));
        afterSections.forEach(sectionConfig => {
            if (!otherSectionsAfterContainer) return;
            const tagName = `section-${sectionConfig.type}`;
            if (!customElements.get(tagName)) {
                console.warn(`Component ${tagName} not defined, skipping section.`);
                return;
            }
            const element = document.createElement(tagName);
            if (sectionConfig.id) element.id = sectionConfig.id;
            if (sectionConfig.minimized) element.setAttribute('minimized', 'true');
            element.data = botData;
            otherSectionsAfterContainer.appendChild(element);
        });
        
            // Update token counts after rendering
            setTimeout(() => this.updateTokenCounts(), 0);
        } catch (error) {
            console.error('Error in renderSections:', error);
            throw error;
        }
    }

    updateTokenCounts() {
        if (!window.TokenCounter) return;
        
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        if (!otherSectionsContainer) return;
        
        // Count tokens from all sections (excluding profile)
        const allSections = [
            ...otherSectionsContainer.querySelectorAll('section-profile'),
            ...(otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-personality, section-scenario, section-initial-messages, section-example-dialogs') : [])
        ];
        let totalTokens = 0;
        
        allSections.forEach(section => {
            const tagName = section.tagName.toLowerCase();
            
            // Skip profile section - don't count or display tokens
            if (tagName === 'section-profile') {
                // Hide token count display if it exists
                const tokenDisplay = section.querySelector('.token-count');
                if (tokenDisplay) {
                    tokenDisplay.remove();
                }
                return;
            }
            
            // Handle Initial Messages separately - show per-message tokens
            if (tagName === 'section-initial-messages') {
                this.updateInitialMessagesTokenCounts(section);
                const count = window.TokenCounter.getSectionTokenCount(section);
                window.TokenCounter.updateTokenDisplay(section, count);
                totalTokens += count;
            } else {
                // Standard token counting for other sections
                const count = window.TokenCounter.getSectionTokenCount(section);
                window.TokenCounter.updateTokenDisplay(section, count);
                totalTokens += count;
            }
        });
        
        // Update token display in Character Card Info section
        this.updateProfileTokenDisplay();
        
        // Update token status (green/red based on max)
        this.updateTokenStatus(totalTokens);
    }

    updateCharacterSheetTokenCount() {
        // Character Sheet removed - this method is no longer needed
        // Token counts are handled by updateTokenCounts() and updateProfileTokenDisplay()
    }
    
    updateInitialMessagesTokenCounts(section) {
        // Trigger section's own token count update for all messages
        // The section handles per-message token displays in tabs
        if (section && typeof section._updateAllMessageTokenCounts === 'function') {
            section._updateAllMessageTokenCounts();
        } else {
            // Fallback: update all tabs directly
            if (!window.TokenCounter) return;
            const tabs = section.querySelectorAll('.message-tab');
            const panels = section.querySelectorAll('.message-panel');
            tabs.forEach((tab, index) => {
                const panel = panels[index];
                if (!panel) return;
                const textarea = panel.querySelector('.message-textarea');
                if (!textarea) return;
                const tokenCount = window.TokenCounter.estimateTokens(textarea.value);
                const baseText = `Message ${index + 1}`;
                const closeBtn = tab.querySelector('.tab-close');
                if (closeBtn && section._messages && section._messages.length > 1) {
                    tab.innerHTML = `${baseText} (${tokenCount} tokens)<span class="tab-close" data-index="${index}">×</span>`;
                } else {
                    tab.innerHTML = `${baseText} (${tokenCount} tokens)`;
                }
            });
        }
    }

    updateProfileTokenDisplay() {
        if (!window.TokenCounter) return;
        
        const profileSection = this.querySelector('section-profile');
        if (!profileSection) return;
        
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        
        // Calculate token counts for each section
        const sectionTokens = {
            personality: 0,
            scenario: 0,
            initialMessages: 0,
            exampleDialogs: 0
        };
        
        // Count all sections from after-container
        if (otherSectionsAfterContainer) {
            const personalitySection = otherSectionsAfterContainer.querySelector('section-personality');
            if (personalitySection) {
                sectionTokens.personality = window.TokenCounter.getSectionTokenCount(personalitySection) || 0;
            }
            
            const scenarioSection = otherSectionsAfterContainer.querySelector('section-scenario');
            if (scenarioSection) {
                sectionTokens.scenario = window.TokenCounter.getSectionTokenCount(scenarioSection) || 0;
            }
            
            const initialMessagesSection = otherSectionsAfterContainer.querySelector('section-initial-messages');
            if (initialMessagesSection) {
                sectionTokens.initialMessages = window.TokenCounter.getSectionTokenCount(initialMessagesSection) || 0;
            }
            
            const exampleDialogsSection = otherSectionsAfterContainer.querySelector('section-example-dialogs');
            if (exampleDialogsSection) {
                sectionTokens.exampleDialogs = window.TokenCounter.getSectionTokenCount(exampleDialogsSection) || 0;
            }
        }
        
        const totalTokens = sectionTokens.personality + sectionTokens.scenario + 
                           sectionTokens.initialMessages + sectionTokens.exampleDialogs;
        
        // Update the token display in profile section
        const tokenDisplay = profileSection.querySelector('.profile-token-display');
        if (tokenDisplay) {
            tokenDisplay.innerHTML = `
                <div class="token-breakdown-card">
                    <div class="token-grid">
                        <div class="token-item-card token-personality">
                            <span class="token-label">Personality</span>
                            <span class="token-value">${sectionTokens.personality} tokens</span>
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
                            <span class="token-total-label">Total</span>
                            <span class="token-total-value token-grand">${totalTokens} tokens</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update token status
        this.updateTokenStatus(totalTokens);
    }

    updateTokenStatus(currentCount) {
        const profileSection = this.querySelector('section-profile');
        if (!profileSection) return;
        
        const maxInput = profileSection.querySelector('#max-token-input');
        const statusEl = profileSection.querySelector('#token-status');
        
        if (!statusEl) return;
        
        const maxValue = maxInput ? parseInt(maxInput.value, 10) : null;
        
        if (maxValue !== null && !isNaN(maxValue) && maxValue > 0) {
            if (currentCount <= maxValue) {
                statusEl.textContent = '';
                statusEl.className = 'token-status good';
            } else {
                const over = currentCount - maxValue;
                statusEl.textContent = `Over by ${over} tokens`;
                statusEl.className = 'token-status over';
            }
        } else {
            statusEl.textContent = '';
            statusEl.className = 'token-status';
        }
    }

    updateDisplayName() {
        // Get current display name from profile section
        const profileSection = this.querySelector('section-profile');
        if (!profileSection) return;
        
        const displayNameInput = profileSection.querySelector('[name="displayName"]');
        const displayName = displayNameInput ? displayNameInput.value.trim() : '';
        
        const nameDisplay = this.querySelector('#bot-display-name .bot-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = displayName || 'Unnamed Bot';
        }
    }

    setupListeners() {
        // Character sheet removed - no collapse/expand needed

        // Listen for section changes to update display name
        this.addEventListener('section-change', () => {
            this.updateDisplayName();
        });

        // Max token input handler
        const maxTokenInput = this.querySelector('#max-token-input');
        if (maxTokenInput) {
            maxTokenInput.addEventListener('input', () => {
                const otherSectionsContainer = this.querySelector('#other-sections-container');
                const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
                if (otherSectionsContainer && otherSectionsAfterContainer) {
                    const allSections = [
                        ...otherSectionsAfterContainer.querySelectorAll('section-personality, section-scenario, section-initial-messages, section-example-dialogs')
                    ];
                    let totalTokens = 0;
                    allSections.forEach(section => {
                        if (section.tagName.toLowerCase() !== 'section-profile') {
                            const count = window.TokenCounter ? window.TokenCounter.getSectionTokenCount(section) : 0;
                            totalTokens += count;
                        }
                    });
                    this.updateTokenStatus(totalTokens);
                }
            });
        }

        // Set up token counting updates (container declared below for drag/drop)

        this.querySelector('#save-btn').addEventListener('click', async () => {
            await this.save();
        });


        const deleteBtn = this.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const chatbotName = this._data?.name || this._data?.profile?.name || 'this chatbot';
                window.EditorModals.showDeleteConfirmationModal(this, chatbotName);
            });
        }

        const exportSheetBtn = this.querySelector('#export-sheet-btn');
        if (exportSheetBtn) {
            exportSheetBtn.addEventListener('click', async () => {
                await this.exportCharacterSheet();
            });
        }

        // Load Template Logic
        this.querySelector('#load-template-btn').addEventListener('click', async () => {
            await window.EditorModals.showLoadTemplateModal(this);
        });

        // Save Template Logic
        this.querySelector('#save-template-btn').addEventListener('click', async () => {
            window.EditorModals.showSaveTemplateModal(this);
        });

        // Listen for section events
        this.addEventListener('remove-section', (e) => {
            const section = e.target;
            // Don't allow removing required sections
            const tagName = section.tagName.toLowerCase();
            const requiredSections = ['section-profile', 'section-personality', 'section-scenario', 'section-initial-messages', 'section-example-dialogs'];
            if (requiredSections.includes(tagName)) {
                return;
            }
            const index = this.layout.findIndex(s => `section-${s.type}` === section.tagName.toLowerCase() && (section.id ? s.id === section.id : true));
            if (index > -1) {
                this.layout.splice(index, 1);
                section.remove();
                this.updateTokenCounts();
            }
        });

        // DRAG AND DROP HANDLERS
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        
        // Set up event listeners for both containers
        [otherSectionsContainer, otherSectionsAfterContainer].forEach(container => {
            if (!container) return;
            
            // Update tokens when content changes
            container.addEventListener('input', () => {
                setTimeout(() => this.updateTokenCounts(), 100);
            });
            container.addEventListener('change', () => {
                setTimeout(() => this.updateTokenCounts(), 100);
            });
            
            // Also update when sections are added/removed
            const observer = new MutationObserver(() => {
                setTimeout(() => this.updateTokenCounts(), 200);
            });
            observer.observe(container, { childList: true, subtree: true });
        });
        
        let draggedItem = null;
        let targetContainer = null;

        // Set up drag and drop for sections in after-container
        if (otherSectionsAfterContainer) {
            otherSectionsAfterContainer.addEventListener('dragstart', (e) => {
                if (e.target.getAttribute('draggable') === 'true') {
                    draggedItem = e.target;
                    targetContainer = otherSectionsAfterContainer;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', e.target.id);
                    setTimeout(() => e.target.style.opacity = '0.5', 0);
                }
            });

            otherSectionsAfterContainer.addEventListener('dragend', (e) => {
                if (e.target.getAttribute('draggable') === 'true') {
                    e.target.style.opacity = '1';
                    draggedItem = null;
                    targetContainer = null;
                    this.updateLayoutFromDOM();
                }
            });

            otherSectionsAfterContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && targetContainer === otherSectionsAfterContainer) {
                    const afterElement = getDragAfterElement(otherSectionsAfterContainer, e.clientY);
                    if (afterElement == null) {
                        otherSectionsAfterContainer.appendChild(draggedItem);
                    } else {
                        otherSectionsAfterContainer.insertBefore(draggedItem, afterElement);
                    }
                }
            });
        }

        // Monitor changes from sections
        this.addEventListener('section-change', () => {
            this._isDirty = true;
            // Optional: visual indicator on Save button
            const saveBtn = this.querySelector('#save-btn');
            if (saveBtn) saveBtn.textContent = 'Save*';
            // Update token counts when sections change
            this.updateTokenCounts();
        });

        // Handle status changes - save immediately without requiring full save
        this.addEventListener('status-change', async (e) => {
            if (this._mode === 'edit' && this.currentId && e.detail.status) {
                try {
                    await window.api.chatbot.update(this.currentId, {
                        metadata: {
                            status: e.detail.status
                        }
                    });
                    // Update local data to reflect the change
                    if (this._data.metadata) {
                        this._data.metadata.status = e.detail.status;
                    } else {
                        this._data.metadata = { status: e.detail.status };
                    }
                    // Status is updated but don't navigate away - user stays in editor
                } catch (error) {
                    console.error('Failed to update status:', error);
                    alert('Failed to update status. Please try again.');
                }
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('[draggable="true"]:not([style*="opacity: 0.5"])')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    updateLayoutFromDOM() {
        const newLayout = [];
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        
        // Get profile section from otherSectionsContainer
        const profileSection = otherSectionsContainer ? otherSectionsContainer.querySelector('section-profile') : null;
        
        // Get other sections from after container
        const afterSections = otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-personality, section-scenario, section-initial-messages, section-example-dialogs') : [];
        
        // Always add profile section first if it exists
        if (profileSection) {
            const existingConfig = this.layout.find(l => l.id === profileSection.id) || {};
            newLayout.push({
                type: 'profile',
                id: profileSection.id || 'section-profile',
                minimized: profileSection.getAttribute('minimized') === 'true'
            });
        }
        
        // Add other sections
        afterSections.forEach(el => {
            const typeHeader = el.tagName.toLowerCase().replace('section-', '');
            const existingConfig = this.layout.find(l => l.id === el.id) || {};

            const config = {
                type: typeHeader,
                id: el.id,
                minimized: el.getAttribute('minimized') === 'true'
            };

            // Preserve category and fields for custom sections
            if (typeHeader === 'custom') {
                // Try multiple ways to get the category and fields
                const category = el._category || el.category || (existingConfig && existingConfig.category);
                const fields = el._fields || el.fields || (existingConfig && existingConfig.fields);
                if (category) config.category = category;
                if (fields) config.fields = fields;
            }

            newLayout.push(config);
        });
        
        // Ensure required sections are always in layout (profile must be first)
        const requiredSections = [
            { type: 'profile', id: 'section-profile' },
            { type: 'personality', id: 'section-personality' },
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        requiredSections.forEach(required => {
            const exists = newLayout.some(l => l.type === required.type);
            if (!exists) {
                // Find existing config to preserve minimized state
                const existing = this.layout.find(l => l.type === required.type);
                const config = {
                    type: required.type,
                    id: required.id,
                    minimized: existing?.minimized || false
                };
                
                // Profile must be first
                if (required.type === 'profile') {
                    newLayout.unshift(config);
                } else {
                    newLayout.push(config);
                }
            }
        });
        
        // Ensure profile is always first
        const profileIndex = newLayout.findIndex(l => l.type === 'profile');
        if (profileIndex > 0) {
            const profile = newLayout.splice(profileIndex, 1)[0];
            newLayout.unshift(profile);
        }
        
        this.layout = newLayout;
    }
    async save() {
        // Update layout from DOM first
        this.updateLayoutFromDOM();
        
        // Ensure required sections are always in layout (profile must be first)
        const requiredSections = [
            { type: 'profile', id: 'section-profile' },
            { type: 'personality', id: 'section-personality' },
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        requiredSections.forEach(required => {
            const exists = this.layout.some(l => l.type === required.type);
            if (!exists) {
                // Profile must be first
                if (required.type === 'profile') {
                    this.layout.unshift({
                        type: required.type,
                        id: required.id,
                        minimized: false
                    });
                } else {
                    this.layout.push({
                        type: required.type,
                        id: required.id,
                        minimized: false
                    });
                }
            }
        });
        
        // Ensure profile is always first in layout
        const profileIndex = this.layout.findIndex(l => l.type === 'profile');
        if (profileIndex > 0) {
            const profile = this.layout.splice(profileIndex, 1)[0];
            this.layout.unshift(profile);
        }
        
        // Collect data from all sections
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        
        const profileSection = otherSectionsContainer ? otherSectionsContainer.querySelector('section-profile') : null;
        const afterSections = otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-personality, section-scenario, section-initial-messages, section-example-dialogs') : [];
        
        const sections = profileSection ? [profileSection, ...afterSections] : afterSections;
        
        let fullData = {
            // Preserve existing data that might not be in sections (like ID)
            ...this._data,
            layout: this.layout
        };

        // Iterate and merge data from sections
        sections.forEach(section => {
            if (typeof section.getData === 'function') {
                const sectionData = section.getData();
                const tagName = section.tagName.toLowerCase();

                if (tagName === 'section-profile') {
                    // Profile section returns { name, displayName, ... } which belongs in profile
                    fullData.name = sectionData.name;
                    fullData.displayName = sectionData.displayName;
                    fullData.category = sectionData.category;
                    fullData.description = sectionData.description;
                    fullData.tags = sectionData.tags;
                    fullData.image = sectionData.image;
                    fullData.images = sectionData.images;
                    fullData.thumbnailIndex = sectionData.thumbnailIndex;
                    fullData.status = sectionData.status;
                    
                    // Also store in profile object for consistency
                    if (!fullData.profile) fullData.profile = {};
                    fullData.profile.name = sectionData.name;
                    fullData.profile.displayName = sectionData.displayName;
                    fullData.profile.category = sectionData.category;
                    fullData.profile.description = sectionData.description;
                    fullData.profile.tags = sectionData.tags;
                    fullData.profile.image = sectionData.image;
                    fullData.profile.images = sectionData.images;
                    fullData.profile.thumbnailIndex = sectionData.thumbnailIndex;
                    // Store maxTokens in metadata for persistence
                    if (!fullData.metadata) fullData.metadata = {};
                    if (sectionData.maxTokens !== undefined) {
                        fullData.metadata.maxTokens = sectionData.maxTokens;
                        fullData.profile.maxTokens = sectionData.maxTokens;
                    }
                } else if (tagName === 'section-personality') {
                    // Personality is now just a string
                    fullData.personality = sectionData;
                } else if (tagName === 'section-scenario') {
                    // Scenario section returns an object with scenario/text, extract the scenario string
                    if (sectionData && typeof sectionData === 'object') {
                        fullData.scenario = sectionData.scenario || sectionData.text || '';
                    } else {
                        fullData.scenario = sectionData || '';
                    }
                } else if (tagName === 'section-initial-messages') {
                    fullData.initialMessages = sectionData;
                } else if (tagName === 'section-example-dialogs') {
                    fullData.exampleDialogs = sectionData;
                }
            }
        });

        // Client-side validation
        if (!fullData.name || !fullData.name.trim()) {
            alert('Error: Internal Name is required.');
            return;
        }
        
        // Additional validation: sanitize input on client side
        const sanitizeInput = window.SecurityUtils.sanitizeInput;
        if (fullData.name) {
            const sanitizedName = sanitizeInput(fullData.name, { maxLength: 100 });
            if (sanitizedName.length === 0) {
                alert('Error: Name contains invalid characters.');
                return;
            }
        }
        
        if (this._mode === 'edit' && !this.currentId) {
            alert('Error: Cannot save - missing chatbot ID.');
            return;
        }

        try {
            if (this._mode === 'create') {
                // For create mode, create with profile data
                const newBot = await window.api.chatbot.create({
                    name: fullData.name,
                    displayName: fullData.displayName,
                    category: fullData.category,
                    description: fullData.description,
                    tags: fullData.tags,
                    images: fullData.images,
                    thumbnailIndex: fullData.thumbnailIndex,
                    layout: fullData.layout
                });

                // Update with all section data
                await window.api.chatbot.update(newBot.id, {
                    personality: fullData.personality || '',
                    scenario: fullData.scenario,
                    initialMessages: fullData.initialMessages,
                    exampleDialogs: fullData.exampleDialogs,
                    layout: fullData.layout
                });

                // Update state to 'edit' so subsequent saves don't create duplicates
                this.currentId = newBot.id;
                this._mode = 'edit';
                const updatedBot = await window.api.chatbot.get(newBot.id);
                this.chatbotData = updatedBot || newBot; // Refresh with saved data

                // Update header title
                const headerTitle = this.querySelector('.editor-header h2');
                if (headerTitle) headerTitle.textContent = 'Edit Chatbot';
                
                // Update display name in header
                this.updateDisplayName();

                // Re-render handled by chatbotData setter

                // Show success feedback
                alert('Chatbot created successfully!');

            } else {
                // Increment version number (semantic versioning - increment patch version)
                const currentVersion = this._data.metadata?.version || '1.0.0';
                const versionParts = currentVersion.split('.').map(v => parseInt(v, 10));
                if (versionParts.length === 3 && !isNaN(versionParts[2])) {
                    versionParts[2] += 1; // Increment patch version
                } else {
                    versionParts[2] = 1; // Default to 1.0.1 if version format is invalid
                }
                const newVersion = versionParts.join('.');

                await window.api.chatbot.update(this.currentId, {
                    profile: {
                        name: fullData.name,
                        displayName: fullData.displayName,
                        category: fullData.category,
                        description: fullData.description,
                        tags: fullData.tags,
                        image: fullData.image,
                        images: fullData.images,
                        thumbnailIndex: fullData.thumbnailIndex
                    },
                    personality: fullData.personality || '',
                    scenario: fullData.scenario,
                    initialMessages: fullData.initialMessages,
                    exampleDialogs: fullData.exampleDialogs,
                    layout: fullData.layout,
                    metadata: {
                        status: fullData.status || this._data?.metadata?.status || 'draft',
                        version: newVersion
                    }
                });
                // Feedback for update
                // alert('Saved!'); // Optional, maybe too annoying? Button text change is enough.
            }
            this._isDirty = false;
            const saveBtn = this.querySelector('#save-btn');
            if (saveBtn) saveBtn.textContent = 'Save';
            
            // Update display name after save
            this.updateDisplayName();

            this.dispatchEvent(new CustomEvent('editor-save', { bubbles: true }));
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save chatbot. Check console for details.');
        }
    }

    /**
     * Exports the character sheet as markdown .txt file
     * Excludes the basic profile section
     * Completely rewritten to avoid EPIPE errors
     */
    async exportCharacterSheet() {
        // Validate prerequisites
        if (!window.MarkdownExporter || typeof window.MarkdownExporter.exportToMarkdown !== 'function') {
            alert('Markdown exporter not available. Please refresh the page and try again.');
            return;
        }

        if (!this.currentId) {
            alert('No chatbot selected for export.');
            return;
        }

        if (!window.api || !window.api.chatbot || typeof window.api.chatbot.get !== 'function') {
            alert('API not available. Please refresh the page and try again.');
            return;
        }

        try {
            // Step 1: Collect current data from DOM sections
            const otherSectionsContainer = this.querySelector('#other-sections-container');
            const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
            
            const exportData = {
                personality: '',
                scenario: '',
                initialMessages: [],
                exampleDialogs: [],
                layout: Array.isArray(this.layout) ? this.layout : []
            };

            // Collect personality
            const personalitySection = otherSectionsAfterContainer?.querySelector('section-personality');
            if (personalitySection && typeof personalitySection.getData === 'function') {
                const data = personalitySection.getData();
                exportData.personality = typeof data === 'string' ? data : String(data || '');
            }

            // Collect scenario
            const scenarioSection = otherSectionsAfterContainer?.querySelector('section-scenario');
            if (scenarioSection && typeof scenarioSection.getData === 'function') {
                const data = scenarioSection.getData();
                if (data && typeof data === 'object') {
                    exportData.scenario = data.scenario || data.text || '';
                } else {
                    exportData.scenario = String(data || '');
                }
            }

            // Collect initial messages
            const initialMessagesSection = otherSectionsAfterContainer?.querySelector('section-initial-messages');
            if (initialMessagesSection && typeof initialMessagesSection.getData === 'function') {
                const data = initialMessagesSection.getData();
                exportData.initialMessages = Array.isArray(data) ? data : [];
            }

            // Collect example dialogs
            const exampleDialogsSection = otherSectionsAfterContainer?.querySelector('section-example-dialogs');
            if (exampleDialogsSection && typeof exampleDialogsSection.getData === 'function') {
                const data = exampleDialogsSection.getData();
                exportData.exampleDialogs = Array.isArray(data) ? data : [];
            }

            // Step 2: Get saved bot data for profile and other metadata
            let savedBotData = null;
            try {
                savedBotData = await window.api.chatbot.get(this.currentId);
            } catch (apiError) {
                // If API fails, use DOM data only
                savedBotData = { profile: {}, layout: exportData.layout };
            }

            if (!savedBotData) {
                savedBotData = { profile: {}, layout: exportData.layout };
            }

            // Step 3: Merge DOM data with saved data (DOM takes precedence)
            const botData = {
                profile: savedBotData.profile || {},
                personality: exportData.personality || (typeof savedBotData.personality === 'string' ? savedBotData.personality : ''),
                scenario: exportData.scenario || (typeof savedBotData.scenario === 'string' ? savedBotData.scenario : (savedBotData.scenario?.scenario || savedBotData.scenario?.text || '')),
                initialMessages: exportData.initialMessages.length > 0 ? exportData.initialMessages : (Array.isArray(savedBotData.initialMessages) ? savedBotData.initialMessages : []),
                exampleDialogs: exportData.exampleDialogs.length > 0 ? exportData.exampleDialogs : (Array.isArray(savedBotData.exampleDialogs) ? savedBotData.exampleDialogs : []),
                layout: exportData.layout.length > 0 ? exportData.layout : (Array.isArray(savedBotData.layout) ? savedBotData.layout : [])
            };

            // Step 4: Generate markdown
            let markdown = '';
            try {
                markdown = window.MarkdownExporter.exportToMarkdown(botData, botData.layout);
                if (typeof markdown !== 'string') {
                    markdown = String(markdown || '');
                }
            } catch (markdownError) {
                alert(`Error generating markdown: ${markdownError.message || 'Unknown error'}`);
                return;
            }

            if (!markdown || markdown.trim().length === 0) {
                alert('Warning: Generated markdown is empty. Exporting anyway...');
            }

            // Step 5: Generate filename
            const chatbotName = botData.profile?.name || botData.profile?.displayName || 'character';
            const sanitizedName = chatbotName.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
            const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const filename = `${sanitizedName}_character_sheet_${timestamp}.txt`;

            // Step 6: Save file via IPC (no logging to avoid EPIPE)
            if (window.api && window.api.saveTextFile && typeof window.api.saveTextFile === 'function') {
                try {
                    const result = await window.api.saveTextFile(markdown, filename);
                    
                    if (result && result.success) {
                        alert(`Character sheet exported successfully!\n\nFile: ${result.filename || filename}`);
                        return;
                    }
                    
                    if (result && result.cancelled) {
                        // User cancelled - silently return
                        return;
                    }
                    
                    // If IPC failed, fall through to browser download
                } catch (ipcError) {
                    // IPC failed - use browser download fallback
                }
            }

            // Step 7: Fallback to browser download
            try {
                const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                alert(`Character sheet downloaded!\n\nFile: ${filename}`);
            } catch (downloadError) {
                alert(`Export failed: ${downloadError.message || 'Unable to download file'}\n\nPlease try saving the content manually.`);
            }

        } catch (error) {
            // Final error handler - show user-friendly message
            const errorMessage = error?.message || 'Unknown error occurred';
            alert(`Export failed: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
        }
    }
}

customElements.define('chatbot-editor', ChatbotEditor);
