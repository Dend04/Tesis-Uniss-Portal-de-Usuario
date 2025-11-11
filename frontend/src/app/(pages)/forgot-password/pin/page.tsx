// app/forgot-password/pin/page.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import StepsIndicator, {
  Step,
  StepStatus,
} from "@/app/components/activate-account/StepsIndicator";
import UserIdentifierForm from "@/app/components/forgot-password/UserIdentifierForm";
import ResetPasswordForm from "@/app/components/forgot-password/ResetPasswordForm";
import SuccessStep from "@/app/components/forgot-password/SuccessStep";
import PinVerificationForm from "@/app/components/forgot-password/PinVerificationForm";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
}

type StepType = "identify" | "verify-pin" | "reset" | "success";

export default function ForgotPasswordPinPage() {
  const [currentStep, setCurrentStep] = useState<StepType>("identify");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userIdentifier, setUserIdentifier] = useState("");
  const containerRef = useRef(null);

  // Definir los steps del wizard
  const steps: Step[] = [
    {
      id: "identify",
      title: "Identificación",
      status: (currentStep === "identify"
        ? "current"
        : ["verify-pin", "reset", "success"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "verify-pin",
      title: "Verificación PIN",
      status: (currentStep === "verify-pin"
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

  // Manejar éxito en identificación de usuario
  const handleUserIdentified = async (data: UserData, identifier: string) => {
    setUserData(data);
    setUserIdentifier(identifier);
    // El UserIdentifierForm ya verificó que el usuario tiene PIN
    setCurrentStep("verify-pin");
  };

  // Manejar éxito en verificación de PIN
  const handlePinVerified = () => {
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
          {currentStep === "identify" && (
            <UserIdentifierForm
              key="identify-step"
              onUserIdentified={handleUserIdentified}
              flowType="pin"
            />
          )}

          {/* Paso 2: Verificación del PIN */}
          {currentStep === "verify-pin" && userData && (
            <PinVerificationForm
              key="verify-pin-step"
              userData={userData}
              onBack={() => setCurrentStep("identify")}
              onPinVerified={handlePinVerified}
            />
          )}

          {/* Paso 3: Restablecimiento de contraseña */}
          {currentStep === "reset" && userData && (
            <ResetPasswordForm
              key="reset-step"
              userData={userData}
              userIdentifier={userIdentifier}
              verifiedCode="pin-verified"
              onBack={() => setCurrentStep("verify-pin")}
              onPasswordReset={handlePasswordReset}
              flowType="pin"
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