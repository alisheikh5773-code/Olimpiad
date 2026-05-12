// backend/middleware.js - TO'LIQ TEKSHIRILGAN
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'monkeytype-olimpiada-2026-super-secret-key';

function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    console.log('🔐 Auth header:', auth ? 'Mavjud' : 'Yo\'q');
    
    if (!auth || !auth.startsWith('Bearer ')) {
        console.log('❌ Token topilmadi');
        return res.status(401).json({ error: 'Token kerak' });
    }
    
    try {
        const token = auth.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token yaroqli, user:', decoded.username);
        req.user = decoded;
        next();
    } catch (err) {
        console.log('❌ Token yaroqsiz:', err.message);
        return res.status(401).json({ error: 'Token yaroqsiz' });
    }
}

function optionalAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        } catch (err) {}
    }
    next();
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET }