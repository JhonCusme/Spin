# 📋 SpinDraw — Tareas Pendientes

## 🚀 Integración Nuvei

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