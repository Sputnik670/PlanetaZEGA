"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Users, Plus, Phone, Mail, ChevronRight, DollarSign, Loader2, 
  ShoppingBag, Receipt
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

// --- Interfaces ---
interface Proveedor {
    id: string
    nombre: string
    rubro: string
    contacto_nombre: string
    telefono: string
    email: string
    condicion_pago: string
    saldo_actual: number          // ✅ NUEVO
    saldo_minimo_alerta: number   // ✅ NUEVO
}

interface Compra {
    id: string
    created_at: string
    monto_total: number
    estado_pago: string
    medio_pago: string
    fecha_compra: string
    comprobante_nro?: string
}

export default function GestionProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  
  // Datos del proveedor seleccionado
  const [historialCompras, setHistorialCompras] = useState<Compra[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Formulario nuevo proveedor
  const [formData, setFormData] = useState({
    nombre: "", rubro: "", contacto_nombre: "", 
    telefono: "", email: "", condicion_pago: "contado"
  })

  useEffect(() => { fetchProveedores() }, [])

  async function fetchProveedores() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  // Cargar historial al abrir un proveedor
  const handleSelectProveedor = async (prov: Proveedor) => {
      setSelectedProveedor(prov)
      setLoadingHistory(true)
      
      const { data } = await supabase
        .from('compras')
        .select('*')
        .eq('proveedor_id', prov.id)
        .order('fecha_compra', { ascending: false })
      
      setHistorialCompras(data || [])
      setLoadingHistory(false)
  }

  async function handleAddProveedor() {
    if (!formData.nombre) return toast.error("El nombre es obligatorio")
    
    const { error } = await supabase.from('proveedores').insert([formData])
    
    if (error) {
        console.error("Error al guardar proveedor:", error)
        return toast.error("Error al guardar")
    }
    
    toast.success("Proveedor registrado")
    setShowAddModal(false)
    setFormData({ nombre: "", rubro: "", contacto_nombre: "", telefono: "", email: "", condicion_pago: "contado" })
    fetchProveedores()
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER */}
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

      {/* LISTA DE PROVEEDORES */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : (
        <div className="grid gap-3">
            {proveedores.map(p => (
                <Card 
                    key={p.id} 
                    onClick={() => handleSelectProveedor(p)}
                    className="p-4 hover:border-primary/50 hover:bg-slate-50 transition-all cursor-pointer shadow-sm group"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                                {p.nombre.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm leading-tight group-hover:text-primary">{p.nombre}</h4>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">{p.rubro || 'General'}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-dashed">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {p.telefono || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                            <DollarSign className="h-3 w-3" /> {p.condicion_pago}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      )}

      {/* --- MODAL DETALLE DEL PROVEEDOR --- */}
      <Dialog open={!!selectedProveedor} onOpenChange={(open) => !open && setSelectedProveedor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader className="border-b pb-2">
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5 text-primary"/> {selectedProveedor?.nombre}
                </DialogTitle>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {selectedProveedor?.email || 'Sin mail'}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {selectedProveedor?.telefono || 'Sin tel'}</span>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-4">
                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Compras Totales</p>
                        <p className="text-xl font-black text-blue-900">{historialCompras.length}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Última Compra</p>
                        <p className="text-sm font-bold text-emerald-900">
                            {historialCompras.length > 0 
                                ? format(parseISO(historialCompras[0].fecha_compra), 'dd/MM/yy', {locale: es}) 
                                : '---'}
                        </p>
                    </div>
                </div>

                {/* Lista de Movimientos */}
                <div>
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                        <Receipt className="h-4 w-4 text-muted-foreground"/> Historial de Pedidos
                    </h4>
                    
                    {loadingHistory ? (
                        <div className="py-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary"/></div>
                    ) : historialCompras.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                            <p className="text-sm">No hay compras registradas con este proveedor.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {historialCompras.map(compra => (
                                <div key={compra.id} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase">
                                                {format(parseISO(compra.fecha_compra), 'dd MMMM yyyy', {locale: es})}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                    compra.estado_pago === 'pagado' 
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                                        : 'bg-orange-100 text-orange-700 border-orange-200'
                                                }`}>
                                                    {compra.estado_pago === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                                                </span>
                                                {compra.medio_pago && (
                                                    <span className="text-[10px] text-muted-foreground border px-1 rounded bg-slate-50 capitalize">
                                                        {compra.medio_pago}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-sm">
                                        {formatMoney(compra.monto_total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DialogContent>
      </Dialog>

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