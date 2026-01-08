# BotWaffle (Chatbot Manager)

A comprehensive desktop application for creating, storing, tracking, and managing AI chatbots and their associated prompts. This tool creates a unified workspace by integrating **PromptWaffle** natively into the BotWaffle Studio.

## Features

### 🤖 BotWaffle Studio
- **Chatbot Management**: Create and manage detailed profiles (Personality, Scenario, Greetings).
- **Secure Configuration**: Local, encrypted storage for API keys.
- **Conversation Tracking**: History logging for all your chat sessions.
- **Privacy First**: 100% local data storage.

### 🧇 PromptWaffle (Integrated)
- **Prompt Engineering**: Dedicated visual workspace for crafting complex prompts.
- **Snippet Library**: manage and reuse prompt segments.
- **Dual-View**: Seamlessly switch between Bot Manager and Prompt Builder with a single click.

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


## Architecture & Integration

BotWaffle 2.0 uses a **Hybrid WebView Architecture**:
- **Core App**: Built with native HTML/CSS/JS for the Chatbot Manager.
- **Embedded Tools**: PromptWaffle runs as a secure, integrated tool via Electron `<webview>`.
- **Unified Theme**: Both tools share the sleek "Navy & Gold" design system.

### Development Structure

- `main.js`: Electron main process.
- `src/ui/`: User interface components (HTML/CSS/JS).
- `src/core/`: Backend logic and storage management.
- `src/core/prompt-waffle-handler.js`: Bridge logic for the embedded PromptWaffle tool.
- `PromptWaffel/`: Source code for the embedded PromptWaffle application.
- `data/`: Local storage for your chatbots and conversations (created on first run).
