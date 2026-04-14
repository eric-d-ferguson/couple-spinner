const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const os = require('os');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'couple-spinner-secret-' + Math.random().toString(36),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// --- Auth routes ---

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = db.getUserByUsername(username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.user = { id: user.id, username: user.username };
  res.json({ username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.user.username });
});

// --- Wheels & options routes ---

app.get('/api/wheels', requireAuth, (req, res) => {
  res.json(db.getWheelsWithOptions());
});

app.post('/api/wheels/:id/options', requireAuth, (req, res) => {
  const wheelId = parseInt(req.params.id, 10);
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Option text is required' });
  if (text.length > 80) return res.status(400).json({ error: 'Option text too long (max 80 chars)' });

  const option = db.addOption(wheelId, text, req.session.user.username);
  res.status(201).json(option);
});

app.delete('/api/options/:id', requireAuth, (req, res) => {
  const optionId = parseInt(req.params.id, 10);
  const option = db.getOption(optionId);
  if (!option) return res.status(404).json({ error: 'Option not found' });

  db.deleteOption(optionId);
  res.json({ ok: true });
});

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: redirect root to login
app.get('/', (req, res) => res.redirect('/login.html'));

// --- Start ---
app.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address;
        break;
      }
    }
  }
  console.log('\n🎡 Couple Spinner is running!');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}  ← share this with your partner`);
  console.log('\n   Default logins:');
  console.log('     username: partner1  password: partner1');
  console.log('     username: partner2  password: partner2\n');
});
