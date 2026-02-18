/**
 * Bot Image Prompts View Component
 * Manages image prompts saved from PromptWaffle for this character
 */
class BotImagePromptsView extends HTMLElement {
    constructor() {
        super();
        this.botId = null;
        this.botData = null;
        this.filteredPrompts = [];
        this.searchTerm = '';
    }

    escapeHtml(str) {
        const escapeHtml = window.SecurityUtils?.escapeHtml || ((s) => {
            const div = document.createElement('div');
            div.textContent = s;
            return div.innerHTML;
        });
        return escapeHtml(String(str ?? ''));
    }

    set botId(value) {
        this._botId = value;
        if (value) {
            this.loadBotData();
        }
    }

    get botId() {
        return this._botId;
    }

    async loadBotData() {
        if (!this.botId) return;

        try {
            this.botData = await window.api.chatbot.get(this.botId);
            this.filterPrompts();
            this.render();
        } catch (error) {
            console.error('Error loading bot data:', error);
            this.innerHTML = '<div class="error-message">Failed to load bot data</div>';
        }
    }

    getPrompts() {
        return this.botData?.metadata?.imagePrompts || this.botData?.imagePrompts || [];
    }

    normalizePrompt(prompt, index) {
        if (typeof prompt === 'string') {
            return {
                name: `Prompt ${index + 1}`,
                text: prompt,
                tags: [],
                createdAt: null,
                updatedAt: null
            };
        }
        return {
            name: prompt?.name || `Prompt ${index + 1}`,
            text: prompt?.text || prompt?.prompt || '',
            tags: prompt?.tags || [],
            createdAt: prompt?.createdAt || null,
            updatedAt: prompt?.updatedAt || null
        };
    }

    filterPrompts() {
        const prompts = this.getPrompts().map((p, i) => this.normalizePrompt(p, i));
        const term = this.searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredPrompts = prompts;
            return;
        }

        this.filteredPrompts = prompts.filter(prompt => {
            const name = (prompt.name || '').toLowerCase();
            const text = (prompt.text || '').toLowerCase();
            const tags = (prompt.tags || []).map(t => t.toLowerCase()).join(' ');
            return name.includes(term) || text.includes(term) || tags.includes(term);
        });
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        const prompts = this.filteredPrompts;

