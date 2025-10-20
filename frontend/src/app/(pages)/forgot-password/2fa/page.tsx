// app/forgot-password/2fa/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import StepsIndicator, {
  Step,
  StepStatus,
} from "@/app/components/activate-account/StepsIndicator";
import UserIdentifierForm from "@/app/components/forgot-password/UserIdentifierForm";
import ResetPasswordForm from "@/app/components/forgot-password/ResetPasswordForm";
import SuccessStep from "@/app/components/forgot-password/SuccessStep";
import TwoFactorVerification from "@/app/components/forgot-password/TwoFactorVerification";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
  has2FA?: boolean;
}

type StepType = "identify" | "verify-2fa" | "reset" | "success";

export default function ForgotPassword2FAPage() {
  const [currentStep, setCurrentStep] = useState<StepType>("identify");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userIdentifier, setUserIdentifier] = useState("");
  const [no2FAError, setNo2FAError] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const containerRef = useRef(null);

  // Definir los steps del wizard
  const steps: Step[] = [
    {
      id: "identify",
      title: "Identificación",
      status: (currentStep === "identify"
        ? "current"
        : ["verify-2fa", "reset", "success"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "verify-2fa",
      title: "Verificación 2FA",
      status: (currentStep === "verify-2fa"
        ? "current"
        : ["reset", "success"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "reset",
      title: "Contraseña",
      status: (currentStep === "reset"
        ? "current"
        : currentStep === "success"
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "success",
      title: "Completado",
      status: (currentStep === "success"
        ? "current"
        : "upcoming") as StepStatus,
    },
  ];

  // Countdown para redirección automática
  useEffect(() => {
    if (no2FAError && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (no2FAError && countdown === 0) {
      handleManualRedirect();
    }
  }, [no2FAError, countdown]);

  // Manejar éxito en identificación de usuario
  const handleUserIdentified = async (data: UserData, identifier: string) => {
    setUserData(data);
    setUserIdentifier(identifier);

    // Verificar si el usuario tiene 2FA configurado
    if (data.has2FA) {
      setCurrentStep("verify-2fa");
    } else {
      setNo2FAError(true);
    }
  };

  // Manejar éxito en verificación de 2FA
  const handle2FAVerified = () => {
    setCurrentStep("reset");
  };

  // Manejar éxito en cambio de contraseña
  const handlePasswordReset = () => {
    setCurrentStep("success");

    // Redirigir al login después de 3 segundos
    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
  };

  // Redirigir manualmente si no tiene 2FA
  const handleManualRedirect = () => {
    window.location.href = "/forgot-password";
  };

  // Corrección para la animación del logo
  const logoAnimationProps = {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1.2, ease: "easeOut" as const },
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-2 sm:p-4"
      ref={containerRef}
    >
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden mx-2">
        <AnimatePresence>
          <motion.div
            key="logo"
            className="flex justify-center pt-6 md:pt-8 px-4 md:px-8"
            {...logoAnimationProps}
          >
            <div className="relative">
              <Image
                src="/uniss-logo.png"
                alt="UNISS Logo"
                width={80}
                height={80}
                className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                priority
              />
              {currentStep !== "identify" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white rounded-full"
                >
                  <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-green-500" />
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="px-2 sm:px-4">
            <StepsIndicator steps={steps} />
          </div>

          {/* Paso 1: Identificación del usuario */}
          {currentStep === "identify" && !no2FAError && (
            <UserIdentifierForm
              key="identify-step"
              onUserIdentified={handleUserIdentified}
              flowType="2fa"
            />
          )}

          {/* Mensaje de error cuando el usuario no tiene 2FA */}
          {no2FAError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 md:px-8 py-8 text-center"
            >
              <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2FA No Configurado
              </h2>
              <p className="text-gray-600 mb-6">
                No puedes usar este método para cambiar tu contraseña porque no
                has configurado la autenticación de dos factores.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Serás redirigido automáticamente a la página de recuperación en{" "}
                <span className="font-bold">{countdown} segundos</span>.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleManualRedirect}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Volver Ahora
                </button>

                <p className="text-xs text-gray-500">
                  O espera a ser redirigido automáticamente...
                </p>
              </div>
            </motion.div>
          )}

          {/* Paso 2: Verificación del código 2FA */}
          {currentStep === "verify-2fa" && userData && (
            <TwoFactorVerification
              key="verify-2fa-step"
              userData={userData}
              userIdentifier={userIdentifier}
              onVerificationSuccess={handle2FAVerified}
              onBack={() => setCurrentStep("identify")}
            />
          )}

          {/* Paso 3: Restablecimiento de contraseña */}
          {currentStep === "reset" && userData && (
            <ResetPasswordForm
              key="reset-step"
              userData={userData}
              userIdentifier={userIdentifier}
              verifiedCode="2fa-verified"
              onBack={() => setCurrentStep("verify-2fa")}
              onPasswordReset={handlePasswordReset}
            />
          )}

          {/* Paso 4: Éxito */}
          {currentStep === "success" && (
            <SuccessStep
              key="success-step"
              onComplete={() => (window.location.href = "/")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}