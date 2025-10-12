import { useState, useEffect, useCallback } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialDarkMode = savedDarkMode !== null 
        ? JSON.parse(savedDarkMode) 
        : prefersDark;
      
      setIsDarkMode(initialDarkMode);
      applyDarkMode(initialDarkMode);
    }
  }, []);

  const applyDarkMode = useCallback((dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', JSON.stringify(newValue));
      }
      
      // Aplicar cambios al DOM
      applyDarkMode(newValue);
      
      return newValue;
    });
  }, [applyDarkMode]);

  return { isDarkMode, toggleDarkMode };
};