$(function () {
  let active = false;
  window.addEventListener('scroll', function () {
    const state = window.scrollY > 10;
    if (active !== state) {
      $('header').toggleClass('active', state);
      active = state;
    }
  });
});
