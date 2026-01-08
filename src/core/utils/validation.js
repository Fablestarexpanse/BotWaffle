/**
 * Validation utilities for chatbot and template data
 * Ensures data integrity and prevents invalid input
 */

const { sanitizeInput, validateJsonDepth } = require('./security');
const {
    CHATBOT_CATEGORIES,
    MAX_NAME_LENGTH,
    MAX_DISPLAY_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MAX_TAG_LENGTH,
    MAX_TAGS,
    MAX_IMAGES,
    MAX_LAYOUT_SECTIONS,
    MAX_JSON_DEPTH,
    DEFAULT_CATEGORY
} = require('../constants');

/**
 * Validates chatbot profile data
 * @param {Object} data - Profile data to validate
 * @returns {{valid: boolean, errors: string[], data: Object}} - Validation result
 */
function validateChatbotProfile(data) {
    // Handle null/undefined input
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            errors: ['Profile data is required and must be an object'],
            data: null
        };
    }
    
    const errors = [];
    const sanitized = {};
    
    // Validate name (required)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Name is required');
    } else {
        sanitized.name = sanitizeInput(data.name, { maxLength: 100 });
        if (sanitized.name.length === 0) {
            errors.push('Name cannot be empty after sanitization');
        }
    }
    
    // Validate displayName (optional)
    if (data.displayName) {
        if (typeof data.displayName !== 'string') {
            errors.push('Display name must be a string');
        } else {
            sanitized.displayName = sanitizeInput(data.displayName, { maxLength: MAX_DISPLAY_NAME_LENGTH });
        }
    }
    
    // Validate description (optional)
    if (data.description) {
        if (typeof data.description !== 'string') {
            errors.push('Description must be a string');
        } else {
            sanitized.description = sanitizeInput(data.description, { maxLength: MAX_DESCRIPTION_LENGTH, allowNewlines: true });
        }
    }
    
    // Validate category
    if (data.category) {
        if (CHATBOT_CATEGORIES.includes(data.category)) {
            sanitized.category = data.category;
        } else {
            errors.push(`Category must be one of: ${CHATBOT_CATEGORIES.join(', ')}`);
            sanitized.category = DEFAULT_CATEGORY; // Default fallback
        }
    } else {
        sanitized.category = DEFAULT_CATEGORY; // Default
    }
    
    // Validate tags
    if (data.tags) {
        if (Array.isArray(data.tags)) {
            sanitized.tags = data.tags
                .filter(tag => typeof tag === 'string')
                .map(tag => sanitizeInput(tag, { maxLength: MAX_TAG_LENGTH, allowNewlines: false }))
                .filter(tag => tag.length > 0)
                .slice(0, MAX_TAGS); // Limit to MAX_TAGS tags
        } else {
            errors.push('Tags must be an array');
            sanitized.tags = [];
        }
    } else {
        sanitized.tags = [];
    }
    
    // Validate images array
    if (data.images) {
        if (Array.isArray(data.images)) {
            sanitized.images = data.images
                .filter(img => typeof img === 'string')
                .slice(0, MAX_IMAGES); // Limit to MAX_IMAGES images
        } else {
            errors.push('Images must be an array');
            sanitized.images = [];
        }
    } else {
        sanitized.images = data.image ? [data.image] : [];
    }
    
    // Validate thumbnailIndex
    if (typeof data.thumbnailIndex === 'number') {
        if (data.thumbnailIndex >= -1 && data.thumbnailIndex < sanitized.images.length) {
            sanitized.thumbnailIndex = data.thumbnailIndex;
        } else {
            sanitized.thumbnailIndex = sanitized.images.length > 0 ? 0 : -1;
        }
    } else {
        sanitized.thumbnailIndex = sanitized.images.length > 0 ? 0 : -1;
    }
    
    // Validate layout if provided
    if (data.layout) {
        if (Array.isArray(data.layout)) {
            // Validate JSON depth to prevent deep nesting attacks
            if (!validateJsonDepth(data.layout, MAX_JSON_DEPTH)) {
                errors.push('Layout structure is too deeply nested');
                sanitized.layout = [
                    { type: 'profile', id: 'section-profile', minimized: false },
                    { type: 'personality', id: 'section-personality', minimized: true }
                ];
            } else {
                sanitized.layout = data.layout.slice(0, MAX_LAYOUT_SECTIONS); // Limit to MAX_LAYOUT_SECTIONS sections
            }
        } else {
            errors.push('Layout must be an array');
            sanitized.layout = [
                { type: 'profile', id: 'section-profile', minimized: false },
                { type: 'personality', id: 'section-personality', minimized: true }
            ];
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        data: sanitized
    };
}

/**
 * Validates template data
 * @param {Object} data - Template data to validate
 * @returns {{valid: boolean, errors: string[], data: Object}} - Validation result
 */
function validateTemplate(data) {
    // Handle null/undefined input
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            errors: ['Template data is required and must be an object'],
            data: null
        };
    }
    
    const errors = [];
    const sanitized = {};
    
    // Validate name
    if (!data.name || typeof data.name !== 'string') {
        errors.push('Template name is required');
    } else {
        sanitized.name = sanitizeInput(data.name, { maxLength: 100 });
        if (sanitized.name.length === 0) {
            errors.push('Template name cannot be empty');
        }
    }
    
    // Validate layout
    if (!data.layout) {
        errors.push('Layout is required');
        sanitized.layout = [];
    } else if (!Array.isArray(data.layout)) {
        errors.push('Layout must be an array');
        sanitized.layout = [];
    } else {
        // Validate JSON depth
        if (!validateJsonDepth(data.layout, 10)) {
            errors.push('Layout structure is too deeply nested');
            sanitized.layout = [];
        } else {
            sanitized.layout = data.layout.slice(0, MAX_LAYOUT_SECTIONS); // Limit to MAX_LAYOUT_SECTIONS sections
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        data: sanitized
    };
}

module.exports = {
    validateChatbotProfile,
    validateTemplate
};
