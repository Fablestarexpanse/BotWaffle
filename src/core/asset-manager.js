const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getCharacterSubPath, ensureCharacterFolders, findCharacterFolderById } = require('./storage');
const { error: logError } = require('./utils/logger');

class AssetManager {
    constructor() {
        // Legacy basePath kept for migration compatibility
        // New assets go to character-specific folders
    }

    /**
     * Copies a file from source to the character's images directory.
     * @param {string} sourcePath - Full path to the source file
     * @param {string} characterId - Character UUID
     * @param {string} characterName - Character name (optional, will be looked up if not provided)
     * @returns {Promise<string>} - The new persistent path (absolute path)
     */
    async saveAsset(sourcePath, characterId, characterName = null) {
        if (!characterId) {
            throw new Error('Character ID is required to save asset');
        }

        try {
            // Get character name if not provided (from existing folder or cache)
            if (!characterName) {
                const existingFolder = await findCharacterFolderById(characterId);
                if (existingFolder) {
                    try {
                        const characterFilePath = path.join(existingFolder, 'character.json');
                        const data = await fsPromises.readFile(characterFilePath, 'utf8');
                        const character = JSON.parse(data);
                        characterName = character.profile?.name || null;
                    } catch {
                        // Couldn't read, will use ID-based path
                    }
                }
            }

            // Ensure character folder structure exists (with name if available)
            await ensureCharacterFolders(characterId, characterName);
            
            // Check if source file exists
            try {
                await fsPromises.access(sourcePath);
            } catch (error) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            const ext = path.extname(sourcePath);
            const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
            
            // Find existing folder or use name-based path
            let imagesPath;
            const existingFolder = await findCharacterFolderById(characterId);
            if (existingFolder) {
                imagesPath = path.join(existingFolder, 'images');
            } else {
                imagesPath = getCharacterSubPath(characterId, 'images', characterName);
            }
            
            const destPath = path.join(imagesPath, filename);

            await fsPromises.copyFile(sourcePath, destPath);

            // Return absolute path formatted for Electron usage
            return destPath.replace(/\\/g, '/');
        } catch (error) {
            logError('Error saving asset', error);
            throw new Error(`Failed to save asset: ${error.message}`);
        }
    }

    /**
     * Legacy method for migration - saves to old assets folder
     * @deprecated Use saveAsset(sourcePath, characterId) instead
     * @param {string} sourcePath - Full path to the source file
     * @returns {Promise<string>} - The new persistent path
     */
    async saveAssetLegacy(sourcePath) {
        const { getDataPath } = require('./storage');
        const basePath = getDataPath('assets');
        
        try {
            await fsPromises.mkdir(basePath, { recursive: true });
            
            try {
                await fsPromises.access(sourcePath);
            } catch (error) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            const ext = path.extname(sourcePath);
            const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
            const destPath = path.join(basePath, filename);

            await fsPromises.copyFile(sourcePath, destPath);
            return destPath.replace(/\\/g, '/');
        } catch (error) {
            logError('Error saving asset (legacy)', error);
            throw new Error(`Failed to save asset: ${error.message}`);
        }
    }
}

// Export class for dependency injection
module.exports = AssetManager;
