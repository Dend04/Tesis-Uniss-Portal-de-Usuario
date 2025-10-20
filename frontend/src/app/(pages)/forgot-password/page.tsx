// app/forgot-password/page.tsx
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  EnvelopeIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RecoveryMethod {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  available?: boolean;
}

export default function ForgotPasswordPage() {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const router = useRouter();

  const methods = useMemo((): RecoveryMethod[] => [
    {
      id: "pin",
      title: "PIN de Seguridad",
      description: "Usar tu PIN de 6 dígitos configurado previamente",
      icon: KeyIcon,
      path: "/forgot-password/pin",
      available: true,
    },
    {
      id: "email",
      title: "Correo electrónico",
      description: "Enviar código de verificación al correo asociado",
      icon: EnvelopeIcon,
      path: "/forgot-password/email",
      available: true,
    },
    // {
    //   id: "sms",
    //   title: "SMS",
    //   description: "Enviar código al número de teléfono registrado",
    //   icon: DevicePhoneMobileIcon,
    //   path: "/forgot-password/sms",
    //   available: false, // Temporalmente no disponible
    // },
    {
      id: "2fa",
      title: "Autenticación 2FA",
      description: "Usar código de tu aplicación autenticadora",
      icon: LockClosedIcon,
      path: "/forgot-password/2fa",
      available: true,
    },
    {
      id: "security",
      title: "Preguntas de seguridad",
      description: "Responder tus preguntas de seguridad",
      icon: QuestionMarkCircleIcon,
      path: "https://cambio.uniss.edu.cu/",
      available: true,
    },
  ], []);

  const handleMethodSelect = (methodId: string) => {
    const method = methods.find(m => m.id === methodId);
    
    if (!method || !method.available) {
      return;
    }
    
    setSelectedMethod(methodId);
    
    // Navegar a la página específica del método después de una breve pausa visual
    setTimeout(() => {
      if (method) {
        router.push(method.path);
      }
    }, 300);
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
            priority
          />
          
          <h1 className="text-2xl font-bold text-uniss-black mb-2">Recuperar Contraseña</h1>
          <p className="text-gray-600 mb-6">Seleccione el método de recuperación</p>
          
          <div className="space-y-4">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method.id)}
                disabled={!method.available}
                className={`w-full p-4 text-left rounded-lg border transition-all ${
                  selectedMethod === method.id
                    ? "border-uniss-blue bg-blue-50"
                    : method.available
                    ? "border-gray-200 hover:border-uniss-blue hover:bg-gray-50"
                    : "border-gray-100 bg-gray-50 cursor-not-allowed"
                } ${!method.available ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <method.icon className={`w-6 h-6 ${
                    method.available ? "text-uniss-blue" : "text-gray-400"
                  }`} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{method.title}</h3>
                      {/* Se eliminó la etiqueta "Nuevo" para el PIN */}
                      {!method.available && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      method.available ? "text-gray-500" : "text-gray-400"
                    }`}>
                      {method.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Se eliminó la sección de información adicional sobre el PIN */}

          <div className="mt-6 text-sm text-gray-600">
            ¿Recordó su contraseña?{" "}
            <Link href="/" className="text-uniss-blue hover:underline" prefetch={false}>
              Iniciar sesión
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}