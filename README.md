# BotWaffle (Chatbot Manager)

A comprehensive desktop application for creating, storing, tracking, and managing AI chatbots and their associated prompts. This tool creates a unified workspace by integrating **PromptWaffle** natively into the BotWaffle Studio.

## Features

### 🤖 BotWaffle Studio
- **Chatbot Management**: Create and manage detailed profiles (Personality, Scenario, Greetings).
- **Markdown Import**: Import markdown outlines (like character sheets) to automatically create sections and fields.
- **Custom Sections**: Add custom fields and sections to organize character information.
- **Character Resources**: Per-character libraries for Pictures, Scripts, Image Prompts, and Saved Chats.
- **Data Management**: Export, import, and verify backups of all your chatbot data.
- **Secure Configuration**: Local, encrypted storage for API keys.
- **Conversation Tracking**: History logging for all your chat sessions.
- **Privacy First**: 100% local data storage.

### 🧇 PromptWaffle (Integrated)
- **Visual Board System**: Drag-and-drop interface for composing prompts with resizable, color-coded cards
- **Snippet Library**: Create, organize, and reuse prompt segments in hierarchical folders
- **Character Builder**: Build detailed character profiles with reference images and automatic prompt generation
- **Wildcard Studio**: Dynamic prompt building with profiles, wildcard categories, and dice-based randomization
- **Board Management**: Create multiple boards, organize with tags, and save templates
- **Image Management**: Add reference images to boards with live preview folder monitoring
- **Compiled Prompts**: Real-time prompt compilation with color coding and export options
- **ComfyUI Integration**: Seamless integration with ComfyUI workflows via file-based approach
- **Dual-View**: Seamlessly switch between Bot Manager and Prompt Builder with a single click

## Quick Start Guide

