# 🏋️ FitCoach Pro

> **Application de suivi sportif et de coaching intelligent avec IA (Mistral)**

![FitCoach Pro](https://img.shields.io/badge/FitCoach-Pro-ff4d1c?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-gold?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![HTML](https://img.shields.io/badge/HTML-CSS-JS-blue?style=flat-square)

FitCoach Pro est une application web complète de suivi sportif qui agit comme un **coach sportif intelligent**, un **tracker de performance avancé** et un **assistant nutritionnel** — le tout dans une seule interface.

---
## Accès 
Application : [FitCoach-Pro](https://florencelc.github.io/FitCoach-Pro/)

## ✨ Fonctionnalités

### 🏋️ Musculation
- Log des séances avec exercices, séries, reps, poids, temps de repos
- Détection automatique des **records personnels (PR)**
- Calcul du volume total par séance
- Historique complet des séances
- **Génération IA** de séances personnalisées (Mistral)

### 🏃 Course à pied
- Enregistrement des courses (distance, temps, allure)
- Types : Endurance, Fractionné, Tempo, Sortie longue
- Calcul automatique de l'allure (min/km)
- Estimation du **VO2 Max**
- Analyse IA de la progression

### 🥊 Sports de Combat
- Krav Maga, Boxe, MMA, Muay Thai, Jiu-Jitsu
- Types : Technique, Sparring, Cardio
- Estimation des calories brûlées
- Analyse de charge physique

### 📅 Planification
- Calendrier mensuel interactif
- Planification des séances à la semaine
- **Planning IA** — génération automatique d'un programme équilibré
- Gestion des séances récurrentes

### 📊 Analyse & Progression
- Courbes de volume (30 jours)
- Progression allure course
- Répartition par groupe musculaire (graphique donut)
- Records personnels par exercice
- **Analyse IA hebdomadaire** avec recommandations

### 😴 Récupération
- Suivi sommeil et fatigue
- Enregistrement des douleurs/blessures
- Graphique d'évolution
- **Recommandations IA** : repos, séance légère ou normale

### 🥗 Nutrition
- Calcul BMR (Mifflin-St Jeor)
- Calcul TDEE selon niveau d'activité
- Répartition macronutriments (protéines/glucides/lipides)
- Log quotidien des calories
- **Recommandations IA** personnalisées
- Graphique de répartition des macros

### 🏆 Gamification
- Système de **streak** (jours consécutifs)
- **9 badges** à débloquer
- Système de **niveaux et XP**
- Barre de progression vers le niveau suivant

### ⏱️ Outils
- Timer de repos intégré (30s, 1min, 1:30, 2min, 3min)
- Mode démarrage rapide
- Export / Import des données (JSON)

### 🤖 CoachIA (Mistral)
- Chat en temps réel avec votre coach
- Génération de séances muscu
- Analyse hebdomadaire intelligente
- Planning optimisé anti-surentraînement
- Conseils nutrition personnalisés
- Conseils récupération

---

## 🚀 Installation & Déploiement

### Option 1 : Ouvrir directement
```bash
# Cloner le repo
git clone https://github.com/votre-username/fitcoach-pro.git
cd fitcoach-pro

# Ouvrir dans le navigateur
open index.html
```

> ⚠️ Pour l'IA Mistral, vous devez servir l'application via un serveur HTTP (pas en `file://`) à cause des restrictions CORS.

### Option 2 : Serveur local (recommandé)
```bash
# Avec Python
python3 -m http.server 8080

# Avec Node.js
npx serve .

# Avec PHP
php -S localhost:8080
```

Puis ouvrir : `http://localhost:8080`

### Option 3 : GitHub Pages
1. Pusher le code sur GitHub
2. Aller dans Settings → Pages
3. Source : `main` branch, `/ (root)`
4. Votre app sera disponible sur `https://votre-username.github.io/fitcoach-pro`

### Option 4 : Netlify / Vercel
Glisser-déposer le dossier sur [netlify.com/drop](https://netlify.com/drop) — déploiement instantané !

---

## 🔑 Configuration de l'IA

1. Créer un compte sur [console.mistral.ai](https://console.mistral.ai)
2. Générer une clé API (gratuite avec quota)
3. Dans l'app : **Paramètres → Intelligence Artificielle**
4. Coller votre clé API et sauvegarder

> La clé est stockée localement dans votre navigateur (localStorage). Elle n'est jamais envoyée ailleurs que vers l'API Mistral.

---

## 🏗️ Structure du projet

```
fitcoach-pro/
├── index.html          # Application principale (HTML)
├── css/
│   └── style.css       # Design system complet
├── js/
│   ├── db.js           # Couche données (localStorage)
│   ├── ai.js           # Module IA (Mistral API)
│   ├── ui.js           # Utilitaires UI (toast, charts, modals)
│   └── pages.js        # Logique de chaque page
└── README.md
```

---

## 🛠️ Technologies

| Technologie | Usage |
|-------------|-------|
| HTML5/CSS3/JS Vanilla | Frontend |
| Chart.js 4.x | Graphiques |
| Mistral AI API | Intelligence artificielle |
| localStorage | Persistence des données |
| Google Fonts | Typographie (Bebas Neue, DM Sans, JetBrains Mono) |

---

## 📱 Compatibilité

- ✅ Chrome / Edge (recommandé)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (responsive)
- ✅ Mode offline (sans les fonctions IA)

---

## 🗄️ Données & Confidentialité

- **100% local** : toutes les données sont stockées dans le `localStorage` de votre navigateur
- Aucun compte requis
- Aucun serveur backend
- Export/Import en JSON pour sauvegarder ou migrer vos données
- Seules les requêtes IA sont envoyées à l'API Mistral

---

## 🎮 Système de XP

| Action | XP |
|--------|-----|
| Séance musculation | +30 XP |
| Par exercice | +5 XP |
| Course (par km) | +5 XP/km |
| Séance combat | +20 XP |

| Niveau | XP requis |
|--------|-----------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| 6 | 1 400 |
| 7 | 2 100 |
| 8 | 3 000 |
| 9 | 4 200 |
| 10 | 6 000 |

---

## 🏅 Badges disponibles

| Badge | Condition |
|-------|-----------|
| 🏋️ Premier pas | Première séance |
| 🔥 7 jours | 7 jours de streak |
| ⚡ 30 jours | 30 jours de streak |
| 🏆 PR Hunter | Premier record battu |
| 🏃 10K Club | Course de 10 km |
| ⭐ Niveau 5 | Atteindre le niveau 5 |
| 💯 Centenaire | 100 séances totales |
| 🥊 Combattant | 10 séances de combat |
| 🥗 Nutritioniste | 7 jours de suivi nutrition |

---

## 🔧 Personnalisation

### Ajouter des exercices
Dans `js/db.js`, fonction `defaultExercises()` :
```javascript
{ id: 'exN', name: 'Mon exercice', muscle: 'Groupe musculaire', type: 'compound' }
```

### Modifier les niveaux XP
Dans `js/db.js` :
```javascript
const XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];
```

### Changer le modèle IA
Dans `js/ai.js` :
```javascript
model: 'mistral-large-latest' // ou 'mistral-small-latest', 'open-mistral-7b'
```

---

## 📄 Licence

MIT — Libre d'utilisation, modification et distribution.

---

## 🤝 Contribuer

Les contributions sont bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Commit (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

---

<div align="center">
  <strong>FitCoach Pro</strong> — Forgé pour les athlètes, propulsé par l'IA 🔥
</div>
