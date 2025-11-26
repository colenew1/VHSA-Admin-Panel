import { useEffect, useCallback } from 'react';

/**
 * Hook to handle keyboard shortcuts
 * @param {Object} shortcuts - Map of key combinations to handler functions
 * @param {boolean} enabled - Whether shortcuts are enabled
 * 
 * Key format: "ctrl+s", "cmd+k", "escape", "enter"
 * Modifiers: ctrl, alt, shift, cmd/meta
 * 
 * Example:
 * useKeyboardShortcuts({
 *   'ctrl+s': () => handleSave(),
 *   'escape': () => handleCancel(),
 *   'ctrl+k': () => focusSearch(),
 * });
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs (unless it's escape)
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    const isEscape = event.key === 'Escape';
    
    if (isInput && !isEscape) return;
    
    // Build the key combination string
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    const key = event.key.toLowerCase();
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key === ' ' ? 'space' : key);
    }
    
    const combo = parts.join('+');
    
    // Check if we have a handler for this combination
    const handler = shortcuts[combo];
    if (handler) {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    }
  }, [shortcuts, enabled]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for common search page shortcuts
 */
export function useSearchShortcuts({ onSearch, onClear, onFocusInput }) {
  useKeyboardShortcuts({
    'ctrl+enter': onSearch,
    'ctrl+k': onFocusInput,
    'escape': onClear,
  });
}

export default useKeyboardShortcuts;

