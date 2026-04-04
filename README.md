# Financial Copilot - Web App de Finanzas Personales

Una aplicación web de finanzas personales con Dashboard, Gestión de Transacciones, Presupuestos, Metas de Ahorro, Insights Automáticos y Chat IA.

## 🏗️ Estructura del Proyecto

```
fintech-copilot/
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/   # Módulos de la aplicación
│   │   │   ├── auth/          # Autenticación JWT
│   │   │   ├── users/         # Gestión de usuarios
│   │   │   ├── accounts/     # Cuentas financieras
│   │   │   ├── transactions/ # Transacciones
│   │   │   ├── budgets/       # Presupuestos
│   │   │   ├── goals/        # Metas de ahorro
│   │   │   └── insights/      # Insights + Chat IA
│   │   └── common/     # Servicios compartidos
│   └── prisma/        # Schema de base de datos
│
└── frontend/          # Next.js 14 App Router
    ├── src/
    │   ├── app/       # Páginas de la app
    │   ├── components/# Componentes UI (shadcn/ui)
    │   ├── lib/       # Utilidades y API client
    │   ├── stores/    # Zustand stores
    │   └── types/     # Tipos TypeScript
    └── tailwind.config.js
```

## 🚀 Quick Start

### Prerrequisitos

- Node.js 18+
- PostgreSQL (local o Docker)
- Docker (opcional, para Redis)

### 1. Base de Datos

**Opción A: Docker**
```bash
# PostgreSQL + Redis
docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
docker run -d -p 6379:6379 redis
```

**Opción B: Instalación local**
- PostgreSQL: https://www.postgresql.org/download/
- Redis: https://redis.io/download

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar .env (ya viene configurado para desarrollo)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fintech"

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Iniciar servidor
npm run start:dev
```

El backend corre en `http://localhost:4000`

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

El frontend corre en `http://localhost:3000`

## 📡 Endpoints API

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Cuentas
- `GET /api/accounts` - Listar cuentas
- `POST /api/accounts` - Crear cuenta
- `GET /api/accounts/balance` - Balance total
- `PUT /api/accounts/:id` - Actualizar cuenta
- `DELETE /api/accounts/:id` - Eliminar cuenta

### Transacciones
- `GET /api/transactions` - Listar transacciones (con filtros)
- `POST /api/transactions` - Crear transacción
- `GET /api/transactions/stats` - Estadísticas
- `PUT /api/transactions/:id` - Actualizar
- `DELETE /api/transactions/:id` - Eliminar

### Presupuestos
- `GET /api/budgets` - Listar presupuestos
- `POST /api/budgets` - Crear presupuesto
- `GET /api/budgets/alerts` - Alertas de presupuesto
- `PUT /api/budgets/:id` - Actualizar
- `DELETE /api/budgets/:id` - Eliminar

### Metas
- `GET /api/goals` - Listar metas
- `POST /api/goals` - Crear meta
- `GET /api/goals/summary` - Resumen de metas
- `POST /api/goals/:id/contribute` - Agregar contribución
- `PUT /api/goals/:id` - Actualizar
- `DELETE /api/goals/:id` - Eliminar

### Insights
- `GET /api/insights` - Listar insights
- `POST /api/insights/generate` - Generar insights
- `POST /api/insights/chat` - Chat con IA
- `GET /api/insights/chat/history` - Historial de chat

## 🛠️ Tecnologías

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM
- **JWT** - Autenticación
- **PostgreSQL** - Base de datos
- **Redis** - Cache (preparado)

### Frontend
- **Next.js 14** - App Router
- **TypeScript** - Tipado
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes
- **Zustand** - Estado global
- **Recharts** - Gráficos

### IA (Preparación)
- **Google Gemini API** - Integración lista (agregar key en .env)

## 📊 Funcionalidades

### Dashboard
- Balance total
- Ingresos vs gastos del mes
- Gráfico de pastel por categoría
- Evolución mensual (línea)
- Progreso de presupuestos
- Transacciones recientes

### Transacciones
- Lista tipo timeline
- Filtros por fecha y categoría
- Crear/editar/eliminar transacciones
- Actualización automática de saldo

### Presupuestos
- Visualización por categoría
- Progress bars con alertas
- Resumen total

### Metas de Ahorro
- Progreso可视化
- Días restantes
- Contribuciones

### Insights
- Alertas de presupuesto
- Comparación mes a mes
- Predicciones
- Logros

### Chat IA
- Respuestas contextuales
- Quick actions
- Historial de conversación

## 🔧 Variables de Entorno

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fintech"
JWT_SECRET="fintech-secret-key-change-in-prod"
FRONTEND_URL="http://localhost:3000"
GEMINI_API_KEY=  # Tu clave de Google Gemini (obtener en https://aistudio.google.com/app/apikey)
PORT=4000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 📈 Datos de Ejemplo

El frontend incluye datos mock para demo. Para datos reales:
1. Crear usuario desde el login
2. Las páginas will pull from API

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready -h localhost -p 5432

# O verificar con Docker
docker ps
```

### Error de migración Prisma
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

## 🚢 Próximos Pasos (Sugeridos)

1. [x] Integrar Google Gemini API para chat real
2. [ ] Implementar WebSockets para updates en tiempo real
3. [ ] Agregar unit tests
4. [ ] Docker-compose para desarrollo
5. [ ] Despliegue a producción (Vercel + Railway/Supabase)

## 📝 Licencia

MIT - Made with ❤️ for better finances