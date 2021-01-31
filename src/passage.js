/***********************************************************************************************************************

	passage.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import I18n from './i18n/i18n';
import Wikifier from './markup/wikifier';
import createSlug from './utils/createslug';
import decodeEntities from './utils/decodeentities';
import encodeEntities from './utils/encodeentities';
import stripNewlines from './utils/stripnewlines';


/*
	Passage API class.
*/
const Passage = (() => {
	/*******************************************************************************
		Passage Class.
	*******************************************************************************/

	class Passage {
		constructor(name, el) {
			Object.defineProperties(this, {
				// Passage name.
				name : {
					value : decodeEntities(name)
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
				}
			});

			// Properties dependant upon the above set.
			Object.defineProperties(this, {
				// Passage DOM-compatible ID.
				id : {
					value : `passage-${createSlug(this.name)}`
				}
			});
		}

		// Getters.
		get source() {
			if (this.element == null) { // lazy equality for null
				const passage = encodeEntities(this.name);
				const mesg    = `${I18n.get('errorTitle')}: ${I18n.get('errorNonexistentPassage', { passage })}`;
				return `<div class="error-view"><span class="error">${mesg}</span></div>`;
			}

			return this.element.textContent.replace(/\r/g, '');
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
				processed = Config.passages.onProcess({
					id   : this.id,
					name : this.name,
					tags : this.tags,
					text : processed
				});
			}

			// Handle `Config.passages.nobr` and the `nobr` tag.
			if (Config.passages.nobr || this.tags.includes('nobr')) {
				processed = stripNewlines(processed);
			}

			return processed;
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

				return frag;
			}
			finally {
				if (isNobr) {
					Wikifier.Option.pop();
				}
			}
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
