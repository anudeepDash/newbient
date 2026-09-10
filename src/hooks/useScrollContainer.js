import { useCallback, useRef } from 'react';

/**
 * Hook for horizontal scroll container navigation
 * Replaces the undefined `scrollContainer` function that was crashing
 * CampaignManager and CreatorManager
 *
 * @param {number} scrollAmount - Pixels to scroll per click (default 300)
 * @returns {{ scrollRef: React.Ref, scrollLeft: Function, scrollRight: Function }}
 */
export const useScrollContainer = (scrollAmount = 300) => {
  const scrollRef = useRef(null);

  const scrollLeft = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, [scrollAmount]);

  const scrollRight = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [scrollAmount]);

  return { scrollRef, scrollLeft, scrollRight };
};

export default useScrollContainer;
