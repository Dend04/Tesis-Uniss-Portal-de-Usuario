"use client";

import {
  Cog6ToothIcon,
  ChartBarIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeaderProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

interface NavIconProps {
  icon: React.ReactElement;
  label: string;
  isDarkMode: boolean;
  href?: string;
  onClick?: () => void;
  onHover?: () => void;
}

interface MobileNavItemProps {
  icon: React.ReactElement;
  label: string;
  isDarkMode: boolean;
  href?: string;
  onClick: () => void;
  onHover?: () => void;
}

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

  const applyDarkMode = useCallback((dark: boolean) => {
    // Aplicar clase al documento root
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
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      
      // Aplicar cambios al DOM
      applyDarkMode(newValue);
      
      return newValue;
    });
  }, [applyDarkMode]);

  return [isDarkMode, toggleDarkMode];
};

// Función para limpiar el nombre eliminando palabras específicas
const cleanDisplayName = (displayName: string): string => {
  if (!displayName) return 'Usuario';
  
  // Palabras a eliminar (case insensitive)
  const wordsToRemove = ['estudiante', 'trabajador', 'docente', 'investigador'];
  
  // Dividir el nombre en palabras y filtrar
  const cleanedName = displayName
    .split(' ')
    .filter(word => {
      const lowerWord = word.toLowerCase().trim();
      return !wordsToRemove.includes(lowerWord) && word.trim() !== '';
    })
    .join(' ')
    .trim();
  
  // Si después de limpiar queda vacío, devolver el nombre original o "Usuario"
  return cleanedName || displayName || 'Usuario';
};

// Función para decodificar el token JWT
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
};

// Función para obtener los datos del usuario desde el token
const getUserDataFromToken = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  const rawDisplayName = decoded.displayName || decoded.nombreCompleto;
  const cleanedDisplayName = cleanDisplayName(rawDisplayName);
  
  return {
    username: decoded.sAMAccountName,
    displayName: cleanedDisplayName
  };
};

