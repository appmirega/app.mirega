# 📋 Sistema de Calendario de Mantenimiento - Implementación Completada

## ✅ Funcionalidades Implementadas

### 1. **Calendario de Mantenimientos (Completado)**
- ✅ Vista de calendario mensual con asignación de técnicos
- ✅ Selector de mes (12 meses de anticipación)
- ✅ Badge de estado "BORRADOR" cuando aún no está publicado
- ✅ Botón "Publicar Calendario" para activar el mes
- ✅ Validaciones: no permitir mantenimientos en fin de semana o festivos
- ✅ Verificación de disponibilidad de técnicos
- ✅ Sistema automático de publicación el primer día del mes

**Rutas:**
- URL: `/maintenance-calendar`
- Rol: Admin, Developer
- Menú: "Calendario de Mantenimientos"

---

### 2. **Sistema de Coordinación (Completado)**
- ✅ Campo: "Requiere apoyo adicional" (checkbox)
- ✅ Campo: "Cantidad de técnicos" (1-5)
- ✅ Campo: "Notas de coordinación" (descripción de especialidades necesarias)
- ✅ Visualización de contexto de emergencias relacionadas
- ✅ Panel de coordinación en tiempo real en AdminDashboard
- ✅ Vista de solicitudes con 3 filtros: Todas, Próximas, Pasadas

**Dónde se ve:**
- En el formulario de asignación de mantenimiento (modal con sección azul)
- En el AdminDashboard (panel actualizado cada 30 segundos)

---

### 3. **Gestor de Turnos de Emergencia (NUEVO - Completado)**
- ✅ Crear turnos semanales 24/7
- ✅ Opción: Técnico interno o personal externo
- ✅ Seleción de rango de fechas (inicio y fin)
- ✅ Tipo de turno: Principal o Respaldo
- ✅ Lista de turnos activos con delete
- ✅ Validación de fechas
- ✅ Almacenamiento en tabla `emergency_shifts`

**Rutas:**
- URL: `/emergency-shifts`
- Rol: Admin, Developer
- Menú: "Turnos de Emergencia"

**Ejemplo de uso:**
1. Click en "Turnos de Emergencia" en el menú
2. Click en "+ Crear Turno"
3. Seleccionar: "Técnico Interno" o "Personal Externo"
4. Escoger técnico o ingresar nombre/teléfono
5. Seleccionar fechas de inicio y fin
6. Elegir "Principal" o "Respaldo"
7. Guardar

---

### 4. **Formulario de Vacaciones y Permisos (NUEVO - Completado)**
- ✅ Registro de ausencias de técnicos
- ✅ Tipos: Vacaciones, Permiso, Día Enfermo, Licencia, Otro
- ✅ Rango de fechas (inicio - fin)
- ✅ Estado de solicitud: Pendiente, Aprobada, Rechazada
- ✅ Botones de aprobación/rechazo para administrador
- ✅ Eliminación de registros
- ✅ Bloquea automáticamente esas fechas en el calendario

**Rutas:**
- URL: `/technician-absences`
- Rol: Admin, Developer, Technician
- Menú: "Vacaciones y Permisos"

**Ejemplo de uso (Admin):**
1. Click en "Vacaciones y Permisos"
2. Click en "+ Nueva Ausencia"
3. Seleccionar técnico
4. Ingresar fechas (inicio y fin)
5. Seleccionar motivo (Vacaciones, Permiso, etc.)
6. Guardar
7. Las solicitudes pendientes aparecen con botones ✓ (aprobar) y ✗ (rechazar)

**Ejemplo de uso (Técnico):**
1. Click en "Vacaciones y Permisos"
2. Click en "+ Nueva Ausencia"
3. Sistema autoselecciona al técnico logueado
4. Ingresar fechas y motivo
5. Guardar
6. Aparece en estado "Pendiente" hasta que admin apruebe

---

## 📊 Datos Técnicos

