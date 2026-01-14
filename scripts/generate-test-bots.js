/**
 * Script to generate 100 test bots for BotWaffle
 * Run with: node scripts/generate-test-bots.js
 */

const { initializeStorage } = require('../src/core/storage');
const { initializeServices, getService } = require('../src/core/services');

// Sample data arrays for generating varied test bots
const firstNames = [
    'Alex', 'Blake', 'Casey', 'Drew', 'Eden', 'Finley', 'Gray', 'Harley',
    'Ivy', 'Jade', 'Kai', 'Lake', 'Morgan', 'Nova', 'Ocean', 'Parker',
    'Quinn', 'River', 'Sky', 'Tatum', 'Vale', 'Willow', 'Xander', 'Yuki', 'Zane'
];

const lastNames = [
    'Anderson', 'Brooks', 'Chen', 'Davis', 'Evans', 'Foster', 'Gray', 'Harris',
    'Ito', 'Johnson', 'Kim', 'Lee', 'Martinez', 'Nguyen', 'Ortiz', 'Patel',
    'Quinn', 'Rodriguez', 'Smith', 'Taylor', 'Ueda', 'Valdez', 'Wang', 'Xu', 'Young'
];

const adjectives = [
    'curious', 'brave', 'witty', 'kind', 'creative', 'analytical', 'cheerful',
    'mysterious', 'adventurous', 'thoughtful', 'energetic', 'calm', 'passionate',
    'logical', 'artistic', 'determined', 'optimistic', 'intuitive', 'disciplined', 'imaginative'
];

const categories = [
    'Character', 'Assistant', 'Roleplay', 'Educational'
];

const tagOptions = [
    ['friendly', 'helpful'], ['mysterious', 'dark'], ['funny', 'silly'],
    ['serious', 'professional'], ['kind', 'caring'], ['bold', 'confident'],
    ['smart', 'analytical'], ['creative', 'artistic'], ['calm', 'peaceful'],
    ['energetic', 'enthusiastic'], ['romantic', 'passionate'], ['adventurous', 'explorer']
];

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function generateTestBots(count = 100) {
    console.log(`Generating ${count} test bots...\n`);
    
    // Initialize storage and services
    initializeStorage();
    initializeServices();
    
    const chatbotManager = getService('chatbotManager');
    
    let created = 0;
    let errors = 0;
    
    for (let i = 0; i < count; i++) {
        try {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const adjective = randomItem(adjectives);
            const category = randomItem(categories);
            const tags = randomItems(tagOptions.flat(), Math.floor(Math.random() * 3) + 1);
            
            const name = `${firstName} ${lastName}`;
            const description = `${adjective.charAt(0).toUpperCase() + adjective.slice(1)} character in a ${category.toLowerCase()} setting.`;
            
            const profileData = {
                name: name.toLowerCase().replace(/\s+/g, '-'),
                displayName: name,
                description: description,
                category: category,
                tags: tags
            };
            
            const chatbot = await chatbotManager.createChatbot(profileData);
            created++;
            
            if ((i + 1) % 10 === 0) {
                console.log(`Created ${i + 1}/${count} bots...`);
            }
        } catch (error) {
            errors++;
            console.error(`Error creating bot ${i + 1}:`, error.message);
        }
    }
    
    console.log(`\n✅ Generation complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Errors: ${errors}`);
}

// Run the script
if (require.main === module) {
    generateTestBots(100)
        .then(() => {
            console.log('\nDone!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nFatal error:', error);
            process.exit(1);
        });
}

module.exports = { generateTestBots };
