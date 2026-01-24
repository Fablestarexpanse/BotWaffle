const fs = require('fs');
const path = require('path');
const { STORAGE_DIRS } = require('./constants');
const { info: logInfo, error: logError } = require('./utils/logger');

// Base data directory - will be set when initializeStorage is called
// We run in "portable" mode: data is stored in a ./data folder
// next to the application, not in OS userData paths.
let DATA_DIR = null;

/**
 * Gets or initializes the data directory path
 * @returns {string} The data directory path
 */
function getDataDir() {
    if (!DATA_DIR) {
        try {
            const { app } = require('electron');
            // Prefer a portable-style data directory that lives alongside the app.
            // getAppPath() points at the application folder (dev: project root,
            // packaged: resources/app or similar), so "data" will be next to it.
            const baseDir = typeof app.getAppPath === 'function'
                ? app.getAppPath()
                : process.cwd();
            DATA_DIR = path.join(baseDir, 'data');
        } catch (error) {
            // Fallback for testing or if app is not available
            // Still keep data relative to the current working directory.
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

/**
 * Sanitizes a character name for use as a folder name
 * @param {string} name - Character name
 * @param {string} characterId - Character UUID (for uniqueness)
 * @returns {string} Sanitized folder name
 */
function sanitizeCharacterFolderName(name, characterId) {
    if (!name || typeof name !== 'string') {
        name = 'unnamed';
    }
    
    // Sanitize name: lowercase, replace invalid chars with hyphens
    let sanitizedName = name.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Ensure name is not empty
    if (!sanitizedName || sanitizedName.length === 0) {
        sanitizedName = 'unnamed';
    }
    
    // Limit length to prevent issues
    if (sanitizedName.length > 100) {
        sanitizedName = sanitizedName.substring(0, 100);
    }
    
    // Add short ID for uniqueness (first 8 chars of UUID)
    const shortId = characterId ? characterId.substring(0, 8) : '';
    return `${sanitizedName}-${shortId}`;
}

/**
 * Get the absolute path for a character's folder.
 * Uses character name for folder name (with ID suffix for uniqueness)
 * @param {string} characterId - Character UUID
 * @param {string} characterName - Character name (optional, will be looked up if not provided)
 * @returns {string} Absolute path to character folder
 */
function getCharacterPath(characterId, characterName = null) {
    if (!characterId || typeof characterId !== 'string') {
        throw new Error('Character ID is required');
    }
    // Validate ID format (basic UUID check)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(characterId)) {
        throw new Error('Invalid character ID format');
    }
    
    // If name not provided, use ID as fallback (for backward compatibility)
    const folderName = characterName 
        ? sanitizeCharacterFolderName(characterName, characterId)
        : characterId;
    
    return path.join(getDataDir(), 'characters', folderName);
}

/**
 * Get the absolute path for a character's subdirectory (images, scripts, etc.).
 * @param {string} characterId - Character UUID
 * @param {string} subdir - 'images', 'scripts', 'saved-chats', 'image-prompts'
 * @param {string} characterName - Character name (optional)
 * @returns {string} Absolute path
 */
function getCharacterSubPath(characterId, subdir, characterName = null) {
    const validSubdirs = ['images', 'scripts', 'saved-chats', 'image-prompts'];
    if (!validSubdirs.includes(subdir)) {
        throw new Error(`Invalid character subdirectory: ${subdir}`);
    }
    return path.join(getCharacterPath(characterId, characterName), subdir);
}

/**
 * Ensures a character's folder structure exists.
 * @param {string} characterId - Character UUID
 * @param {string} characterName - Character name (optional)
 * @returns {Promise<void>}
 */
async function ensureCharacterFolders(characterId, characterName = null) {
    const characterPath = getCharacterPath(characterId, characterName);
    const subdirs = ['images', 'scripts', 'saved-chats', 'image-prompts'];
    
    // Create character folder
    if (!fs.existsSync(characterPath)) {
        fs.mkdirSync(characterPath, { recursive: true });
    }
    
    // Create subdirectories
    for (const subdir of subdirs) {
        const subdirPath = path.join(characterPath, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
    }
}

/**
 * Finds a character folder by ID (searches all folders)
 * @param {string} characterId - Character UUID
 * @returns {Promise<string|null>} Folder path or null if not found
 */
async function findCharacterFolderById(characterId) {
    const fsPromises = require('fs').promises;
    const charactersPath = path.join(getDataDir(), 'characters');
    
    if (!fs.existsSync(charactersPath)) {
        return null;
    }
    
    try {
        const folders = await fsPromises.readdir(charactersPath, { withFileTypes: true });
        
        for (const folder of folders) {
            // Only process directories
            if (!folder.isDirectory()) {
                continue;
            }
            
            const folderPath = path.join(charactersPath, folder.name);
            const characterFilePath = path.join(folderPath, 'character.json');
            
            // Check if character.json exists
            if (!fs.existsSync(characterFilePath)) {
                continue;
            }
            
            try {
                const data = await fsPromises.readFile(characterFilePath, 'utf8');
                const character = JSON.parse(data);
                if (character.id === characterId) {
                    return folderPath;
                }
            } catch (parseError) {
                // Skip folders without valid character.json
                continue;
            }
        }
    } catch (error) {
        // Error reading directory
        const { error: logError } = require('./utils/logger');
        logError(`[Storage] Error finding character folder for ID ${characterId}`, error);
        return null;
    }
    
    return null;
}

module.exports = {
    initializeStorage,
    getDataPath,
    getDataDir,
    getCharacterPath,
    getCharacterSubPath,
    ensureCharacterFolders,
    findCharacterFolderById,
    sanitizeCharacterFolderName
};
