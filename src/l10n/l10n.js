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
	const targetRE    = /\{\w+\}/g;
	const hasTargetRE = new RegExp(targetRE.source); // to drop the global flag


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

		while (hasTargetRE.test(processed)) {
			if (++iteration > MAX_ITERATIONS) {
				throw new Error('L10n.get exceeded maximum replacement iterations, probable infinite loop');
			}

			processed = processed.replace(targetRE, pat => {
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

	return Object.preventExtensions(Object.create(null, {
		get : { value : l10nGet }
	}));
})();


/*
	Module Exports.
*/
export default L10n;
