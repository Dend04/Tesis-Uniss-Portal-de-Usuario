// src/components/Header.tsx
import { 
  Cog6ToothIcon,
  ChartBarIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface HeaderProps {
  onToggleDarkMode: () => void;
}

export const Header = ({ onToggleDarkMode }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = {
    name: "Juan Pérez",
    avatar: null
  };

  return (
    <header className="bg-white shadow-sm dark:bg-gray-800 transition-colors duration-300 px-4">
      <div className="max-w-7xl mx-auto">
        <nav className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/uniss-logo.png" 
              alt="UNISS Logo" 
              className="h-8 w-8"
            />
            <span className="ml-2 text-xl font-bold text-gray-800 dark:text-white">
              Plataforma UNISS
            </span>
          </div>

          {/* Menú derecho */}
          <div className="flex items-center gap-4">
            {/* Botones con hover animado */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={onToggleDarkMode}
                className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                <div className="flex items-center gap-1">
                  <Cog6ToothIcon className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors" />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Configuración
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </button>

              <button className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                <div className="flex items-center gap-1">
                  <ChartBarIcon className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors" />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Actividad
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </button>

              <button className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                <div className="flex items-center gap-1">
                  <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors" />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Notificaciones
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </button>
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-2" />

            {/* Perfil de usuario */}
            <div className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Perfil" 
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <UserCircleIcon className="h-8 w-8 text-gray-600 dark:text-gray-300" />
              )}
              <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </span>
            </div>

            {/* Botón de cerrar sesión */}
            <button className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              <div className="flex items-center gap-1">
                <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-red-500 text-white px-2 py-1 rounded-md">
                  Cerrar sesión
                  <div className="absolute w-2 h-2 bg-red-500 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                </span>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;