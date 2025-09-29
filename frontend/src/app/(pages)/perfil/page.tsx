'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/app/components/ProgressBar";
import {
    UserCircleIcon,
    IdentificationIcon,
    CalendarIcon,
    MapPinIcon,
    PhoneIcon,
    AcademicCapIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ScaleIcon,
    UserGroupIcon,
    BriefcaseIcon,
    TicketIcon,
    BuildingOfficeIcon,
    ClockIcon,
    DocumentTextIcon,
    AcademicCapIcon as GraduationCapIcon, // Nuevo icono para profesión
    MapIcon // Nuevo icono para municipio
} from "@heroicons/react/24/outline";

interface StudentData {
    personalData: {
        fullName: string;
        identification: string;
        birthDate: string;
        address: string;
        contact: string;
        origin: string;
    };
    academicData: {
        faculty: string;
        career: string;
        year: string;
        status: string;
        academicIndex: string;
    };
    familyData: {
        mother: string;
        father: string;
    };
}

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
    profesionDescription?: string; // ✅ Nuevo campo
    municipioDescription?: string; // ✅ Nuevo campo
}

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

    return {
        employeeID: decoded.employeeID,
        username: decoded.sAMAccountName,
        displayName: decoded.displayName || decoded.nombreCompleto
    };
};

// Función para formatear fecha
const formatDate = (date: any): string => {
    if (!date || typeof date !== 'object') return 'No disponible';
    try {
        // Si es un objeto con propiedades de fecha
        if (date.year && date.month && date.day) {
            return `${date.day}/${date.month}/${date.year}`;
        }
        return 'No disponible';
    } catch {
        return 'No disponible';
    }
};

// ✅ NUEVA FUNCIÓN: Obtener año de contratación
const getAnoContratacion = (fechaContratacion: any, anoAlta?: number): string => {
    // Primero intentar con la fecha de contratación
    const fechaFormateada = formatDate(fechaContratacion);
    if (fechaFormateada !== 'No disponible') {
        // Extraer el año de la fecha formateada
        const yearMatch = fechaFormateada.match(/\d{4}/);
        if (yearMatch) {
            return yearMatch[0];
        }
    }
    
    // Si no hay fecha de contratación, usar el año de alta
    if (anoAlta) {
        return anoAlta.toString();
    }
    
    return 'No disponible';
};

// Función para formatear el tipo de contrato
const formatTipoContrato = (tipo?: string): string => {
    if (!tipo) return 'No disponible';
    
    const contratos: { [key: string]: string } = {
        '5': 'Contrato Indefinido',
        '1': 'Contrato Temporal',
        '2': 'Contrato Por Obra',
        '3': 'Contrato de Práctica',
        '4': 'Contrato de Formación'
    };
    const tipoLimpio = tipo.trim();
    return contratos[tipoLimpio] || `Contrato ${tipoLimpio}`;
};

// Función para formatear régimen salarial
const formatRegimenSalarial = (regimen?: number): string => {
    if (regimen === undefined || regimen === null) return 'No disponible';
    
    const regimenes: { [key: number]: string } = {
        1: 'Régimen General',
        2: 'Régimen Especial',
        3: 'Régimen Contractual'
    };
    return regimenes[regimen] || `Régimen ${regimen}`;
};

// ✅ NUEVA FUNCIÓN: Formatear descripción de profesión
const formatProfesionDescription = (profesion?: string): string => {
    if (!profesion) return 'No disponible';
    
    const profesionLimpia = profesion.trim();
    
    // Mapeo de abreviaturas a sus equivalentes completos
    const reemplazos: { [key: string]: string } = {
        'TM': 'Técnico Medio en',
        'Ing': 'Ingeniero',
        'Ing.': 'Ingeniero',
        'Lic': 'Licenciado en',
        'Lic.': 'Licenciado en',
        'LIc': 'Licenciado en',
        'LIc.': 'Licenciado en',
        'Dr': 'Doctor',
        'Dr.': 'Doctor',
        'Dra': 'Doctora',
        'Dra.': 'Doctora',
        'MSc': 'Máster en Ciencias',
        'MSc.': 'Máster en Ciencias',
        'PhD': 'Doctor en Filosofía',
        'PhD.': 'Doctor en Filosofía'
    };
    
    let resultado = profesionLimpia;
    
    // Reemplazar cada abreviatura encontrada
    Object.keys(reemplazos).forEach(abreviatura => {
        // Buscar la abreviatura al inicio de la cadena o seguida de un espacio
        const regex = new RegExp(`^${abreviatura}\\s+`, 'i');
        if (regex.test(resultado)) {
            resultado = resultado.replace(regex, reemplazos[abreviatura] + ' ');
        }
        
        // También buscar la abreviatura como palabra completa
        const regexPalabra = new RegExp(`\\b${abreviatura}\\b`, 'gi');
        resultado = resultado.replace(regexPalabra, reemplazos[abreviatura]);
    });
    
    return resultado || 'No disponible';
};

