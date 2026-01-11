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

    // Asset Handlers

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
