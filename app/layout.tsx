import type { Metadata } from "next"
import { Inter } from "next/font/google" // Usamos Inter por defecto o Geist si prefieres
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner" // <--- Importante: Esta es la nueva librería

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Kiosco App - Gestión Inteligente",
  description: "Aplicación web para gestión de kioscos con control de vencimientos y tareas operativas",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Analytics />
        <Toaster /> {/* <--- El componente que muestra las notificaciones */}
      </body>
    </html>
  )
}