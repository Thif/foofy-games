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
    name: "Quiz",
    description: "Trivia questions on various topics",
    folder: "quiz",
    categories: ["educational", "puzzle"]
  },
  {
    name: "Ordbok",
    description: "Gjett det norske ordet på 6 forsøk",
    folder: "ordbok",
    categories: ["puzzle", "educational"]
  },
  {
    name: "Tre på rad",
    description: "Slå AI-en i tre på rad",
    folder: "tre-paa-rad",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Kabal",
    description: "Klassisk Klondike-kabal",
    folder: "kabal",
    categories: ["classic", "puzzle"]
  },
  {
    name: "Geografi-quiz",
    description: "Test geografikunnskapene dine",
    folder: "geografi",
    categories: ["educational", "puzzle"]
  },
  {
    name: "Tegn og gjett",
    description: "Tegn ordet og se om du klarer det",
    folder: "tegn-og-gjett",
    categories: ["action", "puzzle"]
  },
];

let excluded = [];
let activeCategories = new Set();
let showFavoritesOnly = false;

async function loadExclusions() {
  try {
    const res = await fetch("/exclude.yaml");
    if (!res.ok) return;
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

function buildCategoryFilters() {
  const allCats = new Set();
  games.forEach(g => (g.categories || []).forEach(c => allCats.add(c)));

  const container = document.getElementById("category-filters");

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.className = "cat-btn active";
  allBtn.onclick = () => {
    activeCategories.clear();
    showFavoritesOnly = false;
    container.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    renderGames();
  };
  container.appendChild(allBtn);

  const favBtn = document.createElement("button");
  favBtn.textContent = "❤ Favoritter";
  favBtn.className = "cat-btn";
  favBtn.onclick = () => {
    showFavoritesOnly = !showFavoritesOnly;
    favBtn.classList.toggle("active", showFavoritesOnly);
    if (showFavoritesOnly) {
      allBtn.classList.remove("active");
    } else if (activeCategories.size === 0) {
      allBtn.classList.add("active");
    }
    renderGames();
  };
  container.appendChild(favBtn);

  [...allCats].sort().forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.className = "cat-btn";
    btn.onclick = () => {
      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        btn.classList.remove("active");
      } else {
        activeCategories.add(cat);
        btn.classList.add("active");
      }
      allBtn.classList.toggle("active", activeCategories.size === 0);
      renderGames();
    };
    container.appendChild(btn);
  });


}

function renderGames() {
  const grid = document.getElementById("games-grid");

  let visible = games.filter(g => !excluded.includes(g.folder));

  if (showFavoritesOnly) {
    const favs = getFavorites();
    visible = visible.filter(g => favs.includes(g.folder));
  }

  if (activeCategories.size > 0) {
    visible = visible.filter(g =>
      (g.categories || []).some(c => activeCategories.has(c))
    );
  }

  // Sort favorites first
  const favs = getFavorites();
  visible.sort((a, b) => {
    const aFav = favs.includes(a.folder) ? 0 : 1;
    const bFav = favs.includes(b.folder) ? 0 : 1;
    return aFav - bFav;
  });

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
      (game) => {
        const fav = isFavorite(game.folder);
        const heartClass = fav ? 'fav-heart favorited' : 'fav-heart';
        const heartSymbol = fav ? '&#9829;' : '&#9825;';
        return `
    <div class="game-card-wrapper">
      <button class="${heartClass}" data-folder="${game.folder}" aria-label="Favoritt">${heartSymbol}</button>
      <a class="game-card" href="/${game.folder}/">
        <img class="thumbnail" src="/${game.folder}/image.png" alt="${game.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="thumbnail placeholder" style="display:none">${game.name[0]}</div>
        <div class="info">
          <h2>${game.name}</h2>
          <p>${game.description}</p>
        </div>
      </a>
    </div>
  `;
      }
    )
    .join("");

  // Attach heart click handlers
  grid.querySelectorAll('.fav-heart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(btn.dataset.folder);
      renderGames();
    });
  });
}

async function init() {
  await loadExclusions();
  buildCategoryFilters();
  renderGames();
}

init();
