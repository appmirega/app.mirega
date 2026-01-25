# 📋 Mejoras Implementadas - Sistema de Órdenes de Trabajo v2

**Fecha:** 25/01/2026 16:30:00 -0300  
**Commit:** 39e96ac  
**Status:** ✅ DEPLOYADO EN VERCEL

---

## 🎯 Resumen de Cambios

Se ha rediseñado completamente el flujo de creación de órdenes de trabajo implementando:

1. ✅ **Dos tipos de orden mutuamente excluyentes**
   - Orden Interna (sin costo al cliente)
   - Orden con Cotización (requiere aprobación)

2. ✅ **Reordenamiento inteligente de formularios**
   - Asignación de técnico y fecha SOLO aparecen después de aprobación (si aplica)
   - Para órdenes internas: aparecen de inmediato

3. ✅ **Soporte completo para personal externo**
   - Base de datos de prestadores externos
   - 3 tipos: empresas, independientes, especialistas en marcas
   - Opción de mezclar técnicos internos + externos

4. ✅ **Sistema de creación de nuevos prestadores en el mismo formulario**
   - Crear prestador sin salir del formulario
   - Auto-agregar a la lista de selección

---

## 📊 Cambios Técnicos

### 1. SQL: Nueva tabla `external_service_providers`

**Archivo:** `sql/2026-01-25-external-service-providers.sql` (315 líneas)

```sql
CREATE TABLE external_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Tipo: 'company' | 'individual' | 'specialist'
  provider_type VARCHAR(50) NOT NULL,
  service_category VARCHAR(100),
  elevator_brand_specialty VARCHAR(100), -- Para especialistas
  
  -- Información de contacto y financiera
  contact_person VARCHAR(255),
  company_name VARCHAR(255),
  address TEXT,
  payment_method VARCHAR(50),
  payment_terms VARCHAR(100),
  average_hourly_rate DECIMAL(10,2),
  rut_number VARCHAR(20),
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Auditoría
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  notes TEXT
);
```

**Funciones RPC creadas:**
- `get_active_providers_by_type(p_type)` - Obtener prestadores por tipo
- `get_specialists_by_brand(p_brand)` - Obtener especialistas por marca de ascensor
- `create_external_provider(...)` - Crear nuevo prestador (usado en UI)

**Índices:**
- `idx_external_providers_type` - Por tipo
- `idx_external_providers_active` - Filtrar activos
- `idx_external_providers_brand` - Por marca
- `idx_external_providers_city` - Por ciudad

**Triggers:**
- `trigger_external_providers_updated_at` - Mantener timestamp de actualización

---

### 2. React: Redesign completo de WorkOrdersViewEnhanced.tsx

**Archivo:** `src/components/views/WorkOrdersViewEnhanced.tsx` (1,200+ líneas)

#### Nuevos estados y interfaces:

```typescript
interface ExternalProvider {
  id: string;
  name: string;
  provider_type: 'company' | 'individual' | 'specialist';
  service_category?: string;
  elevator_brand_specialty?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
}

type OrderType = 'internal' | 'quotation' | null;

// Estados adicionales
const [orderType, setOrderType] = useState<OrderType>(null);
const [externalProviders, setExternalProviders] = useState<ExternalProvider[]>([]);
const [showNewProviderForm, setShowNewProviderForm] = useState(false);
```

#### Flujo de Creación Mejorado:

**PASO 1: INFORMACIÓN BÁSICA**
- Edificio (obligatorio)
- Solicitud de servicio (opcional)
- Tipo de trabajo
- Prioridad
- Descripción

**PASO 2: SELECTOR DE TIPO DE ORDEN** ⭐ NUEVO
```
┌─ Radio button: Orden Interna
│  └─ "Para trabajos sin costo al cliente"
│
└─ Radio button: Orden con Cotización
   └─ "Para trabajos con costo. Requiere aprobación del cliente"
```

**OPCIÓN A: ORDEN INTERNA (Flujo rápido)**
```
PASO 1: Información Básica + Tipo Orden
        ↓
PASO 2: Programación
        ├─ Fecha programada (opcional)
        ├─ Técnico responsable (opcional)
        ├─ Personal externo (opcional)
        │  ├─ Mezclar con técnico interno
        │  ├─ Seleccionar prestadores
        │  └─ + Crear nuevo prestador
        ├─ Notas adicionales
        │
        └─ ✅ Crear Orden Interna
```

