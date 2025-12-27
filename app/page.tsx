"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Package } from "lucide-react"
import DashboardDueno from "@/components/dashboard-dueno"
import VistaEmpleado from "@/components/vista-empleado"
import AuthForm from "@/components/auth-form"
import ProfileSetup from "@/components/profile-setup"
import SeleccionarSucursal from "@/components/seleccionar-sucursal" // ✅ Importamos el nuevo componente
import QRFichajeScanner from "@/components/qr-fichaje-scanner" // ✅ Scanner de QR para fichaje
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { QrCode } from "lucide-react"

interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
    organization_id: string // ✅ Agregado: Necesario para filtrar sucursales
}

// ✅ Componente para escanear QR de fichaje (solo empleados)
function EscanearQRFichaje({ onQRScanned }: { onQRScanned: (data: { sucursal_id: string }) => void }) {
  const [showScanner, setShowScanner] = useState(false)

  const handleQRScanned = (data: { sucursal_id: string, tipo: "entrada" | "salida", sucursal_nombre?: string }) => {
    onQRScanned(data)
    toast.success(
      data.tipo === "entrada" ? "QR de entrada escaneado" : "QR de salida escaneado",
      { description: `Local: ${data.sucursal_nombre || "Sucursal"}` }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-[2.5rem] overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="bg-blue-500 p-3 rounded-2xl shadow-lg shadow-blue-500/20 inline-block mb-4">
            <QrCode className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Kiosco 24hs</h1>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">Sistema de Fichaje</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Escanea el QR del Local
            </h2>
            <p className="text-sm font-medium text-slate-400">
              Cada local tiene un QR de entrada y otro de salida. Escanea el correspondiente según tu situación.
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 rounded-lg p-2">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-blue-900 text-sm uppercase mb-1">Instrucciones</h3>
                <ul className="text-xs text-blue-800 space-y-1 font-bold">
                  <li>• Busca el QR en el local</li>
                  <li>• Escanea el QR de ENTRADA al llegar</li>
                  <li>• Escanea el QR de SALIDA al terminar</li>
                  <li>• No puedes elegir el local manualmente</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowScanner(true)}
            className="w-full h-16 text-lg font-black rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <QrCode className="mr-2 h-5 w-5" />
            Escanear QR del Local
          </Button>
        </div>
      </Card>

      <QRFichajeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onQRScanned={handleQRScanned}
      />
    </div>
  )
}

// ✅ AppRouter ahora recibe sucursalId
function AppRouter({ userProfile, onLogout, sucursalId }: { userProfile: UserProfile, onLogout: () => void, sucursalId: string }) {
    if (userProfile.rol === "dueño") {
        // @ts-ignore - (El siguiente paso será actualizar DashboardDueno para que acepte esta prop)
        return <DashboardDueno onBack={onLogout} sucursalId={sucursalId} /> 
    }
    if (userProfile.rol === "empleado") {
        // @ts-ignore - (El siguiente paso será actualizar VistaEmpleado para que acepte esta prop)
        return <VistaEmpleado onBack={onLogout} sucursalId={sucursalId} />
    }
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="p-6 text-center">
                <p className="text-xl font-bold text-destructive">Error de Rol</p>
                <Button onClick={onLogout} className="mt-4" variant="destructive">Cerrar Sesión</Button>
            </Card>
        </div>
    )
}

export default function HomePage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  
  // ✅ Nuevo Estado: Guardamos la sucursal elegida
  const [sucursalId, setSucursalId] = useState<string | null>(null)

  const fetchProfile = async (userId: string) => {
    setLoading(true)
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                setHasProfile(false)
                setUserProfile(null)
                return 
            }
            throw error
        }

        setUserProfile(data as UserProfile)
        setHasProfile(true)

    } catch (error: any) {
        console.error("Error profile:", error)
        toast.error('Error cargando perfil')
        setHasProfile(false) 
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    const handleSessionChange = (session: any) => {
        setSession(session)
        if (session?.user) {
            fetchProfile(session.user.id)
        } else {
            setLoading(false)
            setUserProfile(null)
            setHasProfile(false)
            setSucursalId(null) // ✅ Reseteamos sucursal al salir
        }
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSessionChange(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSucursalId(null) // ✅ Limpiamos sucursal
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>

  if (!session) return <AuthForm />

  if (session && !hasProfile) {
    return (
        <ProfileSetup 
            user={session.user} 
            onProfileCreated={() => fetchProfile(session.user.id)}
        />
    )
  }

  if (session && userProfile) {
    // ✅ PASO CRÍTICO: Si no hay sucursal seleccionada
    if (!sucursalId) {
        // Para empleados: mostrar scanner de QR
        if (userProfile.rol === "empleado") {
            return <EscanearQRFichaje onQRScanned={(data) => setSucursalId(data.sucursal_id)} />
        }
        // Para dueños: mostrar selector de sucursal
        return (
            <SeleccionarSucursal 
                organizationId={userProfile.organization_id} 
                userId={userProfile.id}
                userRol={userProfile.rol}
                onSelect={(id) => setSucursalId(id)}
            />
        )
    }

    // ✅ Si ya eligió/escaneó, mostramos la App pasándole el ID
    return <AppRouter userProfile={userProfile} onLogout={handleLogout} sucursalId={sucursalId} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
            <Package className="h-10 w-10 mx-auto text-yellow-500" />
            <h2 className="text-lg font-bold mt-4">Cargando...</h2>
            <div className="flex gap-2 justify-center mt-4">
                <Button onClick={() => fetchProfile(session.user.id)} variant="outline">Reintentar</Button>
                <Button onClick={handleLogout} variant="destructive">Salir</Button>
            </div>
        </Card>
    </div>
  )
}