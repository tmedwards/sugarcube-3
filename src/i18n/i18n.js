/***********************************************************************************************************************

	i18n/i18n.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import hasOwn from '~/utils/hasown';

/*
	TODO: Make selection of user language possible at any time, rather
	than just at start up.
*/

/*
	I18n API static object.
*/
const I18n = (() => {
	// Language strings table.
	const stringsByLangTag = Object.create(null);

	// Maximum allowed iterations.
	const MAX_ITERATIONS = 50;

	// Replacement target syntax regular expressions.
	const targetRE    = /\{\w+\}/g;
	const hasTargetRE = new RegExp(targetRE.source); // to drop the global flag

	// User language tag.
	let languageTag; // NOTE: Set by `init()`.


	/*******************************************************************************
		Internationalization Functions.
	*******************************************************************************/

	function init() {
		if (BUILD_DEBUG) { console.log('[I18n/init()]'); }

		const preferredTags = [];

		if (Config.language) {
			preferredTags.push(Config.language);

			const sepIdx = Config.language.indexOf('-');

			if (sepIdx > 0) {
				preferredTags.push(Config.language.slice(0, sepIdx));
			}
		}

		try {
			if (typeof navigator.languages === 'object' && 'length' in navigator.languages) {
				preferredTags.push(...navigator.languages);
			}
		}
		catch (ex) {
			console.error('unable to retrieve preferred language tags from browser', ex);
		}

		// Set the language tag based on user preferrences, failing over to `'en'`.
		languageTag = preferredTags.find(tag => hasOwn(stringsByLangTag, tag)) ?? 'en';
	}

	function get(ids, replacements) {
		if (!ids) {
			return '';
		}

		const strings = stringsByLangTag[languageTag];
		const mesgId  = (ids instanceof Array ? ids : [ids]).find(id => hasOwn(strings, id));

		if (!mesgId) {
			// QUESTION: Throw here instead?
			return '';
		}

		let localized = strings[mesgId];
		let iteration = 0;

		while (hasTargetRE.test(localized)) {
			if (++iteration > MAX_ITERATIONS) {
				throw new Error('I18n.get exceeded maximum replacement iterations, probable infinite loop');
			}

			localized = localized.replace(targetRE, pat => {
				const replaceId = pat.slice(1, -1);

				if (replacements != null && hasOwn(replacements, replaceId)) { // lazy equality for null
					return replacements[replaceId];
				}
				else if (hasOwn(strings, replaceId)) {
					return strings[replaceId];
				}
			});
		}

		return localized;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		StringsByLang : { value : stringsByLangTag },
		init          : { value : init },
		get           : { value : get }
	}));
})();


/*
	Module Exports.
*/
export default I18n;
