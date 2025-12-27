"use client"

import { useState, useEffect } from "react"
import { useZxing } from "react-zxing"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, X, QrCode, LogIn, LogOut, MapPin, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface QRData {
  sucursal_id: string
  tipo: "entrada" | "salida"
  sucursal_nombre?: string
}

interface QRFichajeScannerProps {
  onQRScanned: (data: QRData) => void
  onClose: () => void
  isOpen: boolean
}

export default function QRFichajeScanner({ onQRScanned, onClose, isOpen }: QRFichajeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Tu navegador no soporta el acceso a la cámara")
          setHasPermission(false)
          setLoading(false)
          return
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          })
          stream.getTracks().forEach(track => track.stop())
          setHasPermission(true)
          setScanning(true)
        } catch (err: any) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Se necesita permiso para acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.")
            setHasPermission(false)
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No se encontró ninguna cámara en tu dispositivo")
            setHasPermission(false)
          } else {
            setError(`Error al acceder a la cámara: ${err.message}`)
            setHasPermission(false)
          }
        }
        setLoading(false)
      } catch (err) {
        setError("Error al verificar permisos de cámara")
        setHasPermission(false)
        setLoading(false)
      }
    }

    checkPermissions()
  }, [isOpen])

  const { ref } = useZxing({
    onDecodeResult(result: any) {
      if (!scanning) return
      
      try {
        const text = result?.getText ? result.getText() : String(result)
        const data = JSON.parse(text) as QRData

        // Validar estructura del QR
        if (!data.sucursal_id || !data.tipo) {
          throw new Error("QR inválido: formato incorrecto")
        }

        if (data.tipo !== "entrada" && data.tipo !== "salida") {
          throw new Error("QR inválido: tipo debe ser 'entrada' o 'salida'")
        }

        // Validar que el empleado tenga acceso a esta sucursal
        validateAndProcessQR(data)
      } catch (err: any) {
        console.error("Error procesando QR:", err)
        toast.error("QR inválido", { 
          description: err.message || "El código QR no es válido. Asegúrate de escanear el QR correcto del local." 
        })
        setScanning(false)
        setTimeout(() => setScanning(true), 2000) // Reintentar después de 2 segundos
      }
    },
    onError(err: any) {
      console.error("Error del scanner:", err)
      if (err.name !== "NotFoundError") {
        setError("Error al escanear. Intenta nuevamente.")
      }
    },
    constraints: { 
      video: { 
        facingMode: "environment",
        // iOS Safari requiere constraints más simples
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 }
      }, 
      audio: false 
    },
    // Mejorar compatibilidad con iOS
    timeBetweenDecodingAttempts: 300,
    pause: !scanning
  } as any)

  const validateAndProcessQR = async (qrData: QRData) => {
    setScanning(false)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("No hay sesión activa")
      }

      // Verificar que la sucursal existe y obtener su nombre
      const { data: sucursal, error: sucursalError } = await supabase
        .from('sucursales')
        .select('id, nombre, organization_id')
        .eq('id', qrData.sucursal_id)
        .single()

      if (sucursalError || !sucursal) {
        throw new Error("Sucursal no encontrada. El QR puede estar desactualizado.")
      }

      // Verificar que el empleado pertenece a la misma organización
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil || perfil.organization_id !== sucursal.organization_id) {
        throw new Error("No tienes acceso a esta sucursal")
      }

      // Verificar estado actual de fichaje
      const { data: asistenciaActual } = await supabase
        .from('asistencia')
        .select('id, salida')
        .eq('empleado_id', user.id)
        .eq('sucursal_id', qrData.sucursal_id)
        .is('salida', null)
        .maybeSingle()

      // Validar lógica de entrada/salida
      if (qrData.tipo === "entrada" && asistenciaActual) {
        throw new Error("Ya tienes una entrada registrada en este local. Debes fichar la salida primero.")
      }

      if (qrData.tipo === "salida" && !asistenciaActual) {
        throw new Error("No tienes una entrada registrada en este local. Debes fichar la entrada primero.")
      }

      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate(100)
      }

      // QR válido, procesar
      onQRScanned({
        ...qrData,
        sucursal_nombre: sucursal.nombre
      })
      
      onClose()
    } catch (err: any) {
      toast.error("Error al validar QR", { description: err.message })
      setScanning(true) // Reintentar
    }
  }

  if (hasPermission === false || error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative flex flex-col items-center justify-center bg-black min-h-[400px] p-6">
            <div className="text-center space-y-4 text-white">
              <AlertCircle className="h-16 w-16 mx-auto text-red-400" />
              <div>
                <p className="font-bold text-lg mb-2">No se puede acceder a la cámara</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-white text-white hover:bg-white/10"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
        <div className="relative flex flex-col items-center justify-center bg-black w-full min-h-[400px] max-h-[70vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Iniciando cámara...</p>
              </div>
            </div>
          )}
          
          <video 
            ref={ref} 
            className="w-full h-full object-cover" 
            playsInline 
            muted 
            autoPlay
            webkit-playsinline="true"
            x5-playsinline="true"
            style={{ maxHeight: "70vh" }}
          />
          
          <div className="absolute top-0 left-0 w-full h-full border-2 border-primary/50 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/80 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <QrCode className="h-16 w-16 text-white/60" />
              </div>
              <p className="absolute -top-8 w-full text-center text-white font-bold text-sm drop-shadow-md">
                Escanea el QR del local
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-50">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white text-xs font-bold text-center">
                {scanning ? "Escaneando..." : "Esperando QR..."}
              </p>
            </div>
            <Button 
              type="button" 
              variant="destructive" 
              className="rounded-full px-6 shadow-lg" 
              onClick={onClose}
            >
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

