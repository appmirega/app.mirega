# 📊 FASE 2 - ANÁLISIS ESTRATÉGICO DE DATOS
**Fecha:** 23 de Enero de 2026  
**Objetivo:** Diseñar estructura de datos optimizada para gestión empresarial, dashboards, reporting y toma de decisiones

---

## 🎯 VISIÓN ESTRATÉGICA

### Principios Fundamentales
1. **Cada campo debe responder una pregunta de negocio**
2. **Cada timestamp permite medir un KPI**
3. **Cada relación facilita un cruce de información**
4. **Cada estado permite un gráfico de tendencias**
5. **Cada métrica potencia la toma de decisiones**

---

## 📈 KPIs CRÍTICOS PARA ADMINISTRADORES

### 1. **Eficiencia Operacional**
```
¿Qué medir?
- Tiempo promedio de respuesta a solicitudes
- Tiempo promedio de resolución por tipo de trabajo
- Tasa de cumplimiento de SLA (Service Level Agreement)
- Porcentaje de trabajos completados vs asignados
- Utilización de técnicos (horas trabajadas / horas disponibles)

¿Qué datos necesitamos?
- created_at, assigned_at, started_at, completed_at (timestamps)
- sla_deadline (fecha límite acordada)
- estimated_hours vs actual_hours (estimado vs real)
- technician_id + work_date (para calcular utilización)
```

### 2. **Rentabilidad y Costos**
```
¿Qué medir?
- Ingreso promedio por orden de trabajo
- Costo de repuestos vs precio de venta
- Margen de ganancia por servicio
- Costo de mano de obra por técnico
- ROI de mantenimientos preventivos

¿Qué datos necesitamos?
- subtotal, tax_amount, total (ingresos)
- parts_cost, labor_cost (costos)
- profit_margin calculado (total - costos)
- technician_hourly_rate (costo/hora técnico)
```

### 3. **Satisfacción del Cliente**
```
¿Qué medir?
- Tiempo de inactividad de ascensores
- Frecuencia de emergencias por cliente
- Tasa de reincidencia (mismos problemas)
- Aprobación de cotizaciones (% aprobadas)
- Tiempo de respuesta a emergencias

¿Qué datos necesitamos?
- elevator_stopped_at, elevator_reactivated_at (downtime)
- emergency_count_per_elevator (frecuencia)
- issue_category + recurrence_count (reincidencia)
- quotation_approved_at, quotation_rejected_at
- emergency_reported_at, technician_arrived_at
```

### 4. **Gestión de Recursos**
```
¿Qué medir?
- Stock de repuestos críticos
- Técnicos disponibles vs ocupados
- Zonas geográficas con más demanda
- Equipos con más fallas
- Proveedores más confiables

¿Qué datos necesitamos?
- parts_current_stock, parts_min_stock (inventario)
- technician_status (available, busy, offline)
- client_address + elevator_location (geo)
- elevator_id + failure_count (frecuencia fallas)
- supplier_id + delivery_time_avg (proveedores)
```

### 5. **Predicción y Tendencias**
```
¿Qué medir?
- Ascensores con riesgo de falla
- Clientes con contratos próximos a vencer
- Temporadas con más demanda
- Tipos de trabajo más recurrentes
- Repuestos con mayor rotación

¿Qué datos necesitamos?
- maintenance_history + failure_patterns (predicción)
- contract_end_date (vencimientos)
- work_date + month + year (estacionalidad)
- work_type + frequency (recurrencia)
- part_id + usage_count (rotación)
```

---

## 🗄️ GAPS EN ESTRUCTURA ACTUAL

### ❌ FALTAN: Timestamps para Métricas de Tiempo

**service_requests** - Solicitudes de Servicio
```sql
FALTA:
- analyzed_at          -- ¿Cuándo admin empezó a analizar?
- approved_at          -- ¿Cuándo se aprobó?
- work_started_at      -- ¿Cuándo técnico empezó trabajo?
- work_completed_at    -- ¿Cuándo técnico terminó?
- closed_at            -- ¿Cuándo se cerró definitivamente?

PERMITE CALCULAR:
- Tiempo de análisis: analyzed_at - created_at
- Tiempo de aprobación: approved_at - created_at
- Tiempo de ejecución: work_completed_at - work_started_at
- Tiempo total: closed_at - created_at
- SLA compliance: closed_at < sla_deadline
```

