import { useEffect, useRef } from 'react';

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'enter' | 'delete' | 'clear';

export type NavigableElementType = 
  'tab' | 
  'request' | 
  'collection' | 
  'environment' | 
  'history' | 
  'key-value-pair' |
  'action';

export interface NavigableElement {
  id: string;
  ref: HTMLElement;
  type: NavigableElementType;
  parentId?: string;
  groupId?: string; // For grouping related elements like key-value pairs
}

export function useKeyboardNavigation(
  elements: NavigableElement[],
  onNavigate: (direction: NavigationDirection, currentId: string) => void,
  onSelect: (id: string) => void,
  onDelete?: (id: string) => void,  // Add delete handler
  onClear?: (id: string) => void    // Add clear handler
) {
  const currentFocusRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentFocusRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onNavigate('up', currentFocusRef.current);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onNavigate('down', currentFocusRef.current);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('left', currentFocusRef.current);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('right', currentFocusRef.current);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(currentFocusRef.current);
          break;
        case 'Delete':
          e.preventDefault();
          if (onDelete && !e.shiftKey) {
            onDelete(currentFocusRef.current);
          }
          break;
        case 'Backspace':
          if (document.activeElement?.tagName !== 'INPUT' && 
              document.activeElement?.tagName !== 'TEXTAREA' && 
              onClear) {
            e.preventDefault();
            onClear(currentFocusRef.current);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onSelect, onDelete, onClear]);

  const setFocus = (id: string) => {
    currentFocusRef.current = id;
    const element = elements.find(el => el.id === id);
    if (element?.ref) {
      element.ref.focus();
    }
  };

  return { setFocus };
}
