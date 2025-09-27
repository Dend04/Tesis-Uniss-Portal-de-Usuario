'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from './components/Header'; // Ajusta la ruta según tu estructura
import "./globals.css";
import "./fonts.css"; // Importa el archivo de fuentes

// Hook personalizado para el modo oscuro con persistencia
const useDarkMode = (): [boolean, () => void] => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Cargar preferencia del localStorage al montar el componente
    const savedDarkMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Prioridad: localStorage > preferencia del sistema > claro por defecto
    const initialDarkMode = savedDarkMode !== null 
      ? JSON.parse(savedDarkMode) 
      : prefersDark;
    
    setIsDarkMode(initialDarkMode);
    applyDarkMode(initialDarkMode);
  }, []);

  const applyDarkMode = (dark: boolean) => {
    // Aplicar clase al documento root
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    
    // Guardar en localStorage
    localStorage.setItem('darkMode', JSON.stringify(newValue));
    
    // Aplicar cambios al DOM
    applyDarkMode(newValue);
  };

  return [isDarkMode, toggleDarkMode];
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    
    // Verificar autenticación solo en cliente
    /* const token = localStorage.getItem('authToken'); */
    const currentPath = window.location.pathname;

    /* if (!token && currentPath !== '/') {
      router.push('/');
    } */

    /* if (token && currentPath === '/') {
      router.push('/perfil');
    } */
  }, []);

  // Aplicar modo oscuro al body para el spinner de carga
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#111827'; // bg-gray-900
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [isDarkMode]);

  // Evitar renderizado inicial del servidor
  if (!isMounted) {
    return (
      <html lang="es" suppressHydrationWarning className={isDarkMode ? 'dark' : ''}>
        <body className={`antialiased ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className={`flex justify-center items-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`animate-spin rounded-full h-12 w-12 border-t-4 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" suppressHydrationWarning className={isDarkMode ? 'dark' : ''}>
      <body className={`antialiased ${isDarkMode ? 'dark:bg-gray-900 dark:text-gray-100' : 'bg-white text-gray-900'}`}>
       {/*  <Header onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} /> */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}