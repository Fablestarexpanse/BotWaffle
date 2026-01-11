/**
 * Token Counter Utility
 * Simple token estimation (words / 4) - will be replaced with proper formula later
 */

(function() {
    'use strict';

    /**
     * Estimates token count from text (simple approximation: words / 4)
     * @param {string} text - Text to count tokens for
     * @returns {number} Estimated token count
     */
    function estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        const trimmed = text.trim();
        if (!trimmed) return 0;
        
        // GPT tokenization approximation (aligned with tiktoken/GPT tokenizer behavior)
        // Character-based counting for mixed content (text + markdown formatting)
        
        const charCount = trimmed.length;
        
        // For character sheets exported as markdown (the format sent to models):
        // Markdown formatting adds tokens: headers (#), list markers (-), bold (**), etc.
        // Special chars, punctuation, and formatting tokens increase token density
        // Based on comparison with JanitorAI's tiktoken counts, use ~2.1 chars/token
        // This accounts for the exported markdown format with all its structure
        return Math.ceil(charCount / 2.1);
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
            if (input.value) {
                count += estimateTokens(input.value);
            }
        });
        
        // Also count text in non-input elements (for complex sections)
        // Exclude labels, buttons, and other UI elements
        const textNodes = body.querySelectorAll('*');
        textNodes.forEach(node => {
            if (node.children.length === 0 && node.textContent) {
                const text = node.textContent.trim();
                // Exclude labels, buttons, tabs, dialog headers, and other UI elements
                if (text && !node.closest('input, textarea, button, script, style, label, .message-tab, .tab-close, .dialog-header, .dialog-number, .initial-messages-header, .dialogs-header')) {
                    // Skip if it's just whitespace or very short
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
                tokenDisplay.style.cssText = 'margin-right: 8px; font-size: 0.85em; color: var(--text-secondary);';
                header.insertBefore(tokenDisplay, header.firstChild);
            }
        }
        
        if (tokenDisplay) {
            if (max !== null) {
                tokenDisplay.textContent = `Section Token Count: ${count}:${max}`;
            } else {
                tokenDisplay.textContent = `Section Token Count: ${count}`;
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