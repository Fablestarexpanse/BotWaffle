const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getDataPath } = require('./storage');
const { generateId } = require('./utils/id-generator');
const { exportToPng } = require('./utils/png-exporter');
const { validateAndSanitizeId, validatePath } = require('./utils/security');
const { validateChatbotProfile } = require('./utils/validation');
const { chatbotCache } = require('./cache');

class ChatbotManager {
    constructor() {
        this.basePath = getDataPath('chatbots');
    }

    /**
     * Validates an ID and throws if invalid
     * @private
     * @param {string} id - ID to validate
     * @returns {string} - Sanitized ID
     * @throws {Error} If ID is invalid
     */
    _validateId(id) {
        const sanitized = validateAndSanitizeId(id);
        if (!sanitized) {
            throw new Error('Invalid chatbot ID format');
        }
        return sanitized;
    }

    /**
     * Gets a secure file path for a chatbot
     * @private
     * @param {Object} chatbot - Chatbot object with id and profile.name
     * @returns {string} - Secure file path
     * @throws {Error} If path is invalid
     */
    _getChatbotFilePath(chatbot) {
        if (!chatbot || !chatbot.id) {
            throw new Error('Chatbot object with ID is required');
        }
        
        // Use bot name for filename (readable), with short ID for uniqueness
        const botName = chatbot.profile?.name || 'unnamed';
        const shortId = chatbot.id.substring(0, 8); // First 8 chars of UUID
        
        // Sanitize name for filesystem (lowercase, replace spaces with hyphens, remove invalid chars)
        let sanitizedName = botName.toLowerCase()
            .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
        
        // Ensure name is not empty
        if (!sanitizedName || sanitizedName.length === 0) {
            sanitizedName = 'unnamed';
        }
        
        // Limit length to prevent issues
        if (sanitizedName.length > 100) {
            sanitizedName = sanitizedName.substring(0, 100);
        }
        
        const filename = `${sanitizedName}-${shortId}.json`;
        
        // Ensure path is within basePath (prevent directory traversal)
        const validatedPath = validatePath(filename, this.basePath);
        if (!validatedPath) {
            throw new Error('Invalid file path: potential directory traversal detected');
        }
        
        return validatedPath;
    }
    
