require('dotenv').config();
const express = require('express');
const path    = require('path');
const cors    = require('cors');
const db      = require('./config/database');
const app     = express();
const PORT    = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Image proxy for Wger exercise images ────────────────────────────────────
// Fetches images from wger.de server-side, bypassing browser CORS/blocking issues
// Usage: /api/imgproxy?url=https://wger.de/media/...
const axios = require('axios');
app.get('/api/imgproxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://wger.de/')) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FitAlchemy/1.0)' }
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // cache 24h in browser
    res.send(response.data);
  } catch (err) {
    // Return a transparent 1x1 pixel on error so browser doesn't show broken image
    res.status(404).send('Image not found');
  }
});

// ── DB health check ──────────────────────────────────────────────────────────
app.get('/api/dbcheck', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, message: 'Database connected' });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Import routes
const authRoutes      = require('./routes/authRoutes');
const exerciseRoutes  = require('./routes/exerciseRoutes');
const mealRoutes      = require('./routes/mealRoutes');
const quoteRoutes     = require('./routes/quoteRoutes');
const routineRoutes   = require('./routes/routineRoutes');
const mealPlanRoutes  = require('./routes/mealPlanRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const coachRoutes     = require('./routes/coachRoutes');
const healthRoutes    = require('./routes/healthRoutes');
const reportRoutes    = require('./routes/reportRoutes');

// Use routes
app.use('/api', authRoutes);
app.use('/api', exerciseRoutes);
app.use('/api', mealRoutes);
app.use('/api', quoteRoutes);
app.use('/api', routineRoutes);
app.use('/api', mealPlanRoutes);
app.use('/api', favoritesRoutes);
app.use('/api', coachRoutes);
app.use('/api', healthRoutes);
app.use('/api', reportRoutes);

// Serve frontend
app.get('/',                (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/landing.html',    (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/login.html',      (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard.html',  (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/spoonacular.html',(req, res) => res.sendFile(path.join(__dirname, 'views', 'spoonacular.html')));
app.get('/wger.html',       (req, res) => res.sendFile(path.join(__dirname, 'views', 'wger.html')));
app.get('/quote.html',      (req, res) => res.sendFile(path.join(__dirname, 'views', 'quote.html')));
app.get('/profile.html',    (req, res) => res.sendFile(path.join(__dirname, 'views', 'profile.html')));
app.get('/report.html',     (req, res) => res.sendFile(path.join(__dirname, 'views', 'report.html')));

// ── Global JSON error handler (Express 5 requirement) ────────────────────────
// Without this, Express 5 returns an HTML error page on any unhandled async error
// The frontend then gets "Unexpected token '<'" trying to parse HTML as JSON
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err.message);
  res.status(err.status || 500).json({
    error:   err.message || 'Internal server error',
    results: [],
    totalResults: 0
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  db.query('SELECT 1')
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
      console.error('DATABASE CONNECTION FAILED:', err.message);
      console.error('DB_NAME:', process.env.DB_NAME);
      console.error('DB_USER:', process.env.DB_USER);
    });
});
