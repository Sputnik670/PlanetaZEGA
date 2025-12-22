// components/invitar-empleado.tsx

"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Plus, Trash2, UserCheck, Users, UserMinus, Send } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

// Tipos locales
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

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // 1. Cargar Invitaciones Pendientes
    const { data: dataInvites } = await supabase
        .from('pending_invites')
        .select('*')
        .order('created_at', { ascending: false })
    
    setInvites((dataInvites as Invite[]) || [])

    // 2. Cargar Equipo Activo (Perfiles con rol 'empleado')
    const { data: dataEmpleados } = await supabase
        .from('perfiles')
        .select('*')
        .eq('rol', 'empleado') // Solo empleados, no queremos listar al dueño
        .order('created_at', { ascending: false })

    if (dataEmpleados) setEmpleados(dataEmpleados as unknown as Empleado[])
  }

  // ✅ FUNCIÓN CORREGIDA: Envía el correo real usando Supabase Auth (Magic Link)
  const enviarMagicLink = async (emailDestino: string) => {
      const { error } = await supabase.auth.signInWithOtp({
          email: emailDestino,
          options: {
              emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
              shouldCreateUser: true // Crea el usuario si no existe (Flujo sin contraseña)
          }
      })

      if (error) throw error
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes("@")) return toast.error("Email inválido")
    
    setLoading(true)
    try {
      // 1. Verificar duplicados locales
      const yaInvitado = invites.find(i => i.email === email)
      const yaExiste = empleados.find(e => e.email === email)
      
      if (yaInvitado) throw new Error("Ya tiene una invitación pendiente.")
      if (yaExiste) throw new Error("Este usuario ya es parte del equipo.")

      // 2. Insertar el permiso en la Base de Datos (pending_invites)
      const { error: dbError } = await supabase.from('pending_invites').insert([{ email: email.trim().toLowerCase() }])
      if (dbError) throw dbError

      // 3. 📧 ENVIAR EL CORREO AUTOMÁTICO (MAGIC LINK)
      await enviarMagicLink(email.trim().toLowerCase())

      toast.success("¡Invitación enviada!", { description: "El empleado recibirá un enlace mágico de acceso." })
      
      setEmail("")
      cargarDatos()
    } catch (error: any) {
      console.error(error)
      toast.error("Error", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const reEnviarCorreo = async (emailDestino: string) => {
      setLoading(true)
      try {
          await enviarMagicLink(emailDestino)
          toast.success("Correo reenviado correctamente")
      } catch (error: any) {
          toast.error("Error al reenviar", { description: error.message })
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
      if (!confirm(`⚠️ ¿Estás seguro de que quieres desvincular a ${nombre}?\n\nPerderá el acceso al sistema inmediatamente.`)) return

      const { error } = await supabase.from('perfiles').delete().eq('id', id)
      
      if (error) {
          toast.error("No se pudo desvincular", { description: error.message })
      } else {
          toast.success("Empleado desvinculado correctamente")
          cargarDatos()
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* COLUMNA 1: INVITAR NUEVO */}
        <Card className="p-6 space-y-6 border-2 border-primary/10 h-fit">
            <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <UserCheck className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Invitar Nuevo</h2>
                    <p className="text-sm text-muted-foreground">Envía el acceso a tus candidatos.</p>
                </div>
            </div>

            <form onSubmit={handleInvite} className="flex gap-3 items-end">
                <div className="space-y-2 flex-1">
                    <Label>Email del Candidato</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="nuevo@ejemplo.com" 
                            className="pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Enviar
                </Button>
            </form>

            {/* Lista de Pendientes */}
            {invites.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground">Invitaciones Pendientes ({invites.length})</h3>
                    <div className="space-y-2">
                        {invites.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm text-yellow-800">{inv.email}</span>
                                    <span className="text-[10px] text-yellow-600/70">Enviado: {format(new Date(inv.created_at), 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => reEnviarCorreo(inv.email)} title="Reenviar Magic Link">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => borrarInvite(inv.id)} title="Cancelar">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>

        {/* COLUMNA 2: EQUIPO ACTIVO */}
        <Card className="p-6 space-y-6 border-2 border-primary/10 h-fit">
            <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Equipo Activo</h2>
                    <p className="text-sm text-muted-foreground">Gestión de personal actual.</p>
                </div>
            </div>

            {empleados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                    <p>Aún no tienes empleados activos.</p>
                    <p className="text-xs mt-1">Cuando acepten la invitación aparecerán aquí.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {empleados.map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">{emp.nombre || "Empleado"}</span>
                                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Activo</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground block mt-0.5">{emp.email || "Email no registrado"}</span>
                                <span className="text-[10px] text-slate-400 block mt-1">Alta: {new Date(emp.created_at).toLocaleDateString()}</span>
                            </div>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => desvincularEmpleado(emp.id, emp.nombre || "este usuario")} title="Dar de baja">
                                <UserMinus className="h-4 w-4 mr-2" />
                                Baja
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    </div>
  )
}