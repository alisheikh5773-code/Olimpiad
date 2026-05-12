// backend/db.js - demo qismsiz versiya
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'olimpiada.db');
let db;

function saveDb() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
    db.run(sql, params);
    saveDb();
    const stmt = db.prepare("SELECT last_insert_rowid() as id");
    stmt.step();
    const lastId = stmt.getAsObject().id;
    stmt.free();
    return { lastInsertRowid: lastId };
}

function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return undefined;
}

function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

async function initDb() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('📁 Mavjud ma\'lumotlar bazasi yuklandi');
    } else {
        db = new SQL.Database();
        console.log('🆕 Yangi ma\'lumotlar bazasi yaratildi');
    }

    // Jadvallarni yaratish
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        class TEXT NOT NULL,
        city TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        challenge_id INTEGER DEFAULT 0,
        challenge_name TEXT NOT NULL,
        wpm INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        errors INTEGER DEFAULT 0,
        keystrokes INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 60,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        author_name TEXT NOT NULL,
        author_initials TEXT NOT NULL,
        message TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS forum_likes (
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES forum_posts(id)
    )`);

    // Indexes
    db.run("CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_scores_wpm ON scores(wpm DESC)");
    db.run("CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC)");
    
    saveDb();

    // ⚠️ DEMO MA'LUMOTLAR YO'Q - faqat bo'sh baza
    console.log('✅ Ma\'lumotlar bazasi tayyor (faqat real foydalanuvchilar)');
}

module.exports = { initDb, run, get, all, saveDb };