"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useDataStore } from '@/stores';
import { api } from '@/lib/api';
import { showError, showSuccess, showInfo, showWarning } from '@/lib/toast';
import { extractAmountFromImage } from '@/lib/ocr';
import { compressImage, estimateBase64Size } from '@/lib/image-compressor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  Camera,
  ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

// Categorías válidas por tipo de transacción
const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills and Utilities',
  'Healthcare',
  'Education',
  'Travel',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Refund',
];

// Todas las categorías para mostrar en filtro (sin duplicados)
const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  'Other',
  ...INCOME_CATEGORIES,
];

export default function TransactionsPage() {
  const { logout } = useAuthStore();
  const { transactions, accounts, fetchTransactions, fetchAccounts, fetchBalance } = useDataStore();
  const router = useRouter();
  
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ category: '', startDate: '', endDate: '' });
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    type: 'EXPENSE',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0],
    attachmentUrl: '',
  });
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasVisionApiKey, setHasVisionApiKey] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if user has Vision API key configured
  useEffect(() => {
    api.getHasVisionApiKey().then(result => {
      setHasVisionApiKey(result.hasVisionApiKey);
    }).catch(() => {
      setHasVisionApiKey(false);
    });
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (!showCamera) return;

    let mounted = true;

    const startVideo = async () => {
      try {
        // Try environment camera first (mobile), then fallback to any camera (desktop)
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
        } catch {
          // Fallback for desktop without environment camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        }
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        streamRef.current = stream;
        
        // Update state to trigger re-render with video element
        setIsCameraReady(true);
        
        // Assign stream to video after a small delay to ensure element is rendered
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 200);
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) {
          showError('No se pudo acceder a la cámara');
          setShowCamera(false);
        }
      }
    };

    startVideo();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera]);

  // Obtener categorías válidas según el tipo seleccionado
  const getCategoriesForType = (type: string) => {
    return type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  };

  // Validar que la categoría sea válida para el tipo
  const isValidCategory = (type: string, category: string) => {
    const validCategories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return validCategories.includes(category);
  };

  // Initialize auth and load data - always try to load first, redirect only on auth error
  useEffect(() => {
    const initialize = () => {
      // Always try to load data - the API will handle auth errors
      fetchAccounts();
      fetchTransactions();
    };
    
    initialize();
  }, []);

  // Refresh transactions when accounts change (after creating account)
  useEffect(() => {
    if (accounts.length > 0) {
      fetchTransactions();
    }
  }, [accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar que tenga cuenta seleccionada
    if (!formData.accountId) {
      setError('Seleccioná una cuenta');
      return;
    }

    // Validar monto
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Ingresá un monto válido');
      return;
    }

    // Validar categoría según tipo
    if (!isValidCategory(formData.type, formData.category)) {
      const validCategories = formData.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setError(`La categoría "${formData.category}" no es válida para "${formData.type === 'INCOME' ? 'Ingreso' : 'Gasto'}". Seleccioná: ${validCategories.join(', ')}`);
      return;
    }

    const payload = {
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      description: formData.description,
      date: formData.date,
      attachmentUrl: formData.attachmentUrl || undefined,
    };
    try {
      await api.createTransaction(payload);
      fetchTransactions();
      fetchAccounts();
      fetchBalance();
      setShowForm(false);
      setFormData({
        accountId: '',
        amount: '',
        type: 'EXPENSE',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0],
        attachmentUrl: '',
      });
      setError('');
      showSuccess('Transacción creada');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;
    try {
      await api.deleteTransaction(id);
      fetchTransactions();
      fetchAccounts();
    } catch (error: any) {
      setError('Error al eliminar: ' + error.message);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTransactions({
      category: newFilters.category,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
    });
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      showError('No se pudo acceder a la cámara');
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const rawImageData = canvas.toDataURL('image/jpeg');
        
        compressImage(rawImageData, 800, 800, 0.7).then((compressedImage) => {
          const originalSize = estimateBase64Size(rawImageData);
          const compressedSize = estimateBase64Size(compressedImage);
          console.log(`Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((compressedSize / originalSize) * 100)}%)`);
          
          setFormData({ ...formData, attachmentUrl: compressedImage });
          
          // Process with OCR - use Vision API if available, fallback to local
          setIsProcessingOCR(true);
          
          const processOcr = async () => {
            if (hasVisionApiKey) {
              try {
                const result = await api.processOcr(compressedImage);
                console.log('=== OCR RESULT (Vision API) ===');
                console.log('Amount:', result.amount);
                console.log('Raw text:', result.rawText);
                console.log('================================');
                
                if (result.amount) {
                  setFormData(prev => ({ ...prev, amount: result.amount?.toString() || '' }));
                  showInfo(`Monto detectado: $${result.amount.toLocaleString()}`);
                } else {
                  showWarning('No se detectó monto en la imagen');
                }
                return;
              } catch (err) {
                console.error('Vision API error, falling back to local OCR:', err);
              }
            }
            
            // Fallback to local Tesseract OCR
            const result = await extractAmountFromImage(compressedImage);
            console.log('=== OCR RESULT (Local) ===');
            console.log('Amount:', result.amount);
            console.log('Confidence:', result.confidence);
            console.log('Raw text:', result.rawText);
            console.log('===========================');
            
            if (result.amount) {
              setFormData(prev => ({ ...prev, amount: result.amount?.toString() || '' }));
              showInfo(`Monto detectado: $${result.amount.toLocaleString()} (confianza: ${Math.round(result.confidence)}%)`);
            } else {
              showWarning('No se detectó monto en la imagen');
            }
          };
          
          processOcr().finally(() => setIsProcessingOCR(false));
        });
      }
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Use real data from API - no mock fallback
  const displayTransactions = transactions;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Transacciones</h1>
              <p className="text-muted-foreground">Registrá y gestioná tus gastos</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Transacción
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <Select value={filters.category || 'all'} onValueChange={(v) => handleFilterChange('category', v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {ALL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Transaction Form */}
        {showForm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Nueva Transacción</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cuenta</Label>
                    <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formData.type} onValueChange={(v) => {
                      // Ajustar categoría según tipo si no es válida
                      const newType = v;
                      const validCategories = newType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                      const newCategory = validCategories.includes(formData.category) ? formData.category : validCategories[0];
                      setFormData({ ...formData, type: v, category: newCategory });
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Ingreso</SelectItem>
                        <SelectItem value="EXPENSE">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoriesForType(formData.type).map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción opcional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Foto de Factura</Label>
                    {formData.attachmentUrl ? (
                      <div className="relative mt-2 border rounded-md p-2">
                        <img 
                          src={formData.attachmentUrl} 
                          alt="Factura" 
                          className="max-h-40 mx-auto rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setFormData({ ...formData, attachmentUrl: '' })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={startCamera}
                          disabled={isProcessingOCR}
                        >
                          <Camera className="w-4 h-4" />
                          <span className="text-sm">{isProcessingOCR ? 'Procesando...' : 'Cámara'}</span>
                        </button>
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm">{isProcessingOCR ? 'Procesando...' : 'Galería'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isProcessingOCR}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const rawImageData = event.target?.result as string;
                                  
                                  const compressedImage = await compressImage(rawImageData, 800, 800, 0.7);
                                  const originalSize = estimateBase64Size(rawImageData);
                                  const compressedSize = estimateBase64Size(compressedImage);
                                  console.log(`Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((compressedSize / originalSize) * 100)}%)`);
                                  
                                  setFormData({ ...formData, attachmentUrl: compressedImage });
                                  
                                  setIsProcessingOCR(true);
                                  
                                  // Use Vision API if available, fallback to local
                                  if (hasVisionApiKey) {
                                    try {
                                      const result = await api.processOcr(compressedImage);
                                      if (result.amount) {
                                        setFormData(prev => ({ ...prev, amount: result.amount?.toString() || '' }));
                                        showInfo(`Monto detectado: $${result.amount.toLocaleString()}`);
                                      } else {
                                        showWarning('No se detectó monto en la imagen');
                                      }
                                    } catch (err) {
                                      console.error('Vision API error, falling back:', err);
                                      // Fallback to local OCR
                                      const result = await extractAmountFromImage(compressedImage);
                                      if (result.amount) {
                                        setFormData(prev => ({ ...prev, amount: result.amount?.toString() || '' }));
                                        showInfo(`Monto detectado: $${result.amount.toLocaleString()} (confianza: ${Math.round(result.confidence)}%)`);
                                      } else {
                                        showWarning('No se detectó monto en la imagen');
                                      }
                                    }
                                  } else {
                                    const result = await extractAmountFromImage(compressedImage);
                                    if (result.amount) {
                                      setFormData(prev => ({ ...prev, amount: result.amount?.toString() || '' }));
                                      showInfo(`Monto detectado: $${result.amount.toLocaleString()} (confianza: ${Math.round(result.confidence)}%)`);
                                    } else {
                                      showWarning('No se detectó monto en la imagen');
                                    }
                                  }
                                  setIsProcessingOCR(false);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit">Crear Transacción</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-4 w-full max-w-md">
              <div className="relative">
                {!isCameraReady ? (
                  <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Iniciando cámara...</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg"
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={stopCamera}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={capturePhoto} 
                  className="flex-1"
                  disabled={!isCameraReady}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capturar
                </Button>
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {displayTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {tx.type === 'INCOME' ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description || tx.category}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('es-AR')}</span>
                        {tx.attachmentUrl && (
                          <>
                            <span>•</span>
                            <button 
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={() => setPreviewImage(tx.attachmentUrl)}
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-lg font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                    </p>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(tx.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {displayTransactions.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No hay transacciones. ¡Registrá tu primera transacción!</p>
          </Card>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img 
                src={previewImage} 
                alt="Factura" 
                className="max-w-full max-h-[90vh] rounded-lg"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}