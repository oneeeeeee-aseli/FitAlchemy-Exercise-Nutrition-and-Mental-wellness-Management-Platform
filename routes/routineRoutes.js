const express = require('express');
const router = express.Router();
const RoutineController = require('../controllers/RoutineController');

router.post('/routine', (req, res, next) => RoutineController.saveRoutine(req, res).catch(next));
router.get('/routine',  (req, res, next) => RoutineController.getRoutine(req, res).catch(next));

module.exports = router;
