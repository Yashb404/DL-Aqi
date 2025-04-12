import { useState, useEffect } from 'react';

// A simplified hook that returns only width information 
export default function useDeviceSize() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    function handleResize() {
      setWidth(window.innerWidth);
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Call handler right away
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024
  };
} 