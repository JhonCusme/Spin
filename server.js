// ═══════════════════════════════════════════════════════════
//  SpinDraw — Backend Server
//  Stack: Node.js + Express + MongoDB + PayPal SDK
//  Deploy: Render.com (free tier) or Railway
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const cors         = require('cors');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const paypal       = require('@paypal/checkout-server-sdk');
const nodemailer   = require('nodemailer');

const app = express();

// ── MIDDLEWARES ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── MULTER (comprobantes de transferencia) ───────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/comprobantes';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── MONGODB ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    console.log('💡 IP whitelist (0.0.0.0/0) o DNS issue. El servidor continuará sin DB (usará fallback local).');
  });

// ── SCHEMAS ──────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  firstName:   String,
  lastName:    String,
  phone:       String,
  isPro:       { type: Boolean, default: false },
  proType:     { type: String, enum: ['none','monthly','lifetime'], default: 'none' },
  proExpiry:   Date,           // null = lifetime
  ruletas:     { type: Array, default: [{ id: 1, name: 'Ruleta 1', entries: [], history: [], wins: {} }] },
  totalSpins:  { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
  lastLogin:   Date,
});

const PaymentSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:    String,
  email:       String,
  method:      { type: String, enum: ['paypal','transfer'] },
  plan:        { type: String, enum: ['monthly','lifetime'] },
  amount:      Number,
  currency:    { type: String, default: 'USD' },
  status:      { type: String, enum: ['pending','completed','rejected','refunded'], default: 'pending' },
  // PayPal
  paypalOrderId:    String,
  paypalPayerId:    String,
  // Transferencia
  bankRef:          String,    // referencia del usuario
  comprobante:      String,    // ruta del archivo
  adminNote:        String,
  createdAt:        { type: Date, default: Date.now },
  updatedAt:        Date,
});

