module.exports = exports = {
	glossary_url: '/en/glossary',
	lang: 'en',
	entries: {
		'i.e.': {
			sortAs: 'i e',
			title: 'i.e.',
			description: ['Abbreviation of _id est_ meaning _this is_.'],
			show: true,
			words: {
				'i.e.': {
					class: 'abbreviation',
					auto_gloss: true,
					show: true,
					relation: '='
				}
			}
		},
		'agab': {
			sortAs: 'AGAB',
			title: 'A·GAB',
			description: ['Assigned Gender At Birth.'],
			show: true,
			words: {
				'AGAB': {
					class: 'noun',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'AGABs': {
					class: 'noun',
					auto_gloss: true,
					show: true,
					relation: 'plural'
				},
			}
		},
		'transgender': {
			sortAs: 'transgender',
			title: 'trans·gen·der',
			description: ['A person whose gender identity does not match the their AGAB (gender assigend at birth).'],
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
			sortAs: 'AMAB',
			title: 'A·MAB',
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
			sortAs: 'AFAB',
			title: 'A·FAB',
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
			sortAs: 'GLAAD',
			title: 'GLAAD',
			description: ['An american organization that protests defamatory coverage of queer people and pushes for their acceptance.', ' Oficial website: https://www.glaad.org/'],
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