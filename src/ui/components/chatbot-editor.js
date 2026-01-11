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
        // Start minimal as requested by user ("don't start with pre-built")
        // But need at least Profile to start
        this.layout = bot.layout || [
            { type: 'profile', id: 'section-profile', minimized: false }
        ];

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
                        <button id="export-btn" class="secondary-btn">Export PNG</button>
                        <button id="delete-btn" class="danger-btn">Delete</button>
                    ` : ''}
                    <button id="cancel-btn" class="secondary-btn">Cancel</button>
                </div>
            </div>

            <div class="editor-content" id="sections-container">
                <!-- Sections injected here -->
            </div>
        `;

        this.renderSections(bot);
        this.setupListeners();
    }

    renderSections(botData) {
        const container = this.querySelector('#sections-container');
        container.innerHTML = '';

        this.layout.forEach(sectionConfig => {
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
    }

    setupListeners() {
        this.querySelector('#cancel-btn').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('editor-cancel', { bubbles: true }));
        });

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
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this chatbot?')) {
                    await window.api.chatbot.delete(this.currentId);
                    this.dispatchEvent(new CustomEvent('editor-save', { bubbles: true }));
                }
            });
        }

        const exportBtn = this.querySelector('#export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    const success = await window.api.chatbot.export(this.currentId);
                    if (success) {
                        alert('Chatbot exported successfully!');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Export failed');
                }
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
            const index = this.layout.findIndex(s => `section-${s.type}` === section.tagName.toLowerCase() && (section.id ? s.id === section.id : true));
            if (index > -1) {
                this.layout.splice(index, 1);
                section.remove();
            }
        });

        // DRAG AND DROP HANDLERS
        const container = this.querySelector('#sections-container');
        let draggedItem = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.getAttribute('draggable') === 'true') {
                draggedItem = e.target;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.id);
                setTimeout(() => e.target.style.opacity = '0.5', 0);
            }
        });

        container.addEventListener('dragend', (e) => {
            if (e.target.getAttribute('draggable') === 'true') {
                e.target.style.opacity = '1';
                draggedItem = null;
                this.updateLayoutFromDOM();
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            if (draggedItem) {
                if (afterElement == null) {
                    container.appendChild(draggedItem);
                } else {
                    container.insertBefore(draggedItem, afterElement);
                }
            }
        });

        // Monitor changes from sections
        this.addEventListener('section-change', () => {
            this._isDirty = true;
            // Optional: visual indicator on Save button
            const saveBtn = this.querySelector('#save-btn');
            if (saveBtn) saveBtn.textContent = 'Save*';
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
        const sections = this.querySelectorAll('#sections-container > *');
        sections.forEach(el => {
            const typeHeader = el.tagName.toLowerCase().replace('section-', '');
            const existingConfig = this.layout.find(l => l.id === el.id) || {};

            newLayout.push({
                type: typeHeader,
                id: el.id,
                minimized: el.getAttribute('minimized') === 'true'
            });
        });
        this.layout = newLayout;
    }
    async save() {
        // Collect data from all sections
        const sections = this.querySelectorAll('#sections-container > *');
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
                    personality: fullData.personality
                });

                // Update state to 'edit' so subsequent saves don't create duplicates
                this.currentId = newBot.id;
                this._mode = 'edit';
                this.chatbotData = newBot; // Update internal data

                // Update header title
                const headerTitle = this.querySelector('.editor-header h2');
                if (headerTitle) headerTitle.textContent = 'Edit Chatbot';

                // Re-render sections not fully needed unless we want to refresh IDs, 
                // but usually fine to leave as is.
                this.renderSections(newBot); // Optional: ensure everything syncs

                // Show success feedback
                alert('Chatbot created successfully!');

            } else {
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
                    layout: fullData.layout
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
}

customElements.define('chatbot-editor', ChatbotEditor);
