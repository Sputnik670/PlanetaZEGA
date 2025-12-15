// app/page.tsx

"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Store, User, Loader2, LogOut, Package } from "lucide-react"
import DashboardDueno from "@/components/dashboard-dueno"
import VistaEmpleado from "@/components/vista-empleado"
import AuthForm from "@/components/auth-form"
import ProfileSetup from "@/components/profile-setup" // <-- Importamos el setup de perfil
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"


interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
}

// Componente que maneja el ruteo interno (ya no es selección de rol, sino el Dashboard real)
function AppRouter({ userProfile, onLogout }: { userProfile: UserProfile, onLogout: () => void }) {
    
    // Función para mostrar un mensaje de error si alguien intenta acceder al dashboard equivocado
    const showAccessDenied = () => {
        toast.error("Acceso Denegado", { 
            description: `Tu rol actual es: ${userProfile.rol.toUpperCase()}. No puedes acceder a este dashboard.`,
            duration: 5000
        })
    }

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

    // Fallback: Debería ser inaccesible si el rol está tipado correctamente.
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="p-6 text-center">
                <p className="text-xl font-bold text-destructive">Error de Rol</p>
                <p className="text-muted-foreground mt-2">Tu perfil está corrupto. Por favor, contacta al administrador.</p>
                <Button onClick={onLogout} className="mt-4" variant="destructive"><LogOut className="h-4 w-4 mr-2"/> Cerrar Sesión</Button>
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
        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error && error.code === 'PGRST116') {
            // No row found: El usuario está logueado pero no tiene perfil.
            setHasProfile(false)
            setUserProfile(null)
            return
        }

        if (error) throw error

        setUserProfile(data as UserProfile)
        setHasProfile(true)

    } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error('Error de Perfil', { description: 'No se pudo cargar tu rol. Intenta de nuevo.' })
        await supabase.auth.signOut()
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
            setLoading(false) // Si no hay sesión, terminamos la carga
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

  // Fallback final
  return (
    <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
            <Package className="h-10 w-10 mx-auto text-destructive" />
            <p className="mt-4">Ocurrió un error inesperado al cargar la aplicación.</p>
            <Button onClick={handleLogout} className="mt-4">Reiniciar</Button>
        </Card>
    </div>
  )
}