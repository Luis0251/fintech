# Arquitectura del Proyecto - Financial Copilot

## 1. Visión General

**Financial Copilot** es una aplicación web de finanzas personales que permite a los usuarios gestionar sus cuentas, transacciones, presupuestos, metas de ahorro y obtener insights automatizados con asistencia de IA.

### Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (Radix Primitives) |
| **State Management** | Zustand |
| **Charts** | Recharts |
| **Backend** | NestJS, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Auth** | JWT (Passport) |
| **IA** | Google Gemini API (preparado) |
| **Real-time** | Server-Sent Events (SSE) |

---

## 1.1 Estado del Proyecto

| Feature | Estado | Notas |
|---------|--------|-------|
| Autenticación JWT | ✅ Completo | Login/Register con token |
| CRUD Transacciones | ✅ Completo | Create, Read, Update, Delete |
| CRUD Cuentas | ✅ Completo | Multiple account types |
| CRUD Presupuestos | ✅ Completo | Con alertas de uso |
| CRUD Metas | ✅ Completo | Con contribuciones |
| Insights + Chat IA | ✅ Completo | Google Gemini integrado |
| Dashboard | ✅ Completo | Gráficos con Recharts |
| **Actualización en Tiempo Real** | ✅ Completo | SSE entre pestañas |
| Unit Tests | 🚧 Pendiente | Sin cobertura |
| Rate Limiting | 🚧 Pendiente | No implementado |

---

## 2. Arquitectura del Backend

```
backend/src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
├── common/
│   ├── prisma.service.ts      # Prisma singleton
│   └── prisma.module.ts       # Prisma module
└── modules/
    ├── auth/                  # Autenticación JWT
    ├── users/                 # Gestión de usuarios
    ├── accounts/              # Cuentas financieras
    ├── transactions/          # Transacciones
    ├── budgets/               # Presupuestos
    ├── goals/                # Metas de ahorro
    ├── insights/              # Insights + Chat IA
    └── events/                # Server-Sent Events (SSE)
```

### Patrón de Diseño: Modular

Cada módulo sigue el patrón **Controller-Service-Module** de NestJS:

1. **Controller**: Maneja HTTP requests, validaciones (DTOs), y responde al cliente
2. **Service**: Lógica de negocio, acceso a datos via Prisma
3. **Module**: Agrupa controller + service como una unidad reutilizable

### Flujo de Autenticación

```
Login Request
    │
    ▼
auth.controller.ts (POST /login)
    │
    ▼
auth.service.ts (valida credenciales)
    │
    ├── bcrypt.compare(password, hash)
    │
    └── jwtService.sign({ sub: userId, email })
    │
    ▼
{ user: {...}, token: "eyJ..." }
    │
    ▼
Cliente guarda token en localStorage
```

### Protección de Rutas

```typescript
@UseGuards(JwtAuthGuard)  // Todas las rutas protegidas
export class TransactionsController {
  // req.user viene del JWT strategy
  async create(@Request() req, @Body() dto: CreateTransactionDto) {
    // userId del token se usa para queries
    return this.transactionsService.create(req.user.id, dto);
  }
}
```

---

## 3. Modelo de Datos (Prisma Schema)

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                │
│  id        String @id @default(cuid())                     │
│  email     String @unique                                   │
│  password  String                                           │
│  name      String?                                          │
│  createdAt DateTime @default(now())                        │
│  accounts  Account[]                                        │
│  budgets   Budget[]                                         │
│  goals     Goal[]                                           │
│  insights  Insight[]                                        │
│  chatMessages ChatMessage[]                                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Account    │   │    Budget     │   │     Goal      │
│───────────────│   │───────────────│   │───────────────│
│ id            │   │ id            │   │ id            │
│ userId        │   │ userId        │   │ userId        │
│ name          │   │ category      │   │ name          │
│ type          │   │ limitAmount   │   │ targetAmount  │
│ balance       │   │ period        │   │ currentAmount │
│ currency      │   │ isActive      │   │ deadline      │
│ isActive      │   └───────────────┘   │ description   │
└───────────────┘                        │ isCompleted   │
        │                                └───────────────┘
        ▼                                      │
