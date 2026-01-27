# 🚀 CHECKLIST DE FUNCIONALIDADES CRÍTICAS PARA TESTING

## ⚡ TOP 5 ITEMS QUE NECESITAN URGENTE IMPLEMENTACIÓN

### 1️⃣ **Botones en AlertDashboard sin onClick** 🔴 CRÍTICO
```
Archivo: src/components/dashboards/AlertDashboard.tsx
Línea: ~285

PROBLEMA:
<button className={...}>
  {alert.action} →
</button>

SOLUCIÓN:
<button 
  onClick={() => onNavigate?.(alert.action_path)}
  className={...}
>
  {alert.action} →
</button>

MAPEO:
- "Ver emergencias" → path: "emergencies"
- "Revisar reportes" → path: "emergencies"
- "Aprobar órdenes" → path: "work-orders"
- "Ver solicitudes" → path: "service-requests"
- "Seguimiento" → path: "quotations"
- "Ver equipo" → path: "users"
- "Ver cronograma" → path: "maintenance-calendar"
```

---

### 2️⃣ **Ver Perfil de Cliente - NO EXISTE** 🔴 CRÍTICO
```
Archivo: FALTA CREAR src/components/views/ClientProfileView.tsx
Ruta: App.tsx renderContent() → case 'client-profile'

NECESITA MOSTRAR:
├── Datos Generales
│   ├── Nombre de empresa
│   ├── Contacto principal
│   ├── Teléfono/Email
│   ├── Dirección
│   └── Estado (activo/inactivo)
│
├── Ascensores Asociados
│   ├── Tabla con lista de ascensores
│   ├── Detalles técnicos
│   ├── Estado actual
│   └── Últimas acciones
│
└── Historial de Solicitudes
    ├── Filtros por estado
    ├── Detalles de cada solicitud
    ├── Comentarios/notas
    └── Documentos asociados
```

---

### 3️⃣ **API Endpoints para Clientes - NO EXISTEN** 🔴 CRÍTICO
```
Ubicación: Crear /api/clients/

ENDPOINTS NECESARIOS:

POST /api/clients/create
Body: {
  company_name: string
  building_name?: string
  contact_name: string
  contact_email: string
  contact_phone: string
  address: string
  user_id: string
}

POST /api/clients/update
Body: {
  client_id: string
  company_name?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  is_active?: boolean
}

GET /api/clients/:id
Returns: {
  id, company_name, contact_name, contact_email,
  contact_phone, address, is_active, created_at
}

DELETE /api/clients/:id
Returns: { success: true }

GET /api/clients/:id/elevators
Returns: [{ elevator data }]

GET /api/clients/:id/requests
Returns: [{ service_request data }]
```

---

### 4️⃣ **Botones Acción Rápida en ClientDashboard - SIN FUNCIÓN** 🟠 IMPORTANTE
```
Archivo: src/components/dashboards/ClientDashboard.tsx
Línea: ~120-180

PROBLEMA:
4 botones grandes no tienen onClick

SOLUCIÓN:
<button onClick={() => setViewMode('new-request')}>
  Nueva Emergencia
</button>

Opción A: Dentro del dashboard mismo
Opción B: Navegar a vista separada
Opción C: Abrir modal

BOTONES:
1. "🚨 Nueva Emergencia" → navigate('client-emergencies')
2. "🔧 Solicitar Mantenimiento" → setViewMode('new-request')
3. "📋 Cotizaciones Pendientes" → navigate('quotations-client')
4. "📊 Seguimiento de Órdenes" → navigate('work-orders-client')
```

---

### 5️⃣ **Validaciones Formulario Débiles** 🟠 IMPORTANTE
```
Archivo: src/components/forms/ClientForm.tsx
Línea: ~400-600

VALIDACIONES FALTANTES:

1. Email:
   - Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   - Mensaje: "Email inválido"

2. Teléfono:
   - Formato: +XX XXXXXXXXXX o (XX) XXXX-XXXX
   - Mensaje: "Teléfono debe tener al menos 10 dígitos"

3. Campos Obligatorios:
   - company_name (mín 3 caracteres)
   - contact_name (mín 3 caracteres)
   - contact_email (válido)
   - contact_phone (10+ dígitos)
   - address (mín 10 caracteres)

4. Confirmar antes de guardar:
   - Modal de confirmación
   - Mostrar datos que se guardarán

5. Mensajes Claros:
   - Error rojo en campo
   - Toast de éxito
   - Spinner durante guardado
```

