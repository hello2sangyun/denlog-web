"use client";

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function AccentColorProvider() {
  const accentColor = useStore((state) => state.accentColor);

  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--primary', accentColor);
    }
  }, [accentColor]);

  return null;
}
