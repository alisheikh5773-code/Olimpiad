const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS sozlamalari
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: { error: "Juda ko'p so'rov, biroz keyinroq urinib ko'ring" } 
});
const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 30, 
    message: { error: "Juda ko'p urinish" } 
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// API route'lar
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/forum', require('./routes/forum'));

// Health check
app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    message: 'Server ishlayapti'
}));

// STATIC FAYLLAR - PUBLIC PAPKASIDAN (O'ZGARTIRILDI!)
app.use(express.static(path.join(__dirname, 'public')));

// CATCH-ALL - INDEX.HTML GA YONALTIRISH (O'ZGARTIRILDI!)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server xatosi:', err.stack);
    res.status(500).json({ error: 'Server xatosi yuz berdi' });
});

// Serverni ishga tushirish
async function startServer() {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`
  ╔══════════════════════════════════════════════════╗
  ║  🐒  MONKEYTYPE OLIMPIADA BACKEND                ║
  ║  ─────────────────────────────────────────────── ║
  ║  Server: http://localhost:${PORT}                  ║
  ║  API:    http://localhost:${PORT}/api             ║
  ║  Status: ✅ Running                              ║
  ╚══════════════════════════════════════════════════╝
            `);
        });
    } catch (err) {
        console.error('Serverni ishga tushirishda xatolik:', err);
        process.exit(1);
    }
}

startServer();