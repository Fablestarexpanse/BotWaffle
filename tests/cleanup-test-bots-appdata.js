/**
 * Cleanup test bots from AppData directory (Electron app data location)
 * Removes bots with "TestBot_" prefix, "StressTestBot" prefix, or test tags
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get AppData path for BotWaffle
const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'BotWaffle', 'data', 'chatbots');

function cleanupTestBotsFromAppData() {
    console.log('[Cleanup] Checking AppData directory:', appDataPath);
    
    if (!fs.existsSync(appDataPath)) {
        console.log('[Cleanup] AppData directory not found. Nothing to clean.');
        return;
    }
    
    const files = fs.readdirSync(appDataPath).filter(f => f.endsWith('.json'));
    console.log(`[Cleanup] Found ${files.length} bot files in AppData`);
    
    if (files.length === 0) {
        console.log('[Cleanup] No bot files found.');
        return;
    }
    
    let deleted = 0;
    let errors = 0;
    
    for (const file of files) {
        try {
            const filePath = path.join(appDataPath, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const name = content.profile?.name || '';
            const tags = content.profile?.tags || [];
            
            // Check if it's a test bot
            const isTestBot = name.startsWith('TestBot_') || 
                            name.startsWith('StressTestBot') ||
                            tags.includes('stress-test') ||
                            tags.includes('auto') ||
                            (name.includes('Test') && name.includes('Bot'));
            
            if (isTestBot) {
                fs.unlinkSync(filePath);
                deleted++;
                if (deleted % 100 === 0) {
                    console.log(`[Cleanup] Deleted ${deleted} test bots...`);
                }
            }
        } catch (error) {
            console.error(`[Cleanup] Error processing ${file}:`, error.message);
            errors++;
        }
    }
    
    console.log(`[Cleanup] ✓ Deleted ${deleted} test bots from AppData`);
    if (errors > 0) {
        console.log(`[Cleanup] ⚠ ${errors} errors encountered`);
    }
    
    const remaining = fs.readdirSync(appDataPath).filter(f => f.endsWith('.json')).length;
    console.log(`[Cleanup] ✓ Remaining bots in AppData: ${remaining}`);
    console.log('[Cleanup] Done!');
}

// Run if called directly
if (require.main === module) {
    cleanupTestBotsFromAppData();
    process.exit(0);
}

module.exports = { cleanupTestBotsFromAppData };
