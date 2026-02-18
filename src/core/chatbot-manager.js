const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getDataPath, getCharacterPath, ensureCharacterFolders, findCharacterFolderById } = require('./storage');
const { generateId } = require('./utils/id-generator');
const { exportToPng } = require('./utils/png-exporter');
const { validateAndSanitizeId, validatePath } = require('./utils/security');
const { validateChatbotProfile } = require('./utils/validation');
const { chatbotCache } = require('./cache');

class ChatbotManager {
    constructor() {
        // Legacy basePath for migration compatibility
        this.basePath = getDataPath('chatbots');
        // New basePath for character folders
        this.charactersPath = getDataPath('characters');
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
     * Gets the character folder path for a chatbot
     * @private
     * @param {string} id - Chatbot ID
     * @param {string} characterName - Character name (optional, for folder naming)
     * @returns {string} - Character folder path
     * @throws {Error} If ID is invalid
     */
    _getCharacterFolderPath(id, characterName = null) {
        if (!id) {
            throw new Error('Chatbot ID is required');
        }
        this._validateId(id);
        return getCharacterPath(id, characterName);
    }

    /**
     * Gets the character.json file path for a chatbot
     * @private
     * @param {string} id - Chatbot ID
     * @param {string} characterName - Character name (optional, for folder naming)
     * @returns {string} - Character.json file path
     */
    _getCharacterFilePath(id, characterName = null) {
        return path.join(this._getCharacterFolderPath(id, characterName), 'character.json');
    }

    /**
     * Legacy method: Gets a secure file path for a chatbot (old structure)
     * @private
     * @deprecated Use _getCharacterFilePath instead
     */
    _getChatbotFilePath(chatbot) {
        if (!chatbot || !chatbot.id) {
            throw new Error('Chatbot object with ID is required');
        }
        
        const botName = chatbot.profile?.name || 'unnamed';
        const shortId = chatbot.id.substring(0, 8);
        
        let sanitizedName = botName.toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        if (!sanitizedName || sanitizedName.length === 0) {
            sanitizedName = 'unnamed';
        }
        
        if (sanitizedName.length > 100) {
            sanitizedName = sanitizedName.substring(0, 100);
        }
        
        const filename = `${sanitizedName}-${shortId}.json`;
        const validatedPath = validatePath(filename, this.basePath);
        if (!validatedPath) {
            throw new Error('Invalid file path: potential directory traversal detected');
        }
        
        return validatedPath;
    }
    
    /**
     * Gets file path for a chatbot by ID (checks new structure first, then legacy)
     * @private
     * @param {string} id - Chatbot ID
     * @returns {Promise<string|null>} - File path or null if not found
     */
    async _findChatbotFilePathById(id) {
        try {
            // First, try to find existing character folder by ID
            const existingFolder = await findCharacterFolderById(id);
            if (existingFolder) {
                const characterFilePath = path.join(existingFolder, 'character.json');
                try {
                    await fsPromises.access(characterFilePath);
                    return characterFilePath;
                } catch {
                    // File doesn't exist
                }
            }

            // Legacy: search in old chatbots folder
            try {
                const files = await fsPromises.readdir(this.basePath);
                const jsonFiles = files.filter(file => file.endsWith('.json'));
                
                for (const file of jsonFiles) {
                    const filePath = path.join(this.basePath, file);
                    try {
                        const data = await fsPromises.readFile(filePath, 'utf8');
                        const chatbot = JSON.parse(data);
                        if (chatbot.id === id) {
                            return filePath;
                        }
                    } catch (error) {
                        continue;
                    }
                }
            } catch {
                // Legacy folder doesn't exist
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

        // Ensure character folder structure exists before saving (with name)
        const characterName = sanitizedData.name;
        await ensureCharacterFolders(id, characterName);
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
        let validation = null;
        let originalProfileImageIndices = undefined;
        if (updates.profile) {
            // CRITICAL: Preserve profileImageIndices from the UPDATE (not merged profile)
            // This is the value the user is trying to set
            originalProfileImageIndices = updates.profile.profileImageIndices;
            
            console.log('updateChatbot - Original update profileImageIndices:', originalProfileImageIndices);
            console.log('updateChatbot - Current profile has profileImageIndices:', current.profile?.profileImageIndices);
            
            // Merge with existing profile for validation (validation needs full context)
            const mergedProfileForValidation = { ...current.profile, ...updates.profile };
            validation = validateChatbotProfile(mergedProfileForValidation);
            if (!validation.valid) {
                throw new Error(`Invalid profile data: ${validation.errors.join(', ')}`);
            }
            
            console.log('updateChatbot - Validation result has profileImageIndices:', 'profileImageIndices' in validation.data);
            console.log('updateChatbot - Validation result profileImageIndices value:', validation.data.profileImageIndices);
            
            // Start with validated data, but we'll override profileImageIndices below
            updates.profile = { ...validation.data };
            
            // CRITICAL: Always restore profileImageIndices from the ORIGINAL UPDATE if it was provided
            // Don't rely on validation to preserve it - we know what the user wants
            if (originalProfileImageIndices !== undefined) {
                // Get the actual images array length from current profile (images are already saved)
                const imagesArray = current.profile?.images || [];
                const imagesLength = imagesArray.length;
                
                // Validate the indices are valid
                let validIndices = [];
                if (originalProfileImageIndices === null) {
                    validIndices = [];
                } else if (Array.isArray(originalProfileImageIndices)) {
                    validIndices = originalProfileImageIndices
                        .filter(idx => typeof idx === 'number' && idx >= 0 && idx < imagesLength)
                        .slice(0, 5);
                }
                
                console.log('updateChatbot - Setting profileImageIndices:', {
                    original: originalProfileImageIndices,
                    imagesLength: imagesLength,
                    validIndices: validIndices
                });
                
                // FORCE it into the profile - this is what the user wants
                updates.profile.profileImageIndices = validIndices;
            }
        }

        // Merge profile data - updates.profile now has validated data with FORCED profileImageIndices
        const mergedProfile = { ...current.profile, ...(updates.profile || {}) };
        
        // TRIPLE CHECK: Force profileImageIndices one more time to be absolutely sure
        if (originalProfileImageIndices !== undefined) {
            const imagesArray = mergedProfile.images || current.profile?.images || [];
            const imagesLength = imagesArray.length;
            let validIndices = [];
            if (originalProfileImageIndices === null) {
                validIndices = [];
            } else if (Array.isArray(originalProfileImageIndices)) {
                validIndices = originalProfileImageIndices
                    .filter(idx => typeof idx === 'number' && idx >= 0 && idx < imagesLength)
                    .slice(0, 5);
            }
            mergedProfile.profileImageIndices = validIndices;
            console.log('updateChatbot - Final force set profileImageIndices:', validIndices);
        }
        
        console.log('updateChatbot - Final merged profile:', {
            profileImageIndices: mergedProfile.profileImageIndices,
            images: mergedProfile.images?.length,
            hasProfileImageIndices: 'profileImageIndices' in mergedProfile,
            profileKeys: Object.keys(mergedProfile)
        });
        
        const updated = {
            ...current,
            ...updates,
            profile: mergedProfile,
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
     * Deletes a chatbot and its entire character folder.
     * @param {string} id 
     * @returns {Promise<boolean>}
     * @throws {Error} If ID is invalid
     */
    async deleteChatbot(id) {
        this._validateId(id);

        // Protect demo characters from deletion
        try {
            const candidate = await this.getChatbot(id);
            if (candidate && candidate.metadata && candidate.metadata.isDemo) {
                throw new Error(`"${candidate.profile?.displayName || candidate.profile?.name || id}" is a demo character and cannot be deleted.`);
            }
        } catch (err) {
            // Re-throw protection errors; ignore lookup failures (handled below)
            if (err.message && err.message.includes('demo character')) throw err;
        }

        try {
            // Try to find existing character folder by ID
            const existingFolder = await findCharacterFolderById(id);
            if (existingFolder) {
                // Verify folder exists before deletion
                if (fs.existsSync(existingFolder)) {
                    // Delete entire character folder recursively
                    await fsPromises.rm(existingFolder, { recursive: true, force: true });
                    chatbotCache.delete(id);
                    // Verify deletion
                    if (fs.existsSync(existingFolder)) {
                        throw new Error(`Failed to delete folder: ${existingFolder} still exists after deletion attempt`);
                    }
                    return true;
                } else {
                    // Folder doesn't exist, but we found it in the search - might be a race condition
                    chatbotCache.delete(id);
                    return true;
                }
            }

            // Legacy: delete just the JSON file
            const filePath = await this._findChatbotFilePathById(id);
            if (filePath) {
                if (fs.existsSync(filePath)) {
                    await fsPromises.unlink(filePath);
                    chatbotCache.delete(id);
                    return true;
                } else {
                    // File doesn't exist, but we found it - might already be deleted
                    chatbotCache.delete(id);
                    return true;
                }
            }
            
            // If we get here, the bot wasn't found in either location
            // But it might still be in the list - let's try a more aggressive search
            const allBots = await this.listChatbots();
            const bot = allBots.find(b => b.id === id);
            if (bot) {
                // Bot exists in list but we can't find its folder - try aggressive folder search
                const { error: logError } = require('./utils/logger');
                logError(`[Delete] Bot ${id} found in list but folder not found. Attempting aggressive search...`);
                
                // Try to find folder by searching all character folders again
                if (fs.existsSync(this.charactersPath)) {
                    const characterDirs = await fsPromises.readdir(this.charactersPath, { withFileTypes: true });
                    for (const dir of characterDirs) {
                        if (!dir.isDirectory()) continue;
                        const folderPath = path.join(this.charactersPath, dir.name);
                        const characterFilePath = path.join(folderPath, 'character.json');
                        if (fs.existsSync(characterFilePath)) {
                            try {
                                const data = await fsPromises.readFile(characterFilePath, 'utf8');
                                const character = JSON.parse(data);
                                if (character.id === id) {
                                    // Found it! Delete it
                                    await fsPromises.rm(folderPath, { recursive: true, force: true });
                                    chatbotCache.delete(id);
                                    return true;
                                }
                            } catch {
                                continue;
                            }
                        }
                    }
                }
                
                // Still couldn't find it - this is a problem
                throw new Error(`Bot with ID ${id} exists in list but folder/file not found. Bot name: ${bot.profile?.name || 'unknown'}. Please check the data directory manually.`);
            }
            
            return false;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File/folder doesn't exist - consider it deleted
                chatbotCache.delete(id);
                return true;
            }
            // Log the error for debugging
            const { error: logError } = require('./utils/logger');
            logError(`[Delete] Error deleting chatbot ${id}`, error);
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
     * Lists all chatbots (checks new structure first, then legacy).
     * @returns {Promise<Array<Object>>}
     */
    async listChatbots() {
        const chatbots = [];
        const seenIds = new Set();

        try {
            // First, load from new character folder structure
            try {
                if (fs.existsSync(this.charactersPath)) {
                    const characterDirs = await fsPromises.readdir(this.charactersPath);
                    
                    for (const dir of characterDirs) {
                        const characterFilePath = path.join(this.charactersPath, dir, 'character.json');
                        try {
                            const data = await fsPromises.readFile(characterFilePath, 'utf8');
                            const chatbot = JSON.parse(data);
                            if (chatbot.id && !seenIds.has(chatbot.id)) {
                                chatbots.push(chatbot);
                                seenIds.add(chatbot.id);
                                chatbotCache.set(chatbot.id, chatbot);
                            }
                        } catch (error) {
                            // Skip corrupted or missing files
                            continue;
                        }
                    }
                }
            } catch (error) {
                // Characters folder doesn't exist yet (first run)
            }

            // Then, load from legacy chatbots folder (for migration)
            try {
                if (fs.existsSync(this.basePath)) {
                    const files = await fsPromises.readdir(this.basePath);
                    const jsonFiles = files.filter(file => file.endsWith('.json'));
                    
                    for (const file of jsonFiles) {
                        const filePath = path.join(this.basePath, file);
                        try {
                            const data = await fsPromises.readFile(filePath, 'utf8');
                            const chatbot = JSON.parse(data);
                            // Only add if not already found in new structure
                            if (chatbot.id && !seenIds.has(chatbot.id)) {
                                chatbots.push(chatbot);
                                seenIds.add(chatbot.id);
                                chatbotCache.set(chatbot.id, chatbot);
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                }
            } catch (error) {
                // Legacy folder doesn't exist
            }
            
            return chatbots
                .filter(bot => bot !== null && bot.id)
                .sort((a, b) => new Date(b.metadata.updated || 0) - new Date(a.metadata.updated || 0));
        } catch (error) {
            console.error('Error listing chatbots:', error);
            return [];
        }
    }

    /**
     * Internal helper to write file (saves to new character folder structure)
     * Handles folder renaming if character name changed
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
            
            const characterName = chatbot.profile?.name || null;
            
            // Check if folder needs to be renamed (name changed)
            const existingFolder = await findCharacterFolderById(chatbot.id);
            const newFolderPath = await this._getCharacterFolderPath(chatbot.id, characterName);
            
            // If folder exists and path is different, rename it
            if (existingFolder && existingFolder !== newFolderPath) {
                try {
                    // Move entire folder to new location
                    await fsPromises.rename(existingFolder, newFolderPath);
                } catch (error) {
                    // If rename fails, try copying and then deleting
                    const { copyDirectory } = require('./export-import');
                    await copyDirectory(existingFolder, newFolderPath);
                    await fsPromises.rm(existingFolder, { recursive: true, force: true });
                }
            }
            
            // Ensure character folder exists with new name
            await ensureCharacterFolders(chatbot.id, characterName);
            
            // Save to new structure: data/characters/{name-id}/character.json
            const characterFilePath = await this._getCharacterFilePath(chatbot.id, characterName);
            await fsPromises.writeFile(characterFilePath, JSON.stringify(chatbot, null, 2), 'utf8');
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
