/**
 * Markdown Exporter for Character Sheets
 * Converts chatbot sections back into markdown format
 */

(function() {
    'use strict';

    /**
     * Converts chatbot data to markdown character sheet format
     * Excludes the basic profile section
     * @param {Object} chatbotData - The chatbot data object
     * @param {Array} layout - The section layout array
     * @returns {string} Markdown formatted character sheet
     */
    function exportToMarkdown(chatbotData, layout) {
        const lines = [];
        
        // Helper to escape markdown special characters in content
        function escapeMarkdown(text) {
            if (!text) return '';
            return String(text).replace(/\n/g, ' ').trim();
        }

        // Helper to format field value
        function formatFieldValue(value) {
            if (!value) return '';
            const str = String(value).trim();
            // If it's multi-line or long, keep as-is, otherwise return trimmed
            return str;
        }

        // Process each section in layout order
        layout.forEach(sectionConfig => {
            // Skip profile section
            if (sectionConfig.type === 'profile') {
                return;
            }

            const tagName = sectionConfig.type === 'custom' ? 'section-custom' : `section-${sectionConfig.type}`;
            
            // Get section element if available (for live data)
            let sectionData = null;
            
            if (sectionConfig.type === 'custom') {
                // Custom sections are stored in customSections[category]
                const customSections = chatbotData.customSections || {};
                sectionData = customSections[sectionConfig.category] || {};
                
                // Add category as H1 header (always include the section)
                lines.push(`# ${sectionConfig.category || 'Custom Section'}`);
                lines.push('');

                // Add fields as list items (always include, even if empty)
                const fields = sectionConfig.fields || [];
                if (fields.length > 0) {
                    fields.forEach(field => {
                        const value = sectionData[field.name] || '';
                        const formattedValue = formatFieldValue(value);
                        
                        // Always include the field label, even if value is empty
                        lines.push(`- ${field.label || field.name}: ${formattedValue}`);
                    });
                } else {
                    // If no fields defined, at least show the section header
                    lines.push(`- (No fields defined)`);
                }
                
                lines.push('');
            } else if (sectionConfig.type === 'personality') {
                // Personality section - convert to markdown
                const personality = chatbotData.personality || {};
                const characterData = personality.characterData || personality;
                
                lines.push(`# Personality`);
                lines.push('');

                // Extract personality data from characterData if available, otherwise from personality
                const dataSource = characterData || personality;

                // Personality core text
                if (dataSource.personality) {
                    lines.push(`## Personality Core`);
                    lines.push('');
                    const personalityText = formatFieldValue(dataSource.personality);
                    if (personalityText.includes('\n')) {
                        lines.push(personalityText);
                    } else {
                        lines.push(escapeMarkdown(personalityText));
                    }
                    lines.push('');
                }

                // System prompt
                if (dataSource.systemPrompt) {
                    lines.push(`## System Prompt`);
                    lines.push('');
                    const systemPromptText = formatFieldValue(dataSource.systemPrompt);
                    if (systemPromptText.includes('\n')) {
                        lines.push(systemPromptText);
                    } else {
                        lines.push(escapeMarkdown(systemPromptText));
                    }
                    lines.push('');
                }

                // Extract other fields from characterData structure
                if (dataSource.traits) {
                    lines.push(`## Defining Traits`);
                    lines.push('');
                    const traitsText = formatFieldValue(dataSource.traits);
                    if (traitsText.includes('\n')) {
                        lines.push(traitsText);
                    } else {
                        lines.push(escapeMarkdown(traitsText));
                    }
                    lines.push('');
                }

                if (dataSource.speechPattern) {
                    lines.push(`## Speech Pattern`);
                    lines.push('');
                    const speechText = formatFieldValue(dataSource.speechPattern);
                    if (speechText.includes('\n')) {
                        lines.push(speechText);
                    } else {
                        lines.push(escapeMarkdown(speechText));
                    }
                    lines.push('');
                }

                // Add other personality fields if they exist
                const excludedKeys = ['personality', 'systemPrompt', 'traits', 'speechPattern', 'characterData'];
                Object.keys(dataSource).forEach(key => {
                    if (!excludedKeys.includes(key) && dataSource[key]) {
                        const value = dataSource[key];
                        if (value && typeof value !== 'object') {
                            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                            const valueText = formatFieldValue(String(value));
                            if (valueText.includes('\n')) {
                                lines.push(`## ${label}`);
                                lines.push('');
                                lines.push(valueText);
                                lines.push('');
                            } else {
                                lines.push(`- ${label}: ${escapeMarkdown(valueText)}`);
                            }
                        }
                    }
                });
                
                lines.push('');
            } else {
                // Other section types - try to extract data
                const sectionName = sectionConfig.type.charAt(0).toUpperCase() + sectionConfig.type.slice(1);
                // Always include the section header
                lines.push(`# ${sectionName}`);
                lines.push('');

                // Try to get section data from chatbotData
                const sectionKey = sectionConfig.type;
                let hasContent = false;
                if (chatbotData[sectionKey] && typeof chatbotData[sectionKey] === 'object') {
                    const data = chatbotData[sectionKey];
                    Object.keys(data).forEach(key => {
                        const value = data[key];
                        if (value && typeof value !== 'object') {
                            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                            lines.push(`- ${label}: ${escapeMarkdown(String(value))}`);
                            hasContent = true;
                        }
                    });
                }
                
                // If no content, at least show the section exists
                if (!hasContent) {
                    lines.push(`(No data)`);
                }
                
                lines.push('');
            }
        });

        // Remove trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }

        return lines.join('\n');
    }

    // Export to global scope
    window.MarkdownExporter = {
        exportToMarkdown
    };
})();
