/**
 * Character Selector Utility
 * Handles loading and displaying BotWaffle characters in PromptWaffle
 */

import { showToast } from './index.js';
import { showInputModal } from './inputModal.js';

/**
 * Loads chatbots from BotWaffle (no longer populates dropdown - modal handles it)
 * Kept for backward compatibility
 */
export async function loadCharacters() {
  // Character loading is now handled by the modal
  // This function is kept for backward compatibility but does nothing
  return;
}

/**
 * Estimates token count from text (matches BotWaffle's token counter)
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const charCount = trimmed.length;
  return Math.ceil(charCount / 3.9);
}

/**
 * Counts tokens in an object recursively
 */
function countTokensInObject(obj) {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj === 'string') return estimateTokens(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return 1;
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countTokensInObject(item), 0);
  }
  if (typeof obj === 'object') {
    return Object.values(obj).reduce((sum, value) => sum + countTokensInObject(value), 0);
  }
  return 0;
}

/**
 * Displays a character card for the selected character (matches BotWaffle card format)
 */
export async function displayCharacterCard(character) {
  const cardDisplay = document.getElementById('characterCardDisplay');
  if (!cardDisplay) {
    console.warn('Character card display element not found');
    return;
  }

  if (!character) {
    cardDisplay.style.display = 'none';
    return;
  }

  const profile = character.profile || {};
  const images = profile.images || (profile.image ? [profile.image] : []);
  const thumbnailIndex = profile.thumbnailIndex !== undefined ? profile.thumbnailIndex : 0;
  const thumbnailImage = images.length > 0 ? images[thumbnailIndex] : null;

  // Calculate token counts (matching BotWaffle's logic)
  let sheetTokens = 0;
  let scenarioTokens = 0;
  let initialTokens = 0;
  let examplesTokens = 0;
  
  if (character.personality) {
    if (typeof character.personality === 'string') {
      sheetTokens = estimateTokens(character.personality);
    } else if (character.personality.characterData) {
      sheetTokens = countTokensInObject(character.personality.characterData);
    } else if (character.personality.personality) {
      sheetTokens = estimateTokens(String(character.personality.personality));
    } else {
      sheetTokens = countTokensInObject(character.personality);
    }
  }
  
  if (character.scenario) {
    if (typeof character.scenario === 'string') {
      scenarioTokens = estimateTokens(character.scenario);
    } else if (character.scenario.scenario) {
      scenarioTokens = estimateTokens(String(character.scenario.scenario));
    } else {
      scenarioTokens = countTokensInObject(character.scenario);
    }
  }
  
  if (character.initialMessages) {
    if (Array.isArray(character.initialMessages)) {
      initialTokens = character.initialMessages.reduce((sum, msg) => {
        if (typeof msg === 'string') return sum + estimateTokens(msg);
        const text = msg.text || msg.message || '';
        return sum + estimateTokens(String(text));
      }, 0);
    } else if (typeof character.initialMessages === 'string') {
      initialTokens = estimateTokens(character.initialMessages);
    }
  }
  
  if (character.exampleDialogs) {
    if (Array.isArray(character.exampleDialogs)) {
      examplesTokens = character.exampleDialogs.reduce((sum, dialog) => {
        if (typeof dialog === 'string') return sum + estimateTokens(dialog);
        const userText = String(dialog.user || '');
        const assistantText = String(dialog.assistant || '');
        const dialogText = String(dialog.text || '');
        return sum + estimateTokens(userText) + estimateTokens(assistantText) + estimateTokens(dialogText);
      }, 0);
    } else if (typeof character.exampleDialogs === 'string') {
      examplesTokens = estimateTokens(character.exampleDialogs);
    }
  }
  
  const permTokens = sheetTokens + scenarioTokens + examplesTokens;
  const tempTokens = initialTokens;
  const totalTokens = permTokens + tempTokens;

  // Determine if it's a local file path or URL
  let imageSrc = '';
  if (thumbnailImage) {
    const isLocalFile = thumbnailImage && !thumbnailImage.startsWith('http://') && !thumbnailImage.startsWith('https://') && !thumbnailImage.startsWith('file://');
    if (isLocalFile) {
      const normalizedPath = thumbnailImage.replace(/\\/g, '/');
      imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
    } else {
      imageSrc = thumbnailImage;
    }
  }

  // Escape HTML to prevent XSS
  const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const displayName = escapeHtml(profile.displayName || profile.name || 'Unnamed Character');
  const name = escapeHtml(profile.name || '');
  const category = escapeHtml(profile.category || '');
  let descriptionText = profile.description || 'No description provided.';
  if (descriptionText.length > 150) {
    descriptionText = descriptionText.substring(0, 150).trim() + '...';
  }
  const description = escapeHtml(descriptionText);
  const tags = profile.tags || [];
  const statusValue = character.metadata?.status || 'draft';
  const statusDisplay = statusValue === 'to-delete' ? 'To Delete' : statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
  const version = escapeHtml(character.metadata?.version || '1.0.0');
  const firstChar = name.charAt(0).toUpperCase() || '?';
  
  // Get resource counts
  const imageCount = images.length || 0;
  const scriptsCount = character.scripts?.length || 0;
  const imagePromptsCount = (character.metadata?.imagePrompts?.length || character.imagePrompts?.length || 0);

  cardDisplay.innerHTML = `
    <button id="characterCardClose" class="character-card-close" title="Clear character selection" aria-label="Clear character selection">
      <i data-feather="x"></i>
    </button>
    <div class="chatbot-card status-${statusValue}">
      <div class="card-header-section">
        <div class="card-header-top">
          <div class="card-title-group">
            <h3>${displayName}</h3>
            <div class="category">${category}</div>
          </div>
          <div class="card-header-actions">
            <div class="status-badge ${statusValue}">${escapeHtml(statusDisplay)}</div>
          </div>
        </div>
        <p class="description">${description}</p>
      </div>
      <div class="card-body-section">
        <div class="card-visual-compact">
          ${imageSrc
            ? `<img src="${escapeHtml(imageSrc)}" alt="${displayName}" class="bot-image-compact" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="avatar-placeholder-compact" style="display: none;">${firstChar}</div>`
            : `<div class="avatar-placeholder-compact">${firstChar}</div>`
          }
          <div class="card-tags-compact">
            ${tags.map(tag => `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
        <div class="card-data-section">
          <div class="token-breakdown-compact">
            <div class="token-row">
              <span class="token-label-compact">SHEET:</span>
              <span class="token-value-compact token-personality">${sheetTokens}</span>
              <span class="token-label-compact">SCENARIO:</span>
              <span class="token-value-compact token-scenario">${scenarioTokens}</span>
            </div>
            <div class="token-row">
              <span class="token-label-compact">INITIAL:</span>
              <span class="token-value-compact token-initial-messages">${initialTokens}</span>
              <span class="token-label-compact">EXAMPLES:</span>
              <span class="token-value-compact token-example-dialogs">${examplesTokens}</span>
            </div>
            <div class="token-totals-compact">
              <div class="token-total-row">
                <span class="token-total-label-compact">PERM:</span>
                <span class="token-total-value-compact token-perm">${permTokens}</span>
                <span class="token-total-label-compact">TEMP:</span>
                <span class="token-total-value-compact token-temp">${tempTokens}</span>
                <span class="token-total-label-compact">TOTAL:</span>
                <span class="token-total-value-compact token-grand">${totalTokens}</span>
              </div>
            </div>
          </div>
          <div class="card-assets-compact">
            <button class="asset-button-compact asset-images" data-type="images" title="View Images">
              <span class="asset-icon-compact">🖼️</span>
              <span class="asset-count-compact">${imageCount}</span>
            </button>
            <button class="asset-button-compact asset-scripts" data-type="scripts" title="View Scripts">
              <span class="asset-icon-compact">📜</span>
              <span class="asset-count-compact">${scriptsCount}</span>
            </button>
            <button class="asset-button-compact asset-prompts" data-type="prompts" title="View Image Prompts">
              <span class="asset-icon-compact">✨</span>
              <span class="asset-count-compact">${imagePromptsCount}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="card-footer-compact">
        <span class="version-compact">v${version}</span>
        <div class="card-dates-compact">
          ${character.metadata?.created ? `<span class="date-item-compact"><span class="date-label-compact">Created:</span> <span class="date-value-compact">${new Date(character.metadata.created).toLocaleDateString()}</span></span>` : ''}
          ${character.metadata?.updated ? `<span class="date-item-compact"><span class="date-label-compact">Edited:</span> <span class="date-value-compact">${new Date(character.metadata.updated).toLocaleDateString()}</span></span>` : ''}
        </div>
      </div>
    </div>
  `;

  // Display the card inline within the character section
  cardDisplay.style.display = 'block';
  
  // Update button text to show selected character name
  const selectBtn = document.getElementById('characterSelectBtn');
  const selectBtnText = document.getElementById('characterSelectBtnText');
  if (selectBtn && selectBtnText) {
    const displayName = profile.displayName || profile.name || 'Unnamed Character';
    selectBtnText.textContent = displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName;
  }
  
  // Show the save prompt button
  const savePromptBtn = document.getElementById('savePromptToCharacterBtn');
  if (savePromptBtn) {
    savePromptBtn.style.display = 'flex';
  }
  
  // Setup close button handler
  setTimeout(() => {
    const closeBtn = cardDisplay.querySelector('#characterCardClose');
    if (closeBtn) {
      // Remove any existing listeners by cloning
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      
      newCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearCharacterSelection();
      });
      
      // Initialize Feather icons
      if (window.feather) {
        window.feather.replace();
      }
    }
  }, 0);
  
  // Setup save prompt button handler
  setTimeout(() => {
    const savePromptBtn = document.getElementById('savePromptToCharacterBtn');
    if (savePromptBtn) {
      // Remove any existing listeners by cloning
      const newSaveBtn = savePromptBtn.cloneNode(true);
      savePromptBtn.parentNode.replaceChild(newSaveBtn, savePromptBtn);
      
      newSaveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await savePromptToCharacter(character.id);
      });
      
      // Initialize Feather icons
      if (window.feather) {
        window.feather.replace();
      }
    }
  }, 0);
}

/**
 * Clears the character selection
 */
export function clearCharacterSelection() {
  const cardDisplay = document.getElementById('characterCardDisplay');
  if (cardDisplay) {
    cardDisplay.style.display = 'none';
    cardDisplay.innerHTML = '';
  }
  
  // Reset button text
  const selectBtnText = document.getElementById('characterSelectBtnText');
  if (selectBtnText) {
    selectBtnText.textContent = 'Select Character...';
  }
  
  // Hide the save prompt button
  const savePromptBtn = document.getElementById('savePromptToCharacterBtn');
  if (savePromptBtn) {
    savePromptBtn.style.display = 'none';
  }
}

/**
 * Gets the compiled prompt text from PromptWaffle
 */
function getCompiledPromptText() {
  const container = document.getElementById('compiledPrompt');
  if (!container) return '';
  
  // Extract text content from the HTML (removes HTML tags and gets plain text)
  const textContent = container.textContent || container.innerText || '';
  
  // Clean up: remove extra whitespace and normalize
  return textContent.trim().replace(/\s+/g, ' ');
}

/**
 * Saves the compiled prompt to the character's image prompts
 */
async function savePromptToCharacter(characterId) {
  try {
    // Get the compiled prompt text
    const promptText = getCompiledPromptText();
    
    if (!promptText || !promptText.trim()) {
      showToast('No compiled prompt to save. Build a prompt on the board first.', 'warning');
      return;
    }
    
    // Get prompt name from user
    const promptName = await showInputModal(
      'Save Prompt to Character',
      'Enter a name for this prompt',
      ''
    );
    
    if (!promptName || !promptName.trim()) {
      return; // User cancelled
    }
    
    // Get current character data
    const character = await window.electronAPI.getChatbot(characterId);
    if (!character) {
      showToast('Failed to load character data', 'error');
      return;
    }
    
    // Get existing image prompts
    const imagePrompts = character.metadata?.imagePrompts || character.imagePrompts || [];
    
    // Create new prompt object
    const newPrompt = {
      name: promptName.trim(),
      text: promptText.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Add to array
    imagePrompts.push(newPrompt);
    
    // Update character metadata
    const metadata = character.metadata || {};
    metadata.imagePrompts = imagePrompts;
    
    // Save to BotWaffle
    await window.electronAPI.updateChatbot(characterId, {
      metadata: metadata
    });
    
    showToast(`Prompt "${promptName.trim()}" saved to character's image prompts!`, 'success');
  } catch (error) {
    console.error('Error saving prompt to character:', error);
    showToast('Failed to save prompt: ' + (error.message || 'Unknown error'), 'error');
  }
}
