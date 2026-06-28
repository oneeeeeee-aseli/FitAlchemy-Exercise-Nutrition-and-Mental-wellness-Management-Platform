const db = require('../config/database');

class MealPlan {
  static async saveMealPlan(userId, mealPlan) {
    await db.query('DELETE FROM meal_plans WHERE user_id = ?', [userId]);
    for (const meal of mealPlan) {
      await db.query(
        `INSERT INTO meal_plans
          (user_id, recipe_id, title, image, day, meal, source_url,
           calories, protein, carbs, fat, ready_in_minutes, servings,
           ingredients, instructions, planned_date, is_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          meal.recipe_id    || null,
          meal.title        || '',
          meal.image        || '',
          meal.day          || '',
          meal.meal         || '',
          meal.source_url   || '',
          meal.calories     || null,
          meal.protein      || null,
          meal.carbs        || null,
          meal.fat          || null,
          meal.ready_in_minutes || null,
          meal.servings     || null,
          meal.ingredients  || '',
          meal.instructions || '',
          meal.planned_date ? meal.planned_date.toString().split('T')[0] : null,
          meal.is_completed || 0
        ]
      );
    }
  }

  static async getMealPlan(userId) {
    const [rows] = await db.query('SELECT * FROM meal_plans WHERE user_id = ?', [userId]);
    return rows;
  }

  static async getByDateRange(userId, startDate, endDate) {
    const [rows] = await db.query(
      'SELECT * FROM meal_plans WHERE user_id = ? AND planned_date BETWEEN ? AND ? ORDER BY planned_date ASC, meal ASC',
      [userId, startDate, endDate]
    );
    return rows;
  }

  static async getByDate(userId, date) {
    const [rows] = await db.query(
      'SELECT * FROM meal_plans WHERE user_id = ? AND planned_date = ? ORDER BY meal ASC',
      [userId, date]
    );
    return rows;
  }

  static async markCompleted(id, userId, status) {
    await db.query('UPDATE meal_plans SET is_completed = ? WHERE id = ? AND user_id = ?', [status, id, userId]);
  }
}

module.exports = MealPlan;
