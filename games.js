// Add your games here. Each game needs a name, description, emoji, and url.
const games = [
  // Example:
  // {
  //   name: "Snake",
  //   description: "Classic snake game",
  //   emoji: "🐍",
  //   url: "/snake/"
  // },
];

function renderGames() {
  const grid = document.getElementById("games-grid");

  if (games.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No games yet — add your first game to games.js!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = games
    .map(
      (game) => `
    <a class="game-card" href="${game.url}">
      <div class="thumbnail">${game.emoji}</div>
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
