/**
 * Unit tests for security utilities
 */

const {
  escapeHtml,
  sanitizeInput,
  validateAndSanitizeId,
  validateJsonDepth,
  validatePath
} = require('../../src/core/utils/security');

describe('Security Utilities', () => {
  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(escapeHtml('Hello & World')).toBe('Hello &amp; World');
      expect(escapeHtml("It's a test")).toBe('It&#39;s a test');
      expect(escapeHtml('a < b > c')).toBe('a &lt; b &gt; c');
    });

    test('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    test('should handle non-string types', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(true)).toBe('true');
      expect(escapeHtml({})).toBe('[object Object]');
    });

    test('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    test('should remove null bytes', () => {
      expect(sanitizeInput('Hello\0World')).toBe('HelloWorld');
    });

    test('should remove control characters', () => {
      expect(sanitizeInput('Hello\x01\x02\x03World')).toBe('HelloWorld');
    });

    test('should preserve newlines by default', () => {
      const input = 'Line 1\nLine 2\r\nLine 3';
      expect(sanitizeInput(input)).toContain('\n');
    });

    test('should remove newlines when allowNewlines is false', () => {
      const input = 'Line 1\nLine 2\r\nLine 3';
      expect(sanitizeInput(input, { allowNewlines: false })).toBe('Line 1Line 2Line 3');
    });

    test('should limit length', () => {
      const longInput = 'a'.repeat(2000);
      expect(sanitizeInput(longInput, { maxLength: 100 }).length).toBe(100);
    });

    test('should trim input', () => {
      expect(sanitizeInput('  Hello World  ')).toBe('Hello World');
    });

    test('should handle non-string types', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(123)).toBe('');
    });
  });

  describe('validateAndSanitizeId', () => {
    test('should accept valid IDs', () => {
      expect(validateAndSanitizeId('valid-id')).toBe('valid-id');
      expect(validateAndSanitizeId('valid_id')).toBe('valid_id');
      expect(validateAndSanitizeId('valid-id-123')).toBe('valid-id-123');
      expect(validateAndSanitizeId('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('should sanitize dangerous characters', () => {
      expect(validateAndSanitizeId('test/id')).toBe('testid');
      expect(validateAndSanitizeId('test\\id')).toBe('testid');
      expect(validateAndSanitizeId('test..id')).toBe('testid');
      // Note: validateAndSanitizeId removes path separators, not script tags (that's escapeHtml's job)
      expect(validateAndSanitizeId('test<script>id')).toBe('testscriptid'); // Removes <>, keeps alphanumeric
      expect(validateAndSanitizeId('test@#$id')).toBe('testid'); // Removes special chars
    });

    test('should enforce length limits', () => {
      expect(validateAndSanitizeId('a')).toBe('a'); // Min length
      expect(validateAndSanitizeId('a'.repeat(200))).toBe('a'.repeat(200)); // Max length
      expect(validateAndSanitizeId('a'.repeat(201))).toBeNull(); // Too long
      expect(validateAndSanitizeId('')).toBeNull(); // Too short
    });

    test('should reject null and undefined', () => {
      expect(validateAndSanitizeId(null)).toBeNull();
      expect(validateAndSanitizeId(undefined)).toBeNull();
    });

    test('should reject non-string types', () => {
      expect(validateAndSanitizeId(123)).toBeNull();
      expect(validateAndSanitizeId({})).toBeNull();
    });

    test('should reject IDs with only dangerous characters', () => {
      expect(validateAndSanitizeId('../../../')).toBeNull();
      expect(validateAndSanitizeId('...///')).toBeNull();
    });
  });

  describe('validateJsonDepth', () => {
    test('should accept shallow objects', () => {
      const shallow = { a: 1, b: 2 };
      expect(validateJsonDepth(shallow)).toBe(true);
    });

    test('should accept arrays', () => {
      const array = [1, 2, 3];
      expect(validateJsonDepth(array)).toBe(true);
    });

    test('should accept nested objects within limit', () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'value'
              }
            }
          }
        }
      };
      expect(validateJsonDepth(nested, 10)).toBe(true);
    });

    test('should reject deeply nested objects', () => {
      let deep = {};
      let current = deep;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }
      expect(validateJsonDepth(deep, 10)).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(validateJsonDepth(null)).toBe(true);
      expect(validateJsonDepth(undefined)).toBe(true);
    });

    test('should handle primitives', () => {
      expect(validateJsonDepth('string')).toBe(true);
      expect(validateJsonDepth(123)).toBe(true);
      expect(validateJsonDepth(true)).toBe(true);
    });
  });

  describe('validatePath', () => {
    test('should accept valid paths within base', () => {
      const basePath = '/base/path';
      expect(validatePath('subdir/file.txt', basePath)).toBeTruthy();
      expect(validatePath('file.txt', basePath)).toBeTruthy();
    });

    test('should reject path traversal attempts', () => {
      const basePath = '/base/path';
      expect(validatePath('../../../etc/passwd', basePath)).toBeNull();
      expect(validatePath('../other/file.txt', basePath)).toBeNull();
      expect(validatePath('..\\other\\file.txt', basePath)).toBeNull();
    });

    test('should handle non-string inputs', () => {
      const basePath = '/base/path';
      expect(validatePath(null, basePath)).toBeNull();
      expect(validatePath(undefined, basePath)).toBeNull();
      expect(validatePath('file.txt', null)).toBeNull();
    });

    test('should handle absolute paths correctly', () => {
      const basePath = process.platform === 'win32' ? 'C:\\base\\path' : '/base/path';
      const result = validatePath('file.txt', basePath);
      // Should return a resolved path, not null
      expect(result).toBeTruthy();
    });
  });
});
