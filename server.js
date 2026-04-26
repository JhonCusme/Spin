// ═══════════════════════════════════════════════════════════
//  SpinDraw — Backend Server
//  Stack: Node.js + Express + Firebase + PayPal SDK
//  Deploy: Render.com (free tier) or Railway
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const express      = require('express');
const admin = require('firebase-admin');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const cors         = require('cors');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const paypal       = require('@paypal/checkout-server-sdk');
const nodemailer   = require('nodemailer');
const axios        = require('axios');
const cron         = require('node-cron');
const crypto       = require('crypto');

const app = express();

// ── MIDDLEWARES ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static('/tmp/uploads'));

// ── MULTER (comprobantes de transferencia) ───────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── FIRESTORE ──────────────────────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString());
} else {
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'spindraw-6cdb2.firebasestorage.app'
});
const db = admin.firestore();

// ── SETTINGS HELPER (Firestore) ─────────────────────────────
async function getSetting(key, defaultVal) {
  const doc = await db.collection('settings').doc('public').get();
  return doc.exists ? doc.data()[key] : defaultVal;
}
async function setSetting(key, value) {
  await db.collection('settings').doc('public').set({
    [key]: value
  }, { merge: true });
}

// ── USER HELPER (Firestore) ─────────────────────────────────
async function getUser(username) {
  const doc = await db.collection('users').doc(username.toLowerCase()).get();
  return doc.exists ? doc.data() : null;
}
async function updateUser(username, updates) {
  await db.collection('users').doc(username.toLowerCase()).update(updates);
}

// sanitizeUser (same)
function sanitizeUser(u) {
  return {
    id: u.username, username: u.username, email: u.email,
    firstName: u.firstName, lastName: u.lastName, phone: u.phone,
    isPro: u.isPro, proType: u.proType, proExpiry: u.proExpiry,
    ruletas: u.ruletas, totalSpins: u.totalSpins, createdAt: u.createdAt,
    isAdmin: u.username === process.env.ADMIN_USERNAME,
  };
}

// ── PAYPAL CLIENT ────────────────────────────────────────────
function getPayPalClient() {
  const env = process.env.PAYPAL_MODE === 'live'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
}

// ── PAYPHONE CONFIG ──────────────────────────────────────────
const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN;
const PAYPHONE_STORE_ID = process.env.PAYPHONE_STORE_ID;
const PAYPHONE_ENCRYPT_KEY = process.env.PAYPHONE_ENCRYPT_KEY; // Clave para encriptar cardHolder
const PAYPHONE_BASE_URL = process.env.PAYPHONE_MODE === 'live'
  ? 'https://pay.payphonetodoesposible.com'
  : 'https://pay.payphonetodoesposible.com'; // Para pruebas usar el mismo, pero en sandbox

