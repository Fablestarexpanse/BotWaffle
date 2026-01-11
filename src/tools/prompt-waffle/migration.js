/**
 * Migration Utility for PromptWaffle Storage
 * Migrates user data files from __dirname to userData directory
 */

const fs = require('fs');
const path = require('path');
const { getPromptWaffleDataDir, getPromptWaffleDataPath, getOldDataPaths, PROMPT_WAFFLE_DIRS } = require('./storage');

/**
 * Copies a directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @returns {Promise<boolean>} Success status
 */
async function copyDirectory(src, dest) {
    try {
        // Create destination directory
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        // Read source directory
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                // Recursively copy subdirectory
                await copyDirectory(srcPath, destPath);
            } else {
                // Copy file
                fs.copyFileSync(srcPath, destPath);
            }
        }

        return true;
    } catch (error) {
        console.error(`[Migration] Error copying directory ${src} to ${dest}:`, error);
        return false;
    }
}

/**
 * Checks if old data directories exist and have content
 * @param {string} baseDir - Base directory (__dirname from main.js)
 * @returns {Promise<Object>} Object with migration status for each directory
 */
async function checkOldData(baseDir) {
    const oldPaths = getOldDataPaths(baseDir);
    const status = {};

    for (const dir of PROMPT_WAFFLE_DIRS) {
        const oldPath = oldPaths[dir];
        const exists = fs.existsSync(oldPath);
        let hasContent = false;

        if (exists) {
            try {
                const entries = fs.readdirSync(oldPath);
                // Consider it has content if it has files (not just empty subdirectories)
                hasContent = entries.some(entry => {
                    const entryPath = path.join(oldPath, entry);
                    return fs.statSync(entryPath).isFile();
                }) || entries.length > 0;
            } catch (error) {
                console.error(`[Migration] Error checking ${oldPath}:`, error);
            }
        }

        status[dir] = { exists, hasContent, path: oldPath };
    }

    return status;
}

/**
 * Migrates data from old location to new location
 * @param {string} baseDir - Base directory (__dirname from main.js)
 * @returns {Promise<Object>} Migration results
 */
async function migratePromptWaffleData(baseDir) {
    const results = {
        migrated: [],
        skipped: [],
        errors: [],
        alreadyMigrated: true
    };

    try {
        // Check if migration is needed
        const oldDataStatus = await checkOldData(baseDir);
        
        // Check if any old data exists
        const hasOldData = Object.values(oldDataStatus).some(status => status.hasContent);
        
        if (!hasOldData) {
            console.log('[Migration] No old data found, migration not needed');
            return results;
        }

        results.alreadyMigrated = false;

        // Check if new location already has data
        const newDataDir = getPromptWaffleDataDir();
        let newLocationHasData = false;
        
        for (const dir of PROMPT_WAFFLE_DIRS) {
            const newPath = getPromptWaffleDataPath(dir);
            if (fs.existsSync(newPath)) {
                const entries = fs.readdirSync(newPath);
                if (entries.length > 0) {
                    newLocationHasData = true;
                    break;
                }
            }
        }

        // If new location already has data, don't overwrite
        if (newLocationHasData) {
            console.log('[Migration] New location already has data, skipping migration');
            results.alreadyMigrated = true;
            return results;
        }

        // Perform migration
        const oldPaths = getOldDataPaths(baseDir);

        for (const dir of PROMPT_WAFFLE_DIRS) {
            const oldPath = oldPaths[dir];
            const newPath = getPromptWaffleDataPath(dir);
            const status = oldDataStatus[dir];

            if (status.hasContent) {
                try {
                    console.log(`[Migration] Migrating ${dir} from ${oldPath} to ${newPath}`);
                    const success = await copyDirectory(oldPath, newPath);
                    
                    if (success) {
                        results.migrated.push(dir);
                        console.log(`[Migration] Successfully migrated ${dir}`);
                    } else {
                        results.errors.push({ dir, error: 'Copy failed' });
                    }
                } catch (error) {
                    console.error(`[Migration] Error migrating ${dir}:`, error);
                    results.errors.push({ dir, error: error.message });
                }
            } else {
                results.skipped.push(dir);
            }
        }

        return results;
    } catch (error) {
        console.error('[Migration] Migration error:', error);
        results.errors.push({ dir: 'general', error: error.message });
        return results;
    }
}

module.exports = {
    migratePromptWaffleData,
    checkOldData
};
