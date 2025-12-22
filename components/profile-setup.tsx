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
      toast.error("Selección Requerida", { description: "Por favor, selecciona tu rol." })
      return
    }

    setLoading(true)

    try {
      let orgId = null

      // 1. Si es dueño, CREAMOS la organización primero
      // IMPORTANTE: Esto requiere que exista la tabla 'organizations' en Supabase
      if (selectedRole === 'dueño') {
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({ nombre: `Kiosco de ${name}` })
            .select()
            .single()
        
        if (orgError) throw orgError
        orgId = orgData.id
      } 
      
      // 2. Insertamos el perfil con la Org ID vinculada (o null si es empleado)
      const { error } = await supabase
        .from('perfiles')
        .insert({ 
          id: user.id, 
          rol: selectedRole,
          nombre: name,
          organization_id: orgId 
        })

      if (error) throw error

      toast.success("Perfil Creado", { 
        description: `Bienvenido, ${name}. Configuración lista.` 
      })
      
      // Damos un segundo para que el usuario vea el éxito antes de redirigir
      setTimeout(() => onProfileCreated(selectedRole), 1000)

    } catch (error: any) {
      // --- MEJORA CRÍTICA: Visualización real del error ---
      console.error("Error setup DETALLADO:", JSON.stringify(error, null, 2))
      
      toast.error("Error al guardar", { 
        description: error.message || "Revisa la consola para más detalles." 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Configuración Inicial</h1>
          <p className="text-muted-foreground text-md">Hola, <b>{user.email}</b>.</p>
        </div>

        <div className="space-y-1.5">
            <label htmlFor="user-name" className="text-sm font-medium">Nombre para mostrar</label>
            <input 
                id="user-name"
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="flex h-10 w-full rounded-md border bg-background px-3" 
                placeholder="Tu nombre aquí"
            />
        </div>

        <div className="space-y-4">
          <Card 
            className={`p-5 cursor-pointer border-2 transition-all ${selectedRole === "dueño" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} 
            onClick={() => setSelectedRole("dueño")}
          >
            <div className="flex items-center gap-4">
              <Store className="h-8 w-8 text-primary" />
              <div><h2 className="font-bold">Soy Dueño</h2><p className="text-xs text-muted-foreground">Crear un nuevo Kiosco.</p></div>
              {selectedRole === "dueño" && <Check className="ml-auto text-primary"/>}
            </div>
          </Card>

          <Card 
            className={`p-5 cursor-pointer border-2 transition-all ${selectedRole === "empleado" ? "border-accent bg-accent/5" : "hover:border-accent/50"}`} 
            onClick={() => setSelectedRole("empleado")}
          >
             <div className="flex items-center gap-4">
              <User className="h-8 w-8 text-accent" />
              <div><h2 className="font-bold">Soy Empleado</h2><p className="text-xs text-muted-foreground">Unirme a un equipo existente.</p></div>
              {selectedRole === "empleado" && <Check className="ml-auto text-accent"/>}
            </div>
          </Card>
        </div>

        <Button onClick={handleSaveProfile} className="w-full" disabled={loading || !selectedRole}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : null}
          {loading ? "Guardando..." : "Comenzar"}
        </Button>
      </div>
    </div>
  )
}