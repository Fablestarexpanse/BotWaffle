/**
 * PromptWaffle Storage Utility
 * Manages file paths for user data files (snippets, boards, wildcards, profiles)
 * Uses Electron's userData directory for data persistence
 */

const fs = require('fs');
const path = require('path');

// Base data directory - will be set when initializePromptWaffleStorage is called
let PROMPT_WAFFLE_DATA_DIR = null;

/**
 * Gets or initializes the PromptWaffle data directory path
 * @returns {string} The data directory path
 */
function getPromptWaffleDataDir() {
    if (!PROMPT_WAFFLE_DATA_DIR) {
        try {
            const { app } = require('electron');
            const botWaffleDataDir = path.join(app.getPath('userData'), 'data');
            PROMPT_WAFFLE_DATA_DIR = path.join(botWaffleDataDir, 'prompt-waffle');
        } catch (error) {
            // Fallback for testing or if app is not available
            const fallbackDataDir = path.join(process.cwd(), 'data', 'prompt-waffle');
            PROMPT_WAFFLE_DATA_DIR = fallbackDataDir;
        }
    }
    return PROMPT_WAFFLE_DATA_DIR;
}

/**
 * Subdirectories for PromptWaffle data
 */
const PROMPT_WAFFLE_DIRS = [
    'snippets',
    'boards',
    'wildcards',
    'profiles',
    'exports'
];

/**
 * Ensures the PromptWaffle data directory structure exists
 */
function initializePromptWaffleStorage() {
    try {
        const dataDir = getPromptWaffleDataDir();
        
        // Create base data dir
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Create subdirectories
        PROMPT_WAFFLE_DIRS.forEach(dir => {
            const dirPath = path.join(dataDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
        
        return true;
    } catch (error) {
        console.error('[PromptWaffle Storage] Failed to initialize storage:', error);
        return false;
    }
}

/**
 * Get the absolute path for a PromptWaffle data subdirectory
 * @param {string} subdir - 'snippets', 'boards', 'wildcards', 'profiles', 'exports'
 * @returns {string} Absolute path
 */
function getPromptWaffleDataPath(subdir) {
    if (!PROMPT_WAFFLE_DIRS.includes(subdir)) {
        throw new Error(`Invalid PromptWaffle storage directory: ${subdir}`);
    }
    return path.join(getPromptWaffleDataDir(), subdir);
}

/**
 * Get the old data directory path (for migration)
 * @param {string} baseDir - The base directory (usually __dirname from main.js)
 * @returns {Object} Object with old paths for migration
 */
function getOldDataPaths(baseDir) {
    return {
        snippets: path.join(baseDir, 'snippets'),
        boards: path.join(baseDir, 'boards'),
        wildcards: path.join(baseDir, 'wildcards'),
        profiles: path.join(baseDir, 'profiles'),
        exports: path.join(baseDir, 'exports')
    };
}

/**
 * Resolves a relative path to an absolute path in PromptWaffle data directory
 * Handles paths like "snippets/...", "boards/...", etc.
 * @param {string} relativePath - Relative path (e.g., "snippets/myfile.json")
 * @returns {string} Absolute path
 */
function resolvePromptWafflePath(relativePath) {
    const dataDir = getPromptWaffleDataDir();
    
    // If path starts with one of our data directories, resolve relative to dataDir
    for (const dir of PROMPT_WAFFLE_DIRS) {
        if (relativePath.startsWith(dir + '/') || relativePath === dir) {
            return path.join(dataDir, relativePath);
        }
    }
    
    // Default to snippets if no prefix (backwards compatibility)
    return path.join(dataDir, 'snippets', relativePath);
}

/**
 * Validates that a path is within the PromptWaffle data directory
 * @param {string} filePath - Absolute file path to validate
 * @returns {boolean} True if path is valid (within data directory)
 */
function validatePromptWafflePath(filePath) {
    try {
        const dataDir = getPromptWaffleDataDir();
        const resolvedPath = path.resolve(filePath);
        const resolvedDataDir = path.resolve(dataDir);
        
        // Check if path is within data directory
        return resolvedPath.startsWith(resolvedDataDir + path.sep) || resolvedPath === resolvedDataDir;
    } catch (error) {
        return false;
    }
}

module.exports = {
    initializePromptWaffleStorage,
    getPromptWaffleDataPath,
    getPromptWaffleDataDir,
    getOldDataPaths,
    resolvePromptWafflePath,
    validatePromptWafflePath,
    PROMPT_WAFFLE_DIRS
};
