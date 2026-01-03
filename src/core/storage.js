const fs = require('fs');
const path = require('path');

// Base data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Subdirectories to initialize
const REQUIRED_DIRS = [
    'chatbots',
    'conversations',
    'templates',
    'config'
];

/**
 * Ensures the data directory structure exists.
 */
function initializeStorage() {
    try {
        // Create base data dir
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }

        // Create subdirectories
        REQUIRED_DIRS.forEach(dir => {
            const dirPath = path.join(DATA_DIR, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        });
        
        console.log('Storage initialized at:', DATA_DIR);
        return true;
    } catch (error) {
        console.error('Failed to initialize storage:', error);
        return false;
    }
}

/**
 * Get the absolute path for a data storage directory.
 * @param {string} subdir - 'chatbots', 'conversations', etc.
 * @returns {string} Absolute path
 */
function getDataPath(subdir) {
    if (!REQUIRED_DIRS.includes(subdir)) {
        throw new Error(`Invalid storage directory: ${subdir}`);
    }
    return path.join(DATA_DIR, subdir);
}

module.exports = {
    initializeStorage,
    getDataPath
};
