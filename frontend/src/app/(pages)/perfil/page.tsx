"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/app/components/ProgressBar";
import StudentProfile from "@/app/components/perfil/StudentProfile";
import EmployeeProfile from "@/app/components/perfil/EmployeeProfile";
import Header from "@/app/components/Header";
import { useDarkModeContext } from "@/app/contexts/DarkModeContext";

interface StudentData {
  personalData: {
    fullName: string;
    identification: string;
    birthDate: string;
    address: string;
    contact: string;
    origin: string;
  };
  academicData: {
    faculty: string;
    career: string;
    year: string;
    status: string;
    academicIndex: string;
  };
  familyData: {
    mother: string;
    father: string;
  };
}

interface EmployeeData {
  Id_Empleado: string;
  Id_Cargo: string;
  department: string;
  Nombre: string;
  Apellido_1: string;
  Apellido_2: string;
  cargoDescription?: string;
  Id_Tipo_Contrato?: string;
  Regimen_Salarial?: number;
  Fecha_Contratacion?: any;
  Id_Profesion?: string;
  Id_Nivel_Escolaridad?: string;
  Ano_Alta?: number;
  profesionDescription?: string;
  municipioDescription?: string;
}

// Función para decodificar el token JWT
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decodificando token:", error);
    return null;
  }
};

// Función para obtener los datos del usuario desde el token
const getUserDataFromToken = () => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("authToken");
  if (!token) return null;

  const decoded = decodeToken(token);
  if (!decoded) return null;

  return {
    employeeID: decoded.employeeID,
    username: decoded.sAMAccountName,
    displayName: decoded.displayName || decoded.nombreCompleto,
    title: decoded.title,
  };
};

// Función para formatear fecha
const formatDate = (date: any): string => {
  if (!date || typeof date !== "object") return "No disponible";
  try {
    if (date.year && date.month && date.day) {
      return `${date.day}/${date.month}/${date.year}`;
    }
    return "No disponible";
  } catch {
    return "No disponible";
  }
};

// Función para obtener año de contratación
const getAnoContratacion = (
  fechaContratacion: any,
  anoAlta?: number
): string => {
  const fechaFormateada = formatDate(fechaContratacion);
  if (fechaFormateada !== "No disponible") {
    const yearMatch = fechaFormateada.match(/\d{4}/);
    if (yearMatch) {
      return yearMatch[0];
    }
  }

  if (anoAlta) {
    return anoAlta.toString();
  }

  return "No disponible";
};

// Función para formatear el tipo de contrato
const formatTipoContrato = (tipo?: string): string => {
  if (!tipo) return "No disponible";

  const contratos: { [key: string]: string } = {
    "5": "Contrato Indefinido",
    "1": "Contrato Temporal",
    "2": "Contrato Por Obra",
    "3": "Contrato de Práctica",
    "4": "Contrato de Formación",
  };
  const tipoLimpio = tipo.trim();
  return contratos[tipoLimpio] || `Contrato ${tipoLimpio}`;
};

// Función para formatear régimen salarial
const formatRegimenSalarial = (regimen?: number): string => {
  if (regimen === undefined || regimen === null) return "No disponible";

  const regimenes: { [key: number]: string } = {
    1: "Régimen General",
    2: "Régimen Especial",
    3: "Régimen Contractual",
  };
  return regimenes[regimen] || `Régimen ${regimen}`;
};

// Función para formatear descripción de profesión
const formatProfesionDescription = (profesion?: string): string => {
  if (!profesion) return "No disponible";

  const profesionLimpia = profesion.trim();

  const reemplazos: { [key: string]: string } = {
    TM: "Técnico Medio en",
    Ing: "Ingeniero",
    "Ing.": "Ingeniero",
    Lic: "Licenciado en",
    "Lic.": "Licenciado en",
    LIc: "Licenciado en",
    "LIc.": "Licenciado en",
    Dr: "Doctor",
    "Dr.": "Doctor",
    Dra: "Doctora",
    "Dra.": "Doctora",
    MSc: "Máster en Ciencias",
    "MSc.": "Máster en Ciencias",
    PhD: "Doctor en Filosofía",
    "PhD.": "Doctor en Filosofía",
  };

  let resultado = profesionLimpia;

  Object.keys(reemplazos).forEach((abreviatura) => {
    const regex = new RegExp(`^${abreviatura}\\s+`, "i");
    if (regex.test(resultado)) {
      resultado = resultado.replace(regex, reemplazos[abreviatura] + " ");
    }

    const regexPalabra = new RegExp(`\\b${abreviatura}\\b`, "gi");
    resultado = resultado.replace(regexPalabra, reemplazos[abreviatura]);
  });

  return resultado || "No disponible";
};

