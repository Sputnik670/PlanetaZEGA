"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Store, Check, Lock } from "lucide-react" // ✅ Agregado Lock
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ProfileSetupProps {
  user: any
  onProfileCreated: (role: "dueño" | "empleado") => void
}

export default function ProfileSetup({ user, onProfileCreated }: ProfileSetupProps) {
  const [selectedRole, setSelectedRole] = useState<"dueño" | "empleado" | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(user?.email?.split('@')[0] || "Usuario")
  
  // ✅ Nuevo estado para la contraseña
  const [password, setPassword] = useState("") 

  const [checkingInvitation, setCheckingInvitation] = useState(true)
  const [invitacionData, setInvitacionData] = useState<{ organization_id: string; sucursal_id: string | null } | null>(null)

  // ------------------------------------------------------------------
  // 1. LÓGICA DE INVITACIÓN (INTACTA)
  // ------------------------------------------------------------------
  useEffect(() => {
    const checkInvitation = async () => {
      if (!user?.email) {
        setCheckingInvitation(false)
        return
      }

      try {
        const { data: invitacion, error: inviteError } = await supabase
          .from('pending_invites')
          .select('organization_id, sucursal_id')
          .eq('email', user.email.toLowerCase().trim())
          .maybeSingle()

        if (inviteError) console.error("Error buscando invitación:", inviteError)

        if (invitacion) {
          console.log("✅ Invitación encontrada:", { 
            email: user.email, 
            orgId: invitacion.organization_id
          })
          
          // Verificar si ya existe el perfil
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('id, rol')
            .eq('id', user.id)
            .maybeSingle()

          if (perfil) {
            onProfileCreated(perfil.rol as "dueño" | "empleado")
            return
          }
          
          // Pre-configurar como empleado
          setSelectedRole('empleado')
          setInvitacionData({
            organization_id: invitacion.organization_id,
            sucursal_id: invitacion.sucursal_id
          })
          toast.info("Invitación detectada", { description: "Tu cuenta será vinculada a la organización." })
        }
      } catch (error) {
        console.error("Error verificando invitación:", error)
      } finally {
        setCheckingInvitation(false)
      }
    }

    checkInvitation()
  }, [user, onProfileCreated])

  // ------------------------------------------------------------------
  // 2. GUARDADO DE PERFIL + CONTRASEÑA
  // ------------------------------------------------------------------
  const handleSaveProfile = async () => {
    // Validaciones
    if (!selectedRole) {
      toast.error("Selección Requerida", { description: "Por favor, selecciona tu rol." })
      return
    }
    if (!name.trim()) {
        toast.error("Nombre requerido")
        return
    }
    // ✅ Validación de contraseña obligatoria
    if (password.length < 6) {
        toast.error("La contraseña es muy corta", { description: "Debe tener al menos 6 caracteres." })
        return
    }

    setLoading(true)

    try {
      // ✅ PASO NUEVO: Establecer contraseña en Supabase Auth
      // Esto permite que el usuario entre después sin el Magic Link
      const { error: pwdError } = await supabase.auth.updateUser({ 
        password: password 
      })
      
      if (pwdError) throw pwdError

      // --- A PARTIR DE ACÁ ES TU LÓGICA ORIGINAL ---

      // Verificación de Idempotencia
      const { data: perfilExistente } = await supabase
        .from('perfiles')
        .select('id, rol')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilExistente) {
        onProfileCreated(perfilExistente.rol as "dueño" | "empleado")
        return 
      }

      let orgId = null
      let sucursalId = null

      // Si es empleado, buscar la invitación (Lógica robusta conservada)
      if (selectedRole === 'empleado') {
        const emailNormalizado = user.email.toLowerCase().trim()
        
        let { data: invitacion } = await supabase
          .from('pending_invites')
          .select('organization_id, sucursal_id')
          .eq('email', emailNormalizado)
          .maybeSingle()
        
        // Fallback de búsqueda si falla la exacta (tu lógica de debug)
        if (!invitacion) {
             const { data: todas } = await supabase.from('pending_invites').select('*').limit(10)
             const similar = todas?.find(i => i.email.toLowerCase().trim() === emailNormalizado)
             if (similar) invitacion = similar
        }

        if (!invitacion) {
          throw new Error(`No se encontró invitación para ${user.email}. Pide al dueño que te invite de nuevo.`)
        }

        orgId = invitacion.organization_id
        sucursalId = invitacion.sucursal_id
      }

      // Si es dueño, crear org
      if (selectedRole === 'dueño') {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({ nombre: `Kiosco de ${name}` })
          .select()
          .single()
        
        if (orgError) throw orgError
        orgId = orgData.id
      } 
      
      // Insertar perfil
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({ 
          id: user.id, 
          rol: selectedRole,
          nombre: name,
          email: user.email, 
          organization_id: orgId,
          sucursal_id: sucursalId 
        })

      if (insertError) {
        if (insertError.code === '23505') { // Duplicado
          onProfileCreated(selectedRole)
          return
        }
        throw insertError
      }

      // Borrar invitación usada
      if (selectedRole === 'empleado') {
        await supabase.from('pending_invites').delete().eq('email', user.email.toLowerCase().trim())
      }

      toast.success("¡Cuenta configurada!", { description: "Ya tienes acceso y contraseña." })
      
      setTimeout(() => onProfileCreated(selectedRole), 800)

    } catch (error: any) {
      console.error("Error setup:", error)
      toast.error("Error", { description: error.message || "No se pudo completar el registro." })
    } finally {
      setLoading(false)
    }
  }

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl border border-white/20">
        
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Crear Credenciales</h1>
          <p className="text-slate-500 text-xs font-medium px-4">Configura tu acceso para no depender del enlace de correo.</p>
        </div>

        <div className="space-y-4">
            {/* Input Nombre */}
            <div className="space-y-1.5">
                <label htmlFor="user-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nombre</label>
                <input 
                    id="user-name"
                    type="text" 
                    placeholder="Tu nombre completo"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="flex h-12 w-full rounded-xl border-2 bg-white px-4 font-bold focus:border-primary focus:outline-none transition-all" 
                />
            </div>

            {/* ✅ Input Contraseña (NUEVO) */}
            <div className="space-y-1.5">
                <label htmlFor="password" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Crear Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-300" />
                    <input 
                        id="password"
                        type="password" 
                        placeholder="Mínimo 6 caracteres"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="flex h-12 w-full rounded-xl border-2 bg-white pl-10 pr-4 font-bold focus:border-primary focus:outline-none transition-all" 
                    />
                </div>
                <p className="text-[9px] text-slate-400 font-bold ml-1">⚠️ La usarás para entrar al kiosco mañana.</p>
            </div>
        </div>

        {/* Selector de Roles */}
        <div className="space-y-3 pt-2">
          {/* Si hay invitación, ocultamos la opción de dueño para no confundir, o la dejamos deshabilitada */}
          {!invitacionData && (
              <Card 
                className={cn(
                    "p-4 cursor-pointer border-2 transition-all rounded-xl",
                    selectedRole === "dueño" ? "border-primary bg-primary/5" : "hover:border-slate-300 bg-white"
                )}
                onClick={() => setSelectedRole("dueño")}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg"><Store className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h2 className="font-bold text-xs uppercase">Soy Dueño</h2>
                    <p className="text-[9px] text-slate-400">Crear nueva organización</p>
                  </div>
                  {selectedRole === "dueño" && <Check className="ml-auto h-4 w-4 text-primary"/>}
                </div>
              </Card>
          )}

          <Card 
            className={cn(
                "p-4 cursor-pointer border-2 transition-all rounded-xl",
                selectedRole === "empleado" ? "border-slate-800 bg-slate-50" : "hover:border-slate-300 bg-white"
            )}
            onClick={() => setSelectedRole("empleado")}
          >
             <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2 rounded-lg"><User className="h-5 w-5 text-white" /></div>
              <div>
                <h2 className="font-bold text-xs uppercase">Soy Empleado</h2>
                <p className="text-[9px] text-slate-400">Tengo una invitación</p>
              </div>
              {selectedRole === "empleado" && <Check className="ml-auto h-4 w-4 text-slate-800"/>}
            </div>
          </Card>
        </div>

        <Button 
            onClick={handleSaveProfile} 
            className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all" 
            disabled={loading || !selectedRole || !password}
        >
          {loading ? <Loader2 className="animate-spin" /> : "GUARDAR Y ENTRAR"}
        </Button>
      </div>
    </div>
  )
}