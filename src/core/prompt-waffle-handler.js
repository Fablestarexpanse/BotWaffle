const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Root directory for PromptWuffel data
const PROMPT_WAFFLE_ROOT = path.join(__dirname, '../tools/prompt-waffle');

function getSafePath(target) {
    const resolvedBase = path.resolve(PROMPT_WAFFLE_ROOT);
    const resolved = path.resolve(PROMPT_WAFFLE_ROOT, target);
    const relativePath = path.relative(resolvedBase, resolved);
    const isInsideBase = relativePath === '' ||
        (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));

    if (!isInsideBase) {
        throw new Error('Access denied');
    }
    return resolved;
}

async function buildSidebarTree(dirPath, relativePath = '') {
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const tree = [];

        for (const item of items) {
            const itemPath = path.join(relativePath, item.name);
            const fullPath = path.join(dirPath, item.name);

            if (item.isDirectory()) {
                if (['images', 'node_modules', '.git', 'src', 'boards', 'wildcards'].includes(item.name)) continue;

                const children = await buildSidebarTree(fullPath, itemPath);
                tree.push({
                    type: 'folder',
                    name: item.name,
                    path: itemPath,
                    children
                });
            } else if (item.isFile()) {
                if (item.name.endsWith('.txt')) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        tree.push({
                            type: 'snippet',
                            name: item.name,
                            path: itemPath,
                            content: { text: content, tags: [] }
                        });
                    } catch (error) {
                        try {
                            console.error(`Error reading text file ${itemPath}:`, error);
                        } catch (e) {}
                    }
                } else if (item.name.endsWith('.json')) {
                    // Try to detect if this is a board file (has id, name, cards, tags)
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const parsed = JSON.parse(content);
                        if (
                            parsed &&
                            typeof parsed === 'object' &&
                            parsed.id &&
                            parsed.name &&
                            Array.isArray(parsed.cards) &&
                            Array.isArray(parsed.tags)
                        ) {
                            // Treat as board
                            tree.push({
                                type: 'board',
                                name: parsed.name,
                                path: itemPath,
                                content: parsed,
                                tags: parsed.tags || []
                            });
                        } else if (
                            parsed &&
                            typeof parsed === 'object' &&
                            parsed.text &&
                            typeof parsed.text === 'string'
                        ) {
                            // Treat as JSON snippet
                            tree.push({
                                type: 'snippet',
                                name: item.name.replace('.json', ''),
                                path: itemPath,
                                content: parsed
                            });
                        }
                    } catch (error) {
                        try {
                            console.error(`Error reading JSON file ${itemPath}:`, error);
                        } catch (e) {}
                    }
                }
            }
        }
        return tree;
    } catch (error) {
        // Use safe console logging to prevent EPIPE errors
        try {
            console.error('Sidebar tree error:', error);
        } catch (e) {
            // Ignore stream errors
        }
        return [];
    }
}

