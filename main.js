const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initializeStorage } = require('./src/core/storage');
const chatbotManager = require('./src/core/chatbot-manager');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a1a', // Match theme bg
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile('src/ui/index.html');
}

app.whenReady().then(() => {
    // Initialize file system
    initializeStorage();

    // IPC Handlers
    ipcMain.handle('chatbot:list', () => chatbotManager.listChatbots());
    ipcMain.handle('chatbot:create', (_, data) => chatbotManager.createChatbot(data));
    ipcMain.handle('chatbot:update', (_, id, data) => chatbotManager.updateChatbot(id, data));
    ipcMain.handle('chatbot:delete', (_, id) => chatbotManager.deleteChatbot(id));
    ipcMain.handle('chatbot:get', (_, id) => chatbotManager.getChatbot(id));

    ipcMain.handle('chatbot:export', async (event, id) => {
        const bot = chatbotManager.getChatbot(id);

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export Chatbot to PNG',
            defaultPath: `${bot.profile.name || 'character'}.png`,
            filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });

        if (canceled || !filePath) return false;

        chatbotManager.exportChatbot(id, filePath);
        return true;
    });

    // Template Handlers
    const templateManager = require('./src/core/template-manager');
    ipcMain.handle('template:list', () => templateManager.listTemplates());
    ipcMain.handle('template:save', (_, name, layout) => templateManager.saveTemplate(name, layout));
    ipcMain.handle('template:get', (_, id) => templateManager.getTemplate(id));

    // Asset Handlers
    const assetManager = require('./src/core/asset-manager');

    ipcMain.handle('assets:select', async (event, multiple = false) => {
        const result = await dialog.showOpenDialog({
            properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
        });
        
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return null;
        }
        
        return multiple ? result.filePaths : result.filePaths[0];
    });

    ipcMain.handle('assets:save', (_, sourcePath) => assetManager.saveAsset(sourcePath));

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