export default function ProfilePage() {
    const [student, setStudent] = useState<StudentData | null>(null);
    const [employee, setEmployee] = useState<EmployeeData | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [loadingEmployee, setLoadingEmployee] = useState(false);
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    // Verificar si es trabajador
    const isTrabajador = typeof window !== 'undefined' ? localStorage.getItem('trabajador') === 'true' : false;

    useEffect(() => {
        setIsMounted(true);
        
        // Obtener datos del usuario desde el token
        const userDataFromToken = getUserDataFromToken();
        setUserData(userDataFromToken);

        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/login');
            return;
        }

        // Verificar si tenemos employeeID
        if (!userDataFromToken?.employeeID) {
            setError("No se encontró el número de carnet (employeeID) en el token");
            return;
        }

        const fetchData = async () => {
            let progressInterval: NodeJS.Timeout | null = null;
            
            try {
                const employeeID = userDataFromToken.employeeID;
                console.log("Iniciando carga de datos para employeeID:", employeeID);

                progressInterval = setInterval(() => {
                    setLoadingProgress(prev => Math.min(prev + 10, 90));
                }, 500);

                // Cargar datos del estudiante
                const studentRes = await fetch(`${API_URL}/students/${employeeID}`);
                if (!studentRes.ok) {
                    if (studentRes.status === 404) {
                        throw new Error("Estudiante no encontrado con el carnet proporcionado");
                    }
                    throw new Error(`Error ${studentRes.status}`);
                }

                const studentData = await studentRes.json();
                if (!studentData.success) throw new Error("Formato de datos inválido");

                // Si es trabajador, cargar datos del empleado
                if (isTrabajador) {
                    setLoadingEmployee(true);
                    try {
                        const employeeRes = await fetch(`${API_URL}/verify/dual-status`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (employeeRes.ok) {
                            const employeeData = await employeeRes.json();
                            if (employeeData.success && employeeData.data.employeeData) {
                                const empData = employeeData.data.employeeData;
                                
                                setEmployee({
                                    Id_Empleado: empData.Id_Empleado?.trim() || 'No disponible',
                                    Id_Cargo: empData.Id_Cargo?.trim() || 'No disponible',
                                    department: empData.department || 'No disponible',
                                    Nombre: empData.Nombre || '',
                                    Apellido_1: empData.Apellido_1 || '',
                                    Apellido_2: empData.Apellido_2 || '',
                                    cargoDescription: empData.cargoDescription || 'Cargo no disponible',
                                    Id_Tipo_Contrato: empData.Id_Tipo_Contrato,
                                    Regimen_Salarial: empData.Regimen_Salarial,
                                    Fecha_Contratacion: empData.Fecha_Contratacion,
                                    Id_Profesion: empData.Id_Profesion,
                                    Id_Nivel_Escolaridad: empData.Id_Nivel_Escolaridad,
                                    Ano_Alta: empData.Ano_Alta,
                                    profesionDescription: empData.profesionDescription, // ✅ Nuevo campo
                                    municipioDescription: empData.municipioDescription // ✅ Nuevo campo
                                });
                            }
                        }
                    } catch (err) {
                        console.error('Error cargando datos del empleado:', err);
                    } finally {
                        setLoadingEmployee(false);
                    }
                }

                if (progressInterval) {
                    clearInterval(progressInterval);
                }
                setLoadingProgress(100);
                setStudent(studentData.data);

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Error desconocido";
                setError(errorMessage);
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
            } finally {
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
                setTimeout(() => setLoadingProgress(0), 500);
            }
        };

        if (userDataFromToken?.employeeID) {
            fetchData();
        }
    }, [API_URL, router, isTrabajador]);

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return 'No disponible';
        const cleaned = phone.replace(/\D/g, '');
        return `+53 ${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    };

    if (!isMounted) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
                <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
                    <p className="text-yellow-700">
                        <strong>Información del usuario:</strong><br />
                        EmployeeID: {userData?.employeeID || 'No disponible'}<br />
                        Usuario: {userData?.username || 'No disponible'}<br />
                        Nombre: {userData?.displayName || 'No disponible'}<br />
                        Es trabajador: {isTrabajador ? 'Sí' : 'No'}
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-uniss-blue text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    Reintentar
                </button>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="ml-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                >
                    Volver al Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {!student ? (
                <div className="text-center">
                    <ProgressBar percentage={loadingProgress} darkMode={false} />
                    <div className="mt-4 text-lg text-gray-600">
                        Cargando información del estudiante...
                    </div>
                    {userData?.employeeID && (
                        <div className="mt-2 text-sm text-gray-500">
                            Consultando datos para: {userData.employeeID}
                        </div>
                    )}
                    {isTrabajador && (
                        <div className="mt-2 text-sm text-green-600 font-medium">
                            ✓ Usuario identificado como trabajador
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Encabezado con foto */}
                    <div className="bg-uniss-blue p-8 flex items-center gap-6">
                        <div className="bg-white/10 p-4 rounded-full">
                            <UserCircleIcon className="h-20 w-20 text-white/80" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">
                                {student.personalData.fullName}
                            </h1>
                            <div className="flex items-center mt-2 gap-2">
                                <AcademicCapIcon className="h-6 w-6 text-white/80" />
                                <p className="text-xl text-white/90">
                                    {student.academicData.career}
                                </p>
                            </div>
                            <div className="mt-2 text-white/80">
                                <strong>Carnet:</strong> {userData?.employeeID}
                            </div>
                            {isTrabajador && (
                                <div className="mt-2 flex items-center gap-2">
                                    <BriefcaseIcon className="h-5 w-5 text-green-300" />
                                    <span className="text-green-300 font-medium">
                                        Estudiante/Trabajador
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cuerpo de datos */}
                    <div className="p-8 grid gap-8 md:grid-cols-2">
                        {/* Sección Datos Personales */}
                        <div className="space-y-5">
                            <h2 className="text-2xl font-semibold flex items-center gap-2 text-blue-600">
                                <UserCircleIcon className="h-8 w-8" />
                                Datos Personales
                            </h2>

                            <InfoItem
                                icon={<IdentificationIcon className="h-6 w-6" />}
                                label="Carné de Identidad"
                                value={student.personalData.identification}
                            />

                            <InfoItem
                                icon={<CalendarIcon className="h-6 w-6" />}
                                label="Fecha de Nacimiento"
                                value={student.personalData.birthDate}
                            />

                            <InfoItem
                                icon={<MapPinIcon className="h-6 w-6" />}
                                label="Dirección"
                                value={student.personalData.address}
                            />

                            <InfoItem
                                icon={<PhoneIcon className="h-6 w-6" />}
                                label="Contacto"
                                value={formatPhoneNumber(student.personalData.contact)}
                            />

                            <InfoItem
                                icon={<MapPinIcon className="h-6 w-6" />}
                                label="Lugar de Origen"
                                value={student.personalData.origin}
                            />
                        </div>

                        {/* Sección Académica */}
                        <div className="space-y-5">
                            <h2 className="text-2xl font-semibold flex items-center gap-2 text-blue-600">
                                <AcademicCapIcon className="h-8 w-8" />
                                Información Académica
                            </h2>

                            <InfoItem
                                icon={<BookOpenIcon className="h-6 w-6" />}
                                label="Facultad"
                                value={student.academicData.faculty}
                            />

                            <InfoItem
                                icon={<BookOpenIcon className="h-6 w-6" />}
                                label="Carrera"
                                value={student.academicData.career}
                            />

                            <InfoItem
                                icon={<CalendarDaysIcon className="h-6 w-6" />}
                                label="Año Académico"
                                value={student.academicData.year}
                            />

                            <InfoItem
                                icon={<ScaleIcon className="h-6 w-6" />}
                                label="Estado"
                                value={student.academicData.status}
                            />

                            <InfoItem
                                icon={<ScaleIcon className="h-6 w-6" />}
                                label="Índice Académico"
                                value={student.academicData.academicIndex}
                            />
                        </div>

                        {/* Sección de Datos del Trabajador - Solo si es trabajador */}
                        {isTrabajador && (
                            <div className="md:col-span-2 space-y-5">
                                <h2 className="text-2xl font-semibold flex items-center gap-2 text-green-600">
                                    <BriefcaseIcon className="h-8 w-8" />
                                    Datos del Trabajador
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {loadingEmployee ? (
                                        <div className="md:col-span-3 flex justify-center items-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                                            <span className="ml-3 text-gray-600">Cargando datos del trabajador...</span>
                                        </div>
                                    ) : employee ? (
                                        <>
                                            <InfoItem
                                                icon={<TicketIcon className="h-6 w-6" />}
                                                label="Código de Ticket"
                                                value={employee.Id_Empleado}
                                            />
                                            <InfoItem
                                                icon={<BriefcaseIcon className="h-6 w-6" />}
                                                label="Cargo"
                                                value={employee.cargoDescription || 'Cargo no disponible'}
                                            />
                                            <InfoItem
                                                icon={<BuildingOfficeIcon className="h-6 w-6" />}
                                                label="Departamento"
                                                value={employee.department}
                                            />
                                            <InfoItem
                                                icon={<DocumentTextIcon className="h-6 w-6" />}
                                                label="Tipo de Contrato"
                                                value={formatTipoContrato(employee.Id_Tipo_Contrato)}
                                            />
                                            <InfoItem
                                                icon={<ScaleIcon className="h-6 w-6" />}
                                                label="Régimen Salarial"
                                                value={formatRegimenSalarial(employee.Regimen_Salarial)}
                                            />
                                            {/* ✅ CAMBIO: Año de Contratación en lugar de Fecha de Contratación */}
                                            <InfoItem
                                                icon={<CalendarDaysIcon className="h-6 w-6" />}
                                                label="Año de Contratación"
                                                value={getAnoContratacion(employee.Fecha_Contratacion, employee.Ano_Alta)}
                                            />
                                            {/* ✅ NUEVO CAMPO: Graduado de */}
                                            <InfoItem
                                                icon={<GraduationCapIcon className="h-6 w-6" />}
                                                label="Graduado de"
                                                value={formatProfesionDescription(employee.profesionDescription)}
                                            />
                                            {/* ✅ NUEVO CAMPO: Municipio */}
                                            <InfoItem
                                                icon={<MapIcon className="h-6 w-6" />}
                                                label="Municipio"
                                                value={employee.municipioDescription || 'No disponible'}
                                            />
                                        </>
                                    ) : (
                                        <div className="md:col-span-3 text-center py-4 text-gray-500">
                                            No se pudieron cargar los datos del trabajador
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sección Familiar */}
                        <div className="md:col-span-2 space-y-5">
                            <h2 className="text-2xl font-semibold flex items-center gap-2 text-blue-600">
                                <UserGroupIcon className="h-8 w-8" />
                                Datos Familiares
                            </h2>
                            <div className="grid md:grid-cols-2 gap-5">
                                <InfoItem
                                    icon={<UserCircleIcon className="h-6 w-6" />}
                                    label="Madre"
                                    value={student.familyData.mother}
                                />
                                <InfoItem
                                    icon={<UserCircleIcon className="h-6 w-6" />}
                                    label="Padre"
                                    value={student.familyData.father}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const InfoItem = ({ icon, label, value }: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-blue-600">{icon}</div>
        <div className="flex-1">
            <dt className="text-lg font-medium text-gray-600 mb-1">{label}</dt>
            <dd className="text-xl text-gray-900 font-semibold">
                {value || 'No disponible'}
            </dd>
        </div>
    </div>
);