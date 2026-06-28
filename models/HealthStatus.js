const db = require('../config/database');

class HealthStatus {
  static async ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS health_status (
        healthStatus_id  INT AUTO_INCREMENT PRIMARY KEY,
        user_id          INT NOT NULL,
        physical_status  VARCHAR(50),
        fitness_status   VARCHAR(50),
        mental_status    VARCHAR(50),
        evaluated_date   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  static async save(userId, physical_status, fitness_status, mental_status) {
    await HealthStatus.ensureTable();
    const [existing] = await db.query('SELECT healthStatus_id FROM health_status WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      await db.query(
        'UPDATE health_status SET physical_status=?, fitness_status=?, mental_status=?, evaluated_date=NOW() WHERE user_id=?',
        [physical_status, fitness_status, mental_status, userId]
      );
    } else {
      await db.query(
        'INSERT INTO health_status (user_id, physical_status, fitness_status, mental_status) VALUES (?, ?, ?, ?)',
        [userId, physical_status, fitness_status, mental_status]
      );
    }
  }

  static async getByUser(userId) {
    await HealthStatus.ensureTable();
    const [rows] = await db.query('SELECT * FROM health_status WHERE user_id = ?', [userId]);
    return rows[0] || null;
  }
}

module.exports = HealthStatus;
