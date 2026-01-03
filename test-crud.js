const chatbotManager = require('./src/core/chatbot-manager');
const { initializeStorage } = require('./src/core/storage');

console.log('Initializing storage...');
initializeStorage();

console.log('--- Testing Create ---');
const newBot = chatbotManager.createChatbot({
    name: 'TestBot',
    description: 'A test bot',
    category: 'Testing'
});
console.log('Created Bot:', newBot.id, newBot.profile.name);

console.log('--- Testing Get ---');
const retrievedBot = chatbotManager.getChatbot(newBot.id);
if (retrievedBot && retrievedBot.id === newBot.id) {
    console.log('PASS: Get Chatbot works');
} else {
    console.error('FAIL: Get Chatbot failed');
}

console.log('--- Testing Update ---');
const updatedBot = chatbotManager.updateChatbot(newBot.id, {
    profile: { description: 'Updated description' }
});
if (updatedBot.profile.description === 'Updated description') {
    console.log('PASS: Update Chatbot works');
} else {
    console.error('FAIL: Update Chatbot failed');
}

console.log('--- Testing List ---');
const list = chatbotManager.listChatbots();
if (list.length > 0) {
    console.log(`PASS: List Chatbots found ${list.length} bots`);
} else {
    console.error('FAIL: List Chatbots found 0 bots');
}

console.log('--- Testing Delete ---');
const deleted = chatbotManager.deleteChatbot(newBot.id);
if (deleted && !chatbotManager.getChatbot(newBot.id)) {
    console.log('PASS: Delete Chatbot works');
} else {
    console.error('FAIL: Delete Chatbot failed');
}
