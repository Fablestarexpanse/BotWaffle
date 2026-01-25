import { AppState } from '../state/appState.js';

import {
  createSnippetElement,
  createFolderElement,
  createBoardElement
} from '../components/Sidebar/index.js';
import { addImagePreviewToSidebar } from './index.js';
import { showToast } from '../utils/index.js';
import { loadInitialData } from './load-initial-data.js';
import { showDeleteConfirmation } from '../utils/confirmationModal.js';
import { onBoardSwitch } from './ui.js';
/**
 * Recursively remove a path from the sidebar tree
 * @param {Array} tree - The sidebar tree array
 * @param {string} pathToRemove - The path to remove (normalized, without snippets/ prefix)
 * @param {string} fullPathToRemove - The full path to remove (with snippets/ prefix)
 * @returns {Array} - Filtered tree with the path removed
 */
function removePathFromTree(tree, pathToRemove, fullPathToRemove) {
  if (!Array.isArray(tree)) return tree;
  
  const normalize = p => p.replace(/\\/g, '/');
  
  return tree.filter(item => {
    const itemPath = normalize(item.path || '');
    const itemFullPath = itemPath.startsWith('snippets/') ? itemPath : `snippets/${itemPath}`;
    
    // Skip this item if it matches the path to remove
    if (normalize(itemPath) === normalize(pathToRemove) || 
        normalize(itemPath) === normalize(fullPathToRemove) ||
        normalize(itemFullPath) === normalize(fullPathToRemove)) {
      console.log('[Move] Filtering out old path from tree:', itemPath);
      return false;
    }
    
    // Recursively filter children
    if (item.children && Array.isArray(item.children)) {
      item.children = removePathFromTree(item.children, pathToRemove, fullPathToRemove);
    }
    
    return true;
  });
}

