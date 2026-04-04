"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useDataStore } from '@/stores';
import { api } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
];

export default function BudgetsPage() {
  const { budgets, fetchBudgets } = useDataStore();
  const router = useRouter();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    limitAmount: '',
    period: 'MONTHLY',
  });

  useEffect(() => {
    const initialize = async () => {
      useAuthStore.getState().checkAuth();
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) router.replace('/');
        else fetchBudgets();
      }, 100);
    };
    initialize();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBudget({
        category: formData.category,
        limitAmount: parseFloat(formData.limitAmount),
        period: formData.period,
      });
      fetchBudgets();
      setShowForm(false);
      setFormData({ category: '', limitAmount: '', period: 'MONTHLY' });
      showSuccess('Presupuesto creado');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    try {
      await api.deleteBudget(id);
      fetchBudgets();
      showSuccess('Presupuesto eliminado');
    } catch (error: any) {
      showError(error.message);
    }
  };

  // Use real data - no mock fallback
  const displayBudgets = budgets;

  const getAlertStyle = (percent: number) => {
    if (percent >= 100) return 'border-red-500 bg-red-50';
    if (percent >= 90) return 'border-orange-500 bg-orange-50';
    if (percent >= 80) return 'border-yellow-500 bg-yellow-50';
    return '';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '[&>*]:bg-red-500';
    if (percent >= 90) return '[&>*]:bg-orange-500';
    if (percent >= 80) return '[&>*]:bg-yellow-500';
    return '[&>*]:bg-primary';
  };

  const totalBudget = displayBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpent = displayBudgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

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
              <h1 className="text-3xl font-bold">Presupuestos</h1>
              <p className="text-muted-foreground">Controlá tus gastos por categoría</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Presupuesto</p>
                <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Gastado</p>
                <p className="text-2xl font-bold text-red-600">${totalSpent.toLocaleString()}</p>
              </div>
            </div>
            <Progress value={overallPercent} className={`h-3 ${getProgressColor(overallPercent)}`} />
            <p className="text-sm text-muted-foreground mt-2">
              {totalBudget > 0 ? `${overallPercent.toFixed(0)}% del presupuesto total utilizado` : 'Sin presupuestos configurados'}
            </p>
          </CardContent>
        </Card>

        {/* New Budget Form */}
        {showForm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Nuevo Presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Límite</Label>
                    <Input
                      type="number"
                      value={formData.limitAmount}
                      onChange={(e) => setFormData({ ...formData, limitAmount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="MONTHLY">Mensual</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Crear Presupuesto</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayBudgets.map((budget: any) => {
            const percentUsed = budget.percentUsed ?? (budget.limitAmount > 0 ? ((budget.spentAmount || 0) / budget.limitAmount) * 100 : 0);
            const remaining = budget.limitAmount - (budget.spentAmount || 0);
            return (
              <Card key={budget.id} className={getAlertStyle(percentUsed)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(budget.id)}>
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gastado</span>
                      <span className="font-medium">${(budget.spentAmount || 0).toLocaleString()}</span>
                    </div>
                    <Progress value={percentUsed} className={`h-2 ${getProgressColor(percentUsed)}`} />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Límite</span>
                      <span>${budget.limitAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restante</span>
                      <span className={remaining < 0 ? 'text-red-500 font-medium' : 'text-green-500'}>
                        ${remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {displayBudgets.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No tenés presupuestos creados</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Presupuesto
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}