**quotations** - Cotizaciones
```sql
FALTA:
- sent_to_client_at    -- ¿Cuándo se envió al cliente?
- client_viewed_at     -- ¿Cuándo cliente vio cotización?
- approved_at          -- Ya existe, OK ✓
- executed_at          -- ¿Cuándo se ejecutó (OT creada)?
- closed_at            -- ¿Cuándo se finalizó OT asociada?

PERMITE CALCULAR:
- Tiempo de respuesta cliente: approved_at - sent_to_client_at
- Tiempo de ejecución: closed_at - executed_at
- Tasa de conversión: COUNT(approved) / COUNT(sent)
```

**work_orders** - Órdenes de Trabajo
```sql
FALTA:
- assigned_at          -- ¿Cuándo se asignó técnico?
- technician_started_at -- ¿Cuándo técnico empezó?
- technician_finished_at -- ¿Cuándo técnico terminó?
- closed_at            -- ¿Cuándo admin cerró OT?
- actual_hours         -- Horas reales trabajadas (vs estimadas)

PERMITE CALCULAR:
- Tiempo de asignación: assigned_at - created_at
- Tiempo de trabajo: technician_finished_at - technician_started_at
- Desviación: actual_hours - estimated_hours
- Eficiencia técnico: actual_hours / estimated_hours
```

**emergency_visits** - Emergencias
```sql
EXISTE:
- reported_at          -- ✓ Ya existe
- technician_assigned_at -- ✓ Ya existe
- technician_arrived_at -- ✓ Ya existe
- resolved_at          -- ✓ Ya existe

AGREGAR:
- elevator_stopped_at  -- ¿Cuándo se detuvo el ascensor? (crítico para downtime)
- elevator_reactivated_at -- ¿Cuándo se reactivó?
- response_time_minutes -- Calculado: arrived_at - reported_at
- resolution_time_minutes -- Calculado: resolved_at - arrived_at
- total_downtime_minutes -- Calculado: reactivated_at - stopped_at

PERMITE CALCULAR:
- SLA emergencias: response_time < 60 minutos
- Tiempo de inactividad por cliente
- Eficiencia técnico en emergencias
```

### ❌ FALTAN: Campos para Costos y Rentabilidad

**work_orders** - Órdenes de Trabajo
```sql
AGREGAR:
- labor_cost DECIMAL(10,2)      -- Costo mano de obra
- parts_cost DECIMAL(10,2)      -- Costo repuestos
- other_costs DECIMAL(10,2)     -- Otros gastos
- total_cost DECIMAL(10,2)      -- Costo total
- revenue DECIMAL(10,2)         -- Ingreso generado
- profit_margin DECIMAL(10,2)   -- Margen de ganancia

PERMITE CALCULAR:
- Rentabilidad por OT: revenue - total_cost
- Margen %: (revenue - total_cost) / revenue * 100
- Rentabilidad por técnico
- Rentabilidad por tipo de trabajo
```

**quotations** - Cotizaciones
```sql
AGREGAR:
- cost_of_parts DECIMAL(10,2)   -- Costo real de repuestos
- markup_percentage DECIMAL(5,2) -- % de margen aplicado
- discount_applied DECIMAL(10,2) -- Descuento otorgado
- final_profit DECIMAL(10,2)     -- Ganancia final

PERMITE CALCULAR:
- Margen real: final_profit / total * 100
- Descuentos promedio por cliente
- Rentabilidad por cotización aprobada
```

### ❌ FALTAN: Campos para Trazabilidad y Relaciones

