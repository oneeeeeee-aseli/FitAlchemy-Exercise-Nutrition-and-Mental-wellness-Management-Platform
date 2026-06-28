const express          = require('express');
const router           = express.Router();
const ReportController = require('../controllers/ReportController');

router.get('/report/daily',              (req, res, next) => ReportController.getDaily(req, res).catch(next));
router.get('/report/weekly',             (req, res, next) => ReportController.getWeekly(req, res).catch(next));
router.patch('/report/workout/complete', (req, res, next) => ReportController.completeWorkout(req, res).catch(next));
router.patch('/report/meal/complete',    (req, res, next) => ReportController.completeMeal(req, res).catch(next));

module.exports = router;
