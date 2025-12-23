// components/reloj-control.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, LogIn, LogOut, MapPin, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns" // ✅ Corregido: Agregado parseISO
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils" // ✅ Corregido: Agregado import de cn

interface RelojControlProps {
  sucursalId: string
  sucursalNombre: string
}

export default function RelojControl({ sucursalId, sucursalNombre }: RelojControlProps) {
  const [loading, setLoading] = useState(false)
  const [fichajeActivo, setFichajeActivo] = useState<any>(null)

  // 1. Verificamos si hay un fichaje de entrada pendiente (sin salida)
  useEffect(() => {
    const checkFichaje = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('asistencia')
        .select('*')
        .eq('empleado_id', user.id)
        .is('salida', null)
        .maybeSingle()
      
      setFichajeActivo(data)
    }
    checkFichaje()
  }, [])

  const handleFichaje = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesión activa")

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil?.organization_id) throw new Error("No se encontró organización")

      if (!fichajeActivo) {
        // --- REGISTRAR ENTRADA ---
        const { data, error } = await supabase
          .from('asistencia')
          .insert({
            organization_id: perfil.organization_id,
            sucursal_id: sucursalId,
            empleado_id: user.id,
            entrada: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) throw error
        setFichajeActivo(data)
        toast.success("Entrada registrada", { description: `Local: ${sucursalNombre}` })
      } else {
        // --- REGISTRAR SALIDA ---
        const { error } = await supabase
          .from('asistencia')
          .update({ salida: new Date().toISOString() })
          .eq('id', fichajeActivo.id)
        
        if (error) throw error
        setFichajeActivo(null)
        toast.info("Salida registrada", { description: "Jornada finalizada correctamente." })
      }
    } catch (error: any) {
      console.error("Error fichaje:", error)
      toast.error("Error al procesar el fichaje", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn(
      "p-4 border-2 transition-all shadow-sm",
      fichajeActivo ? "border-amber-200 bg-amber-50/30" : "border-blue-200 bg-blue-50/30"
    )}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={cn(
            "p-3 rounded-2xl shadow-inner",
            fichajeActivo ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
          )}>
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sistema de Presentismo</p>
            <h3 className="font-bold text-sm text-slate-800">
                {fichajeActivo ? "Turno en curso" : "Listo para ingresar"}
            </h3>
            <p className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                <MapPin className="h-3 w-3" /> {sucursalNombre}
            </p>
          </div>
        </div>

        <Button 
          onClick={handleFichaje} 
          disabled={loading}
          variant={fichajeActivo ? "destructive" : "default"}
          className={cn(
            "w-full sm:w-auto rounded-xl px-8 font-black text-xs h-12 shadow-md transition-transform active:scale-95",
            !fichajeActivo && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            fichajeActivo ? (
                <><LogOut className="mr-2 h-4 w-4"/> FICHAR SALIDA</>
            ) : (
                <><LogIn className="mr-2 h-4 w-4"/> FICHAR ENTRADA</>
            )
          )}
        </Button>
      </div>
      
      {fichajeActivo && (
        <div className="mt-4 pt-3 border-t border-amber-200/50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">
                Hora de inicio:
            </span>
            <span className="text-xs font-mono font-black text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                {format(parseISO(fichajeActivo.entrada), 'HH:mm:ss')} hs
            </span>
        </div>
      )}
    </Card>
  )
}