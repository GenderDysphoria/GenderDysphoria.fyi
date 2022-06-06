// Prevent the <a> inside <dfn> from messing up with scrolling
$(document).ready(() => {
	const dfns = $('dfn.glossed-main > a');
	dfns.on('click', function(evt) {
		evt.preventDefault();
	});
});