        this.innerHTML = `
            <div class="bot-image-prompts-view">
                <div class="view-header">
                    <h2>Image Prompts</h2>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <button id="open-prompts-location-btn" class="secondary-btn" title="Open image prompts folder">
                            <i data-feather="folder"></i>
                            Open Location
                        </button>
                        <button id="add-prompt-btn" class="primary-btn">
                            <i data-feather="plus"></i>
                            Add Prompt
                        </button>
                    </div>
                </div>

                <div class="resource-toolbar">
                    <div class="search-box">
                        <i data-feather="search" class="search-icon"></i>
                        <input type="text" id="prompt-search-input" placeholder="Search prompts..." value="${this.escapeHtml(this.searchTerm)}">
                    </div>
                </div>

                ${prompts.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="zap" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>${this.searchTerm ? 'No prompts match your search' : 'No image prompts saved yet'}</p>
                        <p class="empty-hint">${this.searchTerm ? 'Try a different search term' : 'Save image prompts from PromptWaffle to use them with this character'}</p>
                    </div>
                ` : `
                    <div class="resource-grid" id="prompts-grid">
                        ${prompts.map((prompt, index) => {
                            const allPrompts = this.getPrompts().map((p, i) => this.normalizePrompt(p, i));
                            const actualIndex = allPrompts.findIndex(p => p.name === prompt.name && p.text === prompt.text);
                            const promptText = String(prompt.text || '');
                            const preview = promptText.length > 250 ? promptText.substring(0, 250) + '…' : promptText;
                            const tags = prompt.tags || [];

                            return `
                                <div class="resource-card" data-index="${actualIndex}">
                                    <div class="resource-card-header">
                                        <h3 title="${this.escapeHtml(prompt.name)}">${this.escapeHtml(prompt.name)}</h3>
                                        <div class="resource-card-actions">
                                            <button class="icon-btn view-prompt-btn" data-index="${actualIndex}" title="View prompt">
                                                <i data-feather="eye"></i>
                                            </button>
                                            <button class="icon-btn copy-prompt-btn" data-index="${actualIndex}" title="Copy prompt">
                                                <i data-feather="copy"></i>
                                            </button>
                                            <button class="icon-btn send-to-comfyui-btn" data-index="${actualIndex}" title="Send to ComfyUI">
                                                <i data-feather="send"></i>
                                            </button>
                                            <button class="icon-btn edit-prompt-btn" data-index="${actualIndex}" title="Edit prompt">
                                                <i data-feather="edit-2"></i>
                                            </button>
                                            <button class="icon-btn remove-prompt-btn" data-index="${actualIndex}" title="Remove prompt">
                                                <i data-feather="trash-2"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="resource-card-tags">
                                        ${tags.length > 0 
                                            ? tags.map(tag => `<span class="tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`).join('')
                                            : '<span class="tag-placeholder">No tags</span>'}
                                        <button class="icon-btn edit-tags-btn" data-index="${actualIndex}" title="Edit tags" style="width: 24px; height: 24px; padding: 0;">
                                            <i data-feather="tag" style="width: 14px; height: 14px;"></i>
                                        </button>
                                    </div>
                                    <div class="resource-card-preview">
                                        <pre>${this.escapeHtml(preview)}</pre>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        // Re-initialize feather icons
        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        this.setupListeners();
    }

    setupListeners() {
        // Open location button
        const openLocationBtn = this.querySelector('#open-prompts-location-btn');
        if (openLocationBtn) {
            openLocationBtn.addEventListener('click', () => this.openLocation());
        }

        // Add prompt button
        const addBtn = this.querySelector('#add-prompt-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddPrompt());
        }

        // Search input
        const searchInput = this.querySelector('#prompt-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterPrompts();
                this.render();
            });
        }

        // Tag click handlers
        this.querySelectorAll('.resource-card-tags .tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagValue = tag.getAttribute('data-tag');
                if (tagValue && searchInput) {
                    searchInput.value = tagValue;
                    this.searchTerm = tagValue;
                    this.filterPrompts();
                    this.render();
                }
            });
        });

        // Edit tags buttons
        this.querySelectorAll('.edit-tags-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.editPromptTags(index);
            });
        });

        // View prompt buttons
        this.querySelectorAll('.view-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.viewPrompt(index);
            });
        });

        // Copy prompt buttons
        this.querySelectorAll('.copy-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.copyPrompt(index);
            });
        });

        // Edit prompt buttons
        this.querySelectorAll('.edit-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.editPrompt(index);
            });
        });

        // Remove prompt buttons
        this.querySelectorAll('.remove-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.removePrompt(index);
            });
        });

        // Send to ComfyUI buttons
        this.querySelectorAll('.send-to-comfyui-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.sendToComfyUI(index);
            });
        });
    }

    async openLocation() {
        if (!this.botId) return;

        try {
            const promptsFolderPath = await window.api.getCharacterFolderPath(this.botId, 'image-prompts');
            if (!promptsFolderPath) {
                alert('Character folder not found');
                return;
            }
            await window.api.openPath(promptsFolderPath);
        } catch (error) {
            console.error('Error opening location:', error);
            alert('Error opening folder: ' + (error.message || 'Unknown error'));
        }
    }

    viewPrompt(index) {
        const prompts = this.getPrompts().map((p, i) => this.normalizePrompt(p, i));
        const prompt = prompts[index];
        if (!prompt) return;

        const modal = document.createElement('div');
        modal.className = 'prompt-view-modal';
        modal.innerHTML = `
            <div class="prompt-view-modal-content">
                <div class="prompt-view-modal-header">
                    <h3>${this.escapeHtml(prompt.name)}</h3>
                    <button class="prompt-view-modal-close" title="Close">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="prompt-view-modal-body">
                    <pre>${this.escapeHtml(prompt.text)}</pre>
                </div>
                <div class="prompt-view-modal-footer">
                    <button class="secondary-btn prompt-view-modal-copy">
                        <i data-feather="copy"></i>
                        Copy
                    </button>
                    <button class="primary-btn prompt-view-modal-close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
            feather.replace();
        }

        const close = () => modal.remove();
        modal.querySelector('.prompt-view-modal-close')?.addEventListener('click', close);
        modal.querySelector('.prompt-view-modal-close-btn')?.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
        modal.querySelector('.prompt-view-modal-copy')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(String(prompt.text ?? ''));
                this.showToast('Prompt copied to clipboard!', 'success');
            } catch (e) {
                this.showToast('Failed to copy prompt', 'error');
            }
        });
    }

    async handleAddPrompt() {
        try {
            const promptText = await this.showInputModal('Add Image Prompt', 'Enter the image prompt text:', '');
            if (!promptText || !promptText.trim()) return;

            const promptName = await this.showInputModal('Name Prompt', 'Enter a name for this prompt:', '');
            if (!promptName || !promptName.trim()) {
                return;
            }

            const tagsInput = await this.showInputModal('Prompt Tags (Optional)', 'Enter tags separated by commas:', '');
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            const newPrompt = {
                name: promptName.trim(),
                text: promptText.trim(),
                tags: tags,
                createdAt: new Date().toISOString()
            };

            imagePrompts.push(newPrompt);

            // Update bot data
            if (!this.botData.metadata) {
                this.botData.metadata = {};
            }
            this.botData.metadata.imagePrompts = imagePrompts;

            await window.api.chatbot.update(this.botId, {
                metadata: this.botData.metadata
            });

            await this.loadBotData();
            
            // Refresh the chatbot list to update card counts
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList && chatbotList.loadChatbots) {
                chatbotList.loadChatbots();
            }

            this.showToast(`Prompt "${promptName.trim()}" added successfully!`, 'success');
        } catch (error) {
            console.error('Error adding prompt:', error);
            this.showToast('Error adding prompt: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async showInputModal(title, placeholder, defaultValue) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'input-modal';
            modal.innerHTML = `
                <div class="input-modal-content">
                    <div class="input-modal-header">
                        <h3>${title}</h3>
                        <button class="input-modal-close">&times;</button>
                    </div>
                    <div class="input-modal-body">
                        <input type="text" class="input-modal-input" placeholder="${placeholder}" value="${defaultValue || ''}">
                    </div>
                    <div class="input-modal-footer">
                        <button class="input-modal-btn input-modal-cancel">Cancel</button>
                        <button class="input-modal-btn input-modal-confirm primary-btn">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.input-modal-input');
            
            input.style.pointerEvents = 'auto';
            input.style.position = 'relative';
            input.style.zIndex = '10001';
            input.style.cursor = 'text';
            
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);

            const close = () => {
                modal.remove();
                resolve('');
            };

            const confirm = () => {
                const value = input.value.trim();
                modal.remove();
                resolve(value);
            };

            modal.querySelector('.input-modal-close').addEventListener('click', close);
            modal.querySelector('.input-modal-cancel').addEventListener('click', close);
            modal.querySelector('.input-modal-confirm').addEventListener('click', confirm);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('focus', (e) => e.stopPropagation());

            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirm();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
            });
        });
    }

    async editPromptTags(index) {
        try {
            const prompts = this.getPrompts().map((p, i) => this.normalizePrompt(p, i));
            const prompt = prompts[index];
            if (!prompt) return;

            const currentTags = (prompt.tags || []).join(', ');
            const tagsInput = await this.showInputModal('Edit Tags', 'Enter tags separated by commas:', currentTags);
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            if (index < 0 || index >= imagePrompts.length) return;

            if (typeof imagePrompts[index] === 'object') {
                imagePrompts[index].tags = tags;
                imagePrompts[index].updatedAt = new Date().toISOString();
            } else {
                imagePrompts[index] = {
                    name: prompt.name,
                    text: prompt.text,
                    tags: tags,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }

            if (!this.botData.metadata) {
                this.botData.metadata = {};
            }
            this.botData.metadata.imagePrompts = imagePrompts;

            await window.api.chatbot.update(this.botId, {
                metadata: this.botData.metadata
            });

            await this.loadBotData();
            this.showToast('Tags updated', 'success');
        } catch (error) {
            console.error('Error editing tags:', error);
            this.showToast('Error editing tags', 'error');
        }
    }

    async removePrompt(index) {
        if (!confirm('Are you sure you want to remove this prompt?')) return;

        try {
            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            if (index < 0 || index >= imagePrompts.length) return;

            imagePrompts.splice(index, 1);

            if (!this.botData.metadata) {
                this.botData.metadata = {};
            }
            this.botData.metadata.imagePrompts = imagePrompts;

            await window.api.chatbot.update(this.botId, {
                metadata: this.botData.metadata
            });

            await this.loadBotData();
            
            // Refresh the chatbot list to update card counts
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList && chatbotList.loadChatbots) {
                chatbotList.loadChatbots();
            }
        } catch (error) {
            console.error('Error removing prompt:', error);
            alert('Error removing prompt: ' + (error.message || 'Unknown error'));
        }
    }

    async copyPrompt(index) {
        try {
            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            if (index < 0 || index >= imagePrompts.length) return;

            const prompt = imagePrompts[index];
            const promptText = typeof prompt === 'string' ? prompt : (prompt.text || prompt.prompt || '');

            // Use clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(promptText);
                this.showToast('Prompt copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = promptText;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('Prompt copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error copying prompt:', error);
            this.showToast('Failed to copy prompt', 'error');
        }
    }

    async editPrompt(index) {
        try {
            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            if (index < 0 || index >= imagePrompts.length) return;

            const prompt = imagePrompts[index];
            const currentText = typeof prompt === 'string' ? prompt : (prompt.text || prompt.prompt || '');
            const promptName = typeof prompt === 'object' && prompt.name ? prompt.name : `Prompt ${index + 1}`;

            // Show edit modal with textarea
            const newText = await this.showEditModal(promptName, currentText);
            if (newText === null || newText === currentText) {
                return; // User cancelled or didn't change anything
            }

            // Get new name and tags
            const newName = await this.showInputModal('Edit Prompt Name', 'Enter a name for this prompt:', promptName);
            if (!newName || !newName.trim()) {
                return;
            }

            const currentTags = (prompt.tags || []).join(', ');
            const tagsInput = await this.showInputModal('Prompt Tags (Optional)', 'Enter tags separated by commas:', currentTags);
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            // Update the prompt
            if (typeof prompt === 'object') {
                prompt.name = newName.trim();
                prompt.text = newText.trim();
                prompt.tags = tags;
                prompt.updatedAt = new Date().toISOString();
            } else {
                // Convert string to object
                imagePrompts[index] = {
                    name: newName.trim(),
                    text: newText.trim(),
                    tags: tags,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }

            if (!this.botData.metadata) {
                this.botData.metadata = {};
            }
            this.botData.metadata.imagePrompts = imagePrompts;

            await window.api.chatbot.update(this.botId, {
                metadata: this.botData.metadata
            });

            await this.loadBotData();
            this.showToast('Prompt updated successfully!', 'success');
            
            // Refresh the chatbot list to update card counts
            const chatbotList = document.querySelector('chatbot-list');
            if (chatbotList && chatbotList.loadChatbots) {
                chatbotList.loadChatbots();
            }
        } catch (error) {
            console.error('Error editing prompt:', error);
            this.showToast('Error editing prompt: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async showEditModal(title, currentText) {
        return new Promise((resolve) => {
            // Create modal if it doesn't exist
            let modal = document.getElementById('editPromptModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'editPromptModal';
                modal.className = 'edit-prompt-modal';
                modal.innerHTML = `
                    <div class="edit-prompt-modal-content">
                        <div class="edit-prompt-modal-header">
                            <h3 id="editPromptModalTitle">${title}</h3>
                            <button class="edit-prompt-modal-close" aria-label="Close">
                                <i data-feather="x"></i>
                            </button>
                        </div>
                        <div class="edit-prompt-modal-body">
                            <textarea 
                                id="editPromptModalTextarea" 
                                class="edit-prompt-modal-textarea" 
                                rows="10"
                                placeholder="Enter prompt text..."
                            ></textarea>
                        </div>
                        <div class="edit-prompt-modal-footer">
                            <button id="editPromptModalCancel" class="edit-prompt-modal-btn edit-prompt-modal-btn-cancel">Cancel</button>
                            <button id="editPromptModalConfirm" class="edit-prompt-modal-btn edit-prompt-modal-btn-confirm">Save</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Initialize Feather icons
                if (typeof feather !== 'undefined' && typeof feather.replace === 'function') {
                    feather.replace();
                }
            }

            const titleElement = document.getElementById('editPromptModalTitle');
            const textareaElement = document.getElementById('editPromptModalTextarea');
            const cancelBtn = document.getElementById('editPromptModalCancel');
            const confirmBtn = document.getElementById('editPromptModalConfirm');
            const closeBtn = modal.querySelector('.edit-prompt-modal-close');

            if (!titleElement || !textareaElement || !cancelBtn || !confirmBtn) {
                console.error('Edit prompt modal elements not found');
                resolve(null);
                return;
            }

            // Set the title and textarea value
            titleElement.textContent = `Edit: ${title}`;
            textareaElement.value = currentText;

            // Show the modal
            modal.style.display = 'flex';
            
            // Focus the textarea
            setTimeout(() => {
                textareaElement.focus();
                textareaElement.setSelectionRange(textareaElement.value.length, textareaElement.value.length);
            }, 100);

            // Handle cancel/close
            const handleCancel = () => {
                modal.style.display = 'none';
                textareaElement.value = '';
                cancelBtn.removeEventListener('click', handleCancel);
                confirmBtn.removeEventListener('click', handleConfirm);
                if (closeBtn) closeBtn.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleEscape);
                modal.removeEventListener('click', handleBackdropClick);
                textareaElement.removeEventListener('keydown', handleCtrlEnter);
                resolve(null);
            };

            // Handle confirm
            const handleConfirm = () => {
                const value = textareaElement.value.trim();
                modal.style.display = 'none';
                textareaElement.value = '';
                cancelBtn.removeEventListener('click', handleCancel);
                confirmBtn.removeEventListener('click', handleConfirm);
                if (closeBtn) closeBtn.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleEscape);
                modal.removeEventListener('click', handleBackdropClick);
                textareaElement.removeEventListener('keydown', handleCtrlEnter);
                resolve(value || null);
            };

            // Handle escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            // Handle Ctrl+Enter to save
            const handleCtrlEnter = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                }
            };

            // Handle clicking outside modal
            const handleBackdropClick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };

            // Add event listeners
            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            if (closeBtn) closeBtn.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleEscape);
            textareaElement.addEventListener('keydown', handleCtrlEnter);
            modal.addEventListener('click', handleBackdropClick);
        });
    }

    async sendToComfyUI(index) {
        try {
            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            if (index < 0 || index >= imagePrompts.length) return;

            const prompt = imagePrompts[index];
            const promptText = typeof prompt === 'string' ? prompt : (prompt.text || prompt.prompt || '');

            if (!promptText.trim()) {
                this.showToast('Prompt is empty, nothing to send', 'error');
                return;
            }

            if (!window.api.comfyui) {
                this.showToast('ComfyUI integration not available', 'error');
                return;
            }

            // Get the ComfyUI folder path
            const folderPath = await window.api.comfyui.getFolder();

            // Save the prompt to the file
            const result = await window.api.comfyui.savePrompt(promptText, folderPath, 'promptwaffle_prompt.txt');

            if (result.success) {
                this.showToast(`Sent to ComfyUI → ${result.filePath}`, 'success');
            } else {
                this.showToast(`Failed to send: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error sending prompt to ComfyUI:', error);
            this.showToast(`Error: ${error.message || 'Failed to send prompt'}`, 'error');
        }
    }

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

customElements.define('bot-image-prompts-view', BotImagePromptsView);
