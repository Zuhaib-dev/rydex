import { useEffect } from "react";

/**
 * Locks the body scroll when a modal, bottom sheet, or dropdown is open.
 * Greatly improves mobile feel by preventing the background from scrolling.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (lock) {
      // Store the original overflow value
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Prevent scrolling
      document.body.style.overflow = "hidden";

      // Cleanup on unmount or when lock becomes false
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [lock]);
}
