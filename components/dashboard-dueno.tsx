"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, AlertTriangle, TrendingUp, MessageCircle, Package, Search, Target, Calendar } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardDuenoProps {
  onBack: () => void
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks">("alerts")
  const [searchQuery, setSearchQuery] = useState("")

  const vencimientosCriticos = [
    {
      id: 1,
      producto: "Leche Entera La Serenísima",
      vencimiento: "15/12/2025",
      cantidad: 12,
      proveedor: "+54 9 11 2345-6789",
      costo: 8500,
    },
    {
      id: 2,
      producto: "Yogur Sancor Frutilla",
      vencimiento: "16/12/2025",
      cantidad: 8,
      proveedor: "+54 9 11 3456-7890",
      costo: 4200,
    },
    {
      id: 3,
      producto: "Queso Cremoso",
      vencimiento: "17/12/2025",
      cantidad: 5,
      proveedor: "+54 9 11 4567-8901",
      costo: 6750,
    },
  ]

  const inventarioCompleto = [
    { id: 1, nombre: "Leche Entera La Serenísima", stock: 45, precio: 850, categoria: "Lácteos" },
    { id: 2, nombre: "Yogur Sancor Frutilla", stock: 32, precio: 650, categoria: "Lácteos" },
    { id: 3, nombre: "Queso Cremoso", stock: 18, precio: 1350, categoria: "Lácteos" },
    { id: 4, nombre: "Coca Cola 2L", stock: 67, precio: 1200, categoria: "Bebidas" },
    { id: 5, nombre: "Pan Lactal Bimbo", stock: 28, precio: 950, categoria: "Panadería" },
    { id: 6, nombre: "Galletitas Oreo", stock: 41, precio: 780, categoria: "Snacks" },
    { id: 7, nombre: "Fideos Matarazzo", stock: 55, precio: 580, categoria: "Almacén" },
    { id: 8, nombre: "Arroz Gallo Oro 1kg", stock: 38, precio: 890, categoria: "Almacén" },
  ]

  const preciosTendencia = [
    { mes: "Sep", precio: 1045 },
    { mes: "Oct", precio: 1100 },
    { mes: "Nov", precio: 1150 },
    { mes: "Dic", precio: 1200 },
  ]

  const tareasEmpleado = [
    { id: 1, tarea: "Caza-Vencimientos", cantidad: 3, tipo: "urgente" },
    { id: 2, tarea: "Completar Datos", cantidad: 3, tipo: "normal" },
  ]

  const handleWhatsApp = (proveedor: string, producto: string) => {
    const mensaje = encodeURIComponent(
      `Hola, tengo ${producto} próximo a vencer. ¿Podemos gestionar un cambio o descuento?`,
    )
    window.open(`https://wa.me/${proveedor.replace(/[^0-9]/g, "")}?text=${mensaje}`, "_blank")
  }

  const inventarioFiltrado = inventarioCompleto.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mb-4 hover:bg-primary-foreground/20 text-primary-foreground"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold mb-2">Dashboard del Dueño</h1>
        <p className="text-primary-foreground/80">
          {activeTab === "alerts" && "Resumen del mes"}
          {activeTab === "inventory" && "Control de stock"}
          {activeTab === "tasks" && "Progreso del equipo"}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Alerts Tab - Default Dashboard */}
        {activeTab === "alerts" && (
          <>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Capital en Riesgo</p>
                    <p className="text-2xl font-bold text-orange-500">$19.450</p>
                    <p className="text-xs text-muted-foreground mt-1">¡Actúa ahora!</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-4 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Dinero Salvado</p>
                    <p className="text-2xl font-bold text-chart-4">$18.900</p>
                    <p className="text-xs text-muted-foreground mt-1">Por ofertas</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Critical Expirations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-bold text-foreground">Vencimientos Críticos</h2>
              </div>

              <div className="space-y-3">
                {vencimientosCriticos.map((item) => (
                  <Card key={item.id} className="p-4 border-l-4 border-l-destructive bg-destructive/5">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-pretty">{item.producto}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full font-medium">
                              Vence: {item.vencimiento}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                              {item.cantidad} unidades
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-destructive">${item.costo.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">en riesgo</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleWhatsApp(item.proveedor, item.producto)}
                        className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold"
                        size="lg"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Contactar Proveedor
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-1" />
                Tendencias de Precios
              </h2>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Coca Cola 2L</p>
                <p className="text-2xl font-bold text-destructive">+15% en 3 meses</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={preciosTendencia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line type="monotone" dataKey="precio" stroke="hsl(var(--chart-1))" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

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

            <div className="space-y-2">
              {inventarioFiltrado.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-pretty">{item.nombre}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.categoria}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className="text-lg font-bold text-foreground">{item.stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Precio</p>
                        <p className="text-lg font-bold text-primary">${item.precio}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {inventarioFiltrado.length === 0 && (
                <Card className="p-8">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No se encontraron productos</p>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {activeTab === "tasks" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">Tareas del Equipo</h2>
              <div className="space-y-3">
                {tareasEmpleado.map((tarea) => (
                  <Card key={tarea.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          tarea.tipo === "urgente"
                            ? "bg-gradient-to-br from-destructive/80 to-destructive"
                            : "bg-gradient-to-br from-chart-1 to-chart-2"
                        }`}
                      >
                        {tarea.tipo === "urgente" ? (
                          <Target className="h-6 w-6 text-destructive-foreground" />
                        ) : (
                          <Calendar className="h-6 w-6 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground">{tarea.tarea}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{tarea.cantidad} productos pendientes</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div
                          className={`h-10 w-10 rounded-full font-bold flex items-center justify-center text-sm ${
                            tarea.tipo === "urgente"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-chart-1 text-primary-foreground"
                          }`}
                        >
                          {tarea.cantidad}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/30">
              <div className="text-center">
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-lg font-bold text-foreground">Resumen Semanal</h3>
                <p className="text-sm text-muted-foreground mt-1">El equipo completó 34 tareas esta semana</p>
              </div>
            </Card>
          </>
        )}
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
