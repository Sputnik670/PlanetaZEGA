// components/arqueo-caja.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, DollarSign, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import { triggerConfetti } from "@/components/confetti-trigger"

interface ArqueoCajaProps {
  onCajaAbierta: (turnoId: string) => void
  onCajaCerrada: () => void
  turnoActivo: CajaDiaria | null 
  sucursalId: string 
}

export interface CajaDiaria {
    id: string
    organization_id: string
    sucursal_id: string
    monto_inicial: number
    fecha_apertura: string
    empleado_id: string
    monto_final: number | null
}

export default function ArqueoCaja({ onCajaAbierta, onCajaCerrada, turnoActivo, sucursalId }: ArqueoCajaProps) {
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [montoFinal, setMontoFinal] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [caja, setCaja] = useState<CajaDiaria | null>(turnoActivo)

  const generarMisiones = async (cajaId: string, empleadoId: string, orgId: string) => {
    try {
      const hoy = new Date()
      const fechaLimite = format(addDays(hoy, 10), 'yyyy-MM-dd')

      // 1. Auditamos stock SOLO de esta sucursal
      const { data: stockCritico } = await supabase
        .from('stock')
        .select('cantidad')
        .eq('sucursal_id', sucursalId)
        .eq('tipo_movimiento', 'entrada')
        .eq('estado', 'disponible')
        .lt('fecha_vencimiento', fechaLimite)
      
      const totalUnidadesRiesgo = stockCritico?.reduce((acc, curr) => acc + (curr.cantidad || 0), 0) || 0

      const misionesABulkInsert = []
      
      // Misión A: Vencimientos locales
      if (totalUnidadesRiesgo > 0) {
        misionesABulkInsert.push({
          organization_id: orgId,
          empleado_id: empleadoId,
          caja_diaria_id: cajaId,
          tipo: 'vencimiento',
          descripcion: `Gestionar ${totalUnidadesRiesgo} productos por vencer en este local.`,
          objetivo_unidades: totalUnidadesRiesgo,
          unidades_completadas: 0,
          es_completada: false,
          puntos: 30, 
        })
      }
      
      // Misión B: Arqueo Limpio (General)
      misionesABulkInsert.push({
        organization_id: orgId,
        empleado_id: empleadoId,
        caja_diaria_id: cajaId,
        tipo: 'arqueo_cierre',
        descripcion: 'Realizar el cierre de caja con precisión total.',
        objetivo_unidades: 1,
        unidades_completadas: 0,
        es_completada: false,
        puntos: 20, 
      })

      // ✅ PUNTO CLAVE: Cargar Plantillas (Rutinas) específicas de esta sucursal o globales
      const { data: plantillas } = await supabase
          .from('plantillas_misiones')
          .select('*')
          .eq('organization_id', orgId)
          .eq('activa', true)
          .or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`) // Trae globales o de esta sucursal

      if (plantillas && plantillas.length > 0) {
          plantillas.forEach(p => {
              misionesABulkInsert.push({
                  organization_id: orgId,
                  empleado_id: empleadoId,
                  caja_diaria_id: cajaId,
                  tipo: 'manual',
                  descripcion: p.descripcion,
                  objetivo_unidades: 1,
                  unidades_completadas: 0,
                  es_completada: false,
                  puntos: p.puntos
              })
          })
      }

      if (misionesABulkInsert.length > 0) {
        await supabase.from('misiones').insert(misionesABulkInsert)
        if (totalUnidadesRiesgo > 0) toast.warning("⚠️ Misiones de Stock activadas")
      }
    } catch (error) {
      console.error("Error generando misiones:", error)
    }
  }

  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inicial Inválido")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesión inválida")
      
      const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single()
      if (!perfil?.organization_id) throw new Error("No tienes organización asignada.")

      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          organization_id: perfil.organization_id, 
          sucursal_id: sucursalId, 
          monto_inicial: monto,
          empleado_id: user.id,
          fecha_apertura: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error

      const nuevoTurno = data as CajaDiaria
      setCaja(nuevoTurno)
      await generarMisiones(nuevoTurno.id, user.id, perfil.organization_id)

      onCajaAbierta(nuevoTurno.id)
      toast.success("Turno Iniciado")

    } catch (error: any) {
      toast.error("Error al abrir caja", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarCaja = async () => {
    if (!caja) return
    const montoDeclarado = parseFloat(montoFinal)
    if (isNaN(montoDeclarado)) {
      toast.error("Ingresa el efectivo final.")
      return
    }

    setLoading(true)
    try {
      // Cálculo de ventas efectivo del turno
      const { data: ventasData } = await supabase
        .from('stock')
        .select('cantidad, precio_venta_historico')
        .eq('caja_diaria_id', caja.id)
        .eq('metodo_pago', 'efectivo') 
        .eq('tipo_movimiento', 'salida') 

      const totalVentasEfectivo = ventasData?.reduce((sum, item) => sum + ((item.precio_venta_historico || 0) * (item.cantidad || 1)), 0) || 0

      // Cálculo de gastos del turno
      const { data: gastosData } = await supabase
        .from('movimientos_caja')
        .select('monto')
        .eq('caja_diaria_id', caja.id)
        .eq('tipo', 'egreso')
      
      const totalGastos = gastosData?.reduce((sum, item) => sum + item.monto, 0) || 0

      const dineroEsperado = (caja.monto_inicial + totalVentasEfectivo) - totalGastos
      const desvio = montoDeclarado - dineroEsperado
      const exitoArqueo = Math.abs(desvio) <= 100 

      // ✅ ACTUALIZACIÓN DE MISIÓN Y XP
      if (exitoArqueo) {
          // Marcar misión de arqueo como completada
          await supabase.from('misiones').update({ es_completada: true, unidades_completadas: 1 }).eq('caja_diaria_id', caja.id).eq('tipo', 'arqueo_cierre')
          
          // Sumar XP al empleado
          const { data: p } = await supabase.from('perfiles').select('xp').eq('id', caja.empleado_id).single()
          if (p) await supabase.from('perfiles').update({ xp: p.xp + 20 }).eq('id', caja.empleado_id)
          
          triggerConfetti()
          toast.success("🏆 Cierre Perfecto (+20 XP)")
      } else {
          toast.warning("Turno Cerrado con Diferencia", { description: `Diferencia: $${desvio.toFixed(0)}` })
      }

      await supabase.from('caja_diaria').update({ monto_final: montoDeclarado, diferencia: desvio, fecha_cierre: new Date().toISOString() }).eq('id', caja.id)

      setCaja(null)
      onCajaCerrada()
    } catch (error: any) {
      toast.error("Error al cerrar")
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)

  if (caja) {
    return (
      <Card className="p-6 border-4 border-red-100 bg-red-50/20 shadow-inner">
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
          <Lock className="h-6 w-6" /> Finalizar Turno
        </h2>
        
        <div className="space-y-4">
            <div className="text-sm flex justify-between bg-white p-3 rounded-md border border-red-100">
                <span className="text-muted-foreground">Inicio: {format(new Date(caja.fecha_apertura), 'HH:mm')}</span>
                <span className="font-bold">Base: {formatMoney(caja.monto_inicial)}</span>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-red-800">Efectivo Final en Caja</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
                    <Input
                        type="number"
                        className="pl-10 h-14 text-2xl font-bold bg-white border-red-200"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                    />
                </div>
            </div>
            
            <Button onClick={handleCerrarCaja} disabled={loading} className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 font-bold">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "CERRAR CAJA"}
            </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/30">
      <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-700 mb-4">
        <Unlock className="h-5 w-5" /> Apertura de Caja
      </h2>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground font-medium">Estás operando en este local. Ingresa el efectivo base.</p>
        <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            <Input
                type="number"
                placeholder="Monto Inicial"
                className="pl-9 h-12 text-lg border-emerald-200 bg-white"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
            />
        </div>
        <Button onClick={handleAbrirCaja} disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm">
            {loading ? <Loader2 className="animate-spin mr-2" /> : "ABRIR TURNO EN ESTA SUCURSAL"}
        </Button>
      </div>
    </Card>
  )
}