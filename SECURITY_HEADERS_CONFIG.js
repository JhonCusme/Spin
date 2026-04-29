// SECURITY_HEADERS_CONFIG.js
// 🔒 Configuración de Headers de Seguridad para Express
// 
// INSTRUCCIONES:
// 1. Instala helmet: npm install helmet
// 2. En tu server.js, agrega esto cerca del principio:
//    const helmet = require('helmet');
//    app.use(helmet());
//
// 3. Para más control, usa esta configuración:

const helmet = require('helmet');
const cors = require('cors');

// Configuración recomendada de CORS
const corsOptions = {
  origin: 'https://spindraw.com', // Reemplaza con tu dominio
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Aplicar en tu Express app:
function setupSecurityHeaders(app) {
  
  // Helmet para headers de seguridad
  app.use(helmet());
  
  // CORS configurado
  app.use(cors(corsOptions));
  
  // Headers adicionales personalizados
  app.use((req, res, next) => {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevenir MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content Security Policy (CSP)
    // Ajusta esto según tus necesidades
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://cdn.payphonetodoesposible.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com; " +
      "frame-src https://www.google.com https://cdn.payphonetodoesposible.com;"
    );
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (antes Feature-Policy)
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );
    
    next();
  });
  
  // HTTPS Strict Transport Security (solo en producción)
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  
  // Middleware para bloquear acceso a archivos sensibles
  app.use((req, res, next) => {
    const blockedPaths = [
      '/firebase-key.json',
      '/env',
      '/.env',
      '/config.json',
      '/.git',
      '/node_modules',
      '/admin/secrets'
    ];
    
    if (blockedPaths.some(path => req.url.includes(path))) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
  
  // Rate limiting para prevenir abuso
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite a 100 requests por windowMs
    message: 'Demasiadas solicitudes, por favor intenta más tarde'
  });
  
  // Aplicar solo a rutas API
  app.use('/api/', limiter);
  
  // Limiter más estricto para login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 intentos por 15 minutos
    message: 'Demasiados intentos de login, intenta más tarde'
  });
  
  // Aplicar a login si existe
  app.post('/api/auth/login', loginLimiter);
  
}

module.exports = setupSecurityHeaders;

/*
EJEMPLO DE USO EN server.js:
================================

const express = require('express');
const setupSecurityHeaders = require('./SECURITY_HEADERS_CONFIG');

const app = express();

// Aplicar configuración de seguridad
setupSecurityHeaders(app);

// ... resto del código ...

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor corriendo en puerto', process.env.PORT || 3000);
});

*/

/*
DEPENDENCIAS NECESARIAS:
================================

npm install helmet express-rate-limit cors

*/

/*
CHECKLIST DE SEGURIDAD:
================================

✅ Headers de seguridad aplicados
✅ CORS configurado correctamente
✅ Rate limiting activado
✅ Archivos sensibles protegidos
✅ CSP (Content Security Policy) configurado
✅ HSTS (Strict Transport Security) en producción
✅ HTTPS obligatorio (configurar en hosting)

*/
