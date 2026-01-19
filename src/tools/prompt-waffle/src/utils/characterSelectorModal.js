/**
 * Character Selector Modal
 * Provides a searchable modal interface for selecting characters from BotWaffle
 * Designed to handle hundreds of characters efficiently
 */

import { showToast } from './index.js';

class CharacterSelectorModal {
  constructor() {
    this.modal = null;
    this.searchInput = null;
    this.characterList = null;
    this.characters = [];
    this.filteredCharacters = [];
    this.selectedCharacterId = null;
    this.onSelectCallback = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the modal
   */
  async init() {
    if (this.isInitialized) return;

    // Create modal HTML if it doesn't exist
    this.createModal();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Create the modal HTML structure
   */
  createModal() {
    // Check if modal already exists
    let modal = document.getElementById('characterSelectorModal');
    if (modal) {
      this.modal = modal;
      this.searchInput = document.getElementById('characterSearchInput');
      this.characterList = document.getElementById('characterListContainer');
      return;
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'characterSelectorModal';
    modal.className = 'character-selector-modal';
    modal.innerHTML = `
      <div class="character-selector-modal-content">
        <div class="character-selector-header">
          <h3>Select Character</h3>
          <button class="character-selector-close" aria-label="Close">
            <i data-feather="x"></i>
          </button>
        </div>
        <div class="character-selector-search">
          <input 
            type="text" 
            id="characterSearchInput" 
            class="character-selector-search-input" 
            placeholder="Search by name, category, or tags..."
            autocomplete="off"
          />
          <i data-feather="search" class="search-icon"></i>
        </div>
        <div class="character-selector-filters">
          <select id="characterCategoryFilter" class="character-selector-filter">
            <option value="">All Categories</option>
          </select>
          <select id="characterStatusFilter" class="character-selector-filter">
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div class="character-selector-results">
          <div class="character-selector-count" id="characterCountDisplay">0 characters</div>
          <div class="character-selector-list" id="characterListContainer">
            <!-- Character cards will be rendered here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.searchInput = document.getElementById('characterSearchInput');
    this.characterList = document.getElementById('characterListContainer');

    // Initialize Feather icons
    if (window.feather) {
      window.feather.replace();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.character-selector-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.close();
      }
    });

    // Backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterCharacters());
    }

    // Category filter
    const categoryFilter = document.getElementById('characterCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.filterCharacters());
    }

    // Status filter
    const statusFilter = document.getElementById('characterStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterCharacters());
    }
  }

  /**
   * Load characters from BotWaffle
   */
  async loadCharacters() {
    try {
      this.characters = await window.electronAPI.listChatbots();
      if (!Array.isArray(this.characters)) {
        this.characters = [];
      }
      
      // Populate category filter
      this.populateCategoryFilter();
      
      // Initial filter
      this.filterCharacters();
    } catch (error) {
      console.error('Error loading characters:', error);
      showToast('Failed to load characters from BotWaffle', 'error');
      this.characters = [];
      this.filterCharacters();
    }
  }

  /**
   * Populate category filter dropdown
   */
  populateCategoryFilter() {
    const categoryFilter = document.getElementById('characterCategoryFilter');
    if (!categoryFilter) return;

    // Get unique categories
    const categories = new Set();
    this.characters.forEach(char => {
      const category = char.profile?.category;
      if (category && category.trim()) {
        categories.add(category);
      }
    });

    // Clear existing options except "All Categories"
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }

    // Add category options
    Array.from(categories).sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  /**
   * Filter characters based on search and filters
   */
  filterCharacters() {
    const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('characterCategoryFilter')?.value || '';
    const statusFilter = document.getElementById('characterStatusFilter')?.value || '';

    this.filteredCharacters = this.characters.filter(character => {
      const profile = character.profile || {};
      const name = (profile.displayName || profile.name || '').toLowerCase();
      const category = (profile.category || '').toLowerCase();
      const tags = (profile.tags || []).map(t => t.toLowerCase()).join(' ');
      const description = (profile.description || '').toLowerCase();
      const status = (character.metadata?.status || 'draft').toLowerCase();

      // Search filter
      const matchesSearch = !searchTerm || 
        name.includes(searchTerm) ||
        category.includes(searchTerm) ||
        tags.includes(searchTerm) ||
        description.includes(searchTerm);

      // Category filter
      const matchesCategory = !categoryFilter || 
        (profile.category || '').toLowerCase() === categoryFilter.toLowerCase();

      // Status filter
      const matchesStatus = !statusFilter || status === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });

    this.renderCharacters();
    this.updateCount();
  }

  /**
   * Update character count display
   */
  updateCount() {
    const countDisplay = document.getElementById('characterCountDisplay');
    if (countDisplay) {
      const count = this.filteredCharacters.length;
      const total = this.characters.length;
      countDisplay.textContent = `${count} of ${total} character${total !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Render character cards
   */
  renderCharacters() {
    if (!this.characterList) return;

    if (this.filteredCharacters.length === 0) {
      this.characterList.innerHTML = `
        <div class="character-selector-empty">
          <i data-feather="search"></i>
          <p>No characters found</p>
          <p class="character-selector-empty-hint">Try adjusting your search or filters</p>
        </div>
      `;
      if (window.feather) window.feather.replace();
      return;
    }

    // Render character cards
    this.characterList.innerHTML = this.filteredCharacters.map(character => {
      return this.renderCharacterCard(character);
    }).join('');

    // Add click handlers
    this.characterList.querySelectorAll('.character-selector-card').forEach(card => {
      card.addEventListener('click', () => {
        const characterId = card.dataset.characterId;
        this.selectCharacter(characterId);
      });
    });

    // Initialize Feather icons
    if (window.feather) {
      window.feather.replace();
    }
  }

  /**
   * Render a single character card
   */
  renderCharacterCard(character) {
    const profile = character.profile || {};
    const images = profile.images || (profile.image ? [profile.image] : []);
    const thumbnailIndex = profile.thumbnailIndex !== undefined ? profile.thumbnailIndex : 0;
    const thumbnailImage = images.length > 0 ? images[thumbnailIndex] : null;

    // Escape HTML
    const escapeHtml = (str) => {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const displayName = escapeHtml(profile.displayName || profile.name || 'Unnamed Character');
    const category = escapeHtml(profile.category || '');
    const statusValue = character.metadata?.status || 'draft';
    const statusDisplay = statusValue === 'to-delete' ? 'To Delete' : 
      statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
    const firstChar = (profile.name || displayName || '?').charAt(0).toUpperCase();

    // Image source
    let imageSrc = '';
    if (thumbnailImage) {
      const isLocalFile = !thumbnailImage.startsWith('http://') && 
        !thumbnailImage.startsWith('https://') && 
        !thumbnailImage.startsWith('file://');
      if (isLocalFile) {
        const normalizedPath = thumbnailImage.replace(/\\/g, '/');
        imageSrc = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
      } else {
        imageSrc = thumbnailImage;
      }
    }

    return `
      <div class="character-selector-card" data-character-id="${character.id}">
        <div class="character-selector-card-image">
          ${imageSrc
            ? `<img src="${escapeHtml(imageSrc)}" alt="${displayName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="character-selector-card-avatar" style="display: none;">${firstChar}</div>`
            : `<div class="character-selector-card-avatar">${firstChar}</div>`
          }
        </div>
        <div class="character-selector-card-info">
          <div class="character-selector-card-header">
            <h4>${displayName}</h4>
            <span class="character-selector-card-status status-${statusValue}">${escapeHtml(statusDisplay)}</span>
          </div>
          ${category ? `<div class="character-selector-card-category">${category}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Select a character
   */
  selectCharacter(characterId) {
    this.selectedCharacterId = characterId;
    if (this.onSelectCallback) {
      const character = this.characters.find(c => c.id === characterId);
      this.onSelectCallback(character);
    }
    this.close();
  }

  /**
   * Open the modal
   */
  async open(onSelect) {
    if (!this.isInitialized) {
      await this.init();
    }

    this.onSelectCallback = onSelect;
    this.selectedCharacterId = null;

    // Load characters
    await this.loadCharacters();

    // Show modal
    if (this.modal) {
      this.modal.style.display = 'flex';
      
      // Focus search input
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.focus();
        }
      }, 100);
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.onSelectCallback = null;
  }
}

// Export singleton instance
export const characterSelectorModal = new CharacterSelectorModal();