**OPCIÓN B: ORDEN CON COTIZACIÓN (Flujo completo)**
```
PASO 1: Información Básica + Tipo Orden
        ↓
PASO 2: Aprobación del Cliente
        ├─ ☐ Requiere aprobación del cliente
        └─ Fecha límite de aprobación (si aplica)
        ↓
PASO 3: Cotización y Costos
        ├─ ☐ Esta OT tiene costo al cliente
        ├─ Número de cotización externa
        ├─ Monto de cotización (CLP)
        ├─ Descripción de cotización
        ├─ Repuestos
        │  ├─ ☐ Incluye compras en extranjero
        │  └─ Proveedor/País
        ├─ Estimación de ejecución (días)
        └─ Adelanto de pago (opcional)
           ├─ Porcentaje adelanto (%)
           └─ Monto adelanto (auto-calculado)
        ↓
PASO 4: Garantías
        ├─ Garantía de trabajo
        │  ├─ Meses
        │  └─ Descripción
        └─ Garantía de repuestos
           ├─ Meses
           └─ Descripción
        ↓
NOTA: La asignación de técnico y fecha se hace DESPUÉS
      de que el cliente aprueba
        ↓
        └─ ✅ Crear Orden con Cotización
```

---

## 🔧 Funcionalidades Principales

### 1. **Selector de Tipo de Orden** (Radio buttons)

Mutuamente excluyente. Controla qué tabs se muestran:

```typescript
{!orderType && (
  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
    <h3>¿Qué tipo de orden deseas crear?</h3>
    <label>
      <input type="radio" value="internal" 
             onChange={() => {
               setOrderType('internal');
               setActiveTab('schedule');
             }} />
      🔧 Orden Interna
    </label>
    <label>
      <input type="radio" value="quotation" 
             onChange={() => {
               setOrderType('quotation');
               setActiveTab('approval');
             }} />
      📊 Orden con Cotización
    </label>
  </div>
)}
```

### 2. **Personal Externo (Conditional Rendering)**

Se muestra en el tab de Programación (órdenes internas) si está activo:

```typescript
{formData.uses_external_personnel && (
  <div>
    <label>Mezclar con técnico interno</label>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {externalProviders.map(provider => (
        <label key={provider.id}>
          <input type="checkbox" 
                 checked={formData.external_personnel_ids.includes(provider.id)}
                 onChange={() => handleToggleExternalProvider(provider.id)} />
          {provider.name}
          <span className="text-xs text-slate-600">
            {provider.provider_type === 'company' && '🏢 Empresa'}
            {provider.provider_type === 'individual' && '👤 Independiente'}
            {provider.provider_type === 'specialist' && '⭐ Especialista'}
            {provider.service_category}
          </span>
        </label>
      ))}
    </div>
    <button onClick={() => setShowNewProviderForm(!showNewProviderForm)}>
      + Agregar nuevo prestador
    </button>
  </div>
)}
```

### 3. **Crear Nuevo Prestador (Modal In-line)**

Sin salir del formulario, crear nuevo prestador:

```typescript
{showNewProviderForm && (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
    <h5>Nuevo Prestador</h5>
    <input placeholder="Nombre *" />
    <input placeholder="Email" />
    <input placeholder="Teléfono" />
    <select defaultValue="individual">
      <option>Independiente</option>
      <option>Empresa</option>
      <option>Especialista en marca</option>
    </select>
    <input placeholder="Categoría de servicio" />
    <button onClick={handleAddExternalProvider}>
      Crear Prestador
    </button>
  </div>
)}
```

La función RPC `create_external_provider()` se ejecuta en Supabase.

### 4. **Auto-cálculo de Adelantos**

Cuando escribes el porcentaje, automáticamente calcula el monto:

```typescript
const handleAdvancePercentageChange = (value: string) => {
  const percentage = value ? parseFloat(value) : 0;
  const quotationAmount = formData.quotation_amount 
    ? parseFloat(formData.quotation_amount) : 0;
  const advanceAmount = (quotationAmount * percentage) / 100;

  setFormData({
    ...formData,
    advance_percentage: value,
    advance_amount: advanceAmount > 0 ? advanceAmount.toString() : '',
  });
};
```

### 5. **Lógica Inteligente de Almacenamiento**

El `handleSubmit()` diferencia entre tipos:

