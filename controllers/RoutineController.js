const Routine = require('../models/Routine');

class RoutineController {
  static async saveRoutine(req, res) {
    try {
      const { userId, routine } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      if (!Array.isArray(routine)) return res.status(400).json({ error: 'Routine must be an array' });
      console.log(`Saving routine for user ${userId} — ${routine.length} exercises`);
      await Routine.saveRoutine(userId, routine);
      res.json({ message: 'Routine saved' });
    } catch (error) {
      console.error('saveRoutine error:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to save routine', details: error.message });
    }
  }

  static async getRoutine(req, res) {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const rows = await Routine.getRoutine(userId);
      // Convert planned_date Date objects to YYYY-MM-DD strings to avoid UTC shift on frontend
      const cleaned = rows.map(r => ({
        ...r,
        planned_date: r.planned_date
          ? (r.planned_date instanceof Date
              ? r.planned_date.getFullYear() + '-' + String(r.planned_date.getMonth()+1).padStart(2,'0') + '-' + String(r.planned_date.getDate()).padStart(2,'0')
              : String(r.planned_date).split('T')[0])
          : null
      }));
      res.json(cleaned);
    } catch (error) {
      console.error('❌ getRoutine error:', error.message);
      res.status(500).json({ error: 'Failed to get routine', details: error.message });
    }
  }
}

module.exports = RoutineController;
