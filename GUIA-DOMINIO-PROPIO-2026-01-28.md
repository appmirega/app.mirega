# 🌐 GUÍA PASO A PASO - PUBLICAR EN DOMINIO PROPIO

**Última actualización:** 28 de Enero 2026  
**Tiempo estimado:** 1-2 horas  
**Complejidad:** ⭐⭐ (Fácil a Medio)

---

## 📋 TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Paso 1: Comprar Dominio](#paso-1-comprar-dominio)
3. [Paso 2: Configurar Vercel](#paso-2-configurar-vercel)
4. [Paso 3: Apuntar DNS](#paso-3-apuntar-dns)
5. [Paso 4: Verificar HTTPS](#paso-4-verificar-https)
6. [Paso 5: Actualizar App](#paso-5-actualizar-app)
7. [Paso 6: Testing](#paso-6-testing)
8. [Troubleshooting](#troubleshooting)

---

## ✅ REQUISITOS PREVIOS

- ✅ Vercel: Proyecto ya deployado (app-mirega-hoyg11h0f.vercel.app)
- ✅ Supabase: Proyecto configurado con todas las tablas
- ✅ App: Build sin errores, listo para producción
- ✅ Variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas

---

## PASO 1: COMPRAR DOMINIO

### **Opción A: Dominio .cl (Recomendado para Chile)**

#### Registrador: NIC Chile (https://www.nic.cl)
1. Ir a https://www.nic.cl
2. Buscar disponibilidad del dominio
3. Verificar que esté disponible
4. Completar formulario con datos de contacto
5. Pagar por un año mínimo (~$20-30 USD/año)
6. Recibirás códigos de acceso de registrador

#### Información a tener lista:
```
Nombre del Dominio: mirega.cl
Nombre de Registrante: [Tu Nombre/Empresa]
Email: [Tu Email]
Teléfono: [Tu Teléfono]
```

### **Opción B: Domino .com (Alternativa)**

#### Registrador: GoDaddy o Namecheap
1. Ir a https://www.godaddy.com o https://www.namecheap.com
2. Buscar dominio (ej: mirega.com)
3. Agregar al carrito
4. Completar checkout
5. Tener credenciales de acceso

---

## PASO 2: CONFIGURAR VERCEL

### **2.1 Acceder a Vercel Dashboard**
1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto: `app-mirega`
3. Ir a **Settings** (⚙️) → **Domains**

### **2.2 Agregar Dominio**
1. Click en **"Add Domain"**
2. Ingresar nombre de dominio (ej: `mirega.cl`)
3. Click en **"Continue"**
4. Ver opciones de configuración DNS

```
Vercel mostrará:
✓ Nameservers (NS)
✓ O registros CNAME (si prefieres)
```

### **2.3 Copiar Información de DNS**

**Si usa Nameservers (NS):**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Si usa CNAME:**
```
cname.vercel-dns.com
```

---

## PASO 3: APUNTAR DNS

### **3.1 Para NIC Chile**

1. Ir a https://www.nic.cl/administrador/
2. Login con tus credenciales
3. Buscar tu dominio (mirega.cl)
4. Ir a **"Cambiar Nameservers"**
5. Reemplazar con los de Vercel:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
6. Guardar cambios
7. **Esperar 15-30 minutos** para propagación DNS

### **3.2 Para GoDaddy**

1. Ir a https://www.godaddy.com/account
2. Click en el dominio
3. Ir a **"Manage DNS"**
4. Buscar sección de **"Nameservers"**
5. Cambiar a:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
6. Guardar
7. **Esperar 15-30 minutos**

### **3.3 Para Namecheap**

1. Ir a https://ap.namecheap.com/dashboard
2. Click en **"Manage"** del dominio
3. Ir a **"Nameservers"**
4. Cambiar a "Custom DNS"
5. Agregar:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
6. Click en checkmark (✓)
7. **Esperar 15-30 minutos**

---

## PASO 4: VERIFICAR HTTPS

### **4.1 Esperar Validación en Vercel**

Una vez que DNS propague (15-30 min):
1. Vercel automáticamente detectará el dominio
2. Emitirá certificado SSL (Let's Encrypt)
3. Esperar a que aparezca "✓ Valid Configuration" en Vercel

### **4.2 Testear desde Terminal**

```powershell
# Verificar DNS está apuntando a Vercel
nslookup mirega.cl

# Debería retornar Vercel IPs
```

```powershell
# Verificar certificado SSL
openssl s_client -connect mirega.cl:443

# Debería mostrar "Issuer: Let's Encrypt"
```

---

## PASO 5: ACTUALIZAR APP

### **5.1 Variables de Entorno en Vercel**

1. En Vercel Dashboard → Settings → Environment Variables
2. Verificar que estén presentes:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxx
   ```
3. (Opcional) Agregar nueva variable:
   ```
   VITE_APP_URL=https://mirega.cl
   ```

### **5.2 Actualizar Código (OPCIONAL)**

Si quieres referirse al dominio en la app:

```typescript
// src/config/env.ts
export const appConfig = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  appUrl: import.meta.env.VITE_APP_URL || 'https://mirega.cl',
} as const;
```

### **5.3 Deploy Automático**

```bash
# Una vez DNS está configurado, hacer push a main
git add .
git commit -m "chore: Actualizar configuración para dominio propio"
git push origin main

# Vercel automáticamente:
# 1. Detectará el push
# 2. Hará build
# 3. Deployará a mirega.cl
```

---

## PASO 6: TESTING

### **6.1 Test Básicos**

```bash
# 1. Abrir en navegador
https://mirega.cl

# 2. Verificar certificado SSL
# - Click en candado 🔒 en barra de direcciones
# - Debería decir "Certificate is valid"

# 3. Verificar que carga la app
# - Debería mostrar splash screen
# - Luego login page
```

### **6.2 Test de Funcionalidad**

1. **Login:**
   - Usuario: `dev@mirega.local`
   - Contraseña: (la que configuraste)
   - ✅ Debe loguear y mostrar dashboard

2. **Crear Cliente:**
   - Nombre: "Test Cliente"
   - Email: test@mirega.cl
   - Teléfono: (dejar en blanco - debe permitir)
   - ✅ Debe guardarse sin errores

3. **Crear Ascensor:**
   - Seleccionar cliente
   - Llenar datos técnicos
   - ✅ Debe guardarse

4. **Crear Checklist:**
   - Seleccionar cliente y ascensor
   - Llenar preguntas
   - Firmar
   - ✅ Debe generar PDF
   - ✅ PDF debe estar en Storage

### **6.3 Test de Performance**

```bash
# En DevTools (F12) → Network
# Verificar que:
# - HTML: <1 segundo
# - Bundle JS: <2 segundos
# - Imágenes: <1 segundo
# - Total: <5 segundos
```

### **6.4 Test de Seguridad**

```bash
# En DevTools → Console
# Verificar que:
# ✅ NO hay console.log visibles
# ✅ Solo console.error si hay error
# ✅ NO hay credenciales expuestas
```

---

## 🔧 TROUBLESHOOTING

### **Problema 1: DNS no se propaga**

**Síntomas:**
- Al acceder a `mirega.cl` muestra "ERR_NAME_NOT_RESOLVED"
- `nslookup mirega.cl` no retorna resultados de Vercel

**Soluciones:**

```bash
# 1. Esperar más tiempo (a veces tarda 24-48 horas)
# 2. Limpiar DNS cache
ipconfig /flushdns  # Windows

# 3. Verificar que los nameservers estén correctos
nslookup -type=NS mirega.cl
# Debería mostrar nameservers de Vercel

# 4. Si problemapersiste:
# - Ir a registrador y verificar manualmente
# - Contactar soporte NIC Chile / GoDaddy
```

### **Problema 2: Certificate error**

**Síntomas:**
- Navegador muestra "ERR_CERT_AUTHORITY_INVALID"
- Certificate no es válido

**Soluciones:**

```bash
# 1. Esperar a que Vercel emita certificado (puede tardar 1 hora)
# 2. En Vercel: Go to project → Deployments → Latest
#    Debería mostrar "Certificate is valid"

# 3. Si tarda mucho:
# - Ir a Vercel Support → New Issue
# - Describir el problema
# - Vercel emitirá certificado manualmente
```

### **Problema 3: App muestra "403 Forbidden"**

**Síntomas:**
- Accedo a `mirega.cl` pero muestra error 403

**Soluciones:**

```bash
# 1. Verificar que Vercel tiene dominio correctamente configurado
#    En Vercel → Settings → Domains
#    Debería estar con ✓ Valid Configuration

# 2. Hacer redeploy manual
#    En Vercel → Deployments → Latest → Click en "..."
#    Luego "Redeploy"

# 3. Si sigue fallando:
git push origin main  # Trigger nuevo deploy
```

### **Problema 4: App funciona pero sin estilos CSS**

**Síntomas:**
- Página carga pero sin colores ni formato
- Network tab muestra 404 para archivos CSS

**Soluciones:**

```bash
# 1. Verificar en vercel.json que rewrites están correctas
# 2. Hacer hard refresh en navegador
Ctrl+F5  # Windows
Cmd+Shift+R  # Mac

# 3. Si sigue fallando:
# - Abrir DevTools → Network
# - Verificar que los archivos CSS cargan
# - Si dicen 404, contactar soporte Vercel
```

### **Problema 5: Supabase connection error**

**Síntomas:**
- Página carga pero dice "No se pudo conectar a Supabase"
- Console muestra error de conexión

**Soluciones:**

```bash
# 1. Verificar variables de entorno en Vercel
#    Settings → Environment Variables
#    VITE_SUPABASE_URL debe estar presente

# 2. Verificar que Supabase URL es correcta
#    En Supabase → Settings → API
#    Copiar "Project URL"

# 3. Redeploy con env variables correctas
#    En Vercel: Trigger redeploy

# 4. Si sigue fallando:
#    - Supabase puede estar down
#    - Verificar status.supabase.com
```

---

## 📝 CONFIGURACIÓN FINAL CHECKLIST

```
DOMINIO & DNS:
☐ Dominio comprado y registrado
☐ DNS apuntado a nameservers de Vercel
☐ DNS propagado (verificar con nslookup)
☐ Dominio visible en Vercel → Settings → Domains

SSL/TLS:
☐ Certificado emitido por Let's Encrypt
☐ Status muestra "Valid Configuration" en Vercel
☐ HTTPS funciona sin advertencias

VARIABLES DE ENTORNO:
☐ VITE_SUPABASE_URL configurada en Vercel
☐ VITE_SUPABASE_ANON_KEY configurada en Vercel
☐ (Opcional) VITE_APP_URL = https://mirega.cl

APLICACIÓN:
☐ Build sin errores: npm run build ✅
☐ Login funciona
☐ Crear cliente funciona
☐ Crear ascensor funciona
☐ PDF se genera correctamente
☐ No hay errores en console

SEGURIDAD:
☐ HTTPS forzado (no hay versión HTTP)
☐ Headers de seguridad activos
☐ No hay datos sensibles en console
☐ CORS configurado si es necesario

PERFORMANCE:
☐ Página carga en < 5 segundos
☐ Interactividad rápida
☐ PDFs se generan sin lag
```

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE PUBLICAR

### **Inmediato:**
1. Enviar link `https://mirega.cl` a clientes/técnicos
2. Capacitar a usuarios sobre acceso
3. Monitorear primeras horas

### **Primer Día:**
1. Revisar logs en Vercel
2. Recopilar feedback de usuarios
3. Corregir bugs urgentes

### **Primera Semana:**
1. Hacer backup de base de datos (Supabase)
2. Documentar process de backup
3. Establecer SLA de disponibilidad

---

## 📞 SOPORTE RÁPIDO

### Si algo no funciona:

1. **Vercel (app no carga):**
   - Ir a https://vercel.com/support
   - Email: support@vercel.com

2. **Supabase (base de datos error):**
   - Ir a https://supabase.com/support
   - Discord: https://discord.supabase.com

3. **NIC Chile (dominio):**
   - Ir a https://www.nic.cl/contacto
   - Teléfono: +56-2-2940-5900

4. **Tu App (bugs específicos):**
   - Revisar logs en DevTools (F12)
   - Revisar Vercel Analytics
   - Revisar Supabase monitoring

---

## ✅ RESUMEN RÁPIDO

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Comprar dominio | 30 min |
| 2 | Configurar Vercel | 10 min |
| 3 | Apuntar DNS | 10 min + 30 min espera |
| 4 | Verificar HTTPS | 10 min |
| 5 | Actualizar App | 10 min |
| 6 | Testing | 20 min |
| **TOTAL** | | **~2 horas** |

---

**Versión:** 1.0  
**Última actualización:** 28 de Enero 2026  
**Estado:** Listo para seguir

¿Necesitas ayuda con alguno de estos pasos?
