"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Store, Trash2, MapPin, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  created_at: string
}

// ⚠️ AUDITORÍA: Hacemos 'onUpdate' opcional para que no rompa si el padre no lo pasa.
interface GestionSucursalesProps {
    onUpdate?: () => void 
}

export default function GestionSucursales({ onUpdate }: GestionSucursalesProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null) // ✅ OPTIMIZACIÓN: Guardamos el ID aquí
  
  const [newNombre, setNewNombre] = useState("")
  const [newDireccion, setNewDireccion] = useState("")
  const [creating, setCreating] = useState(false)

  // 1. Cargar la Organización (Solo una vez al inicio)
  useEffect(() => {
    const loadOrg = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single()
            if (data?.organization_id) {
                setOrgId(data.organization_id)
            }
        }
    }
    loadOrg()
  }, [])

  // 2. Cargar Sucursales (Depende de orgId)
  const fetchSucursales = useCallback(async () => {
    if (!orgId) return // Esperamos a tener la org
    
    setLoading(true)
    try {
        const { data, error } = await supabase
            .from('sucursales')
            .select('*')
            .eq('organization_id', orgId) // ✅ Usamos el estado, no otra consulta
            .order('created_at', { ascending: true })
        
        if (error) throw error
        setSucursales(data || [])
    } catch (error) {
        console.error(error)
        toast.error("Error al cargar sucursales")
    } finally {
        setLoading(false)
    }
  }, [orgId])

  // Ejecutar fetch cuando tengamos orgId
  useEffect(() => {
    if (orgId) fetchSucursales()
  }, [orgId, fetchSucursales])

  const handleCreate = async () => {
    if (!newNombre.trim()) return toast.error("El nombre es obligatorio")
    if (!orgId) return toast.error("Error de identificación (Org ID faltante)")

    setCreating(true)
    try {
        const { error } = await supabase.from('sucursales').insert({
            organization_id: orgId, // ✅ Usamos el estado optimizado
            nombre: newNombre,
            direccion: newDireccion
        })

        if (error) throw error

        toast.success("Sucursal creada exitosamente")
        setNewNombre("")
        setNewDireccion("")
        fetchSucursales()
        if (onUpdate) onUpdate() // ✅ Ejecutamos solo si existe
    } catch (error: any) {
        toast.error("Error al crear", { description: error.message })
    } finally {
        setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
      // ⚠️ AUDITORÍA: Mensaje más claro sobre el riesgo
      if(!confirm("🛑 ¡CUIDADO! 🛑\n\nAl borrar esta sucursal SE BORRARÁN AUTOMÁTICAMENTE:\n- Todas las ventas\n- Todo el stock\n- Todas las cajas diarias\n\n¿Estás 100% seguro?")) return

      try {
          const { error } = await supabase.from('sucursales').delete().eq('id', id)
          if (error) throw error
          
          toast.success("Sucursal y sus datos eliminados")
          fetchSucursales()
          if (onUpdate) onUpdate()
      } catch (error) {
          toast.error("No se pudo eliminar", { description: "Hubo un error en la base de datos." })
      }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* FORMULARIO DE CREACIÓN */}
        <div className="p-4 border rounded-lg bg-slate-50/50 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> Nueva Sucursal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Nombre del Local</Label>
                    <Input 
                        placeholder="Ej: Kiosco Centro" 
                        value={newNombre} 
                        onChange={(e) => setNewNombre(e.target.value)} 
                        className="bg-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input 
                        placeholder="Ej: Av. Principal 123" 
                        value={newDireccion} 
                        onChange={(e) => setNewDireccion(e.target.value)} 
                        className="bg-white"
                    />
                </div>
            </div>
            <Button onClick={handleCreate} disabled={creating || !orgId} className="w-full md:w-auto">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                Inaugurar Local
            </Button>
        </div>

        {/* LISTADO */}
        <div className="border rounded-md overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-slate-100">
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/50" /></TableCell></TableRow>
                    ) : sucursales.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            Aún no tienes sucursales. ¡Crea la primera arriba!
                        </TableCell></TableRow>
                    ) : (
                        sucursales.map((suc) => (
                            <TableRow key={suc.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                        <Store className="h-4 w-4" />
                                    </div>
                                    {suc.nombre}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{suc.direccion || "—"}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleDelete(suc.id)} title="Eliminar permanentemente">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
        
        {/* AVISO INFORMATIVO */}
        {sucursales.length > 0 && (
             <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-blue-50 p-2 rounded border border-blue-100">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-blue-500" />
                <p>Las sucursales creadas aquí aparecerán como opciones para tus empleados al momento de fichar entrada.</p>
             </div>
        )}
    </div>
  )
}