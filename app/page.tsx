// app/page.tsx

"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Store, User, Loader2, LogOut } from "lucide-react"
import DashboardDueno from "@/components/dashboard-dueno"
import VistaEmpleado from "@/components/vista-empleado"
import AuthForm from "@/components/auth-form" // <-- Importamos el componente de autenticación
import { Button } from "@/components/ui/button"
import { toast } from "sonner"


// Componente que muestra la selección de rol después del login (antes era HomePage)
function UserSelectionPage({ onLogout }: { onLogout: () => void }) {
  const [userRole, setUserRole] = useState<"none" | "owner" | "employee">("none")

  if (userRole === "owner") {
    return <DashboardDueno onBack={() => setUserRole("none")} />
  }

  if (userRole === "employee") {
    return <VistaEmpleado onBack={() => setUserRole("none")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Barra Superior con Logout */}
        <div className="flex justify-between items-start w-full">
            <div className="text-center space-y-2 flex-1">
                <h1 className="text-4xl font-bold text-balance text-foreground">Kiosco App</h1>
                <p className="text-muted-foreground text-lg">Selecciona tu perfil para continuar</p>
            </div>
            <Button 
                variant="outline" 
                size="icon-sm"
                onClick={onLogout}
                className="flex-shrink-0 ml-4 mt-2"
            >
                <LogOut className="h-4 w-4 text-destructive" />
            </Button>
        </div>

        <div className="space-y-4">
          <Card
            className="p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => setUserRole("owner")}
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center flex-shrink-0">
                <Store className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">Dueño</h2>
                <p className="text-sm text-muted-foreground mt-1">Gestión completa del negocio</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 hover:border-accent/50"
            onClick={() => setUserRole("employee")}
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-chart-2 flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">Empleado</h2>
                <p className="text-sm text-muted-foreground mt-1">Tareas del día a día</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}


export default function HomePage() {
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  // Manejo de la sesión y el estado de autenticación
  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })

    // 2. Suscribirse a cambios de estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLoadingSession(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error(error)
        toast.error('Error al cerrar sesión')
        setLoadingSession(false)
    } else {
        toast.info('Sesión cerrada correctamente')
    }
  }

  if (loadingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  // Si no hay sesión, mostramos el formulario de autenticación
  if (!session) {
    return <AuthForm />
  }

  // Si hay sesión, mostramos la selección de rol y pasamos la función de logout
  return <UserSelectionPage onLogout={handleLogout} />
}