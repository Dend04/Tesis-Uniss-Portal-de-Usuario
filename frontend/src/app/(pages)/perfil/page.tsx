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
    UserGroupIcon
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

export default function ProfilePage() {
    const [student, setStudent] = useState<StudentData | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

                // Usar employeeID en lugar del CI fijo
                const studentRes = await fetch(`${API_URL}/students/${employeeID}`);
                if (!studentRes.ok) {
                    if (studentRes.status === 404) {
                        throw new Error("Estudiante no encontrado con el carnet proporcionado");
                    }
                    throw new Error(`Error ${studentRes.status}`);
                }

                const studentData = await studentRes.json();
                if (!studentData.success) throw new Error("Formato de datos inválido");

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
    }, [API_URL, router]);

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
                        Nombre: {userData?.displayName || 'No disponible'}
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