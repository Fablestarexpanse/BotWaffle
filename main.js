const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initializeStorage } = require('./src/core/storage');
const chatbotManager = require('./src/core/chatbot-manager');

// Safe console.error wrapper to prevent EPIPE errors when streams are closed
function safeConsoleError(...args) {
    try {
        console.error(...args);
    } catch (error) {
        // Silently ignore EPIPE and other stream errors
        if (error.code !== 'EPIPE' && error.code !== 'ENOTCONN') {
            // Only log non-stream errors if possible
            try {
                process.stderr.write(`[Safe Log] ${args.join(' ')}\n`);
            } catch {}
        }
    }
}

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
    // Initialize file system
    initializeStorage();

    // IPC Handlers with error handling
    ipcMain.handle('chatbot:list', async () => {
        try {
            return await chatbotManager.listChatbots();
        } catch (error) {
            safeConsoleError('Error in chatbot:list:', error);
            return [];
        }
    });

    ipcMain.handle('chatbot:create', async (_, data) => {
        try {
            return await chatbotManager.createChatbot(data);
        } catch (error) {
            safeConsoleError('Error in chatbot:create:', error);
            throw error;
        }
    });

    ipcMain.handle('chatbot:update', async (_, id, data) => {
        try {
            return await chatbotManager.updateChatbot(id, data);
        } catch (error) {
            safeConsoleError('Error in chatbot:update:', error);
            throw error;
        }
    });

    ipcMain.handle('chatbot:delete', async (_, id) => {
        try {
            return await chatbotManager.deleteChatbot(id);
        } catch (error) {
            safeConsoleError('Error in chatbot:delete:', error);
            throw error;
        }
    });

    ipcMain.handle('chatbot:get', async (_, id) => {
        try {
            return await chatbotManager.getChatbot(id);
        } catch (error) {
            safeConsoleError('Error in chatbot:get:', error);
            return null;
        }
    });

    ipcMain.handle('chatbot:categories', async () => {
        try {
            return await chatbotManager.getUniqueCategories();
        } catch (error) {
            safeConsoleError('Error in chatbot:categories:', error);
            return [];
        }
    });

    ipcMain.handle('chatbot:export', async (event, id) => {
        try {
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
        } catch (error) {
            safeConsoleError('Error in chatbot:export:', error);
            throw error;
        }
    });

    // Template Handlers
    const templateManager = require('./src/core/template-manager');
    ipcMain.handle('template:list', async () => {
        try {
            return await templateManager.listTemplates();
        } catch (error) {
            safeConsoleError('Error in template:list:', error);
            return [];
        }
    });

    ipcMain.handle('template:save', async (_, name, layout) => {
        try {
            return await templateManager.saveTemplate(name, layout);
        } catch (error) {
            safeConsoleError('Error in template:save:', error);
            throw error;
        }
    });

    ipcMain.handle('template:get', async (_, id) => {
        try {
            return await templateManager.getTemplate(id);
        } catch (error) {
            safeConsoleError('Error in template:get:', error);
            return null;
        }
    });

    // Asset Handlers
    const assetManager = require('./src/core/asset-manager');

    // PromptWaffle Integration
    const { registerPromptWaffleHandlers } = require('./src/core/prompt-waffle-handler');
    registerPromptWaffleHandlers();

    ipcMain.handle('assets:select', async (event, multiple = false) => {
        try {
            const parentWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
            const result = await dialog.showOpenDialog(parentWindow, {
                properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
                filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
            });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return null;
            }

            return multiple ? result.filePaths : result.filePaths[0];
        } catch (error) {
            safeConsoleError('Error in assets:select:', error);
            return null;
        }
    });

    ipcMain.handle('assets:save', async (_, sourcePath) => {
        try {
            return await assetManager.saveAsset(sourcePath);
        } catch (error) {
            safeConsoleError('Error in assets:save:', error);
            throw error;
        }
    });

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
