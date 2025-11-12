"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { EnvelopeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";

interface VerificationCodeFormProps {
  userData: UserData;
  onBack: () => void;
  onCodeVerified: (code: string) => void;
}

// ✅ FUNCIÓN PARA ENMASCARAR EMAIL
const maskEmail = (email: any): string => {
  try {
    console.log("🔍 maskEmail recibió:", email, "tipo:", typeof email);
    
    let emailValue = email;
    if (Array.isArray(email)) {
      console.log("🔄 Email es array, tomando primer elemento:", email[0]);
      emailValue = email[0] || "";
    }
    
    if (!emailValue || typeof emailValue !== 'string') {
      console.warn("❌ Email no válido para enmascarar:", emailValue);
      return "***@***";
    }
    
    const [username, domain] = emailValue.split('@');
    if (!username || !domain) {
      console.warn("❌ Formato de email inválido:", emailValue);
      return "***@***";
    }

    if (username.length <= 2) {
      return `*${username}@${domain}`;
    } else if (username.length <= 4) {
      const firstChar = username.substring(0, 1);
      const lastChar = username.substring(username.length - 1);
      return `*${firstChar}*${lastChar}@${domain}`;
    } else {
      const firstChar = username.substring(0, 1);
      const lastChar = username.substring(username.length - 1);
      return `*${firstChar}***${lastChar}@${domain}`;
    }
  } catch (error) {
    console.error("❌ Error en maskEmail:", error);
    return "***@***";
  }
};

// ✅ FUNCIÓN PARA OBTENER INICIALES
const getInitials = (displayName: any): string => {
  try {
    console.log("🔍 getInitials recibió:", displayName, "tipo:", typeof displayName);
    
    let displayNameValue = displayName;
    if (Array.isArray(displayName)) {
      console.log("🔄 displayName es array, tomando primer elemento:", displayName[0]);
      displayNameValue = displayName[0] || "";
    }
    
    if (!displayNameValue || typeof displayNameValue !== 'string') {
      console.warn("❌ displayName no válido:", displayNameValue);
      return "US";
    }
    
    const names = displayNameValue.split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    return (names[0].substring(0, 1) + names[names.length - 1].substring(0, 1)).toUpperCase();
  } catch (error) {
    console.error("❌ Error en getInitials:", error);
    return "US";
  }
};