**service_requests** - Solicitudes de Servicio
```sql
AGREGAR:
- related_maintenance_id UUID REFERENCES mnt_checklists(id)
  -- ¿De qué mantenimiento viene esta solicitud?
  
- related_emergency_id UUID REFERENCES emergency_visits(id)
  -- ¿Se generó por una emergencia previa?
  
- parent_request_id UUID REFERENCES service_requests(id)
  -- ¿Es una solicitud hija/derivada de otra?
  
- recurrence_count INTEGER DEFAULT 0
  -- ¿Cuántas veces ha ocurrido este mismo problema?
  
- last_occurrence_date TIMESTAMPTZ
  -- ¿Cuándo fue la última vez que pasó?

PERMITE ANALIZAR:
- Efectividad de mantenimientos preventivos
- Conversión emergencia → solicitud → mantenimiento
- Problemas recurrentes por ascensor
- Ciclos de reincidencia
```

**quotations** - Cotizaciones
```sql
AGREGAR:
- work_order_id UUID REFERENCES work_orders(id)
  -- ¿Qué OT se generó al ejecutar esta cotización?
  
- executed_by UUID REFERENCES profiles(id)
  -- ¿Quién ejecutó el trabajo?
  
- completion_notes TEXT
  -- Notas de cierre al completar OT

PERMITE ANALIZAR:
- Flujo completo: Solicitud → Cotización → OT → Cierre
- Tiempo total desde cotización hasta ejecución
- Técnicos más eficientes en trabajos cotizados
```

**work_orders** - Órdenes de Trabajo
```sql
AGREGAR:
- source_type TEXT CHECK (source_type IN ('service_request', 'quotation', 'maintenance', 'emergency', 'direct'))
  -- ¿De dónde viene esta OT?
  
- source_id UUID
  -- ID de la fuente (service_request_id, quotation_id, etc.)
  
- client_satisfaction_rating INTEGER CHECK (rating BETWEEN 1 AND 5)
  -- Calificación del cliente (1-5 estrellas)
  
- client_feedback TEXT
  -- Comentario del cliente al cerrar

PERMITE ANALIZAR:
- Origen de trabajos (cuántos vienen de preventivo vs reactivo)
- Satisfacción por técnico
- Satisfacción por tipo de trabajo
- Trazabilidad completa del flujo
```

### ❌ FALTAN: Campos para SLA y Alertas

**Todos los módulos principales**
```sql
AGREGAR:
- sla_deadline TIMESTAMPTZ
  -- Fecha/hora límite acordada
  
- sla_status TEXT CHECK (sla_status IN ('on_time', 'at_risk', 'overdue'))
  -- Estado actual vs SLA
  
- priority_score INTEGER
  -- Score calculado (urgencia + cliente VIP + SLA)
  
- requires_approval BOOLEAN DEFAULT false
  -- ¿Necesita aprobación especial?
  
- approval_notes TEXT
  -- Notas de aprobación

PERMITE:
- Dashboard de alertas SLA
- Priorización automática
- Métricas de cumplimiento
- Escalamiento automático
```

---

## 🔗 FLUJOS COMPLETOS CON TRAZABILIDAD

### Flujo 1: Mantenimiento → Solicitud → Cotización → OT

