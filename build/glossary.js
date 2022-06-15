// BUGS
// [ ] - No support for chinese due to word break
// [ ] - Automitic reloading not working

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
const markdownIt = require('markdown-it');

const OTHER_CHARS      = ' \r\n$+<=>^`|~';
const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;

function escapeRE(str) {
	return str.replace(REGEXP_ESCAPE_RE, '\\$&');
}

// Remove element from array and put another array at those position.
// Useful for some operations with tokens
// Code from <https://github.com/markdown-it/markdown-it>
function arrayReplaceAt(src, pos, newElements) {
  return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1));
}

function isBoolean(val) {
	return typeof val === 'boolean';
}

function isString(val) {
	return typeof val === 'string';
}

function isNonEmptyString(val) {
	return typeof val === 'string' && val.length > 0;
}

function newPseudoToken(type, tag, nesting, content='', children=null, attrs=null) {
	return {
		type: type,
		tag: tag,
		nesting: nesting,
		content: content,
		children: children,
		attrs: attrs
	}
}

function newPseudoTokenText(content) {
	return {
		type: 'text',
		content: content
	}
}

function newPseudoTokenElem(tag, attrs, children) {
	return {
		type: 'elem',
		tag: tag,
		attrs: attrs,
		children: children
	}
}

function unPseudoTokens(pseudo, TokenClass) {
	if (pseudo.type === 'text') {
		const ans = new TokenClass('text', '', 0);
		ans.content = pseudo.content;
		return [ans];
	} else if (pseudo.type === 'elem') {
		const ans = [];

		const start = new TokenClass(`${pseudo.tag}_open`, pseudo.tag, 1);
		start.attrs = [];
		for (const [key, val] of Object.entries(pseudo.attrs)) {
			start.attrs.push([key, val])
		}
		ans.push(start);

		for (const child of pseudo.children) {
			ans.push(...unPseudoTokens(child, TokenClass));
		}

		const stop = new TokenClass(`${pseudo.tag}_close`, pseudo.tag, -1);
		ans.push(stop);

		return ans;
	} else {
		throw new Error('unexpected type: '+pseudo.type);
	}
}

function tokensMergeText(tokens) {
	if (tokens.length <= 1) {
		return tokens;
	}
	const ans = [tokens[0]];
	for (let i=1; i < tokens.length; i++) {
		let last_token = ans[ans.length-1];
		let cur_token = tokens[i];

		if (cur_token.type === 'text' && last_token.type === 'text') {
			last_token.content += cur_token.content;
		} else {
			ans.push(cur_token);
		}
	}

	return ans;
}

function pseudoTokensToHtml(pseudo) {
	let ans = '';
	if (pseudo.type === 'text') {
		ans = pseudo.content;
	} else if (pseudo.type === 'elem') {
		let attrs = '';
		for (const [key, val] of Object.entries(pseudo.attrs)) {
			attrs += ` ${key}="${val}"`;
		}

		ans += `<${pseudo.tag}${attrs}>`;
		for (const child of pseudo.children) {
			ans += pseudoTokensToHtml(child);
		}
		ans += `</${pseudo.tag}>`;
	} else {
		log(pseudo);
		throw new Error('unexpected type: '+pseudo.type);
	}
	return ans;
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
	_regexp_break   = false; // only intended for Chinese
	_pronunciations = []
	_show           = false;
	_auto_gloss     = false;
	_break_classification = [true, true];

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
		if (isBoolean(src.regexp_break)) {
			this._regexp_break = src.regexp_break;
		}

		this._break_classification = Word.compute_fix_break_classification(this._word);
	}

	// BUG: supports only checking for '.' (dot) at the end of words
	// TODO: check for Chinese
	// 0b00 = 0 = no need for \b
	// 0b01 = 1 = \b only for after the word
	// 0b10 = 2 = \b only for before the word
	// 0b11 = 3 = \b both before and after the word
	static compute_fix_break_classification(word) {
		if (word[word.length-1] === '.') {
			return 2;
		}
		return 3;
	}

	get word()           { return this._word; }
	get render_as()      { return this._render_as; }
	get ruby()           { return this._ruby; }
	get class()          { return this._class; }
	get relation()       { return this._relation; }
	get pronunciations() { return this._pronunciations; }
	get show()           { return this._show; }
	get auto_gloss()     { return this._auto_gloss; }
	get regexp_break()   { return this._regexp_break; }
	get break_classification() { return this._break_classification; }
}

class Entry {
	_key = undefined;
	_sortAs = undefined;
	_title = undefined;
	_description = []; //sequence of paragrpahs, only the first is included in tooltip
	_show = false;
	_show_in_print = false;
	_words_by_relation = new Map();
	_words = new Map();

