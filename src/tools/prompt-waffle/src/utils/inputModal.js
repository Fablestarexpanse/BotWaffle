/**
 * Input Modal Utility
 * Provides a simple input dialog for user text input
 */

/**
 * Show an input modal
 * @param {string} title - The title of the input dialog
 * @param {string} placeholder - Placeholder text for the input
 * @param {string} defaultValue - Default value for the input
 * @returns {Promise<string|null>} - Resolves to the input value, or null if cancelled
 */
export async function showInputModal(title, placeholder = '', defaultValue = '') {
  return new Promise((resolve) => {
    // Create modal if it doesn't exist
    let modal = document.getElementById('inputModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'inputModal';
      modal.className = 'input-modal';
      modal.innerHTML = `
        <div class="input-modal-content">
          <div class="input-modal-header">
            <h3 id="inputModalTitle">${title}</h3>
            <button class="input-modal-close" aria-label="Close">
              <i data-feather="x"></i>
            </button>
          </div>
          <div class="input-modal-body">
            <input 
              type="text" 
              id="inputModalInput" 
              class="input-modal-input" 
              placeholder="${placeholder}"
              autocomplete="off"
            />
          </div>
          <div class="input-modal-footer">
            <button id="inputModalCancel" class="input-modal-btn input-modal-btn-cancel">Cancel</button>
            <button id="inputModalConfirm" class="input-modal-btn input-modal-btn-confirm">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Initialize Feather icons
      if (window.feather) {
        window.feather.replace();
      }
    }

    const titleElement = document.getElementById('inputModalTitle');
    const inputElement = document.getElementById('inputModalInput');
    const cancelBtn = document.getElementById('inputModalCancel');
    const confirmBtn = document.getElementById('inputModalConfirm');
    const closeBtn = modal.querySelector('.input-modal-close');

    if (!titleElement || !inputElement || !cancelBtn || !confirmBtn) {
      console.error('Input modal elements not found');
      resolve(null);
      return;
    }

    // Set the title and input value
    titleElement.textContent = title;
    inputElement.placeholder = placeholder;
    inputElement.value = defaultValue;

    // Show the modal
    modal.style.display = 'flex';
    
    // Focus the input
    setTimeout(() => {
      inputElement.focus();
      inputElement.select();
    }, 100);

    // Handle cancel/close
    const handleCancel = () => {
      modal.style.display = 'none';
      inputElement.value = '';
      cancelBtn.removeEventListener('click', handleCancel);
      confirmBtn.removeEventListener('click', handleConfirm);
      if (closeBtn) closeBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleEscape);
      modal.removeEventListener('click', handleBackdropClick);
      resolve(null);
    };

    // Handle confirm
    const handleConfirm = () => {
      const value = inputElement.value.trim();
      modal.style.display = 'none';
      inputElement.value = '';
      cancelBtn.removeEventListener('click', handleCancel);
      confirmBtn.removeEventListener('click', handleConfirm);
      if (closeBtn) closeBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleEscape);
      modal.removeEventListener('click', handleBackdropClick);
      resolve(value || null);
    };

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    // Handle Enter key
    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    // Handle clicking outside modal
    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    // Add event listeners
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    if (closeBtn) closeBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleEscape);
    inputElement.addEventListener('keydown', handleEnter);
    modal.addEventListener('click', handleBackdropClick);
  });
}
