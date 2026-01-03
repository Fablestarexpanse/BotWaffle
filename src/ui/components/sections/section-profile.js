class SectionProfile extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Basic Profile';
    }

    renderContent() {
        // Access form data from this._data if editing
        const profile = this._data.profile || {};
        const data = profile.name ? profile : (this._data || {});

        // Handle images: defaults to array if exists, or single image, or empty
        const images = data.images || (data.image ? [data.image] : ['']);

        const body = this.querySelector('.section-body');
        body.innerHTML = `
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
                <select name="category" class="input-field">
                    <option value="Character" ${data.category === 'Character' ? 'selected' : ''}>Character</option>
                    <option value="Assistant" ${data.category === 'Assistant' ? 'selected' : ''}>Assistant</option>
                    <option value="Roleplay" ${data.category === 'Roleplay' ? 'selected' : ''}>Roleplay</option>
                    <option value="Educational" ${data.category === 'Educational' ? 'selected' : ''}>Educational</option>
                </select>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="input-field" rows="3" placeholder="A brief elevator pitch...">${data.description || ''}</textarea>
            </div>

            <div class="form-group" id="images-container">
                <label>Character Images (Max 5)</label>
                <div class="image-list">
                    <!-- Images injected here -->
                </div>
                <button type="button" id="add-image-btn" class="secondary-btn small" style="margin-top: 5px;">+ Add Image URL</button>
            </div>

            <div class="form-group">
                <label>Tags (Comma separated)</label>
                <input type="text" name="tags" class="input-field" value="${(data.tags || []).join(', ')}" placeholder="friendly, helper, v1">
            </div>
        `;

        this.renderImageInputs(images);
        this.setupListeners();
    }

    renderImageInputs(images) {
        const listContainer = this.querySelector('.image-list');
        listContainer.innerHTML = '';

        images.forEach((url, index) => {
            const row = document.createElement('div');
            row.className = 'image-input-row';
            row.style.display = 'flex';
            row.style.gap = '5px';
            row.style.marginBottom = '5px';

            row.innerHTML = `
                <input type="text" class="input-field image-url" value="${url}" placeholder="https://example.com/bot.png" style="flex:1">
                ${images.length > 1 ? `<button type="button" class="icon-btn remove-image-btn" data-index="${index}">×</button>` : ''}
            `;
            listContainer.appendChild(row);
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

        // Add Image
        body.querySelector('#add-image-btn').addEventListener('click', () => {
            const currentImages = this.getImageData();
            if (currentImages.length < 5) {
                currentImages.push('');
                this.renderImageInputs(currentImages);
                this.setupImageListeners(); // Re-bind dynamic inputs
            }
        });

        this.setupImageListeners();
    }

    setupImageListeners() {
        const body = this.querySelector('.section-body');

        // Remove Image
        body.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const currentImages = this.getImageData();
                currentImages.splice(index, 1);
                // Ensure at least one input always exists if valid or leave empty?
                // Logic above defaults to [''] if empty, so let's keep it safe.
                if (currentImages.length === 0) currentImages.push('');

                this.renderImageInputs(currentImages);
                this.setupImageListeners();
            });
        });
    }

    getImageData() {
        const inputs = this.querySelectorAll('.image-url');
        return Array.from(inputs).map(input => input.value);
    }

    getData() {
        const body = this.querySelector('.section-body');
        const images = this.getImageData().filter(url => url.trim() !== ''); // Clean empty strings

        return {
            name: body.querySelector('[name="name"]').value,
            displayName: body.querySelector('[name="displayName"]').value,
            category: body.querySelector('[name="category"]').value,
            description: body.querySelector('[name="description"]').value,
            image: images.length > 0 ? images[0] : '', // Backward compat
            images: images,
            tags: body.querySelector('[name="tags"]').value.split(',').map(t => t.trim()).filter(t => t)
        };
    }
}

customElements.define('section-profile', SectionProfile);
