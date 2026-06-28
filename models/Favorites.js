const db = require('../config/database');

class Favorites {
  // Save favorites - EXACT code from lines 356-378
  static async saveFavorites(userId, favorites) {
    // Ensure saved_at column exists
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM favorites LIKE 'saved_at'`);
      if (cols.length === 0) await db.query(`ALTER TABLE favorites ADD COLUMN saved_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    } catch(e) { /* ignore */ }

    await db.query('DELETE FROM favorites WHERE user_id = ?', [userId]);
    
    for (const [type, items] of Object.entries(favorites)) {
      for (const item of items) {
        // Convert object to JSON string for MySQL JSON column
        const content = typeof item === 'object' ? JSON.stringify(item) : JSON.stringify({ content: item });
        
        await db.query(
          'INSERT INTO favorites (user_id, type, content, saved_at) VALUES (?, ?, ?, NOW())',
          [userId, type, content]
        );
      }
    }
  }

  // Get favorites - EXACT code from lines 382-404
  static async getFavorites(userId) {
    const [rows] = await db.query('SELECT * FROM favorites WHERE user_id = ?', [userId]);
    // Group by type
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.type]) grouped[row.type] = [];
      // Parse JSON string back to object
      try {
        const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        // Attach saved_at to the item for display
        if (typeof content === 'object') content._saved_at = row.saved_at || null;
        grouped[row.type].push(content);
      } catch (parseError) {
        console.error('Error parsing JSON content:', parseError);
        // If parsing fails, push the raw content
        grouped[row.type].push(row.content);
      }
    }
    return grouped;
  }
}

module.exports = Favorites;
