import { useEffect } from 'react';

/**
 * Locks document body scroll while isLocked is true.
 * Restores original overflow on cleanup.
 */
export default function useScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
    };
  }, [isLocked]);
}
