const axios = require('axios');
const ChatbotLog = require('../models/ChatbotLog');
const db        = require('../config/database');

// ═══════════════════════════════════════════════════════════════════════════════
// CoachAlchemy — AI Wellness Coach
// Massive rule-based + API-driven intent system
// Supports English + Malay (Bahasa Malaysia) + Manglish
// ═══════════════════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function getUserContext(userId) {
  if (!userId) return null;
  try {
    const [[profile]]  = await db.query('SELECT full_name, age, height, weight, fitness_goal, dietary_preference FROM users WHERE id=?', [userId]);
    const [[health]]   = await db.query('SELECT physical_status, fitness_status, mental_status, evaluated_date FROM health_status WHERE user_id=? ORDER BY evaluated_date DESC LIMIT 1', [userId]).catch(() => [[]]);
    const [routines]   = await db.query('SELECT COUNT(*) as count FROM routines WHERE user_id=?', [userId]);
    const [meals]      = await db.query('SELECT COUNT(*) as count FROM meal_plans WHERE user_id=?', [userId]);
    return {
      name:       profile?.full_name   || null,
      age:        profile?.age         || null,
      height:     profile?.height      || null,
      weight:     profile?.weight      || null,
      goal:       profile?.fitness_goal         || null,
      diet:       profile?.dietary_preference   || null,
      bmi:        (profile?.height && profile?.weight) ? (profile.weight / ((profile.height/100)**2)).toFixed(1) : null,
      physical:   health?.physical_status || null,
      fitness:    health?.fitness_status  || null,
      mental:     health?.mental_status   || null,
      evaluated:  health?.evaluated_date  || null,
      routineCount: routines[0]?.count || 0,
      mealCount:    meals[0]?.count    || 0
    };
  } catch (e) {
    console.log('getUserContext error:', e.message);
    return null;
  }
}

