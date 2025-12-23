"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, DollarSign, Lock, Unlock, Calculator, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { format, addDays, parseISO } from "date-fns"
import { triggerConfetti } from "@/components/confetti-trigger"

export interface CajaDiaria {
    id: string
    organization_id: string
    sucursal_id: string
    monto_inicial: number
    fecha_apertura: string
    empleado_id: string
    monto_final: number | null
}

interface ArqueoCajaProps {
  onCajaAbierta: (turnoId: string) => void
  onCajaCerrada: () => void
  turnoActivo: CajaDiaria | null 
  sucursalId: string 
}

export default function ArqueoCaja({ onCajaAbierta, onCajaCerrada, turnoActivo, sucursalId }: ArqueoCajaProps) {
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [montoFinal, setMontoFinal] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [caja, setCaja] = useState<CajaDiaria | null>(turnoActivo)

  useEffect(() => {
    setCaja(turnoActivo)
  }, [turnoActivo])

  const generarMisiones = async (cajaId: string, empleadoId: string, orgId: string) => {
    try {
      const hoy = new Date()
      const fechaLimite = format(addDays(hoy, 10), 'yyyy-MM-dd')

      const { data: stockCritico } = await supabase
        .from('stock')
        .select('cantidad')
        .eq('sucursal_id', sucursalId)
        .eq('tipo_movimiento', 'entrada')
        .eq('estado', 'disponible')
        .lt('fecha_vencimiento', fechaLimite)
      
      const totalUnidadesRiesgo = stockCritico?.reduce((acc, curr) => acc + (curr.cantidad || 0), 0) || 0
      const misionesABulkInsert = []
      
      // ✅ MISIÓN EDUCATIVA FIFO
      if (totalUnidadesRiesgo > 0) {
        misionesABulkInsert.push({
          organization_id: orgId,
          empleado_id: empleadoId,
          caja_diaria_id: cajaId,
          tipo: 'vencimiento',
          descripcion: `Rotación Preventiva: Colocar al frente ${totalUnidadesRiesgo} unidades próximas a vencer.`,
          objetivo_unidades: totalUnidadesRiesgo,
          unidades_completadas: 0,
          es_completada: false,
          puntos: 30, 
        })
      }
      
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

      const { data: plantillas } = await supabase
          .from('plantillas_misiones')
          .select('*')
          .eq('organization_id', orgId)
          .eq('activa', true)
          .or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`)

      if (plantillas) {
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
      }
    } catch (error) {
      console.error("Error generando misiones:", error)
    }
  }

  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) return toast.error("Ingresa un monto base válido")

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user?.id).single()

      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          organization_id: perfil?.organization_id, 
          sucursal_id: sucursalId, 
          monto_inicial: monto,
          empleado_id: user?.id,
          fecha_apertura: new Date().toISOString()
        })
        .select().single()
      
      if (error) throw error

      await generarMisiones(data.id, user!.id, perfil!.organization_id)
      setCaja(data as CajaDiaria)
      onCajaAbierta(data.id)
      toast.success("Caja abierta correctamente")

    } catch (error: any) {
      toast.error("Error al abrir caja", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarCaja = async () => {
    if (!caja) return
    const montoDeclarado = parseFloat(montoFinal)
    if (isNaN(montoDeclarado)) return toast.error("Ingresa el efectivo final contado.")

    setLoading(true)
    try {
      const { data: vData } = await supabase.from('stock')
        .select('cantidad, precio_venta_historico')
        .eq('caja_diaria_id', caja.id).eq('metodo_pago', 'efectivo').eq('tipo_movimiento', 'salida') 

      const totalVentasEfectivo = vData?.reduce((sum, i) => sum + ((i.precio_venta_historico || 0) * (i.cantidad || 1)), 0) || 0

      const { data: gData } = await supabase.from('movimientos_caja').select('monto').eq('caja_diaria_id', caja.id).eq('tipo', 'egreso')
      const totalGastos = gData?.reduce((sum, i) => sum + i.monto, 0) || 0

      const dineroEsperado = (caja.monto_inicial + totalVentasEfectivo) - totalGastos
      const desvio = montoDeclarado - dineroEsperado
      const exitoArqueo = Math.abs(desvio) <= 100 

      if (exitoArqueo) {
          await supabase.from('misiones').update({ es_completada: true, unidades_completadas: 1 }).eq('caja_diaria_id', caja.id).eq('tipo', 'arqueo_cierre')
          const { data: p } = await supabase.from('perfiles').select('xp').eq('id', caja.empleado_id).single()
          if (p) await supabase.from('perfiles').update({ xp: p.xp + 20 }).eq('id', caja.empleado_id)
          triggerConfetti()
          toast.success("🏆 ¡Cierre Perfecto!", { description: "Has ganado +20 XP por tu precisión." })
      } else {
          toast.warning("Turno Cerrado con Diferencia", { description: `Desvío de $${desvio.toFixed(0)}` })
      }

      await supabase.from('caja_diaria').update({ 
        monto_final: montoDeclarado, 
        diferencia: desvio, 
        fecha_cierre: new Date().toISOString() 
      }).eq('id', caja.id)

      setCaja(null)
      onCajaCerrada()
    } catch (error) {
      toast.error("Error al procesar el cierre")
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)

  if (caja) {
    return (
      <Card className="p-6 border-2 border-red-200 bg-white shadow-xl rounded-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-red-600 flex items-center gap-2 uppercase tracking-tighter">
              <Lock className="h-5 w-5" /> Arqueo de Cierre
            </h2>
            <Badge variant="outline" className="text-red-500 border-red-200 font-bold uppercase text-[10px]">Turno en curso</Badge>
        </div>
        
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Iniciado a las</p>
                    <p className="text-sm font-bold text-slate-700">{format(parseISO(caja.fecha_apertura), 'HH:mm')} hs</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto Base</p>
                    <p className="text-sm font-black text-slate-900">{formatMoney(caja.monto_inicial)}</p>
                </div>
            </div>
            
            <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Calculator className="h-3 w-3" /> Efectivo Final Contado en Caja
                </Label>
                <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-red-500" />
                    <Input
                        type="number"
                        placeholder="0"
                        className="pl-12 h-16 text-3xl font-black bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-red-400 transition-all"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                    />
                </div>
            </div>
            
            <Button onClick={handleCerrarCaja} disabled={loading} className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 font-black rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR JORNADA Y CERRAR CAJA"}
            </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border-2 border-emerald-200 bg-white shadow-xl rounded-2xl">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-emerald-700 flex items-center gap-2 uppercase tracking-tighter">
            <Unlock className="h-5 w-5" /> Apertura de Turno
          </h2>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold uppercase text-[10px]">Listo para abrir</Badge>
      </div>

      <div className="space-y-6">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
            <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Vas a iniciar un turno operativo. Ingresa el **monto base** que hay físicamente en la caja ahora mismo.
            </p>
        </div>

        <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase text-slate-500">Monto Inicial (Cambio/Base)</Label>
            <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <Input
                    type="number"
                    placeholder="0"
                    className="pl-11 h-14 text-2xl font-black border-2 border-slate-200 rounded-xl focus:border-emerald-500 transition-all"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                />
            </div>
        </div>

        <Button onClick={handleAbrirCaja} disabled={loading} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-lg shadow-emerald-50 transition-all active:scale-95">
            {loading ? <Loader2 className="animate-spin mr-2" /> : "INICIAR ACTIVIDAD EN LOCAL"}
        </Button>
      </div>
    </Card>
  )
}