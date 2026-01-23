# 🧹 LIMPIEZA DE CÓDIGO - ANÁLISIS

## ❌ ARCHIVOS A ELIMINAR

### 1. **EmergencyView.tsx** (LEGACY)
- **Ubicación:** `src/components/views/EmergencyView.tsx`
- **Razón:** Reemplazado completamente por `EmergencyV2View.tsx`
- **Uso actual:** Importado en App.tsx pero NUNCA renderizado
- **Impacto:** ✅ SEGURO - No se usa en ningún routing
- **Líneas:** 448 líneas de código muerto

### 2. **TechnicianEmergencyView.tsx** (LEGACY)
- **Ubicación:** `src/components/views/TechnicianEmergencyView.tsx`
- **Razón:** Reemplazado por `TechnicianEmergencyViewV3.tsx`
- **Uso actual:** SÍ SE USA en App.tsx línea 103
- **⚠️ ESPERAR:** Necesito verificar si V3 lo reemplaza completamente

### 3. **MaintenanceView.tsx** (LEGACY)
- **Ubicación:** `src/components/views/MaintenanceView.tsx`  
- **Razón:** Sistema antiguo de `maintenance_schedules` (NO se usa)
- **Uso actual:** Usa `maintenance_schedules` (tabla legacy)
- **Impacto:** ⚠️ VERIFICAR - Puede que aún se use para crear programación

---

## 🗄️ TABLAS LEGACY (NO TOCAR AHORA)

**⚠️ IMPORTANTE:** Las tablas de BD NO se eliminan en esta limpieza porque requieren:
1. Migration SQL específica
2. Verificación de datos existentes
3. Backup completo antes

**Tablas identificadas como legacy:**
- `checklist_templates`
- `checklist_items`  
- `maintenance_executions`
- `checklist_responses`

**Acción:** Documentar como deprecated, eliminar en FASE 1

---

## 📄 ARCHIVOS SQL EJECUTADOS

**Candidatos a mover a `/sql/executed/`:**
Estos scripts YA fueron aplicados a la BD (según fechas y tu historial):

1. ✅ `2025-11-27-add-elevator-number.sql`
2. ✅ `2025-11-29-checklist-questions-50.sql`
3. ✅ `2025-12-01-add-pdf-url-column.sql`
4. ✅ `2025-12-02-add-certification-fields.sql`
5. ✅ `2025-12-02-fix-certification-columns.sql`
6. ✅ `2025-12-06-service-requests-system.sql`
7. ✅ `2025-12-08-add-request-type-priority-to-answers.sql`
8. ✅ `2025-12-12-add-quotations-system.sql`
9. ✅ `2025-12-12-add-work-order-fields-to-service-requests.sql`
10. ✅ `2025-12-13-service-requests-workflow-system.sql`
11. ✅ `2025-12-15-add-parts-and-external-fields.sql`
12. ✅ `2025-12-15-fix-checklist-frequencies.sql`
13. ✅ `2025-12-15-fix-service-requests-rls-for-admins.sql`
14. ✅ `2025-12-16-emergency-visits-system.sql`
15. ✅ `2026-01-14-fix-emergency-pdfs-simple.sql`
16. ✅ `2026-01-16-fix-emergency-delete-rls.sql`
17. ✅ `2026-01-17-add-reactivation-fields.sql`
18. ✅ `2026-01-22-fix-client-profile-association.sql`

**Acción:** Crear carpeta `sql/executed/` y mover

---

## 📦 ARCHIVOS DUPLICADOS EN BACKUPS

**NO TOCAR** - Son backups válidos:
- `BACKUP-CHECKLIST-FUNCIONAL-2025-12-06-2028/`
- `BACKUP-OPERATIVO-2025-12-12-2105/`
- `BACKUP-OPERATIVO-2025-12-15-2313/`
- `BACKUP-COMPLETO-2026-01-22-1847/`

Estos son puntos de restauración importantes.

---

## ✅ PLAN DE LIMPIEZA SEGURA

### PASO 1: Eliminar Imports No Usados
- ❌ Eliminar import `EmergencyView` de App.tsx (nunca se renderiza)

### PASO 2: Eliminar Archivo Legacy
- ❌ Eliminar `src/components/views/EmergencyView.tsx` (448 líneas)

### PASO 3: Organizar SQLs Ejecutados
- ✅ Crear carpeta `sql/executed/`
- ✅ Mover 18 scripts ya aplicados

### PASO 4: Limpiar Imports Adicionales
- Buscar otros imports no usados en App.tsx

---

## ⚠️ NO ELIMINAR (Aún en uso)

- ✅ `MaintenanceView.tsx` - Puede que AdminDashboard lo use
- ✅ `maintenance_schedules` - ClientMaintenancesView lo usa (líneas 88, 134, 155, etc.)
- ✅ `TechnicianEmergencyView.tsx` - Usado en App.tsx línea 103

---

## 🎯 RESULTADO ESPERADO

**Antes:**
- App.tsx: 190 líneas con imports muertos
- sql/: 24 archivos mezclados
- EmergencyView.tsx: 448 líneas muertas

**Después:**
- App.tsx: ~185 líneas limpias
- sql/: 6 archivos activos + carpeta executed/
- EmergencyView.tsx: ❌ ELIMINADO

**Espacio liberado:** ~500 líneas de código muerto
