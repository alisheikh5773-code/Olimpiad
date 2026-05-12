// backend/routes/forum.js
const router = require('express').Router();
const { run, get, all } = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware');

// Barcha postlarni olish
router.get('/', optionalAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 15, 50);
    const offset = (page - 1) * limit;
    
    const totalResult = get('SELECT COUNT(*) as count FROM forum_posts');
    const total = totalResult ? totalResult.count : 0;
    
    const posts = all(
        `SELECT 
            id, user_id, author_name, author_initials, message, likes, created_at,
            CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END as is_registered 
         FROM forum_posts 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    
    let likedIds = new Set();
    if (req.user) {
        all('SELECT post_id FROM forum_likes WHERE user_id = ?', [req.user.id])
            .forEach(r => likedIds.add(r.post_id));
    }
    
    res.json({
        posts: posts.map(p => ({ ...p, liked: likedIds.has(p.id) })),
        total,
        page,
        pages: Math.ceil(total / limit)
    });
});

// Yangi post yozish
router.post('/', authMiddleware, (req, res) => {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Xabar bo'sh bo'lmasin" });
    }
    if (message.length > 500) {
        return res.status(400).json({ error: 'Xabar 500 belgidan oshmasin' });
    }
    
    try {
        const result = run(
            `INSERT INTO forum_posts (user_id, author_name, author_initials, message) 
             VALUES (?, ?, ?, ?)`,
            [req.user.id, req.user.name, req.user.initials, message.trim()]
        );
        
        const post = get('SELECT * FROM forum_posts WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({ ...post, liked: false });
    } catch (err) {
        console.error('Post yozishda xato:', err);
        res.status(500).json({ error: 'Xabar yozishda xatolik' });
    }
});

// Like/Unlike qilish
router.post('/:id/like', authMiddleware, (req, res) => {
    const postId = parseInt(req.params.id);
    
    const post = get('SELECT id, likes FROM forum_posts WHERE id = ?', [postId]);
    if (!post) {
        return res.status(404).json({ error: 'Post topilmadi' });
    }
    
    const existing = get('SELECT 1 FROM forum_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    
    if (existing) {
        run('DELETE FROM forum_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
        run('UPDATE forum_posts SET likes = MAX(0, likes - 1) WHERE id = ?', [postId]);
        res.json({ liked: false, likes: Math.max(0, post.likes - 1) });
    } else {
        run('INSERT INTO forum_likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
        run('UPDATE forum_posts SET likes = likes + 1 WHERE id = ?', [postId]);
        res.json({ liked: true, likes: post.likes + 1 });
    }
});

// Post o'chirish
router.delete('/:id', authMiddleware, (req, res) => {
    const postId = parseInt(req.params.id);
    
    const post = get('SELECT user_id FROM forum_posts WHERE id = ?', [postId]);
    if (!post) {
        return res.status(404).json({ error: 'Post topilmadi' });
    }
    
    if (post.user_id !== req.user.id) {
        return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    
    run('DELETE FROM forum_likes WHERE post_id = ?', [postId]);
    run('DELETE FROM forum_posts WHERE id = ?', [postId]);
    
    res.json({ message: "✅ Post o'chirildi" });
});

module.exports = router;