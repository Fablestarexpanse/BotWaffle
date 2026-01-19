/**
 * IPC Handler Helper Utility
 * Provides consistent error handling and logging for IPC handlers
 * Reduces code duplication and ensures uniform error handling patterns
 */

const { error: logError } = require('./logger');

/**
 * Safe console.error wrapper to prevent EPIPE errors when streams are closed
 * @deprecated Use logger.error() instead
 * @param {...any} args - Arguments to log
 */
function safeConsoleError(...args) {
    // Use structured logger instead
    logError(args.join(' '));
}

/**
 * Creates a safe IPC handler wrapper with consistent error handling
 * @param {Function} handlerFn - The async handler function to wrap
 * @param {Object} options - Handler options
 * @param {*} options.errorReturn - Value to return on error (default: null)
 * @param {boolean} options.rethrow - Whether to rethrow errors (default: false)
 * @param {string} options.handlerName - Name for logging (optional)
 * @returns {Function} Wrapped IPC handler function
 */
function createIpcHandler(handlerFn, options = {}) {
    const {
        errorReturn = null,
        rethrow = false,
        handlerName = 'unknown'
    } = options;

    return async (...args) => {
        try {
            return await handlerFn(...args);
        } catch (error) {
            // Don't log EPIPE errors (broken pipe) - these are usually harmless logging issues
            if (error.code !== 'EPIPE' && error.code !== 'ENOTCONN') {
                try {
                    logError(`Error in IPC handler '${handlerName}'`, error);
                } catch (logErr) {
                    // If logging fails, ignore it to prevent cascading errors
                }
            }

            if (rethrow) {
                // Don't rethrow EPIPE errors - they're usually harmless
                if (error.code === 'EPIPE' || error.code === 'ENOTCONN') {
                    return errorReturn;
                }
                throw error;
            }

            return errorReturn;
        }
    };
}

/**
 * Registers an IPC handler with consistent error handling
 * @param {Object} ipcMain - Electron's ipcMain object
 * @param {string} channel - IPC channel name
 * @param {Function} handlerFn - The async handler function
 * @param {Object} options - Handler options (see createIpcHandler)
 */
function registerIpcHandler(ipcMain, channel, handlerFn, options = {}) {
    const handlerOptions = {
        handlerName: channel,
        ...options
    };
    
    ipcMain.handle(channel, createIpcHandler(handlerFn, handlerOptions));
}

module.exports = {
    createIpcHandler,
    registerIpcHandler,
    safeConsoleError: logError // Backward compatibility
};
