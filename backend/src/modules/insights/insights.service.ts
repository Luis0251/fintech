import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface Insight {
  type: 'warning' | 'tip' | 'prediction' | 'achievement';
  title: string;
  content: string;
  category?: string;
}

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: { category: string; amount: number }[];
  budgets: { category: string; limitAmount: number; percentUsed: number }[];
  goals: { name: string; targetAmount: number; currentAmount: number }[];
}

type AIProvider = 'gemini' | 'openai' | null;

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private openAIClient: OpenAI | null = null;
  
  // Fallback model keys from environment (for admin use)
  private fallbackGenAI: GoogleGenerativeAI | null = null;
  private fallbackOpenAIClient: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    // Initialize fallback providers if API keys are available in env
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (geminiKey) {
      this.fallbackGenAI = new GoogleGenerativeAI(geminiKey);
      this.logger.log('✅ Fallback Gemini AI initialized (from env)');
    }
    
    if (openaiKey) {
      this.fallbackOpenAIClient = new OpenAI({ apiKey: openaiKey });
      this.logger.log('✅ Fallback OpenAI initialized (from env)');
    }
  }

  /**
   * Initialize AI clients with user's API key
   */
  private async initializeUserAI(userId: string): Promise<AIProvider> {
    // Try to get user's API key from database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { apiKey: true },
    });

    if (!user?.apiKey) {
      // Check if fallback keys exist
      if (this.fallbackGenAI) return 'gemini';
      if (this.fallbackOpenAIClient) return 'openai';
      return null;
    }

    // Simple detection: if key starts with "AI" it's likely Gemini, otherwise OpenAI
    if (user.apiKey.startsWith('AI')) {
      try {
        this.genAI = new GoogleGenerativeAI(user.apiKey);
        return 'gemini';
      } catch (error) {
        this.logger.error('Failed to initialize Gemini with user key:', error);
      }
    } else {
      // Assume it's OpenAI
      try {
        this.openAIClient = new OpenAI({ apiKey: user.apiKey });
        return 'openai';
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI with user key:', error);
      }
    }

    // Fallback
    if (this.fallbackGenAI) return 'gemini';
    if (this.fallbackOpenAIClient) return 'openai';
    return null;
  }

  /**
   * Check if AI is available for user
   */
  async isAIAvailable(userId: string): Promise<boolean> {
    const provider = await this.initializeUserAI(userId);
    return provider !== null;
  }

  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get transactions for analysis
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthTx = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: startOfMonth },
      },
    });

    const lastMonthTx = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // Get budgets
    const budgets = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
    });

    // 1. Budget warnings
    for (const budget of budgets) {
      const spent = thisMonthTx
        .filter(t => t.type === 'EXPENSE' && t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);

      const percentUsed = (spent / budget.limitAmount) * 100;

      if (percentUsed >= 100) {
        insights.push({
          type: 'warning',
          title: `Presupuesto excedido en ${budget.category}`,
          content: `Ya gastaste $${spent.toFixed(2)} de $${budget.limitAmount} en ${budget.category}. Has excedido tu presupuesto por ${(percentUsed - 100).toFixed(0)}%.`,
          category: budget.category,
        });
      } else if (percentUsed >= 80) {
        insights.push({
          type: 'warning',
          title: `Alerta de presupuesto: ${budget.category}`,
          content: `Has usado el ${percentUsed.toFixed(0)}% de tu presupuesto de ${budget.category}. Quedan $${(budget.limitAmount - spent).toFixed(2)} disponibles.`,
          category: budget.category,
        });
      }
    }

    // 2. Month-over-month comparison
    const thisMonthExpenses = thisMonthTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastMonthExpenses > 0) {
      const change = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

      if (change > 20) {
        insights.push({
          type: 'warning',
          title: 'Gastos en aumento',
          content: `Tus gastos este mes son ${change.toFixed(0)}% más altos que el mes pasado ($${thisMonthExpenses.toFixed(2)} vs $${lastMonthExpenses.toFixed(2)}). Considera revisar tus gastos discrecionales.`,
        });
      } else if (change < -10) {
        insights.push({
          type: 'achievement',
          title: '¡Bien! Redujiste gastos',
          content: `Tus gastos bajaron un ${Math.abs(change).toFixed(0)}% comparado con el mes pasado. ¡Sigue así!`,
        });
      }
    }

    // 3. Category insights
    const categoryTotals = thisMonthTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    if (topCategory) {
      insights.push({
        type: 'tip',
        title: `Mayor gasto: ${topCategory[0]}`,
        content: `Has gastado $${topCategory[1].toFixed(2)} en ${topCategory[0]} este mes, que es el ${((topCategory[1] / thisMonthExpenses) * 100).toFixed(0)}% de tus gastos totales.`,
        category: topCategory[0],
      });
    }

    // 4. Income vs Expense
    const totalIncome = thisMonthTx
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = totalIncome > 0 ? ((totalIncome - thisMonthExpenses) / totalIncome) * 100 : 0;

    if (savingsRate < 10 && totalIncome > 0) {
      insights.push({
        type: 'tip',
        title: 'Tasa de ahorro baja',
        content: `Tu tasa de ahorro este mes es solo ${savingsRate.toFixed(1)}%. Intenta ahorrar al menos el 20% de tus ingresos para una salud financiera saludable.`,
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'achievement',
        title: '¡Excelente tasa de ahorro!',
        content: `¡Has ahorrado el ${savingsRate.toFixed(1)}% de tus ingresos este mes! Eso es mejor que la recomendación del 20%.`,
      });
    }

    // 5. Prediction for end of month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const dailyAverage = thisMonthExpenses / daysPassed;
    const projectedTotal = dailyAverage * daysInMonth;

    if (projectedTotal > thisMonthExpenses * 1.2) {
      insights.push({
        type: 'prediction',
        title: 'Proyección de gasto',
        content: `Con el ritmo actual, terminarás el mes gastando aproximadamente $${projectedTotal.toFixed(2)}. Eso es ${((projectedTotal / thisMonthExpenses - 1) * 100).toFixed(0)}% más de lo que has gastado hasta ahora.`,
      });
    }

    // Save insights to database
    for (const insight of insights) {
      await this.prisma.insight.create({
        data: {
          userId,
          type: insight.type,
          title: insight.title,
          content: insight.content,
          category: insight.category || null,
        },
      });
    }

    return insights;
  }

  async getInsights(userId: string) {
    return this.prisma.insight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAsRead(insightId: string, userId: string) {
    return this.prisma.insight.update({
      where: { id: insightId },
      data: { isRead: true },
    });
  }

  // Chat with AI using Gemini or OpenAI
  async chat(userId: string, message: string): Promise<string> {
    // Save user message
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'user',
        content: message,
      },
    });

    // Initialize user's AI provider
    const provider = await this.initializeUserAI(userId);
    
    let response: string;

    if (provider) {
      try {
        response = await this.callAI(provider, userId, message);
      } catch (error) {
        this.logger.error('AI API error:', error);
        response = this.getDefaultResponse(message);
      }
    } else {
      response = this.getDefaultResponse(message);
    }

    // Save assistant response
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: response,
      },
    });

    return response;
  }

  private async callAI(provider: AIProvider, userId: string, message: string): Promise<string> {
    const context = await this.getFinancialContext(userId);
    
    const systemPrompt = `Eres "Financial Copilot", un asistente financiero inteligente y amigable. 
Tu rol es ayudar al usuario con sus finanzas personales de manera clara y útil.

Información actual del usuario:
- Balance total: $${context.totalBalance.toFixed(2)}
- Ingresos del mes: $${context.monthlyIncome.toFixed(2)}
- Gastos del mes: $${context.monthlyExpenses.toFixed(2)}
- Tasa de ahorro: ${context.savingsRate.toFixed(1)}%
- Principales categorías de gasto: ${context.topCategories.map(c => `${c.category}: $${c.amount.toFixed(2)}`).join(', ')}

${context.budgets.length > 0 ? `Presupuestos activos: ${context.budgets.map(b => `${b.category}: ${b.percentUsed.toFixed(0)}% usado`).join(', ')}` : 'No hay presupuestos activos'}

${context.goals.length > 0 ? `Metas de ahorro: ${context.goals.map(g => `${g.name}: $${g.currentAmount} / $${g.targetAmount}`).join(', ')}` : 'No hay metas de ahorro activas'}

Instrucciones:
1. Sé konkretko y basado en los datos del usuario
2. Da consejos prácticos y accionables
3. Usa un tono amigable pero profesional
4. Si el usuario pregunta sobre gastar, analiza si tiene presupuesto disponible
5. Si pregunta sobre ahorrar, referencia sus metas si existen
6. Si no tienes suficiente información, pregunta qué necesita analizar
7. Responde siempre en español, salvo que el usuario escriba en otro idioma
8. Mantén las respuestas breves y enfocadas (máximo 3-4 oraciones)
9. Usa emojis ocasionalmente para hacer la conversación más amena`;

    if (provider === 'gemini') {
      const model = (this.genAI || this.fallbackGenAI)!.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
        ],
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } else if (provider === 'openai') {
      const client = this.openAIClient || this.fallbackOpenAIClient;
      
      const response = await client!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });
      
      return response.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
    }

    return this.getDefaultResponse(message);
  }

  private async getFinancialContext(userId: string): Promise<FinancialContext> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => {
      return acc.type === 'CREDIT' ? sum - acc.balance : sum + acc.balance;
    }, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const accountIds = accounts.map(a => a.id);
    const thisMonthTx = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: startOfMonth },
      },
    });

    const monthlyIncome = thisMonthTx
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = thisMonthTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthlyIncome > 0 
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
      : 0;

    const categoryTotals = thisMonthTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
    });

    const budgetsWithPercent = budgets.map(b => {
      const spent = thisMonthTx
        .filter(t => t.type === 'EXPENSE' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category: b.category,
        limitAmount: b.limitAmount,
        percentUsed: (spent / b.limitAmount) * 100,
      };
    });

    const goals = await this.prisma.goal.findMany({
      where: { userId, isCompleted: false },
      select: {
        name: true,
        targetAmount: true,
        currentAmount: true,
      },
    });

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      topCategories,
      budgets: budgetsWithPercent,
      goals,
    };
  }

  private getDefaultResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('presupuesto') || lowerMessage.includes('budget')) {
      return "Para administrar mejor tu presupuesto, te recomiendo establecer límites mensuales por categoría. ¿Quieres que te ayude a crear un presupuesto?";
    }
    
    if (lowerMessage.includes('gastar') || lowerMessage.includes('expense') || lowerMessage.includes('gasto')) {
      return "Puedo ayudarte a rastrear tus gastos. Actualmente tengo acceso a tu historial de transacciones. ¿Hay algo específico que quieras analizar?";
    }
    
    if (lowerMessage.includes('ahorrar') || lowerMessage.includes('save') || lowerMessage.includes('ahorro')) {
      return "¡Excelente interés en ahorrar! Te recomiendo usar la regla 50/30/20: 50% para necesidades, 30% para deseos y 20% para ahorros. ¿Tienes metas de ahorro específicas?";
    }
    
    if (lowerMessage.includes('meta') || lowerMessage.includes('goal')) {
      return "Las metas financieras son fundamentales. ¿Quieres crear una nueva meta de ahorro? Puedo ayudarte a definir un objetivo y seguimiento.";
    }
    
    return "Entiendo tu consulta. Para dar información más precisa, necesito acceso a tus datos financieros o configurar una API key de IA. ¿Hay algo específico que quieras analizar de tus finanzas?";
  }

  async getChatHistory(userId: string) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }
}
