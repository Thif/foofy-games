// Each game lives in its own folder with:
//   - index.html (the game)
//   - screenshot.png (shown on the portal)
const games = [
  {
    name: "Snake",
    description: "Classic snake game",
    folder: "snake"
  },
  {
    name: "King Pinguin",
    description: "Penguin adventure game",
    folder: "kingpinguin"
  },
  {
    name: "Shoot Balloon",
    description: "Pop the balloons!",
    folder: "shootballoon"
  },
  {
    name: "Space Invaders",
    description: "Defend Earth from alien waves",
    folder: "space-invaders"
  },
  {
    name: "Tetris",
    description: "Stack and clear falling blocks",
    folder: "tetris"
  },
  {
    name: "Pong",
    description: "Classic paddle ball vs AI",
    folder: "pong"
  },
  {
    name: "Breakout",
    description: "Smash bricks with a bouncing ball",
    folder: "breakout"
  },
  {
    name: "Flappy Bird",
    description: "Tap to fly through the pipes",
    folder: "flappy-bird"
  },
  {
    name: "Minesweeper",
    description: "Find all mines without clicking one",
    folder: "minesweeper"
  },
];

function renderGames() {
  const grid = document.getElementById("games-grid");

  if (games.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No games yet — add your first game!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = games
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

renderGames();
