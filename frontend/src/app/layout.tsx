'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DarkModeProvider } from './contexts/DarkModeContext';
import "./globals.css";
import "./fonts.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMounted, setIsMounted] = useState(false);
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

  // Evitar renderizado inicial del servidor
  if (!isMounted) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body className="antialiased">
          <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 dark:border-blue-400"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <DarkModeProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </DarkModeProvider>
      </body>
    </html>
  );
}