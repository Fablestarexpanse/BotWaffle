const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get userData directory
const userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'), 'BotWaffle');
const chatbotsPath = path.join(userDataPath, 'data', 'chatbots');

function updateBotFile(filePath) {
    try {
        const botData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let updated = false;

        // Update layout to include new default sections if missing
        if (!botData.layout || botData.layout.length === 0) {
            botData.layout = [
                { type: 'profile', id: 'section-profile', minimized: false },
                { type: 'scenario', id: 'section-scenario', minimized: false },
                { type: 'initial-messages', id: 'section-initial-messages', minimized: false },
                { type: 'example-dialogs', id: 'section-example-dialogs', minimized: false }
            ];
            updated = true;
        } else {
            // Check if we need to add the new sections
            const hasScenario = botData.layout.some(s => s.type === 'scenario');
            const hasInitialMessages = botData.layout.some(s => s.type === 'initial-messages');
            const hasExampleDialogs = botData.layout.some(s => s.type === 'example-dialogs');

            if (!hasScenario) {
                // Find where to insert (after profile, before example-dialogs if exists)
                const profileIndex = botData.layout.findIndex(s => s.type === 'profile');
                const insertIndex = profileIndex >= 0 ? profileIndex + 1 : botData.layout.length;
                botData.layout.splice(insertIndex, 0, { type: 'scenario', id: 'section-scenario', minimized: false });
                updated = true;
            }

            if (!hasInitialMessages) {
                // Insert after scenario
                const scenarioIndex = botData.layout.findIndex(s => s.type === 'scenario');
                const insertIndex = scenarioIndex >= 0 ? scenarioIndex + 1 : botData.layout.length;
                botData.layout.splice(insertIndex, 0, { type: 'initial-messages', id: 'section-initial-messages', minimized: false });
                updated = true;
            }

            if (!hasExampleDialogs) {
                // Insert after initial-messages
                const initialMessagesIndex = botData.layout.findIndex(s => s.type === 'initial-messages');
                const insertIndex = initialMessagesIndex >= 0 ? initialMessagesIndex + 1 : botData.layout.length;
                botData.layout.splice(insertIndex, 0, { type: 'example-dialogs', id: 'section-example-dialogs', minimized: false });
                updated = true;
            }
        }

        // Migrate scenario data if it exists
        if (botData.scenario && typeof botData.scenario === 'object') {
            // If scenario has initialMessages, split them out
            if (botData.scenario.initialMessages && Array.isArray(botData.scenario.initialMessages)) {
                if (!botData.initialMessages) {
                    botData.initialMessages = botData.scenario.initialMessages;
                }
                // Remove initialMessages from scenario object
                delete botData.scenario.initialMessages;
                delete botData.scenario.messages; // Also remove messages if it exists
                updated = true;
            }
            
            // Ensure scenario is just the text/scenario field
            if (botData.scenario.scenario) {
                botData.scenario = { scenario: botData.scenario.scenario, text: botData.scenario.scenario };
            } else if (botData.scenario.text && !botData.scenario.scenario) {
                botData.scenario = { scenario: botData.scenario.text, text: botData.scenario.text };
            } else if (typeof botData.scenario === 'object' && !botData.scenario.scenario && !botData.scenario.text) {
                // If scenario is an object but has no scenario/text fields, it might be empty
                botData.scenario = { scenario: '', text: '' };
            }
        }

        // Ensure initialMessages exists if not present
        if (!botData.initialMessages) {
            botData.initialMessages = [];
        }

        // Ensure exampleDialogs exists if not present
        if (!botData.exampleDialogs) {
            botData.exampleDialogs = [];
        }

        if (updated) {
            // Write updated bot data
            fs.writeFileSync(filePath, JSON.stringify(botData, null, 2), 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error updating bot file ${filePath}:`, error);
        return false;
    }
}

function updateAllBots() {
    if (!fs.existsSync(chatbotsPath)) {
        console.log('Chatbots directory does not exist:', chatbotsPath);
        return;
    }

    const files = fs.readdirSync(chatbotsPath).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} bot files`);

    let updatedCount = 0;
    files.forEach(file => {
        const filePath = path.join(chatbotsPath, file);
        if (updateBotFile(filePath)) {
            console.log(`Updated: ${file}`);
            updatedCount++;
        }
    });

    console.log(`\nUpdated ${updatedCount} out of ${files.length} bot files`);
}

// Run if called directly
if (require.main === module) {
    updateAllBots();
}

module.exports = { updateBotFile, updateAllBots };
