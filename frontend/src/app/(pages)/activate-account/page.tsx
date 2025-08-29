// src/app/(pages)/activate-account/page.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define interfaces for the expected data structure

interface StudentData {
  fullName: string;
  career: string;
  ci: string;
  faculty: string;
  academicYear: number;
  status: 'active' | 'inactive';
  type: 'student';
}

interface EmployeeData {
  fullName: string;
  department: string;
  ci: string;
  status: 'active' | 'inactive';
  type: 'employee';
}

type IdentityVerificationResponse = StudentData | EmployeeData;


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

type ActivationFormData = z.infer<typeof activationSchema>;

export default function ActivationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<IdentityVerificationResponse | null>(
    null
  );
  const containerRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<ActivationFormData>({
    resolver: zodResolver(activationSchema),
  });

  const handleNumericInput =
    (field: keyof ActivationFormData, maxLength: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = e.target.value
        .replace(/\D/g, "")
        .slice(0, maxLength);
      setValue(field, numericValue, { shouldValidate: true });
    };

  const logoAnimation = {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1.2, ease: "easeOut" },
  };

  const contentAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { delay: 0.5, duration: 0.8 },
  };

  const onSubmit = async (data: ActivationFormData) => {
    // En la función onSubmit (~línea 85)
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

      const result = await response.json();
      
      setResult(result);
      setSuccess(true);
    } catch (error) {
      setError("root", {
        type: "manual",
        message: "Error al validar los datos. Por favor intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
    /* const result = await response.json();
// Inspeccionar estructura real
setResult(result); */

  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      ref={containerRef}
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <AnimatePresence>
          <motion.div
            key="logo"
            {...logoAnimation}
            className="flex justify-center mb-6"
          >
            <Image
              src="/uniss-logo.png"
              alt="UNISS Logo"
              width={140}
              height={140}
              className="object-contain"
            />
          </motion.div>

          {/* Página 1: Formulario de Activación */}
          {!success ? (
            <motion.div key="content" {...contentAnimation}>
              <h1 className="text-2xl font-bold text-center text-uniss-black mb-4">
                Activación de Cuenta Institucional
              </h1>
              <p className="text-center text-gray-600 mb-8">
                Ingrese los datos de su carnet de identidad para verificar su
                identidad
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-uniss-black mb-2">
                    Carnet de Identidad
                  </label>
                  <input
                    {...register("carnet")}
                    value={watch("carnet") || ""}
                    onChange={handleNumericInput("carnet", 11)}
                    placeholder="Ej: 01234567891"
                    className={`w-full p-3 border ${
                      errors.carnet ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent`}
                    inputMode="numeric"
                  />
                  {errors.carnet && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.carnet.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-uniss-black mb-2">
                      Tomo
                    </label>
                    <input
                      {...register("tomo")}
                      value={watch("tomo") || ""}
                      onChange={handleNumericInput("tomo", 3)}
                      placeholder="Ej: 213"
                      className={`w-full p-3 border ${
                        errors.tomo ? "border-red-500" : "border-gray-300"
                      } rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent`}
                      inputMode="numeric"
                    />
                    {errors.tomo && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.tomo.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-uniss-black mb-2">
                      Folio
                    </label>
                    <input
                      {...register("folio")}
                      value={watch("folio") || ""}
                      onChange={handleNumericInput("folio", 2)}
                      placeholder="Ej: 21"
                      className={`w-full p-3 border ${
                        errors.folio ? "border-red-500" : "border-gray-300"
                      } rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent`}
                      inputMode="numeric"
                    />
                    {errors.folio && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.folio.message}
                      </p>
                    )}
                  </div>
                </div>

                {errors.root && (
                  <p className="text-red-500 text-center text-sm">
                    {errors.root.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Validar Identidad"
                  )}
                </button>

                <div className="text-center text-sm text-gray-600 mt-4">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    href="/"
                    className="text-uniss-blue hover:underline"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Página 2: Resultado de la Activación */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-uniss-black mb-2">
                ¡Cuenta Activada!
              </h2>
              <p className="text-gray-600 mb-6">
                Su cuenta institucional ha sido activada exitosamente.
              </p>
              {result && (
                <div className="space-y-2 mb-6">
                  <p>
                    <span className="font-semibold">Nombre:</span>{" "}
                    {result.fullName}
                  </p>
                  <p>
                    <span className="font-semibold">CI:</span> {result.ci}
                  </p>

                  {result.type === "student" ? (
                    <>
                      <p>
                        <span className="font-semibold">Carrera:</span>{" "}
                        {result.career}
                      </p>
                      <p>
                        <span className="font-semibold">Facultad:</span>{" "}
                        {result.faculty}
                      </p>
                      <p>
                        <span className="font-semibold">Año Académico:</span>{" "}
                        {result.academicYear}
                      </p>
                    </>
                  ) : (
                    <p>
                      <span className="font-semibold">Departamento:</span>{" "}
                      {result.department}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setSuccess(false)}
                  className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                >
                  Volver al Paso Anterior
                </button>
                <Link
                  href="/login"
                  className="bg-uniss-blue text-white py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                >
                  Confirmar
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}



/* const onSubmit = async (data: ActivationFormData) => {
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

    // Verifica si la respuesta fue exitosa
    if (!resultData.success) {
      throw new Error("La verificación de identidad falló");
    }

    // Extrae los datos reales de la propiedad 'data'
    const userData = resultData.data;
    
    // Determina el tipo de usuario basado en las propiedades existentes
    let userWithType: IdentityVerificationResponse;
    
    if (userData.career || userData.faculty) {
      userWithType = {
        ...userData,
        type: "student"
      };
    } else if (userData.department) {
      userWithType = {
        ...userData,
        type: "employee"
      };
    } else {
      throw new Error("Tipo de usuario desconocido");
    }

    setResult(userWithType);
    setSuccess(true);
  } catch (error: any) {
    setError("root", {
      type: "manual",
      message: error.message || "Error al validar los datos. Por favor intente nuevamente.",
    });
    console.error("Error en activación:", error);
  } finally {
    setIsSubmitting(false);
  }
}; */

