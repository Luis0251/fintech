"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { api } from '@/lib/api';
import { DollarSign, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register } = useAuthStore();
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    useAuthStore.getState().checkAuth();
    // Give time for auth check to complete
    setTimeout(() => setIsAuthLoading(false), 100);
  }, []);

  // Don't redirect from home page - let the protected pages handle their own redirects

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        router.push('/dashboard');
      } else {
        await register(email, password, name);
        
        // Save API key if provided (only on register)
        if (apiKey.trim()) {
          try {
            await api.saveApiKey(apiKey.trim(), provider);
          } catch (keyError) {
            console.error('Failed to save API key:', keyError);
          }
        }
        
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Financial Copilot</CardTitle>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Tu nombre"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="••••••••"
                required
              />
            </div>
            
            {/* Optional API Key Field - Only show on register */}
            {!isLogin && (
              <div className="border-t pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Agregar API key para IA (opcional)</span>
                </button>
                
                {showApiKey && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium">Proveedor de IA</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as 'gemini' | 'openai')}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        placeholder={provider === 'gemini' ? 'AIza...' : 'sk-...'}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {provider === 'gemini' 
                          ? 'Obtenela en: https://aistudio.google.com/app/apikey'
                          : 'Obtenela en: https://platform.openai.com/api-keys'
                        }
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Si no agregás una key, las funciones de IA no estarán disponibles.
                </p>
              </div>
            )}
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
          </form>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}