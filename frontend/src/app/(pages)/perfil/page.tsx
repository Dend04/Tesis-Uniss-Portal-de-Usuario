'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/app/components/ProgressBar";
import StudentProfile from "@/app/components/perfil/StudentProfile";
import EmployeeProfile from "@/app/components/perfil/EmployeeProfile";


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
    profesionDescription?: string;
    municipioDescription?: string;
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
        if (date.year && date.month && date.day) {
            return `${date.day}/${date.month}/${date.year}`;
        }
        return 'No disponible';
    } catch {
        return 'No disponible';
    }
};

// Función para obtener año de contratación
const getAnoContratacion = (fechaContratacion: any, anoAlta?: number): string => {
    const fechaFormateada = formatDate(fechaContratacion);
    if (fechaFormateada !== 'No disponible') {
        const yearMatch = fechaFormateada.match(/\d{4}/);
        if (yearMatch) {
            return yearMatch[0];
        }
    }
    
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

// Función para formatear descripción de profesión
const formatProfesionDescription = (profesion?: string): string => {
    if (!profesion) return 'No disponible';
    
    const profesionLimpia = profesion.trim();
    
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
    
    Object.keys(reemplazos).forEach(abreviatura => {
        const regex = new RegExp(`^${abreviatura}\\s+`, 'i');
        if (regex.test(resultado)) {
            resultado = resultado.replace(regex, reemplazos[abreviatura] + ' ');
        }
        
        const regexPalabra = new RegExp(`\\b${abreviatura}\\b`, 'gi');
        resultado = resultado.replace(regexPalabra, reemplazos[abreviatura]);
    });
    
    return resultado || 'No disponible';
};

// Función para formatear número de teléfono
const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'No disponible';
    const cleaned = phone.replace(/\D/g, '');
    return `+53 ${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
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

    const isTrabajador = typeof window !== 'undefined' ? localStorage.getItem('trabajador') === 'true' : false;

    useEffect(() => {
        setIsMounted(true);
        
        const userDataFromToken = getUserDataFromToken();
        setUserData(userDataFromToken);

        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/login');
            return;
        }

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
                                    profesionDescription: empData.profesionDescription,
                                    municipioDescription: empData.municipioDescription
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
                <div>
                    <StudentProfile
                        student={student}
                        employeeID={userData?.employeeID || ''}
                        isTrabajador={isTrabajador}
                        formatPhoneNumber={formatPhoneNumber}
                    />
                    
                    {isTrabajador && (
                        <EmployeeProfile
                            employee={employee}
                            loadingEmployee={loadingEmployee}
                            formatTipoContrato={formatTipoContrato}
                            formatRegimenSalarial={formatRegimenSalarial}
                            getAnoContratacion={getAnoContratacion}
                            formatProfesionDescription={formatProfesionDescription}
                        />
                    )}
                </div>
            )}
        </div>
    );
}