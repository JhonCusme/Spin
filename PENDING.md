# 📋 SpinDraw — Tareas Pendientes

## 🎯 NUEVAS: Páginas Legales y AdSense

### ✅ COMPLETADO
- [x] Crear Política de Privacidad (`privacidad.html`)
- [x] Crear Términos de Servicio (`terminos.html`)
- [x] Crear Política de Cookies (`cookies.html`)
- [x] Crear Página de Contacto (`contacto.html`)
- [x] Crear `robots.txt` para indexación
- [x] Crear `sitemap.xml` con todas las páginas
- [x] Crear `manifest.json` para PWA
- [x] Agregar meta tags SEO a `ruleta-pro.html`
- [x] Agregar Google Analytics script dinámico
- [x] Agregar footer con links legales
- [x] Crear guía `ADSENSE_SETUP.md`
- [x] Reemplazar placeholders con dominio actual: `https://spin-22w3.onrender.com/`
- [x] Reemplazar placeholders con email: `cusmejhonalexander@gmail.com`
- [x] Agregar campos en admin para:
  - [x] Email de Soporte
  - [x] Google Analytics ID (cambiar desde admin)
  - [x] AdSense Code (cambiar desde admin)
- [x] Actualizar server.js para guardar y servir estos valores
- [x] Hacer que Google Analytics y AdSense se inyecten dinámicamente
- [x] Crear guía de despliegue: `DEPLOYMENT_GUIDE.md`

### ⏳ PENDIENTE AHORA (Tareas para el usuario)

**PASO 1: DESPLEGAR EN RENDER** (3 minutos)
```bash
git add .
git commit -m "Agregar páginas legales y configuración de AdSense"
git push origin main
```

**PASO 2: REGISTRAR EN GOOGLE SEARCH CONSOLE** (5 minutos)
- [ ] Ir a https://search.google.com/search-console
- [ ] Agregar propiedad: `https://spin-22w3.onrender.com/`
- [ ] Verificar propiedad (usar meta tag si no puedes con DNS)
- [ ] Enviar sitemap: `https://spin-22w3.onrender.com/sitemap.xml`
- [ ] Esperar indexación (1-7 días)

**PASO 3: CONFIGURAR EN ADMIN** (2 minutos)
- [ ] Ir a panel admin
- [ ] Ir a "Ajustes"
- [ ] (Opcional) Cambiar Email de Soporte
- [ ] (Más tarde) Agregar Google Analytics ID cuando lo obtengas
- [ ] (Después de aprobación) Agregar AdSense Code

**PASO 4: SOLICITAR ADSENSE** (después de indexación)
- [ ] Esperar a que Google indexe tu sitio
- [ ] Ir a https://adsense.google.com
- [ ] Completar solicitud
- [ ] Esperar 1-2 semanas para aprobación

### ⏳ PENDIENTE DESPUÉS DE APROBACIÓN ADSENSE
- [ ] Obtener Google Analytics ID
- [ ] Configurar Analytics ID en admin
- [ ] Obtener AdSense Client Code
- [ ] Configurar AdSense Code en admin
- [ ] Ver ganancias en AdSense
- [ ] Optimizar ubicación de anuncios

## 🚀 Integración Nuvei (Continuación anterior)

### ✅ Completado
- [x] Agregar campos de credenciales en panel admin
- [x] Implementar rutas API para Nuvei
- [x] Agregar botones en interfaz de pago
- [x] Configurar renovaciones automáticas (cron job)
- [x] Toggle de habilitar/deshabilitar Nuvei

### ⏳ Pendiente
- [ ] **Obtener credenciales de Nuvei**
  - Registrarse en https://www.nuvei.com.ec/
  - Solicitar API Key, Secret Key, Merchant ID, Terminal ID
  - Contactar soporte si es necesario

- [ ] **Configurar credenciales en admin**
  - Ir a panel admin → Ajustes
  - Pegar las 4 credenciales en "Credenciales Nuvei"
  - Marcar "Habilitar pagos con Nuvei"
  - Guardar cambios

- [ ] **Revisar y ajustar endpoints API**
  - Comparar con documentación real: https://www.nuvei.com.ec/desarrolladores/
  - Verificar URLs exactas (ej: `https://api.nuvei.com/v1/...`)
  - Ajustar parámetros requeridos en las rutas `/api/nuvei/*`
  - Modificar headers de autenticación si es diferente

- [ ] **Configurar webhooks (si aplica)**
  - Verificar si Nuvei requiere webhooks para confirmaciones
  - Agregar endpoint `/api/nuvei/webhook` si es necesario
  - Configurar URL de webhook en panel de Nuvei

- [ ] **Probar pagos**
  - Hacer pago de prueba mensual
  - Hacer pago de prueba vitalicio
  - Verificar activación automática de Pro
  - Probar renovación automática (esperar 30 días o simular)

- [ ] **Ajustes adicionales**
  - Revisar manejo de errores
  - Agregar logging para debugging
  - Configurar emails de confirmación

## 🔧 Mejoras Generales

### ✅ Completado
- [x] Separar pagos del dashboard principal
- [x] Resaltar pestañas activas en admin
- [x] Ocultar botones Pro/Free para usuarios normales
- [x] Agregar favicon personalizado

### ⏳ Pendiente
- [ ] **Optimizaciones de rendimiento**
  - Revisar carga de imágenes en admin
  - Optimizar consultas a Firestore
  - Comprimir assets si es necesario

- [ ] **Mejoras de UX**
  - Agregar indicadores de carga en más lugares
  - Mejorar mensajes de error
  - Agregar tooltips informativos

## 📊 Monitoreo y Mantenimiento

### ⏳ Pendiente
- [ ] **Logs y monitoreo**
  - Configurar logging de errores en Render
  - Monitorear uso de recursos
  - Alertas para fallos de pago

- [ ] **Backups**
  - Verificar backups automáticos de Firestore
  - Documentar proceso de restauración

## 📝 Notas Adicionales
- Cron job para renovaciones ya está configurado en el código y se ejecutará automáticamente en Render
- No necesitas crear nada manualmente para el cron
- Todas las rutas API están protegidas con autenticación
- Los pagos se procesan de forma segura usando HTTPS

---

**Última actualización:** Abril 26, 2026</content>
</xai:function_call">PENDING.md