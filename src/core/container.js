/**
 * Dependency Injection Container
 * Manages service instances and provides dependency injection
 * Improves testability and decouples modules from concrete implementations
 */

class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    /**
     * Registers a service factory or instance
     * @param {string} name - Service name
     * @param {Function|Object} factory - Factory function or instance
     * @param {Object} options - Registration options
     * @param {boolean} options.singleton - Whether to treat as singleton (default: true)
     */
    register(name, factory, options = {}) {
        const { singleton = true } = options;
        
        if (typeof factory === 'function') {
            this.services.set(name, { factory, singleton });
        } else {
            // Direct instance registration (always singleton)
            this.services.set(name, { factory: () => factory, singleton: true });
            this.singletons.set(name, factory);
        }
    }

    /**
     * Resolves a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     * @throws {Error} If service is not registered
     */
    resolve(name) {
        // Check if already resolved as singleton
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' is not registered`);
        }

        const instance = service.factory(this);

        // Cache singleton instances
        if (service.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Checks if a service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Clears all registered services and singletons
     * Useful for testing
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
    }
}

// Create and export a default container instance
const container = new Container();

module.exports = {
    Container,
    container
};
