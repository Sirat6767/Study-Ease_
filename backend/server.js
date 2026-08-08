require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { supabase } = require('./supabaseClient');

// ── TASK 7: Fail-Fast Configuration Validation ──────────────────────────────
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

// ── TASK 5: Request Identifiers & TASK 4: Structured Logging ────────────────
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: req.user?.id || null
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    } else {
      console.log(`[${logData.timestamp}] [${logData.requestId.slice(0, 8)}] ${logData.method} ${logData.url} ${logData.status} - ${logData.durationMs}ms`);
    }
  });

  next();
});

// Configure CORS and JSON payload parsing
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
  : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', require('./routes/fileRoutes'));

// ── TASK 3: Deep Health Check Endpoint ───────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbError = null;

  try {
    const { error } = await supabase.from('universities').select('id').limit(1);
    if (error) {
      dbStatus = 'unhealthy';
      dbError = error.message;
    }
  } catch (err) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  const uploadsDir = path.join(__dirname, 'uploads');
  const storageStatus = fs.existsSync(uploadsDir) ? 'healthy' : 'unhealthy';
  const isHealthy = dbStatus === 'healthy' && storageStatus === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    latencyMs: Date.now() - startTime,
    checks: {
      api: 'healthy',
      database: dbStatus,
      storage: storageStatus
    },
    ...(dbError && { error: dbError })
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/academic', require('./routes/academicRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/cr', require('./routes/crRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/moderator', require('./routes/moderatorRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// ── TASK 6: Global Express Error Handling Middleware ────────────────────────
app.use((err, req, res, next) => {
  const requestId = req.id || 'unknown';
  console.error(`[ERROR] [Req: ${requestId}] ${err.stack || err.message || err}`);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    ok: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : err.message || 'Internal server error',
    requestId
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
