"use client"

import { AlertTriangle, Package, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BottomNavProps {
  active: "alerts" | "inventory" | "tasks"
  onChange: (tab: "alerts" | "inventory" | "tasks") => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl">
      <div className="flex items-center justify-around p-2 max-w-md mx-auto">
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
            Inventario
          </span>
        </Button>

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
      </div>
    </div>
  )
}
