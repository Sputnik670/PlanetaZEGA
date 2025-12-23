"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Store, Trash2, MapPin, Settings } from "lucide-react"
import { toast } from "sonner"

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  created_at: string
}

export default function GestionSucursales({ onUpdate }: { onUpdate: () => void }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [newNombre, setNewNombre] = useState("")
  const [newDireccion, setNewDireccion] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchSucursales = async () => {
    setLoading(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single()
        if (!perfil?.organization_id) return

        const { data } = await supabase
            .from('sucursales')
            .select('*')
            .eq('organization_id', perfil.organization_id)
            .order('created_at', { ascending: true })
        
        setSucursales(data || [])
    } catch (error) {
        console.error(error)
        toast.error("Error al cargar sucursales")
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchSucursales()
  }, [])

  const handleCreate = async () => {
    if (!newNombre.trim()) {
        toast.error("El nombre es obligatorio")
        return
    }
    setCreating(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user?.id).single()
        
        const { error } = await supabase.from('sucursales').insert({
            organization_id: perfil?.organization_id,
            nombre: newNombre,
            direccion: newDireccion
        })

        if (error) throw error

        toast.success("Sucursal creada exitosamente")
        setNewNombre("")
        setNewDireccion("")
        fetchSucursales()
        onUpdate() // Avisar al componente padre para que actualice el selector
    } catch (error) {
        toast.error("Error al crear sucursal")
    } finally {
        setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("⚠️ ¿Estás seguro? \n\nSi borras esta sucursal, SE PERDERÁ TODO EL HISTORIAL DE VENTAS Y STOCK asociado a ella.\n\nEsta acción no se puede deshacer.")) return

      try {
          const { error } = await supabase.from('sucursales').delete().eq('id', id)
          if (error) throw error
          toast.success("Sucursal eliminada")
          fetchSucursales()
          onUpdate()
      } catch (error) {
          toast.error("No se pudo eliminar", { description: "Verifica que no tenga datos críticos asociados o contacta soporte." })
      }
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Nombre de Sucursal</Label>
                    <Input 
                        placeholder="Ej: Sucursal Centro" 
                        value={newNombre} 
                        onChange={(e) => setNewNombre(e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Dirección (Opcional)</Label>
                    <Input 
                        placeholder="Ej: Av. Libertador 1234" 
                        value={newDireccion} 
                        onChange={(e) => setNewDireccion(e.target.value)} 
                    />
                </div>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Crear Nueva Sucursal
            </Button>
        </div>

        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : sucursales.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No tienes sucursales registradas.</TableCell></TableRow>
                    ) : (
                        sucursales.map((suc) => (
                            <TableRow key={suc.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Store className="h-4 w-4 text-primary" /> {suc.nombre}
                                </TableCell>
                                <TableCell>{suc.direccion || "-"}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(suc.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    </div>
  )
}