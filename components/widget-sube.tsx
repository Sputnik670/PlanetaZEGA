// components/widget-sube.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bus, ArrowRight, Loader2, Wallet, Banknote } from "lucide-react" //
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Definimos los métodos permitidos en este widget rápido
type MetodoPagoWidget = 'efectivo' | 'billetera_virtual'

export default function WidgetSube({ onVentaRegistrada }: { onVentaRegistrada: () => void }) {
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") 
    const [loading, setLoading] = useState(false)
    const [subeProductId, setSubeProductId] = useState<string | null>(null)
    
    // ✅ Estado para controlar el método de pago
    const [metodoPago, setMetodoPago] = useState<MetodoPagoWidget>('efectivo')

    useEffect(() => {
        const fetchId = async () => {
            const { data } = await supabase
                .from('productos')
                .select('id')
                .eq('nombre', 'Carga SUBE')
                .single()
            if (data) setSubeProductId(data.id)
        }
        fetchId()
    }, [])

    const handleCargar = async () => {
        if (!monto || !subeProductId) return
        setLoading(true)

        const montoCarga = parseFloat(monto)
        const servicio = parseFloat(costoServicio) || 0
        const totalCobrar = montoCarga + servicio

        try {
            const fechaArgentina = new Date();
            fechaArgentina.setHours(fechaArgentina.getHours() - 3);

            const { data: { user } } = await supabase.auth.getUser()
            
            // Buscar turno abierto
            if (!user?.id) return
            const { data: turno } = await supabase.from('caja_diaria')
                .select('id, organization_id')
                .eq('empleado_id', user.id)
                .is('fecha_cierre', null)
                .single()

            if (!turno) {
                toast.error("No tienes un turno de caja abierto.")
                setLoading(false)
                return
            }

            // 1. Registramos la "Venta" en Stock (Siempre se registra, sea cual sea el medio de pago)
            const { error } = await (supabase.from('stock') as any).insert({
                organization_id: turno.organization_id,
                producto_id: subeProductId,
                estado: 'vendido',
                fecha_venta: fechaArgentina.toISOString(),
                metodo_pago: metodoPago, // ✅ Usamos el método seleccionado (billetera_virtual o efectivo)
                costo_unitario_historico: montoCarga, 
                caja_diaria_id: turno.id // Vinculamos al turno actual para reportes
            })

            if (error) throw error

            // 2. Registrar Ingreso en Caja FÍSICA (Solo si es EFECTIVO)
            if (metodoPago === 'efectivo') {
                const { error: errorCaja } = await supabase.from('movimientos_caja').insert({
                    organization_id: turno.organization_id,
                    caja_diaria_id: turno.id,
                    empleado_id: user?.id,
                    tipo: 'ingreso',
                    monto: totalCobrar,
                    descripcion: `Carga SUBE ($${montoCarga}) + Serv ($${servicio})`
                })

                if (errorCaja) throw errorCaja
            }

            toast.success(`Carga registrada: $${totalCobrar}`, {
                description: metodoPago === 'efectivo' 
                    ? `Ingresado a caja física. Ganancia: $${servicio}` 
                    : `Cobrado con MP/Digital. Ganancia: $${servicio}`
            })
            
            setMonto("")
            if (onVentaRegistrada) onVentaRegistrada() 

        } catch (error: any) {
            console.error(error)
            toast.error("Error al registrar carga", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const montosRapidos = [500, 1000, 2000, 5000]

    return (
        <Card className="p-4 bg-blue-600 text-white shadow-lg border-2 border-blue-500 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full">
                    <Bus className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-none">Carga SUBE</h3>
                    <p className="text-[10px] text-blue-200">Servicios Virtuales</p>
                </div>
            </div>

            {/* Inputs de Montos */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-blue-100 text-xs">Monto a Cargar</Label>
                    <Input 
                        type="number" 
                        className="bg-white text-black font-bold text-lg h-10" 
                        placeholder="$0"
                        value={monto}
                        onChange={e => setMonto(e.target.value)}
                        // autoFocus // A veces molesta en móviles si hay teclado virtual
                    />
                </div>
                <div>
                    <Label className="text-blue-100 text-xs">Costo Servicio</Label>
                    <Input 
                        type="number" 
                        className="bg-white/90 text-slate-600 h-10" 
                        value={costoServicio}
                        onChange={e => setCostoServicio(e.target.value)}
                    />
                </div>
            </div>

            {/* Botones Rápidos */}
            <div className="flex gap-2 justify-between">
                {montosRapidos.map(m => (
                    <button 
                        key={m}
                        onClick={() => setMonto(m.toString())}
                        className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded transition-colors flex-1"
                    >
                        ${m}
                    </button>
                ))}
            </div>

            {/* ✅ NUEVO: Selector de Método de Pago */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-blue-800/50 rounded-lg">
                <button
                    onClick={() => setMetodoPago('efectivo')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all",
                        metodoPago === 'efectivo' 
                            ? "bg-green-500 text-white shadow-md" 
                            : "bg-transparent text-blue-200 hover:bg-white/10"
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
                            : "bg-transparent text-blue-200 hover:bg-white/10"
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
                        ? "bg-yellow-400 hover:bg-yellow-500 text-blue-900" 
                        : "bg-blue-300 hover:bg-blue-200 text-blue-900"
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