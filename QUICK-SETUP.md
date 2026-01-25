# 🚀 INSTRUCCIONES RÁPIDAS - Ejecutar SQL en Supabase

## 1️⃣ Copiar el SQL

El archivo SQL está listo en:
```
sql/2026-01-25-notifications-system.sql
```

## 2️⃣ Ir a Supabase

1. Abrir: https://app.supabase.com
2. Seleccionar proyecto: `app-mirega`
3. Click en: **SQL Editor** (lado izquierdo)

## 3️⃣ Ejecutar SQL

1. Click en: **New Query**
2. Copiar TODO el contenido de `sql/2026-01-25-notifications-system.sql`
3. Pegar en el editor
4. Click en botón **Run** (esquina superior derecha)
5. Esperar a que complete (mostrará ✅ o error)

## 4️⃣ Validar

Si todo va bien, deberías ver:
```
Notificaciones creadas exitosamente
```

Y aparecerán las siguientes tablas/funciones en Supabase:
- ✅ Tabla: `notifications`
- ✅ Índices: 4 índices creados
- ✅ Funciones: 5 funciones RPC
- ✅ Triggers: 5 triggers automáticos

## 5️⃣ Testing en Vercel

https://app-mirega.vercel.app

Loguear y probar:
- **Admin**: Crear orden de trabajo → debería aparece notificación
- **Cliente**: Ver aprobaciones pendientes
- **Técnico**: Cerrar orden con fotos y firma

---

## ❌ Si hay error

Copiar el error exacto y compartir. Los errores más comunes:

**Error: "relation X does not exist"**
→ Una tabla dependency no existe. Verificar que existan:
- `profiles`
- `work_orders`
- `service_requests`
- `buildings`
- `clients`

**Error: "type X already exists"**
→ Ya fue ejecutado. Es seguro ejecutarlo de nuevo (tiene `IF NOT EXISTS`)

**Error: "permission denied"**
→ Verificar permisos en Supabase (debería ser admin)

---

## ⏱️ Tiempo Estimado

- Copiar SQL: 2 minutos
- Ejecutar en Supabase: 30 segundos - 2 minutos
- Testing en Vercel: 5-10 minutos

**Total: ~20 minutos**

---

¡Éxito! 🎉
