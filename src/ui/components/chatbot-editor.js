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
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const bot = this._data || {};
        const isEdit = this._mode === 'edit';

        // Default layout if none exists
        const defaultLayout = [
            { type: 'profile', id: 'section-profile', minimized: false },
            { type: 'scenario', id: 'section-scenario', minimized: false },
            { type: 'initial-messages', id: 'section-initial-messages', minimized: false },
            { type: 'example-dialogs', id: 'section-example-dialogs', minimized: false }
        ];
        
        this.layout = bot.layout || defaultLayout;
        
        // Ensure required sections (scenario, initial-messages, example-dialogs) are always in layout
        const requiredSections = [
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        requiredSections.forEach(required => {
            const exists = this.layout.some(l => l.type === required.type);
            if (!exists) {
                this.layout.push({
                    type: required.type,
                    id: required.id,
                    minimized: false
                });
            }
        });

        this.innerHTML = `
            <div class="editor-header">
                <div class="header-left" style="display: flex; align-items: center; gap: 20px;">
                    <h2>${isEdit ? 'Edit Chatbot' : 'Create New Chatbot'}</h2>
                    <button id="save-btn" class="primary-btn">Save</button>
                </div>
                <div class="actions">
                    <button id="add-section-btn" class="secondary-btn">+ Add Section</button>
                    <button id="import-markdown-btn" class="secondary-btn">Import Markdown</button>
                    <button id="load-template-btn" class="secondary-btn">Load Template</button>
                    <button id="save-template-btn" class="secondary-btn">Save as Template</button>
                    ${isEdit ? `
                        <button id="export-sheet-btn" class="secondary-btn">Export Character Sheet</button>
                        <button id="delete-btn" class="danger-btn">Delete</button>
                    ` : ''}
                </div>
            </div>

            <div id="other-sections-container">
                <!-- Character Card Info section injected here first -->
            </div>
            <div class="character-sheet-wrapper">
                <div class="character-sheet-header" id="character-sheet-header">
                    <div class="sheet-header-left">
                        <span class="sheet-toggle-icon">▼</span>
                        <h3>Character Sheet</h3>
                        <span class="token-count" id="character-sheet-token-count">0 tokens</span>
                    </div>
                </div>
                <div class="editor-content" id="character-sheet-sections">
                    <!-- Character Sheet sections (Personality, Custom) injected here -->
                </div>
            </div>
            <div id="other-sections-after-container">
                <!-- Scenario, Initial Messages, Example Dialogs sections injected here after Character Sheet -->
            </div>
        `;

        this.renderSections(bot);
        this.setupListeners();
    }

    renderSections(botData) {
        const charSheetContainer = this.querySelector('#character-sheet-sections');
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        charSheetContainer.innerHTML = '';
        otherSectionsContainer.innerHTML = '';
        if (otherSectionsAfterContainer) otherSectionsAfterContainer.innerHTML = '';

        // Sections that belong in Character Sheet
        const characterSheetTypes = ['personality', 'custom'];
        // Sections that appear after Character Sheet
        const afterSheetTypes = ['scenario', 'initial-messages', 'example-dialogs'];

        // Render profile section first in otherSectionsContainer
        const profileSection = this.layout.find(s => s.type === 'profile');
        if (profileSection) {
            const tagName = 'section-profile';
            const element = document.createElement(tagName);
            if (profileSection.id) element.id = profileSection.id;
            if (profileSection.minimized) element.setAttribute('minimized', 'true');
            element.data = botData;
            otherSectionsContainer.appendChild(element);
        }

        // Render character sheet sections (personality, custom) - exclude afterSheetTypes
        const charSheetSections = this.layout.filter(s => characterSheetTypes.includes(s.type));
        charSheetSections.forEach(sectionConfig => {
            const container = charSheetContainer;
            let element;

            if (sectionConfig.type === 'custom') {
                // Custom category section
                const tagName = 'section-custom';
                if (!customElements.get(tagName)) {
                    console.warn(`Component ${tagName} not defined, skipping section.`);
                    const errorEl = document.createElement('div');
                    errorEl.style.color = 'red';
                    errorEl.style.padding = '10px';
                    errorEl.style.border = '1px dashed red';
                    errorEl.style.margin = '10px 0';
                    errorEl.textContent = `Error: Custom section component not defined.`;
                    container.appendChild(errorEl);
                    return;
                }
                element = document.createElement(tagName);
                if (sectionConfig.id) element.id = sectionConfig.id;
                // Set category and fields before appending to ensure title renders correctly
                element.category = sectionConfig.category || '';
                element.fields = sectionConfig.fields || [];
            } else {
                // Standard section types (profile, personality, etc.)
                const tagName = `section-${sectionConfig.type}`;
                if (!customElements.get(tagName)) {
                    console.warn(`Component ${tagName} not defined, skipping section.`);
                    const errorEl = document.createElement('div');
                    errorEl.style.color = 'red';
                    errorEl.style.padding = '10px';
                    errorEl.style.border = '1px dashed red';
                    errorEl.style.margin = '10px 0';
                    errorEl.textContent = `Error: Unknown section type '${sectionConfig.type}'`;
                    container.appendChild(errorEl);
                    return;
                }
                element = document.createElement(tagName);
            }

            if (sectionConfig.id) element.id = sectionConfig.id;

            // Set initial state
            if (sectionConfig.minimized) element.setAttribute('minimized', 'true');

            // Pass data
            element.data = botData;

            container.appendChild(element);
        });

        // Render sections that appear after Character Sheet (scenario, initial-messages, example-dialogs)
        const afterSheetSections = this.layout.filter(s => afterSheetTypes.includes(s.type));
        afterSheetSections.forEach(sectionConfig => {
            const container = otherSectionsAfterContainer || otherSectionsContainer; // Fallback to otherSectionsContainer if container doesn't exist
            const tagName = `section-${sectionConfig.type}`;
            if (!customElements.get(tagName)) {
                console.warn(`Component ${tagName} not defined, skipping section.`);
                return;
            }
            const element = document.createElement(tagName);
            if (sectionConfig.id) element.id = sectionConfig.id;
            if (sectionConfig.minimized) element.setAttribute('minimized', 'true');
            element.data = botData;
            container.appendChild(element);
        });
        
        // Update token counts after rendering (defer to allow sections to be interactive immediately)
        setTimeout(() => this.updateTokenCounts(), 0);
    }

    updateTokenCounts() {
        if (!window.TokenCounter) return;
        
        const charSheetContainer = this.querySelector('#character-sheet-sections');
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        if (!charSheetContainer || !otherSectionsContainer) return;
        
        // Count tokens from all sections (character sheet + separate sections)
        const allSections = [
            ...charSheetContainer.querySelectorAll('section-personality, section-custom'),
            ...otherSectionsContainer.querySelectorAll('section-profile'),
            ...(otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-scenario, section-initial-messages, section-example-dialogs') : [])
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
        
        // Update character sheet token count
        this.updateCharacterSheetTokenCount();
        
        // Update token status (green/red based on max)
        this.updateTokenStatus(totalTokens);
    }

    updateCharacterSheetTokenCount() {
        if (!window.TokenCounter) return;
        
        const charSheetContainer = this.querySelector('#character-sheet-sections');
        const tokenCountElement = this.querySelector('#character-sheet-token-count');
        
        if (!charSheetContainer || !tokenCountElement) return;
        
        // Get all sections within the character sheet (personality and custom)
        const charSheetSections = charSheetContainer.querySelectorAll('section-personality, section-custom');
        let totalTokens = 0;
        
        charSheetSections.forEach(section => {
            const count = window.TokenCounter.getSectionTokenCount(section) || 0;
            totalTokens += count;
        });
        
        // Update the display
        tokenCountElement.textContent = `${totalTokens} token${totalTokens !== 1 ? 's' : ''}`;
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
        
        const charSheetContainer = this.querySelector('#character-sheet-sections');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        
        // Calculate token counts for each section
        const sectionTokens = {
            personality: 0,
            scenario: 0,
            initialMessages: 0,
            exampleDialogs: 0,
            customSections: 0
        };
        
        const estimate = window.TokenCounter.estimateTokens || (() => 0);
        const countObject = window.TokenCounter.countTokensInObject || (() => 0);
        
        // Count personality and custom sections from character sheet
        if (charSheetContainer) {
            const personalitySection = charSheetContainer.querySelector('section-personality');
            if (personalitySection) {
                sectionTokens.personality = window.TokenCounter.getSectionTokenCount(personalitySection) || 0;
            }
            
            const customSections = charSheetContainer.querySelectorAll('section-custom');
            customSections.forEach(section => {
                sectionTokens.customSections += window.TokenCounter.getSectionTokenCount(section) || 0;
            });
        }
        
        // Count scenario, initial messages, and example dialogs
        if (otherSectionsAfterContainer) {
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
        
        const totalTokens = sectionTokens.personality + sectionTokens.customSections + 
                           sectionTokens.scenario + sectionTokens.initialMessages + sectionTokens.exampleDialogs;
        
        // Update the token display in profile section
        const tokenDisplay = profileSection.querySelector('.profile-token-display');
        if (tokenDisplay) {
            tokenDisplay.innerHTML = `
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

    setupListeners() {
        // Character sheet collapse/expand
        const sheetHeader = this.querySelector('#character-sheet-header');
        const sheetWrapper = this.querySelector('.character-sheet-wrapper');
        if (sheetHeader && sheetWrapper) {
            sheetHeader.addEventListener('click', () => {
                sheetWrapper.classList.toggle('collapsed');
            });
        }

        // Max token input handler
        const maxTokenInput = this.querySelector('#max-token-input');
        if (maxTokenInput) {
            maxTokenInput.addEventListener('input', () => {
                const charSheetContainer = this.querySelector('#character-sheet-sections');
                const otherSectionsContainer = this.querySelector('#other-sections-container');
                const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
                if (charSheetContainer && otherSectionsContainer) {
                    const allSections = [
                        ...charSheetContainer.querySelectorAll('section-personality, section-custom'),
                        ...otherSectionsContainer.querySelectorAll('section-profile'),
                        ...(otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-scenario, section-initial-messages, section-example-dialogs') : [])
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

        // Add Section Logic: Show Modal
        this.querySelector('#add-section-btn').addEventListener('click', () => {
            window.EditorModals.showAddSectionModal(this);
        });

        // Import Markdown Logic: Show Modal
        this.querySelector('#import-markdown-btn').addEventListener('click', () => {
            window.EditorModals.showImportMarkdownModal(this);
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
            // Don't allow removing profile section
            if (section.tagName.toLowerCase() === 'section-profile') {
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
        const charSheetContainer = this.querySelector('#character-sheet-sections');
        const otherSectionsContainer = this.querySelector('#other-sections-container');
        
        // Set up event listeners for both containers
        [charSheetContainer, otherSectionsContainer].forEach(container => {
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

        // Set up drag and drop for character sheet sections
        if (charSheetContainer) {
            charSheetContainer.addEventListener('dragstart', (e) => {
                if (e.target.getAttribute('draggable') === 'true') {
                    draggedItem = e.target;
                    targetContainer = charSheetContainer;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', e.target.id);
                    setTimeout(() => e.target.style.opacity = '0.5', 0);
                }
            });

            charSheetContainer.addEventListener('dragend', (e) => {
                if (e.target.getAttribute('draggable') === 'true') {
                    e.target.style.opacity = '1';
                    draggedItem = null;
                    targetContainer = null;
                    this.updateLayoutFromDOM();
                }
            });

            charSheetContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && targetContainer === charSheetContainer) {
                    const afterElement = getDragAfterElement(charSheetContainer, e.clientY);
                    if (afterElement == null) {
                        charSheetContainer.appendChild(draggedItem);
                    } else {
                        charSheetContainer.insertBefore(draggedItem, afterElement);
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
        const charSheetSections = this.querySelectorAll('#character-sheet-sections > *');
        const otherSections = this.querySelectorAll('#other-sections-container > *');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        const afterSections = otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-scenario, section-initial-messages, section-example-dialogs') : [];
        const allSections = [...charSheetSections, ...otherSections, ...afterSections];
        
        allSections.forEach(el => {
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
        
        // Ensure required sections (scenario, initial-messages, example-dialogs) are always in layout
        const requiredSections = [
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        requiredSections.forEach(required => {
            const exists = newLayout.some(l => l.type === required.type);
            if (!exists) {
                // Find existing config to preserve minimized state
                const existing = this.layout.find(l => l.type === required.type);
                newLayout.push({
                    type: required.type,
                    id: required.id,
                    minimized: existing?.minimized || false
                });
            }
        });
        
        this.layout = newLayout;
    }
    async save() {
        // Ensure required sections (scenario, initial-messages, example-dialogs) are always in layout
        const requiredSections = [
            { type: 'scenario', id: 'section-scenario' },
            { type: 'initial-messages', id: 'section-initial-messages' },
            { type: 'example-dialogs', id: 'section-example-dialogs' }
        ];
        
        requiredSections.forEach(required => {
            const exists = this.layout.some(l => l.type === required.type);
            if (!exists) {
                this.layout.push({
                    type: required.type,
                    id: required.id,
                    minimized: false
                });
            }
        });
        
        // Collect data from all sections
        const charSheetSections = this.querySelectorAll('#character-sheet-sections > *');
        const otherSections = this.querySelectorAll('#other-sections-container > *');
        const otherSectionsAfterContainer = this.querySelector('#other-sections-after-container');
        const afterSections = otherSectionsAfterContainer ? otherSectionsAfterContainer.querySelectorAll('section-scenario, section-initial-messages, section-example-dialogs') : [];
        const sections = [...charSheetSections, ...otherSections, ...afterSections];
        let fullData = {
            // Preserve existing data that might not be in sections (like ID)
            ...this._data,
            layout: this.layout
        };

        // Iterate and merge
        sections.forEach(section => {
            if (typeof section.getData === 'function') {
                const sectionData = section.getData();
                const tagName = section.tagName.toLowerCase();

                // Merge strategy: Profile is top level/profile object, Personality is personality object
                // Custom sections store data by category name
                if (tagName === 'section-profile') {
                    // section-profile returns { name, displayName, ... } which belongs in profile
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
                } else if (tagName === 'section-personality') {
                    fullData.personality = sectionData;
                } else if (tagName === 'section-scenario') {
                    fullData.scenario = sectionData;
                } else if (tagName === 'section-initial-messages') {
                    fullData.initialMessages = sectionData;
                } else if (tagName === 'section-example-dialogs') {
                    fullData.exampleDialogs = sectionData;
                } else if (tagName === 'section-custom') {
                    // Custom sections: store data by category name
                    const categoryName = section.category || 'custom';
                    if (!fullData.customSections) fullData.customSections = {};
                    fullData.customSections[categoryName] = sectionData;
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

        try {
            if (this._mode === 'create') {
                // For create, we pass the whole object, but backend expects 'profile' separation?
                // chatbot-manager.js createChatbot takes profileData.
                // We need to adjust either backend or how we pass data.
                // Looking at chatbot-manager.js: createChatbot(profileData) -> creates structure.
                // It treats input as profile data mostly.
                // We should probably update the bot immediately after creation to add personality.
                // Or update createChatbot to accept full object.
                // For now, let's assume createChatbot only takes profile fields, so we do create then update.

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

                await window.api.chatbot.update(newBot.id, {
                    personality: fullData.personality,
                    scenario: fullData.scenario,
                    initialMessages: fullData.initialMessages,
                    exampleDialogs: fullData.exampleDialogs,
                    customSections: fullData.customSections,
                    metadata: {
                        status: fullData.status || 'draft'
                    }
                });

                // Update state to 'edit' so subsequent saves don't create duplicates
                this.currentId = newBot.id;
                this._mode = 'edit';
                const updatedBot = await window.api.chatbot.get(newBot.id);
                this.chatbotData = updatedBot || newBot; // Refresh with saved data

                // Update header title
                const headerTitle = this.querySelector('.editor-header h2');
                if (headerTitle) headerTitle.textContent = 'Edit Chatbot';

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
                    personality: fullData.personality,
                    scenario: fullData.scenario,
                    initialMessages: fullData.initialMessages,
                    exampleDialogs: fullData.exampleDialogs,
                    customSections: fullData.customSections,
                    layout: fullData.layout,
                    metadata: {
                        status: fullData.status || 'draft',
                        version: newVersion
                    }
                });
                // Feedback for update
                // alert('Saved!'); // Optional, maybe too annoying? Button text change is enough.
            }
            this._isDirty = false;
            const saveBtn = this.querySelector('#save-btn');
            if (saveBtn) saveBtn.textContent = 'Save';

            this.dispatchEvent(new CustomEvent('editor-save', { bubbles: true }));
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save chatbot. Check console for details.');
        }
    }

    /**
     * Exports the character sheet as markdown .txt file
     * Excludes the basic profile section
     */
    async exportCharacterSheet() {
        try {
            if (!window.MarkdownExporter) {
                alert('Markdown exporter not loaded. Please refresh the page.');
                return;
            }

            // Get current chatbot data
            const botData = await window.api.chatbot.get(this.currentId);
            if (!botData) {
                alert('Failed to load chatbot data.');
                return;
            }

            // Get the layout (sections configuration)
            const layout = botData.layout || [];

            // Convert to markdown (will export structure even if empty)
            const markdown = window.MarkdownExporter.exportToMarkdown(botData, layout);

            // Get chatbot name for filename
            const chatbotName = botData.profile?.name || botData.name || 'character';
            const sanitizedName = chatbotName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const filename = `${sanitizedName}_character_sheet_${timestamp}.txt`;

            // Save file via IPC
            if (window.api && window.api.saveTextFile) {
                const result = await window.api.saveTextFile(markdown, filename);
                if (result.success) {
                    alert(`Character sheet exported successfully to:\n${result.filename}`);
                } else if (result.cancelled) {
                    // User cancelled, do nothing
                } else {
                    alert(`Export failed: ${result.error || 'Unknown error'}`);
                }
            } else {
                // Fallback: create download link
                const blob = new Blob([markdown], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('Character sheet downloaded!');
            }
        } catch (error) {
            console.error('Error exporting character sheet:', error);
            alert(`Export error: ${error.message || 'Failed to export character sheet'}`);
        }
    }
}

customElements.define('chatbot-editor', ChatbotEditor);
