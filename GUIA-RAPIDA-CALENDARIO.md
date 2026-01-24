# 🎯 GUÍA RÁPIDA - Cómo Usar el Calendario de Mantenimiento

## 📋 Menú Principal

En el menú izquierdo verás 3 nuevas opciones:
```
📅 Calendario de Mantenimientos
🚨 Turnos de Emergencia
📆 Vacaciones y Permisos
```

---

## 1️⃣ CALENDARIO DE MANTENIMIENTOS

### ¿Qué es?
Sistema para asignar mantenimientos a técnicos, mes por mes. El admin crea el calendario anticipado y se publica automáticamente.

### ¿Cómo usarlo?

**PASO 1: Entra al calendario**
- Click en "Calendario de Mantenimientos" en el menú

**PASO 2: Selecciona el mes**
- Ves un dropdown con "Enero 2026" (u otro mes)
- Puedes ver hasta 12 meses adelante
- Haz click en el dropdown y selecciona el mes deseado

**PASO 3: Crear una asignación**
- Haz click en un día del calendario
- Se abre un modal con un formulario
- Completa:
  - **Técnico**: dropdown con técnicos disponibles
  - **Tipo**: ⭕ Interno / ⭕ Externo
  - **Persona**: si es externo, nombre del técnico externo
  - **Teléfono**: si es externo, teléfono de contacto

**PASO 4: Solicitar apoyo (NUEVO)**
- ☑ Marca "Requiere apoyo adicional" (sección azul)
- # Especifica cantidad (1-5 técnicos)
- 📝 Escribe qué especialidad necesitas (ej: "2 electricistas")

**PASO 5: Agregar contexto de emergencia (NUEVO)**
- Si hay emergencias previas en ese edificio, aparece en naranja
- Puedes agregar notas adicionales

**PASO 6: Guardar**
- Click en "Guardar Asignación"
- La asignación aparece en el calendario

**PASO 7: Publicar (Cuando esté listo)**
- Si el calendario está en "BORRADOR" verás un badge
- Haz click en "Publicar Calendario"
- El calendario se activa para ese mes

---

## 2️⃣ TURNOS DE EMERGENCIA (NUEVO!)

### ¿Qué es?
Sistema para asignar quién está "de guardia" (24/7) cada semana. Puede ser un técnico interno o personal externo.

### ¿Cómo usarlo?

**PASO 1: Entra a Turnos de Emergencia**
- Click en "Turnos de Emergencia" en el menú

**PASO 2: Crear un nuevo turno**
- Click en "+ Crear Turno"
- Se abre un formulario

**PASO 3: Elige el tipo de personal**
- ⭕ **Técnico Interno**: Selecciona técnico del dropdown
- ⭕ **Personal Externo**: Ingresa nombre y teléfono

**PASO 4: Especifica las fechas**
- 📅 **Fecha Inicio**: Cuando comienza la guardia
- 📅 **Fecha Fin**: Cuando termina la guardia
- (Ej: 15 Enero - 21 Enero = guardia toda la semana)

**PASO 5: Tipo de turno**
- ⭕ **Principal**: Es el que debe responder primero
- ⭕ **Respaldo**: Responde si el principal no está disponible

**PASO 6: Guardar**
- Click en "Crear Turno"
- El turno aparece en la lista

**PASO 7: Ver y eliminar**
- Los turnos activos aparecen en tarjetas
- Cada tarjeta muestra: Nombre, Principal/Respaldo, Fechas, Teléfono (si externo)
- Click en 🗑️ para eliminar

---

## 3️⃣ VACACIONES Y PERMISOS (NUEVO!)

### ¿Qué es?
Sistema para que técnicos soliciten vacaciones, permisos, días enfermo, etc. El admin aprueba o rechaza.

### ¿Cómo usarlo? (Como Técnico)

**PASO 1: Entra a Vacaciones y Permisos**
- Click en "Vacaciones y Permisos" en el menú

**PASO 2: Solicitar una ausencia**
- Click en "+ Nueva Ausencia"
- Se abre un formulario

**PASO 3: Rellena el formulario**
- **Técnico**: Se auto-rellena con tu nombre ✅
- **Fecha Inicio**: Cuando empiezan tus vacaciones
- **Fecha Fin**: Cuando regresas
- **Motivo**: Selecciona del dropdown:
  - 🏖️ Vacaciones
  - 📋 Permiso
  - 🤒 Día Enfermo
  - 📄 Licencia
  - ❓ Otro

**PASO 4: Guardar**
- Click en "Registrar Ausencia"
- Tu solicitud aparece con estado 🟡 **Pendiente**

**PASO 5: Espera aprobación**
- El admin verá tu solicitud
- Te lo aprobará (🟢) o rechazará (🔴)
- Una vez aprobada, esas fechas quedan bloqueadas en el calendario

---

### ¿Cómo usarlo? (Como Admin)

**PASO 1: Entra a Vacaciones y Permisos**
- Click en "Vacaciones y Permisos" en el menú

**PASO 2: Ver solicitudes pendientes**
- Verás tarjetas con las solicitudes
- 🟡 Pendiente = necesita tu acción
- 🟢 Aprobada = ya confirmada
- 🔴 Rechazada = ya rechazada

