// Global achievements system for Spillverksted
// Games call: unlockAchievement('achievement_id') or reportEvent('event_name', value)

const ACHIEVEMENTS = [
  // Snake
  { id: "snake_10", name: "Slange-nybegynner", description: "Nå 10 poeng i Snake", icon: "🐍", game: "snake" },
  { id: "snake_25", name: "Slange-mester", description: "Nå 25 poeng i Snake", icon: "🐍", game: "snake" },

  // Space Invaders
  { id: "invaders_wave3", name: "Romforsvarer", description: "Klarer 3 bølger i Space Invaders", icon: "👾", game: "space-invaders" },
  { id: "invaders_wave5", name: "Galaktisk helt", description: "Klarer 5 bølger i Space Invaders", icon: "🛸", game: "space-invaders" },

  // Tetris
  { id: "tetris_1000", name: "Tetris-talent", description: "Nå 1000 poeng i Tetris", icon: "🧱", game: "tetris" },
  { id: "tetris_lines_10", name: "Linjesletter", description: "Fjern 10 linjer i Tetris", icon: "📏", game: "tetris" },

  // Pong
  { id: "pong_win", name: "Pong-vinner", description: "Slå AI-en i Pong", icon: "🏓", game: "pong" },
  { id: "pong_flawless", name: "Feilfri", description: "Vinn Pong uten å tape et poeng", icon: "✨", game: "pong" },

  // Breakout
  { id: "breakout_clear", name: "Murknuser", description: "Klarer et brett i Breakout", icon: "🧱", game: "breakout" },
  { id: "breakout_level3", name: "Breakout-proff", description: "Nå nivå 3 i Breakout", icon: "💥", game: "breakout" },

  // Minesweeper
  { id: "minesweeper_win", name: "Minerydder", description: "Vinn en runde Minesweeper", icon: "💣", game: "minesweeper" },
  { id: "minesweeper_fast", name: "Lynrask rydder", description: "Vinn Minesweeper på under 2 minutter", icon: "⚡", game: "minesweeper" },

  // Easter Mistery
  { id: "easter_5", name: "Eggjeger", description: "Finn alle 5 egg i en scene", icon: "🥚", game: "eastermistery" },
  { id: "easter_fast", name: "Lyneggjakt", description: "Finn alle egg på under 30 sekunder", icon: "🏃", game: "eastermistery" },
  { id: "easter_all_scenes", name: "Scenesamler", description: "Fullfør alle scener i Easter Mistery", icon: "🌍", game: "eastermistery" },

  // Multiply
  { id: "multiply_perfect", name: "Gangemester", description: "Få 10/10 i Multiply", icon: "✖️", game: "multiply" },
  { id: "multiply_streak5", name: "Gangerekke", description: "5 riktige på rad i Multiply", icon: "🔥", game: "multiply" },

  // Divide
  { id: "divide_perfect", name: "Delemester", description: "Få 10/10 i Divide", icon: "➗", game: "divide" },

  // Memory
  { id: "memory_win", name: "God hukommelse", description: "Fullfør Memory", icon: "🃏", game: "memory" },
  { id: "memory_fast", name: "Lynhukommelse", description: "Fullfør Memory på under 60 sekunder", icon: "⏱️", game: "memory" },

  // Math Race
  { id: "mathrace_20", name: "Regnestjerne", description: "Nå 20 poeng i Math Race", icon: "🔢", game: "math-race" },
  { id: "mathrace_streak10", name: "Reknerekke", description: "10 riktige på rad i Math Race", icon: "🔥", game: "math-race" },

  // Hangman
  { id: "hangman_win3", name: "Ordgjetter", description: "Vinn 3 runder Hangman", icon: "📝", game: "hangman" },
  { id: "hangman_flawless", name: "Perfekt gjetting", description: "Vinn Hangman uten feil", icon: "🎯", game: "hangman" },

  // 2048
  { id: "2048_512", name: "Halvveis", description: "Nå 512-brikken i 2048", icon: "5️⃣", game: "2048" },
  { id: "2048_win", name: "2048!", description: "Nå 2048-brikken", icon: "🏆", game: "2048" },

  // Quiz
  { id: "quiz_perfect", name: "Quizmester", description: "Få 10/10 i Quiz", icon: "🧠", game: "quiz" },
  { id: "quiz_all_cats", name: "Allviter", description: "Spill alle kategorier i Quiz", icon: "📚", game: "quiz" },

  // Cross-game
  { id: "play_5", name: "Utforsker", description: "Spill 5 forskjellige spill", icon: "🗺️", game: null },
  { id: "play_all", name: "Mester av alt", description: "Spill alle spillene", icon: "👑", game: null },
  { id: "perfect_3", name: "Tredobbelt perfekt", description: "Få perfekt score i 3 forskjellige spill", icon: "⭐", game: null },
];

