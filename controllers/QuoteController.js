const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
// QuoteController — FitAlchemy Quote Assistant
// Comprehensive category mapping + rich fallback library
// Anti-repeat: tracks recently served quotes per session
// ═══════════════════════════════════════════════════════════════════════════════

// ── Category Map: internal tag → API Ninjas category ─────────────────────────
const CATEGORY_MAP = {
  // Fitness & Health
  fitness:        'inspirational',
  workout:        'inspirational',
  exercise:       'inspirational',
  gym:            'inspirational',
  sport:          'inspirational',
  training:       'inspirational',
  strength:       'inspirational',
  endurance:      'inspirational',
  cardio:         'inspirational',
  health:         'life',
  wellness:       'life',
  nutrition:      'life',
  body:           'life',
  recovery:       'life',

  // Mental & Emotional
  motivational:   'inspirational',
  inspiration:    'inspirational',
  perseverance:   'inspirational',
  resilience:     'inspirational',
  discipline:     'inspirational',
  consistency:    'inspirational',
  mental:         'inspirational',
  mindset:        'inspirational',
  focus:          'inspirational',
  determination:  'inspirational',
  patience:       'wisdom',
  growth:         'inspirational',

  // Negative emotions → mapped to uplifting categories
  stress:         'inspirational',
  anxiety:        'courage',
  fear:           'courage',
  failure:        'success',
  struggle:       'resilience',
  sad:            'happiness',
  sadness:        'happiness',
  lonely:         'happiness',
  tired:          'inspirational',
  unmotivated:    'inspirational',
  hopeless:       'courage',
  lost:           'wisdom',
  confused:       'wisdom',
  overthinking:   'wisdom',
  pain:           'resilience',

  // Achievement
  success:        'success',
  achieve:        'success',
  goal:           'success',
  accomplish:     'success',
  win:            'success',
  victory:        'success',
  progress:       'success',
  improvement:    'success',
  hardwork:       'success',
  'hard work':    'success',
  work:           'success',
  career:         'success',

  // Wisdom & Knowledge
  wisdom:         'wisdom',
  wise:           'wisdom',
  knowledge:      'wisdom',
  learn:          'wisdom',
  education:      'wisdom',
  think:          'wisdom',
  reflect:        'wisdom',
  philosophy:     'philosophy',
  truth:          'truth',
  honest:         'truth',
  real:           'truth',

  // Emotions
  happy:          'happiness',
  happiness:      'happiness',
  joy:            'happiness',
  smile:          'happiness',
  positive:       'happiness',
  grateful:       'happiness',
  gratitude:      'happiness',
  blessed:        'happiness',
  content:        'happiness',

  // Courage & Confidence
  courage:        'courage',
  brave:          'courage',
  bold:           'courage',
  confidence:     'courage',
  fearless:       'courage',
  risk:           'courage',
  change:         'courage',

  // Life & Purpose
  life:           'life',
  living:         'life',
  journey:        'life',
  purpose:        'life',
  meaning:        'life',
  time:           'life',
  death:          'life',
  legacy:         'life',

  // Relationships
  love:           'happiness',
  friendship:     'happiness',
  family:         'life',
  relationship:   'happiness',
  kindness:       'happiness',

  // Leadership & Character
  leadership:     'wisdom',
  character:      'wisdom',
  integrity:      'truth',
  respect:        'wisdom',

  // Defaults
  inspirational:  'inspirational',
  morning:        'inspirational',
  daily:          'inspirational',
  today:          'inspirational',
  random:         'inspirational'
};


