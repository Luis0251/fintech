"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useDataStore } from '@/stores';
import { api } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lightbulb, AlertTriangle, TrendingUp, Award, RefreshCw, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function InsightsPage() {
  const { insights, fetchInsights } = useDataStore();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      useAuthStore.getState().checkAuth();
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) router.replace('/');
        else fetchInsights();
      }, 100);
    };
    initialize();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await api.generateInsights();
      fetchInsights();
      showSuccess('Insights generados');
    } catch (error: any) {
      showError(error.message);
    }
    setIsGenerating(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markInsightAsRead(id);
      fetchInsights();
    } catch (error: any) {
      console.error('Error marking insight as read:', error);
    }
  };

  // Use real data - no mock fallback
  const displayInsights = insights;

  const unreadCount = displayInsights.filter((i: any) => !i.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'achievement': return <Award className="w-5 h-5 text-green-500" />;
      case 'prediction': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      default: return <Lightbulb className="w-5 h-5 text-primary" />;
    }
  };

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-4 border-l-yellow-500';
      case 'achievement': return 'border-l-4 border-l-green-500';
      case 'prediction': return 'border-l-4 border-l-blue-500';
      default: return 'border-l-4 border-l-primary';
    }
  };

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
              <h1 className="text-3xl font-bold">Insights</h1>
              <p className="text-muted-foreground">Análisis automático de tus finanzas</p>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generando...' : 'Actualizar Insights'}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Insights</p>
                  <p className="text-2xl font-bold">{displayInsights.length}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">No leídos</p>
                  <p className="text-2xl font-bold text-yellow-600">{unreadCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Logros</p>
                  <p className="text-2xl font-bold text-green-600">
                    {displayInsights.filter((i: any) => i.type === 'achievement').length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {displayInsights.map((insight: any) => (
            <Card 
              key={insight.id} 
              className={`${getCardStyle(insight.type)} ${insight.isRead ? 'opacity-60' : ''} cursor-pointer`}
              onClick={() => !insight.isRead && handleMarkAsRead(insight.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{insight.title}</h3>
                      {insight.category && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {insight.category}
                        </span>
                      )}
                      {insight.isRead && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground">{insight.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayInsights.length === 0 && (
          <Card className="p-12 text-center">
            <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No hay insights disponibles</p>
            <Button onClick={handleGenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generar Insights
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}