function encryptAES(text, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// ── EMAIL ────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
async function sendEmail(to, subject, html) {
  try {
    await mailer.sendMail({ from: `SpinDraw <${process.env.EMAIL_USER}>`, to, subject, html });
  } catch(e) { console.error('Email error:', e.message); }
}

// ── JWT HELPERS ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'spindraw_secret_2024';
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

// ═══════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    if (password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
      return res.status(400).json({ error: 'Usuario inválido' });

    const lowerUser = username.toLowerCase();
    const lowerEmail = email.toLowerCase();

    // Check username
    const userRef = db.collection('users').doc(lowerUser);
    const userSnap = await userRef.get();
    if (userSnap.exists) return res.status(400).json({ error: 'Usuario ya existe' });

    // Check email
    const emailSnap = await db.collection('users').where('email', '==', lowerEmail).get();
    if (!emailSnap.empty) return res.status(400).json({ error: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 12);
    await userRef.set({
      username,
      email: lowerEmail,
      password: hashed,
      firstName,
      lastName,
      phone,
      isPro: false,
      proType: 'none',
      proExpiry: null,
      ruletas: [{ id: 1, name: 'Ruleta 1', entries: [], history: [], wins: {} }],
      totalSpins: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
    });

    const token = signToken({ username: lowerUser, isAdmin: false });
    sendEmail(email, '¡Bienvenido a SpinDraw! 🎉', `
      <h2>¡Hola ${firstName || username}!</h2>
      <p>Tu cuenta en SpinDraw fue creada exitosamente.</p>
      <p>Empieza a crear sorteos en <a href="${process.env.FRONTEND_URL}">SpinDraw</a></p>
    `);
    res.json({ token, user: sanitizeUser({ username, email: lowerEmail, firstName, lastName, phone, isPro: false, proType: 'none', proExpiry: null, ruletas: [{ id: 1, name: 'Ruleta 1', entries: [], history: [], wins: {} }], totalSpins: 0 }) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const lowerInput = username.toLowerCase();

    // Try as username
    let userSnap = await db.collection('users').doc(lowerInput).get();
    let userData;
    if (!userSnap.exists) {
      // Try as email
      const emailSnaps = await db.collection('users').where('email', '==', lowerInput).get();
      if (emailSnaps.empty) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      userSnap = emailSnaps.docs[0];
    }
    userData = userSnap.data();

    const valid = await bcrypt.compare(password, userData.password);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    // Check pro expiry
    let isPro = userData.isPro;
    let proType = userData.proType;
    let proExpiry = userData.proExpiry;
    if (isPro && proType === 'monthly' && proExpiry && new Date() > new Date(proExpiry.seconds * 1000)) {
      isPro = false;
      proType = 'none';
      proExpiry = null;
      await db.collection('users').doc(lowerInput).update({ isPro, proType, proExpiry });
    }

    await db.collection('users').doc(lowerInput).update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() });
    const token = signToken({ username: lowerInput, isAdmin: lowerInput === process.env.ADMIN_USERNAME });
    res.json({ token, user: sanitizeUser(userData) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const userSnap = await db.collection('users').doc(req.user.username).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: sanitizeUser(userSnap.data()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/ruletas (guardar ruletas del usuario)
app.put('/api/auth/ruletas', authMiddleware, async (req, res) => {
  try {
    const { ruletas } = req.body;
    await db.collection('users').doc(req.user.username).update({ ruletas });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/spins (incrementar contador de giros)
app.put('/api/auth/spins', authMiddleware, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.username).update({
      totalSpins: admin.firestore.FieldValue.increment(1)
    });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function sanitizeUser(u) {
  return {
    id: u._id, username: u.username, email: u.email,
    firstName: u.firstName, lastName: u.lastName, phone: u.phone,
    isPro: u.isPro, proType: u.proType, proExpiry: u.proExpiry,
    ruletas: u.ruletas, totalSpins: u.totalSpins, createdAt: u.createdAt,
    isAdmin: u.username === process.env.ADMIN_USERNAME,
  };
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS (precios, datos bancarios)
// ═══════════════════════════════════════════════════════════

// GET /api/settings/public  (precios y datos bancarios — público)
app.get('/api/settings/public', async (req, res) => {
  try {
    const prices = await getSetting('prices', {
      monthly:  { amount: 4.99,  label: 'Mensual' },
      lifetime: { amount: 29.99, label: 'Vitalicio' },
    });
    const bank = await getSetting('bank', {
      name:    'Tu Nombre Completo',
      bank:    'Banco Pichincha',
      account: '2200000000',
      type:    'Ahorros',
      id:      '1700000000',
      note:    'Indicar tu usuario SpinDraw en la referencia',
    });
    const whatsapp = await getSetting('whatsapp', '+593900000000');
    const payphoneEnabled = await getSetting('payphoneEnabled', true);
    const nuveiEnabled = await getSetting('nuveiEnabled', false);
    res.json({ prices, bank, whatsapp, payphoneEnabled, nuveiEnabled });
  } catch(e) {
    // Fallback to defaults on error
    res.json({
      prices: {
        monthly:  { amount: 4.99,  label: 'Mensual' },
        lifetime: { amount: 29.99, label: 'Vitalicio' },
      },
      bank: {
        name:    'Tu Nombre Completo',
        bank:    'Banco Pichincha',
        account: '2200000000',
        type:    'Ahorros',
        id:      '1700000000',
        note:    'Indicar tu usuario SpinDraw en la referencia',
      },
      whatsapp: '+593900000000',
      payphoneEnabled: true,
      nuveiEnabled: false
    });
  }
});

// ═══════════════════════════════════════════════════════════
//  PAYPAL ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/paypal/create-order
app.post('/api/paypal/create-order', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' | 'lifetime'
    const prices = await getSetting('prices', { monthly: { amount: 4.99 }, lifetime: { amount: 49.99 } });
    const amount = prices[plan]?.amount;
    if (!amount) return res.status(400).json({ error: 'Plan inválido' });

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: amount.toFixed(2) },
        description: `SpinDraw Pro — ${plan === 'monthly' ? 'Mensual' : 'Vitalicio'}`,
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL || 'https://spin-22w3.onrender.com'}/paypal-success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://spin-22w3.onrender.com'}/paypal-cancel`,
        brand_name: 'SpinDraw',
        user_action: 'PAY_NOW',
      }
    });

    const client = getPayPalClient();
    const order = await client.execute(request);
    const approveUrl = order.result.links.find(l => l.rel === 'approve')?.href;

    // Crear registro de pago pendiente
    const userSnap = await db.collection('users').doc(req.user.username).get();
    const user = userSnap.data();
    await db.collection('payments').add({
      userId: req.user.username, username: user.username, email: user.email,
      method: 'paypal', plan, amount,
      paypalOrderId: order.result.id, status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
    });

    res.json({ orderId: order.result.id, approveUrl });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/paypal/capture-order
app.post('/api/paypal/capture-order', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const client = getPayPalClient();
    const capture = await client.execute(request);

    if (capture.result.status === 'COMPLETED') {
      const paymentSnaps = await db.collection('payments').where('paypalOrderId', '==', orderId).get();
      if (paymentSnaps.empty) return res.status(404).json({ error: 'Pago no encontrado' });
      const paymentDoc = paymentSnaps.docs[0];
      const payment = paymentDoc.data();
      await paymentDoc.ref.update({
        status: 'completed',
        paypalPayerId: capture.result.payer.payer_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Activar Pro
      const userSnap = await db.collection('users').doc(payment.userId).get();
      const user = userSnap.data();
      const proExpiry = payment.plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
      await userSnap.ref.update({
        isPro: true,
        proType: payment.plan,
        proExpiry: proExpiry ? admin.firestore.Timestamp.fromDate(proExpiry) : null,
      });

      sendEmail(user.email, '✅ ¡Tu suscripción Pro está activa!', `
        <h2>¡Felicidades ${user.firstName || user.username}!</h2>
        <p>Tu pago fue procesado correctamente. Ya tienes acceso a <strong>SpinDraw Pro</strong> 🎉</p>
        <p>Plan: <strong>${payment.plan === 'monthly' ? 'Mensual' : 'Vitalicio'}</strong></p>
        ${payment.plan === 'monthly' ? `<p>Válido hasta: ${proExpiry.toLocaleDateString('es-EC')}</p>` : '<p>Acceso de por vida ✨</p>'}
      `);

      res.json({ success: true, user: sanitizeUser(user) });
    } else {
      res.status(400).json({ error: 'Pago no completado' });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  PAYPHONE ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/payphone/create-subscription
app.post('/api/payphone/create-subscription', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly'
    const prices = await getSetting('prices', { monthly: { amount: 4.99 } });
    const amount = prices[plan]?.amount;
    if (!amount || plan !== 'monthly') return res.status(400).json({ error: 'Solo suscripciones mensuales disponibles' });

    const cents = Math.round(amount * 100);
    const clientTxId = `sub-${req.user.username}-${Date.now()}`;

    // Crear registro de suscripción pendiente
    await db.collection('subscriptions').add({
      userId: req.user.username,
      plan,
      amount,
      method: 'payphone',
      status: 'pending',
      clientTxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      token: PAYPHONE_TOKEN,
      storeId: PAYPHONE_STORE_ID,
      amount: cents,
      amountWithoutTax: cents,
      amountWithTax: 0,
      tax: 0,
      currency: 'USD',
      clientTransactionId: clientTxId,
      reference: `Suscripción mensual SpinDraw Pro`,
      lang: 'es',
      defaultMethod: 'card',
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payphone/create-order
app.post('/api/payphone/create-order', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body; // 'lifetime'
    const prices = await getSetting('prices', { lifetime: { amount: 29.99 } });
    const amount = prices[plan]?.amount;
    if (!amount || plan !== 'lifetime') return res.status(400).json({ error: 'Solo pagos únicos vitalicios disponibles' });

    const cents = Math.round(amount * 100);
    const clientTxId = `order-${req.user.username}-${Date.now()}`;

    // Crear registro de pago pendiente
    await db.collection('payments').add({
      userId: req.user.username,
      username: req.user.username,
      email: req.user.email,
      method: 'payphone',
      plan,
      amount,
      status: 'pending',
      clientTxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      token: PAYPHONE_TOKEN,
      storeId: PAYPHONE_STORE_ID,
      amount: cents,
      amountWithoutTax: cents,
      amountWithTax: 0,
      tax: 0,
      currency: 'USD',
      clientTransactionId: clientTxId,
      reference: `Pago vitalicio SpinDraw Pro`,
      lang: 'es',
      defaultMethod: 'card',
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payphone/confirm
app.post('/api/payphone/confirm', authMiddleware, async (req, res) => {
  try {
    const { id, clientTransactionId } = req.body;

    // Confirmar con PayPhone
    const confirmRes = await axios.post(`${PAYPHONE_BASE_URL}/api/button/V2/Confirm`, {
      id: parseInt(id),
      clientTxId: clientTransactionId,
    }, {
      headers: {
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = confirmRes.data;
    if (data.statusCode !== 3) return res.status(400).json({ error: 'Pago no aprobado' });

    let userId, plan, isSubscription = false;

    // Buscar en subscriptions (mensual)
    const subSnaps = await db.collection('subscriptions').where('clientTxId', '==', clientTransactionId).get();
    if (!subSnaps.empty) {
      const subDoc = subSnaps.docs[0];
      const sub = subDoc.data();
      userId = sub.userId;
      plan = sub.plan;
      isSubscription = true;

      // Guardar datos de tokenización
      const cardHolder = encryptAES(data.optionalParameter4, PAYPHONE_ENCRYPT_KEY);
      await subDoc.ref.update({
        status: 'active',
        cardToken: data.cardToken,
        cardHolder,
        email: data.email,
        phoneNumber: data.phoneNumber,
        documentId: data.document,
        transactionId: data.transactionId,
        nextCharge: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Buscar en payments (vitalicio)
      const paySnaps = await db.collection('payments').where('clientTxId', '==', clientTransactionId).get();
      if (paySnaps.empty) return res.status(404).json({ error: 'Pago no encontrado' });
      const payDoc = paySnaps.docs[0];
      const pay = payDoc.data();
      userId = pay.userId;
      plan = pay.plan;

      await payDoc.ref.update({
        status: 'completed',
        transactionId: data.transactionId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Activar Pro
    const userSnap = await db.collection('users').doc(userId).get();
    const user = userSnap.data();
    const proExpiry = plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
    await userSnap.ref.update({
      isPro: true,
      proType: plan,
      proExpiry: proExpiry ? admin.firestore.Timestamp.fromDate(proExpiry) : null,
    });

    const planName = plan === 'monthly' ? 'Mensual' : 'Vitalicio';
    const emailSubject = `✅ ¡Tu ${planName.toLowerCase()} Pro está activa!`;
    const emailBody = `
      <h2>¡Felicidades ${user.firstName || user.username}!</h2>
      <p>Tu pago fue procesado correctamente. Ya tienes acceso a <strong>SpinDraw Pro</strong> 🎉</p>
      <p>Plan: <strong>${planName}</strong></p>
      ${plan === 'monthly' ? `<p>Válido hasta: ${proExpiry.toLocaleDateString('es-EC')}</p><p>Se renovará automáticamente cada mes.</p>` : '<p>Acceso de por vida ✨</p>'}
    `;

    sendEmail(user.email, emailSubject, emailBody);

    res.json({ success: true, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── NUEI PAYMENTS ───────────────────────────────────────────
// Nuvei API integration with staging/production switch

function getNuveiUrls(mode) {
  const isProd = mode === 'production';
  return {
    cards: isProd ? 'https://ccapi.paymentez.com' : 'https://ccapi-stg.paymentez.com',
    other: isProd ? 'https://noccapi.paymentez.com' : 'https://noccapi-stg.paymentez.com'
  };
}

// POST /api/nuvei/create-subscription
app.post('/api/nuvei/create-subscription', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const amount = plan === 'monthly' ? siteSettings.prices.monthly.amount : siteSettings.prices.lifetime.amount;

    // Get Nuvei credentials and mode from settings
    const nuveiApiKey = await getSetting('nuveiApiKey', '');
    const nuveiSecret = await getSetting('nuveiSecret', '');
    const nuveiMode = await getSetting('nuveiMode', 'staging');

    if (!nuveiApiKey || !nuveiSecret) {
      return res.status(400).json({ error: 'Credenciales de Nuvei no configuradas' });
    }

    const urls = getNuveiUrls(nuveiMode);

    // Generate auth token
    const timestamp = Math.floor(Date.now() / 1000);
    const uniqString = nuveiSecret + timestamp;
    const uniqToken = crypto.createHash('sha256').update(uniqString).toString('hex');
    const authToken = Buffer.from(`${nuveiApiKey};${timestamp};${uniqToken}`).toString('base64');

    // Init reference for checkout
    const nuveiRes = await axios.post(`${urls.cards}/v2/transaction/init_reference/`, {
      user: {
        id: userId,
        email: userEmail
      },
      order: {
        amount: amount,
        description: `SpinDraw Pro ${plan}`,
        dev_reference: `sub_${userId}_${Date.now()}`,
        vat: 0,
        currency: 'USD'
      },
      configuration: {
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?nuvei_success=1&reference=${reference}`,
        failure_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?nuvei_failure=1`,
        pending_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?nuvei_pending=1`
      }
    }, {
      headers: {
        'Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
    });

    const reference = nuveiRes.data.reference;
    const checkoutUrl = nuveiRes.data.checkout_url;

    // Save to DB
    const subRef = await db.collection('subscriptions').add({
      userId,
      plan,
      provider: 'nuvei',
      reference,
      status: 'pending',
      amount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ reference, checkoutUrl, subId: subRef.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/nuvei/create-order
app.post('/api/nuvei/create-order', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const amount = plan === 'monthly' ? siteSettings.prices.monthly.amount : siteSettings.prices.lifetime.amount;

    // Get Nuvei credentials and mode
    const nuveiApiKey = await getSetting('nuveiApiKey', '');
    const nuveiSecret = await getSetting('nuveiSecret', '');
    const nuveiMode = await getSetting('nuveiMode', 'staging');

    if (!nuveiApiKey || !nuveiSecret) {
      return res.status(400).json({ error: 'Credenciales de Nuvei no configuradas' });
    }

    const urls = getNuveiUrls(nuveiMode);

    // Generate auth token
    const timestamp = Math.floor(Date.now() / 1000);
    const uniqString = nuveiSecret + timestamp;
    const uniqToken = crypto.createHash('sha256').update(uniqString).toString('hex');
    const authToken = Buffer.from(`${nuveiApiKey};${timestamp};${uniqToken}`).toString('base64');

    // Create order for bank transfer (PSE)
    const nuveiRes = await axios.post(`${urls.other}/order/`, {
      carrier: {
        id: 'PSE'
      },
      user: {
        id: userId,
        email: userEmail
      },
      order: {
        dev_reference: `order_${userId}_${Date.now()}`,
        amount: amount,
        description: `SpinDraw Pro ${plan}`,
        currency: 'USD'
      }
    }, {
      headers: {
        'Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
    });

    const transaction = nuveiRes.data.transaction;
    const transactionId = transaction.id;
    const bankUrl = transaction.bank_url;

    // Save to DB
    const payRef = await db.collection('payments').add({
      userId,
      plan,
      provider: 'nuvei',
      transactionId,
      status: 'pending',
      amount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ transactionId, bankUrl, payId: payRef.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/nuvei/confirm
app.post('/api/nuvei/confirm', authMiddleware, async (req, res) => {
  try {
    const { transactionId, reference } = req.body;

    // Get credentials and mode
    const nuveiApiKey = await getSetting('nuveiApiKey', '');
    const nuveiSecret = await getSetting('nuveiSecret', '');
    const nuveiMode = await getSetting('nuveiMode', 'staging');

    if (!nuveiApiKey || !nuveiSecret) {
      return res.status(400).json({ error: 'Credenciales de Nuvei no configuradas' });
    }

    const urls = getNuveiUrls(nuveiMode);

    // Generate auth token
    const timestamp = Math.floor(Date.now() / 1000);
    const uniqString = nuveiSecret + timestamp;
    const uniqToken = crypto.createHash('sha256').update(uniqString).toString('hex');
    const authToken = Buffer.from(`${nuveiApiKey};${timestamp};${uniqToken}`).toString('base64');

    let statusRes;
    if (transactionId) {
      // For bank transfer
      statusRes = await axios.get(`${urls.other}/order/${transactionId}`, {
        headers: {
          'Auth-Token': authToken,
          'Content-Type': 'application/json',
        },
      });
    } else if (reference) {
      // For card checkout
      statusRes = await axios.get(`${urls.cards}/v2/transaction/${reference}`, {
        headers: {
          'Auth-Token': authToken,
          'Content-Type': 'application/json',
        },
      });
    }

    const data = statusRes.data;
    if (data.transaction && data.transaction.status !== 'approved') return res.status(400).json({ error: 'Pago no aprobado' });

    let userId, plan, isSubscription = false, cardToken = null;

    if (reference) {
      // Subscription (card)
      const subSnaps = await db.collection('subscriptions').where('reference', '==', reference).get();
      if (subSnaps.empty) return res.status(404).json({ error: 'Suscripción no encontrada' });
      const subDoc = subSnaps.docs[0];
      const sub = subDoc.data();
      userId = sub.userId;
      plan = sub.plan;
      isSubscription = true;

      // Get card token if available
      if (data.card && data.card.token) {
        cardToken = data.card.token;
      }

      await subDoc.ref.update({
        status: 'active',
        transactionId: data.transaction.id,
        cardToken,
        nextCharge: plan === 'monthly' ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // One-time (bank)
      const paySnaps = await db.collection('payments').where('transactionId', '==', transactionId).get();
      if (paySnaps.empty) return res.status(404).json({ error: 'Pago no encontrado' });
      const payDoc = paySnaps.docs[0];
      const pay = payDoc.data();
      userId = pay.userId;
      plan = pay.plan;

      await payDoc.ref.update({
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Activate Pro
    const userSnap = await db.collection('users').doc(userId).get();
    const user = userSnap.data();
    const proExpiry = plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
    await userSnap.ref.update({
      isPro: true,
      proType: plan,
      proExpiry: proExpiry ? admin.firestore.Timestamp.fromDate(proExpiry) : null,
    });

    const planName = plan === 'monthly' ? 'Mensual' : 'Vitalicio';
    const emailSubject = `✅ ¡Tu ${planName.toLowerCase()} Pro está activa!`;
    const emailBody = `
      <h2>¡Felicidades ${user.firstName || user.username}!</h2>
      <p>Tu pago fue procesado correctamente. Ya tienes acceso a <strong>SpinDraw Pro</strong> 🎉</p>
      <p>Plan: <strong>${planName}</strong></p>
      ${plan === 'monthly' ? `<p>Válido hasta: ${proExpiry.toLocaleDateString('es-EC')}</p><p>Se renovará automáticamente cada mes.</p>` : '<p>Acceso de por vida ✨</p>'}
    `;

    sendEmail(user.email, emailSubject, emailBody);

    res.json({ success: true, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Función para cobrar renovación
async function chargeSubscription(subId) {
  try {
    const subSnap = await db.collection('subscriptions').doc(subId).get();
    if (!subSnap.exists) return;
    const sub = subSnap.data();
    if (sub.status !== 'active') return;

    if (sub.provider === 'nuvei') {
      // Charge Nuvei subscription using debit with token
      const nuveiApiKey = await getSetting('nuveiApiKey', '');
      const nuveiSecret = await getSetting('nuveiSecret', '');
      const nuveiMode = await getSetting('nuveiMode', 'staging');

      if (!nuveiApiKey || !nuveiSecret || !sub.cardToken) return; // Skip if not configured or no token

      const urls = getNuveiUrls(nuveiMode);

      // Generate auth token
      const timestamp = Math.floor(Date.now() / 1000);
      const uniqString = nuveiSecret + timestamp;
      const uniqToken = crypto.createHash('sha256').update(uniqString).toString('hex');
      const authToken = Buffer.from(`${nuveiApiKey};${timestamp};${uniqToken}`).toString('base64');

      try {
        const chargeRes = await axios.post(`${urls.cards}/v2/transaction/debit/`, {
          user: {
            id: sub.userId,
            email: sub.userEmail || 'user@example.com' // Need to store email
          },
          order: {
            amount: sub.amount,
            description: `SpinDraw Pro Monthly Renewal`,
            dev_reference: `renew_${sub.userId}_${Date.now()}`,
            vat: 0,
            currency: 'USD'
          },
          card: {
            token: sub.cardToken
          }
        }, {
          headers: {
            'Auth-Token': authToken,
            'Content-Type': 'application/json',
          },
        });

        if (chargeRes.data.transaction && chargeRes.data.transaction.status === 'success') {
          // Update next charge
          await subSnap.ref.update({
            nextCharge: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Handle failure, maybe deactivate
          await subSnap.ref.update({
            status: 'failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch(e) {
        console.error('Nuvei charge error:', e.message);
        await subSnap.ref.update({
          status: 'failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return;
    }

    // PayPhone charge
    const cents = Math.round(sub.amount * 100);
    const clientTxId = `renew-${sub.userId}-${Date.now()}`;

    const chargeData = {
      cardHolder: sub.cardHolder,
      cardToken: sub.cardToken,
      documentId: sub.documentId,
      phoneNumber: sub.phoneNumber,
      email: sub.email,
      amount: cents,
      amountWithoutTax: cents,
      amountWithTax: 0,
      tax: 0,
      clientTransactionId: clientTxId,
      currency: 'USD',
      storeId: PAYPHONE_STORE_ID,
      optionalParameter: `Renovación mensual SpinDraw Pro`,
      order: {
        billTo: {
          billToId: 1,
          address1: 'N/A',
          address2: 'N/A',
          country: 'EC',
          state: 'N/A',
          locality: 'N/A',
          firstName: 'Usuario',
          lastName: 'Pro',
          phoneNumber: `+${sub.phoneNumber}`,
          email: sub.email,
          postalCode: '000000',
          ipAddress: '127.0.0.1',
        },
        lineItems: [{
          productName: 'Suscripción mensual SpinDraw Pro',
          unitPrice: cents,
          quantity: 1,
          totalAmount: cents,
          taxAmount: 0,
          productSKU: 'SUB-MONTHLY',
          productDescription: 'Acceso mensual a SpinDraw Pro',
        }],
      },
    };

    const chargeRes = await axios.post(`${PAYPHONE_BASE_URL}/api/transaction/web`, chargeData, {
      headers: {
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = chargeRes.data;
    if (data.statusCode === 3) {
      // Éxito, actualizar nextCharge y proExpiry
      const nextCharge = new Date(Date.now() + 30*24*60*60*1000);
      const proExpiry = new Date(Date.now() + 30*24*60*60*1000);
      await subSnap.ref.update({
        nextCharge: admin.firestore.Timestamp.fromDate(nextCharge),
        lastCharged: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('users').doc(sub.userId).update({
        proExpiry: admin.firestore.Timestamp.fromDate(proExpiry),
      });
    } else {
      // Falló, cancelar suscripción
      await subSnap.ref.update({ status: 'failed' });
      await db.collection('users').doc(sub.userId).update({ isPro: false });
    }
  } catch(e) { console.error('Charge error:', e.message); }
}

// Cron para renovaciones diarias
cron.schedule('0 0 * * *', async () => { // Todos los días a medianoche
  const now = new Date();
  const subs = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('nextCharge', '<=', admin.firestore.Timestamp.fromDate(now))
    .get();
  for (const doc of subs.docs) {
    await chargeSubscription(doc.id);
  }
});

// ═══════════════════════════════════════════════════════════
//  TRANSFERENCIA BANCARIA ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/transfer/submit
app.post('/api/transfer/submit', authMiddleware, upload.single('comprobante'), async (req, res) => {
  try {
    const { plan, bankRef } = req.body;
    const prices = await getSetting('prices', { monthly: { amount: 4.99 }, lifetime: { amount: 49.99 } });
    const amount = prices[plan]?.amount;
    if (!amount) return res.status(400).json({ error: 'Plan inválido' });
    if (!req.file) return res.status(400).json({ error: 'Comprobante requerido' });

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `comprobantes/${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);
    await file.save(req.file.buffer, { contentType: req.file.mimetype });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

    const userSnap = await db.collection('users').doc(req.user.username).get();
    const user = userSnap.data();
    const paymentRef = await db.collection('payments').add({
      userId: req.user.username, username: user.username, email: user.email,
      method: 'transfer', plan, amount,
      bankRef: bankRef || null, comprobante: url,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
    });

    // Notificar al admin por email
    sendEmail(process.env.ADMIN_EMAIL, `🔔 Nueva transferencia de ${user.username}`, `
      <h3>Nueva solicitud de pago por transferencia</h3>
      <p><b>Usuario:</b> ${user.username} (${user.email})</p>
      <p><b>Plan:</b> ${plan} — $${amount}</p>
      <p><b>Referencia:</b> ${bankRef || 'No indicada'}</p>
      <p><b>ID Pago:</b> ${paymentRef.id}</p>
      <p>Revisa el panel admin para aprobar o rechazar.</p>
    `);

    sendEmail(user.email, '⏳ Comprobante recibido — SpinDraw', `
      <h2>Hola ${user.firstName || user.username},</h2>
      <p>Recibimos tu comprobante de transferencia. Lo revisaremos en las próximas <strong>24 horas</strong>.</p>
      <p>Te notificaremos por email cuando tu cuenta Pro esté activa.</p>
    `);

    res.json({ success: true, paymentId: paymentRef.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════════════════════════

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', adminMiddleware, async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    const proUsers = usersSnap.docs.filter(doc => doc.data().isPro).length;
    const pendingPayments = (await db.collection('payments').where('status', '==', 'pending').get()).size;
    const completedPayments = (await db.collection('payments').where('status', '==', 'completed').get()).size;
    const totalRevenue = (await db.collection('payments').where('status', '==', 'completed').get()).docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    res.json({
      totalUsers, proUsers, pendingPayments, completedPayments,
      totalRevenue,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/payments?status=pending&page=1
app.get('/api/admin/payments', adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = db.collection('payments').orderBy('createdAt', 'desc');
    if (status) query = query.where('status', '==', status);
    const paymentsSnap = await query.limit(parseInt(limit)).offset((page - 1) * limit).get();
    const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalSnap = await query.get();
    const total = totalSnap.size;
    res.json({ payments, total, pages: Math.ceil(total / limit) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/payments/:id/approve
app.post('/api/admin/payments/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const paymentDoc = await db.collection('payments').doc(req.params.id).get();
    if (!paymentDoc.exists) return res.status(404).json({ error: 'Pago no encontrado' });
    const payment = paymentDoc.data();
    await paymentDoc.ref.update({
      status: 'completed',
      adminNote,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userSnap = await db.collection('users').doc(payment.userId).get();
    const user = userSnap.data();
    const proExpiry = payment.plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
    await userSnap.ref.update({
      isPro: true,
      proType: payment.plan,
      proExpiry: proExpiry ? admin.firestore.Timestamp.fromDate(proExpiry) : null,
    });

    sendEmail(user.email, '✅ ¡Tu cuenta Pro está activa! — SpinDraw', `
      <h2>¡Felicidades ${user.firstName || user.username}!</h2>
      <p>Tu pago fue verificado. Ya tienes acceso a <strong>SpinDraw Pro</strong> 🎉</p>
      <p>Plan: <strong>${payment.plan === 'monthly' ? 'Mensual' : 'Vitalicio'}</strong></p>
      ${payment.plan === 'monthly' ? `<p>Válido hasta: ${user.proExpiry.toLocaleDateString('es-EC')}</p>` : '<p>Acceso de por vida ✨</p>'}
      <p><a href="${process.env.FRONTEND_URL}">Ir a SpinDraw →</a></p>
    `);

    res.json({ success: true, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/payments/:id/reject
app.post('/api/admin/payments/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const paymentDoc = await db.collection('payments').doc(req.params.id).get();
    if (!paymentDoc.exists) return res.status(404).json({ error: 'Pago no encontrado' });
    const payment = paymentDoc.data();
    await paymentDoc.ref.update({
      status: 'rejected',
      adminNote,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const user = await User.findById(payment.userId);
    sendEmail(user.email, '❌ Comprobante rechazado — SpinDraw', `
      <h2>Hola ${user.firstName || user.username},</h2>
      <p>Lamentablemente tu comprobante no pudo ser verificado.</p>
      ${adminNote ? `<p><b>Motivo:</b> ${adminNote}</p>` : ''}
      <p>Por favor contáctanos por WhatsApp para resolver el problema.</p>
    `);

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/users?page=1&search=xxx
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    let query = db.collection('users').orderBy('createdAt', 'desc');
    if (search) {
      const allSnap = await query.get();
      const allUsers = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u =>
        u.username.includes(search.toLowerCase()) || u.email.includes(search.toLowerCase())
      );
      const total = allUsers.length;
      const users = allUsers.slice((page - 1) * limit, page * limit);
      res.json({ users, total, pages: Math.ceil(total / limit) });
    } else {
      const usersSnap = await query.limit(parseInt(limit)).offset((page - 1) * limit).get();
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalSnap = await query.get();
      const total = totalSnap.size;
      res.json({ users, total, pages: Math.ceil(total / limit) });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users/:id/toggle-pro
app.post('/api/admin/users/:id/toggle-pro', adminMiddleware, async (req, res) => {
  try {
    const { isPro, proType, days } = req.body;
    const update = { isPro, proType: isPro ? (proType || 'monthly') : 'none' };
    if (isPro && proType === 'monthly' && days)
      update.proExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    if (isPro && proType === 'lifetime') update.proExpiry = null;
    await db.collection('users').doc(req.params.id).update(update);
    const userSnap = await db.collection('users').doc(req.params.id).get();
    res.json({ success: true, user: sanitizeUser(userSnap.data()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/settings
app.get('/api/admin/settings', adminMiddleware, async (req, res) => {
  try {
    const [prices, bank, whatsapp, adminEmail, payphoneEnabled, nuveiEnabled, nuveiMode, nuveiApiKey, nuveiSecret, nuveiMerchantId, nuveiTerminalId] = await Promise.all([
      getSetting('prices', { monthly: { amount: 4.99, label: 'Mensual' }, lifetime: { amount: 29.99, label: 'Vitalicio' } }),
      getSetting('bank', {}),
      getSetting('whatsapp', ''),
      getSetting('adminEmail', ''),
      getSetting('payphoneEnabled', true),
      getSetting('nuveiEnabled', false),
      getSetting('nuveiMode', 'staging'),
      getSetting('nuveiApiKey', ''),
      getSetting('nuveiSecret', ''),
      getSetting('nuveiMerchantId', ''),
      getSetting('nuveiTerminalId', ''),
    ]);
    res.json({ prices, bank, whatsapp, adminEmail, payphoneEnabled, nuveiEnabled, nuveiMode, nuveiApiKey, nuveiSecret, nuveiMerchantId, nuveiTerminalId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings
app.put('/api/admin/settings', adminMiddleware, async (req, res) => {
  try {
    const { prices, bank, whatsapp, adminEmail, payphoneEnabled, nuveiEnabled, nuveiMode, nuveiApiKey, nuveiSecret, nuveiMerchantId, nuveiTerminalId } = req.body;
    const ops = [];
    if (prices)         ops.push(setSetting('prices', prices));
    if (bank)           ops.push(setSetting('bank', bank));
    if (whatsapp)       ops.push(setSetting('whatsapp', whatsapp));
    if (adminEmail)     ops.push(setSetting('adminEmail', adminEmail));
    if (payphoneEnabled !== undefined) ops.push(setSetting('payphoneEnabled', payphoneEnabled));
    if (nuveiEnabled !== undefined) ops.push(setSetting('nuveiEnabled', nuveiEnabled));
    if (nuveiMode !== undefined) ops.push(setSetting('nuveiMode', nuveiMode));
    if (nuveiApiKey !== undefined) ops.push(setSetting('nuveiApiKey', nuveiApiKey));
    if (nuveiSecret !== undefined) ops.push(setSetting('nuveiSecret', nuveiSecret));
    if (nuveiMerchantId !== undefined) ops.push(setSetting('nuveiMerchantId', nuveiMerchantId));
    if (nuveiTerminalId !== undefined) ops.push(setSetting('nuveiTerminalId', nuveiTerminalId));
    await Promise.all(ops);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATIC FILES ────────────────────────────────────────────
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'ruleta-pro.html')));

// ═══════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SpinDraw server corriendo en puerto ${PORT}`));
