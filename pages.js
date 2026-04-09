// ============================================================
// FITCOACH PRO - Page Renderers
// ============================================================

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  const p = state.profile;
  const totalW = state.workouts.length;
  const totalR = state.runs.length;
  const totalC = state.combats.length;
  const xpForNext = XP_THRESHOLDS[Math.min(p.level, XP_THRESHOLDS.length - 1)] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const xpProgress = XP_THRESHOLDS[p.level - 1] || 0;
  const xpPct = xpForNext > xpProgress ? Math.round(((p.xp - xpProgress) / (xpForNext - xpProgress)) * 100) : 100;

  // XP Bar
  set('dash-xp-bar', style => { style.width = xpPct + '%'; }, true);
  setText('dash-xp-label', `Niveau ${p.level} — ${p.xp} XP`);
  setText('dash-xp-next', `${xpForNext} XP`);

  // Stats
  setText('dash-streak', p.streak);
  setText('dash-total-workouts', totalW);
  setText('dash-total-runs', totalR);
  setText('dash-total-combat', totalC);

  // Weekly summary
  const weekAgo = formatDate(new Date(Date.now() - 7 * 86400000));
  const weekW = state.workouts.filter(w => w.date >= weekAgo).length;
  const weekR = state.runs.filter(r => r.date >= weekAgo).length;
  const weekC = state.combats.filter(c => c.date >= weekAgo).length;
  setText('dash-week-sessions', weekW + weekR + weekC);

  // Recent workouts
  const recent = [...state.workouts, ...state.runs, ...state.combats]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const el = document.getElementById('dash-recent');
  if (el) {
    el.innerHTML = recent.length ? recent.map(w => `
      <div class="exercise-entry" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px">
        <div>
          <div style="font-weight:600;font-size:13px">${w.title || w.type || 'Séance'} ${typeIcon(w)}</div>
          <div class="text-muted text-sm">${formatDateFr(w.date)}</div>
        </div>
        <div class="text-right">
          ${w.duration ? `<div class="text-sm text-mono">${w.duration} min</div>` : ''}
          ${w.distance ? `<div class="text-sm text-neon">${w.distance} km</div>` : ''}
        </div>
      </div>
    `).join('') : '<div class="text-muted text-sm" style="padding:16px">Aucune séance récente</div>';
  }

  // Upcoming
  const upcoming = state.plans
    .filter(pl => pl.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const upEl = document.getElementById('dash-upcoming');
  if (upEl) {
    upEl.innerHTML = upcoming.length ? upcoming.map(pl => `
      <div class="exercise-entry" style="display:flex;align-items:center;gap:12px;padding:10px 14px">
        <div style="text-align:center;min-width:40px">
          <div class="text-fire text-display" style="font-size:20px">${new Date(pl.date + 'T12:00:00').getDate()}</div>
          <div class="text-muted text-sm">${monthShort(pl.date)}</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13px">${pl.title}</div>
          <div class="text-muted text-sm">${pl.type}</div>
        </div>
      </div>
    `).join('') : '<div class="text-muted text-sm" style="padding:16px">Aucune séance planifiée</div>';
  }

  // Volume chart - last 7 days
  const days7 = getLast7Days();
  const volData = days7.map(d => {
    const dw = state.workouts.filter(w => w.date === d);
    return dw.reduce((s, w) => s + (w.exercises || []).reduce((ss, ex) => ss + calcVolume(ex.sets || []), 0), 0);
  });

  createBarChart('dash-volume-chart', days7.map(d => d.slice(5).replace('-', '/')), [{
    label: 'Volume (kg)',
    data: volData,
    backgroundColor: 'rgba(255,77,28,0.6)',
    borderColor: 'rgba(255,77,28,1)',
    borderWidth: 1,
    borderRadius: 4
  }]);
}

function typeIcon(w) {
  if (w.distance) return '🏃';
  if (w.sport) return '🥊';
  return '🏋️';
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return formatDate(d);
  });
}

function formatDateFr(str) {
  if (!str) return '';
  const d = new Date(str + 'T12:00:00');
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function monthShort(str) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[new Date(str + 'T12:00:00').getMonth()];
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function set(id, fn, isEl = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isEl) fn(el.style);
  else fn(el);
}

