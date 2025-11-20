// src/app/components/activate-account/CodeOfEthics.tsx
"use client";
import { useState, useRef, useEffect } from "react";

interface CodeOfEthicsProps {
  onAccept: () => void;
  onBack: () => void;
}

export default function CodeOfEthics({ onAccept, onBack }: CodeOfEthicsProps) {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const element = contentRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
      setIsScrolledToBottom(isAtBottom);
    }
  };

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="px-8 pb-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mt-6 mb-2">
        Código de Ética
      </h1>
      <p className="text-center text-gray-600 mb-6">
        Por favor, lea atentamente el Código de Ética antes de continuar
      </p>
      
      <div 
        ref={contentRef}
        className="h-96 overflow-y-auto p-4 border border-gray-300 rounded-lg bg-white text-gray-800 mb-4"
      >
        <div className="space-y-4 text-sm">
          <div className="text-center">
            <h2 className="text-lg font-bold">CÓDIGO DE ÉTICA</h2>
            <h3 className="text-md font-semibold">Compromisos para el uso de las Tecnologías de la Información</h3>
            <p className="font-medium">Universidad de Sancti Spíritus "José Martí Pérez"</p>
          </div>

          <p>
            Las Redes Tecnológicas de la Universidad de Sancti Spíritus "José Martí Pérez" se establecieron con el objetivo de
            garantizar y fomentar el intercambio de información entre las diferentes áreas universitarias en todas las esferas:
            científica, educacional, administrativa y social.
          </p>

          <p>
            Es en función de la consecución de estos objetivos, y con el ánimo de garantizar el uso apropiado de las mencionadas
            tecnologías, que se establece el presente Código de Ética de estricto cumplimiento por todos los
            usuarios de la Red.
          </p>

          <div className="space-y-3">
            <p><strong>Compromisos:</strong></p>
            
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Preservar el patrimonio de la Universidad de Sancti Spíritus "José Martí Pérez" que se considera como toda aquella información, códigos de programas, programas, resultados de investigación, patente, equipos, componentes, servicios o cualquier otro contenido o estructura que se genere a través de recursos de la Universidad, en la Universidad o en representación de ella en Cuba o cualquier país del mundo.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No brindar sin autorización ningún servicio a la comunidad universitaria desde las estaciones de trabajo a las que tengo acceso, sabiendo que estos solo se podrán configurar en los servidores establecidos por la entidad encargada de su administración.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Hacer uso de las Tecnologías de la Información en interés de sus funciones en la Universidad.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ser responsable por el uso de las cuentas o niveles de acceso a las tecnologías y sus servicios y velar por el cumplimiento de las políticas establecidas para la gestión de identificadores y claves de acceso.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Utilizar solamente los servicios establecidos y de la forma en que los mismos han sido configurados.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No utilizar el correo electrónico, Internet u otros servicios de red para transmitir, acceder, o difundir información pornográfica, terrorista, contrarrevolucionaria, o en general con fines lesivos a los intereses de la sociedad, la Institución, la Revolución o de terceros.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No utilizar las posibilidades que brindan las tecnologías de la información con fines lucrativos, ilícitos o de carácter personal.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No utilizar páginas webs "Proxy" o software malicioso o de encriptación "spyware, malware, VPN", que transgredan la seguridad de la RedUniss.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No identificarse ante otras Instituciones para recibir servicios a nombre de la Universidad sin una autorización expresa para ello.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No se debe realizar cualquier tipo de ataque a la seguridad informática de sistemas locales o remotos, así como el envío o reenvío de mensajes masivos con información intrascendente, de supuestas alertas, cartas cadenas, etc.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No utilizar servidores de correo electrónico en el exterior de nuestro país sin previa autorización.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No enviar a través de Internet o del correo electrónico documentos clasificados, limitados o que se constituyan como patrimonio de la Universidad.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>No descargar programas ejecutables existentes en Internet sin una autorización expresa para ello.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Cumplir las políticas establecidas en la Universidad para la protección antivirus, así como para la recepción y envío de ficheros anexos a mensajes de correo electrónico.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Informar de inmediato a la persona designada sobre cualquier acción que atente contra las regulaciones establecidas.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Colaborar abiertamente con las autoridades pertinentes ante casos investigativos.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los usuarios que posean computadoras portátiles deben llenar un modelo de solicitud de entrada, el cual será aprobado por los responsables facultados en dicho documento. En caso de violaciones del Código de Ética, la institución estará en el derecho de retener el portátil para su revisión o inspección rutinaria.</span>
            </div>

            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Acatar las orientaciones que emita el Departamento de Redes, así como el Grupo de Seguridad Informática en aras del buen funcionamiento de la misma.</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-semibold text-yellow-800">
              Las cuentas que les son asignadas a los usuarios de la red, serán auditadas con vistas a verificar el cumplimiento de los compromisos contraídos.
            </p>
            <p className="font-semibold text-yellow-800 mt-2">
              La Universidad se reserva la facultad de sancionar a los usuarios que incumplan con las normas para la seguridad de la red.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
        >
          Atrás
        </button>
        
        <button
          type="button"
          onClick={onAccept}
          disabled={!isScrolledToBottom}
          className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Aceptar Código de Ética y Continuar
        </button>
      </div>

      {!isScrolledToBottom && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Por favor, lea todo el documento hasta el final para poder continuar
          </p>
        </div>
      )}
    </div>
  );
}