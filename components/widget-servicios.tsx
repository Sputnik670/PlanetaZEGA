"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Smartphone, Zap, Tv, Bus, Check, Loader2, 
    Wallet, Banknote, CreditCard 
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Definimos los servicios disponibles
const SERVICIOS = [
    { id: 'claro', nombre: 'Claro', icon: Smartphone, color: 'bg-red-500' },
    { id: 'movistar', nombre: 'Movistar', icon: Smartphone, color: 'bg-green-600' },
    { id: 'personal', nombre: 'Personal', icon: Smartphone, color: 'bg-blue-500' },
    { id: 'tuenti', nombre: 'Tuenti', icon: Smartphone, color: 'bg-pink-600' },
    { id: 'sube', nombre: 'SUBE', icon: Bus, color: 'bg-blue-400' },
    { id: 'directv', nombre: 'DirecTV', icon: Tv, color: 'bg-sky-600' },
    { id: 'edenor', nombre: 'Edenor', icon: Zap, color: 'bg-yellow-500' },
    { id: 'edesur', nombre: 'Edesur', icon: Zap, color: 'bg-orange-500' },
]

type MetodoPago = 'efectivo' | 'billetera_virtual' | 'tarjeta'

export default function WidgetServicios({ onVentaRegistrada }: { onVentaRegistrada: () => void }) {
    const [servicioSeleccionado, setServicioSeleccionado] = useState<string | null>(null)
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") // Tu ganancia por la carga
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
    const [loading, setLoading] = useState(false)
    
    // IDs de productos en base de datos
    const [idsProductos, setIdsProductos] = useState<{ sube: string | null, virtual: string | null }>({ sube: null, virtual: null })

    // Cargar IDs de productos al montar
    useEffect(() => {
        const fetchIds = async () => {
            const { data } = await supabase
                .from('productos')
                .select('id, nombre')
                .in('nombre', ['Carga SUBE', 'Carga Virtual'])
            
            if (data) {
                const sube = data.find(p => p.nombre === 'Carga SUBE')?.id || null
                const virtual = data.find(p => p.nombre === 'Carga Virtual')?.id || null
                setIdsProductos({ sube, virtual })
            }
        }
        fetchIds()
    }, [])

    const handleCargar = async () => {
        if (!monto || !servicioSeleccionado) return
        
        // Determinar qué ID de producto usar
        let productId = idsProductos.virtual
        if (servicioSeleccionado === 'sube') productId = idsProductos.sube || idsProductos.virtual
        
        if (!productId) {
            toast.error("Error de configuración", { description: "No se encontró el producto 'Carga Virtual' en la base de datos." })
            return
        }

        setLoading(true)

        const montoCarga = parseFloat(monto)
        const servicioExtra = parseFloat(costoServicio) || 0
        const totalCobrar = montoCarga + servicioExtra
        const nombreServicio = SERVICIOS.find(s => s.id === servicioSeleccionado)?.nombre || "Servicio"

        try {
            const fechaArgentina = new Date();
            fechaArgentina.setHours(fechaArgentina.getHours() - 3);

            const { data: { user } } = await supabase.auth.getUser()
            
            // Buscar turno activo
            const { data: turno } = await supabase.from('caja_diaria')
                .select('id, organization_id')
                .eq('empleado_id', user?.id)
                .is('fecha_cierre', null)
                .single()

            if (!turno) {
                toast.error("Caja Cerrada", { description: "Debes abrir un turno para registrar cobros." })
                setLoading(false)
                return
            }

            // 1. Registrar la VENTA en Stock (Historial)
            // Se registra siempre, sin importar el medio de pago
            const { error: errorStock } = await supabase.from('stock').insert({
                organization_id: turno.organization_id,
                caja_diaria_id: turno.id, // Vinculamos al turno
                producto_id: productId,
                estado: 'vendido',
                fecha_venta: fechaArgentina.toISOString(),
                metodo_pago: metodoPago, // 'efectivo', 'tarjeta', etc.
                costo_unitario_historico: montoCarga, // Lo que nos cuesta a nosotros (la carga en sí)
                // Nota: Podríamos guardar "Ganancia" en algún lado si tu tabla lo soporta, 
                // pero por ahora el precio_venta implícito será totalCobrar.
            })

            if (errorStock) throw errorStock

            // 2. Registrar MOVIMIENTO DE CAJA (Solo si es EFECTIVO)
            if (metodoPago === 'efectivo') {
                const { error: errorCaja } = await supabase.from('movimientos_caja').insert({
                    organization_id: turno.organization_id,
                    caja_diaria_id: turno.id,
                    empleado_id: user?.id,
                    tipo: 'ingreso',
                    monto: totalCobrar,
                    descripcion: `Carga ${nombreServicio} ($${montoCarga}) + Serv ($${servicioExtra})`
                })
                if (errorCaja) throw errorCaja
            }

            toast.success(`Carga ${nombreServicio} Exitosa`, {
                description: metodoPago === 'efectivo' 
                    ? `Se ingresaron $${totalCobrar} a la caja.` 
                    : `Cobrado con ${metodoPago.replace('_', ' ')}.`
            })
            
            // Resetear formulario parcial
            setMonto("")
            if (onVentaRegistrada) onVentaRegistrada()

        } catch (error: any) {
            console.error(error)
            toast.error("Error", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const montosRapidos = [1000, 2000, 3000, 5000]

    return (
        <Card className="p-4 shadow-md border bg-white flex flex-col gap-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Smartphone className="h-5 w-5 text-indigo-600" /> Cargas Virtuales y Servicios
            </h3>

            {/* Selector de Servicio */}
            <div className="grid grid-cols-4 gap-2">
                {SERVICIOS.map(s => {
                    const isSelected = servicioSeleccionado === s.id
                    return (
                        <button
                            key={s.id}
                            onClick={() => setServicioSeleccionado(s.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-20",
                                isSelected ? `border-2 border-black ring-1 ring-black ${s.color} text-white` : "border-gray-200 hover:bg-gray-50 text-gray-600"
                            )}
                        >
                            <s.icon className={cn("h-6 w-6 mb-1", isSelected ? "text-white" : "text-gray-500")} />
                            <span className="text-[10px] font-bold leading-tight text-center">{s.nombre}</span>
                        </button>
                    )
                })}
            </div>

            {/* Formulario (Solo aparece si seleccionas servicio) */}
            {servicioSeleccionado && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-3 rounded-lg border">
                    
                    {/* Inputs de Dinero */}
                    <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                            <Label className="text-xs text-muted-foreground">Monto Recarga</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <Input 
                                    type="number" 
                                    className="pl-6 font-bold text-lg h-12 bg-white" 
                                    placeholder="0"
                                    value={monto}
                                    onChange={e => setMonto(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Costo Serv.</Label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <Input 
                                    type="number" 
                                    className="pl-5 text-gray-600 h-12 bg-white" 
                                    value={costoServicio}
                                    onChange={e => setCostoServicio(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botones de Monto Rápido */}
                    <div className="flex gap-2">
                        {montosRapidos.map(m => (
                            <button 
                                key={m}
                                onClick={() => setMonto(m.toString())}
                                className="flex-1 text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-1.5 rounded"
                            >
                                ${m}
                            </button>
                        ))}
                    </div>

                    {/* Selector de Método de Pago */}
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Método de Pago</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setMetodoPago('efectivo')}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 rounded border text-xs font-bold transition-all",
                                    metodoPago === 'efectivo' ? "bg-green-100 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-500"
                                )}
                            >
                                <Banknote className="h-4 w-4 mb-1" /> Efectivo
                            </button>
                            <button
                                onClick={() => setMetodoPago('billetera_virtual')}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 rounded border text-xs font-bold transition-all",
                                    metodoPago === 'billetera_virtual' ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-500"
                                )}
                            >
                                <Wallet className="h-4 w-4 mb-1" /> MP / QR
                            </button>
                            <button
                                onClick={() => setMetodoPago('tarjeta')}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 rounded border text-xs font-bold transition-all",
                                    metodoPago === 'tarjeta' ? "bg-purple-100 border-purple-500 text-purple-700" : "bg-white border-gray-200 text-gray-500"
                                )}
                            >
                                <CreditCard className="h-4 w-4 mb-1" /> Tarjeta
                            </button>
                        </div>
                    </div>

                    {/* Botón Final */}
                    <Button 
                        className={cn(
                            "w-full h-12 text-lg font-black shadow-md transition-all",
                            metodoPago === 'efectivo' ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={handleCargar}
                        disabled={loading || !monto}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <div className="flex items-center gap-2">
                                <Check className="h-6 w-6" />
                                COBRAR ${((parseFloat(monto) || 0) + (parseFloat(costoServicio) || 0)).toLocaleString()}
                            </div>
                        )}
                    </Button>
                </div>
            )}
        </Card>
    )
}