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
            // Check what sections already exist
            const existingTypes = editor.layout.map(s => s.type);
            const availableSections = [
                { type: 'scenario', name: 'Scenario', description: 'Add scenario/setting description' },
                { type: 'initial-messages', name: 'Initial Messages', description: 'Add initial greeting messages' },
                { type: 'example-dialogs', name: 'Example Dialogs', description: 'Add example conversation dialogs' },
                { type: 'personality', name: 'Personality Engine', description: 'Add personality builder section' }
            ].filter(s => !existingTypes.includes(s.type));

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>Add Section</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${availableSections.length > 0 ? `
                            <div class="form-group">
                                <label>Standard Sections</label>
                                <div class="section-options">
                                    ${availableSections.map(section => `
                                        <div class="section-option" data-type="${section.type}">
                                            <div class="section-option-header">
                                                <strong>${section.name}</strong>
                                            </div>
                                            <div class="section-option-description">${section.description}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div style="margin: 20px 0; text-align: center; color: var(--text-secondary);">OR</div>
                        ` : ''}
                        <div class="form-group">
                            <label for="category-name-input">Create Custom Category</label>
                            <input type="text" id="category-name-input" class="input-field" 
                                   placeholder="e.g., Background, Goals, Backstory">
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
                        <button class="primary-btn create-category-btn" style="display: none;">Create Category</button>
                    </div>
                </div>
            `;

            const closeModal = () => overlay.remove();
            const fieldsList = overlay.querySelector('#fields-list');
            const categoryInput = overlay.querySelector('#category-name-input');
            const createCategoryBtn = overlay.querySelector('.create-category-btn');
            const subSectionsContainer = overlay.querySelector('#sub-sections-container');
            let fields = [];
            let selectedStandardSection = null;

            // Handle standard section selection
            overlay.querySelectorAll('.section-option').forEach(option => {
                option.addEventListener('click', () => {
                    overlay.querySelectorAll('.section-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedStandardSection = option.getAttribute('data-type');
                    if (categoryInput) categoryInput.disabled = true;
                    if (subSectionsContainer) subSectionsContainer.style.display = 'none';
                    if (createCategoryBtn) {
                        createCategoryBtn.style.display = 'inline-block';
                        createCategoryBtn.textContent = 'Add Section';
                    }
                });
            });

            // Enable custom category when typing
            if (categoryInput) {
                categoryInput.addEventListener('input', () => {
                    if (categoryInput.value.trim()) {
                        overlay.querySelectorAll('.section-option').forEach(o => o.classList.remove('selected'));
                        selectedStandardSection = null;
                        categoryInput.disabled = false;
                        if (subSectionsContainer) subSectionsContainer.style.display = 'block';
                        if (createCategoryBtn) {
                            createCategoryBtn.style.display = 'inline-block';
                            createCategoryBtn.textContent = 'Create Category';
                        }
                    }
                });
            }

            // Add field button
            const addFieldBtn = overlay.querySelector('#add-field-btn');
            if (addFieldBtn) {
                addFieldBtn.addEventListener('click', () => {
                    window.EditorModals.addFieldToModal(fieldsList, fields);
                });
            }

            // Create category / Add section button
            if (createCategoryBtn) {
                createCategoryBtn.addEventListener('click', () => {
                    // If a standard section is selected, add it directly
                    if (selectedStandardSection) {
                        const sectionIds = {
                            'scenario': 'section-scenario',
                            'initial-messages': 'section-initial-messages',
                            'example-dialogs': 'section-example-dialogs',
                            'personality': 'section-personality'
                        };
                        const sectionId = sectionIds[selectedStandardSection] || `section-${selectedStandardSection}`;
                        
                        // Check if section already exists
                        if (editor.layout.some(s => s.type === selectedStandardSection)) {
                            alert('This section already exists.');
                            return;
                        }
                        
                        editor.layout.push({
                            type: selectedStandardSection,
                            id: sectionId,
                            minimized: false
                        });
                        editor.renderSections(editor._data);
                        closeModal();
                        return;
                    }

                    // Otherwise, create custom category
                    const categoryName = categoryInput ? categoryInput.value.trim() : '';
                    if (!categoryName) {
                        alert('Please enter a category name or select a standard section.');
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
            }

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
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                ">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500; margin-bottom: 4px;">${templateName}</div>
                                        <div style="font-size: 12px; color: #888;">
                                            Created: ${new Date(template.created).toLocaleDateString()}
                                            ${sectionCount > 0 ? ` • ${sectionCount} section(s)` : ''}
                                        </div>
                                    </div>
                                    <button class="template-delete-btn" data-template-id="${templateId}" style="
                                        background: rgba(239, 68, 68, 0.1);
                                        border: 1px solid rgba(239, 68, 68, 0.3);
                                        color: var(--danger);
                                        padding: 6px 12px;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 12px;
                                        margin-left: 12px;
                                        transition: all 0.2s;
                                    " title="Delete template">Delete</button>
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

            // Handle delete buttons
            overlay.querySelectorAll('.template-delete-btn').forEach(deleteBtn => {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent triggering the load action
                    const templateId = deleteBtn.dataset.templateId;
                    const templateItem = deleteBtn.closest('.template-item');
                    const templateName = templateItem.querySelector('div').textContent.trim();
                    
                    if (confirm(`Are you sure you want to delete template "${templateName}"? This action cannot be undone.`)) {
                        try {
                            await window.api.templates.delete(templateId);
                            // Remove the template item from the list
                            templateItem.remove();
                            
                            // If no templates left, close modal
                            const remainingTemplates = overlay.querySelectorAll('.template-item');
                            if (remainingTemplates.length === 0) {
                                alert('All templates deleted.');
                                closeModal();
                            }
                        } catch (error) {
                            console.error('Error deleting template:', error);
                            alert('Failed to delete template. Check console for details.');
                        }
                    }
                });
                
                deleteBtn.addEventListener('mouseenter', () => {
                    deleteBtn.style.background = 'var(--danger)';
                    deleteBtn.style.color = 'white';
                    deleteBtn.style.borderColor = 'var(--danger)';
                });
                
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
                    deleteBtn.style.color = 'var(--danger)';
                    deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                });
            });

            // Handle template item clicks (load template)
            overlay.querySelectorAll('.template-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    // Don't load if clicking on delete button
                    if (e.target.closest('.template-delete-btn')) {
                        return;
                    }
                    
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
                    if (!item.querySelector('.template-delete-btn:hover')) {
                        item.style.background = '#333';
                        item.style.borderColor = 'var(--accent)';
                    }
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
                    // Don't stop propagation for interactive elements - they need to handle their own events
                    if (e.target.tagName === 'INPUT' || 
                        e.target.tagName === 'TEXTAREA' || 
                        e.target.tagName === 'SELECT' ||
                        e.target.tagName === 'BUTTON' ||
                        e.target.closest('input, textarea, select, button')) {
                        return;
                    }
                    e.stopPropagation();
                });
            }

            // Ensure input field can receive clicks and focus without interference
            const nameInput = overlay.querySelector('#template-name-input');
            if (nameInput) {
                nameInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                nameInput.addEventListener('focus', (e) => {
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
        },

        /**
         * Shows the "Delete Chatbot" confirmation modal (for editor)
         * @param {ChatbotEditor} editor - The editor instance
         * @param {string} chatbotName - The name of the chatbot to delete
         */
        showDeleteConfirmationModal: function(editor, chatbotName) {
            const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (text) => String(text ?? '');
            const safeChatbotName = escapeHtml(chatbotName);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Delete Chatbot</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: var(--danger);">
                            <strong>Warning:</strong> This action cannot be undone. This will permanently delete the chatbot.
                        </div>
                        <div class="form-group">
                            <label for="delete-confirm-input">Type the chatbot name to confirm deletion:</label>
                            <div style="margin: 8px 0; padding: 8px; background: #1a1a1a; border-radius: 4px; font-weight: 600; color: var(--text-primary);">
                                ${safeChatbotName}
                            </div>
                            <input type="text" id="delete-confirm-input" class="input-field" 
                                   placeholder="Type the chatbot name here">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-delete-modal">Cancel</button>
                        <button class="danger-btn confirm-delete-btn" disabled>Delete</button>
                    </div>
                </div>
            `;

            const closeModal = () => overlay.remove();

            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.querySelector('.cancel-delete-modal').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target.tagName === 'INPUT' || 
                        e.target.tagName === 'TEXTAREA' || 
                        e.target.tagName === 'SELECT' ||
                        e.target.tagName === 'BUTTON' ||
                        e.target.closest('input, textarea, select, button')) {
                        return;
                    }
                    e.stopPropagation();
                });
            }

            const confirmInput = overlay.querySelector('#delete-confirm-input');
            const confirmBtn = overlay.querySelector('.confirm-delete-btn');

            if (confirmInput) {
                confirmInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                confirmInput.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                confirmInput.addEventListener('input', (e) => {
                    const inputValue = e.target.value.trim();
                    if (inputValue === chatbotName) {
                        confirmBtn.disabled = false;
                    } else {
                        confirmBtn.disabled = true;
                    }
                });
            }

            confirmBtn.addEventListener('click', async () => {
                const inputValue = confirmInput.value.trim();
                if (inputValue !== chatbotName) {
                    alert('The name you typed does not match the chatbot name.');
                    return;
                }

                try {
                    await window.api.chatbot.delete(editor.currentId);
                    closeModal();
                    editor.dispatchEvent(new CustomEvent('editor-save', { bubbles: true }));
                } catch (error) {
                    console.error('Error deleting chatbot:', error);
                    alert('Failed to delete chatbot. Check console for details.');
                }
            });

            document.body.appendChild(overlay);

            setTimeout(() => {
                if (confirmInput) {
                    confirmInput.focus();
                }
            }, 100);
        },

        /**
         * Shows the "Delete Chatbot" confirmation modal (for card view)
         * @param {string} chatbotId - The ID of the chatbot to delete
         * @param {string} chatbotName - The name of the chatbot to delete
         * @param {Function} onDeleteCallback - Callback to execute after successful deletion
         */
        showDeleteConfirmationModalForCard: function(chatbotId, chatbotName, onDeleteCallback) {
            const escapeHtml = window.SecurityUtils ? window.SecurityUtils.escapeHtml : (text) => String(text ?? '');
            const safeChatbotName = escapeHtml(chatbotName);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Delete Chatbot</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: var(--danger);">
                            <strong>Warning:</strong> This action cannot be undone. This will permanently delete the chatbot.
                        </div>
                        <div class="form-group">
                            <label for="delete-confirm-input-card">Type the chatbot name to confirm deletion:</label>
                            <div style="margin: 8px 0; padding: 8px; background: #1a1a1a; border-radius: 4px; font-weight: 600; color: var(--text-primary);">
                                ${safeChatbotName}
                            </div>
                            <input type="text" id="delete-confirm-input-card" class="input-field" 
                                   placeholder="Type the chatbot name here">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-delete-modal-card">Cancel</button>
                        <button class="danger-btn confirm-delete-btn-card" disabled>Delete</button>
                    </div>
                </div>
            `;

            const closeModal = () => overlay.remove();

            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.querySelector('.cancel-delete-modal-card').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target.tagName === 'INPUT' || 
                        e.target.tagName === 'TEXTAREA' || 
                        e.target.tagName === 'SELECT' ||
                        e.target.tagName === 'BUTTON' ||
                        e.target.closest('input, textarea, select, button')) {
                        return;
                    }
                    e.stopPropagation();
                });
            }

            const confirmInput = overlay.querySelector('#delete-confirm-input-card');
            const confirmBtn = overlay.querySelector('.confirm-delete-btn-card');

            if (confirmInput) {
                confirmInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                confirmInput.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                confirmInput.addEventListener('input', (e) => {
                    const inputValue = e.target.value.trim();
                    if (inputValue === chatbotName) {
                        confirmBtn.disabled = false;
                    } else {
                        confirmBtn.disabled = true;
                    }
                });
            }

            confirmBtn.addEventListener('click', async () => {
                const inputValue = confirmInput.value.trim();
                if (inputValue !== chatbotName) {
                    alert('The name you typed does not match the chatbot name.');
                    return;
                }

                // Disable button during deletion
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Deleting...';

                try {
                    console.log(`[Delete] Attempting to delete chatbot: ${chatbotId} (${chatbotName})`);
                    const result = await window.api.chatbot.delete(chatbotId);
                    console.log(`[Delete] Delete result:`, result);
                    
                    if (result === false) {
                        alert('Failed to delete chatbot. Chatbot not found. Check the console for details.');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Delete';
                        return;
                    }
                    
                    closeModal();
                    
                    // Close editor if it's open for this bot
                    const editor = document.querySelector('chatbot-editor');
                    if (editor && editor.currentId === chatbotId) {
                        // Navigate back to library to close editor
                        document.dispatchEvent(new CustomEvent('navigate-library', { bubbles: true }));
                    }
                    
                    // Wait a moment for file system to sync
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (onDeleteCallback) {
                        onDeleteCallback();
                    }
                } catch (error) {
                    console.error('[Delete] Error deleting chatbot:', error);
                    console.error('[Delete] Error details:', {
                        message: error.message,
                        stack: error.stack,
                        chatbotId: chatbotId,
                        chatbotName: chatbotName
                    });
                    alert(`Failed to delete chatbot: ${error.message || 'Unknown error'}\n\nCheck the browser console (F12) for more details.`);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Delete';
                }
            });

            document.body.appendChild(overlay);

            setTimeout(() => {
                if (confirmInput) {
                    confirmInput.focus();
                }
            }, 100);
        },

        /**
         * Shows the "Import Markdown" modal for importing markdown outlines
         * @param {ChatbotEditor} editor - The editor instance
         */
        showImportMarkdownModal: function(editor) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 700px; max-height: 90vh;">
                    <div class="modal-header">
                        <h3>Import Markdown Outline</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; max-height: 60vh;">
                        <div class="form-group">
                            <label for="markdown-input">Paste your markdown outline below:</label>
                            <textarea id="markdown-input" class="input-field" rows="20" 
                                      style="font-family: monospace; font-size: 12px;"
                                      placeholder="# Category Name&#10;- Field 1:&#10;- Field 2:&#10;&#10;## Another Category&#10;- Field A:&#10;- Field B:"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="file" id="markdown-file-input" accept=".md,.txt" style="display: none;">
                                <button type="button" class="secondary-btn" id="upload-file-btn">📁 Upload Markdown File</button>
                                <span id="file-name" style="margin-left: 10px; color: var(--text-secondary);"></span>
                            </label>
                        </div>
                        <div id="markdown-preview" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 4px; display: none;">
                            <h4 style="margin-top: 0;">Preview:</h4>
                            <div id="preview-content"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-markdown-modal">Cancel</button>
                        <button class="secondary-btn" id="preview-markdown-btn">Preview</button>
                        <button class="primary-btn import-markdown-btn">Import Sections</button>
                    </div>
                </div>
            `;

            const closeModal = () => overlay.remove();
            const markdownInput = overlay.querySelector('#markdown-input');
            const fileInput = overlay.querySelector('#markdown-file-input');
            const uploadBtn = overlay.querySelector('#upload-file-btn');
            const fileName = overlay.querySelector('#file-name');
            const previewDiv = overlay.querySelector('#markdown-preview');
            const previewContent = overlay.querySelector('#preview-content');

            // File upload handler
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    fileName.textContent = file.name;
                    try {
                        const text = await file.text();
                        markdownInput.value = text;
                        // Auto-preview after upload
                        setTimeout(() => {
                            overlay.querySelector('#preview-markdown-btn').click();
                        }, 100);
                    } catch (error) {
                        alert('Error reading file: ' + error.message);
                    }
                }
            });

            // Preview button
            overlay.querySelector('#preview-markdown-btn').addEventListener('click', () => {
                const markdown = markdownInput.value.trim();
                if (!markdown) {
                    alert('Please paste or upload markdown content first.');
                    return;
                }

                try {
                    if (!window.MarkdownParser) {
                        alert('Markdown parser not loaded. Please refresh the page.');
                        return;
                    }

                    const sections = window.MarkdownParser.parseMarkdownToSections(markdown);
                    const validation = window.MarkdownParser.validateParsedSections(sections);

                    if (!validation.valid) {
                        previewContent.innerHTML = `<div style="color: var(--danger);">
                            <strong>Validation Errors:</strong><ul style="margin: 10px 0; padding-left: 20px;">
                            ${validation.errors.map(err => `<li>${window.SecurityUtils.escapeHtml(err)}</li>`).join('')}
                            </ul></div>`;
                        previewDiv.style.display = 'block';
                        return;
                    }

                    // Show preview
                    let previewHtml = `<div style="color: var(--success); margin-bottom: 15px;">
                        <strong>✓ Found ${sections.length} section(s):</strong></div>`;
                    
                    sections.forEach((section, index) => {
                        previewHtml += `<div style="margin-bottom: 15px; padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
                            <strong style="color: var(--accent);">${window.SecurityUtils.escapeHtml(section.category)}</strong>
                            <div style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">
                                ${section.fields.length} field(s): ${section.fields.map(f => window.SecurityUtils.escapeHtml(f.label)).join(', ')}
                            </div>
                        </div>`;
                    });

                    previewContent.innerHTML = previewHtml;
                    previewDiv.style.display = 'block';
                } catch (error) {
                    previewContent.innerHTML = `<div style="color: var(--danger);">
                        <strong>Error:</strong> ${window.SecurityUtils.escapeHtml(error.message)}
                    </div>`;
                    previewDiv.style.display = 'block';
                    console.error('Markdown parse error:', error);
                }
            });

            // Import button
            overlay.querySelector('.import-markdown-btn').addEventListener('click', async () => {
                const markdown = markdownInput.value.trim();
                if (!markdown) {
                    alert('Please paste or upload markdown content first.');
                    return;
                }

                try {
                    if (!window.MarkdownParser) {
                        alert('Markdown parser not loaded. Please refresh the page.');
                        return;
                    }

                    const sections = window.MarkdownParser.parseMarkdownToSections(markdown);
                    const validation = window.MarkdownParser.validateParsedSections(sections);

                    if (!validation.valid) {
                        alert('Validation failed:\n' + validation.errors.join('\n'));
                        return;
                    }

                    // Check if this character already has custom sections (indicating a previous import)
                    const hasCustomSections = editor.layout.some(s => s.type === 'custom');
                    const isEditMode = editor.currentId && editor._mode === 'edit';

                    if (hasCustomSections || isEditMode) {
                        // Ask for confirmation to replace
                        const confirmMessage = hasCustomSections 
                            ? `This character already has imported sections. Importing will REPLACE all existing custom sections with the new ones. Are you sure you want to continue?`
                            : `Importing will REPLACE all existing custom sections. Are you sure you want to continue?`;
                        
                        if (!confirm(confirmMessage)) {
                            return; // User cancelled
                        }
                    }

                    // Remove all existing custom sections from layout
                    editor.layout = editor.layout.filter(s => s.type !== 'custom');
                    
                    // Initialize _data if it doesn't exist
                    if (!editor._data) {
                        editor._data = {};
                    }
                    
                    // Initialize custom sections data
                    if (!editor._data.customSections) {
                        editor._data.customSections = {};
                    }
                    
                    // Populate section data from imported content (all sections are custom)
                    sections.forEach(section => {
                        if (section.type === 'custom' && section.fields) {
                            const sectionData = {};
                            section.fields.forEach(field => {
                                // Use defaultValue if it exists (from markdown import)
                                if (field.defaultValue !== undefined) {
                                    sectionData[field.name] = field.defaultValue;
                                }
                            });
                            // Store the data under the category name
                            editor._data.customSections[section.category] = sectionData;
                            // Add section to layout (custom sections can have multiple)
                            editor.layout.push(section);
                        }
                    });

                    // Re-render sections
                    editor.renderSections(editor._data);
                    
                    // Wait a bit for DOM to update before saving
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Auto-save to persist the imported sections (only if in edit mode)
                    if (isEditMode) {
                        try {
                            await editor.save();
                        } catch (error) {
                            console.error('Error auto-saving after markdown import:', error);
                            alert(`Sections imported but auto-save failed. Please save manually to persist changes. Error: ${error.message}`);
                            closeModal();
                            return;
                        }
                    } else {
                        // In create mode, just mark as dirty so user knows to save
                        editor._isDirty = true;
                        const saveBtn = editor.querySelector('#save-btn');
                        if (saveBtn) saveBtn.textContent = 'Save*';
                    }
                    
                    closeModal();

                    // Show success message
                    alert(`Successfully imported ${sections.length} section(s) and saved!`);
                } catch (error) {
                    alert('Error importing markdown: ' + error.message);
                    console.error('Markdown import error:', error);
                }
            });

            // Close handlers
            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.querySelector('.cancel-markdown-modal').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const modal = overlay.querySelector('.modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            document.body.appendChild(overlay);

            // Focus textarea
            setTimeout(() => {
                if (markdownInput) {
                    markdownInput.focus();
                }
            }, 100);
        }
    };
})();
