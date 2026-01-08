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
            this.showAddSectionModal();
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
            this.showLoadTemplateModal();
        });

        // Save Template Logic
        this.querySelector('#save-template-btn').addEventListener('click', async () => {
            this.showSaveTemplateModal();
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

    showAddSectionModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Create Category & Sub-Sections</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="category-name-input">Category Name</label>
                        <input type="text" id="category-name-input" class="input-field" 
                               placeholder="e.g., Background, Personality, Goals">
                    </div>
                    
                    <div id="sub-sections-container">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <label style="margin: 0;">Sub-Sections / Fields</label>
                            <button type="button" class="secondary-btn small" id="add-field-btn">+ Add Field</button>
                        </div>
                        <div id="fields-list"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn cancel-modal">Cancel</button>
                    <button class="primary-btn create-category-btn">Create Category</button>
                </div>
            </div>
        `;

        const closeModal = () => overlay.remove();
        const fieldsList = overlay.querySelector('#fields-list');
        let fields = [];

        // Add field button
        overlay.querySelector('#add-field-btn').addEventListener('click', () => {
            this.addFieldToModal(fieldsList, fields);
        });

        // Create category button
        overlay.querySelector('.create-category-btn').addEventListener('click', () => {
            const categoryName = overlay.querySelector('#category-name-input').value.trim();
            if (!categoryName) {
                alert('Please enter a category name.');
                return;
            }
            if (fields.length === 0) {
                alert('Please add at least one field to this category.');
                return;
            }

            // Extract field data from DOM
            const fieldData = [];
            fields.forEach(fieldObj => {
                const fieldEl = fieldObj._element;
                const nameInput = fieldEl.querySelector('.field-name-input');
                const labelInput = fieldEl.querySelector('.field-label-input');
                const typeInput = fieldEl.querySelector('.field-type-input');
                const placeholderInput = fieldEl.querySelector('.field-placeholder-input');

                const name = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') ||
                    labelInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                const label = labelInput.value.trim() || nameInput.value.trim();

                if (!name || !label) {
                    return; // Skip invalid fields
                }

                const field = {
                    name: name,
                    label: label,
                    type: typeInput.value || 'text',
                    placeholder: placeholderInput.value.trim() || ''
                };

                if (field.type === 'select') {
                    const optionsInput = fieldEl.querySelector('.field-options-input');
                    const optionsText = optionsInput.value.trim();
                    field.options = optionsText ? optionsText.split(',').map(opt => opt.trim()).filter(opt => opt) : [];
                }

                fieldData.push(field);
            });

            if (fieldData.length === 0) {
                alert('Please add at least one valid field to this category.');
                return;
            }

            const categoryId = `category-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
            this.layout.push({
                type: 'custom',
                id: categoryId,
                category: categoryName,
                fields: fieldData,
                minimized: false
            });
            this.renderSections(this._data);
            closeModal();
        });

        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
        overlay.querySelector('.cancel-modal').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            // Only close if clicking the overlay background, not the modal content
            if (e.target === overlay) closeModal();
        });

        // Prevent modal content clicks from closing the modal
        const modal = overlay.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Allow Enter key on category name to add first field
        overlay.querySelector('#category-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && fields.length === 0) {
                e.preventDefault();
                overlay.querySelector('#add-field-btn').click();
            }
        });

        document.body.appendChild(overlay);

        // Focus the category input after a short delay to ensure modal is fully rendered
        setTimeout(() => {
            const categoryInput = overlay.querySelector('#category-name-input');
            if (categoryInput) {
                categoryInput.focus();
            }
        }, 100);

        // Add first field automatically
        this.addFieldToModal(fieldsList, fields);
    }

    addFieldToModal(container, fieldsArray) {
        const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fieldIndex = fieldsArray.length;

        const fieldItem = document.createElement('div');
        fieldItem.className = 'field-item';
        fieldItem.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px;';

        fieldItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: var(--text-primary);">Field ${fieldIndex + 1}</strong>
                <button type="button" class="icon-btn remove-field-btn" style="width: 24px; height: 24px; font-size: 14px;">×</button>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label>Field Name</label>
                <input type="text" class="field-name-input input-field" placeholder="e.g., age, description, goal">
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label>Field Label (Display Name)</label>
                <input type="text" class="field-label-input input-field" placeholder="e.g., Age, Description, Goal">
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label>Field Type</label>
                <select class="field-type-input input-field">
                    <option value="text">Text</option>
                    <option value="textarea">Text Area</option>
                    <option value="number">Number</option>
                    <option value="select">Select/Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                </select>
            </div>
            <div class="form-group field-options-container" style="margin-bottom: 8px; display: none;">
                <label>Options (comma-separated for select type)</label>
                <input type="text" class="field-options-input input-field" placeholder="Option 1, Option 2, Option 3">
            </div>
            <div class="form-group">
                <label>Placeholder (optional)</label>
                <input type="text" class="field-placeholder-input input-field" placeholder="Enter placeholder text">
            </div>
        `;

        // Show/hide options for select type
        const typeSelect = fieldItem.querySelector('.field-type-input');
        const optionsContainer = fieldItem.querySelector('.field-options-container');
        typeSelect.addEventListener('change', () => {
            optionsContainer.style.display = typeSelect.value === 'select' ? 'block' : 'none';
        });

        // Remove field button
        fieldItem.querySelector('.remove-field-btn').addEventListener('click', () => {
            const index = fieldsArray.findIndex(f => f._element === fieldItem);
            if (index > -1) {
                fieldsArray.splice(index, 1);
            }
            fieldItem.remove();
            // Update field numbers
            container.querySelectorAll('.field-item').forEach((item, idx) => {
                item.querySelector('strong').textContent = `Field ${idx + 1}`;
            });
        });

        const fieldObj = {
            _element: fieldItem,
            _index: fieldIndex
        };
        fieldsArray.push(fieldObj);
        container.appendChild(fieldItem);
    }

    async showLoadTemplateModal() {
        let templates = [];
        try {
            templates = await window.api.templates.list();
        } catch (error) {
            console.error('Error loading templates:', error);
            alert('Failed to load templates. Check console for details.');
            return;
        }

        if (templates.length === 0) {
            alert('No templates found. Save a template first!');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Load Template</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 16px;">
                        <label>Select a template to load:</label>
                    </div>
                    <div id="templates-list" style="max-height: 400px; overflow-y: auto;">
                        ${templates.map(template => `
                            <div class="template-item" data-template-id="${template.id}" style="
                                padding: 12px;
                                margin-bottom: 8px;
                                background: #1a1a1a;
                                border: 1px solid #444;
                                border-radius: 4px;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">
                                <div style="font-weight: 500; margin-bottom: 4px;">${template.name || 'Unnamed Template'}</div>
                                <div style="font-size: 12px; color: #888;">
                                    Created: ${new Date(template.created).toLocaleDateString()}
                                    ${template.layout ? ` • ${template.layout.length} section(s)` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn cancel-load-template-modal">Cancel</button>
                </div>
            </div>
        `;

        const closeModal = () => overlay.remove();

        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
        overlay.querySelector('.cancel-load-template-modal').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Prevent modal content clicks from closing the modal
        const modal = overlay.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Template selection
        overlay.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', async () => {
                const templateId = item.dataset.templateId;
                try {
                    const template = await window.api.templates.get(templateId);
                    if (template && template.layout) {
                        // Confirm before loading (warns about replacing current layout)
                        if (confirm(`Load template "${template.name}"? This will replace your current section layout.`)) {
                            this.layout = template.layout;
                            this.renderSections(this._data);
                            closeModal();
                        }
                    } else {
                        alert('Template data is invalid.');
                    }
                } catch (error) {
                    console.error('Error loading template:', error);
                    alert('Failed to load template. Check console for details.');
                }
            });

            item.addEventListener('mouseenter', () => {
                item.style.background = '#333';
                item.style.borderColor = 'var(--accent)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = '#1a1a1a';
                item.style.borderColor = '#444';
            });
        });

        document.body.appendChild(overlay);
    }

    showSaveTemplateModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Save as Template</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="template-name-input">Template Name</label>
                        <input type="text" id="template-name-input" class="input-field" placeholder="My Custom Template">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn cancel-template-modal">Cancel</button>
                    <button class="primary-btn save-template-modal">Save Template</button>
                </div>
            </div>
        `;

        const closeModal = () => overlay.remove();

        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
        overlay.querySelector('.cancel-template-modal').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            // Only close if clicking the overlay background, not the modal content
            if (e.target === overlay) closeModal();
        });

        // Prevent modal content clicks from closing the modal
        const modal = overlay.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        overlay.querySelector('.save-template-modal').addEventListener('click', async () => {
            const nameInput = overlay.querySelector('#template-name-input');
            const name = nameInput.value.trim();

            if (!name) {
                alert('Template name cannot be empty.');
                return;
            }

            try {
                await window.api.templates.save(name, this.layout);
                alert(`Template "${name}" saved successfully!`);
                closeModal();
            } catch (error) {
                console.error(error);
                alert('Failed to save template. Check console for details.');
            }
        });

        // Allow Enter key to submit
        overlay.querySelector('#template-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                overlay.querySelector('.save-template-modal').click();
            }
        });

        document.body.appendChild(overlay);

        // Focus the input after a short delay to ensure modal is fully rendered
        setTimeout(() => {
            const templateInput = overlay.querySelector('#template-name-input');
            if (templateInput) {
                templateInput.focus();
            }
        }, 100);
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

        // Validation
        if (!fullData.name || !fullData.name.trim()) {
            alert('Error: Internal Name is required.');
            return;
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
