const fs = require('fs');
const path = require('path');
const { STORAGE_DIRS } = require('./constants');
const { info: logInfo, error: logError } = require('./utils/logger');

// Base data directory - will be set when initializeStorage is called
// This allows app to be ready before we try to access app.getPath()
let DATA_DIR = null;

/**
 * Gets or initializes the data directory path
 * @returns {string} The data directory path
 */
function getDataDir() {
    if (!DATA_DIR) {
        try {
            const { app } = require('electron');
            DATA_DIR = path.join(app.getPath('userData'), 'data');
        } catch (error) {
            // Fallback for testing or if app is not available
            DATA_DIR = path.join(process.cwd(), 'data');
        }
    }
    return DATA_DIR;
}

// Subdirectories to initialize (from constants)
const REQUIRED_DIRS = STORAGE_DIRS;

/**
 * Ensures the data directory structure exists.
 */
function initializeStorage() {
    try {
        // Initialize DATA_DIR if not already set
        const dataDir = getDataDir();
        
        // Create base data dir
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Create subdirectories
        REQUIRED_DIRS.forEach(dir => {
            const dirPath = path.join(dataDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
        
        logInfo('Storage initialized', { path: dataDir });
        return true;
    } catch (error) {
        logError('Failed to initialize storage', error);
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
    return path.join(getDataDir(), subdir);
}

module.exports = {
    initializeStorage,
    getDataPath
};
