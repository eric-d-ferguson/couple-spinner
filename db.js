const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'spinner.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wheels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wheel_id INTEGER NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    added_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash1 = bcrypt.hashSync('partner1', 10);
    const hash2 = bcrypt.hashSync('partner2', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('partner1', hash1);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('partner2', hash2);
    console.log('  Created users: partner1 / partner2 (passwords same as username)');
  }

  const wheelCount = db.prepare('SELECT COUNT(*) as c FROM wheels').get().c;
  if (wheelCount === 0) {
    const insertWheel = db.prepare('INSERT INTO wheels (name, emoji, sort_order) VALUES (?, ?, ?)');
    const insertOption = db.prepare('INSERT INTO options (wheel_id, text, added_by) VALUES (?, ?, ?)');

    const food = insertWheel.run('Food', '🍕', 1).lastInsertRowid;
    for (const item of ['Pizza', 'Sushi', 'Tacos', 'Burgers', 'Thai', 'Italian', 'Mexican', 'Indian', 'Ramen', 'BBQ']) {
      insertOption.run(food, item, 'system');
    }

    const activity = insertWheel.run('Activity', '🎲', 2).lastInsertRowid;
    for (const item of ['Movie night', 'Board game', 'Cook together', 'Walk outside', 'Bowling', 'Mini golf', 'Stay in & chill', 'Try a new recipe', 'Game night', 'Karaoke']) {
      insertOption.run(activity, item, 'system');
    }

    const intimacy = insertWheel.run('Intimacy', '💕', 3).lastInsertRowid;
    for (const item of ['Slow dance', 'Give massages', 'Watch a sunset', 'Write each other notes', 'Pick a new show together', 'Stargazing', 'Cook a fancy dinner', 'Photo walk']) {
      insertOption.run(intimacy, item, 'system');
    }

    console.log('  Seeded 3 wheels with default options');
  }
}

seed();

module.exports = {
  getUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  getWheelsWithOptions() {
    const wheels = db.prepare('SELECT * FROM wheels ORDER BY sort_order').all();
    const getOptions = db.prepare('SELECT * FROM options WHERE wheel_id = ? ORDER BY created_at');
    return wheels.map(w => ({ ...w, options: getOptions.all(w.id) }));
  },

  addOption(wheelId, text, addedBy) {
    const stmt = db.prepare('INSERT INTO options (wheel_id, text, added_by) VALUES (?, ?, ?)');
    const result = stmt.run(wheelId, text, addedBy);
    return db.prepare('SELECT * FROM options WHERE id = ?').get(result.lastInsertRowid);
  },

  deleteOption(optionId) {
    return db.prepare('DELETE FROM options WHERE id = ?').run(optionId);
  },

  getOption(optionId) {
    return db.prepare('SELECT * FROM options WHERE id = ?').get(optionId);
  },
};
