'use client';

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

interface StudentProfileProps {
    student: StudentData;
    employeeID: string;
    isTrabajador: boolean;
    formatPhoneNumber: (phone: string) => string;
    loadingStudent?: boolean;
    isDarkMode: boolean;
}

const StudentProfile = ({ 
    student, 
    employeeID, 
    isTrabajador, 
    formatPhoneNumber,
    isDarkMode 
}: StudentProfileProps) => {
    return (
        <div className={`rounded-2xl shadow-xl overflow-hidden ${
            isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
            {/* Encabezado con foto */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 flex items-center gap-6">
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
                        <strong>Carnet:</strong> {employeeID}
                    </div>
                    {isTrabajador && (
                        <div className="mt-2 flex items-center gap-2">
                            <UserCircleIcon className="h-5 w-5 text-green-300" />
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
                    <h2 className={`text-2xl font-semibold flex items-center gap-2 ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}>
                        <UserCircleIcon className="h-8 w-8" />
                        Datos Personales
                    </h2>

                    <InfoItem
                        icon={<IdentificationIcon className="h-6 w-6" />}
                        label="Carné de Identidad"
                        value={student.personalData.identification}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<CalendarIcon className="h-6 w-6" />}
                        label="Fecha de Nacimiento"
                        value={student.personalData.birthDate}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<MapPinIcon className="h-6 w-6" />}
                        label="Dirección"
                        value={student.personalData.address}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<PhoneIcon className="h-6 w-6" />}
                        label="Contacto"
                        value={formatPhoneNumber(student.personalData.contact)}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<MapPinIcon className="h-6 w-6" />}
                        label="Lugar de Origen"
                        value={student.personalData.origin}
                        isDarkMode={isDarkMode}
                    />
                </div>

                {/* Sección Académica */}
                <div className="space-y-5">
                    <h2 className={`text-2xl font-semibold flex items-center gap-2 ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}>
                        <AcademicCapIcon className="h-8 w-8" />
                        Información Académica
                    </h2>

                    <InfoItem
                        icon={<BookOpenIcon className="h-6 w-6" />}
                        label="Facultad"
                        value={student.academicData.faculty}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<BookOpenIcon className="h-6 w-6" />}
                        label="Carrera"
                        value={student.academicData.career}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<CalendarDaysIcon className="h-6 w-6" />}
                        label="Año Académico"
                        value={student.academicData.year}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<ScaleIcon className="h-6 w-6" />}
                        label="Estado"
                        value={student.academicData.status}
                        isDarkMode={isDarkMode}
                    />

                    <InfoItem
                        icon={<ScaleIcon className="h-6 w-6" />}
                        label="Índice Académico"
                        value={student.academicData.academicIndex}
                        isDarkMode={isDarkMode}
                    />
                </div>

                {/* Sección Familiar */}
                <div className="md:col-span-2 space-y-5">
                    <h2 className={`text-2xl font-semibold flex items-center gap-2 ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}>
                        <UserGroupIcon className="h-8 w-8" />
                        Datos Familiares
                    </h2>
                    <div className="grid md:grid-cols-2 gap-5">
                        <InfoItem
                            icon={<UserCircleIcon className="h-6 w-6" />}
                            label="Madre"
                            value={student.familyData.mother}
                            isDarkMode={isDarkMode}
                        />
                        <InfoItem
                            icon={<UserCircleIcon className="h-6 w-6" />}
                            label="Padre"
                            value={student.familyData.father}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    isDarkMode: boolean;
}

const InfoItem = ({ icon, label, value, isDarkMode }: InfoItemProps) => (
    <div className={`flex items-start gap-4 p-4 rounded-lg ${
        isDarkMode ? "bg-gray-700" : "bg-gray-50"
    }`}>
        <div className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
            {icon}
        </div>
        <div className="flex-1">
            <dt className={`text-lg font-medium mb-1 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>
                {label}
            </dt>
            <dd className={`text-xl font-semibold ${
                isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}>
                {value || 'No disponible'}
            </dd>
        </div>
    </div>
);

export default StudentProfile;