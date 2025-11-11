'use client';

import {
    BriefcaseIcon,
    TicketIcon,
    BuildingOfficeIcon,
    DocumentTextIcon,
    ScaleIcon,
    CalendarDaysIcon,
    AcademicCapIcon as GraduationCapIcon,
    MapIcon,
    UserCircleIcon
} from "@heroicons/react/24/outline";

interface EmployeeData {
    Id_Empleado: string;
    Id_Cargo: string;
    department: string;
    Nombre: string;
    Apellido_1: string;
    Apellido_2: string;
    cargoDescription?: string;
    Id_Tipo_Contrato?: string;
    Regimen_Salarial?: number;
    Fecha_Contratacion?: any;
    Id_Profesion?: string;
    Id_Nivel_Escolaridad?: string;
    Ano_Alta?: number;
    profesionDescription?: string;
    municipioDescription?: string;
}

interface EmployeeProfileProps {
    employee: EmployeeData | null;
    loadingEmployee: boolean;
    formatTipoContrato: (tipo?: string) => string;
    formatRegimenSalarial: (regimen?: number) => string;
    getAnoContratacion: (fechaContratacion: any, anoAlta?: number) => string;
    formatProfesionDescription: (profesion?: string) => string;
    isDarkMode: boolean;
}

const EmployeeProfile = ({
    employee,
    loadingEmployee,
    formatTipoContrato,
    formatRegimenSalarial,
    getAnoContratacion,
    formatProfesionDescription,
    isDarkMode
}: EmployeeProfileProps) => {
    if (!employee) return null;

    return (
        <div className={`rounded-2xl shadow-xl overflow-hidden mt-8 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
            {/* Encabezado con estilo similar al estudiante */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 flex items-center gap-6">
                <div className="bg-white/10 p-4 rounded-full">
                    <BriefcaseIcon className="h-20 w-20 text-white/80" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Información Laboral
                    </h1>
                    <div className="flex items-center mt-2 gap-2">
                        <UserCircleIcon className="h-6 w-6 text-white/80" />
                        <p className="text-xl text-white/90">
                            {employee.Nombre} {employee.Apellido_1} {employee.Apellido_2}
                        </p>
                    </div>
                    <div className="mt-2 text-white/80">
                        <strong>Código de Ticket del Almuerzo:</strong> {employee.Id_Empleado}
                    </div>
                    <div className="mt-1 text-white/80">
                        <strong>Cargo:</strong> {employee.cargoDescription || 'No disponible'}
                    </div>
                </div>
            </div>

            {/* Cuerpo de datos del trabajador */}
            <div className="p-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadingEmployee ? (
                        <div className="md:col-span-3 flex justify-center items-center py-12">
                            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
                                isDarkMode ? "border-green-400" : "border-green-500"
                            }`}></div>
                            <span className={`ml-4 text-lg ${
                                isDarkMode ? "text-gray-300" : "text-gray-600"
                            }`}>
                                Cargando datos del trabajador...
                            </span>
                        </div>
                    ) : employee ? (
                        <>
                            <InfoItem
                                icon={<TicketIcon className="h-7 w-7" />}
                                label="Pin del Empleado"
                                value={employee.Id_Empleado}
                                highlight
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<BriefcaseIcon className="h-7 w-7" />}
                                label="Cargo"
                                value={employee.cargoDescription || 'Cargo no disponible'}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<BuildingOfficeIcon className="h-7 w-7" />}
                                label="Departamento"
                                value={employee.department}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<DocumentTextIcon className="h-7 w-7" />}
                                label="Tipo de Contrato"
                                value={formatTipoContrato(employee.Id_Tipo_Contrato)}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<ScaleIcon className="h-7 w-7" />}
                                label="Régimen Salarial"
                                value={formatRegimenSalarial(employee.Regimen_Salarial)}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<CalendarDaysIcon className="h-7 w-7" />}
                                label="Año de Contratación"
                                value={getAnoContratacion(employee.Fecha_Contratacion, employee.Ano_Alta)}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<GraduationCapIcon className="h-7 w-7" />}
                                label="Graduado de"
                                value={formatProfesionDescription(employee.profesionDescription)}
                                isDarkMode={isDarkMode}
                            />
                            <InfoItem
                                icon={<MapIcon className="h-7 w-7" />}
                                label="Municipio"
                                value={employee.municipioDescription || 'No disponible'}
                                isDarkMode={isDarkMode}
                            />
                            {/* Información adicional del empleado */}
                            <InfoItem
                                icon={<UserCircleIcon className="h-7 w-7" />}
                                label="Nombre Completo"
                                value={`${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2}`.trim()}
                                isDarkMode={isDarkMode}
                            />
                        </>
                    ) : (
                        <div className="md:col-span-3 text-center py-8">
                            <div className={`rounded-lg p-6 ${
                                isDarkMode 
                                    ? "bg-yellow-900/30 border-yellow-700" 
                                    : "bg-yellow-50 border-yellow-200"
                            } border`}>
                                <BriefcaseIcon className={`h-12 w-12 mx-auto mb-3 ${
                                    isDarkMode ? "text-yellow-400" : "text-yellow-500"
                                }`} />
                                <h3 className={`text-lg font-semibold mb-2 ${
                                    isDarkMode ? "text-yellow-300" : "text-yellow-800"
                                }`}>
                                    No se pudieron cargar los datos del trabajador
                                </h3>
                                <p className={isDarkMode ? "text-yellow-200" : "text-yellow-700"}>
                                    La información laboral no está disponible en este momento.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Estado de carga mejorado */}
                {loadingEmployee && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className={`rounded-2xl p-8 max-w-md mx-4 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                        }`}>
                            <div className="flex items-center justify-center mb-4">
                                <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
                                    isDarkMode ? "border-green-400" : "border-green-500"
                                }`}></div>
                            </div>
                            <p className={`text-center text-lg font-semibold ${
                                isDarkMode ? "text-gray-200" : "text-gray-700"
                            }`}>
                                Cargando información laboral...
                            </p>
                            <p className={`text-center mt-2 ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}>
                                Esto puede tomar unos segundos
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
    isDarkMode: boolean;
}

const InfoItem = ({ 
    icon, 
    label, 
    value, 
    highlight = false,
    isDarkMode
}: InfoItemProps) => (
    <div className={`flex items-start gap-4 p-5 rounded-xl transition-all duration-200 ${
        highlight 
            ? isDarkMode
                ? 'bg-green-900/20 border border-green-700 transform hover:scale-[1.02]' 
                : 'bg-green-50 border border-green-200 transform hover:scale-[1.02]'
            : isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-50 hover:bg-gray-100'
    }`}>
        <div className={`${highlight 
            ? isDarkMode ? 'text-green-400' : 'text-green-600' 
            : isDarkMode ? 'text-green-400' : 'text-green-500'
        } mt-1`}>
            {icon}
        </div>
        <div className="flex-1">
            <dt className={`text-base font-semibold mb-2 ${
                highlight 
                    ? isDarkMode ? 'text-green-300' : 'text-green-800'
                    : isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
                {label}
            </dt>
            <dd className={`text-lg font-bold ${
                highlight 
                    ? isDarkMode ? 'text-green-200' : 'text-green-900'
                    : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
                {value || 'No disponible'}
            </dd>
        </div>
    </div>
);

export default EmployeeProfile;