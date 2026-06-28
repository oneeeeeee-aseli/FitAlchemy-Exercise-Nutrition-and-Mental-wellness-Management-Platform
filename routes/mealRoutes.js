const express = require('express');
const router  = express.Router();
const MealController = require('../controllers/MealController');

router.get('/search',         (req, res, next) => MealController.searchRecipes(req, res).catch(next));
router.get('/recipes/search', (req, res, next) => MealController.searchRecipes(req, res).catch(next));
router.get('/recommend',      (req, res, next) => MealController.getRecommendedRecipes(req, res).catch(next));
router.get('/recipe/:id',     (req, res, next) => MealController.getRecipeDetails(req, res).catch(next));

module.exports = router;
