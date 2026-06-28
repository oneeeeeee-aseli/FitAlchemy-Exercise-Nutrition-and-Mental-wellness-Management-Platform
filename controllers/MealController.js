const axios = require('axios');

class MealController {
  // Search — 1 point per call
  static async searchRecipes(req, res) {
    const { query, offset = 0 } = req.query;
    try {
      const response = await axios.get('https://api.spoonacular.com/recipes/complexSearch', {
        params: { apiKey: process.env.SPOONACULAR_API_KEY, query, number: 15, offset }
      });
      res.json(response.data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch recipes', details: err.response?.data?.message || err.message });
    }
  }

  // Recommendations — 9 recipes, no nutrition (cached 24h in browser)
  static async getRecommendedRecipes(req, res) {
    try {
      const response = await axios.get('https://api.spoonacular.com/recipes/random', {
        params: { apiKey: process.env.SPOONACULAR_API_KEY, number: 9, includeNutrition: false }
      });
      res.json(response.data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch recommended recipes', details: err.response?.data?.message || err.message });
    }
  }

  // Recipe details — fetch ONCE with nutrition when user adds a meal.
  // Nutrition is then saved to DB and never fetched again for that meal.
  static async getRecipeDetails(req, res) {
    const { id } = req.params;
    try {
      const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information`, {
        params: { apiKey: process.env.SPOONACULAR_API_KEY, includeNutrition: true }
      });
      res.json(response.data);
    } catch (err) {
      // If nutrition fetch fails, retry without — meal still saves, just no nutrition
      if (err.response?.status === 401 || err.response?.status === 402) {
        try {
          const fallback = await axios.get(`https://api.spoonacular.com/recipes/${id}/information`, {
            params: { apiKey: process.env.SPOONACULAR_API_KEY, includeNutrition: false }
          });
          return res.json(fallback.data);
        } catch (err2) {}
      }
      res.status(500).json({ error: 'Failed to fetch recipe details', details: err.response?.data?.message || err.message });
    }
  }
}

module.exports = MealController;
