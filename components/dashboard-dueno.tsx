// components/dashboard-dueno.tsx

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, Loader2, ShieldCheck, DollarSign, CalendarRange, CreditCard, Repeat2, Wallet, Calendar as CalendarIcon } from "lucide-react" 
import { BottomNav } from "@/components/bottom-nav"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import CrearProducto from "@/components/crear-producto"
import { AgregarStock } from "@/components/agregar-stock"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format, subDays, startOfDay } from "date-fns" 

interface DashboardDuenoProps {
  onBack: () => void
}

interface MetricaStock {
  capital: number
  unidades: number
  criticos: any[]
}

// TIPADO: Definición de la estructura de retorno de la query de ventas
interface ProductoVentaJoin {
    nombre: string
    precio_venta: number 
    emoji: string
}

interface VentaJoin {
    id: string
    fecha_venta: string
    metodo_pago: string
    productos: ProductoVentaJoin | null 
}
// FIN TIPADO

// Interfaz para el desglose de ventas, ahora incluye billetera_virtual
interface PaymentBreakdown {
  efectivo: number
  tarjeta: number
  transferencia: number
  otro: number
  billetera_virtual: number
}

// Mapeo de iconos
const PAYMENT_ICONS = {
    efectivo: DollarSign,
    tarjeta: CreditCard,
    transferencia: Repeat2,
    otro: Wallet,
    billetera_virtual: Wallet, 
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog" | "sales">("sales")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Rango de fechas para filtrar ventas (Default: Últimos 7 días)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: startOfDay(new Date()),
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)


  const [productos, setProductos] = useState<any[]>([])
  const [productosConStock, setProductosConStock] = useState<any[]>([])

  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [capitalSaludable, setCapitalSaludable] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })

  // USO DEL TIPO
  const [ventasRecientes, setVentasRecientes] = useState<VentaJoin[]>([])
  const [totalVendido, setTotalVendido] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
      efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 
  })

  // REFACTORIZACIÓN: fetchData ahora depende del dateRange (vía useCallback)
  const fetchData = useCallback(async () => {
    setLoading(true)
    
    // 1. Fetch de Catálogo e Inventario (sin cambios)
    const { data: dataProductos } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })
    
    setProductos(dataProductos || [])

    const { data: dataStock } = await supabase
      .from('stock')
      .select('*, productos(nombre, precio_venta, emoji)')
      .eq('estado', 'pendiente')

    if (dataStock) {
      calcularMetricasStock(dataStock)
    }

    const productosConStockCalculado = await Promise.all((dataProductos || []).map(async (p) => {
        const { count } = await supabase
          .from('stock')
          .select('*', { count: 'exact', head: true })
          .eq('producto_id', p.id)
          .eq('estado', 'pendiente')
        
        return { ...p, stock_disponible: count || 0 }
      }))
    setProductosConStock(productosConStockCalculado)


    // 3. TRAER VENTAS RECIENTES (Items con estado 'vendido') - FILTRADO POR FECHA
    let ventasQuery = supabase
      .from('stock')
      .select('id, fecha_venta, metodo_pago, productos(nombre, precio_venta, emoji)') 
      .eq('estado', 'vendido')
      
    // APLICACIÓN DE FILTROS DE RANGO DE FECHAS
    if (dateRange?.from) {
        // Aseguramos que se incluye la fecha de inicio
        ventasQuery = ventasQuery.gte('fecha_venta', format(dateRange.from, 'yyyy-MM-dd'))
    }
    if (dateRange?.to) {
        // Aseguramos que se incluye la fecha final (hasta el final del día 23:59:59)
        const endOfDay = format(dateRange.to, 'yyyy-MM-dd 23:59:59')
        ventasQuery = ventasQuery.lte('fecha_venta', endOfDay)
    }

    // USO DEL NUEVO TIPO EN EL RETORNO DE SUPABASE
    const { data: dataVentas, error: errorVentas } = await ventasQuery
      .order('fecha_venta', { ascending: false, nullsFirst: false }) 
      .limit(50)
      .returns<VentaJoin[]>()

    if (errorVentas) {
        console.error("Error fetching ventas:", errorVentas)
        setVentasRecientes([])
        setTotalVendido(0)
    } else if (dataVentas) {
      setVentasRecientes(dataVentas)
      calcularMetricasVentas(dataVentas) 
    }

    setLoading(false)
  }, [dateRange]) 

  useEffect(() => {
    fetchData()
  }, [fetchData]) 


  // --- LÓGICA DE CÁLCULO (Tipado mejorado) ---
  const calcularMetricasVentas = (ventas: VentaJoin[]) => { 
    let total = 0
    const breakdown: PaymentBreakdown = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 } 

    ventas.forEach(item => {
        // Usamos una cadena de llamadas opcionales para acceder al precio de forma segura
        const precio = parseFloat(item.productos?.precio_venta?.toString() ?? '0')
        const metodo = item.metodo_pago || 'efectivo' as keyof PaymentBreakdown
        
        total += precio
        
        if (breakdown.hasOwnProperty(metodo)) {
            breakdown[metodo as keyof PaymentBreakdown] += precio
        } else {
            breakdown.otro += precio 
        }
    })

    setTotalVendido(total)
    setPaymentBreakdown(breakdown)
  }
  
  const calcularMetricasStock = (stock: any[]) => {
    let riesgo: MetricaStock = { capital: 0, unidades: 0, criticos: [] }
    let saludable: MetricaStock = { capital: 0, unidades: 0, criticos: [] }

    const hoy = new Date()
    const fechaLimite = new Date()
    fechaLimite.setDate(hoy.getDate() + 10)

    const criticosAgrupados: { [key: string]: { nombre: string, emoji: string, unidades: number, precioTotal: number, fechaVenc: string } } = {}


    stock.forEach(item => {
      const precio = parseFloat(item.productos?.precio_venta || 0)
      
      if (!item.fecha_vencimiento) {
        saludable.capital += precio
        saludable.unidades += 1
        return
      }

      const fechaVenc = new Date(item.fecha_vencimiento)
      const productoId = item.producto_id

      if (fechaVenc <= fechaLimite) {
        riesgo.capital += precio
        riesgo.unidades += 1

        if (!criticosAgrupados[productoId]) {
             criticosAgrupados[productoId] = {
                nombre: item.productos?.nombre || "Desconocido",
                emoji: item.productos?.emoji || "📦",
                unidades: 0,
                precioTotal: 0,
                fechaVenc: item.fecha_vencimiento
             }
        }
        criticosAgrupados[productoId].unidades += 1
        criticosAgrupados[productoId].precioTotal += precio

      } else {
        saludable.capital += precio
        saludable.unidades += 1
      }
    })

    riesgo.criticos = Object.values(criticosAgrupados).sort((a, b) => new Date(a.fechaVenc).getTime() - new Date(b.fechaVenc).getTime())

    setCapitalEnRiesgo(riesgo)
    setCapitalSaludable(saludable)
  }

  // --- Helpers UX ---
  const formatMoney = (amount: number) => {
    const numericAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(numericAmount)
  }
  
  const formatDateToDDMM = (dateString: string) => {
    if (!dateString) return "Sin fecha"
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${day}/${month}`
  }
  
  // Label para el rango de fechas en la UI
  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecciona Rango"
    const from = format(dateRange.from, 'dd/MM')
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return `Día: ${from}`
    }
    const to = format(dateRange.to, 'dd/MM')
    return `${from} - ${to}`
  }, [dateRange])


  const inventarioFiltrado = productosConStock.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
          {activeTab === "sales" && "Caja y Ventas"}
          {activeTab === "alerts" && "Riesgos y Vencimientos"}
          {activeTab === "inventory" && "Gestión de Stock"}
          {activeTab === "catalog" && "Catálogo Maestro"}
        </p>

        {/* Menú de Navegación Superior (Scrollable) */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            onClick={() => setActiveTab("sales")} 
            variant={activeTab === "sales" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <DollarSign className="mr-2 h-4 w-4" /> Ventas
          </Button>

          <Button 
            onClick={() => setActiveTab("alerts")} 
            variant={activeTab === "alerts" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Riesgos
          </Button>

          <Button 
            onClick={() => setActiveTab("inventory")} 
            variant={activeTab === "inventory" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <Package className="mr-2 h-4 w-4" /> Stock
          </Button>

          <Button 
            onClick={() => setActiveTab("catalog")} 
            variant={activeTab === "catalog" ? "secondary" : "default"}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Catálogo
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* PESTAÑA: VENTAS */}
        {activeTab === "sales" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Selector de Rango de Fechas */}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button 
                            id="date" 
                            variant={"outline"} 
                            className={cn(
                                "w-full justify-start text-left font-normal h-12 text-base",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            {dateRangeLabel}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => { 
                                setDateRange(range)
                                setIsCalendarOpen(false) 
                            }}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>

                {/* TARJETA TOTAL VENDIDO */}
                <Card className="p-6 bg-emerald-600 text-white shadow-lg border-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm mb-1">Total Vendido ({dateRangeLabel})</p>
                            <h2 className="text-4xl font-bold">{formatMoney(totalVendido)}</h2>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 flex gap-4 text-sm text-emerald-50">
                        <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" /> {ventasRecientes.length} ítems vendidos
                        </span>
                    </div>
                </Card>
                
                {/* DESGLOSE POR MÉTODO DE PAGO */}
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                       <CreditCard className="h-5 w-5 text-muted-foreground" /> Desglose de Pagos
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Mapeamos el desglose de pagos */}
                        {Object.entries(paymentBreakdown).map(([method, amount]) => {
                            // Formatea la clave para mostrarla (ej: billetera_virtual -> Billetera Virtual)
                            let label = method.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            const Icon = PAYMENT_ICONS[method as keyof typeof PAYMENT_ICONS];
                            
                            if (amount === 0) return null; 

                            return (
                                <Card 
                                    key={method} 
                                    className={cn(
                                        "p-3 flex items-center justify-between shadow-sm",
                                        method === 'efectivo' ? 'border-primary/50 bg-primary/5' : 'bg-muted/50'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn("h-4 w-4", method === 'efectivo' ? 'text-primary' : 'text-muted-foreground')} />
                                        <span className="text-xs font-semibold uppercase">{label}</span>
                                    </div>
                                    <p className="font-bold text-sm">{formatMoney(amount)}</p>
                                </Card>
                            )
                        })}
                    </div>
                    {totalVendido === 0 && (
                        <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg border-dashed border">
                            <p className="text-sm">Sin ventas para mostrar el desglose.</p>
                        </div>
                    )}
                </div>

                {/* LISTA DE ÚLTIMOS MOVIMIENTOS */}
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                       <CalendarRange className="h-5 w-5 text-muted-foreground" /> Últimos Movimientos
                    </h3>
                    <div className="space-y-2">
                        {ventasRecientes.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border-dashed border">
                                <p>No hay ventas registradas aún para este período.</p>
                            </div>
                        ) : (
                            ventasRecientes.map((venta) => (
                                <Card key={venta.id} className="p-3 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl bg-muted p-2 rounded-full h-10 w-10 flex items-center justify-center">
                                            {venta.productos?.emoji || '💵'}
                                        </span>
                                        <div>
                                            <p className="font-bold text-sm">{venta.productos?.nombre}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {venta.fecha_venta ? formatDateToDDMM(venta.fecha_venta) : 'Sin fecha'} - {venta.metodo_pago ? venta.metodo_pago.charAt(0).toUpperCase() + venta.metodo_pago.slice(1).replace('_', ' ') : 'Efectivo'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600">
                                            {/* 🚨 CORRECCIÓN: Usar ?? 0 para manejar el caso undefined/null */}
                                            + {formatMoney(venta.productos?.precio_venta ?? 0)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Vendido</p>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

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
                      {/* DETALLE DE STOCK EN INVENTARIO (CONTEO DE UNIDADES) */}
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary block">{formatMoney(item.precio_venta)}</span>
                        <span className="text-xs text-muted-foreground font-semibold mt-0.5">
                            Stock: <span className={item.stock_disponible > 0 ? "text-emerald-600" : "text-destructive"}>{item.stock_disponible} u.</span>
                        </span>
                      </div>
                    </div>

                    {/* Botón de Acción */}
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
                            {formatMoney(capitalEnRiesgo.capital)}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">
                            {capitalEnRiesgo.unidades} unidad{capitalEnRiesgo.unidades !== 1 ? 'es' : ''} &lt; 10 días
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
                            {formatMoney(capitalSaludable.capital)}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">
                            {capitalSaludable.unidades} unidad{capitalSaludable.unidades !== 1 ? 'es' : ''} saludables
                        </span>
                        
                    </div>
                </Card>
             </div>

             {/* Lista de Vencimientos Críticos */}
             <div>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                   <AlertTriangle className="h-5 w-5 text-destructive" /> Prioridad Alta ({capitalEnRiesgo.criticos.length} productos afectados)
                </h3>
                
                {capitalEnRiesgo.criticos.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed">
                        <p>🎉 ¡Todo tranquilo! No hay capital en riesgo inmediato.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {capitalEnRiesgo.criticos.map((item, idx) => (
                            <Card key={idx} className="p-3 border-l-4 border-l-destructive flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji}</span>
                                    <div>
                                        <p className="font-bold text-sm">{item.nombre} <span className="font-normal text-muted-foreground">({item.unidades} u.)</span></p>
                                        <p className="text-xs text-destructive font-medium">
                                            Vence: {new Date(item.fechaVenc).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{formatMoney(item.precioTotal)}</p>
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
        active={activeTab === "catalog" ? "inventory" : activeTab as any} 
        onChange={(val) => setActiveTab(val as any)} 
      />
    </div>
  )
}