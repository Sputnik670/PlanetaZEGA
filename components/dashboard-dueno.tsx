// components/dashboard-dueno.tsx

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, 
  Loader2, ShieldCheck, DollarSign, CreditCard, 
  Repeat2, Wallet, Calendar as CalendarIcon, BarChart3, 
  Eye, TrendingDown, Star, User, ShoppingBag, Clock, 
  Pencil, Trash2, History, Save, ChevronDown, ChevronUp, Calculator
} from "lucide-react" 
import { BottomNav } from "@/components/bottom-nav"
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts" 
import CrearProducto from "@/components/crear-producto"
import { AgregarStock } from "@/components/agregar-stock"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval } from "date-fns" 
import { es } from "date-fns/locale" 
import AsignarMision from "@/components/asignar-mision" 
import { toast } from "sonner" 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

// --- Configuración ---
const UMBRAL_STOCK_BAJO = 5 

// --- Interfaces ---
interface DashboardDuenoProps {
  onBack: () => void
}

interface MetricaStock {
  capital: number
  unidades: number
  criticos: any[]
}

interface Producto {
    id: string
    nombre: string
    categoria: string
    precio_venta: number
    costo: number
    emoji: string
    stock_disponible?: number
}

interface HistorialPrecio {
    fecha_cambio: string;
    precio_venta_anterior: number;
    precio_venta_nuevo: number;
    costo_anterior: number;
    costo_nuevo: number;
    empleado_id: string;
}

interface VentaJoin {
    id: string
    fecha_venta: string
    metodo_pago: string
    productos: { nombre: string; precio_venta: number; emoji: string } | null 
}

