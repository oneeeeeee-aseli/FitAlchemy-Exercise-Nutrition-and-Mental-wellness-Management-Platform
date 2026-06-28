const Favorites = require('../models/Favorites');

class FavoritesController {
  static async saveFavorites(req, res) {
    try {
      const { userId, favorites } = req.body;
      if (typeof favorites !== 'object') return res.status(400).json({ error: 'Favorites must be an object' });
      await Favorites.saveFavorites(userId, favorites);
      res.json({ message: 'Favorites saved' });
    } catch (error) {
      console.error('❌ saveFavorites error:', error.message);
      res.status(500).json({ error: 'Failed to save favorites', details: error.message });
    }
  }

  static async getFavorites(req, res) {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const grouped = await Favorites.getFavorites(userId);
      res.json(grouped);
    } catch (error) {
      console.error('❌ getFavorites error:', error.message);
      res.status(500).json({ error: 'Failed to fetch favorites', details: error.message });
    }
  }
}

module.exports = FavoritesController;