// Función para formatear número de teléfono
const formatPhoneNumber = (phone: string) => {
  if (!phone) return "No disponible";
  const cleaned = phone.replace(/\D/g, "");
  return `+53 ${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(
    7
  )}`;
};

export default function ProfilePage() {
  const { isDarkMode } = useDarkModeContext();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const router = useRouter();
  const [loadingStudent, setLoadingStudent] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ✅ OBTENER ESTADOS DESDE LOCALSTORAGE
  const dobleOcupacion =
    typeof window !== "undefined"
      ? localStorage.getItem("dobleOcupacion") === "true"
      : false;

  useEffect(() => {
    setIsMounted(true);

    const userDataFromToken = getUserDataFromToken();
    setUserData(userDataFromToken);

    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    if (!userDataFromToken?.employeeID) {
      setError("No se encontró el número de carnet (employeeID) en el token");
      return;
    }

    const fetchData = async () => {
      let progressInterval: NodeJS.Timeout | null = null;

      try {
        const employeeID = userDataFromToken.employeeID;
        const userTitle = userDataFromToken.title; // ✅ OBTENER TÍTULO DEL TOKEN

        console.log("📋 Datos del usuario:", {
          employeeID,
          userTitle,
          dobleOcupacion,
        });

        progressInterval = setInterval(() => {
          setLoadingProgress((prev) => Math.min(prev + 10, 90));
        }, 500);

        // ✅ DETERMINAR QUÉ DATOS CARGAR
        const isEstudiante = userTitle?.toLowerCase() === "estudiante";
        const shouldLoadStudent = isEstudiante || dobleOcupacion;
        const shouldLoadEmployee = !isEstudiante || dobleOcupacion;

        console.log("🎯 Carga de datos:", {
          shouldLoadStudent,
          shouldLoadEmployee,
          isEstudiante,
          dobleOcupacion,
        });

        // Cargar datos del estudiante si corresponde
        if (shouldLoadStudent) {
          setLoadingStudent(true);
          try {

            const studentRes = await fetch(`${API_URL}/students/${employeeID}`);

            if (studentRes.ok) {
              const studentData = await studentRes.json();
              if (studentData.success) {
                setStudent(studentData.data);
                console.log("✅ Datos del estudiante cargados");
              } else {
                console.warn("⚠️ No se encontraron datos del estudiante");
              }
            } else if (studentRes.status === 404) {
              console.warn("⚠️ Estudiante no encontrado");
            } else {
              console.error("❌ Error cargando estudiante:", studentRes.status);
            }
          } catch (err) {
            console.error("Error cargando datos del estudiante:", err);
          } finally {
            setLoadingStudent(false);
          }
        }

        // Cargar datos del empleado si corresponde
        if (shouldLoadEmployee) {
          setLoadingEmployee(true);
          try {
            const employeeRes = await fetch(`${API_URL}/verify/dual-status`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (employeeRes.ok) {
              const employeeData = await employeeRes.json();
              if (employeeData.success && employeeData.data.employeeData) {
                const empData = employeeData.data.employeeData;

                setEmployee({
                  Id_Empleado: empData.Id_Empleado?.trim() || "No disponible",
                  Id_Cargo: empData.Id_Cargo?.trim() || "No disponible",
                  department: empData.department || "No disponible",
                  Nombre: empData.Nombre || "",
                  Apellido_1: empData.Apellido_1 || "",
                  Apellido_2: empData.Apellido_2 || "",
                  cargoDescription:
                    empData.cargoDescription || "Cargo no disponible",
                  Id_Tipo_Contrato: empData.Id_Tipo_Contrato,
                  Regimen_Salarial: empData.Regimen_Salarial,
                  Fecha_Contratacion: empData.Fecha_Contratacion,
                  Id_Profesion: empData.Id_Profesion,
                  Id_Nivel_Escolaridad: empData.Id_Nivel_Escolaridad,
                  Ano_Alta: empData.Ano_Alta,
                  profesionDescription: empData.profesionDescription,
                  municipioDescription: empData.municipioDescription,
                });
              }
            } else {
              console.error("❌ Error cargando empleado:", employeeRes.status);
            }
          } catch (err) {
            console.error("Error cargando datos del empleado:", err);
          } finally {
            setLoadingEmployee(false);
          }
        }

        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setLoadingProgress(100);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setTimeout(() => setLoadingProgress(0), 500);
      }
    };

    if (userDataFromToken?.employeeID) {
      fetchData();
    }
  }, [API_URL, router, dobleOcupacion]);

  // ✅ DETERMINAR QUÉ MOSTRAR BASADO EN TÍTULO Y DOBLE OCUPACIÓN
  const getContentToShow = () => {
    if (!userData) return { showStudent: false, showEmployee: false };

    const userTitle = userData.title?.toLowerCase();
    const isEstudiante = userTitle === "estudiante";

    return {
      showStudent: isEstudiante || dobleOcupacion,
      showEmployee: !isEstudiante || dobleOcupacion,
    };
  };

  const { showStudent, showEmployee } = getContentToShow();

  if (!isMounted) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="flex justify-center items-center min-h-screen">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-4 ${isDarkMode ? "border-blue-400" : "border-blue-500"}`}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 text-center">
          <div className={`${isDarkMode ? "bg-red-900/50 border-red-700 text-red-300" : "bg-red-100 border-red-400 text-red-700"} border px-4 py-3 rounded mb-4`}>
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <div className={`mb-4 p-4 ${isDarkMode ? "bg-yellow-900/30 border-yellow-700 text-yellow-300" : "bg-yellow-100 border-yellow-400 text-yellow-700"} border rounded`}>
            <p>
              <strong>Información del usuario:</strong>
              <br />
              EmployeeID: {userData?.employeeID || "No disponible"}
              <br />
              Título: {userData?.title || "No disponible"}
              <br />
              Usuario: {userData?.username || "No disponible"}
              <br />
              Nombre: {userData?.displayName || "No disponible"}
              <br />
              Doble ocupación: {dobleOcupacion ? "Sí" : "No"}
              <br />
              Mostrar estudiante: {showStudent ? "Sí" : "No"}
              <br />
              Mostrar empleado: {showEmployee ? "Sí" : "No"}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-uniss-blue text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className={`ml-4 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-500 hover:bg-gray-700"} text-white px-4 py-2 rounded transition`}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header />
      
      <div className="max-w-6xl mx-auto py-8 px-4">
        {!student && !employee ? (
          <div className="text-center">
            <ProgressBar percentage={loadingProgress} darkMode={isDarkMode} />
            <div className={`mt-4 text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Cargando información del perfil...
            </div>
            {userData?.employeeID && (
              <div className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Consultando datos para: {userData.employeeID}
              </div>
            )}
            <div className={`mt-2 text-sm font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
              Título: {userData?.title || "No disponible"}
            </div>
            {dobleOcupacion && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                ⚡ Usuario con doble ocupación
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* ✅ MOSTRAR ESTUDIANTE SI CORRESPONDE */}
            {showStudent &&
              (student ? (
                <StudentProfile
                  student={student}
                  employeeID={userData?.employeeID || ""}
                  isTrabajador={dobleOcupacion}
                  formatPhoneNumber={formatPhoneNumber}
                  loadingStudent={loadingStudent}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div className={`text-center py-8 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {loadingStudent
                    ? "Cargando datos del estudiante..."
                    : "No hay datos del estudiante disponibles."}
                </div>
              ))}

            {/* ✅ MOSTRAR EMPLEADO SI CORRESPONDE */}
            {showEmployee && (
              <EmployeeProfile
                employee={employee}
                loadingEmployee={loadingEmployee}
                formatTipoContrato={formatTipoContrato}
                formatRegimenSalarial={formatRegimenSalarial}
                getAnoContratacion={getAnoContratacion}
                formatProfesionDescription={formatProfesionDescription}
                isDarkMode={isDarkMode}
              />
            )}

            {/* ✅ INDICADORES DE CARGA */}
            {(loadingStudent || loadingEmployee) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className={`rounded-2xl p-8 max-w-md mx-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center justify-center mb-4">
                    <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDarkMode ? "border-green-400" : "border-green-500"}`}></div>
                  </div>
                  <p className={`text-center text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                    {loadingStudent && loadingEmployee
                      ? "Cargando información completa..."
                      : loadingStudent
                      ? "Cargando información del estudiante..."
                      : "Cargando información laboral..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}