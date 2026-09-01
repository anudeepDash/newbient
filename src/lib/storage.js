/**
 * Universal safe storage utility
 * Prevents DOMException: "The operation is insecure" in Safari Private Browsing
 * and environments with disabled cookies/storage.
 */

const createMemoryStorage = () => {
    const mem = new Map();
    return {
        getItem: (key) => (mem.has(key) ? mem.get(key) : null),
        setItem: (key, value) => { mem.set(key, String(value)); },
        removeItem: (key) => { mem.delete(key); },
        clear: () => { mem.clear(); }
    };
};

const memoryLocalStorage = createMemoryStorage();
const memorySessionStorage = createMemoryStorage();

const isStorageAvailable = (type) => {
    try {
        if (typeof window === 'undefined') return false;
        const storage = window[type];
        if (!storage) return false;
        const testKey = '__nb_storage_test__';
        storage.setItem(testKey, '1');
        storage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
};

const hasLocalStorage = isStorageAvailable('localStorage');
const hasSessionStorage = isStorageAvailable('sessionStorage');

export const safeLocalStorage = {
    getItem: (key, fallback = null) => {
        try {
            if (hasLocalStorage) {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : fallback;
            }
            return memoryLocalStorage.getItem(key) ?? fallback;
        } catch (e) {
            return memoryLocalStorage.getItem(key) ?? fallback;
        }
    },
    setItem: (key, value) => {
        try {
            if (hasLocalStorage) {
                window.localStorage.setItem(key, String(value));
                return;
            }
            memoryLocalStorage.setItem(key, value);
        } catch (e) {
            memoryLocalStorage.setItem(key, value);
        }
    },
    removeItem: (key) => {
        try {
            if (hasLocalStorage) {
                window.localStorage.removeItem(key);
                return;
            }
            memoryLocalStorage.removeItem(key);
        } catch (e) {
            memoryLocalStorage.removeItem(key);
        }
    },
    clear: () => {
        try {
            if (hasLocalStorage) {
                window.localStorage.clear();
                return;
            }
            memoryLocalStorage.clear();
        } catch (e) {
            memoryLocalStorage.clear();
        }
    }
};

export const safeSessionStorage = {
    getItem: (key, fallback = null) => {
        try {
            if (hasSessionStorage) {
                const val = window.sessionStorage.getItem(key);
                return val !== null ? val : fallback;
            }
            return memorySessionStorage.getItem(key) ?? fallback;
        } catch (e) {
            return memorySessionStorage.getItem(key) ?? fallback;
        }
    },
    setItem: (key, value) => {
        try {
            if (hasSessionStorage) {
                window.sessionStorage.setItem(key, String(value));
                return;
            }
            memorySessionStorage.setItem(key, value);
        } catch (e) {
            memorySessionStorage.setItem(key, value);
        }
    },
    removeItem: (key) => {
        try {
            if (hasSessionStorage) {
                window.sessionStorage.removeItem(key);
                return;
            }
            memorySessionStorage.removeItem(key);
        } catch (e) {
            memorySessionStorage.removeItem(key);
        }
    },
    clear: () => {
        try {
            if (hasSessionStorage) {
                window.sessionStorage.clear();
                return;
            }
            memorySessionStorage.clear();
        } catch (e) {
            memorySessionStorage.clear();
        }
    }
};
