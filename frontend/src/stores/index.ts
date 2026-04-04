import { create } from 'zustand';
import { api, API_BASE_URL } from '@/lib/api';
import type { User, Account, Transaction, Budget, Goal, Insight, TransactionStats, BalanceInfo } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasApiKey: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  checkApiKey: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  hasApiKey: false,
  
  login: async (email, password) => {
    const { user, token } = await api.login(email, password);
    api.setToken(token);
    set({ user, token, isLoading: false });
    
    // Check if user has API key
    try {
      const { hasApiKey } = await api.getHasApiKey();
      set({ hasApiKey });
    } catch {
      set({ hasApiKey: false });
    }
  },
  
  register: async (email, password, name) => {
    const { user, token } = await api.register(email, password, name);
    api.setToken(token);
    set({ user, token, isLoading: false });
  },
  
  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, hasApiKey: false });
  },
  
  checkAuth: async () => {
    const token = api.getToken();
    if (token) {
      set({ token, isLoading: false });
      
      // Check if user has API key
      try {
        const { hasApiKey } = await api.getHasApiKey();
        set({ hasApiKey });
      } catch {
        set({ hasApiKey: false });
      }
    } else {
      set({ isLoading: false, hasApiKey: false });
    }
  },
  
  checkApiKey: async () => {
    try {
      const { hasApiKey } = await api.getHasApiKey();
      set({ hasApiKey });
    } catch {
      set({ hasApiKey: false });
    }
  },
}));

interface ServerEvent {
  type: 'transaction' | 'account' | 'budget' | 'goal' | 'insight';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: number;
}

interface DataState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  insights: Insight[];
  stats: TransactionStats | null;
  balance: BalanceInfo | null;
  isLoading: boolean;
  error: string | null;
  sseConnected: boolean;
  
  fetchAccounts: () => Promise<void>;
  fetchTransactions: (filters?: any) => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  fetchStats: (period?: 'week' | 'month' | 'year') => Promise<void>;
  fetchBalance: () => Promise<void>;
  fetchAll: () => Promise<void>;
  clearError: () => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

export const useDataStore = create<DataState>((set, get) => {
  let eventSource: EventSource | null = null;

  return {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    insights: [],
    stats: null,
    balance: null,
    isLoading: false,
    error: null,
    sseConnected: false,
    
    fetchAccounts: async () => {
      try {
        const accounts = await api.getAccounts();
        set({ accounts });
      } catch (error: any) {
        console.error('Error fetching accounts:', error);
        set({ error: error.message });
      }
    },
    
    fetchTransactions: async (filters) => {
      try {
        const transactions = await api.getTransactions(filters);
        set({ transactions });
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        set({ error: error.message });
      }
    },
    
    fetchBudgets: async () => {
      try {
        const budgets = await api.getBudgets();
        set({ budgets });
      } catch (error: any) {
        console.error('Error fetching budgets:', error);
        set({ error: error.message });
      }
    },
    
    fetchGoals: async () => {
      try {
        const goals = await api.getGoals();
        set({ goals });
      } catch (error: any) {
        console.error('Error fetching goals:', error);
        set({ error: error.message });
      }
    },
    
    fetchInsights: async () => {
      try {
        const insights = await api.getInsights();
        set({ insights });
      } catch (error: any) {
        console.error('Error fetching insights:', error);
        set({ error: error.message });
      }
    },
    
    fetchStats: async (period) => {
      try {
        const stats = await api.getTransactionStats(period);
        set({ stats });
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        set({ error: error.message });
      }
    },
    
    fetchBalance: async () => {
      try {
        const balance = await api.getTotalBalance();
        set({ balance });
      } catch (error: any) {
        console.error('Error fetching balance:', error);
        set({ error: error.message });
      }
    },
    
    fetchAll: async () => {
      set({ isLoading: true, error: null });
      try {
        await Promise.all([
          get().fetchAccounts(),
          get().fetchTransactions(),
          get().fetchBudgets(),
          get().fetchGoals(),
          get().fetchInsights(),
          get().fetchStats(),
          get().fetchBalance(),
        ]);
      } finally {
        set({ isLoading: false });
      }
    },

    clearError: () => set({ error: null }),

    connectSSE: () => {
      const token = api.getToken();
      if (!token || eventSource) return;

      const eventSourceUrl = `${API_BASE_URL.replace('/api', '')}/api/events/stream?token=${token}`;
      eventSource = new EventSource(eventSourceUrl, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log('📡 SSE connected');
        set({ sseConnected: true });
      };

      eventSource.onmessage = (event) => {
        try {
          const data: ServerEvent = JSON.parse(event.data);
          console.log('📡 SSE event received:', data);

          // Handle different event types
          switch (data.type) {
            case 'transaction':
              if (data.action === 'created') {
                const { transactions } = get();
                // Add new transaction at the beginning
                set({ transactions: [data.data, ...transactions] });
              } else if (data.action === 'deleted') {
                const { transactions } = get();
                set({ transactions: transactions.filter(t => t.id !== data.data.id) });
              }
              // Refresh stats and balance after transaction changes
              get().fetchStats();
              get().fetchBalance();
              get().fetchAccounts();
              break;

            case 'account':
              if (data.action === 'created') {
                const { accounts } = get();
                set({ accounts: [data.data, ...accounts] });
              } else if (data.action === 'updated') {
                const { accounts } = get();
                set({
                  accounts: accounts.map(a => a.id === data.data.id ? data.data : a)
                });
              } else if (data.action === 'deleted') {
                const { accounts } = get();
                set({ accounts: accounts.filter(a => a.id !== data.data.id) });
              }
              get().fetchBalance();
              break;

            case 'budget':
              if (data.action === 'created' || data.action === 'updated') {
                get().fetchBudgets();
              } else if (data.action === 'deleted') {
                const { budgets } = get();
                set({ budgets: budgets.filter(b => b.id !== data.data.id) });
              }
              break;

            case 'goal':
              if (data.action === 'created' || data.action === 'updated') {
                get().fetchGoals();
              } else if (data.action === 'deleted') {
                const { goals } = get();
                set({ goals: goals.filter(g => g.id !== data.data.id) });
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('📡 SSE error:', error);
        set({ sseConnected: false });
        // Reconnect after 5 seconds
        setTimeout(() => {
          get().disconnectSSE();
          get().connectSSE();
        }, 5000);
      };
    },

    disconnectSSE: () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
        set({ sseConnected: false });
        console.log('📡 SSE disconnected');
      }
    },
  };
});