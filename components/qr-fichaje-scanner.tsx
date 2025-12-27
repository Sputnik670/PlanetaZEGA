"use client"

import { useState, useEffect, useRef } from "react"
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processedQRRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)

  // Limpiar stream al cerrar y resetear refs
  useEffect(() => {
    if (!isOpen && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Resetear refs cuando se abre el scanner
    if (isOpen) {
      processedQRRef.current = null
      isProcessingRef.current = false
    }
  }, [isOpen])

  // Inicializar cámara cuando se abre el dialog
  useEffect(() => {
    if (!isOpen) {
      setLoading(true)
      setError(null)
      setHasPermission(null)
      setScanning(false)
      return
    }

    // iOS Safari requiere que el video esté visible y montado
    // Esperamos a que el Dialog esté completamente renderizado
    const initCamera = async () => {
      try {
        setLoading(true)
        setError(null)

        // Verificar soporte
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Tu navegador no soporta el acceso a la cámara")
        }

        // Esperar un momento para que el video esté en el DOM (crítico para iOS)
        await new Promise(resolve => setTimeout(resolve, 500))

        // Verificar que el video esté montado
        if (!videoRef.current) {
          throw new Error("Video element no está disponible")
        }

        // Solicitar permisos con constraints simples para iOS
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        // Asignar stream al video manualmente (importante para iOS)
        const video = videoRef.current
        if (!video) {
          throw new Error("Video element no está disponible")
        }
        
        video.srcObject = stream
        console.log("📹 Stream asignado al video")
        
        // Esperar a que el video esté listo antes de reproducir
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            console.log("✅ Video metadata cargada")
            resolve()
          }
          video.addEventListener('loadedmetadata', handleLoadedMetadata)
          
          // Si ya tiene metadata, resolver inmediatamente
          if (video.readyState >= 2) {
            handleLoadedMetadata()
          }
        })

        // Reproducir el video
        try {
          await video.play()
          console.log("▶️ Video reproduciéndose correctamente")
        } catch (playError: any) {
          console.error("⚠️ Error al reproducir video:", playError)
          // Continuar de todas formas, el video puede reproducirse automáticamente
        }

        // Asegurar que useZxing esté conectado al video
        if (typeof zxingRef === 'function') {
          zxingRef(video)
        } else if (zxingRef && typeof zxingRef === 'object' && 'current' in zxingRef) {
          (zxingRef as React.MutableRefObject<HTMLVideoElement | null>).current = video
        }
        console.log("✅ useZxing conectado al video")

        setHasPermission(true)
        setScanning(true)
        setLoading(false)
      } catch (err: any) {
        console.error("Error inicializando cámara:", err)
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Se necesita permiso para acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.")
          setHasPermission(false)
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("No se encontró ninguna cámara en tu dispositivo")
          setHasPermission(false)
        } else {
          setError(`Error al acceder a la cámara: ${err.message || "Intenta nuevamente"}`)
          setHasPermission(false)
        }
        setLoading(false)
      }
    }

    initCamera()
  }, [isOpen])

  const { ref: zxingRef } = useZxing({
    onDecodeResult(result: any) {
      console.log("🎯 onDecodeResult llamado", { scanning, isOpen, isProcessing: isProcessingRef.current })
      
      if (!scanning || !isOpen || isProcessingRef.current) {
        console.log("⚠️ Condiciones no cumplidas, ignorando")
        return
      }
      
      try {
        const text = result?.getText ? result.getText() : String(result)
        
        console.log("🔍 QR detectado:", text.substring(0, 100)) // Log para depuración
        
        // Mostrar feedback visual en móvil
        toast.info("QR detectado", { 
          description: `Procesando: ${text.substring(0, 50)}...`,
          duration: 2000
        })
        
        // Evitar procesar el mismo QR múltiples veces
        if (processedQRRef.current === text) {
          console.log("⚠️ QR ya procesado, ignorando")
          toast.warning("QR ya procesado", { description: "Esperando nuevo escaneo..." })
          return
        }
        
        // Marcar como procesando inmediatamente
        isProcessingRef.current = true
        processedQRRef.current = text
        
        // Verificar si es una URL (absoluta o relativa con /fichaje)
        const isUrl = text.startsWith('http://') || 
                     text.startsWith('https://') || 
                     text.startsWith('/fichaje') ||
                     (text.includes('/fichaje') && text.includes('sucursal_id'))
        
        // Si es URL, redirigir INMEDIATAMENTE sin validar
        if (isUrl) {
          console.log("✅ URL detectada, redirigiendo...")
          
          // Construir URL completa si es relativa
          let redirectUrl = text
          if (text.startsWith('/fichaje')) {
            redirectUrl = `${window.location.origin}${text}`
          } else if (text.includes('/fichaje') && !text.startsWith('http')) {
            redirectUrl = `${window.location.origin}${text.startsWith('/') ? '' : '/'}${text}`
          }
          
          console.log("🚀 Redirigiendo a:", redirectUrl)
          
          // Mostrar feedback visual antes de redirigir
          toast.success("Redirigiendo...", { 
            description: "Procesando fichaje",
            duration: 1000
          })
          
          // Detener TODO inmediatamente
          setScanning(false)
          
          // Detener el stream de video PRIMERO
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          
          // Cerrar el dialog
          onClose()
          
          // Redirigir inmediatamente (sin delay)
          window.location.href = redirectUrl
          return
        }
        
        // Intentar parsear como URL primero (nuevo formato)
        let data: QRData | null = null
        
        try {
          const url = new URL(text)
          if (url.pathname === '/fichaje') {
            const params = new URLSearchParams(url.search)
            data = {
              sucursal_id: params.get('sucursal_id') || '',
              tipo: (params.get('tipo') as "entrada" | "salida") || "entrada"
            }
          }
        } catch {
          // Si no es URL, intentar parsear como JSON (formato antiguo)
          try {
            data = JSON.parse(text) as QRData
          } catch {
            isProcessingRef.current = false
            throw new Error("QR inválido: formato no reconocido")
          }
        }

        // Validar estructura del QR
        if (!data || !data.sucursal_id || !data.tipo) {
          isProcessingRef.current = false
          throw new Error("QR inválido: faltan datos requeridos")
        }

        if (data.tipo !== "entrada" && data.tipo !== "salida") {
          isProcessingRef.current = false
          throw new Error("QR inválido: tipo debe ser 'entrada' o 'salida'")
        }

        // Si es JSON (formato antiguo), procesar directamente
        validateAndProcessQR(data)
      } catch (err: any) {
        console.error("❌ Error procesando QR:", err)
        isProcessingRef.current = false
        
        // Solo mostrar error si no es un error de parsing esperado
        if (err.message && !err.message.includes("JSON") && !err.message.includes("URL")) {
          toast.error("QR inválido", { 
            description: err.message || "El código QR no es válido. Asegúrate de escanear el QR correcto del local." 
          })
        }
        setScanning(false)
        setTimeout(() => {
          processedQRRef.current = null
          setScanning(true)
        }, 2000) // Reintentar después de 2 segundos
      }
    },
    onError(err: any) {
      console.error("Error del scanner ZXing:", err)
      // No mostrar error si ya tenemos un error de permisos
      if (hasPermission !== false && err.name !== "NotFoundError") {
        console.warn("Error de decodificación (puede ser normal):", err.message)
      }
    },
    // NO pasar constraints aquí porque ya estamos manejando el stream manualmente
    // useZxing usará el video que ya tiene el stream asignado
    timeBetweenDecodingAttempts: 300,
    pause: !isOpen || !scanning || !hasPermission || isProcessingRef.current || loading
  } as any)

  // Combinar ambas refs para que useZxing y nuestro manejo manual funcionen
  const combinedRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node
    
    // Pasar la ref a useZxing INMEDIATAMENTE cuando el nodo esté disponible
    if (node) {
      if (typeof zxingRef === 'function') {
        (zxingRef as (node: HTMLVideoElement | null) => void)(node)
      } else if (zxingRef && typeof zxingRef === 'object' && 'current' in zxingRef) {
        (zxingRef as React.MutableRefObject<HTMLVideoElement | null>).current = node
      }
      
      console.log("✅ Video ref asignada a useZxing")
      
      // Verificar que el video esté listo
      const handleLoadedMetadata = () => {
        console.log("📹 Video metadata cargada, readyState:", node.readyState)
        if (node.readyState >= 2) {
          setScanning(true)
          setLoading(false)
        }
      }
      
      // Si ya tiene metadata, ejecutar inmediatamente
      if (node.readyState >= 2) {
        handleLoadedMetadata()
      } else {
        node.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      }
    }
  }

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

  if (error && hasPermission === false) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative flex flex-col items-center justify-center bg-black min-h-[400px] p-6">
            <div className="text-center space-y-4 text-white">
              <AlertCircle className="h-16 w-16 mx-auto text-red-400" />
              <div>
                <p className="font-bold text-lg mb-2">No se puede acceder a la cámara</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <p className="text-xs text-gray-400 mt-4">
                  💡 En iOS: Ve a Configuración → Safari → Cámara → Permitir
                </p>
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
            ref={combinedRef} 
            className="w-full h-full object-cover" 
            playsInline={true}
            muted={true}
            autoPlay={true}
            style={{ 
              maxHeight: "70vh", 
              WebkitPlaysinline: "true",
              objectFit: "cover"
            } as any}
            onLoadedMetadata={() => {
              console.log("📹 Video metadata cargada, readyState:", videoRef.current?.readyState)
              if (videoRef.current && videoRef.current.readyState >= 2) {
                setScanning(true)
                setLoading(false)
              }
            }}
            onPlaying={() => {
              console.log("▶️ Video reproduciéndose")
              setScanning(true)
              setLoading(false)
            }}
            onError={(e) => {
              console.error("❌ Error en video:", e)
              setError("Error al reproducir video")
              setLoading(false)
            }}
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

