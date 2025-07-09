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
import { useState, ReactElement, cloneElement } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeaderProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

interface NavIconProps {
  icon: ReactElement;
  label: string;
  isDarkMode: boolean;
  href?: string;
  onClick?: () => void;
}

interface MobileNavItemProps {
  icon: ReactElement;
  label: string;
  isDarkMode: boolean;
  href?: string;
  onClick: () => void;
}

interface UserProfileProps {
  isDarkMode: boolean;
}

interface LogoutButtonProps {
  isDarkMode: boolean;
}

interface DarkModeButtonProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

export const Header = ({ onToggleDarkMode, isDarkMode }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  
  // Cerrar menú al hacer clic en un enlace
  const closeMenu = () => setIsMenuOpen(false);
  
  // Prevenir comportamiento predeterminado en el botón de menú móvil
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={`${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      } shadow-sm transition-colors duration-300 px-4 border-b relative`}
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
          >
            <div className="relative h-8 w-8">
              <Image
                src={isDarkMode ? "/uniss-logoDark.png" : "/uniss-logo.png"}
                alt="Logo de UNISS"
                width={32}
                height={32}
                priority
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
              {/* Botón de Configuración */}
              <NavIcon
                href="/config"
                icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
                label="Configuración"
                isDarkMode={isDarkMode}
              />

              {/* Botón de Actividad */}
              <NavIcon
                href="/activity-logs"
                icon={<ChartBarIcon className="h-6 w-6" aria-hidden="true" />}
                label="Actividad"
                isDarkMode={isDarkMode}
              />

              {/* Botón de Notificaciones */}
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

            {/* Perfil de usuario y logout - siempre visibles */}
            <UserProfile isDarkMode={isDarkMode} />
            <LogoutButton isDarkMode={isDarkMode} />
          </div>
        </nav>

        {/* Menú móvil desplegable */}
        {isMenuOpen && (
          <div
            id="mobile-menu"
            className={`md:hidden absolute top-16 left-0 right-0 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-lg z-50 py-4 transition-all duration-300`}
            role="menu"
          >
            <div className="flex flex-col space-y-4 px-4">
              <MobileNavItem
                href="/config"
                icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
                label="Configuración"
                isDarkMode={isDarkMode}
                onClick={closeMenu}
              />
              
              <MobileNavItem
                href="/activity-logs"
                icon={<ChartBarIcon className="h-6 w-6" aria-hidden="true" />}
                label="Actividad"
                isDarkMode={isDarkMode}
                onClick={closeMenu}
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
          </div>
        )}
      </div>
    </header>
  );
};

// Componentes auxiliares optimizados

const DarkModeButton = ({ onToggleDarkMode, isDarkMode }: DarkModeButtonProps) => (
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
);

const UserProfile = ({ isDarkMode }: UserProfileProps) => (
  <Link
    href="/perfil"
    className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold"
    aria-label="Ver perfil de usuario"
  >
    <UserCircleIcon
      className={`h-8 w-8 ${
        isDarkMode ? "text-gray-300" : "text-gray-600"
      }`}
      aria-hidden="true"
    />
    <span className="sr-only">Perfil de usuario</span>
    <span
      className={`hidden md:block text-sm font-medium ${
        isDarkMode ? "text-gray-200" : "text-gray-700"
      }`}
    >
      Juan Pérez
    </span>
  </Link>
);

const LogoutButton = ({ isDarkMode }: LogoutButtonProps) => (
  <button 
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

const NavIcon = ({ href, icon, label, isDarkMode, onClick }: NavIconProps) => {
  const iconElement = cloneElement(icon as ReactElement<{ className?: string }>, {
    className: `h-6 w-6 ${
      isDarkMode ? "text-gray-300" : "text-gray-600"
    } group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors`,
  });

  const content = (
    <div className="flex items-center gap-1">
      {iconElement}
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
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
    >
      {content}
    </button>
  );
};


const MobileNavItem = ({
  href,
  icon,
  label,
  isDarkMode,
  onClick,
}: MobileNavItemProps) => {
  // Solución: Especificar el tipo de las props del ícono
  const iconElement = cloneElement(icon as ReactElement<{ className?: string }>, {
    className: `h-6 w-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`,
  });

  const content = (
    <div className="flex items-center gap-3">
      {iconElement}
      <span className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
        {label}
      </span>
    </div>
  );

  return href ? (
    <Link
      href={href}
      onClick={onClick}
      className={`py-2 px-4 rounded-lg ${
        isDarkMode
          ? "hover:bg-gray-700 text-gray-200"
          : "hover:bg-gray-100 text-gray-700"
      } transition-colors`}
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className={`w-full text-left py-2 px-4 rounded-lg ${
        isDarkMode
          ? "hover:bg-gray-700 text-gray-200"
          : "hover:bg-gray-100 text-gray-700"
      } transition-colors`}
    >
      {content}
    </button>
  );
};

export default Header;