"use client"

import { AlertTriangle, Package, ClipboardList, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BottomNavProps {
  active: "alerts" | "inventory" | "tasks" | "caja"
  onChange: (tab: "alerts" | "inventory" | "tasks" | "caja") => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-50">
      <div className="flex items-center justify-around p-2 max-w-md mx-auto">
        
        {/* BOTÓN ALERTAS */}
        <Button
          variant={active === "alerts" ? "default" : "ghost"}
          size="lg"
          onClick={() => onChange("alerts")}
          className="flex-1 flex flex-col gap-1 h-auto py-3"
        >
          <AlertTriangle
            className={`h-6 w-6 ${active === "alerts" ? "text-primary-foreground" : "text-muted-foreground"}`}
          />
          <span
            className={`text-xs font-semibold ${active === "alerts" ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            Alertas
          </span>
        </Button>

        {/* BOTÓN INVENTARIO */}
        <Button
          variant={active === "inventory" ? "default" : "ghost"}
          size="lg"
          onClick={() => onChange("inventory")}
          className="flex-1 flex flex-col gap-1 h-auto py-3"
        >
          <Package
            className={`h-6 w-6 ${active === "inventory" ? "text-primary-foreground" : "text-muted-foreground"}`}
          />
          <span
            className={`text-xs font-semibold ${active === "inventory" ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            Stock
          </span>
        </Button>

        {/* BOTÓN TAREAS */}
        <Button
          variant={active === "tasks" ? "default" : "ghost"}
          size="lg"
          onClick={() => onChange("tasks")}
          className="flex-1 flex flex-col gap-1 h-auto py-3"
        >
          <ClipboardList
            className={`h-6 w-6 ${active === "tasks" ? "text-primary-foreground" : "text-muted-foreground"}`}
          />
          <span
            className={`text-xs font-semibold ${active === "tasks" ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            Tareas
          </span>
        </Button>

        {/* BOTÓN CAJA (NUEVO) */}
        <Button
          variant={active === "caja" ? "default" : "ghost"}
          size="lg"
          onClick={() => onChange("caja")}
          className="flex-1 flex flex-col gap-1 h-auto py-3"
        >
          <ShoppingCart
            className={`h-6 w-6 ${active === "caja" ? "text-primary-foreground" : "text-muted-foreground"}`}
          />
          <span
            className={`text-xs font-semibold ${active === "caja" ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            Caja
          </span>
        </Button>

      </div>
    </div>
  )
}