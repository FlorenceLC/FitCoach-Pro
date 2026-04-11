// ============================================================
// FITCOACH PRO v3 - Database Layer
// Supabase (cloud sync) + localStorage (offline fallback)
// ============================================================

const DB_KEY = 'fitcoach_v3';
const SB_CONFIG_KEY = 'fitcoach_supabase';

let _sb = null;
function getSB() {
  if (_sb) return _sb;
  try {
    const cfg = JSON.parse(localStorage.getItem(SB_CONFIG_KEY) || '{}');
    if (cfg.url && cfg.key && window.supabase) {
      _sb = window.supabase.createClient(cfg.url, cfg.key);
    }
  } catch {}
  return _sb;
}

function defaultExercises() {
  return [
    { id:'ex1',  name:'Développé couché',     muscle:'Pectoraux',       type:'compound' },
    { id:'ex2',  name:'Développé incliné',     muscle:'Pectoraux',       type:'compound' },
    { id:'ex3',  name:'Écarté haltères',       muscle:'Pectoraux',       type:'isolation' },
    { id:'ex4',  name:'Dips',                  muscle:'Pectoraux',       type:'compound' },
    { id:'ex5',  name:'Traction',              muscle:'Dos',             type:'compound' },
    { id:'ex6',  name:'Rowing barre',          muscle:'Dos',             type:'compound' },
    { id:'ex7',  name:'Tirage poulie haute',   muscle:'Dos',             type:'compound' },
    { id:'ex8',  name:'Soulevé de terre',      muscle:'Dos',             type:'compound' },
    { id:'ex9',  name:'Trap Bar Deadlift',     muscle:'Dos',             type:'compound' },
    { id:'ex10', name:'Développé militaire',   muscle:'Épaules',         type:'compound' },
    { id:'ex11', name:'Élévations latérales',  muscle:'Épaules',         type:'isolation' },
    { id:'ex12', name:'Oiseau',                muscle:'Épaules',         type:'isolation' },
    { id:'ex13', name:'Face pull',             muscle:'Épaules',         type:'isolation' },
    { id:'ex14', name:'Curl biceps barre',     muscle:'Biceps',          type:'isolation' },
    { id:'ex15', name:'Curl marteau',          muscle:'Biceps',          type:'isolation' },
    { id:'ex16', name:'Extensions triceps',    muscle:'Triceps',         type:'isolation' },
    { id:'ex17', name:'Dips triceps banc',     muscle:'Triceps',         type:'compound' },
    { id:'ex18', name:'Squat barre',           muscle:'Quadriceps',      type:'compound' },
    { id:'ex19', name:'Leg press',             muscle:'Quadriceps',      type:'compound' },
    { id:'ex20', name:'Fentes',                muscle:'Quadriceps',      type:'compound' },
    { id:'ex21', name:'Leg curl',              muscle:'Ischio-jambiers', type:'isolation' },
    { id:'ex22', name:'Romanian Deadlift',     muscle:'Ischio-jambiers', type:'compound' },
    { id:'ex23', name:'Mollets debout',        muscle:'Mollets',         type:'isolation' },
    { id:'ex24', name:'Planche',               muscle:'Abdominaux',      type:'isometric' },
    { id:'ex25', name:'Crunch',                muscle:'Abdominaux',      type:'isolation' },
    { id:'ex26', name:'Relevé de jambes',      muscle:'Abdominaux',      type:'isolation' },
    { id:'ex27', name:'Hip thrust',            muscle:'Fessiers',        type:'compound' },
  ];
}

function defaultState() {
  return {
    profile: {
      name:'Athlète', age:25, weight:75, height:178,
      goal:'muscle', activity:'moderate',
      level:1, xp:0, streak:0,
      lastWorkoutDate:null, badges:[],
      apiKey:'', mistralModel:'mistral-large-latest'
    },
    workouts: [],
    workout_templates: [],
    exercises_library: defaultExercises(),
    custom_sports: [],
    plans: [],
    runs: [],
    swims: [],
    combats: [],
    recovery: [],
    nutrition: [],
    steps: [],
  };
}

let state = (() => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const loaded = raw ? JSON.parse(raw) : defaultState();
    const def = defaultState();
    for (const k of Object.keys(def)) {
      if (!(k in loaded)) loaded[k] = def[k];
    }
    return loaded;
  } catch { return defaultState(); }
})();

