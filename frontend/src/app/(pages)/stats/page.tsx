"use client";

import { useEffect, useState } from "react";
import { useDarkModeContext } from "../../contexts/DarkModeContext";

interface StatsData {
  totalEstudiantes: number;
  estudiantesPorCarrera: { carrera: string; cantidad: number; porcentaje: number }[];
  estudiantesPorAno: { ano: string; cantidad: number; porcentaje: number }[];
  graduadosPorAno: { ano: number; cantidad: number; crecimiento: number }[];
  totalDocentes: number;
  estudiantesPorGenero: { genero: string; cantidad: number; porcentaje: number }[];
  facultades: { nombre: string; estudiantes: number; docentes: number }[];
  // Nuevos datos específicos para estudiantes
  miCarrera: { carrera: string; total: number; facultad: string };
  miAno: { ano: string; total: number; promedioEdad: number };
  progresoPersonal: { asignaturasAprobadas: number; totalAsignaturas: number; porcentaje: number };
}

export default function StatsPage() {
  const { isDarkMode } = useDarkModeContext();
  const [userRole, setUserRole] = useState<string>("estudiante"); // Valor por defecto para pruebas
  const [loading, setLoading] = useState(false); // Cambiado a false para mostrar datos inmediatamente
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    // Simulamos una pequeña demora para mostrar el estado de carga
    setLoading(true);
    const timer = setTimeout(() => {
      loadStatsData();
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const loadStatsData = async () => {
    // Datos ficticios más completos y realistas
    const mockStats: StatsData = {
      totalEstudiantes: 5427,
      estudiantesPorCarrera: [
        { carrera: "Ingeniería Informática", cantidad: 847, porcentaje: 15.6 },
        { carrera: "Medicina", cantidad: 1250, porcentaje: 23.0 },
        { carrera: "Derecho", cantidad: 892, porcentaje: 16.4 },
        { carrera: "Administración", cantidad: 756, porcentaje: 13.9 },
        { carrera: "Psicología", cantidad: 543, porcentaje: 10.0 },
        { carrera: "Ingeniería Civil", cantidad: 689, porcentaje: 12.7 },
        { carrera: "Arquitectura", cantidad: 450, porcentaje: 8.3 }
      ],
      estudiantesPorAno: [
        { ano: "1er Año", cantidad: 1650, porcentaje: 30.4 },
        { ano: "2do Año", cantidad: 1420, porcentaje: 26.2 },
        { ano: "3er Año", cantidad: 1150, porcentaje: 21.2 },
        { ano: "4to Año", cantidad: 785, porcentaje: 14.5 },
        { ano: "5to Año", cantidad: 422, porcentaje: 7.8 }
      ],
      graduadosPorAno: [
        { ano: 2024, cantidad: 425, crecimiento: 8.2 },
        { ano: 2023, cantidad: 392, crecimiento: 5.1 },
        { ano: 2022, cantidad: 373, crecimiento: -2.3 },
        { ano: 2021, cantidad: 382, crecimiento: 12.4 },
        { ano: 2020, cantidad: 340, crecimiento: 15.6 }
      ],
      totalDocentes: 324,
      estudiantesPorGenero: [
        { genero: "Masculino", cantidad: 2850, porcentaje: 52.5 },
        { genero: "Femenino", cantidad: 2577, porcentaje: 47.5 }
      ],
      facultades: [
        { nombre: "Ciencias Médicas", estudiantes: 1890, docentes: 95 },
        { nombre: "Ciencias Sociales", estudiantes: 1450, docentes: 78 },
        { nombre: "Ingeniería y Tecnología", estudiantes: 1250, docentes: 85 },
        { nombre: "Ciencias Económicas", estudiantes: 837, docentes: 66 }
      ],
      // Datos específicos para estudiantes
      miCarrera: { 
        carrera: "Ingeniería Informática", 
        total: 847, 
        facultad: "Ingeniería y Tecnología" 
      },
      miAno: { 
        ano: "2do Año", 
        total: 285, 
        promedioEdad: 20.3 
      },
      progresoPersonal: { 
        asignaturasAprobadas: 12, 
        totalAsignaturas: 24, 
        porcentaje: 50 
      }
    };

    setStats(mockStats);
  };

  // Función para simular cambio de rol (útil para pruebas)
  const cambiarRol = (nuevoRol: string) => {
    setUserRole(nuevoRol);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} flex items-center justify-center`}>
        <div className="text-lg">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Selector de rol para pruebas - puedes eliminar esto después */}
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 text-sm mb-2">
            <strong>Modo Pruebas:</strong> Selecciona un rol para ver diferentes vistas
          </p>
          <div className="flex gap-2 flex-wrap">
            {['estudiante', 'docente', 'administrador'].map((rol) => (
              <button
                key={rol}
                onClick={() => cambiarRol(rol)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userRole === rol 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {rol}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Estadísticas Universitarias</h1>
            <p className={`mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Universidad José Martí Pérez - Sancti Spíritus
            </p>
          </div>
          <div className={`text-sm px-3 py-1 rounded-full ${
            isDarkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
          }`}>
            Rol: {userRole}
          </div>
        </div>
        
        {stats && (
          <div className="space-y-8">
            {/* Tarjetas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-2">Total de Estudiantes</h2>
                <p className="text-3xl font-bold text-blue-500">{stats.totalEstudiantes.toLocaleString()}</p>
                <p className="text-sm mt-2">Estudiantes activos</p>
              </div>

              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-2">Total de Docentes</h2>
                <p className="text-3xl font-bold text-green-500">{stats.totalDocentes}</p>
                <p className="text-sm mt-2">Profesores activos</p>
              </div>

              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-2">Facultades</h2>
                <p className="text-3xl font-bold text-purple-500">{stats.facultades.length}</p>
                <p className="text-sm mt-2">Departamentos académicos</p>
              </div>

              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-2">Graduados 2024</h2>
                <p className="text-3xl font-bold text-orange-500">{stats.graduadosPorAno[0].cantidad}</p>
                <p className="text-sm mt-2">+{stats.graduadosPorAno[0].crecimiento}% vs 2023</p>
              </div>
            </div>

            {/* Información específica para estudiantes */}
            {userRole === 'estudiante' && (
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-2xl font-semibold mb-4">Mi Información Académica</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <h3 className="font-semibold mb-2">Mi Carrera</h3>
                    <p className="text-lg font-bold">{stats.miCarrera.carrera}</p>
                    <p className="text-sm">{stats.miCarrera.facultad}</p>
                    <p className="text-xs mt-1">{stats.miCarrera.total} estudiantes</p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                    <h3 className="font-semibold mb-2">Mi Año</h3>
                    <p className="text-lg font-bold">{stats.miAno.ano}</p>
                    <p className="text-sm">Promedio edad: {stats.miAno.promedioEdad} años</p>
                    <p className="text-xs mt-1">{stats.miAno.total} estudiantes en mi año</p>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                    <h3 className="font-semibold mb-2">Progreso</h3>
                    <p className="text-lg font-bold">{stats.progresoPersonal.porcentaje}%</p>
                    <p className="text-sm">
                      {stats.progresoPersonal.asignaturasAprobadas}/{stats.progresoPersonal.totalAsignaturas} asignaturas
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${stats.progresoPersonal.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Información específica para docentes y administradores */}
            {(userRole === 'docente' || userRole === 'administrador') && (
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-2xl font-semibold mb-4">Información Docente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Distribución por Facultades</h3>
                    <div className="space-y-3">
                      {stats.facultades.map((facultad, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{facultad.nombre}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm">{facultad.estudiantes} estud.</span>
                            <span className="text-sm">{facultad.docentes} doc.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Distribución por Género</h3>
                    <div className="space-y-3">
                      {stats.estudiantesPorGenero.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.genero}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.cantidad}</span>
                            <span className="text-sm">({item.porcentaje}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Secciones de datos generales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Estudiantes por Carrera */}
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-4">Estudiantes por Carrera</h2>
                <div className="space-y-3">
                  {stats.estudiantesPorCarrera.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="flex-1">{item.carrera}</span>
                      <div className="flex items-center gap-4 w-32 justify-end">
                        <span className="font-semibold">{item.cantidad}</span>
                        <span className="text-sm text-gray-500 w-12 text-right">({item.porcentaje}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estudiantes por Año */}
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h2 className="text-xl font-semibold mb-4">Estudiantes por Año Académico</h2>
                <div className="space-y-3">
                  {stats.estudiantesPorAno.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{item.ano}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{item.cantidad}</span>
                        <span className="text-sm text-gray-500">({item.porcentaje}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Graduados por Año */}
            <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
              <h2 className="text-xl font-semibold mb-4">Graduados por Año</h2>
              <div className="space-y-3">
                {stats.graduadosPorAno.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{item.ano}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{item.cantidad} graduados</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        item.crecimiento >= 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {item.crecimiento >= 0 ? '+' : ''}{item.crecimiento}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}