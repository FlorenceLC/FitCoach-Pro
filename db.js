// ============================================================
// FITCOACH PRO - Database Layer (localStorage)
// ============================================================

const DB_KEY = 'fitcoach_v2';

const DB = {
  // ── Load all data ──
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : this.defaults();
    } catch { return this.defaults(); }
  },

  // ── Save all data ──
  save(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) { console.error('DB save error:', e); }
  },

  // ── Default structure ──
  defaults() {
    return {
      profile: {
        name: 'Athlète', age: 25, weight: 75, height: 178,
        goal: 'muscle', level: 1, xp: 0, streak: 0,
        lastWorkoutDate: null,
        badges: [],
        apiKey: '' // Mistral API key
      },
      workouts: [],           // All logged workouts
      programs: [],           // Muscle programs
      exercises_library: DB.defaultExercises(),
      plans: [],              // Planned sessions (calendar)
      runs: [],               // Running sessions
      combats: [],            // Combat sessions
      recovery: [],           // Recovery logs
      nutrition: [],          // Daily nutrition logs
      timers: []              // Saved timers
    };
  },

  defaultExercises() {
    return [
      // Chest
      { id: 'ex1', name: 'Développé couché', muscle: 'Pectoraux', type: 'compound' },
      { id: 'ex2', name: 'Développé incliné', muscle: 'Pectoraux', type: 'compound' },
      { id: 'ex3', name: 'Écarté haltères', muscle: 'Pectoraux', type: 'isolation' },
      { id: 'ex4', name: 'Dips', muscle: 'Pectoraux', type: 'compound' },
      // Back
      { id: 'ex5', name: 'Traction', muscle: 'Dos', type: 'compound' },
      { id: 'ex6', name: 'Rowing barre', muscle: 'Dos', type: 'compound' },
      { id: 'ex7', name: 'Tirage poulie', muscle: 'Dos', type: 'compound' },
      { id: 'ex8', name: 'Soulevé de terre', muscle: 'Dos', type: 'compound' },
      // Shoulders
      { id: 'ex9', name: 'Développé militaire', muscle: 'Épaules', type: 'compound' },
      { id: 'ex10', name: 'Élévations latérales', muscle: 'Épaules', type: 'isolation' },
      { id: 'ex11', name: 'Oiseau', muscle: 'Épaules', type: 'isolation' },
      // Arms
      { id: 'ex12', name: 'Curl biceps', muscle: 'Biceps', type: 'isolation' },
      { id: 'ex13', name: 'Curl marteau', muscle: 'Biceps', type: 'isolation' },
      { id: 'ex14', name: 'Extensions triceps', muscle: 'Triceps', type: 'isolation' },
      { id: 'ex15', name: 'Dips triceps', muscle: 'Triceps', type: 'compound' },
      // Legs
      { id: 'ex16', name: 'Squat', muscle: 'Quadriceps', type: 'compound' },
      { id: 'ex17', name: 'Leg press', muscle: 'Quadriceps', type: 'compound' },
      { id: 'ex18', name: 'Fentes', muscle: 'Quadriceps', type: 'compound' },
      { id: 'ex19', name: 'Leg curl', muscle: 'Ischio-jambiers', type: 'isolation' },
      { id: 'ex20', name: 'Mollets', muscle: 'Mollets', type: 'isolation' },
      // Core
      { id: 'ex21', name: 'Planche', muscle: 'Abdominaux', type: 'isometric' },
      { id: 'ex22', name: 'Crunch', muscle: 'Abdominaux', type: 'isolation' },
      { id: 'ex23', name: 'Relevé de jambes', muscle: 'Abdominaux', type: 'isolation' },
    ];
  }
};

// ── Global state ──
let state = DB.load();

function saveState() { DB.save(state); }

// ── Helpers ──
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function today() { return formatDate(new Date()); }

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeStr(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function calcBMR(profile) {
  const { weight, height, age } = profile;
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calcTDEE(profile) {
  const bmr = calcBMR(profile);
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (factors[profile.activity || 'moderate']));
}

function calcVolume(sets) {
  return sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
}

// XP / Levels
const XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];
function getLevel(xp) {
  let lvl = 1;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) { lvl = i + 1; break; }
  }
  return lvl;
}

function addXP(amount) {
  const oldLevel = getLevel(state.profile.xp);
  state.profile.xp += amount;
  const newLevel = getLevel(state.profile.xp);
  state.profile.level = newLevel;
  saveState();
  if (newLevel > oldLevel) showToast(`🎉 Niveau ${newLevel} atteint !`, 'pr');
}

function updateStreak() {
  const last = state.profile.lastWorkoutDate;
  const tod = today();
  const yesterday = formatDate(new Date(Date.now() - 86400000));
  if (last === yesterday || last === tod) {
    if (last !== tod) state.profile.streak++;
  } else if (last !== tod) {
    state.profile.streak = 1;
  }
  state.profile.lastWorkoutDate = tod;
  saveState();
}

// ── PR Detection ──
function checkPR(exerciseId, weight, reps) {
  const history = state.workouts
    .flatMap(w => w.exercises || [])
    .filter(e => e.exerciseId === exerciseId)
    .flatMap(e => e.sets || []);

  const maxWeight = Math.max(0, ...history.map(s => parseFloat(s.weight) || 0));
  const maxVol = Math.max(0, ...history.map(s => (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)));
  const currVol = weight * reps;
  const isPR = weight > maxWeight || currVol > maxVol;
  return isPR;
}

// ── Achievements ──
const ACHIEVEMENTS = [
  { id: 'first_workout', icon: '🏋️', label: 'Premier pas', desc: 'Première séance complétée' },
  { id: 'streak_7', icon: '🔥', label: '7 jours', desc: '7 jours consécutifs' },
  { id: 'streak_30', icon: '⚡', label: '30 jours', desc: '30 jours consécutifs' },
  { id: 'pr_hunter', icon: '🏆', label: 'PR Hunter', desc: 'Premier record battu' },
  { id: 'run_10k', icon: '🏃', label: '10K Club', desc: 'Course de 10km' },
  { id: 'level_5', icon: '⭐', label: 'Niveau 5', desc: 'Atteindre le niveau 5' },
  { id: 'hundred_sessions', icon: '💯', label: 'Centenaire', desc: '100 séances' },
  { id: 'combat_10', icon: '🥊', label: 'Combattant', desc: '10 séances de combat' },
  { id: 'nutrition_week', icon: '🥗', label: 'Nutritioniste', desc: '7 jours de suivi nutrition' },
];

function unlockAchievement(id) {
  if (!state.profile.badges.includes(id)) {
    state.profile.badges.push(id);
    const a = ACHIEVEMENTS.find(a => a.id === id);
    if (a) showToast(`${a.icon} Badge débloqué : ${a.label}`, 'pr');
    saveState();
  }
}

function checkAchievements() {
  const totalWorkouts = state.workouts.length;
  const streak = state.profile.streak;
  const level = state.profile.level;
  const combats = state.combats.length;
  const nutritionDays = state.nutrition.length;

  if (totalWorkouts >= 1) unlockAchievement('first_workout');
  if (streak >= 7) unlockAchievement('streak_7');
  if (streak >= 30) unlockAchievement('streak_30');
  if (level >= 5) unlockAchievement('level_5');
  if (totalWorkouts >= 100) unlockAchievement('hundred_sessions');
  if (combats >= 10) unlockAchievement('combat_10');
  if (nutritionDays >= 7) unlockAchievement('nutrition_week');
  if (state.runs.some(r => r.distance >= 10)) unlockAchievement('run_10k');
}
