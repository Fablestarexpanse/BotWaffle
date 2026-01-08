const manager = require('./src/core/chatbot-manager');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data/chatbots');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('Starting Image Library Stress Test...');

async function runTest() {
    const iterations = 10;
    const bots = [];

    // 1. Create bots with dummy images
    console.log(`Creating ${iterations} bots with image entries...`);
    for (let i = 0; i < iterations; i++) {
        const dummyImage = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;

        const bot = manager.createChatbot({
            name: `StressBot_${i}`,
            description: 'Testing persistence',
            images: [dummyImage, dummyImage], // Verify array persistence
            thumbnailIndex: 0
        });
        bots.push(bot.id);
    }

    // 2. Verify persistence
    console.log('Verifying persistence on disk...');
    let successCount = 0;
    for (const id of bots) {
        const loaded = manager.getChatbot(id);
        if (loaded && loaded.profile.images.length === 2 && loaded.profile.name.startsWith('StressBot')) {
            successCount++;
        } else {
            console.error(`Failed to verify bot ${id}`);
        }
    }

    console.log(`Verification: ${successCount}/${iterations} passed.`);

    // 3. Cleanup
    console.log('Cleaning up test data...');
    for (const id of bots) {
        manager.deleteChatbot(id);
    }

    if (successCount === iterations) {
        console.log('✅ Stress Test PASSED');
    } else {
        console.error('❌ Stress Test FAILED');
        process.exit(1);
    }
}

runTest().catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
});
