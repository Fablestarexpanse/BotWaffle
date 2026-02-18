const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialData: () => ipcRenderer.invoke('pw-get-initial-data'),
  readdir: path => ipcRenderer.invoke('pw-fs-readdir', path),
  createFolder: path => ipcRenderer.invoke('pw-fs-mkdir', path),
  writeFile: (filePath, content) => {
    return ipcRenderer.invoke('pw-fs-writeFile', filePath, content);
  },
  readFile: path => ipcRenderer.invoke('pw-fs-readFile', path),
  rename: (oldPath, newPath) =>
    ipcRenderer.invoke('pw-fs-rename', oldPath, newPath),
  rm: path => ipcRenderer.invoke('pw-fs-rm', path),
  deleteFile: path => ipcRenderer.invoke('pw-fs-rm', path),
  exists: path => ipcRenderer.invoke('pw-fs-exists', path),
  stat: path => ipcRenderer.invoke('pw-fs-stat', path),
  openDataPath: () => ipcRenderer.invoke('pw-open-data-path'),
  openExternal: url => ipcRenderer.invoke('openExternal', url),
  // Image handling APIs
  saveImage: (imageId, imageBuffer, filename) =>
    ipcRenderer.invoke('pw-save-image', imageId, imageBuffer, filename),
  saveThumbnail: (imageId, thumbnailBuffer, filename) =>
    ipcRenderer.invoke('pw-save-thumbnail', imageId, thumbnailBuffer, filename),
  loadImage: imagePath => ipcRenderer.invoke('pw-load-image', imagePath),
  loadImageFile: imagePath => ipcRenderer.invoke('pw-load-image-file', imagePath),
  loadThumbnail: thumbnailPath =>
    ipcRenderer.invoke('pw-load-thumbnail', thumbnailPath),
  deleteImage: imagePath => ipcRenderer.invoke('pw-delete-image', imagePath),
  deleteThumbnail: thumbnailPath =>
    ipcRenderer.invoke('pw-delete-thumbnail', thumbnailPath),
  imageExists: imagePath => ipcRenderer.invoke('pw-image-exists', imagePath),
  // Board image handling APIs
  saveBoardImage: (boardId, imageBuffer, filename) =>
    ipcRenderer.invoke('pw-save-board-image', boardId, imageBuffer, filename),
  deleteBoardImage: imagePath => ipcRenderer.invoke('pw-delete-board-image', imagePath),
  // Clipboard operations
  writeText: text => clipboard.writeText(text),
  readText: () => clipboard.readText(),

  listFiles: dir => ipcRenderer.invoke('pw-fs-listFiles', dir),
  deleteFolder: path => ipcRenderer.invoke('pw-fs-rm', path),
  deleteFolderRecursive: path =>
    ipcRenderer.invoke('pw-fs-rm', path, { recursive: true, force: true }),
  openImageDialog: () => ipcRenderer.invoke('pw-open-image-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('pw-open-folder-dialog'),
  selectFolder: () => ipcRenderer.invoke('pw-select-folder'),
  // Image viewer window APIs
  openImageViewer: imageData =>
    ipcRenderer.invoke('open-image-viewer', imageData),
  closeImageViewer: () => ipcRenderer.invoke('close-image-viewer'),
  minimizeImageViewer: () => ipcRenderer.invoke('minimize-image-viewer'),
  maximizeImageViewer: () => ipcRenderer.invoke('maximize-image-viewer'),
  setImageViewerPosition: (x, y) =>
    ipcRenderer.invoke('set-image-viewer-position', x, y),
  setImageViewerSize: (width, height) =>
    ipcRenderer.invoke('set-image-viewer-size', width, height),
  getCurrentPosition: () => ipcRenderer.invoke('get-current-position'),
  moveImageViewer: (deltaX, deltaY) =>
    ipcRenderer.invoke('move-image-viewer', deltaX, deltaY),
  fetchLatestRelease: (repoOwner, repoName) =>
    ipcRenderer.invoke('fetchLatestRelease', repoOwner, repoName),
  // ComfyUI integration
  // Legacy sendToComfyUI removed (v2.0.0) - use savePromptToFile/getComfyUIFolder + savePromptToComfyUI() instead
  savePromptToFile: (prompt, folderPath, filename) =>
    ipcRenderer.invoke('save-prompt-to-file', prompt, folderPath, filename),
  selectFolderAndSavePrompt: (prompt) =>
    ipcRenderer.invoke('select-folder-and-save-prompt', prompt),
  getComfyUIFolder: () => ipcRenderer.invoke('get-comfyui-folder'),
  // Export/Import APIs
  // Export/Import/Verify functionality removed
  // exportData: () => ipcRenderer.invoke('export-data'),
  // importData: () => ipcRenderer.invoke('import-data'),
  // openBackupFileDialog: () => ipcRenderer.invoke('open-backup-file-dialog'),
  // verifyBackup: (zipPath) => ipcRenderer.invoke('verify-backup', zipPath),
  // File dialog APIs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showSaveDialogAndWrite: (options, content) => ipcRenderer.invoke('show-save-dialog-and-write', options, content),
  // BotWaffle chatbot APIs
  listChatbots: () => ipcRenderer.invoke('chatbot:list'),
  getChatbot: (id) => ipcRenderer.invoke('chatbot:get', id),
  updateChatbot: (id, data) => ipcRenderer.invoke('chatbot:update', id, data),
  createChatbot: (data) => ipcRenderer.invoke('chatbot:create', data),
  getCharacterFolderPath: (characterId, subfolder) => ipcRenderer.invoke('getCharacterFolderPath', characterId, subfolder),
  // Notify parent window of bot changes
  notifyBotCreated: (botId, botName) => {
    // Send message to parent window via IPC
    ipcRenderer.send('bot-created-notification', { botId, botName });
  }
});

// Auto-updater IPC bridge
contextBridge.exposeInMainWorld('autoUpdaterAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
