/**
 * Delete ALL chatbots - USE WITH CAUTION
 * This will delete every single chatbot in the database
 */

const ChatbotManager = require('../src/core/chatbot-manager');
const chatbotManager = new ChatbotManager();
const { initializeStorage } = require('../src/core/storage');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function deleteAllBots() {
    try {
        console.log('[Delete All] Initializing storage...');
        initializeStorage();
        
        console.log('[Delete All] Loading all chatbots...');
        const allBots = await chatbotManager.listChatbots();
        console.log(`[Delete All] Found ${allBots.length} total bots`);
        
        if (allBots.length === 0) {
            console.log('[Delete All] No bots found to delete.');
            return;
        }
        
        // Show first 20 bot names
        console.log('\n[Delete All] First 20 bots:');
        allBots.slice(0, 20).forEach((bot, index) => {
            console.log(`  ${index + 1}. ${bot.profile?.name || 'unnamed'} (ID: ${bot.id.substring(0, 8)}...)`);
        });
        if (allBots.length > 20) {
            console.log(`  ... and ${allBots.length - 20} more`);
        }
        
        console.log('\n⚠️  WARNING: This will delete ALL chatbots!');
        const answer = await question(`\nAre you sure you want to delete all ${allBots.length} bots? (type 'YES' to confirm): `);
        
        if (answer !== 'YES') {
            console.log('[Delete All] Cancelled. No bots were deleted.');
            return;
        }
    
    // Delete each bot
    let deleted = 0;
    let errors = 0;
    
    console.log('\n[Delete All] Deleting bots...');
    for (const bot of allBots) {
        try {
            await chatbotManager.deleteChatbot(bot.id);
            deleted++;
            if (deleted % 10 === 0 || deleted === allBots.length) {
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
    } finally {
        rl.close();
    }
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
            rl.close();
            process.exit(1);
        });
}

module.exports = { deleteAllBots };
