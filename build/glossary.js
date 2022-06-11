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

	// The `full` parameter should always be true except for when glossing tooltips themselves. This is to prevent inifnite recursion.
	render_block(word_str, full) {
		const [entry_obj, word_obj] = this.getEntryAndWordObj(word_str);
		const has_description = entry_obj.description.length > 0;
		const has_ruby        = word_obj.ruby != undefined;
		const short_desc      = entry_obj.description[0];

		if (has_description === false && has_ruby === false) {
			return word_str;
		}

		const word_rendered = word_obj.renderAs || word_str;

		let main_link = '#';
		if (full === false && this.glossary_url != undefined) {
			main_link = `${this.glossary_url}#${entry_obj.key}`;
		}

		let word_core = '';
		if (has_description) {
			word_core = `<dfn class="glossed-main"><a href="${main_link}">${word_rendered}</a></dfn>`;
		} else {
			word_core = `<a href="${main_link}">${word_rendered}</a>`;
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

		if (!has_description || full === false) {
			return core;
		}

		let print = '';
		if (entry_obj.show_in_print) {
			print += `<span class="glossed-print">(${short_desc}) </span>`;
		}

		let tooltip = '';
		let read_more = '';
		if (this.glossary_url != undefined) {
			const entry_link = `${this.glossary_url}#${entry_obj.key}`;
			read_more += ` <a href="${entry_link}">${i18n(this.lang, 'GLOSSARY_READ_MORE')}</a>`;
		}
		tooltip += `<span class="glossed-tooltip">${short_desc}${read_more}</span>`;

		const final = `<span class="glossed-block">${core}${print}${tooltip}</span>`;
		return final;
	}

	auto_gloss_html(src_html) {
		// Steps
		// 1. Parse HTML
		// 2. Traverse the text nodes
		// 3. Break words
		// 4. Replace the necessary ones with the full block

		// For chinese:
		// Run regexps to replace the char-seqs with themselves but sourunded by U+0091 characters to act as word breaks. Then continue with step 3

		// Word breaking regexp: /(\b|\u0091)/g
	}

	render_full_glossary() {
		// make the whole <dl><dt><dd> thing
		// auto gloss the words in the entries descriptions
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
	log(en_gloss.render_block('AMAB', false));
	log(en_gloss.render_block('AMAB', true));
}


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

if (require.main === module) {
	main()
}

module.exports = {
	Glossary: Glossary,
	Entry: Entry,
	Word: Word
}