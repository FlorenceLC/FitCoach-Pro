// ============================================================
// FITCOACH PRO - AI Module (Mistral API)
// ============================================================

const AI = {
  model: 'mistral-large-latest',

  async request(messages, systemPrompt) {
    const key = state.profile.apiKey;
    if (!key) return '⚠️ Clé API Mistral manquante. Allez dans Paramètres > IA.';

    const body = {
      model: this.model,
      messages: [{ role:'system', content:systemPrompt }, ...messages],
      max_tokens: 1200,
      temperature: 0.7
    };

    try {
      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        let errMsg = resp.statusText;
        try { const j = await resp.json(); errMsg = j.message || j.error?.message || errMsg; } catch {}
        if (resp.status === 401) return '❌ Clé API invalide ou expirée. Vérifiez dans Paramètres.';
        if (resp.status === 422) return '❌ Requête invalide (422). Vérifiez le modèle sélectionné.';
        if (resp.status === 429) return '⏳ Limite de requêtes atteinte. Patientez quelques secondes.';
        return `❌ Erreur Mistral ${resp.status}: ${errMsg}`;
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim() || '(Réponse vide)';
    } catch (e) {
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        return '🌐 Impossible de joindre l\'API Mistral. Vérifiez votre connexion.';
      }
      return `❌ Erreur: ${e.message}`;
    }
  },

  buildContext() {
    const p = state.profile;
    const recentW = state.workouts.slice(-5).map(w => ({
      date:w.date, title:w.title, duration:w.duration, exercises:w.exercises?.length||0
    }));
    const recentR = state.runs.slice(-3).map(r => ({
      date:r.date, distance:r.distance, pace:r.pace, type:r.type
    }));
    const lastRec = state.recovery.slice(-3);
    return `
PROFIL: ${p.name}, ${p.age}ans, ${p.weight}kg, ${p.height}cm
Objectif: ${p.goal==='muscle'?'Prise de masse':p.goal==='loss'?'Perte de poids':'Maintien'}
Niveau ${p.level}, ${p.xp} XP, Streak ${p.streak}j, Total séances: ${state.workouts.length}
Séances récentes: ${JSON.stringify(recentW)}
Courses récentes: ${JSON.stringify(recentR)}
Récupération: ${JSON.stringify(lastRec)}
BMR: ${calcBMR(p)} kcal, TDEE: ${calcTDEE(p)} kcal`;
  },

  systemPrompt() {
    return `Tu es CoachIA, coach sportif expert dans FitCoach Pro.
Tu analyses les données réelles de l'utilisateur et fournis des conseils personnalisés.
Sois CONCIS (3-4 phrases max), MOTIVANT et PRÉCIS. Utilise des emojis. Réponds en français.
${this.buildContext()}`;
  },

  async chat(msg, history=[]) {
    const messages = [
      ...history.slice(-12).map(m => ({ role:m.role, content:m.content })),
      { role:'user', content:msg }
    ];
    return this.request(messages, this.systemPrompt());
  },

  async generateWorkout(type='hypertrophie', muscles=[], duration=60) {
    const prompt = `Génère une séance de musculation. Type: ${type}. Muscles: ${muscles.join(',')||'selon progression'}. Durée: ${duration}min. Niveau: ${state.profile.level}.
Réponds UNIQUEMENT avec ce JSON valide, sans texte autour:
{"title":"...","trainingType":"${type}","exercises":[{"name":"...","muscle":"...","sets":3,"reps":"8-10","rest":90,"notes":"..."}]}`;
    const resp = await this.request([{role:'user',content:prompt}], this.systemPrompt());
    try {
      const json = resp.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : null;
    } catch { return null; }
  },

  async weeklySummary() {
    return this.request([{role:'user',content:'Fais un résumé de mes entraînements cette semaine (4-5 phrases, bilan global, point fort, point à améliorer, conseil).'}], this.systemPrompt());
  },

  async nutritionAdvice() {
    const p = state.profile;
    return this.request([{role:'user',content:`Donne-moi mes besoins nutritionnels. BMR: ${calcBMR(p)}, TDEE: ${calcTDEE(p)}, objectif: ${p.goal}. Inclus calories cibles et macros en grammes.`}], this.systemPrompt());
  },

  async recoveryAdvice(sleep, fatigue) {
    return this.request([{role:'user',content:`Sommeil: ${sleep}/10, Fatigue: ${fatigue}/10. Dois-je me reposer, faire une séance légère ou m'entraîner normalement ?`}], this.systemPrompt());
  },

  async planningAdvice() {
    return this.request([{role:'user',content:'Propose un planning équilibré pour la semaine prochaine (Lun à Dim). Indique le type de séance ou REPOS pour chaque jour.'}], this.systemPrompt());
  },

  async runAnalysis() {
    const runs = state.runs.slice(-10);
    if (!runs.length) return '🏃 Aucune course à analyser.';
    return this.request([{role:'user',content:`Analyse mes ${runs.length} dernières courses: ${JSON.stringify(runs)}. Progression, niveau, objectifs réalistes.`}], this.systemPrompt());
  }
};
