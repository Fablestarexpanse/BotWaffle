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
                // Handle both old format (object with characterData) and new format (string)
                lines.push(`# Personality`);
                lines.push('');

                const personality = chatbotData.personality || {};
                let personalityText = '';

                // Check if personality is a string (new format)
                if (typeof personality === 'string') {
                    personalityText = personality;
                } else if (personality.characterData) {
                    // Old format - extract from characterData
                    const characterData = personality.characterData;
                    personalityText = characterData.personality || '';
                    
                    // Also include system prompt if available
                    if (characterData.systemPrompt) {
                        lines.push(`## System Prompt`);
                        lines.push('');
                        const systemPromptText = formatFieldValue(characterData.systemPrompt);
                        if (systemPromptText.includes('\n')) {
                            lines.push(systemPromptText);
                        } else {
                            lines.push(escapeMarkdown(systemPromptText));
                        }
                        lines.push('');
                    }

                    // Extract other fields from characterData structure
                    if (characterData.traits) {
                        lines.push(`## Defining Traits`);
                        lines.push('');
                        const traitsText = formatFieldValue(characterData.traits);
                        if (traitsText.includes('\n')) {
                            lines.push(traitsText);
                        } else {
                            lines.push(escapeMarkdown(traitsText));
                        }
                        lines.push('');
                    }

                    if (characterData.speechPattern) {
                        lines.push(`## Speech Pattern`);
                        lines.push('');
                        const speechText = formatFieldValue(characterData.speechPattern);
                        if (speechText.includes('\n')) {
                            lines.push(speechText);
                        } else {
                            lines.push(escapeMarkdown(speechText));
                        }
                        lines.push('');
                    }

                    // Add other personality fields if they exist
                    const excludedKeys = ['personality', 'systemPrompt', 'traits', 'speechPattern', 'characterData'];
                    Object.keys(characterData).forEach(key => {
                        if (!excludedKeys.includes(key) && characterData[key]) {
                            const value = characterData[key];
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
                } else if (personality.personality) {
                    personalityText = personality.personality;
                } else if (personality.text) {
                    personalityText = personality.text;
                }

                // Add personality text
                if (personalityText) {
                    const formattedText = formatFieldValue(personalityText);
                    if (formattedText.includes('\n')) {
                        lines.push(formattedText);
                    } else {
                        lines.push(escapeMarkdown(formattedText));
                    }
                } else {
                    lines.push('(No personality data)');
                }
                
                lines.push('');
            } else {
                // Other section types - try to extract data
                const sectionName = sectionConfig.type.charAt(0).toUpperCase() + sectionConfig.type.slice(1);
                // Always include the section header
                lines.push(`# ${sectionName}`);
                lines.push('');

                // Try to get section data from chatbotData
                const sectionKeyMap = {
                    'initial-messages': 'initialMessages',
                    'example-dialogs': 'exampleDialogs',
                    'scenario': 'scenario'
                };
                const sectionKey = sectionKeyMap[sectionConfig.type] || sectionConfig.type;
                let hasContent = false;
                
                // Handle scenario section (can be string or object)
                if (sectionConfig.type === 'scenario') {
                    const scenarioData = chatbotData.scenario;
                    if (scenarioData) {
                        let scenarioText = '';
                        if (typeof scenarioData === 'string') {
                            scenarioText = scenarioData;
                        } else if (scenarioData.scenario) {
                            scenarioText = scenarioData.scenario;
                        } else if (scenarioData.text) {
                            scenarioText = scenarioData.text;
                        }
                        
                        if (scenarioText) {
                            const formattedText = formatFieldValue(scenarioText);
                            if (formattedText.includes('\n')) {
                                lines.push(formattedText);
                            } else {
                                lines.push(escapeMarkdown(formattedText));
                            }
                            hasContent = true;
                        }
                    }
                } else if (chatbotData[sectionKey]) {
                    const data = chatbotData[sectionKey];
                    
                    // Handle array data (initial messages, example dialogs)
                    if (Array.isArray(data)) {
                        data.forEach((entry, index) => {
                            if (typeof entry === 'string' && entry.trim()) {
                                lines.push(`- Entry ${index + 1}: ${escapeMarkdown(entry)}`);
                                hasContent = true;
                                return;
                            }

                            if (entry && typeof entry === 'object') {
                                if (entry.text && entry.text.trim()) {
                                    lines.push(`- Entry ${index + 1}: ${escapeMarkdown(String(entry.text))}`);
                                    hasContent = true;
                                    return;
                                }

                                if (entry.user || entry.assistant) {
                                    const userText = entry.user ? escapeMarkdown(String(entry.user)) : '';
                                    const assistantText = entry.assistant ? escapeMarkdown(String(entry.assistant)) : '';
                                    const combined = [userText, assistantText].filter(Boolean).join(' / ');
                                    if (combined) {
                                        lines.push(`- Entry ${index + 1}: ${combined}`);
                                        hasContent = true;
                                    }
                                }
                            }
                        });
                    } else if (typeof data === 'string' && data.trim()) {
                        // Handle string data
                        lines.push(escapeMarkdown(data));
                        hasContent = true;
                    } else if (typeof data === 'object' && data !== null) {
                        // Handle object data
                        Object.keys(data).forEach(key => {
                            const value = data[key];
                            if (value && typeof value !== 'object') {
                                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                                lines.push(`- ${label}: ${escapeMarkdown(String(value))}`);
                                hasContent = true;
                            }
                        });
                    }
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
