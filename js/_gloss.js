function new_scroll_fixer(evt_name) {
	return function (evt) {
		let block_elem = evt.currentTarget;
		let block_vo = block_elem.getBoundingClientRect();
		let tooltip_elem = block_elem.getElementsByClassName("glossed-tooltip")[0];
		if (window.innerWidth < 800) {
			let rel_top = block_vo.top+block_elem.clientHeight;
			tooltip_elem.style = 'top: '+rel_top+'px';
		} else {
			tooltip_elem.style = '';
		}
	}
}

$(document).ready(() => {
	const dfns_a = $('dfn.glossed-main > a');
	// Prevent the <a> inside <dfn> from messing up with scrolling
	dfns_a.on('click', function(evt) {
		evt.preventDefault();
	});

	// Reposition the tooltips to just below the glossed word
	const dfns_blocks = $('span.glossed-block');
	dfns_blocks.on('keydown', new_scroll_fixer('keydown'));
	dfns_blocks.on('mouseover', new_scroll_fixer('mouseover'));
	dfns_blocks.on('touchmove', new_scroll_fixer('touchmove'));
});