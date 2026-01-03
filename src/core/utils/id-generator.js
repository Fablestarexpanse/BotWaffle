const crypto = require('crypto');

/**
 * Generates a UUID v4 string.
 * @returns {string}
 */
function generateId() {
    return crypto.randomUUID();
}

module.exports = { generateId };
