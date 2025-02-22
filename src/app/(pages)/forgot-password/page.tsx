// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [selectedMethod, setSelectedMethod] = useState<"email" | "sms" | "2fa" | "security">();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "verify" | "reset">("select");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const methods = [
    {
      id: "email",
      title: "Correo electrónico",
      description: "Enviar código de verificación al correo asociado",
      icon: EnvelopeIcon,
    },
    {
      id: "sms",
      title: "SMS",
      description: "Enviar código al número de teléfono registrado",
      icon: DevicePhoneMobileIcon,
    },
    {
      id: "2fa",
      title: "Autenticación 2FA",
      description: "Usar código de tu aplicación autenticadora",
      icon: LockClosedIcon,
    },
    {
      id: "security",
      title: "Preguntas de seguridad",
      description: "Responder tus preguntas de seguridad",
      icon: QuestionMarkCircleIcon,
    },
  ];

  const handleSendCode = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep("verify");
      setError("");
    } catch (err) {
      setError("Error al enviar el código. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep("reset");
      setError("");
    } catch (err) {
      setError("Código inválido. Verifique e intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setError("");
      // Lógica para cambiar contraseña
    } catch (err) {
      setError("Error al actualizar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            width={100}
            height={100}
            className="mx-auto mb-6"
          />
          
          {step === "select" ? (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Recuperar Contraseña</h1>
              <p className="text-gray-600 mb-6">Seleccione el método de recuperación</p>
              
              <div className="space-y-4">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as any)}
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      selectedMethod === method.id
                        ? "border-uniss-blue bg-blue-50"
                        : "border-gray-200 hover:border-uniss-blue"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <method.icon className="w-6 h-6 text-uniss-blue" />
                      <div>
                        <h3 className="font-medium text-gray-900">{method.title}</h3>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedMethod && (
                <div className="mt-6">
                  <button
                    onClick={handleSendCode}
                    disabled={isSubmitting}
                    className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Enviando código...
                      </>
                    ) : (
                      "Continuar"
                    )}
                  </button>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600">
                ¿Recordó su contraseña?{" "}
                <Link href="/login" className="text-uniss-blue hover:underline">
                  Iniciar sesión
                </Link>
              </div>
            </>
          ) : step === "verify" ? (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Verificar Identidad</h1>
              <p className="text-gray-600 mb-6">
                Ingrese el código enviado a su {selectedMethod === "email" ? "correo" : "teléfono"}
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Código de 6 dígitos"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                  maxLength={6}
                />

                <button
                  onClick={handleVerifyCode}
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

                <button
                  onClick={handleSendCode}
                  className="text-uniss-blue text-sm hover:underline"
                >
                  Reenviar código
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Nueva Contraseña</h1>
              <p className="text-gray-600 mb-6">Cree una nueva contraseña segura</p>

              <div className="space-y-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                />

                <button
                  onClick={handleResetPassword}
                  disabled={isSubmitting || newPassword.length < 8}
                  className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Cambiar Contraseña"
                  )}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}