const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "pay-to-unlock.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'published',
        image TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id INTEGER NOT NULL,
        payment_id TEXT NOT NULL UNIQUE,
        order_id TEXT NOT NULL,
        amount REAL NOT NULL,
        purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (photo_id)
        REFERENCES photos(id)
        ON DELETE CASCADE
    );
`);

console.log("SQLite database connected successfully! ✅");

module.exports = db;