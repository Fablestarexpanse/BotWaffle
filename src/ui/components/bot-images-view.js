/**
 * Bot Images View Component
 * Shows all images for a specific character and allows adding more
 * Features: tagging, search, full-size viewer, open location
 */
class BotImagesView extends HTMLElement {
    constructor() {
        super();
        this.botId = null;
        this.botData = null;
        this.filteredImages = [];
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
            this.filterImages();
            this.render();
        } catch (error) {
            console.error('Error loading bot data:', error);
            this.innerHTML = '<div class="error-message">Failed to load bot data</div>';
        }
    }

    getImages() {
        return this.botData?.profile?.images || (this.botData?.profile?.image ? [this.botData.profile.image] : []);
    }

    getImageTags() {
        return this.botData?.metadata?.imageTags || [];
    }

    normalizeImage(imagePath, index) {
        const tags = this.getImageTags()[index] || [];
        return {
            path: imagePath,
            index: index,
            tags: Array.isArray(tags) ? tags : []
        };
    }

    filterImages() {
        const images = this.getImages();
        const normalized = images.map((img, i) => this.normalizeImage(img, i));
        const term = this.searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredImages = normalized;
            return;
        }

        this.filteredImages = normalized.filter(img => {
            const tags = (img.tags || []).map(t => t.toLowerCase()).join(' ');
            const path = (img.path || '').toLowerCase();
            return path.includes(term) || tags.includes(term);
        });
    }

    render() {
        if (!this.botData) {
            this.innerHTML = '<div class="loading">Loading...</div>';
            return;
        }

        const images = this.filteredImages;
        const allImages = this.getImages();
        const thumbnailIndex = this.botData.profile?.thumbnailIndex !== undefined 
            ? parseInt(this.botData.profile.thumbnailIndex, 10) 
            : (allImages.length > 0 ? 0 : -1);
        const profileImageIndices = this.botData.profile?.profileImageIndices || [];

        this.innerHTML = `
            <div class="bot-images-view">
                <div class="view-header">
                    <h2>Character Images</h2>
                    <button id="add-image-btn" class="primary-btn">
                        <i data-feather="plus"></i>
                        Add Image
                    </button>
                </div>

                <div class="resource-toolbar">
                    <div class="search-box">
                        <i data-feather="search" class="search-icon"></i>
                        <input type="text" id="image-search-input" placeholder="Search images..." value="${this.escapeHtml(this.searchTerm)}">
                    </div>
                </div>

                ${images.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="image" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>${this.searchTerm ? 'No images match your search' : 'No images added yet'}</p>
                        <p class="empty-hint">${this.searchTerm ? 'Try a different search term' : 'Click "Add Image" to add character images'}</p>
                    </div>
                ` : `
                    <div class="resource-grid images-grid" id="images-grid">
                        ${images.map((img) => {
                            const index = img.index;
                            const imagePath = img.path;
                            const isLocalFile = imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('file://');
                            let imageSrc = imagePath;
                            if (isLocalFile) {
                                const normalizedPath = imagePath.replace(/\\/g, '/');
                                imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
                            }
                            const isThumbnail = (thumbnailIndex !== -1 && index === thumbnailIndex);
                            const isInProfile = profileImageIndices.includes(index);
                            const tags = img.tags || [];

                            return `
                                <div class="resource-card image-resource-card" data-index="${index}">
                                    <div class="image-preview-container">
                                        <img src="${this.escapeHtml(imageSrc)}" alt="Character image ${index + 1}" 
                                             class="image-preview-card" 
                                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                        <div class="image-error" style="display: none;">Failed to load image</div>
                                        ${isThumbnail ? '<div class="thumbnail-badge">Thumbnail</div>' : ''}
                                        ${isInProfile ? '<div class="profile-badge">In Profile</div>' : ''}
                                    </div>
                                    <div class="resource-card-header">
                                        <h3>Image ${index + 1}</h3>
                                        <div class="resource-card-actions">
                                            <button class="icon-btn view-fullsize-btn" data-index="${index}" title="View full size">
                                                <i data-feather="maximize-2"></i>
                                            </button>
                                            ${isLocalFile ? `
                                                <button class="icon-btn open-location-btn" data-index="${index}" title="Open location">
                                                    <i data-feather="folder"></i>
                                                </button>
                                            ` : ''}
                                            ${!isThumbnail ? `
                                                <button class="icon-btn set-thumbnail-btn" data-index="${index}" title="Set as thumbnail">
                                                    <i data-feather="thumbs-up"></i>
                                                </button>
                                            ` : `
                                                <button class="icon-btn" disabled title="Current thumbnail">
                                                    <i data-feather="check"></i>
                                                </button>
                                            `}
                                            <button class="icon-btn copy-image-link-btn" data-index="${index}" data-src="${this.escapeHtml(imageSrc)}" title="Copy image link for use in Character Bio HTML">
                                                <i data-feather="link"></i>
                                            </button>
                                            <button class="icon-btn remove-image-btn" data-index="${index}" title="Remove image">
                                                <i data-feather="trash-2"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="resource-card-tags">
                                        ${tags.length > 0 
                                            ? tags.map(tag => `<span class="tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`).join('')
                                            : '<span class="tag-placeholder">No tags</span>'}
                                        <button class="icon-btn edit-tags-btn" data-index="${index}" title="Edit tags" style="width: 24px; height: 24px; padding: 0;">
                                            <i data-feather="tag"></i>
                                        </button>
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

        // Setup listeners immediately after render
        this.setupListeners();
    }

    setupListeners() {
        // Search input
        const searchInput = this.querySelector('#image-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterImages();
                this.render();
            });
        }

        const container = this.querySelector('#images-grid');
        if (!container) {
            // Empty state - only setup add button
            const addBtn = this.querySelector('#add-image-btn');
            if (addBtn) {
                const newAddBtn = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(newAddBtn, addBtn);
                newAddBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.handleAddImage();
                });
            }
            return;
        }

        // Add image button
        const addBtn = this.querySelector('#add-image-btn');
        if (addBtn) {
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);
            newAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.handleAddImage();
            });
        }

        // Tag click to filter
        container.querySelectorAll('.resource-card-tags .tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagValue = tag.getAttribute('data-tag');
                if (tagValue && searchInput) {
                    searchInput.value = tagValue;
                    this.searchTerm = tagValue;
                    this.filterImages();
                    this.render();
                }
            });
        });

        // View full size
        container.querySelectorAll('.view-fullsize-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.viewFullSize(index);
                }
            });
        });

        // Open location
        container.querySelectorAll('.open-location-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.openLocation(index);
                }
            });
        });

        // Set thumbnail
        container.querySelectorAll('.set-thumbnail-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.setThumbnail(index);
                }
            });
        });

        // Remove image
        container.querySelectorAll('.remove-image-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.removeImage(index);
                }
            });
        });

        // Copy image link for use in Character Bio HTML
        container.querySelectorAll('.copy-image-link-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const src = newBtn.getAttribute('data-src');
                if (src) {
                    navigator.clipboard.writeText(src).then(() => {
                        // Brief visual feedback
                        const icon = newBtn.querySelector('svg') || newBtn.querySelector('i');
                        newBtn.style.background = 'var(--success)';
                        newBtn.style.borderColor = 'var(--success)';
                        newBtn.title = 'Copied!';
                        setTimeout(() => {
                            newBtn.style.background = '';
                            newBtn.style.borderColor = '';
                            newBtn.title = 'Copy image link for use in Character Bio HTML';
                        }, 1500);
                    }).catch(() => {
                        alert('Could not copy to clipboard. Path: ' + src);
                    });
                }
            });
        });

        // Edit tags
        container.querySelectorAll('.edit-tags-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.handleEditTags(index);
                }
            });
        });

    }

    async viewFullSize(index) {
        const images = this.getImages();
        if (index < 0 || index >= images.length) return;

        const imagePath = images[index];
        const isLocalFile = imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('file://');
        let imageSrc = imagePath;
        if (isLocalFile) {
            const normalizedPath = imagePath.replace(/\\/g, '/');
            imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
        }

        const modal = document.createElement('div');
        modal.className = 'image-view-modal';
        modal.innerHTML = `
            <div class="image-view-modal-content">
                <div class="image-view-modal-header">
                    <h3>Image ${index + 1} - Full Size</h3>
                    <button class="image-view-modal-close">&times;</button>
                </div>
                <div class="image-view-modal-body">
                    <img src="${this.escapeHtml(imageSrc)}" alt="Full size image" class="full-size-image" 
                         onerror="this.parentElement.innerHTML='<div class=\\'error-message\\'>Failed to load image</div>';">
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        const closeBtn = modal.querySelector('.image-view-modal-close');
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.contains(modal)) {
                closeModal();
            }
        });
    }

    async openLocation(index) {
        const images = this.getImages();
        if (index < 0 || index >= images.length) return;

        const imagePath = images[index];
        if (!imagePath || imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            alert('Cannot open location for remote images');
            return;
        }

        try {
            await window.api.openPath(imagePath);
        } catch (error) {
            console.error('Error opening path:', error);
            alert('Error opening file location: ' + (error.message || 'Unknown error'));
        }
    }

    async handleEditTags(index) {
        const images = this.getImages();
        if (index < 0 || index >= images.length) return;

        const imageTags = this.getImageTags();
        const currentTags = (imageTags[index] || []).join(', ');

        const tagsInput = await this.showInputModal('Edit Image Tags', 'Enter tags separated by commas:', currentTags);
        if (tagsInput === null) return; // User cancelled

        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        try {
            const currentData = await window.api.chatbot.get(this.botId);
            const metadata = currentData.metadata || {};
            const updatedImageTags = [...(metadata.imageTags || [])];
            
            // Ensure array is long enough
            while (updatedImageTags.length <= index) {
                updatedImageTags.push([]);
            }
            
            updatedImageTags[index] = tags;

            await window.api.chatbot.update(this.botId, {
                metadata: {
                    ...metadata,
                    imageTags: updatedImageTags
                }
            });

            await this.loadBotData();
        } catch (error) {
            console.error('Error updating tags:', error);
            alert('Error updating tags: ' + (error.message || 'Unknown error'));
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
                        <input type="text" class="input-modal-input" placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(defaultValue || '')}">
                    </div>
                    <div class="input-modal-footer">
                        <button class="input-modal-btn-cancel">Cancel</button>
                        <button class="input-modal-btn-confirm">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.input-modal-input');
            input.focus();
            input.select();

            const closeModal = (value) => {
                document.body.removeChild(modal);
                resolve(value);
            };

            modal.querySelector('.input-modal-close').addEventListener('click', () => closeModal(null));
            modal.querySelector('.input-modal-btn-cancel').addEventListener('click', () => closeModal(null));
            modal.querySelector('.input-modal-btn-confirm').addEventListener('click', () => {
                closeModal(input.value);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    closeModal(input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal(null);
                }
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(null);
            });
        });
    }

    async handleAddImage() {
        try {
            const currentImages = this.getImages();
            const remainingSlots = 50 - currentImages.length;

            if (remainingSlots <= 0) {
                alert('Maximum of 50 images allowed.');
                return;
            }

            const filePaths = await window.api.assets.select(true);
            if (!filePaths) return;

            const filePathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
            if (filePathsArray.length === 0) return;

            const filesToAdd = filePathsArray.slice(0, remainingSlots);
            if (filePathsArray.length > remainingSlots) {
                alert(`Only ${remainingSlots} image(s) can be added. Selected ${filePathsArray.length - remainingSlots} extra image(s) were ignored.`);
            }

            const newImages = [];
            for (const filePath of filesToAdd) {
                if (!filePath || typeof filePath !== 'string') continue;
                try {
                    const savedPath = await window.api.assets.save(filePath, this.botId);
                    if (savedPath) {
                        newImages.push(savedPath);
                    }
                } catch (error) {
                    console.error('Error saving image:', filePath, error);
                }
            }

            if (newImages.length === 0) {
                alert('Failed to save images. Please try again.');
                return;
            }

            // Update bot data
            const updatedImages = [...currentImages, ...newImages];
            const thumbnailIndex = currentImages.length === 0 ? 0 : (this.botData.profile?.thumbnailIndex !== undefined ? this.botData.profile.thumbnailIndex : 0);
            
            // Add new images to profileImageIndices if there's room (max 5)
            const profileImageIndices = this.botData.profile?.profileImageIndices || [];
            const updatedProfileIndices = [...profileImageIndices];
            const startIndex = currentImages.length;
            for (let i = 0; i < newImages.length && updatedProfileIndices.length < 5; i++) {
                updatedProfileIndices.push(startIndex + i);
            }

            await window.api.chatbot.update(this.botId, {
                profile: {
                    ...this.botData.profile,
                    images: updatedImages,
                    profileImageIndices: updatedProfileIndices,
                    thumbnailIndex: thumbnailIndex
                }
            });

            // Reload bot data
            await this.loadBotData();
        } catch (error) {
            console.error('Error adding images:', error);
            alert('Error adding images: ' + (error.message || 'Unknown error'));
        }
    }

    async setThumbnail(index) {
        try {
            const currentData = await window.api.chatbot.get(this.botId);
            const images = currentData.profile?.images || [];
            if (index < 0 || index >= images.length) {
                console.error('Invalid thumbnail index:', index, 'images length:', images.length);
                return;
            }

            await window.api.chatbot.update(this.botId, {
                profile: {
                    ...currentData.profile,
                    thumbnailIndex: index
                }
            });

            await this.loadBotData();
            await this.refreshProfileSection();
        } catch (error) {
            console.error('Error setting thumbnail:', error);
            alert('Error setting thumbnail: ' + (error.message || 'Unknown error'));
        }
    }

    async refreshProfileSection() {
        try {
            document.dispatchEvent(new CustomEvent('bot-images-updated', {
                detail: { botId: this.botId },
                bubbles: true
            }));
        } catch (error) {
            console.error('Error refreshing profile section:', error);
        }
    }

    async removeImage(index) {
        if (!confirm('Are you sure you want to remove this image?')) return;

        try {
            const images = this.getImages();
            if (index < 0 || index >= images.length) return;

            const imagePathToDelete = images[index];

            const currentThumbnailIndex = this.botData.profile?.thumbnailIndex !== undefined ? this.botData.profile.thumbnailIndex : 0;
            const profileImageIndices = this.botData.profile?.profileImageIndices || [];
            const imageTags = this.getImageTags();
            
            images.splice(index, 1);

            // Update thumbnail index
            let newThumbnailIndex = currentThumbnailIndex;
            if (index === currentThumbnailIndex) {
                newThumbnailIndex = images.length > 0 ? 0 : -1;
            } else if (index < currentThumbnailIndex) {
                newThumbnailIndex = currentThumbnailIndex - 1;
            }

            // Update profile image indices
            const updatedProfileIndices = profileImageIndices
                .filter(idx => idx !== index)
                .map(idx => idx > index ? idx - 1 : idx);

            // Update image tags (remove index and shift others)
            const updatedImageTags = imageTags
                .filter((_, i) => i !== index)
                .map((tags, i) => i < index ? tags : imageTags[i + 1] || []);

            await window.api.chatbot.update(this.botId, {
                profile: {
                    ...this.botData.profile,
                    images: images,
                    thumbnailIndex: newThumbnailIndex,
                    profileImageIndices: updatedProfileIndices
                },
                metadata: {
                    ...this.botData.metadata,
                    imageTags: updatedImageTags
                }
            });

            // Attempt to delete the underlying file from disk (for local images)
            if (imagePathToDelete &&
                !imagePathToDelete.startsWith('http://') &&
                !imagePathToDelete.startsWith('https://')) {
                try {
                    if (window.api && window.api.assets && window.api.assets.delete) {
                        await window.api.assets.delete(imagePathToDelete);
                    }
                } catch (deleteError) {
                    console.error('Error deleting image file from disk:', deleteError);
                    // Non-fatal: metadata is already updated, so just log the error
                }
            }

            await this.loadBotData();
        } catch (error) {
            console.error('Error removing image:', error);
            alert('Error removing image: ' + (error.message || 'Unknown error'));
        }
    }
}

customElements.define('bot-images-view', BotImagesView);
