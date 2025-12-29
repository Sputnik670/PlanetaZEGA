"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { Download, QrCode, MapPin, LogIn, LogOut, Copy, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Sucursal {
  id: string
  nombre: string
  qr_entrada_url?: string | null
  qr_salida_url?: string | null
}

export default function GenerarQRFichaje() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("")
  const [mostrarQR, setMostrarQR] = useState(false)
  const [tipoQR, setTipoQR] = useState<"entrada" | "salida">("entrada")
  const [copiado, setCopiado] = useState(false)
  const [guardando, setGuardando] = useState(false)

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

      const { data: dataSimple } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('organization_id', perfil.organization_id)
        .order('nombre')

      if (dataSimple) {
        const { data: dataWithQR, error: qrError } = await supabase
          .from('sucursales')
          .select('id, nombre, qr_entrada_url, qr_salida_url')
          .eq('organization_id', perfil.organization_id)
          .order('nombre')

        const sucursalesData: Sucursal[] = dataSimple.map(s => {
          if (!qrError && dataWithQR && Array.isArray(dataWithQR)) {
            const withQR = dataWithQR.find((sq: any) => sq.id === s.id) as any
            return {
              ...s,
              qr_entrada_url: (withQR?.qr_entrada_url as string | null) || null,
              qr_salida_url: (withQR?.qr_salida_url as string | null) || null
            }
          }
          return {
            ...s,
            qr_entrada_url: null,
            qr_salida_url: null
          }
        })

        if (sucursalesData.length > 0) {
          setSucursales(sucursalesData)
          setSucursalSeleccionada(sucursalesData[0].id)
        }
      }
    } catch (error) {
      console.error("Error cargando sucursales:", error)
    }
  }

  const generarQRData = (sucursalId: string, tipo: "entrada" | "salida") => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://tu-app.vercel.app'
    
    const params = new URLSearchParams({
      sucursal_id: sucursalId,
      tipo: tipo
    })
    
    return `${baseUrl}/fichaje?${params.toString()}`
  }

  const guardarQR = async (sucursalId: string, tipo: "entrada" | "salida", qrUrl: string) => {
    try {
      const updateData: any = {}
      if (tipo === "entrada") {
        updateData.qr_entrada_url = qrUrl
      } else {
        updateData.qr_salida_url = qrUrl
      }

      const { error } = await supabase
        .from('sucursales')
        .update(updateData)
        .eq('id', sucursalId)

      if (error) throw error
      toast.success("QR guardado", { description: "El QR quedó guardado permanentemente para este local" })
    } catch (error: any) {
      console.error("Error guardando QR:", error)
      toast.error("Error al guardar QR", { description: error.message })
    }
  }

  const descargarQR = (sucursalId: string, tipo: "entrada" | "salida", nombre: string) => {
    const svgElement = document.querySelector(`#qr-${sucursalId}-${tipo}`) as SVGSVGElement
    if (!svgElement) {
      toast.error("No se encontró el código QR")
      return
    }

    try {
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
      toast.error("Error al descargar QR")
    }
  }

  const copiarQRData = (sucursalId: string, tipo: "entrada" | "salida") => {
    const qrUrl = generarQRData(sucursalId, tipo)
    navigator.clipboard.writeText(qrUrl)
    setCopiado(true)
    toast.success("URL del QR copiada")
    setTimeout(() => setCopiado(false), 2000)
  }

  const sucursalActual = sucursales.find(s => s.id === sucursalSeleccionada)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="sucursal-fichaje-select" className="text-sm font-bold text-slate-700 uppercase mb-2 block">
            Seleccionar Sucursal
          </label>
          <select
            id="sucursal-fichaje-select"
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
            className="h-16 flex flex-col items-center gap-2 relative"
          >
            <LogIn className="h-5 w-5" />
            <span className="text-xs font-bold">QR Entrada</span>
            {sucursales.find(s => s.id === sucursalSeleccionada)?.qr_entrada_url && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            )}
          </Button>
          <Button
            onClick={() => {
              setTipoQR("salida")
              setMostrarQR(true)
            }}
            variant={tipoQR === "salida" && mostrarQR ? "default" : "outline"}
            className="h-16 flex flex-col items-center gap-2 relative"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs font-bold">QR Salida</span>
            {sucursales.find(s => s.id === sucursalSeleccionada)?.qr_salida_url && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            )}
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

            {((tipoQR === "entrada" && sucursalActual?.qr_entrada_url) || 
              (tipoQR === "salida" && sucursalActual?.qr_salida_url)) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800 font-bold">
                  ✅ Este QR ya está guardado para este local
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setGuardando(true)
                  const qrUrl = generarQRData(sucursalSeleccionada, tipoQR)
                  await guardarQR(sucursalSeleccionada, tipoQR, qrUrl)
                  await cargarSucursales()
                  setGuardando(false)
                }}
                disabled={guardando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {guardando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Guardar QR
                  </>
                )}
              </Button>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-800 font-bold">
                🔑 <strong>Llave de Acceso:</strong> Este QR funciona como una llave. Al escanearlo, el empleado podrá iniciar o finalizar su turno en este local.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800 font-bold">
                📋 <strong>Instrucciones:</strong> 
              </p>
              <ul className="text-xs text-green-700 mt-2 space-y-1 list-disc list-inside">
                <li>Imprime este QR y colócalo en el local</li>
                <li>Coloca el QR de ENTRADA en la entrada del local</li>
                <li>Coloca el QR de SALIDA en la caja o salida</li>
                <li>Los empleados escanearán el QR con su teléfono</li>
                <li>El QR abrirá la app y registrará automáticamente el fichaje</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}