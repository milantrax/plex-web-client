// src/components/BackToTop.js
import React, { useState, useEffect } from 'react';
import { Fab } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { PLAYER_HEIGHT } from '../theme/theme';

function BackToTop({ scrollContainerRef }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScrollToTop = () => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const viewportHeight = window.innerHeight;
      const scrolled = container.scrollTop > viewportHeight;
      setShowBackToTop(scrolled);
    };

    handleScroll();

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  return (
    <Fab
      color="primary"
      size="medium"
      onClick={handleScrollToTop}
      sx={{
        position: 'fixed',
        bottom: `${PLAYER_HEIGHT + 20}px`,
        right: 20,
        zIndex: 1100,
        boxShadow: 3,
        opacity: showBackToTop ? 1 : 0,
        visibility: showBackToTop ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
      }}
      aria-label="scroll back to top"
    >
      <KeyboardArrowUpIcon />
    </Fab>
  );
}

export default BackToTop;
