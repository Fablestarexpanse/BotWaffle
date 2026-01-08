const { initializeStorage } = require('../src/core/storage');
const chatbotManager = require('../src/core/chatbot-manager');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createBots(count, prefix = 'StressTestBot') {
  console.log(`\n[StressTest] Creating ${count} chatbot profiles...`);
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    const name = `${prefix}_${Date.now()}_${i}`;
    try {
      chatbotManager.createChatbot({
        name,
        displayName: `Stress Test Bot ${i}`,
        category: 'Character',
        description: 'Automatically generated for performance testing.',
        tags: ['stress-test', 'auto'],
        images: [],
        layout: [
          { type: 'profile', id: 'section-profile', minimized: false },
          { type: 'personality', id: 'section-personality', minimized: true }
        ]
      });
    } catch (err) {
      console.error('[StressTest] Error creating bot', i, err.message);
      break;
    }

    // Yield occasionally to avoid blocking too hard
    if (i > 0 && i % 200 === 0) {
      await sleep(10);
    }
  }
  const duration = Date.now() - start;
  console.log(`[StressTest] Created ${count} bots in ${duration} ms (~${(duration / count).toFixed(2)} ms/bot)`);
}

function measureListChatbots() {
  const start = Date.now();
  const bots = chatbotManager.listChatbots();
  const duration = Date.now() - start;
  console.log(`[StressTest] listChatbots() -> ${bots.length} bots in ${duration} ms`);
  return { count: bots.length, duration };
}

async function main() {
  console.log('[StressTest] Initializing storage...');
  initializeStorage();

  console.log('[StressTest] Baseline listChatbots timing (before creating bots)...');
  measureListChatbots();

  const batches = [50, 150, 300, 500];
  for (const batch of batches) {
    await createBots(batch);
    const { count, duration } = measureListChatbots();
    console.log(`[StressTest] After total ~${count} bots, listChatbots took ${duration} ms`);
  }

  console.log('\n[StressTest] Done. You can delete test bots by removing the generated JSON files in your data/chatbots directory if desired.');
}

main().catch(err => {
  console.error('[StressTest] Fatal error:', err);
  process.exit(1);
});

