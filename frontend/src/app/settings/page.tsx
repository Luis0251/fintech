"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { api } from '@/lib/api';
import { showError, showSuccess, showWarning } from '@/lib/toast';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Target, 
  Lightbulb, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  Wallet,
  Settings,
  Key,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/accounts', icon: Wallet },
  { name: 'Transacciones', href: '/transactions', icon: CreditCard },
  { name: 'Presupuestos', href: '/budgets', icon: PieChart },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Insights', href: '/insights', icon: Lightbulb },
  { name: 'Chat IA', href: '/chat', icon: MessageSquare },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function SettingsPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // API Keys state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [visionApiKey, setVisionApiKey] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [showVisionKey, setShowVisionKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Status
  const [hasAiKey, setHasAiKey] = useState(false);
  const [hasVisionKey, setHasVisionKey] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const store = useAuthStore.getState();
      await store.checkAuth();
      
      // Check if token exists after checkAuth
      const token = api.getToken();
      if (!token) {
        router.push('/');
        return;
      }
      
      // Check existing API keys
      try {
        const [aiKeyResult, visionKeyResult] = await Promise.all([
          api.getHasApiKey(),
          api.getHasVisionApiKey()
        ]);
        setHasAiKey(aiKeyResult.hasApiKey);
        setHasVisionKey(visionKeyResult.hasVisionApiKey);
      } catch (err) {
        console.error('Error checking API keys:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const saveAiApiKey = async () => {
    if (!aiApiKey.trim()) {
      showWarning('Ingresa una API key');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.saveApiKey(aiApiKey, aiProvider);
      setHasAiKey(true);
      setAiApiKey('');
      showSuccess('API key de IA guardada correctamente');
      
      // Update store state so menu items appear
      const store = useAuthStore.getState();
      await store.checkApiKey();
    } catch (err: any) {
      showError('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAiApiKey = async () => {
    if (!confirm('¿Estás seguro de eliminar la API key de IA?')) return;
    
    setIsSaving(true);
    try {
      await api.deleteApiKey();
      setHasAiKey(false);
      showSuccess('API key de IA eliminada');
      
      // Update store state so menu items disappear
      const store = useAuthStore.getState();
      store.setHasApiKey(false);
    } catch (err: any) {
      showError('Error al eliminar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveVisionApiKey = async () => {
    if (!visionApiKey.trim()) {
      showWarning('Ingresa una API key de Vision');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.saveVisionApiKey(visionApiKey);
      setHasVisionKey(true);
      setVisionApiKey('');
      showSuccess('API key de Vision guardada correctamente');
    } catch (err: any) {
      showError('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVisionApiKey = async () => {
    if (!confirm('¿Estás seguro de eliminar la API key de Vision?')) return;
    
    setIsSaving(true);
    try {
      await api.deleteVisionApiKey();
      setHasVisionKey(false);
      showSuccess('API key de Vision eliminada');
    } catch (err: any) {
      showError('Error al eliminar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-background border-r" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h1 className="text-xl font-bold">FinTech</h1>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg ${pathname === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted w-full text-left text-red-500"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:block">
        <div className="flex flex-col h-full border-r bg-background">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">FinTech</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${pathname === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted w-full text-left text-red-500"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Configuración</h1>
          <div className="w-10"></div>
        </div>

        <div className="p-6 max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Configuración de API Keys</h2>
            <p className="text-muted-foreground">Gestiona las claves API necesarias para las funcionalidades de IA</p>
          </div>

          {/* AI API Key Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key de Inteligencia Artificial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Esta API key se usa para el chat de IA y para generar insights automáticos. 
                    Actualmente soportamos <strong>Google Gemini</strong> y <strong>OpenAI</strong>.
                  </p>
                </div>
              </div>

              {hasAiKey ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">API key configurada</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={deleteAiApiKey} disabled={isSaving}>
                    Eliminar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai')}
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showAiKey ? 'text' : 'password'}
                        placeholder={aiProvider === 'gemini' ? 'Ingresa tu API key de Gemini' : 'Ingresa tu API key de OpenAI'}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAiKey(!showAiKey)}
                      >
                        {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button onClick={saveAiApiKey} disabled={isSaving || !aiApiKey.trim()}>
                    {isSaving ? 'Guardando...' : 'Guardar API Key'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Vision API Key Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key de Google Vision (OCR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Importante:</p>
                    <p>
                      Esta API key permite escanear tickets y receipts para detectar automáticamente el monto. 
                      Sin esta key, la cámara usará OCR local (menos preciso).
                    </p>
                    <p className="mt-2">
                      <strong>1000 unidades gratuitas por mes</strong> — suficiente para uso personal.
                    </p>
                  </div>
                </div>
              </div>

              {hasVisionKey ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">API key de Vision configurada</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={deleteVisionApiKey} disabled={isSaving}>
                    Eliminar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showVisionKey ? 'text' : 'password'}
                        placeholder="Ingresa tu API key de Google Vision"
                        value={visionApiKey}
                        onChange={(e) => setVisionApiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowVisionKey(!showVisionKey)}
                      >
                        {showVisionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button onClick={saveVisionApiKey} disabled={isSaving || !visionApiKey.trim()}>
                    {isSaving ? 'Guardando...' : 'Guardar API Key de Vision'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}