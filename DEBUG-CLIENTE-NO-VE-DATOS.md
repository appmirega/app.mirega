# 🐛 DEBUG: Cliente No Ve Mantenimientos/Emergencias
**Fecha:** 22 de Enero 2026 - 22:00  
**Problema:** Edificio Loft y Las Violetas no ven sus mantenimientos/emergencias

---

## 🔍 LOGS DE DEBUG IMPLEMENTADOS

He añadido logs detallados en las consolas del navegador para identificar dónde falla la carga de datos.

### Vistas Modificadas:
1. ✅ **ClientMaintenancesView** - Logs de mantenimientos
2. ✅ **ClientEmergenciesView** - Logs de emergencias  
3. ✅ **ClientServiceRequestsView** - Logs de solicitudes

---

## 📋 INSTRUCCIONES PARA DEBUGGING

### Paso 1: Acceder como Cliente
```
1. Ir a app-mirega.vercel.app (o localhost:5173)
2. Login con usuario de "Edificio Loft" o "Las Violetas"
3. Abrir DevTools: F12 (o Click derecho > Inspeccionar)
4. Ir a pestaña "Console"
```

### Paso 2: Revisar Logs de Mantenimientos
```
1. Click en "Mis Mantenimientos" en el menú
2. Buscar en consola estos logs:

🔍 Profile ID: xxx-xxx-xxx
🏢 Client Data: { id: "xxx", company_name: "...", ... }
⚠️ Client Error: null (o error si hay problema)
📊 Maintenance Data: [array de mantenimientos]
⚠️ Maintenance Error: null (o error si hay problema)
```

### Paso 3: Revisar Logs de Emergencias
```
1. Click en "Emergencias" en el menú
2. Buscar en consola estos logs:

🔍 [Emergencies] Profile ID: xxx-xxx-xxx
🏢 [Emergencies] Client Data: { id: "xxx", ... }
🏗️ [Emergencies] Elevators Data: [array de ascensores]
📋 [Emergencies] Elevator IDs: ["id1", "id2", ...]
🚨 [Emergencies] Emergency Data: [array de emergencias]
```

---

## 🎯 CASOS POSIBLES

### CASO 1: No encuentra Cliente
```javascript
// Verás:
❌ [Emergencies] No client found for this profile
// O:
🏢 [Emergencies] Client Data: null
```

**PROBLEMA:** El `profile_id` no está asociado a ningún cliente en la tabla `clients`  
**SOLUCIÓN:** Verificar en Supabase que existe un registro en `clients` con ese `profile_id`

```sql
SELECT id, company_name, building_name, profile_id 
FROM clients 
WHERE profile_id = 'xxx-xxx-xxx';
```

---

### CASO 2: Cliente sin Ascensores
```javascript
// Verás:
🏗️ [Emergencies] Elevators Data: []
⚠️ [Emergencies] No elevators found for this client
```

**PROBLEMA:** El cliente existe pero no tiene ascensores asociados  
**SOLUCIÓN:** Verificar que existen ascensores con el `client_id` correcto

```sql
SELECT id, elevator_number, location_name, client_id 
FROM elevators 
WHERE client_id = 'xxx-xxx-xxx';
```

---

### CASO 3: Ascensores sin Mantenimientos/Emergencias
```javascript
// Verás:
🏗️ [Emergencies] Elevators Data: [{id: "asc1"}, {id: "asc2"}]
🚨 [Emergencies] Emergency Data: []
```

**PROBLEMA:** Los ascensores existen pero no tienen registros de emergencia  
**SOLUCIÓN:** Verificar que las emergencias están vinculadas a los `elevator_id` correctos

```sql
SELECT id, visit_date, technician_name, elevator_id 
FROM emergency_visits_v2 
WHERE elevator_id IN ('asc1', 'asc2');
```

---

### CASO 4: Error de RLS (Row Level Security)
```javascript
// Verás:
⚠️ [Emergencies] Emergency Error: { message: "permission denied..." }
```

**PROBLEMA:** Las políticas RLS de Supabase bloquean el acceso  
**SOLUCIÓN:** Revisar políticas RLS en Supabase para la tabla correspondiente

