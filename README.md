# BotWaffle (Chatbot Manager)

A comprehensive desktop application for creating, storing, tracking, and managing AI chatbots and their associated prompts. This tool integrates PromptWaffle as a core component while adding chatbot-specific management features.

## Features

- **Chatbot Management**: Create and manage detailed profiles for your AI chatbots.
- **Prompt Building**: Integrated PromptWaffle workspace for crafting perfect prompts.
- **Secure Configuration**: Encrypted storage for API keys and sensitive settings.
- **Conversation Tracking**: Log and review history of your chats.
- **Privacy First**: All data is stored locally on your machine.

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Fablestarexpanse/BotWaffle.git
    cd BotWaffle
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    npm start
    ```

## Development Structure

- `main.js`: Electron main process.
- `src/ui/`: User interface components (HTML/CSS/JS).
- `src/core/`: Backend logic and storage management.
- `data/`: Local storage for your chatbots and conversations (created on first run).