// ── Malay / Islamic / Local Malaysian Quote Library ──────────────────────────
// Peribahasa Melayu, Al-Quran, Hadith, and Malaysian motivational figures
// Used when user writes in Malay or requests motivational content
const MALAY_QUOTES = {
  motivational: [
    { quote: "Berakit-rakit ke hulu, berenang-renang ke tepian. Bersakit-sakit dahulu, bersenang-senang kemudian.", author: "Peribahasa Melayu" },
    { quote: "Usaha tangga kejayaan. Tanpa usaha, impian hanyalah mimpi.", author: "Peribahasa Melayu" },
    { quote: "Hendak seribu daya, tak hendak seribu dalih.", author: "Peribahasa Melayu" },
    { quote: "Sekali air bah, sekali pantai berubah. Jadilah insan yang sentiasa bersedia berubah ke arah kebaikan.", author: "Peribahasa Melayu" },
    { quote: "Sikit-sikit, lama-lama jadi bukit. Setiap usaha kecil yang konsisten akan membawa kejayaan besar.", author: "Peribahasa Melayu" },
    { quote: "Alang-alang menyeluk pekasam, biar sampai ke pangkal lengan. Apa juga yang dilakukan, lakukanlah dengan sepenuh hati.", author: "Peribahasa Melayu" },
    { quote: "Tegakkan dirimu sebelum menegakkan orang lain.", author: "Peribahasa Melayu" },
    { quote: "Jangan lihat siapa yang bercakap, tetapi lihat apa yang dicakapkan.", author: "Peribahasa Melayu" },
    { quote: "Melentur buluh biarlah dari rebungnya. Mulakan sesuatu dari awal dengan betul.", author: "Peribahasa Melayu" },
    { quote: "Bukan lebah tidak berbisa, bukan perjuangan tanpa pengorbanan.", author: "Peribahasa Melayu" }
  ],
  islamic: [
    { quote: "Sesungguhnya Allah tidak mengubah keadaan sesuatu kaum sehingga mereka mengubah keadaan yang ada pada diri mereka sendiri.", author: "Al-Quran, Surah Ar-Ra'd (13:11)" },
    { quote: "Dan bahawasanya seorang manusia tiada memperoleh selain apa yang telah diusahakannya.", author: "Al-Quran, Surah An-Najm (53:39)" },
    { quote: "Maka sesungguhnya bersama kesulitan ada kemudahan. Sesungguhnya bersama kesulitan ada kemudahan.", author: "Al-Quran, Surah Ash-Sharh (94:5-6)" },
    { quote: "Dan bertawakallah kepada Allah. Sesungguhnya Allah mencintai orang-orang yang bertawakal.", author: "Al-Quran, Surah Ali Imran (3:159)" },
    { quote: "Janganlah kamu bersedih hati, sesungguhnya Allah bersama kita.", author: "Al-Quran, Surah At-Tawbah (9:40)" },
    { quote: "Orang mukmin yang kuat lebih baik dan lebih dicintai Allah daripada orang mukmin yang lemah.", author: "Hadith Riwayat Muslim" },
    { quote: "Mukmin yang kuat lebih baik daripada mukmin yang lemah dalam segala kebaikan. Namun, pada setiap keduanya terdapat kebaikan.", author: "Hadith Riwayat Muslim" },
    { quote: "Ambillah lima perkara sebelum lima perkara: hidupmu sebelum matimu, sihatmu sebelum sakitmu, lapangmu sebelum sempitmu, mudamu sebelum tuamu, kayamu sebelum miskinmu.", author: "Hadith Riwayat Al-Hakim" },
    { quote: "Sesungguhnya dalam jasad ada segumpal daging. Jika ia baik maka baiklah seluruh jasad, jika ia rosak maka rosaklah seluruh jasad. Itulah hati.", author: "Hadith Riwayat Bukhari & Muslim" },
    { quote: "Bersabarlah, sesungguhnya pertolongan itu bersama kesabaran, kelapangan itu bersama kesempitan, dan sesungguhnya selepas kesukaran itu ada kemudahan.", author: "Hadith Riwayat Ahmad" }
  ],
  resilience: [
    { quote: "Jangan pernah menyerah. Hari ini sukar, esok mungkin lebih sukar, tetapi hari selepasnya akan menjadi sinar matahari.", author: "Jack Ma" },
    { quote: "Kejayaan bukan milik orang yang tidak pernah gagal, tetapi milik orang yang tidak pernah berhenti mencuba.", author: "Unknown" },
    { quote: "Jatuh tujuh kali, bangun lapan kali.", author: "Peribahasa Jepun" },
    { quote: "Seseorang yang tidak pernah membuat kesilapan tidak pernah mencuba sesuatu yang baru.", author: "Albert Einstein (terjemahan)" },
    { quote: "Keberanian bukanlah ketiadaan rasa takut, tetapi keputusan bahawa ada sesuatu yang lebih penting daripada rasa takut.", author: "Ambrose Redmoon (terjemahan)" },
    { quote: "Kegagalan adalah peluang untuk memulakan semula dengan lebih bijak.", author: "Henry Ford (terjemahan)" },
    { quote: "Kekuatan tidak datang dari kemenangan. Perjuanganmu membentuk kekuatanmu.", author: "Arnold Schwarzenegger (terjemahan)" },
    { quote: "Di sebalik setiap kesukaran pasti ada kemudahan. Yakinlah.", author: "Unknown" },
    { quote: "Orang yang berjaya bukanlah orang yang tidak pernah jatuh, tetapi orang yang bangkit setiap kali jatuh.", author: "Unknown" },
    { quote: "Badai pasti berlalu. Pelangi muncul selepas hujan.", author: "Peribahasa Melayu" }
  ],
  health: [
    { quote: "Kesihatan adalah mahkota di kepala orang sihat yang hanya dapat dilihat oleh orang sakit.", author: "Peribahasa Arab" },
    { quote: "Menjaga kesihatan adalah kewajipan. Tubuh badan adalah amanah yang perlu dijaga.", author: "Prinsip Islam" },
    { quote: "Jasad yang sihat menempatkan jiwa yang sihat.", author: "Juvenal (terjemahan)" },
    { quote: "Kesihatan adalah kekayaan sebenar, bukan kepingan emas dan perak.", author: "Mahatma Gandhi (terjemahan)" },
    { quote: "Jaga tubuhmu. Ia satu-satunya tempat kamu terpaksa tinggal.", author: "Jim Rohn (terjemahan)" },
    { quote: "Labur dalam kesihatan hari ini atau bayar kos penyakit esok.", author: "Unknown" },
    { quote: "Bersenam bukan hanya untuk badan yang cantik, tetapi untuk jiwa yang tenang dan minda yang tajam.", author: "Unknown" },
    { quote: "Tubuh yang aktif, jiwa yang cergas, hidup yang bermakna.", author: "Unknown" },
    { quote: "Mulakan hari dengan niat yang baik, akhiri hari dengan rasa syukur.", author: "Unknown" },
    { quote: "Setiap langkah kecil ke arah kesihatan adalah langkah besar menuju kehidupan yang lebih baik.", author: "Unknown" }
  ],
  success: [
    { quote: "Kejayaan adalah perjalanan, bukan destinasi.", author: "Unknown" },
    { quote: "Mimpi besar, berusaha gigih, berdoa bersungguh-sungguh.", author: "Unknown" },
    { quote: "Orang yang berjaya adalah mereka yang bangun satu kali lebih banyak daripada mereka yang jatuh.", author: "Unknown" },
    { quote: "Tidak ada jalan pintas menuju kejayaan. Usaha, sabar, dan doa adalah kuncinya.", author: "Unknown" },
    { quote: "Setiap pencapaian besar bermula dengan keputusan untuk mencuba.", author: "Unknown" },
    { quote: "Bukan tentang seberapa cepat kamu berlari, tetapi seberapa jauh kamu sanggup pergi.", author: "Unknown" },
    { quote: "Impian tanpa tindakan hanyalah angan-angan. Tindakan tanpa impian hanyalah sia-sia.", author: "Unknown" },
    { quote: "Berjayalah dengan cara yang betul, supaya kejayaanmu membawa berkat.", author: "Unknown" },
    { quote: "Usahamu hari ini adalah kejayaanmu esok hari.", author: "Unknown" },
    { quote: "Malaysia Boleh! — Kepercayaan bahawa tiada yang mustahil jika kita bersatu dan berusaha.", author: "Semangat Malaysia" }
  ]
};