function sortEntries(entries) {
  if (!entries) return [];
  const sortConfig = AppState.getSortConfig();
  entries.sort((a, b) => {
    // "Cut Snippets" folder always comes first
    if (a.name === 'Cut Snippets') return -1;
    if (b.name === 'Cut Snippets') return 1;
    // Folders always come before files
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    // Boards come before snippets
    if (a.type === 'board' && b.type === 'snippet') return -1;
    if (a.type === 'snippet' && b.type === 'board') return 1;
    // Primary sort based on user's choice
    const aValue = a.name;
    const bValue = b.name;
    // Note: Advanced sorting by date is removed for now for simplicity with the new model
    // It can be added back by ensuring the main process provides stat details
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  return entries;
}
function snippetMatchesSearch(snippet) {
  try {
    if (!snippet || typeof snippet !== 'object') {
      console.error(
        'Invalid snippet provided to snippetMatchesSearch:',
        snippet
      );
      return false;
    }
    const currentSearchTerm = AppState.getCurrentSearchTerm();
    if (!currentSearchTerm) {
      return true; // No search term means show all snippets
    }

    // Search in tags safely
    const tagsMatch =
      Array.isArray(snippet.tags) &&
      snippet.tags.some(tag => {
        const tagMatch =
          typeof tag === 'string' &&
          tag.toLowerCase().includes(currentSearchTerm);

        if (tagMatch) {
        }
        return tagMatch;
      });
    // Also search in snippet text for better usability
    const textMatch =
      typeof snippet.text === 'string' &&
      snippet.text.toLowerCase().includes(currentSearchTerm);
    const result = tagsMatch || textMatch;

    return result;
  } catch (error) {
    console.error('Error checking snippet search match:', error);
    return false;
  }
}
function boardMatchesSearch(board) {
  try {
    if (!board || typeof board !== 'object') {
      console.error('Invalid board provided to boardMatchesSearch:', board);
      return false;
    }
    const currentSearchTerm = AppState.getCurrentSearchTerm();
    if (!currentSearchTerm) {
      return true; // No search term means show all boards
    }
    // Search in board name safely
    const nameMatch =
      typeof board.name === 'string' &&
      board.name.toLowerCase().includes(currentSearchTerm);
    // Search in board tags safely
    const tagsMatch =
      Array.isArray(board.tags) && board.tags.length > 0
        ? board.tags.some(
            tag =>
              typeof tag === 'string' &&
              tag.toLowerCase().includes(currentSearchTerm)
          )
        : false;
    return nameMatch || tagsMatch;
  } catch (error) {
    console.error('Error checking board search match:', error);
    return false;
  }
}
function filterTreeBySearch(tree) {
  const currentSearchTerm = AppState.getCurrentSearchTerm();
  if (!currentSearchTerm) {
    return tree; // No search term, return original tree
  }
  const filteredTree = [];
  for (const entry of tree) {
    if (entry.type === 'snippet') {
      const snippets = AppState.getSnippets();
      const normalizedPath = entry.path.replace(/\\/g, '/');
      const snippetContent = snippets[normalizedPath];
      if (snippetContent && snippetMatchesSearch(snippetContent)) {
        filteredTree.push(entry);
      }
    } else if (entry.type === 'board') {
      // Check if board matches search (by name)
      if (boardMatchesSearch(entry.content)) {
        filteredTree.push(entry);
      }
    } else if (entry.type === 'folder') {
      // For folders, check if any children match
      const filteredChildren = filterTreeBySearch(entry.children || []);
      if (filteredChildren.length > 0) {
        // Include folder if it has matching children
        filteredTree.push({
          ...entry,
          children: filteredChildren
        });
      }
    }
  }
  return filteredTree;
}
// Handler functions for folder actions and drag-and-drop
async function handleSnippetDrop(data, targetFolderPath) {
  try {
    if (!data || !data.path) {
      console.error('Invalid drag data for snippet drop:', data);
      showToast('Invalid snippet data', 'error');
      return;
    }

    // Normalize all paths to use forward slashes
    const normalize = p => p.replace(/\\/g, '/');
    
    // Parse the source path
    let sourcePath = normalize(data.path);
    if (sourcePath.startsWith('snippets/')) {
      sourcePath = sourcePath.substring(9); // Remove 'snippets/' prefix
    }
    
    const oldPath = `snippets/${sourcePath}`;
    const fileName = sourcePath.split('/').pop();
    
    // Build the new path
    const newPath = targetFolderPath
      ? `snippets/${targetFolderPath}/${fileName}`
      : `snippets/${fileName}`;
    
    // Check if source and destination are the same
    if (normalize(oldPath) === normalize(newPath)) {
      return; // No move needed
    }
    
    // Prevent moving into a subpath of itself
    if (newPath.startsWith(`${oldPath}/`)) {
      showToast('Cannot move snippet into itself or its subpath', 'error');
      return;
    }
    
    // Ensure target folder exists
    if (targetFolderPath && window.electronAPI?.createFolder) {
      await window.electronAPI.createFolder(`snippets/${targetFolderPath}`);
    }
    
    // Verify source file exists
    let sourceContent;
    try {
      sourceContent = await window.electronAPI.readFile(oldPath);
    } catch (error) {
      console.error('Source file not found:', oldPath, error);
      showToast('Source file not found. Cannot move snippet.', 'error');
      return;
    }
    
    // Check if target already exists
    // Use a more robust check that also verifies the file is actually readable
    let targetExists = false;
    try {
      const targetContent = await window.electronAPI.readFile(newPath);
      if (targetContent !== undefined && targetContent !== null) {
        targetExists = true;
        // If target exists and has the same content as source, it might be a stale reference
        // In that case, we can proceed (it's likely the same file)
        if (targetContent === sourceContent) {
          console.log('[Move] Target file exists with same content - likely stale reference, proceeding');
          targetExists = false; // Treat as safe to overwrite
        } else {
          // Different content - real conflict
          console.warn('[Move] Target file exists with different content:', newPath);
          showToast('A file with this name already exists in the target folder', 'error');
          return;
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read - good, we can proceed
      targetExists = false;
    }
    
    if (targetExists) {
      showToast('A file with this name already exists in the target folder', 'error');
      return;
    }
    
    // STEP 1: Write the file to the new location
    // If target exists with same content, delete it first to avoid conflicts
    try {
      const existingContent = await window.electronAPI.readFile(newPath);
      if (existingContent === sourceContent) {
        console.log('[Move] Target file exists with same content, deleting it first:', newPath);
        await window.electronAPI.deleteFile(newPath);
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for deletion
      }
    } catch {
      // File doesn't exist or can't be read - that's fine, proceed
    }
    
    console.log('[Move] Copying snippet to new location:', { oldPath, newPath });
    try {
      await window.electronAPI.writeFile(newPath, sourceContent);
    } catch (error) {
      console.error('[Move] Failed to write to new location:', error);
      showToast('Failed to copy snippet to new location', 'error');
      return;
    }
    
    // STEP 2: Verify new file exists
    try {
      await window.electronAPI.readFile(newPath);
      console.log('[Move] New file verified to exist');
    } catch (error) {
      console.error('[Move] New file verification failed:', error);
      showToast('Failed to verify new file was created', 'error');
      return;
    }
    
    // STEP 3: Delete the old file (CRITICAL - this prevents duplication)
    console.log('[Move] Deleting old file:', oldPath);
    let oldFileDeleted = false;
    let deletionAttempts = 0;
    const maxDeletionAttempts = 3;
    
    while (!oldFileDeleted && deletionAttempts < maxDeletionAttempts) {
      deletionAttempts++;
      try {
        await window.electronAPI.deleteFile(oldPath);
        console.log(`[Move] Delete attempt ${deletionAttempts} completed`);
        
        // Wait for file system to sync
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Verify deletion
        try {
          await window.electronAPI.readFile(oldPath);
          // File still exists
          console.warn(`[Move] Old file still exists after deletion attempt ${deletionAttempts}`);
          if (deletionAttempts < maxDeletionAttempts) {
            console.log(`[Move] Retrying deletion...`);
            continue;
          } else {
            throw new Error('Old file still exists after all deletion attempts');
          }
        } catch (verifyError) {
          // File is gone - success!
          oldFileDeleted = true;
          console.log('[Move] Old file successfully deleted and verified');
        }
      } catch (error) {
        console.error(`[Move] Delete attempt ${deletionAttempts} failed:`, error);
        if (deletionAttempts >= maxDeletionAttempts) {
          // All attempts failed - this is critical
          console.error('[Move] CRITICAL: Failed to delete old file after all attempts:', oldPath);
          
          // Try to delete the new file to prevent duplication
          try {
            await window.electronAPI.deleteFile(newPath);
            console.log('[Move] Cleaned up new file after failed old file deletion');
          } catch (cleanupError) {
            console.error('[Move] Failed to cleanup new file:', cleanupError);
          }
          
          showToast('Failed to delete old file. Move cancelled to prevent duplication. Check console for details.', 'error');
          return;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (!oldFileDeleted) {
      console.error('[Move] CRITICAL: Could not delete old file after all attempts');
      showToast('Failed to delete old file. Move cancelled.', 'error');
      return;
    }
    
    // STEP 5: Update AppState
    const snippets = AppState.getSnippets();
    const normalizedOldPath = normalize(oldPath);
    const normalizedNewPath = normalize(newPath);
    
    const oldSnippetKey = Object.keys(snippets).find(
      key => normalize(key) === normalizedOldPath
    );
    
    if (oldSnippetKey) {
      const snippetData = snippets[oldSnippetKey];
      delete snippets[oldSnippetKey];
      snippets[normalizedNewPath] = snippetData;
      AppState.setSnippets(snippets);
      console.log('[Move] Updated AppState');
    }
    
    // STEP 6: Update board card references
    const boards = AppState.getBoards();
    let boardsUpdated = false;
    for (const board of boards) {
      if (Array.isArray(board.cards)) {
        for (const card of board.cards) {
          if (normalize(card.snippetPath) === sourcePath) {
            card.snippetPath = targetFolderPath
              ? `${targetFolderPath}/${fileName}`
              : fileName;
            boardsUpdated = true;
          }
        }
      }
    }
    if (boardsUpdated) {
      const { saveApplicationState } = await import('./state.js');
      await saveApplicationState();
    }
    
    // STEP 7: Remove dragged element from DOM immediately
    const snippetId = `snippet-${sourcePath.replace(/[\\/]/g, '-')}`;
    const oldSnippetId = `snippet-${oldPath.replace(/[\\/]/g, '-')}`;
    
    const draggedElement = document.getElementById(snippetId) ||
                          document.getElementById(oldSnippetId) ||
                          document.querySelector(`[data-path="${sourcePath}"]`) ||
                          document.querySelector(`[data-path="${oldPath}"]`);
    
    if (draggedElement) {
      console.log('[Move] Removing element from DOM:', draggedElement.id);
      draggedElement.remove();
    }
    
    // STEP 8: Refresh sidebar with fresh data
    await new Promise(resolve => setTimeout(resolve, 150)); // Wait for file system
    
    const currentState = getSidebarState();
    AppState.setSnippets({}); // Clear cache
    
    const { loadInitialData } = await import('./load-initial-data.js');
    const initialData = await loadInitialData();
    
    if (initialData?.sidebarTree) {
      window.sidebarTree = initialData.sidebarTree;
      
      // Filter out any stale old paths
      const filteredTree = removePathFromTree(initialData.sidebarTree, sourcePath, oldPath);
      window.sidebarTree = filteredTree;
      initialData.sidebarTree = filteredTree;
    }
    
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && initialData?.sidebarTree) {
      foldersContainer.innerHTML = '';
      renderSidebar(initialData.sidebarTree, foldersContainer);
      applySidebarState(currentState);
    }
    
    showToast('Snippet moved successfully!', 'success');
    console.log('[Move] Snippet move completed successfully');
    
  } catch (error) {
    console.error('[Move] Error moving snippet:', error);
    showToast('Failed to move snippet: ' + (error.message || 'Unknown error'), 'error');
  }
}
async function handleBoardDrop(data, targetFolderPath) {
  try {
    if (!data || !data.path || !data.board) {
      console.error('Invalid drag data for board drop:', data);
      showToast('Invalid board data', 'error');
      return;
    }
    
    // Normalize all paths to use forward slashes
    const normalize = p => p.replace(/\\/g, '/');
    
    // Get the board from AppState to find its actual filePath
    const boards = AppState.getBoards();
    const board = boards.find(b => b.id === data.board.id || b.name === data.board.name);
    
    if (!board) {
      console.error('Board not found in AppState:', data.board);
      showToast('Board not found', 'error');
      return;
    }
    
    // Use the board's filePath if available, otherwise use the path from drag data
    let oldPath = board.filePath || data.path;
    
    // Normalize and ensure path starts with snippets/
    oldPath = normalize(oldPath);
    if (!oldPath.startsWith('snippets/')) {
      // If board is in boards/ directory, we need to copy it to snippets/ first
      if (oldPath.startsWith('boards/')) {
        // Read the board file from boards/ directory
        const boardContent = await window.electronAPI.readFile(oldPath);
        const boardData = JSON.parse(boardContent);
        
        // Create new path in snippets/
        const fileName = oldPath.split('/').pop();
        const newPath = targetFolderPath
          ? `snippets/${targetFolderPath}/${fileName}`
          : `snippets/${fileName}`;
        
        // Ensure target folder exists
        if (targetFolderPath && window.electronAPI && window.electronAPI.createFolder) {
          await window.electronAPI.createFolder(`snippets/${targetFolderPath}`);
        }
        
        // Write board to new location
        await window.electronAPI.writeFile(newPath, boardContent);
        
        // Update board's filePath
        board.filePath = newPath;
        AppState.setBoards(boards);
        
        // Save the updated boards array
        const { saveBoards } = await import('./state.js');
        await saveBoards();
        
        // Reload sidebar
        const currentState = getSidebarState();
        const { loadInitialData } = await import('./load-initial-data.js');
        const initialData = await loadInitialData();
        const foldersContainer = document.getElementById('foldersContainer');
        if (foldersContainer && initialData && initialData.sidebarTree) {
          renderSidebar(initialData.sidebarTree, foldersContainer);
          applySidebarState(currentState);
        }
        
        showToast(`Board "${data.board.name}" moved successfully`, 'success');
        return;
      } else {
        oldPath = `snippets/${oldPath}`;
      }
    }
    
    // Check if old file exists before trying to move
    try {
      await window.electronAPI.readFile(oldPath);
    } catch (error) {
      console.error('Board file not found at:', oldPath, error);
      showToast('Board file not found. Cannot move board.', 'error');
      return;
    }
    
    const fileName = oldPath.split('/').pop();
    const newPath = targetFolderPath
      ? `snippets/${targetFolderPath}/${fileName}`
      : `snippets/${fileName}`;
    
    // Only return early if the paths are actually the same (after normalization)
    if (normalize(oldPath) === normalize(newPath)) {
      return;
    }
    
    // Prevent moving a board into itself or a subpath of itself
    if (newPath.startsWith(`${oldPath}/`)) {
      showToast('Cannot move board into itself or its subpath', 'error');
      return;
    }
    
    // Ensure the target folder exists
    if (targetFolderPath && window.electronAPI && window.electronAPI.createFolder) {
      await window.electronAPI.createFolder(`snippets/${targetFolderPath}`);
    }
    
    // Check if target file already exists
    try {
      await window.electronAPI.readFile(newPath);
      showToast('A board with this name already exists in the target folder', 'error');
      return;
    } catch (error) {
      // File doesn't exist, which is good - we can proceed
    }
    
    // Move the board file
    await window.electronAPI.rename(oldPath, newPath);
    
    // Update the board's file path reference
    board.filePath = newPath;
    AppState.setBoards(boards);
    
    // Save the updated boards array
    const { saveBoards } = await import('./state.js');
    await saveBoards();
    
    // Immediately remove the dragged board element from the DOM to prevent duplicate display
    const boardFileName = oldPath.split('/').pop();
    const normalizedBoardPath = normalize(oldPath);
    const draggedElement = document.querySelector(`[data-board-path="${normalizedBoardPath}"], [id*="board-${boardFileName.replace(/[\\/]/g, '-')}"]`);
    if (draggedElement && draggedElement.parentNode) {
      draggedElement.parentNode.removeChild(draggedElement);
    }
    
    // Reload sidebar tree from disk to reflect the changes
    // Preserve expanded/collapsed state
    const currentState = getSidebarState();
    const { loadInitialData } = await import('./load-initial-data.js');
    const initialData = await loadInitialData();
    // Update window.sidebarTree to ensure it reflects the new state
    if (initialData && initialData.sidebarTree) {
      window.sidebarTree = initialData.sidebarTree;
    }
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && initialData && initialData.sidebarTree) {
      renderSidebar(initialData.sidebarTree, foldersContainer);
      // Restore expanded/collapsed state
      applySidebarState(currentState);
    }
    showToast(`Board "${data.board.name}" moved successfully`, 'success');
  } catch (error) {
    console.error('Error moving board:', error);
    showToast(`Error moving board: ${error.message || 'Unknown error'}`, 'error');
  }
}
async function handleFolderDrop(sourcePath, targetPath) {
  try {
    if (!sourcePath) {
      console.error('Invalid source path for folder drop:', sourcePath);
      showToast('Invalid folder path', 'error');
      return;
    }
    
    if (sourcePath === targetPath) {
      return; // No move needed
    }
    
    // Prevent moving a folder into itself or its descendants
    if (targetPath && (targetPath === sourcePath || targetPath.startsWith(`${sourcePath}/`))) {
      showToast('Cannot move a folder into itself or its subfolders', 'error');
      return;
    }
    
    const folderName = sourcePath.split('/').pop();
    const oldFolderPath = `snippets/${sourcePath}`;
    const newFolderPath = targetPath
      ? `snippets/${targetPath}/${folderName}`
      : `snippets/${folderName}`;
    
    // Check if source folder exists before trying to move
    try {
      const files = await window.electronAPI.readdir(oldFolderPath);
      if (!files || files.length === 0) {
        // Folder might be empty, but that's okay
      }
    } catch (error) {
      console.error('Source folder not found:', oldFolderPath, error);
      showToast('Source folder not found. Cannot move folder.', 'error');
      return;
    }
    
    // Check if target folder already exists
    try {
      await window.electronAPI.readdir(newFolderPath);
      showToast('A folder with this name already exists in the target location', 'error');
      return;
    } catch (error) {
      // Folder doesn't exist, which is good - we can proceed
    }
    
    if (window.electronAPI && window.electronAPI.rename) {
      await window.electronAPI.rename(oldFolderPath, newFolderPath);
      
      // Verify the folder was moved successfully
      try {
        await window.electronAPI.readdir(newFolderPath);
        // New folder exists, good
      } catch (error) {
        console.error('Folder move verification failed:', error);
        showToast('Failed to verify folder move. The folder may not have been moved correctly.', 'error');
        return;
      }
    } else {
      showToast('Filesystem API not available', 'error');
      return;
    }
    // Update all board card snippet paths that reference snippets in the moved folder
    const boards = AppState.getBoards();
    let updated = false;
    const normalize = p => p.replace(/\\/g, '/');
    for (const board of boards) {
      if (Array.isArray(board.cards)) {
        for (const card of board.cards) {
          if (card.snippetPath) {
            const normalizedSnippetPath = normalize(card.snippetPath);
            const oldFolderPrefix = normalize(`${sourcePath}/`);
            // Check if this card's snippet is in the moved folder
            if (normalizedSnippetPath.startsWith(oldFolderPrefix)) {
              // Calculate the new path
              const snippetName = normalizedSnippetPath.substring(
                oldFolderPrefix.length
              );
              const newSnippetPath = targetPath
                ? `${targetPath}/${folderName}/${snippetName}`
                : `${folderName}/${snippetName}`;
              card.snippetPath = newSnippetPath;
              updated = true;
            }
          }
        }
      }
    }
    if (updated) {
      // Save the updated boards
      const { saveApplicationState } = await import('./state.js');
      await saveApplicationState();
      // Re-render the current board to show the updated snippet paths
      const { renderBoard } = await import('./boards.js');
      await renderBoard();
    }
    // Reload sidebar tree from disk to ensure only the selected folder is moved
    // Preserve expanded/collapsed state
    const currentState = getSidebarState();
    const { loadInitialData } = await import('./load-initial-data.js');
    const initialData = await loadInitialData();
    // Update window.sidebarTree to ensure it reflects the new state
    if (initialData && initialData.sidebarTree) {
      window.sidebarTree = initialData.sidebarTree;
    }
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && initialData && initialData.sidebarTree) {
      renderSidebar(initialData.sidebarTree, foldersContainer);
      // Restore expanded/collapsed state
      applySidebarState(currentState);
    }
    showToast('Folder moved successfully', 'success');
  } catch (error) {
    showToast('Error moving folder', 'error');
    console.error('Error moving folder:', error);
  }
}
function openFolderModal(path) {
  // Open the folder modal
  const modal = document.getElementById('folderModal');
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('folderNameInput');
    if (input) input.value = '';
    const confirmBtn = document.getElementById('createFolderConfirmBtn');
    if (confirmBtn) confirmBtn.textContent = 'Create';
    if (input) input.focus();
  }
}
// Helper function to extract all folders from the sidebar tree with hierarchy
function getAllFolders(tree, folders = [], depth = 0) {
  for (const entry of tree) {
    if (entry.type === 'folder') {
      folders.push({
        name: entry.name,
        path: entry.path,
        depth
      });
      // Recursively get folders from children
      if (entry.children && entry.children.length > 0) {
        getAllFolders(entry.children, folders, depth + 1);
      }
    }
  }
  return folders;
}
function populateFolderDropdown(selectElement, folders, selectedPath = '') {
  // Clear existing options
  selectElement.innerHTML = '';
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Root (no folder)';
  selectElement.appendChild(defaultOption);
  // Add folder options with hierarchy indicators
  folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.path;
    // Use the depth information to create proper indentation
    const indent = '  '.repeat(folder.depth);
    // Check if this is a subfolder (has path separators)
    const isSubfolder = folder.path.includes('/');
    if (isSubfolder) {
      // For subfolders, show with indentation and parent context
      const pathParts = folder.path.split('/');
      const parentFolder = pathParts[pathParts.length - 2]; // Get parent folder name
      option.textContent = `${indent}📁 ${folder.name} (in ${parentFolder})`;
    } else {
      // For root folders, show with folder icon
      option.textContent = `${indent}📁 ${folder.name}`;
    }
    if (folder.path === selectedPath) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}
function openSnippetModal(path) {
  // Open the snippet modal
  const modal = document.getElementById('snippetModal');
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('snippetTextInput');
    if (input) input.value = '';
    const tagsInput = document.getElementById('snippetTagsInput');
    if (tagsInput) tagsInput.value = '';
    const confirmBtn = document.getElementById('createSnippetConfirmBtn');
    if (confirmBtn) confirmBtn.textContent = 'Create';
    // Populate folder dropdown
    const folderSelect = document.getElementById('snippetFolderSelect');
    if (folderSelect && window.sidebarTree) {
      const folders = getAllFolders(window.sidebarTree);
      populateFolderDropdown(folderSelect, folders, path || '');
    }
    if (input) input.focus();
  }
}
async function openBoardModalInFolder(path) {
  try {
    // Import the board modal function
    const { openNewBoardModal } = await import('./boards.js');
    // Open the board modal with the folder path as parent
    await openNewBoardModal(path);
  } catch (error) {
    console.error('Error opening board modal in folder:', error);
    const { showToast } = await import('../utils/index.js');
    showToast('Error opening board creation dialog', 'error');
  }
}
async function deleteFolder(path) {
  const confirmed = await showDeleteConfirmation(path, 'folder');
  
  if (!confirmed) {
    return;
  }

  try {
    // Normalize path to use forward slashes for consistent matching
    const normalizedPath = path.replace(/\\/g, '/');
    
    // Delete the folder on disk
    if (window.electronAPI && window.electronAPI.deleteFolderRecursive) {
      await window.electronAPI.deleteFolderRecursive(`snippets/${normalizedPath}`);
    } else if (window.electronAPI && window.electronAPI.deleteFolder) {
      // fallback if only deleteFolder is available
      await window.electronAPI.deleteFolder(`snippets/${normalizedPath}`);
    } else {
      showToast('Filesystem API not available', 'error');
      return;
    }
    
    // Remove from sidebar tree in memory
    function removeFolder(tree, searchPath) {
      for (let i = 0; i < tree.length; i++) {
        // Normalize both paths for comparison
        const treePath = tree[i].path ? tree[i].path.replace(/\\/g, '/') : '';
        if (tree[i].type === 'folder' && treePath === searchPath) {
          return tree.splice(i, 1)[0];
        } else if (tree[i].type === 'folder' && tree[i].children) {
          const found = removeFolder(tree[i].children, searchPath);
          if (found) return found;
        }
      }
      return null;
    }
    const removed = removeFolder(window.sidebarTree, normalizedPath);
    if (!removed) {
      console.warn('Folder not found in tree:', normalizedPath);
    }
    
    // Preserve the current expanded state of folders before refreshing
    const currentState = getSidebarState();
    
    // Refresh sidebar while preserving folder state
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && window.sidebarTree) {
      renderSidebar(window.sidebarTree, foldersContainer);
      // Wait for feather icons to be replaced before restoring state
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      // Restore the expanded state after rendering is complete
      setTimeout(() => {
        applySidebarState(currentState);
      }, 0);
    }
    showToast('Folder and all contents deleted', 'success');
  } catch (error) {
    showToast('Error deleting folder', 'error');
    console.error('Error deleting folder:', error);
  }
}
// Inline folder creation functions
function showInlineFolderCreation() {
  const inlineCreation = document.getElementById('inlineFolderCreation');
  if (inlineCreation) {
    inlineCreation.style.display = 'block';
    const input = document.getElementById('newFolderNameInput');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}
function hideInlineFolderCreation() {
  const inlineCreation = document.getElementById('inlineFolderCreation');
  if (inlineCreation) {
    inlineCreation.style.display = 'none';
  }
}
async function createInlineFolder() {
  try {
    const input = document.getElementById('newFolderNameInput');
    if (!input) return;
    const folderName = input.value.trim();
    if (!folderName) {
      showToast('Please enter a folder name', 'error');
      return;
    }
    // Use window.inlineFolderParentPath if set, otherwise use the dropdown from the active modal
    let parentPath = '';
    if (window.inlineFolderParentPath) {
      parentPath = window.inlineFolderParentPath;
    } else {
      // Check which modal is active and use its folder select
      const snippetFolderSelect = document.getElementById(
        'snippetFolderSelect'
      );
      const boardFolderSelect = document.getElementById('boardFolderSelect');
      if (snippetFolderSelect && snippetFolderSelect.offsetParent !== null) {
        // Snippet modal is visible
        parentPath = snippetFolderSelect.value || '';
      } else if (boardFolderSelect && boardFolderSelect.offsetParent !== null) {
        // Board modal is visible
        parentPath = boardFolderSelect.value || '';
      } else {
        // Fallback to snippet folder select
        parentPath = snippetFolderSelect ? snippetFolderSelect.value : '';
      }
    }
    // Determine the folder path based on the parent path
    let folderPath;
    let newFolderPath;
    if (parentPath) {
      folderPath = `snippets/${parentPath}/${folderName}`;
      newFolderPath = `${parentPath}/${folderName}`;
    } else {
      folderPath = `snippets/${folderName}`;
      newFolderPath = folderName;
    }
    try {
      if (window.electronAPI && window.electronAPI.createFolder) {
        await window.electronAPI.createFolder(folderPath);
      } else {
        showToast('Filesystem API not available', 'error');
        return;
      }
    } catch (err) {
      showToast('Folder already exists or cannot be created', 'error');
      return;
    }
    // Add folder to sidebar tree in memory
    if (!window.sidebarTree) window.sidebarTree = [];
    const newFolderEntry = {
      type: 'folder',
      name: folderName,
      path: newFolderPath,
      children: []
    };
    if (parentPath) {
      // Add as subfolder to the parent folder
      const addToFolder = (tree, parentPath) => {
        for (const entry of tree) {
          if (entry.type === 'folder' && entry.path === parentPath) {
            if (!entry.children) entry.children = [];
            entry.children.push(newFolderEntry);
            return true;
          }
          if (entry.children && entry.children.length > 0) {
            if (addToFolder(entry.children, parentPath)) {
              return true;
            }
          }
        }
        return false;
      };
      if (!addToFolder(window.sidebarTree, parentPath)) {
        // If parent folder not found, add to root
        window.sidebarTree.push(newFolderEntry);
      }
    } else {
      // Add to root
      window.sidebarTree.push(newFolderEntry);
    }
    // Refresh the folder dropdown in both snippet and board modals
    const snippetFolderSelect = document.getElementById('snippetFolderSelect');
    const boardFolderSelect = document.getElementById('boardFolderSelect');
    if (window.sidebarTree) {
      const folders = getAllFolders(window.sidebarTree);
      if (snippetFolderSelect) {
        populateFolderDropdown(snippetFolderSelect, folders, newFolderPath);
      }
      if (boardFolderSelect) {
        populateFolderDropdown(boardFolderSelect, folders, newFolderPath);
      }
    }
    // Refresh sidebar
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer) {
      renderSidebar(window.sidebarTree, foldersContainer);
    }
    // Hide the inline creation form
    hideInlineFolderCreation();
    // Clear the parent path after use
    window.inlineFolderParentPath = '';
    showToast(
      `Created folder: ${folderName}${parentPath ? ` in ${parentPath}` : ''}`,
      'success'
    );
  } catch (error) {
    showToast('Error creating folder', 'error');
    console.error('Error creating inline folder:', error);
  }
}
async function createSnippet() {
  try {
    const textInput = document.getElementById('snippetTextInput');
    const tagsInput = document.getElementById('snippetTagsInput');
    const folderSelect = document.getElementById('snippetFolderSelect');
    if (!textInput || !tagsInput || !folderSelect) {
      showToast('Required form elements not found', 'error');
      return;
    }
    const snippetText = textInput.value.trim();
    const tags = tagsInput.value.trim();
    const selectedFolder = folderSelect.value;
    if (!snippetText) {
      showToast('Please enter snippet text', 'error');
      return;
    }
    // Generate a unique filename
    const timestamp = Date.now();
    const snippetName = `snippet_${timestamp}.json`;
    // Determine the file path
    let snippetPath;
    if (selectedFolder) {
      snippetPath = `snippets/${selectedFolder}/${snippetName}`;
    } else {
      snippetPath = `snippets/${snippetName}`;
    }
    // Create snippet metadata
    const snippetMetadata = {
      id: `snippet_${timestamp}`,
      text: snippetText,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      created: Date.now(),
      modified: Date.now(),
              title: snippetText.substring(0, 50),
      description: '',
      category: selectedFolder || '',
      version: '1.0'
    };
    // Create the JSON snippet file
    try {
      if (window.electronAPI && window.electronAPI.writeFile) {
        const jsonContent = JSON.stringify(snippetMetadata, null, 2);
        await window.electronAPI.writeFile(snippetPath, jsonContent);
      } else {
        showToast('Filesystem API not available', 'error');
        return;
      }
    } catch (err) {
      showToast('Error creating snippet file', 'error');
      console.error('Error creating snippet file:', err);
      return;
    }
    // Add to AppState
    const snippets = AppState.getSnippets();
    snippets[snippetPath] = snippetMetadata;
    AppState.setSnippets(snippets);
    // Add to sidebar tree
    if (!window.sidebarTree) window.sidebarTree = [];
    const snippetEntry = {
      type: 'snippet',
      name: snippetName.replace('.json', ''),
      path: snippetPath,
      content: snippetMetadata
    };
    if (selectedFolder) {
      // Find the folder in the tree and add the snippet to it
      const addToFolder = (tree, folderPath) => {
        for (const entry of tree) {
          if (entry.type === 'folder' && entry.path === folderPath) {
            if (!entry.children) entry.children = [];
            entry.children.push(snippetEntry);
            return true;
          }
          if (entry.children && entry.children.length > 0) {
            if (addToFolder(entry.children, folderPath)) {
              return true;
            }
          }
        }
        return false;
      };
      if (!addToFolder(window.sidebarTree, selectedFolder)) {
        // If folder not found, add to root
        window.sidebarTree.push(snippetEntry);
      }
    } else {
      // Add to root
      window.sidebarTree.push(snippetEntry);
    }
    // Refresh sidebar
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer) {
      renderSidebar(window.sidebarTree, foldersContainer);
    }
    // Close modal
    closeSnippetModal();
    // Add the snippet to the current board if we're creating from context menu
    try {
      const { addCardToBoard } = await import('./boards.js');
      const boardContainer = document.getElementById('promptBoard');
      if (boardContainer) {
        // Position the card at a reasonable location
        const x = 100;
        const y = 100;
        await addCardToBoard(snippetPath, x, y);
      }
    } catch (error) {
      console.error('Error adding snippet to board:', error);
      // Don't show error toast as the snippet was still created successfully
    }
    showToast(
      `Created snippet: ${snippetName.replace('.json', '')}`,
      'success'
    );
  } catch (error) {
    showToast('Error creating snippet', 'error');
    console.error('Error creating snippet:', error);
  }
}
async function createFolder() {
  try {
    const input = document.getElementById('folderNameInput');
    if (!input) return;
    const folderName = input.value.trim();
    if (!folderName) {
      showToast('Please enter a folder name', 'error');
      return;
    }
    // Create the directory in the snippets folder
    const folderPath = `snippets/${folderName}`;
    try {
      if (window.electronAPI && window.electronAPI.createFolder) {
        await window.electronAPI.createFolder(folderPath);
      } else {
        showToast('Filesystem API not available', 'error');
        return;
      }
    } catch (err) {
      showToast('Folder already exists or cannot be created', 'error');
      return;
    }
    // Add folder to sidebar tree in memory and refresh
    if (!window.sidebarTree) window.sidebarTree = [];
    window.sidebarTree.push({
      type: 'folder',
      name: folderName,
      path: folderName,
      children: []
    });
    // Refresh sidebar
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer) {
      renderSidebar(window.sidebarTree, foldersContainer);
    }
    // Close modal
    const modal = document.getElementById('folderModal');
    if (modal) modal.style.display = 'none';
    showToast(`Created folder: ${folderName}`, 'success');
  } catch (error) {
    showToast('Error creating folder', 'error');
    console.error('Error creating folder:', error);
  }
}
function closeFolderModal() {
  const modal = document.getElementById('folderModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
function closeSnippetModal() {
  const modal = document.getElementById('snippetModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
function closeEditSnippetModal() {
  const modal = document.getElementById('editSnippetModal');
  if (modal) {
    modal.style.display = 'none';
    // Clear form fields
    const textInput = document.getElementById('editSnippetTextInput');
    if (textInput) textInput.value = '';
    const tagsInput = document.getElementById('editSnippetTagsInput');
    if (tagsInput) tagsInput.value = '';
    const folderSelect = document.getElementById('editSnippetFolderSelect');
    if (folderSelect) folderSelect.innerHTML = '';
    // Hide inline folder creation
    const inlineCreation = document.getElementById('inlineFolderCreationEdit');
    if (inlineCreation) inlineCreation.style.display = 'none';
    // Clear the stored path
    delete modal.dataset.snippetPath;
  }
}
function openEditSnippetModal(snippet, path) {
  const modal = document.getElementById('editSnippetModal');
  if (modal) {
    modal.style.display = 'flex';
    // Populate text input
    const textInput = document.getElementById('editSnippetTextInput');
    if (textInput) textInput.value = snippet.text || '';
    // Populate tags input
    const tagsInput = document.getElementById('editSnippetTagsInput');
    if (tagsInput)
      tagsInput.value = snippet.tags ? snippet.tags.join(', ') : '';
    // Store the path for saving
    modal.dataset.snippetPath = path;
    // Focus the text input
    if (textInput) textInput.focus();
  }
}
// Utility to clean up tooltips and drag-over classes
function cleanupSidebarArtifacts() {
  // Remove all snippet tooltips
  document
    .querySelectorAll('.snippet-tooltip, .custom-folder-tooltip')
    .forEach(el => el.remove());
  // Remove all drag-over classes
  document
    .querySelectorAll('.drag-over')
    .forEach(el => el.classList.remove('drag-over'));
}
export function renderSidebar(tree, container, depth = 0, parentPath = '') {
  if (depth === 0) {
    // Clean up any leftover tooltips or drag-over classes before rendering
    cleanupSidebarArtifacts();
    // Safety: Only clear if container is the foldersContainer, not the whole sidebar
    if (container.id === 'foldersContainer') {
      container.innerHTML = '';
    } else {
      console.warn(
        '[Sidebar] Refusing to clear container that is not #foldersContainer:',
        container
      );
    }
  }
  const filteredTree = filterTreeBySearch(tree);
  // Only sort at root level; for folder children, sort folders, then boards, then snippets
  let sortedTree;
  if (depth === 0) {
    sortedTree = sortEntries(filteredTree);
  } else {
    // For folder children: folders first, then boards, then snippets
    const folders = filteredTree.filter(e => e.type === 'folder');
    const boards = filteredTree.filter(e => e.type === 'board');
    const snippets = filteredTree.filter(e => e.type === 'snippet');
    sortedTree = [
      ...sortEntries(folders),
      ...sortEntries(boards),
      ...sortEntries(snippets)
    ];
  }
  for (let i = 0; i < sortedTree.length; i++) {
    const entry = sortedTree[i];
    const isLast = i === sortedTree.length - 1;
    if (entry.type === 'folder') {
      // Use entry.path directly - it already contains the full path from the tree
      const folderPath = entry.path || entry.name;
      const folderElement = createFolderElement({
        name: entry.name,
        id: `folder-${folderPath.replace(/[\\/]/g, '-')}`,
        path: folderPath,
        depth,
        isLast,
        eventHandlers: {
          handleSnippetDrop,
          handleBoardDrop,
          handleFolderDrop, // <-- add this
          openFolderModal,
          openSnippetModal,
          openBoardModalInFolder,
          deleteFolder,
          showInlineFolderCreation // <-- add this
        }
      });
      container.appendChild(folderElement);
      const subContainer = folderElement.querySelector('.folder-content');
      if (entry.children && entry.children.length > 0) {
        // Sort children: folders first, then boards, then snippets, all alphabetically
        const childrenSorted = [...entry.children].sort((a, b) => {
          if (a.type === b.type) {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
          }
          if (a.type === 'folder') return -1;
          if (b.type === 'folder') return 1;
          if (a.type === 'board') return -1;
          if (b.type === 'board') return 1;
          return 0;
        });
        renderSidebar(childrenSorted, subContainer, depth + 1, folderPath);
      }
    } else if (entry.type === 'snippet') {
      // Use the content directly from the tree entry
      const snippetContent = entry.content;
      if (snippetContent) {
        const snippetElement = createSnippetElement({
          snippet: snippetContent,
          id: `snippet-${entry.path.replace(/[\\/]/g, '-')}`,
          path: entry.path,
          depth,
          isLast
        });
        container.appendChild(snippetElement);
      } else {
        console.warn('[Sidebar] Snippet entry has no content:', entry);
      }
    } else if (entry.type === 'board') {
      // Get full board data from boards array to include images
      const boards = AppState.getBoards();
      const fullBoardData =
        boards.find(b => b.name === entry.content.name) || entry.content;
      const boardElement = createBoardElement({
        board: fullBoardData,
        id: `board-${entry.path.replace(/[\\/]/g, '-')}`,
        path: entry.path,
        depth,
        isLast,
        eventHandlers: {
          setCurrentBoard: async boardId => {
            const { setCurrentBoard } = await import('./boards.js');
            await setCurrentBoard(boardId);
            await onBoardSwitch(); // Call onBoardSwitch after board switch
          },
          hideImagePreview: () => {
            // Hide image preview if it exists
            const preview = document.querySelector('.image-preview');
            if (preview) {
              preview.remove();
            }
          },
          showImagePreview: (images, element) => {
            // Show image preview functionality
            // This can be implemented later if needed
          },
          filterByTag,
          showBoardFileContextMenu: async (e, board, path) => {
            try {
              const { showBoardFileContextMenu } = await import('../ui/menus/context.js');
              showBoardFileContextMenu(e, board, path);
            } catch (error) {
              console.error('Error showing board context menu:', error);
            }
          }
        }
      });
      container.appendChild(boardElement);
    }
  }
  if (depth === 0) {
    feather.replace();
    addImagePreviewToSidebar();
    // Ensure root drop zone is properly set up
    const rootDropZone = document.getElementById('rootDropZone');
    if (rootDropZone) {
      // Make sure the root drop zone is visible and properly styled
      rootDropZone.style.display = 'flex';
    }
  }
}
export function getSidebarState() {
  const expandedFolders = new Set();
  document.querySelectorAll('.folder:not(.collapsed)').forEach(folderEl => {
    if (folderEl.dataset.path) {
      expandedFolders.add(folderEl.dataset.path);
    }
  });
  return expandedFolders;
}
export function applySidebarState(state) {
  if (!state) return;
  state.forEach(path => {
    const folderId = `folder-${path.replace(/[\\/]/g, '-')}`;
    const folderEl = document.getElementById(folderId);
    if (folderEl && folderEl.classList.contains('collapsed')) {
      folderEl.classList.remove('collapsed');
      const icon = folderEl.querySelector('.collapse-icon');
      if (icon) {
        icon.setAttribute('data-feather', 'chevron-down');
      }
      // Also expand the folder content if it exists
      const folderContent = folderEl.querySelector('.folder-content');
      if (folderContent) {
        folderContent.style.display = '';
      }
    }
  });
  // Replace feather icons after expanding folders
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}
let partialUpdateTimeout = null;
export function schedulePartialSidebarUpdate(boardId) {
  if (partialUpdateTimeout) {
    clearTimeout(partialUpdateTimeout);
  }
  partialUpdateTimeout = setTimeout(() => {
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && window.sidebarTree) {
      // Preserve the current expanded state of folders
      const currentState = getSidebarState();
      // Re-render the sidebar
      renderSidebar(window.sidebarTree, foldersContainer);
      // Restore the expanded state
      applySidebarState(currentState);
    }
    partialUpdateTimeout = null;
  }, 100); // Debounce for 100ms
}
export function filterByTag(tag) {
  if (typeof tag !== 'string') {
    return;
  }
  const searchInput = document.getElementById('tagSearchInput');
  const foldersContainer = document.getElementById('foldersContainer');
  if (searchInput && foldersContainer && window.sidebarTree) {
    searchInput.value = tag;
    AppState.setCurrentSearchTerm(tag);
    renderSidebar(window.sidebarTree, foldersContainer);
    // Show the clear button when a tag is clicked
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      clearBtn.style.display = 'block';
    }
  } else {
  }
}
// After loading initial data, run a migration to fix old board card snippetPaths
export async function migrateBoardCardSnippetPaths() {
  const snippets = AppState.getSnippets();
  const snippetKeys = Object.keys(snippets);
  const boards = AppState.getBoards();
  let updated = false;
  for (const board of boards) {
    if (Array.isArray(board.cards)) {
      for (const card of board.cards) {
        // If the card's snippetPath is not found, try to find a normalized match
        if (!snippets[card.snippetPath]) {
          // Try to find a match ignoring slashes
          const normalized = card.snippetPath.replace(/\\/g, '/');
          const match = snippetKeys.find(
            key =>
              key.endsWith(`/${normalized}`) ||
              key === normalized ||
              key.replace(/\\/g, '/') === normalized
          );
          if (match) {
            card.snippetPath = match;
            updated = true;
          }
        }
      }
    }
  }
  if (updated) {
    const { saveApplicationState } = await import('./state.js');
    await saveApplicationState();
    const { showToast } = await import('../utils/index.js');
    showToast('Migrated old board card snippet paths', 'success');
  }
}
export function setSort(field, direction) {
  try {
    // Update the sort configuration in AppState
    AppState.setSortConfig({ field, direction });
    // Re-render the sidebar to apply the new sorting
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && window.sidebarTree) {
      // Preserve the current expanded state of folders
      const currentState = getSidebarState();
      // Re-render the sidebar with new sorting
      renderSidebar(window.sidebarTree, foldersContainer);
      // Restore the expanded state
      applySidebarState(currentState);
    }
  } catch (error) {
    console.error('Error setting sort:', error);
  }
}
export function collapseAllFolders() {
  try {
    const collapseBtn = document.getElementById('collapseAllBtn');
    const icon = collapseBtn?.querySelector('i[data-feather]');
    // Get all folders including nested ones - this should get ALL folders at any nesting level
    const allFolders = document.querySelectorAll('.folder');
    // Check current state of all folders
    const folderStates = Array.from(allFolders).map(folder => ({
      element: folder,
      isCollapsed: folder.classList.contains('collapsed'),
      path: folder.dataset.path || 'unknown'
    }));

    const allCollapsed = folderStates.every(folder => folder.isCollapsed);
    if (allCollapsed) {
      // Expand all folders (including nested ones)
      allFolders.forEach((folder, index) => {
        folder.classList.remove('collapsed');
        const folderIcon = folder.querySelector('.collapse-icon');
        if (folderIcon) {
          folderIcon.setAttribute('data-feather', 'chevron-down');
        }
      });
      // Update button icon to point up (indicating next action will be collapse)
      if (icon) {
        icon.setAttribute('data-feather', 'chevrons-up');
      }
      if (collapseBtn) {
        collapseBtn.title = 'Collapse all folders';
      }
    } else {
      // Collapse all folders (including nested ones)
      allFolders.forEach((folder, index) => {
        folder.classList.add('collapsed');
        const folderIcon = folder.querySelector('.collapse-icon');
        if (folderIcon) {
          folderIcon.setAttribute('data-feather', 'chevron-right');
        }
      });
      // Update button icon to point down (indicating next action will be expand)
      if (icon) {
        icon.setAttribute('data-feather', 'chevrons-down');
      }
      if (collapseBtn) {
        collapseBtn.title = 'Expand all folders';
      }
    }
    // Update feather icons with a small delay to ensure DOM changes are processed
    setTimeout(() => {
      if (
        typeof feather !== 'undefined' &&
        typeof feather.replace === 'function'
      ) {
        feather.replace();
      }
    }, 10);
  } catch (error) {
    console.error('Error toggling folder collapse state:', error);
  }
}
export async function deleteSnippetByPath(snippetPath) {
  try {
    // Preserve the current expanded state of folders
    const currentState = getSidebarState();
    
    // Check if this is a default snippet that should be tracked as deleted
    const defaultSnippetIds = ['default_photorealistic', 'default_cyberpunk', 'default_space'];
    const snippetFileName = snippetPath.split('/').pop().replace('.json', '').replace('.txt', '');
    if (defaultSnippetIds.includes(snippetFileName)) {
      // Mark this default snippet as intentionally deleted
      try {
        const { markSnippetAsDeleted } = await import('./default-snippets.js');
        if (typeof markSnippetAsDeleted === 'function') {
          await markSnippetAsDeleted(snippetFileName);
          console.log('[Delete] Marked default snippet as deleted:', snippetFileName);
        }
      } catch (error) {
        console.warn('[Delete] Could not mark default snippet as deleted:', error);
      }
    }
    
    // Delete the file from disk
    if (window.electronAPI && window.electronAPI.rm) {
      await window.electronAPI.rm(`snippets/${snippetPath}`);
    } else {
      showToast('Filesystem API not available', 'error');
      return;
    }
    // Remove from AppState
    const snippets = AppState.getSnippets();
    delete snippets[snippetPath];
    AppState.setSnippets(snippets);
    // Remove from sidebar tree
    function removeSnippetFromTree(tree, path) {
      for (let i = 0; i < tree.length; i++) {
        if (tree[i].type === 'snippet' && tree[i].path === path) {
          return tree.splice(i, 1)[0];
        } else if (tree[i].type === 'folder' && tree[i].children) {
          const found = removeSnippetFromTree(tree[i].children, path);
          if (found) return found;
        }
      }
      return null;
    }
    if (window.sidebarTree) {
      removeSnippetFromTree(window.sidebarTree, snippetPath);
    }
    // Refresh sidebar while preserving folder state
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && window.sidebarTree) {
      renderSidebar(window.sidebarTree, foldersContainer);
      // Wait for feather icons to be replaced before restoring state
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      // Restore the expanded state after rendering is complete
      setTimeout(() => {
        applySidebarState(currentState);
      }, 0);
    }
    showToast('Snippet deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting snippet:', error);
    showToast('Error deleting snippet', 'error');
  }
}
export async function deleteBoardFileImmediate(board, boardPath) {
  try {
    // Check if this is the default board and prevent deletion
    if (board.name === 'Default Board' || board.id === 'board-default') {
      showToast('Cannot delete the default board', 'error');
      return;
    }
    // Preserve the current expanded state of folders
    const currentState = getSidebarState();
    // Delete the board file from disk
    // Boards are stored in snippets/ directory (snippets/boards/ or snippets/folder/boards/)
    // Use board.filePath if available (from when board was created), otherwise use boardPath from sidebar tree
    let pathToDelete = board.filePath || boardPath;
    
    if (window.electronAPI && window.electronAPI.rm) {
      // Ensure path includes 'snippets/' prefix
      let deletePath = pathToDelete;
      if (!deletePath.startsWith('snippets/')) {
        deletePath = `snippets/${pathToDelete}`;
      }
      console.log('[Delete Board] Attempting to delete:', deletePath);
      const result = await window.electronAPI.rm(deletePath);
      if (!result) {
        showToast('Failed to delete board file', 'error');
        return;
      }
    } else {
      showToast('Filesystem API not available', 'error');
      return;
    }
    // Remove from AppState
    const boards = AppState.getBoards();
    const updatedBoards = boards.filter(b => b.id !== board.id);
    AppState.setBoards(updatedBoards);
    // If this was the active board, switch to another one
    const activeBoardId = AppState.getActiveBoardId();
    if (activeBoardId === board.id && updatedBoards.length > 0) {
      const { setCurrentBoard } = await import('./boards.js');
      await setCurrentBoard(updatedBoards[0].id);
    }
    // Remove from sidebar tree
    function removeBoardFromTree(tree, path) {
      for (let i = 0; i < tree.length; i++) {
        if (tree[i].type === 'board' && tree[i].path === path) {
          return tree.splice(i, 1)[0];
        } else if (tree[i].type === 'folder' && tree[i].children) {
          const found = removeBoardFromTree(tree[i].children, path);
          if (found) return found;
        }
      }
      return null;
    }
    // Use the same path format for removing from tree (should match what's in tree)
    const treePath = board.filePath || boardPath;
    if (window.sidebarTree) {
      removeBoardFromTree(window.sidebarTree, treePath);
    }
    // Refresh sidebar while preserving folder state
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer && window.sidebarTree) {
      renderSidebar(window.sidebarTree, foldersContainer);
      // Wait for feather icons to be replaced before restoring state
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      // Restore the expanded state after rendering is complete
      setTimeout(() => {
        applySidebarState(currentState);
      }, 0);
    }
    // Update board selector if it exists
    const { renderBoardSelector } = await import('./boards.js');
    renderBoardSelector();
    showToast('Board deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting board:', error);
    showToast('Error deleting board', 'error');
  }
}
export {
  openFolderModal,
  openSnippetModal,
  createFolder,
  createSnippet,
  closeFolderModal,
  closeSnippetModal,
  closeEditSnippetModal,
  showInlineFolderCreation,
  createInlineFolder,
  hideInlineFolderCreation,
  getAllFolders,
  populateFolderDropdown,
  handleSnippetDrop,
  handleBoardDrop,
  handleFolderDrop,
  openEditSnippetModal
};
