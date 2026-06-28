const express = require('express');
const router = express.Router();
const FavoritesController = require('../controllers/FavoritesController');

router.post('/favorites', (req, res, next) => FavoritesController.saveFavorites(req, res).catch(next));
router.get('/favorites',  (req, res, next) => FavoritesController.getFavorites(req, res).catch(next));

module.exports = router;
