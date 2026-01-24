# Sistema de Calendario de Asignación de Mantenimientos
**Fecha:** 23 de Enero de 2026  
**Objetivo:** Sistema completo de planificación, asignación y seguimiento de mantenimientos con gestión de turnos de emergencia

---

## 📋 REQUERIMIENTOS FUNCIONALES

### 1. Asignación de Mantenimientos
- ✅ Asignar edificios a técnicos (1 o más edificios por día)
- ✅ Calendario de lunes a viernes (días hábiles)
- ✅ Personal externo para horarios especiales (fines de semana, festivos, fuera de horario)
- ✅ Evitar duplicidad de mantenimientos
- ✅ Proyección automática según frecuencia del edificio

### 2. Turnos de Emergencia
- ✅ Asignación de turnos de lunes a domingo
- ✅ Rotación de técnicos por semana/mes
- ✅ Cobertura 24/7

### 3. Gestión de Ausencias
- ✅ Vacaciones y permisos de técnicos
- ✅ Bloqueo automático de días no disponibles
- ✅ Prevención de asignaciones en días bloqueados

### 4. Administración Avanzada
- ✅ Bloquear mantenimientos fijos (no pueden moverse)
- ✅ Definir frecuencia de mantenimiento por edificio
- ✅ Re-programación automática si técnico no disponible
- ✅ Transferencia de mantenimiento entre técnicos
- ✅ Completar mantenimiento con firma digital

### 5. Días Festivos
- ✅ Configuración de días festivos nacionales
- ✅ Bloqueo automático para técnicos internos
- ✅ Permitir asignación a personal externo

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tablas Necesarias:

#### 1. **maintenance_schedules** (Configuración de frecuencia por edificio)
```sql
- id: UUID PRIMARY KEY
- client_id: UUID (cliente dueño del edificio)
- building_name: TEXT (nombre del edificio o dirección)
- elevators_count: INTEGER (cuántos ascensores tiene)
- maintenance_days_per_month: INTEGER (ej: 1 = mensual, 2 = quincenal, 4 = semanal)
- preferred_weekday: INTEGER (0=lunes, 4=viernes) NULL (día preferido)
- fixed_day_of_month: INTEGER (1-31) NULL (día fijo si aplica)
- is_blocked: BOOLEAN (si está bloqueado y no puede cambiar fecha)
- notes: TEXT
- created_at, updated_at
```

#### 2. **maintenance_assignments** (Asignaciones reales de mantenimientos)
```sql
- id: UUID PRIMARY KEY
- maintenance_schedule_id: UUID (referencia a configuración)
- client_id: UUID
- assigned_technician_id: UUID (técnico asignado) NULL si externo
- external_personnel_name: TEXT (si es personal externo)
- scheduled_date: DATE (fecha programada)
- scheduled_time_start: TIME (hora inicio estimada)
- scheduled_time_end: TIME (hora fin estimada)
- status: TEXT (scheduled, in_progress, completed, cancelled, rescheduled)
- is_fixed: BOOLEAN (no puede moverse de fecha)
- completion_type: TEXT (signed, transferred, cancelled)
- completed_at: TIMESTAMPTZ
- completed_by: UUID (quién lo completó, puede ser otro técnico)
- signature_url: TEXT (firma digital)
- notes: TEXT
- created_at, updated_at
```

#### 3. **technician_availability** (Disponibilidad y ausencias)
```sql
- id: UUID PRIMARY KEY
- technician_id: UUID REFERENCES profiles(id)
- start_date: DATE (inicio de ausencia)
- end_date: DATE (fin de ausencia)
- absence_type: TEXT (vacation, sick_leave, personal_leave, training)
- reason: TEXT
- approved_by: UUID (admin que aprobó)
- approved_at: TIMESTAMPTZ
- status: TEXT (pending, approved, rejected)
- created_at, updated_at
```

#### 4. **emergency_shifts** (Turnos de emergencia)
```sql
- id: UUID PRIMARY KEY
- technician_id: UUID REFERENCES profiles(id)
- shift_start_date: DATE
- shift_end_date: DATE (puede ser mismo día o una semana)
- shift_type: TEXT (weekday, weekend, holiday, 24x7)
- is_primary: BOOLEAN (turno primario o backup)
- notes: TEXT
- created_at, updated_at
```