function buildContextString(ctx) {
  if (!ctx) return '';
  const parts = [];
  if (ctx.name)     parts.push('User: ' + ctx.name);
  if (ctx.age)      parts.push('Age: ' + ctx.age);
  if (ctx.bmi)      parts.push('BMI: ' + ctx.bmi);
  if (ctx.goal)     parts.push('Goal: ' + ctx.goal);
  if (ctx.diet)     parts.push('Diet preference: ' + ctx.diet);
  if (ctx.physical) parts.push('Physical status: ' + ctx.physical);
  if (ctx.fitness)  parts.push('Fitness status: ' + ctx.fitness);
  if (ctx.mental)   parts.push('Mental status: ' + ctx.mental);
  parts.push('Saved workouts: ' + ctx.routineCount);
  parts.push('Saved meals: ' + ctx.mealCount);
  return parts.join(' | ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT DETECTION — Massive keyword coverage
// English + Malay + Manglish + common typos + casual phrasing
// ═══════════════════════════════════════════════════════════════════════════════
function detectIntent(msg) {
  const m = msg.toLowerCase().trim();
  function has(arr) { return arr.some(function(w){ return m.includes(w); }); }

  // ── GREET ────────────────────────────────────────────────────────────────────
  if (/^(hi|hey|yo|helo|hello|hai|sup|heya)[\s!.?]*$/i.test(m)) return 'greet';
  if (has(['hello','hey ','hey!','hi ','hi!','hye','howdy','sup ','sup!','good morning',
           'good afternoon','good evening','good night','assalamualaikum','waalaikumsalam',
           'salam ','salam!','hai ','hai!','helo','selamat pagi','selamat tengahari',
           'selamat petang','selamat malam','apa khabar','apa kabar','what can you do',
           'who are you','what are you','introduce yourself','tolong saya','boleh tolong',
           'siapa kamu','nak tanya','boleh tanya','coach!','morning!','afternoon!',
           'evening!','anyone here','are you there','hello there','hi there',
           'yo ','waddup','whats up','what is up','greetings','howdy','heya',
           'hai coach','helo coach','salam coach','coach ada','coach boleh',
           'how are you','how r u','how are u','how do you do','nice to meet'])) return 'greet';

  // ── PERSONALISED: Overall Overview ──────────────────────────────────────────
  if (has(['how am i doing','rate me','evaluate me','am i doing well','my overall',
           'overall status','my rating','overall health','my score','give me overview',
           'check everything','how is everything','give me a summary','overall summary',
           'macam mana saya','macam mana kondisi','overall kesihatan','tengok semua',
           'semak semua','macam mana progress','overall progress','my overall fitness',
           'how am i progressing','progress report','my report','my full status'])) return 'personalised_overview';

  // ── PERSONALISED: Suggest ────────────────────────────────────────────────────
  if (has(['suggest for me','suggest something for me','recommend for me',
           'what should i do today','based on my condition','for my condition',
           'my current status','what do you suggest','cadang untuk saya',
           'apa yang patut saya','berdasarkan kondisi','untuk kondisi saya',
           'apa patut saya buat','patut buat apa','nak buat apa harini',
           'apa plan hari ni','coach me today','guide me','tolong guide',
           'tunjuk ajar','personalise for me','customize for me','tailor for me',
           'based on my health','based on my status','suggest based on',
           'apa yang sesuai untuk saya','sesuai untuk saya','plan untuk saya'])) return 'personalised_suggest';

  // ── PERSONALISED: Meal for me ────────────────────────────────────────────────
  if (has(['what should i eat','meal for me','diet for me','food for my goal',
           'suggest meal for me','makan apa sekarang','apa yang patut saya makan',
           'cadang makanan untuk saya','diet untuk saya','recommend food for me',
           'meal based on','makanan untuk kondisi','food for my condition',
           'meal for my goal','diet for my goal','food plan for me',
           'apa elok saya makan','makanan yang sesuai untuk saya'])) return 'personalised_meal';

  // ── PERSONALISED: Workout for me ─────────────────────────────────────────────
  if (has(['workout for me','exercise for me','training for me','exercise plan for me',
           'suggest workout for me','latihan untuk saya','senaman untuk saya',
           'workout untuk saya','program untuk saya','exercise based on my',
           'recommend workout for me','training plan for me','fitness plan for me',
           'programme untuk saya','workout yang sesuai','senaman yang sesuai',
           'latihan yang sesuai untuk saya','recommend exercise for me'])) return 'personalised_workout';

  // ── PERSONALISED: Mental ─────────────────────────────────────────────────────
  if (has(['my mental','how is my mental','my mood score','mental health check',
           'how is my mind','mental saya','mood saya','stres saya','mental score',
           'check my mood','how is my mental status','my mental health',
           'my stress level','how stressed am i','mental wellness check',
           'status mental saya','tahap mental saya'])) return 'personalised_mental';

  // ── PERSONALISED: Fitness ─────────────────────────────────────────────────────
  if (has(['my fitness','how fit am i','my fitness level','am i active enough',
           'my activity level','fitness saya','tahap kecergasan','aktif ke saya',
           'fitness score','my cardio level','how is my fitness','my activity score',
           'tahap aktiviti saya','seberapa aktif saya','fitness status saya'])) return 'personalised_fitness';

  // ── PERSONALISED: Physical/BMI ────────────────────────────────────────────────
  if (has(['my bmi','my weight status','am i healthy weight','bmi saya',
           'berat saya normal','saiz badan saya','my body status','check my bmi',
           'what is my bmi','bmi check','am i overweight','am i underweight',
           'my physical status','my weight category','bmi normal ke','bmi saya berapa',
           'berat saya okay ke','am i at healthy weight'])) return 'personalised_physical';

  // ── HEALTH CHECK-IN ───────────────────────────────────────────────────────────
  if (has(['check my health','health status','how healthy am i','am i healthy','am i fit',
           'my progress','how are my stats','evaluate health','my wellness',
           'semak kesihatan','status kesihatan','check health','health check',
           'nak semak','semak badan','check badan','how is my health',
           'track my weight','track my progress','log my workout','log my food',
           'record exercise','monitor health','fitness tracker','progress tracker',
           'rekod latihan','pantau badan','pantau berat','evaluate my health',
           'health evaluation','nak evaluate','semak progress','check progress',
           'how have i been doing','whats my status','what is my status'])) return 'health_checkin';

  // ── EMOTIONAL: Sadness ────────────────────────────────────────────────────────
  if (has(['i feel sad','i am sad','feeling sad','so sad','very sad','really sad',
           'im sad','feeling down','feel low','feeling low','i feel empty','feel empty',
           'feeling empty','i feel hopeless','feel hopeless','hopeless','depressed',
           'i feel depressed','feeling depressed','want to cry','nak nangis',
           'heartbroken','broken heart','i feel broken','feel worthless','worthless',
           'feel like nothing','nobody cares','no one cares','feel unloved',
           'feel unwanted','feel abandoned','grief','miserable','unhappy','gloomy',
           'feel blue','not okay','im not okay','i am not okay','not doing well',
           'rasa sedih','sedih gila','sedih sangat','rasa down','rasa kosong',
           'rasa sunyi','hati patah','patah hati','putus asa','rasa tak okay',
           'tak okay lah','tiada harapan','benci diri','rasa keseorangan',
           'menangis','nak menangis','rasa teruk','rasa rendah diri','tak berharga',
           'rasa tak berguna','sunyi sangat','keseorangan','sedih hari ni',
           'hari ni sedih','rasa hampa','hampa','rasa sayu','sayu','murung',
           'rasa murung','down gila','down sangat','rasa dipinggirkan',
           'rasa tidak dihargai','rasa tidak disayangi','crying all day',
           'been crying','broke down','emotional','feeling emotional',
           'rasa nak nangis','rasa macam nak nangis','tak boleh berhenti nangis',
           'life is hard','life is tough','everything is hard','nothing is going well',
           'nothing is right','everything feels wrong','feel like giving up on life'])) return 'emotional_sad';

  // ── EMOTIONAL: Stress/Anxiety ─────────────────────────────────────────────────
  if (has(['i feel stressed','feeling stressed','so stressed','very stressed',
           'stress gila','under stress','too much stress','anxiety','anxious',
           'feeling anxious','very anxious','so anxious','panic','panicking',
           'nervous','feeling nervous','worried','so worried','worry',
           'overwhelmed','feeling overwhelmed','too much on my plate',
           'too much pressure','burnout','burned out','breaking point',
           'cant cope','losing it','freaking out','tense','tension',
           'too much to handle','rasa tertekan','tekanan','tertekan sangat',
           'risau gila','bimbang sangat','nak give up','tak boleh tahan',
           'dah tak tahan','terlalu banyak','kelam kabut','panik','tension sangat',
           'rasa anxious','rasa risau','tak tenang','minda tak tenang','resah',
           'rasa resah','banyak sangat benda','penat fikir','stress dengan kerja',
           'stress dengan study','stress dengan exam','stress dengan assignment',
           'stress dengan relationship','exam stress','assignment stress',
           'work stress','kerja banyak','homework banyak','deadline dekat',
           'deadline esok','presentation esok','rasa overwhelmed','too overwhelmed',
           'cant breathe','rasa nak pengsan','heart racing','jantung berdegup laju',
           'hands shaking','rasa menggigil','cant think straight','pening kepala',
           'rasa pusing','spinning','dizzy','rasa dizziness','mind is foggy',
           'cant make decisions','indecisive','rasa serba salah'])) return 'emotional_stress';

  // ── EMOTIONAL: Tired/Exhausted ────────────────────────────────────────────────
  if (has(['i feel tired','feeling tired','so tired','very tired','tired gila',
           'exhausted','so exhausted','drained','no energy','no energy at all',
           'worn out','fatigue','fatigued','sleepy','very sleepy','drowsy',
           'cant stay awake','always tired','tired all the time','rasa penat',
           'penat gila','penat sangat','penat hari ni','tak larat','lesu',
           'rasa lesu','mengantuk','mengantuk sangat','keletihan','rasa drained',
           'penat kerja','penat belajar','penat study','tiada tenaga',
           'tak ada tenaga','rasa lemah','lemah sangat','badan penat',
           'rasa tak larat','body aching','badan lenguh','lenguh semua',
           'penat tapi tak boleh tidur','tired but cant sleep','exhausted but awake',
           'run down','running on empty','no fuel left','need rest','need a break',
           'perlu rehat','nak rehat','nak berehat','need to rest','rest please',
           'burned out from work','burned out from study','study penat',
           'kerja penat','tak boleh nak bergerak','malas nak bergerak',
           'penat sangat tak boleh workout'])) return 'emotional_tired';

  // ── EMOTIONAL: Anger/Frustration ──────────────────────────────────────────────
  if (has(['i feel angry','feeling angry','so angry','very angry','angry gila',
           'frustrated','so frustrated','very frustrated','furious','irritated',
           'annoyed','fed up','pissed off','mad at','rage','upset','agitated',
           'marah gila','marah sangat','rasa marah','geram','geram gila','bengang',
           'bengang sangat','sakit hati','kecewa','rasa kecewa','tension gila',
           'rasa geram','nak marah','so annoying','very annoying','ugh','argh',
           'fed up with','sick of','sick and tired','i hate','benci gila',
           'cannot stand','tak boleh tahan lagi','rasa nak marah',
           'rasa nak jerit','nak jerit','damn it','what the hell',
           'rasa frust','frust gila','frust sangat','kecewa gila',
           'kecewa sangat','geram dengan','bengang dengan','marah dengan',
           'sakit hati dengan','tension dengan'])) return 'emotional_angry';

  // ── EMOTIONAL: Happy/Positive ─────────────────────────────────────────────────
  if (has(['i feel happy','feeling happy','so happy','very happy','great day',
           'feeling good','wonderful','blessed','grateful','thankful',
           'proud of myself','accomplished','fantastic','amazing day','best day ever',
           'feeling great','feeling amazing','on cloud nine','alhamdulillah',
           'syukur','bersyukur','rasa happy','rasa excited','excited sangat',
           'bangga','rasa gembira','gembira','seronok','seronok gila','best gila',
           'rasa seronok','good mood','great mood','positive vibes',
           'feeling positive','rasa okay','rasa better','today is good',
           'having a good day','good day today','great day today','im happy',
           'feeling blessed','so grateful','so thankful','content','rasa content',
           'rasa puas','puas hati','happy today','gembira hari ni',
           'hari ni best','best hari ni','rasa confident','rasa yakin',
           'confident today','feeling confident','feeling strong','rasa kuat',
           'energetic','full of energy','penuh tenaga','tenaga penuh',
           'rasa bersemangat','bersemangat','semangat gila','feeling pumped',
           'pumped up','hyped','rasa hyped'])) return 'emotional_happy';

  // ── EMOTIONAL: Low Motivation ─────────────────────────────────────────────────
  if (has(['no motivation','lost motivation','unmotivated','i feel lazy','feeling lazy',
           'so lazy','cant be bothered','no drive','demotivated','lost interest',
           'dont feel like doing','not feeling it today','cant start','cant begin',
           'procrastinating','keep putting off','malas gila','malas sangat',
           'rasa malas','tak semangat','hilang semangat','tak ada mood',
           'tak ada motivasi','hilang arah','tak nak buat apa','tak der mood',
           'mood tak ada','rasa malas nak','taknak buat','tak nak exercise',
           'taknak gym','malas nak gym','malas gym','lazy to gym','lazy to workout',
           'lazy to exercise','too lazy to','malas nak workout','malas nak exercise',
           'no mood','lost my motivation','motivation hilang','dah tak ada semangat',
           'bosan','bosan gila','tak best','takde mood langsung','langsung tak semangat',
           'malas sangat nak','taknak gerak','tak gerak','malas gerak',
           'rasa taknak buat apa','malas nak makan pun','malas nak masak',
           'everything feels pointless','rasa tak ada tujuan','tak ada arah',
           'what is the point','why bother','why even try','give up on fitness',
           'nak stop workout','nak berhenti','rasa nak berhenti','feel like quitting',
           'want to quit','i want to quit','rasa nak quit','nak quit',
           'cannot be motivated','motivation zero','zero motivation','0 motivation',
           'rasa lazy gila','super malas','malas gila babi','dont want to do anything',
           'dont want to move','cant get up','cant get motivated','feeling unmotivated',
           'lacking motivation','need motivation to start','procrastinate',
           'keep delaying','keep avoiding','avoiding workout','skip workout',
           'skip gym','nak skip gym','malas nak pergi','tak larat nak gerak',
           'rasa berat nak mula','berat nak start','susah nak mula'])) return 'emotional_lowmotivation';

  // ── EMOTIONAL: Lonely ─────────────────────────────────────────────────────────
  if (has(['feel lonely','feeling lonely','so lonely','very lonely','alone',
           'all alone','no friends','no one understands','no support','isolated',
           'feel isolated','sunyi','keseorangan','tiada kawan','tiada sokongan',
           'rasa keseorangan','rasa sunyi','tak ada kawan','tak ada siapa',
           'tiada siapa','nobody understands me','no one gets me','no one cares about me',
           'everyone left','semua tinggalkan saya','rasa terasing','terasing',
           'diasingkan','rasa diasingkan','tak ada orang nak dengar',
           'tak ada orang kisah','tak ada kawan rapat','rasa tak diterima',
           'tak diterima','rasa outcasted','outcast','rasa invisible'])) return 'emotional_lonely';

  // ── EMOTIONAL: Overthinking ───────────────────────────────────────────────────
  if (has(['overthinking','cant stop thinking','mind wont stop','keep thinking about',
           'thoughts wont stop','mind is racing','racing mind','over thinking',
           'terlalu banyak fikir','fikir banyak sangat','tak boleh berhenti fikir',
           'minda tak tenang','rasa resah','resah sangat','cant stop worrying',
           'always thinking too much','spiral of thoughts','thought spiral',
           'negative spiral','negative thoughts','dark thoughts','intrusive thoughts',
           'fikir benda negatif','fikiran negatif','rasa fikiran lari',
           'cant control thoughts','fikiran tak terkawal','rasa nak terjerit',
           'overthink everything','overanalyze','over analyze'])) return 'emotional_overthinking';

  // ── SLEEP ADVICE ──────────────────────────────────────────────────────────────
  if (has(['cant sleep','cannot sleep','trouble sleeping','hard to sleep','sleep problem',
           'sleep issues','bad sleep','poor sleep','not sleeping well','how to sleep better',
           'improve sleep','quality sleep','sleep schedule','bedtime routine',
           'sleep routine','insomnia','oversleeping','nap','napping','sleep tip',
           'sleep advice','sleep hygiene','how many hours sleep','berapa jam tidur',
           'sleep duration','susah tidur','tak boleh tidur','kurang tidur',
           'tidur lambat','terlalu banyak tidur','kualiti tidur','rutin tidur',
           'nak tidur awal','tidur tak cukup','tak cukup tidur','cara tidur awal',
           'cara nak tidur','tidur berapa jam','always sleepy','rasa mengantuk selalu',
           'tidur tak lena','tak lena tidur','sering terjaga','sering bangun malam',
           'wake up often','keep waking up','light sleeper','tidur sekejap je',
           'tidur tak puas','tak puas tidur','tired after sleeping','penat lepas tidur',
           'still tired after sleep','waking up tired','bangun pagi penat',
           'feel unrefreshed','unrefreshed sleep','sleep quality bad',
           'rasa mengantuk walaupun dah tidur','how to fix sleep',
           'sleep deprived','sleep deprivation','kurang tidur gila',
           'tidur 3 jam','tidur 4 jam','tidur 5 jam','only sleeping',
           'falling asleep during','tertidur waktu','tertidur masa',
           'cant fall asleep','lying awake','staring at ceiling'])) return 'sleep_advice';

  // ── HYDRATION ─────────────────────────────────────────────────────────────────
  if (has(['drink water','how much water','water intake','stay hydrated','dehydrated',
           'dehydration','thirsty','not drinking enough','fluid intake','daily water',
           'water tips','hydration tips','how to hydrate','how many liters',
           'water per day','drinking enough water','electrolyte','minum air',
           'berapa banyak air','kurang minum','nak minum apa','tak minum air',
           'berapa liter air','water goal','coconut water','air mineral',
           'air kosong','air suam','warm water','cold water','mineral water',
           'isotonic','sports drink','minum apa','should i drink more','drink more',
           'keep forgetting to drink','lupa minum air','tak ingat nak minum',
           'headache from dehydration','sakit kepala sebab kurang air',
           'urine color','warna air kencing','dark urine','air kencing gelap',
           'need to drink more','perlu minum lagi','importance of water',
           'benefits of water','kenapa perlu minum air','how often to drink'])) return 'hydration';

  // ── INJURY / PAIN ─────────────────────────────────────────────────────────────
  if (has(['my knee hurts','my back hurts','my shoulder hurts','my ankle hurts',
           'my wrist hurts','my neck hurts','my hip hurts','my elbow hurts',
           'muscle pain','muscle soreness','sore muscles','body aches','body pain',
           'joint pain','knee pain','back pain','shoulder pain','neck pain',
           'hip pain','wrist pain','ankle pain','foot pain','elbow pain',
           'pulled muscle','muscle cramp','cramp','sprain','strain',
           'injury','injured','hurt my','hurts when','pain when','aching',
           'cant workout because of pain','cant train due to injury',
           'exercise with injury','workout with pain','recovering from injury',
           'DOMS','delayed onset muscle soreness','muscle stiffness','stiff muscles',
           'sakit lutut','sakit belakang','sakit bahu','sakit leher',
           'sakit kaki','sakit tangan','sakit pinggang','pinggang sakit',
           'otot sakit','otot lenguh','lenguh badan','badan sakit','cedera',
           'kecederaan','tak boleh bersenam sebab sakit','tak boleh workout',
           'muscle pull','kram','senaman dengan cedera','recovery workout',
           'pain in my','sore after workout','penat otot','otot penat',
           'body so sore','very sore','extremely sore','cannot move','tak boleh gerak',
           'swollen','bengkak','bruised','lebam','torn muscle','muscle tear',
           'tendon pain','ligament','lower back pain','upper back pain',
           'sakit belakang bawah','sakit belakang atas','sakit pinggang bawah',
           'disc problem','herniated disc','sakit sendi','joint ache',
           'knee injury','ankle injury','shoulder injury','wrist injury',
           'recovery from surgery','post surgery exercise','post op workout',
           'pain relief','relieve pain','reduce soreness','reduce swelling'])) return 'injury';

  // ── SUPPLEMENT ────────────────────────────────────────────────────────────────
  if (has(['supplement','protein powder','whey protein','whey','casein protein',
           'creatine','bcaa','branch chain','pre workout','preworkout',
           'post workout supplement','multivitamin','fish oil','omega 3','omega-3',
           'vitamin d','vitamin c','vitamin b','vitamin e','zinc','magnesium',
           'calcium supplement','iron supplement','caffeine pill','mass gainer',
           'weight gainer','fat burner','l-carnitine','l-glutamine','collagen',
           'collagen supplement','melatonin supplement','ashwagandha','turmeric',
           'protein shake','gainers','electrolyte supplement','recovery supplement',
           'should i take supplement','is it worth taking','what supplement',
           'which supplement','best supplement','suplemen','serbuk protein',
           'susu protein','nak ambil supplement','supplement apa','supplement untuk',
           'supplement untuk muscle','supplement untuk kurus','supplement untuk gym',
           'supplement halal','halal supplement','mana supplement bagus',
           'supplement malaysia','supplement murah','supplement mahal',
           'berapa banyak protein','protein cukup ke','need more protein',
           'not enough protein','whey or food','powder atau makanan',
           'natural supplement','herbal supplement'])) return 'supplement';

  // ── WEIGHT MANAGEMENT (how-to / method queries — checked before body_concern) ─
  if (has(['how to lose weight','lose weight fast','weight loss tips','how to slim down',
           'how to cut fat','calorie deficit','how to gain weight','gain weight fast',
           'how to bulk up','bulking tips','calorie surplus','how to build mass',
           'weight management','how many calories','calorie counting','track calories',
           'cara nak kurus','cara kurus','cara kurus cepat','cara turun berat',
           'cara nak turun berat','cara naik berat','cara nak gemuk','cara gain weight',
           'nak kurus dengan cepat','nak turun 5kg','nak turun 10kg','nak turun berat',
           'macam mana nak kurus','macam mana nak turun berat','macam mana nak gemuk',
           'cara nak slim','tips kurus','tips turun berat','tips gain weight',
           'tips nak kurus','tips untuk kurus','diet untuk kurus','tdee',
           'maintenance calories','calorie calculator','how to calculate calories',
           'how many kcal','berapa kalori nak makan','calorie goal','daily calorie',
           'cutting phase','bulking phase','recomp','body recomposition','lean bulk',
           'aggressive cut','slow bulk','mini cut','reverse diet','nak kurangkan lemak',
           'nak bina otot sekaligus kurus','weight loss plateau','kenapa tak turun berat',
           'kenapa tak gain','not losing weight','not gaining weight','stuck at same weight',
           'how to reduce weight','reduce my weight','shed weight','shed fat',
           'drop weight','drop fat','trim down','get lean','how to get lean',
           'how to lose belly fat','lose belly fat','burn belly fat','reduce belly',
           'flatten stomach','flat tummy','how to lose fat','fastest way to lose weight',
           'best way to lose weight','healthy way to lose weight','sustainable weight loss',
           'lose weight without exercise','lose weight at home','cara kurus tanpa gym',
           'cara kurus tanpa exercise','kurus tanpa senaman','how to maintain weight'])) return 'weight_management';

  // ── BODY CONCERN (feelings / self-image about body) ──────────────────────────
  if (has(['im fat','i am fat','too fat','feel fat','look fat','i am overweight',
           'i am obese','belly fat','tummy fat','love handles','muffin top',
           'flabby','body fat percentage','i am skinny','too thin','too skinny',
           'look skinny','underweight','body image','hate my body',
           'not happy with my body','rasa gemuk','gemuk sangat','perut buncit',
           'kurus sangat','terlalu kurus','nak kecilkan perut','nak hilangkan lemak',
           'nak naik berat','nak slim','nak kurus','nak gemuk','body shape',
           'body composition','jaga badan','jaga berat','self conscious about body',
           'embarrassed about weight','weight shame','body shame',
           'feel uncomfortable in body','uncomfortable with weight',
           'people comment on my weight','orang cakap saya gemuk',
           'orang kata saya kurus','gained weight','put on weight','naik berat',
           'lost weight suddenly','berat turun mendadak','struggling with weight',
           'weight issue','masalah berat badan','double chin','flabby arms',
           'flabby stomach','saggy skin','excess skin','stretch marks','cellulite',
           'tummy wont go','stomach fat wont go','belly wont shrink',
           'fat in the wrong places','storing fat','store fat','dont like my body',
           'insecure about body','body insecurity','rasa tak selesa dengan badan',
           'malu dengan badan','tak suka badan saya','badan tak cantik',
           'rasa tak puas hati dengan badan','feel ugly','rasa hodoh',
           'comparing my body','compare badan'])) return 'body_concern';

  // ── NUTRITION ADVICE ──────────────────────────────────────────────────────────
  if (has(['how much protein','daily protein','protein requirement','protein intake',
           'macros','macronutrients','micronutrients','how many calories should i eat',
           'calorie intake','what nutrients','vitamins','minerals','fibre','fiber',
           'healthy diet tips','eating tips','nutrition tips','what to eat for',
           'eat healthy','healthy eating','clean eating','nutritious food',
           'balanced diet','what foods are good','is rice okay','is bread okay',
           'is sugar bad','is fat bad','is carb bad','good carbs','bad carbs',
           'complex carbs','simple carbs','pemakanan','nutrien','zat makanan',
           'berapa protein','berapa kalori sehari','nak makan sihat',
           'cara makan sihat','pemakanan sihat','tips pemakanan','makanan berkhasiat',
           'apa yang baik untuk dimakan','nasi elok tak','makanan untuk muscle',
           'vitamin apa','is egg good','is chicken good','is fish good',
           'protein sources','sumber protein','plant protein','animal protein',
           'what to eat before workout','what to eat after workout',
           'pre workout food','post workout food','meal timing','bila nak makan',
           'how often to eat','berapa kali makan sehari','intermittent fasting meals',
           'eating window','eating disorder','disordered eating','binge eating',
           'emotional eating','makan sebab stress','makan berlebihan',
           'overeating','cant stop eating','cant control eating',
           'always hungry','lapar selalu','always feel hungry after eating',
           'not feeling full','tak rasa kenyang','satiety','feeling full',
           'nutrient deficiency','kekurangan zat','anemia','iron deficiency'])) return 'nutrition_advice';

  // ── DIET COMPARISON / FASTING ─────────────────────────────────────────────────
  if (has(['which diet is best','best diet for me','keto diet','ketogenic',
           'intermittent fasting','puasa intermittent','16 8 fasting','16:8',
           '18:6','20:4','one meal a day','omad','low carb diet','low fat diet',
           'mediterranean diet','paleo diet','vegan diet','plant based diet',
           'carnivore diet','atkins diet','calorie cycling','diet comparison',
           'keto vs','fasting vs','which is better keto','should i fast',
           'is fasting good','diet mana','diet terbaik','cuba diet',
           'nak cuba keto','nak try fasting','puasa untuk kurus','berpuasa',
           'puasa sunat','diet halal','clean diet','dirty bulk','clean bulk',
           'flexible dieting','iifym','if it fits your macros','zone diet',
           'south beach diet','dash diet','galveston diet','cambridge diet',
           'slimming world','weight watchers','calorie restriction',
           'very low calorie','vlcd','meal replacement','replace meals',
           'diet shake','diet plan','meal plan for weight loss',
           'eating plan','food plan','weekly meal plan'])) return 'diet_comparison';

  // ── WORKOUT FREQUENCY ─────────────────────────────────────────────────────────
  if (has(['how many days should i workout','how often should i exercise',
           'workout schedule','training schedule','how many times a week',
           'rest days','how many rest days','active rest','workout frequency',
           'weekly workout','gym schedule','how often gym','berapa hari workout',
           'berapa kali seminggu','jadual workout','jadual latihan','bila nak rest',
           'rest day bila','workout berapa kali','gym berapa kali',
           'how many sets','how many reps','berapa set','berapa rep',
           'sets and reps','reps per set','how long workout','berapa lama workout',
           'workout duration','exercise duration','how long should i exercise',
           'how long per session','rest between sets','rest time','rest period',
           'recovery time','muscle recovery','how long to recover','tempo',
           '3x10','4x12','5x5','6x6','sets per muscle','volume per week',
           'training volume','training frequency','training split',
           'upper lower split','push pull legs','ppl split','bro split',
           'full body vs split','full body workout frequency','how many exercises',
           'exercises per muscle group','exercises per session'])) return 'workout_frequency';

  // ── BEGINNER GUIDE ────────────────────────────────────────────────────────────
  if (has(['im a beginner','i am a beginner','just started','starting out',
           'new to gym','new to fitness','never exercised','first time gym',
           'gym for beginners','where to start','how to start','how do i begin',
           'beginner workout','beginner guide','starter plan',
           'just started working out','pemula','baru nak start','baru start gym',
           'tak pernah gym','nak start bersenam','first time workout',
           'tak tau macam mana nak start','cara nak start','macam mana nak mula',
           'mula dari mana','nak mula workout','workout untuk pemula',
           'exercise untuk pemula','senaman untuk pemula','fitness untuk pemula',
           'first time exercise','brand new to fitness','newbie','new to working out',
           'complete beginner','absolute beginner','zero experience',
           'never worked out','never been to gym','gym intimidating','gym scared',
           'scared to start','rasa malu nak pergi gym','takut pergi gym',
           'gym untuk orang baru','program untuk orang baru','tak tahu nak mulakan',
           'tak ada experience','starting from scratch','back to basics',
           'returning to gym','coming back to gym','baru balik gym',
           'took a long break','lama tak gym','lama tak exercise',
           'after a long break','getting back into it','resume workout'])) return 'beginner_guide';

  // ── WARM UP / COOL DOWN ───────────────────────────────────────────────────────
  if (has(['warm up','warmup','warm-up','cool down','cooldown','cool-down',
           'stretching tips','how to stretch','should i stretch','flexibility',
           'flexibility exercises','before workout routine','after workout routine',
           'pemanasan','penyejukan','regangan','regangkan badan','sebelum workout',
           'lepas workout','selepas workout','cara nak stretch','perlu stretch ke',
           'kenapa warm up','kenapa cool down','senaman regangan','foam rolling',
           'foam roller','mobility work','mobility training','dynamic stretch',
           'static stretch','active stretch','passive stretch','hip flexor stretch',
           'hamstring stretch','quad stretch','calf stretch','shoulder stretch',
           'back stretch','neck stretch','yoga for flexibility','pilates',
           'regangkan otot','otot kaku','stiff muscles','muscle flexibility',
           'range of motion','joint mobility','prevent injury stretch'])) return 'warmup_cooldown';

  // ── MENTAL WELLNESS ───────────────────────────────────────────────────────────
  if (has(['mental health','mental wellness','mindfulness','meditation','meditate','how to meditate','breathing exercise',
           'calm down','peace of mind','how to relax','relax tips','how to destress',
           'de stress','decompress','anxiety relief','stress relief',
           'grounding technique','breathing technique','4 7 8','box breathing',
           '4-7-8','478 breathing','square breathing','how to be calm','find peace',
           'kesihatan mental','kesejahteraan mental','meditasi','pernafasan',
           'tenangkan diri','nak tenang','cara nak tenang','cara relaks',
           'cara hilangkan stress','teknik bernafas','mindful','jadi tenang',
           'fikiran positif','positive mindset','cara positif','self care',
           'mental self care','mental health day','mental health tips',
           'how to improve mental health','how to feel better mentally',
           'how to clear my mind','mind clarity','mental clarity',
           'journaling','gratitude journal','gratitude practice',
           'positive thinking','law of attraction','affirmations',
           'self affirmations','daily affirmations','morning routine mental',
           'evening routine mental','digital detox','phone detox','screen time',
           'reduce screen time','kurang guna phone','social media detox',
           'therapy','counseling','see a therapist','mental health help',
           'psychologist','psychiatrist','need professional help',
           'talk to someone','need to talk','need someone to talk to'])) return 'mental_wellness';

  // ── POSTURE / FORM ────────────────────────────────────────────────────────────
  if (has(['posture','bad posture','how to fix posture','posture correction',
           'hunched back','rounded shoulders','forward head','neck posture',
           'spine alignment','sitting posture','standing posture','office posture',
           'exercise form','proper form','how to do correctly','correct form',
           'bentuk badan','postur badan','cara betul','teknik betul','form betul',
           'cara nak buat betul','macam mana nak buat','nak buat dengan betul',
           'sitting too long','office worker','desk job','work from home posture',
           'computer posture','ergonomics','ergonomic','spine health',
           'back health','straight back','core for posture','strong core posture',
           'squat form','deadlift form','bench press form','push up form',
           'pull up form','correct squat','correct deadlift','how to squat properly',
           'how to deadlift properly','how to bench properly','safe lifting',
           'lifting technique','weight lifting form','check my form',
           'is my form correct','am i doing it right','senaman dengan betul',
           'teknik senaman','cara buat senaman','teknik angkat berat'])) return 'posture_form';

  // ── CARDIO SPECIFIC ───────────────────────────────────────────────────────────
  if (has(['cardio workout','best cardio','cardio tips','do cardio','hiit workout',
           'high intensity interval','running tips','how to run better',
           'jogging tips','cycling workout','swimming workout','jump rope',
           'aerobic','aerobics','fat burning cardio','cardio for weight loss',
           'lari','berjoging','berbasikal','renang','skip','skipping',
           'cardio untuk kurus','cardio untuk lemak','bakar lemak',
           'burn fat fast','how to burn fat','endurance training',
           'cardio before or after weights','when to do cardio',
           'how often to do cardio','cardio every day','cardio twice a day',
           'treadmill workout','elliptical workout','rowing machine',
           'stair climber','stairmaster','spin class','spinning class',
           'zumba','aerobics class','dance workout','dance for fitness',
           'walking for weight loss','power walking','brisk walk','jalan laju',
           'jalan kaki','lari untuk kurus','jog berapa lama','how long to jog',
           'how far to run','jarak lari','marathon training','5k training',
           '10k training','running pace','jogging pace','tempo run',
           'interval running','fartlek','vo2 max','cardiovascular endurance',
           'heart rate zone','target heart rate','zone 2 cardio','fat burning zone'])) return 'cardio_specific';

  // ── MUSCLE BUILDING ───────────────────────────────────────────────────────────
  if (has(['build muscle','muscle building','how to get bigger','get buff',
           'get jacked','gain muscle','how to gain mass','muscle mass',
           'lean muscle','muscle tips','hypertrophy','how to get stronger',
           'strength training tips','progressive overload','nak bina otot',
           'nak gain muscle','nak kuat','nak besar','badan besar','otot besar',
           'cara bina otot','cara nak kuat','latihan kekuatan','senaman untuk otot',
           'muscle definition','toned body','nak toned','nak berisi',
           'nak nampak berisi','cut and toned','lean and muscular',
           'muscle growth','muscle hypertrophy','time under tension',
           'muscle activation','mind muscle connection','pump',
           'feel the pump','muscle pump','blood flow restriction',
           'bfr training','compound lifts','isolation exercises',
           'free weights vs machines','dumbbell vs barbell','barbells',
           'dumbbells','kettlebell','resistance training','strength gains',
           'power training','one rep max','1rm','testing strength',
           'how to increase strength','how to lift heavier','lift heavier',
           'progressive weight','add weight','increase weight',
           'plateau in strength','strength plateau','otot tak besar',
           'tak gain muscle','muscle not growing','why no muscle',
           'why not getting stronger','rasa tak kuat','rasa macam tak ada muscle',
           'nak vascular','vascular','veins','nak visible abs',
           'visible abs','defined muscles','shredded','ripped body',
           'shredded physique','body transformation','transformasi badan'])) return 'muscle_building';

  // ── ISLAMIC FITNESS ───────────────────────────────────────────────────────────
  if (has(['halal workout','halal exercise','workout during ramadan',
           'exercise during ramadan','puasa workout','boleh exercise masa puasa',
           'gym masa puasa','workout masa fasting','islamic fitness',
           'solat dan workout','workout selepas solat','doa sebelum workout',
           'niat workout','workout untuk muslim','senaman dalam islam',
           'islam dan fitness','halal supplement','halal protein',
           'berpuasa dan gym','puasa dan bersenam','workout ramadan',
           'exercise ramadan','fitness muslim','senaman waktu puasa',
           'gym waktu puasa','berbuka puasa dan exercise','iftar dan workout',
           'sahur dan workout','meal plan ramadan','pemakanan ramadan',
           'cara makan masa puasa','diet masa puasa','puasa dan diet',
           'puasa dan bina muscle','nak kekal fit masa puasa',
           'jaga fitness masa puasa','tak nak gemuk masa puasa',
           'takut gemuk lepas raya','raya season weight gain',
           'exercise untuk wanita muslim','senaman untuk wanita bertudung',
           'home workout untuk wanita','workout di rumah wanita',
           'aurat dan exercise','gym yang sesuai untuk wanita',
           'ladies gym','all female gym','islamic sports'])) return 'islamic_fitness';

  // ── MOTIVATION / PROGRESS ─────────────────────────────────────────────────────
  if (has(['my goal','set a goal','track my progress','no progress','slow progress',
           'hit a plateau','plateau','stuck in my progress','not improving',
           'goal setting','need motivation','give me motivation','motivate me',
           'i need a push','keep me going','how to stay motivated','stay consistent',
           'be consistent','dont give up','never give up','matlamat','nak improve',
           'tak ada progress','tiada kemajuan','motivasi sikit','kasi semangat',
           'bagi semangat','push me','encourage me','stay on track',
           'i am struggling','im struggling','rasa nak give up','nak give up',
           'keep pushing','push through','power through','stay focused',
           'stay disciplined','build discipline','build habit','new habit',
           'break bad habit','consistency','be consistent','how to be consistent',
           'cara nak konsisten','cara nak istiqamah','istiqamah','commitment',
           'dedication','how to stay dedicated','vision board','fitness goals',
           'short term goal','long term goal','milestone','celebrate progress',
           'results taking long','why no results','bila akan nampak result',
           'when will i see results','results slow','impatient with results',
           'transformation journey','fitness journey','wellness journey'])) return 'progress';

  // ── QUOTE ─────────────────────────────────────────────────────────────────────
  if (has(['give me a quote','share a quote','quote of the day','motivational quote',
           'inspirational quote','need a quote','send me a quote','daily quote',
           'quote about','wise words','words of wisdom','affirmation',
           'positive affirmation','life quote','fitness quote','success quote',
           'courage quote','happiness quote','perseverance quote','discipline quote',
           'resilience quote','mindset quote','islamic quote','kata kata',
           'petikan','pepatah','motivasi','mutiara kata','kata semangat',
           'ayat motivasi','quote untuk','give quote','nak quote','share quote',
           'need inspiration','inspirasi','kata hikmah','kata bijak',
           'boost confidence','uplift me','cheer me up','semangat sikit',
           'bagi quote','bagi motivasi','kata-kata semangat','ayat semangat',
           'quote tentang','inspire me','something inspiring','something motivating',
           'cheer me up with a quote','need uplifting words','feel inspired',
           'feeling uninspired','nak rasa semangat','nak terus bersemangat',
           'kata perangsang','perangsang semangat','beri saya kata semangat'])) return 'quote';

  // ── COMPLIMENT ────────────────────────────────────────────────────────────────
  if (has(['thank you','thanks','thank u','tq ','tq!','terima kasih','tenkiu',
           'thankful','appreciate','you are helpful','you are great','you are good',
           'well done','nice work','great bot','good bot','helpful bot',
           'love this','so helpful','really helpful','bagus','hebat',
           'best coach','pandai','good job','syabas','mantap','terbaik',
           'kau memang bagus','coach terbaik','best la kau','you rock',
           'awesome','brilliant','you helped me','this helped','great advice',
           'good advice','love your advice','this is useful','very useful',
           'love chatting with you','you understand me','you get me',
           'feel better now','feeling better after talking','coach is great',
           'amazing coach','best assistant','great assistant','incredible',
           'wow coach','wah coach','coach best gila','coach pandai gila',
           'kagum dengan coach','impressed','suka cakap dengan coach',
           'senang cakap dengan coach','coach faham saya','terima kasih coach',
           'thanks coach','tq coach','tenkiu coach','appreciate it'])) return 'compliment';

  // ── HABIT / CONSISTENCY ───────────────────────────────────────────────────────
  if (has(['build a habit','build habits','form a habit','make it a habit',
           'how to be consistent','stay consistent','consistency tips',
           'how to stick to','stick to my plan','build routine','daily routine',
           'morning routine','night routine','workout routine habit',
           'how to make exercise a habit','exercise habit','healthy habits',
           'break a bad habit','quit bad habit','stop bad habit',
           'cara nak konsisten','cara jadi konsisten','nak istiqamah',
           'macam mana nak istiqamah','bina tabiat','tabiat sihat',
           'rutin harian','rutin sihat','disiplin diri','cara nak berdisiplin',
           '21 days habit','how long to form habit','accountability',
           'how to stay disciplined','self discipline tips','tips disiplin'])) return 'habit_building';

  // ── TIME OF DAY / WHEN TO WORKOUT ─────────────────────────────────────────────
  if (has(['best time to workout','best time to exercise','when to workout',
           'when should i exercise','morning workout','evening workout',
           'night workout','workout in the morning','workout at night',
           'is it bad to workout at night','workout before bed','exercise before sleep',
           'morning or evening workout','bila masa terbaik workout',
           'bila nak workout','workout pagi atau malam','senaman pagi',
           'senaman malam','exercise waktu pagi','workout waktu malam',
           'time terbaik untuk gym','pukul berapa nak gym','best time gym',
           'fasted workout','workout on empty stomach','workout before breakfast',
           'should i eat before workout','exercise after eating','workout after meal',
           'how long after eating'])) return 'time_of_day';

  // ── GYM ETIQUETTE / TIPS ──────────────────────────────────────────────────────
  if (has(['gym etiquette','gym rules','gym tips','first day at gym','gym anxiety',
           'gym intimidation','scared of gym','nervous about gym','gym beginner tips',
           'how to use gym equipment','how to use machines','gym machine guide',
           'what to bring to gym','what to wear to gym','gym bag essentials',
           'gym membership','should i get a personal trainer','need a trainer',
           'personal trainer worth it','gym buddy','workout partner',
           'malu pergi gym','takut pergi gym','first time gym tips',
           'apa nak bawa gym','apa nak pakai gym','perlu personal trainer ke',
           'cara guna mesin gym','gym manners','re rack weights'])) return 'gym_etiquette';

  // ── HOME / NO EQUIPMENT ───────────────────────────────────────────────────────
  if (has(['home workout no equipment','no equipment workout','bodyweight only',
           'workout without equipment','workout at home no gym','no gym workout',
           'cant afford gym','no gym access','exercise at home',
           'home exercise no equipment','workout in small space',
           'apartment workout','workout di rumah tanpa alat','senaman tanpa alat',
           'workout tanpa gym','senaman di rumah','exercise rumah',
           'tak ada gym','tak mampu gym','no dumbbells','no weights at home',
           'minimal equipment','resistance band only','just bodyweight',
           'what can i do at home','workout guna badan je','senaman guna berat badan'])) return 'home_equipment';

  // ── WOMEN'S FITNESS ───────────────────────────────────────────────────────────
  if (has(['workout for women','exercise for women','female workout','women fitness',
           'workout during period','exercise during period','period and exercise',
           'workout on my period','menstruation exercise','pms workout',
           'pregnancy workout','workout while pregnant','postpartum workout',
           'after giving birth exercise','toning for women','women weight loss',
           'will i get bulky','women lifting weights','do women need protein',
           'senaman untuk wanita','workout untuk perempuan','senaman masa period',
           'exercise masa haid','workout masa mengandung','senaman selepas bersalin',
           'wanita angkat berat','perempuan gym','toning badan wanita',
           'takut jadi bulky','nak toned bukan bulky'])) return 'women_fitness';

  // ── GENERAL FITNESS Q&A ───────────────────────────────────────────────────────
  if (has(['does muscle weigh more than fat','muscle vs fat weight',
           'is soreness good','no pain no gain','should i feel sore',
           'why am i not sore','do i need rest days','can i workout everyday',
           'workout everyday ok','is cardio bad for muscle','too much cardio',
           'will running make me lose muscle','spot reduction','can i target fat',
           'targeted fat loss','reduce fat specific area','how long to see results',
           'how long to build muscle','how long to lose weight','realistic timeline',
           'natural vs steroids','are steroids worth','is it natural',
           'genetics in fitness','am i too old to start','too old to workout',
           'is it too late','can i build muscle at home','do supplements work',
           'is breakfast important','should i skip breakfast','metabolism',
           'how to boost metabolism','slow metabolism','fast metabolism',
           'what is bmr','what is tdee','what is hypertrophy','what is progressive overload',
           'what does reps mean','what does sets mean','apa itu','maksud',
           'is walking enough','is walking good exercise','are squats enough'])) return 'general_fitness_qa';

  // ── WORKOUT (broad — catches everything else workout-related) ─────────────────
  if (has(['workout','exercise','training','gym','chest workout','arm workout',
           'leg workout','back workout','shoulder workout','abs workout',
           'core workout','full body workout','upper body','lower body',
           'push day','pull day','leg day','push pull legs','push up','squat',
           'deadlift','bench press','pull up','chin up','lat pulldown',
           'bicep curl','tricep','lunge','plank','crunch','sit up','dip',
           'calf raise','barbell','dumbbell','resistance band','cable machine',
           'home workout','outdoor workout','bodyweight workout','hiit',
           'circuit training','superset','drop set','bersenam','latihan',
           'senaman','pergi gym','workout hari ni','boleh suggest workout',
           'nak workout','workout apa','senaman apa','latihan untuk',
           'gym hari ni','exercise untuk','nak exercise','mula workout',
           'start workout','nak bersenam','nak pergi gym','strength training',
           'weight training','lifting weights','angkat besi','angkat berat',
           'latihan berat','nak kuat','senaman kekuatan','muscle workout',
           'functional training','sport specific training','athletic training',
           'crossfit','f45','orangetheory','les mills','bodypump','bodyattack',
           'yoga','pilates','dance fitness','barre','kickboxing workout',
           'muay thai training','bjj training','martial arts fitness',
           'what exercise','which exercise','exercise recommendation',
           'recommend exercise','cadang senaman','nak senaman apa',
           'senaman untuk','exercise untuk bahagian','what workout today'])) return 'workout';

  // ── MEAL / FOOD (broad) ───────────────────────────────────────────────────────
  if (has(['meal plan','healthy meal','healthy food','what to eat','food recommendation',
           'recipe','suggest food','suggest meal','healthy recipe','breakfast idea',
           'lunch idea','dinner idea','snack idea','meal idea','low calorie meal',
           'high protein meal','weight loss meal','bulking meal','keto meal',
           'vegan meal','vegetarian meal','what can i eat','healthy snack',
           'pre workout meal','post workout meal','meal prep','food prep',
           'makan apa','makanan apa','cadang makanan','resepi','makanan sihat',
           'makanan untuk','nak makan apa','apa elok makan','boleh suggest makanan',
           'masak apa','menu apa','lauk apa','nak masak apa','sarapan apa',
           'makan tengahari','makan malam','nak diet makan apa',
           'makanan rendah kalori','makanan tinggi protein','makanan untuk diet',
           'i am hungry','im hungry','lapar','nak makan','cari makanan',
           'cadang menu','apa yang boleh makan','food idea','food tip',
           'makanan selepas workout','makan sebelum workout','bila nak makan',
           'what to cook','nak masak','ideas untuk makan','idea makanan',
           'healthy breakfast','healthy lunch','healthy dinner','healthy snacks',
           'malaysian healthy food','makanan malaysia yang sihat',
           'nasi sihat','nasi lemak sihat','makanan melayu sihat',
           'indian food healthy','chinese food healthy','makanan india',
           'makanan cina','mee sihat','kuih sihat','roti sihat',
           'buah buahan','fruits for health','vegetables','sayur sayuran',
           'superfood','makanan super','makanan terbaik','best food to eat',
           'worst food to eat','food to avoid','makanan yang perlu elak',
           'junk food','fast food','processed food','makanan segera',
           'makanan berkhasiat','nutritious meals'])) return 'meal';

  // ── PERSONALISED: catch-all ───────────────────────────────────────────────────
  if (has(['my health','my body','my condition','how is my','my wellness','my status',
           'kesihatan saya','badan saya','kondisi saya','status saya',
           'macam mana badan','check badan saya','my stats','my data',
           'my profile','based on me','for me specifically','personalised'])) return 'personalised_overview';

  // ── SMART PARTIAL FALLBACK — single strong keyword catches ────────────────────
  // If a clear topic word appears anywhere, route to closest intent instead of unknown
  if (has(['workout','exercise','gym','senaman','latihan','bersenam'])) return 'workout';
  if (has(['eat','food','makan','makanan','meal','recipe','resepi','diet'])) return 'meal';
  if (has(['quote','motivat','semangat','inspir','motivasi'])) return 'quote';
  if (has(['sad','sedih','stress','tension','penat','tired','depress','anxious','risau'])) return 'emotional_stress';
  if (has(['sleep','tidur','rest','rehat'])) return 'sleep_advice';
  if (has(['water','air','hydrat','minum'])) return 'hydration';
  if (has(['pain','sakit','hurt','injury','cedera','sore','lenguh'])) return 'injury';
  if (has(['weight','berat','kurus','gemuk','fat','lemak','slim'])) return 'weight_management';
  if (has(['protein','nutrition','vitamin','calorie','kalori','nutrien','macro'])) return 'nutrition_advice';
  if (has(['muscle','otot','strength','kuat','bina badan'])) return 'muscle_building';
  if (has(['cardio','run','lari','jog','cycling','hiit'])) return 'cardio_specific';
  if (has(['supplement','suplemen','creatine','whey'])) return 'supplement';
  if (has(['health','kesihatan','sihat','wellness','fit'])) return 'health_checkin';
  if (has(['motivat','goal','matlamat','progress','consistent','disiplin'])) return 'progress';

  return 'unknown';
}

// ── Workout Category Extraction ───────────────────────────────────────────────
function extractWorkoutCategory(message) {
  const m = message.toLowerCase();
  const map = {
    'Abs':       ['abs','core','stomach','belly','six pack','crunch','plank','sit up','tummy'],
    'Arms':      ['arm','bicep','tricep','forearm','upper arm','curl','dip','hammer'],
    'Back':      ['back','lat','spine','rear','rhomboid','deadlift','row','pull up','pullup'],
    'Calves':    ['calf','calves','lower leg','calf raise'],
    'Chest':     ['chest','pec','breast','push up','pushup','bench','incline','decline'],
    'Legs':      ['leg','squat','quad','hamstring','thigh','lunge','glute','hip','butt'],
    'Shoulders': ['shoulder','delt','overhead','press','lateral raise','front raise'],
    'Cardio':    ['cardio','run','jog','hiit','aerobic','endurance','sprint','jump rope','cycling','swimming','treadmill']
  };
  for (const [cat, keywords] of Object.entries(map)) {
    if (keywords.some(k => m.includes(k))) return cat;
  }
  return null;
}

// ── Meal Keyword Extraction ───────────────────────────────────────────────────
function extractMealKeyword(message) {
  const m = message.toLowerCase();

  const dietMap = [
    { triggers: ['keto','ketogenic'],                                                          query: 'chicken',       diet: 'ketogenic'   },
    { triggers: ['vegan'],                                                                     query: 'vegetables',    diet: 'vegan'       },
    { triggers: ['vegetarian'],                                                                query: 'pasta',         diet: 'vegetarian'  },
    { triggers: ['paleo'],                                                                     query: 'salmon',        diet: 'paleo'       },
    { triggers: ['gluten free','gluten-free'],                                                 query: 'rice',          diet: 'gluten free' },
    { triggers: ['low carb','low-carb'],                                                       query: 'salad',         diet: null          },
    { triggers: ['high protein','muscle','bulking','bulk','gain muscle'],                       query: 'chicken breast',diet: null          },
    { triggers: ['low calorie','low-calorie','weight loss','cutting','slim','diet food','nak kurus','turun berat'], query: 'salad', diet: null },
    { triggers: ['intermittent fasting','fasting','if diet'],                                  query: 'eggs',          diet: null          },
    { triggers: ['halal'],                                                                     query: 'chicken',       diet: null          },
    { triggers: ['healthy','clean eating','clean'],                                            query: 'salad',         diet: null          },
    { triggers: ['diabetic','diabetes','low sugar','low-sugar'],                               query: 'quinoa',        diet: null          },
    { triggers: ['heart healthy','cholesterol','low fat','low-fat'],                           query: 'salmon',        diet: null          },
    { triggers: ['mediterranean'],                                                             query: 'mediterranean', diet: null          },
    { triggers: ['asian','rice','noodle','nasi','mee','bihun'],                                query: 'rice bowl',     diet: null          },
  ];

  for (const entry of dietMap) {
    if (entry.triggers.some(t => m.includes(t))) return { query: entry.query, diet: entry.diet, label: entry.triggers[0] };
  }

  // Meal time
  if (m.includes('breakfast') || m.includes('sarapan'))     return { query: 'eggs',     diet: null, label: 'Breakfast' };
  if (m.includes('lunch') || m.includes('tengahari'))        return { query: 'sandwich', diet: null, label: 'Lunch'     };
  if (m.includes('dinner') || m.includes('malam'))          return { query: 'chicken',  diet: null, label: 'Dinner'    };
  if (m.includes('snack') || m.includes('snek'))            return { query: 'smoothie', diet: null, label: 'Snack'     };
  if (m.includes('dessert') || m.includes('sweet') || m.includes('pencuci mulut')) return { query: 'fruit salad', diet: null, label: 'Dessert' };
  if (m.includes('soup') || m.includes('sup'))              return { query: 'soup',     diet: null, label: 'Soup'      };

  // Specific ingredients
  const ingredients = ['chicken','beef','fish','salmon','tuna','egg','rice','pasta','potato','tofu','mushroom','shrimp','turkey','lamb','broccoli','spinach','avocado'];
  for (const ing of ingredients) {
    if (m.includes(ing)) return { query: ing, diet: null, label: ing };
  }

  // Extract from sentence
  const match = m.match(/(?:eat|food|meal|cook|recipe for|suggest|recommend|cadang|makan)\s+([a-z\s]+)/);
  if (match) {
    const extracted = match[1].trim().split(' ').slice(0, 2).join(' ');
    if (extracted.length > 2) return { query: extracted, diet: null, label: extracted };
  }

  return { query: 'healthy chicken', diet: null, label: 'Healthy' };
}

// ── Quote Category Extraction ──────────────────────────────────────────────────
function extractQuoteCategory(message) {
  const m = message.toLowerCase();
  const map = {
    'success':       ['success','achieve','goal','accomplish','win','victory','berjaya','capai','matlamat'],
    'inspirational': ['motivat','inspir','encourage','keep going','never give up','fitness','exercise','workout','sport','strong','semangat','motivasi'],
    'wisdom':        ['wisdom','wise','knowledge','learn','education','mind','bijak','ilmu','belajar'],
    'courage':       ['courage','brave','fear','bold','confidence','berani','takut','yakin'],
    'happiness':     ['happy','happiness','joy','smile','positive','gembira','bahagia','senyum'],
    'life':          ['life','living','journey','path','purpose','health','healthy','wellness','hidup','perjalanan'],
    'philosophy':    ['philosophy','think','reflect','meaning','fikir','renungan'],
    'truth':         ['truth','honest','real','genuine','jujur','benar'],
    'resilience':    ['resilient','resilience','bounce back','overcome','tough','persist','tabah','sabar','ketabahan'],
    'mindset':       ['mindset','attitude','perspective','growth','belief','fikiran','sikap'],
    'friendship':    ['friend','friendship','relationship','kawan','sahabat','persahabatan'],
    'gratitude':     ['grateful','gratitude','thankful','appreciate','syukur','bersyukur','alhamdulillah']
  };
  for (const [cat, words] of Object.entries(map)) {
    if (words.some(w => m.includes(w))) return cat;
  }
  return 'inspirational';
}

// ── Emotional Response Templates ───────────────────────────────────────────────
const RESPONSES = {

  emotional_sad: [
    "I'm really sorry to hear you're feeling sad 💙 It's completely okay to not be okay sometimes. Your feelings are valid and you don't have to go through this alone.<br><br>Here's what can help:<br>🏃 <strong>Light exercise</strong> releases endorphins — nature's mood booster<br>🌳 <strong>Go outside</strong> — fresh air and sunlight help<br>💬 <strong>Talk to someone</strong> you trust<br>🎵 <strong>Music</strong> — uplifting playlist works wonders<br><br>Would you like a <strong>motivational quote</strong> or a <strong>gentle workout</strong> to help lift your mood? 💙",
    "Hey, I hear you 💙 Feeling sad is a natural part of life, and acknowledging it takes courage. Be gentle with yourself today — you deserve kindness, especially from yourself.<br><br>Sometimes the best thing you can do is:<br>✅ Take a short walk<br>✅ Do light stretching<br>✅ Write down your feelings<br>✅ Rest without guilt<br><br>Want a <strong>calming quote</strong> or a <strong>light activity suggestion</strong>?",
    "I'm sorry you're going through this 😔 Remember — storms don't last forever, and neither does sadness. Every dark moment passes.<br><br>Did you know? <strong>Exercise is clinically proven to reduce sadness</strong> — even 20 minutes releases serotonin and dopamine. Want me to suggest something gentle and achievable today?"
  ],

  emotional_stress: [
    "I can feel the pressure you're under 😤 Stress is tough, but you're tougher! Let's tackle this:<br><br>🧘 <strong>Box Breathing (4-4-4-4):</strong> Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4x<br>🏃 <strong>Cardio</strong> — 20 mins reduces cortisol (stress hormone) by up to 26%<br>📝 <strong>Brain dump</strong> — write everything stressing you, then prioritise<br>😴 <strong>Sleep</strong> — stress and poor sleep create a vicious cycle<br><br>Want a <strong>stress-busting workout</strong> or a <strong>calming quote</strong>?",
    "Hey, take a deep breath 🌬️ In... and out... You don't have to handle everything at once. Break it down — one thing, one moment at a time.<br><br>The <strong>science of stress management:</strong><br>💪 Exercise reduces adrenaline & cortisol<br>🧘 Meditation lowers blood pressure<br>😴 Sleep resets the nervous system<br>🥗 Nutrition affects mood directly<br><br>Shall I suggest a quick <strong>stress-relieving workout</strong>?",
    "Stress is just your body's way of saying it needs attention 💪 You're not broken — you're human. Let's channel that energy constructively!<br><br>Quick stress relief techniques:<br>🌬️ 5 deep breaths right now<br>🚶 10-minute walk outside<br>💧 Drink a full glass of water<br>📵 5 minutes away from screen<br><br>A good workout is one of the most powerful stress relievers — want one?"
  ],

  emotional_tired: [
    "Rest is NOT laziness — it's essential for growth and performance 😴 Your body repairs, rebuilds, and strengthens during recovery.<br><br>Are you getting:<br>✅ 7–9 hours of sleep?<br>✅ Enough calories and protein?<br>✅ Adequate rest days?<br>✅ Enough water? (Dehydration = fatigue!)<br><br>Today, consider <strong>active recovery</strong>: light walk, yoga, or stretching. Want suggestions?",
    "Feeling drained is your body sending signals — listen to it! 🌙 Recovery is as important as training. Even elite athletes schedule rest days.<br><br>Tips to restore energy:<br>💧 Drink 500ml water right now<br>🍌 Have a banana — natural energy boost<br>😴 Power nap: 20 minutes max<br>🧘 5-minute deep breathing<br>🚶 Gentle walk in sunlight<br><br>Want a <strong>light recovery workout</strong> or sleep tips?",
    "Hey, even champions take rest days 🛌 If you're exhausted, respect that — your body is asking for recovery time. Pushing through severe fatigue leads to injury and burnout.<br><br>Signs you need rest:<br>⚠️ Persistent fatigue despite sleep<br>⚠️ Decreased performance<br>⚠️ Mood changes<br>⚠️ Frequent illness<br><br>Prioritise sleep tonight and do a <strong>light activity tomorrow</strong>. Want tips?"
  ],

  emotional_angry: [
    "That frustration is real and valid 💥 Don't suppress it — channel it! Anger is energy, and the gym is the perfect place to release it.<br><br>Best workouts for releasing anger:<br>🥊 <strong>Boxing/Punching bag</strong> — incredible stress release<br>🏋️ <strong>Heavy lifting</strong> — channel raw energy<br>🏃 <strong>Sprint intervals</strong> — burn off adrenaline<br>🧗 <strong>Rock climbing</strong> — total focus required<br><br>Want me to suggest a <strong>high-intensity workout</strong> to channel that energy?",
    "I hear you — sometimes things just build up and it's too much 😤 That's completely human.<br><br>Before reacting, try:<br>🌬️ <strong>10 deep breaths</strong> — resets the nervous system<br>💦 <strong>Cold water on face</strong> — activates calm response<br>🚶 <strong>Walk away</strong> for 5 minutes<br>💪 <strong>Exercise</strong> — proven anger management tool<br><br>Remember: you're in control of your response. Ready for a <strong>workout to release that tension</strong>?",
    "Anger, when channelled right, is incredible fuel 🔥 The most intense workouts often come from the most emotional days.<br><br>Science says: exercise reduces anger hormones (adrenaline, cortisol) within 20-30 minutes.<br><br>Best options:<br>🏃 Running — pound that pavement<br>🏋️ Compound lifts — squats, deadlifts<br>🥊 Shadow boxing<br>🚴 Cycling sprint<br><br>Shall I get you a <strong>workout recommendation</strong>?"
  ],

  emotional_happy: [
    "That energy is EVERYTHING! 🌟 Happy people train better, recover faster, and are more consistent. Ride this wave!<br><br>Since you're feeling great, this is the PERFECT time to:<br>💪 Try a <strong>harder workout</strong> than usual<br>🎯 <strong>Set a new fitness goal</strong><br>🍽️ Try a <strong>new healthy recipe</strong><br>📊 <strong>Evaluate your health status</strong> — you'll love the results!<br><br>What shall we tackle today? 🚀",
    "Love the positive vibes! 🎉 This happiness is your body telling you you're on the right track. Keep building on this momentum!<br><br>Happy hormones are boosted by:<br>💪 Exercise (endorphins)<br>🌞 Sunlight (serotonin)<br>😴 Good sleep (melatonin balance)<br>🥗 Nutritious food (gut-brain connection)<br><br>Want to supercharge this mood with a <strong>great workout</strong> or <strong>healthy meal idea</strong>?",
    "You're glowing and it shows! 😊 Happiness + consistency = transformation. Don't stop now!<br><br>Today would be a great day to:<br>🏆 <strong>Push a personal record</strong><br>🥗 <strong>Prep healthy meals</strong> for the week<br>📊 <strong>Check your health metrics</strong><br>✨ <strong>Share that energy</strong> with others<br><br>What would you like to do today? 🌟"
  ],

  emotional_lowmotivation: [
    "Motivation is temporary — <strong>discipline is what transforms you</strong> 💪 Every master was once a beginner who refused to quit.<br><br>Use the <strong>5-Minute Rule:</strong> Commit to just 5 minutes of exercise. That's all. Once you start, your body takes over. 9/10 times you'll finish the full workout.<br><br>Remember why you started. Write it down. Put it where you can see it daily.<br><br>Want me to suggest a <strong>quick starter workout</strong> — just 10 minutes? 🚀",
    "Hey, you showed up today — that already counts! 🌱 Motivation comes and goes like waves. The secret? <strong>Build habits so strong you don't need motivation.</strong><br><br>Start ridiculously small:<br>✅ 10 push-ups before breakfast<br>✅ 15-minute walk after dinner<br>✅ One healthy meal today<br><br>Momentum builds from tiny wins. Ready for a <strong>short achievable workout</strong>?",
    "Even the greatest athletes have off days 🔄 The difference? They show up anyway.<br><br>Scientifically proven motivation boosters:<br>🎵 <strong>Music</strong> — upbeat playlist increases performance by 15%<br>👥 <strong>Accountability</strong> — workout buddy keeps you consistent<br>📊 <strong>Track progress</strong> — seeing results fuels motivation<br>🏆 <strong>Rewards</strong> — celebrate small wins<br><br>FitAlchemy tracks all of this for you! Let me suggest a <strong>quick achievable workout</strong> 💪"
  ],

  emotional_lonely: [
    "I hear you — loneliness is one of the hardest feelings to sit with 💙 But you reached out today, and that takes strength.<br><br>Some gentle reminders:<br>🌟 Being alone ≠ being lonely — quality over quantity<br>💪 Exercise in group settings (classes, parks) builds community<br>🌍 Online fitness communities are incredibly supportive<br>🐕 Even a pet or plant can help!<br><br>Fitness is also a great way to meet like-minded people. Want a <strong>workout suggestion</strong> to get you out of the house?",
    "You're not alone in feeling alone — millions feel this way 💙 It's okay to acknowledge it.<br><br>What helps:<br>🏃 <strong>Group exercise classes</strong> — natural social connection<br>📱 <strong>Online fitness communities</strong><br>🎯 <strong>Goal-based challenges</strong> — shared purpose builds bonds<br>🌳 <strong>Outdoor activities</strong> — parks, hiking<br><br>Focus on what you can control — your health, your growth. Want to start with a <strong>workout or motivational quote</strong>?"
  ],

  emotional_overthinking: [
    "Overthinking is like a rocking chair — it keeps you busy but gets you nowhere 🧠 Let's break the cycle!<br><br>Science-backed solutions:<br>🏃 <strong>Exercise</strong> — forces your brain to focus on the body<br>🧘 <strong>Mindfulness</strong> — 5-minute breathing exercise<br>📝 <strong>Write it down</strong> — externalise the thoughts<br>⏰ <strong>Set a worry time</strong> — 15 mins/day only<br>🎯 <strong>Take action</strong> — action defeats overthinking<br><br>A good workout is the fastest way to quiet a racing mind. Want a <strong>focused workout suggestion</strong>?",
    "Racing thoughts? Your mind needs a physical outlet 🌀 Exercise is literally prescribed by doctors for anxiety and overthinking.<br><br>Try this right now:<br>🌬️ <strong>4-7-8 breathing:</strong> Inhale 4s, Hold 7s, Exhale 8s<br>📱 <strong>Put the phone down</strong> for 30 minutes<br>🏃 <strong>Go for a walk</strong> — moving forward physically helps mentally<br><br>Want me to suggest a <strong>mindful workout</strong> to help clear your head?"
  ],

  health_checkin: [
    "Great that you're checking in! 📊 Your <strong>Health Status</strong> in FitAlchemy evaluates 3 dimensions:<br><br>🫀 <strong>Physical</strong> — based on your BMI + dietary fat ratio from saved meals<br>💪 <strong>Fitness</strong> — based on your workout routine minutes vs WHO 2020 guidelines (150 min/week)<br>🧠 <strong>Mental</strong> — based on sentiment analysis of our conversations using clinical lexicon<br><br>Go to your <a href='/dashboard.html' style='color:var(--fa-teal);font-weight:700;'>Dashboard</a> → click <strong>\"Evaluate My Health\"</strong> for your latest scores!<br><br>Make sure your <a href='/profile.html' style='color:var(--fa-teal);font-weight:700;'>Profile</a> has your height & weight for an accurate physical score! 🎯",
    "I love that you're being proactive about your health! 🏥 FitAlchemy's health evaluation is data-driven — it uses your actual workout data, meal nutrition, and chat history.<br><br>For best results, ensure:<br>✅ Height & weight set in <a href='/profile.html' style='color:var(--fa-teal);font-weight:700;'>Profile</a><br>✅ Exercises added to your <strong>Workout Routine</strong><br>✅ Meals saved in your <strong>Meal Plan</strong><br>✅ Keep chatting — mental status tracks conversation sentiment!<br><br>Then hit <strong>\"Evaluate My Health\"</strong> on the Dashboard! 🚀"
  ],

  body_concern: [
    "Body image matters — but <strong>health is so much more than a number</strong> 💙 BMI is a useful tool but not the full picture. Muscle is denser than fat, so a fit person can have a 'high' BMI.<br><br>What actually matters:<br>✅ <strong>Energy levels</strong> — do you feel energetic?<br>✅ <strong>Strength</strong> — are you getting stronger?<br>✅ <strong>Sleep quality</strong> — are you sleeping well?<br>✅ <strong>Mood</strong> — do you feel good?<br><br>Update your height & weight in <a href='/profile.html' style='color:var(--fa-teal);font-weight:700;'>Profile</a> to see your BMI!<br>Want a <strong>workout</strong> or <strong>nutrition advice</strong>?",
    "Weight management is a journey, not a sprint 🐢 Sustainable change = consistent healthy habits over time.<br><br>Evidence-based approach:<br>🏃 <strong>Exercise:</strong> 150+ min/week (WHO recommendation)<br>🥗 <strong>Diet:</strong> Protein 1.6g/kg body weight, fat <30% calories<br>😴 <strong>Sleep:</strong> 7-9 hours (affects hunger hormones!)<br>💧 <strong>Water:</strong> 2-3 litres daily<br>📊 <strong>Track:</strong> Use FitAlchemy to monitor progress<br><br>Want a <strong>specific workout or meal plan</strong> for your goals?"
  ],

  sleep_advice: [
    "Sleep is your <strong>#1 performance drug</strong> — and it's free! 😴 Here's the complete science-backed sleep guide:<br><br>🌙 <strong>Duration:</strong> 7–9 hours (WHO recommendation)<br>📵 <strong>No screens:</strong> 60 mins before bed (blue light disrupts melatonin)<br>🌡️ <strong>Temperature:</strong> 18-20°C optimal for sleep<br>⏰ <strong>Consistency:</strong> Same bedtime EVERY day — even weekends<br>🚫 <strong>No caffeine</strong> after 2pm<br>🍌 <strong>Sleep foods:</strong> Banana, almonds, warm milk, chamomile tea<br>🧘 <strong>Wind down:</strong> Light stretching or reading 30 mins before bed<br><br>Good sleep = better workouts + better mood + better health! 💪",
    "Quality sleep is where gains actually happen! 🌟 During deep sleep:<br><br>💪 Growth hormone released (muscle repair)<br>🧠 Memory consolidation (skill learning)<br>❤️ Heart rate & blood pressure reset<br>🛡️ Immune system strengthens<br><br>Practical sleep hygiene:<br>✅ Dark room (blackout curtains)<br>✅ No heavy meals 2-3 hours before bed<br>✅ Consistent alarm time<br>✅ Limit naps to 20 minutes<br>✅ Exercise during day (not within 2hrs of sleep)<br><br>How many hours are you currently getting?"
  ],

  hydration: [
    "💧 Hydration is massively underrated in fitness! Here's the complete guide:<br><br><strong>Daily targets (European Food Safety Authority):</strong><br>👨 Men: <strong>3.7 litres/day</strong> total fluids<br>👩 Women: <strong>2.7 litres/day</strong> total fluids<br><br><strong>Signs of dehydration:</strong><br>⚠️ Dark yellow urine (target: pale yellow)<br>⚠️ Headache<br>⚠️ Fatigue & poor concentration<br>⚠️ Dry mouth<br>⚠️ Muscle cramps<br><br><strong>Fitness hydration:</strong><br>🏋️ Drink 500ml 2 hours before workout<br>🏃 Drink 150-250ml every 15-20 mins during<br>🔄 Rehydrate with 1.5x fluid lost after<br><br>Add lemon, cucumber or mint if plain water is boring! 🍋",
    "Water = life and performance! 💧 Even <strong>2% dehydration reduces athletic performance by up to 10%</strong>.<br><br>Simple hydration strategy:<br>☀️ Wake up: 500ml water immediately<br>🍽️ Before meals: 250ml<br>⏰ Every 2 hours: Set reminders<br>🏋️ During workout: Sip regularly<br>🌙 Before bed: 250ml<br><br>Tip: Eat water-rich foods — cucumber, watermelon, lettuce, oranges all count toward your daily intake!<br><br>How much water did you drink today?"
  ],

  injury: [
    "Sorry to hear you're in pain! 🩹 First — <strong>don't push through sharp or severe pain</strong>. Your body is warning you.<br><br><strong>RICE Method (immediate):</strong><br>🧊 <strong>R</strong>est — stop the activity immediately<br>🧊 <strong>I</strong>ce — 20 mins on, 20 mins off<br>🩹 <strong>C</strong>ompression — elastic bandage to reduce swelling<br>🦵 <strong>E</strong>levation — raise above heart level<br><br><strong>When to see a doctor:</strong><br>⚠️ Severe or worsening pain<br>⚠️ Swelling that doesn't improve in 48hrs<br>⚠️ Can't bear weight<br>⚠️ Numbness or tingling<br><br>Meanwhile, want <strong>injury-friendly exercises</strong> for other muscle groups?",
    "Injuries happen to everyone — including elite athletes 💪 The key is smart recovery.<br><br><strong>Recovery timeline:</strong><br>📅 Day 1-2: RICE method, complete rest<br>📅 Day 3-5: Gentle movement if pain allows<br>📅 Week 2: Light exercise on unaffected areas<br>📅 Week 3+: Gradual return to normal<br><br><strong>Work AROUND the injury:</strong><br>🦵 Knee injury? → Focus on upper body<br>💪 Shoulder injury? → Focus on legs and core<br>🔙 Back injury? → Swimming or gentle walking<br><br>Want specific <strong>safe exercise recommendations</strong> based on your injury?"
  ],

  nutrition_advice: [
    "Nutrition is <strong>70% of your fitness results</strong> — you can't out-train a bad diet! 🥗<br><br><strong>Key macronutrients (WHO guidelines):</strong><br>💪 <strong>Protein:</strong> 1.6-2.2g per kg body weight (muscle building/maintenance)<br>⚡ <strong>Carbohydrates:</strong> 45-65% of total calories (energy)<br>🥑 <strong>Fat:</strong> 20-35% of total calories (<30% WHO recommendation)<br><br><strong>Micronutrients to prioritise:</strong><br>🦴 Calcium (dairy, leafy greens)<br>🩸 Iron (red meat, spinach)<br>☀️ Vitamin D (sunlight, fatty fish)<br>🫀 Omega-3 (salmon, walnuts, flaxseed)<br><br>Want a <strong>meal suggestion</strong> based on your goals?",
    "Smart nutrition = better results, faster recovery, better mood! 🍽️<br><br><strong>Protein timing (evidence-based):</strong><br>🌅 Breakfast: Include protein (eggs, yogurt)<br>💪 Pre-workout: Light carbs 1-2hrs before<br>🔄 Post-workout: Protein within 30 mins (golden window)<br>🌙 Before bed: Casein protein (cottage cheese)<br><br><strong>Foods that boost performance:</strong><br>🍌 Bananas — potassium, natural energy<br>🐟 Salmon — omega-3, anti-inflammatory<br>🫐 Blueberries — antioxidants<br>🥚 Eggs — complete amino acid profile<br>🥜 Almonds — healthy fats + magnesium<br><br>Want me to find a <strong>specific recipe</strong>?"
  ],

  weight_management: [
    "Weight management comes down to <strong>energy balance</strong> — but the quality of that balance matters enormously! ⚖️<br><br><strong>To lose weight (calorie deficit):</strong><br>🔽 500 calorie deficit/day = ~0.5kg/week loss<br>🏃 Increase activity (burn more)<br>🥗 Reduce portions (eat less)<br>🍗 Prioritise protein (keeps you full)<br>💧 Drink water before meals<br><br><strong>To gain muscle (calorie surplus):</strong><br>🔼 250-500 calorie surplus/day<br>💪 Strength train 3-4x/week<br>🥩 1.6-2.2g protein/kg body weight<br>😴 8 hours sleep (growth hormone!)<br><br>Want a specific <strong>workout plan or meal suggestion</strong>?",
    "Sustainable weight management = habits, not crash diets! 🌱<br><br><strong>Evidence-based facts:</strong><br>✅ Slow loss (0.5-1kg/week) is most sustainable<br>✅ Muscle gain takes months — be patient<br>✅ Sleep deprivation increases hunger hormones (ghrelin) by 15%<br>✅ Stress causes fat storage (cortisol)<br>✅ Hydration affects metabolism<br><br><strong>FitAlchemy tools to help you:</strong><br>📊 <strong>Dashboard</strong> — track your BMI<br>🏋️ <strong>Workout page</strong> — build your routine<br>🍽️ <strong>Meal page</strong> — save healthy recipes<br>📈 <strong>Health Status</strong> — monitor progress<br><br>Want a <strong>workout or meal recommendation</strong>?"
  ],

  progress: [
    "Progress plateaus are normal — they're actually a sign your body has ADAPTED! 💪 Here's how to break through:<br><br><strong>Workout strategies:</strong><br>🔀 <strong>Progressive overload</strong> — increase weight/reps/sets weekly<br>🔄 <strong>Change exercises</strong> — shock the muscles<br>⏱️ <strong>Change tempo</strong> — slower reps = more time under tension<br>📅 <strong>Change frequency</strong> — more or fewer days<br><br><strong>Recovery strategies:</strong><br>😴 Are you sleeping 7-9 hours?<br>🥗 Are you eating enough protein?<br>💧 Are you hydrated?<br><br>Want a <strong>new workout challenge</strong> to break your plateau?",
    "Setting clear goals is the foundation of progress! 🎯 Use <strong>SMART goals:</strong><br><br>✅ <strong>S</strong>pecific — 'Bench press 80kg' not 'get stronger'<br>✅ <strong>M</strong>easurable — track weekly<br>✅ <strong>A</strong>chievable — realistic for your current level<br>✅ <strong>R</strong>elevant — aligned with your lifestyle<br>✅ <strong>T</strong>ime-bound — 'by December 2026'<br><br>FitAlchemy tracks your routines, meals, and health status automatically — use it as your progress diary! 📊<br><br>Want to <strong>set a new goal</strong> or get a <strong>workout recommendation</strong>?"
  ],

  workout_frequency: [
    "Great question! Here's the <strong>WHO 2020 Physical Activity Guidelines for Adults:</strong><br><br>💪 <strong>Minimum:</strong> 150 min moderate OR 75 min vigorous/week<br>🏆 <strong>Optimal:</strong> 300 min moderate OR 150 min vigorous/week<br>🏋️ <strong>Muscle strengthening:</strong> 2+ days/week<br>🧘 <strong>Flexibility:</strong> Daily if possible<br><br><strong>Practical split examples:</strong><br>📅 <strong>3 days/week:</strong> Full body each session<br>📅 <strong>4 days/week:</strong> Upper/Lower split<br>📅 <strong>5-6 days/week:</strong> Push/Pull/Legs split<br><br><strong>Rest days:</strong> 1-2 per week mandatory for recovery!<br><br>Want a <strong>workout suggestion</strong> for today?",
    "Consistency beats intensity every time! 📅 Here's how to structure your week:<br><br><strong>Beginner (0-6 months):</strong> 3x/week full body<br><strong>Intermediate (6-24 months):</strong> 4x/week upper/lower<br><strong>Advanced (2+ years):</strong> 5-6x/week with specialisation<br><br><strong>Key principle:</strong> More is NOT always better. Quality > Quantity. <br>Overtraining signs: chronic fatigue, decreased performance, mood changes, frequent illness.<br><br>Add exercises to your <a href='/wger.html' style='color:var(--fa-teal);font-weight:700;'>Workout Routine</a> and FitAlchemy tracks your fitness status! 💪"
  ],

  warmup_cooldown: [
    "Warm up and cool down are NON-NEGOTIABLE for injury prevention! 🔥❄️<br><br><strong>Proper Warm-Up (10-15 mins):</strong><br>1️⃣ 5 min light cardio (jog, jump rope)<br>2️⃣ Dynamic stretching (leg swings, arm circles)<br>3️⃣ Mobility work (hip circles, shoulder rolls)<br>4️⃣ Movement-specific prep (bodyweight squats before heavy squats)<br><br><strong>Proper Cool-Down (10-15 mins):</strong><br>1️⃣ 5 min slow walk<br>2️⃣ Static stretching (hold 20-30 secs each)<br>3️⃣ Focus on muscles worked<br>4️⃣ Foam rolling if available<br><br>Skipping these = higher injury risk + slower recovery. Want a <strong>full workout</strong> recommendation?",
    "Your warm-up and cool-down are as important as the workout itself! 🌡️<br><br><strong>Why warm up?</strong><br>🩸 Increases blood flow to muscles<br>🌡️ Raises muscle temperature (better performance)<br>🧠 Mental preparation<br>🛡️ Reduces injury risk by up to 50%<br><br><strong>Why cool down?</strong><br>❤️ Gradually lowers heart rate<br>🧘 Reduces muscle soreness<br>🔄 Removes metabolic waste (lactic acid)<br>😴 Promotes recovery<br><br>Want me to suggest a <strong>complete workout with warm-up and cool-down</strong>?"
  ],

  diet_comparison: [
    "There's no single 'best' diet — the best one is the one you can stick to! 🥗 Here's a science-based comparison:<br><br><strong>🥑 Keto:</strong> Very low carb, high fat. Great for weight loss, mental clarity. Hard to sustain long-term.<br><strong>⏰ Intermittent Fasting:</strong> 16:8 or 5:2. Simplifies eating, improves insulin sensitivity. Works well with any food type.<br><strong>🌿 Mediterranean:</strong> Balanced, evidence-based. Best for heart health and longevity.<br><strong>💪 High Protein:</strong> Best for muscle building. Keep protein at 1.6-2.2g/kg body weight.<br><strong>🌱 Plant-Based:</strong> Heart healthy, sustainable. Ensure adequate B12, iron, omega-3.<br><br>Recommendation: Choose what aligns with your <strong>lifestyle, goals, and food preferences</strong>.<br><br>Want meal ideas for any specific diet?",
    "The research is clear: <strong>adherence beats perfection</strong> 📊 The best diet is one you follow consistently.<br><br>Key principles ALL successful diets share:<br>✅ Whole foods over processed<br>✅ Adequate protein (1.6g+/kg)<br>✅ Plenty of vegetables<br>✅ Limited sugar and ultra-processed foods<br>✅ Hydration (2-3L/day)<br>✅ Calorie awareness<br><br>Want a <strong>specific meal recommendation</strong> based on your goal?"
  ],

  mental_wellness: [
    "Mental wellness is the foundation of physical health 🧠 They're inseparable — a healthy mind drives a healthy body.<br><br><strong>Science-backed mental wellness practices:</strong><br>🏃 <strong>Exercise</strong> — reduces anxiety by 48% (Harvard study)<br>🧘 <strong>Meditation</strong> — 10 mins/day reduces cortisol significantly<br>😴 <strong>Sleep</strong> — mental health deteriorates rapidly with sleep deprivation<br>🥗 <strong>Nutrition</strong> — gut-brain connection is real (95% of serotonin in gut!)<br>☀️ <strong>Sunlight</strong> — vitamin D deficiency linked to depression<br>🤝 <strong>Social connection</strong> — essential for mental health<br><br>FitAlchemy supports all of these through workouts, meals, and CoachAlchemy! 💙<br><br>Want to start with a <strong>mindful workout</strong>?",
    "Mindfulness and exercise are the two most evidence-based interventions for mental health 🧘<br><br><strong>Simple mindfulness techniques:</strong><br>🌬️ <strong>4-7-8 breathing:</strong> In 4s, hold 7s, out 8s<br>🎯 <strong>5-4-3-2-1 grounding:</strong> 5 things you see, 4 hear, 3 touch, 2 smell, 1 taste<br>📝 <strong>Gratitude journal:</strong> 3 things daily<br>🚶 <strong>Mindful walking:</strong> Focus on each step<br><br>Combined with regular exercise? Incredibly powerful for mental wellness. Want to <strong>explore workouts</strong> that boost mental health?"
  ],

  compliment: [
    "Aww, that genuinely made my day! 😊 I'm really glad I could help. That's exactly what I'm here for!<br><br>Remember — I'm always available for:<br>💪 Workout recommendations<br>🍽️ Meal suggestions<br>✨ Motivational quotes<br>💙 Emotional support<br>📊 Health guidance<br><br>Now let's keep building the best version of you! What's next? 🚀",
    "You're too kind! 🌟 That motivation works both ways — knowing I'm helping someone makes me better too!<br><br>Keep that positive energy going and stay consistent. <strong>Consistency + patience = transformation.</strong><br><br>What can I help you with today? 💪",
    "Thank you so much! 😄 Your kind words mean a lot. I'm here every step of your wellness journey!<br><br>Pro tip: The more you interact with me, the better your <strong>Mental Health Score</strong> becomes in your Health Status evaluation — because I track positive sentiment! 🧠<br><br>So keep chatting and keep growing! What shall we work on? 🚀"
  ],

  supplement: [
    "Supplements can help — but food always comes first! 💊 Here's an honest breakdown:<br><br><strong>✅ Actually evidence-backed:</strong><br>💪 <strong>Creatine Monohydrate</strong> — most researched supplement, safe, increases strength & muscle by 5-15%. Take 3-5g daily.<br>🥛 <strong>Whey Protein</strong> — convenient protein source. Only useful if you can't hit protein targets from food.<br>🐟 <strong>Omega-3 (Fish Oil)</strong> — reduces inflammation, great for joints and heart. 1-2g EPA+DHA/day.<br>☀️ <strong>Vitamin D</strong> — most people are deficient especially in Malaysia (indoor lifestyle). 1000-2000 IU/day.<br>⚡ <strong>Caffeine</strong> — proven to improve performance. Natural sources (coffee, tea) work fine.<br><br><strong>❌ Skip these:</strong><br>🚫 Fat burners — mostly ineffective and some are dangerous<br>🚫 Proprietary blends — unknown dosages<br>🚫 Testosterone boosters — little evidence<br><br>Best approach: <strong>Whole food diet first, supplement gaps second.</strong> Want a meal suggestion high in protein? 🍗",
    "Good question on supplements! 🏋️ Here's what a certified sports nutritionist would tell you:<br><br><strong>🥇 Priority Tier (worth it):</strong><br>1. <strong>Protein powder</strong> — ONLY if daily food protein is below 1.6g/kg body weight<br>2. <strong>Creatine</strong> — 3-5g/day, safe for long-term use, works for most people<br>3. <strong>Vitamin D + Magnesium</strong> — common deficiencies that affect energy and sleep<br><br><strong>🥈 Situational (sometimes useful):</strong><br>4. <strong>Caffeine</strong> — 3-6mg/kg before workout for performance<br>5. <strong>Beta-alanine</strong> — helps with high-rep endurance<br>6. <strong>Zinc</strong> — if diet is low in meat/seafood<br><br><strong>⚠️ Important:</strong><br>• Always buy from reputable brands (look for BPOM/third-party certified)<br>• More expensive ≠ more effective<br>• Consistency in training + sleep + food > any supplement<br><br>Want to know if a <strong>specific supplement</strong> is worth it? Just ask! 💬"
  ],

  beginner_guide: [
    "Welcome to your fitness journey! 🎉 Starting is the hardest part — and you've already done it!<br><br><strong>📋 Complete Beginner's Roadmap:</strong><br><br><strong>Week 1-2: Build the habit</strong><br>✅ 3 sessions/week, 30-40 mins each<br>✅ Full body workouts (not splits yet)<br>✅ Focus on FORM, not weight<br>✅ Bodyweight first: push up, squat, plank, lunge<br><br><strong>Week 3-4: Add structure</strong><br>✅ Start adding light weights<br>✅ Track your sessions in <a href='/wger.html' style='color:var(--fa-teal);font-weight:700;'>FitAlchemy Workout page</a><br>✅ Add a protein-rich meal post-workout<br><br><strong>Month 2+: Progressive overload</strong><br>✅ Increase weight/reps every 1-2 weeks<br>✅ Try Upper/Lower split (4 days)<br><br><strong>Golden Rules for Beginners:</strong><br>🔑 Consistency beats perfection<br>🔑 Rest days are not wasted days<br>🔑 Sleep 7-9 hours (you grow during rest!)<br>🔑 Eat enough protein (1.6g/kg body weight)<br><br>Want me to suggest a <strong>specific beginner workout</strong>? 💪",
    "You're starting your fitness journey — that's already a W! 🏆 Here's everything you need to know:<br><br><strong>🚫 Common beginner mistakes to avoid:</strong><br>❌ Doing too much too soon (leads to burnout/injury)<br>❌ Skipping warm-up<br>❌ Copying advanced athletes' programs<br>❌ Expecting overnight results<br>❌ Neglecting food and sleep<br><br><strong>✅ What actually works:</strong><br>📅 Start with 3x/week full body<br>🏋️ Learn 5 basic movements: <strong>Squat, Hinge (deadlift), Push, Pull, Core</strong><br>🥗 Eat enough protein: chicken, eggs, fish, tofu<br>😴 Sleep 7-9 hours EVERY night<br>💧 Drink 2-3 litres of water daily<br><br><strong>Great beginner programs:</strong><br>💪 StrongLifts 5x5 (gym)<br>💪 Bodyweight Fitness Routine (home)<br>💪 Couch to 5K (cardio start)<br><br>Save your first workouts in <a href='/wger.html' style='color:var(--fa-teal);font-weight:700;'>FitAlchemy</a> and track your progress! What type of workout interests you most — <strong>gym, home, or outdoor</strong>? 🏃"
  ],

  posture_form: [
    "Posture and form are CRITICAL — bad form = injury waiting to happen! 🦴 Let's fix this:<br><br><strong>🖥️ Office/Desk Posture:</strong><br>✅ Screen at eye level<br>✅ Feet flat on floor<br>✅ Back straight, shoulders relaxed (not hunched)<br>✅ 90° angle at knees and hips<br>✅ Stand up every 30-45 mins<br><br><strong>🏋️ Workout Form Basics:</strong><br>✅ <strong>Squat</strong> — chest up, knees track over toes, weight in heels<br>✅ <strong>Deadlift</strong> — flat back, hinge at hips, bar close to body<br>✅ <strong>Push Up</strong> — straight line head to toe, elbows 45° from body<br>✅ <strong>Row</strong> — squeeze shoulder blades together, don't shrug<br><br><strong>Posture-fixing exercises:</strong><br>🔧 Face pulls (rear delts)<br>🔧 Band pull-aparts<br>🔧 Cat-cow stretch<br>🔧 Hip flexor stretch (fights desk posture)<br>🔧 Dead hangs (spinal decompression)<br><br>Want a <strong>full posture correction workout</strong>? 🎯",
    "Great that you're thinking about posture — most people ignore it until they're in pain! 🦴<br><br><strong>Signs of bad posture:</strong><br>⚠️ Forward head position<br>⚠️ Rounded shoulders<br>⚠️ Anterior pelvic tilt (lower back arch)<br>⚠️ Knee caving during squats<br>⚠️ Wrist pain during push exercises<br><br><strong>5-minute daily posture reset:</strong><br>1️⃣ Wall angels: 15 reps<br>2️⃣ Chin tucks: 15 reps<br>3️⃣ Cat-cow: 10 reps<br>4️⃣ Hip flexor stretch: 30 sec each side<br>5️⃣ Thoracic extension over chair: 10 reps<br><br>Do this every morning and before workouts! The difference in 4 weeks will be noticeable. Want me to suggest a <strong>specific exercise</strong> for your issue? 🏋️"
  ],

  cardio_specific: [
    "Cardio is one of the best tools for fat loss, heart health, and mental wellness! 🏃 Here's your complete guide:<br><br><strong>Types of Cardio:</strong><br>🔥 <strong>HIIT (High Intensity Interval Training)</strong><br>• 20-30 mins, burns fat AFTER workout too (EPOC effect)<br>• Example: 30s sprint, 90s walk × 8 rounds<br>• Best for: fat loss, time efficiency<br><br>💨 <strong>LISS (Low Intensity Steady State)</strong><br>• 45-60 mins at comfortable pace<br>• Easy on joints, good for recovery days<br>• Best for: endurance, beginners, mental health<br><br>⚡ <strong>MISS (Moderate Intensity)</strong><br>• 30-45 mins at 60-70% max heart rate<br>• Best for: general fitness<br><br><strong>Cardio for fat loss:</strong><br>✅ HIIT 2-3x/week<br>✅ Fasted cardio (morning before eating) can slightly boost fat burning<br>✅ Consistency > intensity<br><br>Want a specific <strong>HIIT workout plan</strong>? 💪",
    "Whether you love running or hate it — there's a cardio type for everyone! 🎯<br><br><strong>🏃 Running tips for beginners:</strong><br>• Start with run/walk intervals (1 min run, 2 min walk)<br>• Aim for conversational pace — you should be able to talk<br>• Try Couch to 5K program (9 weeks, very effective)<br>• Run 3x/week with rest days between<br><br><strong>🚴 Cycling:</strong><br>• Very low impact — great for knees<br>• Stationary bike, outdoor, or Strava cycling<br>• Great for HIIT (sprint intervals)<br><br><strong>🏊 Swimming:</strong><br>• Best full-body cardio<br>• Zero joint impact — perfect for injury recovery<br>• Burns 400-700 kcal/hour<br><br><strong>⏭️ Jump Rope:</strong><br>• 10 mins = 30 mins jogging in calorie burn<br>• Cheap, portable, excellent cardio<br>• Start with 30s on, 30s rest<br><br>What type of cardio interests you most? I can give you a more specific plan! 🚀"
  ],

  muscle_building: [
    "Building muscle is a science — let's get it right! 💪<br><br><strong>The 4 pillars of muscle growth:</strong><br><br>1️⃣ <strong>Progressive Overload</strong> — add weight, reps, or sets every 1-2 weeks. This is THE most important factor.<br><br>2️⃣ <strong>Protein</strong> — 1.6-2.2g per kg body weight daily. Spread across 4-5 meals. Sources: chicken, eggs, fish, tofu, whey.<br><br>3️⃣ <strong>Calorie Surplus</strong> — eat 250-500 calories above your TDEE. You CANNOT build muscle in a major deficit.<br><br>4️⃣ <strong>Sleep</strong> — 80% of growth hormone is released during deep sleep. 7-9 hours is non-negotiable!<br><br><strong>Best muscle-building splits:</strong><br>📅 3 days: Full body (best for beginners)<br>📅 4 days: Upper/Lower<br>📅 5-6 days: Push/Pull/Legs<br><br><strong>Rep ranges:</strong><br>🏋️ Strength: 3-5 reps, heavy weight<br>💪 Hypertrophy: 6-12 reps, moderate weight<br>🔥 Endurance: 15+ reps, lighter weight<br><br>Want a specific <strong>muscle-building workout</strong> recommendation? 🎯",
    "Gaining muscle takes patience, but the principles are simple! 🦾<br><br><strong>Truth about muscle building:</strong><br>⏱️ Realistic rate: 0.5-1kg muscle/month for beginners<br>⏱️ Intermediate: 0.25-0.5kg/month<br>⏱️ It's SLOW — but every kg of muscle = higher metabolism forever<br><br><strong>Best exercises for muscle growth:</strong><br>🏋️ Compound lifts first: Squat, Deadlift, Bench Press, Overhead Press, Barbell Row<br>💪 Then isolation: Curls, Tricep extensions, Lateral raises, Leg extensions<br><br><strong>Muscle-building meal timing:</strong><br>🌅 Pre-workout (1-2 hrs): Carbs + protein (banana + chicken rice)<br>🔄 Post-workout (30 min): Protein + fast carbs (protein shake + fruit)<br>🌙 Before bed: Slow protein (Greek yogurt, cottage cheese)<br><br><strong>Track your lifts!</strong> If you're not getting stronger over months, something is wrong — usually diet or sleep.<br><br>Save your workouts in <a href='/wger.html' style='color:var(--fa-teal);font-weight:700;'>FitAlchemy</a> to track progressive overload! 💪"
  ],

  islamic_fitness: [
    "Masha'Allah — combining your faith and fitness is beautiful! 🌙💪 Here's a complete guide:<br><br><strong>🕌 Exercising during Ramadan:</strong><br>✅ <strong>Best time:</strong> After Tarawih or 1-2 hours after Iftar<br>✅ <strong>Avoid:</strong> Working out during peak heat while fasting<br>✅ <strong>Workout type:</strong> Lower intensity — strength training works well fasted<br>✅ <strong>Hydration:</strong> Drink 2-3 litres between Iftar and Sahur<br>✅ <strong>Iftar meal:</strong> Dates + water first, then balanced meal with protein<br>✅ <strong>Sahur meal:</strong> Oats + eggs + water — slow releasing energy<br><br><strong>🥗 Halal nutrition tips:</strong><br>✅ All lean meats (chicken, beef, fish) halal = great protein<br>✅ Plant-based protein: lentils, chickpeas, tofu — all halal<br>✅ Most supplements are halal — check for gelatin in capsules<br>✅ Look for halal-certified whey protein<br><br><strong>🤲 Islamic perspective on health:</strong><br>\"Your body has a right over you\" — Prophet Muhammad (ﷺ)<br>Taking care of your body is an ibadah (worship)! 🌟<br><br>Want a <strong>Ramadan workout plan</strong> or <strong>halal meal suggestion</strong>? 💪",
    "Subhanallah — Islam actually encourages physical fitness! 🌙 Here's what you need to know:<br><br><strong>🏋️ Workout during fasting (Ramadan):</strong><br>📅 Option 1: Before Iftar (last 1-2 hours of fast) — light workout, will break fast soon<br>📅 Option 2: After Iftar (best for strength training) — fully fuelled<br>📅 Option 3: After Tarawih — peaceful, quiet gym time<br><br><strong>Ramadan workout tips:</strong><br>✅ Reduce intensity by 20-30%<br>✅ Shorter sessions: 30-40 mins<br>✅ Focus on maintaining, not gaining<br>✅ Prioritise sleep between Iftar and Sahur<br><br><strong>🥗 Sahur (pre-dawn meal) for fitness:</strong><br>🥚 2-3 eggs (protein)<br>🌾 Oats or whole grain bread (slow carbs)<br>🥑 Avocado or nuts (healthy fats)<br>💧 500ml water minimum<br><br><strong>Iftar meal for fitness:</strong><br>🌴 3 dates (quick energy to break fast — Sunnah!)<br>🍗 Grilled chicken or fish (protein)<br>🍚 Brown rice or sweet potato (carbs)<br>🥗 Vegetables<br><br>Remember — your intention (niyyah) matters. Staying healthy to worship better is a noble goal! 🤲"
  ],

  habit_building: [
    "Building lasting habits is the REAL secret to fitness success! 🔑 Motivation fades, but habits stick. Here's the science:<br><br><strong>🧠 The Habit Loop (Cue → Routine → Reward):</strong><br>1️⃣ <strong>Cue</strong> — attach workout to existing habit (e.g. after brushing teeth)<br>2️⃣ <strong>Routine</strong> — keep it small and doable at first<br>3️⃣ <strong>Reward</strong> — celebrate immediately (track it, treat yourself)<br><br><strong>Proven habit-building rules:</strong><br>✅ <strong>Start tiny</strong> — 2 push-ups beats planning 100 you never do<br>✅ <strong>Same time daily</strong> — consistency builds automaticity<br>✅ <strong>Never miss twice</strong> — one miss is fine, two starts a pattern<br>✅ <strong>Habit stacking</strong> — \"After I ___, I will ___\"<br>✅ <strong>Track it</strong> — use FitAlchemy to log streaks<br><br>It takes ~21-66 days to form a habit. Be patient with yourself! Want me to help you <strong>set a small daily goal</strong>? 💪",
    "Consistency beats intensity every single time! 🎯 Here's how to actually stick to it:<br><br><strong>Why most people quit:</strong><br>❌ They start too big and burn out<br>❌ They rely on motivation (which is unreliable)<br>❌ They quit after missing once<br><br><strong>The FitAlchemy approach:</strong><br>🔥 <strong>Streaks</strong> — your Dashboard tracks your daily streak. Don't break the chain!<br>📅 <strong>Schedule it</strong> — treat workouts like appointments<br>🎯 <strong>2-minute rule</strong> — just start. Momentum does the rest<br>👥 <strong>Accountability</strong> — tell someone your goal<br>🏆 <strong>Identity shift</strong> — become \"someone who works out\" not \"someone trying to\"<br><br>Discipline is choosing what you want most over what you want now. You've got this! Want a <strong>simple daily routine</strong> to start? 🚀"
  ],

  time_of_day: [
    "Great question about workout timing! ⏰ Here's the honest answer:<br><br><strong>🌅 Morning workouts:</strong><br>✅ Boosts mood & energy for the day<br>✅ Builds discipline (done before excuses pile up)<br>✅ Better consistency (fewer interruptions)<br>❌ Body slightly stiffer — warm up well<br><br><strong>🌆 Evening workouts:</strong><br>✅ Body is warmer = better performance & strength<br>✅ Higher strength output (peak 2-6pm)<br>✅ Good stress release after work<br>❌ Can affect sleep if too intense too late<br><br><strong>🏆 The verdict:</strong> The BEST time is whenever you'll <strong>actually do it consistently</strong>. Timing matters far less than consistency!<br><br><strong>About eating:</strong> Wait 1-2 hours after a big meal, or 30 mins after a snack before working out. Want a workout suggestion for your preferred time? 💪",
    "Timing your workouts smartly can help! ⏰<br><br><strong>Performance peaks:</strong> Most people are strongest in the <strong>late afternoon/early evening</strong> (body temp is highest). But the difference is small.<br><br><strong>Fasted morning cardio:</strong> Can slightly increase fat burning, but the effect is minor — total daily calories matter more.<br><br><strong>Working out at night:</strong> Totally fine! Just avoid <strong>intense</strong> sessions within 1-2 hours of bed, as it can delay sleep for some people. Light/moderate evening exercise actually <em>improves</em> sleep.<br><br><strong>Eating around workouts:</strong><br>🍽️ Pre-workout: light carbs + protein 1-2 hrs before<br>🔄 Post-workout: protein + carbs within 1-2 hrs<br><br>Bottom line: <strong>consistency > perfect timing</strong>. When can you realistically train? 🎯"
  ],

  gym_etiquette: [
    "Walking into a gym for the first time can feel intimidating — but everyone started there! 💪 Here's your confidence guide:<br><br><strong>🏋️ Gym Etiquette Basics:</strong><br>✅ <strong>Re-rack your weights</strong> after use<br>✅ <strong>Wipe down equipment</strong> after sweating<br>✅ <strong>Don't hog machines</strong> — let others work in between sets<br>✅ <strong>Keep distance</strong> — give people space when lifting<br>✅ <strong>Don't film others</strong> — privacy matters<br><br><strong>😌 Beating gym anxiety:</strong><br>🧠 Truth: everyone is focused on themselves, not judging you<br>🎧 Bring headphones — your focus bubble<br>📋 Have a plan — walk in knowing what you'll do<br>⏰ Go off-peak (mid-morning/early afternoon) when quieter<br><br><strong>🎒 What to bring:</strong> Water bottle, towel, comfortable shoes, headphones.<br><br>You belong there just as much as anyone. Want a <strong>simple beginner gym plan</strong> to walk in with? 🚀",
    "Feeling nervous about the gym is 100% normal — let's fix that! 😌<br><br><strong>The #1 truth:</strong> Nobody is watching or judging you. Everyone's busy with their own workout, music, and reflection-checking. 😄<br><br><strong>First-day game plan:</strong><br>1️⃣ Start with machines (easier to learn than free weights)<br>2️⃣ Do a simple full-body routine<br>3️⃣ Keep it short — 30-40 mins is plenty<br>4️⃣ Ask staff if unsure — that's their job!<br><br><strong>Do you need a personal trainer?</strong><br>👍 Helpful for: learning form, accountability, faster start<br>👎 Not essential — you can learn from reputable sources + FitAlchemy<br><br><strong>What to wear:</strong> Comfortable, breathable clothes + proper shoes. Nothing fancy needed.<br><br>Confidence comes with reps — both in the gym and in showing up. Want me to build you a <strong>first-week plan</strong>? 💪"
  ],

  home_equipment: [
    "No gym, no equipment, no problem! 🏠 Your bodyweight is a complete gym. Here's a full home workout:<br><br><strong>💪 Upper Body:</strong><br>• Push-ups (or knee push-ups) — 3×10-15<br>• Pike push-ups (shoulders) — 3×8-12<br>• Tricep dips (use a chair) — 3×10-15<br><br><strong>🦵 Lower Body:</strong><br>• Squats — 3×15-20<br>• Lunges — 3×12 each leg<br>• Glute bridges — 3×15-20<br>• Calf raises — 3×20<br><br><strong>🔥 Core:</strong><br>• Plank — 3×30-60s<br>• Mountain climbers — 3×20<br>• Bicycle crunches — 3×20<br><br><strong>❤️ Cardio (no equipment):</strong><br>• Jumping jacks, high knees, burpees<br><br>Do this 3-4x/week and you'll see real progress! As you get stronger, slow down the reps (more time under tension) or add more sets. Want me to turn this into a <strong>structured weekly plan</strong>? 💪",
    "You absolutely can get fit at home with zero equipment! 🏠 Bodyweight training built soldiers and gymnasts for centuries.<br><br><strong>The beauty of bodyweight training:</strong><br>✅ Free — no gym fees<br>✅ Convenient — no commute<br>✅ Effective — builds real strength & endurance<br>✅ Scalable — make moves harder as you progress<br><br><strong>🏠 Full-body home circuit (no gear):</strong><br>Round 1-3 (rest 60s between rounds):<br>1️⃣ 15 Squats<br>2️⃣ 10 Push-ups<br>3️⃣ 20 Mountain climbers<br>4️⃣ 12 Lunges (each leg)<br>5️⃣ 30s Plank<br>6️⃣ 15 Glute bridges<br><br><strong>Progression ideas:</strong><br>📈 Add reps weekly<br>📈 Slow down the movement (more tension)<br>📈 Try harder variations (archer push-ups, pistol squats)<br>📈 Reduce rest time<br><br>A water bottle or backpack with books = makeshift weights! Want a <strong>4-week home progression</strong>? 🚀"
  ],

  women_fitness: [
    "Great questions about women's fitness! 💪 Let me clear up the biggest myths and give real advice:<br><br><strong>🚫 Myth: \"Lifting weights makes women bulky\"</strong><br>✅ Truth: Women have far less testosterone — you'll get <strong>toned and strong</strong>, NOT bulky. Lifting is one of the best things you can do!<br><br><strong>🩸 Exercising during your period:</strong><br>✅ Totally safe and often helps with cramps & mood<br>✅ Listen to your body — lighter intensity is fine on heavy days<br>✅ Walking, yoga, light strength are great options<br><br><strong>💪 Best approach for women:</strong><br>🏋️ Strength training 2-4x/week (builds shape & bone density)<br>❤️ Some cardio for heart health<br>🥗 Adequate protein (1.6g/kg) — yes, women need it too!<br><br><strong>⚠️ Note:</strong> For pregnancy/postpartum exercise, always consult your doctor first.<br><br>Want a <strong>women's strength routine</strong> or <strong>nutrition advice</strong>? 🌟",
    "Women's fitness deserves real, myth-free advice! 💖<br><br><strong>Key truths:</strong><br>💪 <strong>You won't get bulky</strong> from lifting — you'll get strong, toned, and confident<br>🦴 <strong>Weight training protects bone density</strong> — crucial for women long-term<br>🩸 <strong>Period workouts are fine</strong> — adjust intensity to how you feel<br>🍗 <strong>Eat enough protein</strong> — many women under-eat protein<br>🥗 <strong>Don't fear carbs</strong> — they fuel your workouts<br><br><strong>Sample women's weekly split:</strong><br>📅 Day 1: Lower body (squats, lunges, glutes)<br>📅 Day 2: Upper body (push-ups, rows, shoulders)<br>📅 Day 3: Cardio + core<br>📅 Day 4: Full body or rest<br><br><strong>For cycle syncing:</strong> Higher energy in first half of cycle (push harder), gentler in luteal phase. Listen to your body!<br><br>Want a detailed <strong>workout</strong> or <strong>meal plan</strong> tailored for you? 💪"
  ],

  general_fitness_qa: [
    "Love that you're curious about the science! 🧠 Let me clear up common fitness questions:<br><br><strong>💪 \"Does muscle weigh more than fat?\"</strong><br>A kg is a kg — but muscle is <em>denser</em>, so it takes less space. You can look leaner at the same weight!<br><br><strong>🔥 \"Can I target fat in one area?\"</strong><br>No — spot reduction is a myth. Fat loss happens body-wide through overall calorie deficit. Abs exercises build muscle but won't burn belly fat specifically.<br><br><strong>😣 \"Is soreness necessary?\"</strong><br>No! Soreness (DOMS) isn't a measure of a good workout. You can grow without being sore.<br><br><strong>⏱️ \"How long to see results?\"</strong><br>• Strength: 2-4 weeks<br>• Visible muscle: 8-12 weeks<br>• Others noticing: 12+ weeks<br>Be patient — consistency wins!<br><br>What specific fitness question can I answer for you? 🎯",
    "Great fitness question! 🤓 Here are evidence-based answers to common myths:<br><br><strong>🏃 \"Does cardio kill gains?\"</strong><br>No — moderate cardio improves recovery & heart health. Only excessive cardio with low food intake hurts muscle.<br><br><strong>🍳 \"Must I eat breakfast?\"</strong><br>Not necessarily — meal timing matters less than total daily intake. Eat breakfast if it helps you; skip it if you prefer (intermittent fasting).<br><br><strong>📅 \"Can I work out every day?\"</strong><br>Yes, IF you vary intensity and muscle groups. But rest days help muscles grow — don't skip them entirely.<br><br><strong>👴 \"Am I too old to start?\"</strong><br>Never! People build muscle and strength well into their 70s+. It's never too late.<br><br><strong>⚡ \"How to boost metabolism?\"</strong><br>Build muscle (burns more at rest), stay active, eat enough protein, sleep well.<br><br>What else would you like to know? 💪"
  ]
};

// ── Fallback quotes ────────────────────────────────────────────────────────────
const FALLBACK = [
  { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn", category: "life" },
  { quote: "Physical fitness is the first requisite of happiness.", author: "Joseph Pilates", category: "inspirational" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue.", author: "Winston Churchill", category: "success" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "inspirational" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "inspirational" },
  { quote: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle", category: "wisdom" },
  { quote: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela", category: "courage" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", category: "success" },
  { quote: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama", category: "happiness" },
  { quote: "The greatest wealth is health.", author: "Virgil", category: "life" },
  { quote: "Strength does not come from the body. It comes from the will of the soul.", author: "Mahatma Gandhi", category: "resilience" },
  { quote: "The only bad workout is the one that didn't happen.", author: "Unknown", category: "inspirational" },
  { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn", category: "life" },
  { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown", category: "resilience" },
  { quote: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown", category: "mindset" }
];

function getFallbackQuote(category) {
  const pool = FALLBACK.filter(q => q.category === category);
  const src  = pool.length > 0 ? pool : FALLBACK;
  return src[Math.floor(Math.random() * src.length)];
}

// ── Main chat handler ──────────────────────────────────────────────────────────
async function chat(req, res) {
  const { message, userId } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

  // Fetch user context for personalised responses
  const ctx = await getUserContext(userId);

  async function respond(data) {
    if (userId && data.intent !== 'greet') {
      try {
        const clean = (data.text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000);
        await ChatbotLog.save(userId, message.trim(), clean);
      } catch (e) { console.error('Chatlog save error:', e.message); }
    }
    return res.json(data);
  }

  const intent = detectIntent(message);
  console.log('CoachAlchemy | Intent:', intent, '| User:', ctx?.name || userId, '| Message:', message.substring(0, 50));

  // ── Helper: personalised greeting ─────────────────────────────────────────
  const firstName = ctx?.name ? ctx.name.split(' ')[0] : null;
  const greeting  = firstName ? 'Hey <strong>' + firstName + '</strong>! ' : 'Hey! ';

  try {

    // ── GREET ──
    if (intent === 'greet') {
      let greetText = greeting + 'I\'m <strong>CoachAlchemy</strong> 🤖, your personal wellness coach!<br><br>';

      // If user has health data — show a personalised snapshot
      if (ctx && (ctx.physical || ctx.fitness || ctx.mental)) {
        greetText += '📊 <strong>Your current status:</strong><br>';
        if (ctx.physical) greetText += ({ Good:'✅', Fair:'⚠️', Overweight:'⚖️', Underweight:'🪶', 'At Risk':'🚨' }[ctx.physical] || '❓') + ' Physical: <strong>' + ctx.physical + '</strong><br>';
        if (ctx.fitness)  greetText += ({ 'Very Active':'🏆', 'Moderately Active':'🏃', 'Lightly Active':'🚶', Sedentary:'🪑' }[ctx.fitness] || '❓') + ' Fitness: <strong>' + ctx.fitness + '</strong><br>';
        if (ctx.mental)   greetText += ({ Motivated:'🌟', Neutral:'😊', Stressed:'😤', 'Low Mood':'💙' }[ctx.mental] || '❓') + ' Mental: <strong>' + ctx.mental + '</strong><br>';
        greetText += '<br>';
      }

      greetText += 'Here\'s what I can help you with:<br>💪 <strong>Workout</strong> — \"Give me a chest workout\"<br>🍽️ <strong>Meal</strong> — \"Suggest a keto meal\"<br>✨ <strong>Quote</strong> — \"Motivate me\"<br>💙 <strong>Emotional Support</strong> — \"I\'m feeling stressed\"<br>📊 <strong>Personalised</strong> — \"Suggest something based on my condition\"<br>😴 <strong>Sleep & Hydration</strong> tips<br>🩹 <strong>Injury Advice</strong><br><br>How are you feeling today? 🚀';
      return respond({ intent: 'greet', text: greetText });
    }

    // ── ALL RESPONSE-BASED INTENTS ──
    const responseIntents = Object.keys(RESPONSES);
    if (responseIntents.includes(intent)) {
      return respond({ intent, text: pick(RESPONSES[intent]) });
    }

    // ── WORKOUT ──
    if (intent === 'workout') {
      const category = extractWorkoutCategory(message);
      const baseUrl  = 'http://localhost:' + (process.env.PORT || 3000);
      let url = baseUrl + '/api/exercises?limit=3&offset=0';
      if (category) url += '&category=' + encodeURIComponent(category);

      try {
        const response  = await axios.get(url, { timeout: 6000 });
        const exercises = response.data.results || [];

        if (!exercises.length) {
          return respond({ intent: 'workout', text: 'I couldn\'t find exercises right now. Visit the <a href="/wger.html" style="color:#1976d2;font-weight:700;">Workout Planning</a> page for the full library!' });
        }

        let html = 'Here are some <strong>' + (category || 'General') + '</strong> exercises for you 💪<br><br>';
        exercises.forEach(function(ex) {
          const img  = ex.image ? '<img src="' + ex.image + '" alt="' + ex.name + '" style="width:100%;max-width:180px;border-radius:10px;margin-bottom:8px;">' : '';
          const desc = ex.description ? ex.description.replace(/<[^>]*>/g,'').slice(0,120)+'...' : 'Great exercise for building strength.';
          html += '<div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-radius:14px;padding:14px;margin-bottom:12px;border:2px solid rgba(67,206,162,0.3);">' + img + '<div style="font-weight:800;color:#0d47a1;">💪 ' + ex.name + '</div><div style="font-size:0.9em;color:#444;margin-top:4px;">' + desc + '</div>' + (ex.equipment && ex.equipment.length ? '<div style="font-size:0.85em;color:#1976d2;margin-top:4px;">🏋️ Equipment: ' + ex.equipment.join(', ') + '</div>' : '') + '</div>';
        });
        html += '<br>👉 Want more? Visit the <a href="/wger.html" style="color:#1976d2;font-weight:700;">Workout Planning</a> page — add exercises to your routine and track calories burned! 🔥';
        return respond({ intent: 'workout', text: html, data: exercises });
      } catch (apiErr) {
        console.log('Workout API error:', apiErr.message);
        const fallbackCategory = category || 'general fitness';
        return respond({ intent: 'workout', text: 'Here are some great <strong>' + fallbackCategory + '</strong> exercises to try 💪<br><br><div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-radius:14px;padding:14px;margin-bottom:10px;">🏋️ <strong>Push Ups</strong> — 3 sets × 10-15 reps. Targets chest, shoulders, triceps.</div><div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-radius:14px;padding:14px;margin-bottom:10px;">🦵 <strong>Squats</strong> — 3 sets × 12-15 reps. Best lower body compound movement.</div><div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-radius:14px;padding:14px;">🔥 <strong>Plank</strong> — 3 sets × 30-60 seconds. Core strength foundation.</div><br>👉 Browse full exercise library on the <a href="/wger.html" style="color:#1976d2;font-weight:700;">Workout Planning</a> page!' });
      }
    }

    // ── MEAL ──
    if (intent === 'meal') {
      const { query, diet, label } = extractMealKeyword(message);
      const baseUrl  = 'http://localhost:' + (process.env.PORT || 3000);

      try {
        const response = await axios.get(baseUrl + '/api/recipes/search?query=' + encodeURIComponent(query) + '&offset=0', { timeout: 6000 });
        const recipes  = (response.data.results || []).slice(0, 3);
        const displayLabel = (label.charAt(0).toUpperCase() + label.slice(1)) || 'Healthy';

        if (!recipes.length) {
          return respond({ intent: 'meal', text: 'I couldn\'t find <strong>' + displayLabel + '</strong> meals right now. Try the <a href="/spoonacular.html" style="color:#1976d2;font-weight:700;">Meal Planning</a> page for thousands of recipes!' });
        }

        let html = 'Here are some <strong>' + displayLabel + '</strong> meal ideas for you 🍽️<br><br>';
        recipes.forEach(function(r) {
          const img = r.image ? '<img src="' + r.image + '" alt="' + r.title + '" style="width:100%;max-width:180px;border-radius:10px;margin-bottom:8px;">' : '';
          html += '<div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:14px;margin-bottom:12px;border:2px solid rgba(67,206,162,0.3);">' + img + '<div style="font-weight:800;color:#1b5e20;">🍴 ' + r.title + '</div></div>';
        });
        html += '<br>👉 Full recipes, nutrition info & meal planning? Visit the <a href="/spoonacular.html" style="color:#1976d2;font-weight:700;">Meal Planning</a> page!';
        return respond({ intent: 'meal', text: html, data: recipes });
      } catch (apiErr) {
        console.log('Meal API error:', apiErr.message);
        const displayLabel = label ? (label.charAt(0).toUpperCase() + label.slice(1)) : 'Healthy';
        return respond({ intent: 'meal', text: 'Here are some great <strong>' + displayLabel + '</strong> meal ideas 🍽️<br><br><div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:14px;margin-bottom:10px;">🥗 <strong>Grilled Chicken Salad</strong> — High protein, low calorie. Chicken breast + mixed greens + olive oil.</div><div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:14px;margin-bottom:10px;">🍳 <strong>Scrambled Eggs + Oats</strong> — Great for energy. 3 eggs + 80g oats + banana.</div><div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:14px;">🐟 <strong>Baked Salmon + Brown Rice</strong> — Omega-3 rich, balanced macros.</div><br>👉 Explore thousands of recipes on the <a href="/spoonacular.html" style="color:#1976d2;font-weight:700;">Meal Planning</a> page!' });
      }
    }

    // ── QUOTE ──
    if (intent === 'quote') {
      const category = extractQuoteCategory(message);
      let quoteData  = null;

      try {
        const baseUrl  = 'http://localhost:' + (process.env.PORT || 3000);
        const response = await axios.get(baseUrl + '/api/quote/batch?category=' + encodeURIComponent(category) + '&message=' + encodeURIComponent(message), { timeout: 6000 });
        if (response.data && response.data.quotes && response.data.quotes.length > 0) {
          const quotes = response.data.quotes;
          const picked = quotes[Math.floor(Math.random() * quotes.length)];
          quoteData = { quote: picked.content, author: picked.author, category: picked.category || category, source: picked.source };
        }
      } catch (err) { console.log('Quote API failed, using fallback'); }

      if (!quoteData) {
        const fb = getFallbackQuote(category);
        quoteData = { quote: fb.quote, author: fb.author, category: fb.category, source: 'local' };
      }

      return respond({ intent: 'quote', text: 'Here\'s a <strong>' + category + '</strong> quote for you ✨', quote: quoteData });
    }

    // ── PERSONALISED OVERVIEW ──
    if (intent === 'personalised_overview') {
      if (!ctx || (!ctx.physical && !ctx.fitness && !ctx.mental)) {
        return respond({ intent, text: greeting + 'I\'d love to give you a personalised health overview! 📊<br><br>First, please:<br>1️⃣ Fill in your <a href="/profile.html" style="color:var(--fa-teal);font-weight:700;">Profile</a> (height, weight, age)<br>2️⃣ Add exercises to your <a href="/wger.html" style="color:var(--fa-teal);font-weight:700;">Workout Routine</a><br>3️⃣ Save meals in your <a href="/spoonacular.html" style="color:var(--fa-teal);font-weight:700;">Meal Plan</a><br>4️⃣ Click <strong>\"Evaluate My Health\"</strong> on the Dashboard<br><br>Then ask me again and I\'ll give you a full personalised analysis! 🚀' });
      }
      const physIcon = { Good:'✅', Fair:'⚠️', Overweight:'⚖️', Underweight:'🪶', 'At Risk':'🚨' }[ctx.physical] || '❓';
      const fitIcon  = { 'Very Active':'🏆', 'Moderately Active':'🏃', 'Lightly Active':'🚶', Sedentary:'🪑' }[ctx.fitness] || '❓';
      const menIcon  = { Motivated:'🌟', Neutral:'😊', Stressed:'😤', 'Low Mood':'💙' }[ctx.mental] || '❓';
      let text = greeting + 'Here\'s your personalised health overview! 📊<br><br>';
      text += '<div style="background:linear-gradient(135deg,#f0fdf4,#e8f5e9);border-radius:14px;padding:14px;margin-bottom:12px;">';
      text += physIcon + ' <strong>Physical:</strong> ' + (ctx.physical || 'Not evaluated') + '<br>';
      text += fitIcon  + ' <strong>Fitness:</strong> '  + (ctx.fitness  || 'Not evaluated') + '<br>';
      text += menIcon  + ' <strong>Mental:</strong> '   + (ctx.mental   || 'Not evaluated');
      if (ctx.bmi) text += '<br>📏 <strong>BMI:</strong> ' + ctx.bmi;
      if (ctx.goal) text += '<br>🎯 <strong>Goal:</strong> ' + ctx.goal;
      text += '</div>';

      // Personalised advice based on status
      const advices = [];
      if (ctx.physical === 'Fair' || ctx.physical === 'Overweight') advices.push('⚖️ Focus on <strong>balanced nutrition</strong> — keep fat below 30% of daily calories (WHO guideline)');
      if (ctx.physical === 'Underweight') advices.push('🍗 Increase <strong>calorie intake</strong> with protein-rich foods to reach a healthy BMI');
      if (ctx.physical === 'Good') advices.push('✅ Physical status is great! Maintain your healthy habits');
      if (ctx.fitness === 'Sedentary') advices.push('🚶 Start with <strong>150 min/week</strong> of moderate exercise — WHO minimum recommendation');
      if (ctx.fitness === 'Lightly Active') advices.push('🏃 Push toward <strong>150+ min/week</strong> to meet WHO guidelines — you\'re almost there!');
      if (ctx.fitness === 'Moderately Active' || ctx.fitness === 'Very Active') advices.push('🏆 Excellent fitness level! Consider adding <strong>2+ days of strength training</strong> weekly');
      if (ctx.mental === 'Stressed') advices.push('🧘 Practice <strong>stress management</strong> — deep breathing, light cardio, and adequate sleep work wonders');
      if (ctx.mental === 'Low Mood') advices.push('💙 Prioritise <strong>self-care</strong> — exercise, sleep, and social connection are proven mood boosters');
      if (ctx.mental === 'Motivated') advices.push('🌟 Mental status is excellent! Channel that motivation into consistent training');
      if (ctx.routineCount === 0) advices.push('💪 Add exercises to your <a href="/wger.html" style="color:var(--fa-teal);">Workout Routine</a> to improve your fitness status');
      if (ctx.mealCount === 0) advices.push('🍽️ Save meals in your <a href="/spoonacular.html" style="color:var(--fa-teal);">Meal Plan</a> for accurate nutrition tracking');

      if (advices.length > 0) {
        text += '<strong>Personalised recommendations for you:</strong><br>' + advices.map(a => '• ' + a).join('<br>');
      }
      text += '<br><br>Want specific <strong>workout</strong> or <strong>meal</strong> suggestions based on your status? 🚀';
      return respond({ intent, text });
    }

    // ── PERSONALISED SUGGEST (general) ──
    if (intent === 'personalised_suggest') {
      if (!ctx) return respond({ intent, text: greeting + 'I need your profile data to give personalised suggestions! Please <a href="/profile.html" style="color:var(--fa-teal);font-weight:700;">complete your profile</a> and evaluate your health on the Dashboard first. 😊' });

      let text = greeting + 'Based on your current health data, here are my personalised suggestions for you! 🎯<br><br>';
      const suggestions = [];

      // Physical-based suggestions
      if (ctx.physical === 'Good')         suggestions.push('✅ <strong>Physical:</strong> You\'re in great shape! Focus on maintaining with balanced nutrition and regular exercise.');
      if (ctx.physical === 'Fair')         suggestions.push('⚠️ <strong>Physical:</strong> Review your diet — aim for fat below 30% of calories. Add more vegetables and lean protein.');
      if (ctx.physical === 'Overweight')   suggestions.push('⚖️ <strong>Physical:</strong> A 500 calorie daily deficit + 150+ min/week exercise is the evidence-based approach for healthy weight loss.');
      if (ctx.physical === 'Underweight')  suggestions.push('🪶 <strong>Physical:</strong> Increase calorie intake by 300-500/day with protein-rich foods. Strength training helps build healthy mass.');
      if (ctx.physical === 'At Risk')      suggestions.push('🚨 <strong>Physical:</strong> Please consult a healthcare provider. Focus on gradual, sustainable lifestyle changes.');

      // Fitness-based suggestions
      if (ctx.fitness === 'Sedentary')          suggestions.push('🪑 <strong>Fitness:</strong> Start with 3x 30-minute walks per week. Small consistent steps beat intense occasional bursts!');
      if (ctx.fitness === 'Lightly Active')     suggestions.push('🚶 <strong>Fitness:</strong> Increase to 150 min/week. Add 1-2 strength training days to your routine.');
      if (ctx.fitness === 'Moderately Active')  suggestions.push('🏃 <strong>Fitness:</strong> You\'re meeting WHO guidelines! Push toward 300 min/week for additional health benefits.');
      if (ctx.fitness === 'Very Active')        suggestions.push('🏆 <strong>Fitness:</strong> Elite level activity! Ensure adequate recovery (sleep, nutrition) to prevent overtraining.');

      // Mental-based suggestions
      if (ctx.mental === 'Motivated')     suggestions.push('🌟 <strong>Mental:</strong> Excellent mindset! Use this momentum to set ambitious new goals.');
      if (ctx.mental === 'Neutral')       suggestions.push('😊 <strong>Mental:</strong> Stable mental state. Keep chatting with CoachAlchemy and track your mood patterns!');
      if (ctx.mental === 'Stressed')      suggestions.push('😤 <strong>Mental:</strong> Cardio exercise reduces cortisol by up to 26%. Aim for 20 min daily movement + adequate sleep.');
      if (ctx.mental === 'Low Mood')      suggestions.push('💙 <strong>Mental:</strong> Gentle exercise, sunlight, good nutrition, and social connection are clinically proven mood boosters.');

      // Goal-based suggestions
      if (ctx.goal === 'Weight Loss')     suggestions.push('🎯 <strong>Goal:</strong> For weight loss, combine cardio (150+ min/week) + mild calorie deficit + high protein intake.');
      if (ctx.goal === 'Muscle Gain')     suggestions.push('🎯 <strong>Goal:</strong> For muscle gain, strength train 3-4x/week + eat 1.6-2.2g protein per kg body weight + 7-9hr sleep.');
      if (ctx.goal === 'General Fitness') suggestions.push('🎯 <strong>Goal:</strong> For general fitness, mix cardio + strength training + flexibility work throughout the week.');
      if (ctx.goal === 'Endurance')       suggestions.push('🎯 <strong>Goal:</strong> For endurance, prioritise cardio (running, cycling, swimming) with progressive distance increases.');

      if (suggestions.length === 0) suggestions.push('📋 Complete your <a href="/profile.html" style="color:var(--fa-teal);">Profile</a> and run a Health Evaluation on your Dashboard for fully personalised suggestions!');

      text += suggestions.join('<br><br>');
      text += '<br><br>Want me to find a specific <strong>workout</strong> or <strong>meal</strong> tailored to your goals? 🚀';
      return respond({ intent, text });
    }

    // ── PERSONALISED MEAL ──
    if (intent === 'personalised_meal') {
      const mealQuery = ctx?.goal === 'Weight Loss'  ? { query: 'salad',          label: 'low calorie' } :
                        ctx?.goal === 'Muscle Gain'  ? { query: 'chicken breast',  label: 'high protein' } :
                        ctx?.diet === 'Keto'         ? { query: 'chicken',         label: 'keto' } :
                        ctx?.diet === 'Vegan'        ? { query: 'vegetables',      label: 'vegan' } :
                        ctx?.diet === 'Vegetarian'   ? { query: 'pasta',           label: 'vegetarian' } :
                        ctx?.physical === 'Overweight' ? { query: 'salad',         label: 'low calorie' } :
                                                       { query: 'healthy chicken', label: 'balanced' };

      const baseUrl  = 'http://localhost:' + (process.env.PORT || 3000);
      const response = await axios.get(baseUrl + '/api/recipes/search?query=' + encodeURIComponent(mealQuery.query) + '&offset=0', { timeout: 10000 });
      const recipes  = (response.data.results || []).slice(0, 3);

      let text = greeting + 'Based on your ';
      if (ctx?.goal) text += '<strong>' + ctx.goal + '</strong> goal';
      else if (ctx?.diet) text += '<strong>' + ctx.diet + '</strong> preference';
      else text += 'health profile';
      text += ', here are personalised <strong>' + mealQuery.label + '</strong> meal suggestions! 🍽️<br><br>';

      if (!recipes.length) {
        text += 'I couldn\'t fetch recipes right now. Visit the <a href="/spoonacular.html" style="color:#1976d2;font-weight:700;">Meal Planning</a> page for personalised recipes!';
        return respond({ intent, text });
      }

      recipes.forEach(r => {
        const img = r.image ? '<img src="' + r.image + '" alt="' + r.title + '" style="width:100%;max-width:180px;border-radius:10px;margin-bottom:8px;">' : '';
        text += '<div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:14px;margin-bottom:12px;">' + img + '<div style="font-weight:800;color:#1b5e20;">🍴 ' + r.title + '</div></div>';
      });
      text += '<br>👉 More personalised recipes on the <a href="/spoonacular.html" style="color:#1976d2;font-weight:700;">Meal Planning</a> page!';
      return respond({ intent, text, data: recipes });
    }

    // ── PERSONALISED WORKOUT ──
    if (intent === 'personalised_workout') {
      const workoutCat = ctx?.fitness === 'Sedentary'   ? 'Cardio' :
                         ctx?.fitness === 'Lightly Active' ? 'Abs' :
                         ctx?.goal === 'Muscle Gain'    ? 'Chest' :
                         ctx?.goal === 'Weight Loss'    ? 'Cardio' :
                         ctx?.goal === 'Endurance'      ? 'Cardio' : null;

      const baseUrl  = 'http://localhost:' + (process.env.PORT || 3000);
      let url = baseUrl + '/api/exercises?limit=3&offset=0';
      if (workoutCat) url += '&category=' + encodeURIComponent(workoutCat);

      const response  = await axios.get(url, { timeout: 10000 });
      const exercises = response.data.results || [];

      let text = greeting + 'Based on your ';
      if (ctx?.fitness) text += '<strong>' + ctx.fitness + '</strong> fitness level';
      if (ctx?.goal) text += ' and <strong>' + ctx.goal + '</strong> goal';
      text += ', here are personalised workout recommendations! 💪<br><br>';

      if (ctx?.fitness === 'Sedentary') text += '⚠️ <em>Starting from sedentary — begin with light cardio and gradually increase intensity.</em><br><br>';
      if (ctx?.fitness === 'Very Active') text += '🏆 <em>You\'re very active! Here\'s something to challenge you further.</em><br><br>';

      if (!exercises.length) {
        text += 'Check the <a href="/wger.html" style="color:#1976d2;font-weight:700;">Workout Planning</a> page for personalised exercises!';
        return respond({ intent, text });
      }

      exercises.forEach(ex => {
        const img  = ex.image ? '<img src="' + ex.image + '" alt="' + ex.name + '" style="width:100%;max-width:180px;border-radius:10px;margin-bottom:8px;">' : '';
        const desc = ex.description ? ex.description.replace(/<[^>]*>/g,'').slice(0,100)+'...' : '';
        text += '<div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-radius:14px;padding:14px;margin-bottom:12px;">' + img + '<div style="font-weight:800;color:#0d47a1;">💪 ' + ex.name + '</div><div style="font-size:0.85em;color:#444;margin-top:4px;">' + desc + '</div></div>';
      });
      text += '<br>👉 Add these to your routine on the <a href="/wger.html" style="color:#1976d2;font-weight:700;">Workout Planning</a> page!';
      return respond({ intent, text, data: exercises });
    }

    // ── PERSONALISED MENTAL ──
    if (intent === 'personalised_mental') {
      if (!ctx?.mental) {
        return respond({ intent, text: greeting + 'Your mental status hasn\'t been evaluated yet! Chat more with CoachAlchemy and click <strong>"Evaluate My Health"</strong> on the Dashboard to see your mental wellness score. 💙' });
      }
      const mentalResponses = {
        Motivated:  greeting + '🌟 Your mental status is <strong>Motivated</strong> — that\'s fantastic! Your chat history reflects a consistently positive mindset.<br><br>Keep it up by:<br>💪 Setting stretch goals to match your energy<br>📊 Tracking your progress on the Dashboard<br>🎯 Challenging yourself with harder workouts<br><br>Ride this wave — consistency during motivated periods is what transforms bodies! 🚀',
        Neutral:    greeting + '😊 Your mental status is <strong>Neutral</strong> — stable and steady is great!<br><br>To elevate to Motivated:<br>🏃 Regular exercise boosts serotonin naturally<br>🌞 Get morning sunlight daily<br>🎵 Upbeat workout playlist<br>💬 Keep chatting — positive conversations improve your score!<br><br>You\'re in a good place. Keep building! 💪',
        Stressed:   greeting + '😤 Your mental status shows <strong>Stress indicators</strong> in recent conversations.<br><br>Personalised stress relief for you:<br>🧘 <strong>Box breathing</strong> — 4s in, hold 4s, 4s out. Do 5 rounds now<br>🏃 <strong>20-min cardio</strong> — reduces cortisol by up to 26% (Harvard study)<br>😴 <strong>Prioritise sleep</strong> — 7-9 hours resets stress hormones<br>📵 <strong>Digital detox</strong> — 30 mins before bed<br><br>Want a <strong>stress-busting workout</strong> suggestion? 💙',
        'Low Mood': greeting + '💙 Your mental status suggests <strong>Low Mood</strong> in recent conversations.<br><br>I care about your wellbeing. Here\'s what science says helps:<br>🌞 <strong>Sunlight</strong> — 15-20 mins daily boosts serotonin<br>🏃 <strong>Gentle exercise</strong> — even a short walk releases endorphins<br>🤝 <strong>Social connection</strong> — talk to someone you trust<br>🍎 <strong>Nutrition</strong> — omega-3, B vitamins, magnesium support mood<br><br>Remember — you don\'t have to face this alone. If feelings persist, please speak to a professional. 💙<br><br>Want a <strong>gentle workout</strong> to start feeling better today?'
      };
      return respond({ intent, text: mentalResponses[ctx.mental] || mentalResponses.Neutral });
    }

    // ── PERSONALISED FITNESS ──
    if (intent === 'personalised_fitness') {
      if (!ctx?.fitness) {
        return respond({ intent, text: greeting + 'Add exercises to your <a href="/wger.html" style="color:var(--fa-teal);font-weight:700;">Workout Routine</a> then click <strong>"Evaluate My Health"</strong> to see your fitness status! 💪' });
      }
      const weeklyMins = { Sedentary: '<75', 'Lightly Active': '75-149', 'Moderately Active': '150-299', 'Very Active': '300+' }[ctx.fitness] || 'Unknown';
      let text = greeting + 'Your current fitness status is <strong>' + ctx.fitness + '</strong> 💪<br><br>';
      text += '📊 <strong>Estimated weekly activity:</strong> ~' + weeklyMins + ' minutes<br>';
      text += '🎯 <strong>WHO 2020 recommendation:</strong> 150-300 min/week moderate activity<br><br>';

      if (ctx.fitness === 'Sedentary')         text += '⚠️ You\'re below the minimum. Start with 3x 30-min walks this week. Every step counts!<br><br>Want a <strong>beginner workout plan</strong>?';
      if (ctx.fitness === 'Lightly Active')    text += '📈 You\'re making progress! Add 1-2 more workout sessions to reach WHO recommended levels.<br><br>Want suggestions to level up?';
      if (ctx.fitness === 'Moderately Active') text += '✅ You\'re meeting WHO guidelines! Consider adding strength training 2x/week for maximum benefits.<br><br>Want a <strong>strength training routine</strong>?';
      if (ctx.fitness === 'Very Active')       text += '🏆 Exceptional! You exceed WHO recommendations. Focus on quality, recovery, and smart programming.<br><br>Want an <strong>advanced challenge</strong>?';
      return respond({ intent, text });
    }

    // ── PERSONALISED PHYSICAL ──
    if (intent === 'personalised_physical') {
      if (!ctx?.physical) {
        return respond({ intent, text: greeting + 'Update your height and weight in <a href="/profile.html" style="color:var(--fa-teal);font-weight:700;">Profile</a> then run a Health Evaluation to see your physical status! 📋' });
      }
      let text = greeting + 'Your physical status is <strong>' + ctx.physical + '</strong> ';
      if (ctx.bmi) text += '(BMI: <strong>' + ctx.bmi + '</strong>) ';
      text += '<br><br>';

      const bmiNum = parseFloat(ctx.bmi);
      if (ctx.physical === 'Good')        text += '✅ <strong>BMI is in the healthy range (18.5-24.9)!</strong> Your diet balance is also good. Maintain with:<br>• Balanced nutrition (fat <30% calories)<br>• Regular exercise 150+ min/week<br>• Annual health screening';
      if (ctx.physical === 'Fair')        text += '⚠️ <strong>BMI is healthy but dietary balance needs attention.</strong> Review your saved meals — ensure fat stays below 30% of total calories (WHO guideline).';
      if (ctx.physical === 'Overweight')  text += '⚖️ <strong>BMI: ' + ctx.bmi + ' (Overweight range: 25-29.9)</strong><br>Evidence-based approach:<br>• Create 500 cal/day deficit for ~0.5kg/week loss<br>• 150+ min/week cardio<br>• High protein diet (keeps you full)<br>• 7-9 hrs sleep (affects hunger hormones!)';
      if (ctx.physical === 'Underweight') text += '🪶 <strong>BMI: ' + ctx.bmi + ' (Underweight: below 18.5)</strong><br>To gain healthy weight:<br>• Eat 300-500 extra calories daily<br>• Protein 1.6-2.2g/kg body weight<br>• Strength training 3x/week<br>• Please consult a doctor if significantly underweight';
      if (ctx.physical === 'At Risk')     text += '🚨 <strong>BMI indicates health risk.</strong> Please consult a healthcare professional. Small consistent lifestyle changes make a big difference over time.';

      text += '<br><br>Want personalised <strong>meal suggestions</strong> for your physical status?';
      return respond({ intent, text });
    }

    // ── SUPPLEMENT ──
    if (intent === 'supplement') {
      const r = RESPONSES.supplement;
      return respond({ intent, text: r[Math.floor(Math.random() * r.length)] });
    }

    // ── BEGINNER GUIDE ──
    if (intent === 'beginner_guide') {
      const r = RESPONSES.beginner_guide;
      return respond({ intent, text: greeting + r[Math.floor(Math.random() * r.length)] });
    }

    // ── POSTURE / FORM ──
    if (intent === 'posture_form') {
      const r = RESPONSES.posture_form;
      return respond({ intent, text: r[Math.floor(Math.random() * r.length)] });
    }

    // ── CARDIO SPECIFIC ──
    if (intent === 'cardio_specific') {
      const r = RESPONSES.cardio_specific;
      return respond({ intent, text: r[Math.floor(Math.random() * r.length)] });
    }

    // ── MUSCLE BUILDING ──
    if (intent === 'muscle_building') {
      const r = RESPONSES.muscle_building;
      return respond({ intent, text: greeting + r[Math.floor(Math.random() * r.length)] });
    }

    // ── ISLAMIC FITNESS ──
    if (intent === 'islamic_fitness') {
      const r = RESPONSES.islamic_fitness;
      return respond({ intent, text: r[Math.floor(Math.random() * r.length)] });
    }

    // ── UNKNOWN ──
    return respond({
      intent: 'unknown',
      text: "Hmm, I didn't quite catch that 🤔 But I'm here for you!<br><br>Try asking me about:<br>💪 <strong>Workout</strong> — \"Give me a chest workout\" / \"Senaman untuk kaki\" / \"Beginner workout\"<br>🍽️ <strong>Meal</strong> — \"Suggest a keto meal\" / \"Makanan rendah kalori\" / \"Lapar ni nak makan apa\"<br>✨ <strong>Quote</strong> — \"Give me a motivational quote\" / \"Bagi kata semangat\"<br>💊 <strong>Supplements</strong> — \"Should I take creatine?\" / \"Supplement apa untuk muscle\"<br>💙 <strong>Emotion</strong> — \"I'm feeling stressed\" / \"Rasa penat\" / \"Sedih hari ni\"<br>😴 <strong>Sleep</strong> — \"How to sleep better\" / \"Susah nak tidur\"<br>💧 <strong>Hydration</strong> — \"How much water should I drink\" / \"Berapa banyak air sehari\"<br>🩹 <strong>Injury</strong> — \"My knee hurts\" / \"Sakit lutut macam mana\"<br>⚖️ <strong>Weight</strong> — \"How to lose weight\" / \"Cara nak kurus\"<br>🌙 <strong>Islamic</strong> — \"Boleh exercise masa puasa?\" / \"Halal supplement\"<br>🏃 <strong>Cardio</strong> — \"Best cardio for fat loss\" / \"Cara nak lari lagi laju\"<br>📊 <strong>Health Check</strong> — \"Check my health\" / \"Macam mana kondisi saya\"<br><br>I understand English, Malay, and Manglish! 🇲🇾 Tanya je apa-apa! 😊"
    });

  } catch (error) {
    console.error('CoachAlchemy error:', error.message);
    res.status(500).json({ intent: 'error', text: 'Sorry, something went wrong. Please try again!' });
  }
}

module.exports = { chat };
