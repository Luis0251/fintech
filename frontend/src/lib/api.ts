export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      if (typeof window !== 'undefined') {
        this.token = localStorage.getItem('token');
      }
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      
      // If 401, redirect to login (but only in browser)
      if (response.status === 401 && typeof window !== 'undefined') {
        // Clear token from localStorage
        localStorage.removeItem('token');
        // Redirect to login
        window.location.href = '/';
      }
      
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name?: string) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Accounts
  async getAccounts() {
    return this.request<any[]>('/accounts');
  }

  async getTotalBalance() {
    return this.request<{ total: number; accounts: number }>('/accounts/balance');
  }

  async createAccount(data: { name: string; type: string; balance?: number; currency?: string }) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(id: string, data: any) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request<{ deleted: boolean }>(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions
  async getTransactions(filters?: { startDate?: string; endDate?: string; category?: string; accountId?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const query = params.toString();
    return this.request<any[]>(`/transactions${query ? `?${query}` : ''}`);
  }

  async getTransactionStats(period?: 'week' | 'month' | 'year') {
    return this.request<any>(`/transactions/stats${period ? `?period=${period}` : ''}`);
  }

  async createTransaction(data: any) {
    return this.request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id: string, data: any) {
    return this.request<any>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string) {
    return this.request<{ deleted: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Budgets
  async getBudgets() {
    return this.request<any[]>('/budgets');
  }

  async createBudget(data: { category: string; limitAmount: number; period?: string }) {
    return this.request<any>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: any) {
    return this.request<any>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: string) {
    return this.request<{ deleted: boolean }>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  async getBudgetAlerts() {
    return this.request<any[]>('/budgets/alerts');
  }

  // Goals
  async getGoals() {
    return this.request<any[]>('/goals');
  }

  async getGoalsSummary() {
    return this.request<any>('/goals/summary');
  }

  async createGoal(data: { name: string; targetAmount: number; currentAmount?: number; deadline?: string; description?: string }) {
    return this.request<any>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id: string, data: any) {
    return this.request<any>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addContribution(goalId: string, amount: number) {
    return this.request<any>(`/goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async deleteGoal(id: string) {
    return this.request<{ deleted: boolean }>(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  // Insights
  async getInsights() {
    return this.request<any[]>('/insights');
  }

  async generateInsights() {
    return this.request<any[]>('/insights/generate', {
      method: 'POST',
    });
  }

  async chat(message: string) {
    return this.request<{ response: string }>('/insights/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getChatHistory() {
    return this.request<any[]>('/insights/chat/history');
  }

  async markInsightAsRead(id: string) {
    return this.request<any>(`/insights/${id}/read`, {
      method: 'POST',
    });
  }

  // User API Key management
  async saveApiKey(apiKey: string, provider: 'gemini' | 'openai') {
    return this.request<{ success: boolean; message: string }>('/users/api-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey, provider }),
    });
  }

  async getHasApiKey() {
    return this.request<{ hasApiKey: boolean }>('/users/api-key');
  }

  async deleteApiKey() {
    return this.request<{ success: boolean; message: string }>('/users/api-key', {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();