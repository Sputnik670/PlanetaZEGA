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

function AppRouter({ userProfile, onLogout }: { userProfile: UserProfile, onLogout: () => void }) {
    if (userProfile.rol === "dueño") {
        return <DashboardDueno onBack={onLogout} /> 
    }
    if (userProfile.rol === "empleado") {
        return <VistaEmpleado onBack={onLogout} />
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
    return <AppRouter userProfile={userProfile} onLogout={handleLogout} />
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