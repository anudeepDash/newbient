import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/drawer is open
 * Prevents scroll chaining (rubber-banding) on iOS Safari
 * and scroll propagation on desktop browsers
 *
 * Locks nest: a sheet opened over another sheet shares the first lock, and the
 * page is restored (with its scroll position) only when the last one closes.
 *
 * @param {boolean} isLocked - Whether scroll should be locked
 */
let locks = 0;
let saved = null;

export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return;

    if (locks === 0) {
      const { style } = document.body;
      saved = { overflow: style.overflow, position: style.position, width: style.width, top: style.top, scrollY: window.scrollY };
      style.overflow = 'hidden';
      style.position = 'fixed';
      style.width = '100%';
      style.top = `-${saved.scrollY}px`;
    }
    locks += 1;

    return () => {
      locks = Math.max(0, locks - 1);
      if (locks > 0 || !saved) return;
      const { style } = document.body;
      style.overflow = saved.overflow;
      style.position = saved.position;
      style.width = saved.width;
      style.top = saved.top;
      window.scrollTo(0, saved.scrollY);
      saved = null;
    };
  }, [isLocked]);
};

export default useBodyScrollLock;