┌───────────────┐                              │
│  Transaction  │◄─────────────────────────────┘
│───────────────│
│ id            │
│ accountId     │
│ amount       │
│ type          │ (INCOME/EXPENSE/TRANSFER)
│ category     │
│ description  │
│ date         │
│ isRecurring  │
└───────────────┘
```

### Enums Definidos

```prisma
enum AccountType { CHECKING, SAVINGS, CREDIT, CASH, INVESTMENT }
enum TransactionType { INCOME, EXPENSE, TRANSFER }
enum BudgetPeriod { WEEKLY, MONTHLY, YEARLY }
enum InsightType { warning, tip, prediction, achievement }
enum ChatRole { user, assistant }
```

---

## 4. Arquitectura del Frontend

```
frontend/src/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Login/Registro
│   ├── layout.tsx             # Root layout
│   ├── dashboard/page.tsx     # Dashboard principal
│   ├── accounts/page.tsx      # Gestión de cuentas
│   ├── transactions/page.tsx  # CRUD Transacciones
│   ├── budgets/page.tsx       # CRUD Presupuestos
│   ├── goals/page.tsx         # CRUD Metas
│   ├── insights/page.tsx      # Insights
│   └── chat/page.tsx          # Chat IA
├── components/
│   └── ui/                    # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       └── tabs.tsx
├── lib/
│   ├── api.ts                # API Client
│   └── utils.ts              # Utilidades CSS
├── stores/
│   └── index.ts              # Zustand stores
└── types/
    └── index.ts              # TypeScript types
```

### Patrón de Estado: Zustand

```typescript
// stores/index.ts
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));

export const useDataStore = create((set, get) => ({
  transactions: [],
  fetchTransactions: async () => {
    const data = await api.getTransactions();
    set({ transactions: data });
  },
  // ...
}));
```

### Flujo de Datos: Frontend → Backend

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   UI Component  │ ──▶  │   Zustand Store │ ──▶  │   API Client    │
│  (page.tsx)     │      │  (stores/index) │      │  (lib/api.ts)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                                                  │
         │                                                  ▼
         │                                         ┌─────────────────┐
         │                                         │  REST API       │
         │                                         │ (fetch/axios)   │
         └────────────────────────────────────────▶│                 │
                                          JWT Token └─────────────────┘
                                                     │
                                                     ▼
                                              ┌─────────────────┐
                                              │  NestJS Backend │
                                              │                 │
                                              └─────────────────┘
```

---

## 5. Decisiones de Arquitectura

### 5.1 JWT vs Sessions

**Decisión**: JWT con `req.user.id` en cada request

**Pros**:
- Stateless (escalable horizontalmente)
- No requiere Redis para store de sesiones

**Contras**:
- No se puede revoke inmediatamente (implementar denylist si es necesario)

### 5.2 Prisma como ORM

**Pros**:
- Type-safe queries
- Migraciones easy
- Schema declarativo

**Contras**:
- Runtime validation necesaria para fechas (DateTime)

### 5.3 Zustand vs Redux

**Decisión**: Zustand

**Pros**:
- Simplicidad (menos boilerplate)
- hooks-based
- Selected state sin memoización manual

### 5.4 shadcn/ui

**Pros**:
- Totalmente customizable
- No hay runtime overhead
- Follows Radix UI primitives

---

## 6. Flujo de una Transacción

```
1. Usuario completa el formulario en /transactions
   │
2. handleSubmit() llama a api.createTransaction(payload)
   │
3. api.ts → POST /api/transactions con JWT en header
   │
4. JwtAuthGuard valida token → req.user = { id, email, name }
   │
5. transactions.controller.ts → transactionsService.create(req.user.id, dto)
   │
6. transactions.service.ts:
   │
   a) Verifica cuenta pertenece al usuario
      account = prisma.account.findFirst({ where: { id, userId }})
      │
   b) Crea transacción
      prisma.transaction.create({ data: { ... }})
      │
   c) Actualiza balance de cuenta
      prisma.account.update({ where: { id }, data: { balance } })
   │
7. Respuesta al cliente → UI se actualiza
```

