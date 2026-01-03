class ChatbotEditor extends HTMLElement {
    constructor() {
        super();
        this.currentId = null;
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
                <h2>${isEdit ? 'Edit Chatbot' : 'Create New Chatbot'}</h2>
                <div class="actions">
                    <button id="add-section-btn" class="secondary-btn">+ Add Section</button>
                    <button id="save-template-btn" class="secondary-btn">Save as Template</button>
                    ${isEdit ? `
                        <button id="export-btn" class="secondary-btn">Export PNG</button>
                        <button id="delete-btn" class="danger-btn">Delete</button>
                    ` : ''}
                    <button id="cancel-btn" class="secondary-btn">Cancel</button>
                    <button id="save-btn" class="primary-btn">Save</button>
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
            const tagName = `section-${sectionConfig.type}`;

            // Check if component is defined
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

            const element = document.createElement(tagName);
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

        // Add Section Logic: Show Picker
        this.querySelector('#add-section-btn').addEventListener('click', () => {
            // Create a simple modal/dropdown logic here
            const options = [
                { type: 'profile', label: 'Basic Profile', icon: '👤' },
                { type: 'personality', label: 'Personality Engine', icon: '🧠' },
                // Future: { type: 'greetings', label: 'Greetings & Prompts', icon: '💬' }
            ];

            // Check which ones allow multiples (for now assuming singletons for profile/personality)
            // But user wanted flexible customization, so let's allow re-adding if they really want, 
            // or filter out if strictly singleton. 
            // Let's filter out Profile if it exists.
            const existingTypes = this.layout.map(s => s.type);
            const available = options.filter(opt => {
                if (opt.type === 'profile' && existingTypes.includes('profile')) return false;
                // Personality can be multiple? probably not for now.
                if (opt.type === 'personality' && existingTypes.includes('personality')) return false;
                return true;
            });

            if (available.length === 0) {
                alert('All available section types are already added!');
                return;
            }

            // Minimalist Picker Prompt (since we don't have a UI library)
            // In a real app we'd append a dialog element.
            const type = prompt(
                `Enter section type to add:\n${available.map(a => `- ${a.type} (${a.label})`).join('\n')}`,
                available[0].type
            );

            if (type) {
                const match = available.find(a => a.type === type.trim().toLowerCase());
                if (match) {
                    this.layout.push({
                        type: match.type,
                        id: `section-${match.type}-${Date.now()}`,
                        minimized: false
                    });
                    this.renderSections(this._data);
                } else {
                    alert('Invalid section type.');
                }
            }
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

        // Save Template Logic
        this.querySelector('#save-template-btn').addEventListener('click', async () => {
            const name = prompt('Enter a name for this template:');
            if (name && name.trim()) {
                try {
                    await window.api.templates.save(name.trim(), this.layout);
                    alert(`Template "${name}" saved successfully!`);
                } catch (error) {
                    console.error(error);
                    alert('Failed to save template. Check console.');
                }
            } else if (name !== null) {
                alert('Template name cannot be empty.');
            }
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
                // Merge strategy: Profile is top level/profile object, Personality is personality object
                // We need to know where to merge. 
                // Simple mapping for now based on tag name
                if (section.tagName.toLowerCase() === 'section-profile') {
                    // section-profile returns { name, displayName, ... } which belongs in profile
                    // BUT our creating logic expects profile props at top level or in profile object?
                    // ChatbotManager: createChatbot(profileData) uses properties directly.
                    // updateChatbot(id, updates) uses { profile: ... }

                    // Let's structure the data cleanly for the manager
                    fullData.name = sectionData.name;
                    fullData.displayName = sectionData.displayName;
                    fullData.category = sectionData.category;
                    fullData.description = sectionData.description;
                    fullData.tags = sectionData.tags;
                    fullData.image = sectionData.image;
                } else if (section.tagName.toLowerCase() === 'section-personality') {
                    fullData.personality = sectionData;
                }
                // Add other sections here
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
                    layout: fullData.layout
                });

                await window.api.chatbot.update(newBot.id, {
                    personality: fullData.personality
                });

            } else {
                await window.api.chatbot.update(this.currentId, {
                    profile: {
                        name: fullData.name,
                        displayName: fullData.displayName,
                        category: fullData.category,
                        description: fullData.description,
                        tags: fullData.tags,
                        image: fullData.image
                    },
                    personality: fullData.personality,
                    layout: fullData.layout
                });
            }
            this.dispatchEvent(new CustomEvent('editor-save', { bubbles: true }));
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save chatbot. Check console for details.');
        }
    }
}

customElements.define('chatbot-editor', ChatbotEditor);
