// Character Builder Button Handler
// This file ensures the Character Builder button works

console.log('[Character Builder Button] Script loaded');

function setupCharacterBuilderButton() {
  console.log('[Character Builder Button] Setting up button...');
  
  const btn = document.getElementById('openCharacterBuilderBtn');
  if (!btn) {
    console.warn('[Character Builder Button] Button not found, retrying...');
    setTimeout(setupCharacterBuilderButton, 500);
    return;
  }
  
  console.log('[Character Builder Button] Button found!', btn);
  
  // Ensure button is clickable
  btn.style.pointerEvents = 'auto';
  btn.style.cursor = 'pointer';
  
  // Remove any existing onclick
  btn.removeAttribute('onclick');
  
  // Create handler
  const handler = async function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('[Character Builder Button] CLICK HANDLER FIRED!', e);
    
    try {
      // Import characterBuilder dynamically to avoid module loading conflicts
      const characterBuilderModule = await import('./characterBuilder.js');
      const characterBuilder = characterBuilderModule.characterBuilder;
      console.log('[Character Builder Button] Character Builder imported');
      
      if (!characterBuilder || !characterBuilder.isInitialized) {
        console.log('[Character Builder Button] Initializing...');
        if (characterBuilder) {
          await characterBuilder.init();
        } else {
          throw new Error('Character Builder module not available');
        }
      }
      
      console.log('[Character Builder Button] Opening modal...');
      await characterBuilder.openModal();
      console.log('[Character Builder Button] Modal opened');
    } catch (error) {
      console.error('[Character Builder Button] Error:', error);
      console.error('[Character Builder Button] Error stack:', error.stack);
      alert('Error opening Character Builder: ' + error.message);
    }
    
    return false;
  };
  
  // Add multiple event listeners
  btn.addEventListener('click', handler, true); // Capture phase
  btn.addEventListener('click', handler, false); // Bubble phase
  btn.addEventListener('mousedown', function(e) {
    console.log('[Character Builder Button] MOUSEDOWN!', e);
    handler(e);
  }, true);
  
  // Also set onclick property
  btn.onclick = handler;
  
  console.log('[Character Builder Button] Button handlers attached successfully');
}

// Try immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCharacterBuilderButton);
} else {
  setupCharacterBuilderButton();
}

// Also try after delays
setTimeout(setupCharacterBuilderButton, 100);
setTimeout(setupCharacterBuilderButton, 500);
setTimeout(setupCharacterBuilderButton, 1000);
setTimeout(setupCharacterBuilderButton, 2000);
setTimeout(setupCharacterBuilderButton, 3000);
setTimeout(setupCharacterBuilderButton, 5000);

// Use MutationObserver to catch button if added dynamically
const observer = new MutationObserver((mutations) => {
  const btn = document.getElementById('openCharacterBuilderBtn');
  if (btn && !btn.dataset.handlerAttached) {
    console.log('[Character Builder Button] Button detected via MutationObserver!');
    btn.dataset.handlerAttached = 'true';
    setupCharacterBuilderButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Expose globally
window.setupCharacterBuilderButton = setupCharacterBuilderButton;
window.openCharacterBuilder = async () => {
  console.log('[Character Builder Button] Global function called');
  try {
    const characterBuilderModule = await import('./characterBuilder.js');
    const characterBuilder = characterBuilderModule.characterBuilder;
    if (!characterBuilder) {
      throw new Error('Character Builder module not available');
    }
    if (!characterBuilder.isInitialized) {
      await characterBuilder.init();
    }
    await characterBuilder.openModal();
  } catch (error) {
    console.error('[Character Builder Button] Global function error:', error);
    console.error('[Character Builder Button] Error stack:', error.stack);
    alert('Error: ' + error.message);
  }
};