    /**
     * Gets file path for a chatbot by ID (for backward compatibility and lookups)
     * @private
     * @param {string} id - Chatbot ID
     * @returns {Promise<string|null>} - File path or null if not found
     */
    async _findChatbotFilePathById(id) {
        try {
            const files = await fsPromises.readdir(this.basePath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            // Search through files to find the one with matching ID
            for (const file of jsonFiles) {
                const filePath = path.join(this.basePath, file);
                try {
                    const data = await fsPromises.readFile(filePath, 'utf8');
                    const chatbot = JSON.parse(data);
                    if (chatbot.id === id) {
                        return filePath;
                    }
                } catch (error) {
                    // Skip corrupted files
                    continue;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Creates a new chatbot profile.
     * @param {Object} profileData - { name, description, category, tags, etc }
     * @returns {Promise<Object>} The created chatbot object
     * @throws {Error} If validation fails
     */
    async createChatbot(profileData) {
        // Validate input data
        const validation = validateChatbotProfile(profileData);
        if (!validation.valid) {
            throw new Error(`Invalid profile data: ${validation.errors.join(', ')}`);
        }

        const sanitizedData = validation.data;
        const id = generateId();
        const now = new Date().toISOString();

        const chatbot = {
            id,
            metadata: {
                created: now,
                updated: now,
                version: '1.0.0',
                status: 'draft'
            },
            profile: {
                name: sanitizedData.name,
                displayName: sanitizedData.displayName || '',
                description: sanitizedData.description || '',
                category: sanitizedData.category,
                tags: sanitizedData.tags,
                avatar: profileData.avatar || null,
                image: sanitizedData.images.length > 0 ? sanitizedData.images[0] : '',
                images: sanitizedData.images,
                thumbnailIndex: sanitizedData.thumbnailIndex
            },
            // Placeholder sections for future milestones
            personality: {},
            prompts: {},
            configuration: {},

            // Dynamic Layout Configuration
            layout: sanitizedData.layout || [
                { type: 'profile', id: 'section-profile', minimized: false },
                { type: 'personality', id: 'section-personality', minimized: false },
                { type: 'scenario', id: 'section-scenario', minimized: false },
                { type: 'initial-messages', id: 'section-initial-messages', minimized: false },
                { type: 'example-dialogs', id: 'section-example-dialogs', minimized: false }
            ]
        };

        await this._saveChatbot(chatbot);
        // Cache the newly created chatbot
        chatbotCache.set(chatbot.id, chatbot);
        return chatbot;
    }

    /**
     * Updates an existing chatbot.
     * @param {string} id 
     * @param {Object} updates - Partial chatbot object
     * @returns {Promise<Object>} Updated chatbot
     * @throws {Error} If validation fails or chatbot not found
     */
    async updateChatbot(id, updates) {
        // Validate ID first
        this._validateId(id);
        
        const current = await this.getChatbot(id);
        if (!current) throw new Error(`Chatbot ${id} not found`);

        // Validate profile updates if provided
        if (updates.profile) {
            // Merge with existing profile for validation
            const mergedProfile = { ...current.profile, ...updates.profile };
            const validation = validateChatbotProfile(mergedProfile);
            if (!validation.valid) {
                throw new Error(`Invalid profile data: ${validation.errors.join(', ')}`);
            }
            updates.profile = validation.data;
        }

        const updated = {
            ...current,
            ...updates,
            profile: { ...current.profile, ...(updates.profile || {}) },
            metadata: {
                ...current.metadata,
                updated: new Date().toISOString(),
                ...(updates.metadata || {})
            }
        };

        await this._saveChatbot(updated);
        // Update cache
        chatbotCache.set(id, updated);
        return updated;
    }

    /**
     * Deletes a chatbot.
     * @param {string} id 
     * @returns {Promise<boolean>}
     * @throws {Error} If ID is invalid
     */
    async deleteChatbot(id) {
        const filePath = await this._findChatbotFilePathById(id);
        if (!filePath) {
            return false;
        }
        
        try {
            await fsPromises.unlink(filePath);
            // Remove from cache
            chatbotCache.delete(id);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Retrieves a single chatbot by ID.
     * @param {string} id 
     * @param {boolean} skipValidation - If true, skip ID validation (for reading existing files)
     * @returns {Promise<Object|null>}
     */
    async getChatbot(id, skipValidation = false) {
        try {
            // Check cache first
            const cached = chatbotCache.get(id);
            if (cached) {
                return cached;
            }

            // Find file by searching through all files and matching ID
            const filePath = await this._findChatbotFilePathById(id);
            if (!filePath) {
                return null;
            }
            
            try {
                const data = await fsPromises.readFile(filePath, 'utf8');
                const chatbot = JSON.parse(data);
                // Cache the result
                chatbotCache.set(id, chatbot);
                return chatbot;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return null;
                }
                throw error;
            }
        } catch (error) {
            console.error(`Error reading chatbot ${id}:`, error);
            return null;
        }
    }

    /**
     * Lists all chatbots.
     * @returns {Promise<Array<Object>>}
     */
    async listChatbots() {
        try {
            const files = await fsPromises.readdir(this.basePath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            // Load all chatbots in parallel for better performance
            const chatbots = await Promise.all(
                jsonFiles.map(async (file) => {
                    const filePath = path.join(this.basePath, file);
                    try {
                        const data = await fsPromises.readFile(filePath, 'utf8');
                        const chatbot = JSON.parse(data);
                        // Cache the result
                        if (chatbot.id) {
                            chatbotCache.set(chatbot.id, chatbot);
                        }
                        return chatbot;
                    } catch (error) {
                        // Skip corrupted files
                        return null;
                    }
                })
            );
            
            return chatbots
                .filter(bot => bot !== null && bot.id)
                .sort((a, b) => new Date(b.metadata.updated) - new Date(a.metadata.updated));
        } catch (error) {
            console.error('Error listing chatbots:', error);
            return [];
        }
    }

    /**
     * Internal helper to write file
     * @private
     * @param {Object} chatbot - Chatbot object to save
     * @returns {Promise<void>}
     * @throws {Error} If save fails or path is invalid
     */
    async _saveChatbot(chatbot) {
        try {
            // Validate chatbot ID before saving
            if (!chatbot.id) {
                throw new Error('Chatbot ID is required');
            }
            
            const newFilePath = this._getChatbotFilePath(chatbot);
            
            // If this is an update, check if file path changed (name changed) and delete old file
            const oldFilePath = await this._findChatbotFilePathById(chatbot.id);
            if (oldFilePath && oldFilePath !== newFilePath) {
                try {
                    await fsPromises.unlink(oldFilePath);
                } catch (error) {
                    // Ignore if old file doesn't exist
                }
            }
            
            await fsPromises.writeFile(newFilePath, JSON.stringify(chatbot, null, 2), 'utf8');
        } catch (error) {
            console.error(`Error saving chatbot ${chatbot.id}:`, error);
            throw new Error(`Failed to save chatbot: ${error.message}`);
        }
    }

    /**
     * Exports a chatbot to PNG V2 Card
     * @param {string} id - Chatbot ID
     * @param {string} outputPath - Output file path
     * @returns {Promise<boolean>} Success status
     * @throws {Error} If chatbot not found or export fails
     */
    async exportChatbot(id, outputPath) {
        this._validateId(id);
        const bot = await this.getChatbot(id);
        if (!bot) throw new Error('Bot not found');
        return exportToPng(bot, outputPath, bot.profile.avatar);
    }
    /**
     * Retrieves unique categories from all bots + defaults.
     * @returns {Promise<Array<string>>}
     */
    async getUniqueCategories() {
        const defaults = new Set(['Character', 'Assistant', 'Roleplay', 'Educational']);
        const bots = await this.listChatbots();

        bots.forEach(bot => {
            if (bot.profile && bot.profile.category) {
                // Split by comma just in case, though it's usually single
                // Normalized to Title Case or just trimmed
                const cat = bot.profile.category.trim();
                if (cat) defaults.add(cat);
            }
        });

        return Array.from(defaults).sort();
    }
}


// Export class for dependency injection
// Also export singleton instance for backward compatibility
// Export class for dependency injection
module.exports = ChatbotManager;
