/*****
 * DOCUMENTATION
 *
 ******/

'use strict';

const { resolve, ROOT, TYPE } = require('./resolve');
const { siteInfo }  = require(resolve('package.json'));
const assert = require('assert');
const path = require('path');
const fsp = require('node:fs/promises');
const fs = require('fs-extra');
const glob = require('./lib/glob');
const log = require('fancy-log');
const Files = require('./files');
const Promise = require('bluebird');
const i18n = require('./lang');

function isBoolean(val) {
	return typeof val === 'boolean';
}

function isString(val) {
	return typeof val === 'string';
}

function isNonEmptyString(val) {
	return typeof val === 'string' && val.length > 0;
}

class Pronunciation {
	_ipa    = undefined;
	_common = undefined;

	constructor(src) {
		if (isNonEmptyString(src.ipa)) {
			this._ipa = src.ipa;
		}
		if (isNonEmptyString(src.common)) {
			this._common = src.common;
		}
	}

	get ipa()    { this._ipa; }
	get common() { this._common; }
}

class Word {
	_word           = undefined;
	_ruby           = undefined;
	_class          = undefined;
	_render_as      = undefined;
	_relation       = undefined;
	_pronunciations = []
	_show           = false;
	_auto_gloss     = false;

	constructor(word, src) {
		if (isNonEmptyString(word)) {
			this._word = word;
		} else {
			throw new Error('Word must have a non empty string as word');
		}
		if (isNonEmptyString(src.render_as)) {
			this._render_as = src.render_as;
		}
		if (isNonEmptyString(src.ruby)) {
			this._ruby = src.ruby;
		}
		if (isNonEmptyString(src.class)) {
			this._class = src.class;
		}
		if (isNonEmptyString(src.relation)) {
			this._relation = src.relation;
		}
		if (Array.isArray(src.pronunciations)) {
			for (let entry of src.pronunciations) {
				this._pronunciations.push(new Pronunciation(entry));
			}
		}
		if (isBoolean(src.show)) {
			this._show = src.show;
		}
		if (isBoolean(src.auto_gloss)) {
			this._auto_gloss = src.auto_gloss;
		}
	}

	get word()           { return this._word; }
	get render_as()      { return this._render_as; }
	get ruby()           { return this._ruby; }
	get class()          { return this._class; }
	get relation()       { return this._relation; }
	get pronunciations() { return this._pronunciations; }
	get show()           { return this._show; }
	get auto_gloss()     { return this._auto_gloss; }
}

class Entry {
	_key = undefined;
	_title = undefined;
	_description = []; //sequence of paragrpahs, only the first is included in tooltip
	_show = false;
	_show_in_print = false;
	_words = new Map();
	
	constructor(key, src) {
		if (isNonEmptyString(key)) {
			this._key = key;
		} else {
			throw new Error('Entry must have a non empty string as key');
		}

		if (isNonEmptyString(src.title)) {
			this._title = src.title;
		} else {
			throw new Error('Entry must have a non empty string as title');
		}

		if (Array.isArray(src.description)) {
			for (let entry of src.description) {
				if (isNonEmptyString(entry)) {
					this._description.push(entry);
				}
			}
		}
		if (isBoolean(src.show)) {
			this._show = src.show;
		}
		if (isBoolean(src.show_in_print)) {
			this._show_in_print = src.show_in_print;
		}
		for (const [key, value] of Object.entries(src.words)) {
			const obj = new Word(key, value);
			if (this._words.has(key)) {
				throw new Error(`duplicate word entry: ${key}`)
			} else {
				this._words.set(key, obj);
			}
		}
	}

	get key()           { return this._key; }
	get title()         { return this._title; }
	get description()   { return this._description; }
	get short()         { return this._description[0] || ''; }
	get show()          { return this._show; }
	get show_in_print() { return this._show_in_print; }
	get words()         { return this._words; }
}

