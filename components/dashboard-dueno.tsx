// components/dashboard-dueno.tsx

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, 
  Loader2, ShieldCheck, DollarSign, CreditCard, 
  Repeat2, Wallet, Calendar as CalendarIcon, BarChart3, 
  Eye, CheckCircle2, XCircle, User, TrendingDown 
} from "lucide-react" 
import { BottomNav } from "@/components/bottom-nav"
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts" 
import CrearProducto from "@/components/crear-producto"
import { AgregarStock } from "@/components/agregar-stock"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format, subDays, startOfDay, parseISO } from "date-fns" 
import { es } from "date-fns/locale" 
import AsignarMision from "@/components/asignar-mision" // <--- IMPORTACIÓN DEL NUEVO COMPONENTE

// --- Interfaces ---
interface DashboardDuenoProps {
  onBack: () => void
}

interface MetricaStock {
  capital: number
  unidades: number
  criticos: any[]
}

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

interface PaymentBreakdown {
  efectivo: number
  tarjeta: number
  transferencia: number
  otro: number
  billetera_virtual: number
}

// --- Interfaces para Fase 4 (Supervisión) ---
interface MisionAudit {
  id: string
  descripcion: string
  tipo: string
  es_completada: boolean
  puntos: number
}

interface MovimientoCaja {
  id: string
  monto: number
  descripcion: string
  tipo: 'ingreso' | 'egreso'
  created_at: string
}

interface TurnoAudit {
  id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_inicial: number
  monto_final: number | null
  empleado_id: string
  perfiles: { nombre: string } | null // Join con tabla perfiles
  misiones: MisionAudit[]
  movimientos_caja: MovimientoCaja[]
}

