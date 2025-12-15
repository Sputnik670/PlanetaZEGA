// components/arqueo-caja.tsx

"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, DollarSign, Lock } from "lucide-react"
import { toast } from "sonner"
import { format, addDays } from "date-fns"

interface ArqueoCajaProps {
  onCajaAbierta: (turnoId: string) => void
  onCajaCerrada: () => void
  turnoActivo: CajaDiaria | null 
}

export interface CajaDiaria {
    id: string
    monto_inicial: number
    fecha_apertura: string
    empleado_id: string
    monto_final: number | null; 
}

export default function ArqueoCaja({ onCajaAbierta, onCajaCerrada, turnoActivo }: ArqueoCajaProps) {
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [montoFinal, setMontoFinal] = useState<string>("")
  const [loading, setLoading] = useState(false)
  
  // Estado local para manejar la UI de caja abierta/cerrada
  const [caja, setCaja] = useState<CajaDiaria | null>(turnoActivo)

  // 🎲 Lógica de Gamificación Dinámica (Motor de Misiones)
  const generarMisiones = async (cajaId: string, empleadoId: string) => {
    try {
      const hoy = new Date()
      // Buscamos productos que vencen en los próximos 7 días
      const fechaLimite = format(addDays(hoy, 7), 'yyyy-MM-dd')

      const { data: stockCritico, error: stockError } = await supabase
        .from('stock')
        .select('id, producto_id, fecha_vencimiento')
        .eq('estado', 'pendiente')
        .lt('fecha_vencimiento', fechaLimite)
      
      if (stockError) throw stockError

      // Agrupamos para contar cuántas unidades hay de cada producto en riesgo
      const productosEnRiesgo: { [key: string]: number } = {}
      stockCritico?.forEach(item => {
        productosEnRiesgo[item.producto_id] = (productosEnRiesgo[item.producto_id] || 0) + 1
      })

      const misionesABulkInsert = []
      const totalUnidadesRiesgo = Object.values(productosEnRiesgo).reduce((sum, count) => sum + count, 0)
      
      // 1. Misión Condicional: Solo si hay riesgo real en el inventario
      if (totalUnidadesRiesgo > 0) {
        misionesABulkInsert.push({
          empleado_id: empleadoId,
          caja_diaria_id: cajaId,
          tipo: 'vencimiento',
          descripcion: `Gestionar ${totalUnidadesRiesgo} productos con vencimiento próximo.`,
          objetivo_unidades: totalUnidadesRiesgo,
          unidades_completadas: 0,
          es_completada: false,
          // Fórmula de puntos mejorada: Base 10 + bonos, tope 100 pts.
          puntos: Math.min(10 + Math.floor(totalUnidadesRiesgo / 2) * 5, 100), 
        })
      }
      
      // 2. Misión Fija: Cierre de Caja Perfecto (Incentivo diario)
      misionesABulkInsert.push({
        empleado_id: empleadoId,
        caja_diaria_id: cajaId,
        tipo: 'arqueo_cierre',
        descripcion: 'Realizar el cierre de caja con un desvío menor a $100.',
        objetivo_unidades: 1,
        unidades_completadas: 0,
        es_completada: false,
        puntos: 20, // 20 Puntos fijos por buen cierre
      })

      if (misionesABulkInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('misiones')
          .insert(misionesABulkInsert)
        
        if (insertError) throw insertError
        
        if (totalUnidadesRiesgo > 0) {
            toast.warning("⚠️ Misión de Riesgo Activada", { description: `Se detectaron ${totalUnidadesRiesgo} unidades por vencer.` })
        }
      }

    } catch (error: any) {
      console.error("Error generando misiones:", error)
      // No bloqueamos la apertura si fallan las misiones, pero avisamos para debug
      toast.error("Advertencia del Sistema", { description: "La caja se abrió, pero hubo un error generando las tareas automáticas." })
    }
  }

  // --- Apertura ---
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inválido", { description: "Ingresa el efectivo inicial para abrir la caja." })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesión inválida")
      
      // 1. Crear el registro de Turno (Caja Diaria)
      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          monto_inicial: monto,
          empleado_id: user.id,
          fecha_apertura: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error

      const nuevoTurno = data as CajaDiaria
      setCaja(nuevoTurno)
      
      // 2. Generar Misiones AUTOMÁTICAS (Esto ocurre en segundo plano)
      await generarMisiones(nuevoTurno.id, user.id)

      onCajaAbierta(nuevoTurno.id)
      toast.success("Turno Iniciado", { description: "¡A vender! Revisa la pestaña de Misiones." })

    } catch (error: any) {
      toast.error("Error al abrir caja", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  // --- Cierre ---
  const handleCerrarCaja = async () => {
    if (!caja) return
    const monto = parseFloat(montoFinal)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inválido", { description: "Ingresa el monto final que hay en la caja." })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado.")

      // 1. Cálculo de Desvío para validar la Misión
      const desvio = Math.abs(monto - caja.monto_inicial) 
      const exitoArqueo = desvio <= 100 

      // 2. Actualizar registro de Caja (Cierre)
      const { error } = await supabase
        .from('caja_diaria')
        .update({ 
          monto_final: monto, 
          fecha_cierre: new Date().toISOString() 
        })
        .eq('id', caja.id)
      
      if (error) throw error

      // 3. Completar Misión de Arqueo automáticamente
      // Actualizamos la misión generada al inicio
      await supabase
          .from('misiones')
          .update({
              es_completada: exitoArqueo,
              unidades_completadas: 1, // Se marca como intento realizado
          })
          .eq('caja_diaria_id', caja.id)
          .eq('tipo', 'arqueo_cierre')

      setCaja(null)
      onCajaCerrada()
      
      if (exitoArqueo) {
        toast.success("🏆 Cierre Perfecto", { description: "¡Ganaste 20 puntos de experiencia por precisión!" })
      } else {
        toast.success("Turno Cerrado", { description: `Caja cerrada. Desvío: ${formatMoney(desvio)}` })
      }

    } catch (error: any) {
      console.error(error)
      toast.error("Error al cerrar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)

  // --- Renderizado UI ---
  
  // A. Si la caja ya está abierta -> Muestra Formulario de CIERRE
  if (caja) {
    return (
      <Card className="p-6 border-2 border-red-100 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50">
        <h2 className="text-xl font-bold flex items-center gap-2 text-red-600 mb-4">
          <Lock className="h-5 w-5" /> Cerrar Turno
        </h2>
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground flex justify-between bg-white/50 p-3 rounded-md">
                <span>Inicio: {format(new Date(caja.fecha_apertura), 'HH:mm')}</span>
                <span className="font-bold text-foreground">Base: {formatMoney(caja.monto_inicial)}</span>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Efectivo en Caja</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-9 h-12 text-lg bg-white"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            
            <Button 
                onClick={handleCerrarCaja} 
                disabled={loading}
                className="w-full h-12 bg-red-600 hover:bg-red-700 font-bold shadow-sm"
            >
                {loading ? <Loader2 className="animate-spin mr-2" /> : "FINALIZAR DÍA"}
            </Button>
        </div>
      </Card>
    )
  }

  // B. Si la caja está cerrada -> Muestra Formulario de APERTURA
  return (
    <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/50">
      <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-700 mb-4">
        <DollarSign className="h-5 w-5" /> Apertura de Caja
      </h2>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Ingresa el monto base para comenzar a vender y recibir tus misiones.</p>
        
        <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            <Input
                type="number"
                placeholder="Monto Inicial (Ej: 5000)"
                className="pl-9 h-12 text-lg border-emerald-200 focus-visible:ring-emerald-500 bg-white"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                disabled={loading}
            />
        </div>
        
        <Button 
            onClick={handleAbrirCaja} 
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm"
        >
            {loading ? <Loader2 className="animate-spin mr-2" /> : "ABRIR TURNO"}
        </Button>
      </div>
    </Card>
  )
}