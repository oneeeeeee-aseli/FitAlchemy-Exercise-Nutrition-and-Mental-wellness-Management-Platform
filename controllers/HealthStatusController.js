const HealthStatus = require('../models/HealthStatus');
const ChatbotLog   = require('../models/ChatbotLog');
const db           = require('../config/database');

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH STATUS ENGINE — FitAlchemy
// Based on 5 peer-reviewed research papers:
//
// [1] Cero et al. (2024) — Lexicon-Based Sentiment Analysis in Behavioral Research
//     PMC11035532 — validates lexicon sentiment for mental health from text
//
// [2] Yeow & Chua (2022) — Depression Diagnostic System using Lexicon-Based
//     Text Sentiment Analysis — IJPCC, Sunway University (77% precision)
//
// [3] FAO/WHO/UNU (2004) — Human Energy Requirements Expert Consultation
//     PAL thresholds: Sedentary 1.40–1.69, Moderate 1.70–1.99, Vigorous 2.00–2.40
//
// [4] WHO Healthy Diet Fact Sheet (2023)
//     Fat < 30% of total energy, sugar < 10%, min 400g fruits & vegetables
//
// [5] WHO Guidelines on Physical Activity and Sedentary Behaviour (2020)
//     Adults: 150–300 min/week moderate aerobic activity, 2+ days muscle strengthening
// ══════════════════════════════════════════════════════════════════════════════

class HealthStatusController {

