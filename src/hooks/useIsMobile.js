import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const tabletQuery = window.matchMedia('(max-width: 1024px)');

    const handleMobileChange = (e) => setIsMobile(e.matches);
    const handleTabletChange = (e) => setIsTablet(e.matches);

    // Initial check
    setIsMobile(mobileQuery.matches);
    setIsTablet(tabletQuery.matches);

    // Add listeners
    mobileQuery.addEventListener('change', handleMobileChange);
    tabletQuery.addEventListener('change', handleTabletChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      tabletQuery.removeEventListener('change', handleTabletChange);
    };
  }, []);

  return { isMobile, isTablet };
}

export default useIsMobile;
