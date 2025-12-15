"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase" // Importamos la conexión real
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, Loader2 } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import CrearProducto from "@/components/crear-producto"
import AgregarStock from "@/components/agregar-stock"

interface DashboardDuenoProps {
  onBack: () => void
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog">("alerts")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // --- ESTADOS DE DATOS REALES ---
  const [productos, setProductos] = useState<any[]>([])
  // Estado para controlar el modal de agregar stock
  const [selectedProductForStock, setSelectedProductForStock] = useState<{id: number, nombre: string} | null>(null)

  // --- CARGAR DATOS DE SUPABASE ---
  const fetchProductos = async () => {
    setLoading(true)
    // Traemos productos de la base de datos real
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })
    
    if (error) console.error("Error productos:", error)
    else setProductos(data || [])
    
    setLoading(false)
  }

  // Cargar datos automáticamente cuando entramos a la pestaña de inventario
  useEffect(() => {
    if (activeTab === "inventory") {
      fetchProductos()
    }
  }, [activeTab])


  // --- DATOS HARDCODEADOS (Solo quedaron los gráficos y alertas financieras por ahora) ---
  // El inventario ya no es hardcodeado, ahora viene de 'productos'
  const preciosTendencia = [
    { mes: "Sep", precio: 1045 }, { mes: "Oct", precio: 1100 }, { mes: "Nov", precio: 1150 }, { mes: "Dic", precio: 1200 },
  ]
  const tareasEmpleado = [
    { id: 1, tarea: "Caza-Vencimientos", cantidad: 3, tipo: "urgente" },
    { id: 2, tarea: "Completar Datos", cantidad: 3, tipo: "normal" },
  ]

  // Filtramos la lista REAL de productos
  const inventarioFiltrado = productos.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* MODAL DE AGREGAR STOCK (Se muestra si hay un producto seleccionado) */}
      {selectedProductForStock && (
        <AgregarStock 
          productoId={selectedProductForStock.id}
          nombreProducto={selectedProductForStock.nombre}
          onClose={() => setSelectedProductForStock(null)}
          onSaved={() => {
            fetchProductos() // Recargamos la lista para ver cambios si hiciera falta
            alert("¡Stock cargado! El empleado lo verá en su dashboard.")
          }}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-4 hover:bg-primary-foreground/20 text-primary-foreground">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold mb-2">Dashboard del Dueño</h1>
        <p className="text-primary-foreground/80">
          {activeTab === "alerts" && "Resumen del mes"}
          {activeTab === "inventory" && "Gestión de Productos"}
          {activeTab === "tasks" && "Progreso del equipo"}
          {activeTab === "catalog" && "Gestión del Catálogo"}
        </p>

        {/* Botones de Navegación Rápida */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          <Button 
            onClick={() => setActiveTab("catalog")} 
            variant={activeTab === "catalog" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
          <Button 
            onClick={() => setActiveTab("inventory")} 
            variant={activeTab === "inventory" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <Package className="mr-2 h-4 w-4" /> Inventario
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* PESTAÑA: CATÁLOGO (Nuevo Producto) */}
        {activeTab === "catalog" && (
          <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CrearProducto onProductCreated={() => setActiveTab("inventory")} />
          </div>
        )}

        {/* PESTAÑA: INVENTARIO (Ahora Real) */}
        {activeTab === "inventory" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar productos reales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 text-base"
              />
            </div>

            {loading ? (
               <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
            ) : (
              <div className="space-y-2">
                {inventarioFiltrado.map((item) => (
                  <Card key={item.id} className="p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.emoji || '📦'}</span>
                        <div>
                          <h3 className="font-bold text-foreground text-pretty leading-tight">{item.nombre}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.categoria}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedProductForStock({ id: item.id, nombre: item.nombre })}
                      className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Stock
                    </Button>
                  </Card>
                ))}
                
                {inventarioFiltrado.length === 0 && (
                  <Card className="p-8 text-center border-dashed">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">No hay productos aún.</p>
                    <Button variant="link" onClick={() => setActiveTab("catalog")}>¡Crea el primero!</Button>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* PESTAÑA: ALERTAS (Estáticas por ahora) */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
             <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
                <h3 className="font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Demo Mode
                </h3>
                <p className="text-sm text-muted-foreground">Las alertas financieras se conectarán cuando tengamos más datos históricos.</p>
             </Card>

             <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-1" /> Tendencias
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={preciosTendencia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="precio" stroke="hsl(var(--chart-1))" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* PESTAÑA: TAREAS (Estáticas por ahora) */}
        {activeTab === "tasks" && (
            <div className="space-y-3">
            {tareasEmpleado.map((tarea) => (
                <Card key={tarea.id} className="p-4">
                <h3 className="font-bold">{tarea.tarea}</h3>
                <p className="text-sm text-muted-foreground">{tarea.cantidad} pendientes</p>
                </Card>
            ))}
            </div>
        )}
      </div>

      <BottomNav 
        active={activeTab === "catalog" ? "inventory" : activeTab} 
        onChange={(val) => setActiveTab(val as any)} 
      />
    </div>
  )
}