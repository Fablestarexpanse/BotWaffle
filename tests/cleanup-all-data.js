/**
 * Complete Data Cleanup Script
 * Deletes ALL character data including folders, images, scripts, chats, etc.
 * Also cleans up legacy folders (assets, chatbots)
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { getDataDir, initializeStorage } = require('../src/core/storage');
const ChatbotManager = require('../src/core/chatbot-manager');

async function cleanupAllData() {
    console.log('[Cleanup] Initializing storage...');
    initializeStorage();
    
    // Get the actual data directory (uses app.getPath('userData') when Electron is available)
    let dataDir;
    try {
        const { app } = require('electron');
        // Need to wait for app to be ready
        if (!app.isReady()) {
            await app.whenReady();
        }
        dataDir = path.join(app.getPath('userData'), 'data');
        console.log(`[Cleanup] Using Electron userData path`);
    } catch (error) {
        // Fallback to local data directory
        dataDir = getDataDir();
        console.log(`[Cleanup] Using fallback data path`);
    }
    
    console.log(`[Cleanup] Data directory: ${dataDir}`);
    
    let totalDeleted = 0;
    
    // Step 1: Delete all chatbots using ChatbotManager (this deletes character folders)
    console.log('\n[Cleanup] Step 1: Deleting all chatbots...');
    try {
        const chatbotManager = new ChatbotManager();
        const allBots = await chatbotManager.listChatbots();
        console.log(`[Cleanup] Found ${allBots.length} bots to delete`);
        
        for (const bot of allBots) {
            try {
                await chatbotManager.deleteChatbot(bot.id);
                totalDeleted++;
                if (totalDeleted % 10 === 0) {
                    console.log(`[Cleanup] Deleted ${totalDeleted}/${allBots.length} bots...`);
                }
            } catch (error) {
                console.error(`[Cleanup] Error deleting bot ${bot.id}:`, error.message);
            }
        }
        console.log(`[Cleanup] ✓ Deleted ${totalDeleted} bots`);
    } catch (error) {
        console.error('[Cleanup] Error in bot deletion:', error);
    }
    
    // Step 2: Manually delete all character folders (in case some weren't found)
    console.log('\n[Cleanup] Step 2: Manually cleaning character folders...');
    try {
        const charactersPath = path.join(dataDir, 'characters');
        if (fsSync.existsSync(charactersPath)) {
            const entries = await fs.readdir(charactersPath, { withFileTypes: true });
            let foldersDeleted = 0;
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const folderPath = path.join(charactersPath, entry.name);
                    try {
                        await fs.rm(folderPath, { recursive: true, force: true });
                        foldersDeleted++;
                        console.log(`[Cleanup] Deleted folder: ${entry.name}`);
                    } catch (error) {
                        console.error(`[Cleanup] Error deleting folder ${entry.name}:`, error.message);
                    }
                }
            }
            console.log(`[Cleanup] ✓ Deleted ${foldersDeleted} character folders`);
        } else {
            console.log('[Cleanup] No characters folder found');
        }
    } catch (error) {
        console.error('[Cleanup] Error cleaning character folders:', error);
    }
    
    // Step 3: Delete legacy assets folder
    console.log('\n[Cleanup] Step 3: Cleaning legacy assets folder...');
    try {
        const assetsPath = path.join(dataDir, 'assets');
        if (fsSync.existsSync(assetsPath)) {
            const entries = await fs.readdir(assetsPath, { withFileTypes: true });
            let filesDeleted = 0;
            
            for (const entry of entries) {
                const entryPath = path.join(assetsPath, entry.name);
                try {
                    if (entry.isDirectory()) {
                        await fs.rm(entryPath, { recursive: true, force: true });
                    } else {
                        await fs.unlink(entryPath);
                    }
                    filesDeleted++;
                } catch (error) {
                    console.error(`[Cleanup] Error deleting ${entry.name}:`, error.message);
                }
            }
            console.log(`[Cleanup] ✓ Deleted ${filesDeleted} items from assets folder`);
        } else {
            console.log('[Cleanup] No assets folder found');
        }
    } catch (error) {
        console.error('[Cleanup] Error cleaning assets folder:', error);
    }
    
    // Step 4: Delete legacy chatbots folder files
    console.log('\n[Cleanup] Step 4: Cleaning legacy chatbots folder...');
    try {
        const chatbotsPath = path.join(dataDir, 'chatbots');
        if (fsSync.existsSync(chatbotsPath)) {
            const entries = await fs.readdir(chatbotsPath, { withFileTypes: true });
            let filesDeleted = 0;
            
            for (const entry of entries) {
                const entryPath = path.join(chatbotsPath, entry.name);
                try {
                    if (entry.isDirectory()) {
                        await fs.rm(entryPath, { recursive: true, force: true });
                    } else {
                        await fs.unlink(entryPath);
                    }
                    filesDeleted++;
                } catch (error) {
                    console.error(`[Cleanup] Error deleting ${entry.name}:`, error.message);
                }
            }
            console.log(`[Cleanup] ✓ Deleted ${filesDeleted} items from chatbots folder`);
        } else {
            console.log('[Cleanup] No chatbots folder found');
        }
    } catch (error) {
        console.error('[Cleanup] Error cleaning chatbots folder:', error);
    }
    
    // Step 5: Verify cleanup
    console.log('\n[Cleanup] Step 5: Verifying cleanup...');
    try {
        const chatbotManager = new ChatbotManager();
        const remainingBots = await chatbotManager.listChatbots();
        console.log(`[Cleanup] Remaining bots: ${remainingBots.length}`);
        
        // Check character folders
        const charactersPath = path.join(dataDir, 'characters');
        if (fsSync.existsSync(charactersPath)) {
            const entries = await fs.readdir(charactersPath);
            console.log(`[Cleanup] Remaining character folders: ${entries.length}`);
            if (entries.length > 0) {
                console.log(`[Cleanup] Folders: ${entries.join(', ')}`);
            }
        } else {
            console.log('[Cleanup] Characters folder does not exist (clean)');
        }
        
        // Check assets
        const assetsPath = path.join(dataDir, 'assets');
        if (fsSync.existsSync(assetsPath)) {
            const entries = await fs.readdir(assetsPath);
            console.log(`[Cleanup] Remaining items in assets: ${entries.length}`);
        } else {
            console.log('[Cleanup] Assets folder does not exist (clean)');
        }
        
        // Check chatbots
        const chatbotsPath = path.join(dataDir, 'chatbots');
        if (fsSync.existsSync(chatbotsPath)) {
            const entries = await fs.readdir(chatbotsPath);
            console.log(`[Cleanup] Remaining items in chatbots: ${entries.length}`);
        } else {
            console.log('[Cleanup] Chatbots folder does not exist (clean)');
        }
        
    } catch (error) {
        console.error('[Cleanup] Error verifying cleanup:', error);
    }
    
    console.log('\n[Cleanup] ✓ Cleanup complete!');
}

// Run if called directly
if (require.main === module) {
    cleanupAllData()
        .then(() => {
            console.log('[Cleanup] Script completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Cleanup] Script failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupAllData };
