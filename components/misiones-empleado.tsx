// components/misiones-empleado.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Zap, Target, CheckCheck, AlertTriangle, Package, ClipboardCheck } from "lucide-react" 
import { toast } from "sonner"
import { format, parseISO, addDays } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils" 
import { triggerConfetti } from "@/components/confetti-trigger"

interface Mision {
    id: string
    tipo: 'vencimiento' | 'arqueo_cierre' | 'manual' 
    descripcion: string
    objetivo_unidades: number
    unidades_completadas: number
    es_completada: boolean
    puntos: number
    created_at: string
}

interface ProductoJoin {
    nombre: string
    emoji: string
    precio_venta: number 
}

interface StockJoin {
    id: string
    producto_id: string
    fecha_vencimiento: string
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

// 1. Interfaz corregida para recibir empleadoId
interface MisionesEmpleadoProps {
    turnoId: string
    empleadoId: string 
    onMisionesUpdated: () => void
}

export default function MisionesEmpleado({ turnoId, empleadoId, onMisionesUpdated }: MisionesEmpleadoProps) {
    const [misiones, setMisiones] = useState<Mision[]>([])
    const [loading, setLoading] = useState(true)
    const [procesando, setProcesando] = useState(false)
    
    // Estados para el modal de Mermar Stock
    const [showMermarModal, setShowMermarModal] = useState(false)
    const [stockParaMermar, setStockParaMermar] = useState<StockCritico[]>([])
    const [misionVencimiento, setMisionVencimiento] = useState<Mision | null>(null)

    // 2. Helper para sumar XP real a la base de datos (CON LOGGING MEJORADO)
    const sumarPuntosAlPerfil = async (puntos: number) => {
        console.log(`Intentando sumar ${puntos} XP al empleado ${empleadoId}...`);

        try {
            // A. Obtener XP actual
            const { data: perfil, error: fetchError } = await supabase
                .from('perfiles')
                .select('xp')
                .eq('id', empleadoId)
                .single()
            
            if (fetchError) {
                console.error("Error fetching perfil:", fetchError);
                throw new Error(`No se pudo leer el perfil: ${fetchError.message}`);
            }

            // B. Calcular nuevo total
            const nuevoXP = (perfil?.xp || 0) + puntos

            // C. Actualizar BDD
            const { error: updateError } = await supabase
                .from('perfiles')
                .update({ xp: nuevoXP })
                .eq('id', empleadoId)
            
            if (updateError) {
                console.error("Error updating perfil:", updateError);
                throw new Error(`No se pudo actualizar XP: ${updateError.message}`);
            }
            
            // D. Refrescar UI del padre (Header de nivel)
            onMisionesUpdated() 

        } catch (err: any) {
            // Log detallado para evitar el error vacío {}
            console.error("❌ Error CRÍTICO sumando XP:", JSON.stringify(err, null, 2))
            
            // Si el error es de permisos (RLS), avisamos específicamente
            const msg = err.message || "Error desconocido";
            if (msg.includes("row-level security") || msg.includes("permission")) {
                toast.error("Error de Permisos", { description: "Tu usuario no tiene permiso para actualizar su puntaje. Contacta al dueño." })
            } else {
                toast.error("Error de conexión", { description: "No se pudieron guardar los puntos." })
            }
        }
    }

    const fetchMisiones = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('misiones')
                .select('*')
                .eq('caja_diaria_id', turnoId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMisiones((data as any[]) || [])
            
            // Identificar misión de vencimiento si existe
            const vencimientoMision = data?.find(m => m.tipo === 'vencimiento')
            setMisionVencimiento((vencimientoMision as Mision) || null)

        } catch (error) {
            console.error("Error fetching misiones:", error)
            toast.error("Error de Misiones", { description: "No se pudieron cargar las tareas." })
        } finally {
            setLoading(false)
        }
    }, [turnoId])

    const handleOpenMermarModal = async () => {
        if (!misionVencimiento) return
        setProcesando(true)
        try {
            const hoy = new Date()
            const fechaLimite = format(addDays(hoy, 7), 'yyyy-MM-dd') 
            
            // Buscar stock real próximo a vencer
            const { data, error } = await supabase.from('stock')
                .select(`id, producto_id, fecha_vencimiento, productos(nombre, emoji, precio_venta)`)
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
                precio_venta: item.productos?.precio_venta || 0
            }))
            
            setStockParaMermar(stockCriticoFormateado)
            setShowMermarModal(true)
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setProcesando(false)
        }
    }

    const handleCompletarManual = async (mision: Mision) => {
        setProcesando(true)
        try {
            // Actualizar estado de la misión
            const { error } = await supabase
                .from('misiones')
                .update({ es_completada: true, unidades_completadas: 1 })
                .eq('id', mision.id)

            if (error) throw error

            // 3. PERSISTENCIA XP: Guardar puntos
            await sumarPuntosAlPerfil(mision.puntos)

            triggerConfetti()
            toast.success("¡Excelente!", { description: `Completaste: ${mision.descripcion} (+${mision.puntos} XP)` })
            
            fetchMisiones()     
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setProcesando(false)
        }
    }

    const handleMermarStock = async () => {
        if (stockParaMermar.length === 0 || !misionVencimiento) {
            toast.warning("Sin Tareas", { description: "No hay stock crítico para mermar." })
            return
        }
        setProcesando(true)
        setShowMermarModal(false)
        try {
            const stockIdsToUpdate = stockParaMermar.map(item => item.id)
            const unidadesMermadas = stockIdsToUpdate.length
            
            // 1. Marcar stock como mermado
            const { error: stockUpdateError } = await supabase
                .from('stock')
                .update({ estado: 'mermado', fecha_mermado: new Date().toISOString() })
                .in('id', stockIdsToUpdate)
            
            if (stockUpdateError) throw stockUpdateError

            // 2. Actualizar progreso de la misión
            const nuevoProgreso = misionVencimiento.unidades_completadas + unidadesMermadas
            const misionCompletada = nuevoProgreso >= misionVencimiento.objetivo_unidades

            const { error: misionUpdateError } = await supabase
                .from('misiones')
                .update({ unidades_completadas: nuevoProgreso, es_completada: misionCompletada })
                .eq('id', misionVencimiento.id)
            
            if (misionUpdateError) throw misionUpdateError

            toast.success("Mermado Registrado ✅", { description: `Se procesaron ${unidadesMermadas} unidades.` })
            
            if (misionCompletada) {
                // 3. PERSISTENCIA XP si se completó el objetivo total
                await sumarPuntosAlPerfil(misionVencimiento.puntos)
                triggerConfetti() 
                toast.success(`✨ ¡MISIÓN COMPLETADA!`, { description: `Ganaste +${misionVencimiento.puntos} puntos.` })
            } else {
                fetchMisiones() // Si no completó, solo refrescamos la barra
            }

            setStockParaMermar([])
        } catch (error: any) {
            console.error(error)
            toast.error("Error al procesar")
        } finally {
            setProcesando(false)
        }
    }

    useEffect(() => {
        if (turnoId) {
            fetchMisiones()
        }
    }, [turnoId, onMisionesUpdated, fetchMisiones])

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" /></div>
    
    const getMissionStatus = (m: Mision) => {
        if (m.es_completada) return { label: "Completada", color: "text-emerald-600", icon: CheckCheck, bg: "bg-emerald-50 border-emerald-200" }
        if (m.tipo === 'vencimiento' && m.unidades_completadas > 0) return { label: "En Progreso", color: "text-orange-600", icon: Target, bg: "bg-orange-50 border-orange-200" }
        if (m.tipo === 'arqueo_cierre') return { label: "Pendiente de Cierre", color: "text-blue-600", icon: Zap, bg: "bg-white" }
        if (m.tipo === 'manual') return { label: "Tarea Pendiente", color: "text-indigo-600", icon: ClipboardCheck, bg: "bg-indigo-50 border-indigo-200" }
        return { label: "Activa", color: "text-primary", icon: Target, bg: "bg-white" }
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary"><Target className="h-6 w-6" /> Misiones del Día</h2>
            
            {misiones.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed"><p>No hay misiones activas.</p></Card>
            ) : (
                misiones.map((m) => {
                    const status = getMissionStatus(m)
                    const Icon = status.icon
                    const isVencimiento = m.tipo === 'vencimiento'
                    const isManual = m.tipo === 'manual'
                    let ButtonAction = null

                    if (!m.es_completada) {
                        if (isVencimiento) {
                            ButtonAction = (
                                <Button onClick={handleOpenMermarModal} disabled={procesando} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white w-full mt-2">
                                    {procesando ? <Loader2 className="animate-spin h-4 w-4" /> : "Gestionar Stock en Riesgo"}
                                </Button>
                            )
                        } else if (isManual) {
                            ButtonAction = (
                                <Button onClick={() => handleCompletarManual(m)} disabled={procesando} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full mt-2 shadow-sm">
                                    {procesando ? <Loader2 className="animate-spin h-4 w-4" /> : "Marcar como Hecho ✅"}
                                </Button>
                            )
                        }
                    }

                    const porcentaje = m.objetivo_unidades > 0 ? Math.min((m.unidades_completadas / m.objetivo_unidades) * 100, 100) : 0

                    return (
                        <Card key={m.id} className={cn("p-4 shadow-sm border-2 transition-all", status.bg)}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full bg-white/50", status.color)}><Icon className="h-5 w-5" /></div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{m.descripcion}</p>
                                        <p className={cn("text-xs font-bold uppercase mt-0.5", status.color)}>{status.label}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-xl font-black text-yellow-500 flex items-center justify-end gap-1">+{m.puntos} <span className="text-xs text-muted-foreground">XP</span></div>
                                </div>
                            </div>
                            {(isVencimiento || isManual) && (
                                <div className="pt-3 mt-2 border-t border-black/5">
                                    {isVencimiento && (
                                        <>
                                            <div className="flex justify-between items-center text-xs font-semibold mb-2"><span>Progreso</span><span>{m.unidades_completadas} / {m.objetivo_unidades} u.</span></div>
                                            <Progress value={porcentaje} className="h-2 bg-gray-200 [&>div]:bg-orange-500" />
                                        </>
                                    )}
                                    {ButtonAction}
                                </div>
                            )}
                        </Card>
                    )
                })
            )}

            <Dialog open={showMermarModal} onOpenChange={setShowMermarModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600"><AlertTriangle className="h-5 w-5" /> Gestionar Stock Crítico</DialogTitle>
                    </DialogHeader>
                    {stockParaMermar.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-2 py-4 border-y">
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 mb-2">
                                <strong>Acción:</strong> Retirar <span className="font-bold">{stockParaMermar.length} unidades</span> próximas a vencer.
                            </div>
                            {stockParaMermar.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl bg-slate-100 p-1 rounded">{item.emoji_producto}</span>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{item.nombre_producto}</span>
                                            <span className="text-[10px] text-muted-foreground">ID: ...{String(item.id).slice(-4)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right"><p className="text-xs font-bold text-destructive">Vence: {format(parseISO(item.fecha_vencimiento), 'dd/MM')}</p></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8"><Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">Buscando stock...</p></div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowMermarModal(false)}>Cancelar</Button>
                        <Button onClick={handleMermarStock} disabled={procesando || stockParaMermar.length === 0} className="bg-destructive hover:bg-destructive/90 text-white font-bold">
                            {procesando ? <Loader2 className="animate-spin h-5 w-5" /> : `CONFIRMAR RETIRO`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}