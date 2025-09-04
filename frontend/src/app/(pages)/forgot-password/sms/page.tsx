// app/forgot-password/sms/page.tsx
"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  DevicePhoneMobileIcon, 
  ArrowLeftIcon, 
  ArrowPathIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SMSRecoveryPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const router = useRouter();

  const handleSendCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      // Validar formato de número telefónico cubano
      const cubanPhoneRegex = /^(\+53)?5[0-9]{7}$/;
      if (!cubanPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        throw new Error("Por favor ingrese un número telefónico cubano válido (ej: +53XXXXXXXX)");
      }

      // Enviar código via Telegram API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/send-telegram-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          method: "sms" // También puede ser "call" o "telegram"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al enviar el código");
      }

      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el código. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [phoneNumber]);

  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Verificar el código con el servidor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-telegram-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          code 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Código inválido");
      }

      // Redirigir a la página de reset con el número telefónico
      router.push(`/forgot-password/reset?phone=${encodeURIComponent(phoneNumber)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al verificar el código.");
    } finally {
      setIsSubmitting(false);
    }
  }, [code, phoneNumber, router]);

  const handleResendCode = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Reenviar código de verificación
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-telegram-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          method: "call" // Alternar a llamada de voz si el SMS falla
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
  }, [phoneNumber]);

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
            onClick={() => router.back()}
            className="flex items-center text-uniss-blue hover:text-uniss-blue-dark mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Volver
          </button>
          
          {step === "phone" ? (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Recuperación por Teléfono</h1>
              <p className="text-gray-600 mb-6">
                Ingrese su número telefónico para recibir un código de verificación
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block mb-2 text-gray-600">
                    Número telefónico
                  </label>
                  <div className="relative">
                    <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+53XXXXXX"
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: +53XXXXXXXX (número cubano)
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !phoneNumber}
                  className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    "Enviar código de verificación"
                  )}
                </button>
              </form>

              <div className="mt-4 text-sm text-gray-600">
                ¿No tiene acceso a este número?{" "}
                <Link href="/forgot-password" className="text-uniss-blue hover:underline" prefetch={false}>
                  Elegir otro método
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-uniss-black mb-2">Verificar Código</h1>
              
              <div className="bg-uniss-blue p-3 rounded-lg mb-4 text-left">
                <p className="text-sm text-blue-800">
                  Se ha enviado un código de verificación al número: 
                  <strong> {phoneNumber}</strong>
                </p>
              </div>
              
              <p className="text-gray-600 mb-6">
                Ingrese el código recibido por SMS o llamada telefónica
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

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleResendCode}
                  disabled={isSubmitting}
                  className="text-uniss-blue hover:underline disabled:opacity-50 text-sm"
                >
                  ↳ Reenviar código por SMS
                </button>
                
                <button
                  onClick={() => {
                    // Alternar a método de llamada de voz
                    handleResendCode();
                  }}
                  disabled={isSubmitting}
                  className="block text-uniss-blue hover:underline disabled:opacity-50 text-sm"
                >
                  ↳ Recibir código por llamada de voz
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}