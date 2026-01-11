/**
 * Modal functionality for ChatbotEditor
 * Extracted from chatbot-editor.js to improve maintainability
 * Uses namespace pattern for script tag compatibility
 */

(function() {
    'use strict';

    // Create namespace for editor modal functions
    window.EditorModals = {
        /**
         * Shows the "Add Section" modal for creating custom category sections
         * @param {ChatbotEditor} editor - The editor instance
         */
        showAddSectionModal: function(editor) {
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
                window.EditorModals.addFieldToModal(fieldsList, fields);
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
                editor.layout.push({
                    type: 'custom',
                    id: categoryId,
                    category: categoryName,
                    fields: fieldData,
                    minimized: false
                });
                editor.renderSections(editor._data);
                closeModal();
            });

            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.querySelector('.cancel-modal').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            overlay.querySelector('#category-name-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && fields.length === 0) {
                    e.preventDefault();
                    overlay.querySelector('#add-field-btn').click();
                }
            });

            document.body.appendChild(overlay);

            setTimeout(() => {
                const categoryInput = overlay.querySelector('#category-name-input');
                if (categoryInput) {
                    categoryInput.focus();
                }
            }, 100);

            window.EditorModals.addFieldToModal(fieldsList, fields);
        },

        /**
         * Adds a field input to the add section modal
         * @param {HTMLElement} container - Container element for fields
         * @param {Array} fieldsArray - Array to store field objects
         */
        addFieldToModal: function(container, fieldsArray) {
            const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const fieldIndex = fieldsArray.length;

            const fieldItem = document.createElement('div');
            fieldItem.className = 'field-item';
            fieldItem.style.cssText = 'padding: 12px; margin-bottom: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px;';

            fieldItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 500;">Field ${fieldIndex + 1}</span>
                    <button type="button" class="danger-btn small remove-field-btn" data-field-id="${fieldId}">Remove</button>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label>Field Label *</label>
                    <input type="text" class="input-field field-label-input" placeholder="e.g., Character Background" required>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label>Field Name (auto-generated from label, editable)</label>
                    <input type="text" class="input-field field-name-input" placeholder="character_background">
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label>Field Type</label>
                    <select class="input-field field-type-input">
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select (Dropdown)</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label>Placeholder (optional)</label>
                    <input type="text" class="input-field field-placeholder-input" placeholder="Enter text...">
                </div>
                <div class="form-group field-options-group" style="margin-bottom: 8px; display: none;">
                    <label>Options (comma-separated)</label>
                    <input type="text" class="input-field field-options-input" placeholder="Option 1, Option 2, Option 3">
                </div>
            `;

            const labelInput = fieldItem.querySelector('.field-label-input');
            const nameInput = fieldItem.querySelector('.field-name-input');
            labelInput.addEventListener('input', () => {
                if (!nameInput.value || nameInput.dataset.autoGenerated === 'true') {
                    const autoName = labelInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                    nameInput.value = autoName;
                    nameInput.dataset.autoGenerated = 'true';
                }
            });

            nameInput.addEventListener('input', () => {
                nameInput.dataset.autoGenerated = 'false';
            });

            const typeInput = fieldItem.querySelector('.field-type-input');
            const optionsGroup = fieldItem.querySelector('.field-options-group');
            typeInput.addEventListener('change', () => {
                optionsGroup.style.display = typeInput.value === 'select' ? 'block' : 'none';
            });

            fieldItem.querySelector('.remove-field-btn').addEventListener('click', () => {
                const index = fieldsArray.findIndex(f => f._fieldId === fieldId);
                if (index > -1) {
                    fieldsArray.splice(index, 1);
                }
                fieldItem.remove();
            });

            const fieldObj = {
                _fieldId: fieldId,
                _element: fieldItem,
                _index: fieldIndex
            };
            fieldsArray.push(fieldObj);
            container.appendChild(fieldItem);
        },

        /**
         * Shows the "Load Template" modal
         * @param {ChatbotEditor} editor - The editor instance
         */
        showLoadTemplateModal: async function(editor) {
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
                            ${templates.map(template => {
                                const escapeHtml = window.SecurityUtils.escapeHtml;
                                const templateName = escapeHtml(template.name || 'Unnamed Template');
                                const templateId = escapeHtml(template.id);
                                const sectionCount = template.layout ? template.layout.length : 0;
                                return `
                                <div class="template-item" data-template-id="${templateId}" style="
                                    padding: 12px;
                                    margin-bottom: 8px;
                                    background: #1a1a1a;
                                    border: 1px solid #444;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                ">
                                    <div style="font-weight: 500; margin-bottom: 4px;">${templateName}</div>
                                    <div style="font-size: 12px; color: #888;">
                                        Created: ${new Date(template.created).toLocaleDateString()}
                                        ${sectionCount > 0 ? ` • ${sectionCount} section(s)` : ''}
                                    </div>
                                </div>
                            `;
                            }).join('')}
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

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            overlay.querySelectorAll('.template-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const templateId = item.dataset.templateId;
                    try {
                        const template = await window.api.templates.get(templateId);
                        if (template && template.layout) {
                            if (confirm(`Load template "${template.name}"? This will replace your current section layout.`)) {
                                editor.layout = template.layout;
                                editor.renderSections(editor._data);
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
        },

        /**
         * Shows the "Save Template" modal
         * @param {ChatbotEditor} editor - The editor instance
         */
        showSaveTemplateModal: function(editor) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Save as Template</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="template-name-input">Template Name</label>
                            <input type="text" id="template-name-input" class="input-field" 
                                   placeholder="e.g., Default Character Layout">
                        </div>
                        <div style="margin-top: 16px; padding: 12px; background: #1a1a1a; border-radius: 4px; font-size: 14px; color: #aaa;">
                            This will save your current section layout as a template that can be loaded later.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-save-template-modal">Cancel</button>
                        <button class="primary-btn save-template-btn">Save Template</button>
                    </div>
                </div>
            `;

            const closeModal = () => overlay.remove();

            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.querySelector('.cancel-save-template-modal').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            overlay.querySelector('.save-template-btn').addEventListener('click', async () => {
                const templateName = overlay.querySelector('#template-name-input').value.trim();
                if (!templateName) {
                    alert('Please enter a template name.');
                    return;
                }

                try {
                    await window.api.templates.save(templateName, editor.layout);
                    alert('Template saved successfully!');
                    closeModal();
                } catch (error) {
                    console.error('Error saving template:', error);
                    alert('Failed to save template. Check console for details.');
                }
            });

            document.body.appendChild(overlay);

            setTimeout(() => {
                const nameInput = overlay.querySelector('#template-name-input');
                if (nameInput) {
                    nameInput.focus();
                }
            }, 100);
        }
    };
})();
