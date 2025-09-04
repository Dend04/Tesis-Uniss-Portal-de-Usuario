// src/app/components/activate-account//VerificationSuccess.tsx
import { IdentityVerificationResponse } from "@/app/(pages)/activate-account/page";

interface VerificationSuccessProps {
  result: IdentityVerificationResponse;
  onBack: () => void;
  onContinue: () => void;
}
export default function VerificationSuccess({ result, onBack, onContinue }: VerificationSuccessProps) {
  return (
    <div className="px-8 pb-8">
      <div className="text-center mt-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Verificación Exitosa!
        </h2>
        <p className="text-gray-600">
          Su identidad ha sido verificada correctamente.
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Información del Usuario
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Nombre:</span>
            <span className="text-gray-800">{result.fullName}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">CI:</span>
            <span className="text-gray-800">{result.ci}</span>
          </div>
          {result.type === "student" ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Carrera:</span>
                <span className="text-gray-800 text-right max-w-xs">{result.career}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Facultad:</span>
                <span className="text-gray-800 text-right max-w-xs">{result.faculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Año Académico:</span>
                <span className="text-gray-800">{result.academicYear}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Departamento:</span>
              <span className="text-gray-800 text-right max-w-xs">{result.department}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Volver
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center shadow-md hover:shadow-lg"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}