interface PaymentBreakdown {
  efectivo: number
  tarjeta: number
  transferencia: number
  otro: number
  billetera_virtual: number
}

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
  perfiles: { nombre: string } | null 
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
  // 1. Estados Globales
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog" | "sales" | "supervision">("sales")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // 2. Estados de Datos
  const [productos, setProductos] = useState<Producto[]>([])
  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [capitalSaludable, setCapitalSaludable] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [ventasRecientes, setVentasRecientes] = useState<VentaJoin[]>([])
  const [totalVendido, setTotalVendido] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
      efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 
  })
  const [topProductos, setTopProductos] = useState<{name: string, count: number}[]>([])
  const [turnosAudit, setTurnosAudit] = useState<TurnoAudit[]>([])
  const [expandedTurnoId, setExpandedTurnoId] = useState<string | null>(null)

  // 3. Modales
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [managingStockId, setManagingStockId] = useState<string | null>(null)
  const [stockBatchList, setStockBatchList] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  
  // 4. Historial de Precios
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<HistorialPrecio[]>([]);

  // --- HELPERS ---
  
  const calcularMetricasVentas = (ventas: VentaJoin[]) => { 
    let total = 0
    const breakdown: PaymentBreakdown = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 } 
    ventas.forEach(item => {
        const precio = parseFloat(item.productos?.precio_venta?.toString() ?? '0')
        let metodo = (item.metodo_pago || 'efectivo') as keyof PaymentBreakdown
        if (!breakdown.hasOwnProperty(metodo)) metodo = 'otro'
        total += precio
        breakdown[metodo] += precio 
    })
    setTotalVendido(total)
    setPaymentBreakdown(breakdown)
  }

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

  // --- FETCH DATA (LÓGICA OPTIMIZADA AQUÍ) ---
  const fetchData = useCallback(async () => {
    // A. Inventario y Stock (Optimizado con Vista SQL)
    // ESTO REEMPLAZA LAS LENTAS CONSULTAS N+1
    const { data: dataProductosView, error: errorProductosView } = await supabase
        .from('view_productos_con_stock') // <-- CAMBIO CLAVE: Usamos la View pre-calculada
        .select('*')
        .order('nombre', { ascending: true })
        
    if (errorProductosView) {
        console.error("Error al cargar la vista de productos:", errorProductosView);
        // Si hay un error, al menos intentamos cargar los productos sin stock si es posible
        setProductos([])
    } else {
        // La data ya tiene el campo 'stock_disponible' calculado
        const productosCalculados = (dataProductosView as Producto[]) || []
        setProductos(productosCalculados)
    }

    // El cálculo de Capital en Riesgo (Alertas) todavía necesita el detalle del lote de 'stock'
    const { data: dataStock } = await supabase.from('stock').select('*, productos(nombre, precio_venta, emoji)').eq('estado', 'pendiente')
    if (dataStock) calcularMetricasStock(dataStock)

    // B. Ventas
    let ventasQuery = supabase.from('stock').select('id, fecha_venta, metodo_pago, productos(nombre, precio_venta, emoji)').eq('estado', 'vendido')
    if (dateRange?.from) { ventasQuery = ventasQuery.gte('fecha_venta', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss')) }
    if (dateRange?.to) { ventasQuery = ventasQuery.lte('fecha_venta', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss')) }
    
    const { data: dataVentas } = await ventasQuery.order('fecha_venta', { ascending: false }).returns<VentaJoin[]>()
    if (dataVentas) {
      setVentasRecientes(dataVentas)
      calcularMetricasVentas(dataVentas)
      const conteoProductos: Record<string, number> = {}
      dataVentas.forEach(v => { const nombre = v.productos?.nombre || "Varios"; conteoProductos[nombre] = (conteoProductos[nombre] || 0) + 1 })
      const ranking = Object.entries(conteoProductos).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5) 
      setTopProductos(ranking)
    }

    // C. Supervisión
    let cajasQuery = supabase.from('caja_diaria').select(`*, perfiles(nombre), misiones(*), movimientos_caja(*)`).order('fecha_apertura', { ascending: false })
    if (dateRange?.from) { cajasQuery = cajasQuery.gte('fecha_apertura', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss')) }
    if (dateRange?.to) { cajasQuery = cajasQuery.lte('fecha_apertura', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss')) }
    const { data: dataCajas } = await cajasQuery.returns<TurnoAudit[]>()
    setTurnosAudit(dataCajas || [])

  }, [dateRange]) 

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  // --- MEMOS ---
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

  const alertasStockBajo = useMemo(() => {
      return productos
        .filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO)
        .sort((a, b) => (a.stock_disponible || 0) - (b.stock_disponible || 0))
  }, [productos])

  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecciona Rango"
    const from = format(dateRange.from, 'dd/MM', { locale: es })
    if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) return `Día: ${from}`
    const to = format(dateRange.to, 'dd/MM', { locale: es })
    return `${from} - ${to}`
  }, [dateRange])

  const inventarioFiltrado = productos.filter((item) => item.nombre.toLowerCase().includes(searchQuery.toLowerCase()))

  // --- HANDLERS ---
  const loadPriceHistory = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('historial_precios')
            .select(`*, perfiles(nombre)`)
            .eq('producto_id', productId)
            .order('fecha_cambio', { ascending: false });
        
        if (error) throw error;
        setHistoryData(data as HistorialPrecio[] || []);
        setShowPriceHistoryModal(true);
    } catch (error) { toast.error("Error al cargar historial"); } 
    finally { setLoading(false); }
  }, []);

  const handleSaveProduct = async () => {
      if (!editingProduct) return
      setActionLoading(true)
      try {
          const { data: oldProduct, error: fetchError } = await supabase.from('productos').select('precio_venta, costo').eq('id', editingProduct.id).single();
          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase.from('productos').update({
              nombre: editingProduct.nombre,
              categoria: editingProduct.categoria,
              precio_venta: editingProduct.precio_venta,
              costo: editingProduct.costo || 0, 
              emoji: editingProduct.emoji
          }).eq('id', editingProduct.id)

          if (updateError) throw updateError
          
          const precioCambio = oldProduct.precio_venta !== editingProduct.precio_venta;
          const costoCambio = oldProduct.costo !== editingProduct.costo;

          if (precioCambio || costoCambio) {
              const { data: { user } } = await supabase.auth.getUser();
              const { error: historyError } = await supabase.from('historial_precios').insert({
                  producto_id: editingProduct.id,
                  precio_venta_anterior: oldProduct.precio_venta,
                  precio_venta_nuevo: editingProduct.precio_venta,
                  costo_anterior: oldProduct.costo,
                  costo_nuevo: editingProduct.costo,
                  empleado_id: user?.id,
              });
              if (historyError) console.error("Error registrando historial:", historyError);
          }

          toast.success("Producto Actualizado")
          setEditingProduct(null)
          fetchData()
      } catch (error: any) { toast.error("Error", { description: error.message }) } 
      finally { setActionLoading(false) }
  }

  const handleDeleteProduct = async (id: string) => {
      if (!confirm("¿Borrar producto?")) return
      try {
          const { error } = await supabase.from('productos').delete().eq('id', id)
          if (error) throw error
          toast.success("Eliminado")
          fetchData()
      } catch (error: any) { toast.error("Error", { description: "Verifica que no tenga stock asociado." }) }
  }

  const loadStockBatches = async (productId: string) => {
      setManagingStockId(productId)
      const { data } = await supabase.from('stock').select('*').eq('producto_id', productId).eq('estado', 'pendiente').order('created_at', { ascending: false })
      setStockBatchList(data || [])
  }

  const handleDeleteStockItem = async (stockId: string) => {
      try {
          const { error } = await supabase.from('stock').delete().eq('id', stockId)
          if (error) throw error
          toast.success("Item eliminado")
          setStockBatchList(prev => prev.filter(i => i.id !== stockId))
          fetchData() 
      } catch (error) { toast.error("Error") }
  }

  const formatMoney = (amount: number | null) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0)
  
  const getMargenInfo = (precio: number, costo: number) => {
      if (!costo || costo === 0) return { margen: 100, ganancia: precio, color: 'text-gray-400' }
      const ganancia = precio - costo
      const margen = (ganancia / costo) * 100
      return { margen: margen.toFixed(0), ganancia: ganancia.toFixed(0), color: margen < 30 ? 'text-red-600' : 'text-emerald-600' }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-primary-foreground/20 text-primary-foreground"><ArrowLeft className="h-6 w-6" /></Button>
            <div className="text-right"><h1 className="text-2xl font-bold">Torre de Control</h1><p className="text-xs text-primary-foreground/70">Planeta ZEGA</p></div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <Button onClick={() => setActiveTab("sales")} variant={activeTab === "sales" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><BarChart3 className="mr-2 h-4 w-4" /> Reportes</Button>
          <Button onClick={() => setActiveTab("supervision")} variant={activeTab === "supervision" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Eye className="mr-2 h-4 w-4" /> Supervisión</Button>
          <Button onClick={() => setActiveTab("alerts")} variant={activeTab === "alerts" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><TrendingUp className="mr-2 h-4 w-4" /> Riesgos</Button>
          <Button onClick={() => setActiveTab("inventory")} variant={activeTab === "inventory" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Package className="mr-2 h-4 w-4" /> Stock</Button>
          <Button onClick={() => setActiveTab("catalog")} variant={activeTab === "catalog" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Plus className="mr-2 h-4 w-4" /> Catálogo</Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* FILTRO DE FECHA */}
        {(activeTab === "sales" || activeTab === "supervision") && (
             <div className="flex gap-2 items-center mb-4">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-12 text-base border-2", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-5 w-5" />{dateRangeLabel}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.to) setIsCalendarOpen(false) }} numberOfMonths={1} locale={es} /></PopoverContent>
                </Popover>
            </div>
        )}

        {/* --- SUPERVISIÓN (MEJORADO CON AUDITORÍA DETALLADA) --- */}
        {activeTab === "supervision" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Historial de Turnos
                </h3>
                {turnosAudit.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground bg-muted/20 border-dashed">
                        <Eye className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No hay turnos registrados en este rango de fechas.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {turnosAudit.map((turno) => {
                            // 1. Filtrar ventas de este turno específico (por fecha)
                            // IMPORTANTE: Esto asume que ventasRecientes tiene TODO lo necesario.
                            // Si hay paginación, solo audita lo cargado.
                            const ventasTurno = ventasRecientes.filter(v => {
                                const fechaVenta = parseISO(v.fecha_venta)
                                const apertura = parseISO(turno.fecha_apertura)
                                const cierre = turno.fecha_cierre ? parseISO(turno.fecha_cierre) : new Date()
                                return fechaVenta >= apertura && fechaVenta <= cierre
                            })

                            // 2. Calcular desglose
                            const facturacionTotal = ventasTurno.reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0)
                            const facturacionEfectivo = ventasTurno.filter(v => v.metodo_pago === 'efectivo' || !v.metodo_pago).reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0)
                            const facturacionDigital = facturacionTotal - facturacionEfectivo
                            
                            const totalGastos = turno.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0) || 0
                            
                            // 3. Calcular Diferencia Real (Solo sobre efectivo)
                            // Esperado = Inicio + Ventas(Efectivo) - Gastos(Efectivo)
                            // Nota: Asumimos que los gastos salen de caja chica (efectivo)
                            const cajaEsperada = turno.monto_inicial + facturacionEfectivo - totalGastos
                            const diferenciaReal = (turno.monto_final || 0) - cajaEsperada

                            const isOpen = !turno.fecha_cierre
                            const isExpanded = expandedTurnoId === turno.id
                            const colorClass = isOpen ? "border-blue-200 bg-blue-50/50" : Math.abs(diferenciaReal) > 100 ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"

                            return (
                                <div key={turno.id} className={cn("border-2 rounded-lg overflow-hidden transition-all duration-300", colorClass)}>
                                    <div 
                                        className="p-3 flex justify-between items-center cursor-pointer bg-white/50"
                                        onClick={() => setExpandedTurnoId(isExpanded ? null : turno.id)}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-bold text-sm">{turno.perfiles?.nombre || "Empleado"}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{format(parseISO(turno.fecha_apertura), 'dd/MM HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isOpen ? (
                                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">EN CURSO</span>
                                            ) : (
                                                <div className="text-right">
                                                    <span className="block text-[10px] text-muted-foreground uppercase font-bold">Total Venta</span>
                                                    <span className="font-bold text-sm text-primary">{formatMoney(facturacionTotal)}</span>
                                                </div>
                                            )}
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t p-3 bg-white animate-in slide-in-from-top-2 space-y-3">
                                            
                                            {/* SECCIÓN 1: DETALLE DE CAJA */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Apertura</span>
                                                    <span className="font-mono font-bold text-lg">{formatMoney(turno.monto_inicial)}</span>
                                                </div>
                                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Cierre (Decl.)</span>
                                                    <span className="font-mono font-bold text-lg">{turno.monto_final ? formatMoney(turno.monto_final) : '---'}</span>
                                                </div>
                                            </div>

                                            {/* SECCIÓN 2: FACTURACIÓN DEL TURNO */}
                                            <div className="p-3 bg-blue-50/50 rounded border border-blue-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><Calculator className="h-3 w-3"/> Facturación Turno</span>
                                                    <span className="text-sm font-black text-blue-900">{formatMoney(facturacionTotal)}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Efectivo</span>
                                                        <span className="font-mono">{formatMoney(facturacionEfectivo)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3"/> Digital (MP/Transf)</span>
                                                        <span className="font-mono">{formatMoney(facturacionDigital)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECCIÓN 3: RESULTADO (DIFERENCIA) */}
                                            {!isOpen && (
                                                <div className={cn("p-2 rounded border flex justify-between items-center", Math.abs(diferenciaReal) > 100 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
                                                    <div>
                                                        <span className={cn("text-xs font-bold uppercase block", Math.abs(diferenciaReal) > 100 ? "text-red-700" : "text-emerald-700")}>
                                                            Diferencia Caja
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">Esperado: {formatMoney(cajaEsperada)}</span>
                                                    </div>
                                                    <span className={cn("text-xl font-black font-mono", diferenciaReal < 0 ? "text-red-600" : "text-emerald-600")}>
                                                        {diferenciaReal > 0 ? "+" : ""}{formatMoney(diferenciaReal)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* SECCIÓN 4: GASTOS */}
                                            {turno.movimientos_caja?.length > 0 && (
                                                <div className="pt-2 border-t border-dashed">
                                                    <p className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1"><TrendingDown className="h-3 w-3"/> Gastos Registrados</p>
                                                    {turno.movimientos_caja.map(m => (
                                                        <div key={m.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                                                            <span className="text-gray-600">{m.descripcion}</span>
                                                            <span className="font-mono text-red-500">-{formatMoney(m.monto)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {isOpen && (
                                                <div className="mt-2 pt-2 border-t flex justify-end">
                                                    <AsignarMision turnoId={turno.id} empleadoId={turno.empleado_id} empleadoNombre={turno.perfiles?.nombre || "Empleado"} onMisionCreated={fetchData} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )}

        {/* --- SALES (Se mantiene igual) --- */}
        {activeTab === "sales" && (/* ... Se mantiene igual ... */
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <Card className="p-6 bg-emerald-600 text-white shadow-lg border-0 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-sm mb-1">Facturación Total (Filtrada)</p>
                        <h2 className="text-4xl font-black tracking-tight">{formatMoney(totalVendido)}</h2>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 text-sm text-emerald-50 relative z-10">
                        <span className="bg-emerald-500/30 px-2 py-1 rounded-md"><Package className="h-4 w-4 inline mr-1" /> {ventasRecientes.length} operaciones</span>
                    </div>
                </Card>
                <Card className="p-5 border-2 shadow-sm">
                    <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><Wallet className="h-4 w-4" /> Desglose por Método</h3>
                    <div className="space-y-3">
                        {Object.entries(paymentBreakdown).map(([key, amount]) => {
                            if (amount === 0) return null
                            const Icon = PAYMENT_ICONS[key as keyof typeof PAYMENT_ICONS] || Wallet
                            const percentage = totalVendido > 0 ? (amount / totalVendido) * 100 : 0
                            return (
                                <div key={key}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-3 w-3 text-muted-foreground" />
                                            <span className="capitalize font-medium text-gray-700">{key.replace('_', ' ')}</span>
                                        </div>
                                        <span className="font-mono font-semibold">{formatMoney(amount)}</span>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            )
                        })}
                    </div>
                </Card>
                {chartData.length > 0 && (
                    <Card className="p-5 border-2 border-muted/40 shadow-sm">
                        <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Evolución Diaria</h3>
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
                <Card className="p-5 border-2 shadow-sm mt-4">
                    <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Top Vendidos</h3>
                    <div className="space-y-3">
                        {topProductos.map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">#{idx + 1}</div>
                                    <span className="font-medium text-sm text-foreground">{prod.name}</span>
                                </div>
                                <span className="text-sm font-bold text-muted-foreground">{prod.count} u.</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        )}

        {/* --- CATÁLOGO (Se mantiene igual) --- */}
        {activeTab === "catalog" && (
          <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500"><CrearProducto onProductCreated={() => { setActiveTab("inventory"); fetchData(); }} /></div>
        )}

        {/* --- INVENTARIO (Se mantiene igual) --- */}
        {activeTab === "inventory" && (
          <>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="text" placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 pl-12 text-base" /></div>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div> : (
              <div className="space-y-3">
                {inventarioFiltrado.map((item) => {
                    const margenInfo = getMargenInfo(item.precio_venta, item.costo)
                    return (
                        <Card key={item.id} className="p-4 flex flex-col gap-4 shadow-sm relative">
                            <div className="absolute top-2 right-2 flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-blue-600" onClick={() => setEditingProduct(item)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600" onClick={() => handleDeleteProduct(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex items-center justify-between pr-16">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji || '📦'}</span>
                                    <div>
                                        <h3 className="font-bold text-foreground text-pretty leading-tight">{item.nombre}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground">{item.categoria}</p>
                                            {item.costo > 0 && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100", margenInfo.color)}>{margenInfo.margen}% Mg.</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-primary block">{formatMoney(item.precio_venta)}</span>
                                    <button onClick={() => loadStockBatches(item.id)} className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1 hover:text-orange-600 transition-colors">
                                        Stock: <span className={(item.stock_disponible || 0) > 0 ? "text-emerald-600" : "text-destructive"}>{item.stock_disponible || 0} u.</span>
                                        <History className="h-3 w-3 ml-1" />
                                    </button>
                                </div>
                            </div>
                            <AgregarStock producto={item} onStockAdded={fetchData} />
                        </Card>
                    )
                })}
              </div>
            )}
          </>
        )}

        {/* --- ALERTAS (RIESGOS) --- */}
        {activeTab === "alerts" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-orange-50 border-l-4 border-l-orange-500 shadow-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-orange-600 mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-bold uppercase">En Riesgo (Venc.)</span></div>
                        <span className="text-2xl font-black text-gray-800">{formatMoney(capitalEnRiesgo.capital)}</span>
                        <span className="text-[10px] text-gray-500">{capitalEnRiesgo.unidades} u. &lt; 10 días</span>
                    </div>
                </Card>
                <Card className="p-4 bg-red-50 border-l-4 border-l-red-500 shadow-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-red-600 mb-1"><ShoppingBag className="h-4 w-4" /><span className="text-xs font-bold uppercase">Reponer Stock</span></div>
                        <span className="text-2xl font-black text-gray-800">{alertasStockBajo.length}</span>
                        <span className="text-[10px] text-gray-500">Prods &le; {UMBRAL_STOCK_BAJO} u.</span>
                    </div>
                </Card>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Lista Vencimientos */}
                 <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Vencimientos Próximos</h3>
                    {capitalEnRiesgo.criticos.length === 0 ? (<Card className="p-4 text-center text-muted-foreground bg-muted/20 border-dashed"><p className="text-xs">Sin riesgo de vencimiento.</p></Card>) : (
                        <div className="space-y-2">
                            {capitalEnRiesgo.criticos.map((item, idx) => (
                                <Card key={idx} className="p-2 border-l-4 border-l-orange-400 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><span className="text-xl">{item.emoji}</span><div><p className="font-bold text-xs">{item.nombre}</p><p className="text-[10px] text-orange-600 font-bold">Vence: {new Date(item.fechaVenc).toLocaleDateString()}</p></div></div>
                                    <span className="text-xs font-bold bg-white px-2 py-1 rounded border shadow-sm">{item.unidades} u.</span>
                                </Card>
                            ))}
                        </div>
                    )}
                 </div>

                 {/* Lista Stock Bajo */}
                 <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-red-600" /> Stock Crítico</h3>
                    {alertasStockBajo.length === 0 ? (<Card className="p-4 text-center text-muted-foreground bg-muted/20 border-dashed"><p className="text-xs">Stock saludable.</p></Card>) : (
                        <div className="space-y-2">
                            {alertasStockBajo.map((item) => (
                                <Card key={item.id} className="p-2 border-l-4 border-l-red-500 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><span className="text-xl">{item.emoji}</span><div><p className="font-bold text-xs">{item.nombre}</p><p className="text-[10px] text-muted-foreground">{item.categoria}</p></div></div>
                                    <div className="text-right">
                                        <span className={cn("text-xs font-bold px-2 py-1 rounded border shadow-sm", (item.stock_disponible || 0) === 0 ? "bg-red-100 text-red-700" : "bg-white text-gray-800")}>
                                            {(item.stock_disponible || 0) === 0 ? "AGOTADO" : `${item.stock_disponible} u.`}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                 </div>
             </div>
          </div>
        )}
      </div>

      <BottomNav active={activeTab === "catalog" ? "inventory" : activeTab as any} onChange={(val) => setActiveTab(val as any)} />

      {/* --- MODAL: EDICIÓN DE PRODUCTO (CON BOTÓN HISTORIAL) --- */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Editar Producto</DialogTitle></DialogHeader>
            {editingProduct && (
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1"><Label>Icono</Label><Input value={editingProduct.emoji} onChange={(e) => setEditingProduct({...editingProduct, emoji: e.target.value})} className="text-center text-2xl" /></div>
                        <div className="col-span-3"><Label>Nombre</Label><Input value={editingProduct.nombre} onChange={(e) => setEditingProduct({...editingProduct, nombre: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Categoría</Label><Input value={editingProduct.categoria} onChange={(e) => setEditingProduct({...editingProduct, categoria: e.target.value})} /></div></div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-xs font-bold text-muted-foreground">Costo Compra</Label><Input type="number" className="bg-white" value={editingProduct.costo} onChange={(e) => setEditingProduct({...editingProduct, costo: parseFloat(e.target.value)})} /></div>
                            <div><Label className="text-xs font-bold text-primary">Precio Venta</Label><Input type="number" className="bg-white font-bold" value={editingProduct.precio_venta} onChange={(e) => setEditingProduct({...editingProduct, precio_venta: parseFloat(e.target.value)})} /></div>
                        </div>
                        {editingProduct.precio_venta > 0 && (<div className={cn("text-xs flex justify-between px-2 font-medium", getMargenInfo(editingProduct.precio_venta, editingProduct.costo).color)}><span>Margen: {getMargenInfo(editingProduct.precio_venta, editingProduct.costo).margen}%</span><span>Ganancia: ${getMargenInfo(editingProduct.precio_venta, editingProduct.costo).ganancia}</span></div>)}
                    </div>
                    <div className="flex justify-start">
                         <Button variant="ghost" size="sm" onClick={() => loadPriceHistory(editingProduct.id)} className="text-xs text-primary/80 hover:bg-primary/10">
                            <Clock className="h-4 w-4 mr-1.5" /> Ver Historial de Precios
                         </Button>
                    </div>
                    <DialogFooter><Button onClick={handleSaveProduct} disabled={actionLoading} className="w-full">{actionLoading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}</Button></DialogFooter>
                </div>
            )}
        </DialogContent>
      </Dialog>
      
      {/* --- MODAL: HISTORIAL DE PRECIOS --- */}
      <Dialog open={showPriceHistoryModal} onOpenChange={setShowPriceHistoryModal}>
        <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Historial de Precios</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {historyData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No hay registros de cambios de precio para este producto.</p>
                ) : (
                    <div className="space-y-3">
                        {historyData.map((h, index) => (
                            <Card key={index} className="p-3 border-l-4 border-l-primary/50 text-sm">
                                <p className="text-xs text-muted-foreground mb-1">{format(parseISO(h.fecha_cambio), 'dd/MM/yy HH:mm')}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-bold">Venta</p>
                                        <p className="text-xs">De: {formatMoney(h.precio_venta_anterior)}</p>
                                        <p className="text-primary font-bold">A: {formatMoney(h.precio_venta_nuevo)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Costo</p>
                                        <p className="text-xs">De: {formatMoney(h.costo_anterior)}</p>
                                        <p className="text-red-600 font-bold">A: {formatMoney(h.costo_nuevo)}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter><Button onClick={() => setShowPriceHistoryModal(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: GESTIÓN DE STOCK --- */}
      <Dialog open={!!managingStockId} onOpenChange={(open) => !open && setManagingStockId(null)}>
        <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>Auditoría de Stock</DialogTitle><DialogDescription>Borra líneas específicas si hubo error de carga.</DialogDescription></DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {stockBatchList.length === 0 ? <p className="text-center text-muted-foreground py-4">No hay stock activo para este producto.</p> : 
                 stockBatchList.map(batch => (
                    <div key={batch.id} className="flex items-center justify-between p-2 border rounded bg-slate-50 text-sm">
                        <div><p className="font-bold">Ingreso: {format(parseISO(batch.created_at), 'dd/MM HH:mm')}</p>{batch.fecha_vencimiento && <p className="text-xs text-orange-600">Vence: {batch.fecha_vencimiento}</p>}</div>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteStockItem(batch.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                 ))
                }
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}