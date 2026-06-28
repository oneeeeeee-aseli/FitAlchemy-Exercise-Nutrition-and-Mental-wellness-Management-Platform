const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async register(email, password) {
    const hashed = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed]);
  }

  static async findByEmail(email) {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users;
  }

  static async findById(id) {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return users[0] || null;
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async updatePassword(email, hashedPassword) {
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
  }

  static async getProfile(userId) {
    const [rows] = await db.query(
      'SELECT id, email, full_name, age, height, weight, fitness_goal, dietary_preference, profile_image, created_at FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  static async updateProfile(userId, data) {
    const { full_name, age, height, weight, fitness_goal, dietary_preference } = data;
    // Ensure columns are wide enough for multiple selections
    try {
      await db.query(`ALTER TABLE users MODIFY COLUMN fitness_goal VARCHAR(200)`);
      await db.query(`ALTER TABLE users MODIFY COLUMN dietary_preference VARCHAR(200)`);
    } catch(e) { /* already correct size */ }
    await db.query(
      `UPDATE users SET full_name=?, age=?, height=?, weight=?, fitness_goal=?, dietary_preference=? WHERE id=?`,
      [full_name || null, age || null, height || null, weight || null, fitness_goal || null, dietary_preference || null, userId]
    );
  }

  static async saveProfileImage(userId, imageBase64) {
    await db.query('UPDATE users SET profile_image=? WHERE id=?', [imageBase64, userId]);
  }

  static async getProfileImage(userId) {
    const [rows] = await db.query('SELECT profile_image FROM users WHERE id=?', [userId]);
    return rows[0]?.profile_image || null;
  }
}

module.exports = User;
