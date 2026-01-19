/**
 * Token Counter Utility
 * Simple token estimation (words / 4) - will be replaced with proper formula later
 */

(function() {
    'use strict';

    /**
     * Estimates token count from text using tiktoken-compatible approximation
     * @param {string} text - Text to count tokens for
     * @returns {number} Estimated token count
     */
    function estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        const trimmed = text.trim();
        if (!trimmed) return 0;
        
        // GPT tokenization approximation (aligned with tiktoken cl100k_base tokenizer)
        // The cl100k_base tokenizer used by GPT-3.5 and GPT-4 averages approximately
        // 3.8-4.0 characters per token for typical English prose with formatting.
        // This is more accurate than the previous 2.1 ratio which was overcounting.
        // 
        // For character sheets with markdown formatting, special characters, and
        // structured text, we use 3.9 chars/token to match JanitorAI's tiktoken counts.
        const charCount = trimmed.length;
        return Math.ceil(charCount / 3.9);
    }

    /**
     * Counts tokens in an object recursively
     * @param {*} obj - Object, string, array, etc.
     * @returns {number} Total token count
     */
    function countTokensInObject(obj) {
        if (obj === null || obj === undefined) return 0;
        
        if (typeof obj === 'string') {
            return estimateTokens(obj);
        }
        
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return 1; // Simple values count as 1 token
        }
        
        if (Array.isArray(obj)) {
            return obj.reduce((sum, item) => sum + countTokensInObject(item), 0);
        }
        
        if (typeof obj === 'object') {
            return Object.values(obj).reduce((sum, value) => sum + countTokensInObject(value), 0);
        }
        
        return 0;
    }

    /**
     * Gets token count for a section element
     * @param {HTMLElement} sectionElement - The section element
     * @returns {number} Token count
     */
    function getSectionTokenCount(sectionElement) {
        if (!sectionElement) return 0;
        
        const body = sectionElement.querySelector('.section-body');
        if (!body) return 0;
        
        let count = 0;
        
        // Get all text inputs, textareas, and text content
        const inputs = body.querySelectorAll('input[type="text"], textarea, input[type="email"], input[type="url"]');
        inputs.forEach(input => {
            // Only count if there's actual content (not just whitespace)
            const value = input.value ? input.value.trim() : '';
            if (value) {
                count += estimateTokens(value);
            }
        });
        
        // Also count text in non-input elements (for complex sections)
        // Exclude labels, buttons, hints, and other UI elements
        const textNodes = body.querySelectorAll('*');
        textNodes.forEach(node => {
            if (node.children.length === 0 && node.textContent) {
                const text = node.textContent.trim();
                // Skip if empty or whitespace
                if (!text) return;
                
                // Exclude UI elements: labels, buttons, hints, tabs, headers, etc.
                const isUIElement = node.closest('input, textarea, button, script, style, label, .message-tab, .tab-close, .dialog-header, .dialog-number, .initial-messages-header, .dialogs-header, .field-hint, .form-group label, .section-header, .section-title') ||
                                   node.classList.contains('field-hint') ||
                                   node.tagName === 'LABEL' ||
                                   node.tagName === 'BUTTON';
                
                if (!isUIElement) {
                    // Only count if it's substantial content (more than 3 chars)
                    if (text.length > 3) {
                        count += estimateTokens(text);
                    }
                }
            }
        });
        
        return count;
    }

    /**
     * Updates token count display for a section
     * @param {HTMLElement} sectionElement - The section element
     * @param {number} count - Token count to display
     * @param {number} max - Max tokens (optional)
     */
    function updateTokenDisplay(sectionElement, count, max = null) {
        if (!sectionElement) return;
        
        let tokenDisplay = sectionElement.querySelector('.token-count');
        if (!tokenDisplay) {
            // Create token display element
            const header = sectionElement.querySelector('.section-header .header-actions');
            if (header) {
                tokenDisplay = document.createElement('span');
                tokenDisplay.className = 'token-count';
                header.insertBefore(tokenDisplay, header.firstChild);
            }
        }
        
        if (tokenDisplay) {
            if (max !== null) {
                tokenDisplay.textContent = `${count} / ${max} tokens`;
            } else {
                tokenDisplay.textContent = `${count} tokens`;
            }
        }
    }

    // Export to global scope
    window.TokenCounter = {
        estimateTokens,
        countTokensInObject,
        getSectionTokenCount,
        updateTokenDisplay
    };
})();