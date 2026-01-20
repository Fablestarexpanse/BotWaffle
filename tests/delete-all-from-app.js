/**
 * Delete All Bots - Uses Electron IPC
 * This script can be run from the browser console when the app is running
 * 
 * Usage: Copy and paste this into the browser console (F12 -> Console)
 */

async function deleteAllBots() {
    if (!window.api || !window.api.chatbot || !window.api.chatbot.deleteAll) {
        console.error('API not available. Make sure you are running this in the BotWaffle app.');
        return;
    }
    
    const confirmed = confirm('⚠️ WARNING: This will delete ALL bots and all their data (images, scripts, chats, prompts). This cannot be undone!\n\nAre you absolutely sure?');
    
    if (!confirmed) {
        console.log('Deletion cancelled.');
        return;
    }
    
    try {
        console.log('Deleting all bots...');
        const result = await window.api.chatbot.deleteAll();
        console.log(`✓ Deleted ${result.deleted} bots`);
        if (result.errors > 0) {
            console.warn(`⚠ ${result.errors} errors encountered`);
        }
        alert(`Deleted ${result.deleted} bots. ${result.errors > 0 ? `\n\n${result.errors} errors occurred.` : ''}\n\nPlease refresh the page to see the changes.`);
        
        // Refresh the page to update the UI
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error deleting bots:', error);
        alert(`Error: ${error.message || 'Failed to delete bots'}`);
    }
}

// Run the function
deleteAllBots();