// ── Storage helpers ──

function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem('foofy_achievements') || '[]');
}

function saveUnlockedAchievements(list) {
  localStorage.setItem('foofy_achievements', JSON.stringify(list));
}

function getGameStats() {
  return JSON.parse(localStorage.getItem('foofy_game_stats') || '{}');
}

function saveGameStats(stats) {
  localStorage.setItem('foofy_game_stats', JSON.stringify(stats));
}

// ── Core API (called by games) ──

function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.find(a => a.id === id)) return false;

  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) return false;

  unlocked.push({ id, date: Date.now() });
  saveUnlockedAchievements(unlocked);
  showAchievementPopup(achievement);
  return true;
}

function reportEvent(event, value) {
  const stats = getGameStats();

  // Track games played
  if (event === 'game_played') {
    if (!stats.gamesPlayed) stats.gamesPlayed = [];
    if (!stats.gamesPlayed.includes(value)) {
      stats.gamesPlayed.push(value);
    }
    saveGameStats(stats);

    // Check cross-game achievements
    if (stats.gamesPlayed.length >= 5) unlockAchievement('play_5');
    if (stats.gamesPlayed.length >= getAllGameFolders().length) unlockAchievement('play_all');
  }

  // Track perfect scores
  if (event === 'perfect_score') {
    if (!stats.perfectGames) stats.perfectGames = [];
    if (!stats.perfectGames.includes(value)) {
      stats.perfectGames.push(value);
    }
    saveGameStats(stats);
    if (stats.perfectGames.length >= 3) unlockAchievement('perfect_3');
  }

  // Track quiz categories
  if (event === 'quiz_category') {
    if (!stats.quizCategories) stats.quizCategories = [];
    if (!stats.quizCategories.includes(value)) {
      stats.quizCategories.push(value);
    }
    saveGameStats(stats);
    if (stats.quizCategories.length >= 5) unlockAchievement('quiz_all_cats');
  }

  // Track easter scenes
  if (event === 'easter_scene_complete') {
    if (!stats.easterScenes) stats.easterScenes = [];
    if (!stats.easterScenes.includes(value)) {
      stats.easterScenes.push(value);
    }
    saveGameStats(stats);
  }
}

function getAllGameFolders() {
  return ['snake','space-invaders','tetris','pong','breakout','minesweeper',
          'eastermistery','multiply','divide','memory','math-race','hangman',
          '2048','quiz','kingpinguin','shootballoon'];
}

// ── Popup notification ──

function showAchievementPopup(achievement) {
  const existing = document.getElementById('achievement-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'achievement-popup';
  popup.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:2rem;">${achievement.icon}</span>
      <div>
        <div style="font-weight:700;color:#ffd700;font-size:0.95rem;">Prestasjon låst opp!</div>
        <div style="font-weight:600;font-size:1.05rem;">${achievement.name}</div>
        <div style="font-size:0.8rem;color:#aaa;">${achievement.description}</div>
      </div>
    </div>
  `;
  popup.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1a2e;
    border: 2px solid #ffd700;
    border-radius: 14px;
    padding: 16px 20px;
    color: #e0e0e0;
    font-family: system-ui, sans-serif;
    z-index: 99999;
    animation: achieveSlideIn 0.4s ease, achieveFadeOut 0.4s ease 3s forwards;
    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes achieveSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes achieveFadeOut { from { opacity: 1; } to { opacity: 0; transform: translateX(120%); } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3500);
}

// ── Portal rendering (used by index.html) ──

function renderAchievementsSection() {
  const container = document.getElementById('achievements-section');
  if (!container) return;

  const unlocked = getUnlockedAchievements();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const total = ACHIEVEMENTS.length;
  const earned = unlocked.length;

  let html = `
    <div class="achievements-header">
      <h2>Prestasjoner</h2>
      <span class="achievements-count">${earned} / ${total}</span>
    </div>
    <div class="achievements-grid">
  `;

  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlockedIds.has(a.id);
    html += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" title="${a.description}">
        <span class="achievement-icon">${a.icon}</span>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.description}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
