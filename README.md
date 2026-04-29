# 🎯 SpinDraw - Ruleta de Sorteos Online

Una aplicación web progresiva (PWA) interactiva para crear y participar en ruletas de sorteos online. Construida con Node.js, Express, Firebase y tecnologías modernas.

![SpinDraw Logo](favicon.svg)

## ✨ Características

- 🎲 **Ruleta Interactiva**: Animaciones suaves y efectos visuales atractivos
- 🌐 **Multi Idioma**: Soporte completo para Español, Inglés y Portugués
- 📱 **PWA Completa**: Instalable en móviles y computadoras
- 💳 **Sistema de Pagos**: Integración con PayPal, PayPhone y Nuvei
- 👥 **Sistema de Usuarios**: Registro, login y gestión de perfiles
- 📊 **Panel de Administración**: Control total sobre configuraciones y usuarios
- 🔒 **Autenticación Segura**: JWT tokens y encriptación
- 📈 **Google Analytics**: Seguimiento completo de usuarios
- 💰 **Google AdSense**: Monetización integrada
- 🔍 **SEO Optimizado**: Meta tags, Open Graph, Twitter Cards y Schema.org
- 🌐 **Multiplataforma**: Web, Android (APK), iOS (próximamente)

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 16+
- Firebase project
- Cuenta de Google AdSense (opcional)
- Cuenta de Google Analytics (opcional)

### Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/JhonCusme/Spin.git
   cd SpinDraw
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura Firebase**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
   - Habilita Firestore Database
   - Habilita Authentication
   - Descarga la clave de servicio y guárdala como `firebase-key.json`

4. **Configura variables de entorno**
   ```bash
   cp .env.example .env
   # Edita .env con tus configuraciones
   ```

5. **Inicia el servidor**
   ```bash
   npm start
   # o para desarrollo
   npm run dev
   ```

6. **Accede a la aplicación**
   - Web: http://localhost:3000
   - Admin: http://localhost:3000 (sección admin)

## 📱 Construcción para Android

```bash
# Instalar Capacitor
npm install -g @capacitor/cli

# Inicializar Capacitor
npx cap init "SpinDraw" "com.spindraw.app" --web-dir "."

# Agregar Android
npx cap add android

# Construir y sincronizar
npm run build
npx cap sync android

# Abrir en Android Studio
npx cap open android
```

## 🔧 Configuración

### Variables de Entorno (.env)

```env
PORT=3000
JWT_SECRET=tu_jwt_secret_aqui
FIREBASE_SERVICE_ACCOUNT_B64=clave_codificada_en_base64
FRONTEND_URL=https://tu-dominio.com
PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret
```

### Configuración de Pagos

1. **PayPal**: Configura credenciales en variables de entorno
2. **PayPhone**: Configura en el panel de administración
3. **Nuvei**: Configura API keys en el panel de administración

### SEO y Analytics

1. **Google Search Console**: Verifica propiedad y envía sitemap
2. **Google Analytics**: Configura ID en panel de administración
3. **Google AdSense**: Configura código de publisher en panel de administración

## 🌐 Internacionalización (i18n)

SpinDraw soporta múltiples idiomas con un sistema completo de traducciones:

### Idiomas Soportados
- 🇪🇸 **Español** (Idioma por defecto)
- 🇺🇸 **English**
- 🇧🇷 **Português**

### Cómo Funciona
- **Detección automática**: El sistema detecta el idioma del navegador del usuario
- **Cambio manual**: Selector de idioma en la interfaz
- **Persistencia**: El idioma seleccionado se guarda en localStorage
- **Manifest dinámico**: El PWA se adapta al idioma seleccionado

### Archivos de Traducción
```
i18n/
├── es.json    # Traducciones en español
├── en.json    # Traducciones en inglés
├── pt.json    # Traducciones en portugués
└── i18n.js    # Sistema de internacionalización
```

### Uso en Código
```javascript
// Traducción simple
i18n.t('nav.login'); // "Iniciar Sesión" / "Login" / "Entrar"

// Traducción con parámetros
i18n.t('wheel.participants', { count: 150 }); // "150 participantes"

// Función global
__('app.name'); // Acceso directo a traducciones
```