**PASO 3: Aprobar solicitud**
- Haz click en el botón ✅ (check)
- La solicitud cambia a 🟢 **Aprobada**
- Esas fechas quedan bloqueadas en el calendario

**PASO 4: Rechazar solicitud**
- Haz click en el botón ❌ (X)
- La solicitud cambia a 🔴 **Rechazada**
- El técnico sigue disponible esas fechas

**PASO 5: Eliminar registro**
- Haz click en 🗑️ para eliminar permanentemente

---

## 🎯 CASOS DE USO COMUNES

### Caso 1: "Quiero asignar mantenimientos 3 meses adelante"
```
1. Voy a "Calendario de Mantenimientos"
2. Selector "Enero 2026" (u otro mes futuro)
3. Creo asignaciones para Enero
4. El calendario queda en "BORRADOR"
5. El 1° de Enero automáticamente se publica ✅
```

### Caso 2: "Un mantenimiento necesita 2 técnicos especializados"
```
1. En el formulario de asignación
2. Sección azul "Solicitud de Apoyo"
3. ☑ Marco "Requiere apoyo adicional"
4. # Escribo "2"
5. 📝 Escribo "2 técnicos eléctricos y 1 soldador"
6. Guardo
7. La solicitud aparece en el panel del dashboard ✅
```

### Caso 3: "Necesito cubrimiento 24/7 toda la semana"
```
1. Voy a "Turnos de Emergencia"
2. + Crear Turno
3. Técnico: Juan (interno)
4. Fechas: 15 Enero - 21 Enero
5. Tipo: Principal
6. Guardo ✅
```

### Caso 4: "Un técnico solicita 2 semanas de vacaciones"
```
1. Técnico entra a "Vacaciones y Permisos"
2. + Nueva Ausencia
3. Fechas: 20 Enero - 2 Febrero
4. Motivo: Vacaciones
5. Guarda
6. Admin recibe solicitud
7. Admin aprueba (✅)
8. Esas fechas quedan bloqueadas en el calendario ✅
```

### Caso 5: "Ver todas las solicitudes de coordinación pendientes"
```
1. Administrador entra al Dashboard
2. Panel "Solicitudes de Coordinación" (arriba a la izquierda)
3. Filtra: Todas / Próximas / Pasadas
4. Ve: Edificio, Técnico, Cantidad needed, Notas
5. Si hay emergencia relacionada, aparece en naranja ✅
```

---

## ⚠️ VALIDACIONES Y RESTRICCIONES

### Calendario de Mantenimientos
- ❌ No permitir asignar en fin de semana (Sábado/Domingo)
- ❌ No permitir asignar en días festivos (Feriados)
- ❌ No permitir si el técnico está en vacaciones
- ✅ Permitir solo Admin/Developer

### Turnos de Emergencia
- ❌ Fecha Fin debe ser mayor que Fecha Inicio
- ✅ Permitir solo Admin/Developer
- ✅ Puede ser técnico interno o personal externo

### Vacaciones y Permisos
- ❌ Fecha Fin debe ser mayor que Fecha Inicio
- ⚠️ Estado Pendiente hasta que Admin apruebe
- ✅ Bloquea automáticamente fechas en calendario
- ✅ Técnicos pueden crear, Admin puede aprobar

---

## 📊 INFORMACIÓN EN TIEMPO REAL

### Panel de Coordinación (AdminDashboard)
- Se actualiza automáticamente cada 30 segundos
- Muestra SOLO solicitudes con "Requiere apoyo adicional" ✅
- Filtra por: Todas / Próximas (futuro) / Pasadas (pasado)

### Calendario de Mantenimientos
- Si está en BORRADOR: muestra botón "Publicar"
- Al publicar: se activa para ese mes
- Se publica automáticamente el 1° del mes

### Información de Técnicos
- Panel lateral muestra disponibilidad
- Muestra si está en vacaciones
- Muestra turnos de emergencia asignados

---

## 🔴 TROUBLESHOOTING

### "No veo el botón Publicar"
- Verifica que haya asignaciones sin publicar
- Recarga la página

### "No puedo crear asignación en fin de semana"
- Es normal: solo se permite lunes a viernes
- Elige otro día

### "Dice que el técnico no está disponible"
- El técnico tiene vacaciones aprobadas ese día
- Elige otro técnico o otra fecha

### "La solicitud de coordinación no aparece"
- Verifica que hayas marcado "Requiere apoyo adicional"
- Recarga la página
- Espera 30 segundos a que se refresque

### "No puedo ver Vacaciones y Permisos"
- Verifica tu rol: Admin, Developer o Technician
- Recarga la página

---

## ✅ CHECKLIST ANTES DE USAR EN PRODUCCIÓN

- [ ] Al menos 3 técnicos creados en el sistema
- [ ] Turnos de emergencia asignados para el mes en curso
- [ ] Calendario de mantenimientos creado y publicado
- [ ] Un técnico ha solicitado vacaciones de prueba
- [ ] Admin ha aprobado/rechazado la solicitud
- [ ] Panel de coordinación visible en AdminDashboard
- [ ] Prueba crear una asignación con "Requiere apoyo adicional"
- [ ] Verifica que bloqueó al técnico correctamente en el calendario

---

✨ **¡Listo! Tu sistema de calendario está 100% operativo.** ✨

Cualquier duda o sugerencia, contacta al equipo de desarrollo.