// Componente principal Header optimizado
export const Header = memo(({ onToggleDarkMode, isDarkMode }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>('Usuario');
  const router = useRouter();
  const preloadedPages = useRef(new Set<string>());
  
  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const userData = getUserDataFromToken();
    if (userData?.displayName) {
      setUserDisplayName(userData.displayName);
    }
  }, []);
  
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  
  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(prev => !prev);
  }, []);

  // Precargar página al hacer hover
  const preloadPage = useCallback((path: string) => {
    if (!preloadedPages.current.has(path)) {
      router.prefetch(path);
      preloadedPages.current.add(path);
    }
  }, [router]);

  return (
    <header
      className={`${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      } shadow-sm transition-colors duration-300 px-4 border-b sticky top-0 z-50`}
      role="banner"
      aria-label="Encabezado principal"
    >
      <div className="max-w-7xl mx-auto">
        <nav 
          className="flex justify-between items-center h-16"
          aria-label="Navegación principal"
        >
          {/* Logo como enlace al Dashboard */}
          <Link 
            href="/dashboard" 
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold rounded-md"
            aria-label="Ir al dashboard"
            prefetch={true}
          >
            <div className="relative h-8 w-8">
              <Image
                src={isDarkMode ? "/uniss-logoDark.png" : "/uniss-logo.png"}
                alt="Logo de UNISS"
                width={32}
                height={32}
                priority
                className="object-contain"
              />
            </div>
            <span
              className={`ml-2 text-xl font-bold ${
                isDarkMode ? "text-gray-100" : "text-gray-800"
              }`}
            >
              UNISS
            </span>
          </Link>

          {/* Menú derecho */}
          <div className="flex items-center gap-4">
            {/* Menú para desktop - oculto en móviles */}
            <div className="hidden md:flex items-center gap-6" role="menubar">
              <NavIcon
                href="/config"
                icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
                label="Configuración"
                isDarkMode={isDarkMode}
                onHover={() => preloadPage('/config')}
              />

              <NavIcon
                href="/activity-logs"
                icon={<ChartBarIcon className="h-6 w-6" aria-hidden="true" />}
                label="Actividad"
                isDarkMode={isDarkMode}
                onHover={() => preloadPage('/activity-logs')}
              />

              <NavIcon
                icon={<BellIcon className="h-6 w-6" aria-hidden="true" />}
                label="Notificaciones"
                isDarkMode={isDarkMode}
                onClick={() => {}} // Función vacía para botón
              />
            </div>

            {/* Botón de tema oscuro - siempre visible */}
            <DarkModeButton
              onToggleDarkMode={onToggleDarkMode}
              isDarkMode={isDarkMode}
            />

            {/* Botón de usuario - siempre visible (fuera del menú móvil) */}
            <div className="hidden md:block">
              <UserProfile isDarkMode={isDarkMode} displayName={userDisplayName} onHover={() => preloadPage('/perfil')} />
            </div>

            {/* Botón de menú móvil */}
            <button
              className="md:hidden flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <XMarkIcon 
                  className="h-6 w-6 text-gray-600 dark:text-gray-300" 
                  aria-hidden="true"
                />
              ) : (
                <Bars3Icon 
                  className="h-6 w-6 text-gray-600 dark:text-gray-300" 
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Separador - oculto en móviles */}
            <div
              className={`hidden md:block h-6 w-px ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              } mx-2`}
              aria-hidden="true"
            />

            {/* Logout - siempre visible en desktop */}
            <div className="hidden md:block">
              <LogoutButton isDarkMode={isDarkMode} />
            </div>
          </div>
        </nav>

        {/* Menú móvil desplegable desde la derecha */}
        {isMenuOpen && (
          <div
            id="mobile-menu"
            className={`md:hidden fixed top-0 right-0 bottom-0 w-80 max-w-full ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-lg z-50 transform transition-transform duration-300 ease-in-out`}
            role="menu"
          >
            <div className="flex flex-col h-full">
              {/* Encabezado del menú móvil */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <span className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  Menú
                </span>
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Cerrar menú"
                >
                  <XMarkIcon className={`h-6 w-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`} />
                </button>
              </div>

              {/* Contenido del menú móvil */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-2 px-4">
                  <MobileNavItem
                    href="/config"
                    icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
                    label="Configuración"
                    isDarkMode={isDarkMode}
                    onClick={closeMenu}
                    onHover={() => preloadPage('/config')}
                  />
                  
                  <MobileNavItem
                    href="/activity-logs"
                    icon={<ChartBarIcon className="h-6 w-6" aria-hidden="true" />}
                    label="Actividad"
                    isDarkMode={isDarkMode}
                    onClick={closeMenu}
                    onHover={() => preloadPage('/activity-logs')}
                  />
                  
                  <MobileNavItem
                    icon={<BellIcon className="h-6 w-6" aria-hidden="true" />}
                    label="Notificaciones"
                    isDarkMode={isDarkMode}
                    onClick={() => {
                      closeMenu();
                      // Lógica de notificaciones
                    }}
                  />
                </div>

                {/* Perfil de usuario en móvil */}
                <div className="mt-8 px-4">
                  <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>
                    Cuenta
                  </div>
                  <div className={`py-3 px-4 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}>
                    <div className="flex items-center gap-3">
                      <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
                      <span className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {userDisplayName}
                      </span>
                    </div>
                  </div>
                  <MobileNavItem
                    href="/perfil"
                    icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
                    label="Editar perfil"
                    isDarkMode={isDarkMode}
                    onClick={closeMenu}
                    onHover={() => preloadPage('/perfil')}
                  />
                </div>
              </div>

              {/* Pie del menú móvil con botón de cerrar sesión */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <button
                  onClick={() => {
                    // Lógica de cierre de sesión
                    localStorage.removeItem('authToken');
                    router.push('/login');
                    closeMenu();
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg ${
                    isDarkMode 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-red-100 hover:bg-red-200 text-red-700"
                  } transition-colors`}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

// Componentes auxiliares optimizados
const NavIcon = memo(({ href, icon, label, isDarkMode, onClick, onHover }: NavIconProps) => {
  const iconWithClass = (
    <div className="flex items-center gap-1">
      {icon}
      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
        {label}
        <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
      </span>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
      prefetch={false}
      onMouseEnter={onHover}
    >
      {iconWithClass}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
      onMouseEnter={onHover}
    >
      {iconWithClass}
    </button>
  );
});

NavIcon.displayName = 'NavIcon';

const MobileNavItem = memo(({
  href,
  icon,
  label,
  isDarkMode,
  onClick,
  onHover,
}: MobileNavItemProps) => {
  const content = (
    <div className="flex items-center gap-3">
      {icon}
      <span className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
        {label}
      </span>
    </div>
  );

  return href ? (
    <Link
      href={href}
      onClick={onClick}
      className={`py-3 px-4 rounded-lg ${
        isDarkMode
          ? "hover:bg-gray-700 text-gray-200"
          : "hover:bg-gray-100 text-gray-700"
      } transition-colors block`}
      prefetch={false}
      onMouseEnter={onHover}
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className={`w-full text-left py-3 px-4 rounded-lg ${
        isDarkMode
          ? "hover:bg-gray-700 text-gray-200"
          : "hover:bg-gray-100 text-gray-700"
      } transition-colors`}
      onMouseEnter={onHover}
    >
      {content}
    </button>
  );
});

MobileNavItem.displayName = 'MobileNavItem';

// Componente UserProfile actualizado
interface UserProfileProps {
  isDarkMode: boolean;
  displayName: string;
  onHover?: () => void;
}

const UserProfile = memo(({ isDarkMode, displayName, onHover }: UserProfileProps) => (
  <Link
    href="/perfil"
    className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold"
    aria-label="Ver perfil de usuario"
    prefetch={false}
    onMouseEnter={onHover}
  >
    <UserCircleIcon
      className={`h-8 w-8 ${
        isDarkMode ? "text-gray-300" : "text-gray-600"
      }`}
      aria-hidden="true"
    />
    <span className="sr-only">Perfil de usuario</span>
    <span
      className={`hidden md:block text-sm font-medium truncate max-w-32 ${
        isDarkMode ? "text-gray-200" : "text-gray-700"
      }`}
      title={displayName}
    >
      {displayName}
    </span>
  </Link>
));

UserProfile.displayName = 'UserProfile';

// Componente LogoutButton actualizado con funcionalidad real
const LogoutButton = memo(({ isDarkMode }: { isDarkMode: boolean }) => {
  const router = useRouter();
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    // No removemos la preferencia del modo oscuro al hacer logout
    router.push('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold"
      aria-label="Cerrar sesión"
    >
      <div className="flex items-center gap-1">
        <ArrowRightOnRectangleIcon
          className={`h-6 w-6 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          } group-hover:text-red-500 transition-colors`}
          aria-hidden="true"
        />
        <span className="sr-only">Cerrar sesión</span>
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-red-500 text-white px-2 py-1 rounded-md">
          Cerrar sesión
          <div className="absolute w-2 h-2 bg-red-500 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
        </span>
      </div>
    </button>
  );
});

LogoutButton.displayName = 'LogoutButton';

// Componente DarkModeButton actualizado para usar la nueva lógica
const DarkModeButton = memo(({ onToggleDarkMode, isDarkMode }: { onToggleDarkMode: () => void; isDarkMode: boolean }) => (
  <button
    onClick={onToggleDarkMode}
    className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold"
    aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
  >
    <div className="flex items-center gap-1">
      {isDarkMode ? (
        <SunIcon 
          className="h-6 w-6 text-yellow-400" 
          aria-hidden="true"
        />
      ) : (
        <MoonIcon 
          className="h-6 w-6 text-gray-600 dark:text-gray-300" 
          aria-hidden="true"
        />
      )}
      <span className="sr-only">
        {isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
        {isDarkMode ? "Modo claro" : "Modo oscuro"}
        <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
      </span>
    </div>
  </button>
));

DarkModeButton.displayName = 'DarkModeButton';

// Hook de modo oscuro para usar en otros componentes
export { useDarkMode };

export default Header;