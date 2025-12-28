"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"

// Interfaz restaurada para compatibilidad con page.tsx
interface QRFichajeScannerProps {
  onQRScanned: (data: any) => void
  onClose: () => void
  isOpen: boolean
}

export default function QRFichajeScanner({ onClose, isOpen, onQRScanned }: QRFichajeScannerProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)

  const scannerId = "reader-fichaje-v2"

  useEffect(() => {
    if (!isOpen) return

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        scannerRef.current = html5QrCode

        const config = {
          fps: 20, // Aumentamos FPS para mayor fluidez
          qrbox: { width: 280, height: 280 }, // Caja visual más grande para facilitar el encuadre
          aspectRatio: 1.0,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        }

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isProcessingRef.current) return
            handleScanSuccess(decodedText)
          },
          () => {
            // Error silencioso mientras busca
          }
        )
        setLoading(false)
      } catch (err: any) {
        console.error("Error iniciando scanner:", err)
        setError("Error al acceder a la cámara. Asegúrate de dar permisos.")
        setLoading(false)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [isOpen])

  const handleScanSuccess = async (text: string) => {
    isProcessingRef.current = true
    let redirectUrl: string | null = null

    try {
      // Lógica de detección ultra-flexible para cualquier entorno
      if (text.includes('/fichaje?')) {
        redirectUrl = text.substring(text.indexOf('/fichaje'))
      } else if (text.startsWith('/fichaje')) {
        redirectUrl = text
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
      toast.success("Código detectado")
      
      // Notificar a la app principal (page.tsx)
      if (onQRScanned) {
        onQRScanned({ text })
      }

      await stopAndClose()
      router.push(redirectUrl)
    } else {
      isProcessingRef.current = false
      toast.error("El QR no parece ser un código de fichaje válido")
    }
  }

  const stopAndClose = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
    } catch (err) {
      console.error("Error al detener el scanner:", err)
    } finally {
      onClose()
    }
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-6 bg-slate-900 text-white border-none">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="font-bold text-lg">Cámara no disponible</p>
            <p className="text-sm text-slate-400">{error}</p>
            <Button onClick={onClose} variant="outline" className="w-full text-black bg-white">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={stopAndClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
        <div className="relative flex flex-col items-center justify-center min-h-[450px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
              <div className="text-center text-white space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-500" />
                <p className="text-sm font-medium">Iniciando motor de escaneo...</p>
              </div>
            </div>
          )}
          
          {/* Contenedor del motor html5-qrcode */}
          <div id={scannerId} className="w-full h-full" />
          
          <div className="absolute bottom-8 w-full flex flex-col items-center gap-4 z-50 pointer-events-none">
            <Button 
              onClick={stopAndClose} 
              variant="destructive" 
              className="rounded-full px-10 shadow-2xl pointer-events-auto h-12 font-bold"
            >
              <X className="mr-2 h-5 w-5" /> Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}