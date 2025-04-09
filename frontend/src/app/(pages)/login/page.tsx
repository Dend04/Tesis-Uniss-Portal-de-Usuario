// app/login/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
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

  // Animaciones mejoradas
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

  // Validación en tiempo real
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validar si es correo o usuario
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
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

          <motion.div key="content" {...contentAnimation}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-gray-600 mb-8 text-lg"
            >
              Plataforma integral para la gestión académica y vinculación de
              dispositivos
            </motion.p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-uniss-black mb-2">
                  Acceso institucional
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario o correo institucional"
                  className={`w-full p-3 border ${
                    errors.username ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-uniss-blue focus:border-transparent`}
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-uniss-black mb-2">
                  Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-3 border ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } rounded-lg pr-10 focus:ring-2 focus:ring-uniss-blue focus:border-transparent`}
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-3 text-gray-500 hover:text-uniss-blue"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                )}
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {errors.general && (
                <p className="text-red-500 text-center text-sm">
                  {errors.general}
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
                  "Iniciar sesión"
                )}
              </button>

              <div className="flex flex-col gap-4 mt-6">
                <Link
                  href="/forgot-password"
                  className="text-sm text-uniss-blue hover:text-opacity-80 text-center"
                >
                  ¿Olvidó su contraseña?
                </Link>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500">
                      O
                    </span>
                  </div>
                </div>

                <Link
                  href="/activate-account"
                  className="w-full bg-uniss-green text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium text-center"
                >
                  Solicitar credenciales
                </Link>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
