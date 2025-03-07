// components/Layout.tsx
import { ReactNode } from 'react';
import Header from './Header'; // Asegúrate de importar tu componente Header

interface LayoutProps {
  children: ReactNode;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

// Versión extendida con más características
export default function Layout({ children, isDarkMode, onToggleDarkMode }: LayoutProps) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
      }`}>
        <Header 
          isDarkMode={isDarkMode} 
          onToggleDarkMode={onToggleDarkMode} 
        />
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
  
        <footer className={`border-t transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="container mx-auto px-4 py-6">
            <div className="text-center md:flex md:items-center md:justify-between">
              <p className="text-sm">
                Universidad de Sancti Spíritus "José Martí Pérez"
              </p>
              <div className="mt-4 md:mt-0 md:order-2">
                <p className="text-xs">
                  Desarrollado por el Departamento de Informática
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }