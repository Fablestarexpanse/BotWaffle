const fs = require('fs');
const path = require('path');
const { getDataPath } = require('./storage');
const { generateId } = require('./utils/id-generator');
const { exportToPng } = require('./utils/png-exporter');

class ChatbotManager {
    constructor() {
        this.basePath = getDataPath('chatbots');
    }

    /**
     * Creates a new chatbot profile.
     * @param {Object} profileData - { name, description, category, tags, etc }
     * @returns {Object} The created chatbot object
     */
    createChatbot(profileData) {
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
                name: profileData.name || 'New Chatbot',
                displayName: profileData.displayName || '',
                description: profileData.description || '',
                category: profileData.category || 'Character',
                tags: profileData.tags || [],
                avatar: profileData.avatar || null,
                image: profileData.image || (profileData.images && profileData.images[0]) || '',
                images: profileData.images || [],
                thumbnailIndex: profileData.thumbnailIndex !== undefined ? profileData.thumbnailIndex : (profileData.images && profileData.images.length > 0 ? 0 : -1)
            },
            // Placeholder sections for future milestones
            personality: {},
            prompts: {},
            configuration: {},

            // Dynamic Layout Configuration
            layout: profileData.layout || [
                { type: 'profile', id: 'section-profile', minimized: false },
                { type: 'personality', id: 'section-personality', minimized: true }
            ]
        };

        this._saveChatbot(chatbot);
        return chatbot;
    }

    /**
     * Updates an existing chatbot.
     * @param {string} id 
     * @param {Object} updates - Partial chatbot object
     * @returns {Object} Updated chatbot
     */
    updateChatbot(id, updates) {
        const current = this.getChatbot(id);
        if (!current) throw new Error(`Chatbot ${id} not found`);

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

        this._saveChatbot(updated);
        return updated;
    }

    /**
     * Deletes a chatbot.
     * @param {string} id 
     * @returns {boolean}
     */
    deleteChatbot(id) {
        const filePath = path.join(this.basePath, `${id}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    /**
     * Retrieves a single chatbot by ID.
     * @param {string} id 
     * @returns {Object|null}
     */
    getChatbot(id) {
        const filePath = path.join(this.basePath, `${id}.json`);
        if (!fs.existsSync(filePath)) return null;

        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading chatbot ${id}:`, error);
            return null;
        }
    }

    /**
     * Lists all chatbots.
     * @returns {Array<Object>}
     */
    listChatbots() {
        try {
            const files = fs.readdirSync(this.basePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    const id = file.replace('.json', '');
                    return this.getChatbot(id);
                })
                .filter(bot => bot !== null)
                .sort((a, b) => new Date(b.metadata.updated) - new Date(a.metadata.updated));
        } catch (error) {
            console.error('Error listing chatbots:', error);
            return [];
        }
    }

    /**
     * Internal helper to write file
     */
    _saveChatbot(chatbot) {
        try {
            const filePath = path.join(this.basePath, `${chatbot.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(chatbot, null, 2), 'utf8');
        } catch (error) {
            console.error(`Error saving chatbot ${chatbot.id}:`, error);
            throw new Error(`Failed to save chatbot: ${error.message}`);
        }
    }

    /**
     * Exports a chatbot to PNG V2 Card
     */
    exportChatbot(id, outputPath) {
        const bot = this.getChatbot(id);
        if (!bot) throw new Error('Bot not found');
        return exportToPng(bot, outputPath, bot.profile.avatar);
    }
    /**
     * Retrieves unique categories from all bots + defaults.
     * @returns {Array<string>}
     */
    getUniqueCategories() {
        const defaults = new Set(['Character', 'Assistant', 'Roleplay', 'Educational']);
        const bots = this.listChatbots();

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


module.exports = new ChatbotManager();
