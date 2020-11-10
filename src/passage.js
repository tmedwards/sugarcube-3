/***********************************************************************************************************************

	passage.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import L10n from './l10n/l10n';
import Wikifier from './markup/wikifier';
import createSlug from './utils/createslug';
import decodeEntities from './utils/decodeentities';
import encodeEntities from './utils/encodeentities';
import mappingFrom from './utils/mappingfrom';
import stripNewlines from './utils/stripnewlines';


/*
	Passage API class.
*/
const Passage = (() => {
	let twine1Unescape;

	// Twine 1 build.
	if (BUILD_TWINE_1) {
		/*
			Returns a decoded version of the passed Twine 1 passage store encoded string.
		*/
		const twine1EscapesRe    = /(?:\\n|\\t|\\s|\\|\r)/g;
		const hasTwine1EscapesRe = new RegExp(twine1EscapesRe.source); // to drop the global flag
		const twine1EscapesTable = mappingFrom({
			'\\n' : '\n',
			'\\t' : '\t',
			'\\s' : '\\',
			'\\'  : '\\',
			'\r'  : ''
		});

		twine1Unescape = function twine1Unescape(str) {
			if (str == null) { // lazy equality for null
				return '';
			}

			const val = String(str);
			return val && hasTwine1EscapesRe.test(val)
				? val.replace(twine1EscapesRe, esc => twine1EscapesTable[esc])
				: val;
		};
	}


	/*******************************************************************************
		Passage Class.
	*******************************************************************************/

	class Passage {
		constructor(title, el) {
			Object.defineProperties(this, {
				// Passage title/ID.
				title : {
					value : decodeEntities(title)
				},

				// Passage data element (within the story data element; i.e. T1: '[tiddler]', T2: 'tw-passagedata').
				element : {
					value : el || null
				},

				// Passage tags array (sorted and unique).
				tags : {
					value : Object.freeze(
						el && el.hasAttribute('tags')
							? el.getAttribute('tags')
								.trim()
								.splitOrEmpty(/\s+/)
								.sort()
								.filter((tag, i, aref) => i === 0 || aref[i - 1] !== tag)
							: []
					)
				},

				// Passage excerpt.  Used by the `description()` method.
				excerpt : {
					writable : true,
					value    : null
				}
			});

			// Properties dependant upon the above set.
			Object.defineProperties(this, {
				// Passage DOM-compatible ID.
				domId : {
					value : `passage-${createSlug(this.title)}`
				}
			});
		}

		// Getters.
		get source() {
			if (this.element == null) { // lazy equality for null
				const passage = encodeEntities(this.title);
				const mesg    = `${L10n.get('errorTitle')}: ${L10n.get('errorNonexistentPassage', { passage })}`;
				return `<div class="error-view"><span class="error">${mesg}</span></div>`;
			}

			// Twine 1 build.
			if (BUILD_TWINE_1) {
				return twine1Unescape(this.element.textContent);
			}
			// Twine 2 build.
			else { // eslint-disable-line no-else-return
				return this.element.textContent.replace(/\r/g, '');
			}
		}

		get text() {
			if (this.element == null) { // lazy equality for null
				return this.source;
			}

			// Handle image passage transclusion.
			if (this.tags.includes('Twine.image')) {
				return `[img[${this.source}]]`;
			}

			let processed = this.source;

			// Handle `Config.passages.onProcess`.
			if (Config.passages.onProcess) {
				processed = Config.passages.onProcess.call(null, {
					domId : this.domId,
					tags  : this.tags,
					text  : processed,
					title : this.title
				});
			}

			// Handle `Config.passages.nobr` and the `nobr` tag.
			if (Config.passages.nobr || this.tags.includes('nobr')) {
				processed = stripNewlines(processed);
			}

			return processed;
		}

		description() {
			const descriptions = Config.passages.descriptions;

			if (descriptions != null) { // lazy equality for null
				switch (typeof descriptions) {
					case 'boolean':
						if (descriptions) {
							return this.title;
						}

						break;

					case 'object':
						if (descriptions instanceof Map && descriptions.has(this.title)) {
							return descriptions.get(this.title);
						}
						else if (descriptions.hasOwnProperty(this.title)) {
							return descriptions[this.title];
						}

						break;

					case 'function': {
						const result = descriptions.call(this);

						if (result) {
							return result;
						}

						break;
					}
				}
			}

			// Initialize the excerpt cache from the raw passage text, if necessary.
			if (this.excerpt === null) {
				this.excerpt = Passage.getExcerptFromText(this.source);
			}

			return this.excerpt;
		}

		render(options) {
			const isNobr = this.tags.includes('nobr');

			// NOTE: There's no catch clause here because this try/finally exists
			// solely to ensure that the options stack is properly restored in
			// the event that an uncaught exception is thrown.
			try {
				// NOTE: Do not add options that aren't needed.
				if (isNobr) {
					Wikifier.Option.push({ nobr : true });
				}

				// Wikify the passage into a document fragment.
				const frag = document.createDocumentFragment();
				new Wikifier(frag, this.text, options);

				// Update the excerpt cache to reflect the rendered text.
				this.excerpt = Passage.getExcerptFromNode(frag);

				return frag;
			}
			finally {
				if (isNobr) {
					Wikifier.Option.pop();
				}
			}
		}

		static getExcerptFromNode(node, count) {
			if (BUILD_DEBUG) { console.log(`[Passage.getExcerptFromNode(node=…, count=${count})]`, node); }

			if (!node.hasChildNodes()) {
				return '';
			}

			// WARNING: es5-shim's `<String>.trim()` can cause "too much recursion" errors
			// here on very large strings (e.g., ≥40 KiB), at least in Firefox, for unknown
			// reasons.
			//
			// To fix the issue, we're removed `\u180E` from es5-shim's whitespace pattern
			// to prevent it from erroneously shimming `<String>.trim()` in the first place.
			let excerpt = node.textContent.trim();

			if (excerpt !== '') {
				const excerptRe = new RegExp(`(\\S+(?:\\s+\\S+){0,${count > 0 ? count - 1 : 7}})`);
				excerpt = excerpt
					// Compact whitespace.
					.replace(/\s+/g, ' ')
					// Attempt to match the excerpt regexp.
					.match(excerptRe);
			}

			return excerpt ? `${excerpt[1]}\u2026` : '\u2026'; // horizontal ellipsis
		}

		static getExcerptFromText(text, count) {
			if (BUILD_DEBUG) { console.log(`[Passage.getExcerptFromText(text=…, count=${count})]`, text); }

			if (text === '') {
				return '';
			}

			const excerptRe = new RegExp(`(\\S+(?:\\s+\\S+){0,${count > 0 ? count - 1 : 7}})`);
			const excerpt   = text
				// Strip macro tags (replace with a space).
				.replace(/<<.*?>>/g, ' ')
				// Strip html tags (replace with a space).
				.replace(/<.*?>/g, ' ')
				// The above might have left problematic whitespace, so trim.
				.trim()
				// Strip table markup.
				.replace(/^\s*\|.*\|.*?$/gm, '')
				// Strip image markup.
				.replace(/\[[<>]?img\[[^\]]*\]\]/g, '')
				// Clean link markup (remove all but the link text).
				.replace(/\[\[([^|\]]*?)(?:(?:\||->|<-)[^\]]*)?\]\]/g, '$1')
				// Clean heading markup.
				.replace(/^\s*!+(.*?)$/gm, '$1')
				// Clean bold/italic/underline/highlight styles.
				.replace(/'{2}|\/{2}|_{2}|@{2}/g, '')
				// A final trim.
				.trim()
				// Compact whitespace.
				.replace(/\s+/g, ' ')
				// Attempt to match the excerpt regexp.
				.match(excerptRe);
			return excerpt ? `${excerpt[1]}\u2026` : '\u2026'; // horizontal ellipsis
		}
	}


	/*******************************************************************************
		Class Exports.
	*******************************************************************************/

	return Passage;
})();


/*
	Module Exports.
*/
export default Passage;
