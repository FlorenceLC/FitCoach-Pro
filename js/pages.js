// ============================================================
// FITCOACH PRO v3 - Pages & Logic
// ============================================================

// ── setText / set helpers ──
function setText(id,text){ const e=document.getElementById(id); if(e) e.textContent=text; }
function setVal(id,val){ const e=document.getElementById(id); if(e) e.value=val; }

// ════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════
function renderDashboard() {
  const p = state.profile;
  const xpPrev = XP_THRESHOLDS[p.level-1]||0;
  const xpNext = XP_THRESHOLDS[Math.min(p.level, XP_THRESHOLDS.length-1)]||9999;
  const pct = xpNext>xpPrev ? Math.round(((p.xp-xpPrev)/(xpNext-xpPrev))*100) : 100;
  const bar = document.getElementById('dash-xp-bar');
  if(bar) bar.style.width = Math.min(100,pct)+'%';
  setText('dash-xp-label', `Niveau ${p.level} — ${p.xp} XP`);
  setText('dash-xp-next', `${xpNext} XP`);
  setText('dash-streak', p.streak);
  setText('dash-total-workouts', state.workouts.length);
  setText('dash-total-runs', state.runs.length);
  setText('dash-total-combat', state.combats.length);

  const wAgo = formatDate(new Date(Date.now()-7*86400000));
  setText('dash-week-sessions',
    state.workouts.filter(w=>w.date>=wAgo).length +
    state.runs.filter(r=>r.date>=wAgo).length +
    state.combats.filter(c=>c.date>=wAgo).length +
    (state.swims||[]).filter(s=>s.date>=wAgo).length);

  // Today's steps
  const todaySteps = (state.steps||[]).find(s=>s.date===today());
  setText('dash-steps-today', todaySteps ? todaySteps.steps.toLocaleString() : '—');

  // Recent activity
  const all = [
    ...state.workouts.map(w=>({...w,_type:'workout'})),
    ...state.runs.map(r=>({...r,_type:'run'})),
    ...(state.combats||[]).map(c=>({...c,_type:'combat'})),
    ...(state.swims||[]).map(s=>({...s,_type:'swim'})),
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);

  const el = document.getElementById('dash-recent');
  if(el) el.innerHTML = all.length ? all.map(w=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:13px">${actIcon(w)} ${w.title||w.type||'Séance'}</div>
        <div class="text-muted text-sm">${formatDateFr(w.date)}</div>
      </div>
      <div style="text-align:right">
        ${w.duration?`<div class="text-sm text-mono">${w.duration} min</div>`:''}
        ${w.distance?`<div class="text-sm text-neon">${w.distance} km</div>`:''}
      </div>
    </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px">Aucune séance récente</div>';

  // Upcoming plans
  const upcoming = state.plans.filter(p=>p.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  const upEl = document.getElementById('dash-upcoming');
  if(upEl) upEl.innerHTML = upcoming.length ? upcoming.map(pl=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;min-width:40px">
        <div class="text-fire text-display" style="font-size:20px">${new Date(pl.date+'T12:00:00').getDate()}</div>
        <div class="text-muted text-sm">${monthShort(pl.date)}</div>
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${pl.title}</div>
        <div class="text-muted text-sm">${pl.type}${pl.timeSlot?' · '+pl.timeSlot:''}</div>
      </div>
    </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px">Aucune séance planifiée</div>';

  // Volume chart
  const days7 = getLast7Days();
  const volData = days7.map(d => state.workouts.filter(w=>w.date===d)
    .reduce((s,w)=>s+(w.exercises||[]).reduce((ss,ex)=>ss+calcVolume(ex.sets||[]),0),0));
  createBarChart('dash-volume-chart', days7.map(d=>d.slice(5).replace('-','/')), [{
    label:'Volume (kg)', data:volData,
    backgroundColor:'rgba(255,77,28,0.6)', borderColor:'#ff4d1c',
    borderRadius:4, borderWidth:1
  }]);
}

function actIcon(w) {
  if(w._type==='run'||w.distance) return '🏃';
  if(w._type==='swim') return '🏊';
  if(w._type==='combat'||w.sport) return '🥊';
  return '🏋️';
}

// ════════════════════════════════════════════════
// WORKOUT TEMPLATES (save programs in advance)
// ════════════════════════════════════════════════
function renderWorkoutTemplates() {
  const el = document.getElementById('template-list');
  if(!el) return;
  const tpls = state.workout_templates || [];
  el.innerHTML = tpls.length ? tpls.map(t=>`
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
      <div onclick="loadTemplate('${t.id}')">
        <div style="font-weight:600">${t.title}</div>
        <div class="text-muted text-sm">${t.trainingType||'général'} · ${t.exercises?.length||0} exercices</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" onclick="loadTemplate('${t.id}')">▶ Utiliser</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteTemplate('${t.id}')">🗑</button>
      </div>
    </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px;text-align:center">Aucun programme sauvegardé</div>';
}

function saveCurrentAsTemplate() {
  if(!currentWorkout||!currentWorkout.exercises.length){ showToast('⚠️ Ajoutez des exercices','error'); return; }
  const name = prompt('Nom du programme ?', currentWorkout.title||'Mon programme');
  if(!name) return;
  const tpl = {
    id: generateId(), title: name,
    trainingType: currentWorkout.trainingType||'général',
    exercises: currentWorkout.exercises.map(ex=>({
      exerciseId:ex.exerciseId, name:ex.name, muscle:ex.muscle,
      sets: ex.sets.map(s=>({reps:s.reps, weight:s.weight, rest:s.rest||90}))
    }))
  };
  if(!state.workout_templates) state.workout_templates=[];
  state.workout_templates.push(tpl);
  saveState();
  showToast('💾 Programme sauvegardé !','success');
  renderWorkoutTemplates();
}

function deleteTemplate(id) {
  if(!confirm('Supprimer ce programme ?')) return;
  state.workout_templates = (state.workout_templates||[]).filter(t=>t.id!==id);
  saveState(); renderWorkoutTemplates();
}

function loadTemplate(id) {
  const tpl = (state.workout_templates||[]).find(t=>t.id===id);
  if(!tpl){ showToast('Template introuvable','error'); return; }

  // Start new workout from template; pre-fill with last known weights
  currentWorkout = {
    id: generateId(), date: today(),
    title: tpl.title, trainingType: tpl.trainingType||'général',
    startTime: Date.now(), exercises: [], notes: ''
  };

  tpl.exercises.forEach(tplEx => {
    // Find last used weights for this exercise
    const lastSets = getLastSetsForExercise(tplEx.exerciseId) || tplEx.sets;
    currentWorkout.exercises.push({
      exerciseId: tplEx.exerciseId, name: tplEx.name, muscle: tplEx.muscle,
      sets: lastSets.map(s=>({reps:s.reps||'', weight:s.weight||'', rest:s.rest||90}))
    });
  });

  document.getElementById('active-workout-title').textContent = currentWorkout.title;
  document.getElementById('workout-title-input').value = currentWorkout.title;
  setVal('workout-training-type', currentWorkout.trainingType||'hypertrophie');
  renderActiveWorkout();
  openModal('modal-workout');
  showToast('📋 Programme chargé avec les dernières données','info');
}

function getLastSetsForExercise(exerciseId) {
  // Find the most recent workout that had this exercise
  const sorted = [...state.workouts].sort((a,b)=>b.date.localeCompare(a.date));
  for(const w of sorted){
    const ex = (w.exercises||[]).find(e=>e.exerciseId===exerciseId);
    if(ex && ex.sets?.length) return ex.sets;
  }
  return null;
}

// ════════════════════════════════════════════════
// WORKOUT / ACTIVE SESSION
// ════════════════════════════════════════════════
let currentWorkout = null;

function startNewWorkout() {
  currentWorkout = {
    id:generateId(), date:today(), title:'Séance musculation',
    trainingType:'hypertrophie', startTime:Date.now(), exercises:[], notes:''
  };
  document.getElementById('active-workout-title').textContent = currentWorkout.title;
  document.getElementById('workout-title-input').value = currentWorkout.title;
  setVal('workout-training-type','hypertrophie');
  renderActiveWorkout();
  openModal('modal-workout');
}

function renderActiveWorkout() {
  const container = document.getElementById('active-workout-exercises');
  if(!container||!currentWorkout) return;
  container.innerHTML = currentWorkout.exercises.length ? currentWorkout.exercises.map((ex,ei)=>`
    <div class="exercise-entry" id="ex-block-${ei}">
      <div class="exercise-name" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-weight:600">${ex.name}</span>
        <span class="badge badge-fire">${ex.muscle}</span>
        ${ex.isWOD?'<span class="badge badge-neon">WOD</span>':''}
        <button onclick="removeExercise(${ei})" style="margin-left:auto;color:var(--text-3);font-size:18px;line-height:1">×</button>
      </div>
      <div class="set-headers" style="display:grid;grid-template-columns:36px 1fr 1fr 1fr 28px;gap:5px;margin-bottom:4px;font-size:11px;color:var(--text-2);text-align:center">
        <span>#</span><span>Reps</span><span>Poids kg</span><span>Repos s</span><span></span>
      </div>
      ${(ex.sets||[]).map((s,si)=>`
        <div style="display:grid;grid-template-columns:36px 1fr 1fr 1fr 28px;gap:5px;margin-bottom:4px;align-items:center">
          <span style="text-align:center;font-size:12px;color:var(--text-2)">${si+1}</span>
          <input class="set-input" type="text" placeholder="reps" value="${s.reps||''}"
            onchange="updateSet(${ei},${si},'reps',this.value)">
          <input class="set-input" type="number" placeholder="kg" value="${s.weight||''}" step="0.5"
            onchange="updateSet(${ei},${si},'weight',this.value)">
          <input class="set-input" type="number" placeholder="s" value="${s.rest||90}"
            onchange="updateSet(${ei},${si},'rest',this.value)">
          <button onclick="removeSet(${ei},${si})" style="color:var(--text-3);font-size:16px">×</button>
        </div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn btn-ghost btn-sm" onclick="addSet(${ei})">+ Série</button>
        <button class="btn btn-ghost btn-sm" onclick="startTimer(${ex.sets?.[ex.sets.length-1]?.rest||90})">⏱️ Timer</button>
      </div>
    </div>`).join('')
  : '<div class="text-muted text-sm" style="padding:16px;text-align:center">Aucun exercice. Ajoutez-en un ci-dessous.</div>';
}

function addExerciseToWorkout(exerciseId) {
  if(!currentWorkout) return;
  const lib = state.exercises_library.find(e=>e.id===exerciseId);
  if(!lib) return;
  const lastSets = getLastSetsForExercise(exerciseId);
  currentWorkout.exercises.push({
    exerciseId, name:lib.name, muscle:lib.muscle, isWOD:false,
    sets: lastSets ? lastSets.map(s=>({reps:s.reps,weight:s.weight,rest:s.rest||90}))
                   : [{reps:'',weight:'',rest:90}]
  });
  renderActiveWorkout();
}

function addWODToWorkout() {
  if(!currentWorkout){ showToast('⚠️ Démarrez une séance d\'abord','error'); return; }
  const name = document.getElementById('wod-name')?.value?.trim();
  const desc = document.getElementById('wod-desc')?.value?.trim();
  if(!name){ showToast('⚠️ Nom du WOD requis','error'); return; }
  currentWorkout.exercises.push({
    exerciseId: generateId(), name, muscle:'WOD', isWOD:true,
    description: desc,
    sets:[{reps:'1 round',weight:'',rest:0}]
  });
  closeModal('modal-add-wod');
  renderActiveWorkout();
}

function addSet(ei){ if(!currentWorkout) return; const ex=currentWorkout.exercises[ei]; if(!ex) return;
  const l=ex.sets[ex.sets.length-1]||{}; ex.sets.push({reps:l.reps||'',weight:l.weight||'',rest:l.rest||90}); renderActiveWorkout(); }
function removeSet(ei,si){ if(!currentWorkout) return; currentWorkout.exercises[ei]?.sets.splice(si,1); renderActiveWorkout(); }
function removeExercise(i){ if(!currentWorkout) return; currentWorkout.exercises.splice(i,1); renderActiveWorkout(); }
function updateSet(ei,si,field,val){ if(!currentWorkout?.exercises[ei]?.sets[si]) return; currentWorkout.exercises[ei].sets[si][field]=val; }

function finishWorkout() {
  if(!currentWorkout||!currentWorkout.exercises.length){ showToast('⚠️ Ajoutez au moins un exercice','error'); return; }
  currentWorkout.title = document.getElementById('workout-title-input')?.value || currentWorkout.title;
  currentWorkout.trainingType = document.getElementById('workout-training-type')?.value || 'hypertrophie';
  currentWorkout.duration = Math.round((Date.now()-currentWorkout.startTime)/60000)||1;
  currentWorkout.totalVolume = currentWorkout.exercises.reduce((s,ex)=>s+calcVolume(ex.sets),0);
  let prCount=0;
  currentWorkout.exercises.forEach(ex=>{
    ex.sets.forEach(s=>{ if(s.weight&&s.reps&&!ex.isWOD){
      if(checkPR(ex.exerciseId,parseFloat(s.weight),parseInt(s.reps))){ s.isPR=true; prCount++; }
    }});
  });
  state.workouts.push(currentWorkout);
  addXP(30 + currentWorkout.exercises.length*5);
  updateStreak(); checkAchievements();
  if(prCount>0){ unlockAchievement('pr_hunter'); showToast(`🏆 ${prCount} record(s) battu(s) !`,'pr'); }
  saveState();
  currentWorkout=null;
  closeModal('modal-workout');
  showToast('✅ Séance enregistrée !','success');
  renderWorkoutHistory(); renderWorkoutTemplates();
}

function renderWorkoutHistory() {
  const el = document.getElementById('workout-history-list');
  if(!el) return;
  const sorted = [...state.workouts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  el.innerHTML = sorted.length ? sorted.map(w=>`
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="showWorkoutDetail('${w.id}')">
      <div>
        <div style="font-weight:600">${w.title||'Séance'}
          ${w.trainingType?`<span class="badge badge-purple" style="margin-left:6px;font-size:10px">${w.trainingType}</span>`:''}
        </div>
        <div class="text-muted text-sm">${formatDateFr(w.date)} · ${w.duration||'?'} min</div>
      </div>
      <div style="text-align:right">
        <div class="text-fire text-mono">${Math.round(w.totalVolume||0).toLocaleString()} kg</div>
        <div class="text-muted text-sm">${w.exercises?.length||0} exercices</div>
      </div>
    </div>`).join('') : '<div class="text-muted" style="padding:24px;text-align:center">Aucune séance enregistrée</div>';

  setText('workout-total', state.workouts.length);
  const wVol = weeklyVolume();
  setText('workout-week-vol', Math.round(Object.values(wVol).reduce((s,v)=>s+v,0)).toLocaleString());
  let prs=0;
  state.workouts.forEach(w=>(w.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{ if(s.isPR) prs++; })));
  setText('workout-prs', prs);
}

function showWorkoutDetail(id) {
  const w = state.workouts.find(x=>x.id===id);
  if(!w) return;
  const el = document.getElementById('workout-detail-content');
  if(el) el.innerHTML = `
    <div class="mb-16">
      <div class="section-title">${w.title} ${w.trainingType?`<span class="badge badge-purple">${w.trainingType}</span>`:''}</div>
      <div class="text-muted text-sm">${formatDateFr(w.date)} · ${w.duration}min · ${Math.round(w.totalVolume||0).toLocaleString()} kg volume</div>
    </div>
    ${(w.exercises||[]).map(ex=>`
      <div class="exercise-entry mb-8">
        <div class="exercise-name">${ex.name} <span class="badge badge-fire">${ex.muscle}</span></div>
        ${ex.isWOD&&ex.description?`<div class="text-muted text-sm mb-8">${ex.description}</div>`:''}
        ${(ex.sets||[]).map((s,i)=>`
          <div style="display:flex;gap:16px;font-size:12px;padding:3px 0;color:var(--text-1)">
            <span>S${i+1}</span><span>${s.reps} reps</span><span>${s.weight||'—'} kg</span><span>${s.rest||'—'}s repos</span>
            ${s.isPR?'<span class="badge badge-gold">🏆 PR</span>':''}
          </div>`).join('')}
      </div>`).join('')}`;
  openModal('modal-workout-detail');
}

function renderExerciseSelector(searchQuery='') {
  const groups = {};
  const q = searchQuery.toLowerCase();
  state.exercises_library.filter(ex =>
    !q || ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q)
  ).forEach(ex => {
    if(!groups[ex.muscle]) groups[ex.muscle]=[];
    groups[ex.muscle].push(ex);
  });
  const el = document.getElementById('exercise-selector-list');
  if(!el) return;
  el.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([muscle,exs])=>`
    <div class="mb-12">
      <div class="text-muted text-sm mb-6" style="letter-spacing:1px;text-transform:uppercase">${muscle}</div>
      ${exs.map(ex=>`
        <div class="exercise-entry" style="cursor:pointer;padding:8px 12px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center"
          onclick="addExerciseToWorkout('${ex.id}');closeModal('modal-add-exercise')">
          <div>
            <div style="font-weight:500;font-size:13px">${ex.name}</div>
            <div class="text-muted text-sm">${ex.type}${ex.custom?' · Custom':''}</div>
          </div>
          <span style="color:var(--text-3);font-size:20px">+</span>
        </div>`).join('')}
    </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px">Aucun exercice trouvé</div>';
}

function addCustomExercise() {
  const name = document.getElementById('custom-ex-name')?.value?.trim();
  const muscle = document.getElementById('custom-ex-muscle')?.value?.trim();
  const type = document.getElementById('custom-ex-type')?.value||'compound';
  if(!name||!muscle){ showToast('⚠️ Nom et groupe musculaire requis','error'); return; }
  const ex = { id:generateId(), name, muscle, type, custom:true };
  state.exercises_library.push(ex);
  saveState();
  closeModal('modal-add-custom-exercise');
  showToast(`✅ "${name}" ajouté au catalogue`,'success');
  renderExerciseSelector();
}

async function generateAIWorkout() {
  const type = document.getElementById('ai-workout-type')?.value||'hypertrophie';
  const dur = parseInt(document.getElementById('ai-workout-duration')?.value)||60;
  const btn = document.getElementById('btn-generate-ai');
  if(btn){ btn.innerHTML='<span class="spinner"></span> Génération...'; btn.disabled=true; }
  const result = await AI.generateWorkout(type,[],dur);
  if(btn){ btn.textContent='🤖 Générer avec IA'; btn.disabled=false; }
  if(result&&result.exercises) {
    if(!currentWorkout) startNewWorkout();
    result.exercises.forEach(ex=>{
      const found = state.exercises_library.find(e=>e.name.toLowerCase()===ex.name.toLowerCase());
      currentWorkout.exercises.push({
        exerciseId:found?.id||generateId(), name:ex.name, muscle:ex.muscle||'Général', isWOD:false,
        sets:Array.from({length:ex.sets||3},()=>({reps:ex.reps||'10',weight:'',rest:ex.rest||90}))
      });
    });
    currentWorkout.title = result.title||`Séance ${type}`;
    currentWorkout.trainingType = type;
    setText('active-workout-title', currentWorkout.title);
    setVal('workout-title-input', currentWorkout.title);
    setVal('workout-training-type', type);
    renderActiveWorkout(); closeModal('modal-ai-generate');
    showToast('🤖 Séance générée par l\'IA !','info');
  } else { showToast('❌ Erreur de génération. Vérifiez votre clé API.','error'); }
}

// ════════════════════════════════════════════════
// RUNNING
// ════════════════════════════════════════════════
function saveRun() {
  const type = document.getElementById('run-type')?.value;
  const distance = parseFloat(document.getElementById('run-distance')?.value);
  const timeMin = parseInt(document.getElementById('run-time-min')?.value)||0;
  const timeSec = parseInt(document.getElementById('run-time-sec')?.value)||0;
  const avgPaceMin = parseInt(document.getElementById('run-avgpace-min')?.value)||0;
  const avgPaceSec = parseInt(document.getElementById('run-avgpace-sec')?.value)||0;
  const date = document.getElementById('run-date')?.value||today();
  const notes = document.getElementById('run-notes')?.value||'';
  if(!distance&&!timeMin){ showToast('⚠️ Distance ou temps requis','error'); return; }

  const totalMin = timeMin + timeSec/60;
  let pace;
  if(avgPaceMin||avgPaceSec) {
    pace = avgPaceMin + avgPaceSec/60;
  } else if(distance && totalMin) {
    pace = Math.round((totalMin/distance)*100)/100;
  }

  // Fractionné: parse intervals
  let intervals = [];
  if(type==='Fractionné') {
    const raw = document.getElementById('run-intervals')?.value||'';
    if(raw.trim()) {
      intervals = raw.split('\n').map(line=>{
        const parts = line.trim().split(/[\s,;]+/);
        return { lap: parts[0]||'—', time: parts.slice(1).join(' ')||'—' };
      }).filter(i=>i.lap!=='—');
    }
  }

  const run = { id:generateId(), date, type, distance, duration:Math.round(totalMin)||0,
    time:`${String(timeMin).padStart(2,'0')}:${String(timeSec).padStart(2,'0')}`,
    pace, notes, intervals };
  state.runs.push(run);
  addXP(Math.round((distance||0)*5)||10);
  updateStreak(); checkAchievements(); saveState();
  closeModal('modal-run');
  showToast('🏃 Course enregistrée !','success');
  renderRunHistory();
}

function toggleIntervalFields() {
  const type = document.getElementById('run-type')?.value;
  const box = document.getElementById('interval-fields');
  if(box) box.style.display = type==='Fractionné' ? 'block':'none';
}

function renderRunHistory() {
  const el = document.getElementById('run-history-list');
  if(!el) return;
  const sorted = [...state.runs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  el.innerHTML = sorted.length ? sorted.map(r=>`
    <div class="exercise-entry" style="cursor:pointer" onclick="showRunDetail('${r.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">${r.type||'Course'}</div>
          <div class="text-muted text-sm">${formatDateFr(r.date)}</div>
        </div>
        <div style="display:flex;gap:16px;align-items:center">
          ${r.distance?`<div style="text-align:center"><div class="text-neon text-mono">${r.distance} km</div><div class="text-muted text-sm">Distance</div></div>`:''}
          ${r.time?`<div style="text-align:center"><div class="text-mono">${r.time}</div><div class="text-muted text-sm">Temps</div></div>`:''}
          ${r.pace?`<div style="text-align:center"><div class="text-gold text-mono">${formatPace(r.pace)}</div><div class="text-muted text-sm">Allure</div></div>`:''}
        </div>
      </div>
      ${r.intervals?.length?`<div class="text-muted text-sm mt-8">⚡ ${r.intervals.length} tours enregistrés</div>`:''}
    </div>`).join('')
  : '<div class="text-muted" style="padding:24px;text-align:center">Aucune course enregistrée</div>';

  const vo2 = estimateVO2Max(state.runs);
  setText('run-vo2max', vo2?`~${vo2} ml/kg/min`:'N/A');
  setText('run-total-dist', state.runs.reduce((s,r)=>s+(r.distance||0),0).toFixed(1)+' km');
  const avgs = state.runs.filter(r=>r.pace);
  setText('run-avg-pace', avgs.length ? formatPace(avgs.reduce((s,r)=>s+r.pace,0)/avgs.length) : 'N/A');
  setText('run-sessions', state.runs.length);
}

function showRunDetail(id) {
  const r = state.runs.find(x=>x.id===id);
  if(!r) return;
  const el = document.getElementById('run-detail-content');
  if(el) el.innerHTML = `
    <div class="mb-16">
      <div class="section-title">${r.type}</div>
      <div class="text-muted text-sm">${formatDateFr(r.date)}</div>
    </div>
    <div class="grid-3 mb-16" style="gap:12px">
      ${r.distance?`<div class="stat-widget" style="padding:12px"><div class="stat-label">Distance</div><div class="text-neon text-display" style="font-size:24px">${r.distance} km</div></div>`:''}
      ${r.time?`<div class="stat-widget" style="padding:12px"><div class="stat-label">Temps</div><div class="text-display" style="font-size:24px">${r.time}</div></div>`:''}
      ${r.pace?`<div class="stat-widget" style="padding:12px"><div class="stat-label">Allure</div><div class="text-gold text-display" style="font-size:24px">${formatPace(r.pace)}</div></div>`:''}
    </div>
    ${r.intervals?.length?`
      <div class="section-title mb-8">Tours / Intervalles</div>
      <div class="table-wrap"><table><thead><tr><th>Tour</th><th>Temps</th></tr></thead><tbody>
        ${r.intervals.map(i=>`<tr><td>${i.lap}</td><td>${i.time}</td></tr>`).join('')}
      </tbody></table></div>`:''}
    ${r.notes?`<div class="text-muted text-sm mt-12">${r.notes}</div>`:''}`;
  openModal('modal-run-detail');
}

// ════════════════════════════════════════════════
// SWIMMING
// ════════════════════════════════════════════════
function saveSwim() {
  const poolLen = parseInt(document.getElementById('swim-pool')?.value)||25;
  const distance = parseFloat(document.getElementById('swim-distance')?.value)||0;
  const timeMin = parseInt(document.getElementById('swim-time-min')?.value)||0;
  const timeSec = parseInt(document.getElementById('swim-time-sec')?.value)||0;
  const style = document.getElementById('swim-style')?.value||'crawl';
  const date = document.getElementById('swim-date')?.value||today();
  const notes = document.getElementById('swim-notes')?.value||'';
  if(!distance&&!timeMin){ showToast('⚠️ Distance ou temps requis','error'); return; }
  const totalMin = timeMin+timeSec/60;
  const laps = distance ? Math.round((distance*1000)/poolLen) : 0;
  const swim = { id:generateId(), date, poolLength:poolLen, distance, laps, style,
    duration:Math.round(totalMin)||0,
    time:`${String(timeMin).padStart(2,'0')}:${String(timeSec).padStart(2,'0')}`, notes };
  if(!state.swims) state.swims=[];
  state.swims.push(swim);
  addXP(Math.round((distance||0)*8)||15);
  updateStreak(); checkAchievements(); saveState();
  closeModal('modal-swim');
  showToast('🏊 Séance piscine enregistrée !','success');
  renderSwimHistory();
}

function renderSwimHistory() {
  const el = document.getElementById('swim-history-list');
  if(!el) return;
  const sorted = [...(state.swims||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  el.innerHTML = sorted.length ? sorted.map(s=>`
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600">${s.style||'Nage'} · Piscine ${s.poolLength}m</div>
        <div class="text-muted text-sm">${formatDateFr(s.date)}</div>
      </div>
      <div style="display:flex;gap:16px;text-align:center">
        <div><div class="text-neon text-mono">${s.distance} km</div><div class="text-muted text-sm">Distance</div></div>
        <div><div class="text-mono">${s.time}</div><div class="text-muted text-sm">Temps</div></div>
        ${s.laps?`<div><div class="text-gold">${s.laps}</div><div class="text-muted text-sm">Longueurs</div></div>`:''}
      </div>
    </div>`).join('')
  : '<div class="text-muted" style="padding:24px;text-align:center">Aucune séance piscine</div>';
  setText('swim-total-dist', (state.swims||[]).reduce((s,x)=>s+(x.distance||0),0).toFixed(1)+' km');
  setText('swim-total-sessions', (state.swims||[]).length);
}

// ════════════════════════════════════════════════
// COMBAT
// ════════════════════════════════════════════════
function saveCombat() {
  const sport = document.getElementById('combat-sport')?.value;
  const type = document.getElementById('combat-type')?.value;
  const intensity = parseInt(document.getElementById('combat-intensity')?.value)||5;
  const duration = parseInt(document.getElementById('combat-duration')?.value);
  const date = document.getElementById('combat-date')?.value||today();
  const notes = document.getElementById('combat-notes')?.value||'';
  if(!duration){ showToast('⚠️ Durée requise','error'); return; }
  const met = {technique:5,sparring:9,cardio:8,mixte:7,renforcement:5,etirements:3,combat:9}[type]||7;
  const calories = Math.round(met*(state.profile.weight||75)*(duration/60)*(intensity/5));
  const session = {id:generateId(),date,sport,type,intensity,duration,calories,notes};
  state.combats.push(session);
  addXP(20+Math.round(duration/5));
  updateStreak(); checkAchievements(); saveState();
  closeModal('modal-combat');
  showToast('🥊 Séance combat enregistrée !','success');
  renderCombatHistory();
}

function renderCombatHistory() {
  const el = document.getElementById('combat-history-list');
  if(!el) return;
  const sorted = [...state.combats].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  el.innerHTML = sorted.length ? sorted.map(c=>`
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:600">${c.sport||'Combat'} — ${c.type}</div>
        <div class="text-muted text-sm">${formatDateFr(c.date)}</div></div>
      <div style="display:flex;gap:16px;text-align:center">
        <div><div class="text-fire text-mono">${c.duration} min</div><div class="text-muted text-sm">Durée</div></div>
        <div><div class="text-gold">${c.intensity}/10</div><div class="text-muted text-sm">Intensité</div></div>
        <div><div class="text-green text-mono">~${c.calories||'?'}</div><div class="text-muted text-sm">kcal</div></div>
      </div>
    </div>`).join('')
  : '<div class="text-muted" style="padding:24px;text-align:center">Aucune séance combat</div>';
  setText('combat-total', state.combats.length);
  setText('combat-calories', state.combats.reduce((s,c)=>s+(c.calories||0),0).toLocaleString());
  setText('combat-time', state.combats.reduce((s,c)=>s+(c.duration||0),0)+' min');
}

// ════════════════════════════════════════════════
// STEPS (Pas journaliers)
// ════════════════════════════════════════════════
function saveSteps() {
  const steps = parseInt(document.getElementById('steps-input')?.value);
  const date = document.getElementById('steps-date')?.value||today();
  if(!steps||steps<=0){ showToast('⚠️ Nombre de pas requis','error'); return; }
  const idx = (state.steps||[]).findIndex(s=>s.date===date);
  const entry = {date, steps};
  if(!state.steps) state.steps=[];
  if(idx>=0) state.steps[idx]=entry; else state.steps.push(entry);
  checkAchievements(); saveState();
  showToast(`👟 ${steps.toLocaleString()} pas enregistrés`,'success');
  renderStepsHistory();
}

function renderStepsHistory() {
  const el = document.getElementById('steps-history');
  if(!el) return;
  const sorted = [...(state.steps||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
  el.innerHTML = sorted.length ? sorted.map(s=>{
    const pct = Math.min(100,Math.round(s.steps/100));
    const color = s.steps>=10000?'var(--accent-green)':s.steps>=7500?'var(--accent-gold)':'var(--accent-fire)';
    return `<div class="exercise-entry" style="padding:10px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;font-weight:500">${formatDateFr(s.date)}</span>
        <span style="color:${color};font-weight:600;font-family:var(--font-mono)">${s.steps.toLocaleString()} pas</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('') : '<div class="text-muted text-sm" style="padding:16px;text-align:center">Aucun pas enregistré</div>';
  // Avg
  if(sorted.length) {
    const avg = Math.round(sorted.reduce((s,x)=>s+x.steps,0)/sorted.length);
    setText('steps-avg', avg.toLocaleString()+' pas/j (moy. 14j)');
  }
}

// ════════════════════════════════════════════════
// ANALYSIS
// ════════════════════════════════════════════════
function renderAnalysis() {
  const last30 = Array.from({length:30},(_,i)=>formatDate(new Date(Date.now()-(29-i)*86400000)));
  const volData = last30.map(d=>state.workouts.filter(w=>w.date===d)
    .reduce((s,w)=>s+(w.exercises||[]).reduce((ss,ex)=>ss+calcVolume(ex.sets||[]),0),0));

  createBarChart('analysis-volume-chart', last30.map(d=>d.slice(5).replace('-','/')), [{
    label:'Volume (kg)', data:volData,
    backgroundColor:'rgba(255,77,28,0.5)', borderColor:'#ff4d1c',
    borderRadius:3, borderWidth:1
  }]);

  const runs = [...state.runs].sort((a,b)=>a.date.localeCompare(b.date)).slice(-20);
  if(runs.length>=2) createLineChart('analysis-run-chart',
    runs.map(r=>r.date.slice(5).replace('-','/')),
    [{label:'Allure (min/km)',data:runs.map(r=>r.pace||0),
      borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.08)',
      tension:0.4,fill:true,pointBackgroundColor:'#00e5ff'}]);

  const vol = weeklyVolume();
  const muscles=Object.keys(vol), vols=muscles.map(m=>vol[m]);
  if(muscles.length) createDoughnutChart('analysis-muscle-chart',muscles,vols,muscles.map(m=>MUSCLE_COLORS[m]||'#666'));

  const bestLifts={};
  state.workouts.forEach(w=>(w.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{
    const wt=parseFloat(s.weight)||0;
    if(!bestLifts[ex.name]||wt>bestLifts[ex.name]) bestLifts[ex.name]=wt;
  })));
  const prEl=document.getElementById('analysis-prs');
  if(prEl){
    const top=Object.entries(bestLifts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    prEl.innerHTML=top.length?top.map(([n,w])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:13px">${n}</span><span class="text-gold text-display" style="font-size:20px">${w} kg</span>
      </div>`).join(''):'<div class="text-muted text-sm">Aucun record</div>';
  }

  const wAgo=formatDate(new Date(Date.now()-7*86400000));
  setText('week-sessions', state.workouts.filter(w=>w.date>=wAgo).length+state.runs.filter(r=>r.date>=wAgo).length+state.combats.filter(c=>c.date>=wAgo).length+(state.swims||[]).filter(s=>s.date>=wAgo).length);
  setText('week-distance', state.runs.filter(r=>r.date>=wAgo).reduce((s,r)=>s+(r.distance||0),0).toFixed(1)+' km');
  setText('week-volume', Math.round(state.workouts.filter(w=>w.date>=wAgo).reduce((s,w)=>s+(w.totalVolume||0),0)).toLocaleString()+' kg');
}

async function getAIAnalysis() {
  const btn=document.getElementById('btn-ai-analysis');
  if(btn){btn.innerHTML='<span class="spinner"></span>';btn.disabled=true;}
  const summary=await AI.weeklySummary();
  if(btn){btn.textContent='🤖 Analyse IA';btn.disabled=false;}
  const el=document.getElementById('ai-analysis-result');
  if(el){el.textContent=summary;el.parentElement.style.display='block';}
}

// ════════════════════════════════════════════════
// RECOVERY
// ════════════════════════════════════════════════
function saveRecovery() {
  const sleep=parseInt(document.getElementById('recovery-sleep')?.value)||5;
  const fatigue=parseInt(document.getElementById('recovery-fatigue')?.value)||5;
  const pain=document.getElementById('recovery-pain')?.value||'';
  const entry={id:generateId(),date:today(),sleep,fatigue,pain};
  const idx=state.recovery.findIndex(r=>r.date===today());
  if(idx>=0) state.recovery[idx]=entry; else state.recovery.push(entry);
  saveState(); renderRecovery(); showToast('😴 Récupération enregistrée','success');
}

function renderRecovery() {
  const el=document.getElementById('recovery-history');
  if(!el) return;
  const sorted=[...state.recovery].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
  el.innerHTML=sorted.map(r=>{
    const sc=r.sleep>=7?'var(--accent-green)':r.sleep>=5?'var(--accent-gold)':'var(--accent-fire)';
    const fc=r.fatigue<=4?'var(--accent-green)':r.fatigue<=6?'var(--accent-gold)':'var(--accent-fire)';
    return `<div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:600;font-size:13px">${formatDateFr(r.date)}</div>
        ${r.pain?`<div class="text-muted text-sm">💢 ${r.pain}</div>`:''}</div>
      <div style="display:flex;gap:16px;text-align:center">
        <div><div style="color:${sc};font-weight:600">${r.sleep}/10</div><div class="text-muted text-sm">Sommeil</div></div>
        <div><div style="color:${fc};font-weight:600">${r.fatigue}/10</div><div class="text-muted text-sm">Fatigue</div></div>
      </div>
    </div>`;
  }).join('')||'<div class="text-muted" style="padding:24px;text-align:center">Aucune donnée</div>';
  if(sorted.length>=2){
    const rev=[...sorted].reverse();
    createLineChart('recovery-chart',rev.map(r=>r.date.slice(5).replace('-','/')),
      [{label:'Sommeil',data:rev.map(r=>r.sleep),borderColor:'#00e5ff',tension:0.4,fill:false,pointRadius:3},
       {label:'Fatigue',data:rev.map(r=>r.fatigue),borderColor:'#ff4d1c',tension:0.4,fill:false,pointRadius:3}]);
  }
}

async function getRecoveryAdvice() {
  const sleep=parseInt(document.getElementById('recovery-sleep')?.value)||5;
  const fatigue=parseInt(document.getElementById('recovery-fatigue')?.value)||5;
  const btn=document.getElementById('btn-recovery-advice');
  if(btn){btn.innerHTML='<span class="spinner"></span>';btn.disabled=true;}
  const advice=await AI.recoveryAdvice(sleep,fatigue);
  if(btn){btn.textContent='🤖 Conseil IA';btn.disabled=false;}
  const el=document.getElementById('recovery-ai-result');
  const box=document.getElementById('recovery-advice-box');
  if(el){el.textContent=advice; if(box) box.style.display='block';}
}

// ════════════════════════════════════════════════
// NUTRITION
// ════════════════════════════════════════════════
function renderNutrition() {
  const p=state.profile, bmr=calcBMR(p), tdee=calcTDEE(p);
  setText('nutr-bmr',bmr.toLocaleString()); setText('nutr-tdee',tdee.toLocaleString());
  let cal,protein,carbs,fat;
  if(p.goal==='muscle'){cal=tdee+300;protein=Math.round(p.weight*2);fat=Math.round(cal*.25/9);carbs=Math.round((cal-protein*4-fat*9)/4);}
  else if(p.goal==='loss'){cal=tdee-400;protein=Math.round(p.weight*2.2);fat=Math.round(cal*.3/9);carbs=Math.round((cal-protein*4-fat*9)/4);}
  else{cal=tdee;protein=Math.round(p.weight*1.8);fat=Math.round(cal*.3/9);carbs=Math.round((cal-protein*4-fat*9)/4);}
  setText('nutr-calories',cal.toLocaleString()); setText('nutr-protein',protein+'g');
  setText('nutr-carbs',carbs+'g'); setText('nutr-fat',fat+'g');
  createDoughnutChart('nutr-macro-chart',['Protéines','Glucides','Lipides'],
    [protein*4,carbs*4,fat*9],['#06d6a0','#00e5ff','#ffd166']);
  const todayLog=state.nutrition.find(n=>n.date===today());
  const pct=todayLog?Math.min(100,Math.round((todayLog.calories/cal)*100)):0;
  const pctEl=document.getElementById('nutr-today-pct');
  if(pctEl) pctEl.style.width=pct+'%';
  setText('nutr-today-calories',todayLog?todayLog.calories:'0');
}

function saveNutritionLog() {
  const cal=parseInt(document.getElementById('nutr-log-calories')?.value);
  if(!cal){ showToast('⚠️ Calories requises','error'); return; }
  const entry={date:today(),calories:cal,
    protein:parseInt(document.getElementById('nutr-log-protein')?.value)||0,
    carbs:parseInt(document.getElementById('nutr-log-carbs')?.value)||0,
    fat:parseInt(document.getElementById('nutr-log-fat')?.value)||0};
  const idx=state.nutrition.findIndex(n=>n.date===today());
  if(idx>=0) state.nutrition[idx]=entry; else state.nutrition.push(entry);
  saveState(); checkAchievements(); closeModal('modal-nutrition-log'); renderNutrition();
  showToast('🥗 Repas enregistré','success');
}

async function getNutritionAdvice() {
  const btn=document.getElementById('btn-nutr-advice');
  if(btn){btn.innerHTML='<span class="spinner"></span>';btn.disabled=true;}
  const advice=await AI.nutritionAdvice();
  if(btn){btn.textContent='🤖 Recommandations IA';btn.disabled=false;}
  const el=document.getElementById('nutr-ai-result'), box=document.getElementById('nutr-ai-box');
  if(el){el.textContent=advice; if(box) box.style.display='block';}
}

// ════════════════════════════════════════════════
// GAMIFICATION
// ════════════════════════════════════════════════
function renderGamification() {
  const p=state.profile;
  setText('gami-streak',p.streak); setText('gami-xp',p.xp.toLocaleString());
  setText('gami-level',p.level);
  setText('gami-total-workouts',state.workouts.length+state.runs.length+state.combats.length+(state.swims||[]).length);
  const xpCur=XP_THRESHOLDS[p.level-1]||0, xpNxt=XP_THRESHOLDS[Math.min(p.level,XP_THRESHOLDS.length-1)]||9999;
  const pct=xpNxt>xpCur?Math.round(((p.xp-xpCur)/(xpNxt-xpCur))*100):100;
  const bar=document.getElementById('gami-xp-bar'); if(bar) bar.style.width=Math.min(100,pct)+'%';
  setText('gami-xp-next',`${p.xp} / ${xpNxt} XP`);
  const el=document.getElementById('badges-grid');
  if(el) el.innerHTML=ACHIEVEMENTS.map(a=>{
    const u=p.badges.includes(a.id);
    return `<div class="achievement-badge ${u?'unlocked':'locked'}" title="${a.desc}">
      <span style="font-size:28px">${a.icon}</span>
      <span>${a.label}</span>
      <span style="font-size:10px">${u?'✓ Obtenu':'🔒'}</span>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════
// PLANNING / CALENDAR
// ════════════════════════════════════════════════
let calendarDate=new Date();

function renderCalendar() {
  const year=calendarDate.getFullYear(), month=calendarDate.getMonth();
  const months=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  setText('cal-month-label',`${months[month]} ${year}`);
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const daysInPrev=new Date(year,month,0).getDate();
  const grid=document.getElementById('calendar-grid');
  if(!grid) return;
  const tod=today();
  let html='';
  ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].forEach(d=>html+=`<div class="cal-header">${d}</div>`);
  for(let i=0;i<firstDay;i++){
    const day=daysInPrev-firstDay+i+1;
    html+=`<div class="cal-day other-month"><span>${day}</span></div>`;
  }
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===tod;
    const dayPlans=state.plans.filter(p=>p.date===ds);
    const hasActivity=state.workouts.some(w=>w.date===ds)||state.runs.some(r=>r.date===ds)||state.combats.some(c=>c.date===ds)||(state.swims||[]).some(s=>s.date===ds);
    html+=`<div class="cal-day ${isToday?'today':''} ${dayPlans.length||hasActivity?'has-workout':''}" onclick="calDayClick('${ds}')">
      <span style="font-size:13px">${d}</span>
      ${dayPlans.length>1?`<span style="font-size:9px;color:var(--accent-neon)">${dayPlans.length} séances</span>`:''}
    </div>`;
  }
  const total=firstDay+daysInMonth, remaining=total%7===0?0:7-(total%7);
  for(let d=1;d<=remaining;d++) html+=`<div class="cal-day other-month"><span>${d}</span></div>`;
  grid.innerHTML=html;
  renderPlanList();
}

function calDayClick(ds) {
  setVal('plan-date',ds);
  // Show existing plans for that day
  const dayPlans=state.plans.filter(p=>p.date===ds);
  const infoEl=document.getElementById('plan-day-info');
  if(infoEl) infoEl.innerHTML=dayPlans.length?`<div class="text-muted text-sm mb-8">${dayPlans.length} séance(s) déjà planifiée(s) ce jour :</div>${dayPlans.map(p=>`<div class="badge badge-neon" style="margin-right:4px;margin-bottom:4px">${p.title}</div>`).join('')}`:'';
  openModal('modal-add-plan');
}

function prevMonth(){calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();}
function nextMonth(){calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();}

function savePlan() {
  const date=document.getElementById('plan-date')?.value;
  const title=document.getElementById('plan-title')?.value;
  const type=document.getElementById('plan-type')?.value;
  const timeSlot=document.getElementById('plan-time-slot')?.value||'';
  const notes=document.getElementById('plan-notes')?.value||'';
  if(!date||!title){ showToast('⚠️ Date et titre requis','error'); return; }
  // Allow multiple plans per day
  state.plans.push({id:generateId(),date,title,type,timeSlot,notes});
  saveState(); closeModal('modal-add-plan'); renderCalendar();
  showToast('📅 Séance planifiée','success');
}

function deletePlan(id){
  state.plans=state.plans.filter(p=>p.id!==id);
  saveState(); renderCalendar();
}

function renderPlanList() {
  const el=document.getElementById('plan-list');
  if(!el) return;
  const upcoming=state.plans.filter(p=>p.date>=today()).sort((a,b)=>{
    if(a.date!==b.date) return a.date.localeCompare(b.date);
    return (a.timeSlot||'').localeCompare(b.timeSlot||'');
  }).slice(0,15);
  el.innerHTML=upcoming.length?upcoming.map(p=>`
    <div class="exercise-entry" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600;font-size:13px">${p.title}</div>
        <div class="text-muted text-sm">${formatDateFr(p.date)}${p.timeSlot?' · '+p.timeSlot:''} · ${p.type}</div>
        ${p.notes?`<div class="text-muted text-sm">${p.notes}</div>`:''}
      </div>
      <button onclick="deletePlan('${p.id}')" class="btn btn-ghost btn-sm" style="color:var(--text-3)">×</button>
    </div>`).join('')
  :'<div class="text-muted" style="padding:16px;text-align:center">Aucune séance planifiée</div>';
}

async function getAIPlanning() {
  const btn=document.getElementById('btn-ai-planning');
  if(btn){btn.innerHTML='<span class="spinner"></span>';btn.disabled=true;}
  const advice=await AI.planningAdvice();
  if(btn){btn.textContent='🤖 Planning IA';btn.disabled=false;}
  const el=document.getElementById('planning-ai-result');
  if(el){el.textContent=advice;el.parentElement.style.display='block';}
}

// ════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════
function renderSettings() {
  const p=state.profile;
  setVal('set-name',p.name||''); setVal('set-age',p.age||'');
  setVal('set-weight',p.weight||''); setVal('set-height',p.height||'');
  setVal('set-goal',p.goal||'muscle'); setVal('set-activity',p.activity||'moderate');
  setVal('set-apikey',p.apiKey||''); setVal('set-model',p.mistralModel||'mistral-large-latest');
  // Supabase
  try{
    const cfg=JSON.parse(localStorage.getItem('fitcoach_supabase')||'{}');
    setVal('set-sb-url',cfg.url||''); setVal('set-sb-key',cfg.key||'');
  }catch{}
  // Custom sports
  renderCustomSports();
}

function saveSettings() {
  state.profile.name=document.getElementById('set-name')?.value||'Athlète';
  state.profile.age=parseInt(document.getElementById('set-age')?.value)||25;
  state.profile.weight=parseFloat(document.getElementById('set-weight')?.value)||75;
  state.profile.height=parseFloat(document.getElementById('set-height')?.value)||178;
  state.profile.goal=document.getElementById('set-goal')?.value||'muscle';
  state.profile.activity=document.getElementById('set-activity')?.value||'moderate';
  state.profile.apiKey=(document.getElementById('set-apikey')?.value||'').trim();
  state.profile.mistralModel=document.getElementById('set-model')?.value||'mistral-large-latest';
  // Supabase config
  const sbUrl=(document.getElementById('set-sb-url')?.value||'').trim();
  const sbKey=(document.getElementById('set-sb-key')?.value||'').trim();
  if(sbUrl&&sbKey){
    localStorage.setItem('fitcoach_supabase',JSON.stringify({url:sbUrl,key:sbKey}));
    _sb=null; // reset client so it re-inits
    showToast('☁️ Supabase configuré ! Rechargez pour synchroniser.','info');
  }
  saveState();
  showToast('✅ Paramètres sauvegardés','success');
  document.querySelectorAll('.user-name').forEach(e=>e.textContent=state.profile.name);
  setText('sidebar-user-name',state.profile.name);
  setText('sidebar-user-level',`Niveau ${state.profile.level}`);
}

async function testMistralKey() {
  const key=(document.getElementById('set-apikey')?.value||'').trim();
  if(!key){ showToast('⚠️ Entrez une clé d\'abord','error'); return; }
  const btn=document.getElementById('btn-test-key');
  if(btn){btn.innerHTML='<span class="spinner"></span>';btn.disabled=true;}
  try{
    const r=await fetch('https://api.mistral.ai/v1/models',{headers:{'Authorization':`Bearer ${key}`}});
    if(r.ok){ showToast('✅ Clé Mistral valide !','success'); }
    else{ const j=await r.json().catch(()=>({})); showToast(`❌ Clé invalide (${r.status}): ${j.message||''}`, 'error'); }
  }catch(e){ showToast('🌐 Erreur réseau: '+e.message,'error'); }
  if(btn){btn.textContent='🔍 Tester la clé';btn.disabled=false;}
}

function renderCustomSports() {
  const el=document.getElementById('custom-sports-list');
  if(!el) return;
  const sports=state.custom_sports||[];
  el.innerHTML=sports.length?sports.map(s=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <span>${s.icon||'🏃'} ${s.name}</span>
      <button onclick="deleteCustomSport('${s.id}')" style="color:var(--text-3);font-size:14px">×</button>
    </div>`).join(''):'<div class="text-muted text-sm">Aucun sport personnalisé</div>';
}

function addCustomSport() {
  const name=document.getElementById('new-sport-name')?.value?.trim();
  const icon=document.getElementById('new-sport-icon')?.value?.trim()||'🏃';
  if(!name){ showToast('⚠️ Nom requis','error'); return; }
  if(!state.custom_sports) state.custom_sports=[];
  state.custom_sports.push({id:generateId(),name,icon});
  setVal('new-sport-name',''); setVal('new-sport-icon','');
  saveState(); renderCustomSports();
  showToast(`✅ Sport "${name}" ajouté`,'success');
}

function deleteCustomSport(id){
  state.custom_sports=(state.custom_sports||[]).filter(s=>s.id!==id);
  saveState(); renderCustomSports();
}

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`fitcoach-${today()}.json`; a.click(); URL.revokeObjectURL(url);
  showToast('📤 Données exportées','success');
}

function importData(file){
  const r=new FileReader();
  r.onload=e=>{
    try{
      const imported=JSON.parse(e.target.result);
      Object.assign(state,imported); saveState();
      showToast('📥 Données importées','success'); setTimeout(()=>location.reload(),800);
    }catch{ showToast('❌ Fichier invalide','error'); }
  };
  r.readAsText(file);
}

function resetAllData(){
  if(confirm('⚠️ Supprimer TOUTES les données ? Irréversible.'))
  { localStorage.removeItem(DB_KEY); location.reload(); }
}