```mermaid
TÉCNICO ejecuta mantenimiento mensual
  ↓
mnt_checklists (id=123)
  ├─ month: 1
  ├─ year: 2026
  ├─ started_at: 2026-01-15 09:00
  └─ finished_at: 2026-01-15 11:30
  ↓
mnt_checklist_answers
  ├─ Pregunta 15: "NO OK - Puerta no cierra"
  ├─ auto_generate_service_request: true
  └─ triggers creation...
  ↓
service_requests (id=456)
  ├─ related_maintenance_id: 123 ← TRAZABILIDAD
  ├─ title: "Reparar puerta Ascensor Edificio Loft"
  ├─ created_at: 2026-01-15 11:31 (automático)
  └─ status: 'pending'
  ↓
ADMIN analiza solicitud
  ├─ analyzed_at: 2026-01-15 14:00 ← TIMESTAMP
  └─ Decide: "Requiere repuestos"
  ↓
quotations (id=789)
  ├─ service_request_id: 456 ← TRAZABILIDAD
  ├─ sent_to_client_at: 2026-01-15 14:30 ← TIMESTAMP
  ├─ subtotal: 450000
  ├─ cost_of_parts: 280000 ← COSTO REAL
  ├─ markup_percentage: 35% ← MARGEN
  └─ status: 'pending'
  ↓
CLIENTE aprueba cotización
  ├─ approved_at: 2026-01-16 10:00 ← TIMESTAMP
  ├─ status: 'approved'
  └─ triggers creation...
  ↓
work_orders (id=101)
  ├─ source_type: 'quotation' ← ORIGEN
  ├─ source_id: 789 ← TRAZABILIDAD
  ├─ quotation_id: 789 ← RELACIÓN
  ├─ service_request_id: 456 ← RELACIÓN
  ├─ assigned_at: 2026-01-16 10:05 ← TIMESTAMP
  ├─ labor_cost: 120000 ← COSTO
  ├─ parts_cost: 280000 ← COSTO
  ├─ revenue: 450000 ← INGRESO
  ├─ profit_margin: 50000 ← GANANCIA (450k - 400k)
  └─ status: 'assigned'
  ↓
TÉCNICO ejecuta OT
  ├─ technician_started_at: 2026-01-17 09:00 ← TIMESTAMP
  ├─ technician_finished_at: 2026-01-17 12:00 ← TIMESTAMP
  ├─ actual_hours: 3.0 ← REAL
  └─ estimated_hours: 2.5 ← ESTIMADO
  ↓
CIERRE con satisfacción
  ├─ closed_at: 2026-01-17 12:15 ← TIMESTAMP
  ├─ client_satisfaction_rating: 5 ← CALIFICACIÓN
  ├─ client_feedback: "Excelente trabajo"
  └─ status: 'completed'
  ↓
UPDATE quotations
  ├─ status: 'executed' ← ESTADO
  ├─ executed_at: 2026-01-17 12:15 ← TIMESTAMP
  └─ work_order_id: 101 ← TRAZABILIDAD
  ↓
UPDATE service_requests
  ├─ status: 'completed' ← ESTADO
  ├─ closed_at: 2026-01-17 12:15 ← TIMESTAMP
  └─ resolution_notes: "Puerta reparada"
```

**ANÁLISIS DISPONIBLE:**
- Tiempo total: 2 días 3 horas (created_at → closed_at)
- Eficiencia técnico: 3h real vs 2.5h estimado = 120%
- Rentabilidad: $50,000 ganancia (11% margen)
- Satisfacción: 5/5 estrellas
- Origen: Mantenimiento preventivo → Proactivo ✅
- Trazabilidad completa: Mantenimiento #123 → Solicitud #456 → Cotización #789 → OT #101

---

## 📊 VISTAS SQL OPTIMIZADAS PARA DASHBOARDS

### Vista 1: Métricas de Eficiencia Operacional
```sql
CREATE OR REPLACE VIEW dashboard_efficiency_metrics AS
SELECT
  -- Tiempos promedio por tipo de trabajo
  sr.title AS request_type,
  COUNT(sr.id) AS total_requests,
  AVG(EXTRACT(EPOCH FROM (sr.closed_at - sr.created_at)) / 3600) AS avg_total_hours,
  AVG(EXTRACT(EPOCH FROM (sr.analyzed_at - sr.created_at)) / 3600) AS avg_analysis_hours,
  AVG(EXTRACT(EPOCH FROM (wo.technician_finished_at - wo.technician_started_at)) / 3600) AS avg_work_hours,
  
  -- Cumplimiento SLA
  COUNT(CASE WHEN sr.closed_at <= sr.sla_deadline THEN 1 END) * 100.0 / COUNT(sr.id) AS sla_compliance_pct,
  
  -- Eficiencia técnicos
  AVG(wo.actual_hours / NULLIF(wo.estimated_hours, 0)) AS efficiency_ratio,
  
  -- Satisfacción promedio
  AVG(wo.client_satisfaction_rating) AS avg_satisfaction

FROM service_requests sr
LEFT JOIN work_orders wo ON wo.service_request_id = sr.id
WHERE sr.status = 'completed'
  AND sr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY sr.title
ORDER BY total_requests DESC;
```

