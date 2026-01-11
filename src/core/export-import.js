/**
 * BotWaffle Export/Import Utilities
 * Handles exporting and importing all BotWaffle user data
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { getDataPath, getDataDir } = require('./storage');
const { info, error: logError } = require('./utils/logger');
const { app, dialog } = require('electron');

/**
 * Helper function to copy directory recursively
 */
async function copyDirectory(src, dest) {
    try {
        if (!fsSync.existsSync(dest)) {
            fsSync.mkdirSync(dest, { recursive: true });
        }

        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }

        return true;
    } catch (error) {
        logError('Error copying directory', error);
        return false;
    }
}

/**
 * Export all BotWaffle data to a ZIP file
 * @returns {Promise<Object>} Export result
 */
async function exportBotWaffleData() {
    try {
        const zip = new AdmZip();
        const dataDir = getDataDir();
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const zipFilename = `BotWaffle_Backup_${timestamp}.zip`;

        // Folders to export (excluding prompt-waffle as it has its own export)
        const foldersToExport = ['chatbots', 'conversations', 'templates', 'assets'];

        for (const folder of foldersToExport) {
            const folderPath = getDataPath(folder);
            try {
                await fs.access(folderPath);
                zip.addLocalFolder(folderPath, folder);
                info(`[Export] Added folder: ${folder}`);
            } catch (error) {
                // Folder doesn't exist, skip it
                info(`[Export] Skipping non-existent folder: ${folder}`);
            }
        }

        // Create export manifest
        const manifest = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            appVersion: app.getVersion(),
            folders: []
        };

        // Check which folders actually exist
        for (const folder of foldersToExport) {
            try {
                const folderPath = getDataPath(folder);
                await fs.access(folderPath);
                manifest.folders.push(folder);
            } catch {
                // Skip non-existent folders
            }
        }

        zip.addFile('export_manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

        // Show save dialog
        const result = await dialog.showSaveDialog({
            title: 'Export BotWaffle Data',
            defaultPath: zipFilename,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
        });

        if (result.canceled) {
            return { success: false, cancelled: true };
        }

        // Write ZIP file
        zip.writeZip(result.filePath);
        info(`[Export] Data exported to: ${result.filePath}`);

        return {
            success: true,
            filePath: result.filePath,
            filename: path.basename(result.filePath)
        };
    } catch (error) {
        logError('[Export] Error exporting data', error);
        return { success: false, error: error.message || 'Failed to export data' };
    }
}

/**
 * Import BotWaffle data from a ZIP file
 * @returns {Promise<Object>} Import result
 */
async function importBotWaffleData() {
    try {
        // Show open dialog
        const result = await dialog.showOpenDialog({
            title: 'Import BotWaffle Data',
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
            properties: ['openFile']
        });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }

        const zipPath = result.filePaths[0];
        const zip = new AdmZip(zipPath);
        const dataDir = getDataDir();

        // Validate manifest if present
        const zipEntries = zip.getEntries();
        const manifestEntry = zipEntries.find(e => e.entryName === 'export_manifest.json');
        if (manifestEntry) {
            try {
                const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
                info('[Import] Importing backup from:', manifest.exportDate);
            } catch (e) {
                info('[Import] Could not parse manifest:', e);
            }
        }

        // Backup current data before import
        const backupDir = path.join(dataDir, '..', 'backup_before_import_' + Date.now());
        try {
            await fs.mkdir(backupDir, { recursive: true });
            const foldersToBackup = ['chatbots', 'conversations', 'templates', 'assets'];
            for (const folder of foldersToBackup) {
                const folderPath = getDataPath(folder);
                try {
                    await fs.access(folderPath);
                    await copyDirectory(folderPath, path.join(backupDir, folder));
                    info(`[Import] Backed up: ${folder}`);
                } catch (e) {
                    // Folder doesn't exist, skip
                    info(`[Import] Skipping non-existent folder: ${folder}`);
                }
            }
            info(`[Import] Current data backed up to: ${backupDir}`);
        } catch (backupError) {
            logError('[Import] Failed to backup current data', backupError);
        }

        // Extract ZIP to data directory
        zip.extractAllTo(dataDir, true); // Overwrite existing files

        info('[Import] Data imported successfully');

        return {
            success: true,
            backupLocation: backupDir
        };
    } catch (error) {
        logError('[Import] Error importing data', error);
        return { success: false, error: error.message || 'Failed to import data' };
    }
}

/**
 * Verify a backup ZIP file
 * @param {string} zipPath - Path to ZIP file
 * @returns {Promise<Object>} Verification result
 */
async function verifyBotWaffleBackup(zipPath) {
    try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        const issues = [];
        const warnings = [];
        const summary = {
            chatbots: 0,
            conversations: 0,
            templates: 0,
            assets: 0
        };

        // Check for required folders
        const requiredFolders = ['chatbots'];
        const foundFolders = new Set();

        for (const entry of zipEntries) {
            const entryPath = entry.entryName.split('/');
            if (entryPath.length > 0 && entryPath[0]) {
                foundFolders.add(entryPath[0]);
            }

            // Count files by type
            if (entry.entryName.startsWith('chatbots/') && entry.entryName.endsWith('.json')) {
                summary.chatbots++;
            } else if (entry.entryName.startsWith('conversations/') && entry.entryName.endsWith('.json')) {
                summary.conversations++;
            } else if (entry.entryName.startsWith('templates/') && entry.entryName.endsWith('.json')) {
                summary.templates++;
            } else if (entry.entryName.startsWith('assets/')) {
                summary.assets++;
            }
        }

        // Check for required folders
        for (const folder of requiredFolders) {
            if (!foundFolders.has(folder)) {
                issues.push(`Missing required folder: ${folder}`);
            }
        }

        // Validate manifest if present
        const manifestEntry = zipEntries.find(e => e.entryName === 'export_manifest.json');
        if (!manifestEntry) {
            warnings.push('No export manifest found (backup may be from older version)');
        } else {
            try {
                const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
                if (!manifest.version || !manifest.exportDate) {
                    warnings.push('Manifest is missing required fields');
                }
            } catch (e) {
                issues.push('Manifest is corrupted or invalid');
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            warnings,
            summary
        };
    } catch (error) {
        logError('[Verify] Error verifying backup', error);
        return {
            valid: false,
            issues: [error.message || 'Failed to verify backup'],
            warnings: [],
            summary: {}
        };
    }
}

module.exports = {
    exportBotWaffleData,
    importBotWaffleData,
    verifyBotWaffleBackup
};
