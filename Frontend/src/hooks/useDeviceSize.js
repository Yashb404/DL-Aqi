"use client"

import { useState, useEffect } from 'react';

// A simplified hook that returns only width information 
export default function useDeviceSize() {
  // Initialize to null so we can detect client render
  const [width, setWidth] = useState(null);
  
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    // Set initial width once mounted
    setWidth(window.innerWidth);
    
    function handleResize() {
      setWidth(window.innerWidth);
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Return defaults until client-side renders
  if (width === null) {
    return {
      width: 1024, // Default to desktop
      isMobile: false,
      isTablet: false,
      isDesktop: true
    };
  }
  
  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024
  };
} 