"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: '¿Puedo gastar $200 esta semana?', icon: '💰' },
  { label: '¿Cómo puedo ahorrar más?', icon: '📈' },
  { label: 'Análisis de mis gastos', icon: '📊' },
  { label: 'Crear un presupuesto', icon: '📋' },
];

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const initialize = async () => {
      useAuthStore.getState().checkAuth();
      setTimeout(() => {
        const token = useAuthStore.getState().token;
        if (!token) {
          router.replace('/');
          return;
        }
        
        const loadHistory = async () => {
          try {
            const history = await api.getChatHistory();
            if (history && history.length > 0) {
              setMessages(history.map((m: any, i: number) => ({
                id: m.id || `history-${i}`,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt || Date.now()),
              })));
            }
          } catch (error) {
            console.error('Error loading chat history:', error);
          }
          setIsInitialized(true);
        };
        
        loadHistory();
      }, 100);
    };
    initialize();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { response } = await api.chat(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Disculpa, tuve un problema al procesar tu mensaje. Por favor intentá de nuevo.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  // Show welcome message if no messages
  const displayMessages = messages.length === 0 && isInitialized ? [
    {
      id: 'welcome',
      role: 'assistant' as const,
      content: '¡Hola! Soy tu Financial Copilot. Puedo ayudarte con análisis de gastos, presupuestos, metas de ahorro y más. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    }
  ] : messages;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto h-[calc(100vh-3rem)] flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Chat IA</h1>
            <p className="text-muted-foreground">Tu asistente financiero inteligente</p>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Financial Copilot
            </CardTitle>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'assistant' ? 'bg-primary' : 'bg-muted'
                }`}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Actions */}
          {displayMessages.length <= 1 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2">Sugerencias:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.label)}
                    className="text-xs"
                  >
                    <span className="mr-1">{action.icon}</span>
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu pregunta..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}