async function saveState() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(state)); } catch {}
  const sb = getSB();
  if (!sb) return;
  try {
    await sb.from('fitcoach_state').upsert(
      { id: 'default', data: state, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  } catch (e) { console.warn('Supabase sync failed:', e.message); }
}

async function loadFromSupabase() {
  const sb = getSB();
  if (!sb) return false;
  try {
    const { data, error } = await sb.from('fitcoach_state').select('data').eq('id','default').single();
    if (error || !data) return false;
    const remote = data.data;
    if (!remote) return false;
    const def = defaultState();
    for (const k of Object.keys(def)) { if (!(k in remote)) remote[k] = def[k]; }
    Object.assign(state, remote);
    localStorage.setItem(DB_KEY, JSON.stringify(state));
    return true;
  } catch (e) { console.warn('Supabase load failed:', e.message); return false; }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function formatDate(d = new Date()) { return d.toISOString().split('T')[0]; }
function today() { return formatDate(new Date()); }
function timeStr(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function calcBMR(p) {
  return Math.round(10*(p.weight||75) + 6.25*(p.height||178) - 5*(p.age||25) + 5);
}
function calcTDEE(p) {
  const f = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
  return Math.round(calcBMR(p) * (f[p.activity||'moderate']));
}
function calcVolume(sets) {
  return (sets||[]).reduce((s,x) => s + (parseFloat(x.weight)||0)*(parseInt(x.reps)||0), 0);
}
function formatPace(pace) {
  if (!pace || isNaN(pace)) return '—';
  const min = Math.floor(pace), sec = Math.round((pace-min)*60);
  return `${min}:${String(sec).padStart(2,'0')} /km`;
}
function estimateVO2Max(runs) {
  if (!runs.length) return null;
  const avg = runs.slice(-5).reduce((s,r) => s+(r.pace||0),0) / Math.min(runs.length,5);
  return avg ? Math.round((60/avg)*3.5) : null;
}
function weeklyVolume() {
  const wAgo = formatDate(new Date(Date.now()-7*86400000));
  const vol = {};
  state.workouts.filter(w => w.date >= wAgo).forEach(w => {
    (w.exercises||[]).forEach(ex => {
      const m = ex.muscle||'Autre';
      vol[m] = (vol[m]||0) + calcVolume(ex.sets||[]);
    });
  });
  return vol;
}
function getLast7Days() {
  return Array.from({length:7},(_,i) => formatDate(new Date(Date.now()-(6-i)*86400000)));
}
function formatDateFr(str) {
  if (!str) return '';
  const d = new Date(str+'T12:00:00');
  const m = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
function monthShort(str) {
  const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  return m[new Date(str+'T12:00:00').getMonth()];
}

const XP_THRESHOLDS = [0,100,250,500,900,1400,2100,3000,4200,6000];
function getLevel(xp) {
  let lvl=1;
  for(let i=XP_THRESHOLDS.length-1;i>=0;i--){ if(xp>=XP_THRESHOLDS[i]){lvl=i+1;break;} }
  return lvl;
}
function addXP(amount) {
  const old = getLevel(state.profile.xp);
  state.profile.xp += amount;
  state.profile.level = getLevel(state.profile.xp);
  if(state.profile.level > old) showToast(`🎉 Niveau ${state.profile.level} atteint !`,'pr');
}
function updateStreak() {
  const last = state.profile.lastWorkoutDate, tod = today();
  const yest = formatDate(new Date(Date.now()-86400000));
  if(last===yest) state.profile.streak++;
  else if(last!==tod) state.profile.streak=1;
  state.profile.lastWorkoutDate = tod;
}

const ACHIEVEMENTS = [
  {id:'first_workout',   icon:'🏋️',label:'Premier pas',  desc:'Première séance'},
  {id:'streak_7',        icon:'🔥',label:'7 jours',       desc:'7 jours consécutifs'},
  {id:'streak_30',       icon:'⚡',label:'30 jours',      desc:'30 jours de streak'},
  {id:'pr_hunter',       icon:'🏆',label:'PR Hunter',     desc:'Premier record battu'},
  {id:'run_10k',         icon:'🏃',label:'10K Club',      desc:'Course de 10 km'},
  {id:'level_5',         icon:'⭐',label:'Niveau 5',      desc:'Atteindre niveau 5'},
  {id:'hundred_sessions',icon:'💯',label:'Centenaire',    desc:'100 séances'},
  {id:'combat_10',       icon:'🥊',label:'Combattant',    desc:'10 séances combat'},
  {id:'nutrition_week',  icon:'🥗',label:'Nutritioniste', desc:'7 jours nutrition'},
  {id:'swimmer',         icon:'🏊',label:'Nageur',        desc:'Première piscine'},
  {id:'steps_10k',       icon:'👟',label:'10 000 pas',    desc:'10 000 pas en un jour'},
];
function unlockAchievement(id) {
  if(!state.profile.badges.includes(id)){
    state.profile.badges.push(id);
    const a=ACHIEVEMENTS.find(x=>x.id===id);
    if(a) showToast(`${a.icon} Badge : ${a.label}`,'pr');
  }
}
function checkAchievements() {
  const t=state.workouts.length, s=state.profile.streak;
  if(t>=1) unlockAchievement('first_workout');
  if(s>=7) unlockAchievement('streak_7');
  if(s>=30) unlockAchievement('streak_30');
  if(state.profile.level>=5) unlockAchievement('level_5');
  if(t>=100) unlockAchievement('hundred_sessions');
  if(state.combats.length>=10) unlockAchievement('combat_10');
  if(state.nutrition.length>=7) unlockAchievement('nutrition_week');
  if(state.runs.some(r=>r.distance>=10)) unlockAchievement('run_10k');
  if((state.swims||[]).length>=1) unlockAchievement('swimmer');
  if((state.steps||[]).some(s=>s.steps>=10000)) unlockAchievement('steps_10k');
}
function checkPR(exerciseId, weight, reps) {
  const history = state.workouts.flatMap(w=>w.exercises||[])
    .filter(e=>e.exerciseId===exerciseId).flatMap(e=>e.sets||[]);
  const maxW = Math.max(0,...history.map(s=>parseFloat(s.weight)||0));
  const maxV = Math.max(0,...history.map(s=>(parseFloat(s.weight)||0)*(parseInt(s.reps)||0)));
  return weight>maxW || (weight*reps)>maxV;
}

const MUSCLE_COLORS = {
  'Pectoraux':'#ff4d1c','Dos':'#00e5ff','Épaules':'#ffd166',
  'Biceps':'#06d6a0','Triceps':'#9b5de5','Quadriceps':'#f72585',
  'Ischio-jambiers':'#4cc9f0','Mollets':'#7209b7',
  'Abdominaux':'#3a86ff','Fessiers':'#fb5607',
};
