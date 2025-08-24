// components/modals/TwoFactorInfoModal.tsx
interface TwoFactorInfoModalProps {
    isDarkMode: boolean;
  }
  
  export default function TwoFactorInfoModal({ isDarkMode }: TwoFactorInfoModalProps) {
    const authApps = [
      { name: "Google Authenticator", platforms: ["iOS", "Android"] },
      { name: "Microsoft Authenticator", platforms: ["iOS", "Android"] },
      { name: "Authy", platforms: ["iOS", "Android", "Desktop"] },
      { name: "LastPass Authenticator", platforms: ["iOS", "Android"] },
      { name: "Duo Mobile", platforms: ["iOS", "Android"] },
      { name: "FreeOTP", platforms: ["iOS", "Android"] },
      { name: "andOTP", platforms: ["Android"] },
    ];
  
    return (
      <>
        <p className="mb-4">
          La autenticación en dos pasos añade una capa adicional de seguridad a tu cuenta. 
          Además de tu contraseña, necesitarás un código de verificación que cambia cada 30 segundos.
        </p>
        
        <p className="mb-4">
          Para usar esta función, necesitarás una aplicación de autenticación en tu dispositivo móvil.
        </p>
        
        <h4 className={`font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
          Aplicaciones compatibles:
        </h4>
        
        <ul className={`space-y-2 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          {authApps.map((app, index) => (
            <li key={index} className="flex justify-between">
              <span>{app.name}</span>
              <span className={isDarkMode ? "text-gray-500" : "text-gray-500"}>
                {app.platforms.join(", ")}
              </span>
            </li>
          ))}
        </ul>
        
        <p>
          Escanea el código QR con cualquiera de estas aplicaciones para configurar la autenticación en dos pasos.
        </p>
      </>
    );
  }