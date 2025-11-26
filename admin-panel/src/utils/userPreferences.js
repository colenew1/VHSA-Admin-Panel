/**
 * User Preferences Utility
 * Stores and retrieves user preferences from localStorage
 */

const STORAGE_KEY = 'vhsa_admin_preferences';

// Default preferences
const defaultPreferences = {
  dashboard: {
    pageSize: 50,
    showAdvancedFilters: true,
    showColorLegend: true,
    lastSchool: 'all',
  },
  export: {
    lastTab: 'sticker',
    lastYear: new Date().getFullYear().toString(),
  },
  search: {
    lastTab: 'search',
    lastSchool: 'all',
  },
  advanced: {
    lastTab: 'schools',
  },
  general: {
    sidebarCollapsed: false,
    autoRefresh: false,
    autoRefreshInterval: 30000, // 30 seconds
  },
};

/**
 * Get all preferences
 */
export function getPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return deepMerge(defaultPreferences, parsed);
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
  return defaultPreferences;
}

/**
 * Get a specific preference value
 */
export function getPreference(path, defaultValue = null) {
  const prefs = getPreferences();
  const keys = path.split('.');
  let value = prefs;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value ?? defaultValue;
}

/**
 * Set a specific preference value
 */
export function setPreference(path, value) {
  try {
    const prefs = getPreferences();
    const keys = path.split('.');
    let current = prefs;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save preference:', e);
  }
}

/**
 * Set multiple preferences at once
 */
export function setPreferences(updates) {
  try {
    const prefs = getPreferences();
    const merged = deepMerge(prefs, updates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
}

/**
 * Clear all preferences
 */
export function clearPreferences() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear preferences:', e);
  }
}

/**
 * Deep merge helper
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Hook-friendly preference getter with default
 */
export function usePreferenceValue(path, defaultValue) {
  return getPreference(path, defaultValue);
}

