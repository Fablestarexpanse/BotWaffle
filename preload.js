const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    chatbot: {
        list: () => ipcRenderer.invoke('chatbot:list'),
        create: (data) => ipcRenderer.invoke('chatbot:create', data),
        update: (id, data) => ipcRenderer.invoke('chatbot:update', id, data),
        delete: (id) => ipcRenderer.invoke('chatbot:delete', id),
        get: (id) => ipcRenderer.invoke('chatbot:get', id),
        categories: () => ipcRenderer.invoke('chatbot:categories'),
        export: (id) => ipcRenderer.invoke('chatbot:export', id)
    },
    templates: {
        list: () => ipcRenderer.invoke('template:list'),
        save: (name, layout) => ipcRenderer.invoke('template:save', name, layout),
        get: (id) => ipcRenderer.invoke('template:get', id)
    },
    assets: {
        select: (multiple = false) => ipcRenderer.invoke('assets:select', multiple),
        save: (path) => ipcRenderer.invoke('assets:save', path)
    },
    data: {
        export: () => ipcRenderer.invoke('data:export'),
        import: () => ipcRenderer.invoke('data:import'),
        verifyBackup: (zipPath) => ipcRenderer.invoke('data:verify-backup', zipPath),
        openBackupDialog: () => ipcRenderer.invoke('data:open-backup-dialog')
    },
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
    saveTextFile: (content, defaultFilename) => ipcRenderer.invoke('saveTextFile', content, defaultFilename)
});
