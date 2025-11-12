import { useState, useRef, useEffect } from "react";
import { EnvelopeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

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
  const [isUsingGmail, setIsUsingGmail] = useState(false); // ✅ NUEVO ESTADO PARA GMAIL
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Efecto para enfocar el primer input cuando se cambia al paso de verificación
  useEffect(() => {
    if (verificationStep === "code" && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [verificationStep]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && verificationCode[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ✅ FUNCIÓN MODIFICADA: INTENTA CON GMAIL SI FALLA EL SERVICIO PRINCIPAL
  const handleFormSubmit = async (data: { email: string }) => {
    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      console.log("📧 Enviando código de verificación a:", data.email);
      
      // PRIMER INTENTO: Servicio principal
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
        
        // ✅ SI FALLA EL SERVICIO PRINCIPAL, INTENTAR CON GMAIL
        console.log('⚠️ Servicio principal falló, intentando con Gmail...');
        await handleSendWithGmail(data.email);
        return;
      }

      // ✅ ÉXITO CON SERVICIO PRINCIPAL
      setEmail(data.email);
      setVerificationStep("code");
      setIsUsingGmail(false);
      
    } catch (error: any) {
      console.error("❌ Error con servicio principal:", error);
      
      // ✅ SI HAY ERROR DE CONEXIÓN, INTENTAR CON GMAIL
      try {
        await handleSendWithGmail(data.email);
      } catch (gmailError: any) {
        setErrorMessage(gmailError.message || "Error al enviar código de verificación");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: ENVIAR CÓDIGO CON GMAIL
  const handleSendWithGmail = async (emailAddress: string) => {
    console.log(`🔄 Intentando enviar con Gmail a: ${emailAddress}`);
    
    const gmailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/email/gmail/backup-email-verification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress,
        }),
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      throw new Error(errorData.message || "Error al enviar código de verificación");
    }

    // ✅ ÉXITO CON GMAIL
    setEmail(emailAddress);
    setVerificationStep("code");
    setIsUsingGmail(true);
    console.log('✅ Código enviado exitosamente con Gmail');
  };

  // ✅ FUNCIÓN PARA REENVIAR CÓDIGO CON GMAIL
  const handleResendWithGmail = async () => {
    if (!email) {
      setErrorMessage("No hay un correo configurado para reenviar");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await handleSendWithGmail(email);
      setErrorMessage(""); // Limpiar errores anteriores
    } catch (error: any) {
      setErrorMessage(error.message || "Error al reenviar código");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const codeString = verificationCode.join('');
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
            email: email.trim().toLowerCase(),
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

        {/* ✅ INDICADOR DE SERVICIO GMAIL ACTIVO */}
        {verificationStep === "code" && isUsingGmail && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-xs flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <strong>Usando servicio de respaldo</strong>
            </p>
            <p className="text-green-600 text-xs mt-1">
              💡 Si no recibe el código, verifique la carpeta de spam
            </p>
          </div>
        )}
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
              cuenta en caso de olvido de contraseña. Si tiene problemas para recibir el código,
              usaremos automáticamente nuestro servicio de respaldo.
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

          {/* ✅ BOTÓN PARA REENVIAR CON GMAIL */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendWithGmail}
              disabled={isSubmitting}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowPathIcon className="w-4 h-4" />
              {isUsingGmail ? "Reenviar con servicio de respaldo" : "¿No recibió el código? Reenviar"}
            </button>
            
            {!isUsingGmail && (
              <p className="text-xs text-gray-500 mt-2">
                Si no recibe el código, puede presionar arriba, recuerde revizar en la carpeta de spam
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={() => {
                setVerificationStep("email");
                setErrorMessage("");
                setVerificationCode(Array(6).fill(""));
                setIsUsingGmail(false);
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