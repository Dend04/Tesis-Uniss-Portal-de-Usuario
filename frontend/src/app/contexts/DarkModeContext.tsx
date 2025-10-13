"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  // Rutas que deben mantenerse SIEMPRE en modo claro
  const lightModeRoutes = [
    '/activate-account',
    '/forgot-password',
    // Agrega aquí cualquier otra ruta que deba ser siempre clara
  ];

  // Determinar si la ruta actual debe forzar modo claro
  const shouldForceLightMode = lightModeRoutes.some(route => 
    pathname?.startsWith(route)
  );

  useEffect(() => {
    // Si es una ruta que debe ser clara, forzar modo claro y salir
    if (shouldForceLightMode) {
      applyLightMode();
      return;
    }

    // Solo ejecutar en el cliente para rutas normales
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialDarkMode = savedDarkMode !== null 
        ? JSON.parse(savedDarkMode) 
        : prefersDark;
      
      setIsDarkMode(initialDarkMode);
      applyDarkMode(initialDarkMode);
    }
  }, [pathname, shouldForceLightMode]);

  const applyDarkMode = useCallback((dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
    } else {
      applyLightMode();
    }
  }, []);

  // Función separada para aplicar modo claro
  const applyLightMode = useCallback(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
    document.body.classList.remove('dark');
    document.body.style.backgroundColor = '#ffffff';
    
    // Forzar estilos claros en elementos específicos si es necesario
    const forceLightElements = document.querySelectorAll('[data-force-light]');
    forceLightElements.forEach(el => {
      el.classList.remove('dark');
      el.classList.add('light-mode-forced');
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    // No permitir toggle en rutas que deben ser claras
    if (shouldForceLightMode) {
      return;
    }

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
  }, [applyDarkMode, shouldForceLightMode]);

  // Valor del contexto - en rutas claras, siempre devolver false
  const contextValue: DarkModeContextType = {
    isDarkMode: shouldForceLightMode ? false : isDarkMode,
    toggleDarkMode: shouldForceLightMode ? () => {} : toggleDarkMode,
  };

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkModeContext = () => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkModeContext must be used within a DarkModeProvider');
  }
  return context;
};