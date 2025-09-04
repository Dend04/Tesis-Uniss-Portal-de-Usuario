"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  EnvelopeIcon, 
  UserIcon, 
  ArrowLeftIcon, 
  ArrowPathIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "email" | "code";

interface LDAPUserData {
  sAMAccountName: string;
  dn: string;
  username: string;
  nombreCompleto: string;
  email: string;
  nombre: string;
  apellido: string;
  displayName: string;
  employeeID: string;
}

export default function EmailRecoveryPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<LDAPUserData | null>(null);
  const router = useRouter();

  const searchUserInLDAP = useCallback(async (email: string, username: string) => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // Validar que al menos un campo esté lleno
      if (!email && !username) {
        setError("Debe proporcionar al menos un correo o nombre de usuario");
        return;
      }

      // Construir el cuerpo de la petición
      const requestBody: any = {};
      if (email) requestBody.email = email;
      if (username) requestBody.username = username;

      // Llamar a la API para buscar usuario en LDAP
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ldap/search-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al buscar usuario");
      }

      const userData: LDAPUserData = await response.json();

      if (userData) {
        setUserInfo(userData);
        
        // Enviar código de verificación al correo del usuario
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verificacion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: userData.email,
            username: userData.sAMAccountName 
          }),
        });

        if (!emailResponse.ok) {
          throw new Error("Error al enviar el correo de verificación");
        }

        setStep("code");
      } else {
        setError("No se encontró ningún usuario con los datos proporcionados");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar usuario. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleSendCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await searchUserInLDAP(email, usernameInput);
  }, [email, usernameInput, searchUserInLDAP]);

  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Verificar el código con el servidor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userInfo?.email,
          code 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Código inválido");
      }

      // Redirigir a la página de reset con el username
      router.push(`/forgot-password/reset?username=${userInfo?.sAMAccountName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al verificar el código.");
    } finally {
      setIsSubmitting(false);
    }
  }, [code, userInfo, router]);

  const handleResendCode = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Reenviar código de verificación
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verificacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userInfo?.email,
          username: userInfo?.sAMAccountName 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al reenviar el código");
      }

      setError("Código reenviado correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reenviar el código.");
    } finally {
      setIsSubmitting(false);
    }
  }, [userInfo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Image
            src="/uniss-logo.png"
            alt="UNISS Logo"
            width={80}
            height={80}
            className="mx-auto mb-6"
            priority
          />
          
          <button
            onClick={() => step === "email" ? router.back() : setStep("email")}
            className="flex items-center text-uniss-blue hover:text-uniss-blue-dark mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Volver
          </button>
          
          {step === "email" ? (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Recuperar Contraseña</h1>
              <p className="text-gray-600 mb-6">Ingrese su correo electrónico o nombre de usuario</p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block mb-2 text-gray-600">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="text-gray-500 text-sm">- o -</div>

                <div>
                  <label className="block mb-2 text-gray-600">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Nombre de usuario"
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || (!email && !usernameInput)}
                  className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Buscando usuario...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </form>

              <div className="mt-4 text-sm text-gray-600">
                ¿Recordó su contraseña?{" "}
                <Link href="/login" className="text-uniss-blue hover:underline" prefetch={false}>
                  Iniciar sesión
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Verificar Identidad</h1>
              
              {userInfo && (
                <div className="bg-uniss-blue p-3 rounded-lg mb-4 text-left">
                  <p className="text-sm text-blue-800">
                    <strong>Usuario encontrado:</strong> {userInfo.nombreCompleto}
                    <br />
                    <strong>Correo:</strong> {userInfo.email}
                  </p>
                </div>
              )}
              
              <p className="text-gray-600 mb-6">
                Se ha enviado un código de verificación a su correo electrónico
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block mb-2 text-gray-600">
                    Código de verificación
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Código de 6 dígitos"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                    maxLength={6}
                    required
                  />
                </div>

                {error && (
                  <div className={`p-3 rounded-lg text-sm ${
                    error.includes("reenviado") 
                      ? "bg-green-50 text-green-700" 
                      : "bg-red-50 text-red-700"
                  }`}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || code.length < 6}
                  className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar Código"
                  )}
                </button>
              </form>

              <div className="mt-4 text-sm text-gray-600">
                ¿No recibió el código?{" "}
                <button
                  onClick={handleResendCode}
                  disabled={isSubmitting}
                  className="text-uniss-blue hover:underline disabled:opacity-50"
                >
                  Reenviar código
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}