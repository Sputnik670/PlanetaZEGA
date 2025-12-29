"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Unlock, Calculator, AlertCircle } from "lucide-react"
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

  useEffect(() => { setCaja(turnoActivo) }, [turnoActivo])

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
      
      const totalUnidadesRiesgo = (stockCritico as Array<{ cantidad: number }> | null)?.reduce((acc, curr) => acc + (curr.cantidad || 0), 0) || 0
      const misionesABulkInsert = []
      
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
        await (supabase.from('misiones') as any).insert(misionesABulkInsert)
      }
    } catch (error) { console.error("Error misiones:", error) }
  }

  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) return toast.error("Ingresa un monto base válido")

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error("No hay sesión activa")
      const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single<{ organization_id: string | null }>()
      if (!perfil?.organization_id) throw new Error("No se encontró la organización.")

      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          organization_id: perfil.organization_id, 
          sucursal_id: sucursalId, 
          monto_inicial: monto,
          empleado_id: user.id,
          fecha_apertura: new Date().toISOString()
        })
        .select().single()
      
      if (error) throw error

      await generarMisiones(data.id, user.id, perfil.organization_id)
      setCaja(data as CajaDiaria)
      onCajaAbierta(data.id)
      toast.success("Turno Iniciado")
    } catch (error: any) { toast.error(error.message) } finally { setLoading(false) }
  }

  // --- LÓGICA CORREGIDA DE CIERRE ---
  const handleCerrarCaja = async () => {
    if (!caja) return
    const montoDeclarado = parseFloat(montoFinal)
    if (isNaN(montoDeclarado)) return toast.error("Ingresa el monto contado.")

    setLoading(true)
    try {
      // 1. Obtener Ventas en Efectivo (Fuente: STOCK)
      // Usamos stock porque aquí guardamos el metodo_pago exacto de cada item.
      // Esto filtra automáticamente las ventas con tarjeta/QR.
      const { data: vData } = await supabase.from('stock')
        .select('cantidad, precio_venta_historico')
        .eq('caja_diaria_id', caja.id)
        .eq('metodo_pago', 'efectivo')
        .eq('tipo_movimiento', 'salida') 
      
      const totalVentasEfectivo = vData?.reduce((sum, i) => sum + (Number(i.precio_venta_historico || 0) * (i.cantidad || 1)), 0) || 0

      // 2. Obtener Movimientos Manuales (Fuente: MOVIMIENTOS_CAJA)
      // ⚠️ FIX: Excluir 'ventas' para no duplicar lo calculado arriba.
      // Solo queremos ingresos manuales (ej: cambio chico) o egresos (gastos).
      const { data: mData } = await supabase.from('movimientos_caja')
        .select('monto, tipo, categoria')
        .eq('caja_diaria_id', caja.id)
        .neq('categoria', 'ventas') // <--- FILTRO CRÍTICO
      
      const totalIngresosExtra = mData?.filter(m => m.tipo === 'ingreso').reduce((sum, i) => sum + Number(i.monto), 0) || 0
      const totalGastos = mData?.filter(m => m.tipo === 'egreso').reduce((sum, i) => sum + Number(i.monto), 0) || 0

      // 3. ECUACIÓN FINAL: (Base Inicial + Ventas Efectivo + Ingresos Manuales) - Gastos Manuales
      const dineroEsperado = (Number(caja.monto_inicial) + totalVentasEfectivo + totalIngresosExtra) - totalGastos
      
      const desvio = montoDeclarado - dineroEsperado
      const exitoArqueo = Math.abs(desvio) <= 100 // Tolerancia de $100

      if (exitoArqueo) {
          await supabase.from('misiones').update({ es_completada: true, unidades_completadas: 1 }).eq('caja_diaria_id', caja.id).eq('tipo', 'arqueo_cierre')
          const { data: p } = await supabase.from('perfiles').select('xp').eq('id', caja.empleado_id).single<{ xp: number | null }>()
          if (p && p.xp !== null) await supabase.from('perfiles').update({ xp: p.xp + 20 }).eq('id', caja.empleado_id)
          triggerConfetti()
          toast.success("🏆 Cierre Excelente", { description: "La caja coincide con el sistema." })
      } else {
          toast.warning("Turno con Diferencia", { description: `Desvío de $${desvio.toFixed(0)} (Esp: $${formatMoney(dineroEsperado)})` })
      }

      await supabase.from('caja_diaria').update({ 
        monto_final: montoDeclarado, 
        diferencia: desvio, 
        fecha_cierre: new Date().toISOString() 
      }).eq('id', caja.id)

      setCaja(null)
      onCajaCerrada()
    } catch (error) { 
        console.error(error)
        toast.error("Error al cerrar") 
    } finally { 
        setLoading(false) 
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)

  if (caja) {
    return (
      <Card className="p-8 border-2 border-slate-900 bg-white shadow-2xl rounded-[2.5rem] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                    <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Fin de Jornada</h2>
            </div>
            <Badge className="bg-red-500 text-white font-black text-[10px] px-3 py-1">TURNO ACTIVO</Badge>
        </div>
        
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-center">Base de Inicio</p>
                    <p className="text-xl font-black text-slate-900 text-center">{formatMoney(caja.monto_inicial)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest text-center">Apertura</p>
                    <p className="text-xl font-black text-blue-900 text-center">{format(parseISO(caja.fecha_apertura), 'HH:mm')} HS</p>
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase text-slate-500 flex items-center justify-center gap-2">
                    <Calculator className="h-4 w-4" /> Efectivo Físico en Cajón (Contado)
                </Label>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300 group-focus-within:text-red-500 transition-colors">$</div>
                    <Input
                        type="number"
                        placeholder="0"
                        className="pl-12 h-24 text-5xl font-black text-center bg-slate-50 border-4 border-slate-100 rounded-[2rem] focus:border-red-500 focus:bg-white transition-all shadow-inner"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                    />
                </div>
            </div>
            
            <Button onClick={handleCerrarCaja} disabled={loading} className="w-full h-20 text-lg bg-red-600 hover:bg-red-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-red-100 transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-8 w-8" /> : "FINALIZAR Y VALIDAR CAJA"}
            </Button>
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Al cerrar, el sistema auditará la precisión de tu conteo.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 border-2 border-emerald-500 bg-white shadow-2xl rounded-[2.5rem] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <Unlock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Nueva Apertura</h2>
          </div>
          <Badge className="bg-emerald-500 text-white font-black text-[10px] px-3 py-1">REQUERIDO</Badge>
      </div>

      <div className="space-y-8">
        <div className="bg-emerald-50 p-6 rounded-[1.5rem] border-2 border-emerald-100 flex gap-4">
            <AlertCircle className="h-6 w-6 text-emerald-600 shrink-0" />
            <div className="space-y-1">
                <p className="text-xs font-black text-emerald-800 uppercase">Aviso de Auditoría</p>
                <p className="text-xs text-emerald-700 font-bold leading-relaxed">
                    Cuenta el efectivo del cajón antes de empezar. Este monto será tu responsabilidad durante todo el turno.
                </p>
            </div>
        </div>

        <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase text-slate-500 text-center block">Monto de Cambio (Base Inicial)</Label>
            <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">$</div>
                <Input
                    type="number"
                    placeholder="0"
                    className="pl-12 h-20 text-4xl font-black text-center border-4 border-slate-100 rounded-[2rem] focus:border-emerald-500 transition-all shadow-inner"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                />
            </div>
        </div>

        <Button onClick={handleAbrirCaja} disabled={loading} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-[1.5rem] shadow-xl shadow-emerald-100 transition-all active:scale-95">
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "EMPEZAR JORNADA"}
        </Button>
      </div>
    </Card>
  )
}