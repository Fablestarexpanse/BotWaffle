/**
 * Bot Images View Component
 * Shows all images for a specific character and allows adding more
 */
class BotImagesView extends HTMLElement {
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

        const images = this.botData.profile?.images || (this.botData.profile?.image ? [this.botData.profile.image] : []);
        console.log('bot-images-view render - Images count:', images.length, 'Images:', images);
        // Get thumbnail index - ensure it's a valid number
        let thumbnailIndex = this.botData.profile?.thumbnailIndex;
        if (thumbnailIndex === undefined || thumbnailIndex === null) {
            thumbnailIndex = images.length > 0 ? 0 : -1;
        } else {
            thumbnailIndex = parseInt(thumbnailIndex, 10);
            // Ensure thumbnail index is valid
            if (isNaN(thumbnailIndex) || thumbnailIndex < 0 || thumbnailIndex >= images.length) {
                thumbnailIndex = images.length > 0 ? 0 : -1;
            }
        }
        const profileImageIndices = this.botData.profile?.profileImageIndices || [];

        const escapeHtml = window.SecurityUtils?.escapeHtml || ((str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        });

        this.innerHTML = `
            <div class="bot-images-view">
                <div class="view-header">
                    <h2>Character Images</h2>
                    <button id="add-image-btn" class="primary-btn">
                        <i data-feather="plus"></i>
                        Add Image
                    </button>
                </div>

                ${images.length === 0 ? `
                    <div class="empty-state">
                        <i data-feather="image" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>No images added yet</p>
                        <p class="empty-hint">Click "Add Image" to add character images</p>
                    </div>
                ` : `
                    <div class="images-grid" id="images-grid">
                        ${images.map((imagePath, index) => {
                            const isLocalFile = imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('file://');
                            let imageSrc = imagePath;
                            if (isLocalFile) {
                                const normalizedPath = imagePath.replace(/\\/g, '/');
                                imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
                            }
                            const isThumbnail = (thumbnailIndex !== -1 && index === thumbnailIndex);
                            const isInProfile = profileImageIndices.includes(index);
                            const canAddToProfile = profileImageIndices.length < 5 || isInProfile;
                            return `
                                <div class="image-card" data-index="${index}">
                                    <div class="image-preview-container">
                                        <img src="${escapeHtml(imageSrc)}" alt="Character image ${index + 1}" 
                                             class="image-preview" 
                                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                        <div class="image-error" style="display: none;">Failed to load image</div>
                                        ${isThumbnail ? '<div class="thumbnail-badge">Thumbnail</div>' : ''}
                                        ${isInProfile ? '<div class="profile-badge">In Profile</div>' : ''}
                                    </div>
                                    <div class="image-actions">
                                        <label class="profile-toggle-label" ${!canAddToProfile && !isInProfile ? 'title="Maximum 5 images can be shown in profile. Uncheck another image first."' : ''}>
                                            <input type="checkbox" 
                                                   class="profile-image-checkbox" 
                                                   data-index="${index}" 
                                                   ${isInProfile ? 'checked' : ''}
                                                   ${!canAddToProfile && !isInProfile ? 'disabled' : ''}>
                                            <span>Show in Profile ${!canAddToProfile && !isInProfile ? '(Max 5)' : ''}</span>
                                        </label>
                                        ${!isThumbnail ? `
                                            <button class="secondary-btn small set-thumbnail-btn" data-index="${index}">
                                                Set as Thumbnail
                                            </button>
                                        ` : `
                                            <button class="secondary-btn small" disabled>✓ Thumbnail</button>
                                        `}
                                        <button class="danger-btn small remove-image-btn" data-index="${index}">
                                            <i data-feather="trash-2"></i>
                                            Remove
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
        const container = this.querySelector('.images-grid');
        if (!container) {
            console.warn('Images grid container not found');
            return;
        }
        
        // Add image button
        const addBtn = this.querySelector('#add-image-btn');
        if (addBtn) {
            // Clone to remove old listeners
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);
            newAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.handleAddImage();
            });
        }

        // Attach listeners directly to each button (more reliable than delegation)
        const thumbnailButtons = container.querySelectorAll('.set-thumbnail-btn');
        thumbnailButtons.forEach(btn => {
            // Clone to remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    console.log('Set thumbnail clicked:', index);
                    this.setThumbnail(index);
                }
            });
        });

        const removeButtons = container.querySelectorAll('.remove-image-btn');
        removeButtons.forEach(btn => {
            // Clone to remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(newBtn.getAttribute('data-index'));
                if (!isNaN(index)) {
                    console.log('Remove image clicked:', index);
                    this.removeImage(index);
                }
            });
        });

        // Profile image checkboxes - DISABLED until function is rebuilt
        const checkboxes = container.querySelectorAll('.profile-image-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.title = 'Feature temporarily disabled - will be rebuilt';
        });
    }

    // toggleProfileImage function removed - to be rebuilt later

    async handleAddImage() {
        try {
            const currentImages = this.botData.profile?.images || [];
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
                    const savedPath = await window.api.assets.save(filePath);
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
        console.log('setThumbnail called:', { index, botId: this.botId });
        try {
            // Get fresh data
            const currentData = await window.api.chatbot.get(this.botId);
            const images = currentData.profile?.images || [];
            if (index < 0 || index >= images.length) {
                console.error('Invalid thumbnail index:', index, 'images length:', images.length);
                return;
            }

            console.log('Setting thumbnail to index:', index);
            
            const updateResult = await window.api.chatbot.update(this.botId, {
                profile: {
                    ...currentData.profile,
                    thumbnailIndex: index
                }
            });
            
            console.log('Thumbnail update result:', updateResult);

            await this.loadBotData();
            
            // Also trigger a refresh of the profile section if it's open
            await this.refreshProfileSection();
        } catch (error) {
            console.error('Error setting thumbnail:', error);
            alert('Error setting thumbnail: ' + (error.message || 'Unknown error'));
        }
    }

    async refreshProfileSection() {
        try {
            console.log('Refreshing profile section for bot:', this.botId);
            // Store the update so when editor is opened again, it will have fresh data
            // The editor will fetch fresh data when opened, so we just need to ensure
            // it refreshes when navigating back to it
            
            // Dispatch a custom event to notify that images were updated
            // This can be listened to by the editor when it's opened
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
            const images = this.botData.profile?.images || [];
            if (index < 0 || index >= images.length) return;

            const currentThumbnailIndex = this.botData.profile?.thumbnailIndex !== undefined ? this.botData.profile.thumbnailIndex : 0;
            const profileImageIndices = this.botData.profile?.profileImageIndices || [];
            
            images.splice(index, 1);

            // Update thumbnail index
            let newThumbnailIndex = currentThumbnailIndex;
            if (index === currentThumbnailIndex) {
                newThumbnailIndex = images.length > 0 ? 0 : -1;
            } else if (index < currentThumbnailIndex) {
                newThumbnailIndex = currentThumbnailIndex - 1;
            }

            // Update profile image indices (decrement indices after removed index)
            const updatedProfileIndices = profileImageIndices
                .filter(idx => idx !== index) // Remove the deleted index
                .map(idx => idx > index ? idx - 1 : idx); // Decrement indices after the removed one

            await window.api.chatbot.update(this.botId, {
                profile: {
                    ...this.botData.profile,
                    images: images,
                    thumbnailIndex: newThumbnailIndex,
                    profileImageIndices: updatedProfileIndices
                }
            });

            await this.loadBotData();
        } catch (error) {
            console.error('Error removing image:', error);
            alert('Error removing image: ' + (error.message || 'Unknown error'));
        }
    }
}

customElements.define('bot-images-view', BotImagesView);
