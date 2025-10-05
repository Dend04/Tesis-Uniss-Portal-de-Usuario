// components/modals/TwoFactorInfoModal.tsx
import { 
  XMarkIcon, 
  DevicePhoneMobileIcon, 
  PlayIcon, 
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline';

interface TwoFactorInfoModalProps {
  isDarkMode: boolean;
  onClose: () => void;
}

export default function TwoFactorInfoModal({ isDarkMode, onClose }: TwoFactorInfoModalProps) {
  // Definir las aplicaciones con sus enlaces a las tiendas e iconos
  const authApps = [
    { 
      name: "Google Authenticator", 
      platforms: ["iOS", "Android"],
      iosUrl: "https://apps.apple.com/app/google-authenticator/id388497605",
      androidUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
      // Iconos representativos - puedes reemplazar con los reales
      icon: (
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          GA
        </div>
      )
    },
    { 
      name: "Microsoft Authenticator", 
      platforms: ["iOS", "Android"],
      iosUrl: "https://apps.apple.com/app/microsoft-authenticator/id983156458",
      androidUrl: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
      icon: (
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          MS
        </div>
      )
    },
    { 
      name: "Authy", 
      platforms: ["iOS", "Android", "Desktop"],
      iosUrl: "https://apps.apple.com/app/authy/id494168017",
      androidUrl: "https://play.google.com/store/apps/details?id=com.authy.authy",
      desktopUrl: "https://authy.com/download/",
      icon: (
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
      )
    },
    { 
      name: "LastPass Authenticator", 
      platforms: ["iOS", "Android"],
      iosUrl: "https://apps.apple.com/app/lastpass-authenticator/id1079110004",
      androidUrl: "https://play.google.com/store/apps/details?id=com.lastpass.authenticator",
      icon: (
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          LP
        </div>
      )
    },
    { 
      name: "Duo Mobile", 
      platforms: ["iOS", "Android"],
      iosUrl: "https://apps.apple.com/app/duo-mobile/id422663827",
      androidUrl: "https://play.google.com/store/apps/details?id=com.duosecurity.duomobile",
      icon: (
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          D
        </div>
      )
    },
    { 
      name: "FreeOTP", 
      platforms: ["iOS", "Android"],
      iosUrl: "https://apps.apple.com/app/freeotp-authenticator/id872559395",
      androidUrl: "https://play.google.com/store/apps/details?id=org.fedorahosted.freeotp",
      icon: (
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          F
        </div>
      )
    },
    { 
      name: "andOTP", 
      platforms: ["Android"],
      androidUrl: "https://play.google.com/store/apps/details?id=org.shadowice.flocke.andotp",
      icon: (
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
      )
    },
  ];

  // Función para renderizar los botones de descarga con iconos
  const renderDownloadButtons = (app: typeof authApps[0]) => {
    const buttons = [];
    
    if (app.iosUrl) {
      buttons.push(
        <a
          key="ios"
          href={app.iosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <DevicePhoneMobileIcon className="w-4 h-4" />
          <span>App Store</span>
        </a>
      );
    }
    
    if (app.androidUrl) {
      buttons.push(
        <a
          key="android"
          href={app.androidUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <PlayIcon className="w-4 h-4" />
          <span>Google Play</span>
        </a>
      );
    }
    
    if (app.desktopUrl) {
      buttons.push(
        <a
          key="desktop"
          href={app.desktopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <ComputerDesktopIcon className="w-4 h-4" />
          <span>Descargar</span>
        </a>
      );
    }
    
    return buttons;
  };

  return (
    <div className="relative">
      {/* Contenido desplazable */}
      <div className="max-h-96 overflow-y-auto pr-2 -mr-2">
        <div className="space-y-4">
          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            La autenticación en dos pasos añade una capa adicional de seguridad a tu cuenta. 
            Además de tu contraseña, necesitarás un código de verificación que cambia cada 30 segundos.
          </p>
          
          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            <strong>Importante:</strong> Esta función es completamente opcional pero altamente recomendada 
            para proteger tu cuenta contra accesos no autorizados.
          </p>
          
          <div>
            <h4 className={`font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              Aplicaciones compatibles:
            </h4>
            
            <div className="space-y-4">
              {authApps.map((app, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg ${
                    isDarkMode ? "bg-gray-800" : "bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {/* Icono de la aplicación */}
                        {app.icon}
                        <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                          {app.name}
                        </span>
                      </div>
                      {/* Etiqueta de plataformas eliminada - ahora solo botones de descarga */}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renderDownloadButtons(app)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información sobre recuperación de cuenta */}
          <div className={`p-4 rounded-lg ${
            isDarkMode ? "bg-green-900/20 border border-green-800" : "bg-green-50 border border-green-200"
          }`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-green-200" : "text-green-700"}`}>
              🔐 Recuperación de cuenta
            </p>
            <p className={`text-sm ${isDarkMode ? "text-green-300" : "text-green-600"}`}>
              Al activar la autenticación en dos pasos, recibirás <strong>códigos de respaldo</strong> que 
              podrás usar para acceder a tu cuenta una opcion mas en caso de que olvides tu contraseña.
            </p>
          </div>

          <div className={`text-sm p-4 rounded-lg ${
            isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
          }`}>
            <p className="font-medium mb-1">💡 Consejo:</p>
            <p>
              Escanea el código QR con cualquiera de estas aplicaciones para configurar 
              la autenticación en dos pasos. Las aplicaciones están disponibles de forma gratuita.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de scroll personalizada */}
      <style jsx>{`
        .max-h-96::-webkit-scrollbar {
          width: 6px;
        }
        .max-h-96::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#374151' : '#f3f4f6'};
          border-radius: 3px;
        }
        .max-h-96::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#6b7280' : '#d1d5db'};
          border-radius: 3px;
        }
        .max-h-96::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#9ca3af' : '#9ca3af'};
        }
      `}</style>
    </div>
  );
}