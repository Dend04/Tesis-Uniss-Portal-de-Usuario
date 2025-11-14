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

// ✅ FUNCIÓN CORREGIDA PARA ENMASCARAR EMAIL
const maskEmail = (email: any): string => {
  try {
    let emailValue = email;
    if (Array.isArray(email)) {
      emailValue = email[0] || "";
    }
    
    if (!emailValue || typeof emailValue !== 'string') {
      return "***@***";
    }
    
    const [username, domain] = emailValue.split('@');
    if (!username || !domain) {
      return "***@***";
    }

    if (username.length === 1) {
      return `${username}***@${domain}`;
    } else if (username.length === 2) {
      return `${username[0]}*${username[1]}@${domain}`;
    } else {
      const firstChar = username[0];
      const lastChar = username[username.length - 1];
      const middleAsterisks = '*'.repeat(username.length - 2);
      return `${firstChar}${middleAsterisks}${lastChar}@${domain}`;
    }
  } catch (error) {
    return "***@***";
  }
};

// ✅ FUNCIÓN PARA OBTENER INICIALES
const getInitials = (displayName: any): string => {
  try {
    let displayNameValue = displayName;
    if (Array.isArray(displayName)) {
      displayNameValue = displayName[0] || "";
    }
    
    if (!displayNameValue || typeof displayNameValue !== 'string') {
      return "US";
    }
    
    const names = displayNameValue.split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    return (names[0].substring(0, 1) + names[names.length - 1].substring(0, 1)).toUpperCase();
  } catch (error) {
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
  const [isUsingGmail, setIsUsingGmail] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  
  // ✅ REFS PARA CONTROLAR ENVÍOS POR USUARIO ESPECÍFICO
  const hasSentInitialCode = useRef(false);
  const currentUserId = useRef<string>("");

  // ✅ EXTRACCIÓN SEGURA DE DATOS CON MANEJO DE ARRAYS
  const getStringValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  const userEmail = getStringValue(userData?.company);
  const userName = getStringValue(userData?.displayName) || getStringValue(userData?.sAMAccountName) || "Usuario";
  const userIdentifier = getStringValue(userData?.sAMAccountName) || getStringValue(userData?.employeeID);
  const maskedEmail = maskEmail(userEmail);
  const userInitials = getInitials(userName);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  // ✅ FUNCIÓN REUTILIZABLE PARA ENVIAR CÓDIGO
  const sendVerificationCode = async (useGmail: boolean = false): Promise<boolean> => {
    try {
      const endpoint = useGmail 
        ? `${process.env.NEXT_PUBLIC_API_URL}/email/gmail/forgot-password`
        : `${process.env.NEXT_PUBLIC_API_URL}/email/forgot-password`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userIdentifier: userIdentifier
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al enviar el código ${useGmail ? 'con Gmail' : ''}`);
      }

      const result = await response.json();
      
      if (useGmail || result.servicio === 'gmail') {
        setIsUsingGmail(true);
      }
      
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  // ✅ EFECTO CORREGIDO: ENVÍO AUTOMÁTICO COMPLETAMENTE SILENCIOSO
  useEffect(() => {
    if (currentUserId.current === userIdentifier && hasSentInitialCode.current) {
      return;
    }

    currentUserId.current = userIdentifier;
    hasSentInitialCode.current = true;

    const sendInitialCode = async () => {
      // ✅ ENVÍO AUTOMÁTICO SILENCIOSO - SIN ESTADOS DE CARGA NI MENSAJES
      try {
        await sendVerificationCode(false);
        console.log("✅ Código enviado automáticamente al usuario (silencioso)");
      } catch (err: any) {
        try {
          await sendVerificationCode(true);
          console.log("✅ Código enviado exitosamente con Gmail (automático silencioso)");
        } catch (gmailErr: any) {
          // ✅ SOLO MOSTRAR ERROR SI FALLAN AMBOS MÉTODOS
          setError("No pudimos enviar el código automáticamente. Por favor, use el botón 'Reenviar código' para intentarlo nuevamente.");
        }
      }
    };

    sendInitialCode();
  }, [userIdentifier]);

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

  // ✅ FUNCIÓN MEJORADA PARA REENVIAR CÓDIGO - SOLO AQUÍ SE MUESTRAN MENSAJES
  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    
    try {
      // ✅ PRIMERO INTENTAR CON SERVICIO PRINCIPAL
      try {
        const success = await sendVerificationCode(false);
        
        if (success) {
          setSuccessMessage("✅ Código reenviado correctamente");
        }
        
      } catch (primaryErr: any) {
        // ✅ SI FALLA EL SERVICIO PRINCIPAL, INTENTAR CON GMAIL
        const gmailSuccess = await sendVerificationCode(true);
        
        if (gmailSuccess) {
          setSuccessMessage("✅ Código reenviado usando servicio de respaldo (Gmail)");
        }
      }

      // ✅ LIMPIAR CÓDIGO Y FOCUS EN PRIMER INPUT
      setVerificationCode(Array(6).fill(""));
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }

    } catch (err: any) {
      setError(err.message || "Error al reenviar el código. Por favor, intente más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 pb-4 sm:pb-6"
    >
      {/* ✅ HEADER COMPACTO */}
      <div className="text-center mb-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-2">
          <EnvelopeIcon className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          Verificación de Código
        </h2>
        <p className="text-sm text-gray-600">
          Ingrese el código de 6 dígitos enviado a su correo
        </p>
      </div>

      {/* ✅ ALERTAS - SOLO PARA REENVÍO MANUAL Y ERRORES */}
      {error && (
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
          <p className="text-green-700 text-sm">{successMessage}</p>
          {isUsingGmail && (
            <p className="text-green-600 text-xs mt-1">
              💡 Si no recibe el código, verifique la carpeta de spam
            </p>
          )}
        </div>
      )}

      {/* ✅ INFORMACIÓN DE USUARIO COMPACTA */}
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {userInitials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 text-sm truncate">
              {userName}
            </p>
            <div className="flex gap-2 mt-1">
              {userData?.sAMAccountName && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {getStringValue(userData.sAMAccountName)}
                </span>
              )}
              {userData?.employeeID && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  CI: {getStringValue(userData.employeeID)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ SECCIÓN CORREO COMPACTA */}
        <div className="bg-white p-2 rounded border border-blue-100">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1">Código enviado a:</p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {maskedEmail}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ INDICADOR GMAIL COMPACTO */}
        {isUsingGmail && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-xs text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span>Usando servicio de respaldo (Gmail)</span>
            </p>
          </div>
        )}
      </div>

      {/* ✅ INPUTS DE CÓDIGO */}
      <div className="mb-4">
        <div className="flex justify-center space-x-2 mb-2">
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
              className="w-10 h-10 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center">
          El código expirará en 15 minutos
        </p>
      </div>

      {/* ✅ BOTONES COMPACTOS */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm disabled:opacity-50"
        >
          Volver
        </button>
        <button
          onClick={handleVerify}
          disabled={isSubmitting || verificationCode.some((digit) => digit === "")}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm disabled:opacity-50"
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

      {/* ✅ BOTÓN REENVIAR COMPACTO */}
      <div className="text-center mb-3">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isSubmitting}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowPathIcon className="w-4 h-4" />
          {isSubmitting ? "Enviando..." : (isUsingGmail ? "Reenviar código" : "¿No recibió el código? Reenviar")}
        </button>
      </div>

      {/* ✅ INFORMACIÓN DE SEGURIDAD COMPACTA */}
      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <p className="text-xs text-yellow-800 text-center">
          <strong>Seguridad:</strong> Por su protección, mostramos solo parte de su información. 
          Verifique que el correo mostrado sea el correcto.
        </p>
      </div>
    </motion.div>
  );
}