## 📁 Estructura del Proyecto

```
SpinDraw/
├── server.js                 # Servidor principal (Express)
├── ruleta-pro.html          # Página principal
├── manifest.json            # Configuración PWA (español)
├── manifest-en.json         # Configuración PWA (inglés)
├── manifest-pt.json         # Configuración PWA (portugués)
├── i18n.js                  # Sistema de internacionalización
├── i18n/                    # Archivos de traducciones
│   ├── es.json
│   ├── en.json
│   └── pt.json
├── service-worker.js        # Service Worker para PWA
├── package.json             # Dependencias y scripts
├── firebase-key.json        # Credenciales Firebase
├── sitemap.xml              # Mapa del sitio para SEO
├── robots.txt               # Instrucciones para crawlers
├── android/                 # Archivos para Android
├── www/                     # Build de producción
└── páginas-legales/         # Páginas legales
    ├── privacidad.html
    ├── terminos.html
    ├── cookies.html
    └── contacto.html
```

## 🎨 Personalización

### Colores y Tema

Los colores principales se definen en CSS variables en `ruleta-pro.html`:

```css
:root {
  --primary: #ff6b35;
  --secondary: #f7931e;
  --accent: #4ecdc4;
  --background: #080b12;
  --text: #ffffff;
}
```

### Logo e Iconos

- `favicon.svg`: Icono principal (512x512 recomendado)
- `manifest.json`: Configura iconos para diferentes tamaños

## 🔒 Seguridad

- Autenticación JWT con expiración
- Validación de inputs del lado cliente y servidor
- Headers de seguridad configurados
- Rate limiting en endpoints sensibles
- Encriptación de datos sensibles

## 📊 Monitoreo

### Logs

Los logs se muestran en consola del servidor:
- Conexiones entrantes
- Errores de autenticación
- Transacciones de pago
- Errores de base de datos

### Google Analytics

Eventos configurados:
- `page_view`: Visualizaciones de página
- `spin_attempt`: Intentos de giro de ruleta
- `purchase`: Compras realizadas
- `login`: Inicios de sesión

## 🚀 Despliegue

### Render.com (Recomendado)

1. Conecta tu repositorio de GitHub
2. Configura variables de entorno
3. Despliegue automático en cada push

### Otros Servicios

- **Railway**: Similar a Render
- **Heroku**: Requiere configuración adicional
- **VPS**: Mayor control pero más mantenimiento

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de Firebase**: Verifica `firebase-key.json`
2. **Pagos no funcionan**: Revisa credenciales de pago
3. **PWA no se instala**: Verifica `manifest.json` y HTTPS
4. **SEO no funciona**: Confirma meta tags y sitemap

### Debug

```bash
# Ver logs del servidor
npm run dev

# Verificar PWA
npm run pwa-check

# Test de pagos
npm run test-payments
```

## 📈 Roadmap

### Próximas Funcionalidades

- [ ] **Notificaciones Push**: Recordatorios y promociones
- [ ] **Sistema de Referidos**: Bonos por invitaciones
- [ ] **Gamificación**: Logros y niveles
- [ ] **API Pública**: Para integraciones externas
- [ ] **Multiidioma**: Soporte para inglés y portugués
- [ ] **Temas Oscuros/Clarosc**: Alternativas de UI

### Mejoras Técnicas

- [ ] **Tests Automatizados**: Jest + Puppeteer
- [ ] **CI/CD**: GitHub Actions
- [ ] **Monitoreo**: Sentry o similar
- [ ] **Cache Avanzado**: Redis
- [ ] **CDN**: Para assets estáticos

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

- **Email**: soporte@spindraw.com
- **Discord**: [Únete a nuestra comunidad](https://discord.gg/spindraw)
- **Issues**: [GitHub Issues](https://github.com/JhonCusme/Spin/issues)

## 🙏 Agradecimientos

- [Firebase](https://firebase.google.com) - Base de datos y autenticación
- [PayPal](https://paypal.com) - Procesamiento de pagos
- [Google](https://google.com) - Analytics y AdSense
- [Render](https://render.com) - Hosting

---

**Desarrollado con ❤️ por el equipo de SpinDraw**