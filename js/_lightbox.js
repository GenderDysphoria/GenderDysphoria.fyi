$(function () {

  $('.lightbox, .gutter, .tweet-entities').each(function () {
    $(this).magnificPopup({
      delegate: 'a.lb',
      type: 'image',
      closeOnContentClick: false,
      closeBtnInside: false,
      mainClass: 'mfp-with-zoom mfp-img-mobile',
      image: {
        verticalFit: true,
      },
      gallery: {
        enabled: true,
      },
    });
  });

});
