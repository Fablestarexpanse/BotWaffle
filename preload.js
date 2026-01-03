const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    chatbot: {
        list: () => ipcRenderer.invoke('chatbot:list'),
        create: (data) => ipcRenderer.invoke('chatbot:create', data),
        update: (id, data) => ipcRenderer.invoke('chatbot:update', id, data),
        delete: (id) => ipcRenderer.invoke('chatbot:delete', id),
        get: (id) => ipcRenderer.invoke('chatbot:get', id),
        export: (id) => ipcRenderer.invoke('chatbot:export', id)
    },
    templates: {
        list: () => ipcRenderer.invoke('template:list'),
        save: (name, layout) => ipcRenderer.invoke('template:save', name, layout)
    },
    assets: {
        select: () => ipcRenderer.invoke('assets:select'),
        save: (path) => ipcRenderer.invoke('assets:save', path)
    }
});