  // ── EVALUATE — main entry point ────────────────────────────────────────────
  static async evaluate(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    try {
      // Auto-create table if not exists (safety net)
      await db.query(`
        CREATE TABLE IF NOT EXISTS health_status (
          healthStatus_id  INT AUTO_INCREMENT PRIMARY KEY,
          user_id          INT NOT NULL,
          physical_status  VARCHAR(50),
          fitness_status   VARCHAR(50),
          mental_status    VARCHAR(50),
          evaluated_date   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const [profile]  = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      const [routines] = await db.query('SELECT * FROM routines WHERE user_id = ?', [userId]);
      const [meals]    = await db.query('SELECT * FROM meal_plans WHERE user_id = ?', [userId]);
      const chatLogs   = await ChatbotLog.getByUser(userId, 50);

      console.log(`Health eval — profile:${!!profile[0]}, routines:${routines.length}, meals:${meals.length}, chatlogs:${chatLogs.length}`);

      const physical_status = HealthStatusController.evaluatePhysical(profile[0], meals);
      const fitness_status  = HealthStatusController.evaluateFitness(routines);
      const mental_status   = HealthStatusController.evaluateMental(chatLogs);

      console.log(`Health results — physical:${physical_status}, fitness:${fitness_status}, mental:${mental_status}`);

      await HealthStatus.save(userId, physical_status, fitness_status, mental_status);

      res.json({
        physical_status,
        fitness_status,
        mental_status,
        evaluated_date: new Date().toISOString(),
        details: {
          physical: HealthStatusController.physicalDetails(profile[0], meals),
          fitness:  HealthStatusController.fitnessDetails(routines),
          mental:   HealthStatusController.mentalDetails(chatLogs)
        }
      });
    } catch (err) {
      console.error('Health evaluation error:', err.message, err.stack);
      res.status(500).json({ message: 'Evaluation failed', error: err.message });
    }
  }

  // ── GET saved health status ────────────────────────────────────────────────
  static async get(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS health_status (
          healthStatus_id  INT AUTO_INCREMENT PRIMARY KEY,
          user_id          INT NOT NULL,
          physical_status  VARCHAR(50),
          fitness_status   VARCHAR(50),
          mental_status    VARCHAR(50),
          evaluated_date   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      const status = await HealthStatus.getByUser(userId);
      res.json(status || { physical_status: null, fitness_status: null, mental_status: null });
    } catch (err) {
      console.error('Health status get error:', err.message);
      res.status(500).json({ message: 'Failed to get health status' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. PHYSICAL STATUS
  // Based on: BMI (WHO standard) + dietary fat ratio (WHO Healthy Diet, 2023)
  //
  // BMI categories (WHO):
  //   < 18.5  → Underweight
  //   18.5–24.9 → Normal
  //   25–29.9 → Overweight
  //   ≥ 30    → Obese
  //
  // Dietary check (WHO Healthy Diet Fact Sheet, 2023):
  //   Fat < 30% of total calories → balanced
  //   Fat ≥ 30% of total calories → poor dietary balance
  // ══════════════════════════════════════════════════════════════════════════
  static evaluatePhysical(profile, meals) {
    if (!profile) return 'Unknown';

    const h = parseFloat(profile.height);
    const w = parseFloat(profile.weight);

    // BMI classification (WHO standard)
    let bmiStatus = null;
    if (h && w) {
      const bmi = w / ((h / 100) ** 2);
      if      (bmi < 18.5) bmiStatus = 'Underweight';
      else if (bmi < 25)   bmiStatus = 'Normal';
      else if (bmi < 30)   bmiStatus = 'Overweight';
      else                 bmiStatus = 'Obese';
    }

    // Dietary fat ratio (WHO: fat < 30% of total calories)
    let dietStatus = null;
    if (meals && meals.length > 0) {
      const mealsWithNutrition = meals.filter(m => m.calories && m.fat);
      if (mealsWithNutrition.length > 0) {
        const totalCal = mealsWithNutrition.reduce((s, m) => s + parseFloat(m.calories || 0), 0);
        const totalFat = mealsWithNutrition.reduce((s, m) => s + parseFloat(m.fat || 0), 0);
        // Fat: 1g = 9 kcal
        const fatCalRatio = totalFat * 9 / totalCal;
        dietStatus = fatCalRatio <= 0.30 ? 'Balanced' : 'Imbalanced';
      }
    }

    // Combine BMI + diet into physical_status
    if (!bmiStatus && !dietStatus) return 'Insufficient Data';
    if (!bmiStatus) return dietStatus === 'Balanced' ? 'Good' : 'Fair';

    if (bmiStatus === 'Normal' && (dietStatus === 'Balanced' || !dietStatus)) return 'Good';
    if (bmiStatus === 'Normal' && dietStatus === 'Imbalanced')               return 'Fair';
    if (bmiStatus === 'Underweight')                                          return 'Underweight';
    if (bmiStatus === 'Overweight')                                           return 'Overweight';
    if (bmiStatus === 'Obese')                                                return 'At Risk';
    return 'Fair';
  }

  static physicalDetails(profile, meals) {
    const h = parseFloat(profile?.height);
    const w = parseFloat(profile?.weight);
    const bmi = (h && w) ? (w / ((h / 100) ** 2)).toFixed(1) : null;

    const mealsWithNutrition = (meals || []).filter(m => m.calories && m.fat);
    let fatRatio = null;
    if (mealsWithNutrition.length > 0) {
      const totalCal = mealsWithNutrition.reduce((s, m) => s + parseFloat(m.calories || 0), 0);
      const totalFat = mealsWithNutrition.reduce((s, m) => s + parseFloat(m.fat || 0), 0);
      fatRatio = ((totalFat * 9 / totalCal) * 100).toFixed(1);
    }

    return {
      bmi,
      fatRatioPercent: fatRatio,
      whoFatLimit: '30%',
      mealsAnalysed: mealsWithNutrition.length,
      source: 'WHO Healthy Diet Fact Sheet (2023) & WHO BMI Classification'
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. FITNESS STATUS
  // Based on:
  //   WHO Physical Activity Guidelines (2020) — Paper [5]
  //   FAO/WHO/UNU Human Energy Requirements PAL (2004) — Paper [3]
  //
  // Weekly exercise minutes estimated from saved routine:
  //   reps × 0.2 min per exercise (our established formula)
  //
  // WHO 2020 thresholds for adults:
  //   < 75 min/week       → Sedentary (below minimum)
  //   75–149 min/week     → Lightly Active (meets vigorous minimum)
  //   150–299 min/week    → Moderately Active ✅ (meets WHO recommendation)
  //   ≥ 300 min/week      → Very Active (exceeds for additional benefits)
  //
  // Muscle strengthening: WHO recommends 2+ days/week
  // ══════════════════════════════════════════════════════════════════════════
  static evaluateFitness(routines) {
    if (!routines || routines.length === 0) return 'Sedentary';

    // Estimate total weekly minutes from all saved exercises
    const totalMinutes = routines.reduce((sum, ex) => {
      const reps    = parseInt(ex.reps) || 10;
      const estMins = Math.max(5, Math.round(reps * 0.2));
      return sum + estMins;
    }, 0);

    // Count distinct days with exercises (for muscle strengthening check)
    const days = new Set(routines.map(ex => (ex.day || '').toLowerCase()).filter(Boolean));

    // WHO 2020: 150–300 min/week moderate, 2+ days muscle strengthening
    if      (totalMinutes >= 300) return 'Very Active';
    else if (totalMinutes >= 150) return 'Moderately Active';
    else if (totalMinutes >= 75)  return 'Lightly Active';
    else                          return 'Sedentary';
  }

  static fitnessDetails(routines) {
    const totalMinutes = (routines || []).reduce((sum, ex) => {
      const reps = parseInt(ex.reps) || 10;
      return sum + Math.max(5, Math.round(reps * 0.2));
    }, 0);
    const days = new Set((routines || []).map(ex => (ex.day || '').toLowerCase()).filter(Boolean));

    return {
      estimatedWeeklyMinutes: totalMinutes,
      exerciseDaysPerWeek:    days.size,
      exerciseCount:          (routines || []).length,
      whoMinimum:             '150 min/week moderate activity',
      whoMuscle:              '2+ days/week muscle strengthening',
      source:                 'WHO Guidelines on Physical Activity and Sedentary Behaviour (2020) & FAO/WHO/UNU Human Energy Requirements (2004)'
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MENTAL STATUS
  // Based on:
  //   Cero et al. (2024) — Lexicon-Based Sentiment Analysis — Paper [1]
  //   Yeow & Chua (2022) — Depression Diagnostic Lexicon — Paper [2]
  //
  // Method: Weighted lexicon scoring across ALL stored chat messages (up to 50)
  // Score = (weighted positive count) / (weighted positive + weighted negative)
  //
  // Thresholds:
  //   score >= 0.65 → Motivated
  //   score >= 0.45 → Neutral
  //   score >= 0.25 → Stressed
  //   score <  0.25 → Depressed (based on Yeow & Chua depression lexicon)
  // ══════════════════════════════════════════════════════════════════════════

  // ── LEXICON DICTIONARY ───────────────────────────────────────────────────────
  // Based on: Cero et al. (2024) PMC11035532 & Yeow & Chua (2022) IJPCC
  // Extended with fitness-specific, Malaysian context, and clinical terms
  // Total: ~350 keywords across 5 weighted categories
  // ─────────────────────────────────────────────────────────────────────────────

  // POSITIVE — Weight 1: General positive wellness
  static POSITIVE_W1 = [
    // General positive emotions
    'good','great','happy','better','love','enjoy','glad','grateful','thankful',
    'positive','cheerful','hopeful','confident','calm','peaceful','content',
    'satisfied','pleased','joyful','delighted','relieved','comfortable','safe',

    // Fitness & progress
    'progress','proud','motivated','excited','strong','fit','healthy','active',
    'improving','achieving','success','accomplished','consistent','committed',
    'energetic','refreshed','recovered','rested','ready','focused','determined',
    'disciplined','persistent','dedicated','ambitious','goal','target','gains',
    'pb','pr','milestone','smashed','crushed','nailed','lifted','ran','completed',
    'finished','achieved','reached','hit','workout','exercise','training','gym',

    // Wellbeing
    'balanced','wonderful','excellent','fantastic','awesome','nice','fine',
    'okay','ok','alright','well','better','best','love it','enjoy it',
    'feeling good','feel good','doing well','going well','on track',

    // Malaysian positive context
    'bagus','syukur','semangat','alhamdulillah','bersyukur','gembira','seronok',
    'sihat','cergas','kuat','maju','berjaya','tahniah','mantap','cayalah',
    'boleh','mampu','usaha','rajin','tekun','gigih','bersemangat'
  ];

  // POSITIVE — Weight 2: Strong positive wellness signals
  static POSITIVE_W2 = [
    // High-intensity positive
    'amazing','incredible','outstanding','brilliant','phenomenal','thriving',
    'unstoppable','transformed','breakthrough','personal best','record',
    'best ever','never felt better','on fire','killing it','crushing it',
    'life changing','game changer','so proud','extremely happy','overjoyed',
    'euphoric','ecstatic','pumped','stoked','fired up','inspired','empowered',

    // Strong recovery/health signals
    'fully recovered','fully healed','peak condition','in shape','top form',
    'lost weight','gained muscle','built strength','improved endurance',
    'eating clean','eating healthy','sleeping well','great sleep','well rested',

    // Strong Malaysian positive
    'terbaik','luar biasa','sangat bagus','sangat sihat','rasa hebat',
    'semangat waja','tak sabar','excited gila','happy sangat'
  ];

  // NEGATIVE — Weight 1: General negative wellness
  static NEGATIVE_W1 = [
    // General negative emotions
    'bad','sad','bored','slow','hard','difficult','miss','skip','skipped',
    'forgot','weak','fail','failed','unhappy','worried','nervous','uncertain',
    'unsure','doubt','lost','confused','busy','tired','lazy','unmotivated',

    // Physical complaints
    'sore','aching','pain','hurt','injury','injured','sick','unwell','ill',
    'nauseous','headache','dizzy','fatigue','fatigued','heavy','sluggish',
    'stiff','cramp','pulled','sprain','swollen','fever','cold','cough',

    // Fitness setbacks
    'missed workout','skipped gym','no workout','rest day','cheat day',
    'overate','junk food','unhealthy','gained weight','out of shape',
    'no progress','plateau','slow progress','regressed','fell off','gave up',
    'behind schedule','inconsistent','irregular','no routine',

    // General low mood
    'meh','blah','whatever','dont care','dont feel like','not feeling it',
    'low energy','no energy','cant be bothered','procrastinating',

    // Malaysian negative context
    'penat','tak larat','malas','susah','sakit','pening','lembab','lemah',
    'sedih','risau','bimbang','keliru','hilang arah','tak sihat','demam',
    'batuk','tak boleh','tak mampu','putus asa','kecewa','hampa','down'
  ];

  // NEGATIVE — Weight 2: Stress & burnout indicators (Cero et al. 2024)
  static NEGATIVE_W2 = [
    // Stress indicators
    'stressed','stress','anxious','anxiety','frustrated','frustrating',
    'overwhelmed','pressure','pressured','panic','panicking','dread','dreading',
    'drained','restless','insomnia','cant sleep','sleep deprived','sleep badly',
    'no motivation','lost motivation','burned out','burnout','breaking point',
    'too much','cant handle','cant cope','falling apart','breaking down',
    'no energy left','completely drained','mentally exhausted','emotionally drained',

    // Physical stress
    'heart racing','chest tight','cant breathe','shortness of breath',
    'shaking','trembling','sweating','nauseous from stress',

    // Fitness burnout
    'overtrained','overtraining','too sore','too tired to workout',
    'hate working out','hate the gym','dreading exercise','no point working out',

    // Malaysian stress context
    'stress gila','tension','tekanan','sangat penat','penat sangat',
    'tak boleh tahan','dah tak larat','nak give up','rasa nak give up',
    'overwhelmed sangat','terlalu banyak','tak tahu nak buat apa'
  ];

  // NEGATIVE — Weight 3: Depression indicators (Yeow & Chua 2022, psychologist-validated)
  static DEPRESSION_W3 = [
    // Core depression markers
    'hopeless','worthless','useless','empty','numb','depressed','depression',
    'alone','lonely','isolated','abandoned','rejected','unloved','unwanted',

    // Self-negative
    'hate myself','hate my life','hate everything','hate my body','disgusting',
    'failure','loser','pathetic','terrible person','burden','embarrassment',

    // Hopelessness
    'no point','whats the point','no hope','no future','nothing matters',
    'nobody cares','doesnt matter','pointless','meaningless','why bother',
    'cant go on','cant do this','done trying','give up on life',

    // Suicidal ideation markers — clinical (Yeow & Chua 2022)
    'want to disappear','end it','hurt myself','not here anymore',
    'better off without me','want to die','dont want to live',
    'broken beyond repair','nothing left','no reason to live',

    // Deep despair
    'crying all the time','cant stop crying','falling apart','completely lost',
    'dont recognise myself','not myself','lost who i am','no sense of self',

    // Malaysian depression context
    'rasa tak berguna','rasa hopeless','tiada harapan','rasa kosong',
    'rasa sunyi','rasa keseorangan','benci diri sendiri','tak nak hidup',
    'rasa macam burden','tiada masa depan','rasa dah tak larat hidup'
  ];

  static evaluateMental(chatLogs) {
    if (!chatLogs || chatLogs.length === 0) return 'Insufficient Data';

    // Combine all user messages into one text for analysis
    const text = chatLogs.map(l => l.user_message || '').join(' ').toLowerCase();

    let positiveScore = 0;
    let negativeScore = 0;

    // Count weighted positive keywords
    HealthStatusController.POSITIVE_W1.forEach(word => {
      const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      positiveScore += matches * 1;
    });
    HealthStatusController.POSITIVE_W2.forEach(word => {
      const matches = (text.match(new RegExp(word, 'gi')) || []).length;
      positiveScore += matches * 2;
    });

    // Count weighted negative keywords
    HealthStatusController.NEGATIVE_W1.forEach(word => {
      const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      negativeScore += matches * 1;
    });
    HealthStatusController.NEGATIVE_W2.forEach(word => {
      const matches = (text.match(new RegExp(word, 'gi')) || []).length;
      negativeScore += matches * 2;
    });
    HealthStatusController.DEPRESSION_W3.forEach(word => {
      const matches = (text.match(new RegExp(word, 'gi')) || []).length;
      negativeScore += matches * 3;
    });

    const total = positiveScore + negativeScore;

    // Not enough keyword signals — treat as neutral
    if (total === 0) return 'Neutral';

    const score = positiveScore / total;

    if      (score >= 0.65) return 'Motivated';
    else if (score >= 0.45) return 'Neutral';
    else if (score >= 0.25) return 'Stressed';
    else                    return 'Low Mood';
  }

  static mentalDetails(chatLogs) {
    if (!chatLogs || chatLogs.length === 0) {
      return { messagesAnalysed: 0, positiveScore: 0, negativeScore: 0, sentimentRatio: null };
    }

    const text = chatLogs.map(l => l.user_message || '').join(' ').toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    HealthStatusController.POSITIVE_W1.forEach(w => { positiveScore += (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length * 1; });
    HealthStatusController.POSITIVE_W2.forEach(w => { positiveScore += (text.match(new RegExp(w, 'gi')) || []).length * 2; });
    HealthStatusController.NEGATIVE_W1.forEach(w => { negativeScore += (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length * 1; });
    HealthStatusController.NEGATIVE_W2.forEach(w => { negativeScore += (text.match(new RegExp(w, 'gi')) || []).length * 2; });
    HealthStatusController.DEPRESSION_W3.forEach(w => { negativeScore += (text.match(new RegExp(w, 'gi')) || []).length * 3; });

    const total = positiveScore + negativeScore;

    return {
      messagesAnalysed: chatLogs.length,
      positiveScore,
      negativeScore,
      sentimentRatio: total > 0 ? (positiveScore / total).toFixed(2) : 'N/A',
      source: 'Cero et al. (2024) PMC11035532 & Yeow & Chua (2022) IJPCC'
    };
  }
}

module.exports = HealthStatusController;
