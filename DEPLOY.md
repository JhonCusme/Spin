# 🎯 SpinDraw — Guía de Deploy

## 1️⃣ DESARROLLO LOCAL

### Requisitos:
- Node.js 18+
- MongoDB Atlas (gratis)
- Cuenta PayPal (sandbox para pruebas)

### Setup:
```bash
# Instalar dependencias
npm install

# Crear archivo .env con tus credenciales
# (Edita el .env existente)

# Ejecutar en desarrollo
npm run dev

# O en producción
npm start
```

Abre en navegador: **http://localhost:3000**

---

## 2️⃣ CONFIGURAR MONGODB ATLAS (Gratis)

1. Ve a: https://mongodb.com/atlas
2. Crea cuenta gratis
3. Crea un cluster M0 (gratis)
4. En "Database Access" → Crea usuario/contraseña
5. En "Network Access" → Agrega IP 0.0.0.0/0 (permite todas)
6. Copia el Connection String y pégalo en `.env` como `MONGODB_URI`

---

## 3️⃣ DEPLOY A LA WEB (Opciones)

### Opción A: RENDER.COM (Recomendado - Gratis)
1. Ve a: https://render.com
2. Conecta tu repo de GitHub
3. Crea "New Web Service"
4. Copia el código del proyecto en GitHub
5. Render detectará `package.json` automáticamente
6. Agrega las variables de `.env` en "Environment"
7. Deploy automático ✅

### Opción B: RAILWAY.APP (Fácil)
1. Ve a: https://railway.app
2. Conecta GitHub
3. Crea nuevo proyecto
4. Selecciona el repo
5. Agrega variables de entorno
6. Deploy en 1 minuto ✅

### Opción C: HEROKU (Pago - $5/mes)
1. Ve a: https://heroku.com
2. Conecta GitHub
3. Deploy automático
4. Más confiable que opciones gratis

### Opción D: TU PROPIO SERVIDOR (VPS)
- Compra VPS en: Linode, DigitalOcean, AWS
- Instala Node.js + PM2
- Usa Nginx como proxy reverso
- Obtén SSL gratis con Let's Encrypt

---

## 4️⃣ CHECKLIST ANTES DE SUBIR

✅ `.env` completado con credenciales reales
✅ MongoDB Atlas cluster creado y funcionando
✅ PayPal sandbox/live configurado
✅ Email Gmail con contraseña de app
✅ Verificar `npm start` funciona localmente
✅ `ruleta-pro.html` en la raíz del proyecto

---

## 5️⃣ VARIABLES DE ENTORNO IMPORTANTES

```env
# CAMBIAR EN PRODUCCIÓN:
FRONTEND_URL=https://tu-dominio.com
JWT_SECRET=algo-muy-secreto-y-aleatorio
PAYPAL_MODE=live (no sandbox)
```

---

## 6️⃣ ESTRUCTURA DEL PROYECTO

```
SpinDraw/
├── ruleta-pro.html        (Frontend - Se sirve automáticamente)
├── server.js              (Backend Express)
├── package.json           (Dependencias)
├── .env                   (Secretos - NO subir a GitHub!)
└── .env.example           (Plantilla de ejemplo)
```

---

## 7️⃣ PROBLEMAS COMUNES

**"Error: MONGODB_URI not found"**
→ Verifica que `.env` esté en la raíz y tenga la variable

**"Cannot find module 'dotenv'"**
→ Ejecuta: `npm install`

**"PayPal authentication failed"**
→ Verifica CLIENT_ID y CLIENT_SECRET en `.env`

**"Comprobantes no se suben"**
→ Crea carpeta `uploads/comprobantes` en el servidor

---

## 🚀 DEPLOY RÁPIDO CON RENDER

1. Push a GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. En Render: Conecta repo → Crea Web Service
3. Build command: `npm install`
4. Start command: `npm start`
5. Agrega `.env` variables en settings
6. Deploy ✅

**Tu app estará en: `https://tu-app-nombre.onrender.com`**

---

¿Necesitas ayuda con algún paso específico?
