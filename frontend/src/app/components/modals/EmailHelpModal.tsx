// components/modals/EmailHelpModal.tsx
interface EmailHelpModalProps {
    email: string;
    isDarkMode: boolean;
    onClose: () => void;
  }
  
  export default function EmailHelpModal({ email, isDarkMode, onClose }: EmailHelpModalProps) {
    return (
      <>
        <p className="mb-4">
          Por favor, verifica que el correo suministrado sea correcto:
        </p>
        <p className="font-semibold mb-4">{email}</p>
        <p className="mb-4">
          Si no es correcto, haz clic en el enlace "No es mi correo" para volver a ingresarlo.
        </p>
        <p className="mb-4">
          Si el correo es correcto, espera un momento ya que a veces los correos pueden tardar en llegar. 
          También revisa la carpeta de spam o correo no deseado de tu buzón, ya que a veces es filtrado allí.
        </p>
        <p className="mb-6">
          Si continúas sin recibir el código, por favor dirígete a las oficinas de soporte para recibir asistencia.
        </p>
        
        <button
          onClick={onClose}
          className={`w-full py-2 px-4 rounded-lg ${
            isDarkMode 
              ? "bg-uniss-blue text-white hover:bg-blue-700" 
              : "bg-uniss-blue text-white hover:bg-blue-700"
          }`}
        >
          Entendido
        </button>
      </>
    );
  }