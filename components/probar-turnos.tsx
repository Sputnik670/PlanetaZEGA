"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Play, CheckCircle, XCircle, DollarSign, Clock } from "lucide-react"
import { toast } from "sonner"

/**
 * Componente de prueba para abrir y cerrar turnos
 * Útil para testing desde móvil sin necesidad de consola
 */
export default function ProbarTurnos() {
  const [loading, setLoading] = useState(false)
  const [montoInicial, setMontoInicial] = useState("50000")
  const [montoFinal, setMontoFinal] = useState("75000")
  const [turnoActivo, setTurnoActivo] = useState<any>(null)
  const [resultado, setResultado] = useState<string>("")

  const cargarTurnoActivo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil?.organization_id) return

      const { data: sucursal } = await supabase
        .from('sucursales')
        .select('id')
        .eq('organization_id', perfil.organization_id)
        .limit(1)
        .single()

      if (!sucursal || !sucursal.id) return

      const sucursalId = sucursal.id

      const { data } = await supabase
        .from('caja_diaria')
        .select('*')
        .eq('empleado_id', user.id)
        .eq('sucursal_id', sucursalId)
        .is('fecha_cierre', null)
        .maybeSingle()

      setTurnoActivo(data)
    } catch (error) {
      console.error("Error cargando turno:", error)
    }
  }

  const handleAbrirTurno = async () => {
    const monto = parseFloat(montoInicial)
    if (isNaN(monto) || monto < 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    setLoading(true)
    setResultado("")
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesión activa")

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil?.organization_id) throw new Error("No se encontró la organización")

      const { data: sucursal } = await supabase
        .from('sucursales')
        .select('id')
        .eq('organization_id', perfil.organization_id)
        .limit(1)
        .single()

      if (!sucursal || !sucursal.id) throw new Error("No se encontró sucursal")

      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          organization_id: perfil.organization_id,
          sucursal_id: sucursal.id,
          empleado_id: user.id,
          monto_inicial: monto,
          fecha_apertura: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setTurnoActivo(data)
      setResultado(`✅ Turno abierto exitosamente!\nID: ${data.id}\nMonto inicial: $${monto.toLocaleString()}`)
      toast.success("Turno abierto", { description: `ID: ${data.id}` })
      await cargarTurnoActivo()
    } catch (error: any) {
      const mensaje = error.message || "Error al abrir turno"
      setResultado(`❌ Error: ${mensaje}`)
      toast.error("Error", { description: mensaje })
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarTurno = async () => {
    if (!turnoActivo) {
      toast.error("No hay turno activo para cerrar")
      return
    }

    const monto = parseFloat(montoFinal)
    if (isNaN(monto) || monto < 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    setLoading(true)
    setResultado("")

    try {
      // Calcular ventas en efectivo
      const { data: ventas } = await supabase
        .from('stock')
        .select('cantidad, precio_venta_historico')
        .eq('caja_diaria_id', turnoActivo.id)
        .eq('metodo_pago', 'efectivo')
        .eq('tipo_movimiento', 'salida')

      const totalVentasEfectivo = ventas?.reduce(
        (sum, v) => sum + ((v.precio_venta_historico || 0) * (v.cantidad || 1)), 
        0
      ) || 0

      // Calcular movimientos manuales
      const { data: movimientos } = await supabase
        .from('movimientos_caja')
        .select('monto, tipo')
        .eq('caja_diaria_id', turnoActivo.id)

      const totalIngresos = movimientos?.filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0) || 0
      
      const totalEgresos = movimientos?.filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.monto, 0) || 0

      // Calcular diferencia
      const dineroEsperado = turnoActivo.monto_inicial + totalVentasEfectivo + totalIngresos - totalEgresos
      const diferencia = monto - dineroEsperado

      // Cerrar turno
      const { data, error } = await supabase
        .from('caja_diaria')
        .update({
          monto_final: monto,
          diferencia: diferencia,
          fecha_cierre: new Date().toISOString()
        })
        .eq('id', turnoActivo.id)
        .select()
        .single()

      if (error) throw error

      const mensaje = `✅ Turno cerrado exitosamente!\n\n` +
        `Monto inicial: $${turnoActivo.monto_inicial.toLocaleString()}\n` +
        `Ventas efectivo: $${totalVentasEfectivo.toLocaleString()}\n` +
        `Ingresos: $${totalIngresos.toLocaleString()}\n` +
        `Egresos: $${totalEgresos.toLocaleString()}\n` +
        `Dinero esperado: $${dineroEsperado.toLocaleString()}\n` +
        `Monto final: $${monto.toLocaleString()}\n` +
        `Diferencia: $${diferencia.toLocaleString()}`

      setResultado(mensaje)
      
      if (Math.abs(diferencia) <= 100) {
        toast.success("🏆 Arqueo perfecto!", { description: "Diferencia <= $100" })
      } else {
        toast.warning("Turno cerrado", { description: `Diferencia: $${diferencia.toLocaleString()}` })
      }

      setTurnoActivo(null)
      await cargarTurnoActivo()
    } catch (error: any) {
      const mensaje = error.message || "Error al cerrar turno"
      setResultado(`❌ Error: ${mensaje}`)
      toast.error("Error", { description: mensaje })
    } finally {
      setLoading(false)
    }
  }

  // Cargar turno activo al montar
  useEffect(() => {
    cargarTurnoActivo()
  }, [])

  return (
    <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-black text-slate-800 uppercase">
          🧪 Probar Turnos
        </h3>
      </div>
      
      <p className="text-sm text-slate-600 mb-6">
        Herramienta para probar apertura y cierre de turnos directamente desde la app.
      </p>

      {turnoActivo ? (
        <div className="space-y-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-black text-green-800">Turno Activo</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>ID:</strong> {turnoActivo.id.slice(0, 8)}...</p>
              <p><strong>Monto inicial:</strong> ${turnoActivo.monto_inicial.toLocaleString()}</p>
              <p><strong>Apertura:</strong> {new Date(turnoActivo.fecha_apertura).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">
                Monto Final Contado
              </Label>
              <Input
                type="number"
                value={montoFinal}
                onChange={(e) => setMontoFinal(e.target.value)}
                placeholder="75000"
                className="h-14 text-lg font-bold"
              />
            </div>

            <Button
              onClick={handleCerrarTurno}
              disabled={loading}
              className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-black text-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  Cerrar Turno
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-bold text-slate-700 mb-2 block">
              Monto Inicial
            </Label>
            <Input
              type="number"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              placeholder="50000"
              className="h-14 text-lg font-bold"
            />
          </div>

          <Button
            onClick={handleAbrirTurno}
            disabled={loading}
            className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black text-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Abrir Turno
              </>
            )}
          </Button>
        </div>
      )}

      {resultado && (
        <div className="mt-6 p-4 bg-white rounded-xl border-2 border-slate-200">
          <Label className="text-xs font-bold text-slate-600 mb-2 block">
            Resultado:
          </Label>
          <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap">
            {resultado}
          </pre>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200">
        <Button
          onClick={cargarTurnoActivo}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Clock className="mr-2 h-4 w-4" />
          Actualizar Estado
        </Button>
      </div>
    </Card>
  )
}