---

## 7. Actualización en Tiempo Real (SSE)

### Visión General

El proyecto implementa **Server-Sent Events (SSE)** para actualizaciones en tiempo real. A diferencia de WebSockets, SSE es unidireccional (servidor → cliente), lo cual es perfecto para nuestro caso de uso.

### Arquitectura SSE

```
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (NestJS)                         │
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│  │ Transaction │      │   Account   │      │    Goal     │      │
│  │  Service    │      │   Service   │      │   Service   │      │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      │
│         │                    │                    │             │
│         └────────────────────┼────────────────────┘             │
│                              ▼                                  │
│                    ┌───────────────┐                           │
│                    │ EventsService │                           │
│                    │ (Subject)     │                           │
│                    └───────┬───────┘                           │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │ User A      │    │ User B      │    │ User C      │       │
│  │ Connection  │    │ Connection  │    │ Connection  │       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
└─────────┼───────────────────┼───────────────────┼──────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    SSE Stream          SSE Stream           SSE Stream
    /events/stream      /events/stream      /events/stream
```

### Archivos del Módulo Events

| Archivo | Propósito |
|---------|-----------|
| `events.service.ts` | Servicio central que maneja el Subject de eventos |
| `events.controller.ts` | Endpoint `/events/stream` con SSE |
| `events.module.ts` | Módulo global (disponible en toda la app) |

### Eventos Emitidos

```typescript
// Tipos de eventos
interface ServerEvent {
  type: 'transaction' | 'account' | 'budget' | 'goal' | 'insight';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: number;
}

// Ejemplo de evento emitido
{
  type: 'transaction',
  action: 'created',
  data: { id: '...', amount: 100, ... },
  timestamp: 1712345678900
}
```

### Integración en Servicios

Cada servicio CRUD emite eventos después de operaciones:

```typescript
// transactions.service.ts
async create(userId: string, dto: CreateTransactionDto) {
  const transaction = await this.prisma.transaction.create({ ... });
  
  // Emit event - frontend se actualiza automáticamente
  this.eventsService.emitTransaction('created', transaction);
  
  return transaction;
}
```

### Frontend: Cliente SSE

El store de Zustand maneja la conexión SSE:

```typescript
// stores/index.ts
connectSSE: () => {
  const eventSource = new EventSource('/api/events/stream', {
    withCredentials: true,
  });
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Actualiza store según tipo de evento
    switch (data.type) {
      case 'transaction':
        get().fetchTransactions();
        get().fetchStats();
        get().fetchBalance();
        break;
      // ...
    }
  };
}
```

### Flujo Completo

```
1. Usuario crea transacción en /transactions
   │
2. POST /api/transactions → Backend
   │
3. transactions.service.ts crea la transacción
   │
4. eventsService.emitTransaction('created', data)
   │
5. EventsService.notifica a todos los suscriptores
   │
6. EventSource en dashboard recibe el evento
   │
7. fetchTransactions() + fetchBalance() se ejecutan
   │
8. UI se actualiza automáticamente ✅
```

### Beneficios

- ✅ No requiere WebSocket upgrade (funciona con HTTP)
- ✅ Reconexión automática del navegador
- ✅ Ligero (solo texto, no overhead de WS)
- ✅ Perfecto para dashboards que refresh on event

### Consideraciones

- **Unidireccional**: Solo server → client. Para chat real-time necesitaríamos WebSockets
- **Una conexión por tab**: Navegadores limitan conexiones SSE. Múltiples tabs = múltiples conexiones
- **Sin soporte para Safari legacy**: Safari < 15.4 no soporta SSE (pero tiene ~1% de uso)

---

## 7. Autenticación y Timing en Next.js

### Problema

En Next.js App Router con client components, el estado inicial de Zustand viene vacío porque localStorage no está disponible durante SSR. Esto causaba que las páginas protegidas redirigieran al login antes de que el token se cargara.

### Solución Implementada

