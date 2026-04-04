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
import { ArrowLeft, Plus, Wallet, CreditCard, PiggyBank, Banknote, Trash2, DollarSign, Pencil } from 'lucide-react';
import Link from 'next/link';

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Cuenta Corriente', icon: Wallet },
  { value: 'SAVINGS', label: 'Cuenta de Ahorro', icon: PiggyBank },
  { value: 'CASH', label: 'Efectivo', icon: Banknote },
  { value: 'CREDIT', label: 'Tarjeta de Crédito', icon: CreditCard },
];

export default function AccountsPage() {
  const { accounts, fetchAccounts, fetchBalance } = useDataStore();
  const router = useRouter();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING',
    balance: '',
    currency: 'COP',
  });

  useEffect(() => {
    const initialize = async () => {
      useAuthStore.getState().checkAuth();
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) router.replace('/');
        else fetchAccounts();
      }, 100);
    };
    initialize();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta? Se eliminarán todas las transacciones asociadas.')) return;
    try {
      await api.deleteAccount(id);
      fetchAccounts();
      fetchBalance();
      showSuccess('Cuenta eliminada');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance?.toString() || '',
      currency: account.currency || 'COP',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateAccount(editingId, {
          name: formData.name,
          balance: formData.balance ? parseFloat(formData.balance) : 0,
        });
        showSuccess('Cuenta actualizada');
      } else {
        await api.createAccount({
          name: formData.name,
          type: formData.type,
          balance: formData.balance ? parseFloat(formData.balance) : 0,
          currency: formData.currency,
        });
        showSuccess('Cuenta creada');
      }
      fetchAccounts();
      fetchBalance();
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'CHECKING', balance: '', currency: 'COP' });
    } catch (error: any) {
      showError(error.message);
    }
  };

  const getAccountIcon = (type: string) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    const Icon = accountType?.icon || Wallet;
    return <Icon className="w-6 h-6" />;
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

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
              <h1 className="text-3xl font-bold">Cuentas</h1>
              <p className="text-muted-foreground">Gestioná tus cuentas bancarias</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cuenta
          </Button>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance Total</p>
                <p className="text-3xl font-bold">${totalBalance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Cuentas</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
              <DollarSign className="w-12 h-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* New Account Form / Edit Form */}
        {showForm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre de la Cuenta</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ej. Mi Cuenta Principal"
                      required
                    />
                  </div>
                  {!editingId && (
                    <div>
                      <Label>Tipo de Cuenta</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Saldo{editingId ? ' Actual' : ' Inicial'}</Label>
                    <Input
                      type="number"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  {!editingId && (
                    <div>
                      <Label>Moneda</Label>
                      <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COP">Peso Colombiano (COP)</SelectItem>
                          <SelectItem value="USD">Dólar (USD)</SelectItem>
                          <SelectItem value="EUR">Euro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingId ? 'Guardar Cambios' : 'Crear Cuenta'}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setFormData({ name: '', type: 'CHECKING', balance: '', currency: 'ARS' }); }}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account: any) => (
            <Card key={account.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ACCOUNT_TYPES.find(t => t.value === account.type)?.label || account.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${account.balance >= 0 ? '' : 'text-red-500'}`}>
                      ${account.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.currency}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleEdit(account)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accounts.length === 0 && (
          <Card className="p-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No tenés cuentas creadas</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Cuenta
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}