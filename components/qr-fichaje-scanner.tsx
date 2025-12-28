"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useZxing } from "react-zxing"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, X, QrCode, AlertCircle } from "lucide-react"
import { toast } from "sonner"

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

export default function QRFichajeScanner({ onClose, isOpen }: QRFichajeScannerProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const processedQRRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Resetear refs cuando se abre el scanner
  useEffect(() => {
    if (isOpen) {
      processedQRRef.current = null
      isProcessingRef.current = false
      setLoading(true)
      setError(null)
    }
  }, [isOpen])

  const cleanupVideoStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const { ref: zxingRef } = useZxing({
    onDecodeResult(result) {
      if (!isOpen || isProcessingRef.current) return
      
      const text = result.getText()
      if (processedQRRef.current === text) return
      
      isProcessingRef.current = true
      processedQRRef.current = text
      
      let redirectUrl: string | null = null
      
      try {
        if (text.startsWith('/fichaje')) {
          redirectUrl = text
        } else if (text.startsWith('http')) {
          const url = new URL(text)
          if (url.pathname === '/fichaje') {
            redirectUrl = url.pathname + url.search
          }
        } else {
          const data = JSON.parse(text)
          if (data.sucursal_id && data.tipo) {
            redirectUrl = `/fichaje?sucursal_id=${data.sucursal_id}&tipo=${data.tipo}`
          }
        }
      } catch (e) {
        console.error("Error parseando QR", e)
      }

      if (redirectUrl) {
        toast.success("QR detectado, redirigiendo...")
        setScanning(false)
        cleanupVideoStream()
        onClose()
        router.push(redirectUrl)
      } else {
        isProcessingRef.current = false
        toast.error("Formato de QR no reconocido")
      }
    },
    constraints: {
      video: {
        // 'ideal' permite compatibilidad con Notebook (frontal) y Móvil (trasera)
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    },
    timeBetweenDecodingAttempts: 300,
    // CORRECCIÓN: Se cambió 'pause' por 'paused' para cumplir con el tipo UseZxingOptions
    paused: !isOpen || hasPermission === false || isProcessingRef.current
  })

  useEffect(() => {
    if (!isOpen) {
      cleanupVideoStream()
      return
    }

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }
        })
        streamRef.current = stream
        setHasPermission(true)
        
        if (zxingRef.current) {
          zxingRef.current.srcObject = stream
          const handleLoaded = () => {
            setLoading(false)
            setScanning(true)
          }
          zxingRef.current.addEventListener('loadedmetadata', handleLoaded, { once: true })
        }
      } catch (err: any) {
        setHasPermission(false)
        setLoading(false)
        setError(err.name === "NotAllowedError" ? "Permiso denegado" : "No se pudo acceder a la cámara")
      }
    }

    initCamera()

    const timer = setTimeout(() => setLoading(false), 10000) // Timeout extendido para notebooks
    return () => {
      clearTimeout(timer)
      cleanupVideoStream()
    }
  }, [isOpen, zxingRef, cleanupVideoStream])

  if (error && hasPermission === false) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-6 bg-slate-900 text-white border-none">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="font-bold">{error}</p>
            <Button onClick={onClose} variant="outline" className="text-black">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
        <div className="relative flex flex-col items-center justify-center min-h-[400px] max-h-[80vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Iniciando cámara...</p>
              </div>
            </div>
          )}
          
          <video
            ref={zxingRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <QrCode className="h-12 w-12 text-white/30" />
                </div>
             </div>
          </div>

          <div className="absolute bottom-6 w-full flex flex-col items-center gap-4">
            <div className="bg-black/60 px-4 py-1 rounded-full text-white text-xs font-medium">
              {scanning ? "Buscando código QR..." : "Esperando..."}
            </div>
            <Button onClick={onClose} variant="destructive" className="rounded-full px-8">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}