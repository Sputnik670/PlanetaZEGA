// components/auth-form.tsx

"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, Lock, LogIn, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // Lógica de Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('¡Bienvenido!', { description: 'Has iniciado sesión correctamente.' })
      } else {
        // Lógica de Registro (Signup)
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast.success('Registro exitoso', { 
            description: 'Revisa tu correo para confirmar tu cuenta. Luego podrás iniciar sesión.' 
        })
        // Opcional: Volver a la vista de login después del registro
        setIsLogin(true)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(isLogin ? 'Error al iniciar sesión' : 'Error al registrar', { 
        description: error.message || "Credenciales inválidas o error de red." 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-accent/10">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Kiosco App</h1>
          <p className="text-muted-foreground mt-1">{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
            </label>
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" /> Contraseña
            </label>
            <Input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : isLogin ? (
              <><LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión</>
            ) : (
              <><UserPlus className="mr-2 h-5 w-5" /> Registrar Cuenta</>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <Button 
            variant="link" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-primary hover:text-primary/80 h-auto p-0"
            disabled={loading}
          >
            {isLogin 
              ? "¿Necesitas una cuenta? Regístrate aquí." 
              : "¿Ya tienes cuenta? Inicia sesión."
            }
          </Button>
        </div>
      </Card>
    </div>
  )
}