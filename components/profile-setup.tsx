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
  const [name, setName] = useState(user?.email?.split('@')[0] || "Usuario")

  const handleSaveProfile = async () => {
    if (!selectedRole) {
      toast.error("Selección Requerida", { description: "Por favor, selecciona tu rol." })
      return
    }

    setLoading(true)

    try {
      // 🔍 PASO 0: VERIFICACIÓN QUIRÚRGICA
      // Verificamos si por algún error de un intento previo el perfil ya existe
      const { data: perfilExistente, error: checkError } = await supabase
        .from('perfiles')
        .select('id, rol')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilExistente) {
        console.log("Perfil ya detectado. Evitando duplicado y redirigiendo...");
        toast.success("Perfil recuperado", { description: "Ya tienes una configuración activa." })
        onProfileCreated(perfilExistente.rol as "dueño" | "empleado")
        return 
      }

      let orgId = null

      // 1. Si es dueño, CREAMOS la organización
      if (selectedRole === 'dueño') {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({ nombre: `Kiosco de ${name}` })
          .select()
          .single()
        
        if (orgError) throw orgError
        orgId = orgData.id
      } 
      
      // 2. Insertamos el perfil (Vínculo atómico)
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({ 
          id: user.id, 
          rol: selectedRole,
          nombre: name,
          email: user.email, 
          organization_id: orgId 
        })

      if (insertError) {
        // Manejo específico para el error de clave duplicada (23505)
        if (insertError.code === '23505') {
          onProfileCreated(selectedRole)
          return
        }
        throw insertError
      }

      toast.success("¡Bienvenido!", { description: "Tu local está listo para operar." })
      
      // Notificamos al Dashboard con un pequeño delay para asegurar la persistencia
      setTimeout(() => onProfileCreated(selectedRole), 800)

    } catch (error: any) {
      console.error("Error en el setup del perfil:", error)
      toast.error("No se pudo completar el registro", { 
        description: error.message || "Por favor, intenta de nuevo o revisa tu conexión." 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Finalizar Registro</h1>
          <p className="text-slate-500 text-sm font-medium">Hola, <b className="text-slate-900">{user?.email}</b>.</p>
        </div>

        <div className="space-y-1.5">
            <label htmlFor="user-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nombre para mostrar</label>
            <input 
                id="user-name"
                type="text" 
                placeholder="Tu nombre o apodo"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="flex h-12 w-full rounded-xl border-2 bg-white px-4 font-bold focus:border-primary focus:outline-none transition-all" 
            />
        </div>

        <div className="space-y-4">
          <Card 
            className={cn(
                "p-5 cursor-pointer border-2 transition-all rounded-2xl relative overflow-hidden",
                selectedRole === "dueño" ? "border-primary bg-primary/5 shadow-md" : "hover:border-slate-300 bg-white"
            )}
            onClick={() => setSelectedRole("dueño")}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn("p-3 rounded-xl", selectedRole === "dueño" ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-black text-sm uppercase tracking-tight">Soy Dueño / Admin</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Administrar cadena y sucursales</p>
              </div>
              {selectedRole === "dueño" && <Check className="ml-auto h-5 w-5 text-primary"/>}
            </div>
          </Card>

          <Card 
            className={cn(
                "p-5 cursor-pointer border-2 transition-all rounded-2xl relative overflow-hidden",
                selectedRole === "empleado" ? "border-slate-800 bg-slate-50 shadow-md" : "hover:border-slate-300 bg-white"
            )}
            onClick={() => setSelectedRole("empleado")}
          >
             <div className="flex items-center gap-4 relative z-10">
              <div className={cn("p-3 rounded-xl", selectedRole === "empleado" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400")}>
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-black text-sm uppercase tracking-tight">Soy Empleado</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fichar y registrar ventas</p>
              </div>
              {selectedRole === "empleado" && <Check className="ml-auto h-5 w-5 text-slate-800"/>}
            </div>
          </Card>
        </div>

        <Button 
            onClick={handleSaveProfile} 
            className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all" 
            disabled={loading || !selectedRole}
        >
          {loading ? <Loader2 className="animate-spin" /> : "COMENZAR AHORA 🚀"}
        </Button>
      </div>
    </div>
  )
}

// Helper para clases condicionales
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}