---

## 🔗 TABLA DE DEPENDENCIAS

```
AlertDashboard Botones
    ↓ necesita ↓
    └─→ onNavigate prop en AdminDashboard
        ↓
        └─→ handleNavigate en App.tsx
            ↓
            └─→ Rutas en renderContent()

ClientProfileView
    ↓ necesita ↓
    ├─→ /api/clients/:id endpoint
    ├─→ /api/clients/:id/elevators endpoint
    ├─→ /api/clients/:id/requests endpoint
    └─→ Ruta en App.tsx

ClientDashboard Acciones
    ↓ necesita ↓
    ├─→ onNavigate prop
    └─→ Rutas específicas en App.tsx
```

---

## 📋 QUICK FIX EXAMPLES

### Fix 1: AlertDashboard onClick
```tsx
// ANTES:
<button className={...}>
  {alert.action} →
</button>

// DESPUÉS:
const actionPaths: Record<string, string> = {
  'Ver emergencias': 'emergencies',
  'Revisar reportes': 'emergencies',
  'Aprobar órdenes': 'work-orders',
  'Ver solicitudes': 'service-requests',
  'Seguimiento': 'quotations',
  'Ver equipo': 'users',
  'Ver cronograma': 'maintenance-calendar',
};

<button 
  onClick={() => {
    const path = actionPaths[alert.action];
    if (path && onNavigate) onNavigate(path);
  }}
  className={...}
>
  {alert.action} →
</button>
```

### Fix 2: Pass onNavigate a AlertDashboard
```tsx
// En AdminDashboard.tsx:
<AlertDashboard onNavigate={onNavigate} />

// En AlertDashboard.tsx signature:
interface AlertDashboardProps {
  onNavigate?: (path: string) => void;
}

export function AlertDashboard({ onNavigate }: AlertDashboardProps) {
  // ... rest of component
}
```

### Fix 3: Validación Email
```tsx
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Usar en:
if (!validateEmail(contactEmail)) {
  setErrors({ ...errors, contact_email: 'Email inválido' });
  return;
}
```

---

## 🎯 PRIORIDAD POR IMPACTO

| # | Item | Impacto | Tiempo | Estado |
|---|------|--------|--------|--------|
| 1 | AlertDashboard onClick | CRÍTICO | 15min | ❌ |
| 2 | ClientProfileView | CRÍTICO | 1-2h | ❌ |
| 3 | /api/clients/* endpoints | CRÍTICO | 1h | ❌ |
| 4 | ClientDashboard Actions | IMPORTANTE | 30min | ❌ |
| 5 | Validaciones Form | IMPORTANTE | 45min | ❌ |
| 6 | UserProfile mejorado | MEDIA | 1h | ⚠️ |
| 7 | Rutas en Layout | MEDIA | 30min | ⚠️ |
| 8 | Búsqueda/Filtros | BAJA | 2h | ❌ |

**Total Estimado:** 7-8 horas para implementar TODO

---

## ✅ TESTING INMEDIATO SIN ESPERAR

Mientras se implementa lo crítico, puedes:

1. **Crear cliente manualmente en Supabase:**
   ```
   - INSERT en tabla clients
   - Crear usuario con role 'client'
   - Asignar elevators
   ```

2. **Logearse como cliente y verificar:**
   - ClientDashboard carga datos
   - Ver ascensores
   - AlertDashboard carga (aunque botones no funcionen)

3. **Ver en consola del navegador:**
   - No hay errores críticos
   - Real-time updates funcionan
   - Supabase conecta correctamente

4. **Verificar en Admin:**
   - Las alertas muestran números correctos
   - Los datos son en tiempo real
   - Los colores/estilos son atractivos
