/**
 * Unit tests for chatbot-manager.js
 * Note: These tests require proper Electron mocking which can be complex.
 * For now, we'll test the core logic without file operations.
 */

const { validateChatbotProfile } = require('../../src/core/utils/validation');
const { validateAndSanitizeId } = require('../../src/core/utils/security');
const { createMockBotData, createMockChatbot } = require('../utils/test-helpers');

describe('ChatbotManager - Core Logic', () => {
  describe('Input Validation', () => {
    test('should validate chatbot profile data', () => {
      const botData = createMockBotData();
      const result = validateChatbotProfile(botData);
      
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe(botData.name);
    });

    test('should reject invalid profile data', () => {
      const invalidData = {
        // Missing required name
        displayName: 'Test Bot'
      };
      
      const result = validateChatbotProfile(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should sanitize profile data', () => {
      const botData = createMockBotData({
        name: '  Test Bot  ',
        description: 'Description with control chars\x01\x02\x03'
      });
      
      const result = validateChatbotProfile(botData);
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('Test Bot'); // Trimmed
      // Description should be sanitized - control characters removed
      expect(result.data.description).not.toContain('\x01');
      expect(result.data.description).toContain('Description');
    });
  });

  describe('ID Validation', () => {
    test('should validate and sanitize chatbot IDs', () => {
      const validId = 'test-bot-123';
      const sanitized = validateAndSanitizeId(validId);
      expect(sanitized).toBe(validId);
    });

    test('should reject invalid IDs', () => {
      const invalidIds = [
        '', // Empty string
        'a'.repeat(201), // Too long
        null,
        undefined
      ];
      
      invalidIds.forEach(id => {
        const result = validateAndSanitizeId(id);
        expect(result).toBeNull();
      });
    });
    
    test('should sanitize path traversal attempts in IDs', () => {
      // validateAndSanitizeId sanitizes dangerous chars rather than rejecting
      // This is correct behavior - removes path separators but allows the result
      const dangerousId = '../../../etc/passwd';
      const sanitized = validateAndSanitizeId(dangerousId);
      expect(sanitized).toBeTruthy(); // Not null - sanitized
      expect(sanitized).not.toContain('/'); // Path separators removed
      expect(sanitized).not.toContain('..'); // Dots removed
    });

    test('should sanitize dangerous characters from IDs', () => {
      const dangerousId = 'test/id\\name';
      const sanitized = validateAndSanitizeId(dangerousId);
      expect(sanitized).toBe('testidname'); // Path separators removed
    });
  });

  describe('Data Structure', () => {
    test('should create valid chatbot structure', () => {
      const botData = createMockBotData();
      const mockBot = createMockChatbot({ profile: botData });
      
      expect(mockBot).toBeDefined();
      expect(mockBot.id).toBeTruthy();
      expect(mockBot.profile).toBeDefined();
      expect(mockBot.profile.name).toBe(botData.name);
      expect(mockBot.metadata).toBeDefined();
      expect(mockBot.metadata.created).toBeTruthy();
      expect(mockBot.metadata.updated).toBeTruthy();
      expect(Array.isArray(mockBot.layout)).toBe(true);
    });

    test('should handle images and thumbnailIndex', () => {
      const botData = createMockBotData({
        images: ['image1.jpg', 'image2.jpg'],
        thumbnailIndex: 1
      });
      
      const mockBot = createMockChatbot({ profile: botData });
      expect(mockBot.profile.images).toEqual(['image1.jpg', 'image2.jpg']);
      expect(mockBot.profile.thumbnailIndex).toBe(1);
    });

    test('should have valid layout structure', () => {
      const mockBot = createMockChatbot();
      
      expect(Array.isArray(mockBot.layout)).toBe(true);
      expect(mockBot.layout.length).toBeGreaterThan(0);
      mockBot.layout.forEach(section => {
        expect(section.type).toBeTruthy();
        expect(section.id).toBeTruthy();
      });
    });
  });
});
