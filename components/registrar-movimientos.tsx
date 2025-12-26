"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Receipt, ArrowDownCircle, History, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface RegistrarMovimientoProps {
  cajaId: string
  onMovimientoRegistrado: () => void
}

export default function RegistrarMovimiento({ cajaId, onMovimientoRegistrado }: RegistrarMovimientoProps) {
  const [loading, setLoading] = useState(false)
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoria, setCategoria] = useState("proveedores")
  const [historial, setHistorial] = useState<any[]>([])

  // Cargar movimientos del turno actual para dar visibilidad al empleado
  const fetchMovimientos = async () => {
    const { data } = await supabase
      .from('movimientos_caja')
      .select('*')
      .eq('caja_diaria_id', cajaId)
      .order('created_at', { ascending: false })
    
    if (data) setHistorial(data)
  }

  useEffect(() => {
    fetchMovimientos()
  }, [cajaId])

  const handleGuardarGasto = async () => {
    const valorMonto = parseFloat(monto)
    if (isNaN(valorMonto) || valorMonto <= 0) return toast.error("Ingresa un monto válido")
    if (!descripcion.trim()) return toast.error("Agregá una descripción (ej: Pago a repartidor de pan)")

    setLoading(true)
    try {
      const { error } = await supabase
        .from('movimientos_caja')
        .insert({
          caja_diaria_id: cajaId,
          monto: valorMonto,
          tipo: 'egreso', // Siempre egreso en este formulario de gastos
          descripcion: descripcion.trim(),
          categoria: categoria
        })

      if (error) throw error

      toast.success("Gasto registrado y restado de caja")
      setMonto("")
      setDescripcion("")
      fetchMovimientos()
      onMovimientoRegistrado() // Avisamos al componente padre para que actualice totales si es necesario
    } catch (error: any) {
      toast.error("Error al registrar movimiento")
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)

  return (
    <div className="space-y-4">
      <Card className="p-5 border-2 border-amber-100 bg-white shadow-lg rounded-2xl">
        <div className="flex items-center gap-2 mb-4 text-amber-700">
          <ArrowDownCircle className="h-5 w-5" />
          <h2 className="font-black uppercase tracking-tighter">Registrar Salida de Dinero</h2>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Monto (ARS)</Label>
              <Input
                type="number"
                placeholder="$ 0.00"
                className="h-12 font-bold text-lg"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-12 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proveedores">Proveedores</SelectItem>
                  <SelectItem value="art_limpieza">Art. Limpieza</SelectItem>
                  <SelectItem value="servicios">Servicios / Boletas</SelectItem>
                  <SelectItem value="retiro_dueno">Retiro de Dueño</SelectItem>
                  <SelectItem value="viaticos">Viáticos / Varios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Descripción del gasto</Label>
            <Input
              placeholder="Ej: Repartidor de Coca-Cola"
              className="h-12"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleGuardarGasto} 
            disabled={loading}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : "REGISTRAR GASTO"}
          </Button>
        </div>
      </Card>

      {/* Mini Historial para que el empleado no cargue dos veces lo mismo */}
      {historial.length > 0 && (
        <Card className="p-4 bg-slate-50 border-dashed border-2 border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase">
            <History className="h-3 w-3" /> Gastos del turno
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {historial.map((m) => (
              <div key={m.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-none">{m.descripcion}</p>
                  <p className="text-[9px] text-slate-400 uppercase">{m.categoria} • {format(new Date(m.created_at), 'HH:mm')}</p>
                </div>
                <span className="text-red-600 font-bold text-sm">-{formatMoney(m.monto)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}