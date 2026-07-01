// Store reset codes in MySQL database (Railway-compatible)
const db = require('./database');

const resetCodes = {
  async set(email, data) {
    await db.query('DELETE FROM password_resets WHERE email = ?', [email]);
    await db.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
      [email, data.code, data.expiresAt]
    );
  },
  async get(email) {
    const [rows] = await db.query(
      'SELECT code, expires_at FROM password_resets WHERE email = ?',
      [email]
    );
    if (!rows.length) return null;
    return { code: rows[0].code, expiresAt: new Date(rows[0].expires_at) };
  },
  async delete(email) {
    await db.query('DELETE FROM password_resets WHERE email = ?', [email]);
  }
};

module.exports = resetCodes;
