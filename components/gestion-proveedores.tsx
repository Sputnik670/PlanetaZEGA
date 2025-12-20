// components/gestion-proveedores.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Users, Plus, Phone, Mail, ChevronRight, DollarSign, Loader2 
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface Proveedor {
    id: string
    nombre: string
    rubro: string
    contacto_nombre: string
    telefono: string
    email: string
    condicion_pago: string
    dias_vencimiento: number
}

export default function GestionProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "", rubro: "", contacto_nombre: "", 
    telefono: "", email: "", condicion_pago: "contado", dias_vencimiento: 0
  })

  useEffect(() => { fetchProveedores() }, [])

  async function fetchProveedores() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  async function handleAddProveedor() {
    if (!formData.nombre) return toast.error("El nombre es obligatorio")
    const { error } = await supabase.from('proveedores').insert([formData])
    if (error) return toast.error("Error al guardar")
    
    toast.success("Proveedor registrado")
    setShowAddModal(false)
    setFormData({ nombre: "", rubro: "", contacto_nombre: "", telefono: "", email: "", condicion_pago: "contado", dias_vencimiento: 0 })
    fetchProveedores()
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER DE MÓDULO */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-primary/10 shadow-sm">
        <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Directorio de Proveedores
            </h3>
            <p className="text-xs text-muted-foreground">{proveedores.length} proveedores registrados</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="rounded-full shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : (
        <div className="grid gap-3">
            {proveedores.map(p => (
                <Card key={p.id} className="p-4 hover:border-primary/30 transition-colors shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                {p.nombre.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm leading-tight">{p.nombre}</h4>
                                <p className="text-[10px] text-primary font-bold uppercase mt-0.5">{p.rubro || 'General'}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-dashed">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {p.telefono || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {p.email || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                            <DollarSign className="h-3 w-3" /> Pago: {p.condicion_pago}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      )}

      {/* MODAL AGREGAR */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nuevo Proveedor</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                <div>
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Nombre Empresa</Label>
                    <Input placeholder="Ej: Arcor, Coca-Cola..." value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Rubro</Label>
                        <Input placeholder="Golosinas" value={formData.rubro} onChange={e => setFormData({...formData, rubro: e.target.value})} />
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Persona Contacto</Label>
                        <Input placeholder="Juan Perez" value={formData.contacto_nombre} onChange={e => setFormData({...formData, contacto_nombre: e.target.value})} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Teléfono</Label>
                        <Input placeholder="11..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Email</Label>
                        <Input placeholder="prov@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                </div>
                <div>
                    {/* CORRECCIÓN A11Y FINAL: Agregado title y aria-label */}
                    <Label htmlFor="condicion-pago" className="text-xs uppercase font-bold text-muted-foreground">Condición de Pago</Label>
                    <select 
                        id="condicion-pago"
                        title="Condición de Pago"
                        aria-label="Condición de Pago"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                        value={formData.condicion_pago} 
                        onChange={e => setFormData({...formData, condicion_pago: e.target.value})}
                    >
                        <option value="contado">Contado / Efectivo</option>
                        <option value="7 dias">Cuenta Corriente (7 días)</option>
                        <option value="15 dias">Cuenta Corriente (15 días)</option>
                        <option value="30 dias">Cuenta Corriente (30 días)</option>
                    </select>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAddProveedor} className="w-full font-bold">Guardar Proveedor</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}