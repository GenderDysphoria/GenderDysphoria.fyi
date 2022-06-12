module.exports = exports = {
	glossary_url: '/en/glossary',
	lang: 'en',
	word_break_by_regex: true, // only useful for Chinese
	entries: {
		'transgender': {
			title: 'trans·gen·der',
			description: ['A person whose gender identity does not match the their gender assigend at birth.'],
			show: true,
			words: {
				'transgender': {
					class: 'adjective',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'trans': {
					class: 'adjective',
					auto_gloss: true,
					show: true,
					relation: 'abbreviation'
				},
			}
		},
		'amab': {
			title: 'AMAB',
			description: ['Assinged Male At Birth.'],
			show: true,
			show_in_print: true,
			words: {
				'AMAB': {
					class: 'noun',
					auto_gloss: true,
					show: true,
					relation: '=',
					pronunciations: {
						common: 'EY-MABB',
					}
				},
				'AMABs': {
					class: 'noun',
					auto_gloss: true,
					show: false,
					relation: 'plural'
				}
			}
		},
		'afab': {
			title: 'AFAB',
			description: ['Assinged Female At Birth.'],
			show: true,
			show_in_print: true,
			words: {
				'AFAB': {
					class: 'noun',
					auto_gloss: true,
					show: true,
					relation: '=',
					pronunciations: {
						common: 'EY-FABB',
					}
				},
				'AFABs': {
					class: 'noun',
					auto_gloss: true,
					show: false,
					relation: 'plural'
				}
			}
		},
		'GLAAD': {
			title: 'GLAAD',
			description: ['An americna organization that protests defamatory coverage of queer people and pushes for their acceptance.', ' Oficial website: https://www.glaad.org/'],
			show: true,
			words: {
				'GLADD': {
					class: 'noun',
					auto_gloss: true,
					show: true,
					relation: '=',
					pronunciations: {
						ipa: '/ɡlæd/',
					}
				}
			}
		},
	},
}