const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getDataPath } = require('./storage');
const { validatePath } = require('./utils/security');
const { validateTemplate } = require('./utils/validation');
const { templateCache } = require('./cache');
const { error: logError } = require('./utils/logger');

class TemplateManager {
    constructor() {
        this.basePath = getDataPath('templates');
        // Ensure directory exists (async initialization will be done on first use)
        this._ensureDirectory();
    }

    async _ensureDirectory() {
        try {
            await fsPromises.mkdir(this.basePath, { recursive: true });
        } catch (error) {
            // Directory might already exist, ignore error
        }
    }

    async saveTemplate(name, layout) {
        try {
            // Validate input data
            const validation = validateTemplate({ name, layout });
            if (!validation.valid) {
                throw new Error(`Invalid template data: ${validation.errors.join(', ')}`);
            }

            const sanitizedData = validation.data;
            
            // Generate unique ID with timestamp to prevent collisions
            const baseId = sanitizedData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const timestamp = Date.now();
            const id = `${baseId}-${timestamp}`;
            
            const template = {
                id,
                name: sanitizedData.name,
                layout: sanitizedData.layout,
                created: new Date().toISOString()
            };

            // Validate path before saving
            const fileName = `${id}.json`;
            const validatedPath = validatePath(fileName, this.basePath);
            if (!validatedPath) {
                throw new Error('Invalid file path: potential directory traversal detected');
            }

            await this._ensureDirectory();
            await fsPromises.writeFile(validatedPath, JSON.stringify(template, null, 2), 'utf8');
            // Cache the template
            templateCache.set(id, template);
            return template;
        } catch (error) {
            logError('Error saving template', error);
            throw new Error(`Failed to save template: ${error.message}`);
        }
    }

    async listTemplates() {
        try {
            await this._ensureDirectory();
            const files = await fsPromises.readdir(this.basePath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            // Load all templates in parallel for better performance
            const templates = await Promise.all(
                jsonFiles.map(async (file) => {
                    try {
                        const id = file.replace('.json', '');
                        // Check cache first
                        const cached = templateCache.get(id);
                        if (cached) {
                            return cached;
                        }
                        
                        const filePath = path.join(this.basePath, file);
                        const data = await fsPromises.readFile(filePath, 'utf8');
                        const template = JSON.parse(data);
                        // Cache the template
                        templateCache.set(id, template);
                        return template;
                    } catch (e) {
                        return null;
                    }
                })
            );
            
            return templates.filter(t => t);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            logError('Error listing templates', error);
            return [];
        }
    }

    async getTemplate(id) {
        try {
            // Check cache first
            const cached = templateCache.get(id);
            if (cached) {
                return cached;
            }

            // Validate path before accessing
            const fileName = `${id}.json`;
            const validatedPath = validatePath(fileName, this.basePath);
            if (!validatedPath) {
                throw new Error('Invalid template ID: potential directory traversal detected');
            }

            try {
                const data = await fsPromises.readFile(validatedPath, 'utf8');
                const template = JSON.parse(data);
                // Cache the template
                templateCache.set(id, template);
                return template;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return null; // File doesn't exist
                }
                throw error;
            }
        } catch (error) {
            // Return null for invalid paths instead of throwing
            if (error.message && (error.message.includes('Invalid') || error.message.includes('path'))) {
                return null;
            }
            logError('Error getting template', error);
            return null;
        }
    }

    async deleteTemplate(id) {
        try {
            // Validate path before deleting
            const fileName = `${id}.json`;
            const validatedPath = validatePath(fileName, this.basePath);
            if (!validatedPath) {
                throw new Error('Invalid template ID: potential directory traversal detected');
            }

            // Remove from cache
            templateCache.delete(id);

            // Delete the file
            await fsPromises.unlink(validatedPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, but that's okay - consider it deleted
                return true;
            }
            logError('Error deleting template', error);
            throw new Error(`Failed to delete template: ${error.message}`);
        }
    }
}

// Export class for dependency injection
module.exports = TemplateManager;
