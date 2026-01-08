const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Root directory for PromptWuffel data
// We point this to the PromptWaffel folder inside the project
const PROMPT_WAFFLE_ROOT = path.join(__dirname, '../../PromptWaffel');

function getSafePath(target) {
    // Basic security to prevent traversing up
    const resolved = path.resolve(PROMPT_WAFFLE_ROOT, target);
    if (!resolved.startsWith(path.resolve(PROMPT_WAFFLE_ROOT))) {
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
                if (['images', 'node_modules', '.git', 'src'].includes(item.name)) continue;

                const children = await buildSidebarTree(fullPath, itemPath);
                tree.push({
                    type: 'folder',
                    name: item.name,
                    path: itemPath,
                    children
                });
            } else if (item.isFile()) {
                if (item.name.endsWith('.txt')) {
                    const content = await fs.readFile(fullPath, 'utf8');
                    // Simplified snippet parsing
                    tree.push({
                        type: 'snippet',
                        name: item.name,
                        path: itemPath,
                        content: { text: content, tags: [] } // Mock parsing
                    });
                }
            }
        }
        return tree;
    } catch (error) {
        console.error('Sidebar tree error:', error);
        return [];
    }
}

function registerPromptWaffleHandlers() {
    console.log('[PromptWaffle] Registering handlers...');

    ipcMain.handle('get-initial-data', async () => {
        const snippetsDir = path.join(PROMPT_WAFFLE_ROOT, 'snippets');
        // Ensure dir exists
        try { await fs.mkdir(snippetsDir, { recursive: true }); } catch (e) { }

        const sidebarTree = await buildSidebarTree(snippetsDir);
        return { sidebarTree };
    });

    // File System Passthroughs
    ipcMain.handle('fs-readdir', async (_, dirPath) => {
        const fullPath = getSafePath(dirPath);
        const items = await fs.readdir(fullPath, { withFileTypes: true });
        return items.map(item => ({
            name: item.name,
            isDirectory: item.isDirectory(),
            isFile: item.isFile()
        }));
    });

    // Add other critical handlers as needed to prevent crashes
    // Simple stubs for now to prevent startup crash
    ipcMain.handle('fs-mkdir', async (_, p) => {
        await fs.mkdir(getSafePath(p), { recursive: true });
        return true;
    });

    ipcMain.handle('fs-exists', async (_, p) => {
        try { await fs.access(getSafePath(p)); return true; } catch { return false; }
    });

    ipcMain.handle('check-for-updates', () => { return null; }); // Stub updater

    ipcMain.handle('fs-readFile', async (_, filePath) => {
        try {
            return await fs.readFile(getSafePath(filePath), 'utf8');
        } catch (e) {
            // Return null if file doesn't exist, common electron pattern
            return null;
        }
    });

    ipcMain.handle('fs-writeFile', async (_, filePath, content) => {
        const fullPath = getSafePath(filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        return true;
    });

    ipcMain.handle('fs-rm', async (_, filePath) => {
        await fs.rm(getSafePath(filePath), { recursive: true, force: true });
        return true;
    });

    ipcMain.handle('fs-listFiles', async (_, dirPath) => {
        try {
            const fullPath = getSafePath(dirPath);
            const items = await fs.readdir(fullPath, { withFileTypes: true });
            return items.map(item => ({
                name: item.name,
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }));
        } catch { return []; }
    });

    ipcMain.handle('get-app-version', () => '1.5.2');
}

module.exports = { registerPromptWaffleHandlers };



