"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Store, Check } from "lucide-react"
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
  const [checkingInvitation, setCheckingInvitation] = useState(true)
  const [invitacionData, setInvitacionData] = useState<{ organization_id: string; sucursal_id: string | null } | null>(null)

  // Verificar si hay una invitación pendiente al cargar
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

        if (inviteError) {
          console.error("Error buscando invitación:", inviteError)
        }

        if (invitacion) {
          console.log("✅ Invitación encontrada:", { 
            email: user.email, 
            orgId: invitacion.organization_id,
            sucursalId: invitacion.sucursal_id 
          })
          
          // Si hay invitación, verificar si ya existe el perfil
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('id, rol')
            .eq('id', user.id)
            .maybeSingle()

          if (perfil) {
            // Ya existe perfil, redirigir
            console.log("✅ Perfil ya existe, redirigiendo...")
            onProfileCreated(perfil.rol as "dueño" | "empleado")
            return
          }
          
          // Si hay invitación pero no perfil, pre-seleccionar empleado y guardar datos
          setSelectedRole('empleado')
          setInvitacionData({
            organization_id: invitacion.organization_id,
            sucursal_id: invitacion.sucursal_id
          })
          toast.info("Invitación detectada", { description: "Tu cuenta será vinculada a la organización." })
        } else {
          // No hay invitación - permitir que el usuario elija ser dueño
          console.log("⚠️ No se encontró invitación para:", user.email.toLowerCase().trim())
        }
      } catch (error) {
        console.error("Error verificando invitación:", error)
      } finally {
        setCheckingInvitation(false)
      }
    }

    checkInvitation()
  }, [user, onProfileCreated])

  const handleSaveProfile = async () => {
    if (!selectedRole) {
      toast.error("Selección Requerida", { description: "Por favor, selecciona tu rol." })
      return
    }

    setLoading(true)

    try {
      // 🔍 PASO 0: VERIFICACIÓN QUIRÚRGICA (IDEMPOTENCIA)
      // Evita duplicados si el usuario refresca o da doble clic
      const { data: perfilExistente } = await supabase
        .from('perfiles')
        .select('id, rol')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilExistente) {
        console.log("Perfil recuperado. Redirigiendo...")
        toast.success("Perfil recuperado", { description: "Ya tienes una configuración activa." })
        onProfileCreated(perfilExistente.rol as "dueño" | "empleado")
        return 
      }

      let orgId = null
      let sucursalId = null

      // 1. Si es empleado, SIEMPRE verificar si hay invitación
      if (selectedRole === 'empleado') {
        if (!user?.email) {
          throw new Error("No se pudo obtener el email del usuario.")
        }

        // Buscar invitación (siempre buscar, incluso si ya tenemos invitacionData)
        const emailNormalizado = user.email.toLowerCase().trim()
        console.log("🔍 Buscando invitación para:", emailNormalizado, "Email original:", user.email, "User ID:", user.id)
        
        // Primero intentar búsqueda exacta
        let { data: invitacion, error: inviteError } = await supabase
          .from('pending_invites')
          .select('organization_id, sucursal_id, id, email')
          .eq('email', emailNormalizado)
          .maybeSingle()
        
        console.log("📊 Resultado de búsqueda:", { invitacion, inviteError, hasData: !!invitacion })
        
        // Si hay error, puede ser un problema de RLS - intentar buscar todas para debug
        if (inviteError) {
          console.error("❌ Error buscando invitación:", inviteError)
          console.log("⚠️ Intentando buscar todas las invitaciones para debug...")
          
          const { data: todasInvitaciones, error: errorTodas } = await supabase
            .from('pending_invites')
            .select('email, organization_id, sucursal_id, id')
            .limit(10)
          
          console.log("📋 Todas las invitaciones (si RLS lo permite):", todasInvitaciones)
          console.log("❌ Error al buscar todas:", errorTodas)
          
          // Si el error es de permisos, dar un mensaje más específico
          if (inviteError.code === '42501' || inviteError.message?.includes('permission') || inviteError.message?.includes('policy')) {
            throw new Error("Error de permisos al verificar la invitación. Verifica que las políticas RLS estén configuradas correctamente.")
          }
          
          throw new Error(`Error al verificar la invitación: ${inviteError.message || 'Error desconocido'}`)
        }
        
        // Si no se encuentra, buscar todas las invitaciones para debug
        if (!invitacion) {
          console.log("⚠️ No se encontró con búsqueda exacta, buscando todas las invitaciones...")
          const { data: todasInvitaciones, error: errorTodas } = await supabase
            .from('pending_invites')
            .select('email, organization_id, sucursal_id, id')
            .limit(10)
          
          console.log("📋 Invitaciones en la BD:", todasInvitaciones)
          console.log("❌ Error al buscar todas:", errorTodas)
          
          // Verificar si hay alguna invitación con email similar (por si hay problema de normalización)
          if (todasInvitaciones && todasInvitaciones.length > 0) {
            const emailSimilar = todasInvitaciones.find(inv => 
              inv.email?.toLowerCase().trim() === emailNormalizado
            )
            
            if (emailSimilar) {
              console.log("✅ Encontrada invitación con email similar:", emailSimilar)
              invitacion = emailSimilar
            } else {
              console.log("📧 Emails en BD:", todasInvitaciones.map(inv => inv.email))
              console.log("📧 Email buscado:", emailNormalizado)
            }
          }
        }

        if (!invitacion) {
          // No hay invitación - mostrar mensaje más útil
          console.error("❌ No se encontró invitación para:", emailNormalizado)
          throw new Error(`No se encontró una invitación para ${user.email}. Contacta al administrador para ser invitado.`)
        }

        console.log("✅ Invitación encontrada al guardar perfil:", invitacion)

        // Usar datos de la invitación encontrada
        orgId = invitacion.organization_id
        sucursalId = invitacion.sucursal_id
        
        // Guardar en estado por si acaso
        if (!invitacionData) {
          setInvitacionData({
            organization_id: invitacion.organization_id,
            sucursal_id: invitacion.sucursal_id
          })
        }
      }

      // 2. Si es dueño, CREAMOS la organización
      if (selectedRole === 'dueño') {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({ nombre: `Kiosco de ${name}` })
          .select()
          .single()
        
        if (orgError) throw orgError
        orgId = orgData.id
      } 
      
      // 3. Insertamos el perfil
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({ 
          id: user.id, 
          rol: selectedRole,
          nombre: name,
          email: user.email, 
          organization_id: orgId,
          sucursal_id: sucursalId // Vincular a la sucursal si viene de invitación
        })

      if (insertError) {
        // Si falló por duplicado justo en este milisegundo (race condition)
        if (insertError.code === '23505') {
          onProfileCreated(selectedRole)
          return
        }
        throw insertError
      }

      // 4. Si había una invitación, eliminarla
      if (selectedRole === 'empleado' && user?.email) {
        const { error: deleteError } = await supabase
          .from('pending_invites')
          .delete()
          .eq('email', user.email.toLowerCase().trim())
        
        if (deleteError) {
          console.error("Error eliminando invitación:", deleteError)
          // No lanzamos error aquí, el perfil ya se creó
        }
      }

      toast.success("¡Bienvenido!", { description: "Tu cuenta está lista para usar." })
      
      // Delay para asegurar propagación
      setTimeout(() => onProfileCreated(selectedRole), 800)

    } catch (error: any) {
      console.error("Error setup:", error)
      toast.error("No se pudo completar el registro", { 
        description: error.message || "Intenta nuevamente." 
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-slate-600 font-medium">Verificando invitación...</p>
        </div>
      </div>
    )
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