// app/dashboard/page.tsx
'use client';

import { 
  IdentificationIcon,
  UserCircleIcon,
  AcademicCapIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BoltIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';

export default function Dashboard() {
  // Datos de ejemplo - reemplazar con datos reales
  const studentData = {
    photo: '/uniss-logo.png',
    name: 'María Pérez González',
    ci: '85030456789',
    faculty: 'Ciencias Técnicas',
    career: 'Ingeniería Informática',
    year: '3er Año',
    email: 'maria.perez@est.uniss.edu.cu',
    phone: '+53 55555555',
    passwordExpiresIn: 15, // días restantes
    devices: [
      { type: 'phone', mac: '00:1A:2B:3C:4D:5E', model: 'Xiaomi Redmi Note 10' },
      { type: 'laptop', mac: '00:1A:2B:3C:4D:5F', model: 'Dell XPS 13' }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-col lg:flex-row gap-8 p-8">
        {/* Sección izquierda - Datos del estudiante */}
        <div className="lg:w-2/5 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {studentData.photo ? (
                <img 
                  src={studentData.photo} 
                  alt="Foto del estudiante" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-uniss-blue"
                />
              ) : (
                <UserCircleIcon className="w-24 h-24 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-title text-uniss-blue">{studentData.name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <IdentificationIcon className="w-5 h-5" />
                {studentData.ci}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem 
              icon={<AcademicCapIcon className="w-5 h-5" />}
              label="Facultad"
              value={studentData.faculty}
            />
            <InfoItem 
              icon={<AcademicCapIcon className="w-5 h-5" />}
              label="Carrera"
              value={studentData.career}
            />
            <InfoItem 
              label="Año en curso"
              value={studentData.year}
            />
            <InfoItem 
              label="Teléfono"
              value={studentData.phone}
            />
            <InfoItem 
              label="Correo electrónico"
              value={studentData.email}
            />
          </div>
        </div>

        {/* Sección derecha - Seguridad y dispositivos */}
        <div className="lg:w-3/5 space-y-8">
          {/* Tarjeta de seguridad */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-title text-uniss-blue mb-4 flex items-center gap-2">
              <ClockIcon className="w-6 h-6" />
              Seguridad de la cuenta
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Tiempo restante para cambio de contraseña:</span>
                  <span className="text-sm font-semibold text-uniss-blue">{studentData.passwordExpiresIn} días</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-full bg-uniss-blue rounded-full transition-all" 
                    style={{ width: `${(studentData.passwordExpiresIn/90)*100}%` }}
                  ></div>
                </div>
              </div>
              <button className="bg-uniss-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5" />
                Cambiar
              </button>
            </div>
          </div>

          {/* Tarjeta de dispositivos */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-title text-uniss-blue flex items-center gap-2">
                Dispositivos vinculados
                <span className="text-sm text-gray-500">({studentData.devices.length}/4)</span>
              </h2>
              <button className="bg-uniss-gold text-white px-4 py-2 rounded-lg hover:bg-opacity-90 flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Agregar
              </button>
            </div>

            <div className="space-y-4">
              {studentData.devices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {device.type === 'phone' && <DevicePhoneMobileIcon className="w-8 h-8 text-uniss-blue" />}
                    {device.type === 'laptop' && <ComputerDesktopIcon className="w-8 h-8 text-uniss-blue" />}
                    {device.type === 'tablet' && <BoltIcon className="w-8 h-8 text-uniss-blue" />}
                    <div>
                      <p className="font-semibold">{device.model}</p>
                      <p className="text-sm text-gray-500">{device.mac}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-uniss-blue hover:text-opacity-80">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button className="text-red-500 hover:text-opacity-80">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                    <button className="text-gray-600 hover:text-opacity-80">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para ítems de información
const InfoItem = ({ icon, label, value }: { icon?: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-start gap-3">
    {icon && <div className="text-uniss-blue mt-1">{icon}</div>}
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  </div>
);