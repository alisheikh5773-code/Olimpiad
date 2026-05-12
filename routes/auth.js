// backend/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../db');
const { JWT_SECRET, authMiddleware } = require('../middleware');

router.post('/register', (req, res) => {
    const { name, school, class: cls, city, username, password } = req.body;
    
    if (!name || !school || !cls || !city || !username || !password) {
        return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    }
    
    // FAQAT ANDIJON
    if (city !== 'Andijon') {
        return res.status(400).json({ error: "Hozirda faqat Andijon shahri ishtirokchilari qabul qilinadi" });
    }
    
    if (!['5A', '5B', '5C', '5D'].includes(cls)) {
        return res.status(400).json({ error: "Faqat 5-sinf o'quvchilari ishtirok eta oladi" });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: "Parol kamida 6 belgi bo'lishi kerak" });
    }

    const existing = get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
        return res.status(409).json({ error: 'Bu username band' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    
    try {
        const result = run(
            'INSERT INTO users (name, school, class, city, username, password) VALUES (?, ?, ?, ?, ?, ?)',
            [name, school, cls, city, username, hashed]
        );
        
        const token = jwt.sign(
            { id: result.lastInsertRowid, name, city, username, initials },
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        res.status(201).json({ 
            message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", 
            token,
            user: { 
                id: result.lastInsertRowid, 
                name, 
                school, 
                class: cls, 
                city, 
                username, 
                initials 
            } 
        });
    } catch(e) { 
        res.status(500).json({ error: 'Server xatosi: ' + e.message }); 
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username va parol kerak' });
    }
    
    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Username yoki parol noto'g'ri" });
    }
    
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const token = jwt.sign(
        { id: user.id, name: user.name, city: user.city, username: user.username, initials },
        JWT_SECRET, 
        { expiresIn: '7d' }
    );
    
    res.json({ 
        message: 'Xush kelibsiz!', 
        token,
        user: { 
            id: user.id, 
            name: user.name, 
            school: user.school, 
            class: user.class,
            city: user.city, 
            username: user.username, 
            initials 
        } 
    });
});

router.get('/me', authMiddleware, (req, res) => {
    const user = get('SELECT id, name, school, class, city, username, created_at FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Topilmadi' });
    res.json(user);
});

module.exports = router;