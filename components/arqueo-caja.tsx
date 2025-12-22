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
  isBottom?: boolean 
}

export interface CajaDiaria {
    id: string
    monto_inicial: number
    fecha_apertura: string
    empleado_id: string
    monto_final: number | null; 
    organization_id?: string
}

export default function ArqueoCaja({ onCajaAbierta, onCajaCerrada, turnoActivo }: ArqueoCajaProps) {
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [montoFinal, setMontoFinal] = useState<string>("")
  const [loading, setLoading] = useState(false)
  
  const [caja, setCaja] = useState<CajaDiaria | null>(turnoActivo)

  const generarMisiones = async (cajaId: string, empleadoId: string, orgId: string) => {
    try {
      const hoy = new Date()
      const fechaLimite = format(addDays(hoy, 7), 'yyyy-MM-dd')

      // 1. Stock en Riesgo (Lógica Ledger)
      const { data: stockCritico } = await supabase
        .from('stock')
        .select('id, producto_id, fecha_vencimiento, cantidad') // ✅ TRAEMOS CANTIDAD
        .eq('tipo_movimiento', 'entrada') // Solo entradas
        .lt('fecha_vencimiento', fechaLimite)
      
      let totalUnidadesRiesgo = 0
      stockCritico?.forEach(item => {
        totalUnidadesRiesgo += (item.cantidad || 1) // ✅ SUMA REAL
      })

      const misionesABulkInsert = []
      
      if (totalUnidadesRiesgo > 0) {
        misionesABulkInsert.push({
          organization_id: orgId,
          empleado_id: empleadoId,
          caja_diaria_id: cajaId,
          tipo: 'vencimiento',
          descripcion: `Gestionar ${totalUnidadesRiesgo} productos con vencimiento próximo.`,
          objetivo_unidades: totalUnidadesRiesgo,
          unidades_completadas: 0,
          es_completada: false,
          puntos: Math.min(10 + Math.floor(totalUnidadesRiesgo / 2) * 5, 100), 
        })
      }
      
      misionesABulkInsert.push({
        organization_id: orgId,
        empleado_id: empleadoId,
        caja_diaria_id: cajaId,
        tipo: 'arqueo_cierre',
        descripcion: 'Realizar el cierre de caja con un desvío menor a $100.',
        objetivo_unidades: 1,
        unidades_completadas: 0,
        es_completada: false,
        puntos: 20, 
      })

      const { data: plantillas } = await supabase
          .from('plantillas_misiones')
          .select('*')
          .eq('activa', true)
          .eq('organization_id', orgId)

      if (plantillas && plantillas.length > 0) {
          plantillas.forEach(plantilla => {
              misionesABulkInsert.push({
                  organization_id: orgId,
                  empleado_id: empleadoId,
                  caja_diaria_id: cajaId,
                  tipo: 'manual', 
                  descripcion: plantilla.descripcion,
                  objetivo_unidades: 1,
                  unidades_completadas: 0,
                  es_completada: false,
                  puntos: plantilla.puntos
              })
          })
          toast.info(`📋 Se cargaron ${plantillas.length} rutinas diarias.`)
      }

      if (misionesABulkInsert.length > 0) {
        const { error: insertError } = await supabase.from('misiones').insert(misionesABulkInsert)
        if (insertError) throw insertError
        
        if (totalUnidadesRiesgo > 0) {
            toast.warning("⚠️ Misión de Riesgo Activada", { description: `Se detectaron ${totalUnidadesRiesgo} unidades por vencer.` })
        }
      }

    } catch (error: any) {
      console.error("Error generando misiones:", error)
    }
  }

  // --- Apertura ---
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) {
      toast.error("Monto Inválido", { description: "Ingresa el efectivo inicial." })
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
      toast.success("Turno Iniciado", { description: "Tareas asignadas." })

    } catch (error: any) {
      toast.error("Error al abrir caja", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  // --- Cierre ---
  const handleCerrarCaja = async () => {
    if (!caja) return
    const montoDeclarado = parseFloat(montoFinal)
    
    if (isNaN(montoDeclarado) || montoDeclarado < 0) {
      toast.error("Monto Inválido", { description: "Ingresa el efectivo final." })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado.")

      // 1. VENTAS (Arreglo Crítico: Sumar Precio * Cantidad)
      const { data: ventasData, error: ventasError } = await supabase
        .from('stock')
        .select('cantidad, productos(precio_venta)') 
        .eq('caja_diaria_id', caja.id)
        .eq('metodo_pago', 'efectivo') 
        .eq('tipo_movimiento', 'salida') // ✅ Solo ventas (salidas)

      if (ventasError) throw ventasError

      const totalVentasEfectivo = ventasData?.reduce((sum, item: any) => {
          const precio = item.productos?.precio_venta || 0
          const cant = item.cantidad || 1 // ✅ Multiplicador clave
          return sum + (precio * cant)
      }, 0) || 0

      // 2. GASTOS
      const { data: gastosData, error: gastosError } = await supabase
        .from('movimientos_caja')
        .select('monto')
        .eq('caja_diaria_id', caja.id)
        .eq('tipo', 'egreso')
      
      if (gastosError) throw gastosError

      const totalGastos = gastosData?.reduce((sum, item) => sum + item.monto, 0) || 0

      // 3. CALCULO
      const dineroEsperado = (caja.monto_inicial + totalVentasEfectivo) - totalGastos
      const desvio = Math.abs(montoDeclarado - dineroEsperado)
      const exitoArqueo = desvio <= 100 

      // 4. ACTUALIZAR CAJA
      const { error } = await supabase
        .from('caja_diaria')
        .update({ 
          monto_final: montoDeclarado, 
          fecha_cierre: new Date().toISOString() 
        })
        .eq('id', caja.id)
      
      if (error) throw error

      await supabase
          .from('misiones')
          .update({
              es_completada: exitoArqueo,
              unidades_completadas: 1,
          })
          .eq('caja_diaria_id', caja.id)
          .eq('tipo', 'arqueo_cierre')

      if (exitoArqueo) {
          const { data: perfil } = await supabase
            .from('perfiles').select('xp').eq('id', caja.empleado_id).single()
          
          if (perfil) {
              await supabase.from('perfiles').update({ xp: perfil.xp + 20 }).eq('id', caja.empleado_id)
          }
          triggerConfetti()
          toast.success("🏆 Cierre Perfecto", { description: "¡Ganaste +20 XP por precisión!" })
      } else {
          const mensajeDesvio = montoDeclarado > dineroEsperado 
            ? `Sobran $${new Intl.NumberFormat('es-AR').format(desvio)}` 
            : `Faltan $${new Intl.NumberFormat('es-AR').format(desvio)}`
            
          toast.warning("Turno Cerrado con Desvío", { 
            description: `Esperado: $${new Intl.NumberFormat('es-AR').format(dineroEsperado)}. ${mensajeDesvio}` 
          })
      }

      setCaja(null)
      onCajaCerrada()
      
    } catch (error: any) {
      console.error(error)
      toast.error("Error al cerrar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)

  if (caja) {
    return (
      <Card className="p-6 border-4 border-red-100 bg-gradient-to-b from-white to-red-50 shadow-inner animate-in fade-in zoom-in-95 duration-300">
        <h2 className="text-xl font-black text-red-600 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Lock className="h-6 w-6" /> Finalizar Turno
        </h2>
        
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground flex justify-between bg-white/50 p-3 rounded-md border border-red-100">
                <span>Inicio: {format(new Date(caja.fecha_apertura), 'HH:mm')}</span>
                <span className="font-bold text-foreground">Base: {formatMoney(caja.monto_inicial)}</span>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-red-800">Efectivo Final en Caja</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
                    <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-10 h-14 text-2xl font-bold bg-white border-red-200 focus-visible:ring-red-500 shadow-sm"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            
            <Button 
                onClick={handleCerrarCaja} 
                disabled={loading}
                className="w-full h-16 text-xl bg-red-600 hover:bg-red-700 font-black shadow-lg mt-2 transition-transform active:scale-[0.98]"
            >
                {loading ? <Loader2 className="animate-spin mr-2" /> : "🔒 CERRAR CAJA AHORA"}
            </Button>
            <p className="text-[10px] text-center text-red-400 font-medium">
                Esta acción finaliza tu día y calcula tu puntaje.
            </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/50">
      <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-700 mb-4">
        <Unlock className="h-5 w-5" /> Apertura de Caja
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