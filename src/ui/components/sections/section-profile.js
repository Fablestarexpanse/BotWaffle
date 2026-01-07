class SectionProfile extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Basic Profile';
    }

    async renderContent() {
        // Access form data from this._data if editing
        const profile = this._data.profile || {};
        const data = profile.name ? profile : (this._data || {});

        // Handle images: defaults to array if exists, or single image, or empty
        const images = data.images || (data.image ? [data.image] : []);
        const thumbnailIndex = data.thumbnailIndex !== undefined ? data.thumbnailIndex : (images.length > 0 ? 0 : -1);

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
        body.innerHTML = `
            <div class="form-group" id="images-container">
                <label>Character Images (Max 5) - First image is thumbnail for character card</label>
                <div class="image-list" id="image-list">
                    <!-- Images injected here -->
                </div>
                <button type="button" id="add-image-btn" class="secondary-btn small" style="margin-top: 5px;">+ Add Image from Computer</button>
            </div>

            <div class="form-group">
                <label>Tags (Comma separated)</label>
                <input type="text" name="tags" class="input-field" value="${(data.tags || []).join(', ')}" placeholder="friendly, helper, v1">
            </div>

            <div class="form-group">
                <label>Internal Name (Required)</label>
                <input type="text" name="name" class="input-field" value="${data.name || ''}" required placeholder="MyBot_v1">
            </div>

            <div class="form-group">
                <label>Display Name</label>
                <input type="text" name="displayName" class="input-field" value="${data.displayName || ''}" placeholder="Alex (The Helper)">
            </div>

            <div class="form-group">
                <label>Category</label>
                <input type="text" name="category" class="input-field" value="${data.category || 'Character'}" list="category-options" placeholder="Select or type a category...">
                <datalist id="category-options">
                    ${categories.map(cat => `<option value="${cat}"></option>`).join('')}
                </datalist>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="input-field" rows="3" placeholder="A brief elevator pitch...">${data.description || ''}</textarea>
            </div>
        `;

        this.renderImageList(images, thumbnailIndex);
        this.setupListeners();
    }

    renderImageList(images, thumbnailIndex) {
        const listContainer = this.querySelector('#image-list');
        listContainer.innerHTML = '';

        if (images.length === 0) {
            listContainer.innerHTML = '<div class="image-empty-state">No images added yet. Click "Add Image from Computer" to add images.</div>';
            return;
        }

        images.forEach((imagePath, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.index = index;

            // Determine if this is a local file path or URL
            const isLocalFile = imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('file://');
            let imageSrc = imagePath;
            if (isLocalFile) {
                // Convert Windows path to file:// URL
                const normalizedPath = imagePath.replace(/\\/g, '/');
                imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
            }

            imageItem.innerHTML = `
                <div class="image-preview-container">
                    <img src="${imageSrc}" alt="Character image ${index + 1}" class="image-preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="image-error" style="display: none;">Failed to load image</div>
                    ${index === thumbnailIndex ? '<div class="thumbnail-badge">Thumbnail</div>' : ''}
                </div>
                <div class="image-controls">
                    <button type="button" class="secondary-btn small set-thumbnail-btn" data-index="${index}">
                        ${index === thumbnailIndex ? '✓ Thumbnail' : 'Set as Thumbnail'}
                    </button>
                    <button type="button" class="icon-btn remove-image-btn" data-index="${index}" title="Remove image">×</button>
                </div>
                <input type="hidden" class="image-path-input" value="${imagePath || ''}">
            `;

            listContainer.appendChild(imageItem);
        });

        // Update Add Button State
        const addBtn = this.querySelector('#add-image-btn');
        if (addBtn) addBtn.style.display = images.length >= 5 ? 'none' : 'block';
    }

    setupListeners() {
        const body = this.querySelector('.section-body');

        // General Input Change
        body.querySelectorAll('.input-field').forEach(input => {
            input.addEventListener('input', () => {
                this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
            });
        });

        // Add Image Button
        const addBtn = this.querySelector('#add-image-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                await this.handleAddImage();
            });
        }

        // Set Thumbnail Buttons
        body.querySelectorAll('.set-thumbnail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.setThumbnail(index);
            });
        });

        // Remove Image Buttons
        body.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeImage(index);
            });
        });

        // Image Preview Click (Open Gallery)
        body.querySelectorAll('.image-preview').forEach(img => {
            img.addEventListener('click', (e) => {
                const item = e.target.closest('.image-item');
                const index = parseInt(item.dataset.index);
                this.openGallery(index);
            });
        });
    }

    openGallery(startIndex) {
        const images = this.getImageData();
        if (images.length === 0) return;

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
                        <img src="${this.normalizePath(src)}" alt="Thumbnail ${i + 1}">
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
            // Get current images to check how many we can add
            const currentImages = this.getImageData();
            const remainingSlots = 5 - currentImages.length;

            if (remainingSlots <= 0) {
                alert('Maximum of 5 images allowed.');
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

            // Add new images
            currentImages.push(...newImages);

            // If this is the first image, make it the thumbnail
            const thumbnailIndex = currentImages.length === newImages.length ? 0 : this.getThumbnailIndex();

            this.renderImageList(currentImages, thumbnailIndex);
            this.setupListeners();
            this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
        } catch (error) {
            console.error('Error adding images:', error);
            alert('Error adding images: ' + (error.message || 'Unknown error'));
        }
    }

    setThumbnail(index) {
        const currentImages = this.getImageData();
        this.renderImageList(currentImages, index);
        this.setupListeners();
        this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
    }

    removeImage(index) {
        const currentImages = this.getImageData();
        const currentThumbnailIndex = this.getThumbnailIndex();

        currentImages.splice(index, 1);

        // Adjust thumbnail index if needed
        let newThumbnailIndex = currentThumbnailIndex;
        if (index === currentThumbnailIndex) {
            // Removed the thumbnail, set first image as thumbnail or -1 if none
            newThumbnailIndex = currentImages.length > 0 ? 0 : -1;
        } else if (index < currentThumbnailIndex) {
            // Removed an image before the thumbnail, adjust index
            newThumbnailIndex = currentThumbnailIndex - 1;
        }

        this.renderImageList(currentImages, newThumbnailIndex);
        this.setupListeners();
        this.dispatchEvent(new CustomEvent('section-change', { bubbles: true }));
    }

    getImageData() {
        const inputs = this.querySelectorAll('.image-path-input');
        return Array.from(inputs).map(input => input.value).filter(path => path.trim() !== '');
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

    getData() {
        const body = this.querySelector('.section-body');
        const images = this.getImageData();
        const thumbnailIndex = this.getThumbnailIndex();

        return {
            name: body.querySelector('[name="name"]').value,
            displayName: body.querySelector('[name="displayName"]').value,
            category: body.querySelector('[name="category"]').value,
            description: body.querySelector('[name="description"]').value,
            image: images.length > 0 ? images[0] : '', // Backward compat - first image
            images: images,
            thumbnailIndex: thumbnailIndex,
            tags: body.querySelector('[name="tags"]').value.split(',').map(t => t.trim()).filter(t => t)
        };
    }
}

customElements.define('section-profile', SectionProfile);
