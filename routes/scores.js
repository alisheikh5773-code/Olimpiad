// backend/routes/scores.js - TO'LIQ TUZATILGAN VERSIYA
const router = require('express').Router();
const { run, get, all } = require('../db');
const { authMiddleware } = require('../middleware');

// Natija saqlash - TUZATILGAN
router.post('/', authMiddleware, (req, res) => {
    console.log('📝 Score saqlash so\'rovi keldi');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    const { challenge_id, challenge_name, wpm, accuracy, errors, keystrokes, duration } = req.body;
    
    if (!req.user || !req.user.id) {
        console.error('❌ User ID topilmadi!');
        return res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi' });
    }
    
    if (wpm === undefined || accuracy === undefined) {
        return res.status(400).json({ error: 'wpm va accuracy kerak' });
    }
    if (wpm < 0 || wpm > 300) {
        return res.status(400).json({ error: "WPM noto'g'ri" });
    }
    
    try {
        const userId = req.user.id;
        const challengeId = challenge_id || 0;
        const challengeName = challenge_name || 'Typing Test';
        const wpmValue = Math.round(wpm);
        const accuracyValue = parseFloat((accuracy || 0).toFixed(1));
        const errorsValue = errors || 0;
        const keystrokesValue = keystrokes || 0;
        const durationValue = duration || 60;
        
        console.log(`💾 Saqlanmoqda: user_id=${userId}, wpm=${wpmValue}, accuracy=${accuracyValue}`);
        
        const result = run(
            `INSERT INTO scores (user_id, challenge_id, challenge_name, wpm, accuracy, errors, keystrokes, duration) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, challengeId, challengeName, wpmValue, accuracyValue, errorsValue, keystrokesValue, durationValue]
        );
        
        console.log('✅ Natija saqlandi, ID:', result.lastInsertRowid);
        
        res.status(201).json({ 
            id: result.lastInsertRowid, 
            message: '✅ Natija saqlandi!',
            wpm: wpmValue,
            accuracy: accuracyValue
        });
    } catch (err) {
        console.error('❌ Score saqlashda xato:', err);
        res.status(500).json({ error: 'Natijani saqlashda xatolik: ' + err.message });
    }
});

// Leaderboard - jonli va to'g'ri ishlaydigan versiya
router.get('/leaderboard', (req, res) => {
    console.log('📊 Leaderboard so\'rovi keldi');
    
    const sql = `
        SELECT 
            u.id,
            u.name, 
            u.city, 
            u.school, 
            u.class,
            MAX(s.wpm) as wpm,
            ROUND(AVG(s.accuracy), 1) as accuracy,
            COUNT(s.id) as attempts,
            ROUND(MAX(s.wpm) * (MAX(s.accuracy) / 100.0), 1) as score
        FROM scores s 
        JOIN users u ON s.user_id = u.id
        WHERE u.city = 'Andijon'
        GROUP BY u.id, u.name, u.city, u.school, u.class
        ORDER BY CAST(MAX(s.wpm) AS INTEGER) DESC, MAX(s.accuracy) DESC 
        LIMIT 50
    `;
    
    try {
        const results = all(sql, []);
        console.log(`📊 Leaderboard: ${results.length} ta natija topildi`);
        res.json(results);
    } catch (err) {
        console.error('❌ Leaderboard yuklashda xato:', err);
        res.status(500).json({ error: 'Reytingni yuklashda xatolik' });
    }
});

// O'z natijalari
router.get('/my', authMiddleware, (req, res) => {
    console.log(`📝 ${req.user.username} ning natijalari so'ralmoqda`);
    
    try {
        const results = all(
            `SELECT id, challenge_name, wpm, accuracy, errors, keystrokes, duration, created_at 
             FROM scores 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [req.user.id]
        );
        console.log(`📝 ${results.length} ta natija topildi`);
        res.json(results);
    } catch (err) {
        console.error('My scores yuklashda xato:', err);
        res.status(500).json({ error: 'Natijalarni yuklashda xatolik' });
    }
});

// Eng yaxshi natija va statistika
router.get('/best', authMiddleware, (req, res) => {
    try {
        const row = get(
            `SELECT 
                MAX(wpm) as best_wpm, 
                ROUND(AVG(accuracy), 1) as avg_acc, 
                COUNT(*) as total 
             FROM scores 
             WHERE user_id = ?`,
            [req.user.id]
        );
        console.log(`🏆 ${req.user.username} ning eng yaxshi natijasi: ${row?.best_wpm || 'yo\'q'}`);
        res.json(row || { best_wpm: null, avg_acc: null, total: 0 });
    } catch (err) {
        console.error('Best score yuklashda xato:', err);
        res.status(500).json({ error: 'Statistikani yuklashda xatolik' });
    }
});

module.exports = router;