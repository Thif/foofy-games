// Player Profile: name modal + greeting
function getPlayerName() {
  return localStorage.getItem('foofy_player_name') || '';
}

function setPlayerName(name) {
  localStorage.setItem('foofy_player_name', name);
}

function showNameModal() {
  document.getElementById('name-modal').classList.add('visible');
  document.getElementById('name-input').focus();
}

function hideNameModal() {
  document.getElementById('name-modal').classList.remove('visible');
}

function savePlayerName() {
  const input = document.getElementById('name-input');
  const name = input.value.trim();
  if (!name) return;
  setPlayerName(name);
  hideNameModal();
  updateGreeting();
}

function updateGreeting() {
  const name = getPlayerName();
  const el = document.getElementById('player-greeting');
  if (name) {
    el.textContent = '';
    el.appendChild(document.createTextNode('Hei, ' + name + '! '));

    const profileLink = document.createElement('a');
    profileLink.href = '/profil.html';
    profileLink.className = 'profile-link-btn';
    profileLink.setAttribute('aria-label', 'Min profil');
    profileLink.textContent = '\uD83D\uDC64 Min profil';
    el.appendChild(profileLink);

    el.appendChild(document.createTextNode(' '));

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-name-btn';
    editBtn.setAttribute('aria-label', 'Endre navn');
    editBtn.innerHTML = '&#9998;';
    editBtn.addEventListener('click', showNameModal);
    el.appendChild(editBtn);

    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// Favorites helpers
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('foofy_favorites')) || [];
  } catch (e) {
    return [];
  }
}

function toggleFavorite(folder) {
  const favs = getFavorites();
  const idx = favs.indexOf(folder);
  if (idx === -1) {
    favs.push(folder);
  } else {
    favs.splice(idx, 1);
  }
  localStorage.setItem('foofy_favorites', JSON.stringify(favs));
}

function isFavorite(folder) {
  return getFavorites().includes(folder);
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  updateGreeting();
  if (!getPlayerName()) {
    showNameModal();
  }

  // Enter key in name input saves
  document.getElementById('name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') savePlayerName();
  });
});
