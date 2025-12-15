// components/arqueo-caja.tsx

"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, DollarSign, LogOut, Check, X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface ArqueoCajaProps {
  onCajaAbierta: (turnoId: string) => void
  onCajaCerrada: () => void
  turnoActivo: CajaDiaria | null // Usamos el tipo aquí
}

// 🚨 CORRECCIÓN: Exportamos el tipo y añadimos monto_final y monto_inicial
export interface CajaDiaria {
    id: string
    monto_inicial: number
    fecha_apertura: string
    empleado_id: string
    monto_final: number | null; // AÑADIDO: Era el error 'monto_final' does not exist
}

// 🚨 CAMBIO: Exportamos por defecto
export default function ArqueoCaja({ onCajaAbierta, onCajaCerrada, turnoActivo }: ArqueoCajaProps) {
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [montoFinal, setMontoFinal] = useState<string>("")
  const [loading, setLoading] = useState(false)
  // Usamos CajaDiaria aquí
  const [caja, setCaja] = useState<CajaDiaria | null>(turnoActivo as CajaDiaria | null)


  // 🚨 Función Central: Generar misiones al abrir caja (Lógica simplificada en este snippet para enfocar en el Fix)
  const generarMisiones = async (cajaId: string, empleadoId: string) => {
    // ... (lógica de generación de misiones, sin cambios)
    try {
      const hoy = new Date()
      const fechaLimite = format(hoy.setDate(hoy.getDate() + 7), 'yyyy-MM-dd') // Próximos 7 días

      const { data: stockCritico, error: stockError } = await supabase
        .from('stock')
        .select('id, producto_id, fecha_vencimiento')
        .eq('estado', 'pendiente')
        .lt('fecha_vencimiento', fechaLimite)
      
      if (stockError) throw stockError

      const productosEnRiesgo: { [key: string]: number } = {}
      stockCritico?.forEach(item => {
        productosEnRiesgo[item.producto_id] = (productosEnRiesgo[item.producto_id] || 0) + 1
      })

      const misionesABulkInsert = []
      const totalUnidadesRiesgo = Object.values(productosEnRiesgo).reduce((sum, count) => sum + count, 0)
      
      if (totalUnidadesRiesgo > 0) {
        misionesABulkInsert.push({
          empleado_id: empleadoId,
          caja_diaria_id: cajaId,
          tipo: 'vencimiento',
          descripcion: `Mover/Verificar ${totalUnidadesRiesgo} unidades con fecha de vencimiento próxima (< 7 días).`,
          objetivo_unidades: totalUnidadesRiesgo,
          puntos: Math.min(10 + Math.floor(totalUnidadesRiesgo / 5) * 5, 50),
        })
      }
      
      misionesABulkInsert.push({
        empleado_id: empleadoId,
        caja_diaria_id: cajaId,
        tipo: 'arqueo_cierre',
        descripcion: 'Realizar el cierre de caja con un desvío de <= $100.',
        objetivo_unidades: 1,
        puntos: 15,
      })

      if (misionesABulkInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('misiones')
          .insert(misionesABulkInsert)
        
        if (insertError) throw insertError
        
        const misionVencimientoCount = misionesABulkInsert.filter(m => m.tipo === 'vencimiento').length
        if (misionVencimientoCount > 0) {
            toast.info("🚨 ¡Misión de Vencimiento Activa!", { description: `Hay ${totalUnidadesRiesgo} unidades en riesgo. Revisa la pestaña 'Misiones'.` })
        }
      }

    } catch (error: any) {
      console.error("Error generando misiones:", error)
      toast.error("Error de Misiones", { description: "No se pudieron crear las tareas de turno." })
    }
  }

  // --- Lógica de Apertura de Caja ---
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inválido", { description: "Ingresa un monto inicial de caja válido." })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado.")
      
      // 1. Insertar nuevo registro de caja diaria (Abrir Turno)
      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          monto_inicial: monto,
          empleado_id: user.id,
        })
        .select()
        .single()
      
      if (error) throw error

      const nuevoTurno = data as CajaDiaria
      setCaja(nuevoTurno)
      
      // 2. Generar Misiones después de abrir la caja
      await generarMisiones(nuevoTurno.id, user.id)

      onCajaAbierta(nuevoTurno.id)
      toast.success("Caja Abierta", { description: `Turno iniciado con ${formatMoney(monto)}.` })

    } catch (error: any) {
      console.error("Error al abrir caja:", error)
      toast.error("Error de Operación", { description: error.message || "No se pudo iniciar el turno de caja." })
    } finally {
      setLoading(false)
    }
  }

  // --- Lógica de Cierre de Caja ---
  const handleCerrarCaja = async () => {
    if (!caja) return

    const monto = parseFloat(montoFinal)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inválido", { description: "Ingresa el monto final de caja." })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado.")

      // Calcular Desvío
      const desvioMonetario = Math.abs(monto - caja.monto_inicial) 
      
      // Determinar si la misión de arqueo_cierre fue exitosa
      const exitoArqueo = desvioMonetario <= 100 

      // 3. Actualizar registro de caja diaria (Cerrar Turno)
      const { error } = await supabase
        .from('caja_diaria')
        .update({ 
          monto_final: monto, 
          fecha_cierre: new Date().toISOString() 
        })
        .eq('id', caja.id)
      
      if (error) throw error

      // 4. Actualizar Misión de Arqueo
      await supabase
          .from('misiones')
          .update({
              es_completada: exitoArqueo,
              unidades_completadas: 1,
              puntos: exitoArqueo ? 15 : 0
          })
          .eq('caja_diaria_id', caja.id)
          .eq('tipo', 'arqueo_cierre')
          .eq('empleado_id', user.id)


      setCaja(null)
      onCajaCerrada()
      toast.success("Caja Cerrada", { description: `Turno finalizado. Monto de cierre: ${formatMoney(monto)}. Desvío: ${formatMoney(desvioMonetario)}.` })
      if (exitoArqueo) {
        toast.success("✨ Misión Arqueo Completada", { description: "Ganaste 15 puntos por un cierre preciso." })
      }

    } catch (error: any) {
      console.error("Error al cerrar caja:", error)
      toast.error("Error de Operación", { description: error.message || "No se pudo cerrar el turno de caja." })
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (amount: number) => {
    const numericAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(numericAmount)
  }

  // --- Renderizado (sin cambios) ---

  // Si la caja ya está abierta, muestra el formulario de cierre
  if (caja) {
    return (
      <Card className="p-6 space-y-4 shadow-xl border-2 border-destructive/20 bg-destructive/5">
        <h2 className="text-xl font-bold flex items-center gap-2 text-destructive">
          <DollarSign className="h-6 w-6" /> Cerrar Turno
        </h2>
        <div className="text-sm text-muted-foreground border-b pb-3 mb-3">
            <p>Turno abierto desde: {format(new Date(caja.fecha_apertura), 'HH:mm - dd/MM/yyyy')}</p>
            <p className="font-semibold text-foreground">Monto Inicial: {formatMoney(caja.monto_inicial)}</p>
        </div>
        
        <Input
          type="number"
          placeholder="Monto Final en Caja"
          className="h-12 text-lg"
          value={montoFinal}
          onChange={(e) => setMontoFinal(e.target.value)}
          disabled={loading}
          autoFocus
        />
        
        <Button 
          onClick={handleCerrarCaja} 
          disabled={loading}
          className="w-full h-12 text-lg bg-destructive hover:bg-destructive/90"
        >
          {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "CERRAR CAJA"}
        </Button>
      </Card>
    )
  }

  // Si la caja está cerrada, muestra el formulario de apertura
  return (
    <Card className="p-6 space-y-4 shadow-xl border-2 border-emerald-600/20 bg-emerald-600/5">
      <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600">
        <DollarSign className="h-6 w-6" /> Abrir Turno
      </h2>
      <p className="text-sm text-muted-foreground">Ingresa el monto inicial de la caja para comenzar a operar.</p>
      
      <Input
        type="number"
        placeholder="Monto Inicial de Caja"
        className="h-12 text-lg"
        value={montoInicial}
        onChange={(e) => setMontoInicial(e.target.value)}
        disabled={loading}
        autoFocus
      />
      
      <Button 
        onClick={handleAbrirCaja} 
        disabled={loading}
        className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "ABRIR TURNO"}
      </Button>
    </Card>
  )
}