const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getDataPath } = require('./storage');

class AssetManager {
    constructor() {
        this.basePath = getDataPath('assets');
        // Ensure directory exists (async initialization will be done on first use)
        this._ensureDirectory();
    }

    async _ensureDirectory() {
        try {
            await fsPromises.mkdir(this.basePath, { recursive: true });
        } catch (error) {
            // Directory might already exist, ignore error
        }
    }

    /**
     * Copies a file from source to the assets directory.
     * @param {string} sourcePath - Full path to the source file
     * @returns {Promise<string>} - The new persistent path (file:// protocol for renderer)
     */
    async saveAsset(sourcePath) {
        try {
            await this._ensureDirectory();
            
            // Check if source file exists
            try {
                await fsPromises.access(sourcePath);
            } catch (error) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            const ext = path.extname(sourcePath);
            const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
            const destPath = path.join(this.basePath, filename);

            await fsPromises.copyFile(sourcePath, destPath);

            // Return absolute path formatted for Electron usage
            // Or relative path if we want to be portable?
            // Absolute is safer for local app rendering right now.
            return destPath.replace(/\\/g, '/');
        } catch (error) {
            console.error('Error saving asset:', error);
            throw new Error(`Failed to save asset: ${error.message}`);
        }
    }
}

module.exports = new AssetManager();
