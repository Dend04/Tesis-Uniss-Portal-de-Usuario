"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  UserCircleIcon,
  IdentificationIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    general?: string;
  }>({});
  const containerRef = useRef(null);
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(estudiante\.)?uniss\.edu\.cu$/;
  const USERNAME_REGEX = /^[a-zA-Z0-9]{4,20}$/;

  // Animaciones simplificadas para mejor rendimiento
  const logoAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  };

  const formAnimation = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.5, delay: 0.2 },
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (username.includes("@")) {
      if (!EMAIL_REGEX.test(username)) {
        newErrors.username = "Correo institucional inválido";
      }
    } else {
      if (!USERNAME_REGEX.test(username)) {
        newErrors.username = "Usuario inválido (4-20 caracteres alfanuméricos)";
      }
    }

    if (password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Lógica de autenticación aquí
    } catch (error) {
      setErrors({ general: "Error de conexión con el servidor" });
    } finally {
      setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en la autenticación");
      }

      // Guardar token en localStorage
      localStorage.setItem("token", data.token);

      // Redirigir al dashboard o página principal
      window.location.href = "/dashboard";
    } catch (error: any) {
      let errorMessage = "Error de conexión";

      if (error.name === "AbortError") {
        errorMessage = "La solicitud tardó demasiado";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
    }
  };
}

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      ref={containerRef}
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Columna Izquierda - Información */}
        <motion.div
          {...logoAnimation}
          className="bg-blue-600 p-8 md:p-12 md:w-1/2 flex flex-col justify-center items-center text-center"
        >
          <div className="mb-8">
            <Image
              src="/uniss-logo.png"
              alt="UNISS Logo"
              width={160}
              height={160}
              className="object-contain mx-auto"
            />
          </div>
          
          <div className="space-y-4 text-white">
            <h1 className="text-3xl font-bold">Bienvenido al Sistema de Credenciales UNISS</h1>
            <p className="text-xl leading-relaxed">
              Sistema integral para la visualización de credenciales académica y vinculación de dispositivos institucionales
            </p>
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <IdentificationIcon className="h-6 w-6 text-white" />
                <span>Acceso seguro y personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <LockClosedIcon className="h-6 w-6 text-white" />
                <span>Protección de datos garantizada</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCircleIcon className="h-6 w-6 text-white" />
                <span>Simple y sencillo</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Columna Derecha - Formulario */}
        <motion.div
          {...formAnimation}
          className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center"
        >
          <AnimatePresence>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  <span className="text-blue-600">*</span> Usuario o Correo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: usuario123 o nombre@uniss.edu.cu"
                    className={`w-full p-4 text-lg border-2 ${
                      errors.username ? "border-red-500" : "border-gray-200"
                    } rounded-lg focus:ring-4 focus:ring-blue-200 focus:border-blue-500`}
                    aria-label="Ingrese su usuario o correo institucional"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-2">{errors.username}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  <span className="text-blue-600">*</span> Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full p-4 text-lg border-2 ${
                      errors.password ? "border-red-500" : "border-gray-200"
                    } rounded-lg pr-12 focus:ring-4 focus:ring-blue-200 focus:border-blue-500`}
                    aria-label="Ingrese su contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 bottom-4 text-gray-500 hover:text-blue-600"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-6 w-6" />
                    ) : (
                      <EyeIcon className="h-6 w-6" />
                    )}
                  </button>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-2">{errors.password}</p>
                  )}
                </div>
              </div>

              {errors.general && (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-red-600 text-center font-medium">
                    ⚠️ {errors.general}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="h-6 w-6 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>

              <div className="mt-8 space-y-4">
                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="text-blue-600 hover:text-blue-800 text-lg font-medium underline"
                  >
                    ¿No recuerda su contraseña?
                  </Link>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-gray-500 text-lg">o</span>
                  </div>
                </div>

                <Link
                  href="/activate-account"
                  className="w-full inline-block text-center bg-gray-100 text-gray-700 py-4 rounded-lg hover:bg-gray-200 transition-all font-semibold text-lg border-2 border-dashed border-gray-300"
                >
                  Solicitar credenciales 
                </Link>
              </div>
            </form>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}