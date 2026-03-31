// Each game lives in its own folder with:
//   - index.html (the game)
//   - screenshot.png (shown on the portal)
const games = [
  {
    name: "Snake",
    description: "Classic snake game",
    folder: "snake",
    categories: ["classic", "arcade"]
  },
  {
    name: "King Pinguin",
    description: "Penguin adventure game",
    folder: "kingpinguin",
    categories: ["action", "adventure"]
  },
  {
    name: "Shoot Balloon",
    description: "Pop the balloons!",
    folder: "shootballoon",
    categories: ["action", "arcade"]
  },
  {
    name: "Space Invaders",
    description: "Defend Earth from alien waves",
    folder: "space-invaders",
    categories: ["classic", "arcade"]
  },
  {
    name: "Tetris",
    description: "Stack and clear falling blocks",
    folder: "tetris",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Pong",
    description: "Classic paddle ball vs AI",
    folder: "pong",
    categories: ["classic", "arcade"]
  },
  {
    name: "Breakout",
    description: "Smash bricks with a bouncing ball",
    folder: "breakout",
    categories: ["classic", "arcade"]
  },
  {
    name: "Flappy Bird",
    description: "Tap to fly through the pipes",
    folder: "flappy-bird",
    categories: ["action", "arcade"]
  },
  {
    name: "Minesweeper",
    description: "Find all mines without clicking one",
    folder: "minesweeper",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Easter Mistery",
    description: "Find 5 hidden eggs in a busy cartoon scene",
    folder: "eastermistery",
    categories: ["puzzle", "seasonal"]
  },
  {
    name: "Multiply",
    description: "Test your multiplication skills",
    folder: "multiply",
    categories: ["educational"]
  },
  {
    name: "Divide",
    description: "Test your division skills",
    folder: "divide",
    categories: ["educational"]
  },
  {
    name: "Memory",
    description: "Classic card matching game",
    folder: "memory",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Word Scramble",
    description: "Unscramble letters to form words",
    folder: "word-scramble",
    categories: ["educational", "puzzle"]
  },
  {
    name: "Math Race",
    description: "Solve +, -, x, ÷ against the clock",
    folder: "math-race",
    categories: ["educational", "arcade"]
  },
  {
    name: "Hangman",
    description: "Guess the word before it's too late",
    folder: "hangman",
    categories: ["classic", "puzzle"]
  },
  {
    name: "2048",
    description: "Slide and merge tiles to reach 2048",
    folder: "2048",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Typing Speed",
    description: "How fast can you type?",
    folder: "typing-speed",
    categories: ["educational", "arcade"]
  },
  {
    name: "Quiz",
    description: "Trivia questions on various topics",
    folder: "quiz",
    categories: ["educational", "puzzle"]
  },
];

let excluded = [];
let activeCategories = new Set();

async function loadExclusions() {
  try {
    const res = await fetch("/exclude.yaml");
    const text = await res.text();
    const match = text.match(/^excluded:\s*\[([^\]]*)\]/m);
    if (match && match[1].trim()) {
      excluded = match[1].split(",").map(s => s.trim().replace(/['"]/g, ""));
    } else {
      const lines = text.split("\n");
      for (const line of lines) {
        const entry = line.match(/^\s*-\s+(.+)/);
        if (entry) excluded.push(entry[1].trim());
      }
    }
  } catch (e) {}
}

const btnStyle = `
  padding: 0.5rem 1.4rem;
  border: none;
  border-radius: 20px;
  background: #1a1a2e;
  color: #999;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s;
`;
const btnActiveStyle = `
  padding: 0.5rem 1.4rem;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #ff6b6b, #ffd93d);
  color: #0f0f1a;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s;
`;

function updateButtonStyles() {
  document.querySelectorAll("[data-cat-btn]").forEach(btn => {
    const isActive = btn.classList.contains("active");
    btn.style.cssText = isActive ? btnActiveStyle : btnStyle;
  });
}

function buildCategoryFilters() {
  const allCats = new Set();
  games.forEach(g => (g.categories || []).forEach(c => allCats.add(c)));

  const container = document.getElementById("category-filters");
  container.style.cssText = "display:flex; flex-wrap:wrap; gap:0.6rem; justify-content:center; margin-bottom:2rem; padding:1rem;";

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.classList.add("active");
  allBtn.setAttribute("data-cat-btn", "");
  allBtn.onclick = () => {
    activeCategories.clear();
    document.querySelectorAll("[data-cat-btn]").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    updateButtonStyles();
    renderGames();
  };
  container.appendChild(allBtn);

  [...allCats].sort().forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.setAttribute("data-cat-btn", "");
    btn.onclick = () => {
      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        btn.classList.remove("active");
      } else {
        activeCategories.add(cat);
        btn.classList.add("active");
      }
      allBtn.classList.toggle("active", activeCategories.size === 0);
      updateButtonStyles();
      renderGames();
    };
    container.appendChild(btn);
  });

  updateButtonStyles();
}

function renderGames() {
  const grid = document.getElementById("games-grid");

  let visible = games.filter(g => !excluded.includes(g.folder));

  if (activeCategories.size > 0) {
    visible = visible.filter(g =>
      (g.categories || []).some(c => activeCategories.has(c))
    );
  }

  if (visible.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No games found</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = visible
    .map(
      (game) => `
    <a class="game-card" href="/${game.folder}/">
      <img class="thumbnail" src="/${game.folder}/image.png" alt="${game.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="thumbnail placeholder" style="display:none">${game.name[0]}</div>
      <div class="info">
        <h2>${game.name}</h2>
        <p>${game.description}</p>
      </div>
    </a>
  `
    )
    .join("");
}

async function init() {
  await loadExclusions();
  buildCategoryFilters();
  renderGames();
}

init();