	constructor(key, src) {
		if (isNonEmptyString(key)) {
			this._key = key;
		} else {
			throw new Error('Entry must have a non empty string as key');
		}

		if (isNonEmptyString(src.sortAs)) {
			this._sortAs = src.sortAs;
		} else {
			this._sortAs = this._key;
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
		for (const [word_key, word_src] of Object.entries(src.words)) {
			const word_obj = new Word(word_key, word_src);

			if (this._words.has(word_key)) {
				throw new Error(`duplicate word entry: ${word_key}`)
			}

			this._words.set(word_key, word_obj);
			this.#add_word_by_relation(word_obj);
		}
	}

	#add_word_by_relation(word) {
		const rel = word.relation;

		const set = this._words_by_relation.get(rel) || new Set();
		set.add(word);
		this._words_by_relation.set(rel, set);
	}

	get key()           { return this._key; }
	get title()         { return this._title; }
	get sortAs()        { return this._sortAs; }
	get description()   { return this._description; }
	get short()         { return this._description[0] || ''; }
	get show()          { return this._show; }
	get show_in_print() { return this._show_in_print; }
	get words()         { return this._words; }

	get long_description() {
		return this._description.slice(1);
	}

	wordsByRelation(relation) {
		return this._words_by_relation.get(relation);
	}

	hasWordsByRelation(relation) {
		const set = this.wordsByRelation(relation);
		return set !== undefined && set.length != 0;
	}

	get main_word()     {
		for (const [_, word] of this.words) {
			if (word.relation === '=') {
				return word;
			}
		}
		return undefined;
	}

	// Stupid helpers I had to add because of Handlebars limitations

	get hasGramaticalVariants() {
		return this.hasWordsByRelation('gramatical variant');
	}

	get wordsGramaticalVariants() {
		return this.wordsByRelation('gramatical variant');
	}

	get hasEnTranslations() {
		return this.hasWordsByRelation('translation:en');
	}

	get wordsEnTranslations() {
		return this.wordsByRelation('translation:en');
	}

	get hasAntonyms() {
		return this.hasWordsByRelation('antonyms');
	}

	get wordsAntonyms() {
		return this.wordsByRelation('antonyms');
	}

	get hasSynonyms() {
		return this.hasWordsByRelation('synonyms');
	}

	get wordsSynonyms() {
		return this.wordsByRelation('synonyms');
	}

	get hasSeeOthers() {
		return this.hasWordsByRelation('see');
	}

	get wordsSeeOthers() {
		return this.wordsByRelation('see');
	}

	get hasAbbreviations() {
		return this.hasWordsByRelation('abbreviation');
	}

	get wordsAbbreviations() {
		return this.wordsByRelation('abbreviation');
	}
}

class Glossary {
	_lang;
	_glossary_url         = undefined;
	_words2entry_map      = new Map();
	_words_set            = new Set();
	_words_obj_map        = new Map();
	_auto_gloss_words_set = new Set();
	_entries_map          = new Map();
	_regexp_words_cache   = undefined;

	constructor(src) {
		if (isNonEmptyString(src.lang)) {
			this._lang = src.lang;
		} else {
			throw new Error('Glossary must have a non empty string as lang');
		}

		if (isNonEmptyString(src.glossary_url)) {
			this._glossary_url = src.glossary_url;
		}

		for (const [key, value] of Object.entries(src.entries)) {
			const obj = new Entry(key, value);
			if (this._entries_map.has(key)) {
				throw new Error(`duplicate term entry: ${key}`)
			} else {
				this._entries_map.set(key, obj);
				for (const [word, word_obj] of obj.words) {
					this._words2entry_map.set(word, key);
					this._words_obj_map.set(word, word_obj);
					if (this._words_set.has(word)) {
						throw new Error(`duplicate word: ${word}`)
					} else {
						this._words_set.add(word);
					}
					if (word_obj.auto_gloss) {
						this._auto_gloss_words_set.add(word);
					}
				}
			}
		}
	}

	get lang()                { return this._lang; }
	get glossary_url()        { return this._glossary_url; }
	get words2entry_map()     { return this._words2entry_map; }
	get words_set()           { return this._words_set; }
	get words_obj_map()       { return this._words_obj_map; }
	get entries_map()         { return this._entries_map; }

	get words_sorted()        {
		return Array.from(this._words2entry_map.values()).sort((a, b) => {
			return a.word.localeCompare(b.word, this._lang);
		});
	}