const PAYMENT_ICONS = {
    efectivo: DollarSign,
    tarjeta: CreditCard,
    transferencia: Repeat2,
    otro: Wallet,
    billetera_virtual: Wallet, 
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  // 1. Estado
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog" | "sales" | "supervision">("sales")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Rango de fechas
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: startOfDay(new Date()),
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Estados de Datos
  const [productos, setProductos] = useState<any[]>([])
  const [productosConStock, setProductosConStock] = useState<any[]>([])
  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [capitalSaludable, setCapitalSaludable] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })

  const [ventasRecientes, setVentasRecientes] = useState<VentaJoin[]>([])
  const [totalVendido, setTotalVendido] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
      efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 
  })

  // 2. Nuevo Estado para Auditoría
  const [turnosAudit, setTurnosAudit] = useState<TurnoAudit[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    
    // --- A. Inventario y Stock ---
    const { data: dataProductos } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })
    
    setProductos(dataProductos || [])

    const { data: dataStock } = await supabase
      .from('stock')
      .select('*, productos(nombre, precio_venta, emoji)')
      .eq('estado', 'pendiente')

    if (dataStock) calcularMetricasStock(dataStock)

    const productosConStockCalculado = await Promise.all((dataProductos || []).map(async (p) => {
        const { count } = await supabase
          .from('stock')
          .select('*', { count: 'exact', head: true })
          .eq('producto_id', p.id)
          .eq('estado', 'pendiente')
        return { ...p, stock_disponible: count || 0 }
      }))
    setProductosConStock(productosConStockCalculado)

    // --- B. Reporte de Ventas ---
    let ventasQuery = supabase
      .from('stock')
      .select('id, fecha_venta, metodo_pago, productos(nombre, precio_venta, emoji)') 
      .eq('estado', 'vendido')
      
    let queryLimit = 50;
    if (dateRange?.from) {
        queryLimit = 10000; 
        ventasQuery = ventasQuery.gte('fecha_venta', format(dateRange.from, 'yyyy-MM-dd'))
    }
    if (dateRange?.to) {
        const endOfDay = format(dateRange.to, 'yyyy-MM-dd 23:59:59')
        ventasQuery = ventasQuery.lte('fecha_venta', endOfDay)
    }

    const { data: dataVentas } = await ventasQuery
      .order('fecha_venta', { ascending: false })
      .limit(queryLimit)
      .returns<VentaJoin[]>()

    if (dataVentas) {
      setVentasRecientes(dataVentas)
      calcularMetricasVentas(dataVentas) 
    }

    // --- C. Supervisión ---
    let cajasQuery = supabase
        .from('caja_diaria')
        .select(`
            *,
            perfiles(nombre),
            misiones(*),
            movimientos_caja(*)
        `)
        .order('fecha_apertura', { ascending: false })

    if (dateRange?.from) {
        cajasQuery = cajasQuery.gte('fecha_apertura', format(dateRange.from, 'yyyy-MM-dd'))
    }
    
    const { data: dataCajas } = await cajasQuery.returns<TurnoAudit[]>()

    if (dataCajas) {
        setTurnosAudit(dataCajas)
    }

    setLoading(false)
  }, [dateRange]) 

  useEffect(() => {
    fetchData()
  }, [fetchData]) 

  // --- Lógica de Métricas ---
  const calcularMetricasVentas = (ventas: VentaJoin[]) => { 
    let total = 0
    const breakdown: PaymentBreakdown = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 } 

    ventas.forEach(item => {
        const precio = parseFloat(item.productos?.precio_venta?.toString() ?? '0')
        const metodo = (item.metodo_pago || 'efectivo') as keyof PaymentBreakdown
        total += precio
        if (breakdown.hasOwnProperty(metodo)) breakdown[metodo] += precio
        else breakdown.otro += precio 
    })
    setTotalVendido(total)
    setPaymentBreakdown(breakdown)
  }

  const chartData = useMemo(() => {
    const agrupado: { [key: string]: number } = {}
    const ventasCronologicas = [...ventasRecientes].reverse()
    ventasCronologicas.forEach(v => {
        if (!v.fecha_venta) return
        const fechaKey = format(parseISO(v.fecha_venta), 'dd/MM')
        const monto = v.productos?.precio_venta ?? 0
        agrupado[fechaKey] = (agrupado[fechaKey] || 0) + monto
    })
    return Object.entries(agrupado).map(([fecha, total]) => ({ fecha, total }))
  }, [ventasRecientes])
  
  const calcularMetricasStock = (stock: any[]) => {
    let riesgo: MetricaStock = { capital: 0, unidades: 0, criticos: [] }
    let saludable: MetricaStock = { capital: 0, unidades: 0, criticos: [] }
    const hoy = new Date()
    const fechaLimite = new Date(); fechaLimite.setDate(hoy.getDate() + 10)
    const criticosAgrupados: { [key: string]: any } = {}

    stock.forEach(item => {
      const precio = parseFloat(item.productos?.precio_venta || 0)
      if (!item.fecha_vencimiento) {
        saludable.capital += precio; saludable.unidades += 1; return
      }
      const fechaVenc = new Date(item.fecha_vencimiento)
      if (fechaVenc <= fechaLimite) {
        riesgo.capital += precio; riesgo.unidades += 1
        if (!criticosAgrupados[item.producto_id]) {
             criticosAgrupados[item.producto_id] = {
                nombre: item.productos?.nombre || "Desconocido",
                emoji: item.productos?.emoji || "📦",
                unidades: 0,
                precioTotal: 0,
                fechaVenc: item.fecha_vencimiento
             }
        }
        criticosAgrupados[item.producto_id].unidades += 1
        criticosAgrupados[item.producto_id].precioTotal += precio
      } else {
        saludable.capital += precio; saludable.unidades += 1
      }
    })
    riesgo.criticos = Object.values(criticosAgrupados).sort((a, b) => new Date(a.fechaVenc).getTime() - new Date(b.fechaVenc).getTime())
    setCapitalEnRiesgo(riesgo)
    setCapitalSaludable(saludable)
  }

  const formatMoney = (amount: number | null) => {
    if (amount === null) return "-"
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
  }
  
  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecciona Rango"
    const from = format(dateRange.from, 'dd/MM', { locale: es })
    if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) return `Día: ${from}`
    const to = format(dateRange.to, 'dd/MM', { locale: es })
    return `${from} - ${to}`
  }, [dateRange])

  const inventarioFiltrado = productosConStock.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-primary-foreground/20 text-primary-foreground">
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="text-right">
                <h1 className="text-2xl font-bold">Torre de Control</h1>
                <p className="text-xs text-primary-foreground/70">Planeta ZEGA</p>
            </div>
        </div>

        {/* Menú de Navegación Superior */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <Button onClick={() => setActiveTab("sales")} variant={activeTab === "sales" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap">
            <BarChart3 className="mr-2 h-4 w-4" /> Reportes
          </Button>
          <Button onClick={() => setActiveTab("supervision")} variant={activeTab === "supervision" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap">
            <Eye className="mr-2 h-4 w-4" /> Supervisión
          </Button>
          <Button onClick={() => setActiveTab("alerts")} variant={activeTab === "alerts" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap">
            <TrendingUp className="mr-2 h-4 w-4" /> Riesgos
          </Button>
          <Button onClick={() => setActiveTab("inventory")} variant={activeTab === "inventory" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap">
            <Package className="mr-2 h-4 w-4" /> Stock
          </Button>
          <Button onClick={() => setActiveTab("catalog")} variant={activeTab === "catalog" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Catálogo
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* FILTRO COMÚN DE FECHA */}
        {(activeTab === "sales" || activeTab === "supervision") && (
             <div className="flex gap-2 items-center mb-4">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-12 text-base border-2", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            {dateRangeLabel}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                            initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange}
                            onSelect={(range) => { setDateRange(range); if(range?.to) setIsCalendarOpen(false) }}
                            numberOfMonths={1} locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        )}

        {/* 3. PESTAÑA: SUPERVISIÓN */}
        {activeTab === "supervision" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Historial de Turnos
                </h3>

                {turnosAudit.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground bg-muted/20 border-dashed">
                        <Eye className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No hay turnos registrados en estas fechas.</p>
                    </Card>
                ) : (
                    turnosAudit.map((turno) => {
                        const diferencia = (turno.monto_final || 0) - turno.monto_inicial
                        const isOpen = !turno.fecha_cierre
                        const isLoss = diferencia < -100 
                        const isGain = diferencia > 100 
                        
                        const totalGastos = turno.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0) || 0

                        return (
                            <Card key={turno.id} className="overflow-hidden border-2 shadow-sm">
                                {/* Header del Turno */}
                                <div className={cn(
                                    "p-3 flex justify-between items-center text-sm font-medium border-b",
                                    isOpen ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-700"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="font-bold">{turno.perfiles?.nombre || "Empleado Desconocido"}</span>
                                    </div>
                                    <span>{format(parseISO(turno.fecha_apertura), 'dd/MM HH:mm')}</span>
                                </div>

                                {/* --- BARRA DE ACCIONES (SOLO SI ESTÁ ABIERTO) --- */}
                                {isOpen && (
                                    <div className="p-2 bg-blue-50/50 flex justify-end border-b border-blue-100">
                                        <AsignarMision 
                                            turnoId={turno.id}
                                            empleadoId={turno.empleado_id}
                                            empleadoNombre={turno.perfiles?.nombre || "Empleado"}
                                            onMisionCreated={fetchData} 
                                        />
                                    </div>
                                )}

                                <div className="p-4 grid grid-cols-2 gap-4">
                                    {/* Finanzas */}
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Caja Efectivo</p>
                                        <div className="text-sm">
                                            <div className="flex justify-between"><span>Inicio:</span> <span>{formatMoney(turno.monto_inicial)}</span></div>
                                            {turno.monto_final !== null ? (
                                                <div className="flex justify-between font-bold"><span>Fin:</span> <span>{formatMoney(turno.monto_final)}</span></div>
                                            ) : (
                                                <div className="text-blue-600 font-bold italic text-xs mt-1">🔴 Turno en curso</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Resultado del Arqueo */}
                                    {!isOpen && (
                                        <div className={cn("rounded-lg p-2 text-center flex flex-col justify-center border",
                                            isLoss ? "bg-red-50 border-red-200 text-red-700" :
                                            isGain ? "bg-orange-50 border-orange-200 text-orange-700" :
                                            "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        )}>
                                            <span className="text-xs font-bold uppercase">Diferencia</span>
                                            <span className="text-xl font-black">{diferencia > 0 ? "+" : ""}{formatMoney(diferencia)}</span>
                                            {isLoss && <span className="text-[10px] font-bold">⚠️ FALTANTE</span>}
                                        </div>
                                    )}
                                </div>

                                {/* MOVIMIENTOS / GASTOS */}
                                {turno.movimientos_caja && turno.movimientos_caja.length > 0 && (
                                    <div className="bg-red-50/50 p-3 border-t border-red-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs font-bold text-red-700 uppercase flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3" /> Salidas de Caja
                                            </p>
                                            <span className="text-xs font-bold text-red-700">Total: -{formatMoney(totalGastos)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {turno.movimientos_caja.map(mov => (
                                                <div key={mov.id} className="flex justify-between text-xs text-red-600/80">
                                                    <span>{format(parseISO(mov.created_at), 'HH:mm')} - {mov.descripcion}</span>
                                                    <span className="font-mono font-medium">-{formatMoney(mov.monto)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Misiones y Acciones */}
                                {turno.misiones && turno.misiones.length > 0 && (
                                    <div className="bg-slate-50 p-3 border-t">
                                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Actividad Reportada</p>
                                        <div className="space-y-2">
                                            {turno.misiones.map(m => (
                                                <div key={m.id} className="flex items-start gap-2 text-sm">
                                                    {m.es_completada 
                                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> 
                                                        : <XCircle className="h-4 w-4 text-gray-300 mt-0.5" />
                                                    }
                                                    <div className="flex-1">
                                                        <span className={cn(m.es_completada ? "text-foreground font-medium" : "text-muted-foreground")}>
                                                            {m.descripcion}
                                                        </span>
                                                        {m.tipo === 'vencimiento' && m.es_completada && (
                                                            <div className="text-xs text-orange-600 font-bold ml-1 mt-0.5">
                                                                🛠️ Acción Crítica: Se retiró mercadería vencida.
                                                            </div>
                                                        )}
                                                        {m.tipo === 'manual' && (
                                                            <div className="text-xs text-blue-600 font-bold ml-1 mt-0.5">
                                                                🎮 Tarea Especial
                                                            </div>
                                                        )}
                                                    </div>
                                                    {m.es_completada && <span className="text-xs font-bold text-yellow-600">+{m.puntos}XP</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>
        )}

        {/* PESTAÑA: VENTAS (REPORTING) */}
        {activeTab === "sales" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                {/* KPI Principal */}
                <Card className="p-6 bg-emerald-600 text-white shadow-lg border-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="h-32 w-32" /></div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-sm mb-1">Facturación Total</p>
                        <h2 className="text-4xl font-black tracking-tight">{formatMoney(totalVendido)}</h2>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 text-sm text-emerald-50 relative z-10">
                        <span className="bg-emerald-500/30 px-2 py-1 rounded-md">
                            <Package className="h-4 w-4 inline mr-1" /> {ventasRecientes.length} operaciones
                        </span>
                    </div>
                </Card>

                {/* GRÁFICO */}
                {chartData.length > 0 && (
                    <Card className="p-5 border-2 border-muted/40 shadow-sm">
                        <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Evolución Diaria
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280'}} dy={10} />
                                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                    <Bar dataKey="total" fill="oklch(0.5 0.2 250)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
                
                {/* Desglose Financiero */}
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(paymentBreakdown).map(([method, amount]) => {
                        if (amount === 0) return null; 
                        let label = method.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        const Icon = PAYMENT_ICONS[method as keyof typeof PAYMENT_ICONS];
                        return (
                            <Card key={method} className={cn("p-3 shadow-sm border-l-4", method === 'efectivo' ? 'border-l-primary bg-primary/5' : 'border-l-muted-foreground/30 bg-muted/20')}>
                                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                    <Icon className={cn("h-4 w-4", method === 'efectivo' ? 'text-primary' : '')} />
                                    <span className="text-xs font-bold uppercase">{label}</span>
                                </div>
                                <p className="font-bold text-lg">{formatMoney(amount)}</p>
                            </Card>
                        )
                    })}
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
              <Input type="text" placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 pl-12 text-base" />
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div> : (
              <div className="space-y-3">
                {inventarioFiltrado.map((item) => (
                  <Card key={item.id} className="p-4 flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji || '📦'}</span>
                        <div>
                          <h3 className="font-bold text-foreground text-pretty leading-tight">{item.nombre}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.categoria}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary block">{formatMoney(item.precio_venta)}</span>
                        <span className="text-xs text-muted-foreground font-semibold mt-0.5">
                            Stock: <span className={item.stock_disponible > 0 ? "text-emerald-600" : "text-destructive"}>{item.stock_disponible} u.</span>
                        </span>
                      </div>
                    </div>
                    <AgregarStock producto={item} onStockAdded={fetchData} />
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
                <Card className="p-4 bg-orange-50 border-l-4 border-l-orange-500 shadow-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">En Riesgo</span>
                        </div>
                        <span className="text-2xl font-black text-gray-800">{formatMoney(capitalEnRiesgo.capital)}</span>
                        <span className="text-[10px] text-gray-500">{capitalEnRiesgo.unidades} u. &lt; 10 días</span>
                    </div>
                </Card>
                <Card className="p-4 bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Activo</span>
                        </div>
                        <span className="text-2xl font-black text-gray-800">{formatMoney(capitalSaludable.capital)}</span>
                        <span className="text-[10px] text-gray-500">{capitalSaludable.unidades} u. saludables</span>
                    </div>
                </Card>
             </div>
             <div>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                   <AlertTriangle className="h-5 w-5 text-destructive" /> Prioridad Alta ({capitalEnRiesgo.criticos.length})
                </h3>
                {capitalEnRiesgo.criticos.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground bg-muted/20 border-dashed"><p>🎉 ¡Todo tranquilo!</p></Card>
                ) : (
                    <div className="space-y-3">
                        {capitalEnRiesgo.criticos.map((item, idx) => (
                            <Card key={idx} className="p-3 border-l-4 border-l-destructive flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji}</span>
                                    <div>
                                        <p className="font-bold text-sm">{item.nombre} <span className="font-normal text-muted-foreground">({item.unidades} u.)</span></p>
                                        <p className="text-xs text-destructive font-medium">Vence: {new Date(item.fechaVenc).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right"><p className="font-bold text-sm">{formatMoney(item.precioTotal)}</p></div>
                            </Card>
                        ))}
                    </div>
                )}
             </div>
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