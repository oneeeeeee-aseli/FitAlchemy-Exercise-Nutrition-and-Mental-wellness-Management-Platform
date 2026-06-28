const express    = require('express');
const router     = express.Router();
const CoachAlchemyController = require('../controllers/CoachAlchemyController');
const ChatbotLog = require('../models/ChatbotLog');

// Chat with CoachAlchemy
router.post('/coach', (req, res, next) => CoachAlchemyController.chat(req, res).catch(next));

// Direct save — used by quote assistant mode (frontend logs manually)
router.post('/chatlog/save', async (req, res, next) => {
  try {
    const { userId, userMessage, botResponse } = req.body;
    if (!userId || !userMessage || !botResponse) return res.status(400).json({ message: 'Missing fields' });
    await ChatbotLog.save(userId, userMessage.trim(), botResponse.trim().slice(0, 2000));
    res.json({ message: 'Saved.' });
  } catch (err) { next(err); }
});

// Get chat history for a user
router.get('/chatlog', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const logs = await ChatbotLog.getByUser(userId);
    res.json(logs);
  } catch (err) { next(err); }
});

// Clear all chat history for a user
router.delete('/chatlog', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    await ChatbotLog.clearByUser(userId);
    res.json({ message: 'Chat history cleared.' });
  } catch (err) { next(err); }
});

module.exports = router;