	get entries_sorted()      {
		return Array.from(this._entries_map.values()).sort((a, b) => {
			return a.sortAs.localeCompare(b.sortAs, this._lang);
		});
	}

	auto_gloss_words() {
		return Array.from(this._auto_gloss_words_set)
			.sort()
			.sort(
				(a, b) => { return b.length - a.length; });
	}

	auto_gloss_words_obj() {
		return this.auto_gloss_words().map((w) => this._words_obj_map.get(w));
	}

	regexp_words() {
		if (this._regexp_words_cache !== undefined) {
			return this._regexp_words_cache;
		}

		const words_by_size = this.auto_gloss_words_obj();
		if (words_by_size.length == 0) {
			this._regexp_words_cache = null;
			return this._regexp_words_cache;
		}

		// b = \b        w = the word itself
		const words_w   = words_by_size.filter((w) => w.break_classification === 0);
		const words_wb  = words_by_size.filter((w) => w.break_classification === 1);
		const words_bw  = words_by_size.filter((w) => w.break_classification === 2);
		const words_bwb = words_by_size.filter((w) => w.break_classification === 3);

		const words_w_core   = words_w.map((w) => escapeRE(w._word)).join('|');
		const words_wb_core  = words_wb.map((w) => escapeRE(w._word)).join('|');
		const words_bw_core  = words_bw.map((w) => escapeRE(w._word)).join('|');
		const words_bwb_core = words_bwb.map((w) => escapeRE(w._word)).join('|');

		let re_core = [];
		if (words_w_core.length != 0) { re_core.push(`(?:${words_w_core})`) };
		if (words_wb_core.length != 0) { re_core.push(`(?:${words_wb_core})\\b`) };
		if (words_bw_core.length != 0) { re_core.push(`\\b(?:${words_bw_core})`) };
		if (words_bwb_core.length != 0) { re_core.push(`\\b(?:${words_bwb_core})\\b`) };

		if (re_core.length == 0) {
			this._regexp_words_cache = null;
			return this._regexp_words_cache;
		}

		const re = new RegExp(`(?:${re_core.join('|')})`, 'g');

		this._regexp_words_cache = re;
		return re;
	}

	getEntryObj(entry_key) {
		return this._entries_map.get(entry_key);
	}

	getWordObj(word_str) {
		const [_, ans] = this.getEntryAndWordObj(word_str);
		return ans;
	}

	getEntryAndWordObj(word_str) {
		try {
			const entry_str = this._words2entry_map.get(word_str);
			const entry_obj = this._entries_map.get(entry_str);
			const word_obj = entry_obj.words.get(word_str);
			return [entry_obj, word_obj];
		} catch (e) {
			throw new Error(`Word not found: '${word_str}'`)
		}
	}

	render_block_tokens(word_str, next_word, full) {
		const [entry_obj, word_obj] = this.getEntryAndWordObj(word_str);
		const has_description = entry_obj.description.length > 0;
		const has_ruby        = word_obj.ruby != undefined;
		const short_desc      = entry_obj.description[0];

		const word_rendered = word_obj.renderAs || word_str;

		if (has_description === false && has_ruby === false) {
			return newPseudoTokenText(word_rendered);
		}

		let main_link = '#';
		if (full === false && this.glossary_url != undefined) {
			main_link = `${this.glossary_url}#${entry_obj.key}`;
		}

		let word_core = '';
		if (has_description) {
			word_core = newPseudoTokenElem('dfn', {class: 'glossed-main'}, [
				newPseudoTokenElem('a', {href: main_link}, [
					newPseudoTokenText(word_rendered)
				])
			]);
		} else {
			word_core = newPseudoTokenElem('a', {href: main_link}, [
				newPseudoTokenText(word_rendered)
			]);
		}

		let core = '';
		if (has_ruby) {
			const ruby_attrs = {};
			if (has_description) {
				ruby_attrs['class'] = 'glossed-ruby';
			}
			core = newPseudoTokenElem('ruby', ruby_attrs, [
				word_core,
				newPseudoTokenElem('rp', {}, [newPseudoTokenText('(')]),
				newPseudoTokenElem('rt', {}, [newPseudoTokenText(word_obj.ruby)]),
				newPseudoTokenElem('rp', {}, [newPseudoTokenText(')')]),
			]);
		} else {
			core = word_core;
		}

		if (!has_description || full === false) {
			return core;
		}

		const in_print = [];
		if (entry_obj.show_in_print) {
			const extra_space_bool = (typeof next_word === 'string' && next_word.length > 0 && next_word[0] === ' ');
			const extra_space = extra_space_bool ? ' ' : '';
			const short_desc2 = ((short_desc[short_desc.length-1] || ' ') !== '.') ? short_desc : short_desc.substr(0, short_desc.length-1);
			if (typeof next_word === 'string' && next_word)
			in_print.push(newPseudoTokenElem('span', {class: 'glossed-print'}, [
				newPseudoTokenText(`(${short_desc2})${extra_space}`)
			]));
		}

		let read_more = [];
		if (this.glossary_url != undefined) {
			const entry_link = `${this.glossary_url}#${entry_obj.key}`;
			read_more.push(newPseudoTokenText(' '));
			read_more.push(newPseudoTokenElem('a', {href: entry_link}, [
				newPseudoTokenText(i18n(this.lang, 'GLOSSARY_READ_MORE'))
			]));
		}
		const tooltip = newPseudoTokenElem('span', {class: 'glossed-tooltip'}, [
			newPseudoTokenText(short_desc),
			...read_more,
		]);

		const final_span = newPseudoTokenElem('span', {class: 'glossed-block'}, [
			core,
			...in_print,
			tooltip
		]);
		return final_span;
	}

