"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { api } from '@/lib/api';
import { DollarSign, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <Card variant="glass" className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 glass-primary rounded-2xl flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Financial Copilot</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block mb-1">Nombre</label>
                <Input
                  type="text"
                  variant="glass"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 block mb-1">Email</label>
              <Input
                type="email"
                variant="glass"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 block mb-1">Contraseña</label>
              <Input
                type="password"
                variant="glass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12"
              />
            </div>
            
            {/* Optional API Key Field - Only show on register */}
            {!isLogin && (
              <div className="border-t border-border/30 pt-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Agregar API key para IA (opcional)</span>
                </button>
                
                {showApiKey && (
                  <div className="mt-4 space-y-4 p-4 glass-card rounded-xl">
                    <div>
                      <label className="text-sm font-medium">Proveedor de IA</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as 'gemini' | 'openai')}
                        className="w-full mt-1 px-3 py-2 glass-input rounded-xl bg-transparent"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                      </label>
                      <Input
                        type="password"
                        variant="glass"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={provider === 'gemini' ? 'AIza...' : 'sk-...'}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {provider === 'gemini' 
                          ? 'Obtenela en: https://aistudio.google.com/app/apikey'
                          : 'Obtenela en: https://platform.openai.com/api-keys'
                        }
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3 ml-1">
                  Si no agregás una key, las funciones de IA no estarán disponibles.
                </p>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}
            <Button type="submit" variant="glass-primary" className="w-full h-12 text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
          </form>
          <p className="text-center mt-6 text-sm text-muted-foreground">
            {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}