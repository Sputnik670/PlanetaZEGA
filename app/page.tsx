"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Store, User } from "lucide-react"
import DashboardDueno from "@/components/dashboard-dueno"
import VistaEmpleado from "@/components/vista-empleado"

export default function HomePage() {
  const [userRole, setUserRole] = useState<"none" | "owner" | "employee">("none")

  if (userRole === "owner") {
    return <DashboardDueno onBack={() => setUserRole("none")} />
  }

  if (userRole === "employee") {
    return <VistaEmpleado onBack={() => setUserRole("none")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-balance text-foreground">Kiosco App</h1>
          <p className="text-muted-foreground text-lg">Selecciona tu perfil para continuar</p>
        </div>

        <div className="space-y-4">
          <Card
            className="p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => setUserRole("owner")}
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center flex-shrink-0">
                <Store className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">Dueño</h2>
                <p className="text-sm text-muted-foreground mt-1">Gestión completa del negocio</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 hover:border-accent/50"
            onClick={() => setUserRole("employee")}
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-chart-2 flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">Empleado</h2>
                <p className="text-sm text-muted-foreground mt-1">Tareas del día a día</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