class Glossary {
	_lang;
	_glossary_url        = undefined;
	_words_map           = new Map();
	_words_set           = new Set();
	_entries             = new Map();
	_word_break_by_regex = true;

	constructor(src) {
		if (isNonEmptyString(src.lang)) {
			this._lang = src.lang;
		} else {
			throw new Error('Glossary must have a non empty string as lang');
		}

		if (isNonEmptyString(src.glossary_url)) {
			this._glossary_url = src.glossary_url;
		}

		if (isBoolean(src.word_break_by_regex)) {
			this._word_break_by_regex = src.word_break_by_regex;
		}

		for (const [key, value] of Object.entries(src.entries)) {
			const obj = new Entry(key, value);
			if (this._entries.has(key)) {
				throw new Error(`duplicate term entry: ${key}`)
			} else {
				this._entries.set(key, obj);
				for (const [word, entry] of obj.words) {
					this._words_map.set(word, key);
					if (this._words_set.has(word)) {
						throw new Error(`duplicate word: ${word}`)
					} else {
						this._words_set.add(word);
					}
				}
			}
		}
	}

	get lang()                { return this._lang; }
	get glossary_url()        { return this._glossary_url; }
	get words_map()           { return this._words_map; }
	get words_set()           { return this._words_set; }
	get entries()             { return this._entries; }
	get word_break_by_regex() { return this._word_break_by_regex; }

	getEntryObj(entry_key) {
		return this._entries[this._words_map.get(entry_key)];
	}

	getWordObj(word_str) {
		const [_, ans] = this.getEntryAndWordObj(word_str);
		return ans;
	}

	getEntryAndWordObj(word_str) {
		const entry_str = this._words_map.get(word_str);
		const entry_obj = this._entries.get(entry_str);
		const word_obj = entry_obj.words.get(word_str);
		return [entry_obj, word_obj];
	}

	render_html_word(word_str) {
		const [entry_obj, word_obj] = this.getEntryAndWordObj(word_str);
		const has_description = entry_obj.description.length > 0;
		const has_ruby        = word_obj.ruby != undefined;
		const short_desc      = entry_obj.description[0];
		
		if (has_description === false && has_ruby === false) {
			return word_str;
		}

		const word_rendered = word_obj.renderAs || word_str;
		
		let word_core = '';
		if (has_description) {
			word_core += '<dfn class="glossed-main"><a href="#">'+word_rendered+'</a></dfn>';
		} else {
			word_core += word_rendered;
		}

		let core = '';
		if (has_ruby) {
			if (has_description) {
				core += `<ruby class="glossed-ruby">`;
			} else {
				core += `<ruby>`;
			}
			core += word_core;
			core += `<rp>(</rp><rt>`;
			core += word_obj.ruby;
			core += `</rt><rp>)</rp>`
			core += `</ruby>`
		} else {
			core += word_core;
		}

		if (!has_description) {
			return core;
		}

		let print = '';
		if (entry_obj.show_in_print) {
			print += `<span class="glossed-print">${short_desc}</span>`;
		}

		let tooltip = '';
		let read_more = '';
		if (this.glossary_url != undefined) {
			const entry_link = `${this.glossary_url}#${entry_obj.key}`;
			log(entry_link)
			read_more += ` <a href="${entry_link}">${i18n(this.lang, 'GLOSSARY_READ_MORE')}</a>`;
		}
		tooltip += `<span class="glossed-tooltip">${short_desc}${read_more}</span>`;
	
		const final = `<span class="glossed-block">${core}${print}${tooltip}</span>`;
		return final;
	}
}

class MultiGlossary {
	_glossaries = new Map();
	constructor() {}

	add_glossary(obj) {
		this._glossaries.set(obj.lang, obj);
	}

