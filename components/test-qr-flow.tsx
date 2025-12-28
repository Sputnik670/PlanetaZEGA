"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, TestTube, ExternalLink } from "lucide-react"
import { toast } from "sonner"

/**
 * Componente de TEST para verificar el flujo completo de QR Fichaje
 *
 * USO:
 * 1. Importar en dashboard-dueno.tsx o vista-empleado.tsx (solo en development)
 * 2. Renderizar: {process.env.NODE_ENV === 'development' && <TestQRFlow />}
 * 3. Usar para generar QR de prueba rápidamente
 */

export default function TestQRFlow() {
  const [sucursalId, setSucursalId] = useState("test-sucursal-123")
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada")
  const [copiado, setCopiado] = useState(false)

  const generarURL = () => {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000'
    return `${baseUrl}/fichaje?sucursal_id=${sucursalId}&tipo=${tipo}`
  }

  const copiarURL = () => {
    const url = generarURL()
    navigator.clipboard.writeText(url)
    setCopiado(true)
    toast.success("URL copiada", { description: "Pégala en el navegador para probar" })
    setTimeout(() => setCopiado(false), 2000)
  }

  const abrirEnNavegador = () => {
    const url = generarURL()
    window.open(url, '_blank')
  }

  return (
    <Card className="p-6 border-4 border-purple-500 bg-purple-50">
      <div className="flex items-center gap-2 mb-4">
        <TestTube className="h-5 w-5 text-purple-600" />
        <h3 className="font-black text-purple-900 uppercase">Test QR Flow</h3>
        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-bold">
          SOLO DESARROLLO
        </span>
      </div>

      <div className="space-y-4">
        {/* Input de Sucursal ID */}
        <div>
          <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">
            Sucursal ID (UUID o Test)
          </label>
          <Input
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            className="font-mono text-sm"
          />
          <p className="text-xs text-purple-600 mt-1">
            💡 Tip: Usa un ID de sucursal real de tu BD o deja el de prueba
          </p>
        </div>

        {/* Selector de Tipo */}
        <div>
          <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">
            Tipo de Fichaje
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => setTipo("entrada")}
              variant={tipo === "entrada" ? "default" : "outline"}
              className="flex-1"
              size="sm"
            >
              Entrada
            </Button>
            <Button
              onClick={() => setTipo("salida")}
              variant={tipo === "salida" ? "default" : "outline"}
              className="flex-1"
              size="sm"
            >
              Salida
            </Button>
          </div>
        </div>

        {/* URL Generada */}
        <div>
          <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">
            URL Generada
          </label>
          <div className="bg-white p-2 rounded border border-purple-200">
            <code className="text-xs break-all text-purple-900">
              {generarURL()}
            </code>
          </div>
        </div>

        {/* QR Preview */}
        <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-purple-200">
          <QRCodeSVG
            value={generarURL()}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2">
          <Button
            onClick={copiarURL}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            {copiado ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar URL
              </>
            )}
          </Button>
          <Button
            onClick={abrirEnNavegador}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir
          </Button>
        </div>

        {/* Instrucciones */}
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
          <p className="text-xs font-bold text-purple-900 mb-2">
            📋 Cómo probar:
          </p>
          <ol className="text-xs text-purple-800 space-y-1 list-decimal list-inside">
            <li>Asegúrate de estar logueado como empleado</li>
            <li>Click en "Copiar URL" o "Abrir"</li>
            <li>Pega la URL en el navegador (si copiaste)</li>
            <li>Verifica que procesa el fichaje correctamente</li>
            <li>O usa el scanner QR con este código visual</li>
          </ol>
        </div>

        {/* Verificación */}
        <div className="bg-green-100 border border-green-300 rounded-lg p-3">
          <p className="text-xs font-bold text-green-900 mb-2">
            ✅ Verificación esperada:
          </p>
          <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
            <li>Redirige a /fichaje con parámetros correctos</li>
            <li>Muestra "Procesando fichaje..."</li>
            <li>Luego "Entrada/Salida Registrada"</li>
            <li>Redirige a app principal</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
