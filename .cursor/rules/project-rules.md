# Chatbot Manager (BotWaffle) - AI Assistant Rules

## Critical Rules (ALWAYS FOLLOW)

1. **Explain Before Coding**: Describe what you'll build and wait for confirmation
2. **One Change at a Time**: Never modify multiple unrelated files in one go
3. **Preserve Working Code**: Only change what was requested
4. **Security First**: 
   - Never log sensitive data (API keys, passwords)
   - Always validate and sanitize inputs
   - Use parameterized queries for any future DB integration
5. **Modular Code**: Keep functions small (max 50 lines)
6. **No Duplicate Code**: Check for existing functions before writing new ones
7. **Error Handling**: Every file operation must have try/catch
8. **Path Safety**: Always use path.join(), never string concatenation

## File Organization Rules

- One component per file
- Max 300 lines per file (split if larger)
- Clear, descriptive filenames (chatbot-editor.js, not editor.js)
- Keep related files in same directory

## Naming Conventions

- Functions: camelCase (createChatbot, loadConversations)
- Classes: PascalCase (ChatbotManager, EncryptionService)
- Constants: UPPER_SNAKE_CASE (MAX_FILE_SIZE, API_TIMEOUT)
- Files: kebab-case (chatbot-manager.js, api-client.js)

## Code Style

- Use modern JavaScript (ES6+)
- Prefer async/await over promises
- Add JSDoc comments for complex functions
- Use descriptive variable names (no single letters except loop counters)

## When to Ask for Help

- Before refactoring working code
- When adding new dependencies
- Before changing file structure
- If security concerns arise
- When multiple approaches are possible
