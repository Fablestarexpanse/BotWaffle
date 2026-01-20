/**
 * Migration Script: Reorganize data into per-character folders
 * 
 * This script migrates from the old structure:
 *   data/chatbots/*.json
 *   data/assets/*.jpg
 * 
 * To the new structure:
 *   data/characters/{id}/
 *     character.json
 *     images/
 *       *.jpg
 *     scripts/
 *     saved-chats/
 *     image-prompts/
 * 
 * Run this once when upgrading to the new storage structure.
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { getDataPath, getDataDir, getCharacterPath, ensureCharacterFolders } = require('../storage');
const { info, error: logError } = require('../utils/logger');

/**
 * Main migration function
 */
async function migrateToCharacterFolders() {
    const dataDir = getDataDir();
    const chatbotsPath = getDataPath('chatbots');
    const assetsPath = getDataPath('assets');
    const charactersPath = getDataPath('characters');

    info('[Migration] Starting migration to character folders...');

    try {
        // Ensure characters directory exists
        if (!fs.existsSync(charactersPath)) {
            fs.mkdirSync(charactersPath, { recursive: true });
            info('[Migration] Created characters directory');
        }

        // Step 1: Migrate chatbot JSON files
        let migratedCount = 0;
        let errorCount = 0;

        if (fs.existsSync(chatbotsPath)) {
            const files = await fsPromises.readdir(chatbotsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            info(`[Migration] Found ${jsonFiles.length} chatbot files to migrate`);

            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(chatbotsPath, file);
                    const data = await fsPromises.readFile(filePath, 'utf8');
                    const chatbot = JSON.parse(data);

                    if (!chatbot.id) {
                        info(`[Migration] Skipping ${file} - no ID found`);
                        continue;
                    }

                    // Get character name for folder
                    const characterName = chatbot.profile?.name || null;
                    
                    // Ensure character folder exists (with name)
                    await ensureCharacterFolders(chatbot.id, characterName);

                    // Save to new location (using name-based folder)
                    const characterFilePath = path.join(getCharacterPath(chatbot.id, characterName), 'character.json');
                    await fsPromises.writeFile(characterFilePath, JSON.stringify(chatbot, null, 2), 'utf8');

                    info(`[Migration] Migrated chatbot: ${characterName || chatbot.id} (${chatbot.id})`);
                    migratedCount++;

                    // Step 2: Migrate images for this character and update paths
                    const images = chatbot.profile?.images || [];
                    const updatedImages = [];
                    let imageMigratedCount = 0;

                    if (images.length > 0 && fs.existsSync(assetsPath)) {
                        const imagesDir = path.join(getCharacterPath(chatbot.id, characterName), 'images');

                        for (const imagePath of images) {
                            try {
                                // Check if it's a URL (keep as-is)
                                if (!imagePath || 
                                    imagePath.startsWith('http://') || 
                                    imagePath.startsWith('https://') ||
                                    imagePath.startsWith('file://')) {
                                    updatedImages.push(imagePath);
                                    continue;
                                }

                                // Extract filename from path
                                const filename = path.basename(imagePath);
                                const sourcePath = path.join(assetsPath, filename);
                                
                                // Check if file exists in assets folder
                                if (fs.existsSync(sourcePath)) {
                                    const destPath = path.join(imagesDir, filename);
                                    
                                    // Only copy if destination doesn't exist
                                    if (!fs.existsSync(destPath)) {
                                        await fsPromises.copyFile(sourcePath, destPath);
                                        imageMigratedCount++;
                                    }
                                    
                                    // Update path to new location (absolute path)
                                    updatedImages.push(destPath.replace(/\\/g, '/'));
                                } else {
                                    // File doesn't exist in assets, keep original path
                                    updatedImages.push(imagePath);
                                }
                            } catch (error) {
                                logError(`[Migration] Error migrating image ${imagePath}`, error);
                                // Keep original path on error
                                updatedImages.push(imagePath);
                            }
                        }

                        // Update chatbot data with new image paths
                        if (imageMigratedCount > 0 || updatedImages.length !== images.length) {
                            chatbot.profile.images = updatedImages;
                            if (chatbot.profile.image && updatedImages.length > 0) {
                                chatbot.profile.image = updatedImages[0];
                            }
                            
                            // Re-save with updated paths (using name-based folder)
                            const characterFilePath = path.join(getCharacterPath(chatbot.id, characterName), 'character.json');
                            await fsPromises.writeFile(characterFilePath, JSON.stringify(chatbot, null, 2), 'utf8');
                            
                            info(`[Migration] Updated image paths for ${chatbot.profile?.name || chatbot.id}`);
                        }

                        if (imageMigratedCount > 0) {
                            info(`[Migration] Migrated ${imageMigratedCount} images for ${chatbot.profile?.name || chatbot.id}`);
                        }
                    }
                } catch (error) {
                    logError(`[Migration] Error migrating ${file}`, error);
                    errorCount++;
                }
            }
        } else {
            info('[Migration] No chatbots directory found - nothing to migrate');
        }

        info(`[Migration] Migration complete! Migrated ${migratedCount} chatbots, ${errorCount} errors`);

        return {
            success: true,
            migrated: migratedCount,
            errors: errorCount
        };
    } catch (error) {
        logError('[Migration] Fatal error during migration', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if migration is needed
 */
async function isMigrationNeeded() {
    const chatbotsPath = getDataPath('chatbots');
    const charactersPath = getDataPath('characters');

    // Migration needed if:
    // 1. Old chatbots folder exists and has files
    // 2. New characters folder doesn't exist or is empty
    if (fs.existsSync(chatbotsPath)) {
        try {
            const files = await fsPromises.readdir(chatbotsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            if (jsonFiles.length > 0) {
                // Check if characters folder exists and has content
                if (!fs.existsSync(charactersPath)) {
                    return true; // Migration needed
                }
                
                const characterDirs = await fsPromises.readdir(charactersPath);
                // If we have old files but no new character folders, migration needed
                if (characterDirs.length === 0) {
                    return true;
                }
            }
        } catch (error) {
            // If we can't read, assume migration might be needed
            return true;
        }
    }

    return false; // No migration needed
}

module.exports = {
    migrateToCharacterFolders,
    isMigrationNeeded
};
