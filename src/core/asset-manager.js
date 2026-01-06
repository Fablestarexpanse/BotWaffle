const fs = require('fs');
const path = require('path');
const { getDataPath } = require('./storage');

class AssetManager {
    constructor() {
        this.basePath = getDataPath('assets');
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    /**
     * Copies a file from source to the assets directory.
     * @param {string} sourcePath - Full path to the source file
     * @returns {string} - The new persistent path (file:// protocol for renderer)
     */
    saveAsset(sourcePath) {
        try {
            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            const ext = path.extname(sourcePath);
            const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
            const destPath = path.join(this.basePath, filename);

            fs.copyFileSync(sourcePath, destPath);

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