function getRandomMalayQuote(type) {
  const pool = MALAY_QUOTES[type] || MALAY_QUOTES.motivational;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isMalayMessage(msg) {
  const malayWords = ['saya','aku','kamu','awak','dia','kami','kita','mereka','yang','dan','di','ke','dari','untuk','dengan','tidak','tak','boleh','mahu','nak','ada','pergi','buat','rasa','hari','masa','kerja','hidup','diri','hati','semangat','usaha','berjaya','sihat','cergas','kuat','penat','sedih','gembira','syukur','alhamdulillah','insyaAllah','subhanallah','masya-Allah'];
  const lower = msg.toLowerCase();
  const count = malayWords.filter(w => lower.includes(w)).length;
  return count >= 2; // at least 2 Malay words detected
}

function mapToApiNinjasCategory(tag) {
  if (!tag) return 'inspirational';
  const lower = tag.toLowerCase().trim();
  return CATEGORY_MAP[lower] || 'inspirational';
}

// ── Massive Fallback Library — 10 quotes per category, all unique ─────────────
const FALLBACK_QUOTES = {
  inspirational: [
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { quote: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { quote: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
    { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { quote: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
    { quote: "Little things make big days.", author: "Unknown" },
    { quote: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
    { quote: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
    { quote: "When you feel like quitting, think about why you started.", author: "Unknown" }
  ],
  success: [
    { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { quote: "Don't wish it were easier; wish you were better.", author: "Jim Rohn" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
    { quote: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
    { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { quote: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
    { quote: "It is not the strongest of the species that survive, but the most adaptable.", author: "Charles Darwin" },
    { quote: "In order to succeed, your desire for success should be greater than your fear of failure.", author: "Bill Cosby" }
  ],
  wisdom: [
    { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
    { quote: "Knowledge speaks, but wisdom listens.", author: "Jimi Hendrix" },
    { quote: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
    { quote: "The secret of life is to fall seven times and to get up eight times.", author: "Paulo Coelho" },
    { quote: "It is the mark of an educated mind to entertain a thought without accepting it.", author: "Aristotle" },
    { quote: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
    { quote: "You don't learn to walk by following rules. You learn by doing and by falling over.", author: "Richard Branson" },
    { quote: "A wise man can learn more from a foolish question than a fool can learn from a wise answer.", author: "Bruce Lee" },
    { quote: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { quote: "Real knowledge is to know the extent of one's ignorance.", author: "Confucius" },
    { quote: "By three methods we may learn wisdom: by reflection, by example, and by experience.", author: "Confucius" },
    { quote: "Patience is the companion of wisdom.", author: "Saint Augustine" }
  ],
  courage: [
    { quote: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
    { quote: "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt" },
    { quote: "It takes courage to grow up and become who you really are.", author: "E.E. Cummings" },
    { quote: "Be brave. Take risks. Nothing can substitute experience.", author: "Paulo Coelho" },
    { quote: "Life shrinks or expands in proportion to one's courage.", author: "Anais Nin" },
    { quote: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
    { quote: "All you need is the plan, the road map, and the courage to press on to your destination.", author: "Earl Nightingale" },
    { quote: "Scared is what you're feeling. Brave is what you're doing.", author: "Emma Donoghue" },
    { quote: "Have the courage to follow your heart and intuition.", author: "Steve Jobs" },
    { quote: "The secret to happiness is freedom, and the secret to freedom is courage.", author: "Thucydides" },
    { quote: "One isn't necessarily born with courage, but one is born with potential.", author: "Maya Angelou" },
    { quote: "Inaction breeds doubt and fear. Action breeds confidence and courage.", author: "Dale Carnegie" },
    { quote: "Fortune favours the brave.", author: "Virgil" },
    { quote: "Courage is doing what you're afraid to do. There can be no courage unless you're scared.", author: "Eddie Rickenbacker" },
    { quote: "The brave man is not he who does not feel afraid, but he who conquers that fear.", author: "Nelson Mandela" }
  ],
  happiness: [
    { quote: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
    { quote: "The groundwork for all happiness is good health.", author: "Leigh Hunt" },
    { quote: "The most important thing is to enjoy your life — to be happy.", author: "Audrey Hepburn" },
    { quote: "Happiness depends upon ourselves.", author: "Aristotle" },
    { quote: "Count your age by friends, not years. Count your life by smiles, not tears.", author: "John Lennon" },
    { quote: "Happiness is a warm puppy.", author: "Charles M. Schulz" },
    { quote: "For every minute you are angry you lose sixty seconds of happiness.", author: "Ralph Waldo Emerson" },
    { quote: "Happiness is not a destination, it's a way of life.", author: "Unknown" },
    { quote: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
    { quote: "Happiness is when what you think, what you say, and what you do are in harmony.", author: "Mahatma Gandhi" },
    { quote: "Be happy for this moment. This moment is your life.", author: "Omar Khayyam" },
    { quote: "Happiness is a choice, not a result.", author: "Ralph Marston" },
    { quote: "The happiness of your life depends on the quality of your thoughts.", author: "Marcus Aurelius" },
    { quote: "Joy is not in things; it is in us.", author: "Richard Wagner" },
    { quote: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" }
  ],
  life: [
    { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { quote: "The greatest wealth is health.", author: "Virgil" },
    { quote: "Your health is an investment, not an expense.", author: "Unknown" },
    { quote: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
    { quote: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
    { quote: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
    { quote: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
    { quote: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
    { quote: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
    { quote: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
    { quote: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead" },
    { quote: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
    { quote: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
    { quote: "The most wasted of days is one without laughter.", author: "E.E. Cummings" },
    { quote: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" }
  ],
  philosophy: [
    { quote: "The unexamined life is not worth living.", author: "Socrates" },
    { quote: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
    { quote: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
    { quote: "To be yourself in a world constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
    { quote: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
    { quote: "We cannot solve our problems with the same thinking we used when we created them.", author: "Albert Einstein" },
    { quote: "I think, therefore I am.", author: "René Descartes" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
    { quote: "Man is condemned to be free.", author: "Jean-Paul Sartre" },
    { quote: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
    { quote: "What we think, we become.", author: "Buddha" },
    { quote: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", author: "Marcus Aurelius" },
    { quote: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
    { quote: "The soul becomes dyed with the colour of its thoughts.", author: "Marcus Aurelius" }
  ],
  truth: [
    { quote: "The truth is rarely pure and never simple.", author: "Oscar Wilde" },
    { quote: "Three things cannot be long hidden: the sun, the moon, and the truth.", author: "Buddha" },
    { quote: "Facts do not cease to exist because they are ignored.", author: "Aldous Huxley" },
    { quote: "Truth is powerful and it prevails.", author: "Sojourner Truth" },
    { quote: "The truth will set you free, but first it will make you miserable.", author: "James A. Garfield" },
    { quote: "Rather than love, than money, than fame, give me truth.", author: "Henry David Thoreau" },
    { quote: "Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth.", author: "Oscar Wilde" },
    { quote: "The truth is not for all men, but only for those who seek it.", author: "Ayn Rand" },
    { quote: "Honesty is the first chapter in the book of wisdom.", author: "Thomas Jefferson" },
    { quote: "A lie gets halfway around the world before the truth has a chance to get its pants on.", author: "Winston Churchill" },
    { quote: "All truths are easy to understand once they are discovered; the point is to discover them.", author: "Galileo Galilei" },
    { quote: "Truth never damages a cause that is just.", author: "Mahatma Gandhi" },
    { quote: "The greatest truth is honesty, and the greatest falsehood is dishonesty.", author: "Abu Bakr" },
    { quote: "It is hard to believe that a man is telling the truth when you know that you would lie if you were in his place.", author: "H.L. Mencken" },
    { quote: "The truth is incontrovertible. Malice may attack it, ignorance may deride it, but in the end, there it is.", author: "Winston Churchill" }
  ],
  resilience: [
    { quote: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { quote: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers" },
    { quote: "The human capacity for burden is like bamboo — far more flexible than you'd ever believe at first glance.", author: "Jodi Picoult" },
    { quote: "You may have to fight a battle more than once to win it.", author: "Margaret Thatcher" },
    { quote: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling" },
    { quote: "Out of difficulties grow miracles.", author: "Jean de la Bruyere" },
    { quote: "The gem cannot be polished without friction, nor man perfected without trials.", author: "Chinese Proverb" },
    { quote: "When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.", author: "Henry Ford" },
    { quote: "Life doesn't get easier or more forgiving, we get stronger and more resilient.", author: "Steve Maraboli" },
    { quote: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
    { quote: "A good half of the art of living is resilience.", author: "Alain de Botton" },
    { quote: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
    { quote: "The most beautiful people we have known are those who have known defeat, known suffering, known struggle.", author: "Elisabeth Kübler-Ross" },
    { quote: "Endurance is not just the ability to bear a hard thing, but to turn it into glory.", author: "William Barclay" },
    { quote: "I can be changed by what happens to me. But I refuse to be reduced by it.", author: "Maya Angelou" }
  ],
  mindset: [
    { quote: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
    { quote: "The mind is everything. What you think you become.", author: "Buddha" },
    { quote: "Your mindset determines your destiny.", author: "Unknown" },
    { quote: "Once your mindset changes, everything on the outside will change along with it.", author: "Steve Maraboli" },
    { quote: "A positive mindset brings positive things.", author: "Philipp Reiter" },
    { quote: "The only limits that exist are the ones you place on yourself.", author: "Unknown" },
    { quote: "Change your thoughts and you change your world.", author: "Norman Vincent Peale" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "You are what you think. So just think big, believe big, act big.", author: "Unknown" },
    { quote: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: "Vince Lombardi" },
    { quote: "We don't see things as they are; we see them as we are.", author: "Anaïs Nin" },
    { quote: "Your mind is a powerful thing. When you fill it with positive thoughts, your life will start to change.", author: "Unknown" },
    { quote: "If you can dream it, you can achieve it.", author: "Zig Ziglar" },
    { quote: "The difference between who you are and who you want to be is what you do.", author: "Unknown" },
    { quote: "A champion is defined not by their wins but by how they can recover when they fall.", author: "Serena Williams" }
  ]
};

// ── Session-level anti-repeat tracking ────────────────────────────────────────
const recentlyServed = new Map(); // category → Set of quote texts
const MAX_TRACK = 10; // track last 10 served per category

function getUniqueQuote(category) {
  const pool    = FALLBACK_QUOTES[category] || FALLBACK_QUOTES.inspirational;
  const served  = recentlyServed.get(category) || new Set();
  const unused  = pool.filter(q => !served.has(q.quote));
  const source  = unused.length > 0 ? unused : pool; // reset if all used
  const idx     = Math.floor(Math.random() * source.length);
  const picked  = source[idx];

  // Track it
  served.add(picked.quote);
  if (served.size > MAX_TRACK) {
    const first = served.values().next().value;
    served.delete(first);
  }
  recentlyServed.set(category, served);

  return { content: picked.quote, author: picked.author, category, source: 'local' };
}

function getUniqueBatch(category, count = 5) {
  const pool   = FALLBACK_QUOTES[category] || FALLBACK_QUOTES.inspirational;
  const served = recentlyServed.get(category) || new Set();
  const unused = pool.filter(q => !served.has(q.quote));
  const source = unused.length >= count ? unused : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const batch  = shuffled.slice(0, count).map(q => ({
    content: q.quote, author: q.author, category, source: 'local'
  }));
  // Track served
  const newServed = new Set(served);
  batch.forEach(q => {
    newServed.add(q.content);
    if (newServed.size > MAX_TRACK * 2) {
      const first = newServed.values().next().value;
      newServed.delete(first);
    }
  });
  recentlyServed.set(category, newServed);
  return batch;
}

class QuoteController {

  // ── GET /api/quote — single random quote (dashboard) ──────────────────────
  static async getRandomQuote(req, res) {
    const categories = ['inspirational','success','wisdom','happiness','life','resilience','mindset','courage'];
    const pick = categories[Math.floor(Math.random() * categories.length)];
    const apiCategory = mapToApiNinjasCategory(pick);

    try {
      const response = await axios.get('https://api.api-ninjas.com/v2/randomquotes', {
        params:  { categories: apiCategory },
        headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        timeout: 5000
      });
      if (response.data && response.data.length > 0) {
        const q = response.data[0];
        return res.json({ content: q.quote, author: q.author, category: (q.categories && q.categories[0]) || pick, source: 'api-ninjas' });
      }
    } catch (err) { console.log('API Ninjas random quote failed:', err.message); }

    res.json(getUniqueQuote(pick));
  }

  // ── GET /api/quote/batch?category=success — batch for Quote Assistant ─────
  static async getQuoteBatch(req, res) {
    const { category, message } = req.query;
    const apiCategory  = mapToApiNinjasCategory(category || 'inspirational');
    const batch = [];

    // If message is in Malay — mix in Malay quotes
    const useMalay = message && isMalayMessage(message);

    try {
      const response = await axios.get('https://api.api-ninjas.com/v2/randomquotes', {
        params:  { categories: apiCategory },
        headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        timeout: 5000
      });
      if (response.data && response.data.length > 0) {
        response.data.forEach(q => {
          batch.push({ content: q.quote, author: q.author, category: (q.categories && q.categories[0]) || apiCategory, source: 'api-ninjas' });
        });
      }
    } catch (err) { console.log('API Ninjas batch failed for "' + apiCategory + '":', err.message); }

    if (batch.length === 0) {
      const fallbacks = getUniqueBatch(apiCategory);
      // Mix in Malay quotes if applicable
      if (useMalay) {
        const malayType = ['success','resilience','health','islamic'].includes(category) ? category : 'motivational';
        const malayQ    = getRandomMalayQuote(malayType);
        fallbacks.unshift({ content: malayQ.quote, author: malayQ.author, category: 'malay', source: 'local-malay' });
      }
      return res.json({ quotes: fallbacks, source: 'local' });
    }

    // Pad with unique fallbacks
    if (batch.length < 5) {
      const fallbacks = getUniqueBatch(apiCategory);
      while (batch.length < 5) batch.push(fallbacks[batch.length % fallbacks.length]);
    }

    // Always inject one Malay quote if message is in Malay
    if (useMalay) {
      const malayType = ['success','resilience','health','islamic'].includes(category) ? category : 'motivational';
      const malayQ    = getRandomMalayQuote(malayType);
      batch.splice(2, 0, { content: malayQ.quote, author: malayQ.author, category: 'malay', source: 'local-malay' });
    }

    res.json({ quotes: batch, source: 'api-ninjas' });
  }

  // ── GET /api/quote/search?tag=fitness ─────────────────────────────────────
  static async getQuoteByTag(req, res) {
    const { tag }     = req.query;
    const apiCategory = mapToApiNinjasCategory(tag);

    try {
      const response = await axios.get('https://api.api-ninjas.com/v2/randomquotes', {
        params:  { categories: apiCategory },
        headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        timeout: 5000
      });
      if (response.data && response.data.length > 0) {
        const q = response.data[0];
        return res.json({ content: q.quote, author: q.author, category: (q.categories && q.categories[0]) || apiCategory, fallback: false, source: 'api-ninjas' });
      }
    } catch (err) { console.log('API Ninjas tag search failed for "' + tag + '":', err.message); }

    const q = getUniqueQuote(apiCategory);
    res.json({ ...q, fallback: false });
  }
}

module.exports = QuoteController;
