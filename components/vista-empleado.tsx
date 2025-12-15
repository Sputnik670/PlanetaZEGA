// components/vista-empleado.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2, ShoppingCart, Target, TrendingUp, AlertTriangle, Star } from "lucide-react" 
import { toast } from "sonner"
import CajaVentas from "@/components/caja-ventas" 
import ArqueoCaja, { CajaDiaria } from "@/components/arqueo-caja" 
import MisionesEmpleado from "@/components/misiones-empleado"
import RegistrarGasto from "@/components/registrar-gasto" // <--- Importación correcta

interface UserProfile {
    id: string
    rol: "dueño" | "empleado"
    nombre: string
    xp: number 
}

interface VistaEmpleadoProps {
    onBack: () => void 
}

export default function VistaEmpleado({ onBack }: VistaEmpleadoProps) {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"caja" | "misiones" | "vencimientos">("caja")
    const [turnoActivo, setTurnoActivo] = useState<CajaDiaria | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [refreshKey, setRefreshKey] = useState(0) 

    // OBTENER PERFIL Y XP
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

    // FETCH TURNO ACTIVO
    const checkTurnoActivo = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setTurnoActivo(null)
                return
            }
            
            await fetchProfile(user.id) 

            const { data, error } = await supabase
                .from('caja_diaria')
                .select('*')
                .eq('empleado_id', user.id)
                .is('fecha_cierre', null)
                .order('fecha_apertura', { ascending: false })
                .single()

            if (error && error.code !== 'PGRST116') { 
                throw error
            }
            
            setTurnoActivo(data as CajaDiaria || null)

        } catch (error) {
            console.error("Error al verificar turno:", error)
            toast.error("Error de Sistema", { description: "No se pudo verificar el estado de la caja." })
        } finally {
            setLoading(false)
        }
    }, [fetchProfile]) 
    
    // USAMOS refreshKey para disparar el fetch al inicio y al completar misiones/cerrar caja
    useEffect(() => {
        setLoading(true)
        checkTurnoActivo()
    }, [checkTurnoActivo, refreshKey])

    // Handlers para ArqueoCaja
    const handleCajaAbierta = () => {
        setRefreshKey(prev => prev + 1)
        setActiveTab("caja")
    }

    const handleCajaCerrada = () => {
        setTurnoActivo(null)
        setRefreshKey(prev => prev + 1) // Fuerza re-fetch de XP/perfil
        setActiveTab("caja")
    }
    
    // Handler para actualizar XP/misiones
    const handleMisionesUpdated = () => {
        setRefreshKey(prev => prev + 1) // Forzar re-fetch de XP/perfil
    }

    // --- Renderizado ---

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            
            {/* Header Fijo */}
            <div className="bg-gradient-to-br from-accent via-accent to-chart-2 text-accent-foreground p-6 rounded-b-3xl shadow-xl">
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold mb-2">{userProfile?.nombre || "Modo Empleado"}</h1>
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-accent-foreground hover:bg-accent-foreground/20">
                        <LogOut className="h-6 w-6" />
                    </Button>
                </div>
                
                {/* BARRA DE XP */}
                <div className="flex items-center gap-2 mt-1 mb-2">
                    <Star className="h-5 w-5 text-yellow-300 fill-yellow-500" />
                    <span className="text-sm font-black text-white">
                        XP TOTAL: {userProfile?.xp || 0}
                    </span>
                </div>
                
                {turnoActivo ? (
                    <div className="mt-2 text-sm font-semibold text-accent-foreground/90">
                        Turno Activo: {new Date(turnoActivo.fecha_apertura).toLocaleTimeString()} | Base: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(turnoActivo.monto_inicial)}
                    </div>
                ) : (
                    <div className="mt-2 text-sm font-semibold text-accent-foreground/90">
                        Caja Cerrada. Debes iniciar turno.
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                
                {/* Si NO hay turno activo, solo mostramos el componente de Arqueo */}
                {!turnoActivo && (
                    <div className="animate-in fade-in">
                        <ArqueoCaja 
                            onCajaAbierta={handleCajaAbierta}
                            onCajaCerrada={handleCajaCerrada}
                            turnoActivo={turnoActivo}
                        />
                    </div>
                )}
                
                {/* Si hay turno activo, mostramos el router de pestañas */}
                {turnoActivo && (
                    <>
                        {/* Router de Pestañas */}
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 border-b">
                            <Button 
                                onClick={() => setActiveTab("caja")} 
                                variant={activeTab === "caja" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap"
                            >
                                <ShoppingCart className="mr-2 h-4 w-4" /> Venta
                            </Button>
                            <Button 
                                onClick={() => setActiveTab("misiones")} 
                                variant={activeTab === "misiones" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap"
                            >
                                <Target className="mr-2 h-4 w-4" /> Misiones 
                            </Button>
                            <Button 
                                onClick={() => setActiveTab("vencimientos")} 
                                variant={activeTab === "vencimientos" ? "default" : "outline"}
                                size="sm"
                                className="whitespace-nowrap"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4" /> Vencimientos
                            </Button>
                        </div>
                        
                        {/* Contenido */}
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {activeTab === "caja" && (
                                <>
                                    {/* Mostramos el componente ArqueoCaja para CERRAR TURNO */}
                                    <ArqueoCaja 
                                        onCajaAbierta={handleCajaAbierta}
                                        onCajaCerrada={handleCajaCerrada}
                                        turnoActivo={turnoActivo}
                                    />
                                    
                                    {/* --- AQUÍ ESTABA EL FALTANTE --- */}
                                    {/* BOTÓN DE GASTOS (Solo si hay turno activo y perfil cargado) */}
                                    {userProfile && (
                                        <div className="mt-4">
                                            <RegistrarGasto 
                                                turnoId={turnoActivo.id} 
                                                empleadoId={userProfile.id} 
                                            />
                                        </div>
                                    )}
                                    {/* ---------------------------------- */}

                                    <div className="mt-4">
                                        <CajaVentas turnoId={turnoActivo.id} />
                                    </div>
                                </>
                            )}
                            
                            {activeTab === "misiones" && (
                                <MisionesEmpleado 
                                    turnoId={turnoActivo.id}
                                    onMisionesUpdated={handleMisionesUpdated}
                                    key={turnoActivo.id + refreshKey} // Forzar re-renderizado
                                />
                            )}
                            
                            {activeTab === "vencimientos" && (
                                <Card className="p-6 text-center text-muted-foreground">
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                                    <p>Vista de gestión de stock por vencer (próximo paso si se requiere separar de misiones).</p>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}