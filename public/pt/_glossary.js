module.exports = exports = {
	glossary_url: '/pt/glossario',
	lang: 'pt',
	entries: {
		'ex.': {
			sortAs: 'ex',
			title: 'ex.',
			description: ['Abreviatura de _exemplo_.'],
			show: true,
			words: {
				'ex.': {
					class: 'abreviatura',
					auto_gloss: true,
					show: true,
					relation: '='
				}
			}
		},
		'i.e.': {
			sortAs: 'i e',
			title: 'i.e.',
			description: ['Abreviatura de _isto é_.'],
			show: true,
			words: {
				'i.e.': {
					class: 'abreviatura',
					auto_gloss: true,
					show: true,
					relation: '='
				}
			}
		},
		'homem-trans': {
			sortAs: 'homem trans',
			title: 'homem trans',
			description: ['Pessoa DMAN (i.e. “nasceu mulher”) que se identifica como homem.'],
			show: true,
			words: {
				'homem trans': {
					class: 'substantivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'homens trans': {
					class: 'substantivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'homem transgênero': {
					class: 'substantivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'homens transgêneros': {
					class: 'substantivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'trans man': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'trans men': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transman': {
					class: 'substantivo singular - obsoleto e parcialmente ofensivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transmen': {
					class: 'substantivo plural - obsoleto e parcialmente ofensivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transgender man': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transgender men': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'mulher-trans': {
			sortAs: 'mulher trans',
			title: 'mulher trans',
			description: ['Pessoa DHAN (i.e. “nasceu homem”) que se identifica como mulher.'],
			show: true,
			words: {
				'mulher trans': {
					class: 'substantivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'mulheres trans': {
					class: 'substantivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'mulher transgênera': {
					class: 'substantivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'mulheres transgêneras': {
					class: 'substantivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'trans woman': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'trans women': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transwoman': {
					class: 'substantivo singular - obsoleto e parcialmente ofensivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transwomen': {
					class: 'substantivo plural - obsoleto e parcialmente ofensivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transgender woman': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transgender women': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'dman': {
			sortAs: 'DMAN',
			title: 'DMAN',
			description: ['Designade Mulher ao Nascer.'],
			show: true,
			words: {
				'DMAN': {
					class: 'adjetivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'DMANs': {
					class: 'adjetivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'AFAB': {
					class: 'substantivo singular e adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'AFABs': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'dhan': {
			sortAs: 'DHAN',
			title: 'DHAN',
			description: ['Designade Homem ao Nascer.'],
			show: true,
			words: {
				'DHAN': {
					class: 'adjetivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'DHANs': {
					class: 'adjetivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'AMAB': {
					class: 'substantivo singular e adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'AMABs': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'gdan': {
			sortAs: 'GDAN',
			title: 'GDAN',
			description: ['Gênero Designado Ao Nascer.'],
			show: true,
			words: {
				'GDAN': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'GDANs': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'AGAB': {
					class: 'substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'AGABs': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'transgênero': {
			sortAs: 'transgênero',
			title: 'trans·gê·ne·ro',
			description: ['Pessoa cuja identidade de gênero não corresponde aquela atribuída ao nascer.'],
			show: true,
			words: {
				'transgênero': {
					class: 'adjetivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'transgêneros': {
					class: 'adjetivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'transgênera': {
					class: 'adjetivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'transgêneras': {
					class: 'adjetivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'transgênere': {
					class: 'adjetivo neutro singular',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'transgêneres': {
					class: 'adjetivo neutro plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'trans': {
					class: 'adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'abbreviation',
				},
				'transgender': {
					class: 'substantivo singular e adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'transgenders': {
					class: 'adjetivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'cisgênero': {
			sortAs: 'cisgênero',
			title: 'cis·gê·ne·ro',
			description: ['Pessoa cuja identidade de gênero corresponde aquela atribuída ao nascer.'],
			show: true,
			words: {
				'cisgênero': {
					class: 'adjetivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'cisgêneros': {
					class: 'adjetivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'cisgênera': {
					class: 'adjetivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'cisgêneras': {
					class: 'adjetivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'cisgênere': {
					class: 'adjetivo neutro singular',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'cisgêneres': {
					class: 'adjetivo neutro plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'cis': {
					class: 'adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'abbreviation',
				},
				'cisgender': {
					class: 'substantivo singular e adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'cisgenders': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'não-binárie': {
			sortAs: 'não-binárie',
			title: 'não-bi·ná·ri·e',
			description: ['Diz-se daquilo que não se encaixa no binário de gênero, isto é, aquilo que não é homem nem mulher.'],
			show: true,
			words: {
				'não-binário': {
					class: 'adjetivo e substantivo masculino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'não-binários': {
					class: 'adjetivo e substantivo masculino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'não-binária': {
					class: 'adjetivo e substantivo feminino singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'não-binárias': {
					class: 'adjetivo e substantivo feminino plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'não-binárie': {
					class: 'adjetivo e substantivo neutro singular',
					auto_gloss: true,
					show: true,
					relation: '='
				},
				'não-bináries': {
					class: 'adjetivo e substantivo neutro plural',
					auto_gloss: true,
					show: true,
					relation: 'gramatical variant'
				},
				'NB': {
					class: 'adjetivo e substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'abbreviation',
				},
				'NBs': {
					class: 'adjetivo e substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'abbreviation',
				},
				'non-binary': {
					class: 'adjetivo e substantivo singular',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'non-binaries': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'enby': {
					class: 'substantivo singular e adjetivo',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
				'enbies': {
					class: 'substantivo plural',
					auto_gloss: true,
					show: true,
					relation: 'translation:en',
				},
			}
		},
		'GLAAD': {
			sortAs: 'GLAAD',
			title: 'GLAAD',
			description: ['Uma organização estadunidense que protesta cobertura difmatória de pessoas queer e que promove a aceitação das pessoas queer.', 'Sítio-teia oficial: https://www.glaad.org/'],
			show: true,
			words: {
				'GLADD': {
					class: 'substantivo feminino',
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