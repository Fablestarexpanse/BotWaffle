/**
 * Security utilities for input sanitization, HTML escaping, and validation
 * Provides protection against XSS attacks, path traversal, and other security vulnerabilities
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * NOTE: This is for Node.js context (main process). For browser context, use window.SecurityUtils.escapeHtml
 * @param {string|any} text - Text to escape
 * @returns {string} - Escaped HTML safe string
 */
function escapeHtml(text) {
    if (typeof text !== 'string') {
        // Handle null, undefined, numbers, objects, etc.
        if (text === null || text === undefined) {
            return '';
        }
        return String(text);
    }
    
    // Node.js compatible HTML escaping (no DOM required)
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sanitizes user input by removing dangerous characters and limiting length
 * @param {string} input - User input to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (default: 1000)
 * @param {boolean} options.allowNewlines - Allow newlines (default: true)
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }
    
    const {
        maxLength = 1000,
        allowNewlines = true
    } = options;
    
    let sanitized = input.trim();
    
    // Remove null bytes (can cause issues)
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove control characters (except newlines if allowed)
    // Control characters: \x00-\x1F and \x7F (DEL)
    if (allowNewlines) {
        // Allow newline (\x0A) and carriage return (\x0D)
        sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else {
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    // Limit length to prevent DoS
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

/**
 * Validates and sanitizes an ID to prevent path traversal and injection
 * @param {string} id - ID to validate
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function validateAndSanitizeId(id) {
    if (typeof id !== 'string') {
        return null;
    }
    
    // Allow UUID format: alphanumeric, hyphens (for UUIDs)
    // Also allow underscores for custom IDs
    // Remove any potentially dangerous characters (path separators, etc.)
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Must be 1-200 characters (UUIDs can be up to 36 chars, but allow more for custom IDs)
    if (sanitized.length < 1 || sanitized.length > 200) {
        return null;
    }
    
    // Reject if sanitization removed all characters (likely contained only dangerous chars)
    if (sanitized.length === 0) {
        return null;
    }
    
    // Additional check: reject if contains only dots or slashes (should be caught above, but extra safety)
    if (/^[.\/\\]+$/.test(id)) {
        return null;
    }
    
    return sanitized;
}

/**
 * Validates JSON structure to prevent deep nesting attacks
 * @param {any} data - Data to validate
 * @param {number} maxDepth - Maximum nesting depth (default: 10)
 * @returns {boolean} - True if valid, false if exceeds max depth
 */
function validateJsonDepth(data, maxDepth = 10) {
    function checkDepth(obj, currentDepth = 0) {
        if (currentDepth > maxDepth) {
            return false;
        }
        
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (!checkDepth(obj[key], currentDepth + 1)) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    return checkDepth(data);
}

/**
 * Validates a file path to prevent directory traversal
 * @param {string} filePath - Path to validate
 * @param {string} basePath - Base directory that path must be within
 * @returns {string|null} - Resolved path or null if invalid
 */
function validatePath(filePath, basePath) {
    if (typeof filePath !== 'string' || typeof basePath !== 'string') {
        return null;
    }
    
    const path = require('path');
    const resolvedBase = path.resolve(basePath);
    const resolvedPath = path.resolve(basePath, filePath);
    const relativePath = path.relative(resolvedBase, resolvedPath);
    
    // Ensure resolved path stays within base path (prevents traversal)
    const isInsideBase = relativePath === '' ||
        (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
    
    if (!isInsideBase) {
        return null;
    }
    
    return resolvedPath;
}

module.exports = {
    escapeHtml,
    sanitizeInput,
    validateAndSanitizeId,
    validateJsonDepth,
    validatePath
};