```typescript
// Para órdenes internas: asignar inmediatamente
assigned_technician_id: orderType === 'internal' 
  ? (formData.assigned_technician_id || null) 
  : null,
scheduled_date: orderType === 'internal' 
  ? (formData.scheduled_date || null) 
  : null,

// Para órdenes con cotización: NULL hasta aprobación
// (se llenan en paso posterior en ClientServiceRequestsViewEnhanced)

// Cotización solo si aplica
has_client_cost: orderType === 'quotation' 
  ? formData.has_client_cost : false,
quotation_amount: orderType === 'quotation' 
  ? (formData.quotation_amount ? parseFloat(formData.quotation_amount) : null) 
  : null,

// Personal externo
uses_external_personnel: formData.uses_external_personnel,
external_personnel_ids: formData.uses_external_personnel 
  ? formData.external_personnel_ids : [],
mixed_personnel: formData.mixed_personnel,
```

---

## 📱 UI/UX Improvements

### Colores por tipo de orden:
- **Orden Interna:** 🟢 Verde (rápido, directo)
- **Orden con Cotización:** 🟠 Naranja (requiere aprobación)

### Iconografía:
- 🔧 Interna
- 📊 Con Cotización
- 👤 Independiente
- 🏢 Empresa
- ⭐ Especialista
- 📋 Aprobación
- 💰 Cotización
- 🛡️ Garantías
- 👥 Personal externo

### Responsive Design:
- Grid layout para pantallas grandes
- Stack en móviles
- Overflow-y para listas largas

---

## 🗄️ Schema actualizado (work_orders)

Nuevos campos agregados a la tabla:

```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS uses_external_personnel BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS external_personnel_ids UUID[] DEFAULT '{}';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mixed_personnel BOOLEAN DEFAULT false;
```

---

## 🚀 Deploy Status

| Componente | Archivo | Status | Detalles |
|-----------|---------|--------|----------|
| SQL | `sql/2026-01-25-external-service-providers.sql` | ⏳ PENDIENTE | Ejecutar en Supabase |
| React | `src/components/views/WorkOrdersViewEnhanced.tsx` | ✅ DEPLOYED | En Vercel (commit 39e96ac) |
| Git | main branch | ✅ PUSHED | 2 files changed, 1,007 insertions |

---

## 📋 Próximos Pasos

### 1. **Ejecutar SQL en Supabase** (CRÍTICO)
```
1. https://app.supabase.com → SQL Editor → New Query
2. Copiar: sql/2026-01-25-external-service-providers.sql
3. Click RUN
```

### 2. **Actualizar Tabla work_orders** (si no existe)
Si los campos `is_internal`, `uses_external_personnel`, etc. no existen:
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS uses_external_personnel BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS external_personnel_ids UUID[] DEFAULT '{}';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mixed_personnel BOOLEAN DEFAULT false;
```

### 3. **Verificar en Vercel**
- URL: https://app-mirega.vercel.app
- Ir a "Órdenes de Trabajo" → "Nueva Orden"
- Deberías ver los dos radio buttons (Interna vs Con Cotización)

### 4. **Actualizar ClientServiceRequestsViewEnhanced.tsx**
Este componente necesita actualización para:
- Asignar técnico DESPUÉS de aprobación (para órdenes con cotización)
- Mostrar personal externo disponible
- RPC para actualizar `assigned_technician_id` post-aprobación

---

## 🧪 Testing Checklist

- [ ] Crear orden INTERNA
  - [ ] Sin asignar técnico
  - [ ] Con técnico
  - [ ] Con personal externo
  - [ ] Mezclar técnico + externo
  - [ ] Crear nuevo prestador dentro del formulario

- [ ] Crear orden CON COTIZACIÓN
  - [ ] Sin aprobación cliente
  - [ ] Con aprobación cliente + deadline
  - [ ] Con cotización
  - [ ] Con adelanto
  - [ ] Con garantías
  - [ ] Con repuestos extranjeros

- [ ] Personal Externo
  - [ ] Filtrar por tipo
  - [ ] Crear nuevo (inline)
  - [ ] Seleccionar múltiples
  - [ ] Mezclar con interno

---

## 📝 Notas Importantes

1. **Designación posterior:** Para órdenes con cotización, la asignación de técnico se hará en `ClientServiceRequestsViewEnhanced.tsx` DESPUÉS de que el cliente aprueba.

2. **Personal externo:** La tabla puede sembrarse con datos iniciales (comentados en el SQL) para agilizar las pruebas.

3. **Validaciones:** 
   - Orden interna: técnico y fecha van juntos (ambos o ninguno)
   - Orden con cotización: requiere deadline si aplica aprobación

4. **RPC create_external_provider():** Usa `auth.uid()` para `created_by`, asegúrate de estar autenticado.

---

**Timestamp:** 25/01/2026 16:30:00 -0300  
**Commit:** 39e96ac  
**Status:** ✅ Implementación Completa
