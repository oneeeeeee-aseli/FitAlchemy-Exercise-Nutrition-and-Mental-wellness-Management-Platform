const express = require('express');
const router = express.Router();
const MealPlanController = require('../controllers/MealPlanController');

router.post('/mealplan', (req, res, next) => MealPlanController.saveMealPlan(req, res).catch(next));
router.get('/mealplan',  (req, res, next) => MealPlanController.getMealPlan(req, res).catch(next));

module.exports = router;
