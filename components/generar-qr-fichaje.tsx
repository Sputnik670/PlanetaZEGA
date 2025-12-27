"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { Download, QrCode, MapPin, LogIn, LogOut, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Sucursal {
  id: string
  nombre: string
}

export default function GenerarQRFichaje() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("")
  const [mostrarQR, setMostrarQR] = useState(false)
  const [tipoQR, setTipoQR] = useState<"entrada" | "salida">("entrada")
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
          setSucursalSeleccionada(data[0].id)
        }
      }
    } catch (error) {
      console.error("Error cargando sucursales:", error)
    }
  }

  const generarQRData = (sucursalId: string, tipo: "entrada" | "salida") => {
    return JSON.stringify({
      sucursal_id: sucursalId,
      tipo: tipo
    })
  }

  const descargarQR = (sucursalId: string, tipo: "entrada" | "salida", nombre: string) => {
    const qrData = generarQRData(sucursalId, tipo)
    
    // Para iOS, necesitamos convertir SVG a imagen
    const svgElement = document.querySelector(`#qr-${sucursalId}-${tipo}`) as SVGSVGElement
    if (!svgElement) {
      toast.error("No se encontró el código QR")
      return
    }

    try {
      // Convertir SVG a canvas para mejor compatibilidad
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = `QR-${tipo}-${nombre.replace(/\s+/g, '-')}.png`
            
            // Para iOS, abrir en nueva ventana si no funciona el download
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
              window.open(downloadUrl, '_blank')
              toast.info("QR abierto en nueva ventana", { description: "Guarda la imagen desde ahí" })
            } else {
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              toast.success("QR descargado")
            }
            
            URL.revokeObjectURL(downloadUrl)
          }
        }, 'image/png')
        URL.revokeObjectURL(url)
      }
      
      img.src = url
    } catch (error) {
      console.error("Error descargando QR:", error)
      toast.error("Error al descargar QR", { description: "Intenta copiar el JSON y usar qr.io" })
    }
  }

  const copiarQRData = (sucursalId: string, tipo: "entrada" | "salida") => {
    const qrData = generarQRData(sucursalId, tipo)
    navigator.clipboard.writeText(qrData)
    setCopiado(true)
    toast.success("Código QR copiado", { description: "Puedes compartirlo o guardarlo" })
    setTimeout(() => setCopiado(false), 2000)
  }

  const sucursalActual = sucursales.find(s => s.id === sucursalSeleccionada)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">
            Seleccionar Sucursal
          </label>
          <select
            value={sucursalSeleccionada}
            onChange={(e) => {
              setSucursalSeleccionada(e.target.value)
              setMostrarQR(false)
            }}
            className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
          >
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              setTipoQR("entrada")
              setMostrarQR(true)
            }}
            variant={tipoQR === "entrada" && mostrarQR ? "default" : "outline"}
            className="h-16 flex flex-col items-center gap-2"
          >
            <LogIn className="h-5 w-5" />
            <span className="text-xs font-bold">QR Entrada</span>
          </Button>
          <Button
            onClick={() => {
              setTipoQR("salida")
              setMostrarQR(true)
            }}
            variant={tipoQR === "salida" && mostrarQR ? "default" : "outline"}
            className="h-16 flex flex-col items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs font-bold">QR Salida</span>
          </Button>
        </div>
      </div>

      {mostrarQR && sucursalActual && (
        <Card className="p-6 border-2">
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <h3 className="font-black text-slate-800 uppercase text-sm">
                  {sucursalActual.nombre}
                </h3>
              </div>
              <div className="flex items-center justify-center gap-2">
                {tipoQR === "entrada" ? (
                  <LogIn className="h-4 w-4 text-blue-600" />
                ) : (
                  <LogOut className="h-4 w-4 text-red-600" />
                )}
                <p className="text-xs font-bold text-slate-500 uppercase">
                  QR de {tipoQR === "entrada" ? "ENTRADA" : "SALIDA"}
                </p>
              </div>
            </div>

            <div className="flex justify-center bg-white p-6 rounded-xl border-2 border-slate-100">
              <QRCodeSVG
                id={`qr-${sucursalSeleccionada}-${tipoQR}`}
                value={generarQRData(sucursalSeleccionada, tipoQR)}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => descargarQR(sucursalSeleccionada, tipoQR, sucursalActual.nombre)}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button
                onClick={() => copiarQRData(sucursalSeleccionada, tipoQR)}
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
                    Copiar
                  </>
                )}
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-yellow-800 font-bold">
                💡 <strong>iOS:</strong> Si la descarga no funciona, copia el JSON arriba y usa <a href="https://qr.io/es/" target="_blank" rel="noopener noreferrer" className="underline text-yellow-900">qr.io</a> para generar el QR
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-bold">
                💡 <strong>Instrucciones:</strong> Imprime este QR y colócalo en el local. 
                Los empleados deberán escanearlo para fichar su entrada o salida.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

