export { escapeHtml } from './escapeHtml.js';
// Export specific functions from utils.js to avoid conflicts
export { 
  safeElementOperation,
  safeJsonParse,
  parseSnippetTextFile,
  parseSnippetJsonFile,
  loadSnippetsFromFiles,
  isElectronAPIAvailable,
  safeElectronAPICall,
  createTreeStyles,
  applyStyles,
  exportToObsidian,
  getCompiledPrompt
} from './utils.js';
export { replaceFeatherIcons } from './feather.js';
export { showCenteredWarning } from './ui.js';
export { showToast } from './toast.js';
export { autoUpdaterUI } from './auto-updater-ui.js';
export { metadataPanel } from './metadata-panel.js';
