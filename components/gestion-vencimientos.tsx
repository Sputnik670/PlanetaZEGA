// components/gestion-vencimientos.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format, addDays, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

interface GestionVencimientosProps {
    turnoId: string
    empleadoId: string
    onAccionRealizada?: () => void
}

export default function GestionVencimientos({ turnoId, empleadoId, onAccionRealizada }: GestionVencimientosProps) {
    const [loading, setLoading] = useState(true)
    const [productosVencidos, setProductosVencidos] = useState<any[]>([])
    const [procesandoId, setProcesandoId] = useState<string | null>(null)

    const fetchVencimientos = useCallback(async () => {
        try {
            const hoy = new Date()
            const fechaLimite = format(addDays(hoy, 10), 'yyyy-MM-dd') // Buscamos hasta 10 días adelante

            const { data, error } = await supabase
                .from('stock')
                .select('*, productos(nombre, emoji, categoria)')
                .eq('estado', 'pendiente')
                .lt('fecha_vencimiento', fechaLimite)
                .order('fecha_vencimiento', { ascending: true })

            if (error) throw error
            setProductosVencidos(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar vencimientos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchVencimientos()
    }, [fetchVencimientos])

    const handleMermar = async (stockId: string, nombreProducto: string) => {
        if (!confirm(`¿Confirmar que el producto ${nombreProducto} se descarta por vencimiento/daño?`)) return

        setProcesandoId(stockId)
        try {
            // 1. Marcar stock como 'mermado'
            const { error: updateError } = await supabase
                .from('stock')
                .update({ 
                    estado: 'mermado',
                    // Si tienes campos de auditoría de merma, agrégalos aquí:
                    // fecha_merma: new Date().toISOString(),
                    // empleado_merma_id: empleadoId
                })
                .eq('id', stockId)

            if (updateError) throw updateError

            // 2. Actualizar Misión de Vencimiento (Si existe y está activa)
            // Buscamos si hay una misión de tipo 'vencimiento' activa para este turno
            const { data: misiones } = await supabase
                .from('misiones')
                .select('*')
                .eq('caja_diaria_id', turnoId)
                .eq('tipo', 'vencimiento')
                .eq('es_completada', false)
            
            if (misiones && misiones.length > 0) {
                const mision = misiones[0]
                const nuevasUnidades = (mision.unidades_completadas || 0) + 1
                const completada = nuevasUnidades >= mision.objetivo_unidades

                await supabase
                    .from('misiones')
                    .update({ 
                        unidades_completadas: nuevasUnidades,
                        es_completada: completada
                    })
                    .eq('id', mision.id)

                if (completada) {
                    toast.success("¡Misión Completada! 🎯", { description: "Has gestionado todos los vencimientos." })
                     // Sumar XP al perfil
                     const { data: perfil } = await supabase.from('perfiles').select('xp').eq('id', empleadoId).single()
                     if (perfil) {
                        await supabase.from('perfiles').update({ xp: perfil.xp + mision.puntos }).eq('id', empleadoId)
                     }
                }
            }

            toast.success("Producto Mermado", { description: "Inventario actualizado." })
            
            // Recargar lista
            setProductosVencidos(prev => prev.filter(p => p.id !== stockId))
            if (onAccionRealizada) onAccionRealizada()

        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setProcesandoId(null)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>

    if (productosVencidos.length === 0) {
        return (
            <Card className="p-8 text-center bg-emerald-50 border-emerald-100 border-2 border-dashed">
                <div className="bg-white p-4 rounded-full w-fit mx-auto mb-4 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-bold text-emerald-800 text-lg">Todo en Orden</h3>
                <p className="text-sm text-emerald-600 mt-2">No hay productos próximos a vencer en los siguientes 10 días.</p>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-lg">Riesgo de Vencimiento ({productosVencidos.length})</h3>
            </div>
            
            <div className="grid gap-3">
                {productosVencidos.map((item) => {
                    const diasRestantes = differenceInDays(parseISO(item.fecha_vencimiento), new Date())
                    const esCritico = diasRestantes <= 3

                    return (
                        <Card key={item.id} className={`p-4 flex items-center justify-between border-l-4 ${esCritico ? 'border-l-red-500 bg-red-50/50' : 'border-l-orange-400 bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{item.productos?.emoji || '📦'}</span>
                                <div>
                                    <h4 className="font-bold text-sm leading-tight">{item.productos?.nombre}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Vence: <span className="font-medium text-foreground">{format(parseISO(item.fecha_vencimiento), 'dd/MM/yyyy')}</span>
                                    </p>
                                    <Badge variant="outline" className={`mt-1 text-[10px] h-5 ${esCritico ? 'text-red-600 border-red-200 bg-red-50' : 'text-orange-600 border-orange-200 bg-orange-50'}`}>
                                        {diasRestantes < 0 ? `Vencido hace ${Math.abs(diasRestantes)} días` : `Quedan ${diasRestantes} días`}
                                    </Badge>
                                </div>
                            </div>
                            
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-xs shadow-sm"
                                disabled={!!procesandoId}
                                onClick={() => handleMermar(item.id, item.productos?.nombre)}
                            >
                                {procesandoId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                Mermar
                            </Button>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}