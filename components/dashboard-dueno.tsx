"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, AlertTriangle, TrendingUp, Package, Search, Plus, 
  Loader2, ShieldCheck, DollarSign, CreditCard, 
  Repeat2, Wallet, Calendar as CalendarIcon, 
  Eye, TrendingDown, Star, User, ShoppingBag, Clock, 
  Pencil, Trash2, History, Save, ChevronDown, ChevronUp, Calculator, ScanBarcode,
  Users, Sparkles, Printer, Briefcase, Receipt, X, MapPin, Settings, ChevronRight,
  ArrowDownRight, QrCode, AlertCircle
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import GestionProveedores from "@/components/gestion-proveedores"
import ControlSaldoProveedor from "@/components/control-saldo-proveedor"
import { InvitarEmpleado } from "@/components/invitar-empleado"
import { generarTicketPDF } from "@/lib/generar-ticket"
import HappyHour from "@/components/happy-hour"
import TeamRanking from "@/components/team-ranking"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import GestionSucursales from "@/components/gestion-sucursales"
import GenerarQRFichaje from "@/components/generar-qr-fichaje"
import RegistrarMovimiento from "@/components/registrar-movimientos"

const UMBRAL_STOCK_BAJO = 5 
const UMBRAL_SALDO_BAJO = 10000 

interface DashboardDuenoProps {
  onBack: () => void
  sucursalId: string 
}

interface MetricaStock {
  capital: number
  unidades: number
  criticos: any[]
}

interface Producto {
    id: string
    nombre: string
    categoria: string | null
    precio_venta: number
    costo: number
    emoji: string | null
    codigo_barras?: string | null
    stock_disponible?: number
}

interface HistorialPrecio {
    fecha_cambio: string;
    precio_venta_anterior: number;
    precio_venta_nuevo: number;
    costo_anterior: number;
    costo_nuevo: number;
    perfiles?: { nombre: string };
}

interface VentaJoin {
    id: string
    fecha_venta: string
    metodo_pago: string
    precio_venta_historico?: number
    costo_unitario_historico?: number
    notas?: string | null
    cantidad: number 
    productos: { nombre: string; precio_venta: number; emoji: string } | null 
    caja_diaria_id?: string //
}

interface PaymentBreakdown {
  efectivo: number
  tarjeta: number
  transferencia: number
  otro: number
  billetera_virtual: number
}

interface TurnoAudit {
  id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_inicial: number
  monto_final: number | null
  empleado_id: string
  sucursal_id: string
  perfiles: { nombre: string } | null 
  misiones: any[]
  movimientos_caja: any[]
}

interface AsistenciaRecord {
    id: string
    entrada: string
    salida: string | null
    empleado_id: string
    perfiles: { nombre: string } | null
    sucursal_id: string
}