### 1. Prerequisites (What you need installed)
Before you start, make sure you have these two tools installed on your computer:
- **Node.js**: Download "LTS" version from [nodejs.org](https://nodejs.org/)
- **Git**: Download from [git-scm.com](https://git-scm.com/downloads)

### 2. Installation (Setting it up)

Open your terminal (Command Prompt, PowerShell, or Terminal) and run these three commands one by one:

1.  **Download the project:**
    ```bash
    git clone https://github.com/Fablestarexpanse/BotWaffle.git
    cd BotWaffle
    ```

2.  **Install dependencies (Automatic):**
    ```bash
    npm install
    ```
    *(Wait for this to finish. It installs everything needed for BotWaffle and the integrated PromptWaffle tool automatically.)*

3.  **Launch the App:**
    ```bash
    npm start
    ```

### 3. How to Run (Daily Use)
Once you have installed it, you don't need to do the installation steps again!

To run the app next time:
1.  Open your terminal.
2.  Navigate to the folder: `cd BotWaffle`
3.  Type: `npm start`



## Architecture & Integration

BotWaffle uses a **Hybrid WebView Architecture**:
- **Core App**: Built with native HTML/CSS/JS for the Chatbot Manager.
- **Embedded Tools**: PromptWaffle runs as a secure, integrated tool via Electron `<webview>`.
- **Unified Theme**: Both tools share the sleek "Navy & Gold" design system.
- **Security**: Context isolation enabled, no Node.js access from renderer process.

### Development Structure

- `main.js`: Electron main process entry point
- `preload.js`: IPC bridge between main and renderer processes
- `src/ui/`: User interface components (HTML/CSS/JS)
- `src/core/`: Backend logic and storage management
  - `chatbot-manager.js`: CRUD operations for chatbots
  - `template-manager.js`: Template save/load functionality
  - `asset-manager.js`: Asset file management
  - `storage.js`: Storage directory management
  - `export-import.js`: Data backup/restore functionality
  - `prompt-waffle-handler.js`: Bridge logic for embedded PromptWaffle
- `src/tools/prompt-waffle/`: Source code for the embedded PromptWaffle application
- `data/`: Local storage directory (created on first run)
  - `chatbots/`: Individual chatbot JSON files
  - `templates/`: Saved layout templates
  - `assets/`: User-uploaded images and files
  - `prompt-waffle/`: PromptWaffle user data (snippets, boards, profiles)

## Key Features in Detail

### BotWaffle Studio Features

#### Chatbot Management
- **Create & Edit**: Build detailed chatbot profiles with customizable sections
- **Profile Management**: Name, description, category, tags, and multiple images
- **Personality Builder**: Define personality traits, characteristics, and behaviors
- **Scenario System**: Create context and scenario descriptions
- **Initial Messages**: Set up conversation starters
- **Example Dialogs**: Add example conversations for reference
- **Custom Sections**: Add unlimited custom fields and sections
- **Markdown Import**: Import markdown outlines to automatically create sections

#### Data Management
- **Export/Import**: Full data backup and restore functionality
- **Backup Verification**: Verify backup integrity before importing
- **PNG Export**: Export chatbot profiles as PNG images
- **Template System**: Save and load custom layout templates
- **Category Organization**: Organize chatbots by category
- **Search & Filter**: Find chatbots quickly by name or category

#### Security & Privacy
- **Local Storage**: All data stored locally on your machine
- **Encrypted API Keys**: Secure storage for API keys (when implemented)
- **No Cloud Sync**: Complete privacy - your data never leaves your computer
- **Input Validation**: Comprehensive validation on all user inputs
- **Path Sanitization**: Protection against path traversal attacks

### PromptWaffle Features

#### Visual Board System
- **Drag-and-Drop**: Visually compose prompts by dragging snippets onto boards
- **Multiple Boards**: Create and manage multiple prompt composition workspaces
- **Color Coding**: Assign colors to cards for visual organization
- **Resizable Cards**: Adjust card sizes to fit your workspace
- **Card Locking**: Lock cards in position to prevent accidental movement
- **Real-time Compilation**: See compiled prompt update as you modify the board

#### Snippet Management
- **Create & Edit**: Build a library of reusable prompt components
- **Hierarchical Organization**: Organize snippets in nested folders
- **Tag System**: Categorize snippets with tags for easy discovery
- **Search Functionality**: Find snippets quickly using tag-based search
- **Duplicate & Split**: Clone existing snippets or split selected text
- **Import from Clipboard**: Create snippets directly from clipboard content
- **Character Snippets**: Special character snippets with unique styling

#### Character Builder
- **Character Creation**: Build detailed character profiles with customizable attributes
- **Reference Images**: Upload and manage character reference images
- **Character Library**: Organize characters with visual thumbnails
- **Automatic Prompt Generation**: Generate AI-ready character descriptions
- **Character Duplication**: Clone existing characters with automatic naming
- **Export Options**: Copy character prompts to clipboard or export as Markdown

#### Wildcard Studio
- **Dynamic Prompt Building**: Create complex prompts using wildcards and profiles
- **Profile System**: Pre-built prompt templates with customizable positive prompts
- **Wildcard Categories**: Organized folders with .txt files for prompt variations
- **Dice Interface**: Click dice buttons to randomly select wildcard items
- **Section Organization**: Organize prompts into Top, Middle, and Bottom sections
- **Real-time Assembly**: Automatic prompt assembly with deduplication
- **Auto-refresh**: Automatically detects new wildcard files and folders

#### Image Management
- **Reference Images**: Add reference images to boards for visual context
- **Image Thumbnails**: Automatic thumbnail generation for better performance
- **Image Viewer**: Full-size image viewing with overlay modal
- **Live Preview**: Monitor a folder and automatically display the newest image
- **Image Controls**: Expand and remove buttons on each image thumbnail

#### Advanced Features
- **Compiled Prompt Generation**: Automatically combine all board elements
- **Color Toggle**: Show/hide color coding in compiled output
- **Text Selection Tools**: Select and extract portions of text for new snippets
- **Save Compiled Prompts**: Export finished prompts as new reusable snippets
- **ComfyUI Integration**: File-based integration with ComfyUI workflows

## System Requirements

- **Node.js**: v18.x or higher (LTS version recommended)
- **npm**: v9.x or higher
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Disk Space**: ~200MB for application + dependencies
- **RAM**: 2GB minimum, 4GB recommended

## Available Scripts

### Development
- `npm start` - Launch the application
- `npm test` - Run unit tests
- `npm test:watch` - Run tests in watch mode
- `npm test:coverage` - Generate test coverage report
- `npm lint` - Run ESLint
- `npm lint:fix` - Fix ESLint errors automatically
- `npm format` - Format code with Prettier
- `npm format:check` - Check code formatting

## Data Storage

All user data is stored locally in platform-specific directories:

- **Windows**: `%APPDATA%\BotWaffle\data\`
- **macOS**: `~/Library/Application Support/BotWaffle/data/`
- **Linux**: `~/.config/BotWaffle/data/`

### Data Structure
```
data/
├── chatbots/          # Chatbot JSON files
├── templates/         # Layout templates
├── assets/           # User-uploaded images/files
└── prompt-waffle/    # PromptWaffle data
    ├── snippets/     # Prompt snippets
    ├── boards/       # Prompt boards
    ├── profiles/     # Character profiles
    └── wildcards/    # Wildcard categories
```

**Backup**: Simply copy the entire `data/` folder to backup all your work.

## Security

BotWaffle implements comprehensive security measures:

- ✅ **Context Isolation**: Renderer process cannot access Node.js directly
- ✅ **Input Validation**: All user inputs validated and sanitized
- ✅ **Path Sanitization**: Protection against directory traversal attacks
- ✅ **XSS Prevention**: HTML escaping and secure DOM manipulation
- ✅ **Content Security Policy**: Strict CSP to prevent code injection
- ✅ **Secure IPC**: All IPC communication validated and secured
- ✅ **Local Storage Only**: No data uploaded to cloud without explicit action

For detailed security information, see [SECURITY.md](SECURITY.md).

## Documentation

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)**: Comprehensive guide for developers
- **[Architecture Documentation](docs/ARCHITECTURE.md)**: System architecture details
- **[System Audit Report](docs/SYSTEM_AUDIT_REPORT.md)**: Complete security and code quality audit
- **[Security Policy](SECURITY.md)**: Security measures and vulnerability reporting

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm lint`
6. Submit a pull request

## License

This project is licensed under the **MIT License**.

## Support

- **Issues**: [GitHub Issues](https://github.com/Fablestarexpanse/BotWaffle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Fablestarexpanse/BotWaffle/discussions)

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Icons by [Feather Icons](https://feathericons.com/)
- PromptWaffle integration for advanced prompt engineering

