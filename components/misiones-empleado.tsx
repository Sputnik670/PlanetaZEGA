// components/misiones-empleado.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Zap, Target, CheckCheck, AlertTriangle, Package, X, Wallet } from "lucide-react" 
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils" 

// Tipado para las misiones activas (mantenido)
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

// 🚨 CORRECCIÓN DE TIPADO PARA EVITAR EL ERROR DEL COMPILADOR

// 1. Define la forma de los datos anidados de la tabla 'productos'
interface ProductoJoin {
    nombre: string
    emoji: string
}

// 2. Define la forma de la fila retornada por el JOIN de Supabase (stock + productos)
interface StockJoin {
    id: string
    producto_id: string
    fecha_vencimiento: string
    precio_venta: number
    // La propiedad 'productos' es el objeto anidado, puede ser null si no hay join o el tipo de RLS.
    productos: ProductoJoin | null 
}

// Tipado para el estado local StockCritico (formato final)
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


    // 2. Lógica para Abrir el Modal de Mermar
    const handleOpenMermarModal = async () => {
        if (!misionVencimiento) return
        setProcesando(true)

        try {
            // Buscamos el stock que está pendiente y que vence en los próximos 7 días 
            const hoy = new Date()
            const fechaLimite = format(hoy.setDate(hoy.getDate() + 7), 'yyyy-MM-dd') 

            const { data, error } = await supabase
                .from('stock')
                .select(`
                    id, 
                    producto_id, 
                    fecha_vencimiento, 
                    precio_venta, 
                    productos(nombre, emoji)
                `)
                .eq('estado', 'pendiente')
                .lt('fecha_vencimiento', fechaLimite)
                .order('fecha_vencimiento', { ascending: true })
                .returns<StockJoin[]>() // Aplicamos el tipo explícito aquí
            
            if (error) throw error
            
            const stockItems = data || []

            // El mapeo ahora es seguro gracias a la interfaz StockJoin
            const stockCriticoFormateado: StockCritico[] = stockItems.map(item => ({
                id: item.id,
                producto_id: item.producto_id,
                // Acceso seguro y con fallback si el join falla por alguna razón
                nombre_producto: item.productos?.nombre || 'Producto Desconocido', 
                emoji_producto: item.productos?.emoji || '📦',
                fecha_vencimiento: item.fecha_vencimiento,
                precio_venta: item.precio_venta
            }))

            setStockParaMermar(stockCriticoFormateado)
            setShowMermarModal(true)

        } catch (error) {
            console.error("Error cargando stock crítico:", error)
            toast.error("Error de Stock", { description: "No se pudo cargar el stock a mermar." })
        } finally {
            setProcesando(false)
        }
    }


    // 3. Lógica para Mermar Stock y Completar Misión (mantenida)
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
            const unidadesRestantes = misionVencimiento.objetivo_unidades - misionVencimiento.unidades_completadas

            if (unidadesMermadas === 0) throw new Error("No hay unidades seleccionadas para mermar.")
            if (unidadesMermadas > unidadesRestantes) throw new Error("Intentando mermar más unidades de las necesarias para la misión.")

            // 1. Actualizar el estado del stock a 'mermado'
            const { error: stockUpdateError } = await supabase
                .from('stock')
                .update({ 
                    estado: 'mermado', 
                    fecha_mermado: new Date().toISOString() 
                })
                .in('id', stockIdsToUpdate)
            
            if (stockUpdateError) throw stockUpdateError

            // 2. Actualizar el progreso de la misión
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

            toast.success("Mermado Registrado ✅", { description: `Se marcaron ${unidadesMermadas} unidades. Progreso: ${nuevoProgreso}/${misionVencimiento.objetivo_unidades}.` })
            
            if (misionCompletada) {
                toast.success(`✨ Misión Completada!`, { description: `Ganaste ${misionVencimiento.puntos} puntos por mover stock crítico.` })
            }

            // Refrescar datos
            setStockParaMermar([])
            onMisionesUpdated()
            fetchMisiones()

        } catch (error: any) {
            console.error("Error mermando stock:", error)
            toast.error("Error al mermar stock", { description: error.message || "Intenta de nuevo." })
            setProcesando(false)
        }
    }

    useEffect(() => {
        if (turnoId) {
            fetchMisiones()
        }
    }, [turnoId, onMisionesUpdated, fetchMisiones])

    // --- Renderizado ---

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" /></div>
    }
    
    // Función helper para el label del estado
    const getMissionStatus = (m: Mision) => {
        if (m.es_completada) return { label: "Completada", color: "text-emerald-600", icon: CheckCheck }
        if (m.tipo === 'vencimiento' && m.unidades_completadas > 0) return { label: "En Progreso", color: "text-orange-500", icon: Target }
        if (m.tipo === 'arqueo_cierre') return { label: "Pendiente de Cierre", color: "text-blue-500", icon: Zap }
        return { label: "Activa", color: "text-primary", icon: Target }
    }


    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                <Target className="h-6 w-6" /> Misiones de Turno
            </h2>
            <p className="text-sm text-muted-foreground">Completa estas tareas para ganar puntos de empleado.</p>

            {misiones.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed">
                    <p>No hay misiones activas para este turno. ¡Turno tranquilo!</p>
                </Card>
            ) : (
                misiones.map((m) => {
                    const status = getMissionStatus(m)
                    const Icon = status.icon
                    const isVencimiento = m.tipo === 'vencimiento'

                    // Determinar el botón de acción para la misión de vencimiento
                    const ButtonAction = isVencimiento && !m.es_completada ? (
                        <Button 
                            onClick={handleOpenMermarModal}
                            disabled={procesando || (m.objetivo_unidades - m.unidades_completadas) === 0}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {procesando ? <Loader2 className="animate-spin h-4 w-4" /> : "Mermar Stock"}
                        </Button>
                    ) : null

                    return (
                        <Card key={m.id} className="p-4 shadow-md space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Icon className={cn("h-5 w-5 flex-shrink-0", status.color)} />
                                    <div>
                                        <p className="font-semibold leading-tight">{m.descripcion}</p>
                                        <p className={cn("text-xs font-medium mt-1", status.color)}>
                                            {status.label}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-black text-yellow-600">+ {m.puntos} pts</p>
                                </div>
                            </div>

                            {/* Barra de Progreso y Acción */}
                            {isVencimiento && (
                                <div className="pt-2 border-t border-muted-foreground/10">
                                    <div className="flex justify-between items-center text-xs font-medium mb-1">
                                        <span>Progreso:</span>
                                        <span>{m.unidades_completadas}/{m.objetivo_unidades} u.</span>
                                    </div>
                                    {ButtonAction}
                                </div>
                            )}
                        </Card>
                    )
                })
            )}

            {/* Modal de Mermar Stock */}
            <Dialog open={showMermarModal} onOpenChange={setShowMermarModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" /> Mermar Stock Crítico
                        </DialogTitle>
                    </DialogHeader>
                    
                    {stockParaMermar.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-2 py-2 border-y">
                            <p className="text-sm font-medium text-muted-foreground">
                                Marcarás <span className="font-bold text-destructive">{stockParaMermar.length}</span> unidades con vencimiento próximo como "Mermado" (Pérdida).
                            </p>
                            
                            {stockParaMermar.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{item.emoji_producto}</span>
                                        <p className="font-semibold text-sm">{item.nombre_producto}</p>
                                    </div>
                                    <div className="text-xs text-right">
                                        <p className="font-medium">Vence: {format(parseISO(item.fecha_vencimiento), 'dd/MM/yyyy')}</p>
                                        <p className="text-destructive font-bold">{item.precio_venta}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No se encontró stock pendiente y crítico (&lt; 7 días) para mermar.</p>
                        </div>
                    )}


                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowMermarModal(false)}
                        >
                            <X className="h-4 w-4 mr-2" /> Cancelar
                        </Button>
                        <Button 
                            onClick={handleMermarStock} 
                            disabled={procesando || stockParaMermar.length === 0}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {procesando ? <Loader2 className="animate-spin h-5 w-5" /> : `CONFIRMAR MERMA (${stockParaMermar.length} u.)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}