### Vista 2: Rentabilidad por Servicio
```sql
CREATE OR REPLACE VIEW dashboard_profitability AS
SELECT
  wo.work_type,
  COUNT(wo.id) AS total_orders,
  SUM(wo.revenue) AS total_revenue,
  SUM(wo.total_cost) AS total_cost,
  SUM(wo.profit_margin) AS total_profit,
  AVG(wo.profit_margin / NULLIF(wo.revenue, 0) * 100) AS avg_margin_pct,
  
  -- Por técnico
  p.full_name AS technician_name,
  COUNT(wo.id) AS technician_orders,
  SUM(wo.profit_margin) AS technician_profit

FROM work_orders wo
LEFT JOIN profiles p ON p.id = wo.assigned_technician_id
WHERE wo.status = 'completed'
  AND wo.closed_at >= NOW() - INTERVAL '30 days'
GROUP BY wo.work_type, p.full_name
ORDER BY total_profit DESC;
```

### Vista 3: Downtime de Ascensores (Crítico)
```sql
CREATE OR REPLACE VIEW dashboard_elevator_downtime AS
SELECT
  e.id AS elevator_id,
  e.serial_number,
  e.brand,
  c.business_name AS client,
  
  -- Emergencias activas
  COUNT(CASE WHEN ev.elevator_status = 'stopped' THEN 1 END) AS active_emergencies,
  
  -- Tiempo total detenido este mes
  SUM(EXTRACT(EPOCH FROM (
    COALESCE(ev.elevator_reactivated_at, NOW()) - ev.elevator_stopped_at
  )) / 3600) AS total_downtime_hours_month,
  
  -- Última emergencia
  MAX(ev.elevator_stopped_at) AS last_stopped_at,
  
  -- Frecuencia de fallas
  COUNT(ev.id) AS emergency_count_month,
  
  -- Ascensores de alto riesgo
  CASE
    WHEN COUNT(ev.id) > 3 THEN 'HIGH_RISK'
    WHEN COUNT(ev.id) > 1 THEN 'MEDIUM_RISK'
    ELSE 'LOW_RISK'
  END AS risk_level

FROM elevators e
LEFT JOIN clients c ON c.id = e.client_id
LEFT JOIN emergency_visits ev ON ev.elevator_id = e.id
  AND ev.reported_at >= DATE_TRUNC('month', NOW())
GROUP BY e.id, e.serial_number, e.brand, c.business_name
ORDER BY total_downtime_hours_month DESC NULLS LAST;
```

### Vista 4: Pipeline de Ingresos
```sql
CREATE OR REPLACE VIEW dashboard_revenue_pipeline AS
SELECT
  -- Ingresos confirmados (OT completadas)
  SUM(CASE WHEN wo.status = 'completed' THEN wo.revenue ELSE 0 END) AS revenue_realized,
  
  -- Ingresos en progreso (OT activas)
  SUM(CASE WHEN wo.status IN ('assigned', 'in_progress') THEN wo.revenue ELSE 0 END) AS revenue_in_progress,
  
  -- Ingresos potenciales (Cotizaciones aprobadas sin ejecutar)
  SUM(CASE WHEN q.status = 'approved' AND q.executed_at IS NULL THEN q.total ELSE 0 END) AS revenue_pipeline,
  
  -- Ingresos perdidos (Cotizaciones rechazadas)
  SUM(CASE WHEN q.status = 'rejected' THEN q.total ELSE 0 END) AS revenue_lost,
  
  -- Fecha agregación
  DATE_TRUNC('month', COALESCE(wo.closed_at, q.created_at)) AS month

FROM work_orders wo
FULL OUTER JOIN quotations q ON q.work_order_id = wo.id
WHERE COALESCE(wo.created_at, q.created_at) >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', COALESCE(wo.closed_at, q.created_at))
ORDER BY month DESC;
```

---

## 🎯 ÍNDICES OPTIMIZADOS PARA QUERIES RÁPIDAS

