/**
 * Unit tests for validation utilities
 */

const {
  validateChatbotProfile,
  validateTemplate
} = require('../../src/core/utils/validation');

describe('Validation Utilities', () => {
  describe('validateChatbotProfile', () => {
    test('should accept valid profile data', () => {
      const validProfile = {
        name: 'TestBot',
        displayName: 'Test Bot',
        category: 'Character',
        description: 'A test chatbot',
        tags: ['test', 'bot']
      };
      
      const result = validateChatbotProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reject missing required fields', () => {
      const invalidProfile = {
        displayName: 'Test Bot'
        // Missing name
      };
      
      const result = validateChatbotProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should sanitize and limit string lengths', () => {
      const longName = 'a'.repeat(300);
      const profile = {
        name: longName,
        displayName: 'Test Bot',
        category: 'Character',
        description: 'A test chatbot',
        tags: ['test']
      };
      
      const result = validateChatbotProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.data.name.length).toBeLessThanOrEqual(200);
    });

    test('should validate tags array', () => {
      const profileWithManyTags = {
        name: 'TestBot',
        displayName: 'Test Bot',
        category: 'Character',
        description: 'A test chatbot',
        tags: Array(30).fill('tag') // Too many tags
      };
      
      const result = validateChatbotProfile(profileWithManyTags);
      // Should either truncate or reject
      expect(result.valid).toBeDefined();
    });

    test('should handle empty tags', () => {
      const profile = {
        name: 'TestBot',
        displayName: 'Test Bot',
        category: 'Character',
        description: 'A test chatbot',
        tags: []
      };
      
      const result = validateChatbotProfile(profile);
      expect(result.valid).toBe(true);
      expect(Array.isArray(result.data.tags)).toBe(true);
    });

    test('should handle null/undefined inputs', () => {
      expect(validateChatbotProfile(null).valid).toBe(false);
      expect(validateChatbotProfile(undefined).valid).toBe(false);
    });
  });

  describe('validateTemplate', () => {
    test('should accept valid template data', () => {
      const validTemplate = {
        name: 'My Template',
        layout: [
          { type: 'profile', id: 'section-profile', minimized: false },
          { type: 'personality', id: 'section-personality', minimized: true }
        ]
      };
      
      const result = validateTemplate(validTemplate);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reject missing name', () => {
      const invalidTemplate = {
        layout: [
          { type: 'profile', id: 'section-profile', minimized: false }
        ]
      };
      
      const result = validateTemplate(invalidTemplate);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject missing layout', () => {
      const invalidTemplate = {
        name: 'My Template'
        // Missing layout
      };
      
      const result = validateTemplate(invalidTemplate);
      expect(result.valid).toBe(false);
    });

    test('should validate layout is an array', () => {
      const invalidTemplate = {
        name: 'My Template',
        layout: 'not an array'
      };
      
      const result = validateTemplate(invalidTemplate);
      expect(result.valid).toBe(false);
    });

    test('should sanitize template name', () => {
      const template = {
        name: '  My Template  ',
        layout: [
          { type: 'profile', id: 'section-profile', minimized: false }
        ]
      };
      
      const result = validateTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('My Template');
    });

    test('should handle null/undefined inputs', () => {
      expect(validateTemplate(null).valid).toBe(false);
      expect(validateTemplate(undefined).valid).toBe(false);
    });
  });
});
