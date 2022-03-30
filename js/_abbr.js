$(document).ready(() => {
	const abbrs = $('abbr[data-title]');
	abbrs.on('click', function() {
		const msg = this.innerText + " = " + this.getAttribute('data-title');
		alert(msg);
	});
});