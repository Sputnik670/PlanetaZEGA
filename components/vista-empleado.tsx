// components/vista-empleado.tsx
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Target, ClipboardList, Calendar, Loader2, ShoppingCart, RefreshCcw } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
import CajaVentas from "@/components/caja-ventas"
import { toast } from "sonner" 
import { ArqueoCaja, CajaSession } from "@/components/arqueo-caja" // <--- 🚨 NUEVO IMPORTE

interface VistaEmpleadoProps {
  onBack: () => void
}

export default function VistaEmpleado({ onBack }: VistaEmpleadoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "caja">("tasks")
  const [selectedTask, setSelectedTask] = useState<"expiration" | "data" | null>(null)
  const [loading, setLoading] = useState(true)
  const [cajaAbierta, setCajaAbierta] = useState<CajaSession | null>(null) // <--- 🚨 NUEVO ESTADO DE CAJA

  // --- FECHA DINÁMICA ---
  const [fechaHoy, setFechaHoy] = useState("")

  // --- ESTADO DE DATOS DE TAREAS ---
  const [productosVencimiento, setProductosVencimiento] = useState<any[]>([])
  const [productosSinFecha, setProductosSinFecha] = useState<any[]>([])
  const [newDate, setNewDate] = useState<Record<string, string>>({})
  const [unidadesEnRiesgo, setUnidadesEnRiesgo] = useState(0)
  const [unidadesSinFecha, setUnidadesSinFecha] = useState(0)


  useEffect(() => {
    const hoy = new Date()
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
    setFechaHoy(hoy.toLocaleDateString('es-AR', opciones))
    
    // Al cargar la pantalla, traemos los datos
    fetchDatos()
    fetchCajaStatus() // <--- 🚨 NUEVO: Llamamos a obtener el estado de la caja
  }, [])

  // --- FUNCIÓN PARA VERIFICAR EL ESTADO DE LA CAJA ---
  const fetchCajaStatus = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setCajaAbierta(null)
            return // No hay usuario, no puede haber caja abierta
        }

        // Buscamos la última caja abierta por el usuario que no haya sido cerrada
        const { data, error } = await supabase
            .from('caja_diaria')
            .select('*')
            .eq('empleado_id', user.id)
            .is('fecha_cierre', null) // La caja está abierta si fecha_cierre es NULL
            .order('fecha_apertura', { ascending: false })
            .limit(1)
            .single()
        
        if (error && error.code !== 'PGRST116') { // PGRST116 es "no row found" (no hay caja abierta)
            throw error
        }

        if (data) {
            setCajaAbierta(data as CajaSession)
        } else {
            setCajaAbierta(null)
        }

    } catch (error) {
        console.error("Error al obtener estado de caja:", error)
        // No mostramos toast de error para no interrumpir el flujo si es un error esperado (no row found)
    }
  }


  // --- FUNCIÓN PARA TRAER DATOS DE TAREAS ---
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
      else {
          setProductosVencimiento(dataVencimientos || [])
          setUnidadesEnRiesgo(dataVencimientos?.length || 0)
      }

      // 2. Buscar productos SIN fecha (para completar)
      const { data: dataSinFecha, error: errorS } = await supabase
        .from('stock')
        .select('*, productos(*)')
        .is('fecha_vencimiento', null)
        .eq('estado', 'pendiente')
      
      if (errorS) console.error("Error sin fecha:", errorS)
      else {
          setProductosSinFecha(dataSinFecha || [])
          setUnidadesSinFecha(dataSinFecha?.length || 0)
      }

    } catch (error) {
      console.error("Error general:", error)
      toast.error("Error de conexión", { description: "No se pudieron cargar las tareas desde Supabase." })
    } finally {
      setLoading(false)
    }
  }

  // --- LÓGICA DE BOTONES (ACCIONES REALES) ---
  const handleCheckExpiration = async (stockId: string, isGood: boolean) => {
    setProductosVencimiento((prev) => prev.filter((p) => p.id !== stockId))
    setUnidadesEnRiesgo((prev) => prev - 1) 
    
    const nuevoEstado = isGood ? 'verificado' : 'mermado'
    const { error } = await supabase
      .from('stock')
      .update({ estado: nuevoEstado, fecha_auditoria: new Date().toISOString() }) 
      .eq('id', stockId)

    if (error) {
      console.error("Error al actualizar:", error)
      toast.error("Error al registrar tarea.", { description: "Hubo un problema con la base de datos." })
    } else {
      toast.success(`Ítem ${isGood ? 'Aprobado' : 'Mermado'}`, { 
        description: `El producto fue marcado como '${nuevoEstado}'.` 
      })
    }
  }

  const handleAddDate = async (stockId: string) => {
    if (newDate[stockId]) {
      const fechaIngresada = newDate[stockId]

      setProductosSinFecha((prev) => prev.filter((p) => p.id !== stockId))
      setUnidadesSinFecha((prev) => prev - 1) 
      
      const { error } = await supabase
        .from('stock')
        .update({ fecha_vencimiento: fechaIngresada })
        .eq('id', stockId)

      if (error) {
        console.error("Error al guardar fecha:", error)
        toast.error("Error al guardar la fecha.", { description: "Hubo un problema con la base de datos." })
      } else {
        toast.success("Fecha Guardada", { description: `Fecha de vencimiento registrada para el producto.` })
        const { [stockId]: _, ...rest } = newDate
        setNewDate(rest)
      }
    }
  }

  const formatDateToDDMMYYYY = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
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
          <p className="text-accent-foreground/80">
            Revisa {unidadesEnRiesgo} unidad{unidadesEnRiesgo !== 1 ? 'es' : ''} en la góndola
          </p>
        </div>

        <div className="p-4 space-y-4">
          {unidadesEnRiesgo === 0 ? ( 
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
                  Tirar (Merma)
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
          <p className="text-primary-foreground/80">
            {unidadesSinFecha} unidad{unidadesSinFecha !== 1 ? 'es' : ''} sin fecha de vencimiento
          </p>
        </div>

        <div className="p-4 space-y-4">
        {unidadesSinFecha === 0 ? ( 
            <div className="text-center p-10 text-muted-foreground">
                <p>¡Excelente! Todos los productos tienen fecha. ✅</p>
            </div>
          ) : (
          productosSinFecha.map((item) => (
            <Card key={item.id} className="p-6 bg-gradient-to-br from-card to-chart-1/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">{item.productos?.emoji || '📦'}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground text-pretty">{item.productos?.nombre || 'Producto'}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    ID Lote: ...{item.id.toString().slice(-4)}
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
        {/* 🚨 NUEVO: Botón de Refresh y ajuste de layout */}
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold mb-2">Hola, Equipo 👋</h1>
                <p className="text-accent-foreground/80">Tus misiones del día</p>
            </div>
            <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { fetchDatos(); fetchCajaStatus(); toast.info("Datos y estado de caja actualizados.") }}
                className="text-accent-foreground hover:bg-accent-foreground/20"
                disabled={loading}
            >
                <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
        
        <div className="mt-4 bg-accent-foreground/20 rounded-full h-3 overflow-hidden">
          <div className="bg-chart-4 h-full rounded-full transition-all duration-1000 w-[30%]" />
        </div>
        <p className="text-sm text-accent-foreground/90 mt-2">Nivel 5 - Aprendiz Ágil</p>
      </div>

      <div className="p-4 space-y-4">
        
        {/* VISTA TAREAS (Sin cambios de lógica de contenido) */}
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
                        {unidadesEnRiesgo > 0 
                            ? `${unidadesEnRiesgo} unidad${unidadesEnRiesgo !== 1 ? 'es' : ''} en riesgo` 
                            : "¡Zona segura!"}
                      </p>
                    </div>
                    {unidadesEnRiesgo > 0 && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-destructive text-destructive-foreground font-bold flex items-center justify-center text-sm animate-pulse">
                        {unidadesEnRiesgo} 
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
                        {unidadesSinFecha > 0 
                            ? `${unidadesSinFecha} unidad${unidadesSinFecha !== 1 ? 'es' : ''} sin fecha` 
                            : "¡Al día!"}
                      </p>
                    </div>
                    {unidadesSinFecha > 0 && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-chart-1 text-primary-foreground font-bold flex items-center justify-center text-sm">
                        {unidadesSinFecha} 
                      </div>
                    </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )
        )}

        {/* 🚨 VISTA CAJA (Modo Caja con control de arqueo) */}
        {activeTab === "caja" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ShoppingCart className={`h-6 w-6 ${cajaAbierta ? 'text-emerald-600' : 'text-gray-500'}`} />
              Modo Caja
              {/* Indicador de caja abierta */}
              {cajaAbierta && <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">ABIERTA</span>}
            </h2>
            
            {/* Si no hay caja abierta, muestra el componente de Arqueo para abrir */}
            {!cajaAbierta ? (
                <ArqueoCaja session={null} onCajaUpdate={() => fetchCajaStatus()} />
            ) : (
                <div className="space-y-4">
                    <CajaVentas />
                    {/* Si la caja está abierta, muestra el ArqueoCaja en modo 'Cerrar' */}
                    <ArqueoCaja session={cajaAbierta} onCajaUpdate={() => fetchCajaStatus()} />
                </div>
            )}
            
          </div>
        )}

      </div>
      
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}