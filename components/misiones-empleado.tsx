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
import { Badge } from "@/components/ui/badge";

interface Mision {
    id: string
    tipo: 'vencimiento' | 'arqueo_cierre' | 'manual' 
    descripcion: string
    objetivo_unidades: number
    unidades_completadas: number
    es_completada: boolean
    puntos: number
    caja_diaria_id: string | null 
    created_at: string
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
    empleadoId: string 
    sucursalId: string // ✅ AGREGADO: Necesario para filtrar stock local
    onMisionesUpdated: () => void
}

export default function MisionesEmpleado({ turnoId, empleadoId, sucursalId, onMisionesUpdated }: MisionesEmpleadoProps) {
    const [misiones, setMisiones] = useState<Mision[]>([])
    const [loading, setLoading] = useState(true)
    const [procesando, setProcesando] = useState(false)
    const [showMermarModal, setShowMermarModal] = useState(false)
    const [stockParaMermar, setStockParaMermar] = useState<StockCritico[]>([])
    const [misionVencimiento, setMisionVencimiento] = useState<Mision | null>(null)

    // Sincronización de XP (Mantenemos lógica pero aseguramos consistencia)
    const sumarPuntosAlPerfil = async (puntos: number) => {
        try {
            const { data: perfil } = await supabase.from('perfiles').select('xp').eq('id', empleadoId).single()
            const nuevoXP = (perfil?.xp || 0) + puntos
            await supabase.from('perfiles').update({ xp: nuevoXP }).eq('id', empleadoId)
            onMisionesUpdated() 
        } catch (err) {
            console.error("Error sumando XP:", err)
        }
    }

    const fetchMisiones = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('misiones')
                .select('*')
                .eq('empleado_id', empleadoId)
                .or(`caja_diaria_id.eq.${turnoId},caja_diaria_id.is.null`)
                .order('created_at', { ascending: true })

            if (error) throw error
            
            const misionesFiltradas = (data as Mision[]).filter(m => 
                m.caja_diaria_id === turnoId || (!m.caja_diaria_id && !m.es_completada)
            )

            setMisiones(misionesFiltradas)
            setMisionVencimiento(misionesFiltradas.find(m => m.tipo === 'vencimiento') || null)

        } catch (error) {
            toast.error("Error cargando tareas")
        } finally {
            setLoading(false)
        }
    }, [turnoId, empleadoId])

    const handleOpenMermarModal = async () => {
        if (!misionVencimiento) return
        setProcesando(true)
        try {
            const hoy = new Date()
            const fechaLimite = format(addDays(hoy, 7), 'yyyy-MM-dd') 
            
            // ✅ CORRECCIÓN QUIRÚRGICA: Filtramos el stock estrictamente por sucursalId
            const { data, error } = await supabase.from('stock')
                .select(`id, producto_id, fecha_vencimiento, productos(nombre, emoji, precio_venta)`)
                .eq('sucursal_id', sucursalId) // Seguridad multi-local
                .eq('estado', 'disponible')
                .lt('fecha_vencimiento', fechaLimite)
                .order('fecha_vencimiento', { ascending: true })
            
            if (error) throw error
            
            const stockCriticoFormateado: StockCritico[] = (data || []).map((item: any) => ({
                id: item.id,
                producto_id: item.producto_id,
                nombre_producto: item.productos?.nombre || 'Producto', 
                emoji_producto: item.productos?.emoji || '📦',
                fecha_vencimiento: item.fecha_vencimiento,
                precio_venta: item.productos?.precio_venta || 0
            }))
            
            setStockParaMermar(stockCriticoFormateado)
            setShowMermarModal(true)
        } catch (error: any) {
            toast.error("Error al buscar stock")
        } finally {
            setProcesando(false)
        }
    }

    const handleCompletarManual = async (mision: Mision) => {
        setProcesando(true)
        try {
            const updateData: any = { es_completada: true, unidades_completadas: 1 }
            if (!mision.caja_diaria_id) updateData.caja_diaria_id = turnoId

            const { error } = await supabase.from('misiones').update(updateData).eq('id', mision.id)
            if (error) throw error

            await sumarPuntosAlPerfil(mision.puntos)
            triggerConfetti()
            toast.success(`Misión Cumplida (+${mision.puntos} XP)`)
            fetchMisiones()     
        } catch (error: any) {
            toast.error("Error al completar")
        } finally {
            setProcesando(false)
        }
    }

    const handleMermarStock = async () => {
        if (stockParaMermar.length === 0 || !misionVencimiento) return
        setProcesando(true)
        setShowMermarModal(false)
        try {
            const stockIdsToUpdate = stockParaMermar.map(item => item.id)
            const unidadesMermadas = stockIdsToUpdate.length
            
            // 1. Actualizar estado del stock a 'mermado'
            await supabase.from('stock')
                .update({ estado: 'mermado', fecha_venta: new Date().toISOString() }) // Usamos fecha_venta para loggear el movimiento
                .in('id', stockIdsToUpdate)
            
            // 2. Actualizar progreso de la misión
            const nuevoProgreso = misionVencimiento.unidades_completadas + unidadesMermadas
            const misionCompletada = nuevoProgreso >= misionVencimiento.objetivo_unidades

            const updateMisionData: any = { 
                unidades_completadas: nuevoProgreso, 
                es_completada: misionCompletada 
            }
            if (misionCompletada && !misionVencimiento.caja_diaria_id) updateMisionData.caja_diaria_id = turnoId

            await supabase.from('misiones').update(updateMisionData).eq('id', misionVencimiento.id)
            
            if (misionCompletada) {
                await sumarPuntosAlPerfil(misionVencimiento.puntos)
                triggerConfetti() 
            }
            toast.success("Mermas registradas")
            fetchMisiones() 
        } catch (error) {
            toast.error("Error al procesar mermas")
        } finally {
            setProcesando(false)
        }
    }

    useEffect(() => {
        if (turnoId && empleadoId) fetchMisiones()
    }, [turnoId, empleadoId, fetchMisiones])

    const getMissionStatus = (m: Mision) => {
        if (m.es_completada) return { label: "Completada", color: "text-emerald-600", icon: CheckCheck, bg: "bg-emerald-50 border-emerald-200" }
        if (m.tipo === 'vencimiento' && m.unidades_completadas > 0) return { label: "En Progreso", color: "text-orange-600", icon: Target, bg: "bg-orange-50 border-orange-200" }
        if (m.tipo === 'arqueo_cierre') return { label: "Meta de Cierre", color: "text-blue-600", icon: Zap, bg: "bg-white" }
        return { label: "Tarea Activa", color: "text-indigo-600", icon: ClipboardCheck, bg: "bg-white" }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                    <Target className="h-6 w-6 text-blue-500" /> Hoja de Ruta
                </h2>
                <Badge variant="outline" className="font-bold text-[10px] border-2 uppercase">{misiones.length} Tareas</Badge>
            </div>
            
            <div className="grid gap-4">
                {misiones.length === 0 ? (
                    <Card className="p-10 text-center border-dashed border-2 bg-slate-50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin misiones para este turno</p>
                    </Card>
                ) : (
                    misiones.map((m) => {
                        const status = getMissionStatus(m)
                        const Icon = status.icon
                        const porcentaje = Math.min((m.unidades_completadas / m.objetivo_unidades) * 100, 100)

                        return (
                            <Card key={m.id} className={cn("p-5 border-2 rounded-[1.5rem] transition-all shadow-sm", status.bg)}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={cn("p-3 rounded-2xl bg-white shadow-sm", status.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-slate-800 uppercase leading-tight">{m.descripcion}</p>
                                            <p className={cn("text-[10px] font-black uppercase mt-1 tracking-widest", status.color)}>
                                                {status.label} {!m.caja_diaria_id && "• Global"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-blue-600">+{m.puntos} <span className="text-[10px] text-slate-400">XP</span></div>
                                    </div>
                                </div>

                                {!m.es_completada && (
                                    <div className="mt-5 pt-4 border-t border-slate-100">
                                        {m.tipo === 'vencimiento' ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                                    <span>Progreso</span>
                                                    <span>{m.unidades_completadas} / {m.objetivo_unidades} U.</span>
                                                </div>
                                                <Progress value={porcentaje} className="h-2 bg-slate-100" />
                                                <Button onClick={handleOpenMermarModal} disabled={procesando} className="w-full bg-orange-500 hover:bg-orange-600 font-black text-[10px] uppercase h-10 rounded-xl shadow-lg shadow-orange-100">
                                                    {procesando ? <Loader2 className="animate-spin h-4 w-4" /> : "Ejecutar Retiro de Stock"}
                                                </Button>
                                            </div>
                                        ) : m.tipo === 'manual' ? (
                                            <Button onClick={() => handleCompletarManual(m)} disabled={procesando} className="w-full bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase h-10 rounded-xl shadow-lg shadow-blue-100">
                                                Confirmar Acción Realizada
                                            </Button>
                                        ) : null}
                                    </div>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Modal de Mermas (Filtrado por sucursalId) */}
            <Dialog open={showMermarModal} onOpenChange={setShowMermarModal}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-tighter">
                            <AlertTriangle className="h-6 w-6" /> Retiro de Mercadería
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-orange-50 p-4 rounded-2xl border-2 border-orange-100 leading-relaxed">
                            Confirma que vas a retirar estas unidades del mostrador para evitar ventas de productos vencidos en <span className="text-orange-700 underline">este local</span>.
                        </p>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                            {stockParaMermar.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-white border-2 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{item.emoji_producto}</span>
                                        <span className="font-black text-xs uppercase text-slate-700">{item.nombre_producto}</span>
                                    </div>
                                    <Badge className="bg-red-100 text-red-600 border-0 font-black text-[9px]">VENCE: {format(parseISO(item.fecha_vencimiento), 'dd/MM')}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleMermarStock} disabled={procesando} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl">
                            {procesando ? <Loader2 className="animate-spin h-5 w-5" /> : `CONFIRMAR RETIRO DE ${stockParaMermar.length} UNIDADES`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}