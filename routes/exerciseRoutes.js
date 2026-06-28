const express = require('express');
const router  = express.Router();
const ExerciseController = require('../controllers/ExerciseController');

router.get('/exercises', (req, res, next) => {
  ExerciseController.getExercises(req, res).catch(next);
});

// ── CALORIE BURN ESTIMATOR ────────────────────────────────────────────────────
const axios = require('axios');

// Map exercise keywords → valid API Ninjas activity names
function mapToApiActivity(input) {
  const s = input.toLowerCase();

  if (/bench|chest press|push.?up|pec|incline press/.test(s))       return 'weight lifting';
  if (/squat|leg press|lunge|quad|hamstring/.test(s))                return 'squats';
  if (/deadlift|row|pull.?up|lat|back|rhomboid/.test(s))            return 'weight lifting';
  if (/curl|bicep|tricep|dip|arm|forearm/.test(s))                  return 'weight lifting';
  if (/shoulder|delt|overhead|military press/.test(s))              return 'weight lifting';
  if (/sit.?up|crunch|abs|core|plank|bird.?dog/.test(s))            return 'calisthenics';
  if (/calf|calves|leg extension|leg curl/.test(s))                 return 'weight lifting';
  if (/cardio|run|jog|sprint/.test(s))                              return 'running';
  if (/swim/.test(s))                                               return 'swimming';
  if (/bike|cycling|cycle/.test(s))                                 return 'bicycling';
  if (/yoga|stretch|flexibility/.test(s))                           return 'yoga';
  if (/hiit|circuit|crossfit/.test(s))                              return 'calisthenics';
  if (/walk/.test(s))                                               return 'walking';
  if (/jump|box jump|jumping jack/.test(s))                         return 'calisthenics';
  if (/rowing machine|row machine/.test(s))                         return 'rowing';
  if (/weight|lift|strength|gym|barbell|dumbbell|machine/.test(s))  return 'weight lifting';

  // Try the raw input as-is first, fall back to weight lifting
  return input;
}

router.get('/calories', async (req, res) => {
  const { activity, duration = 30 } = req.query;
  if (!activity) return res.status(400).json({ error: 'Activity is required' });

  const mappedActivity = mapToApiActivity(activity);
  console.log(`🔥 Calorie estimate: "${activity}" → "${mappedActivity}" for ${duration} min`);

  try {
    const response = await axios.get('https://api.api-ninjas.com/v1/caloriesburned', {
      params:  { activity: mappedActivity, duration },
      headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
      timeout: 6000
    });

    if (!response.data || response.data.length === 0) {
      // Final fallback — weight lifting always works
      const fallback = await axios.get('https://api.api-ninjas.com/v1/caloriesburned', {
        params:  { activity: 'weight lifting', duration },
        headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        timeout: 6000
      });
      return res.json(fallback.data);
    }

    res.json(response.data);
  } catch (err) {
    console.error('Calorie burn error:', err.message);
    res.status(500).json({ error: 'Could not fetch calorie data.' });
  }
});

module.exports = router;
