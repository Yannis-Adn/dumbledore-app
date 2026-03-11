import express from 'express';
import rateLimit from 'express-rate-limit';
import registerNotifRouter from './routes/register-notif.js';
import refreshNotifTokenRouter from './routes/refresh-notif-token.js';
import syncDeadlinesRouter from './routes/sync-deadlines.js';
import checkDeadlinesRouter from './routes/check-deadlines.js';
import { gandalfDownloadProxy, gandalfProxy, panoramixProxy } from './proxy.js';
import { startCronJobs } from './cron.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Security headers ──
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── CORS ──
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Moodle-Session, X-Panoramix-Token, Authorization');
  }
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ── Rate limiting ──
const notifLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const proxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// ── Notification API routes (must come BEFORE proxy catch-all) ──
const jsonParser = express.json({ limit: '10kb' });
app.use('/api/register-notif', notifLimiter, jsonParser, registerNotifRouter);
app.use('/api/refresh-notif-token', notifLimiter, jsonParser, refreshNotifTokenRouter);
app.use('/api/sync-deadlines', notifLimiter, jsonParser, syncDeadlinesRouter);
app.use('/api/check-deadlines', checkDeadlinesRouter);

// ── Panoramix proxy (must come BEFORE /api catch-all) ──
app.use('/panoramix-api', proxyLimiter, panoramixProxy);

// ── Gandalf pluginfile download proxy (redirect follower) ──
app.use(gandalfDownloadProxy);

// ── Gandalf proxy catch-all ──
app.use('/api', proxyLimiter, gandalfProxy);

app.listen(PORT, () => {
  console.log(`[SERVER] Dumbledore backend running on port ${PORT}`);
  startCronJobs();
});
