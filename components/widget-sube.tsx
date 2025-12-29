"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone, Zap, Tv, Loader2, Wallet, Banknote, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const SERVICIOS = [
    { id: 'claro', nombre: 'Claro', icon: Smartphone },
    { id: 'movistar', nombre: 'Movistar', icon: Smartphone },
    { id: 'personal', nombre: 'Personal', icon: Smartphone },
    { id: 'tuenti', nombre: 'Tuenti', icon: Smartphone },
    { id: 'directv', nombre: 'DirecTV', icon: Tv },
    { id: 'flow', nombre: 'Flow', icon: Tv },
    { id: 'edenor', nombre: 'Edenor', icon: Zap },
    { id: 'edesur', nombre: 'Edesur', icon: Zap },
]

type MetodoPago = 'efectivo' | 'billetera_virtual'

export default function WidgetServicios({ onVentaRegistrada }: { onVentaRegistrada: () => void }) {
    const [servicioId, setServicioId] = useState<string>(SERVICIOS[0].id) 
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") 
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
    const [loading, setLoading] = useState(false)
    const [virtualProductId, setVirtualProductId] = useState<string | null>(null)
    const [sucursalId, setSucursalId] = useState<string | null>(null)

    useEffect(() => {
        const fetchContext = async () => {
            const { data } = await supabase.from('productos').select('id').eq('nombre', 'Carga Virtual').single()
            if (data) setVirtualProductId(data.id)
            
            const { data: { user } } = await supabase.auth.getUser()
            if(user) {
                const { data: turno } = await supabase.from('caja_diaria')
                    .select('sucursal_id')
                    .eq('empleado_id', user.id)
                    .is('fecha_cierre', null)
                    .single()
                if(turno) setSucursalId(turno.sucursal_id)
            }
        }
        fetchContext()
    }, [])

    const handleCargar = async () => {
        if (!monto || !virtualProductId) return
        setLoading(true)

        const montoCarga = parseFloat(monto)
        const servicioExtra = parseFloat(costoServicio) || 0
        const totalCobrar = montoCarga + servicioExtra
        const nombreServicio = SERVICIOS.find(s => s.id === servicioId)?.nombre || "Servicio"

        try {
            const fechaArgentina = new Date();
            fechaArgentina.setHours(fechaArgentina.getHours() - 3);

            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.id) return
            
            const { data: turno } = await supabase.from('caja_diaria')
                .select('id, organization_id, sucursal_id')
                .eq('empleado_id', user.id)
                .is('fecha_cierre', null)
                .single()

            if (!turno) {
                toast.error("Caja Cerrada", { description: "Abre un turno primero." })
                setLoading(false)
                return
            }

            // 1. DESCONTAR SALDO DEL PROVEEDOR
            const { data: proveedorData } = await supabase.from('proveedores')
                .select('id, saldo_actual, nombre')
                .ilike('rubro', '%servicios%')
                .limit(1)
                .single()

            if (proveedorData) {
                const { error: rpcError } = await supabase.rpc('descontar_saldo_proveedor', {
                    proveedor_id_uuid: proveedorData.id,
                    monto_descuento: montoCarga
                })
                if (rpcError) toast.error("Error al descontar saldo proveedor")
            }

            // 2. REGISTRAR VENTA EN STOCK (CORREGIDO)
            const { error: errorStock } = await (supabase.from('stock') as any).insert({
                organization_id: turno.organization_id,
                sucursal_id: turno.sucursal_id, // ✅ Faltaba esto
                caja_diaria_id: turno.id,
                producto_id: virtualProductId,
                cantidad: 1, // ✅ OBLIGATORIO
                tipo_movimiento: 'salida', // ✅ OBLIGATORIO
                estado: 'vendido',
                fecha_venta: fechaArgentina.toISOString(),
                metodo_pago: metodoPago,
                precio_venta_historico: totalCobrar,
                costo_unitario_historico: montoCarga,
                notas: `Servicio: ${nombreServicio}` 
            })

            if (errorStock) throw errorStock

            // NOTA IMPORTANTE: No insertamos en movimientos_caja manualmente
            // porque el arqueo ya suma las ventas de stock en efectivo.

            toast.success(`Carga ${nombreServicio} Exitosa: $${totalCobrar}`)
            
            setMonto("")
            if (onVentaRegistrada) onVentaRegistrada()

        } catch (error: any) {
            toast.error("Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const montosRapidos = [1000, 2000, 3000, 5000]

    return (
        <Card className="p-4 bg-indigo-600 text-white shadow-lg border-2 border-indigo-500 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full"><Smartphone className="h-6 w-6 text-white" /></div>
                <div><h3 className="font-bold text-lg leading-none">Cargas Virtuales</h3><p className="text-[10px] text-indigo-200">Celular, TV y Servicios</p></div>
            </div>

            <div className="space-y-3">
                <div>
                    <Label htmlFor="select-servicio" className="text-indigo-100 text-xs mb-1 block">Operadora / Servicio</Label>
                    <select 
                        id="select-servicio" 
                        title="Seleccionar Operadora o Servicio" // ✅ SOLUCIÓN LINTER: Título explícito
                        aria-label="Seleccionar Operadora o Servicio" // ✅ SOLUCIÓN LINTER: Aria label
                        value={servicioId} 
                        onChange={(e) => setServicioId(e.target.value)} 
                        className="w-full h-10 rounded-md border border-indigo-400 bg-indigo-700 text-white font-medium px-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        {SERVICIOS.map(s => (<option key={s.id} value={s.id} className="bg-indigo-800 text-white">{s.nombre}</option>))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-indigo-100 text-xs">Monto</Label><Input type="number" className="bg-white text-black font-bold text-lg h-10" placeholder="$0" value={monto} onChange={e => setMonto(e.target.value)} /></div>
                    <div><Label className="text-indigo-100 text-xs">Costo Serv.</Label><Input type="number" className="bg-white/90 text-slate-600 h-10" value={costoServicio} onChange={e => setCostoServicio(e.target.value)} /></div>
                </div>
            </div>

            <div className="flex gap-2 justify-between">{montosRapidos.map(m => (<button key={m} onClick={() => setMonto(m.toString())} className="text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2 py-1 rounded transition-colors flex-1">${m}</button>))}</div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-indigo-800/50 rounded-lg">
                <button onClick={() => setMetodoPago('efectivo')} className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all", metodoPago === 'efectivo' ? "bg-green-500 text-white shadow-md" : "bg-transparent text-indigo-200 hover:bg-white/10")}><Banknote className="h-4 w-4" /> Efectivo</button>
                <button onClick={() => setMetodoPago('billetera_virtual')} className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all", metodoPago === 'billetera_virtual' ? "bg-blue-400 text-blue-950 shadow-md" : "bg-transparent text-indigo-200 hover:bg-white/10")}><Wallet className="h-4 w-4" /> Digital</button>
            </div>

            <Button className={cn("w-full font-black text-md h-12 shadow-md transition-colors", metodoPago === 'efectivo' ? "bg-yellow-400 hover:bg-yellow-500 text-indigo-900" : "bg-blue-300 hover:bg-blue-200 text-indigo-900")} onClick={handleCargar} disabled={loading || !monto}>
                {loading ? <Loader2 className="animate-spin" /> : <>COBRAR ${((parseFloat(monto) || 0) + (parseFloat(costoServicio) || 0)).toLocaleString()} <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
        </Card>
    )
}