/**
 * Test utilities and helpers
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Create a temporary test directory
 */
function createTestDir() {
  const testDir = path.join(os.tmpdir(), 'botwaffle-test', `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up a test directory
 */
function cleanupTestDir(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create a mock chatbot profile data
 */
function createMockBotData(overrides = {}) {
  return {
    name: overrides.name || `TestBot_${Date.now()}`,
    displayName: overrides.displayName || 'Test Bot',
    category: overrides.category || 'Character',
    description: overrides.description || 'A test chatbot',
    tags: overrides.tags || ['test', 'bot'],
    images: overrides.images || [],
    thumbnailIndex: overrides.thumbnailIndex !== undefined ? overrides.thumbnailIndex : -1,
    ...overrides
  };
}

/**
 * Create a mock chatbot object (full structure)
 */
function createMockChatbot(overrides = {}) {
  // If profile is provided in overrides, use it directly, otherwise create from botData
  const botData = overrides.profile ? overrides.profile : createMockBotData(overrides);
  
  return {
    id: overrides.id || `bot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    profile: {
      name: botData.name || overrides.profile?.name || `TestBot_${Date.now()}`,
      displayName: botData.displayName || overrides.profile?.displayName || 'Test Bot',
      category: botData.category || overrides.profile?.category || 'Character',
      description: botData.description || overrides.profile?.description || 'A test chatbot',
      tags: botData.tags || overrides.profile?.tags || ['test', 'bot'],
      images: botData.images || overrides.profile?.images || overrides.images || [],
      thumbnailIndex: botData.thumbnailIndex !== undefined ? botData.thumbnailIndex : 
                     (overrides.profile?.thumbnailIndex !== undefined ? overrides.profile.thumbnailIndex : 
                     (overrides.thumbnailIndex !== undefined ? overrides.thumbnailIndex : -1))
    },
    metadata: {
      created: overrides.metadata?.created || new Date().toISOString(),
      updated: overrides.metadata?.updated || new Date().toISOString(),
      ...(overrides.metadata || {})
    },
    layout: overrides.layout || [
      { type: 'profile', id: 'section-profile', minimized: false },
      { type: 'personality', id: 'section-personality', minimized: true }
    ]
  };
}

/**
 * Wait for async operations
 */
function wait(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a file exists
 */
function expectFileExists(filePath) {
  expect(fs.existsSync(filePath)).toBe(true);
}

/**
 * Assert that a file does not exist
 */
function expectFileNotExists(filePath) {
  expect(fs.existsSync(filePath)).toBe(false);
}

/**
 * Read and parse a JSON file
 */
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  createTestDir,
  cleanupTestDir,
  createMockBotData,
  createMockChatbot,
  wait,
  expectFileExists,
  expectFileNotExists,
  readJsonFile
};
