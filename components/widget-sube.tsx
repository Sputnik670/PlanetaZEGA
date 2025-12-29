"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone, Zap, Tv, Loader2, Wallet, Banknote, ArrowRight, Bus } from "lucide-react" // Agregué Bus que faltaba en imports
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ... (No hay constantes en SUBE)

type MetodoPago = 'efectivo' | 'billetera_virtual'

export default function WidgetSube({ onVentaRegistrada }: { onVentaRegistrada: () => void }) {
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") 
    const [loading, setLoading] = useState(false)
    const [subeProductId, setSubeProductId] = useState<string | null>(null)
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
    const [sucursalId, setSucursalId] = useState<string | null>(null)

    useEffect(() => {
        const fetchContext = async () => {
            const { data } = await supabase.from('productos').select('id').eq('nombre', 'Carga SUBE').single()
            if (data) setSubeProductId(data.id)
            
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
        if (!monto || !subeProductId) return
        setLoading(true)

        const montoCarga = parseFloat(monto)
        const servicioExtra = parseFloat(costoServicio) || 0
        const totalCobrar = montoCarga + servicioExtra

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

            // CORRECCIÓN: Agregamos cantidad y tipo_movimiento
            const { error: errorStock } = await (supabase.from('stock') as any).insert({
                organization_id: turno.organization_id,
                sucursal_id: turno.sucursal_id,
                caja_diaria_id: turno.id,
                producto_id: subeProductId,
                cantidad: 1, // <--- ESTO FALTABA
                tipo_movimiento: 'salida', // <--- ESTO FALTABA
                estado: 'vendido',
                fecha_venta: fechaArgentina.toISOString(),
                metodo_pago: metodoPago,
                precio_venta_historico: totalCobrar,
                costo_unitario_historico: montoCarga,
                notas: `Carga SUBE: $${montoCarga}` 
            })

            if (errorStock) throw errorStock

            toast.success(`Carga SUBE Exitosa: $${totalCobrar}`)
            
            setMonto("")
            if (onVentaRegistrada) onVentaRegistrada()

        } catch (error: any) {
            toast.error("Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const montosRapidos = [500, 1000, 2000, 5000]

    return (
        <Card className="p-4 bg-blue-600 text-white shadow-lg border-2 border-blue-500 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full"><Bus className="h-6 w-6 text-white" /></div>
                <div><h3 className="font-bold text-lg leading-none">Carga SUBE</h3><p className="text-[10px] text-blue-200">Transporte</p></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-blue-100 text-xs">Monto</Label><Input type="number" className="bg-white text-black font-bold text-lg h-10" placeholder="$0" value={monto} onChange={e => setMonto(e.target.value)} /></div>
                <div><Label className="text-blue-100 text-xs">Costo Serv.</Label><Input type="number" className="bg-white/90 text-slate-600 h-10" value={costoServicio} onChange={e => setCostoServicio(e.target.value)} /></div>
            </div>

            <div className="flex gap-2 justify-between">{montosRapidos.map(m => (<button key={m} onClick={() => setMonto(m.toString())} className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded transition-colors flex-1">${m}</button>))}</div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-blue-800/50 rounded-lg">
                <button onClick={() => setMetodoPago('efectivo')} className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all", metodoPago === 'efectivo' ? "bg-green-500 text-white shadow-md" : "bg-transparent text-blue-200 hover:bg-white/10")}><Banknote className="h-4 w-4" /> Efectivo</button>
                <button onClick={() => setMetodoPago('billetera_virtual')} className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all", metodoPago === 'billetera_virtual' ? "bg-blue-400 text-blue-950 shadow-md" : "bg-transparent text-blue-200 hover:bg-white/10")}><Wallet className="h-4 w-4" /> Digital</button>
            </div>

            <Button className={cn("w-full font-black text-md h-12 shadow-md transition-colors", metodoPago === 'efectivo' ? "bg-yellow-400 hover:bg-yellow-500 text-blue-900" : "bg-blue-300 hover:bg-blue-200 text-blue-900")} onClick={handleCargar} disabled={loading || !monto}>
                {loading ? <Loader2 className="animate-spin" /> : <>COBRAR ${((parseFloat(monto) || 0) + (parseFloat(costoServicio) || 0)).toLocaleString()} <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
        </Card>
    )
}