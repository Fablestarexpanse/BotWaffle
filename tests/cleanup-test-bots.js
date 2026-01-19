/**
 * Cleanup test bots - Removes all test chatbot profiles
 * Removes bots with "TestBot_" prefix or "stress-test" tag
 */

const ChatbotManager = require('../src/core/chatbot-manager');
const chatbotManager = new ChatbotManager();
const { initializeStorage } = require('../src/core/storage');
const fs = require('fs');
const path = require('path');
const { getDataPath } = require('../src/core/storage');

async function cleanupTestBots() {
    console.log('[Cleanup] Initializing storage...');
    initializeStorage();
    
    console.log('[Cleanup] Loading all chatbots...');
    const allBots = await chatbotManager.listChatbots();
    console.log(`[Cleanup] Found ${allBots.length} total bots`);
    
    // Show first 10 bot names for debugging
    if (allBots.length > 0) {
        console.log('[Cleanup] Sample bot names:');
        allBots.slice(0, 10).forEach(bot => {
            console.log(`  - ${bot.profile?.name || 'unnamed'} (tags: ${(bot.profile?.tags || []).join(', ') || 'none'})`);
        });
    }
    
    // Find test bots - by name pattern or tags (comprehensive patterns)
    const testBots = allBots.filter(bot => {
        const name = (bot.profile?.name || '').toLowerCase();
        const displayName = (bot.profile?.displayName || '').toLowerCase();
        const tags = bot.profile?.tags || [];
        
        // Check if it's a test bot - comprehensive patterns
        return name.includes('test') || 
               displayName.includes('test') ||
               name.startsWith('testbot_') || 
               name.startsWith('stresstestbot') ||
               tags.some(tag => tag.toLowerCase().includes('test')) ||
               tags.some(tag => tag.toLowerCase().includes('stress')) ||
               tags.some(tag => tag.toLowerCase() === 'auto');
    });
    
    console.log(`[Cleanup] Found ${testBots.length} test bots to remove`);
    
    if (testBots.length === 0) {
        console.log('[Cleanup] No test bots found to remove.');
        return;
    }
    
    // Delete each test bot
    let deleted = 0;
    let errors = 0;
    
    for (const bot of testBots) {
        try {
            await chatbotManager.deleteChatbot(bot.id);
            deleted++;
            if (deleted % 10 === 0 || deleted === testBots.length) {
                console.log(`[Cleanup] Deleted ${deleted}/${testBots.length} test bots...`);
            }
        } catch (error) {
            console.error(`[Cleanup] Error deleting bot ${bot.id}:`, error.message);
            errors++;
        }
    }
    
    console.log(`[Cleanup] ✓ Deleted ${deleted} test bots`);
    if (errors > 0) {
        console.log(`[Cleanup] ⚠ ${errors} errors encountered`);
    }
    
    // Verify
    const remainingBots = await chatbotManager.listChatbots();
    console.log(`[Cleanup] ✓ Remaining bots: ${remainingBots.length}`);
    console.log('[Cleanup] Done!');
}

// Run if called directly
if (require.main === module) {
    cleanupTestBots()
        .then(() => {
            console.log('[Cleanup] Script completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Cleanup] Script failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupTestBots };
