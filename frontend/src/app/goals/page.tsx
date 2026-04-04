"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useDataStore } from '@/stores';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Target, Calendar, DollarSign, CheckCircle, Clock, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function GoalsPage() {
  const { goals, fetchGoals, fetchAccounts } = useDataStore();
  const router = useRouter();
  
  const [showForm, setShowForm] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    description: '',
  });

  useEffect(() => {
    const initialize = async () => {
      useAuthStore.getState().checkAuth();
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) router.replace('/');
        else {
          fetchGoals();
          fetchAccounts();
        }
      }, 100);
    };
    initialize();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGoal({
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: formData.currentAmount ? parseFloat(formData.currentAmount) : 0,
        deadline: formData.deadline || undefined,
        description: formData.description || undefined,
      });
      fetchGoals();
      setShowForm(false);
      setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', description: '' });
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal || !contributeAmount) return;
    try {
      await api.addContribution(contributeGoal, parseFloat(contributeAmount));
      fetchGoals();
      fetchAccounts();
      setContributeGoal(null);
      setContributeAmount('');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    try {
      await api.deleteGoal(id);
      fetchGoals();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Use real data - no mock fallback
  const displayGoals = goals;

  const activeGoals = displayGoals.filter((g: any) => !g.isCompleted);
  const completedGoals = displayGoals.filter((g: any) => g.isCompleted);

  const calculateDaysLeft = (deadline: string | null) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const totalTarget = activeGoals.reduce((sum: number, g: any) => sum + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum: number, g: any) => sum + (g.currentAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

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
              <h1 className="text-3xl font-bold">Metas de Ahorro</h1>
              <p className="text-muted-foreground">Planificá y seguí tus objetivos financieros</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Meta
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Objetivo</p>
                <p className="text-2xl font-bold">${totalTarget.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Ahorrado</p>
                <p className="text-2xl font-bold text-blue-600">${totalSaved.toLocaleString()}</p>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3 [&>*]:bg-blue-500" />
            <p className="text-sm text-muted-foreground mt-2">
              {totalTarget > 0 
                ? `${overallProgress.toFixed(0)}% del objetivo total (${activeGoals.length} metas activas)`
                : 'Sin metas configuradas'}
            </p>
          </CardContent>
        </Card>

        {/* New Goal Form */}
        {showForm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Nueva Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre de la Meta</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ej. Vacaciones"
                      required
                    />
                  </div>
                  <div>
                    <Label>Monto Objetivo</Label>
                    <Input
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Monto Actual (opcional)</Label>
                    <Input
                      type="number"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Fecha Límite</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Crear Meta</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Goals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal: any) => {
              const daysLeft = calculateDaysLeft(goal.deadline);
              const percentComplete = goal.percentComplete ?? (goal.targetAmount > 0 ? ((goal.currentAmount || 0) / goal.targetAmount) * 100 : 0);
              return (
                <Card key={goal.id} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {goal.name}
                        {daysLeft !== null && daysLeft <= 30 && (
                          <Clock className="w-4 h-4 text-orange-500" />
                        )}
                      </CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ahorrado</span>
                        <span className="font-medium">${(goal.currentAmount || 0).toLocaleString()}</span>
                      </div>
                      <Progress value={percentComplete} className="h-2 [&>*]:bg-blue-500" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Objetivo</span>
                        <span>${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Restante</span>
                        <span className="text-blue-600 font-medium">
                          ${(goal.targetAmount - (goal.currentAmount || 0)).toLocaleString()}
                        </span>
                      </div>
                      {daysLeft !== null && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{daysLeft} días restantes</span>
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => setContributeGoal(goal.id)}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Agregar Contribución
                      </Button>
                    </div>
                  </CardContent>

                  {/* Contribute Modal */}
                  {contributeGoal === goal.id && (
                    <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-4">
                      <div className="text-center space-y-4">
                        <p className="font-medium">Agregar contribución a "{goal.name}"</p>
                        <Input
                          type="number"
                          placeholder="Monto"
                          value={contributeAmount}
                          onChange={(e) => setContributeAmount(e.target.value)}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleContribute}>Agregar</Button>
                          <Button variant="outline" onClick={() => setContributeGoal(null)}>Cancelar</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Metas Completadas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedGoals.map((goal: any) => (
                <Card key={goal.id} className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${goal.targetAmount.toLocaleString()} alcanzado
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {displayGoals.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No tenés metas creadas</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Meta
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}