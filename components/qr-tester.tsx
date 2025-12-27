"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, Download, QrCode, AlertCircle } from "lucide-react"
import { toast } from "sonner"

/**
 * Componente de prueba para generar QR codes de fichaje
 * Útil para testing sin necesidad de ser dueño
 */
export default function QRTester() {
  const [sucursales, setSucursales] = useState<{id: string, nombre: string}[]>([])
  const [sucursalId, setSucursalId] = useState("")
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada")
  const [qrData, setQrData] = useState("")
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    cargarSucursales()
  }, [])

  const cargarSucursales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil?.organization_id) return

      const { data } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('organization_id', perfil.organization_id)
        .order('nombre')

      if (data) {
        setSucursales(data)
        if (data.length > 0) {
          setSucursalId(data[0].id)
          generarQR(data[0].id, "entrada")
        }
      }
    } catch (error) {
      console.error("Error cargando sucursales:", error)
      toast.error("Error al cargar sucursales")
    }
  }

  const generarQR = (sucId: string, tipoQR: "entrada" | "salida") => {
    const data = JSON.stringify({
      sucursal_id: sucId,
      tipo: tipoQR
    })
    setQrData(data)
  }

  useEffect(() => {
    if (sucursalId) {
      generarQR(sucursalId, tipo)
    }
  }, [sucursalId, tipo])

  const copiarQRData = () => {
    navigator.clipboard.writeText(qrData)
    setCopiado(true)
    toast.success("Código QR copiado", { description: "Puedes usarlo para generar un QR en cualquier herramienta" })
    setTimeout(() => setCopiado(false), 2000)
  }

  const descargarQR = () => {
    const canvas = document.getElementById('qr-tester') as HTMLCanvasElement
    if (!canvas) return

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `QR-${tipo}-${sucursales.find(s => s.id === sucursalId)?.nombre.replace(/\s+/g, '-') || 'sucursal'}.png`
    link.href = url
    link.click()
  }

  return (
    <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-black text-slate-800 uppercase">
          🧪 Generador de QR de Prueba
        </h3>
      </div>
      
      <p className="text-sm text-slate-600 mb-6">
        Esta herramienta te permite generar QR codes de prueba para testing. 
        Úsala para probar el sistema de fichaje sin necesidad de ser dueño.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-bold text-slate-700 mb-2 block">
            Seleccionar Sucursal
          </Label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
          >
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-sm font-bold text-slate-700 mb-2 block">
            Tipo de QR
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setTipo("entrada")}
              variant={tipo === "entrada" ? "default" : "outline"}
              className="h-12"
            >
              Entrada
            </Button>
            <Button
              onClick={() => setTipo("salida")}
              variant={tipo === "salida" ? "default" : "outline"}
              className="h-12"
            >
              Salida
            </Button>
          </div>
        </div>

        {qrData && (
          <div className="space-y-4">
            <div className="flex justify-center bg-white p-6 rounded-xl border-2 border-slate-100">
              <QRCodeSVG
                id="qr-tester"
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
              <Label className="text-xs font-bold text-slate-600 mb-2 block">
                Datos del QR (JSON):
              </Label>
              <code className="text-xs font-mono text-slate-800 break-all block">
                {qrData}
              </code>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copiarQRData}
                variant="outline"
                className="flex-1"
              >
                {copiado ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </>
                )}
              </Button>
              <Button
                onClick={descargarQR}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar QR
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800 font-bold">
                💡 <strong>Instrucciones:</strong>
              </p>
              <ul className="text-xs text-yellow-700 mt-2 space-y-1 ml-4 list-disc">
                <li>Puedes escanear este QR directamente desde la pantalla</li>
                <li>O descargarlo e imprimirlo para pruebas más realistas</li>
                <li>O copiar el JSON y generar un QR en otra herramienta</li>
              </ul>
            </div>
          </div>
        )}

        {sucursales.length === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-800 font-bold">
              No se encontraron sucursales. Asegúrate de tener al menos una sucursal creada.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

