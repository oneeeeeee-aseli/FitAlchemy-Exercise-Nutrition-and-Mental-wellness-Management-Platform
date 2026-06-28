const express = require('express');
const router  = express.Router();
const QuoteController = require('../controllers/QuoteController');

router.get('/quote',        (req, res, next) => QuoteController.getRandomQuote(req, res).catch(next));
router.get('/quote/batch',  (req, res, next) => QuoteController.getQuoteBatch(req, res).catch(next));
router.get('/quote/search', (req, res, next) => QuoteController.getQuoteByTag(req, res).catch(next));

module.exports = router;
