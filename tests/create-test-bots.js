/**
 * Create test bots for pagination testing
 * Creates 100 test chatbot profiles with varied data
 */

// Determine if running in Electron context or Node.js context
let chatbotManager, initializeStorage;
try {
    // Try Electron context first (when app is ready)
    const ChatbotManager = require('../src/core/chatbot-manager');
    chatbotManager = new ChatbotManager();
    initializeStorage = require('../src/core/storage').initializeStorage;
} catch (e) {
    console.error('Error loading modules:', e);
    process.exit(1);
}

const categories = ['Character', 'Assistant', 'Roleplay', 'Educational'];
const sampleDescriptions = [
    'A helpful AI assistant',
    'A friendly character for roleplay',
    'An educational bot for learning',
    'A creative writing companion',
    'A technical support assistant',
    'A storytelling character',
    'A tutoring assistant',
    'A creative partner'
];

const sampleTags = [
    ['friendly', 'helpful', 'v1'],
    ['creative', 'writer', 'v2'],
    ['technical', 'support', 'expert'],
    ['educational', 'tutor', 'v1'],
    ['roleplay', 'character', 'fantasy'],
    ['assistant', 'ai', 'helper'],
    ['creative', 'artistic', 'v3'],
    ['technical', 'advanced', 'v2']
];

async function createTestBots(count = 100) {
    console.log(`[TestBots] Initializing storage...`);
    initializeStorage();
    
    console.log(`[TestBots] Creating ${count} test chatbot profiles...`);
    const startTime = Date.now();
    
    for (let i = 1; i <= count; i++) {
        const category = categories[i % categories.length];
        const description = sampleDescriptions[i % sampleDescriptions.length];
        const tags = sampleTags[i % sampleTags.length];
        
        const botData = {
            name: `TestBot_${i.toString().padStart(3, '0')}`,
            displayName: `Test Bot ${i}`,
            category: category,
            description: `${description} - Test bot number ${i}`,
            tags: tags,
            layout: [
                { type: 'profile', id: 'section-profile', minimized: false },
                { type: 'personality', id: 'section-personality', minimized: true }
            ]
        };
        
        try {
            await chatbotManager.createChatbot(botData);
            if (i % 10 === 0) {
                console.log(`[TestBots] Created ${i}/${count} bots...`);
            }
        } catch (error) {
            console.error(`[TestBots] Error creating bot ${i}:`, error.message);
        }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[TestBots] ✓ Created ${count} test bots in ${duration} ms (~${(duration / count).toFixed(2)} ms/bot)`);
    
    // Verify
    const allBots = chatbotManager.listChatbots();
    console.log(`[TestBots] ✓ Total bots in database: ${allBots.length}`);
    console.log(`[TestBots] Done! You can now test pagination in the application.`);
}

// Run if called directly
if (require.main === module) {
    const count = parseInt(process.argv[2]) || 100;
    createTestBots(count)
        .then(() => {
            console.log('[TestBots] Script completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[TestBots] Script failed:', error);
            process.exit(1);
        });
}

module.exports = { createTestBots };
