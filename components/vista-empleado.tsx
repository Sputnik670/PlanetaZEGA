// components/vista-empleado.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"     // ✅ Agregado
import { Badge } from "@/components/ui/badge"   // ✅ Agregado
import { 
  LogOut, Loader2, ShoppingCart, Target, 
  Trophy, AlertTriangle, Star, Lock 
} from "lucide-react" 
import { toast } from "sonner"
import CajaVentas from "@/components/caja-ventas" 
import ArqueoCaja, { CajaDiaria } from "@/components/arqueo-caja" 
import MisionesEmpleado from "@/components/misiones-empleado"
import RegistrarGasto from "@/components/registrar-gasto"
import GestionVencimientos from "@/components/gestion-vencimientos" 
import WidgetServicios from "@/components/widget-servicios" 
import WidgetSube from "@/components/widget-sube"
import RelojControl from "@/components/reloj-control" 
import { Progress } from "@/components/ui/progress" 
import { cn } from "@/lib/utils"

interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
    xp: number 
}

interface VistaEmpleadoProps {
    onBack: () => void 
    sucursalId: string 
}

export default function VistaEmpleado({ onBack, sucursalId }: VistaEmpleadoProps) {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"caja" | "misiones" | "vencimientos">("caja")
    const [turnoActivo, setTurnoActivo] = useState<CajaDiaria | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [sucursalNombre, setSucursalNombre] = useState("") // ✅ Para el reloj
    const [isClockedIn, setIsClockedIn] = useState(false) // ✅ Control de acceso
    const [refreshKey, setRefreshKey] = useState(0) 

    const fetchContexto = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Perfil y XP
            const { data: perfil } = await supabase.from('perfiles').select('id, nombre, rol, xp').eq('id', user.id).single()
            setUserProfile(perfil as UserProfile)

            // 2. Nombre de Sucursal
            const { data: sucursal } = await supabase.from('sucursales').select('nombre').eq('id', sucursalId).single()
            setSucursalNombre(sucursal?.nombre || "Sucursal")

            // 3. Verificar Asistencia (Fichaje)
            const { data: asistencia } = await supabase
                .from('asistencia')
                .select('id')
                .eq('empleado_id', user.id)
                .eq('sucursal_id', sucursalId)
                .is('salida', null)
                .maybeSingle()
            
            setIsClockedIn(!!asistencia)

            // 4. Verificar Caja Activa
            const { data: caja } = await supabase
                .from('caja_diaria')
                .select('*')
                .eq('empleado_id', user.id)
                .eq('sucursal_id', sucursalId)
                .is('fecha_cierre', null)
                .maybeSingle()
            
            setTurnoActivo(caja as CajaDiaria || null)

        } catch (error) {
            console.error("Error de contexto:", error)
        } finally {
            setLoading(false)
        }
    }, [sucursalId])

    useEffect(() => {
        fetchContexto()
    }, [fetchContexto, refreshKey])

    const handleDataUpdated = () => setRefreshKey(prev => prev + 1)

    // --- Lógica de Nivel ---
    const XP_PER_LEVEL = 3000
    const currentXP = userProfile?.xp || 0
    const level = Math.floor(currentXP / XP_PER_LEVEL) + 1
    const progressPercent = Math.min(((currentXP % XP_PER_LEVEL) / XP_PER_LEVEL) * 100, 100)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sincronizando con la central...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            
            {/* Header Gamificado */}
            <div className="bg-slate-900 text-white p-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Trophy className="h-32 w-32 rotate-12" />
                </div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h1 className="text-2xl font-black mb-1 uppercase tracking-tighter">{userProfile?.nombre || "Empleado"}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Operador de Kiosco</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="mt-6 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-yellow-400 text-yellow-950 font-black text-[10px] px-2 py-0.5 border-0">NIVEL {level}</Badge>
                            <span className="text-[11px] font-black text-white/60 uppercase">{currentXP} XP ACUMULADOS</span>
                        </div>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-white/5 border border-white/10" />
                </div>
            </div>

            <div className="p-4 space-y-4 -mt-4">
                
                {/* ⏱️ PASO 1: RELOJ DE CONTROL (Siempre visible) */}
                <div className="relative z-20">
                    <RelojControl 
                        sucursalId={sucursalId} 
                        sucursalNombre={sucursalNombre} 
                        // El refreshKey hará que se re-verifique el estado al fichar
                    />
                </div>

                {/* 🔒 BLOQUEO POR ASISTENCIA */}
                {!isClockedIn ? (
                    <Card className="p-10 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border">
                            <Lock className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-400 uppercase text-sm">Acceso Restringido</h3>
                            <p className="text-xs text-slate-400 font-medium px-4">Debes fichar tu entrada en el reloj superior para habilitar las funciones del local.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4">
                        
                        {/* 💰 PASO 2: APERTURA DE CAJA (Solo si no hay turno activo) */}
                        {!turnoActivo && (
                            <ArqueoCaja 
                                onCajaAbierta={handleDataUpdated}
                                onCajaCerrada={handleDataUpdated}
                                turnoActivo={turnoActivo}
                                sucursalId={sucursalId} 
                            />
                        )}

                        {/* 🛒 PASO 3: PANEL OPERATIVO (Solo si hay caja abierta) */}
                        {turnoActivo && (
                            <>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {[
                                        {id: "caja", label: "Venta Directa", icon: ShoppingCart},
                                        {id: "misiones", label: "Mis Misiones", icon: Target},
                                        {id: "vencimientos", label: "Control Stock", icon: AlertTriangle}
                                    ].map(tab => (
                                        <Button 
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)} 
                                            variant={activeTab === tab.id ? "default" : "outline"}
                                            size="sm"
                                            className="whitespace-nowrap rounded-full font-bold text-[11px] uppercase tracking-tighter"
                                        >
                                            <tab.icon className="mr-1.5 h-3.5 w-3.5" /> {tab.label}
                                        </Button>
                                    ))}
                                </div>
                                
                                <div className="space-y-4 pb-12">
                                    {activeTab === "caja" && (
                                        <div className="flex flex-col gap-4 animate-in fade-in">
                                            <CajaVentas 
                                                turnoId={turnoActivo.id} 
                                                empleadoNombre={userProfile?.nombre || "Operador"}
                                                sucursalId={sucursalId}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <WidgetSube onVentaRegistrada={handleDataUpdated} />
                                                <WidgetServicios onVentaRegistrada={handleDataUpdated} />
                                            </div>
                                            <RegistrarGasto turnoId={turnoActivo.id} />
                                            
                                            {/* CIERRE DE CAJA */}
                                            <div className="pt-8 border-t-2 border-dashed border-slate-200 mt-6">
                                                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Procedimiento de Cierre</p>
                                                <ArqueoCaja 
                                                    onCajaAbierta={handleDataUpdated}
                                                    onCajaCerrada={handleDataUpdated}
                                                    turnoActivo={turnoActivo}
                                                    sucursalId={sucursalId}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {activeTab === "misiones" && (
                                        <MisionesEmpleado 
                                            turnoId={turnoActivo.id}
                                            empleadoId={userProfile?.id || ""} 
                                            onMisionesUpdated={handleDataUpdated}
                                            key={refreshKey}
                                        />
                                    )}
                                    
                                    {activeTab === "vencimientos" && (
                                        <GestionVencimientos 
                                            turnoId={turnoActivo.id}
                                            empleadoId={userProfile?.id || ""}
                                            onAccionRealizada={handleDataUpdated}
                                            sucursalId={sucursalId}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}