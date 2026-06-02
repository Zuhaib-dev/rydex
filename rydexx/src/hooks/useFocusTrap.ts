import { useEffect, RefObject } from "react";

/**
 * Traps focus within the given ref. Useful for modals to ensure keyboard
 * navigation stays inside the modal until dismissed.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const focusableElementsString =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
    let focusableElements: HTMLElement[] = [];

    const updateFocusableElements = () => {
      if (ref.current) {
        focusableElements = Array.from(
          ref.current.querySelectorAll<HTMLElement>(focusableElementsString)
        ).filter((el) => {
          // Avoid focusing elements that are visually hidden (e.g., AnimatePresence exit animations)
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        });
      }
    };

    updateFocusableElements();

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;

      updateFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, ref]);
}
