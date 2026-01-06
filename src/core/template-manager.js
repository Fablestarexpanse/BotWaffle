const fs = require('fs');
const path = require('path');
const { getDataPath } = require('./storage');

class TemplateManager {
    constructor() {
        this.basePath = getDataPath('templates');
        // Ensure directory exists
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    saveTemplate(name, layout) {
        try {
            // Generate unique ID with timestamp to prevent collisions
            const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const timestamp = Date.now();
            const id = `${baseId}-${timestamp}`;
            
            const template = {
                id,
                name,
                layout,
                created: new Date().toISOString()
            };

            const filePath = path.join(this.basePath, `${id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
            return template;
        } catch (error) {
            console.error('Error saving template:', error);
            throw new Error(`Failed to save template: ${error.message}`);
        }
    }

    listTemplates() {
        if (!fs.existsSync(this.basePath)) return [];

        try {
            return fs.readdirSync(this.basePath)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    try {
                        return JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf8'));
                    } catch (e) {
                        return null;
                    }
                })
                .filter(t => t);
        } catch (error) {
            console.error('Error listing templates:', error);
            return [];
        }
    }

    getTemplate(id) {
        try {
            const filePath = path.join(this.basePath, `${id}.json`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Template with id ${id} not found`);
            }
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error('Error getting template:', error);
            throw new Error(`Failed to get template: ${error.message}`);
        }
    }
}

module.exports = new TemplateManager();