	static async load_default() {
		const ans = new MultiGlossary();
		const filepaths = await glob('public/**/_glossary.js', { cwd: ROOT, nodir: true });	
		for (const filepath of filepaths) {
			try {
				const gloss_src = require(path.join('..', filepath));
				const gloss_obj = new Glossary(gloss_src);
				ans.add_glossary(gloss_obj);
			} catch (e) {
				log.error(filepath);
				log.error(e);
			}
		}
		return ans;
	}

	get glossaries() { return this._glossaries; }
	
	by_lang (lang) { return this._glossaries.get(lang); }

}

async function main() {
	const glossaries = await MultiGlossary.load_default();
	log(glossaries);
	const en_gloss = glossaries.by_lang('en');
	log(en_gloss);
	log(en_gloss.render_html_word('AMAB'));
}

// TODO: change structure for the module to hold everything
// TODO: change structure to separate meaning from words
/***
 * {
 *   'words': {
 *		'transman': {
 * 			'meaning': 'transman',
 * 			'class': 'noun',
 * 			'relation': '', // main form uses an empty string
 * 			'show': true, // shows in the glossary entry for the main form
 * 			'own_entry': true,
 * 			'auto_gloss': true,
 * 		},
 * 		'transmen': {
 * 			'meaning': 'transman',
 * 			'class': 'noun',
 * 			'relation': 'plural',
 * 			'show': true,
 * 			'own_entry': false,
 * 			'auto_gloss': true,
 * 		}, ...
 * 		'GLAAD': {
 * 			'ruby': '/ɡlæd/',
 * 			'auto_gloss': true,
 * 		},
 *   },
 * 	'meanings': {
 * 		'transman': {
 * 			'title': 'trans·man',
 * 			'short': 'An AFAB person who identifies as a man.',
 * 			'long': 'A person who was "born as a woman" but "became a man".'
 * 		}, ...
 * 	}
 * }
 */

async function loadGlossaries() {
	log('loading glossaries');
	const filepaths = await glob('public/**/_glossary.js', { cwd: ROOT, nodir: true });

	const output = {};
	for (const filepath of filepaths) {
		// Load public/**/_glossary.js files
		const src_gloss = require(path.join('..', filepath));
		const lang = path.basename(path.dirname(filepath));

		const terms = [];
		const terms_map = new Map();
		const entries = Object.keys(src_gloss.entries).sort();

		// Process each entry
		for (const entry_name of entries) {
			// Sanity check
			if (terms_map.has(entry_name)) {
				throw Error('conflict of definitions for term: '+entry_name);
			}

			// Normalize the entry
			const src_entry = src_gloss.entries[entry_name];
			const entry = {
				main_form: entry_name,
				ruby: src_entry.ruby || undefined,
				short: src_entry.short || undefined,
				long: src_entry.long || undefined,
				pronunciations: src_entry.pronunciations || [],
				variants: src_entry.variants || [],
				renderAs: src_entry.renderAs || {},
				pronunciations_to_include_in_short_form: src_entry.pronunciations_to_include_in_short_form || 0,
			};
			// Add the entry itself to our map and the enrty name to our lists
			terms_map.set(entry_name, entry);
			terms.push(entry_name);

			// Process the term variants
			for (const variant_name of entry.variants) {
				// Sanity check
				if (terms_map.has(variant_name)) {
					throw Error('conflict of definitions for term: '+variant_name);
				}

				// Add the entry itself to our map and the variant name to our list
				terms_map.set(variant_name, entry);
				terms.push(variant_name);
			}
		}

		// Finalize stuff
		const out_gloss = {
			'glossary_url': src_gloss.glossary_url,
			'lang': src_gloss.lang,
			'terms': terms, // sorted list of terms and variants
			'entries': entries, // sorted list of terms
			'map': terms_map, // map of terms and variants to definitions
			'set': new Set(terms) // set of terms and variants
		};
		output[lang] = out_gloss;
	}
	return output;
}
module.exports.loadGlossaries = loadGlossaries;

