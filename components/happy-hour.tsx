// components/happy-hour.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Megaphone, Tag, Check, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface ProductoCritico {
    producto_id: string
    nombre: string
    emoji: string
    unidades: number
    precioTotal: number
    fechaVenc: string
    // Necesitamos el precio unitario actual para calcular el descuento
    // Como tu objeto "criticos" actual agrupa, asumiremos que podemos obtenerlo o pasarlo.
    // Para simplificar, pasaremos el objeto completo del producto si es posible, 
    // o consultaremos el precio actual al aplicar.
}

interface HappyHourProps {
    criticos: any[] // Recibe la lista 'capitalEnRiesgo.criticos' del dashboard
    onDiscountApplied: () => void // Para recargar los datos del dashboard
}

export default function HappyHour({ criticos, onDiscountApplied }: HappyHourProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // 1. Filtro Inteligente: Solo mostramos lo que vence en 5 días o menos (Urgente)
    // Y que tenga más de 0 unidades, claro.
    const oportunidades = criticos.filter(c => {
        const diasRestantes = Math.ceil((new Date(c.fechaVenc).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return diasRestantes <= 5 && diasRestantes >= -1 // Incluimos vencidos ayer por si acaso
    })

    const aplicarDescuento = async (item: any) => {
        setLoadingId(item.producto_id)
        try {
            // A. Obtenemos precio actual de la DB para no errarle
            const { data: prod, error: fetchError } = await supabase
                .from('productos')
                .select('precio_venta, nombre')
                .eq('id', item.producto_id)
                .single()
            
            if (fetchError) throw fetchError

            // B. Calculamos el 30% OFF
            const precioViejo = prod.precio_venta
            const precioNuevo = Math.floor(precioViejo * 0.70) // Redondeamos para abajo

            // C. Actualizamos
            const { error: updateError } = await supabase
                .from('productos')
                .update({ precio_venta: precioNuevo })
                .eq('id', item.producto_id)

            if (updateError) throw updateError

            // D. (Opcional) Registrar en historial de precios
            // Idealmente esto debería estar en un trigger de DB o en una función RPC, 
            // pero lo hacemos aquí rápido como en tu dashboard.
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.id) throw new Error("No hay sesión activa")
            const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single<{ organization_id: string | null }>()
            if (!perfil?.organization_id) throw new Error("No se encontró la organización.")
            await (supabase.from('historial_precios') as any).insert({
                producto_id: item.producto_id,
                precio_venta_anterior: precioViejo,
                precio_venta_nuevo: precioNuevo,
                costo_anterior: 0, // No cambiamos costo
                costo_nuevo: 0,
                fecha_cambio: new Date().toISOString(),
                empleado_id: user.id,
                organization_id: perfil.organization_id
            })

            toast.success("¡Oferta Activada! 🔥", {
                description: `${prod.nombre} bajó de $${precioViejo} a $${precioNuevo}`
            })

            onDiscountApplied() // Recargamos el dashboard

        } catch (error: any) {
            toast.error("Error al aplicar oferta", { description: error.message })
        } finally {
            setLoadingId(null)
        }
    }

    if (oportunidades.length === 0) return null // Si no hay urgencias, el componente se oculta (limpieza visual)

    return (
        <Card className="bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0 shadow-xl overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Megaphone className="w-32 h-32 transform rotate-12" />
            </div>
            
            <div className="p-4 relative z-10">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                    <Megaphone className="h-5 w-5 animate-bounce" /> Oportunidad "Happy Hour"
                </h3>
                <p className="text-pink-100 text-xs mb-4 max-w-[80%]">
                    Detectamos {oportunidades.length} productos a punto de vencer. Activa una oferta rápida para recuperar capital.
                </p>

                <div className="space-y-3">
                    {oportunidades.map((item, idx) => {
                        const dias = Math.ceil((new Date(item.fechaVenc).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        return (
                            <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-3 flex items-center justify-between border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{item.emoji}</div>
                                    <div>
                                        <p className="font-bold text-sm leading-tight">{item.nombre}</p>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="secondary" className="h-5 text-[10px] bg-white text-rose-600 hover:bg-white">
                                                {item.unidades} unid.
                                            </Badge>
                                            <span className="text-[10px] text-pink-200 flex items-center">
                                                <ClockIcon className="w-3 h-3 mr-1" /> 
                                                {dias <= 0 ? "¡VENCE HOY!" : `Vence en ${dias} días`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    size="sm" 
                                    onClick={() => aplicarDescuento(item)}
                                    disabled={loadingId === item.producto_id}
                                    className="bg-white text-rose-600 hover:bg-rose-50 border-0 font-bold shadow-sm transition-all active:scale-95"
                                >
                                    {loadingId === item.producto_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Tag className="h-3 w-3 mr-1" /> 30% OFF
                                        </>
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
}

function ClockIcon({className}: {className?: string}) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}