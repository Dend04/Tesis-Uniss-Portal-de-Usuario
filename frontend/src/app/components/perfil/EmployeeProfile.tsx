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
}

const EmployeeProfile = ({
    employee,
    loadingEmployee,
    formatTipoContrato,
    formatRegimenSalarial,
    getAnoContratacion,
    formatProfesionDescription
}: EmployeeProfileProps) => {
    if (!employee) return null;

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-8">
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
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                            <span className="ml-4 text-lg text-gray-600">Cargando datos del trabajador...</span>
                        </div>
                    ) : employee ? (
                        <>
                            <InfoItem
                                icon={<TicketIcon className="h-7 w-7" />}
                                label="Código de Ticket del Almuerzo"
                                value={employee.Id_Empleado}
                                highlight
                            />
                            <InfoItem
                                icon={<BriefcaseIcon className="h-7 w-7" />}
                                label="Cargo"
                                value={employee.cargoDescription || 'Cargo no disponible'}
                            />
                            <InfoItem
                                icon={<BuildingOfficeIcon className="h-7 w-7" />}
                                label="Departamento"
                                value={employee.department}
                            />
                            <InfoItem
                                icon={<DocumentTextIcon className="h-7 w-7" />}
                                label="Tipo de Contrato"
                                value={formatTipoContrato(employee.Id_Tipo_Contrato)}
                            />
                            <InfoItem
                                icon={<ScaleIcon className="h-7 w-7" />}
                                label="Régimen Salarial"
                                value={formatRegimenSalarial(employee.Regimen_Salarial)}
                            />
                            <InfoItem
                                icon={<CalendarDaysIcon className="h-7 w-7" />}
                                label="Año de Contratación"
                                value={getAnoContratacion(employee.Fecha_Contratacion, employee.Ano_Alta)}
                            />
                            <InfoItem
                                icon={<GraduationCapIcon className="h-7 w-7" />}
                                label="Graduado de"
                                value={formatProfesionDescription(employee.profesionDescription)}
                            />
                            <InfoItem
                                icon={<MapIcon className="h-7 w-7" />}
                                label="Municipio"
                                value={employee.municipioDescription || 'No disponible'}
                            />
                            {/* Información adicional del empleado */}
                            <InfoItem
                                icon={<UserCircleIcon className="h-7 w-7" />}
                                label="Nombre Completo"
                                value={`${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2}`.trim()}
                            />
                        </>
                    ) : (
                        <div className="md:col-span-3 text-center py-8">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                <BriefcaseIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                                    No se pudieron cargar los datos del trabajador
                                </h3>
                                <p className="text-yellow-700">
                                    La información laboral no está disponible en este momento.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Estado de carga mejorado */}
                {loadingEmployee && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
                            <div className="flex items-center justify-center mb-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                            </div>
                            <p className="text-center text-lg font-semibold text-gray-700">
                                Cargando información laboral...
                            </p>
                            <p className="text-center text-gray-600 mt-2">
                                Esto puede tomar unos segundos
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem = ({ 
    icon, 
    label, 
    value, 
    highlight = false 
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) => (
    <div className={`flex items-start gap-4 p-5 rounded-xl transition-all duration-200 ${
        highlight 
            ? 'bg-green-50 border border-green-200 transform hover:scale-[1.02]' 
            : 'bg-gray-50 hover:bg-gray-100'
    }`}>
        <div className={`${highlight ? 'text-green-600' : 'text-green-500'} mt-1`}>
            {icon}
        </div>
        <div className="flex-1">
            <dt className={`text-base font-semibold mb-2 ${
                highlight ? 'text-green-800' : 'text-gray-700'
            }`}>
                {label}
            </dt>
            <dd className={`text-lg font-bold ${
                highlight ? 'text-green-900' : 'text-gray-900'
            }`}>
                {value || 'No disponible'}
            </dd>
        </div>
    </div>
);

export default EmployeeProfile;