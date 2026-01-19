/**
 * Delete ALL chatbots - Non-interactive version
 * Run with: node tests/delete-all-bots-simple.js
 */

const ChatbotManager = require('../src/core/chatbot-manager');
const chatbotManager = new ChatbotManager();
const { initializeStorage } = require('../src/core/storage');

async function deleteAllBots() {
    console.log('[Delete All] Initializing storage...');
    initializeStorage();
    
    console.log('[Delete All] Loading all chatbots...');
    const allBots = await chatbotManager.listChatbots();
    console.log(`[Delete All] Found ${allBots.length} total bots`);
    
    if (allBots.length === 0) {
        console.log('[Delete All] No bots found to delete.');
        return;
    }
    
    // Show first 10 bot names
    console.log('\n[Delete All] Sample bots to be deleted:');
    allBots.slice(0, 10).forEach((bot, index) => {
        console.log(`  ${index + 1}. ${bot.profile?.name || 'unnamed'}`);
    });
    if (allBots.length > 10) {
        console.log(`  ... and ${allBots.length - 10} more`);
    }
    
    console.log(`\n[Delete All] Deleting all ${allBots.length} bots...`);
    
    // Delete each bot
    let deleted = 0;
    let errors = 0;
    
    for (const bot of allBots) {
        try {
            await chatbotManager.deleteChatbot(bot.id);
            deleted++;
            if (deleted % 50 === 0 || deleted === allBots.length) {
                console.log(`[Delete All] Deleted ${deleted}/${allBots.length} bots...`);
            }
        } catch (error) {
            console.error(`[Delete All] Error deleting bot ${bot.id}:`, error.message);
            errors++;
        }
    }
    
    console.log(`\n[Delete All] ✓ Deleted ${deleted} bots`);
    if (errors > 0) {
        console.log(`[Delete All] ⚠ ${errors} errors encountered`);
    }
    
    // Verify
    const remainingBots = await chatbotManager.listChatbots();
    console.log(`[Delete All] ✓ Remaining bots: ${remainingBots.length}`);
    console.log('[Delete All] Done!');
}

// Run if called directly
if (require.main === module) {
    deleteAllBots()
        .then(() => {
            console.log('[Delete All] Script completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Delete All] Script failed:', error);
            process.exit(1);
        });
}

module.exports = { deleteAllBots };