function autoInsertGloss(input, glossary) {
	// Split at word boundaries
	const words = input.split(/\b/g);

	// BUG: use case insensitive search
	// TODO: use a propper HTML parser

	// For each word, insert gloss markup if needed
	const in_comment = false;
	for (const key in words) {
		const i = Number(key);
		const word = words[i];
		if (in_comment === false && word.startsWith('<!--')) {
			in_comment = true;
		}
		if (in_comment === true && word.endsWith('-->')) {
			in_comment = false;
		}
		if (in_comment === false && glossary.set.has(word)) {
			words[i] = makeHTMLGloss(word, glossary, words[i+1]);
		}
	}

	// Concatenate out words back into a simple string
	return words.join('');
}
module.exports.autoInsertGloss = autoInsertGloss;

const punctuation_regexp = /[.,:;!@]/;

function isFirstPunctuation(span) {
	if (span === undefined) {
		return undefined;
	}
	return punctuation_regexp.test(span.charAt(0));
}

function makeHTMLGloss(term_key, glossary, next_word) {
	const entry = glossary.map.get(term_key);
	const term = entry.renderAs[term_key] || term_key;
	const has_glossary_definition = entry.short !== undefined || entry.long !== undefined;
	const term_core = has_glossary_definition ?
		`<dfn class="glossed-main"><a href="_">`+term+`</a></dfn>` : term;
	const gloss_url = glossary.glossary_url;
	const lang = glossary.lang;
	const read_more_txt = i18n(lang, 'GLOSSARY_READ_MORE');
	const go_to_txt = i18n(lang, 'GLOSSARY_GO_TO_GLOSSARY');

	var output = ``;
	if (has_glossary_definition) {
		output += `<span class="glossed-block">`;
	}

	// Make ruby (asiatic pronunciation annotation) markup
	if (entry.ruby !== undefined) {
		if (has_glossary_definition) {
			output += `<ruby class="glossed-ruby">`;
		} else {
			output += `<ruby>`;
		}
		output += term_core;
		output += `<rp>(</rp><rt>`;
		output += entry.ruby;
		output += `</rt><rp>)</rp>`
		output += `</ruby>`
	} else {
		output += term_core;
	}

	// Aggregate pronunciations
	var i = 0;
	var pronunciations = ``;
	if (entry.pronunciations_to_include_in_short_form > 0) {
		for (const pronunciation of entry.pronunciations) {
			if (i <= entry.pronunciations_to_include_in_short_form) {
				break;
			}

			if (pronunciation.IPA !== undefined) {
				if (pronunciations.length !== 0) {
					pronunciations += ', ';
				}
				pronunciations += pronunciation.IPA;
				i++;
			}
		}
		if (pronunciations.length !== 0) {
			pronunciations += `. `;
			pronunciations = `<span class="pronunciations">`+pronunciations+`</span>`;
		}
	}

	// Finalize short form
	const short_form = pronunciations+(entry.short||'');

	// Make tooltip print
	if (entry.short !== undefined && entry.show_in_print !== false) {
		assert(has_glossary_definition == true);
		output += `<span class="glossed-print">`;
		output += ` (`+short_form+`)`;
		if (isFirstPunctuation(next_word) === false) {
			output += ` `;
		}
		output += `</span>`;
	}

	// Make tooltip markup
	if (has_glossary_definition) {
		output += `<span class="glossed-tooltip">`;
		if (gloss_url !== undefined) {
			const entry_url = `${gloss_url}/_entry_${entry.main_form}`;
			if (short_form !== undefined) {
				output += short_form+` <a href="${entry_url}">${read_more_txt}</a>`;
			} else {
				output += `<a href="${entry_url}">${go_to_txt}</a>`;
			}
		}
		output += `</span>`;
	}

	if (has_glossary_definition) {
		output += `</span>`;
	}
	return output;
}

if (require.main === module) {
	main()
}