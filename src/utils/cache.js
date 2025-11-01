// src/utils/cache.js - Basic caching layer with Redis-like functionality
import { env } from './envValidator.js';

class Cache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = env.NODE_ENV === 'production' ? 300000 : 60000; // 5 min in production, 1 min in development
  }

  // Set a value in cache with optional TTL
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
    
    // Clean up expired keys
    this.cleanup();
    
    return true;
  }

  // Get a value from cache
  get(key) {
    // Check if key exists and hasn't expired
    if (!this.cache.has(key)) {
      return null;
    }
    
    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // Delete a value from cache
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    return true;
  }

  // Check if a key exists in cache
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Get all keys in cache
  keys() {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  // Get all values in cache
  values() {
    this.cleanup();
    return Array.from(this.cache.values());
  }

  // Get the size of cache
  size() {
    this.cleanup();
    return this.cache.size;
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttl.clear();
    return true;
  }

  // Clean up expired keys
  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    this.cleanup();
    return {
      size: this.cache.size,
      keys: this.keys(),
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  // Set multiple values at once
  setMany(entries) {
    const now = Date.now();
    entries.forEach(([key, value, ttl]) => {
      this.cache.set(key, value);
      this.ttl.set(key, now + (ttl || this.defaultTTL));
    });
    this.cleanup();
    return true;
  }

  // Get multiple values at once
  getMany(keys) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  }

  // Delete multiple keys at once
  deleteMany(keys) {
    keys.forEach(key => this.delete(key));
    return true;
  }

  // Increment a numeric value
  increment(key, amount = 1) {
    const current = this.get(key);
    const newValue = current ? Number(current) + amount : amount;
    this.set(key, newValue);
    return newValue;
  }

  // Decrement a numeric value
  decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }

  // Set a value with expiration callback
  setWithExpiry(key, value, ttl, callback) {
    this.set(key, value, ttl);
    
    setTimeout(() => {
      callback(value);
      this.delete(key);
    }, ttl);
  }

  // Get or set pattern (get if exists, set if not)
  getOrSet(key, valueGenerator, ttl) {
    const value = this.get(key);
    if (value !== null) {
      return value;
    }
    
    const newValue = valueGenerator();
    this.set(key, newValue, ttl);
    return newValue;
  }

  // Cache with fallback to async function
  async cacheOrFetch(key, fetchFunction, ttl) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetchFunction();
    this.set(key, value, ttl);
    return value;
  }
}

// Create cache instance
export const cache = new Cache();

// Cache decorator for functions
export const cached = (key, ttl = cache.defaultTTL) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cachedResult = cache.get(cacheKey);
      
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      const result = await method.apply(this, args);
      cache.set(cacheKey, result, ttl);
      return result;
    };
    
    return descriptor;
  };
};

// Cache middleware for Express
export const cacheMiddleware = (ttl = cache.defaultTTL) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Cache successful responses
      if (res.statusCode === 200) {
        const cacheKey = `response:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
        cache.set(cacheKey, data, ttl);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Cache invalidation middleware
export const cacheInvalidationMiddleware = (patterns) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          const keys = cache.keys().filter(key => key.startsWith(pattern));
          cache.deleteMany(keys);
        });
      }
    });
    
    next();
  };
};

// Cache warming utility
export const warmCache = async (keyValuePairs, fetchFunction, ttl) => {
  const results = await Promise.all(
    keyValuePairs.map(async ([key, value]) => {
      try {
        const result = await fetchFunction(value);
        cache.set(key, result, ttl);
        return { key, success: true };
      } catch (error) {
        return { key, success: false, error: error.message };
      }
    })
  );
  
  return results;
};

// Cache health check
export const checkCacheHealth = () => {
  const stats = cache.getStats();
  return {
    healthy: stats.size > 0,
    ...stats,
    timestamp: new Date().toISOString(),
  };
};

// Cache cleanup utility
export const cleanupCache = () => {
  const beforeSize = cache.size();
  cache.cleanup();
  const afterSize = cache.size();
  return {
    cleaned: beforeSize - afterSize,
    remaining: afterSize,
  };
};

// Export cache utilities
export default cache;