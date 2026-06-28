const MealPlan = require('../models/MealPlan');

class MealPlanController {
  static async saveMealPlan(req, res) {
    try {
      const { userId, mealPlan } = req.body;
      if (!Array.isArray(mealPlan)) return res.status(400).json({ error: 'Meal plan must be an array' });
      await MealPlan.saveMealPlan(userId, mealPlan);
      res.json({ message: 'Meal plan saved' });
    } catch (error) {
      console.error('❌ saveMealPlan error:', error.message);
      res.status(500).json({ error: 'Failed to save meal plan', details: error.message });
    }
  }

  static async getMealPlan(req, res) {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const rows = await MealPlan.getMealPlan(userId);
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
      console.error('❌ getMealPlan error:', error.message);
      res.status(500).json({ error: 'Failed to get meal plan', details: error.message });
    }
  }
}

module.exports = MealPlanController;
