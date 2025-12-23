// components/dashboard-dueno.tsx
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
  Users, Sparkles, Printer, Briefcase, Receipt, X, MapPin, Settings, ChevronRight
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

// --- Configuración ---
const UMBRAL_STOCK_BAJO = 5 
const UMBRAL_SALDO_BAJO = 10000 

// --- Interfaces ---
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

const PAYMENT_ICONS: any = {
    efectivo: DollarSign,
    tarjeta: CreditCard,
    transferencia: Repeat2,
    otro: Wallet,
    billetera_virtual: Wallet, 
}

export default function DashboardDueno({ onBack, sucursalId }: DashboardDuenoProps) {
  // --- ESTADOS DE CONTEXTO ---
  const [currentSucursalId, setCurrentSucursalId] = useState(sucursalId)
  const [organizationId, setOrganizationId] = useState<string>("")
  const [sucursales, setSucursales] = useState<{id: string, nombre: string}[]>([])

  // --- ESTADOS DE UI ---
  const [activeTab, setActiveTab] = useState<"alerts" | "inventory" | "catalog" | "sales" | "finance" | "supervision" | "suppliers" | "team">("sales")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // --- ESTADOS DE DATOS ---
  const [productos, setProductos] = useState<Producto[]>([])
  const [capitalEnRiesgo, setCapitalEnRiesgo] = useState<MetricaStock>({ capital: 0, unidades: 0, criticos: [] })
  const [ventasRecientes, setVentasRecientes] = useState<VentaJoin[]>([])
  const [totalVendido, setTotalVendido] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
      efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, billetera_virtual: 0 
  })
  const [topProductos, setTopProductos] = useState<{name: string, count: number}[]>([])
  const [turnosAudit, setTurnosAudit] = useState<TurnoAudit[]>([])
  const [expandedTurnoId, setExpandedTurnoId] = useState<string | null>(null)
  const [sugerencias, setSugerencias] = useState<any[]>([])

  // --- MODALES ---
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [managingStockId, setManagingStockId] = useState<string | null>(null)
  const [stockBatchList, setStockBatchList] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [showSalesDetail, setShowSalesDetail] = useState(false)
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<HistorialPrecio[]>([])

  const formatMoney = (amount: number | null) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0)

  // --- 1. CARGA DE CONTEXTO ---
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

  // --- 2. CARGA DE DATOS FILTRADOS ---
  const fetchData = useCallback(async () => {
    if (!currentSucursalId || !organizationId) return

    // A. Inventario con Stock Local
    const { data: cat } = await supabase.from('productos').select('*').eq('organization_id', organizationId).order('nombre')
    const { data: stk } = await supabase.from('view_productos_con_stock').select('id, stock_disponible').eq('sucursal_id', currentSucursalId)

    if (cat) {
        const fusion = cat.map(p => ({ ...p, stock_disponible: stk?.find(s => s.id === p.id)?.stock_disponible || 0 }))
        setProductos(fusion)

        // Sugerencias de Reposición
        const bajas = fusion.filter(p => (p.stock_disponible || 0) <= UMBRAL_STOCK_BAJO && p.categoria !== "Servicios")
        const sugs = []
        for (const p of bajas) {
             const { data: h } = await supabase.from('stock').select('costo_unitario_historico, proveedores(nombre)').eq('producto_id', p.id).not('proveedor_id', 'is', null).order('created_at', { ascending: false }).limit(1)
             sugs.push({ id: p.id, producto: p.nombre, emoji: p.emoji, stock_actual: p.stock_disponible, mejor_proveedor: h?.[0]?.proveedores ? (h[0].proveedores as any).nombre : null, mejor_precio: h?.[0]?.costo_unitario_historico })
        }
        setSugerencias(sugs)
    }

    // B. Ventas y Pagos
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

    // C. Turnos y Auditoría
    let cQ = supabase.from('caja_diaria').select(`*, perfiles(nombre), misiones(*), movimientos_caja(*)`).eq('sucursal_id', currentSucursalId)
    if (dateRange?.from) cQ = cQ.gte('fecha_apertura', dateRange.from.toISOString())
    if (dateRange?.to) cQ = cQ.lte('fecha_apertura', dateRange.to.toISOString())
    const { data: cData } = await cQ.order('fecha_apertura', { ascending: false }).returns<TurnoAudit[]>()
    setTurnosAudit(cData || [])

    // D. Vencimientos
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

  // --- 3. BUSINESS INTELLIGENCE (MEMOS) ---

  const biMetrics = useMemo(() => {
    let bruto = 0, costo = 0, blanco = 0
    ventasRecientes.forEach(v => {
        const cant = v.cantidad || 1
        bruto += (v.precio_venta_historico || v.productos?.precio_venta || 0) * cant
        costo += (v.costo_unitario_historico || 0) * cant
        if (['tarjeta', 'transferencia', 'billetera_virtual'].includes(v.metodo_pago)) blanco += (v.precio_venta_historico || v.productos?.precio_venta || 0) * cant
    })
    return { bruto, neta: bruto - costo, margen: bruto > 0 ? ((bruto - costo) / bruto) * 100 : 0, blanco, negro: bruto - blanco }
  }, [ventasRecientes])

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

  // --- 4. ACCIONES DE AUDITORÍA ---

  const loadStockBatches = async (pid: string) => {
      setManagingStockId(pid)
      const { data } = await supabase.from('stock').select('*').eq('producto_id', pid).eq('tipo_movimiento', 'entrada').eq('sucursal_id', currentSucursalId).order('created_at', { ascending: false })
      setStockBatchList(data || [])
  }

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

  const handlePrintTurno = (t: TurnoAudit) => {
    const vT = ventasRecientes.filter(v => {
        const fV = parseISO(v.fecha_venta); const fA = parseISO(t.fecha_apertura); const fC = t.fecha_cierre ? parseISO(t.fecha_cierre) : new Date()
        return fV >= fA && fV <= fC
    })
    const totV = vT.reduce((acc, curr) => acc + (curr.precio_venta_historico || curr.productos?.precio_venta || 0) * (curr.cantidad || 1), 0)
    const totE = vT.filter(v => v.metodo_pago === 'efectivo').reduce((acc, curr) => acc + (curr.precio_venta_historico || curr.productos?.precio_venta || 0) * (curr.cantidad || 1), 0)
    const gast = t.movimientos_caja?.filter(m => m.tipo === 'egreso').reduce((a,b) => a + b.monto, 0) || 0
    const extra = t.movimientos_caja?.filter(m => m.tipo === 'ingreso').reduce((a,b) => a + b.monto, 0) || 0
    const esp = t.monto_inicial + totE + extra - gast

    generarTicketPDF({
        empleado: t.perfiles?.nombre || "Empleado", fechaApertura: format(parseISO(t.fecha_apertura), 'dd/MM/yyyy HH:mm'),
        fechaCierre: t.fecha_cierre ? format(parseISO(t.fecha_cierre), 'dd/MM/yyyy HH:mm') : null,
        montoInicial: t.monto_inicial, totalVentas: totV, totalGastos: gast, cajaEsperada: esp, cajaReal: t.monto_final,
        diferencia: (t.monto_final || 0) - esp, gastos: t.movimientos_caja?.filter(m => m.tipo === 'egreso') || []
    })
    toast.success("Ticket generado")
  }

  // --- 5. RENDER PRINCIPAL ---

  const inventarioFiltrado = productos.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigo_barras?.includes(searchQuery))

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* 🚀 HEADER MULTI-SUCURSAL */}
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
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle>Configuración de Sucursales</DialogTitle></DialogHeader>
                        <GestionSucursales onUpdate={fetchContext} />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
        
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">Torre de Control <Sparkles className="h-5 w-5 text-yellow-400" /></h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Panel Administrativo Global</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Capital Neto en Stock</p>
                <p className="text-xl font-black text-emerald-400">{formatMoney(productos.reduce((a,b) => a + (b.costo * (b.stock_disponible || 0)), 0))}</p>
            </div>
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "sales", label: "Caja y Ventas", icon: DollarSign },
            { id: "inventory", label: "Inventario Real", icon: Package },
            { id: "finance", label: "Inteligencia BI", icon: TrendingUp },
            { id: "supervision", label: "Auditoría Turnos", icon: Eye },
            { id: "catalog", label: "Dato Maestro", icon: Plus },
            { id: "suppliers", label: "Logística", icon: Users },
            { id: "team", label: "Mi Equipo", icon: Briefcase },
            { id: "alerts", label: "Gestión Riesgos", icon: AlertTriangle },
          ].map(t => (
            <Button key={t.id} onClick={() => setActiveTab(t.id as any)} variant={activeTab === t.id ? "secondary" : "ghost"} size="sm" className="rounded-full text-xs font-bold whitespace-nowrap">
                <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* FILTRO DE FECHA GLOBAL */}
        {["sales", "supervision", "finance"].includes(activeTab) && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-14 border-2 shadow-sm bg-white font-black text-slate-700">
                        <CalendarIcon className="mr-2 h-5 w-5 text-primary" /> {dateRangeLabel.toUpperCase()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar mode="range" selected={dateRange} onSelect={r => { setDateRange(r); if(r?.to) setIsCalendarOpen(false) }} locale={es} />
                </PopoverContent>
            </Popover>
        )}

        {/* --- PESTAÑA: SALES (CAJA) --- */}
        {activeTab === "sales" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <Card className="p-8 bg-gradient-to-br from-blue-600 to-indigo-800 text-white border-0 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="h-32 w-32 rotate-12"/></div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Facturación Sucursal Seleccionada</p>
                    <h2 className="text-5xl font-black tracking-tighter">{formatMoney(totalVendido)}</h2>
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
                        <span className="text-xs font-bold text-blue-100 flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" /> {ventasRecientes.length} tickets emitidos</span>
                        <Button variant="secondary" size="sm" className="font-black text-[10px] px-4" onClick={() => setShowSalesDetail(true)}>VER DETALLE OPERATIVO</Button>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5 border-2 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><CreditCard className="h-4 w-4" /> Composición de Ingresos</h3>
                        <div className="space-y-5">
                            {Object.entries(paymentBreakdown).map(([k, v]) => v > 0 && (
                                <div key={k}>
                                    <div className="flex justify-between text-xs font-black mb-2 uppercase">
                                        <span className="text-slate-600">{k.replace('_', ' ')}</span>
                                        <span className="font-mono text-slate-900">{formatMoney(v)}</span>
                                    </div>
                                    <Progress value={(v/totalVendido)*100} className="h-2 bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-5 border-2 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Curva de Ventas</h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                    <Bar dataKey="total" fill="oklch(0.6 0.2 250)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {/* --- PESTAÑA: FINANCE (BI PROFUNDO) --- */}
        {activeTab === "finance" && (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-5 bg-emerald-50 border-2 border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Utilidad Neta Estimada</p>
                        <h3 className="text-3xl font-black text-emerald-900">{formatMoney(biMetrics.neta)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 w-fit px-2 py-0.5 rounded">
                            <TrendingUp className="h-3 w-3" /> ROI PERIODO: {biMetrics.margen.toFixed(1)}%
                        </div>
                    </Card>
                    <Card className="p-5 bg-blue-50 border-2 border-blue-200">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Ventas Declaradas (Bco)</p>
                        <h3 className="text-3xl font-black text-blue-900">{formatMoney(biMetrics.blanco)}</h3>
                        <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase">Tickets Electrónicos / Digitales</p>
                    </Card>
                    <Card className="p-5 bg-slate-100 border-2 border-slate-300">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Ventas Efectivo (Negro)</p>
                        <h3 className="text-3xl font-black text-slate-700">{formatMoney(biMetrics.negro)}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Flujo de caja manual</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 border-2 border-yellow-200 bg-yellow-50/20">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-black text-yellow-800 uppercase tracking-tighter flex items-center gap-2"><Star className="h-5 w-5 fill-yellow-400" /> Matriz: Productos Estrella</h4>
                            <Badge className="bg-yellow-400 text-yellow-900 text-[10px] font-black">ALTA ROTACIÓN</Badge>
                        </div>
                        <div className="space-y-3">
                            {matrizRentabilidad.stars.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{p.emoji}</span>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-700">{p.nombre}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{p.sales} ventas registradas</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-emerald-600 text-sm">{p.marg}% Mg.</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 border-2 border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Trash2 className="h-5 w-5" /> Matriz: Productos Hueso</h4>
                            <Badge variant="outline" className="text-[10px] font-black">SIN MOVIMIENTO</Badge>
                        </div>
                        <div className="space-y-3">
                            {matrizRentabilidad.bones.map((p, i) => (
                                <div key={i} className="flex justify-between items-center opacity-60 grayscale bg-slate-50 p-3 rounded-xl border">
                                    <span className="text-xs font-bold uppercase text-slate-600">{p.emoji} {p.nombre}</span>
                                    <span className="text-[10px] font-black text-red-400">LIQUIDAR?</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {/* --- PESTAÑA: INVENTORY (GESTIÓN LOCAL) --- */}
        {activeTab === "inventory" && (
            <div className="space-y-4 animate-in fade-in">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input placeholder="FILTRAR STOCK LOCAL POR NOMBRE O CÓDIGO..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-16 text-sm font-bold shadow-inner border-2 rounded-2xl" />
                </div>
                
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div> : (
                    <div className="grid gap-4">
                        {inventarioFiltrado.map(item => {
                            const marg = item.costo > 0 ? (((item.precio_venta - item.costo) / item.costo) * 100).toFixed(0) : "100"
                            return (
                                <Card key={item.id} className="p-5 border-2 shadow-sm hover:border-primary/40 transition-all rounded-2xl group">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex gap-4">
                                            <div className="text-4xl bg-slate-100 p-3 rounded-2xl group-hover:bg-primary/5 transition-colors">{item.emoji}</div>
                                            <div>
                                                <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.nombre}</h4>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{item.categoria}</p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <Badge className="bg-slate-900 text-white text-[11px] font-black px-3 py-1 shadow-md">${item.precio_venta}</Badge>
                                                    <button onClick={() => loadPriceHistory(item.id)} className="text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-1"><History className="h-3 w-3"/> HISTORIAL PRECIOS</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-3xl font-black tabular-nums", item.stock_disponible! <= UMBRAL_STOCK_BAJO ? "text-red-500" : "text-emerald-500")}>{item.stock_disponible}</p>
                                            <button onClick={() => loadStockBatches(item.id)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 justify-end hover:text-orange-500 transition-colors">VER LOTES <ChevronRight className="h-3 w-3"/></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <AgregarStock producto={item} sucursalId={currentSucursalId} onStockAdded={fetchData} />
                                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0" onClick={() => setEditingProduct(item)} title="Editar Catálogo"><Pencil className="h-4 w-4" /></Button>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        )}

        {/* --- PESTAÑA: SUPERVISIÓN (AUDITORÍA DE TURNOS) --- */}
        {activeTab === "supervision" && (
            <div className="space-y-4 animate-in fade-in">
                <div className="bg-white p-4 rounded-xl border-2 mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-black uppercase text-xs text-slate-400">Estado de Supervisión</h3>
                        <p className="text-sm font-bold text-slate-700">Auditando turnos en {sucursales.find(s => s.id === currentSucursalId)?.nombre}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">{turnosAudit.length} Registros</Badge>
                </div>

                {turnosAudit.map(t => {
                    const isOpen = !t.fecha_cierre
                    const isExpanded = expandedTurnoId === t.id
                    return (
                        <Card key={t.id} className={cn("border-2 overflow-hidden transition-all rounded-2xl mb-4 shadow-sm", isOpen ? "border-blue-400" : "border-slate-200")}>
                            <div className="p-5 flex justify-between items-center bg-white cursor-pointer" onClick={() => setExpandedTurnoId(isExpanded ? null : t.id)}>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-lg">{t.perfiles?.nombre?.charAt(0)}</div>
                                    <div>
                                        <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{t.perfiles?.nombre || 'Empleado S/N'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[11px] font-bold text-slate-400">{format(parseISO(t.fecha_apertura), 'dd MMM • HH:mm')} hs</p>
                                            {isOpen && <Badge className="bg-blue-600 animate-pulse text-[9px] h-4">EN CURSO</Badge>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary" onClick={(e) => { e.stopPropagation(); handlePrintTurno(t); }}><Printer className="h-5 w-5" /></Button>
                                    <ChevronDown className={cn("h-5 w-5 text-slate-300 transition-transform duration-300", isExpanded && "rotate-180")} />
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="p-6 bg-slate-50 border-t-2 border-dashed space-y-6 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white rounded-2xl border shadow-sm text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Efectivo Final</p>
                                            <p className="text-2xl font-black text-slate-900">{t.monto_final ? formatMoney(t.monto_final) : '---'}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl border shadow-sm text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Diferencia</p>
                                            {/* Aquí vendría el cálculo de diferencia que ya tenemos en handlePrintTurno */}
                                            <p className="text-2xl font-black text-slate-900">AUDITAR</p> 
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Log de Misiones</h5>
                                        {t.misiones?.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border text-xs">
                                                <span className="font-bold text-slate-700">{m.descripcion}</span>
                                                {m.es_completada ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">EXITO</Badge> : <Badge variant="outline" className="text-slate-400">PENDIENTE</Badge>}
                                            </div>
                                        ))}
                                    </div>

                                    {isOpen && (
                                        <div className="pt-4 border-t border-slate-200">
                                            <AsignarMision turnoId={t.id} empleadoId={t.empleado_id} sucursalId={currentSucursalId} onMisionCreated={fetchData} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>
        )}

        {/* --- PESTAÑA: RIESGOS & ALERTS --- */}
        {activeTab === "alerts" && (
            <div className="space-y-6 animate-in fade-in">
                <HappyHour criticos={capitalEnRiesgo.criticos} onDiscountApplied={fetchData} />
                
                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 border-2 border-orange-200 bg-orange-50/50 shadow-sm">
                        <p className="text-[11px] font-black text-orange-600 uppercase mb-2">Pérdida Potencial (Venc.)</p>
                        <h3 className="text-3xl font-black text-slate-800">{formatMoney(capitalEnRiesgo.capital)}</h3>
                        <p className="text-[10px] font-bold text-orange-400 uppercase mt-2">{capitalEnRiesgo.unidades} UNIDADES CRÍTICAS</p>
                    </Card>
                    <Card className="p-5 border-2 border-red-200 bg-red-50/50 shadow-sm">
                        <p className="text-[11px] font-black text-red-600 uppercase mb-2">Quiebres de Stock</p>
                        <h3 className="text-3xl font-black text-slate-800">{productos.filter(p => p.stock_disponible! <= 0).length}</h3>
                        <p className="text-[10px] font-bold text-red-400 uppercase mt-2">PRODUCTOS AGOTADOS</p>
                    </Card>
                </div>

                {sugerencias.length > 0 && (
                    <Card className="p-6 bg-slate-900 text-white border-0 shadow-2xl rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-24 w-24"/></div>
                        <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 tracking-widest"><Package className="h-4 w-4 text-primary" /> Sugerencias de Reposición</h3>
                        <div className="grid gap-3">
                            {sugerencias.slice(0, 5).map(s => (
                                <div key={s.id} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl flex justify-between items-center border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{s.emoji}</span>
                                        <div>
                                            <p className="text-xs font-black uppercase">{s.producto}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Stock actual: {s.stock_actual} u.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-primary font-black uppercase">Mejor Proveedor</p>
                                        <p className="text-xs font-black text-white">{s.mejor_proveedor || 'S/N'}</p>
                                        <p className="text-[10px] font-mono text-emerald-400">{formatMoney(s.mejor_precio)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        )}

        {/* --- OTRAS PESTAÑAS (MODULARES) --- */}
        {activeTab === "catalog" && <CrearProducto sucursalId={currentSucursalId} onProductCreated={() => { setActiveTab("inventory"); fetchData(); }} />}
        {activeTab === "suppliers" && <div className="space-y-6 animate-in fade-in"><ControlSaldoProveedor /><GestionProveedores sucursalId={currentSucursalId} organizationId={organizationId} /></div>}
        {activeTab === "team" && <div className="space-y-6 animate-in fade-in"><TeamRanking /><InvitarEmpleado /></div>}

      </div>

      {/* --- BLOQUE DE DIALOGOS Y AUDITORÍA PROFUNDA --- */}

      {/* 1. Modal: Editar Producto y Registrar Historial de Precios */}
      <Dialog open={!!editingProduct} onOpenChange={o => !o && setEditingProduct(null)}>
        <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase flex items-center gap-2 text-slate-800"><Pencil className="h-5 w-5 text-primary"/> Editar Catálogo Global</DialogTitle></DialogHeader>
            {editingProduct && (
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-1"><Label className="text-[10px] font-black uppercase mb-1 block">Icono</Label><Input value={editingProduct.emoji} onChange={e => setEditingProduct({...editingProduct, emoji: e.target.value})} className="text-center text-3xl h-16 rounded-2xl bg-slate-50" /></div>
                        <div className="col-span-3"><Label className="text-[10px] font-black uppercase mb-1 block">Nombre Comercial</Label><Input value={editingProduct.nombre} onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})} className="h-16 font-bold rounded-2xl" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Costo de Reposición ($)</Label><Input type="number" value={editingProduct.costo} onChange={e => setEditingProduct({...editingProduct, costo: parseFloat(e.target.value)})} className="rounded-xl h-12" /></div>
                        <div><Label className="text-[10px] font-black uppercase text-primary mb-1 block">Precio de Venta ($)</Label><Input type="number" value={editingProduct.precio_venta} onChange={e => setEditingProduct({...editingProduct, precio_venta: parseFloat(e.target.value)})} className="border-primary/40 font-black h-12 rounded-xl text-lg" /></div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Margen de Ganancia Bruta</p>
                        <p className="text-2xl font-black text-blue-900">
                            {editingProduct.costo > 0 ? (((editingProduct.precio_venta - editingProduct.costo) / editingProduct.costo) * 100).toFixed(1) : '100'}%
                        </p>
                    </div>
                    <Button onClick={handleUpdateProduct} disabled={actionLoading} className="w-full h-14 font-black text-lg rounded-2xl shadow-lg">{actionLoading ? <Loader2 className="animate-spin"/> : "CONFIRMAR Y GUARDAR"}</Button>
                    <Button variant="ghost" className="w-full text-red-500 text-[10px] font-black hover:bg-red-50" onClick={async () => { if(confirm("¿Eliminar del catálogo?")){ await supabase.from('productos').delete().eq('id', editingProduct.id); fetchData(); setEditingProduct(null); } }}>ELIMINAR PRODUCTO PERMANENTEMENTE</Button>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* 2. Modal: Historial de Cambios de Precio (Audit) */}
      <Dialog open={showPriceHistoryModal} onOpenChange={setShowPriceHistoryModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Historial de Precios</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
                {historyData.length === 0 ? <p className="text-center text-slate-400 py-10 font-bold italic text-sm">Sin registros previos de cambios.</p> : historyData.map((h, i) => (
                    <div key={i} className="p-4 border-l-4 border-primary bg-slate-50 rounded-xl relative">
                        <div className="flex justify-between items-start mb-3">
                            <p className="font-black text-slate-900 text-xs uppercase">{format(parseISO(h.fecha_cambio), 'dd MMMM yyyy')}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(parseISO(h.fecha_cambio), 'HH:mm')} HS</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Venta</p><p className="text-sm font-bold text-slate-600 line-through decoration-red-400">{formatMoney(h.precio_venta_anterior)}</p><p className="text-lg font-black text-primary">{formatMoney(h.precio_venta_nuevo)}</p></div>
                            <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Costo</p><p className="text-sm font-bold text-slate-600 line-through decoration-red-400">{formatMoney(h.costo_anterior)}</p><p className="text-lg font-black text-slate-900">{formatMoney(h.costo_nuevo)}</p></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5"><User className="h-3 w-3 text-slate-400"/><span className="text-[9px] font-black text-slate-400 uppercase">Autorizado por: {h.perfiles?.nombre || 'Admin'}</span></div>
                    </div>
                ))}
            </div>
        </DialogContent>
      </Dialog>

      {/* 3. Modal: Auditoría de Lotes de Stock (Local) */}
      <Dialog open={!!managingStockId} onOpenChange={o => !o && setManagingStockId(null)}>
        <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="font-black uppercase flex items-center gap-2"><History className="h-5 w-5 text-orange-500"/> Auditoría de Lotes</DialogTitle><DialogDescription className="font-bold text-xs uppercase text-slate-400">Ingresos físicos en esta sucursal.</DialogDescription></DialogHeader>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 mt-4">
                {stockBatchList.length === 0 ? <p className="text-center text-slate-400 py-10 font-black italic">Sin stock activo en este local.</p> : stockBatchList.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-orange-200 transition-colors">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-black text-xs uppercase text-slate-800">CANT: {b.cantidad} u.</p>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] h-4">FISICO</Badge>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso: {format(parseISO(b.created_at), 'dd/MM/yy HH:mm')} hs</p>
                            {b.fecha_vencimiento && <p className="text-[10px] font-black text-orange-600 uppercase mt-0.5">VENCE: {format(parseISO(b.fecha_vencimiento), 'dd/MM/yy')}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={async () => { if(confirm("¿Eliminar este lote del stock local?")){ await supabase.from('stock').delete().eq('id', b.id); fetchData(); setManagingStockId(null); } }}><Trash2 className="h-5 w-5"/></Button>
                    </div>
                ))}
            </div>
        </DialogContent>
      </Dialog>

      {/* 4. Modal: Detalle de Operaciones (Sales Audit) */}
      <Dialog open={showSalesDetail} onOpenChange={setShowSalesDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-3xl">
            <DialogHeader className="border-b pb-4"><DialogTitle className="font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Receipt className="h-6 w-6 text-primary"/> Libro Diario de Ventas</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-y-auto pr-3 space-y-3 mt-6">
                {ventasRecientes.length === 0 ? <div className="text-center py-20 opacity-30 font-black uppercase text-sm tracking-[0.3em]">Sin operaciones</div> : ventasRecientes.map(v => (
                    <div key={v.id} className="flex justify-between items-center p-4 bg-white border-2 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl bg-slate-100 w-12 h-12 flex items-center justify-center rounded-xl">{v.productos?.emoji}</span>
                            <div>
                                <p className="font-black uppercase text-slate-800 text-sm leading-none mb-1">{v.productos?.nombre}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(v.fecha_venta), 'HH:mm')} hs • {v.metodo_pago?.replace('_',' ')}</p>
                                {v.notas && <p className="text-[10px] font-black text-indigo-600 mt-1 uppercase italic tracking-tighter">💬 {v.notas}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-emerald-600 text-lg leading-none mb-0.5">{formatMoney((v.precio_venta_historico || v.productos?.precio_venta || 0) * (v.cantidad || 1))}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{v.cantidad || 1} UNIDADES</p>
                        </div>
                    </div>
                ))}
            </div>
            <DialogFooter className="border-t pt-4 mt-2"><Button variant="outline" className="w-full font-black text-[11px] h-12 rounded-2xl uppercase tracking-widest" onClick={() => setShowSalesDetail(false)}>Cerrar Auditoría</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}