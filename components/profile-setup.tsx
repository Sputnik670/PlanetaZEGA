// components/profile-setup.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Store, Check } from "lucide-react"
import { toast } from "sonner"

interface ProfileSetupProps {
  user: any
  onProfileCreated: (role: "dueño" | "empleado") => void
}

export default function ProfileSetup({ user, onProfileCreated }: ProfileSetupProps) {
  const [selectedRole, setSelectedRole] = useState<"dueño" | "empleado" | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(user.email.split('@')[0] || "")

  const handleSaveProfile = async () => {
    if (!selectedRole) {
      toast.error("Selección Requerida", { description: "Por favor, selecciona tu rol para continuar." })
      return
    }

    setLoading(true)

    try {
      // Intenta insertar el perfil en la nueva tabla 'perfiles'
      const { error } = await supabase
        .from('perfiles')
        .insert({ 
          id: user.id, // El UUID del usuario logueado
          rol: selectedRole,
          nombre: name 
        })

      if (error) throw error

      toast.success("Perfil Creado", { 
        description: `Bienvenido, ${name}. Tu rol de ${selectedRole.toUpperCase()} ha sido asignado.` 
      })
      onProfileCreated(selectedRole)

    } catch (error: any) {
      console.error("Error al guardar perfil:", error)
      toast.error("Error al guardar perfil", { description: error.message || "Intenta de nuevo." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Configuración Inicial</h1>
          <p className="text-muted-foreground text-md">
            Hola, **{user.email}**. Necesitamos definir tu rol.
          </p>
        </div>

        {/* Campo de Nombre (Opcional, mejor UX) */}
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tu Nombre (Opcional)</label>
            <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </div>

        <div className="space-y-4">
          <Card
            className={`p-5 transition-all duration-200 cursor-pointer border-2 ${selectedRole === "dueño" ? "border-primary shadow-lg" : "hover:border-primary/50"}`}
            onClick={() => setSelectedRole("dueño")}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center flex-shrink-0">
                <Store className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">Dueño (Acceso Total)</h2>
                <p className="text-xs text-muted-foreground mt-1">Gestión de stock, precios y finanzas.</p>
              </div>
              {selectedRole === "dueño" && <Check className="h-6 w-6 text-primary" />}
            </div>
          </Card>

          <Card
            className={`p-5 transition-all duration-200 cursor-pointer border-2 ${selectedRole === "empleado" ? "border-accent shadow-lg" : "hover:border-accent/50"}`}
            onClick={() => setSelectedRole("empleado")}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent to-chart-2 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">Empleado (Operativo)</h2>
                <p className="text-xs text-muted-foreground mt-1">Tareas diarias, caja y vencimientos.</p>
              </div>
              {selectedRole === "empleado" && <Check className="h-6 w-6 text-accent" />}
            </div>
          </Card>
        </div>

        <Button 
          onClick={handleSaveProfile} 
          className="w-full h-12 text-lg font-bold" 
          disabled={loading || !selectedRole}
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 h-5 w-5" />}
          Confirmar Rol y Acceder
        </Button>
      </div>
    </div>
  )
}