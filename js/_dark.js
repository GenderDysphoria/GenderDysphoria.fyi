(function () {
  // Check if local storage is available and if dark mode is set; overrides everything else
  if (window.localStorage && window.localStorage.getItem('dark-mode') !== null) {
    if (window.localStorage.getItem('dark-mode') === 'true') {
      document.documentElement.classList.add('dark-mode');
    }
  // Evaluate device preferences
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark-mode');
  }
}());

$(function () {
  $('.dark-toggle').on('click', function toggleDarkMode () {
    if (document.documentElement.classList.contains('dark-mode')) {
      document.documentElement.classList.remove('dark-mode');
      window.localStorage.setItem('dark-mode', 'false');
    } else {
      document.documentElement.classList.add('dark-mode');
      window.localStorage.setItem('dark-mode', 'true');
    }
  });
});
