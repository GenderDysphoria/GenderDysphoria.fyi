(function ($) {

  $('.lightbox, .gutter').each(function () {
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
      zoom: {
        enabled: true,
        duration: 300, // don't foget to change the duration also in CSS
        opener: function (element) {
          return element.find('img');
        },
      },
    });
  });

}(window.jQuery));