export default function VerificationCodeForm({
  userData,
  onBack,
  onCodeVerified,
}: VerificationCodeFormProps) {
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUsingGmail, setIsUsingGmail] = useState(false); // ✅ NUEVO ESTADO
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ✅ EXTRACCIÓN SEGURA DE DATOS CON MANEJO DE ARRAYS
  const getStringValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  const userEmail = getStringValue(userData?.company);
  const userName = getStringValue(userData?.displayName) || getStringValue(userData?.sAMAccountName) || "Usuario";
  const maskedEmail = maskEmail(userEmail);
  const userInitials = getInitials(userName);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.join("");
    
    if (code.length !== 6) {
      setError("Por favor, ingrese el código completo de 6 dígitos");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          code: code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Código de verificación incorrecto");
      }

      const result = await response.json();

      if (result.success) {
        onCodeVerified(code);
      } else {
        throw new Error(result.message || "Error en la verificación");
      }
    } catch (err: any) {
      setError(err.message || "Error al verificar el código");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ FUNCIÓN MODIFICADA: Ahora usa Gmail automáticamente
  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    
    try {
      console.log(`🔄 Reenviando código usando ${isUsingGmail ? 'Gmail' : 'servicio principal'}...`);
      
      // ✅ DECIDIR QUÉ ENDPOINT USAR
      const endpoint = isUsingGmail 
        ? `${process.env.NEXT_PUBLIC_API_URL}/email/gmail/forgot-password`
        : `${process.env.NEXT_PUBLIC_API_URL}/email/forgot-password`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userIdentifier: getStringValue(userData?.sAMAccountName) || getStringValue(userData?.employeeID)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // ✅ SI FALLA EL SERVICIO PRINCIPAL, INTENTAR CON GMAIL
        if (!isUsingGmail && (response.status === 500 || response.status === 503)) {
          console.log('⚠️ Servicio principal falló, intentando con Gmail...');
          setIsUsingGmail(true);
          await handleResendCode(); // Llamada recursiva
          return;
        }
        
        throw new Error(errorData.message || `Error al reenviar el código ${isUsingGmail ? 'con Gmail' : ''}`);
      }

      const result = await response.json();
      
      // ✅ MENSAJE PERSONALIZADO SEGÚN EL SERVICIO USADO
      let mensajeExito = "Código reenviado correctamente";
      if (isUsingGmail) {
        mensajeExito = "✅ Código reenviado usando servicio de respaldo (Gmail)";
        console.log('📊 Estadísticas Gmail:', result.gmailStats);
      } else if (result.servicio === 'gmail') {
        mensajeExito = "✅ Código reenviado usando servicio de respaldo (Gmail)";
        setIsUsingGmail(true);
      }

      setSuccessMessage(mensajeExito);
      setVerificationCode(Array(6).fill(""));
      
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }

      // ✅ SI SE USÓ GMAIL EXITOSAMENTE, MANTENER ESA CONFIGURACIÓN
      if (result.servicio === 'gmail') {
        setIsUsingGmail(true);
      }

    } catch (err: any) {
      console.error(`❌ Error reenviando código:`, err);
      
      // ✅ SI ES EL PRIMER INTENTO Y FALLA, PROBAR CON GMAIL
      if (!isUsingGmail) {
        console.log('🔄 Primer intento falló, probando con Gmail...');
        setIsUsingGmail(true);
        await handleResendCode(); // Intentar nuevamente con Gmail
      } else {
        setError(err.message || `Error al reenviar el código ${isUsingGmail ? 'con el servicio de respaldo' : ''}. Por favor, intente más tarde.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100">
          <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          Verificación de Código
        </h2>
        
        {/* Información del usuario - Mejorada y segura */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {userInitials}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {userName}
              </p>
              <p className="text-gray-600 text-xs">
                {userData?.sAMAccountName && `@${getStringValue(userData.sAMAccountName)}`}
                {userData?.employeeID && ` | CI: ${getStringValue(userData.employeeID)}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-2 rounded border">
            <EnvelopeIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Código enviado a:</p>
              <p className="text-sm font-mono text-gray-800">
                {maskedEmail}
              </p>
            </div>
          </div>

          {/* ✅ INDICADOR DE SERVICIO ACTIVO */}
          {isUsingGmail && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-700 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <strong>Usando servicio de respaldo (Gmail)</strong>
              </p>
            </div>
          )}
        </div>
        
        <p className="text-sm sm:text-base text-gray-600">
          Hemos enviado un código de verificación de 6 dígitos a su correo electrónico
        </p>
        <p className="text-xs text-gray-500 mt-1">
          El código expirará en 15 minutos
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4">
          <p className="text-green-700 text-xs sm:text-sm">{successMessage}</p>
          {isUsingGmail && (
            <p className="text-green-600 text-xs mt-1">
              💡 Si no recibe el código, verifique la carpeta de spam
            </p>
          )}
        </div>
      )}

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
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={handleVerify}
            disabled={isSubmitting || verificationCode.some((digit) => digit === "")}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-2" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSubmitting}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {isUsingGmail ? "Reenviar con servicio de respaldo" : "¿No recibió el código? Reenviar"}
          </button>
          
          {/* ✅ INFORMACIÓN SOBRE EL SERVICIO DE RESPALDO */}
          {!isUsingGmail && (
            <p className="text-xs text-gray-500 mt-2">
              Si no recibe el código, se usará automáticamente nuestro servicio de respaldo
            </p>
          )}
        </div>

        {/* Información de seguridad */}
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
          <p className="text-xs text-yellow-800 text-center">
            <strong>Seguridad:</strong> Por su protección, mostramos solo parte de su información. 
            Verifique que el correo mostrado sea el correcto.
            {isUsingGmail && (
              <span className="block mt-1">
                🔒 <strong>Servicio de respaldo activo:</strong> Usando Gmail para mayor confiabilidad
              </span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}