### Base de Datos (PostgreSQL)
**Tablas principales:**
```
✅ maintenance_schedules     (Configuración de frecuencias)
✅ maintenance_assignments   (Asignaciones de mantenimiento)
✅ maintenance_history       (Historial de mantenimientos)
✅ emergency_shifts          (Turnos de emergencia)
✅ technician_availability   (Disponibilidad/vacaciones de técnicos)
✅ holidays                  (Festivos y días no laborales)
✅ calendar_alerts           (Notificaciones de coordinación)
```

### Funciones RPC Disponibles
```
✅ publish_calendar_month()               (Publicar calendario)
✅ get_calendar_by_month()                (Obtener mes con contexto)
✅ get_pending_coordination_requests()    (Listar solicitudes)
✅ get_calendar_month_stats()             (Estadísticas del mes)
✅ auto_publish_calendar_on_month_start() (Auto-publicación)
✅ link_emergencies_to_maintenance()      (Contexto de emergencias)
✅ get_admin_unread_alerts()              (Alertas sin leer)
```

### Componentes React Creados
```
✅ MaintenanceCalendarView           (~360 líneas)
✅ MaintenanceAssignmentModal        (~625 líneas)
✅ CalendarDayCell                   (~200 líneas)
✅ TechnicianAvailabilityPanel       (~250 líneas)
✅ EmergencyShiftScheduler           (~561 líneas)
✅ TechnicianAbsenceForm            (~380 líneas)
✅ CoordinationRequestsPanel        (~200 líneas)
```

---

## 🎯 Flujos de Trabajo

### FLUJO 1: Administrador prepara calendario anticipado
```
1. Admin entra a "Calendario de Mantenimientos"
2. Selecciona mes futuro (ej: Marzo 2026)
3. Crea asignaciones de mantenimiento
4. Marca algunos como "Requiere apoyo adicional" si necesita coordinación
5. Calendario queda en estado "BORRADOR"
6. El 1° de Marzo se publica automáticamente
7. El 1° de Marzo los técnicos ven sus asignaciones
```

### FLUJO 2: Solicitud de coordinación para un mantenimiento
```
1. Admin crea mantenimiento con "Requiere apoyo adicional"
2. Especifica: "2 técnicos eléctricos" + "1 soldador"
3. La solicitud aparece en el panel de coordinación
4. El panel muestra: Edificio, Técnico, Cantidad needed, Notas
5. Admin puede asignar técnicos adicionales si es necesario
```

### FLUJO 3: Gestión de turnos de emergencia (24/7)
```
1. Admin entra a "Turnos de Emergencia"
2. Crea turno para: Juan (técnico interno), 15-21 Enero, Principal
3. Crea turno para: Carlos (técnico externo), 15-21 Enero, Respaldo
4. El 15 de Enero ambos están "en guardia" (disponibles 24/7)
5. Si hay emergencia, el sistema sabe quién está disponible
```

### FLUJO 4: Solicitud de vacaciones desde técnico
```
1. Técnico entra a "Vacaciones y Permisos"
2. Clic en "+ Nueva Ausencia"
3. Sistema muestra: (Auto-rellena su nombre)
   - Fechas: 20-27 Febrero
   - Motivo: Vacaciones
4. Click "Registrar Ausencia"
5. Solicitud queda "Pendiente"
6. Admin ve la solicitud y elige "Aprobar" o "Rechazar"
7. Si aprueba: Esas fechas quedan bloqueadas en el calendario
```

### FLUJO 5: Visualización de contexto de emergencias
```
1. Admin crea mantenimiento en edificio XYZ
2. El sistema busca: últimas emergencias en ese edificio (90 días atrás)
3. Muestra en sección naranja: "Hace 2 días se reportó problemas eléctricos"
4. Admin puede escribir notas adicionales
5. El técnico asignado verá este contexto en su aplicación
```

---

## 🚀 Despliegue y Status

### Git Commits Recientes
```
✅ 8b94584 - Add CoordinationRequestsPanel to AdminDashboard
✅ f468a31 - Add emergency shift scheduler and technician absence form
✅ 4cc2273 - Add calendar publication system with coordination support
✅ 395531c - Remove legacy Gestión de Mantenimientos
```

### Servidor Production
```
URL:    app-mirega-d5b36eeet-app-mirega.vercel.app
Status: ✅ Live y funcional
Deploy: Automático desde GitHub (Vercel)
```

