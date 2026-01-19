/**
 * Structured logging utility for BotWaffle
 * Provides log levels, formatting, and optional file logging
 */

const fs = require('fs');
const path = require('path');

// Electron app - may not be available in test environment
let app = null;
try {
    app = require('electron').app;
} catch (error) {
    // Electron not available (test environment)
}

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Current log level (default: INFO in production, DEBUG in development)
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// Log file path
let logFilePath = null;

/**
 * Initialize logging
 * Sets up log file path and creates log directory if needed
 */
function initializeLogging() {
    try {
        // Check if Electron app is available (might not be in tests)
        if (typeof app === 'undefined' || !app || typeof app.getPath !== 'function') {
            // In test environment, skip file logging
            return;
        }
        
        const userDataPath = app.getPath('userData');
        const logsDir = path.join(userDataPath, 'logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Use date-based log file name
        const today = new Date().toISOString().split('T')[0];
        logFilePath = path.join(logsDir, `botwaffle-${today}.log`);
    } catch (error) {
        // If Electron app is not available (e.g., in tests), use console only
        // Silently fail - file logging is optional
    }
}

/**
 * Formats a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelStr = level.padEnd(5);
    let logMessage = `[${timestamp}] ${levelStr} ${message}`;
    
    if (data !== null && data !== undefined) {
        try {
            const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
            logMessage += `\n${dataStr}`;
        } catch (error) {
            logMessage += `\n[Data serialization error: ${error.message}]`;
        }
    }
    
    return logMessage;
}

/**
 * Safe console.error wrapper to prevent EPIPE errors when streams are closed
 * @param {...any} args - Arguments to log
 */
function safeConsoleError(...args) {
    // Check if stderr is writable before attempting to log
    if (!process.stderr.writable || process.stderr.destroyed) {
        return; // Silently skip if stderr is not available
    }
    
    try {
        console.error(...args);
    } catch (error) {
        // Silently ignore EPIPE and other stream errors
        if (error && (error.code === 'EPIPE' || error.code === 'ENOTCONN')) {
            return; // Silently ignore
        }
        // For other errors, silently ignore to prevent cascading failures
    }
}

/**
 * Safe console.log wrapper
 * @param {...any} args - Arguments to log
 */
function safeConsoleLog(...args) {
    // Check if stdout is writable before attempting to log
    if (!process.stdout.writable || process.stdout.destroyed) {
        return; // Silently skip if stdout is not available
    }
    
    try {
        console.log(...args);
    } catch (error) {
        // Silently ignore EPIPE and ENOTCONN errors (broken pipe/connection)
        // These happen when stdout/stderr streams are closed
        if (error && (error.code === 'EPIPE' || error.code === 'ENOTCONN')) {
            return; // Silently ignore
        }
        // For other errors, silently ignore to prevent cascading failures
    }
}

/**
 * Writes log message to file (if file logging is enabled)
 * @param {string} message - Formatted log message
 */
function writeToLogFile(message) {
    if (!logFilePath) return;
    
    try {
        fs.appendFileSync(logFilePath, message + '\n', 'utf8');
    } catch (error) {
        // Silently fail if file write fails (permissions, disk full, etc.)
        // Don't try to log this error as it could cause infinite loops
    }
}

/**
 * Logs a DEBUG message
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function debug(message, data = null) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.DEBUG) return;
    
    try {
        const formatted = formatLogMessage('DEBUG', message, data);
        safeConsoleLog(formatted);
        writeToLogFile(formatted);
    } catch (error) {
        // Silently ignore all logging errors, including EPIPE
    }
}

/**
 * Logs an INFO message
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function info(message, data = null) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.INFO) return;
    
    try {
        const formatted = formatLogMessage('INFO', message, data);
        safeConsoleLog(formatted);
        writeToLogFile(formatted);
    } catch (error) {
        // Silently ignore all logging errors, including EPIPE
        // Don't let logging failures break the application
    }
}

/**
 * Logs a WARN message
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function warn(message, data = null) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.WARN) return;
    
    try {
        const formatted = formatLogMessage('WARN', message, data);
        safeConsoleError(formatted);
        writeToLogFile(formatted);
    } catch (error) {
        // Silently ignore all logging errors, including EPIPE
    }
}

/**
 * Logs an ERROR message
 * @param {string} message - Log message
 * @param {Error|any} error - Error object or data to log
 */
function error(message, error = null) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.ERROR) return;
    
    try {
        let errorData = error;
        if (error instanceof Error) {
            errorData = {
                message: error.message,
                stack: error.stack,
                name: error.name
            };
        }
        
        const formatted = formatLogMessage('ERROR', message, errorData);
        safeConsoleError(formatted);
        writeToLogFile(formatted);
    } catch (logError) {
        // Silently ignore all logging errors, including EPIPE
        // Don't let logging failures break the application
    }
}

module.exports = {
    initializeLogging,
    debug,
    info,
    warn,
    error,
    safeConsoleError,
    LOG_LEVELS
};
