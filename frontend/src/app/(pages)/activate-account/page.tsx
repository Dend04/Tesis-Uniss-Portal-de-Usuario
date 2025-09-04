// src/app/(pages)/activate-account/page.tsx
"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import StepsIndicator, {
  Step,
  StepStatus,
} from "@/app/components/active-account/StepsIndicator";
import ActivationForm from "@/app/components/active-account/ActivationForm";
import VerificationSuccess from "@/app/components/active-account/VerificationSuccess";
import BackupEmailForm from "@/app/components/active-account/BackupEmailForm";
import UserConfirmation from "@/app/components/active-account/UserConfirmation";

// Define interfaces for the expected data structure
export interface StudentData {
  id: string;
  fullName: string;
  career: string;
  ci: string;
  faculty: string;
  academicYear: number;
  status: "active" | "inactive";
  type: "student";
}
export interface EmployeeData {
  id: string;
  fullName: string;
  department: string;
  ci: string;
  status: "active" | "inactive";
  type: "employee";
}
export type IdentityVerificationResponse = StudentData | EmployeeData;
const activationSchema = z.object({
  carnet: z
    .string()
    .length(11, "El carnet debe tener 11 dígitos")
    .regex(/^\d+$/, "Solo se permiten números"),
  tomo: z
    .string()
    .length(3, "El tomo debe tener 3 dígitos")
    .regex(/^\d+$/, "Solo se permiten números"),
  folio: z
    .string()
    .length(2, "El folio debe tener 2 dígitos")
    .regex(/^\d+$/, "Solo se permiten números"),
});
const emailSchema = z.object({
  email: z.string().email("Debe ingresar un correo electrónico válido"),
});
export type ActivationFormData = z.infer<typeof activationSchema>;
export type EmailFormData = z.infer<typeof emailSchema>;
type StepType = "activation" | "success" | "email" | "confirmation";

export default function ActivationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepType>("activation");
  const [result, setResult] = useState<IdentityVerificationResponse | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const containerRef = useRef(null);
  const activationForm = useForm<ActivationFormData>({
    resolver: zodResolver(activationSchema),
  });
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  // Definir los steps con el tipo correcto
  const steps: Step[] = [
    {
      id: "activation",
      title: "Verificación",
      status: (currentStep === "activation"
        ? "current"
        : ["success", "email", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "success",
      title: "Confirmación",
      status: (currentStep === "success"
        ? "current"
        : ["email", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "email",
      title: "Correo",
      status: (currentStep === "email"
        ? "current"
        : currentStep === "confirmation"
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "confirmation",
      title: "Finalizado",
      status: (currentStep === "confirmation" ? "current" : "upcoming") as StepStatus,
    },
  ];

  const onSubmitActivation = async (data: ActivationFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/identity/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ci: data.carnet }),
        }
      );
      if (!response.ok) {
        throw new Error("Error al verificar la identidad");
      }
      const resultData = await response.json();
      console.log("Backend response:", resultData);

      if (!resultData.success) {
        throw new Error(
          resultData.error || "La verificación de identidad falló"
        );
      }

      // Extrae los datos reales de la propiedad 'data'
      const userData = resultData.data;

      // Determina el tipo de usuario basado en la propiedad 'type' de la respuesta
      let userWithType: IdentityVerificationResponse;

      if (userData.type === "student") {
        userWithType = {
        id: userData.data.ci,
          ...userData.data,
          type: "student",
        };
      } else if (userData.type === "employee") {
        userWithType = {
          id: userData.data.ci,
          ...userData.data,
          type: "employee",
        };
      } else {
        throw new Error("Tipo de usuario desconocido");
      }

      setResult(userWithType);
      setCurrentStep("success");
    } catch (error: any) {
      activationForm.setError("root", {
        type: "manual",
        message:
          error.message ||
          "Error al validar los datos. Por favor intente nuevamente.",
      });
      console.error("Error en activación:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitEmail = async (data: { email: string; verified: boolean }) => {
    if (data.verified) {
      setVerifiedEmail(data.email);
      setCurrentStep("confirmation");
    } else {
      // Lógica anterior para cuando no hay verificación
      console.log("Correo de respaldo:", data.email);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  };

  // Función para cuando se completa el proceso
  const onCompleteActivation = () => {
    window.location.href = "/dashboard";
  };

  // Corrección para la animación del logo
  const logoAnimationProps = {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1.2, ease: "easeOut" as const },
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4"
      ref={containerRef}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <AnimatePresence>
          <motion.div
            key="logo"
            className="flex justify-center pt-8 px-8"
            {...logoAnimationProps}
          >
            <div className="relative">
              <Image
                src="/uniss-logo.png"
                alt="UNISS Logo"
                width={120}
                height={120}
                className="object-contain"
              />
              {currentStep !== "activation" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2 bg-white rounded-full"
                >
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </motion.div>
              )}
            </div>
          </motion.div>
          <StepsIndicator steps={steps} />
          {/* Paso 1: Formulario de Activación */}
          {currentStep === "activation" && (
            <ActivationForm
              key="activation-step"
              register={activationForm.register}
              handleSubmit={activationForm.handleSubmit}
              errors={activationForm.formState.errors}
              setValue={activationForm.setValue}
              watch={activationForm.watch}
              onSubmit={onSubmitActivation}
              isSubmitting={isSubmitting}
            />
          )}
          {/* Paso 2: Resultado de la Activación */}
          {currentStep === "success" && result && (
            <VerificationSuccess
              key="success-step"
              result={result}
              onBack={() => setCurrentStep("activation")}
              onContinue={() => setCurrentStep("email")}
            />
          )}
          {/* Paso 3: Formulario de correo de respaldo */}
          {currentStep === "email" && (
            <BackupEmailForm
              key="email-step"
              register={emailForm.register}
              handleSubmit={emailForm.handleSubmit}
              errors={emailForm.formState.errors}
              onSubmit={onSubmitEmail}
              onBack={() => setCurrentStep("success")}
            />
          )}
          {/* Paso 4: Confirmación final del usuario */}
          {currentStep === "confirmation" && result && (
            <UserConfirmation
              key="confirmation-step"
              userData={result}
              email={verifiedEmail}
              onComplete={onCompleteActivation}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}