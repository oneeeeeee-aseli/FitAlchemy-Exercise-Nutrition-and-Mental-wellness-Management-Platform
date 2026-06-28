const axios = require('axios');

// ── Fallback exercises with reliable image URLs (Wikipedia Commons / public domain) ──
const FALLBACK_EXERCISES = [
  { id: 1,  name: 'Push-up',           description: 'Start in a plank position with hands shoulder-width apart. Lower your body until your chest nearly touches the floor, keeping your body straight. Push back up to the starting position. Keep your core tight throughout the movement.', category: 'Chest',     equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Push_up_-_multiple.jpg/320px-Push_up_-_multiple.jpg' },
  { id: 2,  name: 'Pull-up',           description: 'Hang from a bar with palms facing away, hands shoulder-width apart. Pull yourself up until your chin clears the bar, squeezing your shoulder blades together. Lower yourself slowly back to the starting position.', category: 'Back',      equipment: ['Pull-up bar'],      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Pull_up_-_push_up_woman_1.jpg/320px-Pull_up_-_push_up_woman_1.jpg' },
  { id: 3,  name: 'Squat',             description: 'Stand with feet shoulder-width apart, toes slightly turned out. Push your hips back and bend your knees, lowering until your thighs are parallel to the floor. Keep your chest up and knees tracking over your toes. Drive through your heels to stand back up.', category: 'Legs',      equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Squats.jpg/320px-Squats.jpg' },
  { id: 4,  name: 'Plank',             description: 'Start in a push-up position. Lower onto your forearms so your elbows are directly under your shoulders. Keep your body in a straight line from head to heels. Engage your core, glutes and quads. Hold the position without letting your hips sag or rise.', category: 'Abs',       equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Plank_-_static_exercise.jpg/320px-Plank_-_static_exercise.jpg' },
  { id: 5,  name: 'Dumbbell Curl',     description: 'Stand holding a dumbbell in each hand, arms fully extended at your sides. Keeping your upper arms stationary, curl the weights up towards your shoulders by contracting your biceps. Squeeze at the top, then slowly lower back to the starting position.', category: 'Arms',      equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bicep_curl.jpg/320px-Bicep_curl.jpg' },
  { id: 6,  name: 'Shoulder Press',    description: 'Sit or stand holding dumbbells at shoulder height, palms facing forward. Press the weights directly overhead until your arms are fully extended. Pause briefly at the top, then lower the weights back to shoulder height in a controlled manner.', category: 'Shoulders', equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dumbbell_Military_Press.jpg/320px-Dumbbell_Military_Press.jpg' },
  { id: 7,  name: 'Calf Raise',        description: 'Stand with feet hip-width apart, toes pointing forward. Rise up onto the balls of your feet as high as possible, squeezing your calf muscles at the top. Hold briefly, then slowly lower your heels back to the floor. You can hold a wall for balance.', category: 'Calves',    equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Standing_Calf_Raises.jpg/320px-Standing_Calf_Raises.jpg' },
  { id: 8,  name: 'Running',           description: 'Maintain a steady pace with upright posture and relaxed shoulders. Land midfoot beneath your hips, not in front of you. Keep your arms bent at 90 degrees and swing them forward, not across your body. Breathe rhythmically and maintain a consistent cadence.', category: 'Cardio',    equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kasarani_stadium_running_track.jpg/320px-Kasarani_stadium_running_track.jpg' },
  { id: 9,  name: 'Bench Press',       description: 'Lie on a flat bench with feet flat on the floor. Grip the bar slightly wider than shoulder-width. Unrack the bar and lower it slowly to your mid-chest. Press the bar back up in a slight arc until your arms are fully extended. Keep your back flat and shoulder blades pinched together.', category: 'Chest',     equipment: ['Barbell', 'Bench'], image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bench_press_-_bench_position.jpg/320px-Bench_press_-_bench_position.jpg' },
  { id: 10, name: 'Deadlift',          description: 'Stand with feet hip-width apart, bar over mid-foot. Hinge at the hips and bend your knees to grip the bar just outside your legs. Keep your back flat and chest up. Drive through your legs and hips to lift the bar, keeping it close to your body. Stand fully upright at the top.', category: 'Back',      equipment: ['Barbell'],          image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Conventional_deadlift.jpg/320px-Conventional_deadlift.jpg' },
  { id: 11, name: 'Lunge',             description: 'Stand with feet together. Step forward with one leg and lower your hips until both knees are bent at approximately 90 degrees. Your front knee should be directly above your ankle. Push back to the starting position and repeat with the other leg.', category: 'Legs',      equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Lunge.jpg/320px-Lunge.jpg' },
  { id: 12, name: 'Crunch',            description: 'Lie on your back with knees bent and feet flat on the floor. Place your hands behind your head without pulling on your neck. Contract your abs to lift your shoulders and upper back off the floor. Hold briefly at the top, then slowly lower back down.', category: 'Abs',       equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Abdominales.jpg/320px-Abdominales.jpg' },
  { id: 13, name: 'Tricep Dip',        description: 'Sit on the edge of a bench or chair with hands gripping the edge beside your hips. Slide your bottom off the seat and lower your body by bending your elbows to 90 degrees, keeping your back close to the bench. Press back up to the starting position.', category: 'Arms',      equipment: ['Bench'],            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Dips_auszubildende.jpg/320px-Dips_auszubildende.jpg' },
  { id: 14, name: 'Lateral Raise',     description: 'Stand holding dumbbells at your sides, palms facing inward. With a slight bend in your elbows, raise your arms out to the sides until they are parallel to the floor, forming a T shape. Pause at the top, then slowly lower the weights back to your sides.', category: 'Shoulders', equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Deltoid_raises.jpg/320px-Deltoid_raises.jpg' },
  { id: 15, name: 'Burpee',            description: 'Stand with feet shoulder-width apart. Drop into a squat and place your hands on the floor. Jump or step your feet back into a plank position. Perform a push-up. Jump or step your feet back towards your hands. Explosively jump up with arms overhead.', category: 'Cardio',    equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Burpee_-_wikipedia.jpg/320px-Burpee_-_wikipedia.jpg' },
  { id: 16, name: 'Leg Raise',         description: 'Lie flat on your back with legs straight and hands at your sides or under your lower back for support. Keeping your legs straight, raise them until they are perpendicular to the floor. Slowly lower them back down without touching the floor.', category: 'Abs',       equipment: [],                   image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Leg_raise.jpg/320px-Leg_raise.jpg' },
  { id: 17, name: 'Hammer Curl',       description: 'Stand holding dumbbells at your sides with palms facing each other (neutral grip). Keeping your upper arms stationary, curl the weights up towards your shoulders. The neutral grip targets both the biceps and brachialis muscles. Lower slowly back to starting position.', category: 'Arms',      equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bicep_curl.jpg/320px-Bicep_curl.jpg' },
  { id: 18, name: 'Hip Thrust',        description: 'Sit on the floor with your upper back against a bench. Place a barbell or weight across your hips. Plant your feet flat on the floor, hip-width apart. Drive your hips upward by squeezing your glutes until your body forms a straight line from shoulders to knees. Lower back down.', category: 'Legs',      equipment: ['Barbell', 'Bench'], image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Squats.jpg/320px-Squats.jpg' },
  { id: 19, name: 'Arnold Press',      description: 'Sit holding dumbbells at shoulder height with palms facing towards you and elbows bent. As you press the weights overhead, rotate your palms to face outward at the top. Reverse the rotation as you lower the weights back to the starting position.', category: 'Shoulders', equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dumbbell_Military_Press.jpg/320px-Dumbbell_Military_Press.jpg' },
  { id: 20, name: 'Seated Calf Raise', description: 'Sit on a bench with a dumbbell or weight plate on your knees, balls of your feet on an elevated surface. Lower your heels as far as comfortable, then rise up onto the balls of your feet as high as possible. Hold briefly at the top, then lower slowly.', category: 'Calves',    equipment: ['Dumbbell'],         image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Standing_Calf_Raises.jpg/320px-Standing_Calf_Raises.jpg' },
  { id: 21, name: 'Incline Push-up',   description: 'Place your hands on an elevated surface like a bench or step, slightly wider than shoulder-width. Keep your body in a straight line from head to heels. Lower your chest toward the surface, then push back up. This variation targets the lower portion of the chest.', category: 'Chest',     equipment: ['Bench'],            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Push_up_-_multiple.jpg/320px-Push_up_-_multiple.jpg' },
  { id: 22, name: 'Seated Row',        description: 'Sit at the cable machine with feet on the platform and knees slightly bent. Grip the handle and sit up straight. Pull the handle toward your lower abdomen, squeezing your shoulder blades together. Slowly extend your arms back to the starting position.', category: 'Back',      equipment: ['Cable machine'],    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Conventional_deadlift.jpg/320px-Conventional_deadlift.jpg' },
  { id: 23, name: 'Jump Rope',         description: 'Hold one handle in each hand with the rope behind you. Swing the rope overhead and jump over it as it passes under your feet. Land softly on the balls of your feet. Keep your elbows close to your body and use your wrists to turn the rope, not your whole arms.', category: 'Cardio',    equipment: ['Jump rope'],        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kasarani_stadium_running_track.jpg/320px-Kasarani_stadium_running_track.jpg' },
  { id: 24, name: 'Leg Press',         description: 'Sit in the leg press machine with your back flat against the seat. Place your feet shoulder-width apart on the platform. Lower the weight by bending your knees toward your chest, stopping before your lower back lifts off the seat. Press back up until your legs are almost fully extended.', category: 'Legs',      equipment: ['Leg press'],        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Squats.jpg/320px-Squats.jpg' },
  { id: 25, name: 'Cycling',           description: 'Sit on the bike seat with your back straight and core engaged. Adjust the seat so your knee is slightly bent at the bottom of the pedal stroke. Pedal smoothly in circles rather than just pushing down. Adjust resistance to challenge yourself while maintaining good form.', category: 'Cardio',    equipment: ['Bicycle'],          image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Syclist_riding_a_bicycle.jpg/320px-Syclist_riding_a_bicycle.jpg' }
];

// Server-side cache — Wger API only called once per day
let exerciseCache    = null;
let cacheFetchedAt   = null;
const CACHE_TTL      = 7 * 24 * 60 * 60 * 1000; // 7 days — use cache as long as possible

// Cache the local image folder listing so we don't readdirSync on every exercise
let localImageFiles  = null;
function getLocalImageFiles() {
  if (localImageFiles) return localImageFiles;
  const path = require('path');
  const fs   = require('fs');
  const dir  = path.join(__dirname, '../public/exercise-images');
  if (!fs.existsSync(dir)) { localImageFiles = []; return []; }
  localImageFiles = fs.readdirSync(dir);
  return localImageFiles;
}

function isEnglish(text) {
  if (!text) return false;
  const clean = text.replace(/<[^>]*>/g, '');
  const latin = clean.match(/[a-zA-Z\s.,!?;:()\-]/g);
  return latin && latin.length > clean.length * 0.7;
}

class ExerciseController {
  static async getExercises(req, res) {
    const { offset = 0, limit = 20, category } = req.query;
    console.log('Exercise request | Category:', category || 'All', '| Offset:', offset);

    // ── Serve from cache if fresh ─────────────────────────────────────────
    if (exerciseCache && cacheFetchedAt && (Date.now() - cacheFetchedAt) < CACHE_TTL) {
      console.log('Serving from cache');
      return ExerciseController._respond(res, exerciseCache, category, offset, limit);
    }

    // ── Try Wger API ──────────────────────────────────────────────────────
    try {
      const [basicRes, infoRes] = await Promise.all([
        axios.get('https://wger.de/api/v2/exercise/',     { params: { limit: 500, language: 2 }, timeout: 8000 }),
        axios.get('https://wger.de/api/v2/exerciseinfo/', { params: { limit: 500, language: 2 }, timeout: 8000 })
      ]);

      const infoMap = {};
      infoRes.data.results.forEach(ex => { infoMap[ex.id] = ex; });

      let exercises = basicRes.data.results.map(basic => {
        const info = infoMap[basic.id];

        let name = 'Exercise';
        if (info?.translations && Array.isArray(info.translations)) {
          const engTrans = info.translations.find(t => t.language === 2);
          if (engTrans?.name && isEnglish(engTrans.name)) name = engTrans.name;
          else if (info.translations[0]?.name && isEnglish(info.translations[0].name)) name = info.translations[0].name;
        } else if (basic.name && basic.name !== 'undefined' && isEnglish(basic.name)) {
          name = basic.name;
        }

        let description = '';
        if (info?.translations && Array.isArray(info.translations)) {
          const engTrans = info.translations.find(t => t.language === 2);
          if (engTrans?.description && isEnglish(engTrans.description)) description = engTrans.description;
          else if (info.translations[0]?.description && isEnglish(info.translations[0].description)) description = info.translations[0].description;
        }
        if (!description && basic.description && isEnglish(basic.description)) description = basic.description;
        if (!description) description = 'Exercise description not available.';

        // Manual image overrides for exercises with no Wger image
        const manualImages = {
          'Ab wheel':              '/img/abwheel.jpg',
          'Alternate back lunges': '/img/alternatebacklunge.jpg',
        };

        // Check for locally downloaded image (self-hosted)
        const rawImage = (info?.images?.[0]?.image && info.images[0].image !== 'undefined')
          ? info.images[0].image : null;

        let localImage = null;
        if (rawImage) {
          const path  = require('path');
          const base  = path.basename(rawImage); // e.g. "Crunches-1.png"
          const files = getLocalImageFiles();
          // Match any downloaded file that contains this basename
          const match = files.find(f => f === base || f.endsWith('-' + base) || f.includes(base));
          if (match) localImage = `/exercise-images/${match}`;
          if (!localImage) console.log(`⚠️  No local image for: ${rawImage} (base: ${base})`);
        }

        // If no local image, try proxy, else use category fallback
        const wgerImage = (!localImage && rawImage)
          ? '/api/imgproxy?url=' + encodeURIComponent(
              rawImage.startsWith('http') ? rawImage : 'https://wger.de' + rawImage
            )
          : null;

        // Category-based fallback images (Wikipedia Commons — public domain)
        const catFallbacks = {
          'Chest':     'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bench_press_-_bench_position.jpg/320px-Bench_press_-_bench_position.jpg',
          'Back':      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Conventional_deadlift.jpg/320px-Conventional_deadlift.jpg',
          'Legs':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Squats.jpg/320px-Squats.jpg',
          'Shoulders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dumbbell_Military_Press.jpg/320px-Dumbbell_Military_Press.jpg',
          'Arms':      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bicep_curl.jpg/320px-Bicep_curl.jpg',
          'Abs':       'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Abdominales.jpg/320px-Abdominales.jpg',
          'Calves':    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Standing_Calf_Raises.jpg/320px-Standing_Calf_Raises.jpg',
          'Cardio':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kasarani_stadium_running_track.jpg/320px-Kasarani_stadium_running_track.jpg',
        };
        const exCategory = (basic.category?.name || info?.category?.name || '');
        const fallbackImage = catFallbacks[exCategory] || 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Push_up_-_multiple.jpg/320px-Push_up_-_multiple.jpg';

        const manualImage = manualImages[name] || null;

        return {
          id: basic.id, name, description,
          category: exCategory || 'Uncategorized',
          equipment: info && Array.isArray(info.equipment) ? info.equipment.map(eq => eq.name || 'Unknown') : [],
          image: manualImage || localImage || wgerImage || fallbackImage,
          hasLocalImage: !!(manualImage || localImage),
          hasRawImage: !!rawImage
        };
      }).filter(ex => ex.name !== 'Exercise' && ex.hasLocalImage);

      if (exercises.length > 0) {
        exerciseCache  = exercises;
        cacheFetchedAt = Date.now();
        console.log('Wger API success — cached', exercises.length, 'exercises');
        return ExerciseController._respond(res, exercises, category, offset, limit);
      }
    } catch (error) {
      console.log('Wger API unavailable:', error.message, '— using fallback');
      // Use stale cache if available (even if expired) — better than Wikipedia fallback
      if (exerciseCache && exerciseCache.length > 0) {
        console.log('Serving stale cache —', exerciseCache.length, 'exercises');
        return ExerciseController._respond(res, exerciseCache, category, offset, limit);
      }
    }

    // ── Fallback with real images ─────────────────────────────────────────
    console.log('Serving fallback exercises with Wikipedia images');
    return ExerciseController._respond(res, FALLBACK_EXERCISES, category, offset, limit);
  }

  static _respond(res, allExercises, category, offset, limit) {
    let exercises = allExercises;

    if (category) {
      const cat = category.toLowerCase();
      const filtered = allExercises.filter(ex => ex.category && ex.category.toLowerCase() === cat);
      if (filtered.length > 0) exercises = filtered;
    }

    exercises = [...exercises].sort((a, b) => a.name.localeCompare(b.name));

    const totalResults       = exercises.length;
    const startIndex         = parseInt(offset);
    const paginatedExercises = exercises.slice(startIndex, startIndex + parseInt(limit));

    console.log('Returning', paginatedExercises.length, '| Total:', totalResults);

    res.json({
      results:      paginatedExercises,
      offset:       parseInt(offset),
      number:       paginatedExercises.length,
      totalResults: totalResults
    });
  }
}

module.exports = ExerciseController;