function registerPromptWaffleHandlers() {
    try {
        console.log('[PromptWaffle] Registering handlers (namespaced)...');
    } catch (e) {
        // Ignore stream errors
    }

    ipcMain.handle('pw-get-initial-data', async () => {
        try {
            const snippetsDir = path.join(PROMPT_WAFFLE_ROOT, 'snippets');
            const boardsDir = path.join(PROMPT_WAFFLE_ROOT, 'boards');
            const wildcardsDir = path.join(PROMPT_WAFFLE_ROOT, 'wildcards');

            try { await fs.mkdir(snippetsDir, { recursive: true }); } catch (e) { }
            try { await fs.mkdir(boardsDir, { recursive: true }); } catch (e) { }
            try { await fs.mkdir(wildcardsDir, { recursive: true }); } catch (e) { }

            const sidebarTree = await buildSidebarTree(snippetsDir);
            return { sidebarTree };
        } catch (error) {
            try {
                console.error('Error in pw-get-initial-data:', error);
            } catch (e) {}
            return { sidebarTree: [] };
        }
    });

    ipcMain.handle('pw-fs-readdir', async (_, dirPath) => {
        try {
            const fullPath = getSafePath(dirPath);
            const items = await fs.readdir(fullPath, { withFileTypes: true });
            return items.map(item => ({
                name: item.name,
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }));
        } catch (error) {
            try {
                console.error('Error in pw-fs-readdir:', error);
            } catch (e) {}
            return [];
        }
    });

    ipcMain.handle('pw-fs-mkdir', async (_, p) => {
        try {
            await fs.mkdir(getSafePath(p), { recursive: true });
            return true;
        } catch (error) {
            try {
                console.error('Error in pw-fs-mkdir:', error);
            } catch (e) {}
            throw error;
        }
    });

    ipcMain.handle('pw-fs-exists', async (_, p) => {
        try {
            await fs.access(getSafePath(p));
            return true;
        } catch {
            return false;
        }
    });

    ipcMain.handle('pw-fs-stat', async (_, p) => {
        try {
            const stats = await fs.stat(getSafePath(p));
            return {
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                size: stats.size
            };
        } catch {
            return null;
        }
    });

    ipcMain.handle('pw-fs-rename', async (_, oldPath, newPath) => {
        try {
            await fs.rename(getSafePath(oldPath), getSafePath(newPath));
            return true;
        } catch (error) {
            try {
                console.error('Error in pw-fs-rename:', error);
            } catch (e) {}
            throw error;
        }
    });

    // Stub other calls to prevent crashes in logs, or implement if needed
    // Assuming simple file read/write is primary requirement for now

    ipcMain.handle('check-for-updates', () => { return null; }); // Keep this generic one stubs

    ipcMain.handle('pw-fs-readFile', async (_, filePath) => {
        try {
            return await fs.readFile(getSafePath(filePath), 'utf8');
        } catch (e) {
            return null;
        }
    });

    ipcMain.handle('pw-fs-writeFile', async (_, filePath, content) => {
        try {
            const fullPath = getSafePath(filePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, 'utf8');
            return true;
        } catch (error) {
            try {
                console.error('Error in pw-fs-writeFile:', error);
            } catch (e) {}
            throw error;
        }
    });

    ipcMain.handle('pw-fs-rm', async (_, filePath) => {
        try {
            await fs.rm(getSafePath(filePath), { recursive: true, force: true });
            return true;
        } catch (error) {
            try {
                console.error('Error in pw-fs-rm:', error);
            } catch (e) {}
            throw error;
        }
    });

    ipcMain.handle('pw-fs-listFiles', async (_, dirPath) => {
        try {
            const items = await fs.readdir(getSafePath(dirPath), { withFileTypes: true });
            return items.map(item => ({
                name: item.name, isDirectory: item.isDirectory(), isFile: item.isFile()
            }));
        } catch {
            return [];
        }
    });

    ipcMain.handle('get-app-version', () => '1.5.2');

    // Image handling handlers
    ipcMain.handle('pw-load-image', async (_, imagePath) => {
        try {
            const fullPath = getSafePath(imagePath);
            const imageBuffer = await fs.readFile(fullPath);
            // Convert Buffer to array for IPC transfer
            return Array.from(imageBuffer);
        } catch (error) {
            try {
                console.error('Error in pw-load-image:', error);
            } catch (e) {}
            return null;
        }
    });

    ipcMain.handle('pw-load-image-file', async (_, imagePath) => {
        try {
            // For absolute paths from external sources
            if (path.isAbsolute(imagePath)) {
                const imageBuffer = await fs.readFile(imagePath);
                return Array.from(imageBuffer);
            } else {
                const fullPath = getSafePath(imagePath);
                const imageBuffer = await fs.readFile(fullPath);
                return Array.from(imageBuffer);
            }
        } catch (error) {
            try {
                console.error('Error in pw-load-image-file:', error);
            } catch (e) {}
            return null;
        }
    });

    ipcMain.handle('pw-image-exists', async (_, imagePath) => {
        try {
            const fullPath = getSafePath(imagePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    });

    ipcMain.handle('pw-save-board-image', async (event, boardId, imageBuffer, filename) => {
        try {
            // imageBuffer is an array from renderer, convert to Buffer
            const buffer = Buffer.from(imageBuffer);
            const imagesDir = path.join(PROMPT_WAFFLE_ROOT, 'snippets', 'boards', 'images', boardId);
            await fs.mkdir(imagesDir, { recursive: true });
            const fullPath = path.join(imagesDir, filename);
            await fs.writeFile(fullPath, buffer);
            const relativePath = `snippets/boards/images/${boardId}/${filename}`;
            return { success: true, relativePath: relativePath, fullPath: fullPath };
        } catch (error) {
            try {
                console.error('Error in pw-save-board-image:', error);
            } catch (e) {}
            throw error;
        }
    });

    ipcMain.handle('pw-delete-board-image', async (_, imagePath) => {
        try {
            const fullPath = getSafePath(imagePath);
            await fs.unlink(fullPath);
            // Try to remove empty parent directory
            try {
                const parentDir = path.dirname(fullPath);
                const files = await fs.readdir(parentDir);
                if (files.length === 0) {
                    await fs.rmdir(parentDir);
                }
            } catch (dirError) {
                // Ignore directory removal errors
            }
            return true;
        } catch (error) {
            try {
                console.error('Error in pw-delete-board-image:', error);
            } catch (e) {}
            return false;
        }
    });

    // Dialog handlers
    ipcMain.handle('pw-open-image-dialog', async (event) => {
        try {
            const parentWindow = BrowserWindow.fromWebContents(event.sender) || null;
            const result = await dialog.showOpenDialog(parentWindow, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    {
                        name: 'Images',
                        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
                    }
                ]
            });
            return result;
        } catch (error) {
            try {
                console.error('Error in pw-open-image-dialog:', error);
            } catch (e) {}
            return { canceled: true, filePaths: [] };
        }
    });

    ipcMain.handle('pw-open-folder-dialog', async (event) => {
        try {
            const parentWindow = BrowserWindow.fromWebContents(event.sender) || null;
            const result = await dialog.showOpenDialog(parentWindow, {
                properties: ['openDirectory']
            });
            return result;
        } catch (error) {
            try {
                console.error('Error in pw-open-folder-dialog:', error);
            } catch (e) {}
            return { canceled: true, filePaths: [] };
        }
    });

    // Image viewer handlers (no pw- prefix to match preload)
    ipcMain.handle('open-image-viewer', async (event, imageData) => {
        try {
            // For now, just return success - full implementation would create a window
            // This is a stub to prevent errors
            return true;
        } catch (error) {
            try {
                console.error('Error in open-image-viewer:', error);
            } catch (e) {}
            return false;
        }
    });

    ipcMain.handle('close-image-viewer', async () => {
        return true;
    });

    ipcMain.handle('minimize-image-viewer', async () => {
        return true;
    });

    ipcMain.handle('maximize-image-viewer', async () => {
        return true;
    });
}

module.exports = { registerPromptWaffleHandlers };
