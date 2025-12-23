// components/invitar-empleado.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Plus, Trash2, UserCheck, Users, UserMinus, Send, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface Invite {
  id: string
  email: string
  created_at: string
}

interface Empleado {
  id: string
  nombre: string
  email: string | null
  rol: string
  created_at: string
}

export function InvitarEmpleado() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    // 1. Obtener organización del dueño
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user?.id).single()
    
    if (perfil?.organization_id) {
        setOrgId(perfil.organization_id)

        // 2. Invitaciones Pendientes de MI empresa
        const { data: dataInvites } = await supabase
            .from('pending_invites')
            .select('*')
            .eq('organization_id', perfil.organization_id)
            .order('created_at', { ascending: false })
        setInvites((dataInvites as Invite[]) || [])

        // 3. Empleados Activos de MI empresa
        const { data: dataEmpleados } = await supabase
            .from('perfiles')
            .select('*')
            .eq('organization_id', perfil.organization_id)
            .eq('rol', 'empleado')
            .order('created_at', { ascending: false })
        setEmpleados(dataEmpleados as unknown as Empleado[] || [])
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const enviarMagicLink = async (emailDestino: string) => {
      const { error } = await supabase.auth.signInWithOtp({
          email: emailDestino,
          options: {
              emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
              shouldCreateUser: true 
          }
      })
      if (error) throw error
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes("@")) return toast.error("Email inválido")
    if (!orgId) return toast.error("Error de sesión")
    
    setLoading(true)
    try {
      const { error: dbError } = await supabase
        .from('pending_invites')
        .insert([{ 
            email: email.trim().toLowerCase(),
            organization_id: orgId 
        }])
      
      if (dbError) {
          if (dbError.code === '23505') throw new Error("Este email ya tiene una invitación pendiente.")
          throw dbError
      }

      await enviarMagicLink(email.trim().toLowerCase())
      toast.success("Invitación enviada", { description: "El sistema vinculará al empleado automáticamente al registrarse." })
      
      setEmail("")
      cargarDatos()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const borrarInvite = async (id: string) => {
    const { error } = await supabase.from('pending_invites').delete().eq('id', id)
    if (!error) {
        toast.info("Invitación cancelada")
        cargarDatos()
    }
  }

  const desvincularEmpleado = async (id: string, nombre: string) => {
      if (!confirm(`⚠️ ¿Desvincular a ${nombre}?`)) return
      const { error } = await supabase.from('perfiles').delete().eq('id', id)
      if (error) toast.error("Error al desvincular")
      else {
          toast.success("Empleado desvinculado")
          cargarDatos()
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INVITAR */}
        <Card className="p-6 border-2 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><UserCheck className="h-6 w-6" /></div>
                <div><h2 className="text-lg font-black uppercase">Invitar al Equipo</h2><p className="text-xs text-muted-foreground">Vínculo automático a tu empresa.</p></div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Email Corporativo o Personal</Label>
                    <div className="flex gap-2">
                        <Input placeholder="empleado@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 font-bold" />
                        <Button type="submit" disabled={loading} className="h-12 px-6 font-black uppercase text-xs tracking-widest">
                            {loading ? <Loader2 className="animate-spin" /> : "Enviar"}
                        </Button>
                    </div>
                </div>
            </form>

            {invites.length > 0 && (
                <div className="mt-8 space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-2 tracking-widest">Esperando Registro ({invites.length})</h3>
                    {invites.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-dashed">
                            <span className="text-xs font-bold text-slate-600">{inv.email}</span>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => borrarInvite(inv.id)}><X className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>

        {/* EQUIPO ACTIVO */}
        <Card className="p-6 border-2 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Users className="h-6 w-6" /></div>
                <div><h2 className="text-lg font-black uppercase">Staff Activo</h2><p className="text-xs text-muted-foreground">Gestión de accesos de la marca.</p></div>
            </div>

            <div className="space-y-3">
                {empleados.length === 0 ? <p className="text-center py-10 text-xs italic text-slate-400">No hay empleados registrados.</p> : empleados.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-4 bg-white border-2 rounded-2xl">
                        <div>
                            <p className="font-black text-xs uppercase text-slate-800">{emp.nombre || 'Sin nombre'}</p>
                            <p className="text-[10px] font-bold text-slate-400">{emp.email}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 font-black text-[10px] uppercase hover:bg-red-50" onClick={() => desvincularEmpleado(emp.id, emp.nombre)}>Baja</Button>
                    </div>
                ))}
            </div>
        </Card>
    </div>
  )
}