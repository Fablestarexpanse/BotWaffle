/**
 * Security utilities for UI components (renderer process)
 * Provides HTML escaping and input sanitization for browser context
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Works in browser/renderer context
 * @param {string|any} text - Text to escape
 * @returns {string} - Escaped HTML safe string
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') {
        // Handle null, undefined, numbers, objects, etc.
        if (text === null || text === undefined) {
            return '';
        }
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitizes user input by removing dangerous characters and limiting length
 * @param {string} input - User input to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (default: 1000)
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }
    
    const {
        maxLength = 1000
    } = options;
    
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove control characters (except newlines)
    sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}
