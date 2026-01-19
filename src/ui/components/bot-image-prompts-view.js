/**
 * Bot Image Prompts View Component
 * Manages image prompts saved from PromptWaffle for this character
 */
class BotImagePromptsView extends HTMLElement {
    constructor() {
        super();
        this.botId = null;
        this.botData = null;
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
            this.render();
        } catch (error) {
            console.error('Error loading bot data:', error);
            this.innerHTML = '<div class="error-message">Failed to load bot data</div>';
        }
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        // Get image prompts from bot data (stored in metadata or separate field)
        const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];

        const escapeHtml = window.SecurityUtils?.escapeHtml || ((str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        });

        this.innerHTML = `
            <div class="bot-image-prompts-view">
                <div class="view-header">
                    <h2>Image Prompts</h2>
                    <button id="add-prompt-btn" class="primary-btn">
                        <i data-feather="plus"></i>
                        Add Prompt
                    </button>
                </div>

                ${imagePrompts.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="zap" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>No image prompts saved yet</p>
                        <p class="empty-hint">Save image prompts from PromptWaffle to use them with this character</p>
                    </div>
                ` : `
                    <div class="prompts-list" id="prompts-list">
                        ${imagePrompts.map((prompt, index) => {
                            const promptText = typeof prompt === 'string' ? prompt : (prompt.text || prompt.prompt || '');
                            const promptName = typeof prompt === 'object' && prompt.name ? prompt.name : `Prompt ${index + 1}`;
                            return `
                                <div class="prompt-card" data-index="${index}">
                                    <div class="prompt-header">
                                        <h3>${escapeHtml(promptName)}</h3>
                                        <button class="icon-btn copy-prompt-btn" data-index="${index}" title="Copy prompt">
                                            <i data-feather="copy"></i>
                                        </button>
                                        <button class="icon-btn edit-prompt-btn" data-index="${index}" title="Edit prompt">
                                            <i data-feather="edit-2"></i>
                                        </button>
                                        <button class="icon-btn remove-prompt-btn" data-index="${index}" title="Remove prompt">
                                            <i data-feather="trash-2"></i>
                                        </button>
                                    </div>
                                    <div class="prompt-content">
                                        <pre>${escapeHtml(promptText)}</pre>
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
        // Add prompt button
        const addBtn = this.querySelector('#add-prompt-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddPrompt());
        }

        // Copy prompt buttons
        this.querySelectorAll('.copy-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.copy-prompt-btn').getAttribute('data-index'));
                this.copyPrompt(index);
            });
        });

        // Edit prompt buttons
        this.querySelectorAll('.edit-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.edit-prompt-btn').getAttribute('data-index'));
                this.editPrompt(index);
            });
        });

        // Remove prompt buttons
        this.querySelectorAll('.remove-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-prompt-btn').getAttribute('data-index'));
                this.removePrompt(index);
            });
        });
    }

    async handleAddPrompt() {
        const promptText = prompt('Enter the image prompt text:');
        if (!promptText || !promptText.trim()) return;

        const promptName = prompt('Enter a name for this prompt (optional):') || `Prompt ${Date.now()}`;

        try {
            const imagePrompts = this.botData.metadata?.imagePrompts || this.botData.imagePrompts || [];
            const newPrompt = {
                name: promptName,
                text: promptText.trim(),
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
        } catch (error) {
            console.error('Error adding prompt:', error);
            alert('Error adding prompt: ' + (error.message || 'Unknown error'));
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

            // Update the prompt
            if (typeof prompt === 'object') {
                prompt.text = newText.trim();
                prompt.updatedAt = new Date().toISOString();
            } else {
                // Convert string to object
                imagePrompts[index] = {
                    name: promptName,
                    text: newText.trim(),
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
