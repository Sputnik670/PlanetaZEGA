"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Target, ClipboardList, Calendar } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"

interface VistaEmpleadoProps {
  onBack: () => void
}

export default function VistaEmpleado({ onBack }: VistaEmpleadoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks">("tasks")
  const [selectedTask, setSelectedTask] = useState<"expiration" | "data" | null>(null)

  // --- FECHA DINÁMICA ---
  const [fechaHoy, setFechaHoy] = useState("")

  useEffect(() => {
    // Esto crea la fecha formato 14/12
    const hoy = new Date()
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
    setFechaHoy(hoy.toLocaleDateString('es-AR', opciones))
  }, [])

  // --- ESTADO DE DATOS (Simulando base de datos por ahora) ---
  const [productosVencimiento, setProductosVencimiento] = useState([
    { id: 1, nombre: "Leche Entera", imagen: "🥛" },
    { id: 2, nombre: "Yogur Frutilla", imagen: "🍓" },
    { id: 3, nombre: "Pan Lactal", imagen: "🍞" },
  ])

  const [productosSinFecha, setProductosSinFecha] = useState([
    { id: 1, nombre: "Gaseosa Cola 2L", imagen: "🥤" },
    { id: 2, nombre: "Galletitas Chocolate", imagen: "🍪" },
    { id: 3, nombre: "Fideos Moñitos", imagen: "🍝" },
  ])

  const [newDate, setNewDate] = useState<Record<number, string>>({})

  // --- LÓGICA DE BOTONES ---

  const handleCheckExpiration = async (productId: number, isGood: boolean) => {
    // 1. AQUÍ IRÁ TU LLAMADA A SUPABASE LUEGO
    // await supabase.from('auditorias').insert({ producto_id: productId, estado: isGood ? 'ok' : 'vencido' })

    console.log(`Producto ${productId} - Aún sirve: ${isGood} (Enviando a DB...)`)

    // 2. Feedback Visual Inmediato: Sacamos el producto de la lista
    setProductosVencimiento((prev) => prev.filter((p) => p.id !== productId))
  }

  const handleAddDate = (productId: number) => {
    if (newDate[productId]) {
      console.log(`Producto ${productId} - Nueva fecha guardada: ${newDate[productId]}`)
      
      // Feedback Visual: Sacamos el producto de la lista de "Sin Fecha"
      setProductosSinFecha((prev) => prev.filter((p) => p.id !== productId))
      
      // Limpiamos el estado temporal de ese input
      const { [productId]: _, ...rest } = newDate
      setNewDate(rest)
    }
  }

  const formatDateToDDMMYYYY = (dateString: string) => {
    if (!dateString) return ""
    // El input type="date" siempre devuelve YYYY-MM-DD, aquí lo damos vuelta
    const [year, month, day] = dateString.split("-")
    return `${day}/${month}/${year}`
  }

  // Renderizado de Caza-Vencimientos
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
                <p>¡Todo limpio! No hay más vencimientos por revisar hoy. 🎉</p>
            </div>
          ) : (
            productosVencimiento.map((producto) => (
            <Card key={producto.id} className="p-6 bg-gradient-to-br from-card to-muted/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">{producto.imagen}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground text-pretty">{producto.nombre}</h3>
                  <p className="text-sm text-muted-foreground mt-1">¿Está en buen estado?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleCheckExpiration(producto.id, true)}
                  className="h-16 bg-chart-4 hover:bg-chart-4/90 text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
                  size="lg"
                >
                  <Check className="mr-2 h-6 w-6" />
                  Sirve
                </Button>
                <Button
                  onClick={() => handleCheckExpiration(producto.id, false)}
                  variant="destructive"
                  className="h-16 font-bold text-lg shadow-lg active:scale-95 transition-transform"
                  size="lg"
                >
                  <X className="mr-2 h-6 w-6" />
                  Vencido
                </Button>
              </div>
            </Card>
          )))}
        </div>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    )
  }

  // Renderizado de Completar Datos
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
          productosSinFecha.map((producto) => (
            <Card key={producto.id} className="p-6 bg-gradient-to-br from-card to-muted/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">{producto.imagen}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground text-pretty">{producto.nombre}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {newDate[producto.id]
                      ? `Ingresado: ${formatDateToDDMMYYYY(newDate[producto.id])}`
                      : "Esperando fecha..."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={newDate[producto.id] || ""}
                    onChange={(e) => setNewDate((prev) => ({ ...prev, [producto.id]: e.target.value }))}
                    className="h-14 pl-12 text-lg font-semibold"
                    // NOTA: El placeholder en input type="date" no se ve en todos los navegadores,
                    // pero el formato visual dependerá del idioma del teléfono del usuario (DD/MM/AAAA en español)
                  />
                </div>
                <Button
                  onClick={() => handleAddDate(producto.id)}
                  disabled={!newDate[producto.id]}
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
        
        {/* Barra de progreso dinámica basada en las listas */}
        <div className="mt-4 bg-accent-foreground/20 rounded-full h-3 overflow-hidden">
          <div className="bg-chart-4 h-full rounded-full transition-all duration-1000" style={{ width: "30%" }} />
        </div>
        <p className="text-sm text-accent-foreground/90 mt-2">Avance del día</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {/* AQUÍ ESTÁ LA FECHA DINÁMICA */}
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
                        ? `${productosVencimiento.length} productos para revisar` 
                        : "¡Todo completado!"}
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
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