export default function DashboardDueno({ onBack, sucursalId }: DashboardDuenoProps) {
  const [currentSucursalId, setCurrentSucursalId] = useState(sucursalId)
  const [organizationId, setOrganizationId] = useState<string>("")
  const [sucursales, setSucursales] = useState<{id: string, nombre: string}[]>([])

  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "catalog" | "sales" | "finance" | "supervision" | "suppliers" | "team">("sales")
  const [supervisionTab, setSupervisionTab] = useState<"cajas" | "asistencia">("cajas")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const [productos, setProductos] = useState<Producto[]>([])
  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [ventasRecientes, setVentasRecientes] = useState<VentaJoin[]>([])
  const [totalVendido, setTotalVendido] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
      efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 
  })
  const [topProductos, setTopProductos] = useState<{name: string, count: number}[]>([])
  const [turnosAudit, setTurnosAudit] = useState<TurnoAudit[]>([])
  const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([])
  const [expandedTurnoId, setExpandedTurnoId] = useState<string | null>(null)
  const [sugerencias, setSugerencias] = useState<any[]>([])

  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [managingStockId, setManagingStockId] = useState<string | null>(null)
  const [stockBatchList, setStockBatchList] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [showSalesDetail, setShowSalesDetail] = useState(false)
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<HistorialPrecio[]>([])

  const formatMoney = (amount: number | null) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0)

  const fetchContext = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single()
    if(!perfil?.organization_id) return
    setOrganizationId(perfil.organization_id)

    const { data } = await supabase.from('sucursales').select('id, nombre').eq('organization_id', perfil.organization_id).order('created_at')
    if(data) setSucursales(data)
  }, [])

  useEffect(() => { fetchContext() }, [fetchContext])

  const fetchData = useCallback(async () => {
    if (!currentSucursalId || !organizationId) return

    const { data: cat } = await supabase.from('productos').select('*').eq('organization_id', organizationId).order('nombre')
    const { data: stk } = await supabase.from('view_productos_con_stock').select('id, stock_disponible').eq('sucursal_id', currentSucursalId)

    if (cat) {
        const fusion = cat.map(p => ({ ...p, stock_disponible: stk?.find(s => s.id === p.id)?.stock_disponible || 0 }))
        setProductos(fusion)
        const bajas = fusion.filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && p.categoria !== "Servicios")
        const sugs = []
        for (const p of bajas) {
             const { data: h } = await supabase.from('stock').select('costo_unitario_historico, proveedores(nombre)').eq('producto_id', p.id).not('proveedor_id', 'is', null).order('created_at', { ascending: false }).limit(1)
             sugs.push({ id: p.id, producto: p.nombre, emoji: p.emoji, stock_actual: p.stock_disponible, mejor_proveedor: h?.[0]?.proveedores ? (h[0].proveedores as any).nombre : null, mejor_precio: h?.[0]?.costo_unitario_historico })
        }
        setSugerencias(sugs)
    }

    let vQ = supabase.from('stock').select('*, productos(nombre, precio_venta, emoji)').eq('sucursal_id', currentSucursalId).eq('tipo_movimiento', 'salida')
    if (dateRange?.from) vQ = vQ.gte('fecha_venta', dateRange.from.toISOString())
    if (dateRange?.to) vQ = vQ.lte('fecha_venta', dateRange.to.toISOString())
    
    const { data: vData } = await vQ.order('fecha_venta', { ascending: false }).returns<VentaJoin[]>()
    if (vData) {
        setVentasRecientes(vData)
        const brk: PaymentBreakdown = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 }
        let tot = 0
        const counts: Record<string, number> = {}
        vData.forEach(v => {
            const val = (v.precio_venta_historico || v.productos?.precio_venta || 0) * (v.cantidad || 1)
            tot += val
            const m = (v.metodo_pago || 'efectivo') as keyof PaymentBreakdown
            brk[brk.hasOwnProperty(m) ? m : 'otro'] += val
            counts[v.productos?.nombre || "Varios"] = (counts[v.productos?.nombre || "Varios"] || 0) + (v.cantidad || 1)
        })
        setTotalVendido(tot)
        setPaymentBreakdown(brk)
        setTopProductos(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5))
    }

    let cQ = supabase.from('caja_diaria').select(`*, perfiles(nombre), misiones(*), movimientos_caja(*)`).eq('sucursal_id', currentSucursalId)
    if (dateRange?.from) cQ = cQ.gte('fecha_apertura', dateRange.from.toISOString())
    if (dateRange?.to) cQ = cQ.lte('fecha_apertura', dateRange.to.toISOString())
    const { data: cData } = await cQ.order('fecha_apertura', { ascending: false }).returns<TurnoAudit[]>()
    setTurnosAudit(cData || [])

    let aQ = supabase.from('asistencia').select('*, perfiles(nombre)').eq('sucursal_id', currentSucursalId)
    if (dateRange?.from) aQ = aQ.gte('entrada', dateRange.from.toISOString())
    if (dateRange?.to) aQ = aQ.lte('entrada', dateRange.to.toISOString())
    const { data: aData } = await aQ.order('entrada', { ascending: false }).limit(50)
    if (aData) setAsistencias(aData as unknown as AsistenciaRecord[])

    const { data: stkRiesgo } = await supabase.from('stock').select('*, productos(nombre, precio_venta, emoji)').eq('sucursal_id', currentSucursalId).eq('tipo_movimiento', 'entrada').eq('estado', 'disponible')
    if (stkRiesgo) {
        const hoy = new Date(); const limite = new Date(); limite.setDate(hoy.getDate() + 10)
        let cap = 0, units = 0; const crit: any[] = []
        stkRiesgo.forEach(i => {
            const vDate = i.fecha_vencimiento ? new Date(i.fecha_vencimiento) : null
            if (vDate && vDate <= limite) {
                cap += (i.productos?.precio_venta || 0) * (i.cantidad || 1)
                units += (i.cantidad || 1)
                crit.push({ ...i, nombre: i.productos?.nombre, emoji: i.productos?.emoji })
            }
        })
        setCapitalEnRiesgo({ capital: cap, unidades: units, criticos: crit.sort((a,b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()) })
    }
  }, [currentSucursalId, organizationId, dateRange])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const biMetrics = useMemo(() => {
    let bruto = 0, costo = 0, blanco = 0
    ventasRecientes.forEach(v => {
        const cant = v.cantidad || 1
        bruto += (v.precio_venta_historico || v.productos?.precio_venta || 0) * cant
        costo += (v.costo_unitario_historico || 0) * cant
        if (['tarjeta', 'transferencia', 'billetera_virtual'].includes(v.metodo_pago)) blanco += (v.precio_venta_historico || v.productos?.precio_venta || 0) * cant
    })

    // Integrar movimientos manuales para Utilidad Neta real
    let manualIngresos = 0
    let manualEgresos = 0
    turnosAudit.forEach(t => {
        t.movimientos_caja?.forEach(m => {
            if (m.tipo === 'ingreso') manualIngresos += m.monto
            else if (m.tipo === 'egreso') manualEgresos += m.monto
        })
    })

    const neta = (bruto - costo) + manualIngresos - manualEgresos
    return { bruto, neta, margen: bruto > 0 ? ((bruto - costo) / bruto) * 100 : 0, blanco, negro: bruto - blanco }
  }, [ventasRecientes, turnosAudit])

  const matrizRentabilidad = useMemo(() => {
    const stars: any[] = [], bones: any[] = []
    productos.forEach(p => {
        const sales = ventasRecientes.filter(v => v.productos?.nombre === p.nombre).reduce((acc, curr) => acc + (curr.cantidad || 1), 0)
        const marg = p.costo > 0 ? ((p.precio_venta - p.costo) / p.costo) * 100 : 0
        if (sales > 5 && marg > 40) stars.push({ ...p, sales, marg: marg.toFixed(0) })
        else if (sales === 0) bones.push(p)
    })
    return { stars: stars.sort((a,b) => b.sales - a.sales), bones: bones.slice(0, 10) }
  }, [ventasRecientes, productos])

  const chartData = useMemo(() => {
    const map: Record<string, number> = {}
    ventasRecientes.slice().reverse().forEach(v => {
        const k = format(parseISO(v.fecha_venta), 'dd/MM')
        map[k] = (map[k] || 0) + (v.precio_venta_historico || v.productos?.precio_venta || 0) * (v.cantidad || 1)
    })
    return Object.entries(map).map(([fecha, total]) => ({ fecha, total }))
  }, [ventasRecientes])

  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Filtro de Fecha"
    const from = format(dateRange.from, 'dd/MM', { locale: es })
    if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) return `Día: ${from}`
    const to = format(dateRange.to, 'dd/MM', { locale: es })
    return `${from} - ${to}`
  }, [dateRange])

  const handleUpdateProduct = async () => {
    if (!editingProduct) return; setActionLoading(true)
    try {
        const { data: old } = await supabase.from('productos').select('precio_venta, costo').eq('id', editingProduct.id).single()
        await supabase.from('productos').update({ 
            nombre: editingProduct.nombre, precio_venta: editingProduct.precio_venta, costo: editingProduct.costo, 
            categoria: editingProduct.categoria, emoji: editingProduct.emoji, codigo_barras: editingProduct.codigo_barras || null 
        }).eq('id', editingProduct.id)
        
        if (old?.precio_venta !== editingProduct.precio_venta || old?.costo !== editingProduct.costo) {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('historial_precios').insert({
                organization_id: organizationId, producto_id: editingProduct.id, 
                precio_venta_anterior: old?.precio_venta, precio_venta_nuevo: editingProduct.precio_venta,
                costo_anterior: old?.costo, costo_nuevo: editingProduct.costo, empleado_id: user?.id, fecha_cambio: new Date().toISOString()
            })
        }
        toast.success("Producto actualizado"); setEditingProduct(null); fetchData()
    } catch (e: any) { toast.error(e.message) } finally { setActionLoading(false) }
  }

  const loadPriceHistory = async (pid: string) => {
    setLoading(true)
    const { data } = await supabase.from('historial_precios').select('*, perfiles(nombre)').eq('producto_id', pid).order('fecha_cambio', { ascending: false })
    setHistoryData(data as any || [])
    setShowPriceHistoryModal(true); setLoading(false)
  }

  const loadStockBatches = async (pid: string) => {
    setManagingStockId(pid)
    const { data } = await supabase.from('stock').select('*').eq('producto_id', pid).eq('tipo_movimiento', 'entrada').eq('sucursal_id', currentSucursalId).order('created_at', { ascending: false })
    setStockBatchList(data || [])
  }

  const handlePrintTurno = (t: TurnoAudit) => {
    const vT = ventasRecientes.filter(v => {
        const fV = parseISO(v.fecha_venta); 
        const fA = parseISO(t.fecha_apertura); 
        const fC = t.fecha_cierre ? parseISO(t.fecha_cierre) : new Date()
        return fV >= fA && fV <= fC
    })
    
    const totE = vT.filter(v => v.metodo_pago === 'efectivo').reduce((acc, curr) => acc + (curr.precio_venta_historico || curr.productos?.precio_venta || 0) * (curr.cantidad || 1), 0)
    const gast = t.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((a,b) => a + b.monto, 0) || 0
    const extra = t.movimientos_caja?.filter(m => m.tipo === 'ingreso').reduce((a,b) => a + b.monto, 0) || 0
    const esp = t.monto_inicial + totE + extra - gast

    generarTicketPDF({
        empleado: t.perfiles?.nombre || "Empleado", 
        fechaApertura: format(parseISO(t.fecha_apertura), 'dd/MM/yyyy HH:mm'),
        fechaCierre: t.fecha_cierre ? format(parseISO(t.fecha_cierre), 'dd/MM/yyyy HH:mm') : null,
        montoInicial: t.monto_inicial,
        totalVentasEfectivo: totE,
        totalIngresos: extra,
        totalGastos: gast,
        cajaEsperada: esp,
        cajaReal: t.monto_final,
        diferencia: t.monto_final !== null ? t.monto_final - esp : null,
        gastos: t.movimientos_caja || []
    })
    toast.success("Ticket generado")
  }

  const inventarioFiltrado = productos.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigo_barras?.includes(searchQuery))

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 text-white p-6 rounded-b-[3rem] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></Button>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 border border-white/10 backdrop-blur-md">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <Select value={currentSucursalId} onValueChange={setCurrentSucursalId}>
                        <SelectTrigger className="h-7 w-[150px] border-0 bg-transparent p-0 text-xs font-bold focus:ring-0">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Dialog>
                    <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/20"><Settings className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Configuración de Sucursales</DialogTitle></DialogHeader><GestionSucursales onUpdate={fetchContext} /></DialogContent>
                </Dialog>
            </div>
        </div>
        <div className="flex justify-between items-end">
            <div><h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">Torre de Control <Sparkles className="h-5 w-5 text-yellow-400" /></h1><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Panel Administrativo Global</p></div>
            <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Capital Stock</p>
                {/* Corrección Capital Stock: filtrar servicios y stock huerfano */}
                <p className="text-xl font-black text-emerald-400">
                    {formatMoney(productos.filter(p => p.categoria !== "Servicios" && (p.stock_disponible || 0) > 0).reduce((a,b) => a + (b.costo * (b.stock_disponible || 0)), 0))}
                </p>
            </div>
        </div>
        <div className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "sales", label: "Caja y Ventas", icon: DollarSign },
            { id: "inventory", label: "Stock", icon: Package },
            { id: "finance", label: "Panel de Utilidades", icon: TrendingUp },
            { id: "supervision", label: "Supervisión 360°", icon: Eye },
            { id: "catalog", label: "Alta de Catálogo", icon: Plus },
            { id: "suppliers", label: "Proveedores", icon: Users },
            { id: "team", label: "Mi Equipo", icon: Briefcase },
            { id: "alerts", label: "Advertencias de Stock", icon: AlertTriangle },
          ].map(t => (
            <Button key={t.id} onClick={() => setActiveTab(t.id as any)} variant={activeTab === t.id ? "secondary" : "ghost"} size="sm" className="rounded-full text-xs font-bold whitespace-nowrap"><t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}</Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {["sales", "supervision", "finance"].includes(activeTab) && (
            <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start h-14 border-2 shadow-sm bg-white font-black text-slate-700"><CalendarIcon className="mr-2 h-5 w-5 text-primary" /> {dateRangeLabel.toUpperCase()}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center"><Calendar mode="range" selected={dateRange} onSelect={r => { setDateRange(r); if(r?.to) setIsCalendarOpen(false) }} locale={es} /></PopoverContent>
            </Popover>
        )}

        {activeTab === "sales" && (
            <div className="space-y-4">
                <Card className="p-8 bg-gradient-to-br from-blue-600 to-indigo-800 text-white border-0 shadow-xl relative overflow-hidden"><p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Facturación Sucursal</p><h2 className="text-5xl font-black">{formatMoney(totalVendido)}</h2><div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10"><span className="text-xs font-bold text-blue-100 flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" /> {ventasRecientes.length} tickets emitidos</span><Button variant="secondary" size="sm" className="font-black text-[10px]" onClick={() => setShowSalesDetail(true)}>AUDITAR OPERACIONES</Button></div></Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5 border-2 shadow-sm"><h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Ingresos por Método</h3><div className="space-y-5">{Object.entries(paymentBreakdown).map(([k, v]) => v > 0 && (<div key={k}><div className="flex justify-between text-xs font-black mb-2 uppercase"><span className="text-slate-600">{k.replace('_', ' ')}</span><span className="font-mono">{formatMoney(v)}</span></div><Progress value={(v/totalVendido)*100} className="h-2 bg-slate-100" /></div>))}</div></Card>
                    <Card className="p-5 border-2 shadow-sm"><h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Evolución Diaria</h3><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/><XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="total" fill="oklch(0.6 0.2 250)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
                </div>
            </div>
        )}

        {activeTab === "alerts" && (
            <div className="space-y-6 animate-in fade-in">
                <HappyHour criticos={capitalEnRiesgo.criticos} onDiscountApplied={fetchData} />

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 border-2 border-orange-200 bg-orange-50/50 shadow-sm">
                        <p className="text-[11px] font-black text-orange-600 uppercase mb-2">Riesgo Vencimiento</p>
                        <h3 className="text-3xl font-black text-slate-800">{formatMoney(capitalEnRiesgo.capital)}</h3>
                        <p className="text-[10px] font-bold text-orange-400 uppercase mt-2">{capitalEnRiesgo.unidades} UNIDADES CRÍTICAS</p>
                    </Card>
                    <Card className="p-5 border-2 border-red-200 bg-red-50/50 shadow-sm">
                        <p className="text-[11px] font-black text-red-600 uppercase mb-2">Stock Insuficiente</p>
                        <h3 className="text-3xl font-black text-slate-800">{productos.filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && p.categoria !== "Servicios").length}</h3>
                        <p className="text-[10px] font-bold text-red-400 uppercase mt-2">PRODUCTOS CRÍTICOS</p>
                    </Card>
                </div>

                <Card className="p-6 border-2 border-orange-100 rounded-[2rem] bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><Clock className="h-5 w-5" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800">Próximos a Vencer</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Lotes con vencimiento en menos de 10 días</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {capitalEnRiesgo.criticos.length === 0 ? (
                            <p className="text-center py-6 text-xs italic text-slate-400">Sin vencimientos próximos en este local.</p>
                        ) : (
                            capitalEnRiesgo.criticos.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-2 border-transparent hover:border-orange-200 transition-all">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{item.emoji}</span>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-700">{item.nombre}</p>
                                            <p className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1">
                                                Vence: {format(parseISO(item.fecha_vencimiento), 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-orange-500 text-white font-black text-[10px]">{item.cantidad} U.</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                <Card className="p-6 border-2 border-red-100 rounded-[2rem] bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600"><AlertCircle className="h-5 w-5" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800">Reponer Urgente</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Inventario menor a {UMBRAL_STOCK_BAJO} unidades</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {productos.filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && p.categoria !== "Servicios").length === 0 ? (
                            <p className="text-center py-6 text-xs italic text-slate-400">Todo el stock está en niveles óptimos.</p>
                        ) : (
                            productos
                                .filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && p.categoria !== "Servicios")
                                .sort((a, b) => (a.stock_disponible || 0) - (b.stock_disponible || 0))
                                .map((p) => (
                                    <div key={p.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-2 border-transparent hover:border-red-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{p.emoji}</span>
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-700">{p.nombre}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{p.categoria}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xl font-black tabular-nums leading-none", p.stock_disponible! <= 0 ? "text-red-600" : "text-red-400")}>
                                                {p.stock_disponible}
                                            </p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Existencia</p>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </Card>
            </div>
        )}

        {activeTab === "supervision" && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex bg-white p-1.5 rounded-2xl w-full max-w-sm mx-auto shadow-md border-2">
                    <button 
                        onClick={() => setSupervisionTab("cajas")}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                        supervisionTab === "cajas" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                    >
                        Cierres de Caja
                    </button>
                    <button 
                        onClick={() => setSupervisionTab("asistencia")}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                        supervisionTab === "asistencia" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                    >
                        Asistencia
                    </button>
                </div>

                {supervisionTab === "cajas" ? (
                    <div className="space-y-4">
                        {turnosAudit.map(t => {
                            const isOpen = !t.fecha_cierre; const isExpanded = expandedTurnoId === t.id
                            const totalGastosTurno = t.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0) || 0

                            return (
                                <Card key={t.id} className={cn("border-2 overflow-hidden transition-all rounded-2xl", isOpen ? "border-blue-400" : "border-slate-200")}>
                                    <div className="p-5 flex justify-between items-center bg-white cursor-pointer" onClick={() => setExpandedTurnoId(isExpanded ? null : t.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-lg">{t.perfiles?.nombre?.charAt(0)}</div>
                                            <div><p className="font-black text-sm text-slate-800 uppercase tracking-tight">{t.perfiles?.nombre || 'Empleado'}</p><p className="text-[11px] font-bold text-slate-400">{format(parseISO(t.fecha_apertura), 'dd MMM • HH:mm')} hs</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {totalGastosTurno > 0 && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[9px] font-black">-{formatMoney(totalGastosTurno)}</Badge>}
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary" onClick={(e) => { e.stopPropagation(); handlePrintTurno(t); }}><Printer className="h-5 w-5" /></Button>
                                            {isOpen ? <Badge className="bg-blue-600 animate-pulse text-[9px] h-4">EN CURSO</Badge> : <ChevronDown className={cn("h-5 w-5 text-slate-300 transition-transform", isExpanded && "rotate-180")} />}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="p-6 bg-slate-50 border-t-2 border-dashed space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white rounded-2xl border shadow-sm text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Efectivo Final</p><p className="text-2xl font-black text-slate-900">{t.monto_final ? formatMoney(t.monto_final) : '---'}</p></div>
                                                <div className="p-4 bg-white rounded-2xl border shadow-sm text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Misiones</p><p className="text-2xl font-black text-slate-900">{t.misiones?.filter(m => m.es_completada).length} / {t.misiones?.length}</p></div>
                                            </div>

                                            {/* Detalle de Ventas del Turno solicitado */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingBag className="h-3 w-3" /> Detalle de Productos Vendidos</h4>
                                                {ventasRecientes.filter(v => v.caja_diaria_id === t.id).length > 0 ? (
                                                    <div className="space-y-2">
                                                        {ventasRecientes.filter(v => v.caja_diaria_id === t.id).map((v) => (
                                                            <div key={v.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{v.productos?.emoji}</span>
                                                                    <p className="text-[10px] font-black text-slate-700 uppercase">{v.productos?.nombre}</p>
                                                                    <Badge variant="outline" className="text-[9px] py-0 h-4">{v.cantidad}u</Badge>
                                                                </div>
                                                                <p className="text-[11px] font-mono font-bold text-slate-600">
                                                                    {formatMoney((v.precio_venta_historico || v.productos?.precio_venta || 0) * v.cantidad)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] italic text-slate-400 text-center py-2">Sin ventas registradas en este turno</p>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ArrowDownRight className="h-3 w-3" /> Otros Movimientos (Manuales)</h4>
                                                {t.movimientos_caja?.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {t.movimientos_caja.map((m) => (
                                                            <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-800 uppercase">{m.descripcion}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{m.categoria} • {format(parseISO(m.created_at), 'HH:mm')} hs</p>
                                                                </div>
                                                                <span className={cn("font-black text-sm", m.tipo === 'egreso' ? "text-red-600" : "text-emerald-600")}>
                                                                    {m.tipo === 'egreso' ? '-' : '+'}{formatMoney(m.monto)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] italic text-slate-400 text-center py-2">Sin movimientos manuales en este turno</p>
                                                )}
                                            </div>

                                            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {isOpen && <AsignarMision turnoId={t.id} empleadoId={t.empleado_id} sucursalId={currentSucursalId} onMisionCreated={fetchData} />}
                                                
                                                <div className="bg-white p-4 rounded-2xl border shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-900 uppercase mb-4">Ajuste de Caja (Dueño)</h4>
                                                    <RegistrarMovimiento cajaId={t.id} onMovimientoRegistrado={fetchData} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {asistencias.length === 0 ? (
                            <p className="text-center py-20 text-xs font-black text-slate-400 uppercase tracking-widest italic">Sin registros de asistencia</p>
                        ) : asistencias.map((asist) => {
                            const hEntrada = parseISO(asist.entrada)
                            const hSalida = asist.salida ? parseISO(asist.salida) : null
                            let duracion = "---"
                            if (hSalida) {
                                const diffMs = hSalida.getTime() - hEntrada.getTime()
                                const diffHrs = Math.floor(diffMs / 3600000)
                                const diffMins = Math.floor((diffMs % 3600000) / 60000)
                                duracion = `${diffHrs}h ${diffMins}m`
                            }
                            return (
                                <Card key={asist.id} className="p-5 border-2 hover:border-slate-400 transition-all group rounded-2xl">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white text-lg", asist.salida ? "bg-slate-400 shadow-inner" : "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-200")}>
                                                {asist.perfiles?.nombre?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase text-slate-800 leading-none mb-1">{asist.perfiles?.nombre}</p>
                                                <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">{format(hEntrada, 'dd MMMM yyyy', {locale: es})}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Jornada Total</p>
                                            <Badge variant={asist.salida ? "outline" : "default"} className={cn("font-mono font-bold border-2", !asist.salida && "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm")}>
                                                {asist.salida ? duracion : "ACTIVO AHORA"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-dashed border-slate-100">
                                        <div className="bg-slate-50 p-2 rounded-xl border">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Entrada</p>
                                            <p className="text-sm font-black text-slate-700 tracking-tight">{format(hEntrada, 'HH:mm:ss')} HS</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-xl border text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Salida</p>
                                            <p className="text-sm font-black text-slate-700 tracking-tight">
                                                {hSalida ? `${format(hSalida, 'HH:mm:ss')} HS` : '---:---:---'}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        )}

        {activeTab === "finance" && (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-5 bg-emerald-50 border-2 border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Utilidad Neta Est.</p>
                        <h3 className="text-3xl font-black text-emerald-900">{formatMoney(biMetrics.neta)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 w-fit px-2 py-0.5 rounded"><TrendingUp className="h-3 w-3" /> ROI: {biMetrics.margen.toFixed(1)}%</div>
                    </Card>
                    <Card className="p-5 bg-blue-50 border-2 border-blue-200"><p className="text-[10px] font-black text-blue-600 uppercase mb-2">Ventas Blanco</p><h3 className="text-3xl font-black text-blue-900">{formatMoney(biMetrics.blanco)}</h3></Card>
                    <Card className="p-5 bg-slate-100 border-2 border-slate-300"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">Ventas Efectivo</p><h3 className="text-3xl font-black text-slate-700">{formatMoney(biMetrics.negro)}</h3></Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 border-2 border-yellow-200 bg-yellow-50/20"><div className="flex items-center justify-between mb-6"><h4 className="text-sm font-black text-yellow-800 uppercase flex items-center gap-2"><Star className="h-5 w-5 fill-yellow-400" /> Estrellas</h4><Badge className="bg-yellow-400 text-yellow-900 text-[10px] font-black">ALTA ROTACIÓN</Badge></div><div className="space-y-3">{matrizRentabilidad.stars.map((p, i) => (<div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-yellow-100 shadow-sm"><div className="flex items-center gap-3"><span className="text-2xl">{p.emoji}</span><div><p className="text-xs font-black uppercase text-slate-700">{p.nombre}</p><p className="text-[9px] font-bold text-slate-400">{p.sales} ventas</p></div></div><span className="font-black text-emerald-600 text-sm">{p.marg}% Mg.</span></div>))}</div></Card>
                    <Card className="p-6 border-2 border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-black text-slate-500 uppercase flex items-center gap-2">
                                <Trash2 className="h-5 w-5" /> Menos Vendidos
                            </h4>
                            <Badge variant="outline" className="text-[10px] font-black">BAJA ROTACIÓN</Badge>
                        </div>
                        <div className="space-y-3">
                            {matrizRentabilidad.bones.map((p, i) => (
                                <div key={i} className="flex justify-between items-center opacity-60 bg-slate-50 p-3 rounded-xl border">
                                    <span className="text-xs font-bold uppercase text-slate-600">{p.emoji} {p.nombre}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === "inventory" && (
            <div className="space-y-4 animate-in fade-in">
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><Input placeholder="FILTRAR STOCK LOCAL..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-16 text-sm font-bold shadow-inner border-2 rounded-2xl" /></div>
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div> : (
                    <div className="grid gap-4">{inventarioFiltrado.map(item => (<Card key={item.id} className="p-5 border-2 shadow-sm hover:border-primary/40 rounded-2xl group"><div className="flex justify-between items-start mb-5"><div className="flex gap-4"><div className="text-4xl bg-slate-100 p-3 rounded-2xl">{item.emoji}</div><div><h4 className="font-black text-slate-800 uppercase text-sm">{item.nombre}</h4><p className="text-[10px] text-slate-400 font-black uppercase mt-1">{item.categoria}</p><div className="flex items-center gap-3 mt-3"><Badge className="bg-slate-900 text-white text-[11px] font-black px-3 shadow-md">${item.precio_venta}</Badge><button onClick={() => loadPriceHistory(item.id)} className="text-[10px] font-black text-primary uppercase"><History className="h-3 w-3 inline mr-1"/> Historial</button></div></div></div><div className="text-right"><p className={cn("text-3xl font-black tabular-nums", item.stock_disponible! <= UMBRAL_STOCK_BAJO ? "text-red-500" : "text-emerald-500")}>{item.stock_disponible}</p><button onClick={() => loadStockBatches(item.id)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 justify-end font-bold">Lotes <ChevronRight className="h-3 w-3"/></button></div></div><div className="flex gap-2"><AgregarStock producto={item} sucursalId={currentSucursalId} onStockAdded={fetchData} /><Button variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0" onClick={() => setEditingProduct(item)}><Pencil className="h-4 w-4" /></Button></div></Card>))}</div>
                )}
            </div>
        )}

        {activeTab === "catalog" && <CrearProducto sucursalId={currentSucursalId} onProductCreated={() => { setActiveTab("inventory"); fetchData(); }} />}
        {activeTab === "suppliers" && <div className="space-y-6 animate-in fade-in"><ControlSaldoProveedor /><GestionProveedores sucursalId={currentSucursalId} organizationId={organizationId} /></div>}
        {activeTab === "team" && (
            <div className="space-y-6 animate-in fade-in">
                <TeamRanking />
                <InvitarEmpleado />
                <Card className="p-6 border-2">
                    <h3 className="text-lg font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-blue-600" />
                        Generar QR de Fichaje
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Genera códigos QR para que tus empleados puedan fichar entrada y salida escaneando el código del local.
                    </p>
                    <GenerarQRFichaje />
                </Card>
            </div>
        )}
      </div>

      <Dialog open={!!editingProduct} onOpenChange={o => !o && setEditingProduct(null)}>
        <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase flex items-center gap-2"><Pencil className="h-5 w-5 text-primary"/> Editar Catálogo</DialogTitle></DialogHeader>
            {editingProduct && (
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-4 gap-3"><div className="col-span-1"><Label className="text-[10px] font-black uppercase">Icono</Label><Input value={editingProduct.emoji ?? ""} onChange={e => setEditingProduct({...editingProduct, emoji: e.target.value})} className="text-center text-3xl h-16 rounded-2xl bg-slate-50" /></div><div className="col-span-3"><Label className="text-[10px] font-black uppercase">Nombre</Label><Input value={editingProduct.nombre} onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})} className="h-16 font-bold rounded-2xl" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><Label className="text-[10px] font-black uppercase text-slate-400">Costo</Label><Input type="number" value={editingProduct.costo} onChange={e => setEditingProduct({...editingProduct, costo: parseFloat(e.target.value)})} className="rounded-xl h-12" /></div><div><Label className="text-[10px] font-black uppercase text-primary">Precio</Label><Input type="number" value={editingProduct.precio_venta} onChange={e => setEditingProduct({...editingProduct, precio_venta: parseFloat(e.target.value)})} className="border-primary/40 font-black h-12 rounded-xl text-lg" /></div></div>
                    <Button onClick={handleUpdateProduct} disabled={actionLoading} className="w-full h-14 font-black text-lg rounded-2xl shadow-lg">{actionLoading ? <Loader2 className="animate-spin"/> : "GUARDAR CAMBIOS"}</Button>
                    <Button variant="ghost" className="w-full text-red-500 text-[10px] font-black" onClick={async () => { if(confirm("¿Eliminar?")){ await supabase.from('productos').delete().eq('id', editingProduct.id); fetchData(); setEditingProduct(null); } }}>ELIMINAR PRODUCTO</Button>
                </div>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceHistoryModal} onOpenChange={setShowPriceHistoryModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Historial Precios</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
                {historyData.map((h, i) => (
                    <div key={i} className="p-4 border-l-4 border-primary bg-slate-50 rounded-xl relative"><div className="flex justify-between items-start mb-3"><p className="font-black text-slate-900 text-xs uppercase">{format(parseISO(h.fecha_cambio), 'dd MMM yyyy')}</p><p className="text-[9px] font-black text-slate-400">{format(parseISO(h.fecha_cambio), 'HH:mm')} HS</p></div><div className="grid grid-cols-2 gap-6"><div><p className="text-[9px] font-black uppercase">Venta</p><p className="text-lg font-black text-primary">{formatMoney(h.precio_venta_nuevo)}</p></div><div><p className="text-[9px] font-black uppercase">Costo</p><p className="text-lg font-black text-slate-900">{formatMoney(h.costo_nuevo)}</p></div></div><div className="mt-3 pt-3 border-t flex items-center gap-1.5"><span className="text-[9px] font-black text-slate-400 uppercase">Autor: {h.perfiles?.nombre || 'Admin'}</span></div></div>
                ))}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingStockId} onOpenChange={o => !o && setManagingStockId(null)}>
        <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase flex items-center gap-2"><History className="h-5 w-5 text-orange-500"/> Lotes Locales</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 mt-4">
                {stockBatchList.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-orange-200"><div className="space-y-1"><p className="font-black text-xs">CANT: {b.cantidad} u.</p><p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso: {format(parseISO(b.created_at), 'dd/MM/yy HH:mm')} hs</p></div><Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-50 rounded-full" onClick={async () => { if(confirm("¿Eliminar lote?")){ await supabase.from('stock').delete().eq('id', b.id); fetchData(); setManagingStockId(null); } }}><Trash2 className="h-5 w-5"/></Button></div>
                ))}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSalesDetail} onOpenChange={setShowSalesDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-3xl">
            <DialogHeader className="border-b pb-4"><DialogTitle className="font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Receipt className="h-6 w-6 text-primary"/> Libro de Ventas</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-y-auto pr-3 space-y-3 mt-6">
                {ventasRecientes.map(v => (
                    <div key={v.id} className="flex justify-between items-center p-4 bg-white border-2 rounded-2xl shadow-sm"><div className="flex items-center gap-4"><span className="text-3xl bg-slate-100 w-12 h-12 flex items-center justify-center rounded-xl">{v.productos?.emoji}</span><div><p className="font-black uppercase text-slate-800 text-sm leading-none mb-1">{v.productos?.nombre}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(v.fecha_venta), 'HH:mm')} hs • {v.metodo_pago?.replace('_',' ')}</p>{v.notas && <p className="text-[10px] font-black text-indigo-600 mt-1 italic tracking-tighter">💬 {v.notas}</p>}</div></div><div className="text-right"><p className="font-black text-emerald-600 text-lg leading-none mb-0.5">{formatMoney((v.precio_venta_historico || v.productos?.precio_venta || 0) * (v.cantidad || 1))}</p><p className="text-[10px] font-black text-slate-400 uppercase">{v.cantidad || 1} U.</p></div></div>
                ))}
            </div>
            <DialogFooter className="border-t pt-4"><Button variant="outline" className="w-full font-black text-[11px] h-12 rounded-2xl uppercase tracking-widest" onClick={() => setShowSalesDetail(false)}>Cerrar Auditoría</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}