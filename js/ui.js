// ============================================================
// FITCOACH PRO - UI Utilities
// ============================================================

// ── Toast notifications ──
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', pr: '🏆' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ── Modal ──
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Page navigation ──
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  const navItem = document.querySelector(`[data-page="${pageId}"]`);

  if (page) page.classList.add('active');
  if (navItem) navItem.classList.add('active');

  // Update header title
  const titles = {
    dashboard: 'Dashboard', workout: 'Musculation', running: 'Course à pied',
    combat: 'Sports de Combat', analysis: 'Analyse & Progression',
    recovery: 'Récupération', nutrition: 'Nutrition', gamification: 'Achievements',
    planning: 'Planification', settings: 'Paramètres'
  };
  const titleEl = document.getElementById('header-title');
  if (titleEl) titleEl.textContent = titles[pageId] || pageId;

  // Refresh page-specific data
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'analysis') renderAnalysis();
  if (pageId === 'gamification') renderGamification();
  if (pageId === 'planning') renderCalendar();
  if (pageId === 'recovery') renderRecovery();
  if (pageId === 'nutrition') renderNutrition();
  if (pageId === 'workout') renderWorkoutHistory();
  if (pageId === 'running') renderRunHistory();
  if (pageId === 'combat') renderCombatHistory();
}

// ── Tabs ──
function initTabs(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.dataset.group;
      const target = tab.dataset.tab;
      containerEl.querySelectorAll(`.tab[data-group="${group}"]`).forEach(t => t.classList.remove('active'));
      containerEl.querySelectorAll(`.tab-content[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = containerEl.querySelector(`.tab-content[data-tab="${target}"][data-group="${group}"]`);
      if (content) content.classList.add('active');
    });
  });
}

// ── Charts (using Chart.js) ──
const chartInstances = {};

function createLineChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#b0b0c8', font: { family: 'DM Sans', size: 12 } }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#707088', font: { family: 'JetBrains Mono', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#707088', font: { family: 'JetBrains Mono', size: 11 } }
      }
    }
  };

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: { ...defaults, ...options }
  });
}

function createBarChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#b0b0c8', font: { family: 'DM Sans' } } }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#707088' }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#707088' }
        }
      },
      ...options
    }
  });
}

function createDoughnutChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: 'transparent', borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { labels: { color: '#b0b0c8', font: { family: 'DM Sans', size: 12 }, padding: 16 } }
      }
    }
  });
}

// ── AI Panel ──
const aiHistory = [];

function toggleAIPanel() {
  const panel = document.getElementById('ai-panel');
  const btn = document.getElementById('ai-toggle-btn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.textContent = isOpen ? '✕' : '🤖';
  if (isOpen && aiHistory.length === 0) sendAIWelcome();
}

async function sendAIWelcome() {
  const p = state.profile;
  const total = state.workouts.length;
  const msg = `Bonjour ${p.name} ! 💪 Tu as ${total} séances au compteur et ${p.streak} jours de streak. Comment puis-je t'aider aujourd'hui ? (Pose-moi une question ou demande une analyse de tes performances)`;
  addAIMessage(msg, 'coach');
}

function addAIMessage(text, role = 'coach') {
  aiHistory.push({ role, content: text });
  const container = document.getElementById('ai-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `ai-msg ${role === 'user' ? 'user' : ''}`;
  div.innerHTML = `
    <div class="ai-msg-avatar ${role === 'user' ? 'user-av' : 'coach'}">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="ai-msg-bubble ${role === 'coach' ? 'coach-bubble' : ''}">${text.replace(/\n/g, '<br>')}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  addAIMessage(text, 'user');
  input.value = '';

  const typing = document.createElement('div');
  typing.className = 'ai-msg';
  typing.id = 'ai-typing';
  typing.innerHTML = `<div class="ai-msg-avatar coach">🤖</div><div class="ai-msg-bubble coach-bubble"><span class="spinner"></span> Analyse en cours...</div>`;
  document.getElementById('ai-messages').appendChild(typing);
  document.getElementById('ai-messages').scrollTop = 9999;

  const response = await AI.chat(text, aiHistory.slice(-10));
  document.getElementById('ai-typing')?.remove();
  addAIMessage(response, 'coach');
}

// ── Timer Module ──
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

function startTimer(seconds) {
  timerSeconds = seconds;
  timerRunning = true;
  renderTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      stopTimer();
      showToast('⏱️ Temps de repos terminé !', 'success');
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    timerSeconds--;
    renderTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  timerRunning = !timerRunning;
  if (timerRunning) {
    timerInterval = setInterval(() => {
      if (timerSeconds <= 0) { stopTimer(); return; }
      timerSeconds--;
      renderTimerDisplay();
    }, 1000);
  } else {
    clearInterval(timerInterval);
  }
  renderTimerDisplay();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 0;
  renderTimerDisplay();
}

function renderTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  el.textContent = timeStr(timerSeconds);
  el.className = `timer-display ${timerRunning ? 'running' : timerSeconds > 0 ? 'paused' : ''}`;
}

// ── Export ──
function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitcoach-export-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Données exportées avec succès', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      Object.assign(state, imported);
      saveState();
      showToast('📥 Données importées', 'success');
      setTimeout(() => location.reload(), 800);
    } catch {
      showToast('❌ Fichier invalide', 'error');
    }
  };
  reader.readAsText(file);
}

// ── Header date ──
function updateHeaderDate() {
  const el = document.getElementById('header-date');
  if (!el) return;
  const now = new Date();
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  el.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ── Muscle Group Colors ──
const MUSCLE_COLORS = {
  'Pectoraux': '#ff4d1c',
  'Dos': '#00e5ff',
  'Épaules': '#ffd166',
  'Biceps': '#06d6a0',
  'Triceps': '#9b5de5',
  'Quadriceps': '#f72585',
  'Ischio-jambiers': '#4cc9f0',
  'Mollets': '#7209b7',
  'Abdominaux': '#3a86ff',
  'Fessiers': '#fb5607',
};

// ── Format pace ──
function formatPace(pace) {
  if (!pace) return '-';
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

// ── VO2 Max estimation ──
function estimateVO2Max(runs) {
  if (!runs.length) return null;
  const recent = runs.slice(-5);
  const avgPace = recent.reduce((s, r) => s + (r.pace || 0), 0) / recent.length;
  if (!avgPace) return null;
  const speedKmH = 60 / avgPace;
  return Math.round(speedKmH * 3.5);
}

// ── Weekly volume by muscle ──
function weeklyVolume() {
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weekWorkouts = state.workouts.filter(w => w.date >= oneWeekAgo);
  const vol = {};
  weekWorkouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      const lib = state.exercises_library.find(e => e.id === ex.exerciseId);
      const muscle = lib?.muscle || ex.muscle || 'Autre';
      const v = calcVolume(ex.sets || []);
      vol[muscle] = (vol[muscle] || 0) + v;
    });
  });
  return vol;
}
