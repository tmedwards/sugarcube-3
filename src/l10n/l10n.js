/***********************************************************************************************************************

	l10n/l10n.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import hasOwn from './utils/hasown';
import strings from './l10n/strings';


/*
	L10n API static object.
*/
const L10n = (() => {
	// Maximum allowed iterations.
	const MAX_ITERATIONS = 50;

	// Replacement target syntax regular expressions.
	const targetRe    = /\{\w+\}/g;
	const hasTargetRe = new RegExp(targetRe.source); // to drop the global flag


	/*******************************************************************************
		Localization Functions.
	*******************************************************************************/

	function l10nGet(ids, overrides) {
		if (!ids) {
			return '';
		}

		const id = (ids instanceof Array ? ids : [ids]).find(id => hasOwn(strings, id));

		if (!id) {
			return '';
		}

		let processed = strings[id];
		let iteration = 0;

		while (hasTargetRe.test(processed)) {
			if (++iteration > MAX_ITERATIONS) {
				throw new Error('L10n.get exceeded maximum replacement iterations, probable infinite loop');
			}

			// Possibly required by some old buggy browsers.
			targetRe.lastIndex = 0;

			processed = processed.replace(targetRe, pat => {
				const replaceId = pat.slice(1, -1);

				if (overrides && hasOwn(overrides, replaceId)) {
					return overrides[replaceId];
				}
				else if (hasOwn(strings, replaceId)) {
					return strings[replaceId];
				}
			});
		}

		return processed;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		get : { value : l10nGet }
	}));
})();


/*
	Module Exports.
*/
export default L10n;
