import React, { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if screen is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on load
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);

    // Check if device is touch-enabled (phones/tablets)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && window.innerWidth < 1024) {
      setIsMobile(true);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};