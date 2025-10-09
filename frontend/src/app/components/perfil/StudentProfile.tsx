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
}

const StudentProfile = ({ student, employeeID, isTrabajador, formatPhoneNumber }: StudentProfileProps) => {
    return (
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
    );
};

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

export default StudentProfile;