import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/drawer is open
 * Prevents scroll chaining (rubber-banding) on iOS Safari
 * and scroll propagation on desktop browsers
 *
 * @param {boolean} isLocked - Whether scroll should be locked
 */
export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
};

export default useBodyScrollLock;
