"use client"

import { useState, useEffect } from "react"
// CORRECCIÓN AQUÍ: Eliminamos la importación fallida y usamos el cliente central
import { supabase } from "@/lib/supabase"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, Loader2, ShieldCheck } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import CrearProducto from "@/components/crear-producto"
import { AgregarStock } from "@/components/agregar-stock"

interface DashboardDuenoProps {
  onBack: () => void
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog">("alerts")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // --- ESTADOS DE DATOS REALES ---
  const [productos, setProductos] = useState<any[]>([])

  // --- ESTADOS PARA MÉTRICAS FINANCIERAS ---
  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState(0)
  const [capitalSaludable, setCapitalSaludable] = useState(0)
  const [vencimientosCriticos, setVencimientosCriticos] = useState<any[]>([])

  // CORRECCIÓN AQUÍ: Eliminado 'const supabase = ...' porque ya lo importamos arriba

  // --- CARGAR DATOS Y CALCULAR MÉTRICAS ---
  const fetchData = async () => {
    setLoading(true)
    
    // 1. Traer PRODUCTOS
    const { data: dataProductos } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })
    
    setProductos(dataProductos || [])

    // 2. Traer STOCK PENDIENTE
    const { data: dataStock } = await supabase
      .from('stock')
      .select('*, productos(nombre, precio_venta, emoji)')
      .eq('estado', 'pendiente')

    if (dataStock) {
      calcularMetricas(dataStock)
    }

    setLoading(false)
  }

  const calcularMetricas = (stock: any[]) => {
    let riesgo = 0
    let saludable = 0
    let listaCritica: any[] = []

    const hoy = new Date()
    const fechaLimite = new Date()
    fechaLimite.setDate(hoy.getDate() + 10)

    stock.forEach(item => {
      const precio = item.productos?.precio_venta || 0
      
      if (!item.fecha_vencimiento) {
        saludable += precio
        return
      }

      const fechaVenc = new Date(item.fecha_vencimiento)

      if (fechaVenc <= fechaLimite) {
        riesgo += precio
        listaCritica.push({
          id: item.id,
          nombre: item.productos?.nombre || "Desconocido",
          vencimiento: item.fecha_vencimiento,
          precio: precio,
          emoji: item.productos?.emoji || "📦"
        })
      } else {
        saludable += precio
      }
    })

    setCapitalEnRiesgo(riesgo)
    setCapitalSaludable(saludable)
    setVencimientosCriticos(listaCritica)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
  }

  const inventarioFiltrado = productos.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Gráfico estático
  const preciosTendencia = [
    { mes: "Sep", precio: 1000 }, { mes: "Oct", precio: 1100 }, { mes: "Nov", precio: 1150 }, { mes: "Dic", precio: 1200 },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-4 hover:bg-primary-foreground/20 text-primary-foreground">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold mb-2">Dashboard del Dueño</h1>
        <p className="text-primary-foreground/80">
          {activeTab === "alerts" && "Finanzas y Alertas"}
          {activeTab === "inventory" && "Gestión de Stock"}
          {activeTab === "tasks" && "Equipo"}
          {activeTab === "catalog" && "Catálogo"}
        </p>

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
          <Button 
            onClick={() => setActiveTab("alerts")} 
            variant={activeTab === "alerts" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Métricas
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* PESTAÑA: CATÁLOGO */}
        {activeTab === "catalog" && (
          <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CrearProducto onProductCreated={() => { setActiveTab("inventory"); fetchData(); }} />
          </div>
        )}

        {/* PESTAÑA: INVENTARIO */}
        {activeTab === "inventory" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 text-base"
              />
            </div>

            {loading ? (
               <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
            ) : (
              <div className="space-y-3">
                {inventarioFiltrado.map((item) => (
                  <Card key={item.id} className="p-4 flex flex-col gap-4 shadow-sm">
                    {/* Encabezado de la tarjeta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji || '📦'}</span>
                        <div>
                          <h3 className="font-bold text-foreground text-pretty leading-tight">{item.nombre}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.categoria}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-primary">{formatMoney(item.precio_venta)}</span>
                    </div>

                    {/* Botón de Acción (Ahora integrado) */}
                    <div>
                      <AgregarStock 
                        producto={item} 
                        onStockAdded={fetchData} 
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* PESTAÑA: ALERTAS */}
        {activeTab === "alerts" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            
             <div className="grid grid-cols-2 gap-4">
                {/* TARJETA NARANJA: RIESGO */}
                <Card className="p-4 bg-orange-50 border-l-4 border-l-orange-500 shadow-sm dark:bg-orange-950/20">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">En Riesgo</span>
                        </div>
                        <span className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                            {formatMoney(capitalEnRiesgo)}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">
                            Vence en &lt; 10 días
                        </span>
                    </div>
                </Card>

                {/* TARJETA VERDE: SALUDABLE */}
                <Card className="p-4 bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm dark:bg-emerald-950/20">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Activo</span>
                        </div>
                        <span className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                            {formatMoney(capitalSaludable)}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">
                            Stock saludable
                        </span>
                    </div>
                </Card>
             </div>

             {/* Lista de Vencimientos Críticos Real */}
             <div>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                   <AlertTriangle className="h-5 w-5 text-destructive" /> Prioridad Alta
                </h3>
                
                {vencimientosCriticos.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed">
                        <p>🎉 ¡Todo tranquilo! No hay capital en riesgo inmediato.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {vencimientosCriticos.map((item, idx) => (
                            <Card key={idx} className="p-3 border-l-4 border-l-destructive flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji}</span>
                                    <div>
                                        <p className="font-bold text-sm">{item.nombre}</p>
                                        <p className="text-xs text-destructive font-medium">
                                            Vence: {new Date(item.vencimiento).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{formatMoney(item.precio)}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
             </div>

             {/* Gráfico */}
             <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-1" /> Proyección
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
      </div>

      <BottomNav 
        active={activeTab === "catalog" ? "inventory" : activeTab} 
        onChange={(val) => setActiveTab(val as any)} 
      />
    </div>
  )
}