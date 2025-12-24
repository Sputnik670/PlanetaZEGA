"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Store } from "lucide-react"
import { toast } from "sonner"
// Fusionamos con el componente de gestión que ya tienes
import GestionSucursales from "@/components/gestion-sucursales"

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
}

interface SeleccionarSucursalProps {
  organizationId: string
  onSelect: (sucursalId: string) => void
  userId: string // Mantenemos la prop aunque no se use para no romper app/page.tsx
  userRol: "dueño" | "empleado"
}

export default function SeleccionarSucursal({ organizationId, onSelect, userRol }: SeleccionarSucursalProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Cargamos sucursales (con useCallback para poder pasarla como prop de actualización)
  const cargarSucursales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre, direccion')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) setSucursales(data)
    } catch (error) {
      console.error(error)
      toast.error("Error al cargar sucursales")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    cargarSucursales()
  }, [cargarSucursales])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      {/* Si no hay sucursales, ampliamos un poco el Card para el formulario de creación */}
      <Card className={`w-full ${sucursales.length === 0 ? 'max-w-2xl' : 'max-w-md'} p-6 space-y-6 shadow-xl transition-all`}>
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-4">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-muted-foreground">
            {sucursales.length > 0 
              ? "Selecciona la sucursal para operar hoy." 
              : "No se encontraron sucursales registradas."}
          </p>
        </div>

        {sucursales.length > 0 ? (
          /* LISTADO DE SUCURSALES (Tu lógica original) */
          <div className="space-y-3">
            {sucursales.map((sucursal) => (
              <button
                key={sucursal.id}
                onClick={() => onSelect(sucursal.id)}
                className="w-full text-left p-4 rounded-lg border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group flex items-start gap-4 bg-white"
              >
                <MapPin className="h-5 w-5 text-slate-400 group-hover:text-primary mt-1" />
                <div>
                  <span className="block font-bold text-gray-900 group-hover:text-primary">
                    {sucursal.nombre}
                  </span>
                  {sucursal.direccion && (
                    <span className="text-xs text-muted-foreground">
                      {sucursal.direccion}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* FLUJO PARA DUEÑO NUEVO (Integrando GestionSucursales) */
          <div className="space-y-4">
            {userRol === 'dueño' ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-800">
                  <p className="font-bold">¡Hola! Como dueño, necesitas crear tu primer local para entrar al sistema.</p>
                </div>
                {/* Inyectamos el componente de gestión. 
                   Al pasarle cargarSucursales, cuando cree el local, esta pantalla se refresca sola.
                */}
                <GestionSucursales onUpdate={cargarSucursales} />
              </div>
            ) : (
              <div className="text-center p-6 bg-red-50 text-red-800 rounded-lg">
                <p className="text-sm">⚠️ Tu organización no tiene sucursales activas.</p>
                <p className="text-[10px] mt-1 uppercase font-bold">Contacta al administrador.</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 text-center border-t">
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-xs text-muted-foreground">
            Recargar
          </Button>
        </div>
      </Card>
    </div>
  )
}