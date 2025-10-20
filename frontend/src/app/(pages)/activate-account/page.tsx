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
} from "@/app/components/activate-account/StepsIndicator";
import ActivationForm from "@/app/components/activate-account/ActivationForm";
import VerificationSuccess from "@/app/components/activate-account/VerificationSuccess";
import BackupEmailForm from "@/app/components/activate-account/BackupEmailForm";
import UserConfirmation from "@/app/components/activate-account/UserConfirmation";
import UsernameSelection from "@/app/components/activate-account/UsernameSelection";
import PasswordForm from "@/app/components/activate-account/PasswordForm";

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
type StepType =
  | "activation"
  | "success"
  | "username"
  | "email"
  | "password"
  | "confirmation";

export default function ActivationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepType>("activation");
  const [result, setResult] = useState<IdentityVerificationResponse | null>(
    null
  );
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [userPrincipalName, setUserPrincipalName] = useState("");
  const [password, setPassword] = useState("");
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
        : ["success", "username", "email", "password", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "success",
      title: "Confirmación",
      status: (currentStep === "success"
        ? "current"
        : ["username", "email", "password", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "username",
      title: "Usuario",
      status: (currentStep === "username"
        ? "current"
        : ["email", "password", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "email",
      title: "Correo",
      status: (currentStep === "email"
        ? "current"
        : ["password", "confirmation"].includes(currentStep)
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "password",
      title: "Contraseña",
      status: (currentStep === "password"
        ? "current"
        : currentStep === "confirmation"
        ? "complete"
        : "upcoming") as StepStatus,
    },
    {
      id: "confirmation",
      title: "Finalizado",
      status: (currentStep === "confirmation"
        ? "current"
        : "upcoming") as StepStatus,
    },
  ];

  const onSubmitActivation = async (data: ActivationFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/identity/verify`,
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
      setCurrentStep("password");
    } else {
      // Lógica anterior para cuando no hay verificación
      console.log("Correo de respaldo:", data.email);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  const onSubmitPassword = (newPassword: string) => {
    setPassword(newPassword);
  };

  const onAccountCreated = (principalName: string) => {
    setUserPrincipalName(principalName);
    setCurrentStep("confirmation");
  };

  // Función para cuando se completa el proceso 
  const onCompleteActivation = async (tokenData: { accessToken: string; refreshToken: string }) => {
     try {
      if (tokenData.accessToken) {
        localStorage.setItem('authToken', tokenData.accessToken);
      }
      if (tokenData.refreshToken) {
        localStorage.setItem('refreshToken', tokenData.refreshToken);
      }

      console.log('Enviando correo de bienvenida a:', verifiedEmail);
      
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/bienvenido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: verifiedEmail,
          username: selectedUsername,
          userPrincipalName: userPrincipalName,
          fullName: result?.fullName,
          userType: result?.type
        }),
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok) {
        console.warn('Correo no enviado, pero continuando:', emailResult.message);
      } else {
        console.log('Correo de bienvenida enviado exitosamente');
      }

      // Redirigir al dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Error en el proceso final:', error);
      // Aún con error, redirigir al dashboard
      window.location.href = '/dashboard';
    }
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
              {currentStep !== "activation" && (
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
              onContinue={() => setCurrentStep("username")}
            />
          )}

          {/* Paso 3: Selección de username */}
          {currentStep === "username" && result && (
            <UsernameSelection
              key="username-step"
              userData={result}
              userType={result.type}
              onSelect={setSelectedUsername}
              onBack={() => setCurrentStep("success")}
              onNext={() => setCurrentStep("email")}
            />
          )}
          
          {/* Paso 4: Formulario de correo de respaldo */}
          {currentStep === "email" && (
            <BackupEmailForm
              key="email-step"
              register={emailForm.register}
              handleSubmit={emailForm.handleSubmit}
              errors={emailForm.formState.errors}
              onSubmit={onSubmitEmail}
              onBack={() => setCurrentStep("username")}
            />
          )}
          
          {/* Paso 5: Formulario de contraseña */}
          {currentStep === "password" && result && (
            <PasswordForm
              key="password-step"
              userData={result}
              username={selectedUsername}
              email={verifiedEmail}
              userType={result.type}
              fullName={result.fullName} 
              onAccountCreated={onAccountCreated}
              onBack={() => setCurrentStep("email")}
            />
          )}
          
          {/* Paso 6: Confirmación final del usuario */}
          {currentStep === "confirmation" && result && (
            <UserConfirmation
              key="confirmation-step"
              userData={result}
              email={verifiedEmail}
              username={selectedUsername}
              userPrincipalName={userPrincipalName}
              onComplete={onCompleteActivation}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}