```sql
-- Búsquedas por fecha (dashboards tiempo real)
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_closed_at ON work_orders(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_visits_reported_at ON emergency_visits(reported_at DESC);

-- Filtros por estado (tabs en UI)
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status) WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status) WHERE status != 'completed';

-- Búsquedas por cliente (vistas de cliente)
CREATE INDEX IF NOT EXISTS idx_elevators_client_id ON elevators(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_visits_client_id ON emergency_visits(client_id);

-- Búsquedas por técnico (asignaciones)
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(assigned_technician_id) WHERE status IN ('assigned', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_emergency_visits_technician_id ON emergency_visits(assigned_technician_id);

-- Trazabilidad (joins rápidos)
CREATE INDEX IF NOT EXISTS idx_work_orders_service_request_id ON work_orders(service_request_id);
CREATE INDEX IF NOT EXISTS idx_quotations_service_request_id ON quotations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_maintenance_id ON service_requests(related_maintenance_id);

-- SLA y alertas
CREATE INDEX IF NOT EXISTS idx_service_requests_sla ON service_requests(sla_deadline) WHERE sla_status IN ('at_risk', 'overdue');
CREATE INDEX IF NOT EXISTS idx_emergency_visits_response_time ON emergency_visits(response_time_minutes);
```

---

## 📋 RESUMEN EJECUTIVO - CAMPOS A AGREGAR

### service_requests
```sql
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS
  analyzed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  sla_status TEXT CHECK (sla_status IN ('on_time', 'at_risk', 'overdue')),
  related_maintenance_id UUID REFERENCES mnt_checklists(id),
  related_emergency_id UUID REFERENCES emergency_visits(id),
  parent_request_id UUID REFERENCES service_requests(id),
  recurrence_count INTEGER DEFAULT 0,
  last_occurrence_date TIMESTAMPTZ;
```

### quotations
```sql
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS
  sent_to_client_at TIMESTAMPTZ,
  client_viewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  work_order_id UUID REFERENCES work_orders(id),
  executed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,
  cost_of_parts DECIMAL(10,2),
  markup_percentage DECIMAL(5,2),
  discount_applied DECIMAL(10,2),
  final_profit DECIMAL(10,2);
```

### work_orders
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  assigned_at TIMESTAMPTZ,
  technician_started_at TIMESTAMPTZ,
  technician_finished_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  actual_hours DECIMAL(5,2),
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  other_costs DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  revenue DECIMAL(10,2),
  profit_margin DECIMAL(10,2),
  source_type TEXT CHECK (source_type IN ('service_request', 'quotation', 'maintenance', 'emergency', 'direct')),
  source_id UUID,
  service_request_id UUID REFERENCES service_requests(id),
  quotation_id UUID REFERENCES quotations(id),
  client_satisfaction_rating INTEGER CHECK (client_satisfaction_rating BETWEEN 1 AND 5),
  client_feedback TEXT,
  sla_deadline TIMESTAMPTZ,
  sla_status TEXT CHECK (sla_status IN ('on_time', 'at_risk', 'overdue'));
```

### emergency_visits
```sql
ALTER TABLE emergency_visits ADD COLUMN IF NOT EXISTS
  elevator_stopped_at TIMESTAMPTZ,
  elevator_reactivated_at TIMESTAMPTZ,
  response_time_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (technician_arrived_at - reported_at)) / 60
  ) STORED,
  resolution_time_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (resolved_at - technician_arrived_at)) / 60
  ) STORED,
  total_downtime_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(elevator_reactivated_at, NOW()) - elevator_stopped_at)) / 60
  ) STORED,
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2);
```

---

## 🎯 PRÓXIMOS PASOS - IMPLEMENTACIÓN FASE 2

1. **Ejecutar SQL**: Agregar campos a todas las tablas
2. **Actualizar código**: Modificar vistas React para capturar nuevos campos
3. **Crear vistas SQL**: Implementar 4 vistas principales para dashboard
4. **Crear índices**: Optimizar queries de reporting
5. **Testear flujos**: Validar trazabilidad completa
6. **Dashboard**: Construir visualizaciones con datos reales

**Tiempo estimado:** 2-3 días

---

**Documento generado:** 23/01/2026  
**Próxima acción:** Ejecutar SQL FASE 2
