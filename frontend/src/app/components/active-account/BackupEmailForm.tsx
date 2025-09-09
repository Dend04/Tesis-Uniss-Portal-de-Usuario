/* // src/app/components/active-account/BackupEmailForm.tsx
import { useState } from "react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

interface BackupEmailFormProps {
  register: any;
  handleSubmit: any;
  errors: any;
  onSubmit: (data: { email: string; verified: boolean }) => void;
  onBack: () => void;
}

export default function BackupEmailForm({
  register,
  handleSubmit,
  errors,
  onSubmit,
  onBack,
}: BackupEmailFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFormSubmit = async (data: { email: string }) => {
    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      console.log("Guardando correo de respaldo:", data.email);
      
      // Cambiado de false a true para que continúe con el flujo
      onSubmit({ email: data.email, verified: true });
      
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMessage(error.message || "Error al guardar el correo electrónico");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100">
          <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          Correo de Respaldo
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Por favor, ingrese su correo electrónico de respaldo. 
          Se utilizará para recuperar su cuenta en caso de olvido de contraseña.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            {...register("email")}
            placeholder="ejemplo@correo.com"
            className={`w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
              errors.email
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-400"
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-xs sm:text-sm">
            <strong>Nota:</strong> Este correo se utilizará para recuperar su
            cuenta en caso de olvido de contraseña.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Continuar"}
          </button>
        </div>
      </form>
    </div>
  );
} */





  import { useState, useRef, useEffect } from "react";
  import { EnvelopeIcon } from "@heroicons/react/24/outline";
  
  interface BackupEmailFormProps {
    register: any;
    handleSubmit: any;
    errors: any;
    onSubmit: (data: { email: string; verified: boolean }) => void;
    onBack: () => void;
  }
  
  export default function BackupEmailForm({
    register,
    handleSubmit,
    errors,
    onSubmit,
    onBack,
  }: BackupEmailFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationStep, setVerificationStep] = useState<"email" | "code">("email");
    const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(""));
    const [email, setEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  
    // Efecto para enfocar el primer input cuando se cambia al paso de verificación
    useEffect(() => {
      if (verificationStep === "code" && inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }
    }, [verificationStep]);
  
    const handleCodeChange = (index: number, value: string) => {
      // Solo permitir números
      if (!/^\d*$/.test(value)) return;
  
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
  
      // Mover al siguiente input si se ingresó un dígito
      if (value !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
  
      // Si se borra, moverse al input anterior
      if (value === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };
  
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && verificationCode[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };
  
    const handleFormSubmit = async (data: { email: string }) => {
      setIsSubmitting(true);
      setErrorMessage("");
      
      try {
        console.log("Guardando correo de respaldo:", data.email);
        
        // Enviar código de verificación al correo
        const verificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/email/verificacion`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: data.email,
            }),
          }
        );
  
        if (!verificationResponse.ok) {
          const errorData = await verificationResponse.json();
          throw new Error(errorData.message || "Error al enviar código de verificación");
        }
  
        setEmail(data.email);
        setVerificationStep("code");
        
      } catch (error: any) {
        console.error("Error:", error);
        setErrorMessage(error.message || "Error al enviar código de verificación");
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const handleVerifyCode = async () => {
      setIsSubmitting(true);
      setErrorMessage("");
      try {
        const codeString = verificationCode.join('');
        // Verifica que email y codeString tengan valores válidos
        if (!email || codeString.length !== 6) {
          throw new Error("Código o email inválido");
        }
    
        const verifyResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/email/verify-code`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim().toLowerCase(), // Normaliza el email
              code: codeString,
            }),
          }
        );
    
        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.message || "Código de verificación inválido");
        }
    
  
        // Si el código es correcto, continuar con el flujo
        onSubmit({ email: email, verified: true });
        
      } catch (error: any) {
        console.error("Error:", error);
        setErrorMessage(error.message || "Error en el proceso de verificación");
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
      <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
        <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
          <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100">
            <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
            {verificationStep === "email" ? "Correo de Respaldo" : "Verificación de Código"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {verificationStep === "email" 
              ? "Por favor, ingrese su correo electrónico de respaldo. Se utilizará para recuperar su cuenta en caso de olvido de contraseña."
              : "Se ha enviado un código de verificación a su correo. Por favor ingréselo a continuación."}
          </p>
        </div>
  
        {errorMessage && (
          <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
            <p className="text-red-700 text-xs sm:text-sm">{errorMessage}</p>
          </div>
        )}
  
        {verificationStep === "email" ? (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="ejemplo@correo.com"
                className={`w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
  
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-xs sm:text-sm">
                <strong>Nota:</strong> Este correo se utilizará para recuperar su
                cuenta en caso de olvido de contraseña.
              </p>
            </div>
  
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
              >
                {isSubmitting ? "Enviando código..." : "Enviar Código"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Ingrese el código de 6 dígitos
              </label>
              <div className="flex justify-center space-x-2">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                ))}
              </div>
            </div>
  
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
              <button
                type="button"
                onClick={() => {
                  setVerificationStep("email");
                  setErrorMessage("");
                  setVerificationCode(Array(6).fill(""));
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                Volver
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={isSubmitting || verificationCode.some((digit) => digit === "")}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
              >
                {isSubmitting ? "Verificando..." : "Verificar Código"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }