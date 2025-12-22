"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bus, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function WidgetSube({ onVentaRegistrada }: { onVentaRegistrada: () => void }) {
    const [monto, setMonto] = useState("")
    const [costoServicio, setCostoServicio] = useState("50") // Default $50 extra (ajustable)
    const [loading, setLoading] = useState(false)
    const [subeProductId, setSubeProductId] = useState<string | null>(null)

    // Buscamos el ID del producto "Carga SUBE" al iniciar
    useEffect(() => {
        const fetchId = async () => {
            const { data } = await supabase.from('productos').select('id').eq('nombre', 'Carga SUBE').single()
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
            // 1. Registramos la venta en la tabla STOCK
            const { error } = await supabase.from('stock').insert({
                producto_id: subeProductId,
                estado: 'vendido',
                fecha_venta: new Date().toISOString(),
                metodo_pago: 'efectivo',
                costo_unitario_historico: montoCarga, 
            })

            if (error) throw error

            const { data: userData } = await supabase.auth.getUser()
            
            // Buscar turno abierto
            // CORRECCIÓN AQUÍ: Usamos userData.user?.id
            const { data: turno } = await supabase.from('caja_diaria')
                .select('id')
                .eq('empleado_id', userData.user?.id)
                .is('fecha_cierre', null)
                .single()

            if (turno) {
                // Registrar Ingreso de Dinero
                await supabase.from('movimientos_caja').insert({
                    caja_id: turno.id,
                    tipo: 'ingreso',
                    monto: totalCobrar,
                    descripcion: `Carga SUBE ($${montoCarga}) + Serv ($${servicio})`
                })
                
                toast.success(`Carga registrada: $${totalCobrar}`, {
                    description: `Ganancia servicio: $${servicio}`
                })
                
                setMonto("")
                onVentaRegistrada() 
            } else {
                toast.error("No tienes un turno de caja abierto.")
            }

        } catch (error) {
            console.error(error)
            toast.error("Error al registrar carga")
        } finally {
            setLoading(false)
        }
    }

    const montosRapidos = [500, 1000, 2000, 5000]

    return (
        <Card className="p-4 bg-blue-600 text-white shadow-lg border-2 border-blue-500">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-white/20 rounded-full">
                    <Bus className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-none">Carga SUBE</h3>
                    <p className="text-[10px] text-blue-200">Servicios Virtuales</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-blue-100 text-xs">Monto a Cargar</Label>
                        <Input 
                            type="number" 
                            className="bg-white text-black font-bold text-lg h-10" 
                            placeholder="$0"
                            value={monto}
                            onChange={e => setMonto(e.target.value)}
                            autoFocus
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
                            className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded transition-colors"
                        >
                            ${m}
                        </button>
                    ))}
                </div>

                <Button 
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black text-md h-12 shadow-md"
                    onClick={handleCargar}
                    disabled={loading || !monto}
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            COBRAR ${((parseFloat(monto) || 0) + (parseFloat(costoServicio) || 0)).toLocaleString()} <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </Card>
    )
}