// ═══════════════════════════════════════════════════════════
// WORKOUT / MUSCULATION
// ═══════════════════════════════════════════════════════════

let currentWorkout = null; // Active workout being logged

function startNewWorkout() {
  currentWorkout = {
    id: generateId(),
    date: today(),
    title: 'Séance musculation',
    type: 'musculation',
    startTime: Date.now(),
    exercises: [],
    notes: ''
  };
  renderActiveWorkout();
  openModal('modal-workout');
}

function renderActiveWorkout() {
  const container = document.getElementById('active-workout-exercises');
  if (!container || !currentWorkout) return;

  container.innerHTML = currentWorkout.exercises.map((ex, ei) => `
    <div class="exercise-entry" id="ex-block-${ei}">
      <div class="exercise-name">
        <span>${ex.name}</span>
        <span class="badge badge-fire text-sm">${ex.muscle}</span>
        <button onclick="removeExercise(${ei})" style="margin-left:auto;color:var(--text-2);font-size:16px">×</button>
      </div>
      <div style="display:grid;grid-template-columns:40px 1fr 1fr 1fr 1fr;gap:6px;margin-bottom:6px">
        <span class="text-muted text-sm" style="text-align:center">Série</span>
        <span class="text-muted text-sm" style="text-align:center">Reps</span>
        <span class="text-muted text-sm" style="text-align:center">Poids (kg)</span>
        <span class="text-muted text-sm" style="text-align:center">Repos (s)</span>
        <span></span>
      </div>
      ${(ex.sets || []).map((set, si) => `
        <div class="set-row" style="grid-template-columns:40px 1fr 1fr 1fr 1fr">
          <label>${si + 1}</label>
          <input class="set-input" type="number" placeholder="Reps" value="${set.reps || ''}"
            onchange="updateSet(${ei}, ${si}, 'reps', this.value)" min="0">
          <input class="set-input" type="number" placeholder="kg" value="${set.weight || ''}"
            onchange="updateSet(${ei}, ${si}, 'weight', this.value)" min="0" step="0.5">
          <input class="set-input" type="number" placeholder="s" value="${set.rest || 90}"
            onchange="updateSet(${ei}, ${si}, 'rest', this.value)" min="0">
          <button onclick="removeSet(${ei}, ${si})" style="color:var(--text-3);font-size:16px;width:100%;text-align:center">×</button>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-sm mt-8" onclick="addSet(${ei})">+ Série</button>
    </div>
  `).join('');
}

function addExerciseToWorkout(exerciseId) {
  if (!currentWorkout) return;
  const lib = state.exercises_library.find(e => e.id === exerciseId);
  if (!lib) return;
  currentWorkout.exercises.push({
    exerciseId,
    name: lib.name,
    muscle: lib.muscle,
    sets: [{ reps: '', weight: '', rest: 90 }]
  });
  renderActiveWorkout();
}

function addSet(exerciseIndex) {
  if (!currentWorkout) return;
  const ex = currentWorkout.exercises[exerciseIndex];
  if (!ex) return;
  const lastSet = ex.sets[ex.sets.length - 1] || {};
  ex.sets.push({ reps: lastSet.reps || '', weight: lastSet.weight || '', rest: lastSet.rest || 90 });
  renderActiveWorkout();
}

function removeSet(exerciseIndex, setIndex) {
  if (!currentWorkout) return;
  currentWorkout.exercises[exerciseIndex]?.sets.splice(setIndex, 1);
  renderActiveWorkout();
}

function removeExercise(index) {
  if (!currentWorkout) return;
  currentWorkout.exercises.splice(index, 1);
  renderActiveWorkout();
}

function updateSet(ei, si, field, value) {
  if (!currentWorkout) return;
  if (currentWorkout.exercises[ei]?.sets[si]) {
    currentWorkout.exercises[ei].sets[si][field] = value;
  }
}

function finishWorkout() {
  if (!currentWorkout || !currentWorkout.exercises.length) {
    showToast('⚠️ Ajoutez au moins un exercice', 'error');
    return;
  }
  currentWorkout.duration = Math.round((Date.now() - currentWorkout.startTime) / 60000);
  currentWorkout.totalVolume = currentWorkout.exercises.reduce((s, ex) => s + calcVolume(ex.sets), 0);

  // Check PRs
  let prCount = 0;
  currentWorkout.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (set.weight && set.reps) {
        const isPR = checkPR(ex.exerciseId, parseFloat(set.weight), parseInt(set.reps));
        if (isPR) { set.isPR = true; prCount++; }
      }
    });
  });

  state.workouts.push(currentWorkout);
  addXP(30 + currentWorkout.exercises.length * 5);
  updateStreak();
  checkAchievements();
  if (prCount > 0) {
    unlockAchievement('pr_hunter');
    showToast(`🏆 ${prCount} nouveau(x) record(s) !`, 'pr');
  }
  saveState();
  currentWorkout = null;
  closeModal('modal-workout');
  showToast('✅ Séance enregistrée !', 'success');
  renderWorkoutHistory();
}

function renderWorkoutHistory() {
  const el = document.getElementById('workout-history-list');
  if (!el) return;
  const sorted = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  el.innerHTML = sorted.length ? sorted.map(w => `
    <div class="exercise-entry" style="cursor:pointer" onclick="showWorkoutDetail('${w.id}')">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <div style="font-weight:600">${w.title || 'Séance'}</div>
          <div class="text-muted text-sm">${formatDateFr(w.date)} · ${w.duration || '?'} min</div>
        </div>
        <div style="text-align:right">
          <div class="text-fire text-mono">${Math.round(w.totalVolume || 0).toLocaleString()} kg</div>
          <div class="text-muted text-sm">${w.exercises?.length || 0} exercices</div>
        </div>
      </div>
    </div>
  `).join('') : '<div class="text-muted" style="padding:24px;text-align:center">Aucune séance enregistrée</div>';
}

function showWorkoutDetail(id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;
  const el = document.getElementById('workout-detail-content');
  if (el) {
    el.innerHTML = `
      <div class="mb-16">
        <div class="section-title">${w.title}</div>
        <div class="text-muted text-sm">${formatDateFr(w.date)} · ${w.duration} min · ${Math.round(w.totalVolume).toLocaleString()} kg volume total</div>
      </div>
      ${(w.exercises || []).map(ex => `
        <div class="exercise-entry mb-8">
          <div class="exercise-name">${ex.name} <span class="badge badge-fire">${ex.muscle}</span></div>
          ${(ex.sets || []).map((s, i) => `
            <div style="display:flex;gap:16px;font-size:12px;padding:4px 0;color:var(--text-1)">
              <span>Série ${i + 1}</span>
              <span>${s.reps} reps</span>
              <span>${s.weight} kg</span>
              <span>Repos: ${s.rest}s</span>
              ${s.isPR ? '<span class="badge badge-gold">PR 🏆</span>' : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  }
  openModal('modal-workout-detail');
}

// Populate exercise selector
function renderExerciseSelector() {
  const groups = {};
  state.exercises_library.forEach(ex => {
    if (!groups[ex.muscle]) groups[ex.muscle] = [];
    groups[ex.muscle].push(ex);
  });

  const el = document.getElementById('exercise-selector-list');
  if (!el) return;
  el.innerHTML = Object.entries(groups).map(([muscle, exs]) => `
    <div class="mb-12">
      <div class="text-muted text-sm mb-8" style="letter-spacing:1px;text-transform:uppercase">${muscle}</div>
      ${exs.map(ex => `
        <div class="exercise-entry" style="cursor:pointer;padding:8px 12px;margin-bottom:4px" onclick="addExerciseToWorkout('${ex.id}');closeModal('modal-add-exercise')">
          <div style="font-weight:500;font-size:13px">${ex.name}</div>
          <div class="text-muted text-sm">${ex.type}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// ── AI Generate Workout ──
async function generateAIWorkout() {
  const type = document.getElementById('ai-workout-type')?.value || 'hypertrophie';
  const duration = parseInt(document.getElementById('ai-workout-duration')?.value) || 60;

  const btn = document.getElementById('btn-generate-ai');
  if (btn) { btn.innerHTML = '<span class="spinner"></span> Génération...'; btn.disabled = true; }

  const result = await AI.generateWorkout(type, [], duration);

  if (btn) { btn.textContent = '🤖 Générer avec IA'; btn.disabled = false; }

  if (result && result.exercises) {
    if (!currentWorkout) startNewWorkout();
    result.exercises.forEach(ex => {
      const found = state.exercises_library.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
      currentWorkout.exercises.push({
        exerciseId: found?.id || generateId(),
        name: ex.name,
        muscle: ex.muscle || 'Général',
        sets: Array.from({ length: ex.sets }, () => ({ reps: ex.reps || '8-10', weight: '', rest: ex.rest || 90 }))
      });
    });
    currentWorkout.title = result.title || `Séance ${type}`;
    setText('active-workout-title', currentWorkout.title);
    renderActiveWorkout();
    closeModal('modal-ai-generate');
    showToast('🤖 Séance générée par l\'IA !', 'info');
  } else {
    showToast('❌ Erreur de génération. Vérifiez votre clé API.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// RUNNING
// ═══════════════════════════════════════════════════════════

function saveRun() {
  const type = document.getElementById('run-type')?.value;
  const distance = parseFloat(document.getElementById('run-distance')?.value);
  const timeMin = parseInt(document.getElementById('run-time-min')?.value) || 0;
  const timeSec = parseInt(document.getElementById('run-time-sec')?.value) || 0;
  const date = document.getElementById('run-date')?.value || today();
  const notes = document.getElementById('run-notes')?.value || '';

  if (!distance || (!timeMin && !timeSec)) {
    showToast('⚠️ Distance et temps requis', 'error'); return;
  }

  const totalMinutes = timeMin + timeSec / 60;
  const pace = totalMinutes / distance;

  const run = {
    id: generateId(), date, type, distance,
    duration: Math.round(totalMinutes),
    pace: Math.round(pace * 100) / 100,
    notes, time: `${String(timeMin).padStart(2,'0')}:${String(timeSec).padStart(2,'0')}`
  };

  state.runs.push(run);
  addXP(Math.round(distance * 5));
  updateStreak();
  checkAchievements();
  saveState();
  closeModal('modal-run');
  showToast('🏃 Course enregistrée !', 'success');
  renderRunHistory();
}

function renderRunHistory() {
  const el = document.getElementById('run-history-list');
  if (!el) return;
  const sorted = [...state.runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  el.innerHTML = sorted.length ? sorted.map(r => `
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600">${r.type || 'Course'}</div>
        <div class="text-muted text-sm">${formatDateFr(r.date)}</div>
      </div>
      <div style="display:flex;gap:20px;align-items:center">
        <div style="text-align:center">
          <div class="text-neon text-mono">${r.distance} km</div>
          <div class="text-muted text-sm">Distance</div>
        </div>
        <div style="text-align:center">
          <div class="text-mono">${r.time || '-'}</div>
          <div class="text-muted text-sm">Temps</div>
        </div>
        <div style="text-align:center">
          <div class="text-gold text-mono">${formatPace(r.pace)}</div>
          <div class="text-muted text-sm">Allure</div>
        </div>
      </div>
    </div>
  `).join('') : '<div class="text-muted" style="padding:24px;text-align:center">Aucune course enregistrée</div>';

  // Stats
  const vo2 = estimateVO2Max(state.runs);
  setText('run-vo2max', vo2 ? `~${vo2} ml/kg/min` : 'N/A');
  const totalDist = state.runs.reduce((s, r) => s + (r.distance || 0), 0);
  setText('run-total-dist', totalDist.toFixed(1) + ' km');
  const avgPace = state.runs.length ? state.runs.reduce((s, r) => s + (r.pace || 0), 0) / state.runs.length : 0;
  setText('run-avg-pace', avgPace ? formatPace(avgPace) : 'N/A');
}

// ═══════════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════════

function saveCombat() {
  const sport = document.getElementById('combat-sport')?.value;
  const type = document.getElementById('combat-type')?.value;
  const intensity = parseInt(document.getElementById('combat-intensity')?.value) || 5;
  const duration = parseInt(document.getElementById('combat-duration')?.value);
  const date = document.getElementById('combat-date')?.value || today();
  const notes = document.getElementById('combat-notes')?.value || '';

  if (!duration) { showToast('⚠️ Durée requise', 'error'); return; }

  // Estimate calories
  const metValues = { technique: 5, sparring: 9, cardio: 8, mixte: 7 };
  const met = metValues[type] || 7;
  const calories = Math.round(met * (state.profile.weight || 75) * (duration / 60) * (intensity / 5));

  const session = { id: generateId(), date, sport, type, intensity, duration, calories, notes };
  state.combats.push(session);
  addXP(20 + Math.round(duration / 5));
  updateStreak();
  checkAchievements();
  saveState();
  closeModal('modal-combat');
  showToast('🥊 Séance combat enregistrée !', 'success');
  renderCombatHistory();
}

function renderCombatHistory() {
  const el = document.getElementById('combat-history-list');
  if (!el) return;
  const sorted = [...state.combats].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  el.innerHTML = sorted.length ? sorted.map(c => `
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600">${c.sport || 'Combat'} — ${c.type}</div>
        <div class="text-muted text-sm">${formatDateFr(c.date)}</div>
      </div>
      <div style="display:flex;gap:20px;text-align:center">
        <div><div class="text-fire text-mono">${c.duration} min</div><div class="text-muted text-sm">Durée</div></div>
        <div><div class="text-gold">${c.intensity}/10</div><div class="text-muted text-sm">Intensité</div></div>
        <div><div class="text-green text-mono">~${c.calories || '?'}</div><div class="text-muted text-sm">kcal</div></div>
      </div>
    </div>
  `).join('') : '<div class="text-muted" style="padding:24px;text-align:center">Aucune séance combat enregistrée</div>';
}

// ═══════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════

function renderAnalysis() {
  // Volume over last 30 days
  const last30 = Array.from({ length: 30 }, (_, i) => {
    return formatDate(new Date(Date.now() - (29 - i) * 86400000));
  });

  const volData = last30.map(d => {
    const dw = state.workouts.filter(w => w.date === d);
    return dw.reduce((s, w) => s + (w.exercises || []).reduce((ss, ex) => ss + calcVolume(ex.sets || []), 0), 0);
  });

  createBarChart('analysis-volume-chart', last30.map(d => d.slice(5).replace('-', '/')), [{
    label: 'Volume hebdomadaire (kg)',
    data: volData,
    backgroundColor: 'rgba(255,77,28,0.5)',
    borderColor: '#ff4d1c',
    borderRadius: 3,
    borderWidth: 1
  }]);

  // Running progression
  const runs = [...state.runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  if (runs.length >= 2) {
    createLineChart('analysis-run-chart',
      runs.map(r => r.date.slice(5).replace('-', '/')),
      [{
        label: 'Allure (min/km)',
        data: runs.map(r => r.pace || 0),
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0,229,255,0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00e5ff'
      }]
    );
  }

  // Muscle frequency donut
  const vol = weeklyVolume();
  const muscles = Object.keys(vol);
  const vols = muscles.map(m => vol[m]);
  const colors = muscles.map(m => MUSCLE_COLORS[m] || '#666');

  if (muscles.length) {
    createDoughnutChart('analysis-muscle-chart', muscles, vols, colors);
  }

  // Best lifts
  const bestLifts = {};
  state.workouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      (ex.sets || []).forEach(s => {
        const w2 = parseFloat(s.weight) || 0;
        if (!bestLifts[ex.name] || w2 > bestLifts[ex.name]) bestLifts[ex.name] = w2;
      });
    });
  });

  const prEl = document.getElementById('analysis-prs');
  if (prEl) {
    const top = Object.entries(bestLifts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    prEl.innerHTML = top.length ? top.map(([name, weight]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:13px">${name}</span>
        <span class="text-gold text-mono text-display" style="font-size:18px">${weight} kg</span>
      </div>
    `).join('') : '<div class="text-muted text-sm">Aucun record enregistré</div>';
  }

  // Auto weekly summary stats
  const wAgo = formatDate(new Date(Date.now() - 7 * 86400000));
  const weekW = state.workouts.filter(w => w.date >= wAgo);
  const weekR = state.runs.filter(r => r.date >= wAgo);
  const weekC = state.combats.filter(c => c.date >= wAgo);
  const totalWeekSessions = weekW.length + weekR.length + weekC.length;
  const totalWeekDist = weekR.reduce((s, r) => s + (r.distance || 0), 0);
  const totalWeekVol = weekW.reduce((s, w) => s + (w.totalVolume || 0), 0);

  setText('week-sessions', totalWeekSessions);
  setText('week-distance', totalWeekDist.toFixed(1) + ' km');
  setText('week-volume', Math.round(totalWeekVol).toLocaleString() + ' kg');
}

async function getAIAnalysis() {
  const btn = document.getElementById('btn-ai-analysis');
  if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }

  const summary = await AI.weeklySummary();

  if (btn) { btn.textContent = '🤖 Analyse IA'; btn.disabled = false; }

  const el = document.getElementById('ai-analysis-result');
  if (el) {
    el.textContent = summary;
    el.parentElement.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════
// RECOVERY
// ═══════════════════════════════════════════════════════════

function saveRecovery() {
  const sleep = parseInt(document.getElementById('recovery-sleep')?.value) || 5;
  const fatigue = parseInt(document.getElementById('recovery-fatigue')?.value) || 5;
  const pain = document.getElementById('recovery-pain')?.value || '';
  const date = today();

  // Avoid duplicate today
  const existing = state.recovery.findIndex(r => r.date === date);
  const entry = { id: generateId(), date, sleep, fatigue, pain };

  if (existing >= 0) state.recovery[existing] = entry;
  else state.recovery.push(entry);

  saveState();
  renderRecovery();
  showToast('😴 Récupération enregistrée', 'success');
}

function renderRecovery() {
  const el = document.getElementById('recovery-history');
  if (!el) return;
  const sorted = [...state.recovery].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  el.innerHTML = sorted.map(r => {
    const sleepColor = r.sleep >= 7 ? 'var(--accent-green)' : r.sleep >= 5 ? 'var(--accent-gold)' : 'var(--accent-fire)';
    const fatigueColor = r.fatigue <= 4 ? 'var(--accent-green)' : r.fatigue <= 6 ? 'var(--accent-gold)' : 'var(--accent-fire)';
    return `
      <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:13px">${formatDateFr(r.date)}</div>
          ${r.pain ? `<div class="text-muted text-sm">💢 ${r.pain}</div>` : ''}
        </div>
        <div style="display:flex;gap:16px;text-align:center">
          <div><div style="color:${sleepColor};font-weight:600">${r.sleep}/10</div><div class="text-muted text-sm">Sommeil</div></div>
          <div><div style="color:${fatigueColor};font-weight:600">${r.fatigue}/10</div><div class="text-muted text-sm">Fatigue</div></div>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-muted" style="padding:24px;text-align:center">Aucune donnée</div>';

  // Charts
  if (sorted.length >= 2) {
    const rev = [...sorted].reverse();
    createLineChart('recovery-chart',
      rev.map(r => r.date.slice(5).replace('-', '/')),
      [
        { label: 'Sommeil', data: rev.map(r => r.sleep), borderColor: '#00e5ff', tension: 0.4, fill: false },
        { label: 'Fatigue', data: rev.map(r => r.fatigue), borderColor: '#ff4d1c', tension: 0.4, fill: false }
      ]
    );
  }
}

async function getRecoveryAdvice() {
  const sleep = parseInt(document.getElementById('recovery-sleep')?.value) || 5;
  const fatigue = parseInt(document.getElementById('recovery-fatigue')?.value) || 5;
  const btn = document.getElementById('btn-recovery-advice');
  if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }

  const advice = await AI.recoveryAdvice(sleep, fatigue);

  if (btn) { btn.textContent = '🤖 Conseil IA'; btn.disabled = false; }
  const el = document.getElementById('recovery-ai-result');
  if (el) { el.textContent = advice; el.parentElement.style.display = 'block'; }
}

// ═══════════════════════════════════════════════════════════
// NUTRITION
// ═══════════════════════════════════════════════════════════

function renderNutrition() {
  const p = state.profile;
  const bmr = calcBMR(p);
  const tdee = calcTDEE(p);

  setText('nutr-bmr', bmr.toLocaleString());
  setText('nutr-tdee', tdee.toLocaleString());

  // Macros based on goal
  let protein, carbs, fat, calories;
  if (p.goal === 'muscle') {
    calories = tdee + 300;
    protein = Math.round(p.weight * 2);
    fat = Math.round(calories * 0.25 / 9);
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  } else if (p.goal === 'loss') {
    calories = tdee - 400;
    protein = Math.round(p.weight * 2.2);
    fat = Math.round(calories * 0.3 / 9);
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  } else {
    calories = tdee;
    protein = Math.round(p.weight * 1.8);
    fat = Math.round(calories * 0.3 / 9);
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  }

  setText('nutr-calories', calories.toLocaleString());
  setText('nutr-protein', protein + 'g');
  setText('nutr-carbs', carbs + 'g');
  setText('nutr-fat', fat + 'g');

  // Macro donut
  createDoughnutChart('nutr-macro-chart',
    ['Protéines', 'Glucides', 'Lipides'],
    [protein * 4, carbs * 4, fat * 9],
    ['#06d6a0', '#00e5ff', '#ffd166']
  );

  // Daily log
  const todayLog = state.nutrition.find(n => n.date === today());
  if (todayLog) {
    const pct = Math.min(100, Math.round((todayLog.calories / calories) * 100));
    set('nutr-today-pct', el => { el.style.width = pct + '%'; }, true);
    setText('nutr-today-calories', todayLog.calories);
  }
}

function saveNutritionLog() {
  const calories = parseInt(document.getElementById('nutr-log-calories')?.value);
  const protein = parseInt(document.getElementById('nutr-log-protein')?.value) || 0;
  const carbs = parseInt(document.getElementById('nutr-log-carbs')?.value) || 0;
  const fat = parseInt(document.getElementById('nutr-log-fat')?.value) || 0;
  if (!calories) { showToast('⚠️ Calories requises', 'error'); return; }

  const existing = state.nutrition.findIndex(n => n.date === today());
  const entry = { date: today(), calories, protein, carbs, fat };
  if (existing >= 0) state.nutrition[existing] = entry;
  else state.nutrition.push(entry);

  saveState();
  checkAchievements();
  closeModal('modal-nutrition-log');
  renderNutrition();
  showToast('🥗 Repas enregistré', 'success');
}

async function getNutritionAdvice() {
  const btn = document.getElementById('btn-nutr-advice');
  if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
  const advice = await AI.nutritionAdvice();
  if (btn) { btn.textContent = '🤖 Recommandations IA'; btn.disabled = false; }
  const el = document.getElementById('nutr-ai-result');
  if (el) { el.textContent = advice; el.parentElement.style.display = 'block'; }
}

// ═══════════════════════════════════════════════════════════
// GAMIFICATION
// ═══════════════════════════════════════════════════════════

function renderGamification() {
  const p = state.profile;
  setText('gami-streak', p.streak);
  setText('gami-xp', p.xp.toLocaleString());
  setText('gami-level', p.level);
  setText('gami-total-workouts', state.workouts.length + state.runs.length + state.combats.length);

  const el = document.getElementById('badges-grid');
  if (el) {
    el.innerHTML = ACHIEVEMENTS.map(a => {
      const unlocked = p.badges.includes(a.id);
      return `
        <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
          <span style="font-size:28px">${a.icon}</span>
          <span>${a.label}</span>
          ${unlocked ? '<span style="color:var(--accent-gold);font-size:10px">✓</span>' : '<span style="font-size:10px">🔒</span>'}
        </div>
      `;
    }).join('');
  }

  // XP progress
  const xpCurrent = XP_THRESHOLDS[p.level - 1] || 0;
  const xpNext = XP_THRESHOLDS[Math.min(p.level, XP_THRESHOLDS.length - 1)] || 9999;
  const pct = xpNext > xpCurrent ? Math.round(((p.xp - xpCurrent) / (xpNext - xpCurrent)) * 100) : 100;
  const barEl = document.getElementById('gami-xp-bar');
  if (barEl) barEl.style.width = pct + '%';
  setText('gami-xp-next', `${p.xp} / ${xpNext} XP`);
}

// ═══════════════════════════════════════════════════════════
// PLANNING / CALENDAR
// ═══════════════════════════════════════════════════════════

let calendarDate = new Date();

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  setText('cal-month-label', `${months[month]} ${year}`);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const tod = today();

  let html = '';
  // Day headers
  ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].forEach(d => {
    html += `<div class="cal-header">${d}</div>`;
  });

  // Prev month padding
  for (let i = 0; i < firstDay; i++) {
    const day = daysInPrev - firstDay + i + 1;
    html += `<div class="cal-day other-month"><span>${day}</span></div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === tod;
    const hasPlan = state.plans.some(p => p.date === dateStr);
    const hasWorkout = state.workouts.some(w => w.date === dateStr) ||
                       state.runs.some(r => r.date === dateStr) ||
                       state.combats.some(c => c.date === dateStr);

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${hasPlan || hasWorkout ? 'has-workout' : ''}"
           onclick="calDayClick('${dateStr}')">
        <span>${d}</span>
        ${hasPlan ? '<span style="font-size:8px;color:var(--accent-neon)">●</span>' : ''}
      </div>
    `;
  }

  // Fill remaining
  const total = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month"><span>${d}</span></div>`;
  }

  grid.innerHTML = html;

  renderPlanList();
}

function calDayClick(dateStr) {
  document.getElementById('plan-date').value = dateStr;
  openModal('modal-add-plan');
}

function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}

function savePlan() {
  const date = document.getElementById('plan-date')?.value;
  const title = document.getElementById('plan-title')?.value;
  const type = document.getElementById('plan-type')?.value;
  const notes = document.getElementById('plan-notes')?.value || '';

  if (!date || !title) { showToast('⚠️ Date et titre requis', 'error'); return; }

  state.plans.push({ id: generateId(), date, title, type, notes });
  saveState();
  closeModal('modal-add-plan');
  renderCalendar();
  showToast('📅 Séance planifiée', 'success');
}

function renderPlanList() {
  const el = document.getElementById('plan-list');
  if (!el) return;
  const upcoming = state.plans
    .filter(p => p.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  el.innerHTML = upcoming.length ? upcoming.map(p => `
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600;font-size:13px">${p.title}</div>
        <div class="text-muted text-sm">${formatDateFr(p.date)} · ${p.type}</div>
        ${p.notes ? `<div class="text-muted text-sm">${p.notes}</div>` : ''}
      </div>
      <button onclick="deletePlan('${p.id}')" class="btn btn-ghost btn-sm" style="color:var(--text-3)">×</button>
    </div>
  `).join('') : '<div class="text-muted" style="padding:16px;text-align:center">Aucune séance planifiée</div>';
}

function deletePlan(id) {
  state.plans = state.plans.filter(p => p.id !== id);
  saveState();
  renderCalendar();
}

async function getAIPlanning() {
  const btn = document.getElementById('btn-ai-planning');
  if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
  const advice = await AI.planningAdvice();
  if (btn) { btn.textContent = '🤖 Planning IA'; btn.disabled = false; }
  const el = document.getElementById('planning-ai-result');
  if (el) { el.textContent = advice; el.parentElement.style.display = 'block'; }
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════

function renderSettings() {
  const p = state.profile;
  document.getElementById('set-name').value = p.name || '';
  document.getElementById('set-age').value = p.age || '';
  document.getElementById('set-weight').value = p.weight || '';
  document.getElementById('set-height').value = p.height || '';
  document.getElementById('set-goal').value = p.goal || 'muscle';
  document.getElementById('set-activity').value = p.activity || 'moderate';
  document.getElementById('set-apikey').value = p.apiKey || '';
}

function saveSettings() {
  state.profile.name = document.getElementById('set-name')?.value || 'Athlète';
  state.profile.age = parseInt(document.getElementById('set-age')?.value) || 25;
  state.profile.weight = parseFloat(document.getElementById('set-weight')?.value) || 75;
  state.profile.height = parseFloat(document.getElementById('set-height')?.value) || 178;
  state.profile.goal = document.getElementById('set-goal')?.value || 'muscle';
  state.profile.activity = document.getElementById('set-activity')?.value || 'moderate';
  state.profile.apiKey = document.getElementById('set-apikey')?.value || '';
  saveState();
  showToast('✅ Paramètres sauvegardés', 'success');
  // Update UI
  document.querySelectorAll('.user-name').forEach(el => el.textContent = state.profile.name);
  setText('dash-user-name', state.profile.name);
}

function resetAllData() {
  if (confirm('⚠️ Supprimer TOUTES les données ? Cette action est irréversible.')) {
    localStorage.removeItem(DB_KEY);
    location.reload();
  }
}
