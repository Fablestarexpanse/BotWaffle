const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Root directory for PromptWuffel data
const PROMPT_WAFFLE_ROOT = path.join(__dirname, '../tools/prompt-waffle');

function getSafePath(target) {
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
                    tree.push({
                        type: 'snippet',
                        name: item.name,
                        path: itemPath,
                        content: { text: content, tags: [] }
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
    console.log('[PromptWaffle] Registering handlers (namespaced)...');

    ipcMain.handle('pw-get-initial-data', async () => {
        const snippetsDir = path.join(PROMPT_WAFFLE_ROOT, 'snippets');
        try { await fs.mkdir(snippetsDir, { recursive: true }); } catch (e) { }
        const sidebarTree = await buildSidebarTree(snippetsDir);
        return { sidebarTree };
    });

    ipcMain.handle('pw-fs-readdir', async (_, dirPath) => {
        const fullPath = getSafePath(dirPath);
        const items = await fs.readdir(fullPath, { withFileTypes: true });
        return items.map(item => ({
            name: item.name,
            isDirectory: item.isDirectory(),
            isFile: item.isFile()
        }));
    });

    ipcMain.handle('pw-fs-mkdir', async (_, p) => {
        await fs.mkdir(getSafePath(p), { recursive: true });
        return true;
    });

    ipcMain.handle('pw-fs-exists', async (_, p) => {
        try { await fs.access(getSafePath(p)); return true; } catch { return false; }
    });

    // Stub other calls to prevent crashes in logs, or implement if needed
    // Assuming simple file read/write is primary requirement for now

    ipcMain.handle('check-for-updates', () => { return null; }); // Keep this generic one stubs

    ipcMain.handle('pw-fs-readFile', async (_, filePath) => {
        try {
            return await fs.readFile(getSafePath(filePath), 'utf8');
        } catch (e) { return null; }
    });

    ipcMain.handle('pw-fs-writeFile', async (_, filePath, content) => {
        const fullPath = getSafePath(filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        return true;
    });

    ipcMain.handle('pw-fs-rm', async (_, filePath) => {
        await fs.rm(getSafePath(filePath), { recursive: true, force: true });
        return true;
    });

    ipcMain.handle('pw-fs-listFiles', async (_, dirPath) => {
        try {
            const items = await fs.readdir(getSafePath(dirPath), { withFileTypes: true });
            return items.map(item => ({
                name: item.name, isDirectory: item.isDirectory(), isFile: item.isFile()
            }));
        } catch { return []; }
    });

    ipcMain.handle('get-app-version', () => '1.5.2');
}

module.exports = { registerPromptWaffleHandlers };
