/*****
 * DOCUMENTATION
 * 
 ******/

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

async function loadGlossaries() {
	// TODO: use actual files instead of siteInfo.allLangs
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
				throw Exception('conflict of definitions for term: '+entry_name);
			}

			// Normalize the entry
			const src_entry = src_gloss.entries[entry_name];
			const entry = {
				ruby: src_entry.ruby || undefined,
				short: src_entry.short || undefined,
				long: src_entry.long || undefined,
				pronunciations: src_entry.pronunciations || [],
				variants: src_entry.variants || [],
				renderAs: src_entry.renderAs || [],
			};
			// Add the entry itself to our map and the enrty name to our lists
			terms_map.set(entry_name, entry);
			terms.push(entry_name);

			// Process the term variants
			for (const variant_name of entry.variants) {
				// Sanity check
				if (terms_map.has(variant_name)) {
					throw Exception('conflict of definitions for term: '+variant_name);
				}

				// Add the entry itself to our map and the variant name to our list
				terms_map.set(variant_name, entry);
				terms.push(variant_name);
			}
		}
		
		// Finalize stuff
		const out_gloss = {
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
	
	// For each word, insert gloss markup if needed
	for (const key in words) {
		const i = Number(key);
		if (glossary.set.has(words[i])) {
			words[i] = makeHTMLGloss(words[i], glossary, words[i+1]);
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
		`<dfn class="glossed-main">`+term+`</dfn>` : term;

	var output = ``;
	if (has_glossary_definition) {
		output += `<span class="glossed-block">`;
	}

	// Make ruby (asiatic pronunciation annotation) markup
	if (entry.ruby !== undefined) {
		if (has_glossary_definition) {
			output += `<ruby class="glossed-main">`;
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

	// Make tooltip print
	if (entry.short !== undefined && entry.show_in_print !== false) {
		assert(has_glossary_definition == true);
		output += `<span class="glossed-print">`;
		output += ` (`+entry.short+`)`;
		if (isFirstPunctuation(next_word) === false) {
			output += ` `;
		}
		output += `</span>`;
	}

	// Make tooltip markup
	if (has_glossary_definition) {
		output += `<span class="glossed-tooltip">`;
		if (entry.short !== undefined) {
			output += entry.short+`. <a href="#">Read mode</a>`;
		} else {
			output += `<a href="#">Go to glossary</a>`;
		}
		output += `</span>`;
	}

	if (has_glossary_definition) {
		output += `</span>`;
	}
	return output;
}

async function main() {
	const glossaries = await loadGlossaries();
	// log(makeHTMLGloss('AMAB', glossaries['en'], '.'));
	// log(makeHTMLGloss('AMAB', glossaries['en'], ' '));
	// log(makeHTMLGloss('LaTeX', glossaries['en']));
	// log(makeHTMLGloss('TeX', glossaries['en']));
	log(autoInsertGloss("I'm   an AMAB !  ! !  !", glossaries['en']));
}

if (require.main === module) {
	main()
}