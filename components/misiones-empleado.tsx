// components/misiones-empleado.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Zap, Target, CheckCheck, AlertTriangle, Package, X } from "lucide-react" 
import { toast } from "sonner"
import { format, parseISO, addDays } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils" 

// Tipado para las misiones activas
interface Mision {
    id: string
    tipo: 'vencimiento' | 'arqueo_cierre'
    descripcion: string
    objetivo_unidades: number
    unidades_completadas: number
    es_completada: boolean
    puntos: number
    created_at: string
}

// CORRECCIÓN: El precio viene dentro del producto
interface ProductoJoin {
    nombre: string
    emoji: string
    precio_venta: number 
}

interface StockJoin {
    id: string
    producto_id: string
    fecha_vencimiento: string
    // Eliminamos precio_venta de la raíz porque no está en la tabla stock
    productos: ProductoJoin | null 
}

interface StockCritico {
    id: string
    producto_id: string
    nombre_producto: string
    emoji_producto: string
    fecha_vencimiento: string
    precio_venta: number
}

interface MisionesEmpleadoProps {
    turnoId: string
    onMisionesUpdated: () => void
}

export default function MisionesEmpleado({ turnoId, onMisionesUpdated }: MisionesEmpleadoProps) {
    const [misiones, setMisiones] = useState<Mision[]>([])
    const [loading, setLoading] = useState(true)
    const [procesando, setProcesando] = useState(false)
    
    // Estados para el modal de Mermar Stock
    const [showMermarModal, setShowMermarModal] = useState(false)
    const [stockParaMermar, setStockParaMermar] = useState<StockCritico[]>([])
    const [misionVencimiento, setMisionVencimiento] = useState<Mision | null>(null)

    // 1. Fetch de Misiones
    const fetchMisiones = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('misiones')
                .select('*')
                .eq('caja_diaria_id', turnoId)
                .order('created_at', { ascending: true })

            if (error) throw error
            
            setMisiones(data || [])
            const vencimientoMision = data.find(m => m.tipo === 'vencimiento')
            setMisionVencimiento(vencimientoMision || null)

        } catch (error) {
            console.error("Error fetching misiones:", error)
            toast.error("Error de Misiones", { description: "No se pudieron cargar las tareas." })
        } finally {
            setLoading(false)
        }
    }, [turnoId])

    // 2. Lógica para Abrir el Modal de Mermar (CORREGIDA)
    const handleOpenMermarModal = async () => {
        if (!misionVencimiento) return
        setProcesando(true)

        try {
            const hoy = new Date()
            const fechaLimite = format(addDays(hoy, 7), 'yyyy-MM-dd') 

            // CORRECCIÓN: Solicitamos precio_venta dentro de productos()
            const { data, error } = await supabase
                .from('stock')
                .select(`
                    id, 
                    producto_id, 
                    fecha_vencimiento, 
                    productos(nombre, emoji, precio_venta)
                `)
                .eq('estado', 'pendiente')
                .lt('fecha_vencimiento', fechaLimite)
                .order('fecha_vencimiento', { ascending: true })
                .returns<StockJoin[]>()
            
            if (error) throw error
            
            const stockItems = data || []

            const stockCriticoFormateado: StockCritico[] = stockItems.map(item => ({
                id: item.id,
                producto_id: item.producto_id,
                nombre_producto: item.productos?.nombre || 'Producto Desconocido', 
                emoji_producto: item.productos?.emoji || '📦',
                fecha_vencimiento: item.fecha_vencimiento,
                // CORRECCIÓN: Leemos el precio desde el objeto anidado
                precio_venta: item.productos?.precio_venta || 0
            }))

            setStockParaMermar(stockCriticoFormateado)
            setShowMermarModal(true)

        } catch (error: any) {
            console.error("Error cargando stock crítico:", error)
            toast.error("Error de Stock", { description: error.message || "No se pudo cargar el stock a mermar." })
        } finally {
            setProcesando(false)
        }
    }

    // 3. Lógica para Mermar Stock
    const handleMermarStock = async () => {
        if (stockParaMermar.length === 0 || !misionVencimiento) {
            toast.warning("Sin Tareas", { description: "No hay stock crítico para mermar o la misión no está activa." })
            return
        }

        setProcesando(true)
        setShowMermarModal(false)

        try {
            const stockIdsToUpdate = stockParaMermar.map(item => item.id)
            const unidadesMermadas = stockIdsToUpdate.length
            
            // 1. Actualizar stock
            const { error: stockUpdateError } = await supabase
                .from('stock')
                .update({ 
                    estado: 'mermado', 
                    fecha_mermado: new Date().toISOString() 
                })
                .in('id', stockIdsToUpdate)
            
            if (stockUpdateError) throw stockUpdateError

            // 2. Actualizar misión
            const nuevoProgreso = misionVencimiento.unidades_completadas + unidadesMermadas
            const misionCompletada = nuevoProgreso >= misionVencimiento.objetivo_unidades

            const { error: misionUpdateError } = await supabase
                .from('misiones')
                .update({ 
                    unidades_completadas: nuevoProgreso,
                    es_completada: misionCompletada,
                })
                .eq('id', misionVencimiento.id)
            
            if (misionUpdateError) throw misionUpdateError

            toast.success("Mermado Registrado ✅", { description: `Se procesaron ${unidadesMermadas} unidades en riesgo.` })
            
            if (misionCompletada) {
                toast.success(`✨ ¡MISIÓN COMPLETADA!`, { 
                    description: `Excelente trabajo. Ganaste +${misionVencimiento.puntos} puntos.`,
                    duration: 5000
                })
            }

            setStockParaMermar([])
            onMisionesUpdated() 
            fetchMisiones()

        } catch (error: any) {
            console.error("Error mermando stock:", error)
            toast.error("Error al procesar", { description: error.message })
            setProcesando(false)
        }
    }

    useEffect(() => {
        if (turnoId) {
            fetchMisiones()
        }
    }, [turnoId, onMisionesUpdated, fetchMisiones])

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" /></div>
    }
    
    const getMissionStatus = (m: Mision) => {
        if (m.es_completada) return { label: "Completada", color: "text-emerald-600", icon: CheckCheck, bg: "bg-emerald-50 border-emerald-200" }
        if (m.tipo === 'vencimiento' && m.unidades_completadas > 0) return { label: "En Progreso", color: "text-orange-600", icon: Target, bg: "bg-orange-50 border-orange-200" }
        if (m.tipo === 'arqueo_cierre') return { label: "Pendiente de Cierre", color: "text-blue-600", icon: Zap, bg: "bg-white" }
        return { label: "Activa", color: "text-primary", icon: Target, bg: "bg-white" }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                    <Target className="h-6 w-6" /> Misiones del Día
                </h2>
            </div>
            
            {misiones.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed">
                    <p>No hay misiones activas. ¡Disfruta un turno tranquilo!</p>
                </Card>
            ) : (
                misiones.map((m) => {
                    const status = getMissionStatus(m)
                    const Icon = status.icon
                    const isVencimiento = m.tipo === 'vencimiento'

                    // Botón de acción
                    const ButtonAction = isVencimiento && !m.es_completada ? (
                        <Button 
                            onClick={handleOpenMermarModal}
                            disabled={procesando}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white w-full mt-2"
                        >
                            {procesando ? <Loader2 className="animate-spin h-4 w-4" /> : "Gestionar Stock en Riesgo"}
                        </Button>
                    ) : null

                    // Cálculo de porcentaje para la barra
                    const porcentaje = m.objetivo_unidades > 0 
                        ? Math.min((m.unidades_completadas / m.objetivo_unidades) * 100, 100)
                        : 0

                    return (
                        <Card key={m.id} className={cn("p-4 shadow-sm border-2 transition-all", status.bg)}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full bg-white/50", status.color)}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{m.descripcion}</p>
                                        <p className={cn("text-xs font-bold uppercase mt-0.5", status.color)}>
                                            {status.label}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-xl font-black text-yellow-500 flex items-center justify-end gap-1">
                                        +{m.puntos} <span className="text-xs text-muted-foreground">XP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Progreso usando el componente Shadcn */}
                            {isVencimiento && (
                                <div className="pt-3 mt-2 border-t border-black/5">
                                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                                        <span>Progreso</span>
                                        <span>{m.unidades_completadas} / {m.objetivo_unidades} u.</span>
                                    </div>
                                    
                                    {/* Componente Progress en lugar de div inline */}
                                    <Progress value={porcentaje} className="h-2 bg-gray-200 [&>div]:bg-orange-500" />
                                    
                                    {ButtonAction}
                                </div>
                            )}
                        </Card>
                    )
                })
            )}

            {/* Modal de Mermar Stock (Sin cambios en lógica, solo contexto) */}
            <Dialog open={showMermarModal} onOpenChange={setShowMermarModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" /> Gestionar Stock Crítico
                        </DialogTitle>
                    </DialogHeader>
                    
                    {stockParaMermar.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-2 py-4 border-y">
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 mb-2">
                                <strong>Acción Requerida:</strong> Retirar <span className="font-bold">{stockParaMermar.length} unidades</span> de la estantería que vencen en los próximos 7 días.
                            </div>
                            
                            {stockParaMermar.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl bg-slate-100 p-1 rounded">{item.emoji_producto}</span>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{item.nombre_producto}</span>
                                            <span className="text-[10px] text-muted-foreground">ID: ...{item.id.slice(-4)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-destructive">Vence: {format(parseISO(item.fecha_vencimiento), 'dd/MM')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">Buscando stock...</p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowMermarModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleMermarStock} 
                            disabled={procesando || stockParaMermar.length === 0}
                            className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                        >
                            {procesando ? <Loader2 className="animate-spin h-5 w-5" /> : `CONFIRMAR RETIRO`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}