// components/arqueo-caja.tsx
"use client"

import { useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, DollarSign, LogIn, LogOut, CheckCheck } from "lucide-react"
import { toast } from "sonner"

// Definición de la estructura de una sesión de caja
export interface CajaSession {
    id: string
    empleado_id: string
    monto_inicial: number
    fecha_apertura: string
    fecha_cierre: string | null
    monto_final: number | null
}

interface ArqueoCajaProps {
    session: CajaSession | null
    onCajaUpdate: () => void // Para refrescar el estado en vista-empleado
}

export function ArqueoCaja({ session, onCajaUpdate }: ArqueoCajaProps) {
    const [loading, setLoading] = useState(false)
    const [monto, setMonto] = useState<number | ''>('')

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
    }

    const handleAbrirCaja = async (e: React.FormEvent) => {
        e.preventDefault()
        if (typeof monto !== 'number' || monto < 0) {
            toast.error("Monto inicial inválido", { description: "Ingresa un monto válido para comenzar." })
            return
        }

        setLoading(true)
        try {
            // Obtenemos el ID del usuario actual logueado
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No hay usuario logueado.")

            const { error } = await supabase
                .from('caja_diaria')
                .insert({
                    empleado_id: user.id,
                    monto_inicial: monto,
                })

            if (error) throw error

            toast.success("Caja Abierta 🟢", { description: `Comenzaste el día con ${formatMoney(monto)}.` })
            setMonto('')
            onCajaUpdate() // Notifica a VistaEmpleado para cambiar de vista

        } catch (error: any) {
            console.error("Error al abrir caja:", error)
            toast.error("Error al abrir caja", { description: error.message || "Intenta de nuevo." })
        } finally {
            setLoading(false)
        }
    }

    const handleCerrarCaja = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) return
        if (typeof monto !== 'number' || monto < 0) {
            toast.error("Monto final inválido", { description: "Ingresa el monto exacto para el arqueo." })
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('caja_diaria')
                .update({
                    fecha_cierre: new Date().toISOString(),
                    monto_final: monto,
                })
                .eq('id', session.id)

            if (error) throw error

            toast.success("Caja Cerrada 🔴", { description: `Arqueo finalizado con ${formatMoney(monto)}.` })
            setMonto('')
            onCajaUpdate() // Notifica a VistaEmpleado para cambiar de vista

        } catch (error: any) {
            console.error("Error al cerrar caja:", error)
            toast.error("Error al cerrar caja", { description: error.message || "Intenta de nuevo." })
        } finally {
            setLoading(false)
        }
    }

    // --- Renderizar Apertura ---
    if (!session) {
        return (
            <Card className="p-6 space-y-4 shadow-xl border-2 border-emerald-500/50 bg-emerald-50">
                <div className="text-center space-y-2">
                    <LogIn className="h-10 w-10 text-emerald-600 mx-auto" />
                    <h3 className="text-xl font-bold text-emerald-800">Abrir Caja</h3>
                    <p className="text-sm text-emerald-700/80">Comienza tu turno con un monto inicial.</p>
                </div>
                <form onSubmit={handleAbrirCaja} className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Monto Inicial ($)</label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={monto}
                        onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
                        required
                        autoFocus
                        className="h-12 text-center text-xl font-bold bg-white"
                    />
                    <Button type="submit" className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Abrir Turno"}
                    </Button>
                </form>
            </Card>
        )
    }

    // --- Renderizar Cierre ---
    const aperturaDate = new Date(session.fecha_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    
    return (
        <Card className="p-6 space-y-4 shadow-xl border-2 border-red-500/50 bg-red-50">
            <div className="text-center space-y-2">
                <LogOut className="h-10 w-10 text-red-600 mx-auto" />
                <h3 className="text-xl font-bold text-red-800">Cerrar Caja</h3>
                <p className="text-sm text-red-700/80">Ingresa el efectivo final para el arqueo.</p>
            </div>
            
            <div className="text-center space-y-1 pb-3 border-b border-red-200">
                <p className="text-xs text-red-700 font-medium">Abierto desde: {aperturaDate}</p>
                <p className="text-xl font-black text-red-800 flex items-center justify-center gap-2">
                    <DollarSign className="h-5 w-5" /> Base: {formatMoney(session.monto_inicial)}
                </p>
            </div>

            <form onSubmit={handleCerrarCaja} className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Monto Final ($)</label>
                <Input
                    type="number"
                    placeholder={formatMoney(session.monto_inicial).replace(/[^0-9]/g, '')}
                    value={monto}
                    onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
                    required
                    autoFocus
                    className="h-12 text-center text-xl font-bold bg-white"
                />
                <Button 
                    type="submit" 
                    className="w-full h-12 text-lg bg-red-600 hover:bg-red-700" 
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCheck className="mr-2 h-5 w-5" /> Confirmar Cierre</>}
                </Button>
            </form>
        </Card>
    )
}