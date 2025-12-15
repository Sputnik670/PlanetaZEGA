"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Target, ClipboardList, Calendar, Loader2, ShoppingCart } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
import CajaVentas from "@/components/caja-ventas"

interface VistaEmpleadoProps {
  onBack: () => void
}

export default function VistaEmpleado({ onBack }: VistaEmpleadoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "caja">("tasks")
  const [selectedTask, setSelectedTask] = useState<"expiration" | "data" | null>(null)
  const [loading, setLoading] = useState(true)

  // --- FECHA DINÁMICA ---
  const [fechaHoy, setFechaHoy] = useState("")

  useEffect(() => {
    const hoy = new Date()
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
    setFechaHoy(hoy.toLocaleDateString('es-AR', opciones))
    
    // Al cargar la pantalla, traemos los datos de Supabase
    fetchDatos()
  }, [])

  // --- ESTADO DE DATOS (AHORA REALES) ---
  const [productosVencimiento, setProductosVencimiento] = useState<any[]>([])
  const [productosSinFecha, setProductosSinFecha] = useState<any[]>([])
  const [newDate, setNewDate] = useState<Record<number, string>>({})

  // --- FUNCIÓN PARA TRAER DATOS DE SUPABASE ---
  const fetchDatos = async () => {
    setLoading(true)
    try {
      // 1. Buscar productos CON fecha de vencimiento (para auditar)
      const { data: dataVencimientos, error: errorV } = await supabase
        .from('stock')
        .select('*, productos(*)') 
        .not('fecha_vencimiento', 'is', null)
        .eq('estado', 'pendiente')
        .lte('fecha_vencimiento', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

      if (errorV) console.error("Error vencimientos:", errorV)
      else setProductosVencimiento(dataVencimientos || [])

      // 2. Buscar productos SIN fecha (para completar)
      const { data: dataSinFecha, error: errorS } = await supabase
        .from('stock')
        .select('*, productos(*)')
        .is('fecha_vencimiento', null)
      
      if (errorS) console.error("Error sin fecha:", errorS)
      else setProductosSinFecha(dataSinFecha || [])

    } catch (error) {
      console.error("Error general:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- LÓGICA DE BOTONES (ACCIONES REALES) ---

  const handleCheckExpiration = async (stockId: number, isGood: boolean) => {
    // 1. Feedback Visual Inmediato
    setProductosVencimiento((prev) => prev.filter((p) => p.id !== stockId))

    // 2. Actualizar en Supabase
    const nuevoEstado = isGood ? 'verificado' : 'mermado'
    const { error } = await supabase
      .from('stock')
      .update({ estado: nuevoEstado })
      .eq('id', stockId)

    if (error) {
      console.error("Error al actualizar:", error)
    } else {
      console.log(`Stock ${stockId} actualizado a: ${nuevoEstado}`)
    }
  }

  const handleAddDate = async (stockId: number) => {
    if (newDate[stockId]) {
      const fechaIngresada = newDate[stockId]

      // 1. Feedback Visual
      setProductosSinFecha((prev) => prev.filter((p) => p.id !== stockId))
      
      // 2. Actualizar en Supabase
      const { error } = await supabase
        .from('stock')
        .update({ fecha_vencimiento: fechaIngresada })
        .eq('id', stockId)

      if (error) {
        console.error("Error al guardar fecha:", error)
      } else {
        console.log(`Stock ${stockId} fecha guardada: ${fechaIngresada}`)
        const { [stockId]: _, ...rest } = newDate
        setNewDate(rest)
      }
    }
  }

  const formatDateToDDMMYYYY = (dateString: string) => {
    if (!dateString) return ""
    const [year, month, day] = dateString.split("-")
    return `${day}/${month}/${year}`
  }

  // --- RENDERIZADO ---

  if (selectedTask === "expiration") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gradient-to-br from-accent via-accent to-chart-2 text-accent-foreground p-6 rounded-b-3xl shadow-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTask(null)}
            className="mb-4 hover:bg-accent-foreground/20 text-accent-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold mb-2">🎯 Caza-Vencimientos</h1>
          <p className="text-accent-foreground/80">Revisa estos productos en la góndola</p>
        </div>

        <div className="p-4 space-y-4">
          {productosVencimiento.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
                <p>¡Todo limpio! No hay más vencimientos críticos por hoy. 🎉</p>
            </div>
          ) : (
            productosVencimiento.map((item) => (
            <Card key={item.id} className="p-6 bg-gradient-to-br from-card to-muted/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">{item.productos?.emoji || '📦'}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground text-pretty">{item.productos?.nombre || 'Producto Desconocido'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vence: {item.fecha_vencimiento ? formatDateToDDMMYYYY(item.fecha_vencimiento) : 'Sin fecha'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleCheckExpiration(item.id, true)}
                  className="h-16 bg-chart-4 hover:bg-chart-4/90 text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
                  size="lg"
                >
                  <Check className="mr-2 h-6 w-6" />
                  Sirve
                </Button>
                <Button
                  onClick={() => handleCheckExpiration(item.id, false)}
                  variant="destructive"
                  className="h-16 font-bold text-lg shadow-lg active:scale-95 transition-transform"
                  size="lg"
                >
                  <X className="mr-2 h-6 w-6" />
                  Tirar
                </Button>
              </div>
            </Card>
          )))}
        </div>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    )
  }

  if (selectedTask === "data") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gradient-to-br from-chart-1 via-chart-1 to-chart-2 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTask(null)}
            className="mb-4 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold mb-2">📝 Completar Datos</h1>
          <p className="text-primary-foreground/80">Productos nuevos sin fecha</p>
        </div>

        <div className="p-4 space-y-4">
        {productosSinFecha.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
                <p>¡Excelente! Todos los productos tienen fecha. ✅</p>
            </div>
          ) : (
          productosSinFecha.map((item) => (
            <Card key={item.id} className="p-6 bg-gradient-to-br from-card to-muted/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">{item.productos?.emoji || '📦'}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground text-pretty">{item.productos?.nombre || 'Producto'}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {newDate[item.id]
                      ? `Ingresado: ${formatDateToDDMMYYYY(newDate[item.id])}`
                      : "Esperando fecha..."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={newDate[item.id] || ""}
                    onChange={(e) => setNewDate((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="h-14 pl-12 text-lg font-semibold"
                  />
                </div>
                <Button
                  onClick={() => handleAddDate(item.id)}
                  disabled={!newDate[item.id]}
                  className="w-full h-14 text-lg font-bold shadow-md active:scale-95 transition-transform"
                  size="lg"
                >
                  <Check className="mr-2 h-6 w-6" />
                  Guardar Fecha
                </Button>
              </div>
            </Card>
          )))}
        </div>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    )
  }

  // Pantalla Principal (Dashboard Empleado)
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-accent via-accent to-chart-2 text-accent-foreground p-6 rounded-b-3xl shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mb-4 hover:bg-accent-foreground/20 text-accent-foreground"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold mb-2">Hola, Equipo 👋</h1>
        <p className="text-accent-foreground/80">Tus misiones del día</p>
        
        <div className="mt-4 bg-accent-foreground/20 rounded-full h-3 overflow-hidden">
          <div className="bg-chart-4 h-full rounded-full transition-all duration-1000 w-[30%]" />
        </div>
        <p className="text-sm text-accent-foreground/90 mt-2">Nivel 5 - Aprendiz Ágil</p>
      </div>

      <div className="p-4 space-y-4">
        
        {/* VISTA TAREAS (Se muestra solo si NO es modo caja) */}
        {activeTab === "tasks" && (
          loading ? (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                Tareas de Hoy {fechaHoy}
              </h2>

              <div className="space-y-3">
                <Card
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary bg-gradient-to-br from-card to-primary/5 active:scale-98"
                  onClick={() => setSelectedTask("expiration")}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-destructive/80 to-destructive flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Target className="h-7 w-7 text-destructive-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground">🎯 Caza-Vencimientos</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {productosVencimiento.length > 0 
                            ? `${productosVencimiento.length} productos en riesgo` 
                            : "¡Zona segura!"}
                      </p>
                    </div>
                    {productosVencimiento.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-destructive text-destructive-foreground font-bold flex items-center justify-center text-sm animate-pulse">
                        {productosVencimiento.length}
                      </div>
                    </div>
                    )}
                  </div>
                </Card>

                <Card
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary bg-gradient-to-br from-card to-chart-1/5 active:scale-98"
                  onClick={() => setSelectedTask("data")}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Calendar className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground">📝 Completar Datos</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {productosSinFecha.length > 0 
                            ? `${productosSinFecha.length} productos sin fecha` 
                            : "¡Al día!"}
                      </p>
                    </div>
                    {productosSinFecha.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-chart-1 text-primary-foreground font-bold flex items-center justify-center text-sm">
                        {productosSinFecha.length}
                      </div>
                    </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )
        )}

        {/* VISTA CAJA (NUEVO) */}
        {activeTab === "caja" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-emerald-600" />
              Modo Caja
            </h2>
            <CajaVentas />
          </div>
        )}

      </div>
      
      {/* Navbar actualizado (sin casting) */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}