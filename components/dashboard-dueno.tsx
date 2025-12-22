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
  Repeat2, Wallet, Calendar as CalendarIcon, 
  Eye, TrendingDown, Star, User, ShoppingBag, Clock, 
  Pencil, Trash2, History, Save, ChevronDown, ChevronUp, Calculator, ScanBarcode,
  Users, Sparkles, Printer, Briefcase, Receipt, X
} from "lucide-react" 
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts" 
import CrearProducto from "@/components/crear-producto"
import { AgregarStock } from "@/components/agregar-stock"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns" 
import { es } from "date-fns/locale" 
import AsignarMision from "@/components/asignar-mision" 
import { toast } from "sonner" 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import GestionProveedores from "@/components/gestion-proveedores"
import ControlSaldoProveedor from "@/components/control-saldo-proveedor"
import { InvitarEmpleado } from "@/components/invitar-empleado"
import { generarTicketPDF } from "@/lib/generar-ticket"
import HappyHour from "@/components/happy-hour"
import TeamRanking from "@/components/team-ranking"

// --- Configuración ---
const UMBRAL_STOCK_BAJO = 5 
const UMBRAL_SALDO_BAJO = 10000 // Alerta si hay menos de $10.000 de saldo

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
    codigo_barras?: string 
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
    costo_unitario_historico?: number
    notas?: string | null
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

// Interfaz para sugerencias
interface SugerenciaCompra {
    id: string
    producto: string
    stock_actual: number
    mejor_proveedor: string | null
    mejor_precio_historico: number | null
    emoji: string
    es_saldo?: boolean // True si es alerta de dinero (Cargas)
}

const PAYMENT_ICONS: any = {
    efectivo: DollarSign,
    tarjeta: CreditCard,
    transferencia: Repeat2,
    otro: Wallet,
    billetera_virtual: Wallet, 
}

