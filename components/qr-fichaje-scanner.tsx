"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const processedQRRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Resetear refs cuando se abre el scanner
  useEffect(() => {
    if (isOpen) {
      processedQRRef.current = null
      isProcessingRef.current = false
    }
  }, [isOpen])

  // Verificar permisos cuando se abre el dialog
  useEffect(() => {
    if (!isOpen) {
      setLoading(true)
      setError(null)
      setHasPermission(null)
      setScanning(false)
      return
    }

    // Verificar permisos de cámara
    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Tu navegador no soporta el acceso a la cámara")
          setHasPermission(false)
          setLoading(false)
          return
        }

        // Intentar acceder a la cámara para verificar permisos con timeout
        try {
          const getUserMediaWithTimeout = () => {
            return Promise.race([
              navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: El acceso a la cámara está tardando demasiado. Intenta nuevamente.")), 10000)
              )
            ])
          }

          const stream = await getUserMediaWithTimeout()
          stream.getTracks().forEach(track => track.stop()) // Detener inmediatamente
          setHasPermission(true)
          // IMPORTANTE: Ya no setLoading(false) aquí - dejar que el video lo maneje
        } catch (err: any) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Se necesita permiso para acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.")
            setHasPermission(false)
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No se encontró ninguna cámara en tu dispositivo")
            setHasPermission(false)
          } else if (err.message && err.message.includes("Timeout")) {
            setError(err.message)
            setHasPermission(false)
          } else {
            setError(`Error al acceder a la cámara: ${err.message || "Intenta nuevamente"}`)
            setHasPermission(false)
          }
          setLoading(false)
        }
      } catch (err: any) {
        setError("Error al verificar permisos de cámara")
        setHasPermission(false)
        setLoading(false)
      }
    }

    checkPermissions()

    // Timeout de seguridad: si después de 5 segundos el loading sigue en true, forzar a false
    const loadingTimeout = setTimeout(() => {
      console.log("⏰ Timeout de seguridad: forzando loading a false")
      setLoading(false)
    }, 10000)

    return () => clearTimeout(loadingTimeout)
  }, [isOpen])

  // Función helper para limpiar el stream de video (previene memory leaks)
  // Usamos useCallback para que pueda ser usada en los hooks
  const cleanupVideoStream = useCallback(() => {
    try {
      // Limpiar desde videoRef
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => {
          track.stop()
        })
        videoRef.current.srcObject = null
      }
      
      // Limpiar desde streamRef si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        streamRef.current = null
      }
    } catch (err) {
      console.warn("Error durante cleanup del video stream:", err)
    }
  }, [])

  const { ref: zxingRef } = useZxing({
    onDecodeResult(result: any) {
      console.log("🎯 onDecodeResult llamado", { scanning, isOpen, isProcessing: isProcessingRef.current })

      if (!isOpen || isProcessingRef.current) {
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
        
        // Intentar parsear como URL primero (nuevo formato)
        let redirectUrl: string | null = null
        
        try {
          // Si ya es una ruta relativa con /fichaje
          if (text.startsWith('/fichaje')) {
            redirectUrl = text
          } else if (text.startsWith('http://') || text.startsWith('https://')) {
            // Si es URL completa, extraer la ruta y query params
            const url = new URL(text)
            if (url.pathname === '/fichaje') {
              redirectUrl = url.pathname + url.search
            }
          } else {
            // Intentar parsear como URL (puede ser sin protocolo)
            const url = new URL(text, window.location.origin)
            if (url.pathname === '/fichaje') {
              redirectUrl = url.pathname + url.search
            }
          }
        } catch {
          // Si no es URL, intentar parsear como JSON (formato antiguo) y construir URL
          try {
            const data = JSON.parse(text) as QRData
            if (data.sucursal_id && data.tipo) {
              redirectUrl = `/fichaje?sucursal_id=${data.sucursal_id}&tipo=${data.tipo}`
            }
          } catch {
            // No hacer nada, redirectUrl seguirá siendo null
          }
        }
        
        // Si tenemos una URL válida, redirigir INMEDIATAMENTE sin validar
        if (redirectUrl) {
          console.log("✅ QR válido detectado, redirigiendo a:", redirectUrl)
          
          // Mostrar feedback visual antes de redirigir
          toast.success("Redirigiendo...", { 
            description: "Procesando fichaje",
            duration: 1000
          })
          
          // Detener TODO inmediatamente
          setScanning(false)
          
          // Detener el stream de video PRIMERO (cleanup)
          cleanupVideoStream()
          // Limpiar zxingRef directamente aquí también
          if (typeof zxingRef !== 'function' && zxingRef && typeof zxingRef === 'object' && 'current' in zxingRef && zxingRef.current) {
            const video = zxingRef.current as HTMLVideoElement
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream
              stream.getTracks().forEach(track => track.stop())
              video.srcObject = null
            }
          }
          
          // Cerrar el dialog
          onClose()
          
          // Redirigir usando router.push para mantener el estado de React
          router.push(redirectUrl)
          return
        }
        
        // Si llegamos aquí, el QR no es válido
        isProcessingRef.current = false
        throw new Error("QR inválido: formato no reconocido")
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
    constraints: {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    },
    timeBetweenDecodingAttempts: 300,
    // CRÍTICO: NO pausar mientras loading=true, porque necesitamos que el video cargue primero
    // Solo pausar si: no está abierto, sin permisos, o procesando
    pause: !isOpen || hasPermission === false || isProcessingRef.current
  } as any)

  // Función adicional para limpiar desde zxingRef directamente
  const cleanupZxingRef = useCallback(() => {
    try {
      // Limpiar desde zxingRef si es un objeto
      if (typeof zxingRef !== 'function' && zxingRef && typeof zxingRef === 'object' && 'current' in zxingRef && zxingRef.current) {
        const video = zxingRef.current as HTMLVideoElement
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream
          stream.getTracks().forEach(track => {
            track.stop()
          })
          video.srcObject = null
        }
      }
    } catch (err) {
      console.warn("Error durante cleanup de zxingRef:", err)
    }
  }, [zxingRef])

  // Cleanup del video stream cuando el componente se desmonta o se cierra el dialog
  useEffect(() => {
    if (!isOpen) {
      cleanupVideoStream()
      cleanupZxingRef()
    }
    
    // Cleanup al desmontar el componente
    return () => {
      cleanupVideoStream()
      cleanupZxingRef()
    }
  }, [isOpen, cleanupVideoStream, cleanupZxingRef])

  // Usar la ref de useZxing directamente, pero también guardarla en videoRef y trackear el stream
  useEffect(() => {
    if (typeof zxingRef === 'function') {
      return () => {
        cleanupVideoStream()
        cleanupZxingRef()
      }
    } else if (zxingRef && typeof zxingRef === 'object' && 'current' in zxingRef) {
      videoRef.current = zxingRef.current

      const video = zxingRef.current
      if (video) {
        // Guardar stream cuando esté disponible
        const saveStream = () => {
          if (video.srcObject) {
            streamRef.current = video.srcObject as MediaStream
            console.log("📹 Stream guardado:", streamRef.current.getTracks().length, "tracks")
          }
        }

        const handleLoadedMetadata = () => {
          console.log("📹 Video metadata cargada, readyState:", video.readyState)
          saveStream()
          // Cambiar estados incondicionalmente para evitar problemas con closures
          setScanning(true)
          setLoading(false)
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })

        // Si ya está listo, activar inmediatamente
        if (video.readyState >= 2) {
          handleLoadedMetadata()
        }

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          cleanupVideoStream()
          cleanupZxingRef()
        }
      }
    }
  }, [zxingRef, isOpen])

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
    <Dialog open={isOpen} onOpenChange={onClose} data-testid="qr-scanner-dialog">
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
        <div className="relative flex flex-col items-center justify-center bg-black w-full min-h-[400px] max-h-[70vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50" data-testid="qr-scanner-loading">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Iniciando cámara...</p>
              </div>
            </div>
          )}
          
          <video
            ref={zxingRef}
            data-testid="qr-scanner-video"
            className="w-full h-full object-cover"
            playsInline={true}
            muted={true}
            autoPlay={true}
            style={{
              maxHeight: "70vh",
              WebkitPlaysinline: "true",
              objectFit: "cover"
            } as any}
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
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2" data-testid="qr-scanner-status">
              <p className="text-white text-xs font-bold text-center">
                {scanning ? "Escaneando..." : "Esperando QR..."}
              </p>
            </div>
            <Button 
              type="button" 
              variant="destructive" 
              className="rounded-full px-6 shadow-lg" 
              onClick={onClose}
              data-testid="qr-scanner-close"
            >
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

