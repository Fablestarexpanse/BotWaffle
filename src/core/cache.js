/**
 * Simple in-memory cache with TTL (Time To Live) support
 * Used for caching chatbot data to reduce file I/O
 */

class SimpleCache {
    /**
     * Creates a new cache instance
     * @param {number} maxSize - Maximum number of items in cache (default: 100)
     * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
     */
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    /**
     * Gets a value from the cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }

        // Check if item has expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Sets a value in the cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     */
    set(key, value) {
        // Remove oldest item if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Removes a specific key from cache
     * @param {string} key - Cache key to remove
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clears all items from cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Gets cache statistics
     * @returns {{size: number, maxSize: number, ttl: number}}
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }

    /**
     * Cleans up expired items from cache
     * @returns {number} Number of items removed
     */
    cleanup() {
        const now = Date.now();
        let removed = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }
}

// Export singleton instances for different use cases
const chatbotCache = new SimpleCache(50, 5 * 60 * 1000); // 50 items, 5 min TTL
const templateCache = new SimpleCache(20, 10 * 60 * 1000); // 20 items, 10 min TTL

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        chatbotCache.cleanup();
        templateCache.cleanup();
    }, 5 * 60 * 1000);
}

module.exports = {
    SimpleCache,
    chatbotCache,
    templateCache
};
