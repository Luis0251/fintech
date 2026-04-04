"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useDataStore } from '@/stores';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/accounts', icon: Wallet },
  { name: 'Transacciones', href: '/transactions', icon: CreditCard },
  { name: 'Presupuestos', href: '/budgets', icon: PieChart },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Insights', href: '/insights', icon: Lightbulb },
  { name: 'Chat IA', href: '/chat', icon: MessageSquare },
];

export default function DashboardPage() {
  const { logout, hasApiKey } = useAuthStore();
  const { accounts, transactions, budgets, goals, insights, stats, balance, fetchAll, isLoading, connectSSE, disconnectSSE, sseConnected } = useDataStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const store = useAuthStore.getState();
      await store.checkAuth();
      await store.checkApiKey();
      
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) {
          router.replace('/');
        } else {
          fetchAll();
          connectSSE();
        }
      }, 100);
    };
    initialize();
    return () => {
      disconnectSSE();
    };
  }, []);

  // Navigation items - conditionally show AI features based on API key
  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cuentas', href: '/accounts', icon: Wallet },
    { name: 'Transacciones', href: '/transactions', icon: CreditCard },
    { name: 'Presupuestos', href: '/budgets', icon: PieChart },
    { name: 'Metas', href: '/goals', icon: Target },
    ...(hasApiKey ? [
      { name: 'Insights', href: '/insights', icon: Lightbulb },
      { name: 'Chat IA', href: '/chat', icon: MessageSquare },
    ] : []),
  ];

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  // Calculate stats from real API data - use hardcoded fallback only for hydration
  const mockStats = {
    totalBalance: balance?.total ?? 0,
    monthlyIncome: stats?.income ?? 0,
    monthlyExpenses: stats?.expenses ?? 0,
    savingsRate: (stats?.income && stats?.expenses && stats.income > 0) 
      ? ((stats.income - stats.expenses) / stats.income * 100) 
      : 0,
  };

  // Ensure consistent number formatting
  const formatNumber = (num: number) => num.toLocaleString('en-US');

  // Use real data from API, or empty arrays if no data
  const categoryData = stats?.byCategory ?? [];
  
  // Placeholder data for charts when no real data
  const monthlyData = [
    { month: 'Ene', income: 0, expenses: 0 },
    { month: 'Feb', income: 0, expenses: 0 },
    { month: 'Mar', income: 0, expenses: 0 },
    { month: 'Abr', income: 0, expenses: 0 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Fintech</h1>
              <p className="text-xs text-muted-foreground">Copilot</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 p-6 pt-16 lg:pt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tus finanzas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance Total</p>
                  <p className="text-2xl font-bold">${formatNumber(mockStats.totalBalance)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                  <p className="text-2xl font-bold text-green-600">+${formatNumber(mockStats.monthlyIncome)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gastos del Mes</p>
                  <p className="text-2xl font-bold text-red-600">-${formatNumber(mockStats.monthlyExpenses)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasa de Ahorro</p>
                  <p className="text-2xl font-bold text-blue-600">{mockStats.savingsRate}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {categoryData.map((entry: { category: string; amount: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Ingresos" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Gastos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Budget Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Presupuestos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.slice(0, 4).map((budget: any, i) => {
                const percentUsed = budget.percentUsed ?? (budget.limitAmount > 0 ? ((budget.spentAmount || 0) / budget.limitAmount) * 100 : 0);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{budget.category}</span>
                      <span className="text-muted-foreground">
                        ${formatNumber(budget.spentAmount || 0)} / ${formatNumber(budget.limitAmount)}
                      </span>
                    </div>
                    <Progress value={Math.min(percentUsed, 100)} 
                      className={percentUsed >= 90 ? '[&>*]:bg-red-500' : percentUsed >= 80 ? '[&>*]:bg-yellow-500' : ''} 
                    />
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin presupuestos</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metas de Ahorro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.filter((g: any) => !g.isCompleted).slice(0, 3).map((goal: any, i) => {
                const percentComplete = goal.percentComplete ?? (goal.targetAmount > 0 ? ((goal.currentAmount || 0) / goal.targetAmount) * 100 : 0);
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{goal.name}</span>
                      <span className="text-muted-foreground">
                        ${formatNumber(goal.currentAmount || 0)} / ${formatNumber(goal.targetAmount)}
                      </span>
                    </div>
                    <Progress value={percentComplete} className="[&>*]:bg-blue-500" />
                    <p className="text-xs text-muted-foreground">
                      {daysLeft !== null && daysLeft > 0 ? `${daysLeft} días restantes` : 'Sin fecha límite'}
                    </p>
                  </div>
                );
              })}
              {goals.filter((g: any) => !g.isCompleted).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin metas activas</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((tx: any, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {tx.type === 'INCOME' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description || tx.category}</p>
                      <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString('es-AR')}</p>
                    </div>
                  </div>
                  <p className={`font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin transacciones recientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}