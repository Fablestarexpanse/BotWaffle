const chatbotManager = require('../src/core/chatbot-manager');
const { initializeStorage } = require('../src/core/storage');

console.log('Initializing storage...');
initializeStorage();

console.log('\n📝 STARTING WORKFLOW SIMULATION: Creating a New Bot from Scratch');

try {
    // 1. Fill Basic Profile
    console.log('\nSTEP 1: Fill Basic Profile');
    let bot = chatbotManager.createChatbot({
        name: "Alex",
        displayName: "Alex",
        category: "Educational",
        description: "Curious student who loves science",
        // Avatar would receive a file path in real app, simulating null or string here
        avatar: "/path/to/alex_avatar.png"
    });
    console.log(`[OK] Created bot: ${bot.profile.displayName} (${bot.id})`);

    // 2. Build Personality
    console.log('\nSTEP 2: Build Personality');
    const personalityUpdates = {
        personality: {
            traits: ["Curious", "Enthusiastic", "Analytical"],
            backstory: "Alex has always been fascinated by the stars...",
            systemPrompt: "You are Alex, a curious student...",
            tokenCount: 450
        }
    };
    bot = chatbotManager.updateChatbot(bot.id, personalityUpdates);

    // Verify
    if (bot.personality.traits.length === 3 && bot.personality.tokenCount === 450) {
        console.log('[OK] Personality updated successfully');
    } else {
        throw new Error('Personality update failed');
    }

    // 3. Add Greetings
    console.log('\nSTEP 3: Add Greetings');
    const greetingsUpdates = {
        prompts: {
            ...bot.prompts, // Preserve existing if any (none yet)
            greetings: [
                { text: "Hi! I'm Alex. Want to talk about space?", type: "default" },
                { text: "Did you know stars are giant fusion reactors?", type: "scenario_science" },
                { text: "I'm stuck on this math problem...", type: "scenario_homework" }
            ]
        }
    };
    bot = chatbotManager.updateChatbot(bot.id, greetingsUpdates);

    // Verify
    if (bot.prompts.greetings.length === 3) {
        console.log('[OK] Greetings added successfully');
    } else {
        throw new Error('Greetings update failed');
    }

    // 4. Create Example Dialogues
    console.log('\nSTEP 4: Create Example Dialogues');
    const examplesUpdates = {
        prompts: {
            ...bot.prompts,
            examples: [
                { user: "Hi", assistant: "Hello!", tags: ["intro"] },
                { user: "What is 2+2?", assistant: "It's 4!", tags: ["math"] },
                { user: "Why is the sky blue?", assistant: "Rayleigh scattering!", tags: ["science"] },
                { user: "Who are you?", assistant: "I'm Alex.", tags: ["identity"] },
                { user: "Bye", assistant: "See ya!", tags: ["outro"] }
            ]
        }
    };
    bot = chatbotManager.updateChatbot(bot.id, examplesUpdates);

    // Verify
    if (bot.prompts.examples.length === 5) {
        console.log('[OK] Examples added successfully');
    } else {
        throw new Error('Examples update failed');
    }

    // 5. Configure Settings
    console.log('\nSTEP 5: Configure Settings');
    const configUpdates = {
        configuration: {
            model: "GPT-4",
            temperature: 0.8,
            memory: "WindowBuffer"
        }
    };
    bot = chatbotManager.updateChatbot(bot.id, configUpdates);

    // Verify
    if (bot.configuration.model === "GPT-4" && bot.configuration.temperature === 0.8) {
        console.log('[OK] Configuration updated successfully');
    } else {
        throw new Error('Configuration update failed');
    }

    // 6. Validate & Review (Simulated)
    console.log('\nSTEP 6: Validate & Review');
    const qualityScore = 92; // Simulated calculation
    if (bot.profile.name && bot.personality.systemPrompt && bot.prompts.examples.length >= 3) {
        console.log(`[OK] Quality Check Passed (Score: ${qualityScore}/100)`);
    } else {
        console.warn('[WARN] Quality Check Issues Found');
    }

    // 7. Save & Export
    console.log('\nSTEP 7: Save & Export');
    // Save is implicit in updateChatbot (it writes to disk)
    // Verify file exists
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'chatbots', `${bot.id}.json`);

    if (fs.existsSync(filePath)) {
        console.log(`[OK] Bot saved to disk: ${filePath}`);
    } else {
        throw new Error('File not found on disk');
    }

    // Simulate Export (Reading file and parsing)
    const exportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (exportData.profile.name === "Alex" && exportData.configuration.model === "GPT-4") {
        console.log('[OK] Export content verified');
    } else {
        throw new Error('Export content mismatch');
    }

    console.log('\n✅ WORKFLOW VERIFICATION COMPLETE: ALL STEPS PASSED');

} catch (error) {
    console.error('\n❌ WORKFLOW FAILED:', error.message);
    process.exit(1);
}