	render_block_html(word_str, next_word, full) {
		const tokens = render_block_tokens(word_str, next_word, full);
		return pseudoTokensToHtml(tokens);
	}
}

class MultiGlossary {
	_glossaries = new Map();
	constructor() {}

	add_glossary(obj) {
		this._glossaries.set(obj.lang, obj);
	}

	static load_default() {
		const ans = new MultiGlossary();
		const filepaths = glob.sync('public/**/_glossary.js', { cwd: ROOT, nodir: true });
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

function markdownit_plugin (md) {
	const rules = md.core.ruler.getRules('');

	function gloss_replace(state) {
		const gloss = state.env.glossary;
		if (gloss === undefined || gloss === null) {
			return;
		}

		const re_auto_gloss = gloss.regexp_words();
		if (!(re_auto_gloss instanceof RegExp)) {
			return;
		}

		const blockTokens = state.tokens;
		const l = blockTokens.length;
		const env2 = {...state.env, glossary: undefined};

		for (let j = 0; j < l; j++) {
			// Ignore blocks. Maybe this will need to change in the future
			if (blockTokens[j].type !== 'inline') { continue; }
			let tokens = blockTokens[j].children;

			// We scan backwards to keep the position
			for (let i = tokens.length - 1; i >= 0; i--) {
				const currentToken = tokens[i];

				// Only text matters
				if (currentToken.type !== 'text') { continue; }

				// Find the words to gloss and souround them with 0x00 and mark with 0x91, them split on 0x00
				const new_nodes = [];
				const old_nodes = currentToken.content.replace(re_auto_gloss, '\x00\x91$&\x00').split('\x00');

				for (let i = 0; i < old_nodes.length; i++) {
					let node_txt = old_nodes[i];
					const next_node_txt = old_nodes[i+1];

					if (node_txt[0] !== '\x91') {
						// Regular text segment, just copy
						const token_txt = new state.Token('text', '', 0);
						token_txt.content = node_txt;
						new_nodes.push(token_txt);
					} else {
						// Word to gloss, remove marker and gloss the word
						node_txt = node_txt.substr(1, node_txt.length);
						const pseudo_tokens = gloss.render_block_tokens(node_txt, next_node_txt, true);
						const new_tokens = tokensMergeText(unPseudoTokens(pseudo_tokens, state.Token));

						// Parse text tokens to make sure formatting still works
						for (let i = 0; i < new_tokens.length; i++) {
							let token = new_tokens[i];
							if (token.type === 'text') {
								const parsed = md.parseInline(token.content, env2);
								new_nodes.push(...parsed[0].children);
							} else {
								new_nodes.push(token);
							}
						}
					}
				}

				// Save our changes
				blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, new_nodes);
			}
		}
	}

	// Add our rules to the engine
	md.core.ruler.after('inline', 'gloss_replace', gloss_replace);
}

function test_markdown(gloss, src_md) {
	var md = markdownIt({
		html: true,
		linkify: true,
		typographer: true
	}).use(markdownit_plugin);

	return md.render(src_md, {glossary: gloss});
}

async function main() {
	const glossaries = await MultiGlossary.load_default();
	const pt_gloss = glossaries.by_lang('en');
	log(test_markdown(pt_gloss, 'ABC i.e.'));
}

if (require.main === module) {
	main()
}

module.exports = {
	load_default: MultiGlossary.load_default,
	MultiGlossary: MultiGlossary,
	markdownit_plugin: markdownit_plugin,
	Glossary: Glossary,
	Entry: Entry,
	Word: Word
}