#### 5. **holidays** (Días festivos configurables)
```sql
- id: UUID PRIMARY KEY
- holiday_date: DATE UNIQUE
- holiday_name: TEXT (ej: "Año Nuevo", "Día del Trabajo")
- is_recurring: BOOLEAN (si se repite cada año)
- country: TEXT DEFAULT 'CL' (Chile)
- created_at, updated_at
```

#### 6. **maintenance_history** (Historial de cambios)
```sql
- id: UUID PRIMARY KEY
- maintenance_assignment_id: UUID
- change_type: TEXT (created, rescheduled, reassigned, completed, cancelled)
- old_date: DATE
- new_date: DATE
- old_technician_id: UUID
- new_technician_id: UUID
- changed_by: UUID (admin/técnico que hizo el cambio)
- reason: TEXT
- created_at: TIMESTAMPTZ
```

---

## 🎨 ARQUITECTURA DE COMPONENTES REACT

### 1. **MaintenanceCalendarView.tsx** (Componente Principal)
- Calendario mensual visual (grid de días)
- Drag & drop para asignar mantenimientos
- Vista de técnicos disponibles (sidebar)
- Filtros: técnico, edificio, estado

### 2. **CalendarDayCell.tsx** (Celda individual del día)
- Muestra mantenimientos asignados ese día
- Color coding por estado (verde=completo, amarillo=programado, rojo=retrasado)
- Click para ver detalles
- Indicador de días festivos

### 3. **MaintenanceAssignmentModal.tsx** (Modal de asignación)
- Seleccionar edificio
- Seleccionar técnico o personal externo
- Fecha y hora
- Marcar como fijo
- Notas

### 4. **TechnicianAvailabilityPanel.tsx** (Panel lateral de técnicos)
- Lista de técnicos con disponibilidad
- Indicador de ausencias (vacaciones, permisos)
- Contador de mantenimientos asignados
- Turno de emergencia activo

### 5. **EmergencyShiftScheduler.tsx** (Programador de turnos)
- Calendario semanal de turnos
- Asignar técnico primario y backup
- Rotación automática
- Notificaciones de turno activo

### 6. **HolidaysManager.tsx** (Gestor de festivos)
- Lista de días festivos
- Agregar/editar/eliminar festivos
- Importar festivos nacionales

### 7. **TechnicianAbsenceForm.tsx** (Formulario de ausencias)
- Solicitar vacaciones/permisos
- Rango de fechas
- Aprobación de admin

### 8. **MaintenanceFrequencyConfig.tsx** (Configuración de frecuencias)
- Por edificio: configurar días de mantenimiento al mes
- Día preferido de la semana
- Día fijo del mes
- Bloquear/desbloquear

---

## 🔧 LÓGICA DE NEGOCIO

### Reglas de Asignación:
1. **Días hábiles (lunes-viernes)**: Solo técnicos internos
2. **Fines de semana/festivos**: Solo personal externo
3. **Verificar disponibilidad**: Técnico no puede estar en ausencia
4. **Evitar duplicidad**: 1 técnico = 1 edificio por día (o validar capacidad)
5. **Proyección automática**: 
   - Si edificio tiene `maintenance_days_per_month = 2` → generar 2 mantenimientos/mes
   - Distribuir equitativamente en el mes
   - Respetar días preferidos

### Flujo de Completar Mantenimiento:
1. Técnico firma checklist → `maintenance_assignments.status = 'completed'`
2. Guardar `completed_at`, `completed_by`, `signature_url`
3. Si es otro técnico quien completa → registrar en `maintenance_history`

### Flujo de Re-programación:
1. Técnico solicita cambio de fecha
2. Admin aprueba
3. Buscar nueva fecha disponible (día hábil + técnico disponible)
4. Actualizar `maintenance_assignments.scheduled_date`
5. Registrar cambio en `maintenance_history`

### Flujo de Vacaciones:
1. Técnico solicita vacaciones en `technician_availability`
2. Admin aprueba
3. Sistema bloquea esos días en calendario
4. Si hay mantenimientos asignados → notificar para re-asignar

---

## 📊 QUERIES IMPORTANTES

