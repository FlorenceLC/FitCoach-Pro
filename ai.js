// ============================================================
// FITCOACH PRO - AI Module (Mistral API)
// ============================================================

const AI = {
  model: 'mistral-large-latest',

  // ── Core request ──
  async request(messages, systemPrompt) {
    const key = state.profile.apiKey;
    if (!key) {
      return '⚠️ Clé API Mistral manquante. Configurez-la dans Paramètres > IA.';
    }

    try {
      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 401) return '❌ Clé API invalide. Vérifiez dans Paramètres.';
        if (resp.status === 429) return '⏳ Limite de requêtes atteinte. Réessayez dans quelques secondes.';
        return `❌ Erreur API: ${err.message || resp.statusText}`;
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '(Pas de réponse)';
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        return '🌐 Erreur réseau. Vérifiez votre connexion internet.';
      }
      return `❌ Erreur: ${e.message}`;
    }
  },

  // ── Build context from user data ──
  buildContext() {
    const p = state.profile;
    const recentWorkouts = state.workouts.slice(-5).map(w => ({
      date: w.date, type: w.type, duration: w.duration,
      exercises: w.exercises?.length || 0
    }));
    const recentRuns = state.runs.slice(-3).map(r => ({
      date: r.date, distance: r.distance, pace: r.pace, type: r.type
    }));
    const lastRecovery = state.recovery.slice(-3);
    const totalWorkouts = state.workouts.length;
    const streak = p.streak;

    return `
PROFIL UTILISATEUR:
- Nom: ${p.name}, Âge: ${p.age} ans, Poids: ${p.weight}kg, Taille: ${p.height}cm
- Objectif: ${p.goal === 'muscle' ? 'Prise de masse' : p.goal === 'loss' ? 'Perte de poids' : 'Maintien'}
- Niveau: ${p.level}, XP: ${p.xp}, Streak: ${streak} jours
- Total séances: ${totalWorkouts}

SÉANCES RÉCENTES (musculation):
${recentWorkouts.length ? JSON.stringify(recentWorkouts, null, 2) : 'Aucune'}

COURSES RÉCENTES:
${recentRuns.length ? JSON.stringify(recentRuns, null, 2) : 'Aucune'}

RÉCUPÉRATION RÉCENTE:
${lastRecovery.length ? JSON.stringify(lastRecovery, null, 2) : 'Non renseignée'}

BMR: ${calcBMR(p)} kcal, TDEE estimé: ${calcTDEE(p)} kcal
`;
  },

  // ── System prompt ──
  systemPrompt() {
    return `Tu es CoachIA, un coach sportif expert et bienveillant intégré dans l'application FitCoach Pro.
Tu analyses les données d'entraînement de l'utilisateur pour fournir des recommandations personnalisées.
Tu es CONCIS (max 3-4 phrases), MOTIVANT, et PRÉCIS dans tes recommandations.
Tu utilises des emojis pertinents pour rendre les messages plus vivants.
Tu réponds TOUJOURS en français.
Tu te bases sur les données réelles de l'utilisateur.

${this.buildContext()}`;
  },

  // ── Chat with AI coach ──
  async chat(userMessage, history = []) {
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];
    return await this.request(messages, this.systemPrompt());
  },

  // ── Generate a workout session ──
  async generateWorkout(type = 'hypertrophie', muscles = [], duration = 60) {
    const prompt = `Génère une séance de musculation complète pour aujourd'hui.
Type: ${type}
Groupes musculaires: ${muscles.length ? muscles.join(', ') : 'Full body ou selon progression'}
Durée: ${duration} minutes
Niveau: ${state.profile.level}

Réponds avec UN JSON valide UNIQUEMENT (pas de texte avant/après), format:
{
  "title": "nom de la séance",
  "exercises": [
    {"name": "nom exercice", "muscle": "groupe", "sets": 4, "reps": "8-10", "rest": 90, "notes": "conseil"}
  ]
}`;
    const resp = await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
    try {
      const json = resp.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : null;
    } catch { return null; }
  },

  // ── Weekly summary ──
  async weeklySummary() {
    const prompt = `Génère un résumé hebdomadaire de mes entraînements.
Sois concis (4-5 phrases max), positif mais honnête sur les points à améliorer.
Inclus: bilan global, point fort, point à améliorer, conseil pour la semaine prochaine.`;
    return await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
  },

  // ── Nutrition recommendation ──
  async nutritionAdvice() {
    const p = state.profile;
    const bmr = calcBMR(p);
    const tdee = calcTDEE(p);
    const prompt = `Calcule et explique mes besoins nutritionnels.
BMR: ${bmr} kcal, TDEE: ${tdee} kcal, Objectif: ${p.goal}
Donne: calories cibles, répartition macros (protéines/glucides/lipides en grammes), 2-3 conseils pratiques.`;
    return await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
  },

  // ── Recovery advice ──
  async recoveryAdvice(sleepScore, fatigueLevel) {
    const prompt = `Mon score sommeil est ${sleepScore}/10 et ma fatigue est ${fatigueLevel}/10.
Analyse ma récupération et recommande: repos, séance légère, ou entraînement normal ?
Sois direct et concis.`;
    return await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
  },

  // ── Planning suggestion ──
  async planningAdvice() {
    const prompt = `Propose un planning d'entraînement optimisé pour la semaine prochaine.
Tiens compte de mon niveau, mes objectifs, et évite le surentraînement.
Format: Lun/Mar/Mer/Jeu/Ven/Sam/Dim avec type de séance ou REPOS.`;
    return await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
  },

  // ── Run analysis ──
  async runAnalysis() {
    const runs = state.runs.slice(-10);
    if (!runs.length) return '🏃 Aucune course enregistrée pour l\'analyse.';
    const prompt = `Analyse mes ${runs.length} dernières courses. Données: ${JSON.stringify(runs)}.
Évalue ma progression, mon niveau d\'endurance, et propose des objectifs réalistes.`;
    return await this.request([{ role: 'user', content: prompt }], this.systemPrompt());
  }
};
