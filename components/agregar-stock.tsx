// components/agregar-stock.tsx

"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase" 

import { CalendarIcon, PlusIcon, MinusIcon, PackagePlus, DollarSign, Users, CreditCard } from "lucide-react" 
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner" 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Producto {
  id: string
  nombre: string
}

interface AgregarStockProps {
  producto: Producto
  onStockAdded?: () => void 
  // orgId eliminado para corregir el error de compatibilidad
}

export function AgregarStock({ producto, onStockAdded }: AgregarStockProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estado local
  const [cantidad, setCantidad] = useState(1)
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | undefined>(undefined)
  
  // Estados Proveedores
  const [proveedores, setProveedores] = useState<{id: string, nombre: string}[]>([])
  const [selectedProveedor, setSelectedProveedor] = useState<string>("")
  const [costoUnitario, setCostoUnitario] = useState<string>("")
  
  // Estados Pago
  const [estadoPago, setEstadoPago] = useState<string>("pendiente") 
  const [medioPago, setMedioPago] = useState<string>("efectivo") 

  useEffect(() => {
    if (open) {
        const fetchProveedores = async () => {
            const { data } = await supabase.from('proveedores').select('id, nombre').order('nombre')
            setProveedores(data || [])
        }
        fetchProveedores()
    }
  }, [open])

  const incrementar = () => setCantidad((prev) => prev + 1)
  const decrementar = () => setCantidad((prev) => (prev > 1 ? prev - 1 : 1))

  const handleGuardar = async () => {
    // Validaciones
    if (!fechaVencimiento) {
      toast.error("Falta fecha", { description: "Selecciona cuándo vence el producto." })
      return
    }
    if (cantidad < 1) {
      toast.error("Error", { description: "La cantidad debe ser mayor a 0." })
      return
    }

    setLoading(true)

    try {
      let compraId: string | null = null;
      const costoNum = parseFloat(costoUnitario) || 0;

      // 1. Registrar COMPRA (si corresponde)
      if (selectedProveedor && costoNum > 0) {
          const montoTotal = costoNum * cantidad;
          
          const { data: compraData, error: compraError } = await supabase
            .from('compras')
            .insert([
                {
                    // organization_id eliminado
                    proveedor_id: selectedProveedor,
                    monto_total: montoTotal,
                    estado_pago: estadoPago, 
                    medio_pago: estadoPago === 'pagado' ? medioPago : null,
                    fecha_compra: new Date().toISOString(),
                }
            ])
            .select()
            .single()

          if (compraError) throw compraError
          if (compraData) compraId = compraData.id
      }

      // 2. Insertar STOCK
      const stockItems = Array.from({ length: cantidad }).map(() => ({
        // organization_id eliminado
        producto_id: producto.id,
        fecha_vencimiento: format(fechaVencimiento, 'yyyy-MM-dd'),
        estado: 'pendiente',
        proveedor_id: selectedProveedor || null,
        compra_id: compraId,
        costo_unitario_historico: costoNum > 0 ? costoNum : null
      }))

      const { error } = await supabase.from('stock').insert(stockItems)
      if (error) throw error

      // 3. Actualizar Costo Producto
      if (costoNum > 0) {
          await supabase
            .from('productos')
            .update({ costo: costoNum }) // organization_id eliminado
            .eq('id', producto.id)
      }

      toast.success("Stock guardado", { description: `${cantidad} unidades ingresadas.` })
      
      // Reset
      setCantidad(1)
      setFechaVencimiento(undefined)
      setSelectedProveedor("")
      setCostoUnitario("")
      setEstadoPago("pendiente")
      setOpen(false)
      
      if (onStockAdded) onStockAdded()

    } catch (error: any) {
      console.error(error)
      toast.error("Error al guardar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <PackagePlus className="h-4 w-4" />
          Ingresar Lote
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingresar: {producto.nombre}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 py-2">
          
          <div className="space-y-2">
            <Label className="text-center block text-xs uppercase font-bold text-muted-foreground">Cantidad</Label>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={decrementar} className="h-10 w-10 rounded-full"><MinusIcon className="h-5 w-5" /></Button>
              <Input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value) || 0)} className="h-12 w-20 text-center text-xl font-bold"/>
              <Button variant="outline" size="icon" onClick={incrementar} className="h-10 w-10 rounded-full"><PlusIcon className="h-5 w-5" /></Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Fecha Vencimiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("h-10 w-full justify-start text-left font-normal", !fechaVencimiento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaVencimiento ? format(fechaVencimiento, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fechaVencimiento} onSelect={setFechaVencimiento} initialFocus locale={es}/>
              </PopoverContent>
            </Popover>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <Label className="font-bold text-sm">Datos de Compra (Opcional)</Label>
            </div>
            
            <div className="space-y-1">
                <Label htmlFor="proveedor-select" className="text-xs text-muted-foreground">Proveedor</Label>
                <select 
                    id="proveedor-select"
                    aria-label="Seleccionar Proveedor" 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-primary"
                    value={selectedProveedor}
                    onChange={(e) => setSelectedProveedor(e.target.value)}
                >
                    <option value="">-- Sin asignar --</option>
                    {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Costo Unitario</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input type="number" placeholder="0.00" className="pl-7 h-9 bg-white" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)}/>
                    </div>
                </div>
                
                {selectedProveedor && (
                    <div className="space-y-1 animate-in fade-in">
                        <Label htmlFor="estado-pago" className="text-xs text-muted-foreground">Estado Pago</Label>
                        <select 
                            id="estado-pago"
                            aria-label="Estado del Pago" 
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-primary"
                            value={estadoPago}
                            onChange={(e) => setEstadoPago(e.target.value)}
                        >
                            <option value="pendiente">Cuenta Corriente</option>
                            <option value="pagado">Pagado</option>
                        </select>
                    </div>
                )}
            </div>

            {selectedProveedor && estadoPago === 'pagado' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                    <Label htmlFor="medio-pago" className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3"/> Medio de Pago
                    </Label>
                    <select 
                        id="medio-pago"
                        aria-label="Medio de Pago" 
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-primary font-medium"
                        value={medioPago}
                        onChange={(e) => setMedioPago(e.target.value)}
                    >
                        <option value="efectivo">Efectivo 💵</option>
                        <option value="transferencia">Transferencia 🏦</option>
                        <option value="debito">Tarjeta Débito 💳</option>
                        <option value="credito">Tarjeta Crédito 💳</option>
                        <option value="cheque">Cheque 🎫</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
            )}
          </div>

          <Button onClick={handleGuardar} disabled={loading} size="lg" className="w-full font-bold mt-2">
            {loading ? "Guardando..." : "Confirmar Ingreso"}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  )
}