### 1. Mantenimientos del mes
```sql
SELECT ma.*, ms.building_name, p.full_name AS technician_name
FROM maintenance_assignments ma
LEFT JOIN maintenance_schedules ms ON ms.id = ma.maintenance_schedule_id
LEFT JOIN profiles p ON p.id = ma.assigned_technician_id
WHERE DATE_TRUNC('month', ma.scheduled_date) = DATE_TRUNC('month', NOW())
ORDER BY ma.scheduled_date;
```

### 2. Técnicos disponibles en fecha específica
```sql
SELECT p.id, p.full_name
FROM profiles p
WHERE p.role = 'technician' 
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM technician_availability ta
    WHERE ta.technician_id = p.id
      AND ta.status = 'approved'
      AND '2026-01-25' BETWEEN ta.start_date AND ta.end_date
  );
```

### 3. Proyección automática de mantenimientos
```sql
-- Generar mantenimientos del mes según frecuencia
INSERT INTO maintenance_assignments (
  maintenance_schedule_id,
  client_id,
  scheduled_date,
  status
)
SELECT 
  ms.id,
  ms.client_id,
  generate_series(
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    INTERVAL '1 month' / ms.maintenance_days_per_month
  )::DATE AS scheduled_date,
  'scheduled'
FROM maintenance_schedules ms
WHERE ms.maintenance_days_per_month > 0;
```

### 4. Turnos de emergencia activos
```sql
SELECT es.*, p.full_name, p.phone
FROM emergency_shifts es
JOIN profiles p ON p.id = es.technician_id
WHERE CURRENT_DATE BETWEEN es.shift_start_date AND es.shift_end_date
  AND es.is_primary = true
ORDER BY es.shift_type;
```

---

## 🎯 INDICADORES Y VALIDACIONES

### Validaciones en Frontend:
- ❌ No permitir asignar técnico en día festivo
- ❌ No permitir asignar técnico con ausencia aprobada
- ❌ No permitir duplicar mantenimiento (mismo edificio, mismo día)
- ❌ No permitir mover mantenimientos marcados como `is_fixed = true`
- ✅ Sugerir técnico con menos carga del día
- ✅ Alertar si técnico tiene >3 mantenimientos en un día

### Indicadores Visuales:
- 🟢 Verde: Mantenimiento completado
- 🟡 Amarillo: Mantenimiento programado (futuro)
- 🔵 Azul: Mantenimiento en progreso (hoy)
- 🔴 Rojo: Mantenimiento atrasado (pasó la fecha sin completar)
- 🔒 Candado: Mantenimiento bloqueado (is_fixed)
- 🏖️ Sombrilla: Técnico en vacaciones
- 🚨 Sirena: Técnico en turno de emergencia

---

## 📱 FUNCIONALIDADES AVANZADAS

### 1. Drag & Drop
- Arrastrar mantenimiento de un día a otro
- Arrastrar entre técnicos
- Validar al soltar (disponibilidad, festivos, etc.)

### 2. Notificaciones
- Recordatorio 1 día antes del mantenimiento
- Alerta si mantenimiento no completado
- Notificación de turno de emergencia activo

### 3. Reportes
- Mantenimientos completados vs programados
- Cumplimiento por técnico
- Edificios con mantenimientos atrasados
- Horas trabajadas por técnico

### 4. Exportar
- Exportar calendario mensual a PDF
- Exportar asignaciones a Excel
- Generar reporte de cumplimiento

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### FASE 1: Base de Datos (1 día)
- ✅ Crear tablas SQL
- ✅ Crear índices
- ✅ Crear funciones helper

### FASE 2: Configuración (1 día)
- ✅ HolidaysManager
- ✅ MaintenanceFrequencyConfig
- ✅ TechnicianAvailabilityPanel

### FASE 3: Calendario Principal (2 días)
- ✅ MaintenanceCalendarView
- ✅ CalendarDayCell
- ✅ Lógica de renderizado mensual

### FASE 4: Asignación (1 día)
- ✅ MaintenanceAssignmentModal
- ✅ Validaciones
- ✅ Drag & Drop

### FASE 5: Turnos Emergencia (1 día)
- ✅ EmergencyShiftScheduler
- ✅ Rotación automática

### FASE 6: Historial y Reportes (1 día)
- ✅ maintenance_history
- ✅ Reportes de cumplimiento

---

**Total estimado: 7 días de desarrollo**
