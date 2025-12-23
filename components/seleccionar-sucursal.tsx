"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Store } from "lucide-react"
import { toast } from "sonner"

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
}

interface SeleccionarSucursalProps {
  organizationId: string
  onSelect: (sucursalId: string) => void
  userId: string
  userRol: "dueño" | "empleado"
}

export default function SeleccionarSucursal({ organizationId, onSelect, userRol }: SeleccionarSucursalProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const { data, error } = await supabase
          .from('sucursales')
          .select('id, nombre, direccion')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (data) {
          setSucursales(data)
          // Opcional: Si solo hay una sucursal, ¿autoseleccionar? 
          // Por ahora dejamos que el usuario haga click para confirmar su entrada.
        }
      } catch (error) {
        console.error(error)
        toast.error("Error al cargar sucursales")
      } finally {
        setLoading(false)
      }
    }

    cargarSucursales()
  }, [organizationId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md p-6 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-4">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-muted-foreground">Selecciona la sucursal para operar hoy.</p>
        </div>

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

        {sucursales.length === 0 && (
          <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
            ⚠️ No se encontraron sucursales para esta organización.
            {userRol === 'dueño' && (
                <p className="mt-2 font-bold">Como dueño, deberías crear una desde el panel.</p>
            )}
          </div>
        )}

        <div className="pt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-xs text-muted-foreground">
            Recargar
          </Button>
        </div>
      </Card>
    </div>
  )
}