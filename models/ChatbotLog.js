const db = require('../config/database');

class ChatbotLog {
  // Save one exchange — auto-prune to keep only latest 50 per user
  static async save(userId, userMessage, botResponse) {
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS chatbot_logs (
        log_id        INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT NOT NULL,
        user_message  TEXT NOT NULL,
        bot_response  TEXT NOT NULL,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(
      'INSERT INTO chatbot_logs (user_id, user_message, bot_response) VALUES (?, ?, ?)',
      [userId, userMessage, botResponse]
    );
    // Delete oldest if over 50
    await db.query(
      `DELETE FROM chatbot_logs WHERE user_id = ? AND log_id NOT IN (
        SELECT log_id FROM (
          SELECT log_id FROM chatbot_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50
        ) AS t
      )`,
      [userId, userId]
    );
  }

  // Get history for a user — newest first
  static async getByUser(userId, limit = 50) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS chatbot_logs (
        log_id        INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT NOT NULL,
        user_message  TEXT NOT NULL,
        bot_response  TEXT NOT NULL,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const [rows] = await db.query(
      'SELECT * FROM chatbot_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, parseInt(limit)]
    );
    return rows;
  }

  // Clear all history for a user
  static async clearByUser(userId) {
    await db.query('DELETE FROM chatbot_logs WHERE user_id = ?', [userId]);
  }
}

module.exports = ChatbotLog;
