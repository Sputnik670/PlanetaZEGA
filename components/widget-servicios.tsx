// components/widget-servicios.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Smartphone, Zap, Tv, Globe, Check, Loader2, 
    Wallet, Banknote, ArrowRight 
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Sacamos SUBE de aquí porque ya tiene su propio widget
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
    const [servicioId, setServicioId] = useState<string>(SERVICIOS[0].id) // Default: Claro
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") 
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
    const [loading, setLoading] = useState(false)
    const [virtualProductId, setVirtualProductId] = useState<string | null>(null)

    // Cargar ID del producto "Carga Virtual" al montar
    useEffect(() => {
        const fetchId = async () => {
            const { data } = await supabase
                .from('productos')
                .select('id')
                .eq('nombre', 'Carga Virtual')
                .single()
            if (data) setVirtualProductId(data.id)
        }
        fetchId()
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
            
            const { data: turno } = await supabase.from('caja_diaria')
                .select('id, organization_id')
                .eq('empleado_id', user?.id)
                .is('fecha_cierre', null)
                .single()

            if (!turno) {
                toast.error("Caja Cerrada", { description: "Abre un turno primero." })
                setLoading(false)
                return
            }

            // 1. Stock
            const { error: errorStock } = await supabase.from('stock').insert({
                organization_id: turno.organization_id,
                caja_diaria_id: turno.id,
                producto_id: virtualProductId,
                estado: 'vendido',
                fecha_venta: fechaArgentina.toISOString(),
                metodo_pago: metodoPago,
                costo_unitario_historico: montoCarga,
                // Guardamos en notas qué servicio fue
                notas: `Servicio: ${nombreServicio}` 
            })

            if (errorStock) throw errorStock

            // 2. Caja Física (Solo efectivo)
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
                description: `Cobrado: $${totalCobrar} (${metodoPago.replace('_', ' ')})`
            })
            
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
        <Card className="p-4 bg-indigo-600 text-white shadow-lg border-2 border-indigo-500 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full">
                    <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-none">Cargas Virtuales</h3>
                    <p className="text-[10px] text-indigo-200">Celular, TV y Servicios</p>
                </div>
            </div>

            {/* Selector de Servicio y Montos */}
            <div className="space-y-3">
                {/* Desplegable de Operadora */}
                <div>
                    {/* Corrección A11Y: Agregado htmlFor */}
                    <Label htmlFor="select-servicio" className="text-indigo-100 text-xs mb-1 block">
                        Operadora / Servicio
                    </Label>
                    <select 
                        id="select-servicio" // Corrección A11Y: Agregado ID
                        name="servicio"      // Corrección A11Y: Agregado Name
                        aria-label="Seleccionar servicio u operadora" // Corrección A11Y: Etiqueta explícita
                        value={servicioId}
                        onChange={(e) => setServicioId(e.target.value)}
                        className="w-full h-10 rounded-md border border-indigo-400 bg-indigo-700 text-white font-medium px-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        {SERVICIOS.map(s => (
                            <option key={s.id} value={s.id} className="bg-indigo-800 text-white">
                                {s.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-indigo-100 text-xs">Monto</Label>
                        <Input 
                            type="number" 
                            className="bg-white text-black font-bold text-lg h-10" 
                            placeholder="$0"
                            value={monto}
                            onChange={e => setMonto(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-indigo-100 text-xs">Costo Serv.</Label>
                        <Input 
                            type="number" 
                            className="bg-white/90 text-slate-600 h-10" 
                            value={costoServicio}
                            onChange={e => setCostoServicio(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Botones Rápidos */}
            <div className="flex gap-2 justify-between">
                {montosRapidos.map(m => (
                    <button 
                        key={m}
                        onClick={() => setMonto(m.toString())}
                        className="text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2 py-1 rounded transition-colors flex-1"
                    >
                        ${m}
                    </button>
                ))}
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-indigo-800/50 rounded-lg">
                <button
                    onClick={() => setMetodoPago('efectivo')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all",
                        metodoPago === 'efectivo' 
                            ? "bg-green-500 text-white shadow-md" 
                            : "bg-transparent text-indigo-200 hover:bg-white/10"
                    )}
                >
                    <Banknote className="h-4 w-4" /> Efectivo
                </button>
                <button
                    onClick={() => setMetodoPago('billetera_virtual')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all",
                        metodoPago === 'billetera_virtual' 
                            ? "bg-blue-400 text-blue-950 shadow-md" 
                            : "bg-transparent text-indigo-200 hover:bg-white/10"
                    )}
                >
                    <Wallet className="h-4 w-4" /> MP / Digital
                </button>
            </div>

            {/* Botón de Acción */}
            <Button 
                className={cn(
                    "w-full font-black text-md h-12 shadow-md transition-colors",
                    metodoPago === 'efectivo' 
                        ? "bg-yellow-400 hover:bg-yellow-500 text-indigo-900" 
                        : "bg-blue-300 hover:bg-blue-200 text-indigo-900"
                )}
                onClick={handleCargar}
                disabled={loading || !monto}
            >
                {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                        COBRAR ${((parseFloat(monto) || 0) + (parseFloat(costoServicio) || 0)).toLocaleString()} 
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                )}
            </Button>
        </Card>
    )
}