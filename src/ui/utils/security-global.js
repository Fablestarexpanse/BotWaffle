/**
 * Global security utilities for XSS prevention
 * Must be loaded before any components that use window.SecurityUtils
 * This file creates the global SecurityUtils object for compatibility with existing code
 */

// Global security utilities for XSS prevention
window.SecurityUtils = {
    /**
     * Escapes HTML special characters to prevent XSS attacks
     * @param {string|any} text - Text to escape
     * @returns {string} - Escaped HTML safe string
     */
    escapeHtml: function(text) {
        if (typeof text !== 'string') {
            if (text === null || text === undefined) return '';
            return String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Sanitizes user input by removing dangerous characters
     * @param {string} input - User input to sanitize
     * @param {Object} options - Options object
     * @param {number} options.maxLength - Maximum length (default: 1000)
     * @returns {string} - Sanitized input
     */
    sanitizeInput: function(input, options) {
        if (typeof input !== 'string') return '';
        options = options || {};
        const maxLength = options.maxLength || 1000;
        
        let sanitized = input.trim();
        sanitized = sanitized.replace(/\0/g, ''); // Remove null bytes
        sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
        
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        return sanitized;
    }
};
