// Each game lives in its own folder with:
//   - index.html (the game)
//   - screenshot.png (shown on the portal)
const games = [
  {
    name: "Snake",
    description: "Classic snake game",
    folder: "snake"
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
      <img class="thumbnail" src="/${game.folder}/image.png" alt="${game.name}">
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
