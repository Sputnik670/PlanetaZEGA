// components/vista-empleado.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2, ShoppingCart, Target, Trophy, AlertTriangle, Star } from "lucide-react" 
import { toast } from "sonner"
import CajaVentas from "@/components/caja-ventas" 
import ArqueoCaja, { CajaDiaria } from "@/components/arqueo-caja" 
import MisionesEmpleado from "@/components/misiones-empleado"
import RegistrarGasto from "@/components/registrar-gasto"
import GestionVencimientos from "@/components/gestion-vencimientos" 
import WidgetServicios from "@/components/widget-servicios" 
import WidgetSube from "@/components/widget-sube"
import { Progress } from "@/components/ui/progress" 

interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
    xp: number 
}

interface VistaEmpleadoProps {
    onBack: () => void 
    sucursalId: string // ✅ Recibimos la sucursal seleccionada
}

export default function VistaEmpleado({ onBack, sucursalId }: VistaEmpleadoProps) {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"caja" | "misiones" | "vencimientos">("caja")
    const [turnoActivo, setTurnoActivo] = useState<CajaDiaria | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [refreshKey, setRefreshKey] = useState(0) 

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data } = await supabase
                .from('perfiles')
                .select('id, nombre, rol, xp')
                .eq('id', userId)
                .single()
            
            setUserProfile(data as UserProfile || null)
        } catch (error) {
            console.error("Error al obtener perfil:", error)
        }
    }, [])

    const checkTurnoActivo = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setTurnoActivo(null)
                return
            }
            
            fetchProfile(user.id) 

            // ✅ Modificado: Buscamos caja abierta EN ESTA SUCURSAL
            const { data, error } = await supabase
                .from('caja_diaria')
                .select('*')
                .eq('empleado_id', user.id)
                .eq('sucursal_id', sucursalId) // Filtro crucial
                .is('fecha_cierre', null)
                .order('fecha_apertura', { ascending: false })
                .maybeSingle() // Usamos maybeSingle para no lanzar error si no hay

            if (error) throw error
            
            setTurnoActivo(data as CajaDiaria || null)

        } catch (error) {
            console.error("Error al verificar turno:", error)
            toast.error("Error de Sistema", { description: "No se pudo verificar el estado de la caja." })
        } finally {
            setLoading(false)
        }
    }, [fetchProfile, sucursalId]) 
    
    useEffect(() => {
        setLoading(true)
        checkTurnoActivo()
    }, [checkTurnoActivo, refreshKey])

    const handleCajaAbierta = () => {
        setRefreshKey(prev => prev + 1)
        setActiveTab("caja")
    }

    const handleCajaCerrada = () => {
        setTurnoActivo(null)
        setRefreshKey(prev => prev + 1)
        setActiveTab("caja")
    }
    
    const handleDataUpdated = () => {
        setRefreshKey(prev => prev + 1)
    }

    // --- Lógica de Nivel (AJUSTADA A 3000 XP) ---
    const XP_PER_LEVEL = 3000
    const currentXP = userProfile?.xp || 0
    const level = Math.floor(currentXP / XP_PER_LEVEL) + 1
    const nextLevelXP = level * XP_PER_LEVEL
    const prevLevelXP = (level - 1) * XP_PER_LEVEL
    const progressPercent = Math.min(((currentXP - prevLevelXP) / XP_PER_LEVEL) * 100, 100)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            
            {/* Header Gamificado */}
            <div className="bg-gradient-to-br from-accent via-accent to-chart-2 text-accent-foreground p-6 rounded-b-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Trophy className="h-32 w-32 rotate-12" />
                </div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{userProfile?.nombre || "Empleado"}</h1>
                        <p className="text-xs text-accent-foreground/80 font-medium uppercase tracking-wider">
                            Operador de Kiosco
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-accent-foreground hover:bg-accent-foreground/20">
                        <LogOut className="h-6 w-6" />
                    </Button>
                </div>
                
                <div className="mt-4 relative z-10">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-1.5">
                            <div className="bg-yellow-400 text-yellow-900 font-black text-xs px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Star className="h-3 w-3 fill-yellow-900" />
                                NIVEL {level}
                            </div>
                            <span className="text-xs font-bold text-white/90 drop-shadow-sm">
                                {currentXP} XP
                            </span>
                        </div>
                        <span className="text-[10px] font-medium text-white/70">
                            Próximo Nivel: {nextLevelXP} XP
                        </span>
                    </div>
                    
                    <Progress 
                        value={progressPercent} 
                        className="h-3 bg-black/20 border border-white/10 [&>div]:bg-gradient-to-r [&>div]:from-yellow-300 [&>div]:to-yellow-500 [&>div]:shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    />
                </div>
                
                <div className="mt-4 pt-3 border-t border-white/10 relative z-10 flex justify-between items-center text-sm">
                    {turnoActivo ? (
                        <>
                            <span className="font-medium text-white/90">
                                🟢 Turno Activo
                            </span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">
                                {new Date(turnoActivo.fecha_apertura).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </>
                    ) : (
                        <span className="font-medium text-white/80 flex items-center gap-2">
                            🔴 Caja Cerrada
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4">
                
                {!turnoActivo && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ArqueoCaja 
                            onCajaAbierta={handleCajaAbierta}
                            onCajaCerrada={handleCajaCerrada}
                            turnoActivo={turnoActivo}
                            // ✅ Pasamos sucursalId para que al abrir caja se asocie correctamente
                            // @ts-ignore - (ArqueoCaja debe actualizarse en el siguiente paso)
                            sucursalId={sucursalId} 
                        />
                    </div>
                )}
                
                {turnoActivo && (
                    <>
                        {/* Pestañas de Navegación */}
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-2 border-b scrollbar-hide">
                            <Button 
                                onClick={() => setActiveTab("caja")} 
                                variant={activeTab === "caja" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap shadow-sm"
                            >
                                <ShoppingCart className="mr-2 h-4 w-4" /> Venta
                            </Button>
                            <Button 
                                onClick={() => setActiveTab("misiones")} 
                                variant={activeTab === "misiones" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap shadow-sm"
                            >
                                <Target className="mr-2 h-4 w-4" /> Misiones 
                            </Button>
                            <Button 
                                onClick={() => setActiveTab("vencimientos")} 
                                variant={activeTab === "vencimientos" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap shadow-sm"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4" /> Vencimientos
                            </Button>
                        </div>
                        
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
                            {activeTab === "caja" && (
                                <div className="flex flex-col gap-4">
                                    {/* 1. ✅ PRIORIDAD MÁXIMA: Caja de Ventas */}
                                    <CajaVentas 
                                        turnoId={turnoActivo.id} 
                                        empleadoNombre={userProfile?.nombre || "Cajero"}
                                        // ✅ Pasamos sucursalId para filtrar productos y descontar stock correcto
                                        // @ts-ignore - (CajaVentas debe actualizarse)
                                        sucursalId={sucursalId}
                                    />

                                    {/* 2. Sección de Servicios Rápidos (Widgets) */}
                                    {/* Estos widgets no tocan stock, así que pueden quedar igual por ahora */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <WidgetSube onVentaRegistrada={handleDataUpdated} />
                                        <WidgetServicios onVentaRegistrada={handleDataUpdated} />
                                    </div>

                                    {/* 3. Registrar Gastos */}
                                    <RegistrarGasto 
                                        turnoId={turnoActivo.id} 
                                    />

                                    {/* 4. Fin de Turno */}
                                    <div className="pt-6 border-t border-dashed border-gray-300 mt-4">
                                        <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Fin de Jornada</p>
                                        <ArqueoCaja 
                                            onCajaAbierta={handleCajaAbierta}
                                            onCajaCerrada={handleCajaCerrada}
                                            turnoActivo={turnoActivo}
                                            // ✅ Pasamos sucursalId también aquí para cierres correctos
                                            // @ts-ignore
                                            sucursalId={sucursalId}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === "misiones" && (
                                <MisionesEmpleado 
                                    turnoId={turnoActivo.id}
                                    empleadoId={turnoActivo.empleado_id} 
                                    onMisionesUpdated={handleDataUpdated}
                                    key={turnoActivo.id + refreshKey}
                                />
                            )}
                            
                            {activeTab === "vencimientos" && (
                                <GestionVencimientos 
                                    turnoId={turnoActivo.id}
                                    empleadoId={turnoActivo.empleado_id}
                                    onAccionRealizada={handleDataUpdated}
                                    // ✅ Pasamos sucursalId para filtrar stock a vencer
                                    // @ts-ignore
                                    sucursalId={sucursalId}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}