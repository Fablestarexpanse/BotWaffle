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
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const template = {
            id,
            name,
            layout,
            created: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(this.basePath, `${id}.json`),
            JSON.stringify(template, null, 2)
        );
        return template;
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
}

module.exports = new TemplateManager();
