"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, LogOut, Package } from "lucide-react"
import DashboardDueno from "@/components/dashboard-dueno"
import VistaEmpleado from "@/components/vista-empleado"
import AuthForm from "@/components/auth-form"
import ProfileSetup from "@/components/profile-setup"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
}

// Componente que maneja el ruteo interno
function AppRouter({ userProfile, onLogout }: { userProfile: UserProfile, onLogout: () => void }) {
    
    // El ruteo es automático basado en el rol del perfil
    if (userProfile.rol === "dueño") {
        return (
            <DashboardDueno onBack={onLogout} /> 
        )
    }

    if (userProfile.rol === "empleado") {
        return (
            <VistaEmpleado onBack={onLogout} />
        )
    }

    // Fallback: Si el rol no es ni dueño ni empleado
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="p-6 text-center">
                <p className="text-xl font-bold text-destructive">Error de Rol</p>
                <p className="text-muted-foreground mt-2">Tu perfil tiene un rol desconocido ({userProfile.rol}). Contacta soporte.</p>
                <Button onClick={onLogout} className="mt-4" variant="destructive">
                    <LogOut className="h-4 w-4 mr-2"/> Cerrar Sesión
                </Button>
            </Card>
        </div>
    )
}

export default function HomePage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  const fetchProfile = async (userId: string) => {
    setLoading(true)
    try {
        console.log("Buscando perfil para:", userId) // Log para depurar

        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            // Caso 1: El usuario no tiene perfil (PGRST116) -> Mostrar ProfileSetup
            if (error.code === 'PGRST116') {
                console.log("Usuario sin perfil, redirigiendo a Setup.")
                setHasProfile(false)
                setUserProfile(null)
                return 
            }
            
            // Caso 2: Error real de base de datos -> Lanzar al catch
            throw error
        }

        // Caso 3: Éxito
        console.log("Perfil encontrado:", data)
        setUserProfile(data as UserProfile)
        setHasProfile(true)

    } catch (error: any) {
        // --- CORRECCIÓN CRÍTICA AQUÍ ---
        // Usamos JSON.stringify para ver el error real si sale {}
        console.error("Error fetching profile DETALLADO:", JSON.stringify(error, null, 2))
        
        toast.error('Error de conexión o permisos', { 
            description: 'No pudimos cargar tu perfil. Revisa tu conexión.' 
        })
        
        // IMPORTANTE: COMENTAMOS EL LOGOUT AUTOMÁTICO
        // Esto evita el bucle infinito. Si falla, se queda aquí y puedes ver el error.
        // await supabase.auth.signOut() 
        
        setHasProfile(false) // Asumimos false para no romper la UI
    } finally {
        setLoading(false)
    }
  }

  // Hook principal para manejar la sesión y el perfil
  useEffect(() => {
    const handleSessionChange = (session: any) => {
        setSession(session)
        if (session?.user) {
            fetchProfile(session.user.id)
        } else {
            setLoading(false)
            setUserProfile(null)
            setHasProfile(false)
        }
    }
    
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSessionChange(session)
    })

    // 2. Suscribirse a cambios de estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error(error)
        toast.error('Error al cerrar sesión')
    } else {
        toast.info('Sesión cerrada correctamente')
    }
    setLoading(false)
  }

  // --- Renderizado Condicional ---

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  // 1. Sin Sesión -> Muestra Login
  if (!session) {
    return <AuthForm />
  }

  // 2. Con Sesión, pero sin Perfil -> Muestra Configuración Inicial
  if (session && !hasProfile) {
    return (
        <ProfileSetup 
            user={session.user} 
            onProfileCreated={() => fetchProfile(session.user.id)}
        />
    )
  }

  // 3. Con Sesión y con Perfil -> Muestra el Router (Dashboard)
  if (session && userProfile) {
    return <AppRouter userProfile={userProfile} onLogout={handleLogout} />
  }

  // Fallback final (Por si acaso falla el fetch pero hay sesión)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
            <Package className="h-10 w-10 mx-auto text-yellow-500" />
            <h2 className="text-lg font-bold mt-4">No pudimos cargar tu perfil</h2>
            <p className="text-muted-foreground mt-2 text-sm">
               Tu usuario existe ({session.user.email}), pero no pudimos leer tu rol.
            </p>
            <div className="flex gap-2 justify-center mt-4">
                <Button onClick={() => fetchProfile(session.user.id)} variant="outline">
                    Reintentar
                </Button>
                <Button onClick={handleLogout} variant="destructive">
                    Cerrar Sesión
                </Button>
            </div>
        </Card>
    </div>
  )
}