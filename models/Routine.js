const db = require('../config/database');

class Routine {

  // Safely add a column if it doesn't exist — works on MySQL 5.7+
  static async ensureColumn(table, column, definition) {
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
      if (cols.length === 0) {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`Added column ${column} to ${table}`);
      }
    } catch(e) {
      console.log(`ensureColumn ${column}:`, e.message);
    }
  }

  static async saveRoutine(userId, routine) {
    // Ensure new columns exist before saving
    await Routine.ensureColumn('routines', 'planned_date', 'DATE');
    await Routine.ensureColumn('routines', 'is_completed', 'TINYINT(1) DEFAULT 0');

    // Delete existing routine for user
    await db.query('DELETE FROM routines WHERE user_id = ?', [userId]);

    if (!routine || routine.length === 0) return;

    // Insert one by one — safest approach, avoids bulk INSERT edge cases
    for (const ex of routine) {
      await db.query(
        `INSERT INTO routines
          (user_id, name, description, day, reps, category, image, planned_date, is_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          ex.name         || '',
          ex.description  || '',
          ex.day          || '',
          ex.reps         || 10,
          ex.category     || '',
          ex.image        || null,
      ex.planned_date ? ex.planned_date.toString().split('T')[0] : null,
          ex.is_completed || 0
        ]
      );
    }
  }

  static async getRoutine(userId) {
    const [rows] = await db.query('SELECT * FROM routines WHERE user_id = ?', [userId]);
    return rows;
  }

  static async getByDateRange(userId, startDate, endDate) {
    const [rows] = await db.query(
      'SELECT * FROM routines WHERE user_id = ? AND planned_date BETWEEN ? AND ? ORDER BY planned_date ASC',
      [userId, startDate, endDate]
    );
    return rows;
  }

  static async getByDate(userId, date) {
    const [rows] = await db.query(
      'SELECT * FROM routines WHERE user_id = ? AND planned_date = ? ORDER BY id ASC',
      [userId, date]
    );
    return rows;
  }

  static async markCompleted(id, userId, status) {
    await db.query(
      'UPDATE routines SET is_completed = ? WHERE id = ? AND user_id = ?',
      [status, id, userId]
    );
  }
}

module.exports = Routine;