const SettingsSchema = new mongoose.Schema({
  key:   { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

const User     = mongoose.model('User', UserSchema);
const Payment  = mongoose.model('Payment', PaymentSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// ── PAYPAL CLIENT ────────────────────────────────────────────
function getPayPalClient() {
  const env = process.env.PAYPAL_MODE === 'live'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
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

// ── SETTINGS HELPER ─────────────────────────────────────────
async function getSetting(key, defaultVal) {
  const s = await Settings.findOne({ key });
  return s ? s.value : defaultVal;
}
async function setSetting(key, value) {
  await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
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

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ error: exists.username === username ? 'Usuario ya existe' : 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: hashed, firstName, lastName, phone });

    const token = signToken({ id: user._id, username: user.username, isAdmin: false });
    sendEmail(email, '¡Bienvenido a SpinDraw! 🎉', `
      <h2>¡Hola ${firstName || username}!</h2>
      <p>Tu cuenta en SpinDraw fue creada exitosamente.</p>
      <p>Empieza a crear sorteos en <a href="${process.env.FRONTEND_URL}">SpinDraw</a></p>
    `);
    res.json({ token, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: username?.toLowerCase() }, { email: username?.toLowerCase() }]
    });
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    // Check pro expiry
    if (user.isPro && user.proType === 'monthly' && user.proExpiry && new Date() > user.proExpiry) {
      user.isPro = false; user.proType = 'none'; await user.save();
    }

    user.lastLogin = new Date(); await user.save();
    const token = signToken({ id: user._id, username: user.username, isAdmin: user.username === process.env.ADMIN_USERNAME });
    res.json({ token, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/ruletas (guardar ruletas del usuario)
app.put('/api/auth/ruletas', authMiddleware, async (req, res) => {
  try {
    const { ruletas } = req.body;
    await User.findByIdAndUpdate(req.user.id, { ruletas });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/spins (incrementar contador de giros)
app.put('/api/auth/spins', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalSpins: 1 } });
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
    res.json({ prices, bank, whatsapp });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  PAYPAL ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/paypal/create-order
app.post('/api/paypal/create-order', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' | 'lifetime'
    const prices = await getSetting('prices', { monthly: { amount: 4.99 }, lifetime: { amount: 29.99 } });
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
        return_url: `${process.env.FRONTEND_URL}/paypal-success`,
        cancel_url: `${process.env.FRONTEND_URL}/paypal-cancel`,
        brand_name: 'SpinDraw',
        user_action: 'PAY_NOW',
      }
    });

    const client = getPayPalClient();
    const order = await client.execute(request);
    const approveUrl = order.result.links.find(l => l.rel === 'approve')?.href;

    // Crear registro de pago pendiente
    const user = await User.findById(req.user.id);
    await Payment.create({
      userId: user._id, username: user.username, email: user.email,
      method: 'paypal', plan, amount,
      paypalOrderId: order.result.id, status: 'pending',
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
      const payment = await Payment.findOneAndUpdate(
        { paypalOrderId: orderId },
        { status: 'completed', paypalPayerId: capture.result.payer.payer_id, updatedAt: new Date() },
        { new: true }
      );
      // Activar Pro
      const user = await User.findById(payment.userId);
      user.isPro = true;
      user.proType = payment.plan;
      user.proExpiry = payment.plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
      await user.save();

      sendEmail(user.email, '✅ ¡Tu suscripción Pro está activa!', `
        <h2>¡Felicidades ${user.firstName || user.username}!</h2>
        <p>Tu pago fue procesado correctamente. Ya tienes acceso a <strong>SpinDraw Pro</strong> 🎉</p>
        <p>Plan: <strong>${payment.plan === 'monthly' ? 'Mensual' : 'Vitalicio'}</strong></p>
        ${payment.plan === 'monthly' ? `<p>Válido hasta: ${user.proExpiry.toLocaleDateString('es-EC')}</p>` : '<p>Acceso de por vida ✨</p>'}
      `);

      res.json({ success: true, user: sanitizeUser(user) });
    } else {
      res.status(400).json({ error: 'Pago no completado' });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  TRANSFERENCIA BANCARIA ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/transfer/submit
app.post('/api/transfer/submit', authMiddleware, upload.single('comprobante'), async (req, res) => {
  try {
    const { plan, bankRef } = req.body;
    const prices = await getSetting('prices', { monthly: { amount: 4.99 }, lifetime: { amount: 29.99 } });
    const amount = prices[plan]?.amount;
    if (!amount) return res.status(400).json({ error: 'Plan inválido' });
    if (!req.file) return res.status(400).json({ error: 'Comprobante requerido' });

    const user = await User.findById(req.user.id);
    const payment = await Payment.create({
      userId: user._id, username: user.username, email: user.email,
      method: 'transfer', plan, amount,
      bankRef, comprobante: req.file.path,
      status: 'pending',
    });

    // Notificar al admin por email
    sendEmail(process.env.ADMIN_EMAIL, `🔔 Nueva transferencia de ${user.username}`, `
      <h3>Nueva solicitud de pago por transferencia</h3>
      <p><b>Usuario:</b> ${user.username} (${user.email})</p>
      <p><b>Plan:</b> ${plan} — $${amount}</p>
      <p><b>Referencia:</b> ${bankRef || 'No indicada'}</p>
      <p><b>ID Pago:</b> ${payment._id}</p>
      <p>Revisa el panel admin para aprobar o rechazar.</p>
    `);

    sendEmail(user.email, '⏳ Comprobante recibido — SpinDraw', `
      <h2>Hola ${user.firstName || user.username},</h2>
      <p>Recibimos tu comprobante de transferencia. Lo revisaremos en las próximas <strong>24 horas</strong>.</p>
      <p>Te notificaremos por email cuando tu cuenta Pro esté activa.</p>
    `);

    res.json({ success: true, paymentId: payment._id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════════════════════════

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, proUsers, pendingPayments, completedPayments, totalRevenue] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPro: true }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'completed' }),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({
      totalUsers, proUsers, pendingPayments, completedPayments,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/payments?status=pending&page=1
app.get('/api/admin/payments', adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Payment.countDocuments(filter);
    res.json({ payments, total, pages: Math.ceil(total / limit) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/payments/:id/approve
app.post('/api/admin/payments/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', adminNote, updatedAt: new Date() },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

    const user = await User.findById(payment.userId);
    user.isPro = true;
    user.proType = payment.plan;
    user.proExpiry = payment.plan === 'monthly' ? new Date(Date.now() + 30*24*60*60*1000) : null;
    await user.save();

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
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', adminNote, updatedAt: new Date() },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

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
    const filter = search ? { $or: [
      { username: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ]} : {};
    const users = await User.find(filter, '-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(filter);
    res.json({ users, total, pages: Math.ceil(total / limit) });
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
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/settings
app.get('/api/admin/settings', adminMiddleware, async (req, res) => {
  try {
    const [prices, bank, whatsapp, adminEmail] = await Promise.all([
      getSetting('prices', { monthly: { amount: 4.99, label: 'Mensual' }, lifetime: { amount: 29.99, label: 'Vitalicio' } }),
      getSetting('bank', {}),
      getSetting('whatsapp', ''),
      getSetting('adminEmail', ''),
    ]);
    res.json({ prices, bank, whatsapp, adminEmail });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings
app.put('/api/admin/settings', adminMiddleware, async (req, res) => {
  try {
    const { prices, bank, whatsapp, adminEmail } = req.body;
    const ops = [];
    if (prices)     ops.push(setSetting('prices', prices));
    if (bank)       ops.push(setSetting('bank', bank));
    if (whatsapp)   ops.push(setSetting('whatsapp', whatsapp));
    if (adminEmail) ops.push(setSetting('adminEmail', adminEmail));
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