```sql
-- Ver políticas activas
SELECT * FROM pg_policies 
WHERE tablename = 'emergency_visits_v2';
```

---

## 🛠️ CAMBIOS TÉCNICOS REALIZADOS

### 1. ClientMaintenancesView.tsx
```typescript
// ANTES: Solo cargaba 'completed'
.eq('status', 'completed')

// AHORA: Carga todos, filtra en frontend
.order('year', { ascending: false })
// Filtro en línea 232:
if (h.status !== 'completed' || !h.pdf_url) return false;
```

### 2. Logs Detallados
```typescript
// Profile lookup
console.log('🔍 Profile ID:', profile.id);

// Client lookup
console.log('🏢 Client Data:', clientData);
console.log('⚠️ Client Error:', clientError);

// Data query
console.log('📊 Maintenance Data:', data);
console.log('⚠️ Maintenance Error:', error);
```

---

## 📊 EJEMPLOS DE OUTPUT ESPERADO

### ✅ CASO EXITOSO:
```javascript
🔍 [Emergencies] Profile ID: "abc-123-def"
🏢 [Emergencies] Client Data: {
  id: "client-xyz",
  company_name: "Edificio Loft",
  building_name: "Loft Building",
  internal_alias: "Loft"
}
🏗️ [Emergencies] Elevators Data: [
  { id: "elev-1", elevator_number: "1", location_name: "Torre A" },
  { id: "elev-2", elevator_number: "2", location_name: "Torre B" }
]
📋 [Emergencies] Elevator IDs: ["elev-1", "elev-2"]
🚨 [Emergencies] Emergency Data: [
  { id: "emerg-1", visit_date: "2026-01-15", ... },
  { id: "emerg-2", visit_date: "2026-01-10", ... }
]
```

### ❌ CASO FALLIDO (Sin Cliente):
```javascript
🔍 [Emergencies] Profile ID: "abc-123-def"
🏢 [Emergencies] Client Data: null
⚠️ [Emergencies] Client Error: null
❌ [Emergencies] No client found for this profile
```

---

## 🔧 PRÓXIMOS PASOS

### Una vez identificado el problema:

#### Si es problema de asociación (profile_id ↔ client_id):
```sql
-- Actualizar profile_id en tabla clients
UPDATE clients 
SET profile_id = 'correct-profile-id'
WHERE id = 'client-id-edificio-loft';
```

#### Si es problema de ascensores (client_id ↔ elevator):
```sql
-- Actualizar client_id en tabla elevators
UPDATE elevators 
SET client_id = 'correct-client-id'
WHERE building_name LIKE '%Loft%';
```

#### Si es problema de emergencias (elevator_id):
```sql
-- Verificar que elevator_id es correcto
SELECT ev.id, ev.visit_date, ev.elevator_id, e.elevator_number, e.client_id
FROM emergency_visits_v2 ev
LEFT JOIN elevators e ON e.id = ev.elevator_id
WHERE e.client_id = 'client-id-edificio-loft';
```

---

## 📝 REPORTE DE RESULTADOS

**Por favor compartir:**
1. ✅ Screenshots de la consola con los logs
2. ✅ Nombre exacto del cliente (Edificio Loft / Las Violetas)
3. ✅ Email del usuario con el que hiciste login
4. ✅ En qué paso se detiene (¿encuentra cliente? ¿encuentra ascensores? ¿encuentra datos?)

Con esa información podré:
- 🎯 Identificar el problema exacto
- 🛠️ Crear el script SQL para arreglarlo
- ✅ Validar que la solución funciona

---

## 🚀 DEPLOY STATUS

✅ Cambios pusheados a GitHub: commit `02f7a42`  
✅ Vercel auto-deploy en progreso  
⏳ Esperar ~2-3 minutos para que se actualice en producción  
🌐 URL: https://app-mirega.vercel.app

---

**Estado:** ⏳ ESPERANDO LOGS DEL USUARIO  
**Próxima Acción:** Revisar consola del navegador y reportar resultados
