// src/components/Header.tsx
import { 
    AcademicCapIcon,
    DocumentTextIcon,
    UserGroupIcon,
    ChartBarIcon 
  } from '@heroicons/react/24/solid';
  
  export const Header = () => {
    return (
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/uniss-logo.png" 
                alt="UNISS Logo" 
                className="h-8 w-8"
              />
              <span className="ml-2 text-xl font-bold text-gray-800">
                Plataforma UNISS
              </span>
            </div>
  
            {/* Menú de navegación */}
            <div className="hidden md:flex space-x-8">
              <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                <AcademicCapIcon className="h-5 w-5" />
                <span>Carreras</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                <DocumentTextIcon className="h-5 w-5" />
                <span>Matrículas</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                <UserGroupIcon className="h-5 w-5" />
                <span>Estudiantes</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                <ChartBarIcon className="h-5 w-5" />
                <span>Estadísticas</span>
              </button>
            </div>
          </nav>
        </div>
      </header>
    );
  };

  export default Header;