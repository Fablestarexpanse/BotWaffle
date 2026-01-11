/**
 * Custom Error Classes
 * Provides error classification for better error handling and user feedback
 */

/**
 * Base error class for application errors
 */
class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = true; // Mark as operational (expected) error
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation error - Invalid input data
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR', 400);
        this.field = field;
    }
}

/**
 * Storage error - File system operations failed
 */
class StorageError extends AppError {
    constructor(message, path = null) {
        super(message, 'STORAGE_ERROR', 500);
        this.path = path;
    }
}

/**
 * NotFound error - Resource not found
 */
class NotFoundError extends AppError {
    constructor(resource, id = null) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, 'NOT_FOUND', 404);
        this.resource = resource;
        this.id = id;
    }
}

/**
 * Permission error - Access denied
 */
class PermissionError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 'PERMISSION_ERROR', 403);
    }
}

/**
 * Configuration error - Invalid configuration
 */
class ConfigurationError extends AppError {
    constructor(message) {
        super(message, 'CONFIGURATION_ERROR', 500);
    }
}

module.exports = {
    AppError,
    ValidationError,
    StorageError,
    NotFoundError,
    PermissionError,
    ConfigurationError
};
