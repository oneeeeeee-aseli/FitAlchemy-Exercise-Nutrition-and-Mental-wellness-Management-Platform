const express               = require('express');
const router                = express.Router();
const HealthStatusController = require('../controllers/HealthStatusController');

// Evaluate and save health status (recalculate)
router.get('/health/evaluate', (req, res, next) =>
  HealthStatusController.evaluate(req, res).catch(next)
);

// Get saved health status
router.get('/health/status', (req, res, next) =>
  HealthStatusController.get(req, res).catch(next)
);

module.exports = router;