export default function DashboardDueno({ onBack }: DashboardDuenoProps) {
  // 1. Estados Globales
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "tasks" | "catalog" | "sales" | "finance" | "supervision" | "suppliers" | "team">("sales")
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
  
  // Estado Sugerencias
  const [sugerencias, setSugerencias] = useState<SugerenciaCompra[]>([])

  // 3. Modales
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [managingStockId, setManagingStockId] = useState<string | null>(null)
  const [stockBatchList, setStockBatchList] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [showSalesDetail, setShowSalesDetail] = useState(false)
  
  // 4. Historial de Precios
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<HistorialPrecio[]>([]);

  // --- HELPERS ---
  const formatMoney = (amount: number | null) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0)

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
                producto_id: item.producto_id,
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

  const getMargenInfo = (precio: number, costo: number) => {
      if (!costo || costo === 0) return { margen: 100, ganancia: precio, color: 'text-gray-400' }
      const ganancia = precio - costo
      const margen = (ganancia / costo) * 100
      return { margen: margen.toFixed(0), ganancia: ganancia.toFixed(0), color: margen < 30 ? 'text-red-600' : 'text-emerald-600' }
  }

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    // A. Inventario y Stock
    const { data: dataProductosView, error: errorProductosView } = await supabase
        .from('view_productos_con_stock') 
        .select('*')
        .order('nombre', { ascending: true })
        
    if (errorProductosView) {
        setProductos([])
    } else {
        const productosCalculados = (dataProductosView as Producto[]) || []
        setProductos(productosCalculados)

        // ✅ LÓGICA DE SUGERENCIAS CORREGIDA
        const nuevasSugerencias: SugerenciaCompra[] = []

        // 1. Productos Físicos (Excluyendo Servicios)
        const productosBajos = productosCalculados.filter(p => 
            (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && 
            !["Carga Virtual", "Carga SUBE", "Servicios"].includes(p.nombre) // <-- EXCLUIR SERVICIOS
        )

        for (const prod of productosBajos) {
            const { data: historial } = await supabase
                .from('stock')
                .select('costo_unitario_historico, proveedores(nombre)')
                .eq('producto_id', prod.id)
                .not('proveedor_id', 'is', null) 
                .order('costo_unitario_historico', { ascending: true }) 
                .limit(1)
            
            let mejorProv = null
            let mejorPrecio = null
            if (historial && historial.length > 0) {
                // @ts-ignore
                mejorProv = historial[0].proveedores?.nombre
                mejorPrecio = historial[0].costo_unitario_historico
            }

            nuevasSugerencias.push({
                id: prod.id,
                producto: prod.nombre,
                emoji: prod.emoji,
                stock_actual: prod.stock_disponible || 0,
                mejor_proveedor: mejorProv,
                mejor_precio_historico: mejorPrecio,
                es_saldo: false // Es producto físico
            })
        }

        // 2. ✅ NUEVO: Chequear Saldo de Proveedores de Servicios
        const { data: proveedoresServicios } = await supabase
            .from('proveedores')
            .select('id, nombre, saldo_actual')
            .ilike('rubro', '%servicios%') // Asegúrate que tus proveedores tengan este rubro
        
        if (proveedoresServicios) {
            proveedoresServicios.forEach(prov => {
                if ((prov.saldo_actual || 0) < UMBRAL_SALDO_BAJO) {
                    nuevasSugerencias.push({
                        id: `prov-${prov.id}`,
                        producto: `Saldo ${prov.nombre}`,
                        emoji: "💳",
                        stock_actual: prov.saldo_actual || 0, // Aquí es dinero, no unidades
                        mejor_proveedor: "Plataforma",
                        mejor_precio_historico: null,
                        es_saldo: true // Flag para mostrar como dinero
                    })
                }
            })
        }

        setSugerencias(nuevasSugerencias)
    }

    // Capital en Riesgo
    const { data: dataStock } = await supabase.from('stock').select('*, productos(nombre, precio_venta, emoji)').eq('estado', 'pendiente')
    if (dataStock) calcularMetricasStock(dataStock)

    // B. Ventas
    let ventasQuery = supabase.from('stock')
        .select('id, fecha_venta, metodo_pago, costo_unitario_historico, notas, productos(nombre, precio_venta, emoji)')
        .eq('estado', 'vendido')
        
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
  
  const matrizRentabilidad = useMemo(() => {
    if (ventasRecientes.length === 0 || productos.length === 0) return { estrellas: [], vacas: [], interrogantes: [], huesos: [] };
    const conteoVentas: Record<string, number> = {}
    ventasRecientes.forEach(v => { const nombre = v.productos?.nombre || "Desconocido"; conteoVentas[nombre] = (conteoVentas[nombre] || 0) + 1 })
    const estrellas: any[] = [], vacas: any[] = [], interrogantes: any[] = [], huesos: any[] = []    
    const totalVentas = Object.values(conteoVentas).reduce((a, b) => a + b, 0)
    const promedioVentas = totalVentas / (Object.keys(conteoVentas).length || 1)
    productos.forEach(p => {
        const ventas = conteoVentas[p.nombre] || 0
        const costo = p.costo || 1
        const margen = ((p.precio_venta - costo) / costo) * 100
        const esAltaRotacion = ventas >= promedioVentas
        const esAltoMargen = margen >= 40 
        const data = { ...p, ventas, margen: margen.toFixed(0) }
        if (esAltaRotacion && esAltoMargen) estrellas.push(data)
        else if (esAltaRotacion && !esAltoMargen) vacas.push(data)
        else if (!esAltaRotacion && esAltoMargen) interrogantes.push(data)
        else huesos.push(data)
    })
    return { estrellas, vacas, interrogantes, huesos }
  }, [ventasRecientes, productos])

  const metricasFinancieras = useMemo(() => {
    let ventaBruta = 0, costoMercaderia = 0, ventaBlanco = 0, ventaNegro = 0 
    ventasRecientes.forEach(v => {
        const precio = v.productos?.precio_venta || 0
        const costo = v.costo_unitario_historico || (precio * 0.5) 
        ventaBruta += precio; costoMercaderia += costo
        if (['tarjeta', 'transferencia', 'billetera_virtual'].includes(v.metodo_pago)) ventaBlanco += precio; else ventaNegro += precio
    })
    const gananciaNeta = ventaBruta - costoMercaderia
    const margenGeneral = ventaBruta > 0 ? (gananciaNeta / ventaBruta) * 100 : 0
    return { ventaBruta, costoMercaderia, gananciaNeta, margenGeneral, ventaBlanco, ventaNegro }
  }, [ventasRecientes])

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
        .filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && !["Carga Virtual", "Carga SUBE", "Servicios"].includes(p.nombre)) // <-- EXCLUIR SERVICIOS
        .sort((a, b) => (a.stock_disponible || 0) - (b.stock_disponible || 0))
  }, [productos])

  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecciona Rango"
    const from = format(dateRange.from, 'dd/MM', { locale: es })
    if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) return `Día: ${from}`
    const to = format(dateRange.to, 'dd/MM', { locale: es })
    return `${from} - ${to}`
  }, [dateRange])

  // ✅ FILTRO DE INVENTARIO MEJORADO
  const inventarioFiltrado = productos.filter((item) => {
    // 1. Excluir Servicios (se ven en Proveedores)
    if (["Carga Virtual", "Carga SUBE", "Servicios"].includes(item.nombre)) return false

    // 2. Filtro de búsqueda normal
    const term = searchQuery.toLowerCase()
    return item.nombre.toLowerCase().includes(term) || (item.codigo_barras && item.codigo_barras.includes(term))
  })

  // --- HANDLERS ---
  
  const handlePrintTurno = (turno: TurnoAudit, ventasTurno: VentaJoin[]) => {
      const facturacionTotal = ventasTurno.reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0)
      const facturacionEfectivo = ventasTurno.filter(v => v.metodo_pago === 'efectivo' || !v.metodo_pago).reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0)
      
      const totalGastos = turno.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0) || 0
      const totalIngresosExtra = turno.movimientos_caja?.filter(m => m.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0) || 0
      
      const cajaEsperada = turno.monto_inicial + facturacionEfectivo + totalIngresosExtra - totalGastos
      const diferencia = (turno.monto_final || 0) - cajaEsperada

      generarTicketPDF({
          empleado: turno.perfiles?.nombre || "Empleado",
          fechaApertura: format(parseISO(turno.fecha_apertura), 'dd/MM/yyyy HH:mm'),
          fechaCierre: turno.fecha_cierre ? format(parseISO(turno.fecha_cierre), 'dd/MM/yyyy HH:mm') : null,
          montoInicial: turno.monto_inicial,
          totalVentas: facturacionTotal,
          totalGastos: totalGastos,
          cajaEsperada: cajaEsperada,
          cajaReal: turno.monto_final,
          diferencia: diferencia,
          gastos: turno.movimientos_caja?.filter(m => m.tipo === 'egreso') || []
      })
      
      toast.success("PDF Generado correctamente")
  }

  const loadPriceHistory = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.from('historial_precios').select(`*, perfiles(nombre)`).eq('producto_id', productId).order('fecha_cambio', { ascending: false });
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
              nombre: editingProduct.nombre, categoria: editingProduct.categoria, precio_venta: editingProduct.precio_venta, costo: editingProduct.costo || 0, emoji: editingProduct.emoji, codigo_barras: editingProduct.codigo_barras || null
          }).eq('id', editingProduct.id)
          if (updateError) throw updateError
          const precioCambio = oldProduct.precio_venta !== editingProduct.precio_venta;
          const costoCambio = oldProduct.costo !== editingProduct.costo;
          if (precioCambio || costoCambio) {
              const { data: { user } } = await supabase.auth.getUser();
              const { error: historyError } = await supabase.from('historial_precios').insert({
                  producto_id: editingProduct.id, precio_venta_anterior: oldProduct.precio_venta, precio_venta_nuevo: editingProduct.precio_venta, costo_anterior: oldProduct.costo, costo_nuevo: editingProduct.costo, empleado_id: user?.id,
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
      if (!confirm("⚠️ ¿Estás seguro? Esto borrará el producto...")) return
      try {
          await supabase.from('stock').delete().eq('producto_id', id)
          await supabase.from('historial_precios').delete().eq('producto_id', id)
          await supabase.from('productos').delete().eq('id', id)
          toast.success("Producto eliminado")
          fetchData()
      } catch (error: any) { console.error(error); toast.error("Error al eliminar") }
  }

  const loadStockBatches = async (productId: string) => {
      setManagingStockId(productId)
      const { data } = await supabase.from('stock').select('*').eq('producto_id', productId).eq('estado', 'pendiente').order('created_at', { ascending: false })
      setStockBatchList(data || [])
  }

  const handleDeleteStockItem = async (stockId: string) => {
      try {
          await supabase.from('stock').delete().eq('id', stockId)
          toast.success("Item eliminado")
          setStockBatchList(prev => prev.filter(i => i.id !== stockId))
          fetchData() 
      } catch (error) { toast.error("Error") }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary via-primary to-chart-1 text-primary-foreground p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-primary-foreground/20 text-primary-foreground"><ArrowLeft className="h-6 w-6" /></Button>
            <div className="text-right"><h1 className="text-2xl font-bold">Torre de Control</h1><p className="text-xs text-primary-foreground/70">Responsable</p></div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <Button onClick={() => setActiveTab("sales")} variant={activeTab === "sales" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><DollarSign className="mr-2 h-4 w-4" /> Caja y Facturación</Button>
          <Button onClick={() => setActiveTab("finance")} variant={activeTab === "finance" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><TrendingUp className="mr-2 h-4 w-4" /> Rentabilidad (BI)</Button>
          <Button onClick={() => setActiveTab("supervision")} variant={activeTab === "supervision" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Eye className="mr-2 h-4 w-4" /> Supervisión</Button>
          <Button onClick={() => setActiveTab("alerts")} variant={activeTab === "alerts" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><AlertTriangle className="mr-2 h-4 w-4" /> Riesgos</Button>
          <Button onClick={() => setActiveTab("inventory")} variant={activeTab === "inventory" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Package className="mr-2 h-4 w-4" /> Stock</Button>
          <Button onClick={() => setActiveTab("catalog")} variant={activeTab === "catalog" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Plus className="mr-2 h-4 w-4" /> Catálogo</Button>
          <Button onClick={() => setActiveTab("suppliers")} variant={activeTab === "suppliers" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Users className="mr-2 h-4 w-4" /> Proveedores</Button>
          <Button onClick={() => setActiveTab("team")} variant={activeTab === "team" ? "secondary" : "default"} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm whitespace-nowrap"><Briefcase className="mr-2 h-4 w-4" /> Equipo</Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* FILTRO DE FECHA */}
        {(activeTab === "sales" || activeTab === "supervision" || activeTab === "finance") && (
             <div className="flex gap-2 items-center mb-4">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-12 text-base border-2", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-5 w-5" />{dateRangeLabel}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.to) setIsCalendarOpen(false) }} numberOfMonths={1} locale={es} /></PopoverContent>
                </Popover>
            </div>
        )}
        
        {/* PESTAÑA FINANZAS */}
        {activeTab === "finance" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-emerald-50 border-emerald-200 border-l-4">
                        <p className="text-xs font-bold uppercase text-emerald-600 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Ganancia Neta Est.</p>
                        <h3 className="text-2xl font-black text-emerald-900">{formatMoney(metricasFinancieras.gananciaNeta)}</h3>
                        <p className="text-[10px] text-emerald-700 font-medium mt-1">Margen Promedio: {metricasFinancieras.margenGeneral.toFixed(1)}%</p>
                    </Card>
                    <Card className="p-4 bg-slate-50 border-slate-200 border-l-4">
                        <p className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Estado Fiscal</p>
                        <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs"><span>Declarado</span><span className="font-bold">{formatMoney(metricasFinancieras.ventaBlanco)}</span></div>
                            <Progress value={(metricasFinancieras.ventaBlanco / (metricasFinancieras.ventaBruta || 1)) * 100} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-muted-foreground pt-1"><span>Efectivo</span><span>{formatMoney(metricasFinancieras.ventaNegro)}</span></div>
                        </div>
                    </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 border-l-4 border-l-yellow-400 bg-yellow-50/50">
                        <h3 className="font-bold text-yellow-700 flex items-center gap-2"><Star className="h-5 w-5 fill-yellow-400" /> Productos Estrella</h3>
                        <p className="text-xs text-muted-foreground mb-3">Se venden mucho y ganas bien. ¡Nunca rompas stock!</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {matrizRentabilidad.estrellas.map((p, i) => (<div key={i} className="flex justify-between text-sm bg-white p-2 rounded shadow-sm"><span>{p.emoji} {p.nombre}</span><span className="font-bold text-emerald-600">{p.margen}% Mg.</span></div>))}
                            {matrizRentabilidad.estrellas.length === 0 && <p className="text-xs italic text-center py-2">Sin datos suficientes aún.</p>}
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-gray-400 bg-gray-50/50">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Productos "Hueso"</h3>
                        <p className="text-xs text-muted-foreground mb-3">No se venden y ocupan espacio. ¡Haz una oferta o liquídalos!</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {matrizRentabilidad.huesos.slice(0, 5).map((p, i) => (<div key={i} className="flex justify-between text-sm bg-white p-2 rounded shadow-sm opacity-70"><span>{p.emoji} {p.nombre}</span><span className="text-xs font-mono">0 Ventas recientes</span></div>))}
                            {matrizRentabilidad.huesos.length > 5 && <p className="text-xs text-center mt-1">...y {matrizRentabilidad.huesos.length - 5} más.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {/* --- SUPERVISIÓN --- */}
        {activeTab === "supervision" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Historial de Turnos</h3>
                {turnosAudit.length === 0 ? <p className="text-center text-muted-foreground">Sin turnos</p> : 
                    <div className="space-y-3">
                        {turnosAudit.map((turno) => {
                            const ventasTurno = ventasRecientes.filter(v => { const fechaVenta = parseISO(v.fecha_venta); const apertura = parseISO(turno.fecha_apertura); const cierre = turno.fecha_cierre ? parseISO(turno.fecha_cierre) : new Date(); return fechaVenta >= apertura && fechaVenta <= cierre });
                            const facturacionTotal = ventasTurno.reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0);
                            const facturacionEfectivo = ventasTurno.filter(v => v.metodo_pago === 'efectivo' || !v.metodo_pago).reduce((acc, curr) => acc + (curr.productos?.precio_venta || 0), 0);
                            const facturacionDigital = facturacionTotal - facturacionEfectivo;
                            const totalGastos = turno.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0) || 0;
                            const totalIngresosExtra = turno.movimientos_caja?.filter(m => m.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0) || 0;
                            const cajaEsperada = turno.monto_inicial + facturacionEfectivo + totalIngresosExtra - totalGastos;
                            const diferenciaReal = (turno.monto_final || 0) - cajaEsperada;
                            const isOpen = !turno.fecha_cierre;
                            const isExpanded = expandedTurnoId === turno.id;
                            const colorClass = isOpen ? "border-blue-200 bg-blue-50/50" : Math.abs(diferenciaReal) > 100 ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30";

                            return (
                                <div key={turno.id} className={cn("border-2 rounded-lg overflow-hidden transition-all duration-300", colorClass)}>
                                    <div className="p-3 flex justify-between items-center cursor-pointer bg-white/50" onClick={() => setExpandedTurnoId(isExpanded ? null : turno.id)}>
                                        <div className="flex flex-col"><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-bold text-sm">{turno.perfiles?.nombre || "Empleado"}</span></div><span className="text-xs text-muted-foreground">{format(parseISO(turno.fecha_apertura), 'dd/MM HH:mm')}</span></div>
                                        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handlePrintTurno(turno, ventasTurno); }} title="Descargar PDF Cierre"><Printer className="h-4 w-4" /></Button>{isOpen ? (<span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">EN CURSO</span>) : (<div className="text-right"><span className="block text-[10px] text-muted-foreground uppercase font-bold">Total Venta</span><span className="font-bold text-sm text-primary">{formatMoney(facturacionTotal)}</span></div>)}{isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}</div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t p-3 bg-white animate-in slide-in-from-top-2 space-y-3">
                                            <div className="grid grid-cols-2 gap-3 text-sm"><div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Apertura</span><span className="font-mono font-bold text-lg">{formatMoney(turno.monto_inicial)}</span></div><div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Cierre (Decl.)</span><span className="font-mono font-bold text-lg">{turno.monto_final ? formatMoney(turno.monto_final) : '---'}</span></div></div>
                                            <div className="p-3 bg-blue-50/50 rounded border border-blue-100"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-blue-800 flex items-center gap-1"><Calculator className="h-3 w-3"/> Facturación Turno</span><span className="text-sm font-black text-blue-900">{formatMoney(facturacionTotal)}</span></div><div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Efectivo (Stock)</span><span className="font-mono">{formatMoney(facturacionEfectivo)}</span></div><div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3"/> Digital (MP/Transf)</span><span className="font-mono">{formatMoney(facturacionDigital)}</span></div></div></div>
                                            {totalIngresosExtra > 0 && (<div className="pt-2 border-t border-dashed"><p className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Ingresos Extra / Servicios</p>{turno.movimientos_caja?.filter(m => m.tipo === 'ingreso').map(m => (<div key={m.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0"><span className="text-gray-600">{m.descripcion}</span><span className="font-mono text-emerald-500">+{formatMoney(m.monto)}</span></div>))}<div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-gray-100"><span>Total Extra:</span><span>{formatMoney(totalIngresosExtra)}</span></div></div>)}
                                            {!isOpen && (<div className={cn("p-2 rounded border flex justify-between items-center", Math.abs(diferenciaReal) > 100 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}><div><span className={cn("text-xs font-bold uppercase block", Math.abs(diferenciaReal) > 100 ? "text-red-700" : "text-emerald-700")}>Diferencia Caja</span><span className="text-[10px] text-muted-foreground">Esperado: {formatMoney(cajaEsperada)}</span></div><span className={cn("text-xl font-black font-mono", diferenciaReal < 0 ? "text-red-600" : "text-emerald-600")}>{diferenciaReal > 0 ? "+" : ""}{formatMoney(diferenciaReal)}</span></div>)}
                                            {turno.movimientos_caja?.some(m => m.tipo === 'egreso') && (<div className="pt-2 border-t border-dashed"><p className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1"><TrendingDown className="h-3 w-3"/> Gastos Registrados</p>{turno.movimientos_caja.filter(m => m.tipo === 'egreso').map(m => (<div key={m.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0"><span className="text-gray-600">{m.descripcion}</span><span className="font-mono text-red-500">-{formatMoney(m.monto)}</span></div>))}</div>)}
                                            {isOpen && (<div className="mt-2 pt-2 border-t flex justify-end"><AsignarMision turnoId={turno.id} empleadoId={turno.empleado_id} empleadoNombre={turno.perfiles?.nombre || "Empleado"} onMisionCreated={fetchData} /></div>)}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                }
            </div>
        )}

        {/* --- SALES --- */}
        {activeTab === "sales" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <Card className="p-6 bg-emerald-600 text-white shadow-lg border-0 relative overflow-hidden"><div className="relative z-10"><p className="text-emerald-100 font-medium text-sm mb-1">Facturación Total (Filtrada)</p><h2 className="text-4xl font-black tracking-tight">{formatMoney(totalVendido)}</h2></div><div className="mt-4 pt-4 border-t border-white/20 text-sm text-emerald-50 relative z-10 flex justify-between items-center"><span className="flex items-center gap-1"><Package className="h-4 w-4" /> {ventasRecientes.length} operaciones</span><Button variant="secondary" size="sm" className="text-emerald-800 bg-white hover:bg-emerald-50 h-7 text-xs font-bold" onClick={() => setShowSalesDetail(true)}>Ver Detalle 🔎</Button></div></Card>
                <Card className="p-5 border-2 shadow-sm"><h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><Wallet className="h-4 w-4" /> Desglose por Método</h3><div className="space-y-3">{Object.entries(paymentBreakdown).map(([key, amount]) => { if (amount === 0) return null; const Icon = PAYMENT_ICONS[key as keyof typeof PAYMENT_ICONS] || Wallet; const percentage = totalVendido > 0 ? (amount / totalVendido) * 100 : 0; return (<div key={key}><div className="flex justify-between text-sm mb-1"><div className="flex items-center gap-2"><Icon className="h-3 w-3 text-muted-foreground" /><span className="capitalize font-medium text-gray-700">{key.replace('_', ' ')}</span></div><span className="font-mono font-semibold">{formatMoney(amount)}</span></div><Progress value={percentage} className="h-2" /></div>) })}</div></Card>
                {chartData.length > 0 && (<Card className="p-5 border-2 border-muted/40 shadow-sm"><h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Evolución Diaria</h3><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280'}} dy={10} /><Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/><Bar dataKey="total" fill="oklch(0.5 0.2 250)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>)}
                <Card className="p-5 border-2 shadow-sm mt-4"><h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Top Vendidos</h3><div className="space-y-3">{topProductos.map((prod, idx) => (<div key={idx} className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">#{idx + 1}</div><span className="font-medium text-sm text-foreground">{prod.name}</span></div><span className="text-sm font-bold text-muted-foreground">{prod.count} u.</span></div>))}</div></Card>
            </div>
        )}

        {/* --- CATÁLOGO --- */}
        {activeTab === "catalog" && (<div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500"><CrearProducto onProductCreated={() => { setActiveTab("inventory"); fetchData(); }} /></div>)}

        {/* --- PROVEEDORES (AHORA CON GESTIÓN DE SALDOS) --- */}
        {activeTab === "suppliers" && (
            <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* 1. Control de Saldos (Nuevo) */}
                <ControlSaldoProveedor />
                
                {/* 2. Gestión General */}
                <GestionProveedores />
            </div>
        )}
        
        {/* ✅ PESTAÑA EQUIPO */}
        {activeTab === "team" && (
            <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                 
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-lg border">
                    <div>
                        <h3 className="font-bold text-gray-800">Ranking y Objetivos</h3>
                        <p className="text-sm text-gray-500">Motiva a tu equipo asignando tareas.</p>
                    </div>
                    <AsignarMision onMisionCreated={fetchData} />
                 </div>

                 <TeamRanking />

                 <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" /> Gestión de Accesos
                    </h3>
                    <InvitarEmpleado />
                 </div>
            </div>
        )}

        {/* --- INVENTARIO --- */}
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
              <HappyHour criticos={capitalEnRiesgo.criticos} onDiscountApplied={fetchData} />

              {/* ✅ TARJETA SUGERENCIAS DE COMPRA MEJORADA */}
              {sugerencias.length > 0 && (
                  <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg p-4">
                     <h3 className="flex items-center gap-2 font-bold mb-3">
                         <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" /> Sugerencias de Compra 🧠
                     </h3>
                     <div className="space-y-2">
                         {sugerencias.map(sug => (
                             <div key={sug.id} className="bg-white/10 backdrop-blur-sm p-2 rounded-lg flex items-center justify-between text-sm">
                                 <div className="flex items-center gap-2">
                                     <span>{sug.emoji}</span>
                                     <div>
                                         <p className="font-bold">{sug.producto}</p>
                                         <p className="text-[10px] text-violet-200">
                                             {/* ✅ MOSTRAR SALDO O UNIDADES */}
                                             {sug.es_saldo ? "Saldo actual:" : "Quedan:"} 
                                             <span className="font-bold ml-1 text-white">
                                                {sug.es_saldo ? formatMoney(sug.stock_actual) : `${sug.stock_actual} u.`}
                                             </span>
                                         </p>
                                         {sug.es_saldo && <span className="text-[9px] bg-red-500/80 px-1 rounded text-white font-bold ml-1">SALDO BAJO</span>}
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     {sug.mejor_proveedor ? (
                                         <>
                                             <p className="text-[10px] font-bold text-yellow-300 uppercase">Mejor Precio</p>
                                             {sug.mejor_precio_historico && <p className="font-bold">{formatMoney(sug.mejor_precio_historico)}</p>}
                                             <p className="text-[10px] truncate max-w-[80px]">{sug.mejor_proveedor}</p>
                                         </>
                                     ) : (
                                         <span className="text-[10px] text-white/50 italic">Sin historial</span>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                  </Card>
              )}

              {/* ... (Resto de alertas igual) ... */}
              <div className="grid grid-cols-2 gap-4">
                 <Card className="p-4 bg-orange-50 border-l-4 border-l-orange-500 shadow-sm"><div className="flex flex-col"><div className="flex items-center gap-2 text-orange-600 mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-bold uppercase">En Riesgo (Venc.)</span></div><span className="text-2xl font-black text-gray-800">{formatMoney(capitalEnRiesgo.capital)}</span><span className="text-[10px] text-gray-500">{capitalEnRiesgo.unidades} u. &lt; 10 días</span></div></Card>
                 <Card className="p-4 bg-red-50 border-l-4 border-l-red-500 shadow-sm"><div className="flex flex-col"><div className="flex items-center gap-2 text-red-600 mb-1"><ShoppingBag className="h-4 w-4" /><span className="text-xs font-bold uppercase">Reponer Stock</span></div><span className="text-2xl font-black text-gray-800">{alertasStockBajo.length}</span><span className="text--[10px] text-gray-500">Prods &le; {UMBRAL_STOCK_BAJO} u.</span></div></Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Vencimientos Próximos</h3>{capitalEnRiesgo.criticos.length === 0 ? (<Card className="p-4 text-center text-muted-foreground bg-muted/20 border-dashed"><p className="text-xs">Sin riesgo de vencimiento.</p></Card>) : (<div className="space-y-2">{capitalEnRiesgo.criticos.map((item, idx) => (<Card key={idx} className="p-2 border-l-4 border-l-orange-400 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xl">{item.emoji}</span><div><p className="font-bold text-xs">{item.nombre}</p><p className="text-[10px] text-orange-600 font-bold">Vence: {new Date(item.fechaVenc).toLocaleDateString()}</p></div></div><span className="text-xs font-bold bg-white px-2 py-1 rounded border shadow-sm">{item.unidades} u.</span></Card>))}</div>)}</div>
                  <div><h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-red-600" /> Stock Crítico</h3>{alertasStockBajo.length === 0 ? (<Card className="p-4 text-center text-muted-foreground bg-muted/20 border-dashed"><p className="text-xs">Stock saludable.</p></Card>) : (<div className="space-y-2">{alertasStockBajo.map((item) => (<Card key={item.id} className="p-2 border-l-4 border-l-red-500 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xl">{item.emoji}</span><div><p className="font-bold text-xs">{item.nombre}</p><p className="text-[10px] text-muted-foreground">{item.categoria}</p></div></div><div className="text-right"><span className={cn("text-xs font-bold px-2 py-1 rounded border shadow-sm", (item.stock_disponible || 0) === 0 ? "bg-red-100 text-red-700" : "bg-white text-gray-800")}>{(item.stock_disponible || 0) === 0 ? "AGOTADO" : `${item.stock_disponible} u.`}</span></div></Card>))}</div>)}</div>
              </div>
          </div>
        )}
      </div>

      {/* --- MODALES --- */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Editar Producto</DialogTitle></DialogHeader>
            {editingProduct && (
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1"><Label>Icono</Label><Input value={editingProduct.emoji} onChange={(e) => setEditingProduct({...editingProduct, emoji: e.target.value})} className="text-center text-2xl" /></div>
                        <div className="col-span-3"><Label>Nombre</Label><Input value={editingProduct.nombre} onChange={(e) => setEditingProduct({...editingProduct, nombre: e.target.value})} /></div>
                    </div>
                    <div><Label className="flex items-center gap-2 mb-1"><ScanBarcode className="h-4 w-4" /> Código de Barras</Label><Input value={editingProduct.codigo_barras || ''} placeholder="Escanear o escribir..." onChange={(e) => setEditingProduct({...editingProduct, codigo_barras: e.target.value})} /><p className="text-[10px] text-muted-foreground mt-1">Si tienes el lector USB conectado, haz clic y escanea.</p></div>
                    <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Categoría</Label><Input value={editingProduct.categoria} onChange={(e) => setEditingProduct({...editingProduct, categoria: e.target.value})} /></div></div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3"><div className="grid grid-cols-2 gap-4"><div><Label className="text-xs font-bold text-muted-foreground">Costo Compra</Label><Input type="number" className="bg-white" value={editingProduct.costo} onChange={(e) => setEditingProduct({...editingProduct, costo: parseFloat(e.target.value)})} /></div><div><Label className="text-xs font-bold text-primary">Precio Venta</Label><Input type="number" className="bg-white font-bold" value={editingProduct.precio_venta} onChange={(e) => setEditingProduct({...editingProduct, precio_venta: parseFloat(e.target.value)})} /></div></div>{editingProduct.precio_venta > 0 && (<div className={cn("text-xs flex justify-between px-2 font-medium", getMargenInfo(editingProduct.precio_venta, editingProduct.costo).color)}><span>Margen: {getMargenInfo(editingProduct.precio_venta, editingProduct.costo).margen}%</span><span>Ganancia: ${getMargenInfo(editingProduct.precio_venta, editingProduct.costo).ganancia}</span></div>)}</div>
                    <div className="flex justify-start"><Button variant="ghost" size="sm" onClick={() => loadPriceHistory(editingProduct.id)} className="text-xs text-primary/80 hover:bg-primary/10"><Clock className="h-4 w-4 mr-1.5" /> Ver Historial de Precios</Button></div>
                    <DialogFooter><Button onClick={handleSaveProduct} disabled={actionLoading} className="w-full">{actionLoading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}</Button></DialogFooter>
                </div>
            )}
        </DialogContent>
      </Dialog>
      <Dialog open={showSalesDetail} onOpenChange={setShowSalesDetail}>
        <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2 text-emerald-800"><Receipt className="h-5 w-5" /> Detalle de Operaciones</DialogTitle><DialogDescription>Listado de todas las ventas en el rango seleccionado.</DialogDescription></DialogHeader><div className="flex-1 overflow-y-auto pr-1">{ventasRecientes.length === 0 ? (<div className="py-10 text-center text-muted-foreground"><Search className="h-10 w-10 mx-auto opacity-20 mb-2" /><p>No hay ventas registradas en este periodo.</p></div>) : (<div className="space-y-2">{ventasRecientes.map((venta) => { const Icon = PAYMENT_ICONS[venta.metodo_pago as keyof typeof PAYMENT_ICONS] || Wallet; return (<div key={venta.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm"><div className="flex items-center gap-3"><span className="text-lg">{venta.productos?.emoji || '📦'}</span><div><p className="font-bold text-gray-800 line-clamp-1">{venta.productos?.nombre || 'Producto eliminado'}</p>{venta.notas && (<p className="text-xs font-bold text-indigo-600 mb-0.5 animate-in fade-in">{venta.notas}</p>)}<p className="text-[10px] text-muted-foreground flex items-center gap-1">{format(parseISO(venta.fecha_venta), 'dd/MM HH:mm')} <span className="text-slate-300">•</span><Icon className="h-3 w-3" /> <span className="capitalize">{venta.metodo_pago?.replace('_', ' ')}</span></p></div></div><div className="text-right"><p className="font-bold text-emerald-600">{formatMoney(venta.productos?.precio_venta || 0)}</p></div></div>) })}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setShowSalesDetail(false)}>Cerrar</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={showPriceHistoryModal} onOpenChange={setShowPriceHistoryModal}><DialogContent className="max-h-[80vh] flex flex-col"><DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Historial de Precios</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto pr-2 space-y-2">{historyData.length === 0 ? (<p className="text-center text-muted-foreground py-4">No hay registros de cambios de precio para este producto.</p>) : (<div className="space-y-3">{historyData.map((h, index) => (<Card key={index} className="p-3 border-l-4 border-l-primary/50 text-sm"><p className="text-xs text-muted-foreground mb-1">{format(parseISO(h.fecha_cambio), 'dd/MM/yy HH:mm')}</p><div className="grid grid-cols-2 gap-4"><div><p className="font-bold">Venta</p><p className="text-xs">De: {formatMoney(h.precio_venta_anterior)}</p><p className="text-primary font-bold">A: {formatMoney(h.precio_venta_nuevo)}</p></div><div><p className="font-bold">Costo</p><p className="text-xs">De: {formatMoney(h.costo_anterior)}</p><p className="text-red-600 font-bold">A: {formatMoney(h.costo_nuevo)}</p></div></div></Card>))}</div>)}</div><DialogFooter><Button onClick={() => setShowPriceHistoryModal(false)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!managingStockId} onOpenChange={(open) => !open && setManagingStockId(null)}><DialogContent className="max-h-[80vh] flex flex-col"><DialogHeader><DialogTitle>Auditoría de Stock</DialogTitle><DialogDescription>Borra líneas específicas si hubo error de carga.</DialogDescription></DialogHeader><div className="flex-1 overflow-y-auto pr-2 space-y-2">{stockBatchList.length === 0 ? <p className="text-center text-muted-foreground py-4">No hay stock activo para este producto.</p> : stockBatchList.map(batch => (<div key={batch.id} className="flex items-center justify-between p-2 border rounded bg-slate-50 text-sm"><div><p className="font-bold">Ingreso: {format(parseISO(batch.created_at), 'dd/MM HH:mm')}</p>{batch.fecha_vencimiento && <p className="text-xs text-orange-600">Vence: {batch.fecha_vencimiento}</p>}</div><Button size="sm" variant="destructive" onClick={() => handleDeleteStockItem(batch.id)}><Trash2 className="h-4 w-4" /></Button></div>))}</div></DialogContent></Dialog>
    </div>
  )
}