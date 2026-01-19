class SectionProfile extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Character Card Info';
        // Initialize minimized state like base class
        if (this._minimized === undefined) {
            this._minimized = false;
        }
    }

    renderFrame() {
        // Override to make profile section non-draggable and non-removable
        this.setAttribute('draggable', 'false');
        
        // Get status value for the dropdown
        const statusValue = this._data.metadata?.status || 'draft';
        const statusOptions = ['draft', 'published', 'archived', 'to-delete'].map(status => {
            const displayText = status === 'to-delete' ? 'To Delete' : status.charAt(0).toUpperCase() + status.slice(1);
            return `<option value="${status}" ${status === statusValue ? 'selected' : ''}>${displayText}</option>`;
        }).join('');
        
        // Add status class to the section element for border coloring
        this.className = `section-profile status-${statusValue}`;
        
        this.innerHTML = `
            <div class="section-container">
                <div class="section-header">
                    <div class="header-left">
                        <span class="toggle-icon">▼</span>
                        <h3 class="section-title">${this._title}</h3>
                        <select name="status" class="status-select-header">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="header-actions">
                        <!-- No remove button for profile section -->
                    </div>
                </div>
                <div class="section-body">
                    <!-- Content injected here -->
                </div>
            </div>
        `;

        // Initialize minimized state if not already set
        if (this._minimized === undefined) {
            this._minimized = this.getAttribute('minimized') === 'true';
        }

        // Setup toggle functionality (from base class)
        const header = this.querySelector('.section-header');
        if (header) {
            // Only toggle when clicking on the toggle icon or header title, not the entire header
            const toggleIcon = header.querySelector('.toggle-icon');
            const headerTitle = header.querySelector('.section-title');
            const headerLeft = header.querySelector('.header-left');
            
            const toggleHandler = (e) => {
                const target = e.target;
                
                // Only toggle if clicking on toggle icon, title, or empty space in header-left
                const clickedToggleIcon = target === toggleIcon || target.closest('.toggle-icon');
                const clickedTitle = target === headerTitle || target.closest('.section-title');
                const clickedHeaderLeft = target === headerLeft || (headerLeft && headerLeft.contains(target) && !target.closest('input, select, textarea, button, .status-select-header, .header-actions'));
                
                if (clickedToggleIcon || clickedTitle || clickedHeaderLeft) {
                    // Make sure we're not clicking on interactive elements
                    if (target.tagName === 'INPUT' || 
                        target.tagName === 'SELECT' || 
                        target.tagName === 'TEXTAREA' ||
                        target.tagName === 'BUTTON' ||
                        target.closest('.status-select-header') ||
                        target.closest('.remove-btn') || 
                        target.closest('.header-actions')) {
                        return;
                    }
                    
                    this._minimized = !this._minimized;
                    this.toggleContent();
                    this.dispatchEvent(new CustomEvent('toggle-section', {
                        detail: { minimized: this._minimized },
                        bubbles: true
                    }));
                }
            };
            
            // Use capture phase to catch events early, but only on header-left area
            if (headerLeft) {
                headerLeft.addEventListener('click', toggleHandler);
            } else {
                // Fallback to header if header-left doesn't exist
                header.addEventListener('click', toggleHandler);
            }
        }

        // Add change listener for status select
        const statusSelect = this.querySelector('.status-select-header');
        if (statusSelect) {
            // Update dropdown border color based on initial status
            this.updateStatusSelectColor(statusSelect, statusSelect.value);
            
            statusSelect.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                // Update the class on the section element to reflect status change immediately
                this.className = `section-profile status-${newStatus}`;
                // Update dropdown border color
                this.updateStatusSelectColor(statusSelect, newStatus);
                
                // Save status change immediately without requiring full save
                this.dispatchEvent(new CustomEvent('status-change', { 
                    detail: { status: newStatus },
                    bubbles: true 
                }));
            });
            // Prevent status select from toggling section
            statusSelect.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Apply initial minimized state
        this.toggleContent();
    }

    toggleContent() {
        const body = this.querySelector('.section-body');
        const icon = this.querySelector('.toggle-icon');
        if (!body || !icon) return;

        if (this._minimized) {
            body.style.display = 'none';
            icon.style.transform = 'rotate(-90deg)';
        } else {
            body.style.display = 'block';
            icon.style.transform = 'rotate(0deg)';
        }
    }

    async renderContent() {
        // Access form data from this._data if editing
        const profile = this._data.profile || {};
        const data = profile.name ? profile : (this._data || {});

        // Handle images: defaults to array if exists, or single image, or empty
        const allImages = data.images || (data.image ? [data.image] : []);
        let profileImageIndices = data.profileImageIndices || [];
        
        console.log('Profile section renderContent - FULL DATA:', {
            _data: this._data,
            profile: this._data.profile,
            data: data,
            allImagesCount: allImages.length,
            allImages: allImages,
            profileImageIndices: profileImageIndices,
            hasProfile: !!this._data.profile,
            'data.images': data.images,
            'data.profileImageIndices': data.profileImageIndices,
            'profile.images': profile.images,
            'profile.profileImageIndices': profile.profileImageIndices
        });
        
        // Determine thumbnail index - use saved one, or default to first image if available
        let thumbnailIndex = data.thumbnailIndex !== undefined ? data.thumbnailIndex : (allImages.length > 0 ? 0 : -1);
        
        // Ensure thumbnailIndex is valid
        if (thumbnailIndex >= allImages.length || thumbnailIndex < 0) {
            thumbnailIndex = allImages.length > 0 ? 0 : -1;
        }
        
        // Only show the thumbnail image (not multiple images)
        const images = [];
        if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
            images.push(allImages[thumbnailIndex]);
        }
        
        console.log('Displaying thumbnail:', {
            thumbnailIndex: thumbnailIndex,
            thumbnailImage: thumbnailIndex >= 0 ? allImages[thumbnailIndex] : 'none'
        });

        // Fetch categories dynamically
        let categories = ['Character', 'Assistant', 'Roleplay', 'Educational']; // Fallback
        try {
            if (window.api && window.api.chatbot && window.api.chatbot.categories) {
                categories = await window.api.chatbot.categories();
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }

        const body = this.querySelector('.section-body');
        
        // Escape all user data to prevent XSS
        const escapeHtml = window.SecurityUtils.escapeHtml;
        const tagsValue = escapeHtml((data.tags || []).join(', '));
        const nameValue = escapeHtml(data.name || '');
        const displayNameValue = escapeHtml(data.displayName || '');
        const categoryValue = escapeHtml(data.category || 'Character');
        const descriptionValue = escapeHtml(data.description || '');
        const categoryOptions = categories.map(cat => `<option value="${escapeHtml(cat)}"></option>`).join('');
        const statusValue = this._data.metadata?.status || 'draft';
        const statusOptions = ['draft', 'published', 'archived', 'to-delete'].map(status => {
            const displayText = status === 'to-delete' ? 'To Delete' : status.charAt(0).toUpperCase() + status.slice(1);
            return `<option value="${escapeHtml(status)}" ${status === statusValue ? 'selected' : ''}>${escapeHtml(displayText)}</option>`;
        }).join('');
        
        // Get max token value from metadata or profile
        const maxTokenValue = this._data.metadata?.maxTokens || this._data.profile?.maxTokens || '';
        const maxTokenValueAttr = maxTokenValue ? ` value="${escapeHtml(String(maxTokenValue))}"` : '';
        
        body.innerHTML = `
            <div class="profile-main-layout">
                <div class="profile-left">
                    <div class="form-group" id="images-container">
                        <label>Character Thumbnail - Manage all images in Pictures section</label>
                        <div class="image-list" id="image-list">
                            <!-- Images injected here -->
                        </div>
                    </div>
                </div>
                <div class="profile-right">
                    <div class="form-group">
                        <label>Token Tracking</label>
                        <div class="profile-token-display">
                            <!-- Token breakdown will be injected here -->
                        </div>
                        <div style="margin-top: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <input type="number" id="max-token-input" class="max-token-input" placeholder="Max tokens" min="0"${maxTokenValueAttr} style="flex: 1;">
                                <span class="token-status" id="token-status"></span>
                            </div>
                            <div class="token-help-text">Set maximum token limit to track if you exceed it</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Tags (Comma separated)</label>
                <input type="text" name="tags" class="input-field" value="${tagsValue}" placeholder="friendly, helper, v1">
            </div>

            <div class="form-group">
                <label>Internal Name (Required)</label>
                <input type="text" name="name" class="input-field" value="${nameValue}" required placeholder="MyBot_v1">
            </div>

            <div class="form-group">
                <label>Display Name</label>
                <input type="text" name="displayName" class="input-field" value="${displayNameValue}" placeholder="Alex (The Helper)">
            </div>

            <div class="form-group">
                <label>Category</label>
                <input type="text" name="category" class="input-field" value="${categoryValue}" list="category-options" placeholder="Select or type a category...">
                <datalist id="category-options">
                    ${categoryOptions}
                </datalist>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="input-field" rows="3" maxlength="2000" placeholder="A brief elevator pitch...">${descriptionValue}</textarea>
                <div class="field-hint">Maximum 2000 characters</div>
            </div>
        `;

        this.renderImageList(images, thumbnailIndex);
        this.setupListeners();
    }

    renderImageList(displayedImages, thumbnailIndex) {
        const listContainer = this.querySelector('#image-list');
        listContainer.innerHTML = '';

        if (displayedImages.length === 0) {
            listContainer.innerHTML = '<div class="image-empty-state">No thumbnail set. Go to Pictures section to add images and set a thumbnail.</div>';
            return;
        }

        // Get all images to map displayed images correctly
        const allImages = this._data.profile?.images || [];

        displayedImages.forEach((imagePath, displayIndex) => {
            // Find the actual index in allImages by matching the image path
            const actualIndex = allImages.findIndex(img => img === imagePath);
            if (actualIndex === -1) {
                console.warn('Image not found in allImages:', imagePath);
                return;
            }
            
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.index = displayIndex;
            imageItem.dataset.actualIndex = actualIndex;
            
            // Check if this is the thumbnail
            const isThumbnail = (thumbnailIndex !== -1 && actualIndex === thumbnailIndex);

            // Determine if this is a local file path or URL
            const isLocalFile = imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('file://');
            let imageSrc = imagePath;
            if (isLocalFile) {
                // Convert Windows path to file:// URL
                const normalizedPath = imagePath.replace(/\\/g, '/');
                imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
            }

            // Escape image paths to prevent XSS
            const escapeHtml = window.SecurityUtils.escapeHtml;
            const escapedImageSrc = escapeHtml(imageSrc);
            const escapedImagePath = escapeHtml(imagePath || '');
            const altText = escapeHtml(`Character image ${displayIndex + 1}`);
            
            imageItem.innerHTML = `
                <div class="image-preview-container">
                    <img src="${escapedImageSrc}" alt="${altText}" class="image-preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="image-error" style="display: none;">Failed to load image</div>
                    ${isThumbnail ? '<div class="thumbnail-badge">Thumbnail</div>' : ''}
                </div>
                <div class="image-controls">
                    <button type="button" class="secondary-btn small set-thumbnail-btn" data-index="${actualIndex}">
                        ${isThumbnail ? '✓ Thumbnail' : 'Set as Thumbnail'}
                    </button>
                    <button type="button" class="icon-btn remove-image-btn" data-index="${displayIndex}" title="Remove from profile">×</button>
                </div>
                <input type="hidden" class="image-path-input" value="${escapedImagePath}">
            `;

            listContainer.appendChild(imageItem);
        });

        // Add image button removed - users should use Pictures section
    }

    setupListeners() {
        const body = this.querySelector('.section-body');
        if (!body) return;

        // General Input Change
        body.querySelectorAll('.input-field, input, textarea, select').forEach(input => {
            // Stop propagation to prevent header click handler from interfering
            // Use simple bubbling phase for better performance
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('input', () => {
                this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
            });
        });
        
        // Explicit handling for max-token-input to ensure it's clickable
        const maxTokenInput = this.querySelector('#max-token-input');
        if (maxTokenInput) {
            maxTokenInput.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            maxTokenInput.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            maxTokenInput.addEventListener('focus', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            maxTokenInput.addEventListener('input', () => {
                this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
            });
        }
        
        // Also stop propagation on labels
        body.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Add Image Button removed - users should use Pictures section

        // Set Thumbnail Buttons
        body.querySelectorAll('.set-thumbnail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.setThumbnail(index);
            });
        });

        // Remove Image Buttons (removes from profile display, not from all images)
        body.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const displayIndex = parseInt(e.target.closest('.remove-image-btn').getAttribute('data-index'));
                this.removeImage(displayIndex);
            });
        });

        // Image Preview Click - DISABLED (no click functionality on thumbnail)
        // Users can view/manage images in Pictures section
    }

    openGallery(startIndex) {
        const images = this.getImageData();
        if (images.length === 0) return;
        const escapeHtml = window.SecurityUtils.escapeHtml;

        // Create Modal Overlay
        const overlay = document.createElement('div');
        overlay.className = 'gallery-overlay';
        overlay.innerHTML = `
            <button class="gallery-close">×</button>
            <div class="gallery-main-stage">
                <img src="" class="gallery-main-image" alt="Full screen view">
            </div>
            <div class="gallery-thumbnails">
                ${images.map((src, i) => `
                    <div class="gallery-thumb ${i === startIndex ? 'active' : ''}" data-index="${i}">
                        <img src="${escapeHtml(this.normalizePath(src))}" alt="Thumbnail ${i + 1}">
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(overlay);

        // Logic
        const mainImg = overlay.querySelector('.gallery-main-image');
        const updateView = (index) => {
            const src = images[index];
            mainImg.src = this.normalizePath(src);

            // Update thumbs
            overlay.querySelectorAll('.gallery-thumb').forEach(t => {
                t.classList.toggle('active', parseInt(t.dataset.index) === index);
            });
        };

        // Initialize
        updateView(startIndex);

        // Listeners
        overlay.querySelector('.gallery-close').addEventListener('click', () => {
            overlay.remove();
        });

        // Overlay click to close (if not clicking content)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('gallery-main-stage')) {
                overlay.remove();
            }
        });

        // Thumbnail click
        overlay.querySelectorAll('.gallery-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                updateView(index);
            });
        });

        // Keyboard support
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
    }

    normalizePath(imagePath) {
        const isLocalFile = imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('file://');
        if (isLocalFile) {
            const normalizedPath = imagePath.replace(/\\/g, '/');
            return normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
        }
        return imagePath;
    }

    async handleAddImage() {
        try {
            // Get current images and profile image indices
            const allImages = this._data.profile?.images || [];
            const profileImageIndices = this._data.profile?.profileImageIndices || [];
            const remainingSlots = 50 - allImages.length;

            if (remainingSlots <= 0) {
                alert('Maximum of 50 images allowed. Go to Pictures section to manage images.');
                return;
            }

            // Check if we can add more profile images
            if (profileImageIndices.length >= 5) {
                alert('Maximum of 5 images can be displayed in the profile section. Go to Pictures section to select which images to display here.');
                return;
            }

            // Use the file picker API with multiple selection enabled
            const filePaths = await window.api.assets.select(true);
            if (!filePaths) {
                return; // User cancelled
            }

            // Ensure filePaths is an array
            const filePathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
            if (filePathsArray.length === 0) {
                return; // No files selected
            }

            // Limit to remaining slots
            const filesToAdd = filePathsArray.slice(0, remainingSlots);
            if (filePathsArray.length > remainingSlots) {
                alert(`Only ${remainingSlots} image(s) can be added. Selected ${filePathsArray.length - remainingSlots} extra image(s) were ignored.`);
            }

            // Save all images to the assets folder
            const newImages = [];
            for (const filePath of filesToAdd) {
                if (!filePath || typeof filePath !== 'string') {
                    console.warn('Invalid file path:', filePath);
                    continue;
                }
                try {
                    const savedPath = await window.api.assets.save(filePath);
                    if (savedPath) {
                        newImages.push(savedPath);
                    }
                } catch (error) {
                    console.error('Error saving image:', filePath, error);
                    // Continue with other images even if one fails
                }
            }

            if (newImages.length === 0) {
                alert('Failed to save images. Please try again.');
                return;
            }

            // Add new images to all images
            const updatedAllImages = [...allImages, ...newImages];
            
            // Add new images to profileImageIndices if there's room (max 5)
            const updatedProfileIndices = [...profileImageIndices];
            const startIndex = allImages.length;
            for (let i = 0; i < newImages.length && updatedProfileIndices.length < 5; i++) {
                updatedProfileIndices.push(startIndex + i);
            }

            // If this is the first image, make it the thumbnail
            const thumbnailIndex = allImages.length === 0 ? 0 : this.getThumbnailIndex();

            // Update the data
            this._data.profile = {
                ...this._data.profile,
                images: updatedAllImages,
                profileImageIndices: updatedProfileIndices,
                thumbnailIndex: thumbnailIndex
            };

            // Re-render with updated data
            await this.renderContent();
            this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
        } catch (error) {
            console.error('Error adding images:', error);
            alert('Error adding images: ' + (error.message || 'Unknown error'));
        }
    }

    setThumbnail(actualIndex) {
        // Update thumbnail index in profile data (actualIndex is the index in allImages)
        this._data.profile = {
            ...this._data.profile,
            thumbnailIndex: actualIndex
        };
        
        // Re-render to show updated thumbnail
        const images = this._data.profile?.images || [];
        const profileImageIndices = this._data.profile?.profileImageIndices || [];
        const displayedImages = profileImageIndices
            .filter(idx => idx >= 0 && idx < images.length)
            .slice(0, 5)
            .map(idx => images[idx]);
        const thumbnailIndex = actualIndex;
        
        this.renderImageList(displayedImages, thumbnailIndex);
        this.setupListeners();
        this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
    }

    removeImage(index) {
        // Note: This removes from displayed images only
        // For full removal, user should go to Pictures section
        const allImages = this.getImageData();
        const profileImageIndices = this._data.profile?.profileImageIndices || [];
        const displayedImages = profileImageIndices
            .filter(idx => idx >= 0 && idx < allImages.length)
            .slice(0, 5)
            .map(idx => allImages[idx]);
        
        // Find the actual index in allImages
        const actualIndex = profileImageIndices[index];
        if (actualIndex === undefined) return;

        // Remove from profileImageIndices
        profileImageIndices.splice(index, 1);
        
        // Update thumbnail index if needed
        const currentThumbnailIndex = this._data.profile?.thumbnailIndex || 0;
        let newThumbnailIndex = currentThumbnailIndex;
        if (actualIndex === currentThumbnailIndex) {
            newThumbnailIndex = allImages.length > 0 ? 0 : -1;
        } else if (actualIndex < currentThumbnailIndex) {
            newThumbnailIndex = currentThumbnailIndex - 1;
        }

        this._data.profile = {
            ...this._data.profile,
            profileImageIndices: profileImageIndices,
            thumbnailIndex: newThumbnailIndex
        };

        // Re-render
        const updatedDisplayedImages = profileImageIndices
            .filter(idx => idx >= 0 && idx < allImages.length)
            .slice(0, 5)
            .map(idx => allImages[idx]);
        
        this.renderImageList(updatedDisplayedImages, newThumbnailIndex);
        this.setupListeners();
        this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
    }

    getImageData() {
        // Return all images from profile data, not just displayed ones
        return this._data.profile?.images || [];
    }

    getThumbnailIndex() {
        // Check which button has "✓ Thumbnail" text
        const thumbnailButtons = this.querySelectorAll('.set-thumbnail-btn');
        for (let i = 0; i < thumbnailButtons.length; i++) {
            if (thumbnailButtons[i].textContent.includes('✓')) {
                return parseInt(thumbnailButtons[i].getAttribute('data-index'));
            }
        }
        // If no thumbnail is set, default to first image if images exist
        const images = this.getImageData();
        return images.length > 0 ? 0 : -1;
    }

    updateStatusSelectColor(selectElement, status) {
        // Remove existing status classes
        selectElement.classList.remove('status-draft', 'status-published', 'status-archived', 'status-to-delete');
        // Add new status class
        selectElement.classList.add(`status-${status}`);
    }

    getData() {
        const body = this.querySelector('.section-body');
        if (!body) {
            // Section not rendered yet, return empty data
            return {
                name: '',
                displayName: '',
                category: '',
                description: '',
                image: '',
                images: [],
                thumbnailIndex: -1,
                tags: [],
                status: 'draft'
            };
        }

        const allImages = this.getImageData();
        const thumbnailIndex = this.getThumbnailIndex();
        const profileImageIndices = this._data.profile?.profileImageIndices || [];

        // Safely get form values, with fallbacks if elements don't exist yet
        const nameInput = body.querySelector('[name="name"]');
        const displayNameInput = body.querySelector('[name="displayName"]');
        const categoryInput = body.querySelector('[name="category"]');
        const descriptionInput = body.querySelector('[name="description"]');
        const tagsInput = body.querySelector('[name="tags"]');
        const maxTokenInput = body.querySelector('#max-token-input');
        // Status is now in the header, not the body
        const statusInput = this.querySelector('.status-select-header');

        // Get max token value
        const maxTokenValue = maxTokenInput ? (maxTokenInput.value ? parseInt(maxTokenInput.value, 10) : null) : null;

        return {
            name: nameInput ? nameInput.value : '',
            displayName: displayNameInput ? displayNameInput.value : '',
            category: categoryInput ? categoryInput.value : '',
            description: descriptionInput ? descriptionInput.value : '',
            image: allImages.length > 0 ? allImages[0] : '', // Backward compat - first image
            images: allImages,
            profileImageIndices: profileImageIndices,
            thumbnailIndex: thumbnailIndex,
            tags: tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [],
            status: statusInput ? statusInput.value : 'draft',
            maxTokens: maxTokenValue && !isNaN(maxTokenValue) && maxTokenValue > 0 ? maxTokenValue : null
        };
    }
}

customElements.define('section-profile', SectionProfile);
