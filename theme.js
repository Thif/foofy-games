(function() {
  var saved = localStorage.getItem('foofy_theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();
document.getElementById('theme-toggle').addEventListener('click', function() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('foofy_theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('foofy_theme', 'dark');
  }
});
