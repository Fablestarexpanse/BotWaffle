const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initializeStorage } = require('./src/core/storage');
const { initializeServices, getService } = require('./src/core/services');
const { registerIpcHandler } = require('./src/core/utils/ipc-helper');
const { initializeLogging, info, error: logError } = require('./src/core/utils/logger');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a1a', // Match theme bg
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true
        }
    });

    mainWindow.loadFile('src/ui/index.html');
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Initialize logging first
    initializeLogging();
    info('BotWaffle starting up');
    
    // Initialize file system
    initializeStorage();

    // Initialize dependency injection container
    initializeServices();

    // Resolve services from container
    const chatbotManager = getService('chatbotManager');
    const templateManager = getService('templateManager');
    const assetManager = getService('assetManager');

    // IPC Handlers with consistent error handling
    // Chatbot Handlers
    registerIpcHandler(ipcMain, 'chatbot:list', () => chatbotManager.listChatbots(), { errorReturn: [] });
    registerIpcHandler(ipcMain, 'chatbot:create', (_, data) => chatbotManager.createChatbot(data), { rethrow: true });
    registerIpcHandler(ipcMain, 'chatbot:update', (_, id, data) => chatbotManager.updateChatbot(id, data), { rethrow: true });
    registerIpcHandler(ipcMain, 'chatbot:delete', (_, id) => chatbotManager.deleteChatbot(id), { rethrow: true });
    registerIpcHandler(ipcMain, 'chatbot:get', (_, id) => chatbotManager.getChatbot(id), { errorReturn: null });
    registerIpcHandler(ipcMain, 'chatbot:categories', () => chatbotManager.getUniqueCategories(), { errorReturn: [] });

    // Export handler requires special handling for dialog
    registerIpcHandler(ipcMain, 'chatbot:export', async (event, id) => {
        const bot = await chatbotManager.getChatbot(id);
        if (!bot) {
            throw new Error('Chatbot not found');
        }

        const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
            title: 'Export Chatbot to PNG',
            defaultPath: `${bot.profile.name || 'character'}.png`,
            filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });

        if (canceled || !filePath) return false;

        await chatbotManager.exportChatbot(id, filePath);
        return true;
    }, { rethrow: true });

    // Template Handlers
    registerIpcHandler(ipcMain, 'template:list', () => templateManager.listTemplates(), { errorReturn: [] });
    registerIpcHandler(ipcMain, 'template:save', (_, name, layout) => templateManager.saveTemplate(name, layout), { rethrow: true });
    registerIpcHandler(ipcMain, 'template:get', (_, id) => templateManager.getTemplate(id), { errorReturn: null });
    registerIpcHandler(ipcMain, 'template:delete', (_, id) => templateManager.deleteTemplate(id), { rethrow: true });

    // Asset Handlers

    // Data Management Handlers (Export/Import/Verify)
    const { exportBotWaffleData, importBotWaffleData, verifyBotWaffleBackup } = require('./src/core/export-import');
    
    registerIpcHandler(ipcMain, 'data:export', async (event) => {
        // Export handler needs to show save dialog
        const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const { dialog } = require('electron');
        const AdmZip = require('adm-zip');
        const fs = require('fs').promises;
        const fsSync = require('fs');
        const path = require('path');
        const { getDataPath, getDataDir } = require('./src/core/storage');
        const { info, error: logError } = require('./src/core/utils/logger');
        const { app } = require('electron');
        
        try {
            const zip = new AdmZip();
            const dataDir = getDataDir();
            const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const zipFilename = `BotWaffle_Backup_${timestamp}.zip`;

            // Export all BotWaffle data folders
            const foldersToExport = ['chatbots', 'conversations', 'templates', 'assets', 'config'];
            let exportedCount = 0;

            for (const folder of foldersToExport) {
                const folderPath = getDataPath(folder);
                try {
                    await fs.access(folderPath);
                    // Check if folder has any files
                    const files = await fs.readdir(folderPath);
                    if (files.length > 0) {
                        zip.addLocalFolder(folderPath, folder);
                        info(`[Export] Added folder: ${folder} (${files.length} items)`);
                        exportedCount++;
                    } else {
                        info(`[Export] Skipping empty folder: ${folder}`);
                    }
                } catch (error) {
                    info(`[Export] Skipping non-existent folder: ${folder}`);
                }
            }

            if (exportedCount === 0) {
                throw new Error('No data folders found to export');
            }

            const manifest = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appVersion: app.getVersion(),
                folders: []
            };

            for (const folder of foldersToExport) {
                try {
                    const folderPath = getDataPath(folder);
                    await fs.access(folderPath);
                    manifest.folders.push(folder);
                } catch {}
            }

            zip.addFile('export_manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

            const saveResult = await dialog.showSaveDialog(parentWindow, {
                title: 'Export BotWaffle Data',
                defaultPath: zipFilename,
                filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
            });

            if (saveResult.canceled) {
                return { success: false, cancelled: true };
            }

            zip.writeZip(saveResult.filePath);
            info(`[Export] Data exported to: ${saveResult.filePath}`);

            return {
                success: true,
                filePath: saveResult.filePath,
                filename: path.basename(saveResult.filePath)
            };
        } catch (error) {
            logError('[Export] Error exporting data', error);
            throw error;
        }
    }, { rethrow: true });
    
    registerIpcHandler(ipcMain, 'data:import', async (event) => {
        // Import handler needs to show open dialog
        const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const { dialog } = require('electron');
        const AdmZip = require('adm-zip');
        const fs = require('fs').promises;
        const fsSync = require('fs');
        const path = require('path');
        const { getDataPath, getDataDir } = require('./src/core/storage');
        const { info, error: logError } = require('./src/core/utils/logger');
        
        // Helper to copy directory
        const copyDirectory = async (src, dest) => {
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
        };
        
        try {
            const openResult = await dialog.showOpenDialog(parentWindow, {
                title: 'Import BotWaffle Data',
                filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
                properties: ['openFile']
            });

            if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
                return { success: false, cancelled: true };
            }

            const zipPath = openResult.filePaths[0];
            const zip = new AdmZip(zipPath);
            const dataDir = getDataDir();

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

            const backupDir = path.join(path.dirname(dataDir), 'backup_before_import_' + Date.now());
            try {
                if (!fsSync.existsSync(backupDir)) {
                    fsSync.mkdirSync(backupDir, { recursive: true });
                }
                const foldersToBackup = ['chatbots', 'conversations', 'templates', 'assets'];
                for (const folder of foldersToBackup) {
                    const folderPath = getDataPath(folder);
                    try {
                        await fs.access(folderPath);
                        await copyDirectory(folderPath, path.join(backupDir, folder));
                        info(`[Import] Backed up: ${folder}`);
                    } catch (e) {
                        info(`[Import] Skipping non-existent folder: ${folder}`);
                    }
                }
                info(`[Import] Current data backed up to: ${backupDir}`);
            } catch (backupError) {
                logError('[Import] Failed to backup current data', backupError);
            }

            // Extract ZIP to data directory (overwrite existing files)
            zip.extractAllTo(dataDir, true);
            
            // Clear caches to force reload of imported data
            const { chatbotCache } = require('./src/core/cache');
            chatbotCache.clear();
            const { templateCache } = require('./src/core/cache');
            templateCache.clear();

            info('[Import] Data imported successfully');

            return {
                success: true,
                backupLocation: backupDir
            };
        } catch (error) {
            logError('[Import] Error importing data', error);
            throw error;
        }
    }, { rethrow: true });
    
    registerIpcHandler(ipcMain, 'data:verify-backup', (_, zipPath) => verifyBotWaffleBackup(zipPath), { rethrow: true });
    
    // Backup file dialog handler
    registerIpcHandler(ipcMain, 'data:open-backup-dialog', async (event) => {
        const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const result = await dialog.showOpenDialog(parentWindow, {
            title: 'Select Backup ZIP File to Verify',
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
            properties: ['openFile']
        });
        
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return { cancelled: true };
        }
        
        return { cancelled: false, filePath: result.filePaths[0] };
    }, { errorReturn: { cancelled: true } });

    // Save text file handler (for character sheet export)
    registerIpcHandler(ipcMain, 'saveTextFile', async (event, content, defaultFilename) => {
        try {
            const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
            
            // Validate content
            if (typeof content !== 'string') {
                throw new Error('Content must be a string');
            }

            // Validate filename
            if (!defaultFilename || typeof defaultFilename !== 'string') {
                defaultFilename = 'character_sheet.txt';
            }

            // Sanitize filename (remove path separators and other dangerous characters)
            const sanitizedFilename = defaultFilename.replace(/[<>:"/\\|?*]/g, '_');

            const result = await dialog.showSaveDialog(parentWindow, {
                title: 'Export Character Sheet',
                defaultPath: sanitizedFilename,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, cancelled: true };
            }

            // Write file
            const fs = require('fs').promises;
            await fs.writeFile(result.filePath, content, 'utf8');

            info('[Export] Character sheet exported', { filePath: result.filePath });

            return {
                success: true,
                filePath: result.filePath,
                filename: path.basename(result.filePath)
            };
        } catch (error) {
            logError('[Export] Error saving text file', error);
            throw error;
        }
    }, { rethrow: true });

    // PromptWaffle Integration
    const { registerPromptWaffleHandlers } = require('./src/core/prompt-waffle-handler');
    registerPromptWaffleHandlers();

    // Asset select handler requires special handling for dialog
    registerIpcHandler(ipcMain, 'assets:select', async (event, multiple = false) => {
        const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const result = await dialog.showOpenDialog(parentWindow, {
            properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
        });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return null;
        }

        return multiple ? result.filePaths : result.filePaths[0];
    }, { errorReturn: null });

    registerIpcHandler(ipcMain, 'assets:save', (_, sourcePath) => assetManager.saveAsset(sourcePath), { rethrow: true });

    // Open External URL handler
    registerIpcHandler(ipcMain, 'openExternal', async (_, url) => {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL');
        }

        let urlObj;
        try {
            urlObj = new URL(url);
        } catch {
            throw new Error('Malformed URL');
        }

        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            throw new Error('Unsupported URL protocol');
        }

        const { shell } = require('electron');
        await shell.openExternal(url);
        return true;
    }, { errorReturn: false });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
