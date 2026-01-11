/**
 * Markdown Parser for Character Sheet Outlines
 * Converts markdown outlines into BotWaffle section structures
 */

(function() {
    'use strict';

    /**
     * Parses a markdown outline into section structures
     * @param {string} markdown - The markdown text to parse
     * @returns {Array} Array of section objects compatible with editor.layout
     */
    function parseMarkdownToSections(markdown) {
        const lines = markdown.split('\n');
        const sections = [];
        let currentSection = null;
        let currentFields = [];

        // Helper to sanitize field names (same as editor-modals.js)
        function sanitizeFieldName(text) {
            return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        }

        // Helper to extract label from list item or bold text
        function extractLabel(line) {
            // Remove list marker (-, *, +) and trim
            line = line.replace(/^[\s]*[-*+]\s*/, '').trim();
            
            // Remove bold markers (**text**)
            line = line.replace(/\*\*(.+?)\*\*/g, '$1').trim();
            
            // Remove colon and trailing spaces
            line = line.replace(/:\s*$/, '').trim();
            
            return line;
        }

        // Helper to finalize current section
        function finalizeSection() {
            if (currentSection && currentFields.length > 0) {
                sections.push({
                    type: 'custom',
                    id: `category-${sanitizeFieldName(currentSection)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    category: currentSection,
                    fields: currentFields,
                    minimized: false
                });
            }
            currentSection = null;
            currentFields = [];
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Skip template tags like <{{char}}> or </{{char}}>
            if (line.match(/^<[\/]?\{\{.*\}\}>$/)) continue;

            // Check for headers (# or ##)
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);

            if (h1Match) {
                // H1 header = new category
                finalizeSection();
                currentSection = h1Match[1].trim();
            } else if (h2Match) {
                // H2 header = could be a new category or sub-section
                // For now, treat as new category (user can merge manually if needed)
                finalizeSection();
                currentSection = h2Match[1].trim();
            } else if (line.match(/^[-*+]\s+/)) {
                // List item = field
                if (!currentSection) {
                    // If no section exists, create a default one
                    currentSection = 'General';
                }

                const label = extractLabel(line);
                if (label) {
                    const fieldName = sanitizeFieldName(label);
                    // Determine field type: if it ends with ":" and is short, likely text; if longer content, textarea
                    const fieldType = label.length > 50 ? 'textarea' : 'text';
                    
                    currentFields.push({
                        name: fieldName || `field_${currentFields.length + 1}`,
                        label: label,
                        type: fieldType,
                        placeholder: ''
                    });
                }
            } else if (line.match(/\*\*.+?\*\*/)) {
                // Bold text on its own line = could be a field label
                if (!currentSection) {
                    currentSection = 'General';
                }

                const label = extractLabel(line);
                if (label) {
                    const fieldName = sanitizeFieldName(label);
                    currentFields.push({
                        name: fieldName || `field_${currentFields.length + 1}`,
                        label: label,
                        type: 'textarea', // Bold labels often have longer content
                        placeholder: ''
                    });
                }
            }
            // Other lines are ignored (plain text without markers)
        }

        // Finalize last section
        finalizeSection();

        return sections;
    }

    /**
     * Validates parsed sections
     * @param {Array} sections - Array of section objects
     * @returns {Object} { valid: boolean, errors: Array }
     */
    function validateParsedSections(sections) {
        const errors = [];

        if (!Array.isArray(sections)) {
            errors.push('Sections must be an array');
            return { valid: false, errors };
        }

        if (sections.length === 0) {
            errors.push('No sections found in markdown. Please check your format.');
            return { valid: false, errors };
        }

        sections.forEach((section, index) => {
            if (!section.category || typeof section.category !== 'string') {
                errors.push(`Section ${index + 1}: Missing or invalid category name`);
            }
            if (!Array.isArray(section.fields) || section.fields.length === 0) {
                errors.push(`Section "${section.category || index + 1}": Must have at least one field`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Export to global scope
    window.MarkdownParser = {
        parseMarkdownToSections,
        validateParsedSections
    };
})();
