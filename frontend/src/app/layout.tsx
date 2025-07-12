'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";
import "./fonts.css"; // Importa el archivo de fuentes

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
        <body>
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}