```typescript
// En cada página protegida (ej: transactions/page.tsx)
useEffect(() => {
  // Siempre intentar cargar datos primero - la API maneja errores de auth
  fetchAccounts();
  fetchTransactions();
}, []);

// El API client maneja 401 y redirige automáticamente
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/';
}
```

### Flujo

```
1. Usuario accede a /transactions
   │
2. Página intenta cargar datos (fetchAccounts, fetchTransactions)
   │
3. API devuelve 401 (no autorizado)
   │
4. API client hace: localStorage.removeItem('token') + window.location.href = '/'
   │
5. Usuario redirigido al login ✅
```

---

## 8. Manejo de Errores Global

### Problema

Los errores del backend no tenían un formato consistente, y el frontend usaba `alert()` nativo del navegador, lo cual da una mala experiencia de usuario.

### Solución Implementada

#### Backend: Global Exception Filter

```typescript
// backend/src/common/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Maneja HttpException, Error, y errores genéricos
    // Formato consistente: { statusCode, message, error, timestamp, path, method }
    // Logging estructurado: Logger.error para 5xx, Logger.warn para demás
    // En producción, oculta detalles de errores 500
  }
}
```

#### Frontend: Toast Notifications

```typescript
// frontend/src/lib/toast.ts
export const showError = (message: string) => {
  toast.error(message, { duration: 4000, dismissible: true });
};

export const showSuccess = (message: string) => {
  toast.success(message, { duration: 3000, dismissible: true });
};
```

**Librería**: [Sonner](https://sonner.emilkowalski.ski/) - Toast notifications para React

**Archivos modificados**:
- `backend/src/common/global-exception.filter.ts` (nuevo)
- `backend/src/main.ts` - registrado filtro global
- `frontend/src/app/layout.tsx` - `<Toaster />`
- `frontend/src/lib/toast.ts` (nuevo)
- Todas las páginas: `accounts`, `budgets`, `goals`, `insights`

**Beneficios**:
- ✅ Errores con formato JSON consistente
- ✅ Logging estructurado en backend
- ✅ Toasts visuales agradables en frontend
- ✅ Experiencia de usuario mejorada

---

## 8. Puntos de Mejora (Actualizado)

### Alta Prioridad

| # | Mejora | Problema Actual | Estado |
|---|--------|-----------------|--------|
| 1 | **SSE** | Actualización en tiempo real | ✅ Implementado |
| 2 | **Unit Tests** | No hay cobertura de tests | 🚧 Pendiente |
| 3 | **Error Handling Global** | Los errores 500 no tienen manejo granular | ✅ Implementado |
| 4 | **Toast Notifications** | Alerts nativos del navegador | ✅ Implementado |

### Media Prioridad

| # | Mejora | Problema Actual | Estado |
|---|--------|-----------------|--------|
| 4 | **Rate Limiting** | No hay protección contra abuse | 🚧 Pendiente |
| 5 | **API Versioning** | Los endpoints no tienen versionado | 🚧 Pendiente |
| 6 | **Caching con Redis** | Datos como stats se calculan cada request | 🚧 Pendiente |
| 7 | **Logging Centralizado** | console.log en vez de Logger estruturado | 🚧 Pendiente |

### Baja Prioridad

| # | Mejora | Problema Actual | Estado |
|---|--------|-----------------|--------|
| 8 | **GraphQL** | REST puede ser limitante para queries complejos | 🚧 Pendiente |
| 9 | **CQRS** | Lógica de lectura/escritura en el mismo servicio | 🚧 Pendiente |
| 10 | **Dark Mode** | Solo hay un theme | 🚧 Pendiente |

---

## 8. Security Considerations

### Implementado ✅

- JWT con expiración
- Password hashing con bcrypt
- CORS configurado
- ValidationPipe con whitelist
- Prisma parameterized queries (inyección SQL prevenida)

### Pendiente 🚧

- Rate limiting en endpoints
- HTTPS obligatorio en producción
- Refresh tokens (actualmente solo access token)
- Audit logging para transacciones financieras

---

## 9. Referencias

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand](https://github.com/pmndrs/zustand)
- [shadcn/ui](https://ui.shadcn.com)