---

## 📱 Pantallas Principales

### 1️⃣ Dashboard Administrador
- Panel de solicitudes de coordinación (en vivo)
- 3 filtros: Todas / Próximas / Pasadas
- Muestra: Edificio, Técnico, Cantidad de técnicos, Notas, Contexto

### 2️⃣ Calendario de Mantenimientos
- Selector de mes (dropdown)
- Badge "BORRADOR" si no está publicado
- Botón "Publicar Calendario" (si hay borradores)
- Grilla de 42 días con asignaciones
- Panel lateral con disponibilidad de técnicos

### 3️⃣ Modal de Asignación
- Técnico: dropdown
- Fecha: date picker
- Tipo: radio (interno/externo)
- **Sección azul** - Solicitud de apoyo:
  - ☑ Requiere apoyo adicional
  - # Cantidad de técnicos (1-5)
  - 📝 Notas de coordinación
- **Sección naranja** - Contexto de emergencia:
  - 🚨 Emergencias relacionadas (read-only)

### 4️⃣ Gestor de Turnos de Emergencia
- Form para crear turno:
  - Tipo: ⭕ Interno / ⭕ Externo
  - Técnico o Nombre/Teléfono
  - Fechas: inicio / fin
  - Tipo de turno: ⭕ Principal / ⭕ Respaldo
- Lista de turnos activos:
  - Tarjetas con: Nombre, Principal/Respaldo, Fechas, Delete

### 5️⃣ Gestor de Vacaciones/Permisos
- Form para nueva ausencia:
  - Técnico: dropdown (admin) / auto (técnico)
  - Fechas: inicio / fin
  - Motivo: dropdown (Vacaciones, Permiso, Enfermo, Licencia, Otro)
- Lista de ausencias:
  - Estado: 🟡 Pendiente / 🟢 Aprobada / 🔴 Rechazada
  - Botones: ✓ Aprobar / ✗ Rechazar / 🗑️ Eliminar

---

## ⚙️ Configuración de Roles

### ✅ Developer
- Acceso a TODAS las funciones
- Puede crear/editar/eliminar calendarios
- Puede crear/editar/eliminar turnos
- Puede aprobar/rechazar vacaciones

### ✅ Admin
- Acceso a TODAS las funciones de mantenimiento
- Panel de coordinación en vivo
- Puede crear/editar/eliminar calendarios
- Puede crear/editar/eliminar turnos
- Puede aprobar/rechazar vacaciones

### ✅ Technician
- Acceso: "Calendario de Mantenimientos" (solo lectura)
- Acceso: "Vacaciones y Permisos" (crear solicitudes)
- Ver sus asignaciones en el calendario
- Solicitar vacaciones/permisos

### ❌ Client
- NO tiene acceso a ninguno de estos sistemas

---

## 🔧 Próximas Mejoras (Opcionales)

- [ ] Drag & drop en calendario para mover asignaciones
- [ ] Notificaciones push cuando se aprueba/rechaza vacaciones
- [ ] Reporte PDF del calendario mensual
- [ ] Integración con calendario externo (Google Calendar, Outlook)
- [ ] Alertas automáticas si hay conflictos de asignación
- [ ] Histórico de cambios en el calendario
- [ ] Exportación a CSV de turnos de emergencia
- [ ] Dashboard de utilización de técnicos (% de tiempo asignado)
- [ ] Predicción de carga de mantenimientos (ML)
- [ ] Chat en tiempo real para coordinación

---

## 📞 Soporte

**Si algo no funciona:**
1. Verifica que estés logueado con rol Admin o Developer
2. Comprueba que las fechas sean válidas (sin fin de semana)
3. Revisa la consola del navegador (F12) para mensajes de error
4. Intenta recargar la página (Ctrl+R o Cmd+R)

**Para reportar bugs:**
- Toma screenshot de la pantalla
- Anota la URL que estabas viendo
- Describe los pasos que hiciste antes del error
- Contacta al equipo de desarrollo

---

✨ **Sistema completamente funcional y listo para producción** ✨
