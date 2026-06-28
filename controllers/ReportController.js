const db = require('../config/database');

// Convert MySQL DATE objects to YYYY-MM-DD strings (avoids UTC timezone shift)
function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.getFullYear() + '-' +
      String(val.getMonth()+1).padStart(2,'0') + '-' +
      String(val.getDate()).padStart(2,'0');
  }
  return String(val).split('T')[0];
}

function cleanDates(rows) {
  return rows.map(r => ({ ...r, planned_date: toDateString(r.planned_date) }));
}

class ReportController {

  // ── GET /api/report/daily?userId=&date= ──────────────────────────────────
  static async getDaily(req, res) {
    const { userId, date } = req.query;
    if (!userId || !date) return res.status(400).json({ message: 'userId and date required' });

    try {
      // Ensure columns exist
      try {
        await db.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS planned_date DATE`);
        await db.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_completed TINYINT(1) DEFAULT 0`);
        await db.query(`ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS planned_date DATE`);
        await db.query(`ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_completed TINYINT(1) DEFAULT 0`);
      } catch(e) { /* columns already exist */ }
      let [workouts] = await db.query(
        'SELECT * FROM routines WHERE user_id = ? AND planned_date = ?',
        [userId, date]
      );
      let [meals] = await db.query(
        'SELECT * FROM meal_plans WHERE user_id = ? AND planned_date = ?',
        [userId, date]
      );

      // Calculate workout metrics
      const totalWorkouts    = workouts.length;
      const completedWorkouts = workouts.filter(w => w.is_completed).length;
      const totalWorkoutMin  = workouts.reduce((s, w) => s + Math.max(5, Math.round((parseInt(w.reps) || 10) * 0.2)), 0);
      const totalCalsBurnt   = workouts.reduce((s, w) => {
        const reps = parseInt(w.reps) || 10;
        const mins = Math.max(5, Math.round(reps * 0.2));
        return s + (mins * 5); // ~5 kcal/min average
      }, 0);

      // Calculate meal metrics
      const totalMeals    = meals.length;
      const completedMeals = meals.filter(m => m.is_completed).length;
      const totalCalsIn   = meals.reduce((s, m) => s + (parseFloat(m.calories) || 0), 0);
      const totalProtein  = meals.reduce((s, m) => s + (parseFloat(m.protein)  || 0), 0);
      const totalCarbs    = meals.reduce((s, m) => s + (parseFloat(m.carbs)    || 0), 0);
      const totalFat      = meals.reduce((s, m) => s + (parseFloat(m.fat)      || 0), 0);

      res.json({
        date,
        workouts: {
          total:     totalWorkouts,
          completed: completedWorkouts,
          skipped:   totalWorkouts - completedWorkouts,
          minutes:   totalWorkoutMin,
          caloriesBurnt: Math.round(totalCalsBurnt),
          items:     workouts
        },
        meals: {
          total:     totalMeals,
          completed: completedMeals,
          skipped:   totalMeals - completedMeals,
          caloriesIn:  Math.round(totalCalsIn),
          protein:     Math.round(totalProtein),
          carbs:       Math.round(totalCarbs),
          fat:         Math.round(totalFat),
          items:       meals
        },
        balance: {
          netCalories: Math.round(totalCalsIn - totalCalsBurnt),
          fatRatioPct: totalCalsIn > 0 ? ((totalFat * 9 / totalCalsIn) * 100).toFixed(1) : null
        }
      });
    } catch (err) {
      console.error('Daily report error:', err.message);
      res.status(500).json({ message: 'Failed to generate daily report' });
    }
  }

  // ── GET /api/report/weekly?userId=&weekStart= ─────────────────────────────
  static async getWeekly(req, res) {
    const { userId, weekStart } = req.query;
    if (!userId || !weekStart) return res.status(400).json({ message: 'userId and weekStart required' });

    try {
      // Calculate week end (7 days)
      const start   = new Date(weekStart);
      const end     = new Date(start);
      end.setDate(end.getDate() + 6);
      const weekEnd = end.toISOString().split('T')[0];

      const [workouts] = await db.query(
        'SELECT * FROM routines WHERE user_id = ? AND planned_date BETWEEN ? AND ? ORDER BY planned_date ASC',
        [userId, weekStart, weekEnd]
      );
      const [meals] = await db.query(
        'SELECT * FROM meal_plans WHERE user_id = ? AND planned_date BETWEEN ? AND ? ORDER BY planned_date ASC',
        [userId, weekStart, weekEnd]
      );

      // Weekly workout metrics
      const totalWorkouts     = workouts.length;
      const completedWorkouts = workouts.filter(w => w.is_completed).length;
      const totalWorkoutMin   = workouts.reduce((s, w) => s + Math.max(5, Math.round((parseInt(w.reps) || 10) * 0.2)), 0);
      const totalCalsBurnt    = workouts.reduce((s, w) => {
        const mins = Math.max(5, Math.round((parseInt(w.reps) || 10) * 0.2));
        return s + (mins * 5);
      }, 0);

      // Weekly meal metrics
      const totalMeals      = meals.length;
      const completedMeals  = meals.filter(m => m.is_completed).length;
      const totalCalsIn     = meals.reduce((s, m) => s + (parseFloat(m.calories) || 0), 0);
      const totalProtein    = meals.reduce((s, m) => s + (parseFloat(m.protein)  || 0), 0);
      const totalCarbs      = meals.reduce((s, m) => s + (parseFloat(m.carbs)    || 0), 0);
      const totalFat        = meals.reduce((s, m) => s + (parseFloat(m.fat)      || 0), 0);

      // Build daily breakdown
      function toDateStr(val) {
        if (!val) return '';
        if (val instanceof Date) {
          return val.getFullYear() + '-' +
            String(val.getMonth()+1).padStart(2,'0') + '-' +
            String(val.getDate()).padStart(2,'0');
        }
        return String(val).split('T')[0];
      }

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr     = d.toISOString().split('T')[0];
        const dayWorkouts = workouts.filter(w => toDateStr(w.planned_date) === dateStr);
        const dayMeals    = meals.filter(m => toDateStr(m.planned_date) === dateStr);
        const dayMins     = dayWorkouts.reduce((s, w) => s + Math.max(5, Math.round((parseInt(w.reps)||10)*0.2)), 0);
        const dayCals     = dayMeals.reduce((s, m) => s + (parseFloat(m.calories)||0), 0);
        days.push({
          date:      dateStr,
          dayName:   d.toLocaleDateString('en-MY', { weekday: 'short' }),
          workouts:  dayWorkouts.length,
          workoutMin: dayMins,
          meals:     dayMeals.length,
          caloriesIn: Math.round(dayCals),
          calsBurnt:  Math.round(dayWorkouts.reduce((s,w) => s + Math.max(5,Math.round((parseInt(w.reps)||10)*0.2))*5, 0))
        });
      }

      // WHO comparison
      const whoMinTarget    = 150;
      const whoMeetTarget   = totalWorkoutMin >= whoMinTarget;
      const activeDays      = days.filter(d => d.workouts > 0).length;

      // Consistency score (0-100)
      const workoutScore  = Math.min(100, (totalWorkoutMin / whoMinTarget) * 50);
      const mealScore     = Math.min(50, (completedMeals / Math.max(1, totalMeals)) * 50);
      const consistencyScore = Math.round(workoutScore + mealScore);

      res.json({
        weekStart, weekEnd,
        summary: {
          workouts: {
            total:     totalWorkouts,
            completed: completedWorkouts,
            totalMinutes: totalWorkoutMin,
            caloriesBurnt: Math.round(totalCalsBurnt),
            whoTarget:     whoMinTarget,
            whoMet:        whoMeetTarget,
            activeDays
          },
          meals: {
            total:      totalMeals,
            completed:  completedMeals,
            caloriesIn: Math.round(totalCalsIn),
            protein:    Math.round(totalProtein),
            carbs:      Math.round(totalCarbs),
            fat:        Math.round(totalFat),
            avgDailyCalories: Math.round(totalCalsIn / 7)
          },
          consistency: {
            score: consistencyScore,
            label: consistencyScore >= 80 ? 'Excellent' :
                   consistencyScore >= 60 ? 'Good' :
                   consistencyScore >= 40 ? 'Fair' : 'Needs Improvement'
          }
        },
        dailyBreakdown: days
      });
    } catch (err) {
      console.error('Weekly report error:', err.message);
      res.status(500).json({ message: 'Failed to generate weekly report' });
    }
  }

  // ── PATCH /api/report/workout/complete ────────────────────────────────────
  static async completeWorkout(req, res) {
    const { userId, id, status } = req.body;
    if (!userId || !id) return res.status(400).json({ message: 'userId and id required' });
    try {
      await db.query('UPDATE routines SET is_completed = ? WHERE id = ? AND user_id = ?', [status ? 1 : 0, id, userId]);
      res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ message: 'Failed to update' }); }
  }

  // ── PATCH /api/report/meal/complete ───────────────────────────────────────
  static async completeMeal(req, res) {
    const { userId, id, status } = req.body;
    if (!userId || !id) return res.status(400).json({ message: 'userId and id required' });
    try {
      await db.query('UPDATE meal_plans SET is_completed = ? WHERE id = ? AND user_id = ?', [status ? 1 : 0, id, userId]);
      res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ message: 'Failed to update' }); }
  }
}

module.exports = ReportController;
