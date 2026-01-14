/**
 * Stress Test: Create 200 copies of WookieBoo
 * This script duplicates an existing WookieBoo chatbot 200 times
 * to test card display performance with many cards full of content
 */

// Determine if running in Electron context or Node.js context
let chatbotManager, initializeStorage;
try {
    const ChatbotManager = require('../src/core/chatbot-manager');
    chatbotManager = new ChatbotManager();
    initializeStorage = require('../src/core/storage').initializeStorage;
} catch (e) {
    console.error('Error loading modules:', e);
    process.exit(1);
}

async function findWookieBoo() {
    const bots = await chatbotManager.listChatbots();
    const wookie = bots.find(bot => {
        const name = (bot.profile?.name || '').toLowerCase();
        const displayName = (bot.profile?.displayName || '').toLowerCase();
        return name.includes('wookie') || displayName.includes('wookie');
    });
    return wookie;
}

async function duplicateChatbot(originalBot, index) {
    // Update names with index
    const paddedIndex = String(index).padStart(3, '0');
    const profileData = {
        name: `WookieBoo_${paddedIndex}`,
        displayName: `WookieBoo ${paddedIndex}`,
        category: originalBot.profile.category,
        description: originalBot.profile.description,
        tags: originalBot.profile.tags || [],
        avatar: originalBot.profile.avatar || null,
        images: originalBot.profile.images || [],
        thumbnailIndex: originalBot.profile.thumbnailIndex
    };
    
    // Create the new chatbot with profile data
    const created = await chatbotManager.createChatbot(profileData);
    
    // Prepare update data with all sections (personality, scenario, etc.)
    const updateData = {};
    if (originalBot.personality) updateData.personality = originalBot.personality;
    if (originalBot.scenario) updateData.scenario = originalBot.scenario;
    if (originalBot.initialMessages) updateData.initialMessages = originalBot.initialMessages;
    if (originalBot.exampleDialogs) updateData.exampleDialogs = originalBot.exampleDialogs;
    if (originalBot.customSections) updateData.customSections = originalBot.customSections;
    if (originalBot.prompts) updateData.prompts = originalBot.prompts;
    if (originalBot.configuration) updateData.configuration = originalBot.configuration;
    if (originalBot.layout) updateData.layout = originalBot.layout;
    if (originalBot.metadata?.status) updateData.metadata = { status: originalBot.metadata.status };
    
    // Update with all the section data
    if (Object.keys(updateData).length > 0) {
        await chatbotManager.updateChatbot(created.id, updateData);
    }
    
    // Get the full updated bot
    return await chatbotManager.getChatbot(created.id);
}

async function main() {
    console.log('Starting stress test: Creating 200 copies of WookieBoo...\n');
    
    try {
        // Initialize storage
        initializeStorage();
        
        // Find the original WookieBoo
        console.log('Finding original WookieBoo...');
        const originalBot = await findWookieBoo();
        
        if (!originalBot) {
            console.error('ERROR: Could not find WookieBoo chatbot');
            console.log('Please make sure WookieBoo exists in your chatbot library');
            console.log('(Search is case-insensitive for "wookie")');
            process.exit(1);
        }
        
        console.log(`Found: ${originalBot.profile.displayName || originalBot.profile.name}\n`);
        
        // Create 200 copies
        const totalCopies = 200;
        console.log(`Creating ${totalCopies} copies...`);
        
        const created = [];
        const errors = [];
        
        for (let i = 1; i <= totalCopies; i++) {
            try {
                const newBot = await duplicateChatbot(originalBot, i);
                created.push(newBot);
                
                if (i % 10 === 0) {
                    console.log(`Progress: ${i}/${totalCopies} created...`);
                }
            } catch (error) {
                console.error(`Error creating copy ${i}:`, error.message);
                errors.push({ index: i, error: error.message });
            }
        }
        
        console.log(`\n✅ Stress test complete!`);
        console.log(`   Created: ${created.length} copies`);
        console.log(`   Errors: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\nErrors encountered:');
            errors.forEach(e => console.log(`   Copy ${e.index}: ${e.error}`));
        }
        
        // Verify total count
        const allBots = await chatbotManager.listChatbots();
        console.log(`\nTotal bots in database: ${allBots.length}`);
        console.log(`All copies named: WookieBoo 001 through WookieBoo ${String(totalCopies).padStart(3, '0')}`);
        
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { main, findWookieBoo, duplicateChatbot };
